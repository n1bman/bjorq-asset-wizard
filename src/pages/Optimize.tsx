import { useState, useMemo } from "react";
import { FileUploader } from "@/components/upload/FileUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { OptimizeOptionsPanel } from "@/components/optimize/OptimizeOptions";
import { StatsComparison } from "@/components/optimize/StatsComparison";
import { PipelineStepper } from "@/components/optimize/PipelineStepper";
import { analyzeModel, optimizeModel, ingestAsset } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { OptimizeOptions, OptimizeResponse, AnalysisResponse, ImportType, IngestMeta } from "@/types/api";
import { Download, FolderPlus, RefreshCw, AlertTriangle, Hash, Tag, Briefcase } from "lucide-react";

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

  const analyzeStep = isConversion ? 2 : 1;
  const configStep = isConversion ? 3 : 2;
  const optimizeStep = isConversion ? 4 : 3;
  const reviewStep = isConversion ? 5 : 4;
  const doneStep = isConversion ? 6 : 5;

  const handleFileSelected = (f: File) => {
    setFile(f);
    setStep(analyzeStep);
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
    } catch (e: unknown) {
      toast({ title: "Optimization failed", description: e instanceof Error ? e.message : "Optimization error", variant: "destructive" });
      setStep(configStep);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCatalog = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const meta: IngestMeta = {
        id: result.metadata.id,
        name: result.metadata.name || result.metadata.id,
        category: result.metadata.category || "uncategorized",
        subcategory: result.metadata.subcategory || "general",
        style: result.metadata.style || "",
        dimensions: result.metadata.dimensions,
      };
      await ingestAsset(meta, undefined, undefined, result.jobId);
      toast({ title: "Saved to catalog", description: `Asset ${meta.name} ingested successfully.` });
      setStep(doneStep);
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Ingest error", variant: "destructive" });
    } finally {
      setLoading(false);
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

      {/* Conversion step (future) */}
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
        <ReviewSection
          result={result}
          onSave={handleSaveToCatalog}
          saving={loading}
        />
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

/* ── Review Section ── */

function ReviewSection({
  result,
  onSave,
  saving,
}: {
  result: OptimizeResponse;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Asset Identity */}
      <Card>
        <CardContent className="py-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Asset Name</p>
                <p className="font-medium text-foreground">{result.metadata.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Asset ID</p>
                <p className="font-mono text-foreground">{result.metadata.id || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Job ID</p>
                <p className="font-mono text-foreground text-xs">{result.jobId}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatsComparison stats={result.stats} />

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Outputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.outputs.optimizedModel && (
              <OutputRow label="Optimized Model" path={result.outputs.optimizedModel} />
            )}
            {result.outputs.thumbnail && (
              <OutputRow label="Thumbnail" path={result.outputs.thumbnail} />
            )}
            {result.outputs.metadata && (
              <OutputRow label="Metadata JSON" path={result.outputs.metadata} />
            )}
            {result.outputs.report && (
              <OutputRow label="Report" path={result.outputs.report} />
            )}
            {!result.outputs.optimizedModel && !result.outputs.metadata && (
              <p className="text-muted-foreground text-xs italic">No output references available (mock data).</p>
            )}
          </CardContent>
        </Card>

        {/* Applied Operations */}
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

      {/* Skipped & Warnings */}
      {(result.optimization.skipped.length > 0 || result.optimization.warnings.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {result.optimization.skipped.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground">Skipped (V2)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                <TooltipProvider>
                  {result.optimization.skipped.map((s) => (
                    <Tooltip key={s.operation}>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">{s.operation}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{s.reason}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </CardContent>
            </Card>
          )}

          {result.optimization.warnings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {result.optimization.warnings.map((w, i) => (
                  <p key={i} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{w.operation}:</span> {w.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
        <Button className="flex-1 gap-1.5" onClick={onSave} disabled={saving}>
          <FolderPlus className="h-4 w-4" /> {saving ? "Saving…" : "Save to Catalog"}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <Button className="w-full gap-1.5" variant="outline" disabled>
                  <RefreshCw className="h-4 w-4" /> Sync to Bjorq
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Dashboard sync not yet available</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/* ── Output row helper ── */

function OutputRow({ label, path }: { label: string; path: string }) {
  return (
    <div className="flex items-center gap-2">
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{path}</p>
      </div>
    </div>
  );
}
