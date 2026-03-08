

# Fix: HA Add-on Dockerfile Missing Error

## Problem

Home Assistant's add-on builder uses the add-on directory (`bjorq_asset_wizard/`) as the Docker build context. The current Dockerfile expects `server/` to be pre-copied by `prepare-addon.sh`, but HA never runs that script. So `COPY server/...` fails and HA reports "dockerfile is missing" (its generic error for build failures).

## Root Cause

HA clones the repo → enters `bjorq_asset_wizard/` → runs `docker build .` → no `server/` directory exists → build fails.

## Solution

Rewrite `bjorq_asset_wizard/Dockerfile` to be fully self-contained. Since we can't change HA's build context, the Dockerfile will:

1. Use `ghcr.io/home-assistant/*-base` as `BUILD_FROM` (already in `build.yaml`)
2. In a builder stage, install Node.js, then clone the repo from GitHub to get server source
3. Build the server
4. Copy built artifacts to production stage
5. Copy `run.sh` (which IS in the build context)

Also update `build.yaml` to use Node 20 Alpine as the base (the HA base images don't include Node.js, which complicates things). The standard HA add-on pattern for Node apps is to use `node:20-alpine` as base and install bashio manually.

### Files Changed

| File | Change |
|------|--------|
| `bjorq_asset_wizard/Dockerfile` | Rewrite — self-contained build that clones repo in builder stage |
| `bjorq_asset_wizard/build.yaml` | Update base images to `node:20-alpine` |
| `bjorq_asset_wizard/config.yaml` | Minor — remove `armv7` (Node 20 Alpine doesn't reliably support it) |

### Dockerfile approach

```text
Stage 1 (builder): node:20-alpine
  ├── apk add git python3 make g++ vips-dev
  ├── git clone --depth 1 https://github.com/n1bman/bjorq-asset-wizard.git /src
  ├── cd /src/server && npm ci && npm run build
  └── output: /src/server/dist + node_modules

Stage 2 (production): node:20-alpine  
  ├── apk add vips bash curl
  ├── Install bashio (for run.sh compatibility)
  ├── COPY --from=builder built artifacts
  ├── COPY run.sh (from build context)
  ├── mkdir /data dirs
  └── CMD ["/run.sh"]
```

The `prepare-addon.sh` script remains for local development builds but is no longer required for HA installation.

