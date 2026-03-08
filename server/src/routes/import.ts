/**
 * Import endpoints — direct GLB/glTF upload and format conversion.
 *
 * TODO: Implement direct import (accept GLB, store, return job ID).
 * TODO: Implement conversion import (accept SKP/IFC/OBJ/FBX, convert to GLB).
 */

import type { FastifyInstance } from "fastify";

export async function importRoutes(server: FastifyInstance) {
  server.post("/import/direct", async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: "Direct import not yet implemented",
    });
  });

  server.post("/import/convert", async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: "Conversion import not yet implemented",
    });
  });
}
