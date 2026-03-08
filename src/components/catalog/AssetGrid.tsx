import type { AssetMetadata } from "@/types/api";
import { AssetCard } from "./AssetCard";

interface Props {
  assets: AssetMetadata[];
  onAssetClick?: (asset: AssetMetadata) => void;
}

export function AssetGrid({ assets, onAssetClick }: Props) {
  if (!assets.length) {
    return <p className="text-sm text-muted-foreground text-center py-10">No assets found</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {assets.map((a) => (
        <AssetCard key={a.id} asset={a} onClick={() => onAssetClick?.(a)} />
      ))}
    </div>
  );
}
