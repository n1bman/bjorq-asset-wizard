/**
 * Bjorq Style Profile — Global Visual Identity Lock (v2.2.2)
 *
 * Defines the canonical Bjorq visual identity as a fixed, deterministic profile.
 * Every generated asset passes through this profile to ensure cross-asset consistency.
 *
 * This is the SINGLE SOURCE OF TRUTH for the Bjorq look.
 * Style normalizer, quality gate, and pipeline all reference this profile.
 */

/** Global Bjorq style profile — all values are FIXED, never randomized */
export const BJORQ_STYLE_PROFILE = {
  // --- PBR Material ---
  roughness: 0.8,
  metallic: 0.0,
  /** Warm neutral tint applied to all baseColor factors */
  baseColorTint: [1.0, 0.96, 0.9] as [number, number, number],
  /** Max saturation — prevents noisy AI textures */
  saturationClamp: 0.5,
  /** Brightness must fall within this range */
  brightnessRange: [0.3, 0.85] as [number, number],
  /** How strongly to flatten texture detail (0 = no flatten, 1 = solid color) */
  textureFlattenStrength: 0.6,

  // --- Geometry ---
  /** Target simplification ratio (standard pass) */
  simplifyRatio: 0.4,
  /** Fallback ratio for aggressive re-processing */
  fallbackRatio: 0.2,
  /** Simplification error tolerance */
  simplifyError: 0.05,
  /** Primitives with fewer than this many indices are pruned */
  microGeometryThreshold: 36, // < 12 triangles
  /** Minimum simplicity score to pass (0–1) */
  simplicityThreshold: 0.6,

  // --- Materials ---
  maxMaterials: 2,
  maxTextureRes: 512,
  stripNormalMaps: true,
  stripAOMaps: true,
  stripEmissive: true,
  stripMetallicRoughnessTexture: true,

  // --- Thumbnail ---
  thumbnailSize: 512,
  thumbnailBackground: "#1a1a2e",
} as const;

export type BjorqStyleProfile = typeof BJORQ_STYLE_PROFILE;

/**
 * Apply the Bjorq base color tint to an RGBA color.
 * Shifts colors toward the warm Bjorq palette.
 */
export function applyBaseColorTint(
  rgba: [number, number, number, number],
): [number, number, number, number] {
  const [r, g, b, a] = rgba;
  const [tr, tg, tb] = BJORQ_STYLE_PROFILE.baseColorTint;
  return [
    Math.min(1, r * tr),
    Math.min(1, g * tg),
    Math.min(1, b * tb),
    a,
  ];
}

/**
 * Clamp brightness of an RGB color to the profile range.
 */
export function clampBrightness(
  rgba: [number, number, number, number],
): [number, number, number, number] {
  const [r, g, b, a] = rgba;
  const [minB, maxB] = BJORQ_STYLE_PROFILE.brightnessRange;
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

  if (brightness < 0.001) return [minB, minB, minB, a]; // avoid division by zero
  if (brightness >= minB && brightness <= maxB) return [r, g, b, a];

  const target = brightness < minB ? minB : maxB;
  const factor = target / brightness;
  return [
    Math.min(1, r * factor),
    Math.min(1, g * factor),
    Math.min(1, b * factor),
    a,
  ];
}

/**
 * Clamp saturation of an RGB color to the profile limit.
 */
export function clampSaturation(
  rgba: [number, number, number, number],
): [number, number, number, number] {
  const [r, g, b, a] = rgba;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0 || lightness === 0) return [r, g, b, a];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const maxSat = BJORQ_STYLE_PROFILE.saturationClamp;

  if (saturation <= maxSat) return [r, g, b, a];

  const factor = maxSat / saturation;
  const mid = (max + min) / 2;
  return [
    mid + (r - mid) * factor,
    mid + (g - mid) * factor,
    mid + (b - mid) * factor,
    a,
  ];
}

/**
 * Full color normalization: tint → saturation clamp → brightness clamp.
 * Ensures every color matches the Bjorq warm neutral palette.
 */
export function normalizeColor(
  rgba: number[],
): [number, number, number, number] {
  let color: [number, number, number, number] = [
    rgba[0] ?? 1, rgba[1] ?? 1, rgba[2] ?? 1, rgba[3] ?? 1,
  ];
  color = applyBaseColorTint(color);
  color = clampSaturation(color);
  color = clampBrightness(color);
  return color;
}

/**
 * Visual consistency validation — checks if an asset's materials
 * match the Bjorq style profile within acceptable tolerance.
 */
export interface VisualConsistencyResult {
  consistent: boolean;
  issues: string[];
  brightnessOk: boolean;
  saturationOk: boolean;
  roughnessOk: boolean;
  materialCountOk: boolean;
}

export function validateVisualConsistency(
  materials: Array<{
    roughness: number;
    metallic: number;
    baseColor: number[];
    hasNormalMap: boolean;
    hasAOMap: boolean;
  }>,
): VisualConsistencyResult {
  const issues: string[] = [];
  const p = BJORQ_STYLE_PROFILE;

  const materialCountOk = materials.length <= p.maxMaterials;
  if (!materialCountOk) issues.push(`Materials: ${materials.length} > ${p.maxMaterials}`);

  let brightnessOk = true;
  let saturationOk = true;
  let roughnessOk = true;

  for (const mat of materials) {
    // Roughness check
    if (Math.abs(mat.roughness - p.roughness) > 0.15) {
      roughnessOk = false;
      issues.push(`Roughness drift: ${mat.roughness.toFixed(2)} (expected ~${p.roughness})`);
    }

    // Metallic check
    if (mat.metallic > 0.01) {
      issues.push(`Metallic > 0: ${mat.metallic}`);
    }

    // Brightness check
    const [r, g, b] = mat.baseColor;
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    const [minB, maxB] = p.brightnessRange;
    if (brightness < minB - 0.05 || brightness > maxB + 0.05) {
      brightnessOk = false;
      issues.push(`Brightness out of range: ${brightness.toFixed(2)}`);
    }

    // Saturation check
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;
    if (delta > 0 && lightness > 0) {
      const sat = delta / (1 - Math.abs(2 * lightness - 1));
      if (sat > p.saturationClamp + 0.1) {
        saturationOk = false;
        issues.push(`Saturation too high: ${sat.toFixed(2)}`);
      }
    }

    // Map checks
    if (mat.hasNormalMap) issues.push("Normal map present");
    if (mat.hasAOMap) issues.push("AO map present");
  }

  return {
    consistent: issues.length === 0,
    issues,
    brightnessOk,
    saturationOk,
    roughnessOk,
    materialCountOk,
  };
}
