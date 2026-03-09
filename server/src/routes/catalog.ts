/**
 * Catalog endpoints — browse, ingest, and reindex.
 *
 * GET  /catalog/index   — Return the current catalog manifest
 * POST /catalog/ingest  — Ingest an optimized asset into the catalog
 * POST /catalog/reindex — Force a catalog re-scan and index rebuild
 */

import type { FastifyInstance } from "fastify";
import { createJobLogger, generateJobId } from "../lib/logger.js";
import {
  buildCatalogIndex,
  ingestAsset,
  reindexCatalog,
} from "../services/catalog/manager.js";
import { getCatalogPolicy, evaluateAssetForCatalog } from "../services/catalog/policy.js";
import type { IngestRequest } from "../types/catalog.js";

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
}
