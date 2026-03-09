import type { AssetMetadata } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, Triangle } from "lucide-react";

interface Props {
  asset: AssetMetadata;
  onClick: (asset: AssetMetadata) => void;
}

export function WizardAssetCard({ asset, onClick }: Props) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/50"
      onClick={() => onClick(asset)}
    >
      <CardContent className="p-3">
        <div className="mb-2 flex aspect-square items-center justify-center rounded bg-muted">
          <Box className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
        <div className="mt-1 flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {asset.category}
          </Badge>
          {asset.subcategory && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {asset.subcategory}
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Triangle className="h-2.5 w-2.5" />
            {((asset.performance?.triangles ?? 0) / 1000).toFixed(1)}k
          </span>
          <span>{asset.performance?.fileSizeKB ?? "?"} KB</span>
          <span>
            {asset.dimensions?.width?.toFixed(2) ?? "?"} × {asset.dimensions?.height?.toFixed(2) ?? "?"}m
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
