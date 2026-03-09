import type { OptimizeOptions as Opts, OptimizationProfile } from "@/types/api";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Zap, Scale, Sparkles } from "lucide-react";

interface Props {
  options: Opts;
  onChange: (opts: Opts) => void;
}

const cleanupToggles: { key: keyof Opts; label: string }[] = [
  { key: "removeEmptyNodes", label: "Remove empty nodes" },
  { key: "removeUnusedNodes", label: "Remove unused nodes" },
  { key: "removeCameras", label: "Remove cameras" },
  { key: "removeLights", label: "Remove lights" },
  { key: "removeAnimations", label: "Remove animations" },
];

const normalizationToggles: { key: keyof Opts; label: string }[] = [
  { key: "normalizeScale", label: "Normalize scale" },
  { key: "setFloorToY0", label: "Set floor to Y=0" },
  { key: "optimizeBaseColorTextures", label: "Optimize base color textures" },
];

const alwaysOnDefaults = [
  { label: "Prune unused resources", note: "Always applied" },
  { label: "Deduplicate materials & accessors", note: "Always applied" },
];

const TEXTURE_SIZE_OPTIONS = [
  { value: "512", label: "512 px" },
  { value: "1024", label: "1024 px" },
  { value: "2048", label: "2048 px (default)" },
  { value: "4096", label: "4096 px" },
];

const PROFILE_INFO: Record<OptimizationProfile, { label: string; description: string }> = {
  "high-quality": {
    label: "High Quality",
    description: "Minimal cleanup, preserves textures and animations",
  },
  balanced: {
    label: "Balanced",
    description: "Standard cleanup + normalization + texture resize (2048)",
  },
  "low-power": {
    label: "Low Power",
    description: "Aggressive cleanup, small textures (512), all normalization",
  },
};

export function OptimizeOptionsPanel({ options, onChange }: Props) {
  const toggle = (key: keyof Opts) =>
    onChange({ ...options, [key]: !options[key] });

  const set = (key: keyof Opts, value: string) =>
    onChange({ ...options, [key]: value });

  const handleProfileChange = (value: string) => {
    if (!value) return;
    const profile = value as OptimizationProfile;
    // Reset individual options when switching profile — let server apply presets
    onChange({
      profile,
      assetName: options.assetName,
      category: options.category,
      subcategory: options.subcategory,
      style: options.style,
      placement: options.placement,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Optimization Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Profile selector */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Optimization Profile</Label>
          <ToggleGroup
            type="single"
            value={options.profile || "balanced"}
            onValueChange={handleProfileChange}
            className="justify-start"
          >
            <ToggleGroupItem value="high-quality" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> High Quality
            </ToggleGroupItem>
            <ToggleGroupItem value="balanced" className="gap-1.5 text-xs">
              <Scale className="h-3.5 w-3.5" /> Balanced
            </ToggleGroupItem>
            <ToggleGroupItem value="low-power" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> Low Power
            </ToggleGroupItem>
          </ToggleGroup>
          {options.profile && (
            <p className="text-xs text-muted-foreground">{PROFILE_INFO[options.profile].description}</p>
          )}
        </div>

        {/* Always-on defaults */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Default Steps</Label>
          <div className="flex flex-wrap gap-2">
            {alwaysOnDefaults.map((d) => (
              <Badge key={d.label} variant="secondary" className="text-xs">
                {d.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Cleanup toggles */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cleanup</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {cleanupToggles.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-2">
                <Label className="text-sm text-foreground">{t.label}</Label>
                <Switch
                  checked={options[t.key] as boolean ?? true}
                  onCheckedChange={() => toggle(t.key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Normalization & texture toggles (V2) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Normalization & Textures</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {normalizationToggles.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-2">
                <Label className="text-sm text-foreground">{t.label}</Label>
                <Switch
                  checked={options[t.key] as boolean ?? true}
                  onCheckedChange={() => toggle(t.key)}
                />
              </div>
            ))}
          </div>

          {/* Max texture size selector — visible when texture optimization is enabled */}
          {options.optimizeBaseColorTextures !== false && (
            <div className="mt-2 max-w-xs space-y-1">
              <Label className="text-xs text-muted-foreground">Max texture size</Label>
              <Select
                value={String(options.maxTextureSize ?? 2048)}
                onValueChange={(v) => onChange({ ...options, maxTextureSize: Number(v) })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXTURE_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Asset metadata inputs */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Asset Name</Label>
            <Input
              value={options.assetName ?? ""}
              onChange={(e) => set("assetName", e.target.value)}
              placeholder="e.g. Nordic Sofa"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Input
              value={options.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
              placeholder="furniture"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Subcategory</Label>
            <Input
              value={options.subcategory ?? ""}
              onChange={(e) => set("subcategory", e.target.value)}
              placeholder="sofas"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Input
              value={options.style ?? ""}
              onChange={(e) => set("style", e.target.value)}
              placeholder="modern"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
