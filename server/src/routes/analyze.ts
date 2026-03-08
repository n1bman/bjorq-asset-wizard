/**
 * POST /analyze — Analyze a 3D model file.
 *
 * TODO: Implement using @gltf-transform/core to parse GLB/glTF files
 * and extract geometry stats, material info, texture details, dimensions.
 *
 * See docs/bjorq-asset-optimizer/API_SPEC.md for full response schema.
 */

import type { FastifyInstance } from "fastify";

export async function analyzeRoutes(server: FastifyInstance) {
  server.post("/analyze", async (_request, reply) => {
    // TODO: Accept multipart file upload, parse with glTF Transform,
    // return analysis results matching the API spec.
    return reply.status(501).send({
      success: false,
      error: "Analysis engine not yet implemented",
      hint: "See docs/bjorq-asset-optimizer/API_SPEC.md for the expected response format",
    });
  });
}
