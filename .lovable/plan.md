

# Phase 2 — API Verification & Storage Path Fix (v0.2.9)

## Bug Found: Catalog Static Serving Path Mismatch

There is a real bug that would prevent the catalog from working in Home Assistant:

In `server/src/index.ts`, the catalog static file serving is registered as:
```typescript
root: resolve(STORAGE_PATH, "catalog")  // → /data/storage/catalog
```

But the catalog manager (`manager.ts`) writes files to:
```typescript
CATALOG_PATH  // → /data/catalog
```

In HA, `run.sh` sets `STORAGE_PATH=/data/storage` and `CATALOG_PATH=/data/catalog`. These are **different directories**. Catalog files are written to `/data/catalog` but served from `/data/storage/catalog` — so all catalog assets would be invisible via the API.

## Changes

### 1. Fix catalog static serving in `server/src/index.ts`

Replace the hardcoded `STORAGE_PATH + "/catalog"` with `CATALOG_PATH` from the environment:

```typescript
const CATALOG_PATH_RESOLVED = resolve(process.env.CATALOG_PATH || "./public/catalog");

// Static file serving for catalog assets
await server.register(fastifyStatic, {
  root: CATALOG_PATH_RESOLVED,
  prefix: "/catalog/files/",
  ...
});
```

### 2. Add STORAGE_PATH and CATALOG_PATH to `bjorq_asset_wizard/Dockerfile` ENV

Currently the HA Dockerfile only sets `PORT`, `HOST`, `CORS_ORIGINS`. Add safe defaults:

```dockerfile
ENV NODE_ENV=production \
    PORT=3500 \
    HOST=0.0.0.0 \
    CORS_ORIGINS=* \
    STORAGE_PATH=/data/storage \
    CATALOG_PATH=/data/catalog
```

These match what `run.sh` sets, providing a safety net if bashio fails.

### 3. Mirror fix to `bjorq_asset_wizard/server/src/index.ts`

Same catalog path fix.

### 4. Version bump to 0.2.9

Update across all files:
- `server/src/index.ts` — VERSION constant
- `server/src/routes/health.ts` — VERSION constant
- `server/package.json`
- `bjorq_asset_wizard/server/src/index.ts`
- `bjorq_asset_wizard/server/src/routes/health.ts`
- `bjorq_asset_wizard/server/package.json`
- `bjorq_asset_wizard/config.yaml`
- `CHANGELOG.md`
- `bjorq_asset_wizard/README.md` (version reference)

## Files Changed

| File | Change |
|------|--------|
| `server/src/index.ts` | Fix catalog static path, bump VERSION |
| `server/src/routes/health.ts` | Bump VERSION |
| `server/package.json` | Bump version |
| `bjorq_asset_wizard/server/src/index.ts` | Same fixes |
| `bjorq_asset_wizard/server/src/routes/health.ts` | Bump VERSION |
| `bjorq_asset_wizard/server/package.json` | Bump version |
| `bjorq_asset_wizard/Dockerfile` | Add STORAGE_PATH, CATALOG_PATH ENV |
| `bjorq_asset_wizard/config.yaml` | Bump version |
| `bjorq_asset_wizard/README.md` | Update version refs |
| `CHANGELOG.md` | Add v0.2.9 entry |

## Expected Result

- Catalog ingest writes to `CATALOG_PATH` and static serving reads from the same path
- Full pipeline works: upload → analyze → optimize → ingest → appears in `/catalog/index`
- Storage paths are deterministic in HA even if bashio fails
- Tag `v0.2.9` triggers a working Docker build

