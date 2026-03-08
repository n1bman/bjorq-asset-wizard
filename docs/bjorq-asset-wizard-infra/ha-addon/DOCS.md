# Bjorq Asset Wizard — Home Assistant Add-on

## Overview

The Bjorq Asset Wizard analyzes, optimizes, and catalogs 3D models (`.glb` / `.gltf`) for use in Bjorq's smart home visualization.

It runs as a local service on your Home Assistant instance, accessible via the Bjorq dashboard.

## Installation

1. Add the Bjorq add-on repository to Home Assistant
2. Find **Bjorq Asset Wizard** in the add-on store
3. Click **Install**
4. Configure options (see below)
5. Click **Start**

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `log_level` | `info` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `max_file_size_mb` | `100` | Maximum upload file size in MB |
| `thumbnail_size` | `512` | Thumbnail dimension in pixels |
| `thumbnail_quality` | `80` | Thumbnail JPEG/WebP quality (50–100) |
| `max_texture_size` | `2048` | Maximum texture resolution after optimization |
| `texture_quality` | `85` | Texture compression quality (50–100) |
| `job_retention_hours` | `24` | Hours before temporary job files are cleaned up |

## Usage

Once running, the Wizard API is available at `http://<your-ha-ip>:3500`.

Connect the Bjorq Dashboard to the Wizard:
1. Open the Bjorq Dashboard
2. Navigate to **Wizard Integration**
3. Enter `http://<your-ha-ip>:3500` as the Wizard URL
4. Enable the connection

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Analyze a 3D model |
| `POST` | `/optimize` | Full optimization pipeline |
| `POST` | `/catalog/ingest` | Add asset to catalog |
| `GET` | `/catalog/index` | Browse catalog |
| `GET` | `/health` | Service health check |
| `GET` | `/version` | Version info |

## Data Storage

All data is stored persistently under `/data/` inside the add-on:

- `/data/storage/` — Uploads, jobs, originals, optimized files, thumbnails
- `/data/catalog/` — Curated asset catalog

Data survives add-on restarts and updates.

## Troubleshooting

- **Add-on won't start**: Check the log tab for errors. Ensure port 3500 is not in use.
- **Upload fails**: Verify file is `.glb` or `.gltf` and within size limit.
- **Dashboard can't connect**: Ensure the Wizard URL is correct and the add-on is running.

## Support

This add-on is part of the Bjorq project. For issues, see the [GitHub repository](https://github.com/your-org/bjorq-asset-wizard).
