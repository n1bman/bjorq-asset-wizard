

# Connect Optimize Frontend to Real Backend

## Current State

The API client (`src/services/api.ts` line 82-93) already calls `POST /optimize` via `apiClient.request` with `withFallback` — real backend first, mock on connection failure, real errors propagated. No API layer changes needed.

The Optimize page already uses the response for `stats` and `optimization.applied`, but does not display:
- Asset identity (jobId, assetId, name)
- Skipped operations with reasons
- Warnings
- Output file paths/references

## Changes

### 1. `src/pages/Optimize.tsx` — Enhance review section

Add to the review step (after StatsComparison, before the existing cards):

**Asset Identity card** — small card showing:
- Asset name (`result.metadata.name`)
- Asset ID / slug (`result.metadata.id`)
- Job ID (`result.jobId`)

**Skipped Operations** — add to the existing Applied Operations card or as a sibling:
- Show `result.optimization.skipped` as a list of badges with tooltips showing reason
- Show `result.optimization.warnings` if any

**Output References** — update the existing Outputs card:
- Wire the three download buttons to show real paths from `result.outputs`
- Show `result.outputs.optimizedModel`, `result.outputs.metadata` paths
- Hide Thumbnail button if `result.outputs.thumbnail` is empty

### 2. `src/components/optimize/OptimizeOptions.tsx` — Consistency pass

Mark V1-unsupported options clearly:
- "Normalize scale", "Set floor to Y=0", "Optimize base color textures" are skipped by backend V1
- Add `(V2)` suffix to their labels and set them disabled, or add a small "not yet available" note
- "Deduplicate materials" — label should note it's always-on as part of dedup default step
- Remove "Max Texture Size" and "Texture Quality" inputs or mark as V2 (backend ignores them)

### 3. No other files change

- `src/services/api.ts` — already wired correctly
- `src/types/api.ts` — already matches backend response shape
- `StatsComparison.tsx` — already works with the stats shape

## Summary of visible changes

- Review step shows asset name, ID, and job ID prominently
- Skipped operations shown with reasons (users see what V1 doesn't do yet)
- Output paths shown as real references instead of generic buttons
- Options panel clearly distinguishes V1-active vs V2-planned toggles
- No architecture or scope changes

