

## Diagnosis

The CI fails at **`bun run typecheck`** (`tsc --noEmit`) in the Backend job. Exit code 2 = TypeScript compilation errors.

**Root cause**: `@gltf-transform/functions` v4.3 **removed `textureResize`** as a standalone export (merged it into `textureCompress`). Your `server/package.json` uses `"^4.1.0"`, which resolves to the latest 4.x. Since there is no `server/bun.lock` file checked in, CI always installs the latest matching version.

In `server/src/services/generation/style-normalizer.ts` line 85:
```typescript
const { prune, weld, simplify, dedup, flatten, textureResize } = await import("@gltf-transform/functions");
```
`textureResize` no longer exists in the module's type definitions, causing:
```
Property 'textureResize' does not exist on type 'typeof import("@gltf-transform/functions")'
```

The same issue exists in `bjorq_asset_wizard/server/src/services/generation/style-normalizer.ts`.

## Plan

### 1. Replace `textureResize` with `textureCompress` in style-normalizer.ts

In both `server/` and `bjorq_asset_wizard/server/`:

- Remove `textureResize` from the destructured import
- Import `textureCompress` instead
- Import `sharp` (already a dependency)
- Replace the texture resize call:

```typescript
// Before:
await doc.transform(textureResize({ size: [config.maxTextureRes, config.maxTextureRes] }));

// After:
const sharpModule = (await import("sharp")).default;
await doc.transform(
  textureCompress({ encoder: sharpModule, resize: [config.maxTextureRes, config.maxTextureRes] })
);
```

This matches the pattern already used in `optimizer.ts`.

### 2. Pin @gltf-transform versions to prevent future breakage

In `server/package.json`, pin exact versions instead of using `^`:

```json
"@gltf-transform/core": "4.1.0",
"@gltf-transform/extensions": "4.1.0",
"@gltf-transform/functions": "4.1.0"
```

Or alternatively, if the `textureCompress` fix works, keep `^4.1.0` but ensure the code uses only stable APIs.

### 3. Mirror changes to bjorq_asset_wizard/server

Apply the same fix to `bjorq_asset_wizard/server/src/services/generation/style-normalizer.ts`.

### Impact

- **2 files changed** (style-normalizer.ts in both server dirs)
- **1 file optionally changed** (server/package.json for pinning)
- No functional change -- texture resizing still works identically via `textureCompress`

