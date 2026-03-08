import type {
  AnalysisResponse,
  OptimizeResponse,
  OptimizeOptions,
  CatalogIndex,
  IngestMeta,
  IngestResponse,
  HealthResponse,
  VersionResponse,
} from "@/types/api";
import {
  mockAnalysis,
  mockOptimize,
  mockCatalog,
  mockIngest,
  mockHealth,
  mockVersion,
} from "./mock-data";

// Toggle this to false when connecting to the real backend
const USE_MOCK = true;

// Configure this to point to the real backend
const BASE_URL = "http://localhost:3500";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? "Request failed");
  }
  return res.json();
}

// --- Analyze ---

export async function analyzeModel(file: File): Promise<AnalysisResponse> {
  if (USE_MOCK) {
    await fakeDel();
    return { ...mockAnalysis, analysis: { ...mockAnalysis.analysis, fileName: file.name, fileSizeBytes: file.size, fileSizeKB: Math.round(file.size / 1024), fileSizeMB: +(file.size / 1048576).toFixed(2) } };
  }
  const fd = new FormData();
  fd.append("file", file);
  return request("/analyze", { method: "POST", body: fd });
}

// --- Optimize ---

export async function optimizeModel(file: File, options?: OptimizeOptions): Promise<OptimizeResponse> {
  if (USE_MOCK) {
    await fakeDel();
    return mockOptimize;
  }
  const fd = new FormData();
  fd.append("file", file);
  if (options) fd.append("options", JSON.stringify(options));
  return request("/optimize", { method: "POST", body: fd });
}

// --- Catalog ---

export async function getCatalogIndex(): Promise<CatalogIndex> {
  if (USE_MOCK) {
    await fakeDel();
    return mockCatalog;
  }
  return request("/catalog/index");
}

export async function ingestAsset(meta: IngestMeta, file?: File, thumbnail?: File, jobId?: string): Promise<IngestResponse> {
  if (USE_MOCK) {
    await fakeDel();
    return mockIngest;
  }
  const fd = new FormData();
  fd.append("meta", JSON.stringify(meta));
  if (file) fd.append("file", file);
  if (thumbnail) fd.append("thumbnail", thumbnail);
  if (jobId) fd.append("jobId", jobId);
  return request("/catalog/ingest", { method: "POST", body: fd });
}

export async function reindexCatalog(): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    await fakeDel();
    return { success: true };
  }
  return request("/catalog/reindex", { method: "POST" });
}

// --- System ---

export async function getHealth(): Promise<HealthResponse> {
  if (USE_MOCK) {
    await fakeDel();
    return { ...mockHealth, timestamp: new Date().toISOString() };
  }
  return request("/health");
}

export async function getVersion(): Promise<VersionResponse> {
  if (USE_MOCK) {
    await fakeDel();
    return mockVersion;
  }
  return request("/version");
}

// Simulate network delay
function fakeDel(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
