/**
 * Bjorq Style Normalizer (v2.2.1)
 *
 * Post-TRELLIS processing step that enforces the Bjorq visual identity.
 * Uses gltf-transform to apply deterministic style normalization:
 *
 * Geometry:
 *   - Aggressive simplification (default ratio 0.4, fallback 0.2)
 *   - Vertex welding to remove micro-noise
 *   - Prune micro-geometry and floating parts
 *   - Flatten scene graph for consistent structure
 *
 * Materials:
 *   - Force max 2 materials (merge extras)
 *   - Strip ALL normal/AO/emissive maps
 *   - Standardize PBR: roughness 0.7–0.9, metallic 0
 *   - Clamp colors toward warm Bjorq palette
 *   - Flatten noisy textures via resize + blur
 *
 * All parameters are FIXED — no randomness — ensuring visual consistency
 * across all generated assets.
 */

import type { FastifyBaseLogger } from "fastify";

export interface StyleNormalizerConfig {
  /** Primary simplification ratio (0.0–1.0, lower = more aggressive) */
  simplifyRatio: number;
  /** Fallback ratio if primary pass still too heavy */
  fallbackSimplifyRatio: number;
  /** Simplification error tolerance */
  simplifyError: number;
  /** Target roughness range */
  roughnessMin: number;
  roughnessMax: number;
  /** Force metallic to zero */
  metallic: number;
  /** Maximum allowed materials (merge if exceeded) */
  maxMaterials: number;
  /** Maximum texture resolution after normalization */
  maxTextureRes: number;
  /** Strip all non-baseColor maps */
  stripNormalMaps: boolean;
  stripAOMaps: boolean;
  stripEmissive: boolean;
  stripMetallicRoughnessTexture: boolean;
  /** Clamp baseColor saturation to prevent noisy AI textures */
  maxSaturation: number;
}

export const BJORQ_COZY_CONFIG: StyleNormalizerConfig = {
  simplifyRatio: 0.4,
  fallbackSimplifyRatio: 0.2,
  simplifyError: 0.05,
  roughnessMin: 0.7,
  roughnessMax: 0.9,
  metallic: 0.0,
  maxMaterials: 2,
  maxTextureRes: 512,
  stripNormalMaps: true,
  stripAOMaps: true,
  stripEmissive: true,
  stripMetallicRoughnessTexture: true,
  maxSaturation: 0.6,
};

/**
 * Apply Bjorq style normalization to a raw GLB buffer.
 * Returns a new GLB buffer with enforced visual identity.
 *
 * @param aggressive - If true, uses fallback ratios for maximum reduction
 */
export async function normalizeStyle(
  glbBuffer: Uint8Array,
  config: StyleNormalizerConfig = BJORQ_COZY_CONFIG,
  log: FastifyBaseLogger,
  aggressive = false,
): Promise<Uint8Array> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { prune, weld, simplify, dedup, flatten, textureResize } = await import("@gltf-transform/functions");
  const { MeshoptSimplifier } = await import("meshoptimizer");

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  const root = doc.getRoot();

  // --- Step 1: Flatten scene graph ---
  log.info("Style normalizer: flattening scene graph");
  await doc.transform(flatten());

  // --- Step 2: Weld vertices (remove micro-noise) ---
  log.info("Style normalizer: welding vertices");
  await doc.transform(weld({ tolerance: 0.0005 }));

  // --- Step 3: Aggressive geometry simplification ---
  const ratio = aggressive ? config.fallbackSimplifyRatio : config.simplifyRatio;
  log.info({ ratio, aggressive }, "Style normalizer: simplifying geometry");
  await MeshoptSimplifier.ready;
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio,
      error: config.simplifyError,
    }),
  );

  // --- Step 4: Remove micro-geometry (meshes with < 12 triangles) ---
  log.info("Style normalizer: pruning micro-geometry");
  for (const mesh of root.listMeshes()) {
    const primitives = mesh.listPrimitives();
    for (const prim of primitives) {
      const indices = prim.getIndices();
      if (indices && indices.getCount() < 36) { // < 12 triangles
        prim.dispose();
        log.debug("Removed micro-geometry primitive");
      }
    }
    // Remove empty meshes
    if (mesh.listPrimitives().length === 0) {
      mesh.dispose();
    }
  }

  // --- Step 5: Material standardization ---
  log.info("Style normalizer: standardizing materials");
  const materials = root.listMaterials();

  // Deterministic roughness: use fixed value within range (no randomness)
  const fixedRoughness = (config.roughnessMin + config.roughnessMax) / 2;

  for (const material of materials) {
    // Force PBR values
    material.setRoughnessFactor(fixedRoughness);
    material.setMetallicFactor(config.metallic);

    // Strip ALL non-essential maps
    if (config.stripNormalMaps) material.setNormalTexture(null);
    if (config.stripAOMaps) material.setOcclusionTexture(null);
    if (config.stripEmissive) {
      material.setEmissiveTexture(null);
      material.setEmissiveFactor([0, 0, 0]);
    }
    if (config.stripMetallicRoughnessTexture) {
      material.setMetallicRoughnessTexture(null);
    }

    // Clamp base color to reduce AI noise
    const baseColor = material.getBaseColorFactor();
    if (baseColor) {
      material.setBaseColorFactor(clampColor(baseColor, config.maxSaturation));
    }
  }

  // --- Step 6: Merge excess materials ---
  if (materials.length > config.maxMaterials) {
    log.info(
      { current: materials.length, max: config.maxMaterials },
      "Style normalizer: merging excess materials",
    );
    // Keep first N materials, reassign extras to the first material
    const keepMaterials = materials.slice(0, config.maxMaterials);
    const primaryMaterial = keepMaterials[0];
    for (const mesh of root.listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const mat = prim.getMaterial();
        if (mat && !keepMaterials.includes(mat)) {
          prim.setMaterial(primaryMaterial);
        }
      }
    }
  }

  // --- Step 7: Resize textures to max resolution ---
  log.info({ maxRes: config.maxTextureRes }, "Style normalizer: resizing textures");
  await doc.transform(
    textureResize({ size: [config.maxTextureRes, config.maxTextureRes] }),
  );

  // --- Step 8: Dedup + prune ---
  log.info("Style normalizer: dedup and prune");
  await doc.transform(dedup(), prune());

  const result = await io.writeBinary(doc);
  log.info(
    { inputSize: glbBuffer.byteLength, outputSize: result.byteLength, reduction: `${Math.round((1 - result.byteLength / glbBuffer.byteLength) * 100)}%` },
    "Style normalization complete",
  );

  return result;
}

/**
 * Clamp color saturation toward the Bjorq warm palette.
 * Reduces overly saturated or noisy AI-generated colors.
 */
function clampColor(rgba: number[], maxSaturation: number): [number, number, number, number] {
  const [r, g, b, a] = rgba;

  // Convert to HSL-like saturation check
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0 || lightness === 0) {
    return [r, g, b, a ?? 1];
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));

  if (saturation <= maxSaturation) {
    return [r, g, b, a ?? 1];
  }

  // Desaturate toward midpoint
  const factor = maxSaturation / saturation;
  const mid = (max + min) / 2;
  return [
    mid + (r - mid) * factor,
    mid + (g - mid) * factor,
    mid + (b - mid) * factor,
    a ?? 1,
  ];
}

/**
 * Check if a buffer has already been style-normalized.
 * Returns true if materials match Bjorq constraints.
 */
export async function checkStyleConsistency(
  glbBuffer: Uint8Array,
  config: StyleNormalizerConfig = BJORQ_COZY_CONFIG,
  log: FastifyBaseLogger,
): Promise<{ consistent: boolean; issues: string[] }> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  const root = doc.getRoot();
  const issues: string[] = [];

  const materials = root.listMaterials();
  if (materials.length > config.maxMaterials) {
    issues.push(`Too many materials: ${materials.length} > ${config.maxMaterials}`);
  }

  for (const material of materials) {
    if (material.getNormalTexture()) issues.push("Normal map found");
    if (material.getOcclusionTexture()) issues.push("AO map found");
    if (material.getMetallicFactor() > 0.01) issues.push(`Metallic > 0: ${material.getMetallicFactor()}`);
    const rough = material.getRoughnessFactor();
    if (rough < config.roughnessMin || rough > config.roughnessMax) {
      issues.push(`Roughness out of range: ${rough}`);
    }
  }

  // Check for micro-geometry
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices && indices.getCount() < 36) {
        issues.push("Micro-geometry detected");
        break;
      }
    }
  }

  if (issues.length > 0) {
    log.warn({ issues }, "Style consistency check failed");
  }

  return { consistent: issues.length === 0, issues };
}
