/**
 * POST /analyze — Analyze a 3D model file (GLB/glTF).
 *
 * Accepts a multipart file upload, parses the model in memory,
 * and returns structured analysis JSON.
 */

import type { FastifyInstance } from "fastify";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import { analyzeModel } from "../services/analysis/analyzer.js";

const ALLOWED_EXTENSIONS = [".glb", ".gltf"];

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
      log.warn({ fileName, ext }, "Unsupported file format");
      return reply.status(400).send({
        success: false,
        error: `Unsupported format '${ext}'. Only .glb and .gltf files are accepted`,
      });
    }

    // 3. Read file into memory
    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (err) {
      log.error({ err, fileName }, "Failed to read file buffer");
      return reply.status(400).send({
        success: false,
        error: "Failed to read uploaded file",
      });
    }

    log.info({ fileName, fileSizeBytes: buffer.byteLength }, "File received");

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
      log.error({ err, fileName }, "Analysis failed");

      // Distinguish parse errors from unexpected failures
      const message = err instanceof Error ? err.message : String(err);
      const isParseError =
        message.includes("Invalid") ||
        message.includes("Unexpected") ||
        message.includes("JSON") ||
        message.includes("glTF");

      return reply.status(isParseError ? 422 : 500).send({
        success: false,
        error: isParseError
          ? `Failed to parse model: ${message}`
          : "Analysis failed unexpectedly",
      });
    }
  });
}
