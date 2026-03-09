/**
 * Bjorq Asset Wizard — Analysis Response Types
 *
 * Backend-local types for the POST /analyze endpoint.
 * Matches the API spec in docs/bjorq-asset-optimizer/API_SPEC.md.
 */

export interface TextureDetail {
  name: string;
  width: number | null;
  height: number | null;
  format: string | null;
  sizeBytes: number | null;
  type: string;
}

export interface Recommendation {
  code: string;
  severity: "warning" | "info" | "error";
  message: string;
  target: string | null;
}

export type PerformanceRating =
  | "ok"
  | "optimization_recommended"
  | "optimization_strongly_recommended";

export type AnalysisStatus =
  | "ok"
  | "optimization_recommended"
  | "optimization_strongly_recommended";

export interface AnalysisResult {
  fileName: string;
  fileFormat: "glb" | "gltf";
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
    desktop: PerformanceRating;
    tablet: PerformanceRating;
    lowPower: PerformanceRating;
  };
  status: AnalysisStatus;
  recommendations: Recommendation[];
}

export interface AnalysisResponse {
  success: true;
  analysis: AnalysisResult;
}

export interface AnalysisErrorResponse {
  success: false;
  error: string;
  stage?: string;
}
