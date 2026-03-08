/**
 * Asset naming / slug utilities.
 *
 * Used for metadata only — storage isolation uses jobId.
 */

import { basename, extname } from "node:path";

/**
 * Convert a human-readable name to a URL-safe slug.
 * "Google Home Mini" → "google-home-mini"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "asset";
}

/**
 * Derive an asset ID slug from user-provided name or uploaded filename.
 */
export function deriveAssetId(assetName?: string, fileName?: string): { id: string; name: string } {
  if (assetName && assetName.trim()) {
    return {
      id: slugify(assetName),
      name: assetName.trim(),
    };
  }

  if (fileName) {
    const base = basename(fileName, extname(fileName));
    const clean = base.replace(/[_]+/g, " ").trim();
    return {
      id: slugify(clean),
      name: clean || "Unnamed Asset",
    };
  }

  return { id: "unnamed-asset", name: "Unnamed Asset" };
}
