// Bjorq Asset Optimizer — API Types

// --- Connection & System ---

export type ConnectionStatus = "connected" | "disconnected" | "checking";

export type AssetLifecycleStatus = "uploaded" | "analyzed" | "optimized" | "published";

export type AssetSource = "uploaded" | "optimized" | "catalog" | "synced" | "wizard";

export type SyncStatus = "not_synced" | "syncing" | "synced" | "error";

export type IngestStatus = "not_ingested" | "ingesting" | "ingested" | "error";

export type OptimizationStatus = "not_optimized" | "optimizing" | "optimized" | "error";

export type ImportType = "direct-upload" | "converted-project" | "catalog" | "synced";

export type ConversionStatus = "not_converted" | "converting" | "converted" | "error";

// --- Textures ---

export interface TextureDetail {
  name: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
  type: string;
}

// --- Analysis ---

export interface AnalysisResponse {
  success: boolean;
  analysis: {
    fileName: string;
    fileFormat: string;
    fileSizeBytes: number;
    fileSizeKB: number;
    fileSizeMB: number;
    geometry: {
      triangleCount: number;
      meshCount: number;
      vertexCount: number;
    };
    materials: {
      count: number;
      names: string[];
    };
    textures: {
      count: number;
      details: TextureDetail[];
    };
    dimensions: {
      width: number;
      depth: number;
      height: number;
      unit: string;
    };
    boundingBox: {
      min: [number, number, number];
      max: [number, number, number];
    };
    estimatedScale: {
      unit: string;
      confidence: string;
      note: string;
    };
    placement: {
      candidate: string;
      confidence: string;
    };
    extras: {
      hasCameras: boolean;
      hasLights: boolean;
      hasAnimations: boolean;
      lightCount: number;
      cameraCount: number;
      animationCount: number;
      emptyNodeCount: number;
    };
    performance: {
      desktop: string;
      tablet: string;
      lowPower: string;
    };
    status: string;
    recommendations: Recommendation[];
  };
}

export interface Recommendation {
  code: string;
  severity: "warning" | "info" | "error";
  message: string;
  target: string | null;
}

// --- Optimize ---

export interface OptimizeOptions {
  removeEmptyNodes?: boolean;
  removeUnusedNodes?: boolean;
  removeCameras?: boolean;
  removeLights?: boolean;
  removeAnimations?: boolean;
  deduplicateMaterials?: boolean;
  removeUnusedVertexAttributes?: boolean;
  normalizeScale?: boolean;
  normalizeOrigin?: boolean;
  setFloorToY0?: boolean;
  maxTextureSize?: number;
  optimizeBaseColorTextures?: boolean;
  textureQuality?: number;
  generateThumbnail?: boolean;
  thumbnailSize?: number;
  generateMetadata?: boolean;
  assetName?: string;
  category?: string;
  subcategory?: string;
  style?: string;
  placement?: string | null;
}

export interface OptimizeResponse {
  success: boolean;
  jobId: string;
  analysis: AnalysisResponse["analysis"];
  optimization: {
    applied: string[];
    skipped: { operation: string; reason: string }[];
    warnings: { operation: string; message: string }[];
    explanations?: string[];
  };
  stats: {
    before: StatsSnapshot;
    after: StatsSnapshot;
    reduction: {
      fileSizePercent: number;
      materialsRemoved: number;
      texturesRemoved: number;
      texturesResized: number;
    };
  };
  outputs: {
    optimizedModel: string;
    thumbnail: string;
    metadata: string;
    report: string;
  };
  metadata: AssetMetadata;
}

export interface StatsSnapshot {
  fileSizeKB: number;
  triangles: number;
  materials: number;
  textures: number;
  maxTextureRes: number;
}

// --- Asset / Catalog ---

export interface AssetMetadata {
  schemaVersion?: "1.0";
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  style?: string;
  model: string;
  thumbnail: string | null;
  dimensions?: {
    width: number;
    depth: number;
    height: number;
  };
  placement: string;
  ha?: {
    mappable: boolean;
    defaultDomain: string | null;
    defaultKind: string | null;
  };
  performance?: {
    triangles: number;
    materials: number;
    fileSizeKB: number;
  };
  // Phase 2 fields
  source?: AssetSource;
  syncStatus?: SyncStatus;
  ingestStatus?: IngestStatus;
  optimizationStatus?: OptimizationStatus;
  lastSyncedAt?: string | null;
  optimizedAt?: string | null;
  importType?: ImportType;
  conversionStatus?: ConversionStatus;
  lifecycleStatus?: AssetLifecycleStatus;
  // Phase 4 fields
  originalFileSizeKB?: number;
  reductionPercent?: number;
  targetProfile?: string;
  // Phase 7 — scene metadata
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  center?: [number, number, number];
  pivot?: string;
  estimatedScale?: {
    unit: string;
    confidence: string;
  };
  // Phase 8 — V2 optimization flags
  normalizationApplied?: boolean;
  floorAlignmentApplied?: boolean;
  textureOptimizationApplied?: boolean;
}

export interface CatalogIndex {
  schemaVersion?: "1.0";
  version: string;
  generatedAt: string;
  totalAssets: number;
  categories: CatalogCategory[];
}

export interface CatalogCategory {
  name: string;
  subcategories: {
    name: string;
    assets: AssetMetadata[];
  }[];
}

// --- Ingest ---

export interface IngestMeta {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  style?: string;
  dimensions?: {
    width: number;
    depth: number;
    height: number;
  };
  placement?: string;
  ha?: {
    mappable: boolean;
    defaultDomain: string;
    defaultKind: string;
  };
}

export interface IngestResponse {
  success: boolean;
  catalogEntry: {
    id: string;
    path: string;
    files: {
      model: string;
      thumbnail: string;
      metadata: string;
    };
  };
  catalogReindexed: boolean;
}

// --- System ---

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  storage: {
    path: string;
    writable: boolean;
  };
}

export interface VersionResponse {
  name: string;
  version: string;
  node: string;
  uptime?: number;
  environment: string;
  catalogSchemaVersion?: string;
  capabilities?: string[];
}

// --- Sync ---

export interface SyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  timestamp: string;
}
