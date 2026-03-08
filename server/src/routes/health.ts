/**
 * Health & version endpoints — fully implemented.
 */

import type { FastifyInstance } from "fastify";

// Read from package.json at build time or fallback
const VERSION = process.env.npm_package_version || "0.1.0";

export async function healthRoutes(server: FastifyInstance) {
  server.get("/health", async () => {
    return { status: "ok" };
  });

  server.get("/version", async () => {
    return {
      name: "bjorq-asset-wizard",
      version: VERSION,
      node: process.version,
      uptime: Math.floor(process.uptime()),
    };
  });
}
