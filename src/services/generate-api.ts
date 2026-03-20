/**
 * Bjorq Asset Wizard — Photo → 3D Generation API (v2.4.0)
 *
 * All functions try the real backend first via apiClient.
 * Falls back to mock data when backend is unreachable.
 */

import type {
  GenerateJobResponse,
  GenerateTargetProfile,
  TrellisStatusResponse,
  StylePresetId,
  StyleVariantId,
  QueueStatusResponse,
} from "@/types/generate";
import { apiClient, ApiError } from "./api-client";
import { UPLOAD_TIMEOUT } from "@/lib/upload-limits";

// --- Mock data for development ---

const MOCK_DELAY = 800;
const fakeDel = (ms = MOCK_DELAY) => new Promise<void>((r) => setTimeout(r, ms));

let mockJobCounter = 0;
const mockJobs = new Map<string, { status: number; created: number }>();

function advanceMockJob(jobId: string): GenerateJobResponse {
  const job = mockJobs.get(jobId);
  if (!job) {
    return { jobId, status: "failed", error: "Job not found", canRetry: false };
  }

  const states: GenerateJobResponse["status"][] = [
    "queued", "preprocessing", "generating", "styling", "optimizing", "validating", "preview_ready", "done",
  ];
  if (job.status < states.length - 1) job.status++;

  const status = states[job.status];
  const progress = Math.round((job.status / (states.length - 1)) * 100);

  return {
    jobId,
    status,
    progress,
    currentStep: status,
    ...(status === "done"
      ? {
          result: {
            model: `/jobs/gen_${jobId}/output.glb`,
            thumbnail: `/jobs/gen_${jobId}/thumb.webp`,
            metadata: {
              style: "bjorq-cozy",
              variant: "cozy",
              triangles: 6000 + Math.floor(Math.random() * 4000),
              fileSizeKB: 800 + Math.floor(Math.random() * 600),
              materials: 1 + Math.floor(Math.random() * 2),
              category: ["chair", "table", "sofa", "lamp"][Math.floor(Math.random() * 4)],
              lods: ["output.glb", "output_lod1.glb", "output_lod2.glb"],
              gatePassed: true,
              gateAttempt: 1,
              forcedMinimal: false,
              sceneCompatible: true,
              version: 1,
              source: "generated",
            },
          },
        }
      : {}),
    canRetry: status === "failed",
    queuePosition: status === "queued" ? 0 : -1,
  };
}

// --- API functions ---

export async function createGenerateJob(
  images: File[],
  style: StylePresetId,
  target: GenerateTargetProfile,
  variant: StyleVariantId = "cozy",
): Promise<GenerateJobResponse> {
  try {
    const fd = new FormData();
    images.forEach((img) => fd.append("images", img));
    fd.append("options", JSON.stringify({ style, target, variant }));
    return await apiClient.request<GenerateJobResponse>("/generate", {
      method: "POST",
      body: fd,
      timeout: UPLOAD_TIMEOUT,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    console.warn("[generate-api] Backend unreachable, using mock");
    await fakeDel();
    const jobId = `mock_${++mockJobCounter}`;
    mockJobs.set(jobId, { status: 0, created: Date.now() });
    return { jobId, status: "queued", progress: 0, currentStep: "queued", queuePosition: 0 };
  }
}

export async function getGenerateJobStatus(jobId: string): Promise<GenerateJobResponse> {
  try {
    return await apiClient.request<GenerateJobResponse>(`/generate/jobs/${jobId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    await fakeDel(400);
    return advanceMockJob(jobId);
  }
}

export async function retryGenerateJob(jobId: string): Promise<GenerateJobResponse> {
  try {
    return await apiClient.request<GenerateJobResponse>(`/generate/jobs/${jobId}/retry`, {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    await fakeDel();
    mockJobs.set(jobId, { status: 0, created: Date.now() });
    return { jobId, status: "queued", progress: 0, currentStep: "queued", queuePosition: 0 };
  }
}

export async function getTrellisStatus(): Promise<TrellisStatusResponse> {
  try {
    return await apiClient.request<TrellisStatusResponse>("/trellis/status");
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    return { installed: true, running: true, gpu: false, version: "mock", mode: "local" };
  }
}

export async function installTrellis(): Promise<{ success: boolean; message: string }> {
  try {
    return await apiClient.request<{ success: boolean; message: string }>("/trellis/install", {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    await fakeDel(1500);
    return { success: true, message: "Mock install complete" };
  }
}

export async function testWorkerConnection(): Promise<{
  ok: boolean;
  workerUrl: string;
  version?: string;
  gpu?: boolean;
  gpuName?: string;
  error?: string;
}> {
  try {
    return await apiClient.request<{
      ok: boolean;
      workerUrl: string;
      version?: string;
      gpu?: boolean;
      gpuName?: string;
      error?: string;
    }>("/trellis/test-connection");
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    return { ok: false, workerUrl: "", error: "Backend unreachable" };
  }
}

export async function getQueueStatus(): Promise<QueueStatusResponse> {
  try {
    return await apiClient.request<QueueStatusResponse>("/generate/queue");
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    return { maxConcurrent: 1, running: 0, queued: 0, queuedJobIds: [] };
  }
}
