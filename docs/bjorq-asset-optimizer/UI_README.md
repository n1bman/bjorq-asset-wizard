# Bjorq Asset Optimizer — Admin UI

## Overview

React-based admin dashboard for the Bjorq Asset Optimizer backend. Provides a visual interface for uploading, analyzing, optimizing, and managing 3D model assets. Designed to run as a local admin tool within a Home Assistant add-on.

## Architecture

```text
src/
  services/
    api-client.ts        ← Base HTTP client with connection tracking, timeout, fallback
    api.ts               ← API functions (try real backend → fall back to mock)
    mock-data.ts         ← Mock responses matching API spec
  types/
    api.ts               ← TypeScript interfaces (all endpoints + sync/source status)
  contexts/
    ConnectionContext.tsx ← Global backend connection state (polls /health every 30s)
  hooks/
    use-api.ts           ← Generic async hook { data, loading, error, refetch }
    use-connection.ts    ← Shortcut to ConnectionContext
  components/
    layout/              ← AppLayout (offline banner), AppSidebar (grouped nav)
    upload/              ← FileUploader (drag-and-drop .glb/.gltf)
    analysis/            ← AnalysisResults, PerformanceBadge, RecommendationList
    optimize/            ← OptimizeOptions, StatsComparison, PipelineStepper
    catalog/             ← AssetCard, AssetGrid, CategoryFilter, AssetDetailDrawer, AssetStatusBadge
    sync/                ← SyncStatusBar
    system/              ← ConnectionCard, StorageStatusCard, CatalogStatusCard, HealthStatus, VersionInfo
  pages/
    UploadAnalyze.tsx    ← Upload + analyze flow
    Optimize.tsx         ← 6-step pipeline (Upload → Analyze → Configure → Optimize → Review → Save)
    Catalog.tsx          ← Grid browser with drawer detail + sync bar
    AssetDetail.tsx      ← Full asset page with actions
    CatalogIngest.tsx    ← Ingest form
    SystemStatus.tsx     ← Connection, storage, catalog, health, version dashboard
```

## Connecting to the Backend

The API client (`src/services/api-client.ts`) manages connectivity:

- **Base URL**: Stored in `localStorage` under `bjorq_api_base_url`, defaults to `http://localhost:3500`
- **Connection tracking**: Pings `/health` every 30s, exposes `connected | disconnected | checking`
- **Auto-fallback**: When backend is unreachable, API functions return mock data and the UI shows "Backend offline — using demo data"
- **Configurable via UI**: System Status page has a Connection card with editable URL

To connect to your running backend, either:
1. Change the URL in the System Status → Connection card
2. Or set `localStorage.setItem('bjorq_api_base_url', 'http://your-host:3500')`

## API-Ready vs Mock-Only Status

| Feature | Status |
|---------|--------|
| `/analyze` — model analysis | ✅ API-ready (FormData upload) |
| `/optimize` — optimization pipeline | ✅ API-ready (FormData + options) |
| `/catalog/index` — browse catalog | ✅ API-ready (GET) |
| `/catalog/ingest` — ingest asset | ✅ API-ready (FormData) |
| `/catalog/reindex` — reindex catalog | ✅ API-ready (POST) |
| `/health` — health check | ✅ API-ready (GET, used for connection polling) |
| `/version` — version info | ✅ API-ready (GET) |
| `/sync` — sync to Bjorq dashboard | 🔶 UI-ready, endpoint not yet implemented in backend |
| Asset source/sync/ingest status | 🔶 UI shows fields, backend needs to include them in responses |

## Home Assistant Add-on Notes

This frontend is built as a standard React SPA (`npm run build` → `dist/`). For HA add-on deployment:

1. The backend serves the `dist/` folder as static files
2. API base URL defaults to the local add-on address
3. The System Status page shows connection health, storage writability, and catalog stats
4. The offline banner activates automatically when the backend is down

## Bjorq Sync Architecture

The sync feature is prepared in the UI but requires these backend endpoints:

- `POST /sync` — sync specified asset IDs to the Bjorq dashboard
- Asset metadata should include `source`, `syncStatus`, `lastSyncedAt` fields

The UI provides:
- Per-asset sync buttons (detail drawer, detail page)
- Bulk "Sync to Bjorq" in the catalog sync bar
- Sync status indicators (colored dots: green=synced, yellow=syncing, gray=not synced)
- Source badges (uploaded=blue, optimized=orange, catalog=green, synced=purple)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Upload a `.glb`/`.gltf` file and run analysis |
| `/optimize` | 6-step pipeline: upload → analyze → configure → optimize → review → save |
| `/catalog` | Browse all catalog assets with category filtering + detail drawer |
| `/catalog/:id` | Full asset detail page with actions |
| `/ingest` | Submit an asset to the catalog |
| `/system` | Connection status, storage, catalog stats, health, version |
| `/wizard` | Wizard integration: settings, status, catalog browser, import flow |

## Wizard Integration Architecture

The Bjorq Dashboard can connect to a separate **Bjorq Asset Wizard** service (local HA add-on or standalone) for browsing and importing optimized 3D assets.

### How It Works

```text
Bjorq Dashboard  ──►  WizardClient (src/services/wizard-client.ts)
                         │
                         ├─ GET /health      → connection check (polled every 30s)
                         ├─ GET /version      → version info
                         ├─ GET /catalog/index → browse assets
                         └─ GET /catalog/asset/:id → asset detail
                         │
                      Falls back to mock data when unreachable
```

### Configuration

- **Base URL**: Stored in `localStorage` under `bjorq_wizard_url`, default `http://localhost:3500`
- **Enable/Disable**: Toggle via the Wizard Integration page, persisted to `bjorq_wizard_enabled`
- **Connection polling**: Every 30s when enabled, via `WizardContext`

### Asset Sources

Assets in the catalog can have these sources:
- `uploaded` (blue) — manually uploaded
- `optimized` (orange/primary) — processed by optimizer
- `catalog` (green) — from curated catalog
- `synced` (purple) — synced to Bjorq dashboard
- `wizard` (cyan) — imported from Wizard service

### Import Flow

1. Navigate to `/wizard`
2. Enable integration and configure Wizard URL
3. Browse the Wizard catalog with category filtering
4. Click an asset to inspect full metadata in a detail sheet
5. Click "Import to Bjorq" to add the asset to the local catalog with `source: "wizard"`

### Files

| File | Purpose |
|------|---------|
| `src/services/wizard-client.ts` | HTTP client for Wizard API with fallback |
| `src/services/wizard-mock-data.ts` | Mock Wizard catalog/health/version |
| `src/contexts/WizardContext.tsx` | Global Wizard connection state |
| `src/components/wizard/WizardSettingsCard.tsx` | URL config, enable toggle, status |
| `src/components/wizard/WizardStatusWidget.tsx` | Health/version/availability |
| `src/components/wizard/WizardCatalogBrowser.tsx` | Asset grid with category filter |
| `src/components/wizard/WizardAssetCard.tsx` | Asset card for Wizard assets |
| `src/components/wizard/WizardAssetDetail.tsx` | Detail sheet with import action |
| `src/pages/WizardIntegration.tsx` | Integration page |
