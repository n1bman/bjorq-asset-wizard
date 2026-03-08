import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, RefreshCw } from "lucide-react";
import { reindexCatalog, getCatalogIndex } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/use-api";

export function CatalogStatusCard() {
  const { toast } = useToast();
  const { data: catalog, loading, refetch } = useApi(getCatalogIndex);

  const handleReindex = async () => {
    try {
      await reindexCatalog();
      toast({ title: "Catalog reindexed" });
      refetch();
    } catch (e: unknown) {
      toast({ title: "Reindex failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Catalog
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleReindex} disabled={loading} className="gap-1 h-7 text-xs">
            <RefreshCw className="h-3 w-3" /> Reindex
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Assets</span>
          <span className="text-foreground font-medium">{catalog?.totalAssets ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Categories</span>
          <span className="text-foreground">{catalog?.categories.length ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Version</span>
          <span className="text-foreground font-mono text-xs">{catalog?.version ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Generated</span>
          <span className="text-foreground text-xs">
            {catalog?.generatedAt ? new Date(catalog.generatedAt).toLocaleString() : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
