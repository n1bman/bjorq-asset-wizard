/**
 * Backend catalog types — frozen v1 schema.
 *
 * ⚠️  FROZEN CONTRACT — Changes to this file require a schemaVersion bump.
 * External consumers (Dashboard) depend on this shape.
 *
 * Phase 8 additions (normalizationApplied, floorAlignmentApplied,
 * textureOptimizationApplied) are optional — non-breaking under v1.
 */

export interface CatalogAssetMeta {
  schemaVersion: "1.0";
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
  originalFileSizeKB?: number;
  reductionPercent?: number;
  targetProfile?: string;
  source?: string;
  ingestStatus?: string;
  optimizationStatus?: string;
  optimizedAt?: string | null;
  lifecycleStatus?: "uploaded" | "analyzed" | "optimized" | "published";
  syncStatus?: "pending" | "synced" | "failed";
  jobId?: string;

  // --- Scene metadata (Phase 7 — non-breaking additions) ---
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

  // --- Optimization V2 flags (Phase 8 — non-breaking additions) ---
  normalizationApplied?: boolean;
  floorAlignmentApplied?: boolean;
  textureOptimizationApplied?: boolean;
}

export interface CatalogSubcategory {
  name: string;
  assets: CatalogAssetMeta[];
}

export interface CatalogCategory {
  name: string;
  subcategories: CatalogSubcategory[];
}

export interface CatalogIndex {
  schemaVersion: "1.0";
  version: string;
  generatedAt: string;
  totalAssets: number;
  categories: CatalogCategory[];
}

export interface IngestRequest {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  style?: string;
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
      thumbnail: string | null;
      metadata: string;
    };
  };
  catalogReindexed: boolean;
}
