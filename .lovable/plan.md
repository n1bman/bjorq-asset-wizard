

# v1.1.5 — Systems Repair & Architecture Hardening

## Assessment

**What actually works:**
- Upload, analyze, optimize, ingest pipeline is wired end-to-end in backend
- Catalog scanning, indexing, and model/thumbnail serving endpoints exist
- Ingress detection works in `apiClient`

**What is broken:**
1. **WizardClient still exists** (`wizard-client.ts`) with hardcoded `localhost:3500`, used by `WizardContext.tsx` which is mounted in `App.tsx` — causes failed `/health` polls every 30s
2. **Drawer action buttons are decorative** — Optimize, Ingest, Export have no `onClick` handlers (lines 205-213 in `AssetDetailDrawer.tsx`, lines 238-249 in `AssetDetail.tsx`)
3. **POST /sync returns 501** — stub only
4. **No asset lifecycle state** — metadata has `source`, `syncStatus`, `ingestStatus`, `optimizationStatus` fields but no explicit `"published"` concept
5. **No Dashboard-facing library API** — no `/libraries`, no `/assets/:id/meta`
6. **No export endpoint** — no way to download asset packages
7. **README is stale** — still says "Sync: Not started", doesn't describe asset lifecycle or Dashboard consumption

**Storage assessment:**
The current `CATALOG_PATH/<cat>/<sub>/<id>/` structure is adequate for v1 single-library use. It correctly stores `model.glb`, `meta.json`, `thumb.webp`. However, it hardcodes a single catalog root with no library namespace, making future multi-library support require a migration. The plan below introduces library-aware API contracts while keeping the current storage layout, documenting the migration path for v1.2.0.

---

## Changes

### 1. Delete WizardClient entirely

**Delete:** `src/services/wizard-client.ts`

**Rewrite:** `src/contexts/WizardContext.tsx` — Remove entirely. It duplicates `ConnectionContext` and causes `localhost:3500` polling.

**Update:** `src/App.tsx` — Remove `WizardProvider` wrapper and `WizardContext` import.

**Update:** `src/pages/WizardIntegration.tsx` — Already uses `useConnection` via sub-components. Remove any residual `useWizard` references.

### 2. Wire all drawer action buttons

**Files:** `src/components/catalog/AssetDetailDrawer.tsx`, `src/pages/AssetDetail.tsx`

- **Export**: Download model GLB via `window.open(getAssetModelUrl(asset.id))` — immediate working download
- **Optimize**: Toast "Asset already optimized" if `optimizationStatus === "optimized"`, otherwise navigate to `/optimize`
- **Ingest**: Toast "Asset already ingested" if `ingestStatus === "ingested"`
- **Sync**: Already wired — keep as-is but update to call new publish endpoint

### 3. Add asset lifecycle type and "published" concept

**File:** `src/types/api.ts`

Add:
```typescript
export type AssetLifecycleStatus = "uploaded" | "analyzed" | "optimized" | "published";
```

Add `lifecycleStatus?: AssetLifecycleStatus` to `AssetMetadata`.

**File:** `server/src/services/catalog/manager.ts` (+ mirror)

Set `lifecycleStatus: "published"` on ingest. Assets in the catalog are by definition published.

### 4. Implement POST /sync as publish confirmation

**File:** `server/src/routes/sync.ts` (+ mirror)

Replace 501 stub:
- Accept `{ assetIds: string[] }`
- For each ID, verify asset exists in catalog via `findAssetPath()`
- Update `meta.json` to set `syncStatus: "synced"`, `lastSyncedAt: now`
- Return `{ success, synced, failed, timestamp, results: [{ id, status }] }`

### 5. Add Dashboard-facing library endpoints

**File:** `server/src/routes/catalog.ts` (+ mirror)

Add three new routes:

```
GET /libraries
→ [{ id: "default", name: "Default Library", assetCount: N }]

GET /libraries/:library/index
→ CatalogIndex (delegates to buildCatalogIndex for "default")

GET /assets/:id/meta
→ Read and return meta.json for asset
```

Add export endpoint:
```
GET /catalog/asset/:id/export
→ Stream model.glb with Content-Disposition: attachment; filename="<name>.glb"
```

These endpoints use library-namespaced paths even though only `"default"` exists, preparing the API contract for multi-library.

### 6. Add `/libraries` and `/assets` to notFoundHandler

**File:** `server/src/index.ts` (+ mirror)

Add `/libraries` and `/assets` to the API path prefixes that return 404 JSON instead of SPA fallback.

### 7. Update README with architecture documentation

**File:** `README.md`

Replace stale status table and add sections:

- **Architecture**: Wizard as Asset Pipeline + Library Server
- **Asset Lifecycle**: uploaded → analyzed → optimized → published
- **Dashboard Consumption**: GET /libraries, GET /assets/:id/meta, GET /assets/:id/model, GET /assets/:id/thumbnail
- **Storage Layout**: Current `CATALOG_PATH/<cat>/<sub>/<id>/` structure documented as v1 canonical
- **Known Limitations / v1.2.0 Deferred**: Multi-library, ZIP export/import, server-side thumbnail generation, backup system

### 8. Version bump to v1.1.5

Already at 1.1.5 in code — no version bump needed. Update CHANGELOG with the new work items.

---

## Files to modify

| File | Change |
|------|--------|
| `src/services/wizard-client.ts` | **Delete** |
| `src/contexts/WizardContext.tsx` | **Delete** |
| `src/App.tsx` | Remove WizardProvider |
| `src/components/catalog/AssetDetailDrawer.tsx` | Wire action buttons |
| `src/pages/AssetDetail.tsx` | Wire action buttons |
| `src/types/api.ts` | Add AssetLifecycleStatus |
| `server/src/routes/sync.ts` | Implement publish confirmation |
| `server/src/routes/catalog.ts` | Add /libraries, /assets/:id/meta, export |
| `server/src/index.ts` | Update notFoundHandler paths |
| `CHANGELOG.md` | Update v1.1.5 entry |
| `README.md` | Architecture docs |
| `bjorq_asset_wizard/server/src/routes/sync.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/catalog.ts` | Mirror |
| `bjorq_asset_wizard/server/src/index.ts` | Mirror |

---

## Scope Summary

| Item | Status |
|------|--------|
| Remove WizardClient / unify API client | **Fixed now** |
| Wire all asset action buttons | **Fixed now** |
| Dashboard-facing library API | **Fixed now** |
| Sync = publish confirmation | **Fixed now** |
| Asset export (GLB download) | **Fixed now** |
| Asset lifecycle status in types + metadata | **Fixed now** |
| README architecture docs | **Fixed now** |
| Multi-library storage/API | **Deferred v1.2.0** — API contract ready, single "default" library |
| ZIP library export/import | **Deferred v1.2.0** |
| Server-side thumbnail generation | **Deferred v1.2.0** |
| Backup system | **Deferred v1.2.0** |
| 3D model viewer (React Three Fiber) | **Deferred v1.2.0** |
| Storage migration to `/data/libraries/` | **Deferred v1.2.0** — current layout documented as v1 canonical |

