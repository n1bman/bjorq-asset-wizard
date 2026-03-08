

# Implement POST /analyze — V1

## Changes

### 1. `server/src/types/analyze.ts` (new)

Backend types for analysis response — `TextureDetail`, `Recommendation`, `AnalysisResult`. Matches the API spec shape. Response is always `{ success: true, analysis: AnalysisResult }`.

### 2. `server/src/services/analysis/analyzer.ts` (new)

Core analysis function: `analyzeModel(buffer: Uint8Array, fileName: string): Promise<AnalysisResult>`

- Use `@gltf-transform/core` `NodeIO` with `readBinary` (GLB) or `readJSON` (glTF) — **pure in-memory, no temp files**
- Walk document to extract:
  - **Geometry**: iterate `doc.getRoot().listMeshes()` → primitives → count triangles (indices length / 3 or vertex count / 3), vertices, meshes
  - **Materials**: `listMaterials()` → names, count
  - **Textures**: `listTextures()` → count; **best-effort** width/height/format via `getSize()` / `getMimeType()` wrapped in try-catch per texture — partial details on failure, never fails the whole analysis
  - **Bounding box**: walk position accessors, compute global min/max → derive width/depth/height
  - **Extras**: count cameras, lights (via extensions or nodes), animations, empty nodes
- Compute performance ratings using triangle thresholds:
  - Desktop: ok < 500k, recommended < 1M, strongly ≥ 1M
  - Tablet: ok < 200k, recommended < 500k, strongly ≥ 500k
  - Low-power: ok < 100k, recommended < 200k, strongly ≥ 200k
- Generate recommendations array (TEXTURE_TOO_LARGE, HIGH_TRIANGLE_COUNT, CONTAINS_CAMERAS, CONTAINS_LIGHTS, EMPTY_NODES, etc.)
- Derive overall `status` from worst performance tier
- Placeholder values for `estimatedScale` and `placement` in V1

### 3. `server/src/routes/analyze.ts` (rewrite)

Replace 501 stub:

1. `const file = await request.file()` — get multipart upload
2. Validate: no file → 400; extension not `.glb`/`.gltf` → 400
3. `const buffer = await file.toBuffer()` — read into memory
4. Create job logger via `createJobLogger` / `generateJobId`
5. Log: file received (name, size)
6. Call `analyzeModel(buffer, fileName)`
7. Log: analysis complete (mesh count, triangle count)
8. Return `{ success: true, analysis }` with status 200
9. Catch: parse errors → 422, unexpected → 500

No temp files written. Pure read-only analysis.

### 4. `server/package.json` (modify)

Move `@gltf-transform/core` from `optionalDependencies` to `dependencies`. Keep extensions/functions as optional (not needed for analyze V1).

### Error responses

All use `{ success: false, error: "<message>" }` format.

| Case | Status |
|------|--------|
| No file | 400 |
| Bad format | 400 |
| Parse failure | 422 |
| Unexpected | 500 |

