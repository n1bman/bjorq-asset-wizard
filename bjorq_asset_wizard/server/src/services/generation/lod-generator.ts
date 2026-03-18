/**
 * LOD Generator (v2.3.0)
 *
 * Generates Level-of-Detail variants for generated assets.
 * LOD0 = primary optimized model (passthrough)
 * LOD1 = ~50% triangle reduction
 * LOD2 = ~20% triangle reduction
 *
 * Skips LOD generation for already very light models (<2000 tris).
 */

import type { FastifyBaseLogger } from "fastify";

export interface LODSet {
  lod0: string; // path to primary model
  lod1?: string;
  lod2?: string;
  skipped: boolean;
  reason?: string;
}

const LOD_CONFIGS = [
  { level: 1, ratio: 0.5, suffix: "_lod1" },
  { level: 2, ratio: 0.2, suffix: "_lod2" },
] as const;

const MIN_TRIANGLES_FOR_LOD = 2000;

/**
 * Generate LOD variants from a primary GLB buffer.
 * Writes LOD files alongside the primary model.
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
  const result: LODSet = { lod0: primaryPath, skipped: false };

  // Count triangles to decide if LODs are worthwhile
  const triCount = await countTrianglesInBuffer(primaryBuffer);
  if (triCount < MIN_TRIANGLES_FOR_LOD) {
    log.info(
      { triCount, threshold: MIN_TRIANGLES_FOR_LOD },
      "Model too light for LOD generation — skipping",
    );
    result.skipped = true;
    result.reason = `Triangle count (${triCount}) below LOD threshold`;
    return result;
  }

  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { simplify, weld, prune } = await import("@gltf-transform/functions");
  const { MeshoptSimplifier } = await import("meshoptimizer");

  await MeshoptSimplifier.ready;

  for (const config of LOD_CONFIGS) {
    try {
      const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
      const doc = await io.readBinary(primaryBuffer);

      await doc.transform(
        weld({ tolerance: 0.001 }),
        simplify({ simplifier: MeshoptSimplifier, ratio: config.ratio, error: 0.05 }),
        prune(),
      );

      const lodBuffer = await io.writeBinary(doc);
      const lodPath = resolve(outputDir, `${baseName}${config.suffix}.glb`);
      await writeFile(lodPath, lodBuffer);

      if (config.level === 1) result.lod1 = lodPath;
      if (config.level === 2) result.lod2 = lodPath;

      log.info(
        {
          level: config.level,
          ratio: config.ratio,
          inputSize: primaryBuffer.byteLength,
          outputSize: lodBuffer.byteLength,
        },
        `LOD${config.level} generated`,
      );
    } catch (err) {
      log.warn({ err, level: config.level }, `LOD${config.level} generation failed — skipping`);
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
