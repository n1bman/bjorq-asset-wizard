import { useEffect, useState } from "react";
import { getHealth, getVersion } from "@/services/api";
import { HealthStatus } from "@/components/system/HealthStatus";
import { VersionInfo } from "@/components/system/VersionInfo";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { HealthResponse, VersionResponse } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function SystemStatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [h, v] = await Promise.all([getHealth(), getVersion()]);
    setHealth(h);
    setVersion(v);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Status</h1>
          <p className="text-sm text-muted-foreground mt-1">Backend health and version info.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {health && <HealthStatus data={health} />}
          {version && <VersionInfo data={version} />}
        </div>
      )}
    </div>
  );
}
