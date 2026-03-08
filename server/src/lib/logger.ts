/**
 * Bjorq Asset Wizard — Logging Configuration
 *
 * Provides structured pino logging for the Fastify backend.
 * Supports JSON output (production), pretty-print (development),
 * optional file logging, and job-scoped child loggers for tracing.
 */

import { randomUUID } from "crypto";
import type { FastifyBaseLogger, FastifyServerOptions } from "fastify";

/**
 * Build Fastify-compatible pino logger options.
 *
 * Reads from environment:
 * - LOG_LEVEL (default: "info")
 * - LOG_FILE  (optional path, e.g. ./storage/logs/wizard.log)
 * - NODE_ENV  (controls pretty-print in development)
 */
export function createLoggerConfig(): FastifyServerOptions["logger"] {
  const level = process.env.LOG_LEVEL || "info";
  const logFile = process.env.LOG_FILE;
  const isDev = process.env.NODE_ENV !== "production";

  // Base config — structured JSON
  const config: Record<string, unknown> = {
    level,
    serializers: {
      req(request: { method: string; url: string; headers?: Record<string, string> }) {
        return {
          method: request.method,
          url: request.url,
        };
      },
      res(reply: { statusCode: number }) {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
  };

  // File + stdout transport via pino.transport (multistream)
  if (logFile) {
    config.transport = {
      targets: [
        // Always write structured JSON to file
        {
          target: "pino/file",
          options: { destination: logFile, mkdir: true },
          level,
        },
        // Stdout: pretty in dev, JSON in prod
        ...(isDev
          ? [{ target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" }, level }]
          : [{ target: "pino/file", options: { destination: 1 }, level }]),
      ],
    };
  } else if (isDev) {
    // Dev without file logging — just pretty-print to stdout
    config.transport = {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
    };
  }
  // Production without LOG_FILE: default pino JSON to stdout (no transport needed)

  return config as FastifyServerOptions["logger"];
}

/**
 * Generate a unique job ID for pipeline tracing.
 */
export function generateJobId(): string {
  return randomUUID();
}

/**
 * Create a child logger scoped to a specific pipeline job.
 *
 * Usage in route handlers:
 * ```ts
 * import { createJobLogger, generateJobId } from "../lib/logger.js";
 *
 * const jobId = generateJobId();
 * const log = createJobLogger(request.log, jobId, "analyze");
 * log.info("Starting analysis");
 * log.info({ fileSize: 1024 }, "File received");
 * log.error({ err }, "Analysis failed");
 * ```
 *
 * All log entries from the child logger will include `jobId` and `jobType`
 * fields, making it easy to trace a single job across the log stream.
 */
export function createJobLogger(
  parent: FastifyBaseLogger,
  jobId: string,
  jobType: string,
): FastifyBaseLogger {
  return parent.child({ jobId, jobType });
}
