# Bjorq Asset Wizard — Catalog Contract v1 (FROZEN)

> **Status**: Frozen — changes require a `schemaVersion` bump.
> **Schema Version**: `1.0`
> **Wizard Version**: `0.5.0+`

This document defines the stable integration contract that external consumers (e.g., Bjorq Dashboard) can depend on.

---

## 1. Catalog Folder Structure

```
CATALOG_PATH/
├── index.json                          # Auto-generated manifest
├── <category>/
│   └── <subcategory>/
│       └── <assetId>/
│           ├── model.glb               # Optimized 3D model
│           ├── meta.json               # Asset metadata (schema below)
│           └── thumb.webp              # Thumbnail (optional, may not exist)
```

- All paths are relative to `CATALOG_PATH` (default: `/data/catalog` in HA, `./public/catalog` in dev)
- `<category>`, `<subcategory>`, and `<assetId>` are URL-safe, lowercase, hyphenated strings
- `thumb.webp` is copied from job output during ingest if available; may be absent

---

## 2. `meta.json` Schema

Every asset directory contains a `meta.json` file with the following shape:

```typescript
interface CatalogAssetMeta {
  // --- Contract version ---
  schemaVersion: "1.0";              // Always "1.0" for v1 contract

  // --- Identity ---
  id: string;                        // Unique asset ID (directory name)
  name: string;                      // Human-readable display name
  category: string;                  // Top-level category (e.g., "furniture")
  subcategory?: string;              // Sub-category (e.g., "sofas")
  style?: string;                    // Visual style (e.g., "modern", "industrial")

  // --- Files (relative to catalog root) ---
  model: string;                     // e.g., "/furniture/sofas/nordic-sofa/model.glb"
  thumbnail: string | null;          // e.g., "/furniture/sofas/nordic-sofa/thumb.webp" or null

  // --- Physical ---
  dimensions?: {
    width: number;                   // Meters
    depth: number;                   // Meters
    height: number;                  // Meters
  };
  placement: string;                 // "floor" | "wall" | "ceiling" | "table"

  // --- Home Assistant integration ---
  ha?: {
    mappable: boolean;               // Can be mapped to an HA entity
    defaultDomain: string | null;    // e.g., "light", "media_player"
    defaultKind: string | null;      // e.g., "bulb", "speaker"
  };

  // --- Performance ---
  performance?: {
    triangles: number;
    materials: number;
    fileSizeKB: number;              // Optimized file size
  };

  // --- Optimization metadata (Phase 4) ---
  originalFileSizeKB?: number;       // Source file size before optimization
  reductionPercent?: number;         // File size reduction percentage
  targetProfile?: string;            // "mobile" | "tablet" | "wall" | "desktop" | "heavy"

  // --- Status ---
  source?: string;                   // "optimized" | "uploaded" | "catalog" | "synced"
  ingestStatus?: string;             // "ingested" | "not_ingested" | "error"
  optimizationStatus?: string;       // "optimized" | "not_optimized" | "error"
  optimizedAt?: string | null;       // ISO 8601 timestamp
  jobId?: string;                    // Reference to the optimize job that produced this asset
}
```

---

## 3. `GET /catalog/index` Response

```typescript
interface CatalogIndex {
  schemaVersion: "1.0";             // Contract version
  version: string;                   // Wizard software version (e.g., "0.5.0")
  generatedAt: string;               // ISO 8601 timestamp
  totalAssets: number;
  categories: Array<{
    name: string;
    subcategories: Array<{
      name: string;
      assets: CatalogAssetMeta[];    // Full meta for each asset
    }>;
  }>;
}
```

---

## 4. `GET /catalog/policy` Response

```typescript
interface CatalogPolicy {
  usage: {
    totalSizeBytes: number;
    totalSizeMB: number;
    assetCount: number;
  };
  limits: {
    softLimitMB: number;             // Default: 2048
    hardLimitMB: number;             // Default: 5120
    assetWarnSizeMB: number;         // Default: 25
  };
  warnings: string[];                // Human-readable warnings
  blocked: boolean;                  // true if hard limit exceeded
}
```

---

## 5. `GET /catalog/asset/:id/thumbnail`

Returns the `thumb.webp` file for the given asset ID.

- **200**: `Content-Type: image/webp` — binary image data
- **404**: `{ "success": false, "error": "Asset not found" }` or `"No thumbnail available for this asset"`

---

## 6. `GET /version` Response

```typescript
interface VersionResponse {
  name: "bjorq-asset-wizard";
  version: string;                    // Software version
  node: string;                       // Node.js version
  uptime: number;                     // Seconds
  environment: string;                // "production" | "development"
  catalogSchemaVersion: "1.0";        // Schema contract version
  capabilities: string[];             // ["analyze", "optimize", "catalog", "policy"]
}
```

Consumers can use `catalogSchemaVersion` to detect breaking changes and `capabilities` to feature-detect available endpoints.

---

## 7. `GET /health` Response

```typescript
interface HealthResponse {
  status: "ok";
  uptime: number;                     // Seconds
  timestamp: string;                  // ISO 8601
  storage: {
    path: string;
    writable: boolean;
  };
}
```

---

## 8. Target Profile Values

| Profile  | Triangles   | File Size | Description |
|----------|-------------|-----------|-------------|
| `mobile` | < 10,000    | < 2 MB    | Suitable for mobile devices |
| `tablet` | < 50,000    | < 10 MB   | Suitable for tablets |
| `wall`   | < 25,000    | < 5 MB    | Wall-mounted assets (tighter limits) |
| `desktop`| < 100,000   | < 25 MB   | Desktop/high-performance displays |
| `heavy`  | ≥ 100,000   | ≥ 25 MB   | May cause performance issues |

---

## 9. Asset Path Conventions

- All `model` and `thumbnail` paths in `meta.json` are relative to the catalog root, prefixed with `/`
- Example: `/furniture/sofas/nordic-sofa/model.glb`
- To access via HTTP: `GET /catalog/files/furniture/sofas/nordic-sofa/model.glb`
- Thumbnail shortcut: `GET /catalog/asset/nordic-sofa/thumbnail`

---

## 10. Versioning Policy

- `schemaVersion` in `meta.json` and `/catalog/index` is `"1.0"` for this contract
- Breaking changes to the schema require bumping to `"2.0"` with a migration path
- Non-breaking additions (new optional fields) are allowed within `"1.0"`
- Consumers should check `schemaVersion` before parsing
