/**
 * Catalog endpoints — browse, ingest, reindex, diagnostics, asset access, and library API.
 *
 * Existing:
 * GET    /catalog/index            — Return the current catalog manifest
 * POST   /catalog/ingest           — Ingest an optimized asset into the catalog
 * POST   /catalog/reindex          — Force a catalog re-scan and index rebuild
 * GET    /catalog/policy           — Storage usage and limits
 * GET    /catalog/asset/:id/thumbnail — Serve asset thumbnail or 404
 * GET    /catalog/asset/:id/model  — Serve asset GLB model or 404
 * GET    /catalog/asset/:id/export — Download asset GLB with Content-Disposition
 * DELETE /catalog/asset/:id        — Delete asset from catalog
 * GET    /catalog/diagnostics      — Catalog diagnostics for integrations
 *
 * Dashboard-facing library API:
 * GET  /libraries                — List available libraries
 * GET  /libraries/:library/index — Get library catalog index
 * GET  /assets/:id/meta          — Get asset metadata JSON
 * GET  /assets/:id/model         — Alias for /catalog/asset/:id/model
 * GET  /assets/:id/thumbnail     — Alias for /catalog/asset/:id/thumbnail
 */

import type { FastifyInstance } from "fastify";
import { join } from "node:path";
import { access, readdir, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import {
  buildCatalogIndex,
  ingestAsset,
  reindexCatalog,
  deleteAsset,
  findAssetPath,
  findLargestAsset,
  CATALOG_SCHEMA_VERSION,
} from "../services/catalog/manager.js";
import { getCatalogPolicy, getCatalogStorageUsage } from "../services/catalog/policy.js";
import type { IngestRequest } from "../types/catalog.js";

const VERSION = "1.1.9";

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
      }
    } catch (err) {
      log.error({ err }, "Failed to parse multipart");
      return reply.status(400).send({ success: false, error: "Failed to parse multipart upload" });
    }

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

    try {
      const policy = await getCatalogPolicy();
      if (policy.blocked) {
        log.warn({ usage: policy.usage }, "Catalog storage limit reached");
        return reply.status(507).send({ success: false, error: policy.warnings[0] || "Catalog storage limit reached", stage: "ingest" });
      }
    } catch (err) {
      log.warn({ err }, "Could not check catalog policy — proceeding anyway");
    }

    try {
      const result = await ingestAsset(meta, sourceJobId || undefined, fileBuffer || undefined);
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
  // GET /catalog/policy
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
  // GET /catalog/asset/:id/thumbnail
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
  // GET /catalog/asset/:id/model
  // -----------------------------------------------------------------------
  server.get("/catalog/asset/:id/model", async (request, reply) => {
    const { id } = request.params as { id: string };
    request.log.info({ assetId: id }, "Model file requested");

    const assetPath = await findAssetPath(id);
    if (!assetPath) {
      return reply.status(404).send({ success: false, error: "Asset not found" });
    }

    const modelPath = join(assetPath, "model.glb");
    try {
      await access(modelPath);
      reply.type("model/gltf-binary");
      return reply.send(createReadStream(modelPath));
    } catch {
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
  // GET /catalog/asset/:id/export — download model with Content-Disposition
  // -----------------------------------------------------------------------
  server.get("/catalog/asset/:id/export", async (request, reply) => {
    const { id } = request.params as { id: string };
    request.log.info({ assetId: id }, "Asset export requested");

    const assetPath = await findAssetPath(id);
    if (!assetPath) {
      return reply.status(404).send({ success: false, error: "Asset not found" });
    }

    // Read meta for name
    let assetName = id;
    try {
      const raw = await readFile(join(assetPath, "meta.json"), "utf-8");
      const meta = JSON.parse(raw);
      if (meta.name) assetName = meta.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    } catch { /* use id as fallback */ }

    const modelPath = join(assetPath, "model.glb");
    try {
      await access(modelPath);
      reply.type("model/gltf-binary");
      reply.header("Content-Disposition", `attachment; filename="${assetName}.glb"`);
      return reply.send(createReadStream(modelPath));
    } catch {
      return reply.status(404).send({ success: false, error: "No model file available for export" });
    }
  });

  // -----------------------------------------------------------------------
  // DELETE /catalog/asset/:id — remove asset from catalog
  // -----------------------------------------------------------------------
  server.delete("/catalog/asset/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    request.log.info({ assetId: id }, "Asset delete requested");

    try {
      await deleteAsset(id);
      request.log.info({ assetId: id }, "Asset deleted successfully");
      return reply.status(200).send({ success: true, deleted: id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      request.log.error({ assetId: id, err }, "Failed to delete asset");
      return reply.status(err instanceof Error && message.includes("not found") ? 404 : 500).send({
        success: false,
        error: message,
      });
    }
  });

  // -----------------------------------------------------------------------
  // GET /catalog/diagnostics
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

  // =======================================================================
  // Dashboard-facing Library API
  // =======================================================================

  // -----------------------------------------------------------------------
  // GET /libraries — list available libraries
  // -----------------------------------------------------------------------
  server.get("/libraries", async (request, reply) => {
    request.log.info("Libraries list requested");
    try {
      const index = await buildCatalogIndex();
      return reply.status(200).send({
        libraries: [
          {
            id: "default",
            name: "Default Library",
            assetCount: index.totalAssets,
            schemaVersion: CATALOG_SCHEMA_VERSION,
          },
        ],
      });
    } catch (err) {
      request.log.error({ err }, "Failed to list libraries");
      return reply.status(500).send({ success: false, error: "Failed to list libraries" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /libraries/:library/index — get library catalog index
  // -----------------------------------------------------------------------
  server.get("/libraries/:library/index", async (request, reply) => {
    const { library } = request.params as { library: string };
    request.log.info({ library }, "Library index requested");

    // Currently only "default" library exists
    if (library !== "default") {
      return reply.status(404).send({ success: false, error: `Library "${library}" not found` });
    }

    try {
      const index = await buildCatalogIndex();
      return reply.status(200).send(index);
    } catch (err) {
      request.log.error({ err }, "Failed to build library index");
      return reply.status(500).send({ success: false, error: "Failed to build library index" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /assets/:id/meta — get asset metadata JSON
  // -----------------------------------------------------------------------
  server.get("/assets/:id/meta", async (request, reply) => {
    const { id } = request.params as { id: string };
    request.log.info({ assetId: id }, "Asset metadata requested");

    const assetPath = await findAssetPath(id);
    if (!assetPath) {
      return reply.status(404).send({ success: false, error: "Asset not found" });
    }

    try {
      const raw = await readFile(join(assetPath, "meta.json"), "utf-8");
      const meta = JSON.parse(raw);
      return reply.status(200).send(meta);
    } catch {
      return reply.status(404).send({ success: false, error: "Asset metadata not found" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /assets/:id/model — alias for /catalog/asset/:id/model
  // -----------------------------------------------------------------------
  server.get("/assets/:id/model", async (request, reply) => {
    const { id } = request.params as { id: string };
    const assetPath = await findAssetPath(id);
    if (!assetPath) {
      return reply.status(404).send({ success: false, error: "Asset not found" });
    }
    const modelPath = join(assetPath, "model.glb");
    try {
      await access(modelPath);
      reply.type("model/gltf-binary");
      return reply.send(createReadStream(modelPath));
    } catch {
      return reply.status(404).send({ success: false, error: "No model file available" });
    }
  });

  // -----------------------------------------------------------------------
  // GET /assets/:id/thumbnail — alias for /catalog/asset/:id/thumbnail
  // -----------------------------------------------------------------------
  server.get("/assets/:id/thumbnail", async (request, reply) => {
    const { id } = request.params as { id: string };
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
      return reply.status(404).send({ success: false, error: "No thumbnail available" });
    }
  });
}
