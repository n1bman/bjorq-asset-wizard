

# Fix: HA Add-on Dockerfile Build

## Problem

The current Dockerfile clones the repo via `git clone` during build. Home Assistant already provides the repository files as the build context, so this is unnecessary and likely causing the build failure that HA reports as "dockerfile is missing."

## Changes

### 1. `bjorq_asset_wizard/Dockerfile` — Replace entirely

Use the user-provided minimal Dockerfile that relies on HA's build context instead of cloning:

```dockerfile
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19
FROM ${BUILD_FROM}

WORKDIR /app
COPY . /app

RUN apk add --no-cache nodejs npm python3 make g++
RUN npm install
RUN npm run build || true

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
```

### 2. `bjorq_asset_wizard/build.yaml` — Update base images

Switch from `node:20-alpine` to standard HA base images:

```yaml
build_from:
  amd64: "ghcr.io/home-assistant/amd64-base:3.19"
  aarch64: "ghcr.io/home-assistant/aarch64-base:3.19"
```

### 3. `bjorq_asset_wizard/config.yaml` — Update port to 3000

Change port mapping and ingress port from 3500 to 3000.

### Important note

HA uses the **add-on subdirectory** (`bjorq_asset_wizard/`) as the Docker build context — not the repo root. This means `COPY . /app` only copies files inside `bjorq_asset_wizard/` (config.yaml, run.sh, etc.), not the `server/` directory. The `npm run build || true` will silently fail.

This will get past the "dockerfile is missing" error and let us see the actual build output, but the server won't start until we either:
- Copy server source into the add-on directory, or
- Restore the `git clone` approach with the correct HA base image

I'll implement exactly what you've requested so we can move forward.

