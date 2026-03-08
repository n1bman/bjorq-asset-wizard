import { useState } from "react";
import { FileUploader } from "@/components/upload/FileUploader";
import { OptimizeOptionsPanel } from "@/components/optimize/OptimizeOptions";
import { StatsComparison } from "@/components/optimize/StatsComparison";
import { optimizeModel } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { OptimizeOptions, OptimizeResponse } from "@/types/api";
import { Download } from "lucide-react";

const defaultOptions: OptimizeOptions = {
  removeEmptyNodes: true,
  removeUnusedNodes: true,
  removeCameras: true,
  removeLights: true,
  removeAnimations: true,
  deduplicateMaterials: true,
  normalizeScale: true,
  setFloorToY0: true,
  optimizeBaseColorTextures: true,
  maxTextureSize: 2048,
  textureQuality: 85,
  assetName: "",
  category: "",
  subcategory: "",
  style: "",
};

export default function OptimizePage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<OptimizeOptions>(defaultOptions);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  const handleOptimize = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await optimizeModel(file, options);
      setResult(res);
      toast({ title: "Optimization complete", description: `Job ID: ${res.jobId}` });
    } catch (e: any) {
      toast({ title: "Optimization failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Optimize</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a model, configure options, and run the optimization pipeline.
        </p>
      </div>

      <FileUploader onFileSelected={setFile} isLoading={loading} />
      <OptimizeOptionsPanel options={options} onChange={setOptions} />

      {file && !result && (
        <Button onClick={handleOptimize} disabled={loading} className="w-full">
          {loading ? "Optimizing…" : "Run Optimization"}
        </Button>
      )}

      {result && (
        <div className="space-y-4">
          <StatsComparison stats={result.stats} />

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Outputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Download className="h-4 w-4" /> Optimized Model
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Download className="h-4 w-4" /> Thumbnail
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Download className="h-4 w-4" /> Metadata JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Applied Operations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {result.optimization.applied.map((op) => (
                  <Badge key={op} variant="secondary" className="text-xs">{op}</Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
