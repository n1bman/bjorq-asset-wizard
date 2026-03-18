/**
 * Quality Gate — Dashboard Safe Validation
 *
 * Validates generated/optimized assets against strict performance limits.
 * If validation fails, automatically re-processes with more aggressive settings.
 *
 * Escalation strategy:
 *   Attempt 1: Profile-specific limits
 *   Attempt 2: Low-power optimizer settings
 *   Attempt 3: Extreme simplification (ratio 0.2)
 *
 * Currently stubbed — will be activated when generation pipeline is complete.
 */

import type { FastifyBaseLogger } from "fastify";
import type { GenerateTargetProfile, QualityGateLimits } from "../../types/generate.js";
import { QUALITY_GATE_PROFILES } from "../../types/generate.js";

export interface QualityGateResult {
  passed: boolean;
  triangles: number;
  fileSizeKB: number;
  materials: number;
  maxTextureRes: number;
  violations: string[];
  attempt: number;
}

/**
 * Validate a GLB buffer against quality gate limits for the given profile.
 */
export async function validateQuality(
  glbBuffer: Uint8Array,
  profile: GenerateTargetProfile,
  log: FastifyBaseLogger,
): Promise<QualityGateResult> {
  const limits = QUALITY_GATE_PROFILES[profile];
  const { analyzeModel } = await import("../analysis/analyzer.js");

  const analysis = await analyzeModel(glbBuffer, "validation.glb", log);

  const violations: string[] = [];
  const triangles = analysis.geometry.triangleCount;
  const fileSizeKB = glbBuffer.byteLength / 1024;
  const materials = analysis.materials.count;
  const maxTextureRes = Math.max(
    ...analysis.textures.details.map((t) => Math.max(t.width, t.height)),
    0,
  );

  if (triangles > limits.maxTriangles) {
    violations.push(`Triangles: ${triangles} > ${limits.maxTriangles}`);
  }
  if (fileSizeKB > limits.maxFileSizeKB) {
    violations.push(`File size: ${Math.round(fileSizeKB)}KB > ${limits.maxFileSizeKB}KB`);
  }
  if (materials > limits.maxMaterials) {
    violations.push(`Materials: ${materials} > ${limits.maxMaterials}`);
  }
  if (maxTextureRes > limits.maxTextureRes) {
    violations.push(`Texture: ${maxTextureRes}px > ${limits.maxTextureRes}px`);
  }

  const passed = violations.length === 0;

  if (passed) {
    log.info({ profile, triangles, fileSizeKB: Math.round(fileSizeKB) }, "Quality gate PASSED");
  } else {
    log.warn({ profile, violations }, "Quality gate FAILED");
  }

  return {
    passed,
    triangles,
    fileSizeKB: Math.round(fileSizeKB),
    materials,
    maxTextureRes,
    violations,
    attempt: 1,
  };
}
