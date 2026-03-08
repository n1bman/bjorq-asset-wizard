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
2. Open the Bjorq Dashboard in your browser
3. Go to **Wizard Integration** and enter the add-on URL (typically `http://<ha-ip>:3500`)
4. Upload, analyze, and optimize 3D assets through the dashboard

## Storage

All data is stored under `/data/` which persists across add-on restarts:
- `/data/storage/` — Uploaded files, job data, processed assets
- `/data/catalog/` — Final catalog output (organized by category)

## API

The add-on exposes an HTTP API on port 3500. See the project documentation for endpoint details.

## Support

For issues and feature requests, visit the project repository.
