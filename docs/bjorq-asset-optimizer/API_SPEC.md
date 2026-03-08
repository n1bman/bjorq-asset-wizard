# Bjorq Asset Optimizer — API Specification

Base URL: `http://localhost:3500`

All file uploads use `multipart/form-data`. All JSON responses use `Content-Type: application/json`.

---

## POST /analyze

Analyze a 3D model file without modifying it.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (multipart) | ✅ | `.glb` or `.gltf` file |

```bash
curl -X POST http://localhost:3500/analyze \
  -F "file=@./my-model.glb"
```

### Response `200 OK`

```json
{
  "success": true,
  "analysis": {
    "fileName": "my-model.glb",
    "fileFormat": "glb",
    "fileSizeBytes": 2458624,
    "fileSizeKB": 2401,
    "fileSizeMB": 2.35,
    "geometry": {
      "triangleCount": 148230,
      "meshCount": 12,
      "vertexCount": 89420
    },
    "materials": {
      "count": 8,
      "names": ["Wood_Base", "Fabric_Seat", "Metal_Legs", "..."]
    },
    "textures": {
      "count": 14,
      "details": [
        {
          "name": "wood_diffuse",
          "width": 4096,
          "height": 4096,
          "format": "image/png",
          "sizeBytes": 1245184,
          "type": "baseColor"
        }
      ]
    },
    "dimensions": {
      "width": 1.8,
      "depth": 0.85,
      "height": 0.75,
      "unit": "meter"
    },
    "boundingBox": {
      "min": [-0.9, 0.0, -0.425],
      "max": [0.9, 0.75, 0.425]
    },
    "estimatedScale": {
      "unit": "m",
      "confidence": "high",
      "note": "Dimensions consistent with furniture scale"
    },
    "placement": {
      "candidate": "floor",
      "confidence": "high"
    },
    "extras": {
      "hasCameras": false,
      "hasLights": true,
      "hasAnimations": false,
      "lightCount": 2,
      "cameraCount": 0,
      "animationCount": 0,
      "emptyNodeCount": 4
    },
    "performance": {
      "desktop": "ok",
      "tablet": "optimization_recommended",
      "lowPower": "optimization_strongly_recommended"
    },
    "status": "optimization_recommended",
    "recommendations": [
      {
        "code": "TEXTURE_TOO_LARGE",
        "severity": "warning",
        "message": "Texture 'wood_diffuse' is 4096x4096 — recommend max 2048x2048 for this asset type",
        "target": "wood_diffuse"
      },
      {
        "code": "CONTAINS_LIGHTS",
        "severity": "info",
        "message": "Model contains 2 light nodes — typically not needed for asset usage",
        "target": null
      },
      {
        "code": "EMPTY_NODES",
        "severity": "info",
        "message": "4 empty nodes found — can be safely removed",
        "target": null
      },
      {
        "code": "HIGH_TRIANGLE_COUNT",
        "severity": "warning",
        "message": "148230 triangles is high for a furniture asset — may impact performance on low-power devices",
        "target": null
      }
    ]
  }
}
```

### Recommendation Codes

| Code | Severity | Description |
|------|----------|-------------|
| `TEXTURE_TOO_LARGE` | warning | Texture resolution exceeds recommended max |
| `TOO_MANY_MATERIALS` | warning | Excessive material count for asset type |
| `TOO_MANY_TRIANGLES` | warning | High triangle count |
| `SUSPICIOUS_SCALE` | warning | Dimensions suggest wrong unit (e.g., mm instead of m) |
| `CONTAINS_CAMERAS` | info | Cameras found (not needed for assets) |
| `CONTAINS_LIGHTS` | info | Lights found (not needed for assets) |
| `CONTAINS_ANIMATIONS` | info | Animations found (may not be needed) |
| `EMPTY_NODES` | info | Empty/unused nodes in scene graph |
| `MANY_EMPTY_NODES` | warning | Excessive empty nodes |

### Performance Status Values

| Status | Meaning |
|--------|---------|
| `ok` | Model is suitable for this device class |
| `optimization_recommended` | Will work but optimization would improve experience |
| `optimization_strongly_recommended` | May cause issues, optimization strongly advised |

---

## POST /optimize

Run the full optimization pipeline: analyze → optimize → thumbnail → metadata.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (multipart) | ✅ | `.glb` or `.gltf` file |
| `options` | JSON string (form field) | ❌ | Optimization options |

#### Options Schema

```json
{
  "removeEmptyNodes": true,
  "removeUnusedNodes": true,
  "removeCameras": true,
  "removeLights": true,
  "removeAnimations": true,
  "deduplicateMaterials": true,
  "removeUnusedVertexAttributes": true,
  "normalizeScale": true,
  "normalizeOrigin": true,
  "setFloorToY0": true,
  "maxTextureSize": 2048,
  "optimizeBaseColorTextures": true,
  "textureQuality": 85,
  "generateThumbnail": true,
  "thumbnailSize": 512,
  "generateMetadata": true,
  "assetName": "Nordic Sofa",
  "category": "furniture",
  "subcategory": "sofas",
  "style": "modern",
  "placement": null
}
```

All options have sensible defaults. Omit any field to use the default.

```bash
curl -X POST http://localhost:3500/optimize \
  -F "file=@./my-model.glb" \
  -F 'options={"assetName":"Nordic Sofa","category":"furniture","subcategory":"sofas","maxTextureSize":2048}'
```

### Response `200 OK`

```json
{
  "success": true,
  "jobId": "opt_a1b2c3d4",
  "analysis": {
    "...same as /analyze response..."
  },
  "optimization": {
    "applied": [
      "removeEmptyNodes",
      "removeUnusedNodes",
      "removeLights",
      "deduplicateMaterials",
      "resizeTextures",
      "normalizeScale",
      "setFloorToY0"
    ],
    "skipped": [
      {
        "operation": "removeAnimations",
        "reason": "No animations found"
      }
    ],
    "warnings": [
      {
        "operation": "normalizeOrigin",
        "message": "Origin adjustment skipped — complex pivot detected"
      }
    ]
  },
  "stats": {
    "before": {
      "fileSizeKB": 2401,
      "triangles": 148230,
      "materials": 8,
      "textures": 14,
      "maxTextureRes": 4096
    },
    "after": {
      "fileSizeKB": 1180,
      "triangles": 148230,
      "materials": 5,
      "textures": 10,
      "maxTextureRes": 2048
    },
    "reduction": {
      "fileSizePercent": 50.9,
      "materialsRemoved": 3,
      "texturesRemoved": 4,
      "texturesResized": 6
    }
  },
  "outputs": {
    "optimizedModel": "/jobs/opt_a1b2c3d4/optimized.glb",
    "thumbnail": "/jobs/opt_a1b2c3d4/thumb.webp",
    "metadata": "/jobs/opt_a1b2c3d4/meta.json",
    "report": "/jobs/opt_a1b2c3d4/report.json"
  },
  "metadata": {
    "id": "nordic-sofa",
    "name": "Nordic Sofa",
    "category": "furniture",
    "subcategory": "sofas",
    "style": "modern",
    "model": "optimized.glb",
    "thumbnail": "thumb.webp",
    "dimensions": {
      "width": 1.8,
      "depth": 0.85,
      "height": 0.75
    },
    "placement": "floor",
    "ha": {
      "mappable": false,
      "defaultDomain": null,
      "defaultKind": null
    },
    "performance": {
      "triangles": 148230,
      "materials": 5,
      "fileSizeKB": 1180
    }
  }
}
```

### Download Optimized Files

Output files are accessible via static file serving:

```bash
# Download optimized model
curl -O http://localhost:3500/jobs/opt_a1b2c3d4/optimized.glb

# Download thumbnail
curl -O http://localhost:3500/jobs/opt_a1b2c3d4/thumb.webp
```

---

## POST /catalog/ingest

Add an optimized asset to the curated catalog.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (multipart) | ✅ | Optimized `.glb` file |
| `thumbnail` | File (multipart) | ❌ | `thumb.webp` (or auto-generate) |
| `meta` | JSON string (form field) | ✅ | Asset metadata |
| `jobId` | string (form field) | ❌ | Reference a previous optimize job instead of uploading files |

#### Meta Schema

```json
{
  "id": "google-home-mini",
  "name": "Google Home Mini",
  "category": "devices",
  "subcategory": "speakers",
  "style": "modern",
  "dimensions": {
    "width": 0.1,
    "depth": 0.1,
    "height": 0.04
  },
  "placement": "table",
  "ha": {
    "mappable": true,
    "defaultDomain": "media_player",
    "defaultKind": "speaker"
  }
}
```

```bash
# From files
curl -X POST http://localhost:3500/catalog/ingest \
  -F "file=@./optimized.glb" \
  -F "thumbnail=@./thumb.webp" \
  -F 'meta={"id":"google-home-mini","name":"Google Home Mini","category":"devices","subcategory":"speakers","placement":"table","ha":{"mappable":true,"defaultDomain":"media_player","defaultKind":"speaker"}}'

# From a previous optimize job
curl -X POST http://localhost:3500/catalog/ingest \
  -F "jobId=opt_a1b2c3d4" \
  -F 'meta={"id":"nordic-sofa","name":"Nordic Sofa","category":"furniture","subcategory":"sofas"}'
```

### Response `201 Created`

```json
{
  "success": true,
  "catalogEntry": {
    "id": "google-home-mini",
    "path": "devices/speakers/google-home-mini",
    "files": {
      "model": "public/catalog/devices/speakers/google-home-mini/model.glb",
      "thumbnail": "public/catalog/devices/speakers/google-home-mini/thumb.webp",
      "metadata": "public/catalog/devices/speakers/google-home-mini/meta.json"
    }
  },
  "catalogReindexed": true
}
```

---

## POST /catalog/reindex

Rebuild the catalog `index.json` manifest by scanning all catalog directories.

### Request

No body required.

```bash
curl -X POST http://localhost:3500/catalog/reindex
```

### Response `200 OK`

```json
{
  "success": true,
  "stats": {
    "totalAssets": 24,
    "categories": {
      "furniture": 10,
      "devices": 8,
      "decor": 6
    },
    "indexPath": "public/catalog/index.json",
    "generatedAt": "2026-03-08T14:30:00.000Z"
  }
}
```

---

## GET /catalog/index

Return the full catalog manifest.

### Request

```bash
curl http://localhost:3500/catalog/index
```

### Response `200 OK`

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-03-08T14:30:00.000Z",
  "totalAssets": 24,
  "categories": [
    {
      "name": "furniture",
      "subcategories": [
        {
          "name": "sofas",
          "assets": [
            {
              "id": "nordic-sofa-01",
              "name": "Nordic Sofa",
              "style": "modern",
              "model": "furniture/sofas/nordic-sofa-01/model.glb",
              "thumbnail": "furniture/sofas/nordic-sofa-01/thumb.webp",
              "dimensions": { "width": 1.8, "depth": 0.85, "height": 0.75 },
              "placement": "floor",
              "performance": { "triangles": 48210, "materials": 3, "fileSizeKB": 820 }
            }
          ]
        }
      ]
    },
    {
      "name": "devices",
      "subcategories": [
        {
          "name": "speakers",
          "assets": [
            {
              "id": "google-home-mini",
              "name": "Google Home Mini",
              "style": "modern",
              "model": "devices/speakers/google-home-mini/model.glb",
              "thumbnail": "devices/speakers/google-home-mini/thumb.webp",
              "dimensions": { "width": 0.1, "depth": 0.1, "height": 0.04 },
              "placement": "table",
              "ha": { "mappable": true, "defaultDomain": "media_player", "defaultKind": "speaker" },
              "performance": { "triangles": 12400, "materials": 2, "fileSizeKB": 340 }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## GET /health

### Request

```bash
curl http://localhost:3500/health
```

### Response `200 OK`

```json
{
  "status": "ok",
  "uptime": 84320,
  "timestamp": "2026-03-08T14:30:00.000Z",
  "storage": {
    "path": "./storage",
    "writable": true
  }
}
```

---

## GET /version

### Request

```bash
curl http://localhost:3500/version
```

### Response `200 OK`

```json
{
  "name": "bjorq-asset-optimizer",
  "version": "1.0.0",
  "node": "v20.11.0",
  "typescript": "5.4.0",
  "environment": "production"
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "Only .glb and .gltf files are supported",
    "details": {
      "receivedMimeType": "application/pdf"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_FILE_FORMAT` | 400 | Unsupported file type |
| `FILE_TOO_LARGE` | 413 | File exceeds max size |
| `MISSING_REQUIRED_FIELD` | 400 | Required form field missing |
| `INVALID_OPTIONS` | 400 | Malformed options JSON |
| `INVALID_METADATA` | 400 | Malformed or incomplete metadata |
| `ASSET_NOT_FOUND` | 404 | Referenced job or asset not found |
| `CATALOG_ENTRY_EXISTS` | 409 | Asset ID already exists in catalog |
| `PROCESSING_ERROR` | 500 | Error during model processing |
| `STORAGE_ERROR` | 500 | Filesystem read/write error |
