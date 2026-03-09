import { useState } from "react";
import { getCatalogIndex } from "@/services/api";
import { AssetGrid } from "@/components/catalog/AssetGrid";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { AssetDetailDrawer } from "@/components/catalog/AssetDetailDrawer";
import { SyncStatusBar } from "@/components/sync/SyncStatusBar";
import type { AssetMetadata } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { AlertTriangle, PackageOpen, HardDrive } from "lucide-react";

export default function CatalogPage() {
  const { data: catalog, loading, error } = useApi(getCatalogIndex);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata | null>(null);

  const allAssets: AssetMetadata[] = catalog
    ? catalog.categories.flatMap((c) => c.subcategories.flatMap((s) => s.assets))
    : [];

  const filtered = activeCategory
    ? allAssets.filter((a) => a.category === activeCategory)
    : allAssets;

  const categories = catalog ? catalog.categories.map((c) => c.name) : [];

  return (
    <div className="space-y-6">
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
        /* Empty catalog state */
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No assets in catalog yet</p>
            <p className="text-xs text-muted-foreground">
              Use the <span className="font-medium">Optimize</span> pipeline to process a model, then{" "}
              <span className="font-medium">Save to Catalog</span> or use the{" "}
              <span className="font-medium">Ingest</span> page to add it manually.
            </p>
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
