import { useState, useMemo, useCallback } from "react";
import { FileUploader, type UploadState } from "@/components/upload/FileUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { OptimizeOptionsPanel } from "@/components/optimize/OptimizeOptions";
import { StatsComparison } from "@/components/optimize/StatsComparison";
import { PipelineStepper } from "@/components/optimize/PipelineStepper";
import { ModelThumbnailCapture, dataUrlToFile } from "@/components/optimize/ModelThumbnailCapture";
import { analyzeModel, optimizeModel, ingestAsset } from "@/services/api";
import { ApiError } from "@/services/api-client";
import { resolveStoragePath } from "@/lib/asset-paths";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { OptimizeOptions, OptimizeResponse, AnalysisResponse, ImportType, IngestMeta } from "@/types/api";
import { Download, FolderPlus, AlertTriangle, AlertCircle, Hash, Tag, Briefcase, Cpu, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

const directUrl = `http://${typeof window !== "undefined" ? window.location.hostname : "homeassistant.local"}:3500`;
import { STAGE_LABELS, CATALOG_ASSET_WARN_SIZE_MB, deriveTargetProfile, formatFileSize, type ProcessingStage } from "@/lib/upload-limits";

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
  const [importType] = useState<ImportType>("direct-upload");
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [options, setOptions] = useState<OptimizeOptions>(defaultOptions);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<{ stage?: ProcessingStage; message?: string; details?: string } | undefined>();
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);

  const isConversion = importType === "converted-project";
  const steps = useMemo(() => (isConversion ? CONVERT_STEPS : DIRECT_STEPS), [isConversion]);

  const analyzeStep = isConversion ? 2 : 1;
  const configStep = isConversion ? 3 : 2;
  const optimizeStep = isConversion ? 4 : 3;
  const reviewStep = isConversion ? 5 : 4;
  const doneStep = isConversion ? 6 : 5;

  /** Extract structured error from ApiError or generic Error */
  function extractError(e: unknown, fallbackStage: ProcessingStage): { stage: ProcessingStage; message: string; details?: string } {
    if (e instanceof ApiError) {
      let stage = fallbackStage;
      if (e.stage && ["upload", "parse", "analyze", "optimize", "ingest"].includes(e.stage)) {
        stage = e.stage as ProcessingStage;
      } else if (e.stage === "glb_parse") {
        stage = "parse";
      } else if (e.stage === "geometry_scan" || e.stage === "texture_scan" || e.stage === "bounding_box") {
        stage = "analyze";
      }
      return { stage, message: e.message, details: e.details };
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { stage: fallbackStage, message: msg };
  }

  const handleFileSelected = (f: File) => {
    setFile(f);
    setError(undefined);
    setCapturedThumbnail(null);
    setStep(analyzeStep);
    handleAnalyze(f);
  };

  const handleAnalyze = async (f: File) => {
    setLoading(true);
    setUploadState("uploading");
    setUploadProgress(0);
    try {
      const res = await analyzeModel(f, (pct) => {
        setUploadProgress(pct);
        if (pct >= 100) setUploadState("processing");
      });
      setAnalysis(res);
      setUploadState("complete");
      setStep(configStep);
    } catch (e: unknown) {
      const err = extractError(e, "analyze");
      setError(err);
      setUploadState("error");
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!file) return;
    setStep(optimizeStep);
    setLoading(true);
    setUploadState("uploading");
    setUploadProgress(0);
    setError(undefined);
    setCapturedThumbnail(null);
    try {
      const res = await optimizeModel(file, options, (pct) => {
        setUploadProgress(pct);
        if (pct >= 100) setUploadState("processing");
      });
      setResult(res);
      setUploadState("complete");
      setStep(reviewStep);
      toast({ title: "Optimization complete", description: `Job ID: ${res.jobId}` });
    } catch (e: unknown) {
      const err = extractError(e, "optimize");
      setError(err);
      setUploadState("error");
      toast({ title: "Optimization failed", description: err.message, variant: "destructive" });
      setStep(configStep);
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailCapture = useCallback((dataUrl: string) => {
    setCapturedThumbnail(dataUrl);
  }, []);

  const handleSaveToCatalog = async () => {
    if (!result) return;
    setLoading(true);
    setError(undefined);
    try {
      const meta: IngestMeta = {
        id: result.metadata.id,
        name: result.metadata.name || result.metadata.id,
        category: result.metadata.category || "uncategorized",
        subcategory: result.metadata.subcategory || "general",
        style: result.metadata.style || "",
        dimensions: result.metadata.dimensions,
      };
      // Convert captured thumbnail to File for upload
      const thumbnailFile = capturedThumbnail ? dataUrlToFile(capturedThumbnail) : undefined;
      await ingestAsset(meta, undefined, thumbnailFile, result.jobId);
      toast({ title: "Saved to catalog", description: `Asset ${meta.name} ingested successfully.` });
      setStep(doneStep);
    } catch (e: unknown) {
      const err = extractError(e, "ingest");
      setError(err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
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
    setUploadState("idle");
    setUploadProgress(0);
    setError(undefined);
    setCapturedThumbnail(null);
  };

  // Resolve optimized model URL for thumbnail capture
  const optimizedModelUrl = result?.outputs?.optimizedModel
    ? resolveStoragePath(result.outputs.optimizedModel)
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Optimize</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full optimization pipeline: upload, analyze, configure, optimize, review, and save.
        </p>
      </div>

      <PipelineStepper steps={steps} currentStep={step} />

      {/* Large-file direct-mode hint */}
      {step === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 p-3">
          <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p>For files larger than ~10 MB, use direct mode to avoid HA ingress limits.</p>
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open Wizard in direct mode (Port 3500)
            </a>
          </div>
        </div>
      )}

      {/* Step 0: Upload */}
      {step === 0 && (
        <FileUploader
          onFileSelected={handleFileSelected}
          isLoading={loading}
          uploadState={uploadState}
          uploadProgress={uploadProgress}
          processingStage="Analyzing model"
          error={error}
          onReset={handleReset}
        />
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
          <CardContent className="py-10 text-center space-y-3">
            {uploadState === "uploading" ? (
              <>
                <p className="text-sm text-foreground font-medium">Uploading model…</p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
              </>
            ) : (
              <>
                <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Analyzing model…</p>
              </>
            )}
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
          <CardContent className="py-10 text-center space-y-3">
            {uploadState === "uploading" ? (
              <>
                <p className="text-sm text-foreground font-medium">Uploading model for optimization…</p>
                <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
              </>
            ) : (
              <>
                <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Optimizing — this may take a while for large files…</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error during optimize/ingest at step level */}
      {error && step !== 0 && step !== reviewStep && !loading && (
        <Card className="border-destructive/30">
          <CardContent className="py-6 text-center space-y-3">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {error.stage ? STAGE_LABELS[error.stage] : "Processing failed"}
            </p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            {error.details && (
              <details className="text-left max-w-md mx-auto">
                <summary className="text-xs text-muted-foreground/50 cursor-pointer hover:text-muted-foreground">
                  Show details
                </summary>
                <pre className="mt-1 text-[10px] text-muted-foreground/50 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-muted/30 rounded p-2">
                  {error.details}
                </pre>
              </details>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              Start Over
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Review — includes hidden thumbnail capture */}
      {step === reviewStep && result && (
        <>
          {optimizedModelUrl && !capturedThumbnail && (
            <ModelThumbnailCapture
              modelUrl={optimizedModelUrl}
              onCapture={handleThumbnailCapture}
              size={512}
            />
          )}
          <ReviewSection
            result={result}
            originalFileSizeBytes={file?.size}
            onSave={handleSaveToCatalog}
            saving={loading}
            ingestError={error?.stage === "ingest" ? error : undefined}
            thumbnailDataUrl={capturedThumbnail}
          />
        </>
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
  originalFileSizeBytes,
  onSave,
  saving,
  ingestError,
  thumbnailDataUrl,
}: {
  result: OptimizeResponse;
  originalFileSizeBytes?: number;
  onSave: () => void;
  saving?: boolean;
  ingestError?: { stage?: ProcessingStage; message?: string; details?: string };
  thumbnailDataUrl?: string | null;
}) {
  const optimizedSizeKB = result.stats.after.fileSizeKB;
  const optimizedSizeMB = optimizedSizeKB / 1024;
  const catalogWarn = optimizedSizeMB > CATALOG_ASSET_WARN_SIZE_MB;
  const targetProfile = deriveTargetProfile(
    result.stats.after.triangles,
    optimizedSizeKB,
    result.metadata.placement,
  );

  const reductionPct = result.stats.reduction.fileSizePercent;
  const originalKB = originalFileSizeBytes ? Math.round(originalFileSizeBytes / 1024) : result.stats.before.fileSizeKB;

  const handleDownload = async () => {
    const modelPath = result.outputs.optimizedModel;
    const url = resolveStoragePath(modelPath);
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${result.metadata.name || result.metadata.id}.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("[Download]", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Thumbnail Preview */}
      {thumbnailDataUrl && (
        <Card>
          <CardContent className="py-4 flex justify-center">
            <img
              src={thumbnailDataUrl}
              alt={`3D preview of ${result.metadata.name}`}
              className="rounded-lg max-w-[256px] max-h-[256px] object-contain border border-border"
            />
          </CardContent>
        </Card>
      )}

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

      {/* Enhanced stats with original size & target profile */}
      <Card>
        <CardContent className="py-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Original Size</p>
              <p className="font-medium text-foreground">{formatFileSize(originalKB * 1024)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Optimized Size</p>
              <p className="font-medium text-foreground">{formatFileSize(optimizedSizeKB * 1024)}</p>
              <p className="text-xs text-muted-foreground">-{reductionPct.toFixed(1)}%</p>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Target Profile</p>
                <Badge variant="secondary" className="text-xs capitalize">{targetProfile}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatsComparison stats={result.stats} />

      {/* V2 Operations Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">V2 Optimization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <V2OpRow
            label="Normalize Scale"
            description="Flatten transforms into vertex data"
            applied={result.optimization.applied.includes("normalizeScale")}
            warning={result.optimization.warnings.find((w) => w.operation === "normalizeScale")?.message}
          />
          <V2OpRow
            label="Floor Alignment (Y=0)"
            description="Shift model so lowest point sits at Y=0"
            applied={result.optimization.applied.includes("setFloorToY0")}
            skippedReason={result.optimization.skipped.find((s) => s.operation === "setFloorToY0")?.reason}
          />
          <V2OpRow
            label="Texture Optimization"
            description={`Resize oversized base color textures (max ${result.stats.before.maxTextureRes}px → ${result.stats.after.maxTextureRes}px)`}
            applied={result.optimization.applied.includes("optimizeBaseColorTextures")}
            skippedReason={result.optimization.skipped.find((s) => s.operation === "optimizeBaseColorTextures")?.reason}
            warning={result.optimization.warnings.find((w) => w.operation === "optimizeBaseColorTextures")?.message}
          />
          <V2OpRow
            label="Mesh Simplification"
            description="Reduce triangle count via weld + simplify"
            applied={result.optimization.applied.includes("meshSimplify")}
            skippedReason={result.optimization.skipped.find((s) => s.operation === "meshSimplify")?.reason}
            warning={result.optimization.warnings.find((w) => w.operation === "meshSimplify")?.message}
          />
          {result.stats.reduction.texturesResized > 0 && (
            <p className="text-xs text-muted-foreground ml-6">
              {result.stats.reduction.texturesResized} texture(s) resized
            </p>
          )}
        </CardContent>
      </Card>

      {/* Catalog size warning */}
      {catalogWarn && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Optimized file is {optimizedSizeMB.toFixed(1)} MB — larger than the recommended {CATALOG_ASSET_WARN_SIZE_MB} MB for catalog assets.
            Consider further optimization before saving.
          </p>
        </div>
      )}

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
              <Badge key={op} variant="default" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> {op}
              </Badge>
            ))}
            {result.optimization.skipped.map((s) => (
              <TooltipProvider key={s.operation}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs gap-1 opacity-60">
                      <XCircle className="h-3 w-3" /> {s.operation}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {s.reason}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Optimization Explanations */}
      {result.optimization.explanations && result.optimization.explanations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Optimization Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {result.optimization.explanations.map((note, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {result.optimization.warnings.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {result.optimization.warnings.map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                <span className="font-mono text-yellow-500">{w.operation}</span>: {w.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ingest error */}
      {ingestError && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 text-center space-y-2">
            <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {ingestError.stage ? STAGE_LABELS[ingestError.stage] : "Save failed"}
            </p>
            <p className="text-xs text-muted-foreground">{ingestError.message}</p>
            {ingestError.details && (
              <details className="text-left max-w-md mx-auto">
                <summary className="text-xs text-muted-foreground/50 cursor-pointer">Show details</summary>
                <pre className="mt-1 text-[10px] text-muted-foreground/50 font-mono whitespace-pre-wrap break-all max-h-24 overflow-y-auto bg-muted/30 rounded p-2">
                  {ingestError.details}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Action */}
      <div className="flex gap-3">
        <Button onClick={onSave} disabled={saving} className="flex-1 gap-1.5">
          <FolderPlus className="h-4 w-4" />
          {saving ? "Saving…" : "Save to Catalog"}
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={handleDownload}>
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>
    </div>
  );
}

/* ── V2 Operation Row ── */

function V2OpRow({
  label,
  description,
  applied,
  skippedReason,
  warning,
}: {
  label: string;
  description: string;
  applied: boolean;
  skippedReason?: string;
  warning?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {applied ? (
        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={applied ? "text-foreground" : "text-muted-foreground/70"}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {skippedReason && !applied && (
          <p className="text-xs text-muted-foreground/70 italic mt-0.5">Skipped: {skippedReason}</p>
        )}
        {warning && (
          <p className="text-xs text-yellow-500 mt-0.5">⚠ {warning}</p>
        )}
      </div>
    </div>
  );
}

/* ── Output Row ── */

function OutputRow({ label, path }: { label: string; path: string }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-xs truncate max-w-[200px]" title={path}>
        {path}
      </span>
    </div>
  );
}
