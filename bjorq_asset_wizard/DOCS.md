# Bjorq Asset Wizard — Home Assistant Add-on

## Overview

Bjorq Asset Wizard provides 3D asset analysis, optimization, and catalog management as a Home Assistant add-on. Upload GLB/glTF models, optimize them for web use, and manage a structured catalog of 3D assets for your smart home visualization.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `log_level` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `max_file_size_mb` | `100` | Maximum upload file size in MB |
| `thumbnail_size` | `512` | Thumbnail dimension in pixels |
| `thumbnail_quality` | `80` | Thumbnail JPEG/WebP quality (50–100) |
| `max_texture_size` | `2048` | Default max texture dimension for optimization |
| `texture_quality` | `85` | Default texture quality for optimization |
| `job_retention_hours` | `24` | Hours before temporary job files are cleaned up |

## Usage

1. Install and start the add-on
2. The Bjorq Wizard panel appears in the HA sidebar (via ingress)
3. Upload, analyze, and optimize 3D assets through the dashboard
4. Browse and manage your asset catalog

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
| `POST` | `/catalog/ingest` | Add asset to catalog |
| `GET` | `/catalog/index` | Browse catalog |
| `GET` | `/health` | Service health check |
| `GET` | `/version` | Version info |

## Troubleshooting

- **Add-on won't start**: Check the log tab for errors. Ensure port 3500 is not in use.
- **Upload fails**: Verify file is `.glb` or `.gltf` and within size limit.
- **Panel not showing**: Ensure ingress is enabled in add-on settings.

### HA Shows Wrong Version or "Dockerfile Missing"

Home Assistant's Supervisor caches repository metadata. If it shows an old version or reports a missing Dockerfile:

1. **Settings → Add-ons → Add-on Store** → ⋮ → **Repositories** → remove the repo URL
2. Click **Reload** in the Add-on Store
3. Re-add the repository URL
4. Verify the correct version (currently **0.2.0**) appears before installing
5. If still stale: **Settings → System → Restart** (Supervisor or Core)

## Support

For issues and feature requests, visit the [GitHub repository](https://github.com/n1bman/bjorq-asset-wizard).
