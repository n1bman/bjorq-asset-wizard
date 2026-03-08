# Bjorq Asset Optimizer

A standalone Node.js + TypeScript service that analyzes, optimizes, and catalogs 3D models (`.glb` / `.gltf`) for use in Bjorq's 3D environment.

Designed as an independent microservice with a clear API, ready to be consumed by the Bjorq dashboard and later packaged as a Home Assistant add-on.

---

## Purpose

Bjorq needs high-quality, optimized 3D assets for its smart home visualization. This service provides a safe, automated pipeline to:

- **Analyze** uploaded models (geometry, textures, scale, placement, performance)
- **Optimize** models conservatively (clean, deduplicate, resize textures, normalize)
- **Generate thumbnails** for catalog previews
- **Generate metadata** (`meta.json`) for each asset
- **Manage a curated catalog** with manifest (`index.json`)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5+ |
| HTTP Framework | Fastify |
| 3D Processing | glTF Transform |
| Image Processing | sharp |
| Storage | Local filesystem |
| Logging | pino (via Fastify) |

### Prepared for later

- `gltfpack` / `meshoptimizer` — heavier mesh optimization
- Docker — containerized deployment
- Home Assistant add-on — config + Dockerfile

---

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/bjorq-asset-optimizer.git
cd bjorq-asset-optimizer

# Install
npm install

# Configure
cp .env.example .env

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

The server starts on `http://localhost:3500` by default.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────────────────────────┐
│  Bjorq App  │────▶│  Bjorq Asset Optimizer (Fastify)  │
│  (future)   │     │                                    │
└─────────────┘     │  ┌──────────┐  ┌──────────────┐   │
                    │  │ Analysis │  │ Optimization │   │
                    │  └──────────┘  └──────────────┘   │
                    │  ┌──────────┐  ┌──────────────┐   │
                    │  │Thumbnail │  │  Metadata    │   │
                    │  └──────────┘  └──────────────┘   │
                    │  ┌──────────┐  ┌──────────────┐   │
                    │  │ Catalog  │  │   Storage    │   │
                    │  └──────────┘  └──────────────┘   │
                    └──────────────────────────────────┘
                                    │
                              ┌─────┴─────┐
                              │ Filesystem │
                              └───────────┘
```

### Module Responsibilities

- **Analysis** — Parse glTF/GLB, extract geometry/texture/material stats, estimate scale & placement, rate performance
- **Optimization** — Conservative cleanup: remove empties, unused nodes, cameras, lights, animations; deduplicate materials; resize textures; normalize scale/origin
- **Thumbnail** — Generate preview image (`thumb.webp`) for catalog display
- **Metadata** — Produce `meta.json` with dimensions, placement, HA mapping, performance stats
- **Catalog** — Manage curated asset library with category structure and `index.json` manifest
- **Storage** — Handle file I/O, directory structure, temp files, cleanup

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Analyze a model file |
| `POST` | `/optimize` | Analyze + optimize + thumbnail + metadata |
| `POST` | `/catalog/ingest` | Add optimized asset to catalog |
| `POST` | `/catalog/reindex` | Rebuild `index.json` manifest |
| `GET` | `/catalog/index` | Get catalog manifest |
| `GET` | `/health` | Health check |
| `GET` | `/version` | Version and build info |

See [API_SPEC.md](./API_SPEC.md) for full request/response schemas and examples.

---

## Storage Layout

```
storage/
├── uploads/          # Temporary upload landing
├── jobs/             # Per-job working directories
│   └── <job-id>/
│       ├── original.glb
│       ├── optimized.glb
│       ├── thumb.webp
│       ├── meta.json
│       └── report.json
├── originals/        # Permanent original file archive
├── optimized/        # Permanent optimized files
├── thumbs/           # Permanent thumbnails
└── catalog/          # Curated catalog (see below)
```

---

## Catalog Structure

```
public/catalog/
├── index.json                  # Full manifest
├── furniture/
│   └── sofas/
│       └── nordic-sofa-01/
│           ├── model.glb
│           ├── thumb.webp
│           └── meta.json
├── devices/
│   ├── lights/
│   └── speakers/
│       └── google-home-mini/
│           ├── model.glb
│           ├── thumb.webp
│           └── meta.json
└── decor/
```

---

## Home Assistant Add-on Preparation

The service is designed to be easily containerized:

- All config via environment variables (see `.env.example`)
- Local filesystem persistence (mountable volume)
- Single port HTTP API
- No external service dependencies
- Minimal resource footprint

When ready, add:
- `Dockerfile`
- `config.yaml` (HA add-on manifest)
- `run.sh` (entry point)

---

## Bjorq Integration Flow (Future)

```
Bjorq Import Dialog
  → Upload model to optimizer service
  → POST /analyze (preview results)
  → POST /optimize (run pipeline)
  → Receive: optimized.glb, thumb.webp, meta.json, stats
  → POST /catalog/ingest (optional: save to catalog)
  → Asset available in Bjorq's library
```

---

## V1 Scope

### Included in V1

- ✅ GLB/GLTF analysis (geometry, textures, materials, scale, placement, performance)
- ✅ Conservative optimization (cleanup, dedup, texture resize, normalize)
- ✅ Thumbnail generation (basic V1)
- ✅ Metadata generation (`meta.json`)
- ✅ Catalog ingest + `index.json` manifest
- ✅ RESTful API with all 7 endpoints
- ✅ Local filesystem storage

### NOT in V1 (prepared for later)

- ⬜ Aggressive mesh merging / decimation
- ⬜ `gltfpack` / `meshoptimizer` integration
- ⬜ High-quality rendered thumbnails (3D renderer)
- ⬜ Docker / Home Assistant add-on packaging
- ⬜ Pipeline integration with Bjorq dashboard
- ⬜ Authentication / access control
- ⬜ Remote storage (S3, etc.)

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full phased plan.

---

## License

Private — Bjorq project.
