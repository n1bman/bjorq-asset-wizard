import type { AnalysisResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceBadge } from "./PerformanceBadge";
import { RecommendationList } from "./RecommendationList";
import { Separator } from "@/components/ui/separator";

interface Props {
  data: AnalysisResponse["analysis"];
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function AnalysisResults({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* File info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">File Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatItem label="File" value={data.fileName} />
          <StatItem label="Format" value={data.fileFormat.toUpperCase()} />
          <StatItem label="Size" value={`${data.fileSizeMB} MB`} />
          <StatItem label="Status" value={data.status.replace(/_/g, " ")} />
        </CardContent>
      </Card>

      {/* Geometry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Geometry</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <StatItem label="Triangles" value={data.geometry.triangleCount.toLocaleString()} />
          <StatItem label="Meshes" value={data.geometry.meshCount} />
          <StatItem label="Vertices" value={data.geometry.vertexCount.toLocaleString()} />
        </CardContent>
      </Card>

      {/* Materials & Textures */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Materials ({data.materials.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {data.materials.names.map((n) => (
                <span key={n} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                  {n}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Textures ({data.textures.count})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {data.textures.details.slice(0, 4).map((t) => (
              <div key={t.name} className="flex justify-between text-muted-foreground">
                <span className="text-foreground">{t.name}</span>
                <span>{t.width}×{t.height}</span>
              </div>
            ))}
            {data.textures.details.length > 4 && (
              <p className="text-xs text-muted-foreground">+{data.textures.details.length - 4} more</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dimensions & Performance */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <StatItem label="Width" value={`${data.dimensions.width} ${data.dimensions.unit}`} />
            <StatItem label="Depth" value={`${data.dimensions.depth} ${data.dimensions.unit}`} />
            <StatItem label="Height" value={`${data.dimensions.height} ${data.dimensions.unit}`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Desktop</p>
              <PerformanceBadge status={data.performance.desktop} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tablet</p>
              <PerformanceBadge status={data.performance.tablet} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Low-power</p>
              <PerformanceBadge status={data.performance.lowPower} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Recommendations */}
      <RecommendationList items={data.recommendations} />
    </div>
  );
}
