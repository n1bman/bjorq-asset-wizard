/**
 * POST /analyze — Analyze a 3D model file (GLB/glTF).
 *
 * Accepts a multipart file upload, parses the model in memory,
 * and returns structured analysis JSON with stage-level error reporting.
 */

import type { FastifyInstance } from "fastify";
import "@fastify/multipart";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import { analyzeModel } from "../services/analysis/analyzer.js";

const ALLOWED_EXTENSIONS = [".glb", ".gltf"];
const MAX_ANALYZE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB safety limit

/**
 * Extract a structured stage from an error message.
 * Maps known error patterns to stable stage identifiers.
 */
function extractStage(message: string): string {
  if (message.includes("GLB parse") || message.includes("glTF") || message.includes("JSON")) return "glb_parse";
  if (message.includes("geometry scan")) return "geometry_scan";
  if (message.includes("texture")) return "texture_scan";
  if (message.includes("bounding box")) return "bounding_box";
  if (message.includes("heap") || message.includes("memory") || message.includes("ENOMEM")) return "memory";
  return "analyze";
}

export async function analyzeRoutes(server: FastifyInstance) {
  server.post("/analyze", async (request, reply) => {
    const jobId = generateJobId();
    const log = createJobLogger(request.log, jobId, "analyze");

    log.info("[ANALYZE] Upload received");

    // Detect client disconnect
    let aborted = false;
    request.raw.on("close", () => {
      if (!request.raw.complete) {
        aborted = true;
        log.warn({ jobId, stage: "request_aborted" }, "[ANALYZE] Client disconnected before completion");
      }
    });

    // 1. Get uploaded file
    let file;
    try {
      file = await request.file();
    } catch (err) {
      log.error({ err, stage: "upload" }, "[ANALYZE ERROR] Failed to read multipart upload");
      return reply.status(400).send({
        success: false,
        error: "Invalid multipart request",
        stage: "upload",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    if (!file) {
      log.warn("[ANALYZE] No file uploaded");
      return reply.status(400).send({
        success: false,
        error: "No file uploaded",
        stage: "upload",
      });
    }

    // 2. Validate extension
    const fileName = file.filename;
    const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      log.warn({ fileName, ext, stage: "upload" }, "[ANALYZE] Unsupported file format");
      return reply.status(400).send({
        success: false,
        error: `Unsupported format '${ext}'. Only .glb and .gltf files are accepted`,
        stage: "upload",
      });
    }

    // 3. Read file into memory
    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (err) {
      log.error({ err, fileName, stage: "upload" }, "[ANALYZE ERROR] Failed to read file buffer");
      return reply.status(400).send({
        success: false,
        error: "Failed to read uploaded file",
        stage: "upload",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    log.info({ fileName, fileSizeBytes: buffer.byteLength, fileSizeMB: +(buffer.byteLength / (1024 * 1024)).toFixed(1) }, "[ANALYZE] File received");

    // 3b. Safety check: reject files that exceed memory-safe analysis limit
    if (buffer.byteLength > MAX_ANALYZE_SIZE_BYTES) {
      const sizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(1);
      log.warn({ fileName, sizeMB, stage: "analyze" }, "[ANALYZE] File exceeds maximum analysis size");
      return reply.status(413).send({
        success: false,
        error: `File is ${sizeMB} MB — exceeds the ${MAX_ANALYZE_SIZE_BYTES / (1024 * 1024)} MB analysis limit`,
        stage: "analyze",
      });
    }

    // Check if client already disconnected
    if (aborted) {
      log.warn({ fileName, stage: "request_aborted" }, "[ANALYZE] Skipping analysis — client disconnected");
      return reply.status(499).send({
        success: false,
        error: "Client disconnected",
        stage: "request_aborted",
      });
    }

    // 4. Analyze
    log.info("[ANALYZE] Parsing GLB");
    try {
      const analysis = await analyzeModel(new Uint8Array(buffer), fileName);

      log.info(
        {
          meshCount: analysis.geometry.meshCount,
          triangleCount: analysis.geometry.triangleCount,
          materialCount: analysis.materials.count,
          textureCount: analysis.textures.count,
          status: analysis.status,
        },
        "[ANALYZE] Analysis complete",
      );

      return reply.status(200).send({
        success: true,
        analysis,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      const stage = extractStage(message);

      log.error(
        { err, fileName, stage, errorMessage: message, stack },
        `[ANALYZE ERROR] Stage: ${stage}\nReason: ${message}`,
      );

      // Detect OOM-style errors
      if (stage === "memory") {
        const sizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(1);
        return reply.status(507).send({
          success: false,
          error: `Analysis ran out of memory processing ${sizeMB} MB file. Try a smaller file or increase server memory.`,
          stage: "memory",
          details: message,
        });
      }

      const isParseError = stage === "glb_parse";
      return reply.status(isParseError ? 422 : 500).send({
        success: false,
        error: message,
        stage,
        details: stack,
      });
    }
  });
}
