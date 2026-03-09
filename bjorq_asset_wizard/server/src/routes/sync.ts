/**
 * POST /sync — Publish/sync catalog assets for Dashboard consumption.
 *
 * Accepts { assetIds: string[] }, verifies each asset exists in the catalog,
 * updates meta.json with syncStatus and lastSyncedAt, and returns results.
 */

import type { FastifyInstance } from "fastify";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findAssetPath } from "../services/catalog/manager.js";

interface SyncRequest {
  assetIds?: string[];
}

interface SyncResult {
  id: string;
  status: "synced" | "not_found";
}

export async function syncRoutes(server: FastifyInstance) {
  server.post("/sync", async (request, reply) => {
    const body = request.body as SyncRequest | null;
    const assetIds = body?.assetIds;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return reply.status(400).send({
        success: false,
        error: "assetIds array is required",
      });
    }

    request.log.info({ count: assetIds.length }, "[SYNC] Sync request received");

    const results: SyncResult[] = [];
    let synced = 0;
    let failed = 0;
    const now = new Date().toISOString();

    for (const id of assetIds) {
      const assetPath = await findAssetPath(id);
      if (!assetPath) {
        results.push({ id, status: "not_found" });
        failed++;
        request.log.warn({ assetId: id }, "[SYNC] Asset not found in catalog");
        continue;
      }

      // Update meta.json with sync status
      const metaPath = join(assetPath, "meta.json");
      try {
        const raw = await readFile(metaPath, "utf-8");
        const meta = JSON.parse(raw);
        meta.syncStatus = "synced";
        meta.lastSyncedAt = now;
        meta.lifecycleStatus = "published";
        await writeFile(metaPath, JSON.stringify(meta, null, 2));
        results.push({ id, status: "synced" });
        synced++;
        request.log.info({ assetId: id }, "[SYNC] Asset synced successfully");
      } catch (err) {
        results.push({ id, status: "not_found" });
        failed++;
        request.log.error({ assetId: id, err }, "[SYNC] Failed to update asset metadata");
      }
    }

    return reply.status(200).send({
      success: failed === 0,
      synced,
      failed,
      timestamp: now,
      results,
    });
  });
}
