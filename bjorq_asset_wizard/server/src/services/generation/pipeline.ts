/**
 * Photo → 3D Generation Pipeline (v2.2.2)
 *
 * Orchestrates the full flow:
 *   1. Preprocess images (with input quality heuristics)
 *   2. Generate via TRELLIS subprocess (with seed + retry)
 *   3. Style normalization (via global style profile)
 *   4. Style + visual consistency validation
 *   5. Optimization (existing V2 pipeline)
 *   6. Quality gate validation (with auto-fix escalation)
 *   7. Confidence scoring
 *   8. Export GLB + thumbnail + metadata
 */

import type { FastifyBaseLogger } from "fastify";
import type { GenerateJob } from "../../types/generate.js";
import { normalizeStyle, checkStyleConsistency, BJORQ_COZY_CONFIG } from "./style-normalizer.js";
import { validateAndFix } from "./quality-gate.js";
import { BJORQ_STYLE_PROFILE, validateVisualConsistency } from "./style-profile.js";

const MAX_TRELLIS_RETRIES = 2;

/**
 * Run the full generation pipeline for a job.
 * Updates job status/progress as it progresses.
 */
export async function runGenerationPipeline(
  job: GenerateJob,
  log: FastifyBaseLogger,
): Promise<void> {
  const pipelineLog = {
    jobId: job.id,
    seed: job.seed,
    attempt: job.attempts,
    target: job.options.target,
    style: job.options.style,
    simplificationUsed: BJORQ_COZY_CONFIG.simplifyRatio,
    retriesTriggered: 0,
    fallbackUsed: false,
    finalTriangles: 0,
    finalFileSizeKB: 0,
    gateAttempts: 0,
    confidenceScore: 0,
  };

  try {
    // Step 1: Preprocess + input quality check
    job.status = "preprocessing";
    job.currentStep = "preprocessing";
    job.progress = 5;
    log.info({ jobId: job.id, seed: job.seed }, "Step 1: Preprocessing images");
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

    // Step 3: Style normalization
    job.status = "styling";
    job.currentStep = "styling";
    job.progress = 40;
    log.info({ jobId: job.id }, "Step 3: Applying Bjorq style normalization");
    let styledMesh = await normalizeStyle(rawMesh, BJORQ_COZY_CONFIG, log);

    // Step 3b: Visual consistency check — re-normalize if needed
    job.progress = 50;
    const styleCheck = await checkStyleConsistency(styledMesh, BJORQ_COZY_CONFIG, log);
    if (!styleCheck.consistent) {
      log.info({ issues: styleCheck.issues }, "Style consistency failed — re-normalizing");
      styledMesh = await normalizeStyle(styledMesh, BJORQ_COZY_CONFIG, log, true);
      pipelineLog.simplificationUsed = BJORQ_COZY_CONFIG.fallbackSimplifyRatio;
    }

    // Step 4: Optimization
    job.status = "optimizing";
    job.currentStep = "optimizing";
    job.progress = 60;
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
      maxTextureSize: BJORQ_STYLE_PROFILE.maxTextureRes,
      optimizeBaseColorTextures: true,
      textureQuality: 70,
    }, log);

    // Step 5: Quality gate (with auto-fix)
    job.status = "validating";
    job.currentStep = "validating";
    job.progress = 80;
    log.info({ jobId: job.id }, "Step 5: Validating quality");
    const { buffer: finalBuffer, result: gateResult } = await validateAndFix(
      optimized.optimizedBuffer, job.options.target, log,
    );
    pipelineLog.gateAttempts = gateResult.attempt;
    pipelineLog.fallbackUsed = gateResult.forcedMinimal;
    pipelineLog.finalTriangles = gateResult.triangles;
    pipelineLog.finalFileSizeKB = gateResult.fileSizeKB;

    // Step 5b: Final visual consistency validation
    const { analyzeModel } = await import("../analysis/analyzer.js");
    const finalAnalysis = await analyzeModel(finalBuffer, "final.glb", log);
    // Extract material data for visual check (simplified — use analysis results)
    const matCount = finalAnalysis.materials.count;
    if (matCount > BJORQ_STYLE_PROFILE.maxMaterials) {
      log.warn({ matCount }, "Final asset exceeds material limit — may need attention");
    }

    // Step 6: Compute confidence score
    const confidence = computeConfidenceScore(gateResult, styleCheck, warnings);
    job.confidenceScore = confidence;
    pipelineLog.confidenceScore = confidence;

    // Step 7: Export
    job.progress = 95;
    const { writeFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const modelPath = resolve(job.outputDir, "output.glb");
    await writeFile(modelPath, finalBuffer);

    // Thumbnail
    const thumbPath = resolve(job.outputDir, "thumb.webp");
    try {
      const { generateThumbnail } = await import("../optimization/thumbnail.js");
      await generateThumbnail(finalBuffer, thumbPath, BJORQ_STYLE_PROFILE.thumbnailSize);
    } catch (err) {
      log.warn({ err }, "Thumbnail generation failed — continuing without");
    }

    // Metadata
    const metadata = {
      style: job.options.style,
      target: job.options.target,
      seed: job.seed,
      triangles: gateResult.triangles,
      fileSizeKB: gateResult.fileSizeKB,
      materials: gateResult.materials,
      gatePassed: gateResult.passed,
      gateAttempt: gateResult.attempt,
      forcedMinimal: gateResult.forcedMinimal,
      confidenceScore: confidence,
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

    log.info(pipelineLog, "Generation pipeline complete");
  } catch (err) {
    log.error({ err, ...pipelineLog }, "Generation pipeline failed");
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Pipeline failed";
    job.currentStep = "failed";
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

    // --- Input quality checks ---
    // Low contrast
    if (stats.channels[0]) {
      const { mean, stdev } = stats.channels[0];
      if (stdev < 30) {
        warnings.push(`Image ${i + 1}: low contrast (may affect detail)`);
      }
      // Very dark or very bright
      if (mean < 40) warnings.push(`Image ${i + 1}: very dark`);
      if (mean > 230) warnings.push(`Image ${i + 1}: very bright`);
    }

    // Low resolution
    if (meta.width && meta.height && Math.max(meta.width, meta.height) < 400) {
      warnings.push(`Image ${i + 1}: low resolution (${meta.width}×${meta.height})`);
    }

    // Process
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
): number {
  let score = 1.0;

  // Gate penalties
  if (!gateResult.passed) score -= 0.3;
  if (gateResult.attempt > 1) score -= 0.1 * (gateResult.attempt - 1);
  if (gateResult.forcedMinimal) score -= 0.2;

  // Style penalties
  if (!styleCheck.consistent) score -= 0.15;
  score -= styleCheck.issues.length * 0.03;

  // Input quality penalties
  score -= inputWarnings.length * 0.05;

  // Triangle sweet spot bonus (5k–12k is ideal for dashboard)
  if (gateResult.triangles >= 5000 && gateResult.triangles <= 12000) score += 0.05;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
