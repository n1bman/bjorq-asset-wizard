/**
 * Catalog Manager — scan, ingest, and reindex the asset catalog.
 *
 * Catalog structure:
 *   CATALOG_PATH/<category>/<subcategory>/<assetId>/
 *     model.glb
 *     meta.json
 *     thumb.webp  (optional)
 */

import { readdir, readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { CATALOG_PATH, storagePath } from "../../lib/storage.js";
import type {
  CatalogIndex,
  CatalogCategory,
  CatalogSubcategory,
  CatalogAssetMeta,
  IngestRequest,
  IngestResponse,
} from "../../types/catalog.js";

const CATALOG_VERSION = "0.3.2";

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
          const meta: CatalogAssetMeta = JSON.parse(raw);
          assets.push(meta);
          totalAssets++;
        } catch {
          // Skip assets without valid meta.json
        }
      }

      if (assets.length > 0) {
        subcategories.push({ name: subDir, assets });
      }
    }

    if (subcategories.length > 0) {
      categories.push({ name: catDir, subcategories });
    }
  }

  return {
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
): Promise<IngestResponse> {
  const category = meta.category || "uncategorized";
  const subcategory = meta.subcategory || "general";

  // Resolve unique directory name
  const resolvedId = await resolveUniqueId(category, subcategory, meta.id);
  const assetDir = join(CATALOG_PATH, category, subcategory, resolvedId);
  await mkdir(assetDir, { recursive: true });

  // --- Copy model file ---
  const modelDest = join(assetDir, "model.glb");

  if (jobId) {
    // Copy from job output
    const jobOptimized = storagePath("jobs", jobId, "optimized.glb");
    try {
      await copyFile(jobOptimized, modelDest);
    } catch (err) {
      throw new Error(`Could not find optimized model for job ${jobId}: ${err}`);
    }
  } else if (fileBuffer) {
    await writeFile(modelDest, fileBuffer);
  }
  // If neither jobId nor file, the model slot stays empty (metadata-only ingest)

  // --- Merge metadata from job result if available ---
  let jobMeta: Record<string, unknown> = {};
  if (jobId) {
    try {
      const raw = await readFile(storagePath("jobs", jobId, "result.json"), "utf-8");
      jobMeta = JSON.parse(raw);
    } catch {
      // No result.json — proceed without
    }
  }

  // --- Build meta.json ---
  const modelRelPath = `/${category}/${subcategory}/${resolvedId}/model.glb`;
  const thumbRelPath = "";

  const catalogMeta: CatalogAssetMeta = {
    id: resolvedId,
    name: meta.name,
    category,
    subcategory,
    style: meta.style || (jobMeta.style as string) || "",
    model: modelRelPath,
    thumbnail: thumbRelPath,
    dimensions: (jobMeta.after as Record<string, unknown>)?.dimensions as CatalogAssetMeta["dimensions"] ?? undefined,
    placement: meta.placement || (jobMeta.placement as string) || "floor",
    ha: meta.ha ? { mappable: meta.ha.mappable, defaultDomain: meta.ha.defaultDomain, defaultKind: meta.ha.defaultKind } : undefined,
    performance: jobMeta.after
      ? {
          triangles: (jobMeta.after as Record<string, number>).triangles ?? 0,
          materials: (jobMeta.after as Record<string, number>).materials ?? 0,
          fileSizeKB: (jobMeta.after as Record<string, number>).fileSizeKB ?? 0,
        }
      : undefined,
    source: "optimized",
    ingestStatus: "ingested",
    optimizationStatus: "optimized",
    optimizedAt: (jobMeta.timestamp as string) || new Date().toISOString(),
    jobId: jobId || undefined,
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
        thumbnail: "",
        metadata: `${catalogPath}/meta.json`,
      },
    },
    catalogReindexed: true,
  };
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
