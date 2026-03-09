

# v1.1.7 — Stabilization Patch

Based on the live testing document, here are the 7 issues and the plan for each.

---

## 1. Larger models fail during analyze

**Root cause:** The frontend `UPLOAD_TIMEOUT` is 5 min and backend `requestTimeout` is 5 min, but the Fastify `multipart` plugin has a `fileSize` limit of 100 MB which is correct. The real issue is likely that `file.toBuffer()` loads the entire file into memory, and glTF Transform parsing doubles or triples the memory footprint. For a 16.5 MB GLB, this should work — the failure is more likely a timeout or the error message being swallowed.

**Investigation needed:** The `ApiClient.request()` XHR path correctly parses `body.error` and `body.stage` from the response. However, if the backend crashes or the connection drops, the XHR `onerror` fires with generic "Backend unreachable". The `withFallback()` in `api.ts` then catches non-ApiError exceptions and falls back to mock data silently — masking the real failure.

**Fix:**
- **Backend**: Add explicit memory guard — if file > 50 MB, log a warning. Add try/catch around `analyzeModel` that catches OOM-like errors and returns structured 507.
- **Frontend**: The `withFallback()` function currently masks real connection drops as mock data. For `/analyze`, this is wrong — a timeout during analysis should show the error, not fall back to mock. Change `analyzeModel()` and `optimizeModel()` to NOT use `withFallback()` — call `apiClient.request()` directly so errors always propagate.

**Files:**
- `src/services/api.ts` — Remove `withFallback` wrapper from `analyzeModel` and `optimizeModel`
- `server/src/routes/analyze.ts` — Already has good error handling, minor logging improvements
- Mirror in `bjorq_asset_wizard/server/`

---

## 2. Export/Download button does not work

**Root cause:** `handleExport` uses `window.open(getAssetModelUrl(asset.id), "_blank")`. Inside HA panel/ingress, `window.open` with `_blank` may be blocked or open in a new tab that lacks the ingress session. The MIME type `model/gltf-binary` is not recognized by browsers for download.

**Fix:** Replace `window.open()` with a programmatic blob-download approach:
1. `fetch()` the export URL
2. Create a blob URL
3. Create an `<a>` element with `download` attribute
4. Click it programmatically

Use the `/catalog/asset/:id/export` endpoint which already sets `Content-Disposition: attachment`.

**Files:**
- `src/lib/asset-paths.ts` — Add `getAssetExportUrl()` helper
- `src/components/catalog/AssetDetailDrawer.tsx` — Replace `window.open` with blob download
- `src/pages/AssetDetail.tsx` — Same fix

---

## 3. Delete/remove asset

**Root cause:** No delete endpoint exists. No delete button in UI.

**Fix:**
- **Backend:** Add `DELETE /catalog/asset/:id` endpoint that:
  1. Finds asset path via `findAssetPath()`
  2. Removes the directory recursively
  3. Triggers `reindexCatalog()`
  4. Returns `{ success: true, deleted: id }`
- **Backend catalog manager:** Add `deleteAsset(id)` function using `rm(path, { recursive: true })`
- **Frontend:** Add delete button with `Trash2` icon to drawer and detail page
- **Frontend:** Add confirmation dialog (AlertDialog) before deletion
- **Frontend API:** Add `deleteAsset(id)` service function

**Files:**
- `server/src/routes/catalog.ts` — Add DELETE endpoint
- `server/src/services/catalog/manager.ts` — Add `deleteAsset()` function
- `server/src/index.ts` — Add `/catalog/asset/` to notFoundHandler API prefix check
- `src/services/api.ts` — Add `deleteAsset()` function
- `src/components/catalog/AssetDetailDrawer.tsx` — Add delete button + AlertDialog
- `src/pages/AssetDetail.tsx` — Add delete button + AlertDialog
- Mirror backend files in `bjorq_asset_wizard/server/`

---

## 4. Wizard Integration page black screen

**Root cause:** `WizardContext.tsx` was deleted but `WizardCatalogBrowser` and `WizardSettingsCard` now use `useConnection` which is fine. The `WizardCatalogBrowser` calls `getCatalogIndex()` on mount which uses `withFallback` — if the backend is unreachable AND mock fallback fails, there's no error boundary catching it. However, App.tsx shows the route is correctly set up. More likely the issue is that `WizardCatalogBrowser` has `const { isConnected: _isConnected } = useConnection()` — it imports the connection status but doesn't use it, and fetches catalog regardless. If the fetch fails silently, the page renders but shows nothing useful.

**Fix:**
- Add an error state to `WizardCatalogBrowser` so fetch failures show an error message instead of empty/broken state
- Wrap `WizardIntegration` page content in `PreviewErrorBoundary` for safety
- Add a "Dashboard Sync URL" help section to `WizardSettingsCard` showing the correct Wizard API URL the Dashboard should connect to

**Files:**
- `src/components/wizard/WizardCatalogBrowser.tsx` — Add error handling state
- `src/pages/WizardIntegration.tsx` — Wrap in error boundary
- `src/components/wizard/WizardSettingsCard.tsx` — Add Dashboard sync URL guidance

---

## 5. System Status wording improvements

**Root cause:** Status page shows "Connected" and "Writable" and "1 asset" which is accurate for Wizard health but misleading — users think this means Dashboard sync is active.

**Fix:** Update labels and add clarifying text:
- "Wizard Backend: Connected" (not just "Connected")
- Add note: "This shows Wizard internal health. Dashboard sync requires separate configuration."
- Show catalog asset count with label "Published assets in library"

**Files:**
- `src/components/system/ConnectionCard.tsx` — Clarify label
- `src/components/system/CatalogStatusCard.tsx` — Clarify "Total Assets" → "Published Assets"
- `src/components/system/HealthStatus.tsx` — Minor label update

---

## 6. Dashboard sync URL guidance

**Fix:** Add a dedicated card/section in `WizardSettingsCard` that displays:
- "Dashboard should connect to: `<current baseUrl>`"
- List of available endpoints: `/libraries`, `/assets/:id/meta`, `/assets/:id/model`
- Copy-to-clipboard button for the URL

**Files:**
- `src/components/wizard/WizardSettingsCard.tsx` — Add "Dashboard Integration" section

---

## 7. Version consistency

**Root cause:** `CatalogStatusCard` shows `catalog.version` which comes from `CATALOG_VERSION = "1.1.0"` in `manager.ts`, while the app version is `1.1.6`. These are different concepts but displayed without context.

**Fix:**
- Update `CATALOG_VERSION` in `manager.ts` to match app version (`1.1.7`)
- In `CatalogStatusCard`, label it "Catalog Schema" or remove it to avoid confusion
- Bump all version surfaces to `1.1.7`

**Files:**
- `server/src/services/catalog/manager.ts` — Update CATALOG_VERSION
- `server/src/index.ts` — VERSION = "1.1.7"
- `server/src/routes/health.ts` — VERSION = "1.1.7"
- `server/src/routes/catalog.ts` — VERSION update
- `server/package.json` — 1.1.7
- `bjorq_asset_wizard/server/package.json` — 1.1.7
- `bjorq_asset_wizard/config.yaml` — 1.1.7
- `package.json` — 1.1.7
- `CHANGELOG.md` — v1.1.7 entry
- Mirror all backend files
- `src/components/system/CatalogStatusCard.tsx` — Label change

---

## Summary of all files to modify

**Frontend:**
| File | Changes |
|------|---------|
| `src/services/api.ts` | Remove withFallback from analyze/optimize, add deleteAsset |
| `src/lib/asset-paths.ts` | Add getAssetExportUrl, add downloadAsset helper |
| `src/components/catalog/AssetDetailDrawer.tsx` | Blob download, delete button + dialog |
| `src/pages/AssetDetail.tsx` | Blob download, delete button + dialog |
| `src/components/wizard/WizardCatalogBrowser.tsx` | Error state handling |
| `src/components/wizard/WizardSettingsCard.tsx` | Dashboard sync URL guidance |
| `src/pages/WizardIntegration.tsx` | Error boundary wrapper |
| `src/components/system/ConnectionCard.tsx` | Clarify labels |
| `src/components/system/CatalogStatusCard.tsx` | Label and version display fix |
| `src/components/system/HealthStatus.tsx` | Label tweak |

**Backend (server/ + bjorq_asset_wizard/server/):**
| File | Changes |
|------|---------|
| `routes/catalog.ts` | DELETE endpoint |
| `services/catalog/manager.ts` | deleteAsset function, CATALOG_VERSION bump |
| `index.ts` | VERSION bump |
| `routes/health.ts` | VERSION bump |
| `package.json` | Version bump |

**Root:**
| File | Changes |
|------|---------|
| `package.json` | Version 1.1.7 |
| `CHANGELOG.md` | v1.1.7 entry |
| `bjorq_asset_wizard/config.yaml` | Version 1.1.7 |

