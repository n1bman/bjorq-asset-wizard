# Bjorq Asset Wizard

3D asset analysis, optimization, and catalog management for Bjorq smart home visualization.

## Features

- **Analyze** — Upload GLB/glTF models and get detailed analysis (mesh count, textures, file size breakdown)
- **Optimize** — Automated optimization pipeline (texture compression, mesh cleanup, file size reduction)
- **Catalog** — Organize optimized assets into a structured catalog by category
- **Dashboard** — Web UI for managing the full asset pipeline

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
2. Images are pushed to GHCR as `ghcr.io/n1bman/bjorq-asset-wizard-amd64` and `ghcr.io/n1bman/bjorq-asset-wizard-aarch64`
3. `config.yaml` contains `image: ghcr.io/n1bman/bjorq-asset-wizard-{arch}` — HA resolves `{arch}` at install time
4. Version updates are controlled by bumping the version in `config.yaml` and publishing a matching tagged image

### Releasing a new version

1. Update the `version` field in `bjorq_asset_wizard/config.yaml`
2. Commit and push
3. Create a git tag matching the version: `git tag v0.2.3 && git push origin v0.2.3`
4. GitHub Actions builds and pushes the per-arch images
5. HA picks up the new version on next add-on store refresh

> **Important**: Home Assistant cannot install a version until the matching GHCR image exists. All three steps (version bump in `config.yaml` → git tag → successful Docker workflow) must complete before the add-on is installable. If the workflow fails, HA will show the version but fail to pull the image.


### Local development / testing

The `Dockerfile` and `prepare-addon.sh` in this directory are retained for local testing only.
They are **not used** by Home Assistant during installation.

```bash
# Stage server source into this directory
./bjorq_asset_wizard/prepare-addon.sh

# Build locally
cd bjorq_asset_wizard
docker build --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19 -t bjorq-wizard-test .
```

## Troubleshooting: HA Shows Wrong Version

If Home Assistant still shows an old version after a release:

1. Go to **Settings → Add-ons → Add-on Store** (⋮ menu → **Repositories**)
2. **Remove** the repository URL
3. Click **Reload** (top-right ⋮ menu)
4. **Re-add** the repository URL
5. Verify the correct version (currently **0.2.1**) appears before clicking Install
6. If still stale, restart **Supervisor** or **Home Assistant Core** from **Settings → System → Restart**

## Configuration

See [DOCS.md](DOCS.md) for configuration options and usage details.
