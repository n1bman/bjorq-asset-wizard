/**
 * Bjorq Asset Wizard — Backend Entry Point
 *
 * Fastify server providing the API for 3D asset analysis,
 * optimization, catalog management, and (future) dashboard sync.
 *
 * Implemented:
 *   /health, /version — system status
 *   /analyze — GLB model analysis
 *   /optimize — full optimization pipeline
 *   /catalog/index — browse persisted catalog
 *   /catalog/ingest — save optimized assets to catalog
 *   /catalog/reindex — rebuild catalog manifest
 *   /jobs/* — static file serving for job outputs
 *   /catalog/files/* — static file serving for catalog assets
 *   SPA frontend — served from public/ with index.html fallback
 *
 * Stubs (501):
 *   /sync — dashboard sync (coming next)
 *   /import/* — conversion-based import (future)
 */

import Fastify, { FastifyError } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { createLoggerConfig } from "./lib/logger.js";
import { initStorage } from "./lib/storage.js";
import { healthRoutes } from "./routes/health.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { optimizeRoutes } from "./routes/optimize.js";
import { catalogRoutes } from "./routes/catalog.js";
import { syncRoutes } from "./routes/sync.js";
import { importRoutes } from "./routes/import.js";

const VERSION = "0.3.2";
const PORT = Number(process.env.PORT) || 3500;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024;
const STORAGE_PATH = resolve(process.env.STORAGE_PATH || "./storage");
const CATALOG_PATH_RESOLVED = resolve(process.env.CATALOG_PATH || "./public/catalog");
const PUBLIC_PATH = resolve(__dirname, "../public");

async function start() {
  const server = Fastify({
    logger: createLoggerConfig(),
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
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      "Request completed",
    );
    done();
  });

  // --- Plugins ---
  // --- CORS (safe fallback — never crashes) ---
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

  // --- Storage initialization ---
  await initStorage();

  // --- API Routes ---
  await server.register(healthRoutes);
  await server.register(analyzeRoutes);
  await server.register(optimizeRoutes);
  await server.register(catalogRoutes);
  await server.register(syncRoutes);
  await server.register(importRoutes);

  // --- SPA frontend serving ---
  let hasFrontend = false;
  try {
    await access(join(PUBLIC_PATH, "index.html"));
    hasFrontend = true;
  } catch {
    // No frontend build — API-only mode
  }

  if (hasFrontend) {
    await server.register(fastifyStatic, {
      root: PUBLIC_PATH,
      prefix: "/",
      decorateReply: false,
      serve: true,
      wildcard: false,
    });

    server.setNotFoundHandler(async (request, reply) => {
      if (
        request.url.startsWith("/health") ||
        request.url.startsWith("/version") ||
        request.url.startsWith("/analyze") ||
        request.url.startsWith("/optimize") ||
        request.url.startsWith("/catalog/") ||
        request.url.startsWith("/sync") ||
        request.url.startsWith("/import") ||
        request.url.startsWith("/jobs/")
      ) {
        return reply.code(404).send({ success: false, error: "Not found" });
      }

      return reply.sendFile("index.html", PUBLIC_PATH);
    });
  } else {
    server.get("/", async () => ({
      service: "bjorq-asset-wizard",
      status: "running",
      version: VERSION,
      endpoints: ["/health", "/version", "/analyze", "/optimize", "/catalog/index", "/catalog/ingest"],
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
    server.log.fatal({ err }, "Uncaught exception — shutting down");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    server.log.fatal({ err: reason }, "Unhandled rejection — shutting down");
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
