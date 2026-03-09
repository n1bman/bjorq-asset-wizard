import type { HealthResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HealthStatus({ data }: { data: HealthResponse }) {
  const hrs = Math.floor(data.uptime / 3600);
  const mins = Math.floor((data.uptime % 3600) / 60);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Wizard Health</CardTitle>
          <Badge variant={data.status === "ok" ? "default" : "destructive"}>
            {data.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Uptime</span>
          <span className="text-foreground">{hrs}h {mins}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Timestamp</span>
          <span className="text-foreground">{new Date(data.timestamp).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Storage</span>
          <span className="text-foreground">
            {data.storage.path} ({data.storage.writable ? "writable" : "read-only"})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
