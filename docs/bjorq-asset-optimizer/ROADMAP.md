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

## Fas 2 — Catalog & Workflow ✅

- [x] Catalog ingest endpoint
- [x] `index.json` manifest generation
- [x] Curated asset directory structure
- [x] Catalog reindex / validation
- [x] Admin UI (upload → analyze → optimize → catalog)
- [x] Asset versioning (track original → optimized lineage)
- [ ] Batch processing support

## Fas 3 — Bjorq Integration ✅

- [x] Pipeline integration with Bjorq dashboard import dialog
- [x] Asset library API for Bjorq's 3D scene editor
- [x] Asset tagging and search
- [x] Category auto-detection heuristics
- [x] Photo → 3D generation with TRELLIS.2
- [x] Style variants and drift detection
- [ ] Webhook / callback support (notify Bjorq when optimization completes)
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
