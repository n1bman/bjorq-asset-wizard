

# Phase 7 — Precompute Scene Metadata & Wizard 1.0 Preparation

The analyzer already computes `boundingBox`, `dimensions`, `estimatedScale`, and `placement` — but none of these scene-level values are persisted into `meta.json` or exposed via `/catalog/index`. This phase bridges that gap and prepares for a stable v1.0.0 release.

All new fields are **optional additions** to the existing `schemaVersion: "1.0"` contract (non-breaking per the versioning policy).

---

## Changes

### 1. Extend `CatalogAssetMeta` with scene metadata

Add optional fields to `server/src/types/catalog.ts`:

```typescript
// New fields (non-breaking additions to schema 1.0)
boundingBox?: {
  min: [number, number, number];
  max: [number, number, number];
};
center?: [number, number, number];       // computed from bounding box
pivot?: string;                          // "center" | "bottom-center" | "origin"
estimatedScale?: {
  unit: string;
  confidence: string;
};
```

Mirror to `bjorq_asset_wizard/server/src/types/catalog.ts`.

### 2. Populate scene metadata during ingest

In `server/src/services/catalog/manager.ts`, extract scene data from `result.json` (which already contains the full `analysisAfter` object via the optimize route):

- `boundingBox` → from `analysisAfter.boundingBox`
- `center` → computed as midpoint of bounding box
- `dimensions` → already stored, but ensure it comes from `analysisAfter.dimensions`
- `pivot` → derive from bounding box (if min.y ≈ 0 → "bottom-center", else "center")
- `estimatedScale` → from `analysisAfter.estimatedScale`

### 3. Store scene metadata in optimize `result.json`

The optimize route already writes `result.json` but doesn't include the full analysis. Add `analysisAfter` summary fields (boundingBox, dimensions, placement, estimatedScale) to the result so ingest can read them.

In `server/src/routes/optimize.ts`, extend the `resultJson` object written to disk.

### 4. Update optimize response metadata

Extend `OptimizeResponse.metadata` in `server/src/types/optimize.ts` to include `boundingBox`, `center`, and `estimatedScale` so the frontend can display them immediately after optimization.

### 5. Update frontend types

In `src/types/api.ts`, add the new optional fields to `AssetMetadata`.

### 6. Update CATALOG_CONTRACT.md

Document the new optional scene metadata fields in the frozen contract doc.

### 7. Version bump to 1.0.0

Bump all version references. Update CHANGELOG, README, DOCS.

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/src/types/catalog.ts` | Add `boundingBox`, `center`, `pivot`, `estimatedScale` |
| `server/src/services/catalog/manager.ts` | Extract and populate scene metadata during ingest |
| `server/src/routes/optimize.ts` | Include analysis scene data in `result.json` and response |
| `server/src/types/optimize.ts` | Extend `OptimizeResponse.metadata` with scene fields |
| `src/types/api.ts` | Add scene fields to `AssetMetadata` |
| `src/services/mock-data.ts` | Add scene metadata to mock data |
| `docs/bjorq-asset-wizard-infra/CATALOG_CONTRACT.md` | Document new optional fields |
| All `bjorq_asset_wizard/server/src/` mirrors | Same changes |
| Version files (package.json ×2, config.yaml, health.ts ×2, index.ts ×2, manager.ts ×2) | `1.0.0` |
| `CHANGELOG.md` | Phase 7 / v1.0.0 entry |
| `bjorq_asset_wizard/README.md`, `DOCS.md` | Updated for 1.0.0 |

## Implementation Order

1. Type updates (catalog + optimize + frontend)
2. Optimize route: write scene data to result.json + response
3. Manager: read scene data from result.json during ingest
4. Contract documentation update
5. Mock data + version bump + changelog

