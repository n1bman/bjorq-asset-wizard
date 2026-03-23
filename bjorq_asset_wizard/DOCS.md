# Bjorq Asset Wizard — Home Assistant Add-on

## Overview

Bjorq Asset Wizard provides 3D asset analysis, optimization, and catalog management as a Home Assistant add-on. Upload GLB/glTF models, optimize them for web use, and publish them into the Bjorq asset catalog.

The add-on uses a prebuilt GHCR image, so Home Assistant pulls the image directly during install/update.

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `log_level` | `info` | Logging verbosity |
| `max_file_size_mb` | `100` | Maximum upload file size in MB |
| `thumbnail_size` | `512` | Thumbnail dimension in pixels |
| `thumbnail_quality` | `80` | Thumbnail quality |
| `max_texture_size` | `2048` | Default max texture dimension |
| `texture_quality` | `85` | Default texture quality |
| `job_retention_hours` | `24` | Hours before temporary job files are cleaned up |

## Usage

1. Install and start the add-on
2. Open the Bjorq Wizard panel in Home Assistant
3. Upload, analyze, optimize, and ingest 3D assets
4. Browse and manage the asset catalog

## Storage

All data is stored under `/data/`:

- `/data/storage/` — uploads, jobs, processed assets, logs
- `/data/catalog/` — final catalog output

## API

Key endpoints:

- `POST /analyze`
- `POST /optimize`
- `POST /catalog/ingest`
- `GET /catalog/index`
- `GET /catalog/policy`
- `GET /catalog/asset/:id/thumbnail`
- `GET /catalog/asset/:id/model`
- `GET /catalog/asset/:id/export`
- `DELETE /catalog/asset/:id`
- `GET /health`
- `GET /version`
- `GET /libraries`
- `GET /assets/:id/meta`
- `GET /assets/:id/model`
- `GET /assets/:id/thumbnail`

## Troubleshooting

- Add-on won't start: check the log tab and ensure port `3500` is available
- Upload fails: verify the file is `.glb` or `.gltf` and within the configured size limit
- Panel not showing: ensure ingress is enabled

## Architecture Support

Current prebuilt add-on release is `amd64` only.

## Support

For issues and feature requests, use the project repository.
