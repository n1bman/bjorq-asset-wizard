import { useState } from "react";
import { FileUploader } from "@/components/upload/FileUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { OptimizeOptionsPanel } from "@/components/optimize/OptimizeOptions";
import { StatsComparison } from "@/components/optimize/StatsComparison";
import { PipelineStepper } from "@/components/optimize/PipelineStepper";
import { analyzeModel, optimizeModel, syncToBjorq } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useConnection } from "@/contexts/ConnectionContext";
import type { OptimizeOptions, OptimizeResponse, AnalysisResponse } from "@/types/api";
import { Download, FolderPlus, RefreshCw } from "lucide-react";

const STEPS = [
  { label: "Upload" },
  { label: "Analyze" },
  { label: "Configure" },
  { label: "Optimize" },
  { label: "Review" },
  { label: "Save" },
];

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
  const { isConnected } = useConnection();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [options, setOptions] = useState<OptimizeOptions>(defaultOptions);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  const handleFileSelected = (f: File) => {
    setFile(f);
    setStep(1);
    handleAnalyze(f);
  };

  const handleAnalyze = async (f: File) => {
    setLoading(true);
    try {
      const res = await analyzeModel(f);
      setAnalysis(res);
      setStep(2);
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!file) return;
    setStep(3);
    setLoading(true);
    try {
      const res = await optimizeModel(file, options);
      setResult(res);
      setStep(4);
      toast({ title: "Optimization complete", description: `Job ID: ${res.jobId}` });
    } catch (e: any) {
      toast({ title: "Optimization failed", description: e.message, variant: "destructive" });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!result) return;
    if (!isConnected) {
      toast({ title: "Sync unavailable", description: "Backend not connected", variant: "destructive" });
      return;
    }
    try {
      await syncToBjorq([result.metadata.id]);
      toast({ title: "Synced to Bjorq" });
      setStep(5);
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
  };

  const handleReset = () => {
    setStep(0);
    setFile(null);
    setAnalysis(null);
    setResult(null);
    setOptions(defaultOptions);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Optimize</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full optimization pipeline: upload, analyze, configure, optimize, review, and save.
        </p>
      </div>

      <PipelineStepper steps={STEPS} currentStep={step} />

      {/* Step 0: Upload */}
      {step === 0 && (
        <FileUploader onFileSelected={handleFileSelected} isLoading={loading} />
      )}

      {/* Step 1: Analyzing */}
      {step === 1 && loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Analyzing model…
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure */}
      {step === 2 && analysis && (
        <div className="space-y-4">
          <AnalysisResults data={analysis.analysis} />
          <OptimizeOptionsPanel options={options} onChange={setOptions} />
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            Run Optimization
          </Button>
        </div>
      )}

      {/* Step 3: Optimizing */}
      {step === 3 && loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Optimizing…
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && result && (
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

          {/* Metadata preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generated Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-auto max-h-48 text-foreground">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button className="flex-1 gap-1.5" variant="outline" onClick={() => setStep(5)}>
              <FolderPlus className="h-4 w-4" /> Save to Catalog
            </Button>
            <Button className="flex-1 gap-1.5" onClick={handleSync}>
              <RefreshCw className="h-4 w-4" /> Sync to Bjorq
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 5 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-foreground font-medium">Pipeline complete!</p>
            <p className="text-sm text-muted-foreground">
              Asset saved to catalog and ready for Bjorq.
            </p>
            <Button variant="outline" onClick={handleReset}>
              Optimize Another Model
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
