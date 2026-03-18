/**
 * Photo → 3D Generation Pipeline (v2.2.1)
 *
 * Orchestrates the full flow:
 *   1. Preprocess images (crop, normalize, resize)
 *   2. Generate via TRELLIS subprocess (with retry)
 *   3. Style normalization (enforce Bjorq visual identity)
 *   4. Style consistency validation (re-run normalizer if needed)
 *   5. Optimization (existing V2 pipeline)
 *   6. Quality gate validation (with auto-fix escalation)
 *   7. Export GLB + thumbnail + metadata
 */

import type { FastifyBaseLogger } from "fastify";
import type { GenerateJob } from "../../types/generate.js";
import { normalizeStyle, checkStyleConsistency, BJORQ_COZY_CONFIG } from "./style-normalizer.js";
import { validateAndFix } from "./quality-gate.js";

const MAX_TRELLIS_RETRIES = 2;

/**
 * Run the full generation pipeline for a job.
 * Updates job status as it progresses.
 */
export async function runGenerationPipeline(
  job: GenerateJob,
  log: FastifyBaseLogger,
): Promise<void> {
  try {
    // Step 1: Preprocess
    job.status = "preprocessing";
    job.currentStep = "preprocessing";
    job.progress = 5;
    log.info({ jobId: job.id }, "Step 1: Preprocessing images");
    const preprocessed = await preprocessImages(job.imagePaths, job.outputDir, log);

    // Step 2: Generate via TRELLIS (with retry)
    job.status = "generating";
    job.currentStep = "generating";
    job.progress = 15;
    log.info({ jobId: job.id }, "Step 2: Generating 3D mesh");
    let rawMesh: Uint8Array | null = null;

    for (let attempt = 1; attempt <= MAX_TRELLIS_RETRIES; attempt++) {
      try {
        const { generateWithTrellis } = await import("../trellis/manager.js");
        rawMesh = await generateWithTrellis(preprocessed, job.outputDir, log);

        // Validate output is non-empty and valid
        if (!rawMesh || rawMesh.byteLength < 100) {
          throw new Error("TRELLIS produced empty or invalid output");
        }

        log.info({ attempt, size: rawMesh.byteLength }, "TRELLIS generation succeeded");
        break;
      } catch (err) {
        log.warn({ err, attempt, maxRetries: MAX_TRELLIS_RETRIES }, "TRELLIS generation attempt failed");
        if (attempt === MAX_TRELLIS_RETRIES) {
          throw new Error(
            `Generation failed after ${MAX_TRELLIS_RETRIES} attempts. ` +
            "Try different photos with better lighting and simpler backgrounds.",
          );
        }
        // Brief delay before retry
        await new Promise((r) => setTimeout(r, 2000));
        job.progress = 15 + attempt * 5;
      }
    }

    if (!rawMesh) {
      throw new Error("No mesh produced");
    }

    // Step 3: Style normalization
    job.status = "styling";
    job.currentStep = "styling";
    job.progress = 40;
    log.info({ jobId: job.id }, "Step 3: Applying Bjorq style normalization");
    let styledMesh = await normalizeStyle(rawMesh, BJORQ_COZY_CONFIG, log);

    // Step 3b: Validate style consistency — re-run if needed
    job.progress = 50;
    const styleCheck = await checkStyleConsistency(styledMesh, BJORQ_COZY_CONFIG, log);
    if (!styleCheck.consistent) {
      log.info({ issues: styleCheck.issues }, "Style consistency check failed — re-normalizing");
      styledMesh = await normalizeStyle(styledMesh, BJORQ_COZY_CONFIG, log, true);
    }

    // Step 4: Optimization via existing V2 pipeline
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
      maxTextureSize: BJORQ_COZY_CONFIG.maxTextureRes,
      optimizeBaseColorTextures: true,
      textureQuality: 70,
    }, log);

    // Step 5: Quality gate validation (with auto-fix)
    job.status = "validating";
    job.currentStep = "validating";
    job.progress = 80;
    log.info({ jobId: job.id }, "Step 5: Validating quality");
    const { buffer: finalBuffer, result: gateResult } = await validateAndFix(
      optimized.optimizedBuffer,
      job.options.target,
      log,
    );

    // Step 6: Export
    job.progress = 95;
    log.info({ jobId: job.id, gate: gateResult }, "Step 6: Exporting final asset");
    const { writeFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");

    const modelPath = resolve(job.outputDir, "output.glb");
    await writeFile(modelPath, finalBuffer);

    // Generate thumbnail
    const thumbPath = resolve(job.outputDir, "thumb.webp");
    try {
      const { generateThumbnail } = await import("../optimization/thumbnail.js");
      await generateThumbnail(finalBuffer, thumbPath, 256);
    } catch (err) {
      log.warn({ err }, "Thumbnail generation failed — continuing without");
    }

    // Write metadata
    const metadata = {
      style: job.options.style,
      target: job.options.target,
      triangles: gateResult.triangles,
      fileSizeKB: gateResult.fileSizeKB,
      materials: gateResult.materials,
      gatePassed: gateResult.passed,
      gateAttempt: gateResult.attempt,
      forcedMinimal: gateResult.forcedMinimal,
      source: "generated",
      inputImages: job.imagePaths.length,
      generatedAt: new Date().toISOString(),
    };
    const metaPath = resolve(job.outputDir, "metadata.json");
    await writeFile(metaPath, JSON.stringify(metadata, null, 2));

    // Done
    job.status = "done";
    job.currentStep = "done";
    job.progress = 100;
    job.result = {
      model: `/jobs/${job.id}/output.glb`,
      thumbnail: `/jobs/${job.id}/thumb.webp`,
      metadata,
    };

    log.info(
      { jobId: job.id, triangles: gateResult.triangles, fileSizeKB: gateResult.fileSizeKB, gateAttempt: gateResult.attempt },
      "Generation pipeline complete",
    );
  } catch (err) {
    log.error({ err, jobId: job.id }, "Generation pipeline failed");
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Pipeline failed";
    job.currentStep = "failed";
  }
}

/**
 * Preprocess input images using sharp:
 * - Resize to max 1024px
 * - Normalize lighting/contrast
 * - Convert to consistent PNG format
 */
async function preprocessImages(
  imagePaths: string[],
  outputDir: string,
  log: FastifyBaseLogger,
): Promise<string[]> {
  const sharp = (await import("sharp")).default;
  const { resolve } = await import("node:path");

  const processed: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const outPath = resolve(outputDir, `preprocessed_${i}.png`);
    await sharp(imagePaths[i])
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .normalize()        // auto-contrast
      .modulate({ saturation: 0.9 }) // slightly desaturate for cleaner input
      .sharpen({ sigma: 0.5 })       // mild sharpen for edge clarity
      .png()
      .toFile(outPath);

    processed.push(outPath);
    log.debug({ input: imagePaths[i], output: outPath }, "Preprocessed image");
  }

  return processed;
}
