import type { AssetMetadata } from "@/types/api";
import { AssetCard } from "./AssetCard";

export function AssetGrid({ assets }: { assets: AssetMetadata[] }) {
  if (!assets.length) {
    return <p className="text-sm text-muted-foreground text-center py-10">No assets found</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {assets.map((a) => (
        <AssetCard key={a.id} asset={a} />
      ))}
    </div>
  );
}
