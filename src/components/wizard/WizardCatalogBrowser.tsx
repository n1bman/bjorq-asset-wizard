import { useEffect, useState, useMemo } from "react";
import type { AssetMetadata, CatalogIndex } from "@/types/api";
import { getCatalogIndex } from "@/services/api";
import { useConnection } from "@/contexts/ConnectionContext";
import { WizardAssetCard } from "./WizardAssetCard";
import { WizardAssetDetail } from "./WizardAssetDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutGrid, RefreshCw, AlertTriangle } from "lucide-react";

export function WizardCatalogBrowser() {
  const { isConnected } = useConnection();
  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCatalogIndex();
      setCatalog(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load catalog";
      setError(msg);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const allAssets = useMemo(() => {
    if (!catalog) return [];
    return catalog.categories.flatMap(c => c.subcategories.flatMap(s => s.assets));
  }, [catalog]);

  const categories = useMemo(() => {
    if (!catalog) return [];
    return catalog.categories.map(c => c.name);
  }, [catalog]);

  const filteredAssets = activeCategory
    ? allAssets.filter(a => a.category === activeCategory)
    : allAssets;

  const handleAssetClick = (asset: AssetMetadata) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Wizard Catalog</CardTitle>
            {catalog && (
              <Badge variant="secondary" className="text-xs">
                {allAssets.length} assets
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={fetchCatalog} disabled={loading}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive/60" />
            <div>
              <p className="text-sm font-medium text-foreground">Failed to load catalog</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            {!isConnected && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
                Wizard backend is not connected. Check the connection settings above.
              </p>
            )}
            <Button size="sm" variant="outline" onClick={fetchCatalog}>
              <RefreshCw className="mr-1 h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        {/* Category filter */}
        {!error && categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={activeCategory === null ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={activeCategory === cat ? "default" : "outline"}
                className="h-7 text-xs capitalize"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}

        {!error && loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !error && filteredAssets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No assets found</p>
        ) : !error ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredAssets.map(asset => (
              <WizardAssetCard key={asset.id} asset={asset} onClick={handleAssetClick} />
            ))}
          </div>
        ) : null}
      </CardContent>

      <WizardAssetDetail asset={selectedAsset} open={detailOpen} onOpenChange={setDetailOpen} />
    </Card>
  );
}
