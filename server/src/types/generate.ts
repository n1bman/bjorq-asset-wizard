/**
 * Bjorq Asset Wizard — Photo → 3D Generation Types (Backend) v2.3.9
 */

export type GenerateJobState =
  | "queued"
  | "preprocessing"
  | "generating"
  | "styling"
  | "optimizing"
  | "validating"
  | "preview_ready"
  | "done"
  | "failed";

export type GenerateTargetProfile = "dashboard-safe" | "ultra-light" | "standard";

export type StylePresetId = "bjorq-cozy";

export type StyleVariantId = "cozy" | "soft-minimal" | "warm-wood";

export interface GenerateJobOptions {
  style: StylePresetId;
  target: GenerateTargetProfile;
  variant?: StyleVariantId;
}

export interface GenerateJob {
  id: string;
  status: GenerateJobState;
  progress: number;
  currentStep: string;
  options: GenerateJobOptions;
  imagePaths: string[];
  outputDir: string;
  result?: GenerateJobResult;
  error?: string;
  attempts: number;
  seed: number;
  createdAt: number;
  /** Internal confidence score (0–1) — not exposed to user */
  confidenceScore?: number;
  /** Input quality warnings detected during preprocessing */
  inputWarnings?: string[];
}

export interface GenerateJobResult {
  model: string;
  thumbnail: string;
  metadata: Record<string, unknown>;
}

export interface GenerateJobResponse {
  jobId: string;
  status: GenerateJobState;
  progress?: number;
  currentStep?: string;
  result?: GenerateJobResult;
  error?: string;
  canRetry?: boolean;
  inputWarnings?: string[];
  queuePosition?: number;
}

export interface TrellisEnvironment {
  platform: "cuda" | "hip" | "cpu-only";
  /** Detected GPU name + VRAM, e.g. "NVIDIA A100 (48GB)" */
  gpu: string | null;
  /** CUDA Toolkit version, e.g. "12.4" */
  cudaVersion: string | null;
  /** Whether all requirements are satisfied for full TRELLIS.2 runtime */
  meetsRequirements: boolean;
  /** Human-readable list of missing requirements */
  missingRequirements: string[];
}

export interface TrellisStatusResponse {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing?: boolean;
  installProgress?: number;
  /** Detected environment capabilities */
  environment?: TrellisEnvironment;
  /** Whether pretrained model weights have been downloaded */
  weightsDownloaded?: boolean;
  /** Map of CUDA extension name → installed (true/false) */
  extensions?: Record<string, boolean>;
  /** Engine mode: "local" (in-container) or "external" (remote worker) */
  mode?: "local" | "external";
  /** Worker URL when mode=external */
  workerUrl?: string;
  /** Last error from worker or local engine */
  lastError?: string;
}

export interface QueueStatusResponse {
  maxConcurrent: number;
  running: number;
  queued: number;
  queuedJobIds: string[];
}

export interface QualityGateLimits {
  maxTriangles: number;
  maxFileSizeKB: number;
  maxMaterials: number;
  maxTextureRes: number;
}

export const QUALITY_GATE_PROFILES: Record<GenerateTargetProfile, QualityGateLimits> = {
  "dashboard-safe": { maxTriangles: 15_000, maxFileSizeKB: 2_048, maxMaterials: 4, maxTextureRes: 512 },
  "ultra-light": { maxTriangles: 5_000, maxFileSizeKB: 512, maxMaterials: 2, maxTextureRes: 256 },
  "standard": { maxTriangles: 50_000, maxFileSizeKB: 10_240, maxMaterials: 8, maxTextureRes: 1024 },
};
