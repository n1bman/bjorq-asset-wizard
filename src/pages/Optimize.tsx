import { useState, useMemo } from "react";
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
import type { OptimizeOptions, OptimizeResponse, AnalysisResponse, ImportType } from "@/types/api";
import { Download, FolderPlus, RefreshCw } from "lucide-react";

const DIRECT_STEPS = [
  { label: "Upload" },
  { label: "Analyze" },
  { label: "Configure" },
  { label: "Optimize" },
  { label: "Review" },
  { label: "Save" },
];

const CONVERT_STEPS = [
  { label: "Upload" },
  { label: "Convert" },
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
  const [importType] = useState<ImportType>("direct-upload");
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [options, setOptions] = useState<OptimizeOptions>(defaultOptions);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  const isConversion = importType === "converted-project";
  const steps = useMemo(() => (isConversion ? CONVERT_STEPS : DIRECT_STEPS), [isConversion]);

  // For conversion imports, step offsets shift by 1 after Upload
  const analyzeStep = isConversion ? 2 : 1;
  const configStep = isConversion ? 3 : 2;
  const optimizeStep = isConversion ? 4 : 3;
  const reviewStep = isConversion ? 5 : 4;
  const doneStep = isConversion ? 6 : 5;

  const handleFileSelected = (f: File) => {
    setFile(f);
    if (isConversion) {
      // Future: trigger conversion step here
      setStep(analyzeStep);
    } else {
      setStep(analyzeStep);
    }
    handleAnalyze(f);
  };

  const handleAnalyze = async (f: File) => {
    setLoading(true);
    try {
      const res = await analyzeModel(f);
      setAnalysis(res);
      setStep(configStep);
    } catch (e: unknown) {
      toast({ title: "Analysis failed", description: e instanceof Error ? e.message : "Analysis error", variant: "destructive" });
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!file) return;
    setStep(optimizeStep);
    setLoading(true);
    try {
      const res = await optimizeModel(file, options);
      setResult(res);
      setStep(reviewStep);
      toast({ title: "Optimization complete", description: `Job ID: ${res.jobId}` });
    } catch (e: any) {
      toast({ title: "Optimization failed", description: e.message, variant: "destructive" });
      setStep(configStep);
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
      setStep(doneStep);
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

      <PipelineStepper steps={steps} currentStep={step} />

      {/* Step 0: Upload */}
      {step === 0 && (
        <FileUploader onFileSelected={handleFileSelected} isLoading={loading} />
      )}

      {/* Conversion step (future — only shown for converted-project imports) */}
      {isConversion && step === 1 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-2">
            <p>Converting source model to GLB…</p>
            <p className="text-xs italic">Conversion backend not yet available.</p>
          </CardContent>
        </Card>
      )}

      {/* Analyzing */}
      {step === analyzeStep && loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Analyzing model…
          </CardContent>
        </Card>
      )}

      {/* Configure */}
      {step === configStep && analysis && (
        <div className="space-y-4">
          <AnalysisResults data={analysis.analysis} />
          <OptimizeOptionsPanel options={options} onChange={setOptions} />
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            Run Optimization
          </Button>
        </div>
      )}

      {/* Optimizing */}
      {step === optimizeStep && loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Optimizing…
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {step === reviewStep && result && (
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
            <Button className="flex-1 gap-1.5" variant="outline" onClick={() => setStep(doneStep)}>
              <FolderPlus className="h-4 w-4" /> Save to Catalog
            </Button>
            <Button className="flex-1 gap-1.5" onClick={handleSync}>
              <RefreshCw className="h-4 w-4" /> Sync to Bjorq
            </Button>
          </div>
        </div>
      )}

      {/* Done */}
      {step === doneStep && (
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
