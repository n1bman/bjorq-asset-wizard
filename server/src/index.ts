/**
 * Bjorq Asset Wizard — Backend Entry Point
 *
 * Fastify server that provides the API for 3D asset analysis,
 * optimization, and catalog management.
 *
 * Status: Scaffolding — route stubs return 501 until implemented.
 * Only /health and /version are fully functional.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { initStorage } from "./lib/storage.js";
import { healthRoutes } from "./routes/health.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { optimizeRoutes } from "./routes/optimize.js";
import { catalogRoutes } from "./routes/catalog.js";
import { syncRoutes } from "./routes/sync.js";
import { importRoutes } from "./routes/import.js";

const PORT = Number(process.env.PORT) || 3500;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024;

async function start() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // --- Plugins ---
  await server.register(cors, {
    origin: process.env.CORS_ORIGINS === "*" ? true : process.env.CORS_ORIGINS?.split(","),
  });

  await server.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });

  // --- Storage initialization ---
  await initStorage();

  // --- Routes ---
  await server.register(healthRoutes);
  await server.register(analyzeRoutes);
  await server.register(optimizeRoutes);
  await server.register(catalogRoutes);
  await server.register(syncRoutes);
  await server.register(importRoutes);

  // --- Start ---
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Bjorq Asset Wizard listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
