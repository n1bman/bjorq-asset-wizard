

# Phase 6 — Pipeline Validation and Diagnostics

Verification, robustness, and diagnostics across the full asset pipeline. Version bump to **0.6.0**.

---

## 1. Defensive Catalog Index (`buildCatalogIndex`)

**Current gap**: Malformed `meta.json` is silently skipped but no validation ensures required fields exist. Assets with missing fields could break consumers.

**Changes in `server/src/services/catalog/manager.ts`**:
- Add a `validateAssetMeta()` function that checks required fields (`id`, `name`, `category`, `schemaVersion`, `model`, `placement`). Invalid assets are skipped with a warning log.
- Sort categories, subcategories, and assets alphabetically for consistent ordering.
- Empty catalog returns a valid response (already works, but add explicit test coverage comment).

## 2. Optimization Diagnostics — Explanation Fields

**Current gap**: `0% reduction` with no explanation why.

**Changes in `server/src/services/optimization/optimizer.ts`**:
- Add `explanations: string[]` to `OptimizeResult` — human-readable messages like "No unused resources found", "Textures already optimized", "No duplicate materials detected".
- Populate based on what `skipped` entries report ("No cameras found", "No empty nodes found", etc.).

**Changes in `server/src/types/optimize.ts`**:
- Add `explanations: string[]` to `OptimizeResult` and `OptimizeResponse.optimization`.

**Changes in `server/src/routes/optimize.ts`**:
- Include `explanations` in the response.

## 3. Catalog Diagnostics Endpoint

**New route**: `GET /catalog/diagnostics` in `server/src/routes/catalog.ts`.

Returns:
```json
{
  "catalogSizeMB": 45.2,
  "assetCount": 12,
  "storageUsage": { "totalBytes": ..., "totalMB": ..., "totalGB": ..., "assetCount": ... },
  "largestAssetMB": 8.3,
  "largestAssetId": "some-asset",
  "schemaVersion": "1.0",
  "version": "0.6.0"
}
```

Uses existing `getCatalogStorageUsage()` from policy + a new scan for largest asset in `manager.ts`.

## 4. Improve Cleanup Logging

**Changes in `server/src/services/cleanup/job-cleaner.ts`**:
- Log each individual removal: job ID, age in days, reason (expired/failed), freed size.
- Always log scan summary (even when 0 removed).

## 5. Improve Analyze Robustness for Large Files

**Changes in `server/src/routes/analyze.ts`**:
- Wrap `analyzeModel` call with a memory-safety try/catch that catches OOM-style errors and returns a clear `stage: "analyze"` error.
- Log buffer size before analysis starts.

**Changes in `server/src/services/analysis/analyzer.ts`**:
- No structural changes needed — already handles errors. Add a defensive check for extremely large files (>100MB buffer) returning a clear error rather than risking OOM.

## 6. Frontend Types & Mock Data Updates

**`src/types/api.ts`**:
- Add `schemaVersion?: "1.0"` to `CatalogIndex`.
- Add `explanations?: string[]` to `OptimizeResponse.optimization`.

**`src/services/mock-data.ts`**:
- Add `explanations` to mock optimize response.

## 7. Version Bump & Documentation

- Bump all version references to `0.6.0` (package.json ×2, config.yaml, health.ts ×2, index.ts ×2, manager.ts ×2).
- Update `CHANGELOG.md` with Phase 6 entry.
- Update `bjorq_asset_wizard/README.md` and `DOCS.md`.
- Mirror all server changes to `bjorq_asset_wizard/server/src/`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/src/services/catalog/manager.ts` | Add `validateAssetMeta()`, sorted output, `findLargestAsset()` |
| `server/src/services/optimization/optimizer.ts` | Generate `explanations[]` from skipped operations |
| `server/src/types/optimize.ts` | Add `explanations` to result and response types |
| `server/src/routes/optimize.ts` | Include `explanations` in response |
| `server/src/routes/catalog.ts` | Add `GET /catalog/diagnostics` |
| `server/src/routes/analyze.ts` | Defensive large-file handling |
| `server/src/services/cleanup/job-cleaner.ts` | Per-job removal logging |
| `server/src/index.ts` | Add `/catalog/diagnostics` to endpoint list, version bump |
| `server/src/routes/health.ts` | Version bump |
| `server/src/services/catalog/manager.ts` | Version bump |
| `server/package.json` | Version bump |
| `src/types/api.ts` | Add `schemaVersion` to `CatalogIndex`, `explanations` to optimize |
| `src/services/mock-data.ts` | Add explanations to mock |
| `CHANGELOG.md` | Phase 6 entry |
| All `bjorq_asset_wizard/` mirrors | Same changes |
| `bjorq_asset_wizard/config.yaml` | Version bump |
| `bjorq_asset_wizard/README.md`, `DOCS.md` | Updated docs |

## Implementation Order

1. Type updates (explanations field)
2. Manager: validation + sorting + diagnostics helper
3. Optimizer: explanations generation
4. Routes: diagnostics endpoint + optimize response + analyze robustness
5. Cleanup: logging improvements
6. Frontend types + mock data
7. Version bump + changelog + mirrors

