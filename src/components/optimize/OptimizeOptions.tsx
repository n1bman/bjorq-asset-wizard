import type { OptimizeOptions as Opts } from "@/types/api";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  options: Opts;
  onChange: (opts: Opts) => void;
}

const toggles: { key: keyof Opts; label: string }[] = [
  { key: "removeEmptyNodes", label: "Remove empty nodes" },
  { key: "removeUnusedNodes", label: "Remove unused nodes" },
  { key: "removeCameras", label: "Remove cameras" },
  { key: "removeLights", label: "Remove lights" },
  { key: "removeAnimations", label: "Remove animations" },
  { key: "deduplicateMaterials", label: "Deduplicate materials" },
  { key: "normalizeScale", label: "Normalize scale" },
  { key: "setFloorToY0", label: "Set floor to Y=0" },
  { key: "optimizeBaseColorTextures", label: "Optimize base color textures" },
];

export function OptimizeOptionsPanel({ options, onChange }: Props) {
  const toggle = (key: keyof Opts) =>
    onChange({ ...options, [key]: !options[key] });

  const set = (key: keyof Opts, value: string | number) =>
    onChange({ ...options, [key]: value });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Optimization Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-2">
              <Label className="text-sm text-foreground">{t.label}</Label>
              <Switch
                checked={options[t.key] as boolean ?? true}
                onCheckedChange={() => toggle(t.key)}
              />
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Max Texture Size</Label>
            <Input
              type="number"
              value={options.maxTextureSize ?? 2048}
              onChange={(e) => set("maxTextureSize", +e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Texture Quality</Label>
            <Input
              type="number"
              value={options.textureQuality ?? 85}
              onChange={(e) => set("textureQuality", +e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Asset Name</Label>
            <Input
              value={options.assetName ?? ""}
              onChange={(e) => set("assetName", e.target.value)}
              placeholder="e.g. Nordic Sofa"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
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
