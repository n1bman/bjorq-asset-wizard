import { useState, useRef } from "react";
import { getCatalogIndex, exportCatalog, importCatalog } from "@/services/api";
import { AssetGrid } from "@/components/catalog/AssetGrid";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { AssetDetailDrawer } from "@/components/catalog/AssetDetailDrawer";
import { SyncStatusBar } from "@/components/sync/SyncStatusBar";
import type { AssetMetadata } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { toast } from "@/components/ui/sonner";
import { AlertTriangle, PackageOpen, HardDrive, Download, Upload } from "lucide-react";

export default function CatalogPage() {
  const { data: catalog, loading, error, refetch } = useApi(getCatalogIndex);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allAssets: AssetMetadata[] = catalog
    ? catalog.categories.flatMap((c) => c.subcategories.flatMap((s) => s.assets))
    : [];

  const filtered = activeCategory
    ? allAssets.filter((a) => a.category === activeCategory)
    : allAssets;

  const categories = catalog ? catalog.categories.map((c) => c.name) : [];

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCatalog();
      toast.success("Catalog exported successfully");
    } catch (err) {
      toast.error("Failed to export catalog");
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importCatalog(file);
      toast.success(`Imported ${result.imported} assets (${result.skipped} skipped)`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} error(s) during import`);
      }
      refetch();
    } catch (err) {
      toast.error("Failed to import catalog");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Catalog</h1>
            {allAssets.length > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                <HardDrive className="h-3 w-3" /> Permanently stored
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Browse {catalog?.totalAssets ?? "…"} assets across {categories.length} categories.
          </p>
        </div>

        {allAssets.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-1.5" />
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing}>
              <Upload className="h-4 w-4 mr-1.5" />
              {importing ? "Importing…" : "Import"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,.tgz"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm font-medium text-foreground">Failed to load catalog</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-60 rounded-lg" />
          ))}
        </div>
      ) : !error && catalog && allAssets.length === 0 ? (
        /* Empty catalog state — still show import */
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No assets in catalog yet</p>
            <p className="text-xs text-muted-foreground">
              Use the <span className="font-medium">Optimize</span> pipeline to process a model, then{" "}
              <span className="font-medium">Save to Catalog</span> or use the{" "}
              <span className="font-medium">Ingest</span> page to add it manually.
            </p>
            <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing} className="mt-2">
              <Upload className="h-4 w-4 mr-1.5" />
              {importing ? "Importing…" : "Import from backup"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,.tgz"
              className="hidden"
              onChange={handleImportFile}
            />
          </CardContent>
        </Card>
      ) : !error && (
        <>
          <CategoryFilter categories={categories} active={activeCategory} onSelect={setActiveCategory} />
          <AssetGrid assets={filtered} onAssetClick={setSelectedAsset} />
          <SyncStatusBar assets={allAssets} />
        </>
      )}

      <AssetDetailDrawer
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}
      />
    </div>
  );
}
