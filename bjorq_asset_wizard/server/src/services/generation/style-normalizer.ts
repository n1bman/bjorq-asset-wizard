/**
 * Bjorq Style Normalizer
 *
 * Post-TRELLIS processing step that enforces the Bjorq visual identity.
 * Uses gltf-transform to apply deterministic style normalization:
 *
 * - Aggressive geometry simplification (ratio 0.4)
 * - Vertex welding to remove micro-noise
 * - Material standardization (matte PBR, roughness 0.7, metallic 0)
 * - Strip normal/AO/emissive maps
 * - Prune unused resources
 *
 * All parameters are FIXED — no randomness — ensuring visual consistency
 * across all generated assets.
 *
 * Currently stubbed — will be activated when TRELLIS pipeline is complete.
 */

import type { FastifyBaseLogger } from "fastify";

export interface StyleNormalizerConfig {
  simplifyRatio: number;
  simplifyError: number;
  roughness: number;
  metallic: number;
  stripNormalMaps: boolean;
  stripAOMaps: boolean;
  stripEmissive: boolean;
}

export const BJORQ_COZY_CONFIG: StyleNormalizerConfig = {
  simplifyRatio: 0.4,
  simplifyError: 0.05,
  roughness: 0.7,
  metallic: 0.0,
  stripNormalMaps: true,
  stripAOMaps: true,
  stripEmissive: true,
};

/**
 * Apply Bjorq style normalization to a raw GLB buffer.
 * Returns a new GLB buffer with enforced visual identity.
 */
export async function normalizeStyle(
  glbBuffer: Uint8Array,
  config: StyleNormalizerConfig = BJORQ_COZY_CONFIG,
  log: FastifyBaseLogger,
): Promise<Uint8Array> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { prune, weld, simplify, dedup } = await import("@gltf-transform/functions");
  const { MeshoptSimplifier } = await import("meshoptimizer");

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);

  log.info("Style normalizer: welding vertices");
  await doc.transform(weld({ tolerance: 0.001 }));

  log.info({ ratio: config.simplifyRatio }, "Style normalizer: simplifying geometry");
  await MeshoptSimplifier.ready;
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: config.simplifyRatio,
      error: config.simplifyError,
    }),
  );

  // Standardize materials
  log.info("Style normalizer: standardizing materials");
  const root = doc.getRoot();
  for (const material of root.listMaterials()) {
    material.setRoughnessFactor(config.roughness);
    material.setMetallicFactor(config.metallic);

    if (config.stripNormalMaps) material.setNormalTexture(null);
    if (config.stripAOMaps) material.setOcclusionTexture(null);
    if (config.stripEmissive) {
      material.setEmissiveTexture(null);
      material.setEmissiveFactor([0, 0, 0]);
    }
  }

  // Dedup + prune
  log.info("Style normalizer: dedup and prune");
  await doc.transform(dedup(), prune());

  return io.writeBinary(doc);
}
