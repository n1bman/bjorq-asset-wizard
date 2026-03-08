

# Bjorq Asset Optimizer — Admin UI

## Overview

A React admin dashboard with sidebar navigation, structured around the 6 sections requested. Uses mock data matching the API spec, with a clean API service layer that can be swapped to real endpoints later.

## Pages and Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Upload & Analyze | File upload, trigger analysis, show results |
| `/optimize` | Optimize | Configure options, run optimization, show before/after stats |
| `/catalog` | Catalog Browser | Grid of asset cards from catalog index |
| `/catalog/:id` | Asset Detail | Full metadata, thumbnail, download, performance |
| `/ingest` | Catalog Ingest | Form to push optimized asset into catalog |
| `/system` | System Status | Health check + version info |

## Architecture

```text
src/
  services/
    api.ts              ← Base API client (baseURL configurable)
    mock-data.ts        ← Mock responses matching API spec
  types/
    api.ts              ← TypeScript interfaces for all API responses
  components/
    layout/
      AppLayout.tsx     ← SidebarProvider + main layout
      AppSidebar.tsx    ← Navigation sidebar
    upload/
      FileUploader.tsx  ← Drag-and-drop .glb/.gltf upload
    analysis/
      AnalysisResults.tsx  ← Geometry, materials, textures, recommendations
      PerformanceBadge.tsx ← ok / recommended / strongly recommended
      RecommendationList.tsx
    optimize/
      OptimizeOptions.tsx  ← Toggle switches for optimization options
      StatsComparison.tsx  ← Before/after stat cards
    catalog/
      AssetCard.tsx     ← Thumbnail + name + category + triangles
      AssetGrid.tsx     ← Responsive grid of AssetCards
      CategoryFilter.tsx
    ingest/
      IngestForm.tsx    ← Metadata form + submit to catalog
    system/
      HealthStatus.tsx
      VersionInfo.tsx
  pages/
    UploadAnalyze.tsx
    Optimize.tsx
    Catalog.tsx
    AssetDetail.tsx
    CatalogIngest.tsx
    SystemStatus.tsx
```

## Key Design Decisions

- **API service layer**: `src/services/api.ts` exports functions like `analyzeModel(file)`, `optimizeModel(file, options)`, etc. Currently returns mock data. Toggle `USE_MOCK` or set env var to switch to real API.
- **Dark theme by default**: Fits a dev/admin tool aesthetic. Uses existing dark mode CSS variables.
- **Sidebar navigation**: Using shadcn Sidebar with icons for each section (Upload, Wand, Grid, FolderPlus, Activity).
- **Responsive**: Works on desktop and tablet. Asset grid uses CSS grid with auto-fill.
- **Mock data**: Rich mock responses matching every field in the API spec so the UI is fully demonstrable without a backend.

## Component Details

**FileUploader**: Drag-and-drop zone accepting `.glb`/`.gltf`. Shows file name and size after selection. "Analyze" button triggers the API call.

**AnalysisResults**: Card-based layout showing geometry stats (triangles, meshes, vertices), materials list, texture details table, dimensions, scale estimate, placement candidate, performance badges per device class, and a recommendation list with severity-colored badges.

**OptimizeOptions**: Checkboxes/switches for each optimization flag. Text inputs for assetName, category, subcategory, style. Number input for maxTextureSize and textureQuality.

**StatsComparison**: Side-by-side "Before" and "After" cards with file size, triangles, materials, textures, max texture resolution. Reduction percentages highlighted.

**AssetCard**: Thumbnail image (placeholder if none), asset name, category badge, triangle count, dimensions. Click navigates to detail view.

**AssetDetail**: Full-page view with large thumbnail, all metadata fields, download button for model, performance stats table.

**IngestForm**: Form with fields matching the catalog ingest meta schema. Option to reference a jobId or upload files directly.

**HealthStatus / VersionInfo**: Simple cards showing the health and version API responses with status indicators.

## Files to Create/Modify

~20 new files total:
- 1 types file
- 2 service files (api + mock data)
- 6 page components
- ~10 reusable components
- Updated `App.tsx` with routes
- Updated `index.css` for dark mode default
- AppLayout + AppSidebar

## README Addition

Will add a section to the existing docs or create `docs/bjorq-asset-optimizer/UI_README.md` explaining how to configure the API base URL and switch from mock to live data.

