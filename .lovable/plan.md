

# Live-Test Readiness Pass

## Issues Found

### Backend

1. **Health endpoint too minimal** — Returns only `{ status: "ok" }`. Frontend `HealthStatus` component expects `uptime`, `timestamp`, `storage.path`, `storage.writable`. The mock fills these but real backend doesn't, so System Status page shows incomplete data when connected.

2. **Version endpoint too minimal** — Returns `name`, `version`, `node`, `uptime`. Frontend `VersionResponse` type expects `typescript` and `environment` fields.

3. **No static file serving for job outputs** — Optimize response returns paths like `/jobs/<jobId>/optimized.glb` but there's no route to serve these files. `@fastify/static` is in dependencies but never registered. Users can't download optimized models.

4. **Catalog model paths not served** — Same issue for catalog assets at `/catalog/<category>/<sub>/<id>/model.glb`.

5. **`index.ts` comment says "route stubs return 501"** — outdated, misleading for alpha testers reading logs/code.

6. **`ha-addon/run.sh` still creates hardcoded category dirs** (`furniture`, `devices`, `decor`) — minor inconsistency with dynamic categories, but harmless. Keep as-is.

7. **`init-storage` script in package.json** still creates hardcoded category dirs — same, keep as-is.

### Frontend

8. **Catalog empty state** — When real backend returns 0 assets, the page shows category filter + empty grid with no helpful message. Should show an empty state card.

9. **`useApi` hook doesn't distinguish error types** — Real API errors (422, 400) and connection failures both show as generic error strings. Acceptable for alpha but worth noting.

10. **Optimize "Save to Catalog" button** — Currently just advances to "done" step without actually calling ingest. Users will think they saved but nothing happened.

11. **Optimize "Sync to Bjorq" button** — Calls 501 stub, will fail. Should be disabled/hidden until sync is implemented.

### Documentation

12. **README** needs a "First Live Test" section with step-by-step verification instructions.

## Plan

### 1. `server/src/routes/health.ts` — Enrich health/version responses

- `/health`: Add `uptime`, `timestamp`, and storage writable check (try writing a temp file to `STORAGE_PATH`)
- `/version`: Add `environment: process.env.NODE_ENV`, `typescript: "5.7"` (or omit gracefully)

### 2. `server/src/index.ts` — Register static file serving + update comment

- Register `@fastify/static` to serve `STORAGE_PATH` under `/jobs/` prefix (for optimized model downloads)
- Register a second static route for `CATALOG_PATH` under `/catalog/files/` prefix (for catalog model downloads)
- Update the file header comment to reflect current implementation status

### 3. `src/pages/Catalog.tsx` — Add empty state and error state

- When `catalog.totalAssets === 0`: Show a card saying "No assets in catalog yet. Use Optimize → Ingest to add your first asset."
- When `useApi` returns an error: Show an error card with the message

### 4. `src/pages/Optimize.tsx` — Fix Save button + disable Sync

- "Save to Catalog" button: Call `ingestAsset()` with the optimize result metadata and jobId, then advance to done step on success
- "Sync to Bjorq" button: Disable with tooltip "Sync not yet available" — don't let users hit a 501

### 5. `README.md` — Add "First Live Test" section

Add a concise section covering:
- How to start backend (`cd server && npm install && npm run dev`)
- How to start frontend (`npm install && npm run dev`)
- How to use Docker (`docker compose up -d`)
- Step-by-step verification: health check → analyze → optimize → ingest → browse catalog
- Where to check logs
- Known limitations (no sync, no thumbnails, no conversion)

### 6. `server/src/index.ts` — Minor: update outdated header comment

## Files Changed

| File | Change |
|------|--------|
| `server/src/routes/health.ts` | Enrich `/health` and `/version` responses |
| `server/src/index.ts` | Register `@fastify/static` for file serving, update comment |
| `src/pages/Catalog.tsx` | Empty state + error state |
| `src/pages/Optimize.tsx` | Wire Save button to real ingest, disable Sync |
| `README.md` | Add First Live Test guide |

## Not Changed (intentionally)

- HA add-on `run.sh` — hardcoded dirs are harmless, keep for compatibility
- Docker `Dockerfile` — already correct for production
- No new features, no redesign, no sync implementation

