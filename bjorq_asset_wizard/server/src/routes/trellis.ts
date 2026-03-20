/**
 * GET /trellis/status — Check TRELLIS engine status
 * POST /trellis/install — Trigger engine installation (async)
 * GET /trellis/test-connection — Test external worker connectivity
 */

import type { FastifyInstance } from "fastify";
import type { TrellisStatusResponse } from "../types/generate.js";
import { getTrellisStatus, startTrellisInstall, getTrellisMode, testWorkerConnection } from "../services/trellis/manager.js";

export async function trellisRoutes(server: FastifyInstance) {
  server.get("/trellis/status", async (): Promise<TrellisStatusResponse> => {
    const status = getTrellisStatus();
    // getTrellisStatus may return a Promise in external mode
    return status instanceof Promise ? await status : status;
  });

  server.post("/trellis/install", async (request, reply) => {
    if (getTrellisMode() === "external") {
      return {
        success: true,
        message: "External worker mode — run the Bjorq 3D Worker installer on your GPU PC. See docs/WORKER_SETUP_WINDOWS.md for instructions.",
      };
    }

    const status = getTrellisStatus();
    const resolved = status instanceof Promise ? await status : status;

    if (resolved.installed) {
      return { success: true, message: "Engine already installed" };
    }
    if (resolved.installing) {
      return { success: true, message: "Installation already in progress" };
    }

    startTrellisInstall(request.log);
    return reply.code(202).send({ success: true, message: "Installation started" });
  });

  server.get("/trellis/test-connection", async () => {
    if (getTrellisMode() !== "external") {
      return { ok: false, workerUrl: "", error: "Not in external worker mode (TRELLIS_MODE=local)" };
    }
    return testWorkerConnection();
  });
}
