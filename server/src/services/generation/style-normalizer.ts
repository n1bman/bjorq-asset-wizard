/**
 * Bjorq Style Normalizer (v2.3.0)
 *
 * Post-TRELLIS processing step that enforces the Bjorq visual identity.
 * Now supports style VARIANTS via the global style profile system.
 *
 * Geometry:
 *   - Aggressive simplification with shape integrity protection
 *   - Geometry simplicity scoring — re-simplify if too busy
 *   - Vertex welding to remove micro-noise
 *   - Prune micro-geometry and floating parts
 *   - Flatten scene graph for consistent structure
 *
 * Materials:
 *   - Force max 2 materials (merge extras)
 *   - Strip ALL normal/AO/emissive maps
 *   - Standardize PBR via style profile (roughness 0.8, metallic 0)
 *   - Color normalization: tint → saturation clamp → brightness clamp
 *
 * All parameters derived from active style variant — deterministic output.
 */

import type { FastifyBaseLogger } from "fastify";
import {
  type BjorqStyleVariant,
  type BjorqStyleProfile,
  getVariantProfile,
  normalizeColor,
} from "./style-profile.js";

export interface StyleNormalizerConfig {
  simplifyRatio: number;
  fallbackSimplifyRatio: number;
  simplifyError: number;
  roughness: number;
  metallic: number;
  maxMaterials: number;
  maxTextureRes: number;
  stripNormalMaps: boolean;
  stripAOMaps: boolean;
  stripEmissive: boolean;
  stripMetallicRoughnessTexture: boolean;
  microGeometryThreshold: number;
  simplicityThreshold: number;
}

/** Build normalizer config from a style variant profile */
export function configFromVariant(variant?: BjorqStyleVariant): StyleNormalizerConfig {
  const p = getVariantProfile(variant);
  return {
    simplifyRatio: p.simplifyRatio,
    fallbackSimplifyRatio: p.fallbackRatio,
    simplifyError: p.simplifyError,
    roughness: p.roughness,
    metallic: p.metallic,
    maxMaterials: p.maxMaterials,
    maxTextureRes: p.maxTextureRes,
    stripNormalMaps: p.stripNormalMaps,
    stripAOMaps: p.stripAOMaps,
    stripEmissive: p.stripEmissive,
    stripMetallicRoughnessTexture: p.stripMetallicRoughnessTexture,
    microGeometryThreshold: p.microGeometryThreshold,
    simplicityThreshold: p.simplicityThreshold,
  };
}

/** Default config (cozy variant) */
export const BJORQ_COZY_CONFIG: StyleNormalizerConfig = configFromVariant("cozy");

/**
 * Apply Bjorq style normalization to a raw GLB buffer.
 *
 * @param aggressive - If true, uses fallback ratios for maximum reduction
 * @param variant - Style variant to apply (defaults to cozy)
 */
export async function normalizeStyle(
  glbBuffer: Uint8Array,
  config: StyleNormalizerConfig = BJORQ_COZY_CONFIG,
  log: FastifyBaseLogger,
  aggressive = false,
  variant?: BjorqStyleVariant,
): Promise<Uint8Array> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { prune, weld, simplify, dedup, flatten, textureCompress } = await import("@gltf-transform/functions");
  const sharpModule = (await import("sharp")).default;
  const { MeshoptSimplifier } = await import("meshoptimizer");

  // Get the variant profile for color normalization
  const variantProfile = variant ? getVariantProfile(variant) : undefined;

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  const root = doc.getRoot();

  // --- Step 1: Flatten scene graph ---
  log.info("Style normalizer: flattening scene graph");
  await doc.transform(flatten());

  // --- Step 2: Capture bounding box BEFORE simplification (shape integrity) ---
  const bbBefore = computeBoundingBox(root);

  // --- Step 3: Weld vertices ---
  log.info("Style normalizer: welding vertices");
  await doc.transform(weld({ tolerance: 0.0005 }));

  // --- Step 4: Geometry simplification ---
  const ratio = aggressive ? config.fallbackSimplifyRatio : config.simplifyRatio;
  log.info({ ratio, aggressive }, "Style normalizer: simplifying geometry");
  await MeshoptSimplifier.ready;
  await doc.transform(
    simplify({ simplifier: MeshoptSimplifier, ratio, error: config.simplifyError }),
  );

  // --- Step 5: Shape integrity check ---
  const bbAfter = computeBoundingBox(root);
  const shapeIntact = checkShapeIntegrity(bbBefore, bbAfter);
  if (!shapeIntact) {
    log.warn("Shape integrity degraded — bounding box proportions shifted >20%");
  }

  // --- Step 6: Prune micro-geometry ---
  log.info("Style normalizer: pruning micro-geometry");
  let prunedCount = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices && indices.getCount() < config.microGeometryThreshold) {
        prim.dispose();
        prunedCount++;
      }
    }
    if (mesh.listPrimitives().length === 0) mesh.dispose();
  }
  if (prunedCount > 0) log.info({ prunedCount }, "Removed micro-geometry primitives");

  // --- Step 7: Geometry simplicity scoring ---
  const simplicityScore = computeSimplicityScore(root);
  log.info({ simplicityScore: simplicityScore.toFixed(3) }, "Geometry simplicity score");

  if (simplicityScore < config.simplicityThreshold && !aggressive) {
    log.info("Simplicity below threshold — re-simplifying with aggressive ratio");
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio: config.fallbackSimplifyRatio, error: 0.08 }),
    );
    const newScore = computeSimplicityScore(root);
    log.info({ before: simplicityScore.toFixed(3), after: newScore.toFixed(3) }, "Re-simplification result");
  }

  // --- Step 8: Material standardization via style profile ---
  log.info("Style normalizer: standardizing materials");
  const materials = root.listMaterials();

  for (const material of materials) {
    material.setRoughnessFactor(config.roughness);
    material.setMetallicFactor(config.metallic);

    if (config.stripNormalMaps) material.setNormalTexture(null);
    if (config.stripAOMaps) material.setOcclusionTexture(null);
    if (config.stripEmissive) {
      material.setEmissiveTexture(null);
      material.setEmissiveFactor([0, 0, 0]);
    }
    if (config.stripMetallicRoughnessTexture) {
      material.setMetallicRoughnessTexture(null);
    }

    // Full color normalization via style profile (variant-aware)
    const baseColor = material.getBaseColorFactor();
    if (baseColor) {
      material.setBaseColorFactor(normalizeColor(baseColor, variantProfile));
    }
  }

  // --- Step 9: Merge excess materials ---
  if (materials.length > config.maxMaterials) {
    log.info({ current: materials.length, max: config.maxMaterials }, "Merging excess materials");
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

  // --- Step 10: Resize textures ---
  log.info({ maxRes: config.maxTextureRes }, "Style normalizer: resizing textures");
  await doc.transform(textureResize({ size: [config.maxTextureRes, config.maxTextureRes] }));

  // --- Step 11: Dedup + prune ---
  await doc.transform(dedup(), prune());

  const result = await io.writeBinary(doc);
  log.info(
    {
      inputSize: glbBuffer.byteLength,
      outputSize: result.byteLength,
      reduction: `${Math.round((1 - result.byteLength / glbBuffer.byteLength) * 100)}%`,
      simplicityScore: simplicityScore.toFixed(3),
      shapeIntact,
      prunedMicroGeo: prunedCount,
      variant: variant ?? "cozy",
    },
    "Style normalization complete",
  );

  return result;
}

// --- Geometry helpers ---

interface BBox {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
}

function computeBoundingBox(root: import("@gltf-transform/core").Root): BBox {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      for (let i = 0; i < pos.getCount(); i++) {
        const v = pos.getElement(i, [0, 0, 0]);
        for (let j = 0; j < 3; j++) {
          if (v[j] < min[j]) min[j] = v[j];
          if (v[j] > max[j]) max[j] = v[j];
        }
      }
    }
  }

  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

function checkShapeIntegrity(before: BBox, after: BBox): boolean {
  const eps = 0.001;
  for (let i = 0; i < 3; i++) {
    const bSize = before.size[i] + eps;
    const aSize = after.size[i] + eps;
    const ratio = aSize / bSize;
    if (ratio < 0.8 || ratio > 1.2) return false;
  }
  return true;
}

function computeSimplicityScore(root: import("@gltf-transform/core").Root): number {
  let totalTriangles = 0;
  let totalVertices = 0;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const pos = prim.getAttribute("POSITION");
      if (indices) totalTriangles += indices.getCount() / 3;
      if (pos) totalVertices += pos.getCount();
    }
  }

  if (totalTriangles === 0) return 1.0;

  const vtRatio = totalVertices / totalTriangles;
  const vtScore = Math.max(0, Math.min(1, 1 - (vtRatio - 0.5) / 2));

  const triScore = totalTriangles < 5000 ? 1.0
    : totalTriangles < 15000 ? 0.7
    : totalTriangles < 50000 ? 0.4
    : 0.2;

  return vtScore * 0.4 + triScore * 0.6;
}

/**
 * Check if a buffer has been style-normalized.
 */
export async function checkStyleConsistency(
  glbBuffer: Uint8Array,
  config: StyleNormalizerConfig = BJORQ_COZY_CONFIG,
  log: FastifyBaseLogger,
  variant?: BjorqStyleVariant,
): Promise<{ consistent: boolean; issues: string[] }> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { validateVisualConsistency, getVariantProfile } = await import("./style-profile.js");

  const profile = variant ? getVariantProfile(variant) : undefined;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  const root = doc.getRoot();

  const matData = root.listMaterials().map((m) => ({
    roughness: m.getRoughnessFactor(),
    metallic: m.getMetallicFactor(),
    baseColor: m.getBaseColorFactor(),
    hasNormalMap: m.getNormalTexture() !== null,
    hasAOMap: m.getOcclusionTexture() !== null,
  }));

  const visualCheck = validateVisualConsistency(matData, profile);

  const issues = [...visualCheck.issues];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices && indices.getCount() < config.microGeometryThreshold) {
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
