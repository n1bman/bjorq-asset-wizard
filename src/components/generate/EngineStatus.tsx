import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Download, Loader2, Cpu, Zap, ShieldAlert, HardDrive, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TrellisStatusResponse } from "@/types/generate";
import { getTrellisStatus, installTrellis } from "@/services/generate-api";

interface EngineStatusProps {
  onReady?: () => void;
  className?: string;
}

export function EngineStatus({ onReady, className }: EngineStatusProps) {
  const [status, setStatus] = useState<TrellisStatusResponse | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkStatus = async () => {
    try {
      const s = await getTrellisStatus();
      setStatus(s);
      if (s.installed && s.running) onReady?.();
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollUntilDone = async () => {
    const MAX_POLLS = 120;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const s = await getTrellisStatus();
      setStatus(s);

      if (s.installed) {
        setInstalling(false);
        if (s.running) onReady?.();
        return;
      }
      if (!s.installing) {
        setInstalling(false);
        setError("Installation stopped unexpectedly");
        return;
      }
    }
    setInstalling(false);
    setError("Installation timed out");
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await installTrellis();
      await pollUntilDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
      setInstalling(false);
    }
  };

  if (!status) return null;

  const env = status.environment;
  const meetsReqs = env?.meetsRequirements ?? true;
  const extensions = status.extensions;
  const hasExtensions = extensions && Object.keys(extensions).length > 0;
  const installedExtCount = hasExtensions ? Object.values(extensions).filter(Boolean).length : 0;
  const totalExtCount = hasExtensions ? Object.keys(extensions).length : 0;

  // Ready
  if (status.installed && status.running) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/20 p-3 space-y-2", className)}>
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Engine ready</span>
          {status.gpu ? (
            <span className="flex items-center gap-1 text-primary ml-auto">
              <Zap className="h-3 w-3" />
              GPU accelerated
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground ml-auto">
              <Cpu className="h-3 w-3" />
              CPU mode — generation will be slower
            </span>
          )}
        </div>

        {!meetsReqs && (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Partial installation — missing requirements:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {env?.missingRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {hasExtensions && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {installedExtCount}/{totalExtCount} CUDA extensions •{" "}
            {status.weightsDownloaded ? "Weights ✓" : "Weights missing"} •{" "}
            {showDetails ? "Hide details" : "Show details"}
          </button>
        )}

        {showDetails && hasExtensions && (
          <div className="text-xs space-y-1 pl-5">
            {Object.entries(extensions!).map(([name, installed]) => (
              <div key={name} className="flex items-center gap-1.5">
                {installed ? (
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
                <span className={installed ? "text-muted-foreground" : "text-destructive"}>
                  {name}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 mt-1">
              <HardDrive className="h-3 w-3 text-muted-foreground" />
              <span className={status.weightsDownloaded ? "text-muted-foreground" : "text-destructive"}>
                Model weights: {status.weightsDownloaded ? "Downloaded" : "Missing"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Installing
  if (installing || status.installing) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/30 p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground">Installing 3D engine…</p>
        </div>
        <Progress value={status.installProgress ?? 5} />
        <p className="text-xs text-muted-foreground">
          Step {getInstallStep(status.installProgress ?? 0)} — this may take a while.
        </p>
        {env && !meetsReqs && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">
            <p className="font-medium">⚠ Best-effort install — some features may not work</p>
          </div>
        )}
      </div>
    );
  }

  // Not installed
  if (!status.installed) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/30 p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Photo-to-3D requires engine installation
          </p>
        </div>

        {env && !meetsReqs && (
          <div className="flex items-start gap-2 text-xs rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Environment does not meet full TRELLIS.2 requirements
              </p>
              <p className="text-muted-foreground">
                TRELLIS.2 requires a Linux machine with an NVIDIA GPU (24GB+ VRAM) and CUDA Toolkit 12.4.
                Installation will proceed with best-effort, but generation will likely fail without proper hardware.
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-1">
                {env.missingRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-1">
                Consider running TRELLIS on a dedicated GPU server and connecting via an external worker.
              </p>
            </div>
          </div>
        )}

        {env && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Platform: {env.platform}</span>
            {env.gpu && <span>GPU: {env.gpu}</span>}
            {env.cudaVersion && <span>CUDA: {env.cudaVersion}</span>}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <Button size="sm" onClick={handleInstall} disabled={installing} variant={meetsReqs ? "default" : "outline"}>
          <Download className="mr-2 h-4 w-4" />
          {meetsReqs ? "Install Engine" : "Install Anyway (best-effort)"}
        </Button>
      </div>
    );
  }

  // Installed but not running
  return (
    <div className={cn("flex items-center gap-2 text-xs rounded-md border border-border bg-muted/20 px-3 py-2", className)}>
      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
      <span className="text-muted-foreground">Engine installed but not running</span>
    </div>
  );
}

function getInstallStep(progress: number): string {
  if (progress <= 5) return "1/6 — Cloning repository";
  if (progress <= 15) return "2/6 — Creating environment";
  if (progress <= 25) return "3/6 — Installing PyTorch";
  if (progress <= 45) return "4/6 — Installing dependencies";
  if (progress <= 65) return "5/6 — Building CUDA extensions";
  if (progress <= 85) return "6/6 — Downloading model weights";
  return "Finalizing";
}
