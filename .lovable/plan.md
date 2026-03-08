

# Phase 2: Production-Ready Integration

This plan transforms the current mock dashboard into a production-ready frontend prepared for real backend connection, HA add-on deployment, and Bjorq sync.

## 1. API Client Layer Overhaul

**`src/services/api-client.ts`** — New base client class with:
- Configurable `baseUrl` (defaults to `localStorage` value or `http://localhost:3500`)
- Connection state tracking: `connected | disconnected | checking`
- Auto-fallback to mock data when backend unreachable
- Typed error handling with `ApiError` class
- Request wrapper with timeout, retry logic
- `checkConnection()` method that pings `/health`

**`src/services/api.ts`** — Refactored to use the new client. Each function tries real API first, catches network errors, falls back to mock if configured.

**`src/hooks/use-api.ts`** — Generic hook returning `{ data, loading, error, refetch, isOffline }` for any API call.

**`src/hooks/use-connection.ts`** — React context + hook providing global backend connection status, polled every 30s via `/health`. Exposes `{ status, health, isConnected, baseUrl, setBaseUrl }`.

## 2. Extended Types

**`src/types/api.ts`** — Add new types:
- `AssetSource`: `"uploaded" | "optimized" | "catalog" | "synced"`
- `SyncStatus`: `"not_synced" | "syncing" | "synced" | "error"`
- `AssetStatus`: extends `AssetMetadata` with `source`, `syncStatus`, `ingestStatus`, `optimizationStatus`, `lastSyncedAt`
- `ConnectionStatus`: `"connected" | "disconnected" | "checking"`
- `SystemInfo`: combines health + version + storage + catalog stats

## 3. Connection Provider & System Dashboard

**`src/contexts/ConnectionContext.tsx`** — Provider wrapping the app, polls `/health` and `/version`, stores connection state globally.

**Revamped `/system` page** with sections:
- **Connection Status** — green/red indicator, base URL display with edit button, latency
- **Storage Status** — path, writable check, disk usage (when backend provides it)
- **Catalog Status** — total assets, last indexed, reindex button
- **Optimization Jobs** — recent jobs list (placeholder for future)
- **Health & Version** — existing cards, enhanced with last-checked timestamp

## 4. Catalog Enhancements

**`AssetCard`** updated with:
- Source badge (uploaded/optimized/catalog/synced)
- Sync status indicator (dot: green=synced, yellow=pending, gray=not synced)
- Quick actions on hover: Optimize, Sync, Download

**`CategoryFilter`** extended with source filter and sync status filter.

**New `AssetStatusBadge` component** — reusable badge showing sync/ingest/optimization status.

## 5. Unified Optimize Pipeline Page

Refactor `/optimize` into a **stepped pipeline**:

```text
Step 1: Upload  →  Step 2: Analyze  →  Step 3: Configure  →  Step 4: Optimize  →  Step 5: Review  →  Step 6: Save
```

- Step 1: File upload (existing FileUploader)
- Step 2: Auto-analyze, show results inline with recommendations
- Step 3: Configure optimization options (pre-filled from recommendations)
- Step 4: Run optimization, show progress
- Step 5: Review before/after stats, thumbnail preview, metadata preview (JSON viewer)
- Step 6: Save to catalog + optional "Sync to Bjorq" button

Use a stepper component with numbered steps and active/complete indicators.

## 6. Asset Detail Drawer

**`src/components/catalog/AssetDetailDrawer.tsx`** — Sheet/drawer component showing:
- Thumbnail (large)
- Metadata table (name, id, category, subcategory, style, placement)
- Dimensions card
- Performance stats
- Optimization summary (if optimized)
- Status section: source, ingest status, sync status
- Action buttons: Optimize, Ingest to Catalog, Export/Download, Sync to Bjorq

Used from both Catalog grid (click card opens drawer) and Asset Detail page (embedded).

## 7. Bjorq Sync UI Concepts

**`src/components/sync/SyncStatusBar.tsx`** — A bar/banner at bottom of catalog showing: "X assets synced to Bjorq | Y pending | Last sync: timestamp" with a "Sync Now" button.

**Sync action** on asset cards and detail view — button that would call a future `/sync` endpoint. For now shows a toast "Sync not available — backend not connected" or mock success.

**Asset source indicators** throughout the UI using consistent color coding:
- Uploaded = blue
- Optimized = orange (primary)
- Catalog = green
- Synced = purple

## 8. Sidebar Update

Add new nav items:
- Existing: Upload & Analyze, Optimize, Catalog, Ingest, System
- New grouping: "Pipeline" (Upload, Optimize) and "Catalog" (Browse, Ingest) and "System" (Status, Connection)

## 9. UX Polish for Local/Self-hosted

- Connection banner at top when backend is unreachable: "Backend offline — using demo data"
- All status labels use plain language: "Connected", "Offline", "Synced", "Not synced"
- Muted "demo mode" indicator when using mock data
- Responsive layout already in place, keep it clean

## 10. Documentation Updates

**`docs/bjorq-asset-optimizer/UI_README.md`** — Updated with:
- Architecture diagram (text)
- Which components are API-ready vs mock-only
- How to configure base URL
- Connection provider explanation
- Bjorq sync architecture notes (future endpoints needed)

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/services/api-client.ts` | Base HTTP client with connection tracking |
| Create | `src/hooks/use-api.ts` | Generic async hook with loading/error/offline |
| Create | `src/contexts/ConnectionContext.tsx` | Global connection state provider |
| Create | `src/components/catalog/AssetDetailDrawer.tsx` | Reusable asset detail sheet |
| Create | `src/components/catalog/AssetStatusBadge.tsx` | Source/sync/ingest status badges |
| Create | `src/components/sync/SyncStatusBar.tsx` | Catalog sync summary bar |
| Create | `src/components/system/ConnectionCard.tsx` | Connection status + URL config |
| Create | `src/components/system/CatalogStatusCard.tsx` | Catalog stats card |
| Create | `src/components/system/StorageStatusCard.tsx` | Storage health card |
| Create | `src/components/optimize/PipelineStepper.tsx` | Step indicator for optimize flow |
| Modify | `src/types/api.ts` | Add sync/source/status types |
| Modify | `src/services/api.ts` | Use api-client, add connection-aware fallback |
| Modify | `src/services/mock-data.ts` | Add source/sync fields to mock assets |
| Modify | `src/pages/Optimize.tsx` | Stepped pipeline flow |
| Modify | `src/pages/Catalog.tsx` | Source/sync filters, drawer integration, sync bar |
| Modify | `src/pages/AssetDetail.tsx` | Enhanced with actions + status |
| Modify | `src/pages/SystemStatus.tsx` | Full system dashboard |
| Modify | `src/components/catalog/AssetCard.tsx` | Source + sync indicators |
| Modify | `src/components/layout/AppSidebar.tsx` | Grouped nav sections |
| Modify | `src/components/layout/AppLayout.tsx` | ConnectionProvider wrapper + offline banner |
| Modify | `src/App.tsx` | Wrap with ConnectionProvider |
| Modify | `docs/bjorq-asset-optimizer/UI_README.md` | Architecture + integration docs |

~12 new files, ~10 modified files. All frontend-only — no backend code.

