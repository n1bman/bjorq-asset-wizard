# Bjorq Asset Wizard

3D asset analysis, optimization, Photo → 3D generation, and catalog management for Bjorq smart home visualization.

## Features

- **Analyze** — Upload GLB/glTF models and get detailed analysis (mesh count, textures, file size breakdown, bounding box, placement detection)
- **Optimize** — Full optimization pipeline with three profiles:
  - **High Quality** — Conservative cleanup (prune, dedup, remove cameras/lights)
  - **Balanced** — Standard optimization with texture resize (2048px), normalization, and ~25% mesh simplification
  - **Low Power** — Aggressive optimization with texture resize (512px) and ~50% mesh simplification for mobile/embedded
- **Photo → 3D** — Generate stylized 3D assets from 1–4 photos with automatic style normalization, quality gating, and scene compatibility
- **Style Variants** — Controlled variants (Cozy, Soft Minimal, Warm Wood) within the Bjorq identity
- **LOD Generation** — Automatic Level-of-Detail variants stored as asset metadata for Dashboard consumption
- **Mesh Simplification** — Triangle reduction via `meshoptimizer` (weld + simplify)
- **Catalog** — Organize optimized assets with metadata, thumbnails, and structured categories
- **Asset Lifecycle** — Full CRUD: ingest, browse, export (download), and delete assets
- **Auto Categorization** — Best-effort furniture category detection (chair, table, sofa, lamp, etc.)
- **Client-side Thumbnails** — Real 3D model renders captured via Three.js in the browser
- **Dashboard Integration** — Library API for Bjorq Dashboard asset browsing

## LOD Architecture

The Wizard addon **only prepares, stores, and exposes** LOD-ready asset variants and metadata:

- LOD0 = primary optimized model
- LOD1 = ~50% triangle reduction
- LOD2 = ~20% triangle reduction

**Key principles:**
- All LOD variants share identical pivot, scale, floor alignment, and orientation
- Runtime LOD selection and switching belongs to the **Bjorq Dashboard**
- Assets are fully usable even if Dashboard ignores LOD metadata
- LOD info is stored as structured metadata in `meta.json`

## Installation

1. Add this repository to Home Assistant: `https://github.com/n1bman/bjorq-asset-wizard`
2. Find **Bjorq Asset Wizard** in the add-on store
3. Click **Install**, then **Start**
4. Access via the **Bjorq Wizard** panel in the HA sidebar

## Add-on Packaging

The Wizard add-on uses a **prebuilt GHCR image**, the same approach as the Dashboard add-on.
Home Assistant pulls the image directly from `ghcr.io/n1bman/bjorq-asset-wizard-{arch}` —
no local Docker build is required during installation or updates.

### How it works

1. A GitHub Actions workflow (`.github/workflows/docker.yml`) builds per-architecture images on each `v*` tag
2. Images are pushed to GHCR as `ghcr.io/n1bman/bjorq-asset-wizard-amd64`
3. `config.yaml` contains `image: ghcr.io/n1bman/bjorq-asset-wizard-{arch}` — HA resolves `{arch}` at install time
4. Version updates are controlled by bumping the version in `config.yaml` and publishing a matching tagged image

### Releasing a new version

1. Update the `version` field in `bjorq_asset_wizard/config.yaml`
2. Commit and push
3. Create a git tag matching the version: `git tag v2.3.1 && git push origin v2.3.1`
4. GitHub Actions builds and pushes the per-arch images
5. HA picks up the new version on next add-on store refresh

> **Important**: Home Assistant cannot install a version until the matching GHCR image exists.

### Local development / testing

```bash
./bjorq_asset_wizard/prepare-addon.sh
cd bjorq_asset_wizard
docker build --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19 -t bjorq-wizard-test .
```

## Troubleshooting: HA Shows Wrong Version

1. Go to **Settings → Add-ons → Add-on Store** (⋮ menu → **Repositories**)
2. **Remove** the repository URL
3. Click **Reload** (top-right ⋮ menu)
4. **Re-add** the repository URL
5. Verify the correct version (**2.3.1**) appears before clicking Install

## Upload Limits

- **Maximum source file**: 100 MB (configurable via `max_file_size_mb` in add-on options)
- Files > 50 MB show a processing time warning
- Files > 100 MB are rejected before upload

## Storage Policy

- **Soft limit**: 2 GB — warnings shown but ingest allowed
- **Hard limit**: 5 GB — new ingests blocked until space is freed
- Check current usage via `GET /catalog/policy`

## Job Cleanup

Temporary job data in `/data/storage/jobs` is cleaned automatically:
- Completed jobs: removed after 7 days (configurable via `job_retention_hours`)
- Failed jobs: removed after 1 day
- Cleanup runs on startup and every 6 hours

## Architecture Support

> **Note:** The first prebuilt release is **amd64-only**. aarch64 is temporarily disabled due to QEMU cross-compilation crashes in CI.

## Configuration

See [DOCS.md](DOCS.md) for configuration options and usage details.
