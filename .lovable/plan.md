

# v1.1.9 — Final Runtime Fixes

Complete plan covering all four blockers from live HA testing.

---

## 1. Large model 413 error

**Root cause:** HA ingress Nginx proxy rejects uploads exceeding its `client_max_body_size` before reaching Fastify. Returns HTML 413.

**Fix:**
- `bjorq_asset_wizard/run.sh` line 48: Change `exec node /app/dist/index.js` to `exec node --max-old-space-size=1024 /app/dist/index.js`
- `bjorq_asset_wizard/config.yaml` line 21: Change `3500/tcp: null` to `3500/tcp: 3500` — port exposed by default, bypassing ingress for large uploads
- `src/services/api-client.ts`: In both fetch error path (line 128-130) and XHR error path (line 179-181), detect 413 specifically and show: "File rejected by HA proxy (size limit). Use direct port 3500 instead of ingress for files over 10 MB."
- `src/pages/UploadAnalyze.tsx`: Add a yellow info banner when selected file is >10 MB warning about ingress size limits

| File | Change |
|------|--------|
| `bjorq_asset_wizard/run.sh` | `--max-old-space-size=1024` |
| `bjorq_asset_wizard/config.yaml` | Default port 3500 exposed |
| `src/services/api-client.ts` | Specific 413 proxy message |
| `src/pages/UploadAnalyze.tsx` | Size warning for >10 MB files |

---

## 2. Thumbnail generation

**Requirement:** Generate a normal `thumb.webp` image per asset during optimization. No 3D rendering. This is the final thumbnail solution.

**Implementation:** New `server/src/services/optimization/thumbnail.ts` using `sharp` to create a branded info card (dark background, asset name, triangle count, file size). Called from `server/src/routes/optimize.ts` after optimization succeeds, writes `thumb.webp` to job directory. The existing `ingestAsset()` already copies `thumb.webp` from job dir to catalog.

| File | Change |
|------|--------|
| `server/src/services/optimization/thumbnail.ts` | New — generate info-card thumbnail with sharp |
| `server/src/routes/optimize.ts` | Call thumbnail generator, write thumb.webp |
| `bjorq_asset_wizard/server/src/services/optimization/thumbnail.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/optimize.ts` | Mirror |

---

## 3. Dashboard asset flow

**Problem:** Dashboard connects successfully but assets don't appear. Dashboard expects `/libraries` and `/assets/:id/*` endpoints.

**Current state:** These endpoints already exist in `server/src/routes/catalog.ts` (lines 296-394). The routes are registered and the SPA fallback in `server/src/index.ts` line 180-181 already excludes `/libraries` and `/assets/` from the fallback.

**Root cause to verify:** The catalog route VERSION constant on line 40 is still `"1.1.7"` — needs bump. But more importantly, the Dashboard may expect a specific response shape. The `/libraries` endpoint returns `{ libraries: [...] }` and `/libraries/default/index` returns the full catalog index.

**Fix:** Bump VERSION in catalog.ts. Simplify `WizardSettingsCard.tsx` to show ONE recommended method only (direct port), removing Method B to reduce confusion.

| File | Change |
|------|--------|
| `server/src/routes/catalog.ts` | Version bump line 40 |
| `bjorq_asset_wizard/server/src/routes/catalog.ts` | Mirror |
| `src/components/wizard/WizardSettingsCard.tsx` | Single method, remove Method B |

---

## 4. Storage persistence

**Root cause:** Job outputs in `/data/storage/jobs/` are cleaned every 6 hours (retention: 24h in HA config). Only assets ingested into `/data/catalog/` are permanent. The disappeared model was likely a non-ingested job.

**Fix:** Add "save to keep" warning in `StatsComparison.tsx`. Update `StorageStatusCard.tsx` with clear lifecycle.

| File | Change |
|------|--------|
| `src/components/optimize/StatsComparison.tsx` | Add temporary result warning |
| `src/components/system/StorageStatusCard.tsx` | Clear lifecycle documentation |

---

## 5. Version bump to 1.1.9

| File | Line | Current | New |
|------|------|---------|-----|
| `package.json` | 4 | 1.1.8 | 1.1.9 |
| `server/package.json` | 3 | 1.1.8 | 1.1.9 |
| `server/src/index.ts` | 42 | 1.1.8 | 1.1.9 |
| `server/src/routes/health.ts` | 12 | 1.1.8 | 1.1.9 |
| `server/src/routes/catalog.ts` | 40 | 1.1.7 | 1.1.9 |
| `bjorq_asset_wizard/config.yaml` | 7 | 1.1.8 | 1.1.9 |
| `bjorq_asset_wizard/server/package.json` | 3 | 1.1.8 | 1.1.9 |
| `bjorq_asset_wizard/server/src/index.ts` | 42 | 1.1.8 | 1.1.9 |
| `bjorq_asset_wizard/server/src/routes/health.ts` | 12 | 1.1.8 | 1.1.9 |
| `bjorq_asset_wizard/server/src/routes/catalog.ts` | — | 1.1.7 | 1.1.9 |
| `CHANGELOG.md` | top | — | 1.1.9 entry |

---

## All files changed

| File | Change |
|------|--------|
| `bjorq_asset_wizard/run.sh` | `--max-old-space-size=1024` |
| `bjorq_asset_wizard/config.yaml` | Port 3500 default + version |
| `src/services/api-client.ts` | Specific 413 proxy error message |
| `src/pages/UploadAnalyze.tsx` | Ingress size warning |
| `server/src/services/optimization/thumbnail.ts` | New — thumbnail generator |
| `server/src/routes/optimize.ts` | Call thumbnail generator |
| `server/src/routes/catalog.ts` | Version bump |
| `src/components/wizard/WizardSettingsCard.tsx` | Single connection method |
| `src/components/optimize/StatsComparison.tsx` | Temporary result warning |
| `src/components/system/StorageStatusCard.tsx` | Storage lifecycle docs |
| All version surfaces | 1.1.9 |
| `CHANGELOG.md` | 1.1.9 entry |
| + mirrors in `bjorq_asset_wizard/server/` | |

## What to verify after deployment

1. Upload 15-20 MB GLB via direct port 3500 — should succeed
2. Upload same via ingress — should show clear 413 message suggesting port 3500
3. After optimize, check job dir for `thumb.webp`
4. After ingest, verify thumbnail in catalog card
5. Connect Dashboard to `http://<ha-ip>:3500` — verify `/libraries` returns assets
6. Restart add-on — verify catalog assets persist

