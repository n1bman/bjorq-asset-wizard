/**
 * POST /generate — Create a 3D asset from photos
 * GET /generate/jobs/:id — Poll job status
 * POST /generate/jobs/:id/retry — Retry with new seed (variation)
 *
 * v2.2.2: Added seed-based variation, input warnings, confidence score
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import "@fastify/multipart";
import { generateJobId } from "../lib/logger.js";
import { storagePath } from "../lib/storage.js";
import type {
  GenerateJob,
  GenerateJobResponse,
  GenerateJobOptions,
} from "../types/generate.js";

// In-memory job store (sufficient for single-instance addon)
const jobs = new Map<string, GenerateJob>();

function jobToResponse(job: GenerateJob): GenerateJobResponse {
  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    result: job.result,
    error: job.error,
    canRetry: job.status === "failed" || job.status === "done",
    inputWarnings: job.inputWarnings,
  };
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

export async function generateRoutes(server: FastifyInstance) {
  // --- Create generation job ---
  server.post("/generate", async (request, reply) => {
    const jobId = generateJobId("gen");
    const outputDir = resolve(storagePath("jobs"), jobId);
    await mkdir(outputDir, { recursive: true });

    // Parse multipart
    const parts = request.parts();
    const imagePaths: string[] = [];
    let options: GenerateJobOptions = { style: "bjorq-cozy", target: "dashboard-safe" };

    for await (const part of parts) {
      if (part.type === "file" && part.fieldname === "images") {
        const buf = await part.toBuffer();
        const imgPath = resolve(outputDir, `input_${imagePaths.length}.${part.filename?.split(".").pop() || "jpg"}`);
        await writeFile(imgPath, buf);
        imagePaths.push(imgPath);
      } else if (part.type === "field" && part.fieldname === "options") {
        try {
          options = JSON.parse(part.value as string);
        } catch {
          // use defaults
        }
      }
    }

    if (imagePaths.length === 0) {
      return reply.code(400).send({ success: false, error: "At least one image is required" });
    }

    if (imagePaths.length > 4) {
      return reply.code(400).send({ success: false, error: "Maximum 4 images allowed" });
    }

    const seed = generateSeed();

    const job: GenerateJob = {
      id: jobId,
      status: "queued",
      progress: 0,
      currentStep: "queued",
      options,
      imagePaths,
      outputDir,
      attempts: 0,
      seed,
      createdAt: Date.now(),
    };

    jobs.set(jobId, job);

    // TODO: Start pipeline async when TRELLIS is available
    // For now, mark as failed with informational message
    job.status = "failed";
    job.error = "TRELLIS engine not yet installed. Photo-to-3D generation will be available after engine setup.";
    job.currentStep = "failed";

    server.log.info(
      { jobId, images: imagePaths.length, options, seed },
      "Generate job created (engine pending)",
    );

    return reply.code(202).send(jobToResponse(job));
  });

  // --- Get job status ---
  server.get<{ Params: { id: string } }>("/generate/jobs/:id", async (request, reply) => {
    const job = jobs.get(request.params.id);
    if (!job) {
      return reply.code(404).send({ success: false, error: "Job not found" });
    }
    return jobToResponse(job);
  });

  // --- Retry job (new seed = new variation) ---
  server.post<{ Params: { id: string } }>("/generate/jobs/:id/retry", async (request, reply) => {
    const job = jobs.get(request.params.id);
    if (!job) {
      return reply.code(404).send({ success: false, error: "Job not found" });
    }

    const newSeed = generateSeed();
    job.status = "queued";
    job.progress = 0;
    job.currentStep = "queued";
    job.error = undefined;
    job.result = undefined;
    job.attempts++;
    job.seed = newSeed;
    job.confidenceScore = undefined;

    server.log.info(
      { jobId: job.id, attempt: job.attempts, newSeed },
      "Generate job retry with new seed",
    );

    // TODO: Re-start pipeline when TRELLIS is available
    job.status = "failed";
    job.error = "TRELLIS engine not yet installed.";
    job.currentStep = "failed";

    return jobToResponse(job);
  });
}
