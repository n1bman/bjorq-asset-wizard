

# Phase 3 — Wizard UI Completion (v0.3.0)

## Current State

The React UI already exists and is feature-complete:
- **Upload & Analyze** page with drag-drop file upload, analysis results display
- **Optimize** page with full 6-step pipeline (upload → analyze → configure → optimize → review → save)
- **Catalog** page with grid browser, category filters, asset detail drawer
- **Ingest** page for manual catalog entries
- **System Status** page with health, version, connection info
- **Wizard Integration** page for remote wizard connections

The problem: **none of this is served inside Home Assistant**. The Docker image only builds the backend — the Vite frontend is never compiled or included. HA ingress hits `/` and gets JSON.

## Key Challenge: HA Ingress

Home Assistant ingress serves add-on UIs at a dynamic subpath:
```
/api/hassio_ingress/<random_token>/
```

This means:
1. The Vite build must use **relative paths** (not absolute `/`)
2. The React Router must use **`basename`** from the runtime path
3. The API client must derive its base URL from `window.location` (same origin, same path prefix)

## Changes

### 1. Build frontend into Docker image

Update both Dockerfiles to include a Vite build stage:

```text
Stage 1: Build frontend (node:20-alpine)
  → npm ci in root (frontend deps)
  → npx vite build --base="./"
  → outputs to client-dist/

Stage 2: Build backend (existing)
  → npm ci in server/
  → npx tsc
  → outputs to dist/

Stage 3: Production
  → copy dist/ (backend)
  → copy client-dist/ → public/ (frontend)
  → install prod deps
```

### 2. Serve frontend via Fastify

In `server/src/index.ts`:
- Register `@fastify/static` for the built frontend at `public/` directory
- Add a wildcard route that serves `index.html` for SPA client-side routing (all non-API paths)
- Remove the JSON root route (replaced by the SPA)

### 3. Fix API client for HA ingress

Update `src/services/api-client.ts`:
- Auto-detect base URL from `window.location.origin + pathname prefix` instead of hardcoded `localhost:3500`
- When running inside HA ingress (`/api/hassio_ingress/...`), API calls go to the same origin+path
- Keep localStorage override as fallback for standalone/development use

### 4. Fix React Router for subpath

Update `src/main.tsx` or `src/App.tsx`:
- Detect ingress base path from `window.location.pathname`
- Pass `basename` to `BrowserRouter`

### 5. Fix Vite build config

Update `vite.config.ts`:
- Set `base: "./"` for relative asset paths (critical for ingress subpath)

### 6. Sync catalog version with wizard version

In both `server/src/services/catalog/manager.ts` and `bjorq_asset_wizard/server/src/services/catalog/manager.ts`:
- Change `CATALOG_VERSION = "1.0.0"` → read from a shared constant or match wizard version `"0.3.0"`

### 7. Version bump to 0.3.0

Update across all files:
- `server/package.json`, `bjorq_asset_wizard/server/package.json`
- `bjorq_asset_wizard/config.yaml`
- VERSION constants in `index.ts` and `health.ts`
- `CHANGELOG.md`

## Files Changed

| File | Change |
|------|--------|
| `Dockerfile` | Add frontend build stage, copy to `public/` |
| `bjorq_asset_wizard/Dockerfile` | Same frontend build stage |
| `server/src/index.ts` | Serve SPA, wildcard fallback to index.html |
| `bjorq_asset_wizard/server/src/index.ts` | Same |
| `src/services/api-client.ts` | Auto-detect HA ingress base URL |
| `src/App.tsx` | Dynamic `basename` for BrowserRouter |
| `vite.config.ts` | `base: "./"` for relative paths |
| `server/src/services/catalog/manager.ts` | Sync catalog version |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | Same |
| `server/src/routes/health.ts` | Bump VERSION |
| `bjorq_asset_wizard/server/src/routes/health.ts` | Same |
| `server/package.json` | Bump version |
| `bjorq_asset_wizard/server/package.json` | Same |
| `bjorq_asset_wizard/config.yaml` | Bump version |
| `CHANGELOG.md` | Add v0.3.0 entry |

## Expected Result

- HA ingress opens the full Wizard React UI in the sidebar panel
- Upload, analyze, optimize, catalog flows all work from the UI
- API calls route correctly through the ingress proxy
- Catalog version matches wizard version (0.3.0)
- Tag `v0.3.0` triggers a working Docker build with frontend included

