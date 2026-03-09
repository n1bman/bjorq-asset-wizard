/**
 * Bjorq Asset Wizard — Optimize Endpoint Types
 *
 * Backend-local types for POST /optimize.
 * Mirrors the frontend OptimizeOptions / OptimizeResponse shape.
 */

import type { AnalysisResult } from "./analyze.js";

// --- Request ---

export interface OptimizeRequestOptions {
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

// --- Stats ---

export interface StatsSnapshot {
  fileSizeKB: number;
  triangles: number;
  materials: number;
  textures: number;
  maxTextureRes: number;
}

export interface ReductionStats {
  fileSizePercent: number;
  materialsRemoved: number;
  texturesRemoved: number;
  texturesResized: number;
}

// --- Optimize Result (internal) ---

export interface OptimizeResult {
  optimizedBuffer: Uint8Array;
  before: StatsSnapshot;
  after: StatsSnapshot;
  reduction: ReductionStats;
  applied: string[];
  skipped: { operation: string; reason: string }[];
  warnings: { operation: string; message: string }[];
  explanations: string[];
  analysisBefore: AnalysisResult;
  analysisAfter: AnalysisResult;
}

// --- Response ---

export interface OptimizeResponse {
  success: true;
  jobId: string;
  analysis: AnalysisResult;
  optimization: {
    applied: string[];
    skipped: { operation: string; reason: string }[];
    warnings: { operation: string; message: string }[];
    explanations: string[];
  };
  stats: {
    before: StatsSnapshot;
    after: StatsSnapshot;
    reduction: ReductionStats;
  };
  outputs: {
    optimizedModel: string;
    thumbnail: string;
    metadata: string;
    report: string;
  };
  metadata: {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    style: string;
    model: string;
    thumbnail: string;
    dimensions: AnalysisResult["dimensions"];
    placement: string;
    performance: {
      triangles: number;
      materials: number;
      fileSizeKB: number;
    };
    originalFileSizeKB: number;
    reductionPercent: number;
    targetProfile: string;
    boundingBox?: {
      min: [number, number, number];
      max: [number, number, number];
    };
    center?: [number, number, number];
    estimatedScale?: {
      unit: string;
      confidence: string;
    };
  };
}

export interface OptimizeErrorResponse {
  success: false;
  error: string;
  stage?: string;
}
