import type { AssetMetadata } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, HardDrive } from "lucide-react";
import { SourceBadge, SyncDot } from "./AssetStatusBadge";

interface Props {
  asset: AssetMetadata;
  onClick?: () => void;
}

export function AssetCard({ asset, onClick }: Props) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={onClick}
    >
      <div className="aspect-square bg-muted/30 flex items-center justify-center rounded-t-lg relative">
        <Box className="h-12 w-12 text-muted-foreground/40" />
        {asset.syncStatus && (
          <div className="absolute top-2 right-2">
            <SyncDot status={asset.syncStatus} />
          </div>
        )}
      </div>
      <CardContent className="p-3 space-y-1.5">
        <p className="font-medium text-sm text-foreground truncate">{asset.name}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs">{asset.category}</Badge>
          {asset.subcategory && (
            <Badge variant="secondary" className="text-xs">{asset.subcategory}</Badge>
          )}
          <SourceBadge source={asset.source} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{asset.performance?.triangles?.toLocaleString() ?? "—"} tris</span>
          <span>{asset.performance?.fileSizeKB ?? "—"} KB</span>
        </div>
      </CardContent>
    </Card>
  );
}
