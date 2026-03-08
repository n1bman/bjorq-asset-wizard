# Bjorq Asset Wizard

**3D asset optimization dashboard and backend service for the Bjorq ecosystem.**

A monorepo containing a React frontend dashboard and a Node.js backend service for analyzing, optimizing, cataloging, and managing 3D assets (GLB/glTF). The dashboard provides a complete pipeline UI — from file upload through optimization to catalog ingest — and connects to the backend service for processing.

---

## Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend dashboard** | ✅ Complete | All views, routing, mock fallback, API client |
| **Backend scaffolding** | 🔧 Scaffolded | Fastify server, storage helpers |
| **CI/CD** | 🔧 Scaffolded | GitHub Actions for lint, build, test, Docker |
| **Docker** | 🔧 Scaffolded | Dockerfile, docker-compose, .dockerignore |
| **HA add-on** | 🔧 Scaffolded | config.yaml, run.sh, DOCS.md |
| **Backend: Analyze** | ✅ Implemented | Real GLB/glTF analysis via gltf-transform |
| **Backend: Optimize** | ✅ Implemented | V1 conservative cleanup pipeline |
| **Backend: Catalog** | ✅ Implemented | Browse, ingest, reindex with persistent storage |
| **Backend: Sync** | ⬜ Not started | Dashboard sync to Bjorq/HA |

### What "Scaffolded" Means

Route stubs exist and return HTTP 501 with descriptive messages. The server starts, responds to `/health` and `/version`, and is ready for real endpoint implementation. No fake processing logic.

### Mock / Demo Fallback

When the backend is unreachable, all frontend API calls automatically fall back to realistic mock data. A banner in the header indicates demo mode.

---

## Repository Structure

```
bjorq-asset-wizard/
├── src/                        # Frontend (React + Vite + TypeScript)
├── server/                     # Backend (Node.js + Fastify + TypeScript)
│   ├── src/
│   │   ├── index.ts            # Fastify entry point
│   │   ├── routes/             # Route handlers
│   │   └── lib/                # Storage helpers
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .github/workflows/          # CI, Docker build, release
├── bjorq_asset_wizard/          # Home Assistant add-on (self-contained)
├── Dockerfile                  # Backend production container
├── docker-compose.yml          # Local dev (backend)
├── package.json                # Frontend dependencies
└── docs/                       # Documentation
```

---

## Quick Start

### Frontend (dashboard)

```bash
npm install
npm run dev          # Vite dev server on port 8080
```

The frontend works standalone with mock data — no backend needed.

### Backend (when implementing)

```bash
cd server
npm install
npm run dev          # Fastify on port 3500 (tsx watch)
```

### Docker

```bash
docker compose up -d    # Backend on port 3500
```

---

## Architecture

```
┌──────────────────────┐         ┌──────────────────────────────┐
│  Bjorq Dashboard     │  HTTP   │  Bjorq Asset Wizard Backend  │
│  (React / Vite)      │────────▶│  (Node.js / Fastify)         │
│                      │         │                              │
│  - Upload & Analyze  │         │  - POST /analyze             │
│  - Optimize Pipeline │         │  - POST /optimize            │
│  - Catalog Browser   │         │  - GET  /catalog/index       │
│  - Catalog Ingest    │         │  - POST /catalog/ingest      │
│  - System Status     │         │  - GET  /health, /version    │
│  - Wizard Integration│         │  - POST /sync                │
└──────────────────────┘         └──────────────────────────────┘
        │                                     │
        │ Static site                         │ Docker container
        │ (any host)                          │ or HA add-on
        ▼                                     ▼
   Vercel / Netlify /              Docker / Home Assistant
   any static host                 add-on (port 3500)
```

### Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, React Query, Recharts

**Backend:** Node.js 20, TypeScript, Fastify, sharp, @gltf-transform/* (scaffolded)

---

## Frontend Features

| Feature | Status |
|---------|--------|
| Upload & Analyze page | ✅ Complete |
| Optimize pipeline (multi-step) | ✅ Complete |
| Catalog browser with filters | ✅ Complete |
| Catalog ingest form | ✅ Complete |
| Asset detail page | ✅ Complete |
| System status dashboard | ✅ Complete |
| Wizard integration (remote connection) | ✅ Complete |
| Import type selector | ✅ UI ready |
| API client with mock fallback | ✅ Complete |
| Status badges (source, sync, optimization, ingest) | ✅ Complete |

---

## Backend Route Status

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/health` | ✅ Implemented |
| `GET` | `/version` | ✅ Implemented |
| `POST` | `/analyze` | ✅ Implemented |
| `POST` | `/optimize` | ✅ Implemented |
| `GET` | `/catalog/index` | ✅ Implemented |
| `POST` | `/catalog/ingest` | ✅ Implemented |
| `POST` | `/catalog/reindex` | ✅ Implemented |
| `POST` | `/sync` | 🔧 Stub (501) |
| `POST` | `/import/direct` | 🔧 Stub (501) |
| `POST` | `/import/convert` | 🔧 Stub (501) |

See `docs/bjorq-asset-optimizer/API_SPEC.md` for full request/response schemas.

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | Push/PR to main | Lint, typecheck, build, test (frontend + backend) |
| `docker.yml` | Version tags (v*) | Multi-arch Docker build, push to GHCR |
| `release.yml` | Manual dispatch | Create semver tag + GitHub release |

---

## Docker

```bash
# Build
docker build -t bjorq-asset-wizard .

# Run with persistent storage
docker run -p 3500:3500 \
  -v wizard-storage:/app/storage \
  -v wizard-catalog:/app/public/catalog \
  bjorq-asset-wizard

# Local development
docker compose up -d
```

### Storage

All runtime data is stored under configurable paths:

| Path | Default | Contents |
|------|---------|----------|
| `STORAGE_PATH` | `./storage` | Uploads, jobs, originals, optimized, thumbnails |
| `CATALOG_PATH` | `./public/catalog` | Final catalog output (furniture/, devices/, decor/) |

---

## Home Assistant Add-on

This repository is a valid Home Assistant add-on repository. To install:

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click **⋮ → Repositories**
3. Add: `https://github.com/n1bman/bjorq-asset-wizard`
4. Find **Bjorq Asset Wizard** in the store and click **Install**

The add-on runs the backend service with ingress support (sidebar panel). Configuration is managed through the HA UI. Storage persists under `/data/`.

### Add-on Build (for development)

The HA add-on builder uses `bjorq_asset_wizard/` as the build context. Since server source lives in `server/`, run the prepare script first:

```bash
chmod +x bjorq_asset_wizard/prepare-addon.sh
./bjorq_asset_wizard/prepare-addon.sh
```

This copies `server/` into the add-on directory for the Docker build. The `bjorq_asset_wizard/server/` copy is gitignored.

> **Legacy:** The `ha-addon/` directory contains the original scaffolding and is kept as reference.

---

## Catalog Format

```
catalog/
  furniture/
    seating/
      modern-chair/
        model.glb          # Optimized 3D model
        thumb.webp         # Preview thumbnail
        meta.json          # Asset metadata
```

---

## Environment Variables

See `server/.env.example` for the full list. The frontend connects to the backend via a configurable URL stored in `localStorage` (default: `http://localhost:3500`).

---

## Documentation

| Document | Description |
|----------|-------------|
| `docs/HANDBOOK.md` | Developer handbook — architecture, conventions, extension guide |
| `docs/bjorq-asset-optimizer/API_SPEC.md` | Full API specification |
| `docs/bjorq-asset-optimizer/README.md` | Backend service design document |
| `docs/bjorq-asset-optimizer/ROADMAP.md` | Feature roadmap |
| `docs/bjorq-asset-optimizer/STRUCTURE.md` | Catalog structure specification |
| `docs/bjorq-asset-optimizer/UI_README.md` | UI component reference |
| `docs/bjorq-asset-wizard-infra/INTEGRATION.md` | Integration architecture |

---

## License

Private — All rights reserved.
