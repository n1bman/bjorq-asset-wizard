

# Phase 8 — Optimization V2 (Advanced Asset Normalization)

## Overview

Implement the three "Coming in V2" features: normalize scale, floor alignment, and texture optimization. Update the backend optimizer, frontend UI, metadata, and documentation. Bump to v1.1.0.

## Backend Changes

### 1. `server/src/services/optimization/optimizer.ts` (+ mirror)

Remove `normalizeScale`, `setFloorToY0`, `optimizeBaseColorTextures`, `maxTextureSize`, `textureQuality` from the `V1_SKIPPED` array. Implement the three features using existing dependencies:

**Normalize Scale** — Use `flatten()` from `@gltf-transform/functions` to bake all node transforms (including non-uniform scale) into vertex data. After flattening, all nodes have identity transforms (scale 1,1,1) while preserving world dimensions.

```typescript
import { flatten } from "@gltf-transform/functions";

if (options.normalizeScale !== false) {
  await doc.transform(flatten());
  applied.push("normalizeScale");
}
```

**Set Floor to Y=0** — After flatten, compute the bounding box minimum Y across all POSITION accessors, then subtract that offset from all vertex Y positions.

```typescript
if (options.setFloorToY0 !== false) {
  const minY = computeMinY(doc); // scan all POSITION accessors
  if (Math.abs(minY) > 0.0001) {
    shiftVerticesY(doc, -minY); // subtract minY from all Y positions
    applied.push("setFloorToY0");
  } else {
    skipped.push({ operation: "setFloorToY0", reason: "Already at Y=0" });
  }
}
```

**Optimize Base Color Textures** — Use `textureCompress()` from `@gltf-transform/functions` with `sharp` (already a dependency) to resize oversized textures. Only targets base color texture slots. Respects `maxTextureSize` (default 2048) from options.

```typescript
import { textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";

if (options.optimizeBaseColorTextures !== false) {
  const maxSize = options.maxTextureSize ?? 2048;
  await doc.transform(
    textureCompress({
      encoder: sharp,
      resize: [maxSize, maxSize],
      slots: /baseColor/,
    })
  );
  applied.push("optimizeBaseColorTextures");
}
```

Update `texturesResized` in the reduction stats by comparing before/after max texture resolution.

### 2. `server/src/types/optimize.ts` (+ mirror)

Add `normalizationApplied`, `floorAlignmentApplied`, `textureOptimizationApplied` as optional booleans to `OptimizeResponse.metadata`.

### 3. `server/src/routes/optimize.ts` (+ mirror)

Populate the new metadata fields based on `result.applied` array contents.

### 4. `server/src/types/catalog.ts` (+ mirror)

Add optional fields to `CatalogAssetMeta`:
- `normalizationApplied?: boolean`
- `floorAlignmentApplied?: boolean`
- `textureOptimizationApplied?: boolean`

### 5. `server/src/services/catalog/manager.ts` (+ mirror)

Extract the new boolean flags from `result.json` during ingest and write them to `meta.json`.

## Frontend Changes

### 6. `src/components/optimize/OptimizeOptions.tsx`

Remove the "Coming in V2" disabled section. Move the three toggles into the active configurable section with proper keys:
- `normalizeScale` → "Normalize scale"
- `setFloorToY0` → "Set floor to Y=0"
- `optimizeBaseColorTextures` → "Optimize base color textures"

Add a `maxTextureSize` numeric input (default 2048) that appears when texture optimization is enabled.

### 7. `src/types/api.ts`

Add `normalizationApplied`, `floorAlignmentApplied`, `textureOptimizationApplied` as optional booleans to `AssetMetadata`.

### 8. `src/services/mock-data.ts`

Add the new fields to mock data.

### 9. Review section in `src/pages/Optimize.tsx`

Change the "Skipped (V2)" card header to just "Skipped" since V2 features are now active.

## Documentation & Versioning

### 10. Version bump to 1.1.0

Update across: `server/package.json`, `bjorq_asset_wizard/server/package.json`, `bjorq_asset_wizard/config.yaml`, health routes, index.ts files, catalog manager `CATALOG_VERSION`.

### 11. `CHANGELOG.md`

Add Phase 8 / v1.1.0 entry documenting the three new features.

### 12. `docs/bjorq-asset-wizard-infra/CATALOG_CONTRACT.md`

Document the new optional metadata fields.

## Files to Modify

| File | Change |
|------|--------|
| `server/src/services/optimization/optimizer.ts` | Implement normalizeScale, setFloorToY0, optimizeBaseColorTextures |
| `server/src/types/optimize.ts` | Add V2 metadata fields |
| `server/src/types/catalog.ts` | Add V2 metadata fields |
| `server/src/routes/optimize.ts` | Populate V2 metadata in response |
| `server/src/services/catalog/manager.ts` | Extract V2 fields during ingest |
| `src/components/optimize/OptimizeOptions.tsx` | Enable V2 controls, remove disabled section |
| `src/types/api.ts` | Add V2 fields to AssetMetadata |
| `src/services/mock-data.ts` | Update mock data |
| `src/pages/Optimize.tsx` | Change "Skipped (V2)" label |
| `docs/bjorq-asset-wizard-infra/CATALOG_CONTRACT.md` | Document new fields |
| `CHANGELOG.md` | v1.1.0 entry |
| All `bjorq_asset_wizard/` mirrors | Same changes |
| Version files (×10) | 1.1.0 |

## Implementation Order

1. Backend types (optimize + catalog)
2. Optimizer implementation (3 features)
3. Optimize route + manager updates
4. Frontend UI (options panel + types + mock)
5. Documentation + version bump

