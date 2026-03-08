# Bjorq Asset Optimizer — Admin UI

## Overview

This is the React-based admin dashboard for the Bjorq Asset Optimizer backend. It provides a visual interface for uploading, analyzing, optimizing, and managing 3D model assets.

## Connecting to the Backend

The API service layer is in `src/services/api.ts`. Two variables control connectivity:

```ts
const USE_MOCK = true;        // Set to false to use real API
const BASE_URL = "http://localhost:3500";  // Point to your backend
```

When `USE_MOCK` is `true`, the UI uses mock data from `src/services/mock-data.ts` that matches the API specification exactly. Set `USE_MOCK` to `false` and update `BASE_URL` to connect to your running backend.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Upload a `.glb`/`.gltf` file and run analysis |
| `/optimize` | Configure optimization options and run the pipeline |
| `/catalog` | Browse all catalog assets with category filtering |
| `/catalog/:id` | View full asset details, metadata, and performance |
| `/ingest` | Submit an asset to the catalog |
| `/system` | View backend health and version info |

## Project Structure

```
src/
  types/api.ts           — TypeScript interfaces matching API spec
  services/
    api.ts               — API client (mock-toggleable)
    mock-data.ts         — Mock responses
  components/
    layout/              — AppLayout, AppSidebar
    upload/              — FileUploader (drag-and-drop)
    analysis/            — AnalysisResults, PerformanceBadge, RecommendationList
    optimize/            — OptimizeOptions, StatsComparison
    catalog/             — AssetCard, AssetGrid, CategoryFilter
    ingest/              — IngestForm
    system/              — HealthStatus, VersionInfo
  pages/                 — Route-level page components
```

## Embedding

The dashboard is built as a standard React SPA. To embed within the Bjorq dashboard:

1. Build with `npm run build`
2. Serve the `dist/` output from a subpath
3. Or import the page components directly if sharing a React host
