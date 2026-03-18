/**
 * LOD Generator (v2.3.1)
 *
 * Generates Level-of-Detail variants for generated assets.
 * LOD0 = primary optimized model (passthrough)
 * LOD1 = ~50% triangle reduction
 * LOD2 = ~20% triangle reduction
 *
 * ARCHITECTURAL NOTE:
 * The Wizard addon ONLY prepares, stores, and exposes LOD-ready asset variants
 * and metadata. Runtime LOD selection and switching is the responsibility of
 * the Bjorq Dashboard, which is the system that actually loads and renders 3D assets.
 *
 * LOD CONTRACT:
 * - All LOD variants share the same pivot, scale, floor alignment, and orientation
 *   as the primary model (LOD0). Scene compatibility is applied to the primary buffer
 *   BEFORE LOD generation, and LODs are derived from that corrected geometry.
 * - LOD metadata is stored alongside the asset for Dashboard consumption.
 * - Assets remain fully usable even if Dashboard ignores LOD metadata entirely.
 *
 * Skips LOD generation for already very light models (<2000 tris).
 */

import type { FastifyBaseLogger } from "fastify";

export interface LODVariant {
  level: number;
  file: string;
  triangles: number;
  fileSizeKB: number;
}

export interface LODSet {
  lod0: string; // path to primary model
  lod1?: string;
  lod2?: string;
  skipped: boolean;
  reason?: string;
  /** Structured LOD metadata for asset storage and Dashboard consumption */
  variants: LODVariant[];
}

const LOD_CONFIGS = [
  { level: 1, ratio: 0.5, suffix: "_lod1" },
  { level: 2, ratio: 0.2, suffix: "_lod2" },
] as const;

const MIN_TRIANGLES_FOR_LOD = 2000;

/**
 * Generate LOD variants from a primary GLB buffer.
 *
 * IMPORTANT: The primaryBuffer must already be scene-compatible (pivot centered,
 * floor-aligned, scale-sane). LODs are derived via geometry-only simplification
 * which preserves all node transforms, ensuring identical pivot, scale, floor
 * alignment, and orientation across all variants.
 */
export async function generateLODs(
  primaryBuffer: Uint8Array,
  outputDir: string,
  baseName: string,
  log: FastifyBaseLogger,
): Promise<LODSet> {
  const { resolve } = await import("node:path");
  const { writeFile } = await import("node:fs/promises");

  const primaryPath = resolve(outputDir, `${baseName}.glb`);
  const primaryTriCount = await countTrianglesInBuffer(primaryBuffer);

  const result: LODSet = {
    lod0: primaryPath,
    skipped: false,
    variants: [{
      level: 0,
      file: `${baseName}.glb`,
      triangles: primaryTriCount,
      fileSizeKB: Math.round(primaryBuffer.byteLength / 1024),
    }],
  };

  // Skip LOD generation for already very light models
  if (primaryTriCount < MIN_TRIANGLES_FOR_LOD) {
    log.info(
      { triCount: primaryTriCount, threshold: MIN_TRIANGLES_FOR_LOD },
      "Model too light for LOD generation — skipping (asset remains fully usable without LODs)",
    );
    result.skipped = true;
    result.reason = `Triangle count (${primaryTriCount}) below LOD threshold`;
    return result;
  }

  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { simplify, weld, prune } = await import("@gltf-transform/functions");
  const { MeshoptSimplifier } = await import("meshoptimizer");

  await MeshoptSimplifier.ready;

  for (const config of LOD_CONFIGS) {
    try {
      // Each LOD starts from the primary buffer to preserve transforms exactly
      const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
      const doc = await io.readBinary(primaryBuffer);

      // Only simplify geometry — do NOT modify transforms, pivot, scale, or orientation.
      // weld + simplify operate on vertex data only, preserving all node transforms.
      await doc.transform(
        weld(),
        simplify({ simplifier: MeshoptSimplifier, ratio: config.ratio, error: 0.05 }),
        prune(),
      );

      const lodBuffer = await io.writeBinary(doc);
      const lodFileName = `${baseName}${config.suffix}.glb`;
      const lodPath = resolve(outputDir, lodFileName);
      await writeFile(lodPath, lodBuffer);

      const lodTriCount = await countTrianglesInBuffer(lodBuffer);

      if (config.level === 1) result.lod1 = lodPath;
      if (config.level === 2) result.lod2 = lodPath;

      result.variants.push({
        level: config.level,
        file: lodFileName,
        triangles: lodTriCount,
        fileSizeKB: Math.round(lodBuffer.byteLength / 1024),
      });

      log.info(
        {
          level: config.level,
          ratio: config.ratio,
          inputTriangles: primaryTriCount,
          outputTriangles: lodTriCount,
          inputSize: primaryBuffer.byteLength,
          outputSize: lodBuffer.byteLength,
        },
        `LOD${config.level} generated (same pivot/scale/orientation as LOD0)`,
      );
    } catch (err) {
      log.warn({ err, level: config.level }, `LOD${config.level} generation failed — skipping (asset still usable without this LOD)`);
    }
  }

  return result;
}

async function countTrianglesInBuffer(glbBuffer: Uint8Array): Promise<number> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  let count = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (idx) count += idx.getCount() / 3;
    }
  }
  return count;
}
