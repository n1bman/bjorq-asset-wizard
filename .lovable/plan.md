

# v1.1.8 — Runtime Stabilization

## Root Causes Identified

### Issue 1: Large model analyze failure
**Root cause:** The HA ingress proxy intercepts backend error responses and returns HTML error pages. The `api-client.ts` XHR handler at line 164 does `JSON.parse(xhr.responseText)` inside the error branch's try/catch — when the response is HTML (not JSON), this silently fails and produces the generic "Request failed" message. The `fetch` path (line 124) has the same problem: `res.json().catch(...)` falls back to `res.statusText`.

Additionally, the network logs confirm this: requests to `/health` and `/version` currently return HTML (the SPA index.html) instead of JSON — meaning the Vite dev server is catching all routes. In production (HA), the Fastify backend would handle these, but if the backend process crashes mid-analyze (memory spike from glTF Transform on a 15 MB file), the HA ingress proxy returns its own HTML error page.

**Fix:**
- In `api-client.ts`: Detect HTML responses before attempting JSON parse. Check `Content-Type` header — if not `application/json`, create a descriptive error instead of "Request failed".
- In `api-client.ts` XHR path: Same HTML detection.
- In `UploadAnalyze.tsx`: Already correctly shows `ApiError.message` — once the client surfaces the real error, this will work.

### Issue 2: Wizard Integration page crash — `Cannot read properties of undefined (reading 'width')`
**Root cause found:** `WizardAssetCard.tsx` lines 35 and 39:
```
asset.performance.triangles    // no optional chaining
asset.dimensions.width         // no optional chaining
```
And `WizardAssetDetail.tsx` lines 68-78:
```
asset.dimensions.width.toFixed(2)   // no optional chaining
asset.dimensions.depth.toFixed(2)
asset.dimensions.height.toFixed(2)
```

The `AssetMetadata` type declares `dimensions` and `performance` as required, but real catalog `meta.json` files from the ingest pipeline may not include these fields (e.g., if no bounding box was computed). When a real asset lacks `dimensions`, accessing `.width` crashes.

**Fix:** Add optional chaining and fallback values in both `WizardAssetCard.tsx` and `WizardAssetDetail.tsx`. Also make `dimensions` and `performance` optional in the `AssetMetadata` type to match reality.

### Issue 3: Dashboard cannot connect using ingress URL
**Root cause:** HA ingress URLs require browser session cookies — they are not usable as external API endpoints. The Dashboard runs at a separate origin and cannot authenticate via ingress.

**Correct architecture:** The Wizard add-on config already declares `ports: 3500/tcp: null`. Setting this to a real port (e.g., `3500`) in HA add-on config exposes the API directly on the host network, bypassing ingress. Alternatively, Dashboard can use the HA Supervisor API as a proxy: `GET /api/hassio/addons/bjorq_asset_wizard/proxy/...` with a Long-Lived Access Token.

**Fix:** Update `WizardSettingsCard.tsx` to show both connection methods with clear explanation. Update `README.md` with the Dashboard integration architecture.

### Issue 4: Storage location
**Confirmed from `run.sh` and `config.yaml`:**
- `STORAGE_PATH=/data/storage` — jobs, uploads, originals, optimized files
- `CATALOG_PATH=/data/catalog` — published asset library
- `config.yaml` maps `share:rw` and `media:rw`
- The `/data` directory is the HA add-on persistent data directory — survives restarts, add-on reinstalls, and HA upgrades
- System Status shows `/storage` because in dev mode `STORAGE_PATH` defaults to `./storage`

**Fix:** Update `HealthStatus` / `ConnectionCard` to clarify this. Document in README.

---

## Changes

### 1. Fix HTML response detection in api-client.ts

In `request()` fetch path (line 123-126): Check `Content-Type` before parsing JSON. If response is HTML, throw `ApiError` with message like "Backend returned non-JSON response (possible proxy error)".

In `_requestWithProgress()` XHR path (lines 152-168): Same check — inspect `xhr.getResponseHeader('Content-Type')` before `JSON.parse`.

### 2. Fix WizardAssetCard.tsx crash

Lines 35, 38-39: Add optional chaining:
```typescript
{((asset.performance?.triangles ?? 0) / 1000).toFixed(1)}k
{asset.dimensions?.width?.toFixed(2) ?? "?"} × {asset.dimensions?.height?.toFixed(2) ?? "?"}m
```

### 3. Fix WizardAssetDetail.tsx crash

Lines 66-78: Add optional chaining on all dimension accesses. Wrap the Dimensions section in a conditional: only render if `asset.dimensions` exists. Same for `performance`.

### 4. Make dimensions/performance optional in AssetMetadata

In `src/types/api.ts` lines 174-189: Change `dimensions` and `performance` from required to optional (`?:`).

### 5. Update WizardSettingsCard.tsx — Dashboard integration guidance

Replace current "copy this URL" guidance with two methods:
- **Method A: Direct port** — Enable port 3500 in add-on config, use `http://<ha-host>:3500`
- **Method B: Supervisor proxy** — Use `http://<ha-host>:8123/api/hassio/addons/bjorq_asset_wizard/proxy/` with Long-Lived Access Token

### 6. Document storage architecture

Add a note in `ConnectionCard.tsx` or `HealthStatus.tsx`: "In HA, assets are stored in /data (persistent add-on storage). Survives restarts and upgrades."

### 7. Version bump to 1.1.8

All version surfaces.

---

## Files

| File | Change |
|------|--------|
| `src/services/api-client.ts` | HTML response detection in both fetch and XHR paths |
| `src/components/wizard/WizardAssetCard.tsx` | Optional chaining on dimensions/performance |
| `src/components/wizard/WizardAssetDetail.tsx` | Optional chaining, conditional render |
| `src/types/api.ts` | Make dimensions/performance optional |
| `src/components/wizard/WizardSettingsCard.tsx` | Dashboard connection methods |
| `src/components/system/StorageStatusCard.tsx` | Persistence note |
| `server/src/index.ts` | VERSION bump |
| `server/src/routes/health.ts` | VERSION bump |
| `server/package.json` | Version bump |
| `bjorq_asset_wizard/server/src/index.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/health.ts` | Mirror |
| `bjorq_asset_wizard/server/package.json` | Mirror |
| `bjorq_asset_wizard/config.yaml` | Version bump |
| `package.json` | Version bump |
| `CHANGELOG.md` | v1.1.8 entry |
| `README.md` | Storage + Dashboard integration docs |

