/**
 * Quality Gate — Dashboard Safe Validation (v2.2.1)
 *
 * Validates generated/optimized assets against strict performance limits.
 * If validation fails, automatically re-processes with escalating aggression.
 *
 * Escalation strategy:
 *   Attempt 1: Profile-specific limits with standard processing
 *   Attempt 2: Low-power optimizer + aggressive style normalization
 *   Attempt 3: Extreme simplification (ratio 0.2) + single material + tiny textures
 *
 * Hard rejection fallback:
 *   If all 3 attempts fail, force a minimal safe version that is always usable.
 */

import type { FastifyBaseLogger } from "fastify";
import type { GenerateTargetProfile } from "../../types/generate.js";
import { QUALITY_GATE_PROFILES } from "../../types/generate.js";
import { normalizeStyle, BJORQ_COZY_CONFIG, type StyleNormalizerConfig } from "./style-normalizer.js";

export interface QualityGateResult {
  passed: boolean;
  triangles: number;
  fileSizeKB: number;
  materials: number;
  maxTextureRes: number;
  violations: string[];
  attempt: number;
  forcedMinimal: boolean;
}

/** Escalating configs for retry attempts */
const ESCALATION_CONFIGS: Partial<StyleNormalizerConfig>[] = [
  // Attempt 2: more aggressive
  {
    simplifyRatio: 0.25,
    maxMaterials: 2,
    maxTextureRes: 256,
  },
  // Attempt 3: extreme
  {
    simplifyRatio: 0.15,
    fallbackSimplifyRatio: 0.1,
    maxMaterials: 1,
    maxTextureRes: 128,
    roughness: 0.85,
  },
];

/**
 * Validate a GLB buffer against quality gate limits for the given profile.
 */
export async function validateQuality(
  glbBuffer: Uint8Array,
  profile: GenerateTargetProfile,
  log: FastifyBaseLogger,
): Promise<QualityGateResult> {
  const limits = QUALITY_GATE_PROFILES[profile];
  const result = await measureAsset(glbBuffer, log);

  const violations = checkViolations(result, limits);
  const passed = violations.length === 0;

  if (passed) {
    log.info({ profile, ...result }, "Quality gate PASSED");
  } else {
    log.warn({ profile, violations }, "Quality gate FAILED");
  }

  return { ...result, passed, violations, attempt: 1, forcedMinimal: false };
}

/**
 * Validate and auto-fix: run up to 3 escalating attempts.
 * Always returns a usable buffer — never fails completely.
 */
export async function validateAndFix(
  glbBuffer: Uint8Array,
  profile: GenerateTargetProfile,
  log: FastifyBaseLogger,
): Promise<{ buffer: Uint8Array; result: QualityGateResult }> {
  const limits = QUALITY_GATE_PROFILES[profile];

  // Attempt 1: validate as-is
  let current = glbBuffer;
  let measurement = await measureAsset(current, log);
  let violations = checkViolations(measurement, limits);

  if (violations.length === 0) {
    log.info({ attempt: 1 }, "Quality gate passed on first attempt");
    return {
      buffer: current,
      result: { ...measurement, passed: true, violations: [], attempt: 1, forcedMinimal: false },
    };
  }

  // Attempts 2–3: escalating re-processing
  for (let attempt = 0; attempt < ESCALATION_CONFIGS.length; attempt++) {
    const attemptNum = attempt + 2;
    const escalation = ESCALATION_CONFIGS[attempt];
    const config = { ...BJORQ_COZY_CONFIG, ...escalation };

    log.info(
      { attempt: attemptNum, ratio: config.simplifyRatio, maxMaterials: config.maxMaterials },
      "Quality gate: re-processing with escalated settings",
    );

    try {
      current = await normalizeStyle(current, config, log, attempt > 0);
      measurement = await measureAsset(current, log);
      violations = checkViolations(measurement, limits);

      if (violations.length === 0) {
        log.info({ attempt: attemptNum }, "Quality gate passed after re-processing");
        return {
          buffer: current,
          result: { ...measurement, passed: true, violations: [], attempt: attemptNum, forcedMinimal: false },
        };
      }
    } catch (err) {
      log.error({ err, attempt: attemptNum }, "Re-processing failed, continuing to next attempt");
    }
  }

  // Hard fallback: force minimal safe version
  log.warn("Quality gate: all attempts failed, forcing minimal safe version");
  try {
    const minimalConfig: StyleNormalizerConfig = {
      ...BJORQ_COZY_CONFIG,
      simplifyRatio: 0.1,
      fallbackSimplifyRatio: 0.05,
      maxMaterials: 1,
      maxTextureRes: 64,
      roughness: 0.85,
    };
    current = await normalizeStyle(current, minimalConfig, log, true);
    measurement = await measureAsset(current, log);
  } catch (err) {
    log.error({ err }, "Minimal fallback also failed — returning best attempt");
  }

  return {
    buffer: current,
    result: {
      ...measurement,
      passed: false,
      violations,
      attempt: 4,
      forcedMinimal: true,
    },
  };
}

// --- Internal helpers ---

interface AssetMeasurement {
  triangles: number;
  fileSizeKB: number;
  materials: number;
  maxTextureRes: number;
}

async function measureAsset(
  glbBuffer: Uint8Array,
  log: FastifyBaseLogger,
): Promise<AssetMeasurement> {
  const { analyzeModel } = await import("../analysis/analyzer.js");
  const analysis = await analyzeModel(glbBuffer, "validation.glb", log);

  return {
    triangles: analysis.geometry.triangleCount,
    fileSizeKB: Math.round(glbBuffer.byteLength / 1024),
    materials: analysis.materials.count,
    maxTextureRes: Math.max(
      ...analysis.textures.details.map((t) => Math.max(t.width, t.height)),
      0,
    ),
  };
}

function checkViolations(
  measurement: AssetMeasurement,
  limits: { maxTriangles: number; maxFileSizeKB: number; maxMaterials: number; maxTextureRes: number },
): string[] {
  const violations: string[] = [];
  if (measurement.triangles > limits.maxTriangles) {
    violations.push(`Triangles: ${measurement.triangles} > ${limits.maxTriangles}`);
  }
  if (measurement.fileSizeKB > limits.maxFileSizeKB) {
    violations.push(`File size: ${measurement.fileSizeKB}KB > ${limits.maxFileSizeKB}KB`);
  }
  if (measurement.materials > limits.maxMaterials) {
    violations.push(`Materials: ${measurement.materials} > ${limits.maxMaterials}`);
  }
  if (measurement.maxTextureRes > limits.maxTextureRes) {
    violations.push(`Texture: ${measurement.maxTextureRes}px > ${limits.maxTextureRes}px`);
  }
  return violations;
}
