/**
 * Bjorq Asset Wizard — Photo → 3D Generation API
 *
 * All functions try the real backend first via apiClient.
 * Falls back to mock data when backend is unreachable.
 */

import type {
  GenerateJobResponse,
  GenerateTargetProfile,
  TrellisStatusResponse,
  StylePresetId,
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
              triangles: 6000 + Math.floor(Math.random() * 4000), // variation per generation
              fileSizeKB: 800 + Math.floor(Math.random() * 600),
              materials: 1 + Math.floor(Math.random() * 2),
              gatePassed: true,
              gateAttempt: 1,
              forcedMinimal: false,
              source: "generated",
            },
          },
        }
      : {}),
    canRetry: status === "failed",
  };
}

// --- API functions ---

export async function createGenerateJob(
  images: File[],
  style: StylePresetId,
  target: GenerateTargetProfile,
): Promise<GenerateJobResponse> {
  try {
    const fd = new FormData();
    images.forEach((img) => fd.append("images", img));
    fd.append("options", JSON.stringify({ style, target }));
    return await apiClient.request<GenerateJobResponse>("/generate", {
      method: "POST",
      body: fd,
      timeout: UPLOAD_TIMEOUT,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    // Mock fallback
    console.warn("[generate-api] Backend unreachable, using mock");
    await fakeDel();
    const jobId = `mock_${++mockJobCounter}`;
    mockJobs.set(jobId, { status: 0, created: Date.now() });
    return { jobId, status: "queued", progress: 0, currentStep: "queued" };
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
    return { jobId, status: "queued", progress: 0, currentStep: "queued" };
  }
}

export async function getTrellisStatus(): Promise<TrellisStatusResponse> {
  try {
    return await apiClient.request<TrellisStatusResponse>("/trellis/status");
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err;
    return { installed: true, running: true, gpu: false, version: "mock" };
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
