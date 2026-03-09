

# Phase 5 — Wizard Integration Readiness

Finalize the Wizard as a stable asset provider with frozen schemas, stable paths, and integration documentation for future Dashboard consumption. Version bump to **0.5.0**.

---

## Changes

### 1. Freeze and document the meta.json schema

`CatalogAssetMeta` in `server/src/types/catalog.ts` (and bjorq mirror) is missing Phase 4 fields. Add:

- `originalFileSizeKB?: number`
- `reductionPercent?: number`
- `targetProfile?: string`
- `schemaVersion: string` (set to `"1.0"`)

Update `manager.ts` ingest to populate these fields from job result data and write `schemaVersion: "1.0"` into every `meta.json`.

### 2. Freeze catalog folder structure

Already correct: `CATALOG_PATH/<category>/<subcategory>/<assetId>/{model.glb, meta.json, thumb.webp}`. Document this as the frozen v1 contract.

### 3. Thumbnail placeholder handling

Currently `thumbnail` is set to `""` during ingest. Changes:
- During ingest, copy `thumb.webp` from job output if it exists
- If no thumbnail available, set `thumbnail` to `null` (not empty string) — cleaner for consumers
- Add a `GET /catalog/asset/:id/thumbnail` route that returns the image or a 404

### 4. Stabilize /catalog/index response

Add `schemaVersion: "1.0"` to `CatalogIndex` type and output. This lets consumers detect breaking changes. Already well-structured otherwise.

### 5. Add integration documentation

**New file**: `docs/bjorq-asset-wizard-infra/CATALOG_CONTRACT.md`

Document:
- Folder structure (frozen v1)
- `meta.json` full schema with field descriptions
- `/catalog/index` response contract
- `/catalog/policy` response contract
- `/version` and `/health` response contracts
- Thumbnail expectations
- Target profile values and meanings
- Asset path conventions (always relative to catalog root)

### 6. Enhance /version endpoint for external consumers

Add to `/version` response:
- `catalogSchemaVersion: "1.0"`
- `capabilities: ["analyze", "optimize", "catalog", "policy"]`

This lets the Dashboard detect which features are available.

### 7. Version bump and documentation

- Bump all version references to `0.5.0`
- Update `CHANGELOG.md` with Phase 5 entry
- Update `bjorq_asset_wizard/README.md` and `DOCS.md`

---

## Files to Create

| File | Purpose |
|------|---------|
| `docs/bjorq-asset-wizard-infra/CATALOG_CONTRACT.md` | Frozen v1 integration contract |

## Files to Modify

| File | Changes |
|------|---------|
| `server/src/types/catalog.ts` | Add `schemaVersion`, Phase 4 metadata fields |
| `server/src/services/catalog/manager.ts` | Populate new fields, handle thumbnail copy, `schemaVersion` in index |
| `server/src/routes/catalog.ts` | Add thumbnail route |
| `server/src/routes/health.ts` | Enhance `/version` with schema version + capabilities |
| All `bjorq_asset_wizard/server/src/` mirrors | Same changes |
| `bjorq_asset_wizard/config.yaml` | Version bump |
| `CHANGELOG.md` | Phase 5 entry |
| `bjorq_asset_wizard/README.md`, `DOCS.md` | Updated docs |
| `docs/bjorq-asset-optimizer/API_SPEC.md` | Add schema version fields, thumbnail route, capabilities |
| Version files (package.json ×2, health.ts ×2, index.ts ×2, manager.ts ×2) | `0.5.0` |
| `src/types/api.ts` | Add `schemaVersion` to frontend types |

## Implementation Order

1. Type updates (schema version + metadata fields)
2. Manager: thumbnail copy + new fields in meta.json
3. Catalog thumbnail route
4. Version endpoint enhancement
5. Integration contract doc
6. Version bump + changelog + docs

