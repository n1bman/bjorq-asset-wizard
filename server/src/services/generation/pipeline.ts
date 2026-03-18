/**
 * Photo → 3D Generation Pipeline (v2.3.1)
 *
 * Orchestrates the full flow:
 *   1. Preprocess images (with input quality heuristics)
 *   2. Generate via TRELLIS subprocess (with seed + retry)
 *   3. Style normalization (variant-aware via global style profile)
 *   4. Style + visual consistency validation + drift detection
 *   5. Optimization (existing V2 pipeline)
 *   6. Quality gate validation (with auto-fix escalation)
 *   7. Scene compatibility check + auto-fix (BEFORE LOD generation)
 *   8. Category detection
 *   9. LOD generation (from scene-compatible buffer — preserves pivot/scale/floor)
 *  10. Confidence scoring + analytics
 *  11. Export GLB + thumbnail + metadata (with versioning + structured LOD info)
 *
 * LOD ARCHITECTURE NOTE:
 * The Wizard addon only prepares, stores, and exposes LOD-ready variants and metadata.
 * Runtime LOD selection belongs to the Bjorq Dashboard.
 * Assets are always fully usable even if Dashboard ignores LOD metadata.
 */

import type { FastifyBaseLogger } from "fastify";
import type { GenerateJob } from "../../types/generate.js";
import type { BjorqStyleVariant } from "./style-profile.js";
import { normalizeStyle, checkStyleConsistency, configFromVariant } from "./style-normalizer.js";
import { validateAndFix } from "./quality-gate.js";
import { getVariantProfile, validateVisualConsistency } from "./style-profile.js";
import { detectStyleDrift } from "./drift-detector.js";
import { ensureSceneCompatibility } from "./scene-compat.js";
import { detectCategory } from "./category-detector.js";
import { generateLODs } from "./lod-generator.js";
import { pipelineMetrics } from "../analytics/metrics.js";

const MAX_TRELLIS_RETRIES = 2;

/**
 * Run the full generation pipeline for a job.
 * Updates job status/progress as it progresses.
 */
export async function runGenerationPipeline(
  job: GenerateJob,
  log: FastifyBaseLogger,
): Promise<void> {
  const startTime = Date.now();
  const variant = (job.options.variant ?? "cozy") as BjorqStyleVariant;
  const config = configFromVariant(variant);
  const profile = getVariantProfile(variant);

  const pipelineLog = {
    jobId: job.id,
    seed: job.seed,
    attempt: job.attempts,
    target: job.options.target,
    style: job.options.style,
    variant,
    simplificationUsed: config.simplifyRatio,
    retriesTriggered: 0,
    fallbackUsed: false,
    finalTriangles: 0,
    finalFileSizeKB: 0,
    gateAttempts: 0,
    confidenceScore: 0,
    driftCorrected: false,
    sceneFixes: 0,
    category: "other",
    lodGenerated: false,
  };

  try {
    // Step 1: Preprocess + input quality check
    job.status = "preprocessing";
    job.currentStep = "preprocessing";
    job.progress = 5;
    log.info({ jobId: job.id, seed: job.seed, variant }, "Step 1: Preprocessing images");
    const { processed, warnings } = await preprocessAndAnalyzeImages(
      job.imagePaths, job.outputDir, log,
    );
    job.inputWarnings = warnings;
    if (warnings.length > 0) {
      log.warn({ jobId: job.id, warnings }, "Input quality warnings detected");
    }

    // Step 2: Generate via TRELLIS (with retry)
    job.status = "generating";
    job.currentStep = "generating";
    job.progress = 15;
    log.info({ jobId: job.id }, "Step 2: Generating 3D mesh");
    let rawMesh: Uint8Array | null = null;
    let trellisFailure = false;

    for (let attempt = 1; attempt <= MAX_TRELLIS_RETRIES; attempt++) {
      try {
        const { generateWithTrellis } = await import("../trellis/manager.js");
        rawMesh = await generateWithTrellis(processed, job.outputDir, log);

        if (!rawMesh || rawMesh.byteLength < 100) {
          throw new Error("TRELLIS produced empty or invalid output");
        }

        log.info({ attempt, size: rawMesh.byteLength }, "TRELLIS generation succeeded");
        break;
      } catch (err) {
        pipelineLog.retriesTriggered++;
        trellisFailure = true;
        log.warn({ err, attempt, maxRetries: MAX_TRELLIS_RETRIES }, "TRELLIS attempt failed");
        if (attempt === MAX_TRELLIS_RETRIES) {
          throw new Error(
            `Generation failed after ${MAX_TRELLIS_RETRIES} attempts. ` +
            "Try different photos with better lighting and simpler backgrounds.",
          );
        }
        await new Promise((r) => setTimeout(r, 2000));
        job.progress = 15 + attempt * 5;
      }
    }

    if (!rawMesh) throw new Error("No mesh produced");

    // Step 3: Style normalization (variant-aware)
    job.status = "styling";
    job.currentStep = "styling";
    job.progress = 35;
    log.info({ jobId: job.id, variant }, "Step 3: Applying Bjorq style normalization");
    let styledMesh = await normalizeStyle(rawMesh, config, log, false, variant);

    // Step 3b: Visual consistency check — re-normalize if needed
    job.progress = 42;
    const styleCheck = await checkStyleConsistency(styledMesh, config, log, variant);
    if (!styleCheck.consistent) {
      log.info({ issues: styleCheck.issues }, "Style consistency failed — re-normalizing");
      styledMesh = await normalizeStyle(styledMesh, config, log, true, variant);
      pipelineLog.simplificationUsed = config.fallbackSimplifyRatio;
    }

    // Step 3c: Style drift detection — re-normalize if drifted
    job.progress = 48;
    const driftReport = await detectStyleDrift(styledMesh, variant, log);
    if (driftReport.drifted) {
      log.info({ driftScore: driftReport.score }, "Style drift detected — forcing re-normalization");
      styledMesh = await normalizeStyle(styledMesh, config, log, true, variant);
      pipelineLog.driftCorrected = true;
    }

    // Step 4: Optimization
    job.status = "optimizing";
    job.currentStep = "optimizing";
    job.progress = 55;
    log.info({ jobId: job.id }, "Step 4: Optimizing asset");
    const { optimizeModel } = await import("../optimization/optimizer.js");
    const optimized = await optimizeModel(styledMesh, "generated.glb", {
      profile: "low-power",
      removeCameras: true,
      removeLights: true,
      removeAnimations: true,
      removeEmptyNodes: true,
      removeUnusedNodes: true,
      deduplicateMaterials: true,
      normalizeScale: true,
      setFloorToY0: true,
      maxTextureSize: profile.maxTextureRes,
      optimizeBaseColorTextures: true,
      textureQuality: 70,
    }, log);

    // Step 5: Quality gate (with auto-fix)
    job.status = "validating";
    job.currentStep = "validating";
    job.progress = 68;
    log.info({ jobId: job.id }, "Step 5: Validating quality");
    const { buffer: gatedBuffer, result: gateResult } = await validateAndFix(
      optimized.optimizedBuffer, job.options.target, log,
    );
    pipelineLog.gateAttempts = gateResult.attempt;
    pipelineLog.fallbackUsed = gateResult.forcedMinimal;
    pipelineLog.finalTriangles = gateResult.triangles;
    pipelineLog.finalFileSizeKB = gateResult.fileSizeKB;

    // Step 6: Scene compatibility check + auto-fix
    job.progress = 76;
    log.info({ jobId: job.id }, "Step 6: Scene compatibility check");
    const { buffer: sceneBuffer, result: sceneResult } = await ensureSceneCompatibility(gatedBuffer, log);
    pipelineLog.sceneFixes = sceneResult.fixes.length;

    const finalBuffer = sceneBuffer;

    // Step 7: Category detection
    job.progress = 82;
    log.info({ jobId: job.id }, "Step 7: Detecting category");
    const categoryResult = await detectCategory(finalBuffer, log);
    pipelineLog.category = categoryResult.category;

    // Step 8: LOD generation
    job.progress = 86;
    log.info({ jobId: job.id }, "Step 8: Generating LODs");
    const lodResult = await generateLODs(finalBuffer, job.outputDir, "output", log);
    pipelineLog.lodGenerated = !lodResult.skipped;

    // Step 9: Compute confidence score
    const confidence = computeConfidenceScore(gateResult, styleCheck, warnings, driftReport.score, sceneResult.fixes.length);
    job.confidenceScore = confidence;
    pipelineLog.confidenceScore = confidence;

    // Step 10: Export
    job.progress = 93;
    const { writeFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const modelPath = resolve(job.outputDir, "output.glb");
    await writeFile(modelPath, finalBuffer);

    // Thumbnail
    const thumbPath = resolve(job.outputDir, "thumb.webp");
    try {
      const { generateThumbnail } = await import("../optimization/thumbnail.js");
      await generateThumbnail(finalBuffer, thumbPath, profile.thumbnailSize);
    } catch (err) {
      log.warn({ err }, "Thumbnail generation failed — continuing without");
    }

    // Metadata (with versioning support)
    const metadata = {
      style: job.options.style,
      variant,
      target: job.options.target,
      seed: job.seed,
      version: job.attempts + 1,
      triangles: gateResult.triangles,
      fileSizeKB: gateResult.fileSizeKB,
      materials: gateResult.materials,
      gatePassed: gateResult.passed,
      gateAttempt: gateResult.attempt,
      forcedMinimal: gateResult.forcedMinimal,
      confidenceScore: confidence,
      category: categoryResult.category,
      categoryConfidence: categoryResult.confidence,
      lods: lodResult.skipped
        ? ["output.glb"]
        : [
            "output.glb",
            ...(lodResult.lod1 ? ["output_lod1.glb"] : []),
            ...(lodResult.lod2 ? ["output_lod2.glb"] : []),
          ],
      sceneCompatible: sceneResult.compatible,
      sceneFixes: sceneResult.fixes,
      driftScore: driftReport.score,
      driftCorrected: pipelineLog.driftCorrected,
      source: "generated",
      inputImages: job.imagePaths.length,
      inputWarnings: warnings,
      generatedAt: new Date().toISOString(),
    };
    await writeFile(resolve(job.outputDir, "metadata.json"), JSON.stringify(metadata, null, 2));

    // Done
    job.status = "done";
    job.currentStep = "done";
    job.progress = 100;
    job.result = {
      model: `/jobs/${job.id}/output.glb`,
      thumbnail: `/jobs/${job.id}/thumb.webp`,
      metadata,
    };

    // Record analytics
    pipelineMetrics.record({
      jobId: job.id,
      success: true,
      generationTimeMs: Date.now() - startTime,
      queueWaitTimeMs: 0, // set by caller
      confidenceScore: confidence,
      retries: pipelineLog.retriesTriggered,
      fallbackUsed: pipelineLog.fallbackUsed,
      trellisFailure: trellisFailure,
      driftCorrected: pipelineLog.driftCorrected,
      category: categoryResult.category,
      lodGenerated: pipelineLog.lodGenerated,
      sceneFixes: pipelineLog.sceneFixes,
      timestamp: Date.now(),
    });

    log.info(pipelineLog, "Generation pipeline complete");
  } catch (err) {
    log.error({ err, ...pipelineLog }, "Generation pipeline failed");
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Pipeline failed";
    job.currentStep = "failed";

    pipelineMetrics.record({
      jobId: job.id,
      success: false,
      generationTimeMs: Date.now() - startTime,
      queueWaitTimeMs: 0,
      confidenceScore: 0,
      retries: pipelineLog.retriesTriggered,
      fallbackUsed: pipelineLog.fallbackUsed,
      trellisFailure: true,
      driftCorrected: false,
      category: "other",
      lodGenerated: false,
      sceneFixes: 0,
      timestamp: Date.now(),
    });
  }
}

// --- Input quality heuristics ---

interface PreprocessResult {
  processed: string[];
  warnings: string[];
}

async function preprocessAndAnalyzeImages(
  imagePaths: string[],
  outputDir: string,
  log: FastifyBaseLogger,
): Promise<PreprocessResult> {
  const sharp = (await import("sharp")).default;
  const { resolve } = await import("node:path");

  const processed: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const outPath = resolve(outputDir, `preprocessed_${i}.png`);
    const img = sharp(imagePaths[i]);
    const stats = await img.stats();
    const meta = await img.metadata();

    if (stats.channels[0]) {
      const { mean, stdev } = stats.channels[0];
      if (stdev < 30) warnings.push(`Image ${i + 1}: low contrast (may affect detail)`);
      if (mean < 40) warnings.push(`Image ${i + 1}: very dark`);
      if (mean > 230) warnings.push(`Image ${i + 1}: very bright`);
    }

    if (meta.width && meta.height && Math.max(meta.width, meta.height) < 400) {
      warnings.push(`Image ${i + 1}: low resolution (${meta.width}×${meta.height})`);
    }

    await sharp(imagePaths[i])
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .normalize()
      .modulate({ saturation: 0.9 })
      .sharpen({ sigma: 0.5 })
      .png()
      .toFile(outPath);

    processed.push(outPath);
    log.debug({ input: imagePaths[i], output: outPath }, "Preprocessed image");
  }

  return { processed, warnings };
}

// --- Confidence scoring ---

function computeConfidenceScore(
  gateResult: { passed: boolean; attempt: number; forcedMinimal: boolean; triangles: number },
  styleCheck: { consistent: boolean; issues: string[] },
  inputWarnings: string[],
  driftScore: number,
  sceneFixes: number,
): number {
  let score = 1.0;

  if (!gateResult.passed) score -= 0.3;
  if (gateResult.attempt > 1) score -= 0.1 * (gateResult.attempt - 1);
  if (gateResult.forcedMinimal) score -= 0.2;

  if (!styleCheck.consistent) score -= 0.15;
  score -= styleCheck.issues.length * 0.03;

  score -= inputWarnings.length * 0.05;
  score -= driftScore * 0.1;
  score -= sceneFixes * 0.02;

  if (gateResult.triangles >= 5000 && gateResult.triangles <= 12000) score += 0.05;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
