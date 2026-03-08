import type { OptimizeResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";

interface Props {
  stats: OptimizeResponse["stats"];
}

function Row({ label, before, after }: { label: string; before: string | number; after: string | number }) {
  return (
    <div className="grid grid-cols-3 text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-center">{before}</span>
      <span className="text-foreground text-center font-medium">{after}</span>
    </div>
  );
}

export function StatsComparison({ stats }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Optimization Results</CardTitle>
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <ArrowDown className="h-4 w-4" />
            {stats.reduction.fileSizePercent}% smaller
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 text-xs text-muted-foreground border-b border-border pb-2 mb-1">
          <span>Metric</span>
          <span className="text-center">Before</span>
          <span className="text-center">After</span>
        </div>
        <Row label="File Size" before={`${stats.before.fileSizeKB} KB`} after={`${stats.after.fileSizeKB} KB`} />
        <Row label="Triangles" before={stats.before.triangles.toLocaleString()} after={stats.after.triangles.toLocaleString()} />
        <Row label="Materials" before={stats.before.materials} after={stats.after.materials} />
        <Row label="Textures" before={stats.before.textures} after={stats.after.textures} />
        <Row label="Max Texture" before={`${stats.before.maxTextureRes}px`} after={`${stats.after.maxTextureRes}px`} />
      </CardContent>
    </Card>
  );
}
