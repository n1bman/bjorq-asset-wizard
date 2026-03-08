import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWizard } from "@/contexts/WizardContext";
import { Activity, Server, Clock, AlertTriangle } from "lucide-react";

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function WizardStatusWidget() {
  const { enabled, status, health, version } = useWizard();

  if (!enabled) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm">Wizard integration is disabled</span>
        </CardContent>
      </Card>
    );
  }

  if (status === "disconnected") {
    return (
      <Card className="border-destructive/20">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Wizard Unreachable</p>
          <p className="text-xs text-muted-foreground">Using mock data for preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Wizard Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium text-emerald-500">
              {health?.status === "ok" ? "Healthy" : "Checking…"}
            </p>
          </div>
          {version && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-medium text-foreground">{version.version}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Environment</p>
                <p className="text-sm font-medium text-foreground">{version.environment}</p>
              </div>
            </>
          )}
          {health && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Uptime</p>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{formatUptime(health.uptime)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Storage</p>
                <div className="flex items-center gap-1">
                  <Server className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {health.storage.writable ? "Writable" : "Read-only"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
