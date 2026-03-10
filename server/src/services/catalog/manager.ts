/**
 * Catalog Manager — scan, ingest, delete, and reindex the asset catalog.
 *
 * ⚠️  FROZEN v1 FOLDER STRUCTURE:
 *   CATALOG_PATH/<category>/<subcategory>/<assetId>/
 *     model.glb
 *     meta.json
 *     thumb.webp  (optional)
 */

import { readdir, readFile, writeFile, mkdir, copyFile, stat, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { CATALOG_PATH, storagePath } from "../../lib/storage.js";
import type {
  CatalogIndex,
  CatalogCategory,
  CatalogSubcategory,
  CatalogAssetMeta,
  IngestRequest,
  IngestResponse,
} from "../../types/catalog.js";

export const CATALOG_SCHEMA_VERSION = "1.0" as const;
const CATALOG_VERSION = "2.0.7";

// ---------------------------------------------------------------------------
// Required fields for a valid CatalogAssetMeta
// ---------------------------------------------------------------------------

const REQUIRED_META_FIELDS: (keyof CatalogAssetMeta)[] = [
  "id",
  "name",
  "category",
  "schemaVersion",
  "model",
  "placement",
];

/** Validate that an asset meta object has all required fields */
function validateAssetMeta(meta: unknown): meta is CatalogAssetMeta {
  if (!meta || typeof meta !== "object") return false;
  const record = meta as Record<string, unknown>;
  for (const field of REQUIRED_META_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Build catalog index by scanning the directory tree
// ---------------------------------------------------------------------------

export async function buildCatalogIndex(): Promise<CatalogIndex> {
  const categories: CatalogCategory[] = [];
  let totalAssets = 0;

  const categoryDirs = await safeDirEntries(CATALOG_PATH);

  for (const catDir of categoryDirs) {
    const catPath = join(CATALOG_PATH, catDir);
    if (!(await isDirectory(catPath))) continue;
    if (catDir === "index.json") continue;

    const subcategories: CatalogSubcategory[] = [];
    const subDirs = await safeDirEntries(catPath);

    for (const subDir of subDirs) {
      const subPath = join(catPath, subDir);
      if (!(await isDirectory(subPath))) continue;

      const assets: CatalogAssetMeta[] = [];
      const assetDirs = await safeDirEntries(subPath);

      for (const assetDir of assetDirs) {
        const assetPath = join(subPath, assetDir);
        if (!(await isDirectory(assetPath))) continue;

        const metaPath = join(assetPath, "meta.json");
        try {
          const raw = await readFile(metaPath, "utf-8");
          const meta = JSON.parse(raw);
          if (validateAssetMeta(meta)) {
            assets.push(meta as CatalogAssetMeta);
            totalAssets++;
          }
        } catch {
          // Skip assets without valid meta.json
        }
      }

      assets.sort((a, b) => a.name.localeCompare(b.name));

      if (assets.length > 0) {
        subcategories.push({ name: subDir, assets });
      }
    }

    subcategories.sort((a, b) => a.name.localeCompare(b.name));

    if (subcategories.length > 0) {
      categories.push({ name: catDir, subcategories });
    }
  }

  categories.sort((a, b) => a.name.localeCompare(b.name));

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    version: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    totalAssets,
    categories,
  };
}

// ---------------------------------------------------------------------------
// Ingest an asset into the catalog
// ---------------------------------------------------------------------------

export async function ingestAsset(
  meta: IngestRequest,
  jobId?: string,
  fileBuffer?: Buffer,
  thumbnailBuffer?: Buffer,
): Promise<IngestResponse> {
  const category = meta.category || "uncategorized";
  const subcategory = meta.subcategory || "general";

  const resolvedId = await resolveUniqueId(category, subcategory, meta.id);
  const assetDir = join(CATALOG_PATH, category, subcategory, resolvedId);
  await mkdir(assetDir, { recursive: true });

  // --- Copy model file ---
  const modelDest = join(assetDir, "model.glb");

  if (jobId) {
    const jobOptimized = storagePath("jobs", jobId, "optimized.glb");
    try {
      await copyFile(jobOptimized, modelDest);
    } catch (err) {
      throw new Error(`Could not find optimized model for job ${jobId}: ${err}`);
    }
  } else if (fileBuffer) {
    await writeFile(modelDest, fileBuffer);
  }

  // --- Copy thumbnail from job output if available ---
  let thumbnailRelPath: string | null = null;
  if (jobId) {
    const jobThumb = storagePath("jobs", jobId, "thumb.webp");
    try {
      await access(jobThumb);
      const thumbDest = join(assetDir, "thumb.webp");
      await copyFile(jobThumb, thumbDest);
      thumbnailRelPath = `/${category}/${subcategory}/${resolvedId}/thumb.webp`;
    } catch {
      // No thumbnail available
    }
  }

  // --- Merge metadata from job result if available ---
  let jobMeta: Record<string, unknown> = {};
  if (jobId) {
    try {
      const raw = await readFile(storagePath("jobs", jobId, "result.json"), "utf-8");
      jobMeta = JSON.parse(raw);
    } catch {
      // No result.json
    }
  }

  // --- Extract metadata from job result ---
  const metadata = jobMeta.metadata as Record<string, unknown> | undefined;
  const originalFileSizeKB = (metadata?.originalFileSizeKB as number) ?? undefined;
  const reductionPercent = (metadata?.reductionPercent as number) ?? undefined;
  const targetProfile = (metadata?.targetProfile as string) ?? undefined;

  const scene = jobMeta.scene as Record<string, unknown> | undefined;
  const boundingBox = scene?.boundingBox as CatalogAssetMeta["boundingBox"] | undefined;
  const estimatedScale = scene?.estimatedScale as CatalogAssetMeta["estimatedScale"] | undefined;

  const normalizationApplied = (jobMeta.normalizationApplied as boolean) ?? undefined;
  const floorAlignmentApplied = (jobMeta.floorAlignmentApplied as boolean) ?? undefined;
  const textureOptimizationApplied = (jobMeta.textureOptimizationApplied as boolean) ?? undefined;

  let center: [number, number, number] | undefined;
  if (boundingBox) {
    center = [
      +((boundingBox.min[0] + boundingBox.max[0]) / 2).toFixed(4),
      +((boundingBox.min[1] + boundingBox.max[1]) / 2).toFixed(4),
      +((boundingBox.min[2] + boundingBox.max[2]) / 2).toFixed(4),
    ];
  }

  let pivot: string | undefined;
  if (boundingBox) {
    pivot = Math.abs(boundingBox.min[1]) < 0.01 ? "bottom-center" : "center";
  }

  // --- Build meta.json ---
  const modelRelPath = `/${category}/${subcategory}/${resolvedId}/model.glb`;

  const catalogMeta: CatalogAssetMeta = {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: resolvedId,
    name: meta.name,
    category,
    subcategory,
    style: meta.style || (jobMeta.style as string) || "",
    model: modelRelPath,
    thumbnail: thumbnailRelPath,
    dimensions: (scene?.dimensions as CatalogAssetMeta["dimensions"]) ?? undefined,
    placement: meta.placement || (jobMeta.placement as string) || "floor",
    ha: meta.ha ? { mappable: meta.ha.mappable, defaultDomain: meta.ha.defaultDomain, defaultKind: meta.ha.defaultKind } : undefined,
    performance: jobMeta.after
      ? {
          triangles: (jobMeta.after as Record<string, number>).triangles ?? 0,
          materials: (jobMeta.after as Record<string, number>).materials ?? 0,
          fileSizeKB: (jobMeta.after as Record<string, number>).fileSizeKB ?? 0,
        }
      : undefined,
    originalFileSizeKB,
    reductionPercent,
    targetProfile,
    source: "optimized",
    ingestStatus: "ingested",
    optimizationStatus: "optimized",
    lifecycleStatus: "published",
    optimizedAt: (jobMeta.timestamp as string) || new Date().toISOString(),
    jobId: jobId || undefined,
    boundingBox,
    center,
    pivot,
    estimatedScale,
    normalizationApplied,
    floorAlignmentApplied,
    textureOptimizationApplied,
  };

  const metaDest = join(assetDir, "meta.json");
  await writeFile(metaDest, JSON.stringify(catalogMeta, null, 2));

  // --- Regenerate index ---
  await reindexCatalog();

  const catalogPath = `/${category}/${subcategory}/${resolvedId}`;

  return {
    success: true,
    catalogEntry: {
      id: resolvedId,
      path: catalogPath,
      files: {
        model: `${catalogPath}/model.glb`,
        thumbnail: thumbnailRelPath,
        metadata: `${catalogPath}/meta.json`,
      },
    },
    catalogReindexed: true,
  };
}

// ---------------------------------------------------------------------------
// Delete an asset from the catalog
// ---------------------------------------------------------------------------

export async function deleteAsset(assetId: string): Promise<void> {
  const assetPath = await findAssetPath(assetId);
  if (!assetPath) {
    throw new Error(`Asset "${assetId}" not found in catalog`);
  }

  await rm(assetPath, { recursive: true, force: true });
  await reindexCatalog();
}

// ---------------------------------------------------------------------------
// Reindex — rebuild and write index.json
// ---------------------------------------------------------------------------

export async function reindexCatalog(): Promise<CatalogIndex> {
  const index = await buildCatalogIndex();
  const dest = join(CATALOG_PATH, "index.json");
  await writeFile(dest, JSON.stringify(index, null, 2));
  return index;
}

// ---------------------------------------------------------------------------
// Find asset by ID
// ---------------------------------------------------------------------------

export async function findAssetPath(assetId: string): Promise<string | null> {
  const categoryDirs = await safeDirEntries(CATALOG_PATH);

  for (const catDir of categoryDirs) {
    const catPath = join(CATALOG_PATH, catDir);
    if (!(await isDirectory(catPath))) continue;

    const subDirs = await safeDirEntries(catPath);
    for (const subDir of subDirs) {
      const subPath = join(catPath, subDir);
      if (!(await isDirectory(subPath))) continue;

      const assetPath = join(subPath, assetId);
      if (await isDirectory(assetPath)) return assetPath;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Find largest asset in catalog (for diagnostics)
// ---------------------------------------------------------------------------

export async function findLargestAsset(): Promise<{ id: string; sizeMB: number } | null> {
  let largestId = "";
  let largestBytes = 0;

  const categoryDirs = await safeDirEntries(CATALOG_PATH);

  for (const catDir of categoryDirs) {
    const catPath = join(CATALOG_PATH, catDir);
    if (!(await isDirectory(catPath))) continue;
    if (catDir === "index.json") continue;

    const subDirs = await safeDirEntries(catPath);
    for (const subDir of subDirs) {
      const subPath = join(catPath, subDir);
      if (!(await isDirectory(subPath))) continue;

      const assetDirs = await safeDirEntries(subPath);
      for (const assetDir of assetDirs) {
        const assetPath = join(subPath, assetDir);
        if (!(await isDirectory(assetPath))) continue;

        const modelPath = join(assetPath, "model.glb");
        try {
          const s = await stat(modelPath);
          if (s.size > largestBytes) {
            largestBytes = s.size;
            largestId = assetDir;
          }
        } catch {
          // No model file — skip
        }
      }
    }
  }

  if (!largestId) return null;
  return { id: largestId, sizeMB: +(largestBytes / (1024 * 1024)).toFixed(1) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function safeDirEntries(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

/** If <assetId> directory already exists, append -2, -3, etc. */
async function resolveUniqueId(category: string, subcategory: string, baseId: string): Promise<string> {
  const basePath = join(CATALOG_PATH, category, subcategory);
  let candidate = baseId;
  let suffix = 2;

  while (await isDirectory(join(basePath, candidate))) {
    candidate = `${baseId}-${suffix}`;
    suffix++;
  }

  return candidate;
}
