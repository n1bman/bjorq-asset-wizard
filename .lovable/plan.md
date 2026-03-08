

# Fix Root Dockerfile — npm ci Failure

## Problem

`npm ci` requires a `package-lock.json` file. The `server/` directory has no lockfile (the project uses Bun at the root level with `bun.lock`). The glob pattern `server/package-lock.json*` matches nothing, so `npm ci` fails in both build and production stages.

## Fix

Replace `npm ci` with `npm install` in both Dockerfile stages. This works directly from `package.json` without requiring a lockfile.

### `Dockerfile` changes

**Line 20** (build stage):
```
npm ci --ignore-scripts  →  npm install --ignore-scripts
```

**Line 42** (production stage):
```
npm ci --omit=dev --ignore-scripts  →  npm install --omit=dev --ignore-scripts
```

Also remove the non-functional `server/package-lock.json*` glob from both COPY lines (19, 41) since the file doesn't exist. Just copy `server/package.json`.

No other changes. Same multi-stage structure, same sharp rebuild, same runtime config.

## Summary

- **What changed**: `npm ci` → `npm install` in both stages; removed phantom lockfile COPY
- **Why it failed**: No `package-lock.json` exists in `server/` — project uses Bun
- **Install strategy**: `npm install` from `package.json` (reliable without lockfile)
- **GHCR workflow**: Should now pass — the Dockerfile is the only thing that was broken

