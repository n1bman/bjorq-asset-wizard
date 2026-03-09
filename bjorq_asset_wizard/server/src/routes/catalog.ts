/**
 * Catalog endpoints — browse, ingest, reindex, diagnostics, and asset access.
 *
 * GET  /catalog/index            — Return the current catalog manifest
 * POST /catalog/ingest           — Ingest an optimized asset into the catalog
 * POST /catalog/reindex          — Force a catalog re-scan and index rebuild
 * GET  /catalog/policy           — Storage usage and limits
 * GET  /catalog/asset/:id/thumbnail — Serve asset thumbnail or 404
 * GET  /catalog/asset/:id/model  — Serve asset GLB model or 404
 * GET  /catalog/diagnostics      — Catalog diagnostics for integrations
 */

import type { FastifyInstance } from "fastify";
import { join } from "node:path";
import { access, readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import {
  buildCatalogIndex,
  ingestAsset,
  reindexCatalog,
  findAssetPath,
  findLargestAsset,
  CATALOG_SCHEMA_VERSION,
} from "../services/catalog/manager.js";
import { getCatalogPolicy, getCatalogStorageUsage } from "../services/catalog/policy.js";
import type { IngestRequest } from "../types/catalog.js";

const VERSION = "1.0.0";

export async function catalogRoutes(server: FastifyInstance) {
  // -----------------------------------------------------------------------
  // GET /catalog/index
  // -----------------------------------------------------------------------
  server.get("/catalog/index", async (request, reply) => {
    request.log.info("Catalog index requested");
    try {
      const index = await buildCatalogIndex();
      return reply.status(200).send(index);
    } catch (err) {
      request.log.error({ err }, "Failed to build catalog index");
      return reply.status(500).send({ success: false, error: "Failed to build catalog index" });
    }
  });

  // -----------------------------------------------------------------------
  // POST /catalog/ingest
  // -----------------------------------------------------------------------
  server.post("/catalog/ingest", async (request, reply) => {
    const jobId = generateJobId();
    const log = createJobLogger(request.log, jobId, "ingest");
    log.info("Catalog ingest request received");

    let metaRaw: string | null = null;
    let fileBuffer: Buffer | null = null;
    let sourceJobId: string | null = null;

    // --- Parse multipart ---
    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "meta") metaRaw = part.value as string;
          if (part.fieldname === "jobId") sourceJobId = part.value as string;
        } else if (part.type === "file" && part.fieldname === "file") {
          fileBuffer = await part.toBuffer();
        }
        // thumbnail ignored for now (V2)
      }
    } catch (err) {
      log.error({ err }, "Failed to parse multipart");
      return reply.status(400).send({ success: false, error: "Failed to parse multipart upload" });
    }

    // --- Validate meta ---
    if (!metaRaw) {
      log.warn("No meta field provided");
      return reply.status(400).send({ success: false, error: "Missing 'meta' field with asset metadata JSON" });
    }

    let meta: IngestRequest;
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      log.warn("Invalid meta JSON");
      return reply.status(400).send({ success: false, error: "Invalid metadata JSON" });
    }

    if (!meta.id || !meta.name || !meta.category) {
      log.warn({ meta }, "Missing required fields");
      return reply.status(400).send({ success: false, error: "id, name, and category are required" });
    }

    log.info({ assetId: meta.id, category: meta.category, sourceJobId }, "Starting ingest");

    // --- Check catalog policy ---
    try {
      const policy = await getCatalogPolicy();
      if (policy.blocked) {
        log.warn({ usage: policy.usage }, "Catalog storage limit reached");
        return reply.status(507).send({ success: false, error: policy.warnings[0] || "Catalog storage limit reached", stage: "ingest" });
      }
    } catch (err) {
      log.warn({ err }, "Could not check catalog policy — proceeding anyway");
    }

    // --- Ingest ---
    try {
      const result = await ingestAsset(
        meta,
        sourceJobId || undefined,
        fileBuffer || undefined,
      );
      log.info({ path: result.catalogEntry.path }, "Ingest successful");
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown ingest error";
      log.error({ err }, "Ingest failed");
      return reply.status(422).send({ success: false, error: message });
    }
  });

  // -----------------------------------------------------------------------
  // POST /catalog/reindex
  // -----------------------------------------------------------------------
  server.post("/catalog/reindex", async (request, reply) => {
    request.log.info("Catalog reindex requested");
    try {
      const index = await reindexCatalog();
      return reply.status(200).send({
        success: true,
        totalAssets: index.totalAssets,
        categories: index.categories.length,
      });
    } catch (err) {
      request.log.error({ err }, "Reindex failed");
      return reply.status(500).send({ success: false, error: "Failed to reindex catalog" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /catalog/policy — storage usage and limits
  // -----------------------------------------------------------------------
  server.get("/catalog/policy", async (request, reply) => {
    request.log.info("Catalog policy requested");
    try {
      const policy = await getCatalogPolicy();
      return reply.status(200).send(policy);
    } catch (err) {
      request.log.error({ err }, "Failed to get catalog policy");
      return reply.status(500).send({ success: false, error: "Failed to get catalog policy" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /catalog/asset/:id/thumbnail — serve asset thumbnail
  // -----------------------------------------------------------------------
  server.get("/catalog/asset/:id/thumbnail", async (request, reply) => {
    const { id } = request.params as { id: string };
    request.log.info({ assetId: id }, "Thumbnail requested");

    const assetPath = await findAssetPath(id);
    if (!assetPath) {
      return reply.status(404).send({ success: false, error: "Asset not found" });
    }

    const thumbPath = join(assetPath, "thumb.webp");
    try {
      await access(thumbPath);
      reply.type("image/webp");
      return reply.send(createReadStream(thumbPath));
    } catch {
      return reply.status(404).send({ success: false, error: "No thumbnail available for this asset" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /catalog/asset/:id/model — serve asset GLB model
  // -----------------------------------------------------------------------
  server.get("/catalog/asset/:id/model", async (request, reply) => {
    const { id } = request.params as { id: string };
    request.log.info({ assetId: id }, "Model file requested");

    const assetPath = await findAssetPath(id);
    if (!assetPath) {
      return reply.status(404).send({ success: false, error: "Asset not found" });
    }

    // Look for model.glb or any .glb file in the asset directory
    const modelPath = join(assetPath, "model.glb");
    try {
      await access(modelPath);
      reply.type("model/gltf-binary");
      return reply.send(createReadStream(modelPath));
    } catch {
      // Fallback: check for any .glb file
      try {
        const files = await readdir(assetPath);
        const glbFile = files.find(f => f.endsWith(".glb"));
        if (glbFile) {
          reply.type("model/gltf-binary");
          return reply.send(createReadStream(join(assetPath, glbFile)));
        }
      } catch { /* ignore */ }
      return reply.status(404).send({ success: false, error: "No model file available for this asset" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /catalog/diagnostics — catalog diagnostics for integrations
  // -----------------------------------------------------------------------
  server.get("/catalog/diagnostics", async (request, reply) => {
    request.log.info("Catalog diagnostics requested");
    try {
      const [usage, index, largest] = await Promise.all([
        getCatalogStorageUsage(),
        buildCatalogIndex(),
        findLargestAsset(),
      ]);

      return reply.status(200).send({
        catalogSizeMB: usage.totalMB,
        assetCount: index.totalAssets,
        storageUsage: usage,
        largestAssetMB: largest?.sizeMB ?? 0,
        largestAssetId: largest?.id ?? null,
        schemaVersion: CATALOG_SCHEMA_VERSION,
        version: VERSION,
      });
    } catch (err) {
      request.log.error({ err }, "Failed to get catalog diagnostics");
      return reply.status(500).send({ success: false, error: "Failed to get catalog diagnostics" });
    }
  });
}
