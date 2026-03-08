# Bjorq Asset Wizard — Developer Handbook

Practical reference for developing and extending the Bjorq Asset Wizard.

---

## Project Purpose

Bjorq Asset Wizard is a dashboard for managing 3D assets in the Bjorq ecosystem. It provides a pipeline UI for uploading, analyzing, optimizing, and cataloging GLB/glTF models. The frontend is designed to work standalone (with mock data) and to connect to a backend service for real processing.

---

## Repository Structure

This is a monorepo containing both the frontend dashboard and backend service scaffolding.

```
bjorq-asset-wizard/
├── src/                        # Frontend (React + Vite)
│   ├── pages/                  # Route-level page components
│   ├── components/             # UI components by domain
│   ├── contexts/               # React context providers
│   ├── services/               # API client, service functions, mock data
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript type definitions
│   ├── lib/                    # Utilities
│   └── assets/                 # Static assets (logo, etc.)
├── server/                     # Backend (Node.js + Fastify) — scaffolded
│   ├── src/
│   │   ├── index.ts            # Fastify entry point
│   │   ├── routes/             # Route handlers (stubs)
│   │   └── lib/                # Storage helpers, utilities
│   ├── package.json            # Backend dependencies
│   ├── tsconfig.json           # Backend TypeScript config
│   └── .env.example            # Environment variable reference
├── .github/workflows/          # CI, Docker, release workflows
├── bjorq_asset_wizard/          # Home Assistant add-on (self-contained)
├── Dockerfile                  # Backend production container
├── docker-compose.yml          # Local development
├── package.json                # Frontend dependencies
└── docs/                       # Documentation
```

---

## Pages

| Page | Route | File | Purpose |
|------|-------|------|---------|
| Upload & Analyze | `/` | `UploadAnalyze.tsx` | Upload a GLB/glTF file, view analysis results |
| Optimize | `/optimize` | `Optimize.tsx` | Multi-step optimization pipeline |
| Catalog Browse | `/catalog` | `Catalog.tsx` | Browse cataloged assets with filters |
| Asset Detail | `/catalog/:id` | `AssetDetail.tsx` | Full asset metadata and actions |
| Catalog Ingest | `/ingest` | `CatalogIngest.tsx` | Add new assets to the catalog |
| System Status | `/system` | `SystemStatus.tsx` | Backend health, version, storage stats |
| Wizard Integration | `/wizard` | `WizardIntegration.tsx` | Connect to remote Bjorq Wizard instance |
| Not Found | `*` | `NotFound.tsx` | 404 page |

---

## API Client Architecture

### Three-layer design

1. **`api-client.ts`** — Singleton `ApiClient` class
   - Manages base URL (stored in `localStorage` as `bjorq_api_base_url`)
   - Default: `http://localhost:3500`
   - Provides `request<T>(path, opts)` with timeout and error handling
   - Provides `checkConnection()` for health checks
   - Emits connection status changes via `subscribe()`

2. **`api.ts`** — Service functions
   - Each function (e.g., `analyzeModel`, `getCatalogIndex`) wraps a call with `withFallback()`
   - `withFallback(apiFn, mockFn)` tries the real API first, falls back to mock data on network error
   - Real API errors (non-zero status codes) are NOT masked — they propagate to the caller
   - Only connection failures trigger the fallback

3. **`mock-data.ts`** — Static mock responses
   - Realistic data matching the API type definitions
   - Used automatically when the backend is offline
   - No special setup needed — just don't run the backend

### Adding a new endpoint

```typescript
// 1. Add types to src/types/api.ts
export interface NewResponse { ... }

// 2. Add mock data to src/services/mock-data.ts
export const mockNew: NewResponse = { ... };

// 3. Add service function to src/services/api.ts
export async function getNew(): Promise<NewResponse> {
  const { data } = await withFallback(
    () => apiClient.request<NewResponse>("/new-endpoint"),
    () => mockNew,
  );
  return data;
}
```

---

## ConnectionContext

Wraps the app and provides:

- `isConnected` — whether the backend is reachable
- `isMockMode` — whether the app is using fallback data
- `status` — `"connected" | "disconnected" | "checking"`
- `latency` — last measured response time

The context checks the backend on mount and periodically. When disconnected, a banner appears in the header: "Backend offline — using demo data".

---

## WizardContext

Manages the connection to a remote Bjorq Asset Wizard instance (separate from the local backend). Used by the Wizard Integration page to browse and import assets from another Wizard deployment.

---

## Status Badges

Assets carry multiple status fields, each rendered as a badge:

| Badge | Field | Values |
|-------|-------|--------|
| `SourceBadge` | `source` | `local`, `remote`, `imported` |
| `SyncDot` | `syncStatus` | `synced`, `pending`, `error`, `unsynced` |
| `OptimizationBadge` | `optimizationStatus` | `optimized`, `unoptimized`, `in_progress`, `failed` |
| `IngestBadge` | `ingestStatus` | `ingested`, `pending`, `error` |
| `ImportTypeBadge` | `importType` | `direct-upload`, `converted-project`, `catalog`, `synced` |
| `ConversionBadge` | `conversionStatus` | `not_converted`, `converting`, `converted`, `error` |

All badge components are in `src/components/catalog/AssetStatusBadge.tsx`.

---

## How the Backend Should Plug In

1. Run the backend service on port 3500 (or any port)
2. The frontend auto-detects the backend via `GET /health`
3. If the health check returns `{ "status": "ok" }`, the UI switches from mock mode to live mode
4. All API calls start hitting real endpoints instead of mock data
5. No frontend code changes are needed

The backend URL can be changed in the Wizard Integration settings page or by setting `bjorq_api_base_url` in `localStorage`.

---

## Backend Development

### Structure

The backend lives in `server/` with its own `package.json`, `tsconfig.json`, and `src/` directory.

```
server/src/
├── index.ts            # Fastify entry point — registers plugins and routes
├── routes/
│   ├── health.ts       # GET /health, GET /version (✅ implemented)
│   ├── analyze.ts      # POST /analyze (stub — returns 501)
│   ├── optimize.ts     # POST /optimize (stub — returns 501)
│   ├── catalog.ts      # GET /catalog/index, POST /catalog/ingest, POST /catalog/reindex (stubs)
│   ├── sync.ts         # POST /sync (stub)
│   └── import.ts       # POST /import/direct, POST /import/convert (stubs)
└── lib/
    └── storage.ts      # Storage path helpers and directory initialization
```

### Getting started

```bash
cd server
npm install
npm run dev    # Starts with tsx watch on port 3500
```

### Implementing an endpoint

Each route file exports an async function that registers Fastify routes. To implement a stub:

1. Replace the 501 response with actual logic
2. Use `@gltf-transform/core` for GLB/glTF parsing (listed as optional dependency)
3. Use `sharp` for thumbnail generation
4. Follow the response schemas in `docs/bjorq-asset-optimizer/API_SPEC.md`
5. The frontend will automatically use real responses when the backend is running

### Docker

```bash
# Build the backend container
docker build -t bjorq-asset-wizard .

# Run with persistent storage
docker run -p 3500:3500 -v wizard-data:/app/storage bjorq-asset-wizard

# Or use docker-compose for local development
docker compose up -d
```

### CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — Runs lint, typecheck, build, and test for both frontend and backend
- `docker.yml` — Builds and pushes Docker image on version tags (v*)
- `release.yml` — Manual workflow to create semver tags and GitHub releases

### Home Assistant Add-on

The `bjorq_asset_wizard/` directory contains the complete add-on package:
- `config.yaml` — Add-on manifest with options schema
- `build.yaml` — Architecture-specific base images for HA builder
- `Dockerfile` — Multi-stage build (compiles TypeScript, bundles frontend)
- `run.sh` — Entry point that maps HA options to environment variables
- `DOCS.md` — User-facing documentation
- `prepare-addon.sh` — Stages `server/` source into the add-on directory before build

The add-on uses the same Docker image with HA-specific storage paths (`/data/storage`, `/data/catalog`).

#### Wizard vs Dashboard packaging

The **Wizard** add-on builds locally from `Dockerfile` + `build.yaml` — HA's Supervisor compiles the image on the host. The **Dashboard** add-on uses a prebuilt `image:` field pointing to a container registry. Because Wizard is built locally, it is more sensitive to HA's repository cache: the Supervisor may keep using a stale snapshot of `config.yaml` and `Dockerfile` even after the GitHub repo is updated. See "Troubleshooting: HA Shows Wrong Version" below for the required refresh steps.

---

## Logging

The backend uses **pino** (built into Fastify) for structured logging.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error`, `fatal` |
| `LOG_FILE` | _(empty)_ | Optional file path for persistent log output (JSON format) |

- **Development**: Pretty-printed colored output to stdout (via `pino-pretty`)
- **Production**: Structured JSON to stdout (and to `LOG_FILE` if set)

### Log file locations

| Environment | Recommended `LOG_FILE` |
|-------------|----------------------|
| Local dev | `./storage/logs/wizard.log` |
| Docker | `/app/storage/logs/wizard.log` (set in `docker-compose.yml`) |
| HA add-on | `/data/storage/logs/wizard.log` (set automatically in `run.sh`) |

### Request logging

All requests are logged automatically via Fastify's `onResponse` hook with:
- `method`, `url`, `statusCode`, `responseTime` (ms)

### Job tracing

Pipeline operations (analyze, optimize, ingest) should use scoped child loggers with a unique `jobId`:

```typescript
import { createJobLogger, generateJobId } from "../lib/logger.js";

const jobId = generateJobId();
const log = createJobLogger(request.log, jobId, "analyze");

log.info({ fileName: "model.glb" }, "Starting analysis");
// All entries include { jobId: "abc-123", jobType: "analyze" }
log.info({ meshCount: 12 }, "Analysis complete");
```

Filter logs by job: `cat wizard.log | grep '"jobId":"abc-123"'`

### Error handling

- Route errors → caught by `setErrorHandler`, logged with full stack trace
- Uncaught exceptions / unhandled rejections → logged as `fatal`, process exits

---

## Conventions

### Do

- Use semantic Tailwind tokens from `index.css` (e.g., `text-foreground`, `bg-muted`) — never hardcode colors
- Add new API endpoints through the three-layer pattern (types → mock → service function)
- Keep components small and focused — one responsibility per file
- Use the `useApi` hook for simple fetch-on-mount patterns
- Add loading, error, and empty states to all data-dependent views

### Don't

- Don't modify `src/components/ui/` files directly — these are shadcn/ui components managed by the CLI
- Don't remove the `withFallback` pattern — it ensures the app works offline
- Don't hardcode the backend URL — always use `apiClient.baseUrl`
- Don't add backend logic to the frontend — this is a pure client-side app
- Don't change the catalog structure (`model.glb`, `thumb.webp`, `meta.json`) — it's a shared contract with the backend

---

## Import Paths

### Direct Import (implemented)

User uploads a GLB/glTF file → analysis → optimization → catalog ingest. This is the standard flow and works end-to-end (with mock data when offline).

### Conversion Import (UI prepared, backend pending)

User uploads a larger project file (SketchUp, IFC, OBJ, FBX) → backend converts to GLB → standard pipeline. The UI shows a "coming soon" panel for this path. The `POST /import/convert` endpoint stub exists in both `api.ts` and `server/src/routes/import.ts` but requires the backend implementation.

---

## Troubleshooting: HA Shows Wrong Version

If Home Assistant still shows an old version or reports "dockerfile is missing", the Supervisor is reading a stale cached snapshot:

1. **Settings → Add-ons → Add-on Store** → ⋮ → **Repositories** → remove the repo URL
2. Click **Reload** in the Add-on Store
3. Re-add the repository URL
4. Verify the correct version appears before installing
5. If still stale: **Settings → System → Restart** (Supervisor or Core)

---

## What Should NOT Be Changed

- **Catalog format** — `model.glb` / `thumb.webp` / `meta.json` structure is a contract between frontend and backend
- **API client architecture** — the three-layer pattern (client → service → mock) is intentional
- **Route structure** — page routes map to sidebar navigation and should stay stable
- **shadcn/ui components** — modify via variants and composition, not by editing the base files
- **ConnectionContext pattern** — the auto-detection and fallback behavior is core to the offline-first UX
