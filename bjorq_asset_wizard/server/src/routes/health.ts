/**
 * Health & version endpoints — fully implemented.
 * Returns runtime info including uptime, storage status, and environment.
 */

import type { FastifyInstance } from "fastify";
import { access, writeFile, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { CATALOG_SCHEMA_VERSION } from "../services/catalog/manager.js";

const VERSION = "1.1.6";
const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";

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

    request.log.debug({ storagePath: STORAGE_PATH, exists, writable }, "Health check");

    return {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      storage: {
        path: STORAGE_PATH,
        writable,
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
