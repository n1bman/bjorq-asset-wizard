import type { AssetMetadata } from "@/types/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Box, Download, Triangle, Layers, HardDrive, Ruler } from "lucide-react";
import { toast } from "sonner";

interface Props {
  asset: AssetMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WizardAssetDetail({ asset, open, onOpenChange }: Props) {
  if (!asset) return null;

  const handleImport = () => {
    toast.success(`"${asset.name}" imported to Bjorq catalog`, {
      description: "Asset source marked as Wizard",
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-foreground">{asset.name}</SheetTitle>
          <SheetDescription>Wizard asset — {asset.category}/{asset.subcategory}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Thumbnail placeholder */}
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
            <Box className="h-16 w-16 text-muted-foreground/30" />
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs text-foreground">{asset.id}</span>
              <span className="text-muted-foreground">Style</span>
              <span className="text-foreground">{asset.style || "—"}</span>
              <span className="text-muted-foreground">Placement</span>
              <span className="text-foreground">{asset.placement}</span>
              {asset.ha?.mappable && (
                <>
                  <span className="text-muted-foreground">HA Domain</span>
                  <span className="text-foreground">{asset.ha.defaultDomain}</span>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Dimensions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <Ruler className="h-4 w-4 text-primary" /> Dimensions
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">W</p>
                <p className="font-medium text-foreground">{asset.dimensions.width.toFixed(2)}m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">D</p>
                <p className="font-medium text-foreground">{asset.dimensions.depth.toFixed(2)}m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">H</p>
                <p className="font-medium text-foreground">{asset.dimensions.height.toFixed(2)}m</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Performance</h4>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Triangle className="h-3 w-3" />
                {(asset.performance.triangles / 1000).toFixed(1)}k tris
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Layers className="h-3 w-3" />
                {asset.performance.materials} mats
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                {asset.performance.fileSizeKB} KB
              </div>
            </div>
          </div>

          <Separator />

          {/* Source badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs">
              Wizard
            </Badge>
            {asset.optimizationStatus === "optimized" && (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">
                Optimized
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleImport}>
              <Download className="mr-2 h-4 w-4" />
              Import to Bjorq
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
