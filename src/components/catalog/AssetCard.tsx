import type { AssetMetadata } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";

export function AssetCard({ asset }: { asset: AssetMetadata }) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/catalog/${asset.id}`)}
    >
      <div className="aspect-square bg-muted/30 flex items-center justify-center rounded-t-lg">
        <Box className="h-12 w-12 text-muted-foreground/40" />
      </div>
      <CardContent className="p-3 space-y-1.5">
        <p className="font-medium text-sm text-foreground truncate">{asset.name}</p>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs">{asset.category}</Badge>
          {asset.subcategory && (
            <Badge variant="secondary" className="text-xs">{asset.subcategory}</Badge>
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{asset.performance.triangles.toLocaleString()} tris</span>
          <span>{asset.performance.fileSizeKB} KB</span>
        </div>
      </CardContent>
    </Card>
  );
}
