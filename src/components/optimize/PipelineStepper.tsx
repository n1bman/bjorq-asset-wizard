import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function PipelineStepper({ steps, currentStep, className }: Props) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors",
                  isComplete && "bg-primary border-primary text-primary-foreground",
                  isActive && "border-primary text-primary bg-primary/10",
                  !isComplete && !isActive && "border-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs text-center leading-tight truncate w-full",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full mt-[-1rem]",
                  isComplete ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
