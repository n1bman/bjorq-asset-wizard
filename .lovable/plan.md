

# Bjorq Asset Optimizer — Project Scaffolding Documentation

I'll generate a comprehensive set of reference documents you can use when building the Node.js/Fastify backend. This will include:

1. **A detailed README.md** — purpose, architecture, endpoints, storage, catalog flow, HA add-on roadmap
2. **API specification** — all endpoints with request/response schemas and examples
3. **Project structure reference** — folder layout, module responsibilities
4. **.env.example** — configuration reference
5. **Roadmap document** — phased delivery plan

These will be created as markdown files in a `docs/bjorq-asset-optimizer/` folder in this project so you can copy them into your new repo.

## Files to create

### `docs/bjorq-asset-optimizer/README.md`
Full project README covering: purpose, tech stack, setup instructions, architecture overview, API endpoints summary, storage layout, catalog structure, HA add-on preparation notes, V1 scope vs future scope.

### `docs/bjorq-asset-optimizer/API_SPEC.md`
Detailed API specification for all 7 endpoints:
- `POST /analyze` — request (multipart file), response (analysis object with triangles, meshes, materials, textures, dimensions, scale, placement, performance ratings, status, recommendations)
- `POST /optimize` — request (multipart file + options JSON), response (analysis, optimized file URL, thumbnail URL, metadata, before/after stats)
- `POST /catalog/ingest` — request (multipart file + meta JSON), response (catalog entry)
- `POST /catalog/reindex` — response (index stats)
- `GET /catalog/index` — response (full manifest)
- `GET /health` — response (status, uptime)
- `GET /version` — response (version, build info)

Each with full JSON examples.

### `docs/bjorq-asset-optimizer/STRUCTURE.md`
Reference for the recommended `src/` folder layout and `storage/` layout with module responsibility descriptions.

### `docs/bjorq-asset-optimizer/env.example`
Environment variables: PORT, HOST, STORAGE_PATH, MAX_FILE_SIZE, LOG_LEVEL, THUMBNAIL_SIZE, CATALOG_PATH.

### `docs/bjorq-asset-optimizer/ROADMAP.md`
Phases 1–4 with scope per phase.

### `docs/bjorq-asset-optimizer/package-reference.json`
A starter `package.json` with recommended dependencies (fastify, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, sharp, fastify-multipart, pino, etc.) and scripts.

## Summary
6 files total, all documentation/reference — no code changes to the current app.

