import { useEffect, useState, useMemo } from "react";
import type { AssetMetadata, CatalogIndex } from "@/types/api";
import { getCatalogIndex } from "@/services/api";
import { useConnection } from "@/contexts/ConnectionContext";
import { WizardAssetCard } from "./WizardAssetCard";
import { WizardAssetDetail } from "./WizardAssetDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutGrid, RefreshCw } from "lucide-react";

export function WizardCatalogBrowser() {
  const { isConnected } = useConnection();
  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await getCatalogIndex();
      setCatalog(data);
    } catch {
      // Handled by connection context
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
        {/* Category filter */}
        {categories.length > 0 && (
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No assets found</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredAssets.map(asset => (
              <WizardAssetCard key={asset.id} asset={asset} onClick={handleAssetClick} />
            ))}
          </div>
        )}
      </CardContent>

      <WizardAssetDetail asset={selectedAsset} open={detailOpen} onOpenChange={setDetailOpen} />
    </Card>
  );
}
