# Bjorq Asset Wizard

**3D asset processing pipeline and asset library server for the Bjorq ecosystem.**

Upload, analyze, optimize, and publish 3D assets (GLB/glTF). The Wizard serves as the asset pipeline backend for the Bjorq Dashboard — assets move through a defined lifecycle and are consumed by the Dashboard only when published.

---

## Architecture

```
Dashboard ──── reads ────→ Wizard Library API
                              │
                              ├─ GET /libraries
                              ├─ GET /libraries/:lib/index
                              ├─ GET /assets/:id/meta
                              ├─ GET /assets/:id/model
                              └─ GET /assets/:id/thumbnail

Wizard Pipeline:
  Upload → Analyze → Optimize → Ingest → Published
                                            │
                                            └── Available to Dashboard
```

The Dashboard should only consume **published** assets via the library API. It never accesses internal storage paths directly.

### Asset Lifecycle

Every asset progresses through explicit states:

| State | Meaning |
|-------|---------|
| `uploaded` | Raw file received, not yet processed |
| `analyzed` | Geometry, textures, bounding box extracted |
| `optimized` | Pipeline applied (cleanup, texture resize, normalization) |
| `published` | Ingested to catalog and available to Dashboard |

Assets in the catalog are `published` by definition. The `lifecycleStatus` field in `meta.json` tracks this.

### Dashboard Consumption

The Dashboard connects to the Wizard's library API:

```
GET /libraries                    → List available libraries (currently: "default")
GET /libraries/:library/index     → Full catalog index for a library
GET /assets/:id/meta              → Asset metadata JSON
GET /assets/:id/model             → GLB binary stream
GET /assets/:id/thumbnail         → WebP thumbnail stream
```

Sync (`POST /sync`) confirms assets are published and updates `syncStatus` / `lastSyncedAt` in metadata.

---

## Storage Layout (v1 Canonical)

```
CATALOG_PATH/                       # /data/catalog in HA, ./public/catalog in dev
  <category>/
    <subcategory>/
      <assetId>/
        model.glb                   # Optimized 3D model
        meta.json                   # Asset metadata (frozen schema v1.0)
        thumb.webp                  # Preview thumbnail (optional)
  index.json                        # Auto-generated catalog manifest

STORAGE_PATH/                       # /data/storage in HA, ./storage in dev
  jobs/
    <jobId>/
      original.glb                  # Uploaded file
      optimized.glb                 # Pipeline output
      result.json                   # Optimization results
      thumb.webp                    # Generated thumbnail (if available)
```

**v1.2.0 migration note:** Multi-library support will restructure storage to `/data/libraries/<name>/assets/...`. The current flat catalog layout is documented as the v1 canonical model.

---

## Project Status

| Component | Status |
|-----------|--------|
| Upload & Analyze | ✅ Working |
| Optimize pipeline (V2) | ✅ Working |
| Catalog ingest | ✅ Working |
| Catalog browser | ✅ Working |
| Asset actions (Optimize, Ingest, Export, Sync) | ✅ Wired |
| Dashboard library API | ✅ Implemented |
| Sync (publish confirmation) | ✅ Implemented |
| Asset export (GLB download) | ✅ Implemented |
| Asset lifecycle status | ✅ Implemented |
| Multi-library support | ⬜ Deferred v1.2.0 |
| Library ZIP export/import | ⬜ Deferred v1.2.0 |
| Server-side thumbnail generation | ⬜ Deferred v1.2.0 |
| 3D model viewer (React Three Fiber) | ⬜ Deferred v1.2.0 |
| Backup system | ⬜ Deferred v1.2.0 |

---

## Backend API

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/health` | ✅ |
| `GET` | `/version` | ✅ |
| `POST` | `/analyze` | ✅ |
| `POST` | `/optimize` | ✅ |
| `GET` | `/catalog/index` | ✅ |
| `POST` | `/catalog/ingest` | ✅ |
| `POST` | `/catalog/reindex` | ✅ |
| `GET` | `/catalog/policy` | ✅ |
| `GET` | `/catalog/asset/:id/model` | ✅ |
| `GET` | `/catalog/asset/:id/thumbnail` | ✅ |
| `GET` | `/catalog/asset/:id/export` | ✅ |
| `GET` | `/catalog/diagnostics` | ✅ |
| `POST` | `/sync` | ✅ |
| `GET` | `/libraries` | ✅ |
| `GET` | `/libraries/:library/index` | ✅ |
| `GET` | `/assets/:id/meta` | ✅ |
| `GET` | `/assets/:id/model` | ✅ |
| `GET` | `/assets/:id/thumbnail` | ✅ |
| `POST` | `/import/direct` | 🔧 Stub |
| `POST` | `/import/convert` | 🔧 Stub |

---

## Quick Start

### Frontend

```bash
npm install
npm run dev          # Vite dev server on port 8080
```

### Backend

```bash
cd server
npm install
npm run dev          # Fastify on port 3500
```

### Docker

```bash
docker compose up -d
```

---

## Home Assistant Add-on

1. **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add: `https://github.com/n1bman/bjorq-asset-wizard`
3. Install **Bjorq Asset Wizard**

Storage persists under `/data/`. The add-on runs with ingress support.

---

## Known Limitations (v1.1.5)

- **Single library only** — all assets go to "default" library. Multi-library requires storage migration (v1.2.0).
- **No server-side thumbnail generation** — thumbnails are `null` unless manually provided or generated externally.
- **Export is model-only** — no ZIP package with metadata/thumbnail yet (v1.2.0).
- **No backup system** — snapshots/restore deferred to v1.2.0.
- **No 3D model viewer** — preview is thumbnail-only; React Three Fiber viewer deferred to v1.2.0.

---

## License

Private — All rights reserved.
