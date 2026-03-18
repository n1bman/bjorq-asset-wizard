import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Save, ExternalLink, Shield, Sparkles } from "lucide-react";
import type { GenerateJobResponse } from "@/types/generate";

interface GenerateReviewProps {
  job: GenerateJobResponse;
  inputImages: File[];
  onRegenerate: () => void;
  onSaveToLibrary: () => void;
  saving?: boolean;
}

export function GenerateReview({
  job,
  inputImages,
  onRegenerate,
  onSaveToLibrary,
  saving = false,
}: GenerateReviewProps) {
  const result = job.result;
  const meta = result?.metadata;

  return (
    <div className="space-y-6">
      {/* 3D Preview */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center overflow-hidden">
            {result?.thumbnail ? (
              <img
                src={result.thumbnail}
                alt="Generated asset preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Preview not available</p>
            )}
          </div>
          <div className="p-4 space-y-3">
            {/* Quality badges — user-friendly, no raw numbers */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Bjorq Stylized
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Dashboard Safe
              </Badge>
              {meta?.forcedMinimal && (
                <Badge variant="outline" className="text-muted-foreground">
                  Simplified
                </Badge>
              )}
            </div>

            {/* Subtle technical info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {meta?.triangles != null && (
                  <span>{Number(meta.triangles).toLocaleString()} tris</span>
                )}
                {meta?.fileSizeKB != null && (
                  <span>{Number(meta.fileSizeKB) < 1024
                    ? `${meta.fileSizeKB} KB`
                    : `${(Number(meta.fileSizeKB) / 1024).toFixed(1)} MB`
                  }</span>
                )}
                {meta?.materials != null && (
                  <span>{String(meta.materials)} mat{Number(meta.materials) !== 1 ? "s" : ""}</span>
                )}
              </div>
              {result?.model && (
                <a
                  href={result.model}
                  download
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Download GLB
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input images */}
      {inputImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Source photos</p>
          <div className="flex gap-2">
            {inputImages.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="h-16 w-16 rounded border border-border overflow-hidden"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Source ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRegenerate} disabled={saving}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Generate New Variation
        </Button>
        <Button onClick={onSaveToLibrary} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save to Library"}
        </Button>
      </div>
    </div>
  );
}
