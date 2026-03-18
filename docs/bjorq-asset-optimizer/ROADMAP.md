# Bjorq Asset Optimizer — Roadmap

## Fas 1 — Core Pipeline ✅ (V1)

- [x] GLB/GLTF file parsing via glTF Transform
- [x] Model analysis (geometry, textures, materials, dimensions, scale, placement)
- [x] Performance rating (desktop / tablet / low-power)
- [x] Status & recommendations engine
- [x] Conservative optimization pipeline
  - Remove empty/unused nodes, cameras, lights, animations
  - Deduplicate materials
  - Remove unused vertex attributes
  - Normalize scale to meters
  - Normalize origin / set floor to Y=0
  - Resize oversized textures
  - Optimize base color textures
- [x] Safety guards (skip normal maps, PBR textures, transparency, complex pivots)
- [x] Thumbnail generation (basic V1)
- [x] Metadata generation (`meta.json`)
- [x] Export optimized `.glb`
- [x] Before/after statistics
- [x] RESTful API (Fastify)
- [x] Local filesystem storage

## Fas 2 — Catalog & Workflow

- [ ] Catalog ingest endpoint
- [ ] `index.json` manifest generation
- [ ] Curated asset directory structure
- [ ] Catalog reindex / validation
- [ ] Simple admin UI (upload → analyze → optimize → catalog)
- [ ] Batch processing support
- [ ] Asset versioning (track original → optimized lineage)

## Fas 3 — Bjorq Integration

- [ ] Pipeline integration with Bjorq dashboard import dialog
- [ ] Asset library API for Bjorq's 3D scene editor
- [ ] Webhook / callback support (notify Bjorq when optimization completes)
- [ ] Asset tagging and search
- [ ] Category auto-detection heuristics
- [ ] Placement confidence improvements

## Fas 4 — Production & Deployment ✅

- [x] Dockerfile
- [x] Home Assistant add-on packaging (`config.yaml`, `run.sh`)
- [x] Volume mount configuration for persistent storage
- [x] Health monitoring and metrics
- [x] `meshoptimizer` integration for mesh simplification
- [x] Advanced decimation with quality presets
- [x] LOD generation (prepared as metadata — runtime switching is Dashboard's job)
- [ ] High-quality thumbnail rendering (headless GL / three.js)
- [ ] Authentication / API key support
- [ ] Rate limiting
- [ ] Remote storage backend (S3-compatible)

## Future Ideas

- AI-assisted placement detection improvements
- glTF compliance validation
- Asset diffing (compare two versions)
- WebSocket progress streaming for large files
- Multi-language metadata support
- Multi-library support
