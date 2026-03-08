import type { AssetMetadata } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Box, Download, Wand2, FolderPlus, RefreshCw } from "lucide-react";
import { SourceBadge, SyncDot, OptimizationBadge, IngestBadge } from "./AssetStatusBadge";
import { syncToBjorq } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useConnection } from "@/contexts/ConnectionContext";

interface Props {
  asset: AssetMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDetailDrawer({ asset, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { isConnected } = useConnection();

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{asset.name}</SheetTitle>
          <SheetDescription>Asset detail and actions</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Thumbnail */}
          <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
            <Box className="h-16 w-16 text-muted-foreground/30" />
          </div>

          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={asset.source} />
            <SyncDot status={asset.syncStatus} />
            <OptimizationBadge status={asset.optimizationStatus} />
            <IngestBadge status={asset.ingestStatus} />
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
          </div>

          {/* Dimensions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-sm">
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

          {/* Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
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

          {asset.lastSyncedAt && (
            <p className="text-xs text-muted-foreground">
              Last synced: {new Date(asset.lastSyncedAt).toLocaleString()}
            </p>
          )}

          <Separator />

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Wand2 className="h-3.5 w-3.5" /> Optimize
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FolderPlus className="h-3.5 w-3.5" /> Ingest
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSync}>
              <RefreshCw className="h-3.5 w-3.5" /> Sync to Bjorq
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
