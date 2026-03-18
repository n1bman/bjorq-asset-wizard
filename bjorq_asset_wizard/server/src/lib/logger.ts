/**
 * Bjorq Asset Wizard — Logging Configuration
 *
 * Provides structured pino logging for the Fastify backend.
 * Supports JSON output (production), pretty-print (development),
 * optional file logging, and job-scoped child loggers for tracing.
 */

import { randomUUID } from "crypto";
import type { FastifyBaseLogger, FastifyServerOptions } from "fastify";

export function createLoggerConfig(): FastifyServerOptions["logger"] {
  const level = process.env.LOG_LEVEL || "info";
  const logFile = process.env.LOG_FILE;
  const isDev = process.env.NODE_ENV !== "production";

  const config: Record<string, unknown> = {
    level,
    serializers: {
      req(request: { method: string; url: string; headers?: Record<string, string> }) {
        return { method: request.method, url: request.url };
      },
      res(reply: { statusCode: number }) {
        return { statusCode: reply.statusCode };
      },
    },
  };

  if (logFile) {
    config.transport = {
      targets: [
        { target: "pino/file", options: { destination: logFile, mkdir: true }, level },
        ...(isDev
          ? [{ target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" }, level }]
          : [{ target: "pino/file", options: { destination: 1 }, level }]),
      ],
    };
  } else if (isDev) {
    config.transport = {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
    };
  }

  return config as FastifyServerOptions["logger"];
}

/**
 * Generate a unique job ID with optional prefix for pipeline tracing.
 */
export function generateJobId(prefix?: string): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Create a child logger scoped to a specific pipeline job.
 */
export function createJobLogger(
  parent: FastifyBaseLogger,
  jobId: string,
  jobType: string,
): FastifyBaseLogger {
  return parent.child({ jobId, jobType });
}
