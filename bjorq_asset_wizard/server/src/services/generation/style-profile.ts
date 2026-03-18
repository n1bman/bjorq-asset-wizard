/**
 * Bjorq Style Profile — Global Visual Identity Lock (v2.3.0)
 *
 * Defines the canonical Bjorq visual identity as a fixed, deterministic profile.
 * Now supports controlled style VARIANTS that all remain within the Bjorq identity.
 *
 * This is the SINGLE SOURCE OF TRUTH for the Bjorq look.
 * Style normalizer, quality gate, drift detector, and pipeline all reference this.
 */

/** Named style variants — all derived from the base profile */
export type BjorqStyleVariant = "cozy" | "soft-minimal" | "warm-wood";

/** Shape of a Bjorq style profile */
export interface BjorqStyleProfile {
  roughness: number;
  metallic: number;
  baseColorTint: [number, number, number];
  saturationClamp: number;
  brightnessRange: [number, number];
  textureFlattenStrength: number;
  simplifyRatio: number;
  fallbackRatio: number;
  simplifyError: number;
  microGeometryThreshold: number;
  simplicityThreshold: number;
  maxMaterials: number;
  maxTextureRes: number;
  stripNormalMaps: boolean;
  stripAOMaps: boolean;
  stripEmissive: boolean;
  stripMetallicRoughnessTexture: boolean;
  thumbnailSize: number;
  thumbnailBackground: string;
}

/** Global Bjorq base profile — all values are FIXED, never randomized */
export const BJORQ_STYLE_PROFILE: BjorqStyleProfile = {
  // --- PBR Material ---
  roughness: 0.8,
  metallic: 0.0,
  baseColorTint: [1.0, 0.96, 0.9],
  saturationClamp: 0.5,
  brightnessRange: [0.3, 0.85],
  textureFlattenStrength: 0.6,

  // --- Geometry ---
  simplifyRatio: 0.4,
  fallbackRatio: 0.2,
  simplifyError: 0.05,
  microGeometryThreshold: 36,
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
};

/**
 * Controlled style variants — all stay within Bjorq identity bounds.
 * Each variant only overrides specific properties from the base profile.
 */
export const BJORQ_STYLE_VARIANTS: Record<BjorqStyleVariant, BjorqStyleProfile> = {
  cozy: { ...BJORQ_STYLE_PROFILE },
  "soft-minimal": {
    ...BJORQ_STYLE_PROFILE,
    saturationClamp: 0.35,
    brightnessRange: [0.4, 0.9] as [number, number],
    textureFlattenStrength: 0.8,
    roughness: 0.85,
  },
  "warm-wood": {
    ...BJORQ_STYLE_PROFILE,
    baseColorTint: [1.0, 0.93, 0.82] as [number, number, number],
    saturationClamp: 0.55,
    brightnessRange: [0.25, 0.75] as [number, number],
    roughness: 0.75,
  },
};

/** Get profile for a variant (defaults to cozy) */
export function getVariantProfile(variant?: BjorqStyleVariant): BjorqStyleProfile {
  return BJORQ_STYLE_VARIANTS[variant ?? "cozy"] ?? BJORQ_STYLE_VARIANTS.cozy;
}

/**
 * Apply the Bjorq base color tint to an RGBA color.
 */
export function applyBaseColorTint(
  rgba: [number, number, number, number],
  tint?: [number, number, number],
): [number, number, number, number] {
  const [r, g, b, a] = rgba;
  const [tr, tg, tb] = tint ?? BJORQ_STYLE_PROFILE.baseColorTint;
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
  range?: [number, number],
): [number, number, number, number] {
  const [r, g, b, a] = rgba;
  const [minB, maxB] = range ?? BJORQ_STYLE_PROFILE.brightnessRange;
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

  if (brightness < 0.001) return [minB, minB, minB, a];
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
 * Clamp saturation of an RGB color.
 */
export function clampSaturation(
  rgba: [number, number, number, number],
  maxSat?: number,
): [number, number, number, number] {
  const [r, g, b, a] = rgba;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0 || lightness === 0) return [r, g, b, a];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const clampVal = maxSat ?? BJORQ_STYLE_PROFILE.saturationClamp;

  if (saturation <= clampVal) return [r, g, b, a];

  const factor = clampVal / saturation;
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
 * Optionally accepts a variant profile for variant-specific color handling.
 */
export function normalizeColor(
  rgba: number[],
  profile?: BjorqStyleProfile,
): [number, number, number, number] {
  const p = profile ?? BJORQ_STYLE_PROFILE;
  let color: [number, number, number, number] = [
    rgba[0] ?? 1, rgba[1] ?? 1, rgba[2] ?? 1, rgba[3] ?? 1,
  ];
  color = applyBaseColorTint(color, [...p.baseColorTint] as [number, number, number]);
  color = clampSaturation(color, p.saturationClamp);
  color = clampBrightness(color, [...p.brightnessRange] as [number, number]);
  return color;
}

/**
 * Visual consistency validation — checks if an asset's materials
 * match a style profile within acceptable tolerance.
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
  profile?: BjorqStyleProfile,
): VisualConsistencyResult {
  const issues: string[] = [];
  const p = profile ?? BJORQ_STYLE_PROFILE;

  const materialCountOk = materials.length <= p.maxMaterials;
  if (!materialCountOk) issues.push(`Materials: ${materials.length} > ${p.maxMaterials}`);

  let brightnessOk = true;
  let saturationOk = true;
  let roughnessOk = true;

  for (const mat of materials) {
    if (Math.abs(mat.roughness - p.roughness) > 0.15) {
      roughnessOk = false;
      issues.push(`Roughness drift: ${mat.roughness.toFixed(2)} (expected ~${p.roughness})`);
    }

    if (mat.metallic > 0.01) {
      issues.push(`Metallic > 0: ${mat.metallic}`);
    }

    const [r, g, b] = mat.baseColor;
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    const [minB, maxB] = p.brightnessRange;
    if (brightness < minB - 0.05 || brightness > maxB + 0.05) {
      brightnessOk = false;
      issues.push(`Brightness out of range: ${brightness.toFixed(2)}`);
    }

    const cmax = Math.max(r, g, b);
    const cmin = Math.min(r, g, b);
    const delta = cmax - cmin;
    const lightness = (cmax + cmin) / 2;
    if (delta > 0 && lightness > 0) {
      const sat = delta / (1 - Math.abs(2 * lightness - 1));
      if (sat > p.saturationClamp + 0.1) {
        saturationOk = false;
        issues.push(`Saturation too high: ${sat.toFixed(2)}`);
      }
    }

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
