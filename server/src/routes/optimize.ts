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
 *
 * Job logging example:
 * ```ts
 * import { createJobLogger, generateJobId } from "../lib/logger.js";
 *
 * const jobId = generateJobId();
 * const log = createJobLogger(request.log, jobId, "optimize");
 * log.info({ options }, "Starting optimization");
 * log.info({ before: 5_200_000, after: 1_100_000 }, "Optimization complete");
 * ```
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
