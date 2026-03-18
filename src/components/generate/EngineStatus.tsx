import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Download, Loader2, Cpu, Zap } from "lucide-react";
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

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await installTrellis();
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
    } finally {
      setInstalling(false);
    }
  };

  if (!status) return null;

  // Ready
  if (status.installed && status.running) {
    return (
      <div className={cn("flex items-center gap-2 text-xs rounded-md border border-border bg-muted/20 px-3 py-2", className)}>
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
        <Progress value={status.installProgress ?? 30} />
        <p className="text-xs text-muted-foreground">This only happens once. Please wait.</p>
      </div>
    );
  }

  // Not installed
  if (!status.installed) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/30 p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium text-foreground">
            Photo-to-3D requires engine installation
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          A one-time setup to enable 3D generation from photos.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
        <Button size="sm" onClick={handleInstall} disabled={installing}>
          <Download className="mr-2 h-4 w-4" />
          Install Engine
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
