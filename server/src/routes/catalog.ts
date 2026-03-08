/**
 * Catalog endpoints — browse, ingest, and reindex.
 *
 * TODO: Implement catalog manager that:
 * - Reads catalog directory structure to build index.json
 * - Copies optimized assets + metadata into catalog folders
 * - Generates and serves thumbnail previews
 *
 * See docs/bjorq-asset-optimizer/API_SPEC.md for full schemas.
 * See docs/bjorq-asset-optimizer/STRUCTURE.md for catalog format.
 *
 * Job logging example (for ingest):
 * ```ts
 * import { createJobLogger, generateJobId } from "../lib/logger.js";
 *
 * const jobId = generateJobId();
 * const log = createJobLogger(request.log, jobId, "ingest");
 * log.info({ category, assetName }, "Starting catalog ingest");
 * log.info("Asset ingested successfully");
 * ```
 */

import type { FastifyInstance } from "fastify";

export async function catalogRoutes(server: FastifyInstance) {
  server.get("/catalog/index", async (_request, reply) => {
    // TODO: Read catalog directory, build and return index
    return reply.status(501).send({
      success: false,
      error: "Catalog index not yet implemented",
    });
  });

  server.post("/catalog/ingest", async (_request, reply) => {
    // TODO: Accept multipart upload with metadata, place into catalog structure
    return reply.status(501).send({
      success: false,
      error: "Catalog ingest not yet implemented",
    });
  });

  server.post("/catalog/reindex", async (_request, reply) => {
    // TODO: Scan catalog directory and rebuild index.json
    return reply.status(501).send({
      success: false,
      error: "Catalog reindex not yet implemented",
    });
  });
}
