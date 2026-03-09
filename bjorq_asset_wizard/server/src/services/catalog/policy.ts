/**
 * Catalog storage policy — limits and usage tracking.
 *
 * Enforces soft/hard limits on total catalog size and
 * warns when individual assets exceed recommended thresholds.
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { CATALOG_PATH } from "../../lib/storage.js";

/** Catalog total storage soft limit (2 GB) — warns but allows */
export const CATALOG_SOFT_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

/** Catalog total storage hard limit (5 GB) — blocks ingest */
export const CATALOG_HARD_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

/** Warn if a single optimized asset exceeds this (25 MB) */
export const ASSET_WARN_SIZE_BYTES = 25 * 1024 * 1024;

export interface StorageUsage {
  totalBytes: number;
  totalMB: number;
  totalGB: number;
  assetCount: number;
}

export interface CatalogPolicyResult {
  usage: StorageUsage;
  limits: {
    softLimitGB: number;
    hardLimitGB: number;
    assetWarnSizeMB: number;
  };
  warnings: string[];
  blocked: boolean;
}

export interface AssetSizeEvaluation {
  ok: boolean;
  warnings: string[];
}

/** Recursively calculate total size of a directory */
async function dirSize(dirPath: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = await dirSize(fullPath);
        bytes += sub.bytes;
        files += sub.files;
      } else if (entry.isFile()) {
        try {
          const s = await stat(fullPath);
          bytes += s.size;
          files++;
        } catch {
          // skip inaccessible files
        }
      }
    }
  } catch {
    // directory doesn't exist or inaccessible
  }

  return { bytes, files };
}

/** Get current catalog storage usage */
export async function getCatalogStorageUsage(): Promise<StorageUsage> {
  const { bytes, files } = await dirSize(CATALOG_PATH);
  return {
    totalBytes: bytes,
    totalMB: +(bytes / (1024 * 1024)).toFixed(1),
    totalGB: +(bytes / (1024 * 1024 * 1024)).toFixed(2),
    assetCount: files,
  };
}

/** Evaluate whether the catalog can accept new assets */
export async function getCatalogPolicy(): Promise<CatalogPolicyResult> {
  const usage = await getCatalogStorageUsage();
  const warnings: string[] = [];
  let blocked = false;

  if (usage.totalBytes >= CATALOG_HARD_LIMIT_BYTES) {
    blocked = true;
    warnings.push(`Catalog storage has reached the hard limit (${(CATALOG_HARD_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB). No new assets can be ingested.`);
  } else if (usage.totalBytes >= CATALOG_SOFT_LIMIT_BYTES) {
    warnings.push(`Catalog storage is above the soft limit (${(CATALOG_SOFT_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(0)} GB). Consider removing unused assets.`);
  }

  return {
    usage,
    limits: {
      softLimitGB: +(CATALOG_SOFT_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(0),
      hardLimitGB: +(CATALOG_HARD_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(0),
      assetWarnSizeMB: +(ASSET_WARN_SIZE_BYTES / (1024 * 1024)).toFixed(0),
    },
    warnings,
    blocked,
  };
}

/** Evaluate an individual asset's suitability for cataloging */
export function evaluateAssetForCatalog(fileSizeBytes: number): AssetSizeEvaluation {
  const warnings: string[] = [];

  if (fileSizeBytes > ASSET_WARN_SIZE_BYTES) {
    const sizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    warnings.push(`Optimized asset is ${sizeMB} MB — larger than the recommended ${(ASSET_WARN_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB for catalog assets.`);
  }

  return { ok: true, warnings };
}
