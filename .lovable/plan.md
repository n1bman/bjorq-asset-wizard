

# Photo → 3D Generation Feature (TRELLIS Integration) — v2.2.0

## Implementation Plan

This is a large feature. Implementation is split into **3 batches** to keep changes reviewable.

---

### Batch 1: Types, API stubs, and UI shell

**New files:**

| File | Purpose |
|------|---------|
| `src/types/generate.ts` | Frontend types: `GenerateJobState`, `GenerateJobResponse`, `TrellisStatus`, `QualityGateLimits` |
| `src/services/generate-api.ts` | API functions: `createGenerateJob()`, `getGenerateJobStatus()`, `retryGenerateJob()`, `getTrellisStatus()`, `installTrellis()` — all with mock fallbacks |
| `src/pages/PhotoGenerate.tsx` | Main page with 4-step stepper: Upload → Style → Generate → Review |
| `src/components/generate/PhotoUploader.tsx` | Multi-image dropzone (1–4 photos), thumbnails, reorder, remove, helper tips |
| `src/components/generate/StyleSelector.tsx` | Style preset card ("Bjorq Cozy Stylized") + target profile radio (Dashboard Safe / Ultra Light / Standard) |
| `src/components/generate/GenerateProgress.tsx` | Polls job status, shows step-based progress: Preparing → Generating → Styling → Optimizing → Validating |
| `src/components/generate/GenerateReview.tsx` | Shows result GLB preview + input images + Regenerate / Save to Library buttons |
| `src/components/generate/EngineStatus.tsx` | Inline TRELLIS status widget — checks `/trellis/status`, shows install button if needed |

**Modified files:**

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/generate` route |
| `src/components/layout/AppSidebar.tsx` | Add "Photo → 3D" item to Pipeline group with `Camera` icon |

**Frontend types** (`src/types/generate.ts`):
```typescript
export type GenerateJobState =
  | "queued" | "preprocessing" | "generating" | "styling"
  | "optimizing" | "validating" | "preview_ready" | "done" | "failed";

export type GenerateTargetProfile = "dashboard-safe" | "ultra-light" | "standard";

export interface GenerateJobResponse {
  jobId: string;
  status: GenerateJobState;
  progress?: number;
  currentStep?: string;
  result?: { model: string; thumbnail: string; metadata: Record<string, unknown> };
  error?: string;
  canRetry?: boolean;
}

export interface TrellisStatusResponse {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing?: boolean;
  installProgress?: number;
}

export interface QualityGateLimits {
  maxTriangles: number;
  maxFileSizeKB: number;
  maxMaterials: number;
  maxTextureRes: number;
}
```

---

### Batch 2: Backend routes and services

**New files:**

| File | Purpose |
|------|---------|
| `server/src/types/generate.ts` | Backend generate types (mirrors frontend + internal pipeline types) |
| `server/src/routes/generate.ts` | `POST /generate` (multipart: images + options JSON), `GET /generate/jobs/:id`, `POST /generate/jobs/:id/retry` |
| `server/src/routes/trellis.ts` | `GET /trellis/status`, `POST /trellis/install` |
| `server/src/services/trellis/manager.ts` | TRELLIS lifecycle: install (clone repo, venv, deps, weights), start/stop subprocess, health check, `generate(images, config) → Uint8Array` via `child_process.spawn()` |
| `server/src/services/generation/pipeline.ts` | Orchestrates: preprocess (sharp crop/normalize) → TRELLIS generate → style normalize → optimize → quality gate → export GLB |
| `server/src/services/generation/style-normalizer.ts` | Post-TRELLIS style enforcement using gltf-transform: aggressive `simplify()` (ratio 0.4, error 0.05), `weld()`, material standardization (matte PBR, roughness 0.7, metallic 0, strip normal/AO maps), prune micro-geometry |
| `server/src/services/generation/quality-gate.ts` | Validate output against limits (Dashboard Safe: 15k tris, 2MB, 4 materials, 512px textures). Auto re-process with escalating aggression up to 2 retries |

**Modified files:**

| File | Change |
|------|--------|
| `server/src/index.ts` | Register `generateRoutes` and `trellisRoutes`, add `/generate` and `/trellis` to SPA fallback exclusion list, bump VERSION to `2.2.0` |

**Pipeline flow:**
```text
Photos (1-4)
  → [sharp] crop/normalize/resize to 1024px
  → [TRELLIS subprocess] image → raw mesh
  → [style-normalizer] simplify geometry (ratio 0.4), strip complex materials,
     enforce matte PBR, clamp colors to warm palette
  → [optimizer] existing V2 pipeline with low-power profile
  → [quality-gate] validate → auto-reprocess if needed (up to 2x)
  → Export .glb + thumbnail + metadata
```

**TRELLIS wrapper** — subprocess approach:
- Write preprocessed images to `/data/trellis/workspace/{jobId}/`
- Spawn `python -m trellis.cli generate --input <dir> --output <dir> --format glb`
- Read output GLB from output directory
- Timeout: 120s, configurable via `TRELLIS_TIMEOUT`
- If TRELLIS is not installed, routes return `{ installed: false }` — no 500 errors

**Quality gate limits by profile:**

| Profile | Triangles | Size | Materials | Texture |
|---------|-----------|------|-----------|---------|
| Dashboard Safe | 15,000 | 2 MB | 4 | 512px |
| Ultra Light | 5,000 | 512 KB | 2 | 256px |
| Standard | 50,000 | 10 MB | 8 | 1024px |

---

### Batch 3: Mirror + version bump + changelog

| File | Change |
|------|--------|
| `bjorq_asset_wizard/server/src/types/generate.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/generate.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/trellis.ts` | Mirror |
| `bjorq_asset_wizard/server/src/services/trellis/manager.ts` | Mirror |
| `bjorq_asset_wizard/server/src/services/generation/pipeline.ts` | Mirror |
| `bjorq_asset_wizard/server/src/services/generation/style-normalizer.ts` | Mirror |
| `bjorq_asset_wizard/server/src/services/generation/quality-gate.ts` | Mirror |
| `bjorq_asset_wizard/server/src/index.ts` | Register new routes |
| `bjorq_asset_wizard/server/package.json` | Bump to 2.2.0 |
| `bjorq_asset_wizard/config.yaml` | Bump to 2.2.0 |
| `server/package.json` | Bump to 2.2.0 |
| `CHANGELOG.md` | v2.2.0 entry |

---

### Key design decisions

1. **Style normalizer is deterministic** — fixed simplify ratio, fixed material template, fixed color clamping. No randomness = consistent output across generations.

2. **Quality gate auto-reprocesses** — user never sees a broken/heavy asset. Escalation: attempt 1 uses profile settings, attempt 2 drops to `low-power`, attempt 3 uses extreme simplification (ratio 0.2).

3. **TRELLIS is optional** — all UI and routes work without TRELLIS installed. The engine status widget guides installation. Mock fallback in frontend API layer returns a placeholder job for development.

4. **Reuses existing optimizer** — style normalizer runs first (aggressive shape cleanup), then the existing `optimizeModel()` handles standard cleanup (prune, dedup, floor align, texture resize).

5. **Job storage** — jobs stored in `/data/storage/jobs/gen_{id}/` alongside existing optimize jobs, cleaned by the existing job-cleaner service.

