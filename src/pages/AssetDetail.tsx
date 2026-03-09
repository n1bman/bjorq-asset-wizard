import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCatalogIndex, syncToBjorq } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Wand2, FolderPlus, RefreshCw } from "lucide-react";
import { SourceBadge, SyncDot, OptimizationBadge, IngestBadge, ImportTypeBadge, ConversionBadge } from "@/components/catalog/AssetStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useConnection } from "@/contexts/ConnectionContext";
import { PreviewErrorBoundary } from "@/components/catalog/PreviewErrorBoundary";
import { AssetPreviewPanel } from "@/components/catalog/AssetPreviewPanel";
import { getAssetModelUrl } from "@/lib/asset-paths";
import type { AssetMetadata } from "@/types/api";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected } = useConnection();
  const [asset, setAsset] = useState<AssetMetadata | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setNotFound(false);
    setAsset(null);
    getCatalogIndex().then((catalog) => {
      for (const cat of catalog.categories) {
        for (const sub of cat.subcategories) {
          const found = sub.assets.find((a) => a.id === id);
          if (found) { setAsset(found); return; }
        }
      }
      setNotFound(true);
    });
  }, [id]);

  const handleSync = async () => {
    if (!asset) return;
    if (!isConnected) {
      toast({ title: "Sync unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    try {
      await syncToBjorq([asset.id]);
      toast({ title: "Synced to Bjorq", description: `${asset.name} synced successfully` });
    } catch (e: unknown) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Sync error", variant: "destructive" });
    }
  };

  const handleOptimize = () => {
    if (!asset) return;
    if (asset.optimizationStatus === "optimized") {
      toast({ title: "Already optimized", description: `${asset.name} has already been optimized` });
      return;
    }
    navigate("/optimize");
  };

  const handleIngest = () => {
    if (!asset) return;
    if (asset.ingestStatus === "ingested") {
      toast({ title: "Already ingested", description: `${asset.name} is already in the catalog` });
      return;
    }
    navigate("/ingest");
  };

  const handleExport = () => {
    if (!asset) return;
    if (!isConnected) {
      toast({ title: "Export unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    window.open(getAssetModelUrl(asset.id), "_blank");
  };

  if (!asset && notFound) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>
        <p className="text-muted-foreground">Asset not found. It may have been removed or the ID is invalid.</p>
      </div>
    );
  }

  if (!asset) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <PreviewErrorBoundary fallbackMessage="Failed to render asset detail page">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/catalog")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>

        <PreviewErrorBoundary fallbackMessage="Model preview could not be loaded">
          <AssetPreviewPanel asset={asset} size="lg" />
        </PreviewErrorBoundary>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{asset.category}</Badge>
            {asset.subcategory && <Badge variant="secondary">{asset.subcategory}</Badge>}
            {asset.style && <Badge variant="secondary">{asset.style}</Badge>}
            <SourceBadge source={asset.source} />
            <ImportTypeBadge importType={asset.importType} />
            <SyncDot status={asset.syncStatus} />
            <OptimizationBadge status={asset.optimizationStatus} />
            <IngestBadge status={asset.ingestStatus} />
            <ConversionBadge status={asset.conversionStatus} />
            {asset.lifecycleStatus && (
              <Badge variant={asset.lifecycleStatus === "published" ? "default" : "secondary"} className="text-xs">
                {asset.lifecycleStatus}
              </Badge>
            )}
          </div>
        </div>

        {/* Import & Pipeline Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Import & Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Import Source</span>
              <span className="text-foreground">{asset.importType ?? asset.source ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversion</span>
              <span className="text-foreground">{asset.conversionStatus ?? "n/a"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Optimization</span>
              <OptimizationBadge status={asset.optimizationStatus} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ingest</span>
              <span className="text-foreground">{asset.ingestStatus ?? "n/a"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sync</span>
              <SyncDot status={asset.syncStatus} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifecycle</span>
              <span className="text-foreground">{asset.lifecycleStatus ?? "n/a"}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Width</p>
                <p className="text-foreground font-medium">{asset.dimensions?.width ?? "—"} m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depth</p>
                <p className="text-foreground font-medium">{asset.dimensions?.depth ?? "—"} m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="text-foreground font-medium">{asset.dimensions?.height ?? "—"} m</p>
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
                <span className="text-foreground">{asset.performance?.triangles?.toLocaleString() ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials</span>
                <span className="text-foreground">{asset.performance?.materials ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Size</span>
                <span className="text-foreground">{asset.performance?.fileSizeKB != null ? `${asset.performance.fileSizeKB} KB` : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Placement:</span>
          <Badge>{asset.placement}</Badge>
        </div>

        {/* Bounding Box */}
        {asset.boundingBox && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bounding Box</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm font-mono text-xs">
              <div>
                <p className="text-muted-foreground font-sans text-xs">Min</p>
                <p className="text-foreground">[{asset.boundingBox.min.map(v => v.toFixed(3)).join(", ")}]</p>
              </div>
              <div>
                <p className="text-muted-foreground font-sans text-xs">Max</p>
                <p className="text-foreground">[{asset.boundingBox.max.map(v => v.toFixed(3)).join(", ")}]</p>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Paths */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono">
            <div>
              <p className="text-muted-foreground font-sans text-xs">Model</p>
              <p className="text-foreground break-all">{asset.model || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-sans text-xs">Thumbnail</p>
              <p className="text-foreground break-all">{asset.thumbnail || "null"}</p>
            </div>
          </CardContent>
        </Card>

        {asset.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(asset.lastSyncedAt).toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" className="gap-1.5" onClick={handleOptimize}>
            <Wand2 className="h-4 w-4" /> Optimize
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleIngest}>
            <FolderPlus className="h-4 w-4" /> Ingest
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleSync}>
            <RefreshCw className="h-4 w-4" /> Sync
          </Button>
        </div>
      </div>
    </PreviewErrorBoundary>
  );
}
