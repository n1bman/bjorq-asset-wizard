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
import { createLoggerConfig } from "./lib/logger.js";
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
    logger: createLoggerConfig(),
  });

  // --- Global error handler ---
  server.setErrorHandler((error, request, reply) => {
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
    server.log.info(`Bjorq Asset Wizard listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
