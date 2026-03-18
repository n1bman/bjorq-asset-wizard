# Bjorq Asset Wizard

**3D asset processing pipeline, Photo → 3D generation, and asset library server for the Bjorq ecosystem.**

Upload, analyze, optimize, generate, and publish 3D assets (GLB/glTF). The Wizard serves as the asset pipeline backend for the Bjorq Dashboard — assets move through a defined lifecycle and are consumed by the Dashboard only when published.

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
  Photo → Generate → Style → Validate → Scene Check → LOD → Published

LOD Architecture:
  Wizard: prepares + stores LOD variants and metadata
  Dashboard: selects + switches LODs at runtime
  Assets work without LODs — LOD metadata is optional for Dashboard
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

### Photo → 3D Generation

The Wizard can generate stylized 3D assets from 1–4 photos:

1. Upload photos → automatic preprocessing and quality analysis
2. Select style variant (Cozy / Soft Minimal / Warm Wood) and target profile
3. TRELLIS engine generates raw 3D mesh
4. Bjorq style normalization enforces consistent visual identity
5. Quality gate validation with auto-fix escalation
6. Scene compatibility (pivot, floor, scale) auto-correction
7. LOD generation (geometry-only simplification preserving transforms)
8. Automatic category detection
9. Export with full metadata, thumbnails, and LOD variants

All generated assets are dashboard-safe and scene-ready without manual fixing.

### LOD System

LOD (Level of Detail) variants are generated and stored as asset-level metadata:

- **LOD0** — Primary optimized model (full quality)
- **LOD1** — ~50% triangle reduction
- **LOD2** — ~20% triangle reduction

**Key principles:**
- All LOD variants share identical pivot, scale, floor alignment, and orientation
- The Wizard only prepares and stores LODs — it does NOT implement runtime LOD switching
- Runtime LOD selection is the responsibility of the Bjorq Dashboard
- Assets remain fully usable even if Dashboard ignores LOD metadata
- LOD generation is skipped for already very light models (<2000 triangles)

### Dashboard Consumption

The Dashboard connects to the Wizard's library API:

```
GET /libraries                    → List available libraries (currently: "default")
GET /libraries/:library/index     → Full catalog index for a library
GET /assets/:id/meta              → Asset metadata JSON (includes LOD info)
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
        model.glb                   # Optimized 3D model (LOD0)
        model_lod1.glb              # LOD1 variant (if generated)
        model_lod2.glb              # LOD2 variant (if generated)
        meta.json                   # Asset metadata (includes LOD info)
        thumb.webp                  # Preview thumbnail (optional)
  index.json                        # Auto-generated catalog manifest

STORAGE_PATH/                       # /data/storage in HA, ./storage in dev
  jobs/
    <jobId>/
      original.glb                  # Uploaded file
      optimized.glb                 # Pipeline output
      output.glb                    # Generated model (LOD0)
      output_lod1.glb               # Generated LOD1
      output_lod2.glb               # Generated LOD2
      result.json                   # Optimization results
      metadata.json                 # Generation metadata
      thumb.webp                    # Generated thumbnail
```

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
| Photo → 3D generation | ✅ Implemented (v2.2.0+) |
| Style variants (Cozy/Minimal/Wood) | ✅ Implemented (v2.3.0+) |
| Auto category detection | ✅ Implemented (v2.3.0+) |
| LOD generation | ✅ Implemented (v2.3.0+) |
| Asset versioning | ✅ Implemented (v2.3.0+) |
| Style drift detection | ✅ Implemented (v2.3.0+) |
| Scene compatibility | ✅ Implemented (v2.3.0+) |
| Background job queue | ✅ Implemented (v2.3.0+) |
| Pipeline analytics | ✅ Implemented (v2.3.0+) |
| Multi-library support | ⬜ Deferred v1.2.0 |

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
| `POST` | `/generate` | ✅ |
| `GET` | `/generate/jobs/:id` | ✅ |
| `POST` | `/generate/jobs/:id/retry` | ✅ |
| `GET` | `/generate/queue` | ✅ |
| `GET` | `/generate/metrics` | ✅ |
| `GET` | `/trellis/status` | ✅ |
| `POST` | `/trellis/install` | ✅ |
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

## Known Limitations (v2.3.6)

- **Single library only** — all assets go to "default" library. Multi-library requires storage migration (v1.2.0).
- **TRELLIS engine required** — Photo → 3D requires TRELLIS.2 installation via the UI (GPU recommended).
- **LOD runtime switching** — Wizard generates LOD variants but does not implement runtime switching. That is Dashboard's responsibility.
- **No 3D preview in review** — Review shows thumbnails only; interactive 3D preview deferred.

---

## License

Private — All rights reserved.
