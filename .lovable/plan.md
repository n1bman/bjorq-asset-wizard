

# Fix Wizard Docker Build (v0.2.3) and Align with Working Dashboard Pattern

## Problem

`npm install` fails with exit code 1 in the builder stage. Most likely cause: sharp 0.33+ conflicts with the system `vips-dev` package on Alpine, or prebuilt binary download fails under the build environment. The working `bjorq-dashboard` Dockerfile has no native deps and uses a simpler pattern.

## About the packages

The screenshot shows `bjorq-dashboard-{amd64,armv7,aarch64}` packages from the `bjorq` repo -- those are a separate add-on. The `bjorq-asset-wizard-{arch}` packages need to be built from *this* repo. They do not exist yet because the Docker build keeps failing.

## Dockerfile Fix

Rewrite the Dockerfile to follow the same proven pattern as the working dashboard Dockerfile, adapted for the wizard's backend-only build:

**Builder stage:**
- Remove `python3 make g++ vips-dev` -- sharp 0.33+ bundles its own libvips and downloads prebuilt platform binaries. System vips-dev can actually *conflict*.
- Keep `npm install` (installs all deps including devDependencies for `tsc`)
- Build TypeScript as before

**Production stage:**
- Remove `apk add vips` -- not needed when sharp bundles its own
- Copy `node_modules` from builder after pruning devDependencies, instead of running a second `npm install`. This eliminates the double-install problem entirely.
- Or simpler: copy server source + do a single `npm install --omit=dev` in production, then copy `dist/` from builder. No native dep issues since sharp downloads its own prebuilt binary.

The simplest approach (matching dashboard pattern):

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package.json ./
RUN npm install
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY server/package.json ./
RUN npm install --omit=dev
# ... storage dirs, user, env, healthcheck, CMD
```

No `vips-dev`, no `vips`, no `python3 make g++`. Sharp handles everything itself.

## Workflow -- armv7

The dashboard supports `armv7` but the wizard currently only builds `amd64` and `aarch64`. This matches the current `config.yaml` arch list so no change needed now. Can be added later if needed.

## Files Changed

| File | Change |
|------|--------|
| `Dockerfile` | Remove system vips/build-tools, simplify to match dashboard pattern |

## Expected Result

- `npm install` succeeds because sharp downloads its own prebuilt musl binaries without system vips interference
- GHCR publishes `bjorq-asset-wizard-amd64:0.2.3` and `bjorq-asset-wizard-aarch64:0.2.3`
- HA can pull the prebuilt image via `config.yaml`

