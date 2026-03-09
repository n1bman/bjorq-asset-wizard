/**
 * POST /analyze — Analyze a 3D model file (GLB/glTF).
 *
 * Accepts a multipart file upload, parses the model in memory,
 * and returns structured analysis JSON.
 */

import type { FastifyInstance } from "fastify";
import "@fastify/multipart";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import { analyzeModel } from "../services/analysis/analyzer.js";

const ALLOWED_EXTENSIONS = [".glb", ".gltf"];
const MAX_ANALYZE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB safety limit

export async function analyzeRoutes(server: FastifyInstance) {
  server.post("/analyze", async (request, reply) => {
    const jobId = generateJobId();
    const log = createJobLogger(request.log, jobId, "analyze");

    // 1. Get uploaded file
    let file;
    try {
      file = await request.file();
    } catch (err) {
      log.error({ err, stage: "upload" }, "Failed to read multipart upload");
      return reply.status(400).send({
        success: false,
        error: "Invalid multipart request",
        stage: "upload",
      });
    }

    if (!file) {
      log.warn("No file uploaded");
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
      log.warn({ fileName, ext, stage: "upload" }, "Unsupported file format");
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
      log.error({ err, fileName, stage: "upload" }, "Failed to read file buffer");
      return reply.status(400).send({
        success: false,
        error: "Failed to read uploaded file",
        stage: "upload",
      });
    }

    log.info({ fileName, fileSizeBytes: buffer.byteLength, fileSizeMB: +(buffer.byteLength / (1024 * 1024)).toFixed(1) }, "File received");

    // 3b. Safety check: reject files that exceed memory-safe analysis limit
    if (buffer.byteLength > MAX_ANALYZE_SIZE_BYTES) {
      const sizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(1);
      log.warn({ fileName, sizeMB, stage: "analyze" }, "File exceeds maximum analysis size");
      return reply.status(413).send({
        success: false,
        error: `File is ${sizeMB} MB — exceeds the ${MAX_ANALYZE_SIZE_BYTES / (1024 * 1024)} MB analysis limit`,
        stage: "analyze",
      });
    }

    // 4. Analyze
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
        "Analysis complete",
      );

      return reply.status(200).send({
        success: true,
        analysis,
      });
    } catch (err) {
      log.error({ err, fileName, stage: "analyze" }, "Analysis failed");

      const message = err instanceof Error ? err.message : String(err);

      // Detect OOM-style errors
      const isOOM =
        message.includes("heap") ||
        message.includes("memory") ||
        message.includes("allocation") ||
        message.includes("ENOMEM");

      if (isOOM) {
        const sizeMB = (buffer.byteLength / (1024 * 1024)).toFixed(1);
        return reply.status(507).send({
          success: false,
          error: `Analysis ran out of memory processing ${sizeMB} MB file. Try a smaller file or increase server memory.`,
          stage: "analyze",
        });
      }

      const isParseError =
        message.includes("Invalid") ||
        message.includes("Unexpected") ||
        message.includes("JSON") ||
        message.includes("glTF");

      const stage = isParseError ? "parse" : "analyze";

      return reply.status(isParseError ? 422 : 500).send({
        success: false,
        error: isParseError
          ? `Failed to parse model: ${message}`
          : "Analysis failed unexpectedly",
        stage,
      });
    }
  });
}
