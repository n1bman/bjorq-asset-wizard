import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, XCircle, Download, Loader2, Cpu, Zap, ShieldAlert,
  HardDrive, Box, Wifi, WifiOff, ExternalLink, RefreshCw, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrellisStatusResponse } from "@/types/generate";
import { getTrellisStatus, installTrellis, testWorkerConnection } from "@/services/generate-api";

interface EngineStatusProps {
  onReady?: () => void;
  className?: string;
}

export function EngineStatus({ onReady, className }: EngineStatusProps) {
  const [status, setStatus] = useState<TrellisStatusResponse | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [testing, setTesting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const s = await getTrellisStatus();
      setStatus(s);
      if (s.installed && s.running) onReady?.();
    } catch {
      setStatus(null);
    }
  }, [onReady]);

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isExternal = status?.mode === "external";

  // --- External worker mode ---
  if (isExternal) {
    return <ExternalWorkerStatus
      status={status}
      testing={testing}
      error={error}
      className={className}
      onReady={onReady}
      onTest={async () => {
        setTesting(true);
        setError(null);
        try {
          const result = await testWorkerConnection();
          if (result.ok) {
            await checkStatus();
          } else {
            setError(result.error || "Connection failed");
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Test failed");
        }
        setTesting(false);
      }}
      onRefresh={checkStatus}
    />;
  }

  // --- Local mode ---
  return <LocalEngineStatus
    status={status}
    installing={installing}
    error={error}
    showDetails={showDetails}
    className={className}
    onInstall={async () => {
      setInstalling(true);
      setError(null);
      try {
        await installTrellis();
        await pollUntilDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Installation failed");
        setInstalling(false);
      }
    }}
    onToggleDetails={() => setShowDetails(!showDetails)}
  />;

  async function pollUntilDone() {
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
  }
}

// ============================================================
// External Worker Status
// ============================================================

function ExternalWorkerStatus({
  status,
  testing,
  error,
  className,
  onReady,
  onTest,
  onRefresh,
}: {
  status: TrellisStatusResponse | null;
  testing: boolean;
  error: string | null;
  className?: string;
  onReady?: () => void;
  onTest: () => void;
  onRefresh: () => void;
}) {
  const connected = status?.installed && status?.running;
  const workerUrl = status?.workerUrl || "";

  // Auto-refresh polling when not connected (every 10s)
  useEffect(() => {
    if (connected) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [connected, onRefresh]);

  // Notify parent when connected
  useEffect(() => {
    if (connected) onReady?.();
  }, [connected, onReady]);

  if (!status) return null;

  const env = status.environment;
  const workerError = error || status.lastError;
  const isGpuError = workerError && /gpu|nvidia|cuda|driver|vram/i.test(workerError);

  // Connected
  if (connected) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/20 p-3 space-y-2", className)}>
        <div className="flex items-center gap-2 text-xs">
          <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-foreground font-medium">Worker connected</span>
          {status.version && (
            <span className="text-muted-foreground ml-1">v{status.version}</span>
          )}
          <button onClick={onRefresh} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {status.gpu ? (
            <span className="flex items-center gap-1 text-primary">
              <Zap className="h-3 w-3" />
              GPU accelerated
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              CPU mode
            </span>
          )}
          {env?.gpu && <span>GPU: {env.gpu}</span>}
          {env?.cudaVersion && <span>CUDA: {env.cudaVersion}</span>}
        </div>

        {workerUrl && (
          <div className="text-xs text-muted-foreground font-mono bg-muted/30 rounded px-2 py-1">
            {workerUrl}
          </div>
        )}
      </div>
    );
  }

  // Not connected — guided setup flow
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-4 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          3D Worker not connected
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Photo → 3D requires a Bjorq 3D Worker running on a Windows PC with an NVIDIA GPU.
      </p>

      {/* Error display */}
      {workerError && (
        <div className={cn(
          "flex items-start gap-2 text-xs rounded px-3 py-2",
          isGpuError
            ? "text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30"
            : "text-destructive bg-destructive/10 border border-destructive/30"
        )}>
          {isGpuError ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          )}
          <span>{workerError}</span>
        </div>
      )}

      {/* Step 1: Install */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">1</Badge>
          <span className="text-xs font-medium text-foreground">Install the Worker</span>
        </div>
        <p className="text-xs text-muted-foreground pl-7">
          Download and run <strong>Bjorq3DWorkerSetup.exe</strong> on your Windows GPU PC.
          No Python or CUDA install needed — the installer handles everything.
        </p>
        <div className="pl-7">
          <Button size="sm" variant="outline" asChild>
            <a
              href="https://github.com/n1bman/bjorq-asset-wizard/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Download Worker Installer
            </a>
          </Button>
        </div>
      </div>

      {/* Step 2: Configure URL */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">2</Badge>
          <span className="text-xs font-medium text-foreground">Configure Worker URL</span>
        </div>
        <p className="text-xs text-muted-foreground pl-7">
          Set <code className="bg-muted px-1 rounded text-foreground">trellis_worker_url</code> in your add-on configuration:
        </p>
        <div className="pl-7 text-xs text-muted-foreground space-y-0.5">
          <p>
            <strong>VirtualBox NAT:</strong>{" "}
            <code className="bg-muted px-1 rounded text-foreground">http://10.0.2.2:8080</code>
          </p>
          <p>
            <strong>Bridged / LAN:</strong>{" "}
            <code className="bg-muted px-1 rounded text-foreground">http://&lt;windows-ip&gt;:8080</code>
          </p>
        </div>
        {workerUrl && (
          <div className="pl-7 text-xs text-muted-foreground font-mono bg-muted/30 rounded px-2 py-1">
            Current: {workerUrl}
          </div>
        )}
      </div>

      {/* Step 3: Test */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">3</Badge>
          <span className="text-xs font-medium text-foreground">Test Connection</span>
        </div>
        <div className="pl-7 flex gap-2">
          <Button size="sm" onClick={onTest} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wifi className="mr-2 h-3.5 w-3.5" />
            )}
            Test Connection
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a
              href="https://github.com/n1bman/bjorq-asset-wizard/blob/main/docs/WORKER_SETUP_WINDOWS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Setup Guide
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Local Engine Status (preserved from v2.3.9)
// ============================================================

function LocalEngineStatus({
  status,
  installing,
  error,
  showDetails,
  className,
  onInstall,
  onToggleDetails,
}: {
  status: TrellisStatusResponse | null;
  installing: boolean;
  error: string | null;
  showDetails: boolean;
  className?: string;
  onInstall: () => void;
  onToggleDetails: () => void;
}) {
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
            onClick={onToggleDetails}
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
                Consider using an external Bjorq 3D Worker on a Windows PC with NVIDIA GPU instead.
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-1">
                {env.missingRequirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
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

        <Button size="sm" onClick={onInstall} disabled={installing} variant={meetsReqs ? "default" : "outline"}>
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
