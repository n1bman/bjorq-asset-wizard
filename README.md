# Bjorq Asset Wizard

**3D asset optimization dashboard for the Bjorq ecosystem.**

Bjorq Asset Wizard is a React-based frontend application for analyzing, optimizing, cataloging, and managing 3D assets (GLB/glTF). It provides a complete pipeline UI — from file upload through optimization to catalog ingest — and is designed to connect to a dedicated backend service for processing.

> **Current status:** The frontend dashboard is fully implemented with an API-ready architecture. All views work standalone using mock/demo data when the backend is unavailable. The backend service is the next implementation phase.

---

## What's Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Upload & Analyze page | ✅ Complete | File upload, analysis results, performance badges |
| Optimize pipeline | ✅ Complete | Multi-step stepper, configuration options, stats comparison |
| Catalog browser | ✅ Complete | Grid view, category filters, asset detail drawer |
| Catalog ingest | ✅ Complete | Metadata form, file attachment, ingest submission |
| Asset detail page | ✅ Complete | Full metadata display, pipeline status, action buttons |
| System status | ✅ Complete | Health check, version info, connection status, storage stats |
| Wizard integration | ✅ Complete | Remote wizard connection settings, status widget, catalog browser |
| Import type selector | ✅ UI ready | Direct GLB/glTF upload works; conversion path prepared (coming soon) |
| API client with fallback | ✅ Complete | Auto-falls back to mock data when backend is offline |
| Status badges | ✅ Complete | Source, sync, optimization, ingest, import type, conversion |

### Mock / Demo Fallback

When the backend is unreachable, all API calls automatically fall back to realistic mock data. A banner in the header indicates demo mode. This allows full UI development and testing without running the backend.

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
        │ Static site                         │ Deployed as
        │ (any host)                          │ Docker container
        │                                     │ or HA add-on
        ▼                                     ▼
   Vercel / Netlify /              Docker / Home Assistant
   any static host                 add-on (port 3500)
```

### Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Component library (Radix UI primitives)
- **React Router** — Client-side routing
- **React Query** — Server state management (available, used selectively)
- **Recharts** — Data visualization

---

## Local Development

```sh
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

The frontend connects to the backend via a configurable base URL stored in `localStorage`. The default is `http://localhost:3500`.

| Variable | Default | Description |
|----------|---------|-------------|
| API Base URL | `http://localhost:3500` | Configured in Wizard Integration settings or via `localStorage` key `bjorq_api_base_url` |

No `.env` file is needed for the frontend — the backend URL is set through the UI.

---

## Catalog Concept

Assets in the Bjorq catalog follow a standardized format:

```
catalog/
  furniture/
    seating/
      modern-chair/
        model.glb          # Optimized 3D model
        thumb.webp         # Preview thumbnail
        meta.json          # Asset metadata
```

Each asset has metadata including dimensions, triangle count, material count, file size, placement rules, and optional Home Assistant entity mappings.

### Import Paths

1. **Direct Import** (implemented) — Upload GLB/glTF files directly for analysis and optimization
2. **Conversion Import** (UI prepared, backend pending) — Upload larger project formats (SketchUp, IFC, OBJ, FBX) for automatic conversion to GLB before entering the pipeline

Both paths produce the same standardized catalog output.

---

## API Endpoints

The frontend expects these backend endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/analyze` | Analyze uploaded 3D model (FormData) |
| `POST` | `/optimize` | Optimize model with options (FormData) |
| `GET` | `/catalog/index` | Get full catalog index |
| `POST` | `/catalog/ingest` | Ingest asset into catalog (FormData) |
| `POST` | `/catalog/reindex` | Rebuild catalog index |
| `POST` | `/sync` | Sync assets to Bjorq Dashboard |
| `GET` | `/health` | Health check (returns `{ status: "ok" }`) |
| `GET` | `/version` | Version info |
| `POST` | `/import/convert` | Convert project file to GLB (future) |

See `docs/bjorq-asset-optimizer/API_SPEC.md` for full request/response schemas.

---

## Future: Home Assistant Add-on

The backend is designed to run as a Home Assistant add-on, allowing users to manage 3D assets for their smart home visualization directly from the HA interface. Infrastructure scaffolding (Dockerfile, HA add-on config, CI workflows) is available in `docs/bjorq-asset-wizard-infra/`.

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
| `docs/bjorq-asset-wizard-infra/README.md` | Infrastructure overview |
| `docs/bjorq-asset-wizard-infra/INTEGRATION.md` | Integration architecture |

---

## License

Private — All rights reserved.
