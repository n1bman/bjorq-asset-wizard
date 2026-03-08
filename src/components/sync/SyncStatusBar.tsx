import type { AssetMetadata } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncToBjorq } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useConnection } from "@/contexts/ConnectionContext";

interface Props {
  assets: AssetMetadata[];
}

export function SyncStatusBar({ assets }: Props) {
  const { toast } = useToast();
  const { isConnected } = useConnection();

  const synced = assets.filter((a) => a.syncStatus === "synced").length;
  const pending = assets.filter((a) => a.syncStatus === "not_synced" || a.syncStatus === "syncing").length;
  const lastSync = assets
    .filter((a) => a.lastSyncedAt)
    .sort((a, b) => new Date(b.lastSyncedAt!).getTime() - new Date(a.lastSyncedAt!).getTime())[0]?.lastSyncedAt;

  const handleSyncAll = async () => {
    if (!isConnected) {
      toast({ title: "Sync unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    try {
      const ids = assets.filter((a) => a.syncStatus !== "synced").map((a) => a.id);
      await syncToBjorq(ids);
      toast({ title: "Sync started", description: `Syncing ${ids.length} assets to Bjorq` });
    } catch (e: unknown) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="secondary" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {synced} synced
        </Badge>
        {pending > 0 && (
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            {pending} pending
          </Badge>
        )}
        {lastSync && (
          <span className="text-xs text-muted-foreground">
            Last sync: {new Date(lastSync).toLocaleString()}
          </span>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={handleSyncAll} className="gap-1.5" disabled={pending === 0}>
        <RefreshCw className="h-3.5 w-3.5" /> Sync to Bjorq
      </Button>
    </div>
  );
}
