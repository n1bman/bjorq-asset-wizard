

# Implement Real Catalog Backend + Frontend Wiring

## Overview

Replace the three 501 catalog stubs with working endpoints that persist assets to disk and serve a real catalog index. Wire the existing Catalog Browse and Ingest frontend pages to the real backend with mock fallback.

## Backend Changes

### 1. `server/src/services/catalog/manager.ts` (new)

Catalog management service with three functions:

- **`buildCatalogIndex()`** — Scan `CATALOG_PATH` directory tree (`<category>/<subcategory>/<assetId>/meta.json`), read each `meta.json`, group by category/subcategory, return a `CatalogIndex` object. If no assets exist, return an empty but valid index.

- **`ingestAsset(meta, jobId?)`** — Copy optimized outputs from `storage/jobs/<jobId>/` into catalog structure at `CATALOG_PATH/<category>/<subcategory>/<assetId>/`. Write `model.glb` (copied from `optimized.glb`), write `meta.json` (from provided metadata + performance stats from job result.json). If the target directory already exists, append `-2`, `-3` suffix to avoid overwriting. After ingest, call `buildCatalogIndex()` to regenerate.

- **`reindexCatalog()`** — Thin wrapper that calls `buildCatalogIndex()` and writes `index.json` to `CATALOG_PATH/index.json`.

### 2. `server/src/types/catalog.ts` (new)

Backend-local types for catalog index and ingest request/response, mirroring the frontend `CatalogIndex`, `IngestMeta`, `IngestResponse` types.

### 3. `server/src/routes/catalog.ts` (rewrite)

Replace all three 501 stubs:

**GET /catalog/index**
- Call `buildCatalogIndex()`
- Return the CatalogIndex JSON

**POST /catalog/ingest**
- Parse multipart: `meta` (JSON string), optional `file`, optional `thumbnail`, optional `jobId`
- Validate: meta must have `id`, `name`, `category`
- If `jobId` provided: locate `storage/jobs/<jobId>/optimized.glb` and `result.json`; copy model + merge metadata
- If `file` provided instead: use the uploaded file directly
- Call `ingestAsset()` to write to catalog structure
- Return `IngestResponse` with final path and files
- Use job logger for tracing

**POST /catalog/reindex**
- Call `reindexCatalog()`
- Return success with stats (total assets, category counts)

### 4. `server/src/lib/storage.ts` (minor update)

Remove hardcoded `CATALOG_PATH` subdirs (`furniture`, `devices`, `decor`) from `REQUIRED_DIRS` — categories are now dynamic based on ingest. Keep `CATALOG_PATH` itself.

### 5. `server/package.json` — no changes needed

Already has all required dependencies.

## Frontend Changes

### 6. `src/services/api.ts` — no changes needed

Already wired: `getCatalogIndex()`, `ingestAsset()`, `reindexCatalog()` all use `withFallback` and call the real endpoints. They will automatically work once the backend returns real data instead of 501.

### 7. `src/pages/Catalog.tsx` — no changes needed

Already calls `getCatalogIndex()` via `useApi` hook, renders categories/assets. Will show real data once backend is live, mock when offline.

### 8. `src/components/ingest/IngestForm.tsx` — minor enhancement

Already functional. Add a small success detail section that shows the returned `catalogEntry.path` and `catalogEntry.files` after successful ingest, so users can see where the asset was placed.

### 9. `README.md` — update Project Status table

Update the status table:
- **Backend engine**: Change from "Not started" to show analyze ✅, optimize ✅, catalog ✅, sync ⬜

## Catalog Storage Structure

```text
public/catalog/
  index.json                          (auto-generated manifest)
  furniture/
    sofas/
      nordic-sofa/
        model.glb
        meta.json
  devices/
    speakers/
      google-home-mini/
        model.glb
        meta.json
```

## Collision Avoidance

- Each asset gets a unique directory: `<category>/<subcategory>/<assetId>/`
- If `<assetId>` dir already exists, append `-2`, `-3`, etc.
- The final resolved ID is returned in the response

## Summary of Changes

| File | Action |
|------|--------|
| `server/src/services/catalog/manager.ts` | New — catalog scan, ingest, reindex |
| `server/src/types/catalog.ts` | New — backend catalog types |
| `server/src/routes/catalog.ts` | Rewrite — replace 501 stubs |
| `server/src/lib/storage.ts` | Minor — remove hardcoded category dirs |
| `src/components/ingest/IngestForm.tsx` | Minor — show ingest result details |
| `README.md` | Update status table |

