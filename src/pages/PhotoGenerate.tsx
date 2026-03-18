import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PipelineStepper } from "@/components/optimize/PipelineStepper";
import { PhotoUploader } from "@/components/generate/PhotoUploader";
import { StyleSelector } from "@/components/generate/StyleSelector";
import { GenerateProgress } from "@/components/generate/GenerateProgress";
import { GenerateReview } from "@/components/generate/GenerateReview";
import { EngineStatus } from "@/components/generate/EngineStatus";
import { createGenerateJob, retryGenerateJob } from "@/services/generate-api";
import { useToast } from "@/hooks/use-toast";
import type { GenerateJobResponse, GenerateTargetProfile, StylePresetId, StyleVariantId } from "@/types/generate";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

type Step = "upload" | "style" | "generate" | "review";

const STEPS = [
  { label: "Upload" },
  { label: "Style" },
  { label: "Generate" },
  { label: "Review" },
];

export default function PhotoGenerate() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [images, setImages] = useState<File[]>([]);
  const [style, setStyle] = useState<StylePresetId>("bjorq-cozy");
  const [target, setTarget] = useState<GenerateTargetProfile>("dashboard-safe");
  const [variant, setVariant] = useState<StyleVariantId>("cozy");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateJobResponse | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepIndex = ["upload", "style", "generate", "review"].indexOf(step);

  const handleGenerate = useCallback(async () => {
    try {
      setStep("generate");
      const res = await createGenerateJob(images, style, target, variant);
      setJobId(res.jobId);
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Could not start generation",
        variant: "destructive",
      });
      setStep("style");
    }
  }, [images, style, target, variant, toast]);

  const handleComplete = useCallback((res: GenerateJobResponse) => {
    setResult(res);
    setStep("review");
  }, []);

  const handleFailed = useCallback(
    (error: string) => {
      toast({
        title: "Generation failed",
        description: error,
        variant: "destructive",
      });
      setStep("style");
    },
    [toast],
  );

  const handleRegenerate = useCallback(async () => {
    if (jobId) {
      try {
        setStep("generate");
        setResult(null);
        const res = await retryGenerateJob(jobId);
        setJobId(res.jobId);
      } catch {
        toast({ title: "Retry failed", variant: "destructive" });
        setStep("review");
      }
    }
  }, [jobId, toast]);

  const handleSaveToLibrary = useCallback(async () => {
    setSaving(true);
    // TODO: call ingestAsset with generated GLB
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    toast({ title: "Asset saved to library" });
  }, [toast]);

  const handleReset = () => {
    setStep("upload");
    setImages([]);
    setJobId(null);
    setResult(null);
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Photo → 3D</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a stylized 3D asset from furniture photos
        </p>
      </div>

      <PipelineStepper steps={STEPS} currentStep={stepIndex} />

      <EngineStatus onReady={() => setEngineReady(true)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {step === "upload" && "Upload Photos"}
            {step === "style" && "Choose Style"}
            {step === "generate" && "Generating Asset"}
            {step === "review" && "Review Result"}
          </CardTitle>
          <CardDescription>
            {step === "upload" && "Add 1–4 photos of the furniture piece"}
            {step === "style" && "Select style, variant and target quality"}
            {step === "generate" && "Your asset is being created"}
            {step === "review" && "Check the result and save to your library"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "upload" && (
            <div className="space-y-4">
              <PhotoUploader images={images} onImagesChange={setImages} />
              <div className="flex justify-end">
                <Button
                  onClick={() => setStep("style")}
                  disabled={images.length === 0}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "style" && (
            <div className="space-y-4">
              <StyleSelector
                style={style}
                target={target}
                variant={variant}
                onStyleChange={setStyle}
                onTargetChange={setTarget}
                onVariantChange={setVariant}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleGenerate} disabled={!engineReady}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 3D Asset
                </Button>
              </div>
            </div>
          )}

          {step === "generate" && jobId && (
            <GenerateProgress
              jobId={jobId}
              onComplete={handleComplete}
              onFailed={handleFailed}
            />
          )}

          {step === "review" && result && (
            <div className="space-y-4">
              <GenerateReview
                job={result}
                inputImages={images}
                onRegenerate={handleRegenerate}
                onSaveToLibrary={handleSaveToLibrary}
                saving={saving}
              />
              <div className="flex justify-center">
                <Button variant="link" onClick={handleReset} className="text-xs">
                  Start over with new photos
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
