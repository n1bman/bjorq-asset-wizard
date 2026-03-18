# Bjorq Asset Wizard — Home Assistant Add-on

## Overview

Bjorq Asset Wizard provides 3D asset analysis, optimization, Photo → 3D generation, and catalog management as a Home Assistant add-on. Upload GLB/glTF models or photos, optimize them for web use with mesh simplification and texture compression, and manage a structured catalog of 3D assets for your smart home visualization.

The add-on uses a **prebuilt GHCR image** — Home Assistant pulls the image directly during install/update. No local Docker build is required.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `log_level` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `max_file_size_mb` | `100` | Maximum upload file size in MB (up to 500) |
| `thumbnail_size` | `512` | Thumbnail dimension in pixels |
| `thumbnail_quality` | `80` | Thumbnail JPEG/WebP quality (50–100) |
| `max_texture_size` | `2048` | Default max texture dimension for optimization |
| `texture_quality` | `85` | Default texture quality for optimization |
| `job_retention_hours` | `24` | Hours before temporary job files are cleaned up |

## Usage

1. Install and start the add-on
2. The Bjorq Wizard panel appears in the HA sidebar (via ingress)
3. Upload, analyze, and optimize 3D assets through the dashboard
4. Or use Photo → 3D to generate assets from furniture photos
5. Browse and manage your asset catalog

### Photo → 3D Generation

1. Navigate to **Photo → 3D** in the sidebar
2. Upload 1–4 photos of a furniture piece
3. Select a style variant (Cozy, Soft Minimal, or Warm Wood) and target profile
4. The engine generates, styles, validates, and optimizes the asset automatically
5. Review the result with quality badges and save to your library

Generated assets include automatic LOD variants stored as metadata for Dashboard use.

### LOD Architecture

The Wizard generates LOD (Level of Detail) variants for each asset:
- **LOD0** — Full quality primary model
- **LOD1** — ~50% triangle reduction
- **LOD2** — ~20% triangle reduction

All variants share the same pivot, scale, and orientation. The Wizard only stores LODs — runtime switching is handled by the Bjorq Dashboard. Assets work perfectly even without LOD support.

### Optimization Profiles

| Profile | Texture Max | Mesh Simplify | Best For |
|---------|-------------|---------------|----------|
| **High Quality** | 4096px | None | Desktop, high-end displays |
| **Balanced** | 2048px | ~25% reduction | Tablets, general use |
| **Low Power** | 512px | ~50% reduction | Mobile, embedded, wall panels |

### Thumbnails

The Wizard generates real 3D model thumbnails client-side using Three.js. When you save an asset to the catalog, the browser renders the optimized model and uploads the captured image alongside the model file.

## Storage

All data is stored under `/data/` which persists across add-on restarts:
- `/data/storage/` — Uploaded files, job data, processed assets
- `/data/catalog/` — Final catalog output (organized by category)

## API

The add-on exposes an HTTP API on port 3500. Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Analyze a 3D model |
| `POST` | `/optimize` | Full optimization pipeline |
| `POST` | `/generate` | Photo → 3D generation |
| `GET` | `/generate/jobs/:id` | Poll generation job status |
| `GET` | `/generate/queue` | Queue status |
| `GET` | `/generate/metrics` | Pipeline analytics |
| `GET` | `/trellis/status` | TRELLIS engine status |
| `POST` | `/trellis/install` | Install TRELLIS engine |
| `POST` | `/catalog/ingest` | Add asset to catalog |
| `GET` | `/catalog/index` | Browse catalog |
| `GET` | `/catalog/policy` | Storage usage and limits |
| `GET` | `/catalog/asset/:id/thumbnail` | Serve asset thumbnail |
| `GET` | `/catalog/asset/:id/model` | Serve asset GLB model |
| `GET` | `/catalog/asset/:id/export` | Download asset GLB |
| `DELETE` | `/catalog/asset/:id` | Delete asset from catalog |
| `GET` | `/health` | Service health check |
| `GET` | `/version` | Version info + capabilities |
| `GET` | `/libraries` | List available libraries |
| `GET` | `/assets/:id/meta` | Get asset metadata (includes LOD info) |
| `GET` | `/assets/:id/model` | Serve asset model (alias) |
| `GET` | `/assets/:id/thumbnail` | Serve asset thumbnail (alias) |

## Troubleshooting

- **Add-on won't start**: Check the log tab for errors. Ensure port 3500 is not in use.
- **Upload fails**: Verify file is `.glb` or `.gltf` and within size limit.
- **Panel not showing**: Ensure ingress is enabled in add-on settings.
- **For files > 10 MB**: Use direct mode (`http://<HA-IP>:3500`) to bypass HA ingress limits.

### HA Shows Wrong Version or Fails to Update

1. **Settings → Add-ons → Add-on Store** → ⋮ → **Repositories** → remove the repo URL
2. Click **Reload** in the Add-on Store
3. Re-add the repository URL
4. Verify the correct version (**2.3.1**) appears before installing
5. If still stale: **Settings → System → Restart** (Supervisor or Core)

## Upload Limits

- Files > 50 MB: UI shows a processing time warning
- Files > 100 MB: Rejected before upload with clear error message
- Upload timeout: 5 minutes

## Storage Policy

| Limit | Value | Behavior |
|-------|-------|----------|
| Catalog soft limit | 2 GB | Warning shown, ingest allowed |
| Catalog hard limit | 5 GB | Ingest blocked |
| Asset warn size | 25 MB | Warning before catalog save |

## Job Cleanup

- Completed jobs removed after 7 days (or `job_retention_hours`)
- Failed jobs removed after 1 day
- Runs on startup + every 6 hours
- Catalog data is never affected

## Architecture Support

The first prebuilt add-on release is **amd64-only**. aarch64 support will be restored after Docker build stabilization.

## Support

For issues and feature requests, visit the [GitHub repository](https://github.com/n1bman/bjorq-asset-wizard).
