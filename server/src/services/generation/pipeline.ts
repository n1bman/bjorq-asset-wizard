/**
 * Photo → 3D Generation Pipeline
 *
 * Orchestrates the full flow:
 *   1. Preprocess images (crop, normalize, resize)
 *   2. Generate via TRELLIS subprocess
 *   3. Style normalization (enforce Bjorq visual identity)
 *   4. Optimization (existing V2 pipeline)
 *   5. Quality gate validation
 *   6. Export GLB + thumbnail + metadata
 *
 * Currently stubbed — will be wired when TRELLIS subprocess wrapper is complete.
 */

import type { FastifyBaseLogger } from "fastify";
import type { GenerateJob, GenerateTargetProfile } from "../../types/generate.js";

export interface PipelineConfig {
  target: GenerateTargetProfile;
  style: string;
}

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
    job.progress = 10;
    log.info({ jobId: job.id }, "Step 1: Preprocessing images");
    await preprocessImages(job.imagePaths, job.outputDir, log);

    // Step 2: Generate via TRELLIS
    job.status = "generating";
    job.currentStep = "generating";
    job.progress = 30;
    log.info({ jobId: job.id }, "Step 2: Generating 3D mesh");
    // const rawMesh = await generateWithTrellis(job.imagePaths, job.outputDir, log);

    // Step 3: Style normalization
    job.status = "styling";
    job.currentStep = "styling";
    job.progress = 55;
    log.info({ jobId: job.id }, "Step 3: Applying Bjorq style normalization");
    // await normalizeStyle(rawMesh, job.options, log);

    // Step 4: Optimization
    job.status = "optimizing";
    job.currentStep = "optimizing";
    job.progress = 75;
    log.info({ jobId: job.id }, "Step 4: Optimizing asset");
    // Reuse existing optimizeModel with low-power profile

    // Step 5: Quality gate
    job.status = "validating";
    job.currentStep = "validating";
    job.progress = 90;
    log.info({ jobId: job.id }, "Step 5: Validating quality");
    // await validateQuality(optimizedBuffer, job.options.target, log);

    // Done
    job.status = "done";
    job.currentStep = "done";
    job.progress = 100;

    // TODO: Set job.result with actual output paths
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
 * - Normalize lighting
 * - Auto-crop to subject
 */
async function preprocessImages(
  imagePaths: string[],
  outputDir: string,
  log: FastifyBaseLogger,
): Promise<string[]> {
  const sharp = (await import("sharp")).default;
  const { resolve } = await import("node:path");
  const { writeFile } = await import("node:fs/promises");

  const processed: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const outPath = resolve(outputDir, `preprocessed_${i}.png`);
    await sharp(imagePaths[i])
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .normalize()
      .png()
      .toFile(outPath);

    processed.push(outPath);
    log.debug({ input: imagePaths[i], output: outPath }, "Preprocessed image");
  }

  return processed;
}
