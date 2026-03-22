/**
 * POST /generate — Create a 3D asset from photos
 * GET /generate/jobs/:id — Poll job status
 * POST /generate/jobs/:id/retry — Retry with new seed (variation)
 * GET /generate/queue — Queue status
 * GET /generate/metrics — Pipeline metrics (internal)
 *
 * v2.3.0: Added queue, variants, metrics, versioning
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
import { generationQueue } from "../services/queue/job-queue.js";
import { pipelineMetrics } from "../services/analytics/metrics.js";

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
    queuePosition: generationQueue.getPosition(job.id),
  };
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

export async function generateRoutes(server: FastifyInstance) {
  // Initialize queue logger
  generationQueue.setLogger(server.log);

  // --- Create generation job ---
  server.post("/generate", async (request, reply) => {
    const jobId = generateJobId("gen");
    const outputDir = resolve(storagePath("jobs"), jobId);
    await mkdir(outputDir, { recursive: true });

    // Parse multipart
    const parts = request.parts();
    const imagePaths: string[] = [];
    let options: GenerateJobOptions = { style: "bjorq-cozy", target: "dashboard-safe", variant: "cozy" };

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

    if (imagePaths.length > 1) {
      return reply.code(400).send({
        success: false,
        error: "TRELLIS.2 worker currently supports one input image per generation",
      });
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

    // Enqueue for processing
    generationQueue.enqueue(jobId, async () => {
      const { runGenerationPipeline } = await import("../services/generation/pipeline.js");
      await runGenerationPipeline(job, server.log);
    });

    server.log.info(
      { jobId, images: imagePaths.length, options, seed },
      "Generate job created and queued",
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
      "Generate job retry with new seed (new variation)",
    );

    // Re-enqueue
    generationQueue.enqueue(job.id, async () => {
      const { runGenerationPipeline } = await import("../services/generation/pipeline.js");
      await runGenerationPipeline(job, server.log);
    });

    return jobToResponse(job);
  });

  // --- Queue status ---
  server.get("/generate/queue", async () => {
    return generationQueue.getStatus();
  });

  // --- Pipeline metrics (internal/diagnostic) ---
  server.get("/generate/metrics", async () => {
    return pipelineMetrics.getMetrics();
  });
}
