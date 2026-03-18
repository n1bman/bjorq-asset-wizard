import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GENERATE_STEP_LABELS, type GenerateJobState, type GenerateJobResponse } from "@/types/generate";
import { getGenerateJobStatus } from "@/services/generate-api";

interface GenerateProgressProps {
  jobId: string;
  onComplete: (result: GenerateJobResponse) => void;
  onFailed: (error: string) => void;
}

const PIPELINE_STEPS: GenerateJobState[] = [
  "preprocessing",
  "generating",
  "styling",
  "optimizing",
  "validating",
];

const POLL_INTERVAL = 1500;

export function GenerateProgress({ jobId, onComplete, onFailed }: GenerateProgressProps) {
  const [job, setJob] = useState<GenerateJobResponse | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await getGenerateJobStatus(jobId);
        if (cancelled) return;
        setJob(res);

        if (res.status === "done" || res.status === "preview_ready") {
          clearInterval(intervalRef.current);
          onComplete(res);
        } else if (res.status === "failed") {
          clearInterval(intervalRef.current);
          onFailed(res.error || "Generation failed");
        }
      } catch {
        // keep polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [jobId, onComplete, onFailed]);

  const currentStepIndex = job ? PIPELINE_STEPS.indexOf(job.status as GenerateJobState) : -1;
  const progressValue = job?.progress ?? 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-foreground">
          {job ? GENERATE_STEP_LABELS[job.status] : "Starting…"}
        </p>
        <p className="text-xs text-muted-foreground">This may take a minute</p>
      </div>

      <Progress value={progressValue} className="max-w-md mx-auto" />

      {/* Step list */}
      <div className="max-w-sm mx-auto space-y-2">
        {PIPELINE_STEPS.map((step, i) => {
          const isComplete = currentStepIndex > i;
          const isActive = currentStepIndex === i;
          const isFailed = job?.status === "failed" && isActive;

          return (
            <div key={step} className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : isFailed ? (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-muted shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  isComplete && "text-foreground",
                  isActive && "text-foreground font-medium",
                  !isComplete && !isActive && "text-muted-foreground",
                )}
              >
                {GENERATE_STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
