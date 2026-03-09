import type { AssetMetadata } from "@/types/api";
import { Box, ImageOff } from "lucide-react";
import { useState } from "react";
import { getAssetThumbnailUrl } from "@/lib/asset-paths";

interface Props {
  asset: AssetMetadata;
  className?: string;
  size?: "sm" | "lg";
}

export function AssetPreviewPanel({ asset, className = "", size = "sm" }: Props) {
  const [imgError, setImgError] = useState(false);
  const hasThumbnail = asset.thumbnail != null && asset.thumbnail.length > 0;
  const showImage = hasThumbnail && !imgError;
  const aspectClass = size === "lg" ? "aspect-video" : "aspect-video";

  // Use the ingress-safe thumbnail endpoint
  const thumbnailSrc = hasThumbnail ? getAssetThumbnailUrl(asset.id) : null;

  return (
    <div className={`${aspectClass} bg-muted/30 rounded-lg flex flex-col items-center justify-center relative overflow-hidden ${className}`}>
      {showImage && thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt={`${asset.name} preview`}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          {hasThumbnail && imgError ? (
            <ImageOff className="h-12 w-12 text-muted-foreground/30" />
          ) : (
            <Box className={size === "lg" ? "h-20 w-20 text-muted-foreground/30" : "h-16 w-16 text-muted-foreground/30"} />
          )}
          <p className="text-xs text-muted-foreground/60 mt-2">
            {hasThumbnail && imgError ? "Thumbnail failed to load" : "Preview unavailable"}
          </p>
        </>
      )}

      {/* Diagnostic info */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-2 py-1 text-[10px] font-mono text-muted-foreground/50 space-y-0.5 opacity-0 hover:opacity-100 transition-opacity">
        <p className="truncate">model: {asset.model || "—"}</p>
        <p className="truncate">thumb: {asset.thumbnail || "null"}</p>
      </div>
    </div>
  );
}
