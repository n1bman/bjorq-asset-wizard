import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCatalogIndex } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box, Download } from "lucide-react";
import type { AssetMetadata } from "@/types/api";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<AssetMetadata | null>(null);

  useEffect(() => {
    getCatalogIndex().then((catalog) => {
      for (const cat of catalog.categories) {
        for (const sub of cat.subcategories) {
          const found = sub.assets.find((a) => a.id === id);
          if (found) { setAsset(found); return; }
        }
      }
    });
  }, [id]);

  if (!asset) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Catalog
      </Button>

      <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
        <Box className="h-20 w-20 text-muted-foreground/30" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline">{asset.category}</Badge>
          {asset.subcategory && <Badge variant="secondary">{asset.subcategory}</Badge>}
          {asset.style && <Badge variant="secondary">{asset.style}</Badge>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Width</p>
              <p className="text-foreground font-medium">{asset.dimensions.width} m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Depth</p>
              <p className="text-foreground font-medium">{asset.dimensions.depth} m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Height</p>
              <p className="text-foreground font-medium">{asset.dimensions.height} m</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Triangles</span>
              <span className="text-foreground">{asset.performance.triangles.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Materials</span>
              <span className="text-foreground">{asset.performance.materials}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span className="text-foreground">{asset.performance.fileSizeKB} KB</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Placement:</span>
        <Badge>{asset.placement}</Badge>
      </div>

      {asset.ha && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Home Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mappable</span>
              <span className="text-foreground">{asset.ha.mappable ? "Yes" : "No"}</span>
            </div>
            {asset.ha.defaultDomain && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Domain</span>
                <span className="text-foreground font-mono text-xs">{asset.ha.defaultDomain}</span>
              </div>
            )}
            {asset.ha.defaultKind && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kind</span>
                <span className="text-foreground font-mono text-xs">{asset.ha.defaultKind}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="gap-2">
        <Download className="h-4 w-4" /> Download Model
      </Button>
    </div>
  );
}
