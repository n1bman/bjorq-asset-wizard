

# Implement POST /optimize — V1

## Overview

Replace the 501 stub with a working optimization endpoint. Uses `@gltf-transform/functions` for conservative cleanup, stores outputs in `storage/jobs/<jobId>/`, and returns a response matching the existing frontend `OptimizeResponse` type.

## Files to Create/Modify

### 1. `server/src/types/optimize.ts` (new)

Backend-local types for optimize options and result. Mirrors the frontend `OptimizeOptions` shape for the boolean toggle flags.

### 2. `server/src/services/optimization/slugify.ts` (new)

- `slugify(name)` — lowercase, replace non-alphanum with hyphens, trim
- `deriveAssetId(assetName?, fileName?)` — use provided name or strip extension from filename, return slug

Used only for metadata — not for storage paths.

### 3. `server/src/services/optimization/optimizer.ts` (new)

Core function: `optimizeModel(buffer, fileName, options) → OptimizeResult`

1. Parse buffer via `NodeIO.readBinary` (GLB) or `readJSON` (glTF)
2. Run "before" analysis via existing `analyzeModel()`
3. Apply transforms based on **user-provided options**:
   - `prune()` — always on (logged as default step)
   - `dedup()` — always on (logged as default step)
   - Remove cameras — only if `options.removeCameras` is true
   - Remove lights — only if `options.removeLights` is true
   - Remove animations — only if `options.removeAnimations` is true
   - Remove empty nodes — only if `options.removeEmptyNodes` is true
   - Remove unused nodes — only if `options.removeUnusedNodes` is true
   - Deduplicate materials — only if `options.deduplicateMaterials` is true
4. Write optimized GLB via `io.writeBinary(doc)`
5. Run "after" analysis on the output buffer
6. Compute reduction stats
7. Return result with applied/skipped arrays, before/after stats

**Not implemented in V1**: simplify, decimate, draco, texture resize, normalizeScale, setFloorToY0, optimizeBaseColorTextures (these are logged as "skipped" with reason).

### 4. `server/src/routes/optimize.ts` (rewrite)

1. Extract multipart: file + optional `options` JSON field
2. Validate extension (.glb/.gltf) → 400 if invalid
3. Generate `jobId` via `generateJobId()`
4. Derive `assetId` from `options.assetName` or filename via `deriveAssetId()`
5. Call `optimizeModel(buffer, fileName, parsedOptions)`
6. Create `storage/jobs/<jobId>/` directory
7. Write `original.{glb|gltf}`, `optimized.glb`, `result.json`
8. Return `OptimizeResponse` matching frontend type:

```json
{
  "success": true,
  "jobId": "...",
  "analysis": { /* before analysis */ },
  "optimization": {
    "applied": ["prune", "dedup", "removeCameras"],
    "skipped": [{ "operation": "normalizeScale", "reason": "Not implemented in V1" }],
    "warnings": []
  },
  "stats": {
    "before": { "fileSizeKB": ..., "triangles": ..., "materials": ..., "textures": ..., "maxTextureRes": ... },
    "after": { ... },
    "reduction": { "fileSizePercent": ..., "materialsRemoved": ..., "texturesRemoved": ..., "texturesResized": 0 }
  },
  "outputs": {
    "optimizedModel": "/jobs/<jobId>/optimized.glb",
    "thumbnail": "",
    "metadata": "/jobs/<jobId>/result.json",
    "report": ""
  },
  "metadata": {
    "id": "google-home-mini",
    "name": "Google Home Mini",
    "category": "...",
    ...
  }
}
```

### 5. `server/package.json` (modify)

Move `@gltf-transform/functions` and `@gltf-transform/extensions` from `optionalDependencies` to `dependencies`.

## Key Design Decisions

- **Storage isolation**: `storage/jobs/<jobId>/` only — no slug-based dirs
- **Asset naming**: slug in response metadata only, not in file paths
- **Original extension preserved**: `original.glb` or `original.gltf` based on input
- **Optimized output**: always `optimized.glb` (binary is universally safer)
- **Options-driven**: backend respects frontend toggle state; `prune` and `dedup` are always-on defaults, clearly logged
- **V1 skips**: normalizeScale, setFloorToY0, optimizeBaseColorTextures, maxTextureSize, textureQuality, thumbnails → returned in `skipped[]` with reason

## Error Responses

| Case | Status |
|------|--------|
| No file | 400 |
| Bad format | 400 |
| Invalid options JSON | 400 |
| Parse/optimization failure | 422 |
| Unexpected error | 500 |

