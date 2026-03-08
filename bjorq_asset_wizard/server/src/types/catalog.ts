/**
 * Backend catalog types — mirrors relevant frontend types from src/types/api.ts
 */

export interface CatalogAssetMeta {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  style?: string;
  model: string;
  thumbnail: string;
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
  source?: string;
  ingestStatus?: string;
  optimizationStatus?: string;
  optimizedAt?: string | null;
  jobId?: string;
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
      thumbnail: string;
      metadata: string;
    };
  };
  catalogReindexed: boolean;
}
