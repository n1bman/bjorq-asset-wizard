

# Phase 1 — Runtime Stabilization (v0.2.8)

## Root Cause

Line 80 in both `server/src/index.ts` and `bjorq_asset_wizard/server/src/index.ts`:

```typescript
origin: process.env.CORS_ORIGINS === "*" ? true : process.env.CORS_ORIGINS?.split(","),
```

When `CORS_ORIGINS` is unset (which it is — the root Dockerfile's CMD bypasses `run.sh`), this evaluates to `origin: undefined`, which `@fastify/cors` rejects with "Invalid CORS origin option" → 500 on every request → restart loop.

## Changes

### 1. `server/src/index.ts` — Fix CORS + add root route + add VERSION

- Replace fragile CORS line with safe parsing that defaults to `origin: true`
- Add `const VERSION = "0.2.8"` at top
- Add `GET /` route returning service info

### 2. `server/src/routes/health.ts` — Fix VERSION

- Change `process.env.npm_package_version || "0.1.0"` → `"0.2.8"`
- (`npm_package_version` is never set when running `node dist/index.js` directly)

### 3. `bjorq_asset_wizard/server/src/index.ts` — Same CORS + root route fix

Mirror identical changes from `server/src/index.ts`.

### 4. `bjorq_asset_wizard/server/src/routes/health.ts` — Same VERSION fix

### 5. `Dockerfile` — Add `CORS_ORIGINS=*` to ENV block

Add to existing ENV defaults so CORS works even without `run.sh`.

### 6. `bjorq_asset_wizard/Dockerfile` — Add `CORS_ORIGINS=*` to ENV block

### 7. Version bump to 0.2.8

- `server/package.json` → `"0.2.8"`
- `bjorq_asset_wizard/server/package.json` → `"0.2.8"`
- `bjorq_asset_wizard/config.yaml` → `"0.2.8"`

### 8. `CHANGELOG.md` — Create with v0.2.8 entry

### 9. `bjorq_asset_wizard/README.md` + `bjorq_asset_wizard/DOCS.md` — Update version refs

## After merge

```
git tag v0.2.8 && git push origin v0.2.8
```

## Expected Result

- Server starts, CORS never crashes regardless of env config
- `GET /` returns JSON status (no 500)
- `/health` returns version `0.2.8`
- Add-on stays running, no restart loop

