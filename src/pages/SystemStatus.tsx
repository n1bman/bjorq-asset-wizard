import { ConnectionCard } from "@/components/system/ConnectionCard";
import { StorageStatusCard } from "@/components/system/StorageStatusCard";
import { CatalogStatusCard } from "@/components/system/CatalogStatusCard";
import { HealthStatus } from "@/components/system/HealthStatus";
import { VersionInfo } from "@/components/system/VersionInfo";
import { useConnection } from "@/contexts/ConnectionContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function SystemStatusPage() {
  const { health, version, refresh, status } = useConnection();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Backend connection, storage, and catalog overview.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={status === "checking"} className="gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ConnectionCard />
        <StorageStatusCard />
      </div>

      <CatalogStatusCard />

      <div className="grid sm:grid-cols-2 gap-4">
        {health && <HealthStatus data={health} />}
        {version && <VersionInfo data={version} />}
      </div>
    </div>
  );
}
