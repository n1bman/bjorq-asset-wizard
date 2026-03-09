/**
 * Bjorq Asset Wizard — API Service Layer
 *
 * Every public function tries the real backend first via `apiClient.request()`.
 * If the backend is unreachable (network error, timeout), it falls back to mock
 * data from `./mock-data.ts` so the UI remains fully functional offline.
 *
 * Real API errors (4xx, 5xx) are NOT masked — they propagate to the caller.
 * Only connection failures trigger the mock fallback.
 *
 * EXCEPTION: analyzeModel() and optimizeModel() do NOT use withFallback().
 * These are real processing operations — errors must always propagate.
 */
import type {
  AnalysisResponse,
  OptimizeResponse,
  OptimizeOptions,
  CatalogIndex,
  IngestMeta,
  IngestResponse,
  HealthResponse,
  VersionResponse,
  SyncResponse,
} from "@/types/api";
import {
  mockCatalog,
  mockIngest,
  mockHealth,
  mockVersion,
} from "./mock-data";
import { apiClient, ApiError } from "./api-client";
import { UPLOAD_TIMEOUT } from "@/lib/upload-limits";

// When true, always use mock data. When false, try real API first, fall back to mock on network error.
const FORCE_MOCK = false;

/** Try real API, fall back to mock on connection error */
async function withFallback<T>(apiFn: () => Promise<T>, mockFn: () => T | Promise<T>): Promise<{ data: T; isMock: boolean }> {
  if (FORCE_MOCK) {
    await fakeDel();
    return { data: await mockFn(), isMock: true };
  }
  try {
    const data = await apiFn();
    return { data, isMock: false };
  } catch (err) {
    if (err instanceof ApiError && err.status > 0) throw err; // real API error — don't mask
    console.warn("[api] Backend unreachable, using mock data");
    await fakeDel(300);
    return { data: await mockFn(), isMock: true };
  }
}

// --- Analyze (NO mock fallback — errors always propagate) ---

export async function analyzeModel(file: File, onUploadProgress?: (percent: number) => void): Promise<AnalysisResponse> {
  const fd = new FormData();
  fd.append("file", file);
  return apiClient.request<AnalysisResponse>("/analyze", { method: "POST", body: fd, timeout: UPLOAD_TIMEOUT, onUploadProgress });
}

// --- Optimize (NO mock fallback — errors always propagate) ---

export async function optimizeModel(file: File, options?: OptimizeOptions, onUploadProgress?: (percent: number) => void): Promise<OptimizeResponse> {
  const fd = new FormData();
  fd.append("file", file);
  if (options) fd.append("options", JSON.stringify(options));
  return apiClient.request<OptimizeResponse>("/optimize", { method: "POST", body: fd, timeout: UPLOAD_TIMEOUT, onUploadProgress });
}

// --- Catalog ---

export async function getCatalogIndex(): Promise<CatalogIndex> {
  const { data } = await withFallback(
    () => apiClient.request<CatalogIndex>("/catalog/index"),
    () => mockCatalog,
  );
  return data;
}

export async function ingestAsset(meta: IngestMeta, file?: File, thumbnail?: File, jobId?: string): Promise<IngestResponse> {
  const { data } = await withFallback(
    () => {
      const fd = new FormData();
      fd.append("meta", JSON.stringify(meta));
      if (file) fd.append("file", file);
      if (thumbnail) fd.append("thumbnail", thumbnail);
      if (jobId) fd.append("jobId", jobId);
      return apiClient.request<IngestResponse>("/catalog/ingest", { method: "POST", body: fd });
    },
    () => mockIngest,
  );
  return data;
}

export async function reindexCatalog(): Promise<{ success: boolean }> {
  const { data } = await withFallback(
    () => apiClient.request<{ success: boolean }>("/catalog/reindex", { method: "POST" }),
    () => ({ success: true }),
  );
  return data;
}

// --- Delete ---

export async function deleteAsset(assetId: string): Promise<{ success: boolean; deleted: string }> {
  return apiClient.request<{ success: boolean; deleted: string }>(`/catalog/asset/${assetId}`, { method: "DELETE" });
}

// --- Sync ---

export async function syncToBjorq(assetIds?: string[]): Promise<SyncResponse> {
  const { data } = await withFallback(
    () => apiClient.request<SyncResponse>("/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds }),
    }),
    () => ({ success: true, synced: assetIds?.length ?? 0, failed: 0, timestamp: new Date().toISOString() }),
  );
  return data;
}

// --- System ---

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await withFallback(
    () => apiClient.request<HealthResponse>("/health"),
    () => ({ ...mockHealth, timestamp: new Date().toISOString() }),
  );
  return data;
}

export async function getVersion(): Promise<VersionResponse> {
  const { data } = await withFallback(
    () => apiClient.request<VersionResponse>("/version"),
    () => mockVersion,
  );
  return data;
}

// --- Import endpoints (future) ---

/** Direct model import — currently delegates to analyzeModel */
export async function importDirect(file: File): Promise<AnalysisResponse> {
  return analyzeModel(file);
}

/** Conversion-based import — stub for future backend endpoint */
export async function importConvert(file: File): Promise<{ success: boolean; jobId: string; status: string }> {
  const { data } = await withFallback(
    () => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.request<{ success: boolean; jobId: string; status: string }>("/import/convert", { method: "POST", body: fd });
    },
    () => ({ success: true, jobId: `conv_${Date.now()}`, status: "pending" }),
  );
  return data;
}

// Simulate network delay
function fakeDel(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
