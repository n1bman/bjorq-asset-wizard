# Bjorq Asset Optimizer — Project Structure

## Source Code

```
bjorq-asset-optimizer/
├── src/
│   ├── app/
│   │   ├── server.ts              # Fastify server setup, plugin registration
│   │   └── hooks.ts               # Global hooks (error handling, logging, cors)
│   │
│   ├── routes/
│   │   ├── analyze.ts             # POST /analyze
│   │   ├── optimize.ts            # POST /optimize
│   │   ├── catalog.ts             # POST /catalog/ingest, POST /catalog/reindex, GET /catalog/index
│   │   ├── health.ts              # GET /health
│   │   └── version.ts             # GET /version
│   │
│   ├── services/
│   │   ├── analysis/
│   │   │   ├── analyzer.ts        # Main analysis orchestrator
│   │   │   ├── geometry.ts        # Triangle, mesh, vertex counting
│   │   │   ├── textures.ts        # Texture info extraction
│   │   │   ├── materials.ts       # Material analysis
│   │   │   ├── dimensions.ts      # Bounding box, scale estimation
│   │   │   ├── placement.ts       # Placement candidate detection (floor/wall/table/etc.)
│   │   │   ├── performance.ts     # Performance rating per device class
│   │   │   └── recommendations.ts # Generate recommendation list from analysis
│   │   │
│   │   ├── optimization/
│   │   │   ├── optimizer.ts        # Main optimization orchestrator
│   │   │   ├── cleanup.ts          # Remove empties, cameras, lights, animations
│   │   │   ├── materials.ts        # Deduplicate materials, clean unused
│   │   │   ├── textures.ts         # Resize textures, optimize base color
│   │   │   ├── transform.ts        # Normalize scale, origin, floor Y=0
│   │   │   └── safety.ts           # Safety checks — skip risky operations
│   │   │
│   │   ├── thumbnails/
│   │   │   ├── generator.ts        # Thumbnail generation orchestrator
│   │   │   └── renderer.ts         # V1: placeholder/wireframe; later: 3D render
│   │   │
│   │   ├── metadata/
│   │   │   ├── generator.ts        # Build meta.json from analysis + options
│   │   │   └── schema.ts           # Zod schema for metadata validation
│   │   │
│   │   ├── catalog/
│   │   │   ├── manager.ts          # Ingest, organize, manage catalog entries
│   │   │   ├── indexer.ts          # Build/rebuild index.json
│   │   │   └── validator.ts        # Validate catalog structure & entries
│   │   │
│   │   └── storage/
│   │       ├── manager.ts          # File operations, directory management
│   │       ├── paths.ts            # Path resolution helpers
│   │       └── cleanup.ts          # Temp file cleanup, job expiry
│   │
│   ├── types/
│   │   ├── analysis.ts             # Analysis result types
│   │   ├── optimization.ts         # Optimization options & result types
│   │   ├── metadata.ts             # Meta.json type
│   │   ├── catalog.ts              # Catalog & index types
│   │   ├── api.ts                  # Request/response envelope types
│   │   └── common.ts               # Shared types (dimensions, placement, etc.)
│   │
│   ├── utils/
│   │   ├── file.ts                 # File type detection, size formatting
│   │   ├── id.ts                   # ID/slug generation
│   │   ├── validation.ts           # Input validation helpers
│   │   └── errors.ts               # Custom error classes
│   │
│   ├── config/
│   │   └── index.ts                # Environment config with defaults
│   │
│   └── index.ts                    # Entry point — bootstrap and start
│
├── storage/                        # Runtime data (gitignored)
│   ├── uploads/
│   ├── jobs/
│   ├── originals/
│   ├── optimized/
│   ├── thumbs/
│   └── catalog/
│
├── public/
│   └── catalog/                    # Curated catalog (committed to repo or volume)
│       ├── index.json
│       ├── furniture/
│       ├── devices/
│       └── decor/
│
├── tests/
│   ├── fixtures/                   # Sample .glb files for testing
│   ├── analysis.test.ts
│   ├── optimization.test.ts
│   ├── catalog.test.ts
│   └── api.test.ts
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── API_SPEC.md
├── STRUCTURE.md
└── ROADMAP.md
```

## Module Responsibilities

### `app/`
Server bootstrap. Register Fastify plugins (multipart, static, cors). Set up global error handler. No business logic here.

### `routes/`
Thin HTTP layer. Parse request, call service, format response. Each route file registers its own Fastify routes. No business logic — delegate to services.

### `services/analysis/`
Read-only model inspection. Takes a glTF Document (from glTF Transform), extracts all stats, returns a typed `AnalysisResult`. Never modifies the model.

### `services/optimization/`
Takes a glTF Document + options, applies safe transformations, returns the modified document + a report of what was done/skipped. Each sub-module handles one concern.

**`safety.ts`** is critical — it checks whether an operation is safe before applying it (e.g., skip origin normalization if pivot is complex, skip texture optimization for normal maps).

### `services/thumbnails/`
V1: Generate a simple preview image. Could be a flat color + dimensions overlay, or a very basic wireframe render. Structure allows swapping in a real 3D renderer later.

### `services/metadata/`
Build the `meta.json` object from analysis results + user-provided options (name, category, HA mapping, etc.). Validate with Zod schema.

### `services/catalog/`
Manage the `public/catalog/` directory. Handle ingesting new assets (copy files, create directory, write meta.json). Build `index.json` by scanning catalog directories.

### `services/storage/`
All filesystem operations. Path resolution, directory creation, file copy/move, temp cleanup. Single source of truth for where files live.

### `types/`
Shared TypeScript interfaces and types. No runtime code. Import from here across all modules.

### `config/`
Read environment variables with fallback defaults. Export a typed config object used throughout the app.

## Storage Directory Purposes

| Directory | Purpose | Lifecycle |
|-----------|---------|-----------|
| `uploads/` | Temporary landing for uploaded files | Cleaned after processing |
| `jobs/` | Per-job working directory with all outputs | Kept for retrieval, cleaned periodically |
| `originals/` | Permanent archive of original uploads | Long-term |
| `optimized/` | Permanent optimized model files | Long-term |
| `thumbs/` | Permanent thumbnail images | Long-term |
| `catalog/` | Runtime catalog mirror (if separate from public) | Synced with `public/catalog/` |
