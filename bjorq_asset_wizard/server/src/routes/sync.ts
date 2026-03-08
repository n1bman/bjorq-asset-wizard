/**
 * POST /sync — Sync catalog assets to Bjorq Dashboard.
 *
 * TODO: Implement sync logic to push catalog data to the dashboard.
 */

import type { FastifyInstance } from "fastify";

export async function syncRoutes(server: FastifyInstance) {
  server.post("/sync", async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: "Sync not yet implemented",
    });
  });
}
