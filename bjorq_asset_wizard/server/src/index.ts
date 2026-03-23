/**
 * Bjorq Asset Wizard â€” Backend Entry Point
 *
 * Fastify server providing the API for 3D asset analysis,
 * optimization, catalog management, and (future) dashboard sync.
 *
 * Implemented:
 *   /health, /version â€” system status
 *   /analyze â€” GLB model analysis
 *   /optimize â€” full optimization pipeline
 *   /catalog/index â€” browse persisted catalog
 *   /catalog/ingest â€” save optimized assets to catalog
 *   /catalog/reindex â€” rebuild catalog manifest
 *   /catalog/asset/:id/thumbnail â€” serve asset thumbnail
 *   /catalog/diagnostics â€” catalog health diagnostics
 *   /jobs/* â€” static file serving for job outputs
 *   /catalog/files/* â€” static file serving for catalog assets
 *   SPA frontend â€” served from public/ with index.html fallback
 *
 * Stubs (501):
 *   /sync â€” dashboard sync (coming next)
 *   /import/* â€” conversion-based import (future)
 */

import Fastify, { FastifyError } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access, readdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { createLoggerConfig } from "./lib/logger.js";
import { initStorage, seedCatalogIfEmpty } from "./lib/storage.js";
import { healthRoutes } from "./routes/health.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { optimizeRoutes } from "./routes/optimize.js";
import { catalogRoutes } from "./routes/catalog.js";
import { syncRoutes } from "./routes/sync.js";
import { importRoutes } from "./routes/import.js";
import { startJobCleanup } from "./services/cleanup/job-cleaner.js";

const VERSION = "2.9.2";
const PORT = Number(process.env.PORT) || 3500;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024;
const STORAGE_PATH = resolve(process.env.STORAGE_PATH || "/data/storage");
const CATALOG_PATH_RESOLVED = resolve(process.env.CATALOG_PATH || "/data/catalog");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BUNDLED_CATALOG_PATH = resolve(process.env.BUNDLED_CATALOG_PATH || join(__dirname, "../catalog-seed"));
const PUBLIC_PATH = resolve(__dirname, "../public");

async function start() {
  const server = Fastify({
    logger: createLoggerConfig(),
    bodyLimit: MAX_FILE_SIZE,
    requestTimeout: 300_000, // 5 min â€” supports large file uploads
  });

  // --- Global error handler ---
  server.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
        statusCode: error.statusCode || 500,
      },
      "Unhandled request error",
    );

    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || "Internal server error",
    });
  });

  // --- Request duration logging ---
  server.addHook("onResponse", (request, reply, done) => {
    const isPolling = request.url === "/health" || request.url === "/version";
    if (!isPolling) {
      request.log.info(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: reply.elapsedTime,
        },
        "Request completed",
      );
    }
    done();
  });

  // --- Plugins ---
  // --- CORS (safe fallback â€” never crashes) ---
  const corsOrigin = process.env.CORS_ORIGINS;
  let originOption: boolean | string[] = true;
  if (corsOrigin && corsOrigin !== "*") {
    const parsed = corsOrigin.split(",").map(s => s.trim()).filter(Boolean);
    if (parsed.length > 0) originOption = parsed;
  }
  await server.register(cors, { origin: originOption });

  await server.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });

  // --- Storage initialization (must run BEFORE fastifyStatic) ---
  await initStorage();

  // --- Seed bundled starter catalog on first boot ---
  const seededCatalog = await seedCatalogIfEmpty(BUNDLED_CATALOG_PATH);
  if (seededCatalog) {
    server.log.info({ source: BUNDLED_CATALOG_PATH, target: CATALOG_PATH_RESOLVED }, "Seeded bundled starter catalog");
  }

  // --- Runtime dependency check ---
  const runtimeDeps = ["git", "python3", "pip3"];
  for (const dep of runtimeDeps) {
    try {
      const ver = execSync(`${dep} --version`, { timeout: 5000 }).toString().trim();
      server.log.info({ dep, version: ver }, `Runtime dependency OK: ${dep}`);
    } catch {
      server.log.warn({ dep }, `Runtime dependency MISSING: ${dep} â€” engine install will fail`);
    }
  }

  // --- Static file serving for job outputs ---
  await server.register(fastifyStatic, {
    root: resolve(STORAGE_PATH, "jobs"),
    prefix: "/jobs/",
    decorateReply: false,
    serve: true,
    wildcard: true,
  });

  // --- Static file serving for catalog assets ---
  await server.register(fastifyStatic, {
    root: CATALOG_PATH_RESOLVED,
    prefix: "/catalog/files/",
    decorateReply: false,
    serve: true,
    wildcard: true,
  });

  // --- Catalog startup diagnostics ---
  try {
    const catExists = await access(CATALOG_PATH_RESOLVED).then(() => true).catch(() => false);
    if (catExists) {
      const allFiles = await readdir(CATALOG_PATH_RESOLVED, { recursive: true });
      const metaFiles = (allFiles as string[]).filter(f => f.endsWith("metadata.json") || f.endsWith("meta.json"));
      server.log.info(
        { catalogPath: CATALOG_PATH_RESOLVED, totalFiles: allFiles.length, assetCount: metaFiles.length },
        `Catalog startup scan: ${metaFiles.length} asset(s) found in ${CATALOG_PATH_RESOLVED}`,
      );
      if (metaFiles.length > 0 && metaFiles.length <= 20) {
        server.log.info({ assets: metaFiles }, "Catalog assets on disk");
      }
    } else {
      server.log.warn({ catalogPath: CATALOG_PATH_RESOLVED }, "Catalog directory does not exist at startup");
    }
  } catch (err) {
    server.log.error({ err, catalogPath: CATALOG_PATH_RESOLVED }, "Catalog startup scan failed");
  }

  // --- Job cleanup ---
  const JOB_RETENTION_HOURS = Number(process.env.JOB_RETENTION_HOURS || 168); // 7 days default
  const FAILED_JOB_RETENTION_HOURS = 24;
  startJobCleanup(
    6 * 60 * 60 * 1000, // every 6 hours
    JOB_RETENTION_HOURS / 24,
    FAILED_JOB_RETENTION_HOURS / 24,
    server.log,
  );

  // --- API Routes ---
  await server.register(healthRoutes);
  await server.register(analyzeRoutes);
  await server.register(optimizeRoutes);
  await server.register(catalogRoutes);
  await server.register(syncRoutes);
  await server.register(importRoutes);

  // --- SPA frontend serving ---
  // Check if public/index.html exists (frontend was built into the image)
  let hasFrontend = false;
  try {
    await access(join(PUBLIC_PATH, "index.html"));
    hasFrontend = true;
  } catch {
    // No frontend build â€” API-only mode
  }

  if (hasFrontend) {
    // Serve static frontend assets (JS, CSS, images)
    await server.register(fastifyStatic, {
      root: PUBLIC_PATH,
      prefix: "/",
      decorateReply: false,
      serve: true,
      wildcard: false,
    });

    // SPA fallback â€” serve index.html for all non-API, non-file routes
    server.setNotFoundHandler(async (request, reply) => {
      if (
        request.url.startsWith("/health") ||
        request.url.startsWith("/version") ||
        request.url.startsWith("/analyze") ||
        request.url.startsWith("/optimize") ||
        request.url.startsWith("/catalog/") ||
        request.url.startsWith("/sync") ||
        request.url.startsWith("/import") ||
        request.url.startsWith("/jobs/") ||
        request.url.startsWith("/libraries") ||
        request.url.startsWith("/assets/")
      ) {
        return reply.code(404).send({ success: false, error: "Not found" });
      }

      return reply.sendFile("index.html", PUBLIC_PATH);
    });
  } else {
    // No frontend â€” serve JSON root route for API-only mode
    server.get("/", async () => ({
      service: "bjorq-asset-wizard",
      status: "running",
      version: VERSION,
      endpoints: ["/health", "/version", "/analyze", "/optimize", "/catalog/index", "/catalog/ingest", "/catalog/asset/:id/thumbnail", "/catalog/diagnostics"],
    }));
  }

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    server.log.info({ signal }, "Shutting down");
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // --- Uncaught errors ---
  process.on("uncaughtException", (err) => {
    server.log.fatal({ err }, "Uncaught exception â€” shutting down");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    server.log.fatal({ err: reason }, "Unhandled rejection â€” shutting down");
    process.exit(1);
  });

  // --- Start ---
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Bjorq Asset Wizard v${VERSION} listening on ${HOST}:${PORT}`);
    if (hasFrontend) {
      server.log.info("Frontend UI available at /");
    } else {
      server.log.info("API-only mode (no frontend build detected)");
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      server.log.error(err);
    } else {
      server.log.error(String(err));
    }
    process.exit(1);
  }
}

start();




