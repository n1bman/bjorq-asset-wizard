import type {
  AnalysisResponse,
  OptimizeResponse,
  CatalogIndex,
  IngestResponse,
  HealthResponse,
  VersionResponse,
} from "@/types/api";

export const mockAnalysis: AnalysisResponse = {
  success: true,
  analysis: {
    fileName: "nordic-sofa.glb",
    fileFormat: "glb",
    fileSizeBytes: 2458624,
    fileSizeKB: 2401,
    fileSizeMB: 2.35,
    geometry: { triangleCount: 148230, meshCount: 12, vertexCount: 89420 },
    materials: {
      count: 8,
      names: ["Wood_Base", "Fabric_Seat", "Metal_Legs", "Fabric_Cushion", "Leather_Arm", "Wood_Detail", "Rubber_Feet", "Fabric_Back"],
    },
    textures: {
      count: 14,
      details: [
        { name: "wood_diffuse", width: 4096, height: 4096, format: "image/png", sizeBytes: 1245184, type: "baseColor" },
        { name: "fabric_diffuse", width: 2048, height: 2048, format: "image/png", sizeBytes: 524288, type: "baseColor" },
        { name: "metal_roughness", width: 1024, height: 1024, format: "image/png", sizeBytes: 131072, type: "metallicRoughness" },
        { name: "wood_normal", width: 4096, height: 4096, format: "image/png", sizeBytes: 1048576, type: "normal" },
      ],
    },
    dimensions: { width: 1.8, depth: 0.85, height: 0.75, unit: "meter" },
    boundingBox: { min: [-0.9, 0.0, -0.425], max: [0.9, 0.75, 0.425] },
    estimatedScale: { unit: "m", confidence: "high", note: "Dimensions consistent with furniture scale" },
    placement: { candidate: "floor", confidence: "high" },
    extras: {
      hasCameras: false, hasLights: true, hasAnimations: false,
      lightCount: 2, cameraCount: 0, animationCount: 0, emptyNodeCount: 4,
    },
    performance: { desktop: "ok", tablet: "optimization_recommended", lowPower: "optimization_strongly_recommended" },
    status: "optimization_recommended",
    recommendations: [
      { code: "TEXTURE_TOO_LARGE", severity: "warning", message: "Texture 'wood_diffuse' is 4096×4096 — recommend max 2048×2048", target: "wood_diffuse" },
      { code: "CONTAINS_LIGHTS", severity: "info", message: "Model contains 2 light nodes — typically not needed", target: null },
      { code: "EMPTY_NODES", severity: "info", message: "4 empty nodes found — can be safely removed", target: null },
      { code: "HIGH_TRIANGLE_COUNT", severity: "warning", message: "148230 triangles is high for a furniture asset", target: null },
    ],
  },
};

export const mockOptimize: OptimizeResponse = {
  success: true,
  jobId: "opt_a1b2c3d4",
  analysis: mockAnalysis.analysis,
  optimization: {
    applied: ["removeEmptyNodes", "removeUnusedNodes", "removeLights", "deduplicateMaterials", "resizeTextures", "normalizeScale", "setFloorToY0"],
    skipped: [{ operation: "removeAnimations", reason: "No animations found" }],
    warnings: [{ operation: "normalizeOrigin", message: "Origin adjustment skipped — complex pivot detected" }],
    explanations: ["No animations present in the model", "No duplicate materials detected"],
  },
  stats: {
    before: { fileSizeKB: 2401, triangles: 148230, materials: 8, textures: 14, maxTextureRes: 4096 },
    after: { fileSizeKB: 1180, triangles: 148230, materials: 5, textures: 10, maxTextureRes: 2048 },
    reduction: { fileSizePercent: 50.9, materialsRemoved: 3, texturesRemoved: 4, texturesResized: 6 },
  },
  outputs: {
    optimizedModel: "/jobs/opt_a1b2c3d4/optimized.glb",
    thumbnail: "/jobs/opt_a1b2c3d4/thumb.webp",
    metadata: "/jobs/opt_a1b2c3d4/meta.json",
    report: "/jobs/opt_a1b2c3d4/report.json",
  },
  metadata: {
    id: "nordic-sofa",
    name: "Nordic Sofa",
    category: "furniture",
    subcategory: "sofas",
    style: "modern",
    model: "optimized.glb",
    thumbnail: "thumb.webp",
    dimensions: { width: 1.8, depth: 0.85, height: 0.75 },
    placement: "floor",
    ha: { mappable: false, defaultDomain: null, defaultKind: null },
    performance: { triangles: 148230, materials: 5, fileSizeKB: 1180 },
    source: "optimized",
    syncStatus: "not_synced",
    ingestStatus: "not_ingested",
    optimizationStatus: "optimized",
  },
};

export const mockCatalog: CatalogIndex = {
  version: "1.0.0",
  generatedAt: "2026-03-08T14:30:00.000Z",
  totalAssets: 6,
  categories: [
    {
      name: "furniture",
      subcategories: [
        {
          name: "sofas",
          assets: [
            { id: "nordic-sofa-01", name: "Nordic Sofa", category: "furniture", subcategory: "sofas", style: "modern", model: "furniture/sofas/nordic-sofa-01/model.glb", thumbnail: "furniture/sofas/nordic-sofa-01/thumb.webp", dimensions: { width: 1.8, depth: 0.85, height: 0.75 }, placement: "floor", performance: { triangles: 48210, materials: 3, fileSizeKB: 820 }, source: "catalog", syncStatus: "synced", ingestStatus: "ingested", optimizationStatus: "optimized", lastSyncedAt: "2026-03-07T10:00:00Z" },
            { id: "minimalist-couch", name: "Minimalist Couch", category: "furniture", subcategory: "sofas", style: "minimal", model: "furniture/sofas/minimalist-couch/model.glb", thumbnail: "furniture/sofas/minimalist-couch/thumb.webp", dimensions: { width: 2.1, depth: 0.9, height: 0.7 }, placement: "floor", performance: { triangles: 32100, materials: 2, fileSizeKB: 640 }, source: "optimized", syncStatus: "not_synced", ingestStatus: "ingested", optimizationStatus: "optimized" },
          ],
        },
        {
          name: "tables",
          assets: [
            { id: "oak-dining-table", name: "Oak Dining Table", category: "furniture", subcategory: "tables", style: "scandinavian", model: "furniture/tables/oak-dining-table/model.glb", thumbnail: "furniture/tables/oak-dining-table/thumb.webp", dimensions: { width: 1.6, depth: 0.9, height: 0.76 }, placement: "floor", performance: { triangles: 18400, materials: 2, fileSizeKB: 420 }, source: "catalog", syncStatus: "synced", ingestStatus: "ingested", optimizationStatus: "optimized", lastSyncedAt: "2026-03-06T08:15:00Z" },
          ],
        },
      ],
    },
    {
      name: "devices",
      subcategories: [
        {
          name: "speakers",
          assets: [
            { id: "google-home-mini", name: "Google Home Mini", category: "devices", subcategory: "speakers", style: "modern", model: "devices/speakers/google-home-mini/model.glb", thumbnail: "devices/speakers/google-home-mini/thumb.webp", dimensions: { width: 0.1, depth: 0.1, height: 0.04 }, placement: "table", ha: { mappable: true, defaultDomain: "media_player", defaultKind: "speaker" }, performance: { triangles: 12400, materials: 2, fileSizeKB: 340 }, source: "uploaded", syncStatus: "not_synced", ingestStatus: "not_ingested", optimizationStatus: "not_optimized" },
          ],
        },
      ],
    },
    {
      name: "decor",
      subcategories: [
        {
          name: "plants",
          assets: [
            { id: "potted-monstera", name: "Potted Monstera", category: "decor", subcategory: "plants", style: "organic", model: "decor/plants/potted-monstera/model.glb", thumbnail: "decor/plants/potted-monstera/thumb.webp", dimensions: { width: 0.4, depth: 0.4, height: 0.8 }, placement: "floor", performance: { triangles: 24500, materials: 4, fileSizeKB: 560 }, source: "catalog", syncStatus: "synced", ingestStatus: "ingested", optimizationStatus: "optimized", lastSyncedAt: "2026-03-05T12:00:00Z" },
            { id: "succulent-trio", name: "Succulent Trio", category: "decor", subcategory: "plants", style: "modern", model: "decor/plants/succulent-trio/model.glb", thumbnail: "decor/plants/succulent-trio/thumb.webp", dimensions: { width: 0.25, depth: 0.12, height: 0.15 }, placement: "table", performance: { triangles: 8200, materials: 3, fileSizeKB: 210 }, source: "optimized", syncStatus: "syncing", ingestStatus: "ingested", optimizationStatus: "optimized" },
          ],
        },
      ],
    },
  ],
};

export const mockIngest: IngestResponse = {
  success: true,
  catalogEntry: {
    id: "google-home-mini",
    path: "devices/speakers/google-home-mini",
    files: {
      model: "public/catalog/devices/speakers/google-home-mini/model.glb",
      thumbnail: "public/catalog/devices/speakers/google-home-mini/thumb.webp",
      metadata: "public/catalog/devices/speakers/google-home-mini/meta.json",
    },
  },
  catalogReindexed: true,
};

export const mockHealth: HealthResponse = {
  status: "ok",
  uptime: 84320,
  timestamp: new Date().toISOString(),
  storage: { path: "./storage", writable: true },
};

export const mockVersion: VersionResponse = {
  name: "bjorq-asset-optimizer",
  version: "1.0.0",
  node: "v20.11.0",
  environment: "development",
};
