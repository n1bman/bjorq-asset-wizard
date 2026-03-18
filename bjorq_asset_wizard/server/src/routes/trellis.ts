/**
 * GET /trellis/status — Check TRELLIS engine status
 * POST /trellis/install — Trigger engine installation (async)
 *
 * Currently returns stub responses — actual TRELLIS lifecycle management
 * will be implemented when the subprocess wrapper is complete.
 */

import type { FastifyInstance } from "fastify";
import type { TrellisStatusResponse } from "../types/generate.js";
import { getTrellisStatus, startTrellisInstall } from "../services/trellis/manager.js";

export async function trellisRoutes(server: FastifyInstance) {
  server.get("/trellis/status", async (): Promise<TrellisStatusResponse> => {
    return getTrellisStatus();
  });

  server.post("/trellis/install", async (request, reply) => {
    const status = getTrellisStatus();
    if (status.installed) {
      return { success: true, message: "Engine already installed" };
    }
    if (status.installing) {
      return { success: true, message: "Installation already in progress" };
    }

    startTrellisInstall(request.log);
    return reply.code(202).send({ success: true, message: "Installation started" });
  });
}
