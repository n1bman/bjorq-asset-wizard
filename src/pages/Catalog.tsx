import { useEffect, useState } from "react";
import { getCatalogIndex } from "@/services/api";
import { AssetGrid } from "@/components/catalog/AssetGrid";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import type { AssetMetadata, CatalogIndex } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalogIndex().then((c) => { setCatalog(c); setLoading(false); });
  }, []);

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
        <h1 className="text-2xl font-bold text-foreground">Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse {catalog?.totalAssets ?? "…"} assets across {categories.length} categories.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-60 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <CategoryFilter categories={categories} active={activeCategory} onSelect={setActiveCategory} />
          <AssetGrid assets={filtered} />
        </>
      )}
    </div>
  );
}
