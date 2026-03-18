// Bjorq Asset Wizard — Photo → 3D Generation Types

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

export interface GenerateJobResponse {
  jobId: string;
  status: GenerateJobState;
  progress?: number;
  currentStep?: string;
  result?: {
    model: string;
    thumbnail: string;
    metadata: Record<string, unknown>;
  };
  error?: string;
  canRetry?: boolean;
}

export interface TrellisStatusResponse {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing?: boolean;
  installProgress?: number;
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

export const GENERATE_STEP_LABELS: Record<GenerateJobState, string> = {
  queued: "Queued",
  preprocessing: "Preparing images",
  generating: "Generating 3D model",
  styling: "Applying Bjorq style",
  optimizing: "Optimizing asset",
  validating: "Validating quality",
  preview_ready: "Preview ready",
  done: "Complete",
  failed: "Failed",
};

export const STYLE_PRESETS = [
  {
    id: "bjorq-cozy",
    name: "Bjorq Cozy Stylized",
    description: "Warm, simplified furniture style with clean surfaces and soft proportions",
    default: true,
  },
] as const;

export type StylePresetId = typeof STYLE_PRESETS[number]["id"];
