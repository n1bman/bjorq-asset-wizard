

# v2.0.2 — HA Image Build Pipeline Fix

## Root Cause (definitive)

The HA add-on is **pulling the wrong Docker image**.

**The build pipeline:**
- `docker.yml` triggers on `v*` tags
- It builds from **repo root context** using the **root `Dockerfile`**
- It pushes to `ghcr.io/n1bman/bjorq-asset-wizard-amd64`

**The HA add-on config (`config.yaml`):**
- `image: "ghcr.io/n1bman/bjorq-asset-wizard-{arch}"`
- HA pulls this prebuilt image

**The problem:**
The root `Dockerfile` is the **standalone** image. It creates a non-root `bjorq` user (UID 1001) and runs `CMD ["node", "dist/index.js"]`. When HA mounts `/data` at runtime, the mount overwrites the pre-created directories, and the `bjorq` user cannot write to the HA-mounted `/data` volume. There is no `run.sh`, no `bashio`, no HA integration.

The **HA-specific** `bjorq_asset_wizard/Dockerfile` (which uses the HA base image, runs as root, and uses `run.sh`) is **never built or pushed by CI**. It exists in the repo but has no workflow.

This explains both errors:
1. **EACCES** — the `bjorq` user can't write to HA-mounted `/data`
2. **`/app/public/catalog`** — without `run.sh` exporting `CATALOG_PATH=/data/catalog`, the env might fall through to defaults depending on build caching

## Fix

Add a dedicated GitHub Actions workflow that builds the HA add-on image from `bjorq_asset_wizard/` context using `bjorq_asset_wizard/Dockerfile`, and pushes it to the same GHCR tag that `config.yaml` references.

The existing `docker.yml` continues to build the standalone image (for docker-compose users) under a different tag.

| File | Change |
|------|--------|
| `.github/workflows/ha-addon.yml` | **New** — builds HA image from `bjorq_asset_wizard/` context |
| `.github/workflows/docker.yml` | Rename image tag to `-standalone-amd64` to avoid collision |
| `bjorq_asset_wizard/config.yaml` | Keep `image` pointing to the HA-specific tag |
| Version surfaces | Bump to `2.0.2` |
| `CHANGELOG.md` | Add entry |

### New workflow: `.github/workflows/ha-addon.yml`

```yaml
name: HA Add-on Build

on:
  push:
    tags: ["v*"]

permissions:
  contents: read
  packages: write

jobs:
  build-ha-addon:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Prepare add-on directory
        run: ./bjorq_asset_wizard/prepare-addon.sh

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3

      - name: Build and push HA image
        uses: docker/build-push-action@v6
        with:
          context: bjorq_asset_wizard
          file: bjorq_asset_wizard/Dockerfile
          push: true
          platforms: linux/amd64
          tags: |
            ghcr.io/n1bman/bjorq-asset-wizard-amd64:${{ steps.version.outputs.version }}
            ghcr.io/n1bman/bjorq-asset-wizard-amd64:latest
```

### Updated `docker.yml` (standalone image — separate tag)

Change the tag from `bjorq-asset-wizard-amd64` to `bjorq-asset-wizard-standalone-amd64` so it no longer collides with the HA image:

```yaml
tags: |
  ghcr.io/n1bman/bjorq-asset-wizard-standalone-amd64:${{ steps.version.outputs.version }}
  ghcr.io/n1bman/bjorq-asset-wizard-standalone-amd64:latest
```

### Version bump to 2.0.2

All 10+ version surfaces updated (same list as previous bumps).

### CHANGELOG

```
## [2.0.2] — 2026-03-10

### Fixed
- **HA add-on now builds from correct Dockerfile** — CI was pushing the standalone
  image (non-root user, no run.sh) instead of the HA-specific image (HA base, root
  user, bashio integration). Added dedicated `ha-addon.yml` workflow.
- Standalone image moved to separate GHCR tag to prevent collision.
```

## Why previous fixes didn't work

Every code fix (initStorage order, mkdir in Dockerfile, run.sh reorder) was correct and present in `bjorq_asset_wizard/Dockerfile` + `bjorq_asset_wizard/run.sh`. But HA never ran that code — it pulled the root `Dockerfile` image which has none of those HA-specific fixes.

