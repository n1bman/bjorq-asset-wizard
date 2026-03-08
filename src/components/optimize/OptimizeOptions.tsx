import type { OptimizeOptions as Opts } from "@/types/api";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  options: Opts;
  onChange: (opts: Opts) => void;
}

const activeToggles: { key: keyof Opts; label: string }[] = [
  { key: "removeEmptyNodes", label: "Remove empty nodes" },
  { key: "removeUnusedNodes", label: "Remove unused nodes" },
  { key: "removeCameras", label: "Remove cameras" },
  { key: "removeLights", label: "Remove lights" },
  { key: "removeAnimations", label: "Remove animations" },
];

const alwaysOnDefaults = [
  { label: "Prune unused resources", note: "Always applied" },
  { label: "Deduplicate materials & accessors", note: "Always applied" },
];

const v2Toggles = [
  { label: "Normalize scale" },
  { label: "Set floor to Y=0" },
  { label: "Optimize base color textures" },
];

export function OptimizeOptionsPanel({ options, onChange }: Props) {
  const toggle = (key: keyof Opts) =>
    onChange({ ...options, [key]: !options[key] });

  const set = (key: keyof Opts, value: string) =>
    onChange({ ...options, [key]: value });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Optimization Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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

        {/* Active V1 toggles */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Configurable</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {activeToggles.map((t) => (
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

        {/* V2 planned (disabled) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Coming in V2</Label>
          <div className="grid sm:grid-cols-2 gap-3 opacity-50">
            {v2Toggles.map((t) => (
              <div key={t.label} className="flex items-center justify-between gap-2">
                <Label className="text-sm text-muted-foreground">{t.label}</Label>
                <Switch checked={false} disabled />
              </div>
            ))}
          </div>
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
