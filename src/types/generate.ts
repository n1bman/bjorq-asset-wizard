// Bjorq Asset Wizard — Photo → 3D Generation Types (v2.4.0)

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

export type StyleVariantId = "cozy" | "soft-minimal" | "warm-wood";

export interface TrellisEnvironment {
  platform: "cuda" | "hip" | "cpu-only";
  gpu: string | null;
  cudaVersion: string | null;
  meetsRequirements: boolean;
  missingRequirements: string[];
}

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
  inputWarnings?: string[];
  queuePosition?: number;
}

export interface TrellisStatusResponse {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing?: boolean;
  installProgress?: number;
  environment?: TrellisEnvironment;
  weightsDownloaded?: boolean;
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

export const STYLE_VARIANTS: { id: StyleVariantId; name: string; description: string }[] = [
  {
    id: "cozy",
    name: "Cozy",
    description: "Default warm, soft palette with gentle surfaces",
  },
  {
    id: "soft-minimal",
    name: "Soft Minimal",
    description: "Muted tones with flatter textures for a cleaner look",
  },
  {
    id: "warm-wood",
    name: "Warm Wood",
    description: "Deeper warm tones emphasizing natural wood feel",
  },
];
