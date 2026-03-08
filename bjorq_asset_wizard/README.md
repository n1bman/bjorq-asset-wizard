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

Home Assistant builds the add-on only from this directory (`bjorq_asset_wizard/`).
The backend server source lives at `server/` in the repo root, so it must be staged
into this directory before the HA builder runs.

### Preparing the add-on

From the repo root:

```bash
./bjorq_asset_wizard/prepare-addon.sh
```

This copies the following into `bjorq_asset_wizard/server/`:

| File | Purpose |
|------|---------|
| `server/package.json` | Backend dependencies |
| `server/package-lock.json` | Lockfile (if present) |
| `server/tsconfig.json` | TypeScript config |
| `server/src/` | Backend source code |

The staged `server/` directory is git-ignored — it is only needed at build time.

### Build flow

1. `prepare-addon.sh` stages server files into this directory
2. HA builder runs `Dockerfile` with this directory as context
3. Dockerfile installs deps, compiles TypeScript, sets up runtime
4. `run.sh` reads HA config options and starts the Node.js server

### Testing locally

```bash
# Stage files
./bjorq_asset_wizard/prepare-addon.sh

# Build Docker image
cd bjorq_asset_wizard
docker build --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19 -t bjorq-wizard-test .
```

## Configuration

See [DOCS.md](DOCS.md) for configuration options and usage details.
