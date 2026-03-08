/**
 * POST /optimize — Optimize a 3D model with configurable options.
 *
 * TODO: Implement using @gltf-transform/functions for:
 * - Mesh cleanup (dedup, weld, simplify)
 * - Texture resizing and compression
 * - Draco compression
 * - Thumbnail generation via sharp
 *
 * See docs/bjorq-asset-optimizer/API_SPEC.md for full request/response schema.
 */

import type { FastifyInstance } from "fastify";

export async function optimizeRoutes(server: FastifyInstance) {
  server.post("/optimize", async (_request, reply) => {
    // TODO: Accept multipart file + JSON options, run optimization pipeline,
    // return before/after stats and download URL.
    return reply.status(501).send({
      success: false,
      error: "Optimization pipeline not yet implemented",
      hint: "See docs/bjorq-asset-optimizer/API_SPEC.md for the expected request/response format",
    });
  });
}
