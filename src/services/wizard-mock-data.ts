import type { CatalogIndex, HealthResponse, VersionResponse } from "@/types/api";

export const wizardMockHealth: HealthResponse = {
  status: "ok",
  uptime: 42100,
  timestamp: new Date().toISOString(),
  storage: { path: "./wizard-storage", writable: true },
};

export const wizardMockVersion: VersionResponse = {
  name: "bjorq-asset-wizard",
  version: "0.9.0",
  node: "v20.11.0",
  environment: "development",
};

export const wizardMockCatalog: CatalogIndex = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  totalAssets: 5,
  categories: [
    {
      name: "furniture",
      subcategories: [
        {
          name: "chairs",
          assets: [
            { id: "wiz-eames-chair", name: "Eames Lounge Chair", category: "furniture", subcategory: "chairs", style: "mid-century", model: "furniture/chairs/eames/model.glb", thumbnail: "furniture/chairs/eames/thumb.webp", dimensions: { width: 0.84, depth: 0.85, height: 0.89 }, placement: "floor", performance: { triangles: 22400, materials: 3, fileSizeKB: 580 }, source: "wizard", syncStatus: "not_synced", optimizationStatus: "optimized" },
            { id: "wiz-dining-chair", name: "Scandinavian Dining Chair", category: "furniture", subcategory: "chairs", style: "scandinavian", model: "furniture/chairs/scandi/model.glb", thumbnail: "furniture/chairs/scandi/thumb.webp", dimensions: { width: 0.45, depth: 0.5, height: 0.82 }, placement: "floor", performance: { triangles: 14200, materials: 2, fileSizeKB: 320 }, source: "wizard", syncStatus: "not_synced", optimizationStatus: "optimized" },
          ],
        },
        {
          name: "shelves",
          assets: [
            { id: "wiz-wall-shelf", name: "Floating Wall Shelf", category: "furniture", subcategory: "shelves", style: "modern", model: "furniture/shelves/floating/model.glb", thumbnail: "furniture/shelves/floating/thumb.webp", dimensions: { width: 0.8, depth: 0.22, height: 0.04 }, placement: "wall", performance: { triangles: 4200, materials: 1, fileSizeKB: 120 }, source: "wizard", syncStatus: "not_synced", optimizationStatus: "optimized" },
          ],
        },
      ],
    },
    {
      name: "lighting",
      subcategories: [
        {
          name: "pendant",
          assets: [
            { id: "wiz-pendant-lamp", name: "Brass Pendant Lamp", category: "lighting", subcategory: "pendant", style: "industrial", model: "lighting/pendant/brass/model.glb", thumbnail: "lighting/pendant/brass/thumb.webp", dimensions: { width: 0.3, depth: 0.3, height: 0.45 }, placement: "ceiling", ha: { mappable: true, defaultDomain: "light", defaultKind: "pendant" }, performance: { triangles: 8800, materials: 2, fileSizeKB: 240 }, source: "wizard", syncStatus: "not_synced", optimizationStatus: "optimized" },
          ],
        },
      ],
    },
    {
      name: "decor",
      subcategories: [
        {
          name: "vases",
          assets: [
            { id: "wiz-ceramic-vase", name: "Ceramic Floor Vase", category: "decor", subcategory: "vases", style: "organic", model: "decor/vases/ceramic/model.glb", thumbnail: "decor/vases/ceramic/thumb.webp", dimensions: { width: 0.2, depth: 0.2, height: 0.55 }, placement: "floor", performance: { triangles: 6400, materials: 1, fileSizeKB: 180 }, source: "wizard", syncStatus: "not_synced", optimizationStatus: "optimized" },
          ],
        },
      ],
    },
  ],
};
