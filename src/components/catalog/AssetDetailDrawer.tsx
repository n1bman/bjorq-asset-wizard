import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AssetMetadata } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Wand2, FolderPlus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { SourceBadge, SyncDot, OptimizationBadge, IngestBadge } from "./AssetStatusBadge";
import { syncToBjorq, deleteAsset } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useConnection } from "@/contexts/ConnectionContext";
import { PreviewErrorBoundary } from "./PreviewErrorBoundary";
import { AssetPreviewPanel } from "./AssetPreviewPanel";
import { downloadAssetBlob } from "@/lib/asset-paths";

interface Props {
  asset: AssetMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function AssetDetailDrawer({ asset, open, onOpenChange, onDeleted }: Props) {
  const { toast } = useToast();
  const { isConnected } = useConnection();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!asset) return null;

  const handleSync = async () => {
    if (!isConnected) {
      toast({ title: "Sync unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    try {
      await syncToBjorq([asset.id]);
      toast({ title: "Synced to Bjorq", description: `${asset.name} synced successfully` });
    } catch (e: unknown) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleOptimize = () => {
    if (asset.optimizationStatus === "optimized") {
      toast({ title: "Already optimized", description: `${asset.name} has already been optimized` });
      return;
    }
    navigate("/optimize");
  };

  const handleIngest = () => {
    if (asset.ingestStatus === "ingested") {
      toast({ title: "Already ingested", description: `${asset.name} is already in the catalog` });
      return;
    }
    navigate("/ingest");
  };

  const handleExport = async () => {
    if (!isConnected) {
      toast({ title: "Export unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      await downloadAssetBlob(asset.id, `${asset.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.glb`);
      toast({ title: "Download started", description: `${asset.name}.glb` });
    } catch (e: unknown) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Download error", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!isConnected) {
      toast({ title: "Delete unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      await deleteAsset(asset.id);
      toast({ title: "Asset deleted", description: `${asset.name} has been removed from the catalog` });
      onOpenChange(false);
      onDeleted?.();
    } catch (e: unknown) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent key={asset.id} className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{asset.name}</SheetTitle>
          <SheetDescription>Asset detail and actions</SheetDescription>
        </SheetHeader>

        <PreviewErrorBoundary fallbackMessage="Asset detail could not be rendered">
          <div className="space-y-5 mt-4">
            {/* Preview — show thumbnail image if available */}
            <PreviewErrorBoundary fallbackMessage="Model preview could not be loaded">
              {asset.thumbnail ? (
                <ThumbnailPreview asset={asset} />
              ) : (
                <AssetPreviewPanel asset={asset} />
              )}
            </PreviewErrorBoundary>

            {/* Status */}
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={asset.source} />
              <SyncDot status={asset.syncStatus} />
              <OptimizationBadge status={asset.optimizationStatus} />
              <IngestBadge status={asset.ingestStatus} />
              {asset.lifecycleStatus && (
                <Badge variant={asset.lifecycleStatus === "published" ? "default" : "secondary"} className="text-xs">
                  {asset.lifecycleStatus}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="font-mono text-xs text-foreground">{asset.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant="outline" className="text-xs">{asset.category}</Badge>
                  {asset.subcategory && <Badge variant="secondary" className="text-xs">{asset.subcategory}</Badge>}
                </div>
              </div>
              {asset.style && (
                <div>
                  <p className="text-xs text-muted-foreground">Style</p>
                  <p className="text-foreground">{asset.style}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Placement</p>
                <p className="text-foreground">{asset.placement}</p>
              </div>
              {asset.targetProfile && (
                <div>
                  <p className="text-xs text-muted-foreground">Target Profile</p>
                  <p className="text-foreground">{asset.targetProfile}</p>
                </div>
              )}
            </div>

            {/* Dimensions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-sm">
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

            {/* Bounding Box */}
            {asset.boundingBox && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bounding Box</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm font-mono text-xs">
                  <div>
                    <p className="text-xs text-muted-foreground font-sans">Min</p>
                    <p className="text-foreground">[{asset.boundingBox.min.map(v => v.toFixed(3)).join(", ")}]</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-sans">Max</p>
                    <p className="text-foreground">[{asset.boundingBox.max.map(v => v.toFixed(3)).join(", ")}]</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
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

            {/* HA info */}
            {asset.ha && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Home Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mappable</span>
                    <span className="text-foreground">{asset.ha.mappable ? "Yes" : "No"}</span>
                  </div>
                  {asset.ha.defaultDomain && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domain</span>
                      <span className="font-mono text-xs text-foreground">{asset.ha.defaultDomain}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Paths */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Paths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs font-mono">
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

            <Separator />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOptimize}>
                <Wand2 className="h-3.5 w-3.5" /> Optimize
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleIngest}>
                <FolderPlus className="h-3.5 w-3.5" /> Ingest
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSync}>
                <RefreshCw className="h-3.5 w-3.5" /> Sync to Bjorq
              </Button>
            </div>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full gap-1.5" disabled={deleting}>
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete Asset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {asset.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the asset from the catalog, including the model file, metadata, and thumbnail. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </PreviewErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}
