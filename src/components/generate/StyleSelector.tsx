import { cn } from "@/lib/utils";
import { Paintbrush, Gauge, Palette } from "lucide-react";
import {
  STYLE_PRESETS,
  STYLE_VARIANTS,
  type StylePresetId,
  type GenerateTargetProfile,
  type StyleVariantId,
} from "@/types/generate";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface StyleSelectorProps {
  style: StylePresetId;
  target: GenerateTargetProfile;
  variant: StyleVariantId;
  onStyleChange: (style: StylePresetId) => void;
  onTargetChange: (target: GenerateTargetProfile) => void;
  onVariantChange: (variant: StyleVariantId) => void;
  disabled?: boolean;
}

const TARGET_OPTIONS: { value: GenerateTargetProfile; label: string; description: string }[] = [
  { value: "dashboard-safe", label: "Dashboard Safe", description: "Lightweight, optimized for dashboards (default)" },
  { value: "ultra-light", label: "Ultra Light", description: "Maximum compression for low-power devices" },
  { value: "standard", label: "Standard", description: "Higher detail, suitable for desktop viewing" },
];

export function StyleSelector({
  style,
  target,
  variant,
  onStyleChange,
  onTargetChange,
  onVariantChange,
  disabled = false,
}: StyleSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Style preset */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Style Preset</h3>
        </div>

        <div className="grid gap-3">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onStyleChange(preset.id)}
              disabled={disabled}
              className={cn(
                "text-left rounded-lg border-2 p-4 transition-colors",
                style === preset.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              <p className="text-sm font-medium text-foreground">{preset.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Style variant */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Style Variant</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {STYLE_VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => onVariantChange(v.id)}
              disabled={disabled}
              className={cn(
                "text-left rounded-lg border-2 p-3 transition-colors",
                variant === v.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              <p className="text-xs font-medium text-foreground">{v.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{v.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Target profile */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Target Profile</h3>
        </div>

        <RadioGroup
          value={target}
          onValueChange={(v) => onTargetChange(v as GenerateTargetProfile)}
          disabled={disabled}
          className="space-y-2"
        >
          {TARGET_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                target === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
              <div>
                <Label htmlFor={opt.value} className="text-sm font-medium cursor-pointer">
                  {opt.label}
                </Label>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
