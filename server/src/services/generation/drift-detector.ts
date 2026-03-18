/**
 * Style Drift Detector (v2.3.0)
 *
 * Measures deviation from the active style profile.
 * Internal control step — not user-facing.
 *
 * If drift exceeds threshold, triggers re-normalization.
 */

import type { FastifyBaseLogger } from "fastify";
import type { BjorqStyleVariant } from "./style-profile.js";
import { BJORQ_STYLE_VARIANTS, BJORQ_STYLE_PROFILE } from "./style-profile.js";

export interface DriftReport {
  score: number; // 0 = perfect match, 1 = maximum drift
  drifted: boolean;
  details: DriftDetail[];
}

interface DriftDetail {
  metric: string;
  expected: number;
  actual: number;
  weight: number;
  deviation: number;
}

const DRIFT_THRESHOLD = 0.25;

/**
 * Compute style deviation score for a GLB buffer against a variant profile.
 */
export async function detectStyleDrift(
  glbBuffer: Uint8Array,
  variant: BjorqStyleVariant = "cozy",
  log: FastifyBaseLogger,
): Promise<DriftReport> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");

  const profile = BJORQ_STYLE_VARIANTS[variant];
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  const root = doc.getRoot();

  const details: DriftDetail[] = [];
  const materials = root.listMaterials();

  // --- Roughness drift ---
  if (materials.length > 0) {
    const avgRoughness = materials.reduce((s, m) => s + m.getRoughnessFactor(), 0) / materials.length;
    const roughnessDev = Math.abs(avgRoughness - profile.roughness);
    details.push({
      metric: "roughness",
      expected: profile.roughness,
      actual: avgRoughness,
      weight: 0.2,
      deviation: roughnessDev,
    });

    // --- Metallic drift ---
    const avgMetallic = materials.reduce((s, m) => s + m.getMetallicFactor(), 0) / materials.length;
    details.push({
      metric: "metallic",
      expected: profile.metallic,
      actual: avgMetallic,
      weight: 0.15,
      deviation: avgMetallic, // should be 0
    });

    // --- Brightness drift ---
    let totalBrightness = 0;
    for (const mat of materials) {
      const [r, g, b] = mat.getBaseColorFactor();
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const avgBrightness = totalBrightness / materials.length;
    const [minB, maxB] = profile.brightnessRange;
    const targetBrightness = (minB + maxB) / 2;
    const brightnessDev = Math.abs(avgBrightness - targetBrightness) / (maxB - minB);
    details.push({
      metric: "brightness",
      expected: targetBrightness,
      actual: avgBrightness,
      weight: 0.2,
      deviation: Math.min(1, brightnessDev),
    });

    // --- Saturation drift ---
    let totalSat = 0;
    for (const mat of materials) {
      const [r, g, b] = mat.getBaseColorFactor();
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const l = (max + min) / 2;
      totalSat += delta > 0 && l > 0 ? delta / (1 - Math.abs(2 * l - 1)) : 0;
    }
    const avgSat = totalSat / materials.length;
    const satDev = Math.max(0, avgSat - profile.saturationClamp) / profile.saturationClamp;
    details.push({
      metric: "saturation",
      expected: profile.saturationClamp,
      actual: avgSat,
      weight: 0.15,
      deviation: Math.min(1, satDev),
    });

    // --- Material count drift ---
    const matCountDev = Math.max(0, materials.length - profile.maxMaterials) / profile.maxMaterials;
    details.push({
      metric: "materialCount",
      expected: profile.maxMaterials,
      actual: materials.length,
      weight: 0.15,
      deviation: Math.min(1, matCountDev),
    });
  }

  // --- Geometry simplicity drift ---
  let totalTris = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (idx) totalTris += idx.getCount() / 3;
    }
  }
  const triTarget = 10000; // ideal mid-range
  const triDev = Math.abs(totalTris - triTarget) / triTarget;
  details.push({
    metric: "geometryComplexity",
    expected: triTarget,
    actual: totalTris,
    weight: 0.15,
    deviation: Math.min(1, triDev * 0.5),
  });

  // Weighted score
  const totalWeight = details.reduce((s, d) => s + d.weight, 0);
  const score = details.reduce((s, d) => s + d.deviation * d.weight, 0) / Math.max(totalWeight, 0.01);
  const drifted = score > DRIFT_THRESHOLD;

  if (drifted) {
    log.warn({ score: score.toFixed(3), details: details.map(d => `${d.metric}:${d.deviation.toFixed(2)}`) }, "Style drift detected");
  } else {
    log.info({ score: score.toFixed(3) }, "Style drift check passed");
  }

  return { score, drifted, details };
}
