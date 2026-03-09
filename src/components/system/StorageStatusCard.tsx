import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardDrive, CheckCircle, XCircle } from "lucide-react";
import { useConnection } from "@/contexts/ConnectionContext";

export function StorageStatusCard() {
  const { health, isMockMode } = useConnection();
  const storage = health?.storage;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> Storage
          </CardTitle>
          {storage && (
            <Badge variant={storage.writable ? "default" : "destructive"} className="gap-1">
              {storage.writable ? (
                <><CheckCircle className="h-3 w-3" /> Writable</>
              ) : (
                <><XCircle className="h-3 w-3" /> Read-only</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Path</span>
          <code className="text-xs text-foreground font-mono">{storage?.path ?? "—"}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="text-foreground">{storage?.writable ? "Ready" : "Not writable"}</span>
        </div>
        {isMockMode && (
          <p className="text-xs text-muted-foreground">Values shown are from demo data.</p>
        )}
        <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
          In HA, assets are stored in <code className="font-mono">/data</code> (persistent add-on storage). Data survives restarts, add-on reinstalls, and HA upgrades.
        </p>
      </CardContent>
    </Card>
  );
}
