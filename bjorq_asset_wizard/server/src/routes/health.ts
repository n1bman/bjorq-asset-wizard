/**
 * Health & version endpoints — fully implemented.
 * Returns runtime info including uptime, storage status, and environment.
 */

import type { FastifyInstance } from "fastify";
import { access, writeFile, unlink, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { CATALOG_SCHEMA_VERSION } from "../services/catalog/manager.js";

const VERSION = "2.0.2";
const STORAGE_PATH = process.env.STORAGE_PATH || "/data/storage";
const CATALOG_PATH = resolve(process.env.CATALOG_PATH || "/data/catalog");

async function checkStorageWritable(storagePath: string): Promise<boolean> {
  const testFile = join(storagePath, `.health-check-${Date.now()}`);
  try {
    await writeFile(testFile, "ok");
    await unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

async function checkStorageExists(storagePath: string): Promise<boolean> {
  try {
    await access(storagePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function healthRoutes(server: FastifyInstance) {
  server.get("/health", async (request) => {
    const exists = await checkStorageExists(STORAGE_PATH);
    const writable = exists ? await checkStorageWritable(STORAGE_PATH) : false;

    // Count catalog assets
    let catalogAssetCount = 0;
    let catalogExists = false;
    try {
      await access(CATALOG_PATH, constants.F_OK);
      catalogExists = true;
      const allFiles = await readdir(CATALOG_PATH, { recursive: true });
      catalogAssetCount = (allFiles as string[]).filter(f => f.endsWith("metadata.json") || f.endsWith("meta.json")).length;
    } catch {
      // catalog dir missing
    }

    request.log.debug({ storagePath: STORAGE_PATH, exists, writable, catalogPath: CATALOG_PATH, catalogAssetCount }, "Health check");

    return {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      storage: {
        path: STORAGE_PATH,
        writable,
      },
      catalog: {
        path: CATALOG_PATH,
        exists: catalogExists,
        assetCount: catalogAssetCount,
      },
    };
  });

  server.get("/version", async () => {
    return {
      name: "bjorq-asset-wizard",
      version: VERSION,
      node: process.version,
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
      capabilities: ["analyze", "optimize", "catalog", "policy", "diagnostics"],
    };
  });
}
