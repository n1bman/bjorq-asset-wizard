

# Monorepo Restructure — Backend Scaffolding, CI/CD, Docker, HA Add-on

## Overview

Transform the repository into a monorepo containing both the existing frontend and a scaffolded backend service. Move infrastructure files from `docs/bjorq-asset-wizard-infra/` to their real locations. Add backend route stubs. Update all documentation.

## Structure After Changes

```text
bjorq-asset-wizard/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Frontend + backend CI
│       ├── docker.yml          # Docker build on tags
│       └── release.yml         # Manual release
├── server/
│   ├── src/
│   │   ├── index.ts            # Fastify entry point (stub)
│   │   ├── routes/
│   │   │   ├── health.ts       # GET /health, GET /version
│   │   │   ├── analyze.ts      # POST /analyze (stub)
│   │   │   ├── optimize.ts     # POST /optimize (stub)
│   │   │   ├── catalog.ts      # GET /catalog/index, POST /catalog/ingest, POST /catalog/reindex (stubs)
│   │   │   ├── sync.ts         # POST /sync (stub)
│   │   │   └── import.ts       # POST /import/direct, POST /import/convert (stubs)
│   │   └── lib/
│   │       └── storage.ts      # Storage path helpers (stub)
│   ├── package.json            # Backend deps (fastify, sharp, @gltf-transform/*)
│   ├── tsconfig.json           # Backend TS config
│   └── .env.example            # Backend env vars
├── src/                        # Frontend (unchanged)
├── docs/                       # Documentation (updated)
├── Dockerfile                  # Production multi-stage build (backend)
├── .dockerignore               # Docker build excludes
├── docker-compose.yml          # Local dev (backend + frontend)
├── ha-addon/                   # HA add-on packaging
│   ├── config.yaml
│   ├── run.sh
│   └── DOCS.md
├── package.json                # Frontend package.json (unchanged)
├── vite.config.ts              # Frontend (unchanged)
└── README.md                   # Updated
```

## Detailed Changes

### 1. Backend Scaffolding — `server/`

**`server/package.json`** — Node.js package with Fastify, sharp, @gltf-transform deps listed (not installed in Lovable). Scripts: `dev`, `build`, `start`, `lint`, `test`.

**`server/tsconfig.json`** — ES2022, NodeNext module resolution, outDir `dist/`.

**`server/.env.example`** — Copied from existing `docs/bjorq-asset-optimizer/env.example`.

**`server/src/index.ts`** — Fastify server stub. Registers routes, reads env, listens on PORT. Includes a clear "TODO: implement" comment structure. Actually runnable with just health endpoint returning `{ status: "ok" }`.

**`server/src/routes/health.ts`** — Working GET /health and GET /version routes.

**`server/src/routes/analyze.ts`** — POST /analyze stub returning 501 "Not yet implemented".

**`server/src/routes/optimize.ts`** — POST /optimize stub returning 501.

**`server/src/routes/catalog.ts`** — GET /catalog/index, POST /catalog/ingest, POST /catalog/reindex stubs.

**`server/src/routes/sync.ts`** — POST /sync stub.

**`server/src/routes/import.ts`** — POST /import/direct, POST /import/convert stubs.

**`server/src/lib/storage.ts`** — Storage path helper reading STORAGE_PATH and CATALOG_PATH from env. Init function to create directories.

All stubs return proper HTTP status codes and typed JSON. No fake processing logic.

### 2. GitHub Actions — `.github/workflows/`

Move and adapt from `docs/bjorq-asset-wizard-infra/github-actions/`:

**`ci.yml`** — Two jobs: `frontend` (install, lint, build, test in root) and `backend` (install, lint, build in `server/`). Matrix: Node 20, 22.

**`docker.yml`** — Build on version tags, push to GHCR. Context is root, builds backend Dockerfile.

**`release.yml`** — Manual dispatch, semver tag, GitHub release creation.

### 3. Docker — Root Level

**`Dockerfile`** — Multi-stage build targeting `server/`. Stage 1: install + build backend. Stage 2: production Alpine image with sharp. Adapted from existing scaffolding.

**`.dockerignore`** — Exclude src/ (frontend), node_modules, .git, docs, tests.

**`docker-compose.yml`** — Backend service on port 3500 with volume mounts for storage/catalog. Adapted from existing scaffolding.

### 4. HA Add-on — `ha-addon/`

Move from `docs/bjorq-asset-wizard-infra/ha-addon/` to root-level `ha-addon/`:

- `config.yaml` — unchanged
- `run.sh` — unchanged  
- `DOCS.md` — unchanged

### 5. Documentation Updates

**`README.md`** — Update to reflect monorepo structure. Add sections for backend development, Docker usage, CI/CD, HA add-on. Keep frontend sections intact.

**`docs/HANDBOOK.md`** — Add backend section explaining server/ structure, route stubs, how to implement endpoints.

**`docs/bjorq-asset-wizard-infra/README.md`** — Update to note files have been moved to their real locations. Keep as historical reference or remove redirect.

**`docs/bjorq-asset-wizard-infra/INTEGRATION.md`** — Update repo description from "separate repo" to "monorepo".

### 6. .gitignore Update

Add backend-specific entries: `server/dist/`, `server/node_modules/`, `storage/`, `.env`.

### 7. What Does NOT Change

- All files under `src/` (frontend) — untouched
- `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — untouched
- Root `package.json` — untouched (frontend deps)
- `docs/bjorq-asset-optimizer/` — untouched (API spec, roadmap, structure docs)
- Existing contexts, services, components, pages — untouched

## File Count

| Action | Count |
|--------|-------|
| New files | ~18 (server/*, .github/*, Dockerfile, docker-compose.yml, .dockerignore, ha-addon/*) |
| Modified files | 4 (README.md, .gitignore, HANDBOOK.md, INTEGRATION.md) |
| Moved/superseded | 6 (docs/bjorq-asset-wizard-infra/ files now live at real paths) |
| Frontend changes | 0 |

