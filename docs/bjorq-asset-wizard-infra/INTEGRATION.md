# Bjorq — Integration Architecture

How the frontend dashboard, backend wizard, Docker container, and Home Assistant add-on fit together.

---

## Architecture

```
┌──────────────────────┐         ┌──────────────────────────────┐
│  Bjorq Dashboard     │  HTTP   │  Bjorq Asset Wizard          │
│  (React / Vite)      │────────▶│  (Node.js / Fastify)         │
│                      │         │                              │
│  - Wizard Integration│         │  - /analyze                  │
│  - Catalog Browser   │         │  - /optimize                 │
│  - Asset Detail      │         │  - /catalog/ingest           │
│  - Upload & Analyze  │         │  - /catalog/index            │
│  - Optimize Pipeline │         │  - /health, /version         │
└──────────────────────┘         └──────────────────────────────┘
        │                                     │
        │ Published as                        │ Deployed as
        │ static site                         │
        ▼                                     ▼
   Any static host
   (Vercel, Netlify, etc.)
```

## Repositories

| Repo | Contents | Status |
|------|----------|--------|
| `bjorq-dashboard` (this repo) | React frontend, Wizard Integration UI, mock data | ✅ Implemented |
| `bjorq-asset-wizard` (separate) | Node.js backend, Fastify API, glTF Transform | 🔧 In progress |

---

## Component Status

### ✅ Implemented

| Component | Location | Notes |
|-----------|----------|-------|
| Dashboard UI | `src/` | Full React app with routing, catalog, wizard integration |
| Wizard Integration page | `src/pages/WizardIntegration.tsx` | Connection settings, status, catalog browser |
| Wizard API client | `src/services/wizard-client.ts` | HTTP client with mock fallback |
| Mock data | `src/services/wizard-mock-data.ts` | Realistic test data for offline dev |
| API type definitions | `src/types/api.ts` | Full request/response types |
| API specification | `docs/bjorq-asset-optimizer/API_SPEC.md` | Endpoint schemas |

### 🔧 Scaffolded (Ready to Use)

| Component | Location | Notes |
|-----------|----------|-------|
| CI workflow | `docs/bjorq-asset-wizard-infra/github-actions/ci.yml` | Install, lint, typecheck, test, build |
| Docker workflow | `docs/bjorq-asset-wizard-infra/github-actions/docker.yml` | Multi-arch build on release tags |
| Release workflow | `docs/bjorq-asset-wizard-infra/github-actions/release.yml` | Manual semver release |
| Dockerfile | `docs/bjorq-asset-wizard-infra/docker/Dockerfile` | Multi-stage Node 20 Alpine |
| docker-compose | `docs/bjorq-asset-wizard-infra/docker/docker-compose.yml` | Local dev with volumes |
| HA add-on config | `docs/bjorq-asset-wizard-infra/ha-addon/config.yaml` | Manifest with options schema |
| HA entry point | `docs/bjorq-asset-wizard-infra/ha-addon/run.sh` | bashio options → env vars |
| HA documentation | `docs/bjorq-asset-wizard-infra/ha-addon/DOCS.md` | User-facing docs |
| TypeScript config | `docs/bjorq-asset-wizard-infra/repo/tsconfig.json` | ES2022, NodeNext |
| Backend .gitignore | `docs/bjorq-asset-wizard-infra/repo/.gitignore` | storage, dist, .env |
| env.example | `docs/bjorq-asset-optimizer/env.example` | All config variables |

### ⬜ Still To Be Implemented

| Component | Where | Notes |
|-----------|-------|-------|
| Backend API server | `bjorq-asset-wizard` repo | Fastify routes, middleware |
| Analysis engine | `bjorq-asset-wizard` repo | glTF Transform parsing |
| Optimization pipeline | `bjorq-asset-wizard` repo | Cleanup, dedup, texture resize |
| Thumbnail generator | `bjorq-asset-wizard` repo | Sharp-based rendering |
| Metadata generator | `bjorq-asset-wizard` repo | meta.json output |
| Catalog manager | `bjorq-asset-wizard` repo | index.json, file organization |
| HA add-on icon/logo | `bjorq-asset-wizard` repo | 256×256 PNG assets |
| HA ingress support | `bjorq-asset-wizard` repo | Reverse proxy headers |
| Authentication | Future | API keys or HA auth integration |

---

## Connection Flow

```
1. User opens Dashboard → Wizard Integration
2. Enters Wizard URL (default: http://localhost:3500)
3. Dashboard calls GET /health to verify connection
4. On success: catalog browser loads via GET /catalog/index
5. User can browse, inspect, and import assets
6. Upload/optimize flows use POST /analyze and POST /optimize
```

## Deployment Scenarios

### Local Development
- Dashboard: `npm run dev` (Vite, port 5173)
- Wizard: `npm run dev` (Fastify, port 3500)
- Dashboard connects to `http://localhost:3500`

### Docker
- Wizard runs in container, port 3500 exposed
- Dashboard connects to `http://<docker-host>:3500`
- Storage persisted via Docker volumes

### Home Assistant Add-on
- Wizard runs as HA add-on, port 3500
- Dashboard connects to `http://<ha-ip>:3500`
- Storage persisted under `/data/`
- Config managed via HA add-on options UI

---

## Environment Variables

See `docs/bjorq-asset-optimizer/env.example` for the full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3500` | API listen port |
| `STORAGE_PATH` | `./storage` | File storage root |
| `CATALOG_PATH` | `./public/catalog` | Catalog output dir |
| `MAX_FILE_SIZE_MB` | `100` | Upload size limit |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
