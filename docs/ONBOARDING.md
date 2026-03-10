# Onboarding Guide — Bjorq Asset Wizard

Welcome to **Bjorq Asset Wizard**, the 3D asset optimization and management add-on for Home Assistant. This guide walks you through installation, your first model optimization, and connecting to the Bjorq Dashboard.

---

## Table of Contents

1. [What is Bjorq Asset Wizard?](#what-is-bjorq-asset-wizard)
2. [Installation](#installation)
3. [Your First Model](#your-first-model)
4. [Dashboard Connection](#dashboard-connection)
5. [Catalog Management](#catalog-management)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## What is Bjorq Asset Wizard?

Bjorq Asset Wizard is a self-hosted tool that:

- **Analyzes** 3D models (GLB/glTF) — triangle count, textures, materials, dimensions, performance ratings
- **Optimizes** models for real-time use — texture compression, mesh simplification, scene cleanup
- **Catalogs** assets with metadata, thumbnails, and categories
- **Syncs** published assets to the Bjorq Dashboard for use in your smart home

It runs as a Home Assistant add-on or standalone Docker container.

---

## Installation

### Home Assistant Add-on

1. Open **Settings → Add-ons → Add-on Store** in Home Assistant
2. Click the **⋮** menu (top-right) → **Repositories**
3. Add the repository URL:
   ```
   https://github.com/bjorq-app/bjorq-asset-wizard
   ```
4. Find **Bjorq Asset Wizard** in the store and click **Install**
5. Start the add-on — the UI opens via the **Open Web UI** button

### Standalone Docker

```bash
docker run -d \
  --name bjorq-wizard \
  -p 3500:3500 \
  -v bjorq-catalog:/data/catalog \
  -v bjorq-storage:/data/storage \
  ghcr.io/bjorq-app/bjorq-asset-wizard:latest
```

Open `http://localhost:3500` in your browser.

---

## Your First Model

### Step 1: Upload & Analyze

1. Navigate to **Upload & Analyze** in the sidebar
2. Drag and drop a `.glb` file (up to 100 MB) or click to browse
3. The wizard analyzes your model and shows:
   - Geometry stats (triangles, meshes, vertices)
   - Material and texture details
   - Physical dimensions and scale estimate
   - Performance ratings (Desktop / Tablet / Low-power)
   - Actionable recommendations

### Step 2: Optimize

1. Navigate to **Optimize** in the sidebar
2. Upload your model and choose an optimization profile:

   | Profile | Best For | What It Does |
   |---------|----------|--------------|
   | **High Quality** | Desktop, AR | Texture compression, scene cleanup — no mesh reduction |
   | **Balanced** | General use | Texture compression + 25% triangle reduction |
   | **Low Power** | Mobile, IoT | Aggressive compression + 50% triangle reduction |

3. Toggle individual options:
   - Remove empty nodes, cameras, lights, animations
   - Normalize scale and origin
   - Set floor to Y=0
   - Texture optimization (resize + quality)
4. Click **Start Optimization** and wait for processing
5. Review the results: before/after stats, size reduction, and a 3D thumbnail preview

### Step 3: Save to Catalog

1. In the Review step, fill in asset metadata:
   - **Name** — display name for the asset
   - **Category** — e.g., "Furniture", "Lighting", "Decor"
   - **Subcategory** — optional refinement
2. Click **Save to Catalog** — the optimized model, metadata, and thumbnail are stored permanently

### Step 4: Sync to Dashboard

1. Navigate to **Catalog** in the sidebar
2. Select the asset(s) you want to publish
3. Use the **Sync** action — this marks assets as "published" and makes them available to the Bjorq Dashboard

---

## Dashboard Connection

The Bjorq Dashboard connects directly to the Wizard's API on **port 3500**.

### Setup

1. In the Dashboard settings, add a new Wizard connection:
   - **URL**: `http://<your-ha-ip>:3500` (or your Docker host IP)
   - The Dashboard will auto-discover available libraries

2. **Important**: Use the direct port, not the HA Ingress URL. Ingress URLs are for browser-only access and don't support large file transfers.

### How It Works

- Dashboard calls `GET /libraries` to discover available libraries
- It fetches the published asset index via `GET /libraries/default/index`
- Individual assets are loaded via:
  - `GET /assets/:id/model` — GLB model file
  - `GET /assets/:id/thumbnail` — WebP thumbnail
  - `GET /assets/:id/meta` — Full metadata JSON

Only assets with `lifecycleStatus: "published"` appear in the library index.

---

## Catalog Management

### Browsing

The **Catalog** page shows all stored assets with category filtering, thumbnail previews, and detailed metadata drawers.

### Export & Import

- **Export**: Click **Export** in the Catalog header to download a `.tar.gz` backup of your entire catalog (models, metadata, thumbnails)
- **Import**: Click **Import** to restore from a backup file. Choose merge (skip duplicates) or overwrite strategy
- Use export/import to share catalogs between Wizard instances or create backups

### Deleting Assets

Open an asset's detail drawer and use the **Delete** action. This permanently removes the model, metadata, and thumbnail from disk.

### Ingesting Manually

The **Ingest** page allows adding pre-optimized models directly to the catalog without running the optimization pipeline.

---

## Troubleshooting

### Add-on won't start

- Check the **Log** tab in the add-on settings for errors
- Verify the add-on version is `2.0.8` or later
- Ensure the add-on has proper access to storage (check volume mappings)

### Can't connect from Dashboard

- Use `http://<ip>:3500`, not the Ingress URL
- Test connectivity: `curl http://<ip>:3500/health` should return `{"status":"ok",...}`
- Check that port 3500 is exposed (in HA: add-on config → Network → port mapping)

### Models fail to optimize

- Ensure the file is a valid `.glb` (glTF Binary) format
- Check file size — maximum 100 MB
- Look at the optimization logs for specific errors
- Try the **High Quality** profile first (least aggressive)

### Catalog shows 0 assets

- Run **Reindex** from the System Status page
- Check that `/data/catalog` contains asset folders with `meta.json` files
- Verify disk permissions in Docker/HA logs

### API returns 502/504

- The optimization may have timed out (5 min limit)
- Try a smaller model or less aggressive profile
- Check system resources (RAM, CPU) — optimization is memory-intensive

---

## API Reference

All endpoints are served from the Wizard's base URL (default: `http://localhost:3500`).

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with storage status |
| GET | `/version` | Version info and capabilities |

### Analysis & Optimization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyze a GLB model (multipart upload) |
| POST | `/optimize` | Optimize a GLB model (multipart upload) |

### Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/catalog/index` | Full catalog manifest |
| POST | `/catalog/ingest` | Add asset to catalog |
| POST | `/catalog/reindex` | Force catalog rebuild |
| GET | `/catalog/policy` | Storage usage and limits |
| GET | `/catalog/export` | Download catalog as .tar.gz |
| POST | `/catalog/import` | Upload and merge catalog archive |
| GET | `/catalog/asset/:id/thumbnail` | Asset thumbnail (WebP) |
| GET | `/catalog/asset/:id/model` | Asset model (GLB) |
| GET | `/catalog/asset/:id/export` | Download model with filename |
| DELETE | `/catalog/asset/:id` | Delete asset permanently |
| GET | `/catalog/diagnostics` | Catalog health diagnostics |

### Dashboard Library API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/libraries` | List available libraries |
| GET | `/libraries/:lib/index` | Library index (published only) |
| GET | `/assets/:id/meta` | Asset metadata JSON |
| GET | `/assets/:id/model` | Asset model (GLB) |
| GET | `/assets/:id/thumbnail` | Asset thumbnail (WebP) |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sync` | Publish assets for Dashboard |

---

## Next Steps

- Explore optimization profiles to find the best balance for your use case
- Set up regular catalog exports as backups
- Connect the Bjorq Dashboard and start placing 3D assets in your smart home

For detailed API specifications, see [API_SPEC.md](bjorq-asset-optimizer/API_SPEC.md).
For the full roadmap, see [ROADMAP.md](bjorq-asset-optimizer/ROADMAP.md).
