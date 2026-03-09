

# Bugfix Phase v1.1.2 — Analyze Pipeline & Catalog Metadata

## Root Causes

### Bug 1 — Analyze fails on real-world GLB models
The `@gltf-transform/extensions` package is installed but **never registered** with `NodeIO`. Real Sketchfab models use extensions like `KHR_materials_unlit`, `KHR_texture_transform`, `KHR_draco_mesh_compression`, etc. Without registration, `NodeIO.readBinary()` throws on any model using these extensions.

Additionally, the frontend API client loses backend error messages. The fetch path (line 120 of `api-client.ts`) reads `body.error?.message` but the backend sends `{ error: "string" }` — since `"string".message` is `undefined`, it falls back to the generic `"Request failed"`.

### Bug 2 — Catalog metadata paths
The optimize response sets `thumbnail: ""` (empty string) instead of `null`. While the ingest pipeline correctly builds catalog-relative paths in `meta.json`, the optimize response metadata shown in the Review UI displays `/jobs/...` paths, which is confusing. The empty thumbnail string also causes issues downstream.

## Changes

### 1. Register glTF extensions in analyzer + optimizer (`server/` + mirror)

Both `analyzer.ts` and `optimizer.ts` create bare `NodeIO()` instances. Fix by importing `ALL_EXTENSIONS` from `@gltf-transform/extensions` and registering them:

```typescript
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
```

This ensures Draco-compressed meshes, KHR_materials variants, texture transforms, etc. all parse correctly.

### 2. Add stage-level try/catch in analyzer.ts (`server/` + mirror)

Wrap the analysis function's internal stages in try/catch to produce specific error messages:

- `"Analyze failed at geometry scan: ..."`
- `"Analyze failed at texture extraction: ..."`
- `"Analyze failed at bounding box computation: ..."`

This replaces the generic "Analysis failed unexpectedly" with actionable diagnostics.

### 3. Fix API client error parsing (`src/services/api-client.ts`)

Line 120 — change:
```typescript
// Before
throw new ApiError(body.error?.message ?? "Request failed", res.status);
// After  
throw new ApiError(body.error?.message || body.error || "Request failed", res.status);
```

This handles both `{ error: "string" }` and `{ error: { message: "string" } }` response shapes.

### 4. Fix optimize response thumbnail (`server/src/routes/optimize.ts` + mirror)

Change `thumbnail: ""` to `thumbnail: null` in both `outputs` and `metadata` objects (lines 166-167, 177). Update the TypeScript type to allow `string | null`.

### 5. Update optimize types (`server/src/types/optimize.ts` + mirror)

Change `thumbnail: string` to `thumbnail: string | null` in both `outputs` and `metadata` within `OptimizeResponse`.

### 6. Frontend thumbnail fallback (`src/components/catalog/AssetCard.tsx`)

The card already shows a placeholder Box icon — no change needed. But ensure the catalog detail drawer and asset grid handle `thumbnail: null` gracefully (they already do).

### 7. Version bump to v1.1.2

Update `server/package.json`, mirror `package.json`, `config.yaml`, `CHANGELOG.md`, health route VERSION constants, and `index.ts` VERSION constants.

## Files to Modify

| File | Change |
|------|--------|
| `server/src/services/analysis/analyzer.ts` | Register ALL_EXTENSIONS, add stage-level error diagnostics |
| `server/src/services/optimization/optimizer.ts` | Register ALL_EXTENSIONS |
| `server/src/routes/optimize.ts` | `thumbnail: null` instead of `""` |
| `server/src/types/optimize.ts` | `thumbnail: string \| null` |
| `server/src/routes/health.ts` | VERSION → 1.1.2 |
| `server/src/index.ts` | VERSION → 1.1.2 |
| `server/package.json` | 1.1.2 |
| `src/services/api-client.ts` | Fix error message extraction |
| `bjorq_asset_wizard/server/src/services/analysis/analyzer.ts` | Mirror |
| `bjorq_asset_wizard/server/src/services/optimization/optimizer.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/optimize.ts` | Mirror |
| `bjorq_asset_wizard/server/src/types/optimize.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/health.ts` | Mirror |
| `bjorq_asset_wizard/server/src/index.ts` | Mirror |
| `bjorq_asset_wizard/server/package.json` | Mirror |
| `bjorq_asset_wizard/config.yaml` | 1.1.2 |
| `CHANGELOG.md` | v1.1.2 entry |

