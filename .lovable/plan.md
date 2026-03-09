

# v1.1.11 — Persistence Fix, Thumbnail Display, Dimensions Pipeline, Optimization Profiles

## Root Cause Analysis

### 1. Catalog persistence failure — CONFIRMED BUG

**Root cause found in `storage.ts` line 11-12:**
```
export const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";
export const CATALOG_PATH = process.env.CATALOG_PATH || "./public/catalog";
```

The `run.sh` sets `CATALOG_PATH=/data/catalog` and `STORAGE_PATH=/data/storage` correctly. **However**, these environment variables are evaluated at module import time via `const`. If anything causes the module to load before `run.sh` sets the env vars (unlikely but possible), defaults kick in.

**The real bug is in the Dockerfile defaults:**
```dockerfile
# Dockerfile line 77-78
ENV STORAGE_PATH=./storage \
    CATALOG_PATH=./public/catalog
```
The **standalone Dockerfile** bakes `./storage` and `./public/catalog` as defaults. While the HA Dockerfile sets correct paths, **the `storage.ts` fallback defaults are `./storage` and `./public/catalog`** — both container-local.

But the HA Dockerfile (`bjorq_asset_wizard/Dockerfile`) correctly sets `STORAGE_PATH=/data/storage` and `CATALOG_PATH=/data/catalog` in ENV. And `run.sh` also exports them.

**So the actual remaining risk:** The `resolve()` call in `server/src/index.ts` line 46-47 uses the same defaults. If for any reason env vars are not set, the fallback writes to container-local paths.

**Fix:** Change ALL fallback defaults in `storage.ts` and `index.ts` from relative paths to `/data/` paths. In HA, `/data` is always the persistent mount. For standalone Docker, the Dockerfile already overrides. This makes the system safe-by-default for HA.

Additionally, add an explicit startup log that prints the **resolved absolute paths** being used, so we can verify in HA logs exactly where files are being written.

### 2. Thumbnail display failure

**Root cause found in `AssetCard.tsx` line 19:**
```tsx
<Box className="h-12 w-12 text-muted-foreground/40" />
```
The card **never renders the thumbnail image**. It always shows the Box icon placeholder. The `thumbnail` field exists in metadata but the frontend ignores it.

The `meta.json` stores `thumbnail: "/tech/tech-2/google-mini/thumb.webp"` — this is a relative catalog path. The actual file is served from `/catalog/files/tech/tech-2/google-mini/thumb.webp` (via the static file serving route).

**Fix:** Update `AssetCard.tsx` to render `<img>` when `asset.thumbnail` exists, with fallback to Box icon. Same for `AssetDetailDrawer.tsx`.

### 3. Dimensions disappear after optimization

**Root cause found in `manager.ts` line 213:**
```typescript
dimensions: (jobMeta.after as Record<string, unknown>)?.dimensions as CatalogAssetMeta["dimensions"] ?? undefined,
```

It reads `jobMeta.after.dimensions` — but `after` in result.json is a `StatsSnapshot` (`{ fileSizeKB, triangles, materials, textures, maxTextureRes }`). It has **no `dimensions` field**.

Dimensions are stored in `result.json` under `scene.dimensions` (line 123 of optimize.ts), not under `after`.

**Fix:** Change manager.ts to read from `scene.dimensions` instead of `after.dimensions`.

---

## Changes

### Files to edit

| File | Change |
|------|--------|
| `server/src/lib/storage.ts` | Change defaults to `/data/storage` and `/data/catalog` |
| `server/src/index.ts` | Change defaults to `/data/storage` and `/data/catalog`; add resolved-path startup log |
| `server/src/services/catalog/manager.ts` | Fix dimensions: read from `scene.dimensions` instead of `after.dimensions` |
| `src/components/catalog/AssetCard.tsx` | Render thumbnail image when available |
| `src/components/catalog/AssetDetailDrawer.tsx` | Render thumbnail in detail view |
| `src/components/optimize/OptimizeOptions.tsx` | Add optimization profile selector (High Quality / Balanced / Low Power) |
| `server/src/types/optimize.ts` | Add `profile` field to OptimizeRequestOptions |
| `server/src/services/optimization/optimizer.ts` | Apply profile presets before processing individual options |
| `src/types/api.ts` | Add `profile` to OptimizeOptions |
| All version surfaces | 1.1.11 |
| `CHANGELOG.md` | 1.1.11 entry |
| + mirrors in `bjorq_asset_wizard/server/` | |

### Optimization Profiles

Profiles set defaults that individual toggles can still override:

- **High Quality**: `maxTextureSize: 4096`, `normalizeScale: false`, `setFloorToY0: false`, `optimizeBaseColorTextures: false`
- **Balanced** (default, current behavior): `maxTextureSize: 2048`, all V2 features enabled
- **Low Power**: `maxTextureSize: 512`, all cleanup + normalization enabled, aggressive texture compression

The profile is applied server-side: if `options.profile` is set, missing individual options inherit from the profile preset.

### Thumbnail URL resolution

Catalog meta stores `thumbnail: "/category/sub/id/thumb.webp"`. The static file route serves from `/catalog/files/`. So the frontend constructs the URL as: `${apiBase}/catalog/files${asset.thumbnail}` or uses the dedicated `/catalog/asset/:id/thumbnail` endpoint.

Using the API endpoint is simpler and already works: `/catalog/asset/${asset.id}/thumbnail`.

### Validation steps

1. Check HA startup logs for: `Catalog path: /data/catalog (resolved)`
2. Save asset to catalog → verify meta.json has dimensions
3. Restart add-on → asset still in catalog
4. Thumbnail visible on catalog card
5. Test Low Power profile → verify smaller output

