/**
 * POST /optimize — Optimize a 3D model (GLB/glTF) with configurable options.
 *
 * V1: Conservative cleanup (prune, dedup, remove cameras/lights/animations/empty nodes).
 * V2: Advanced normalization (flatten scale, floor alignment, texture resize).
 * Stores outputs in storage/jobs/<jobId>/ for isolation.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import "@fastify/multipart";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import { storagePath } from "../lib/storage.js";
import { optimizeModel } from "../services/optimization/optimizer.js";
import { deriveAssetId } from "../services/optimization/slugify.js";
import { deriveTargetProfile } from "../services/optimization/profiles.js";
import type { OptimizeRequestOptions, OptimizeResponse, OptimizeErrorResponse } from "../types/optimize.js";

const SUPPORTED_EXTENSIONS = new Set([".glb", ".gltf"]);

export async function optimizeRoutes(server: FastifyInstance) {
  server.post<{ Reply: OptimizeResponse | OptimizeErrorResponse }>("/optimize", async (request, reply) => {
    const jobId = generateJobId();
    const log = createJobLogger(request.log, jobId, "optimize");

    log.info("Optimize request received");

    // --- Extract multipart ---
    let fileBuffer: Buffer | null = null;
    let fileName = "model.glb";
    let optionsRaw: string | null = null;

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "file") {
          fileBuffer = await part.toBuffer();
          fileName = part.filename || fileName;
        } else if (part.type === "field" && part.fieldname === "options") {
          optionsRaw = part.value as string;
        }
      }
    } catch (err) {
      log.error({ err, stage: "upload" }, "Failed to parse multipart");
      return reply.status(400).send({ success: false, error: "Failed to parse multipart upload", stage: "upload" });
    }

    // --- Validate file ---
    if (!fileBuffer || fileBuffer.length === 0) {
      log.warn("No file provided");
      return reply.status(400).send({ success: false, error: "No file provided. Upload a .glb or .gltf file.", stage: "upload" });
    }

    log.info({ fileName, fileSizeBytes: fileBuffer.length, fileSizeMB: +(fileBuffer.length / (1024 * 1024)).toFixed(1) }, "File received");

    const ext = extname(fileName).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      log.warn({ ext, fileName }, "Unsupported file format");
      return reply.status(400).send({
        success: false,
        error: `Unsupported file format '${ext}'. Only .glb and .gltf are supported.`,
      });
    }

    // --- Parse options ---
    let options: OptimizeRequestOptions = {};
    if (optionsRaw) {
      try {
        options = JSON.parse(optionsRaw);
      } catch {
        log.warn("Invalid options JSON");
        return reply.status(400).send({ success: false, error: "Invalid optimization options JSON" });
      }
    }

    // --- Derive asset identity (metadata only) ---
    const { id: assetId, name: assetName } = deriveAssetId(options.assetName, fileName);
    log.info({ assetId, assetName }, "Asset identity derived");

    // --- Run optimization ---
    let result;
    try {
      result = await optimizeModel(new Uint8Array(fileBuffer), fileName, options, log);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown optimization error";
      log.error({ err, stage: "optimize" }, "Optimization failed");
      return reply.status(422).send({ success: false, error: `Optimization failed: ${message}`, stage: "optimize" });
    }

    // --- Derive V2 optimization flags ---
    const normalizationApplied = result.applied.includes("normalizeScale");
    const floorAlignmentApplied = result.applied.includes("setFloorToY0");
    const textureOptimizationApplied = result.applied.includes("optimizeBaseColorTextures");

    // --- Write outputs to storage/jobs/<jobId>/ ---
    const jobDir = storagePath("jobs", jobId);
    try {
      await mkdir(jobDir, { recursive: true });

      // Preserve original extension
      const originalFilename = `original${ext}`;
      await writeFile(`${jobDir}/${originalFilename}`, fileBuffer);
      await writeFile(`${jobDir}/optimized.glb`, result.optimizedBuffer);

      const resultJson = {
        jobId,
        assetId,
        assetName,
        options,
        before: result.before,
        after: result.after,
        reduction: result.reduction,
        applied: result.applied,
        skipped: result.skipped,
        warnings: result.warnings,
        explanations: result.explanations,
        timestamp: new Date().toISOString(),
        // Phase 7 — scene metadata for ingest
        scene: {
          boundingBox: result.analysisAfter.boundingBox,
          dimensions: result.analysisAfter.dimensions,
          placement: result.analysisAfter.placement,
          estimatedScale: result.analysisAfter.estimatedScale,
        },
        // Phase 8 — V2 optimization flags
        normalizationApplied,
        floorAlignmentApplied,
        textureOptimizationApplied,
      };
      await writeFile(`${jobDir}/result.json`, JSON.stringify(resultJson, null, 2));

      log.info({ jobDir }, "Outputs written to storage");
    } catch (err) {
      log.error({ err, stage: "optimize" }, "Failed to write outputs to storage");
      return reply.status(500).send({ success: false, error: "Failed to save optimization outputs", stage: "optimize" });
    }

    // --- Derive target profile ---
    const originalFileSizeKB = Math.round(fileBuffer.length / 1024);
    const targetProfile = deriveTargetProfile(
      result.after.triangles,
      result.after.fileSizeKB,
      options.placement || result.analysisAfter.placement?.candidate,
    );
    const reductionPercent = result.reduction.fileSizePercent;

    // --- Build response matching frontend OptimizeResponse ---
    const response: OptimizeResponse = {
      success: true,
      jobId,
      analysis: result.analysisBefore,
      optimization: {
        applied: result.applied,
        skipped: result.skipped,
        warnings: result.warnings,
        explanations: result.explanations,
      },
      stats: {
        before: result.before,
        after: result.after,
        reduction: result.reduction,
      },
      outputs: {
        optimizedModel: `/jobs/${jobId}/optimized.glb`,
        thumbnail: null,
        metadata: `/jobs/${jobId}/result.json`,
        report: "",
      },
      metadata: {
        id: assetId,
        name: assetName,
        category: options.category || "",
        subcategory: options.subcategory || "",
        style: options.style || "",
        model: `/jobs/${jobId}/optimized.glb`,
        thumbnail: null,
        dimensions: result.analysisAfter.dimensions,
        placement: options.placement || result.analysisAfter.placement?.candidate || "unknown",
        performance: {
          triangles: result.after.triangles,
          materials: result.after.materials,
          fileSizeKB: result.after.fileSizeKB,
        },
        originalFileSizeKB,
        reductionPercent: +reductionPercent.toFixed(1),
        targetProfile,
        boundingBox: result.analysisAfter.boundingBox,
        center: result.analysisAfter.boundingBox
          ? [
              +((result.analysisAfter.boundingBox.min[0] + result.analysisAfter.boundingBox.max[0]) / 2).toFixed(4),
              +((result.analysisAfter.boundingBox.min[1] + result.analysisAfter.boundingBox.max[1]) / 2).toFixed(4),
              +((result.analysisAfter.boundingBox.min[2] + result.analysisAfter.boundingBox.max[2]) / 2).toFixed(4),
            ] as [number, number, number]
          : undefined,
        estimatedScale: result.analysisAfter.estimatedScale
          ? { unit: result.analysisAfter.estimatedScale.unit, confidence: result.analysisAfter.estimatedScale.confidence }
          : undefined,
        normalizationApplied,
        floorAlignmentApplied,
        textureOptimizationApplied,
      },
    };

    log.info({ jobId, assetId, reduction: result.reduction, explanations: result.explanations }, "Optimize response ready");
    return reply.status(200).send(response);
  });
}
