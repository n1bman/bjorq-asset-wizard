/**
 * Upload and storage limits — shared constants and validation helpers.
 *
 * These limits are enforced client-side for fast feedback.
 * The backend enforces the same limits independently.
 */

/** Maximum source file upload size in bytes (100 MB) */
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_MB = 100;

/** Warn the user when a file exceeds this threshold (50 MB) */
export const LARGE_FILE_WARNING_MB = 50;

/** Warn before catalog ingest if optimized asset exceeds this (25 MB) */
export const CATALOG_ASSET_WARN_SIZE_MB = 25;

/** Catalog total storage soft limit (2 GB) */
export const CATALOG_SOFT_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

/** Catalog total storage hard limit (5 GB) */
export const CATALOG_HARD_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

/** Frontend request timeout for regular API calls (2 min) */
export const REQUEST_TIMEOUT = 120_000;

/** Frontend timeout for upload-heavy calls like /analyze and /optimize (5 min) */
export const UPLOAD_TIMEOUT = 300_000;

export type FileSizeValidation = {
  ok: boolean;
  fileSizeMB: number;
  warning?: string;
  error?: string;
};

/** Validate a file before upload. Returns warning/error messages. */
export function validateFileSize(file: File): FileSizeValidation {
  const fileSizeMB = +(file.size / (1024 * 1024)).toFixed(1);

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      fileSizeMB,
      error: `File is ${fileSizeMB} MB — exceeds the ${MAX_UPLOAD_SIZE_MB} MB upload limit.`,
    };
  }

  if (fileSizeMB >= LARGE_FILE_WARNING_MB) {
    return {
      ok: true,
      fileSizeMB,
      warning: `Large file (${fileSizeMB} MB) — analysis and optimization may take longer.`,
    };
  }

  return { ok: true, fileSizeMB };
}

/** Format bytes to a human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Processing failure stages — used to show clear error messages.
 */
export type ProcessingStage = "upload" | "parse" | "analyze" | "optimize" | "ingest";

export const STAGE_LABELS: Record<ProcessingStage, string> = {
  upload: "File upload failed",
  parse: "Could not read the 3D model file",
  analyze: "Model analysis failed",
  optimize: "Optimization failed",
  ingest: "Failed to save to catalog",
};

/** Target profile for asset suitability */
export type TargetProfile = "mobile" | "tablet" | "wall" | "desktop" | "heavy";

export function deriveTargetProfile(
  triangles: number,
  fileSizeKB: number,
  placement?: string,
): TargetProfile {
  const sizeMB = fileSizeKB / 1024;

  // Wall-mounted assets have tighter limits
  if (placement === "wall" && triangles < 25000 && sizeMB < 5) return "wall";

  if (triangles < 10000 && sizeMB < 2) return "mobile";
  if (triangles < 50000 && sizeMB < 10) return "tablet";
  if (triangles < 100000 && sizeMB < 25) return "desktop";
  return "heavy";
}
