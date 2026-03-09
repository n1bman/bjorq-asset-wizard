

# Phase 4 — Large File Support, Upload UX, Storage Policy, and Cleanup

## Overview

Phase 4 makes the Wizard production-ready for real-world 3D assets by supporting 100 MB uploads, adding visible progress/error states, implementing catalog storage policies, job cleanup, and richer metadata. Version bumps to **0.4.0**.

---

## Current State

- Backend already sets `MAX_FILE_SIZE` from env `MAX_FILE_SIZE_MB` (default 100) and passes it to `@fastify/multipart`
- Frontend `REQUEST_TIMEOUT` is **8 seconds** — far too low for large files
- No upload progress tracking (uses `fetch` with no progress events)
- No client-side file size validation
- No catalog storage limits or warnings
- No job cleanup mechanism
- Metadata is decent but missing original file size, reduction %, target profile

---

## Implementation Plan

### 1. Fix the 16.4 MB Upload Failure

**Root causes identified:**
- `api-client.ts` timeout is 8 seconds — large uploads over HA ingress will timeout
- `file.toBuffer()` in analyze/optimize routes reads entire file into memory with no streaming

**Changes:**
- `src/services/api-client.ts`: Increase default `REQUEST_TIMEOUT` to 120s. Add a separate `UPLOAD_TIMEOUT = 300_000` (5 min) constant.
- `src/services/api.ts`: Pass `timeout: 300_000` for `/analyze` and `/optimize` POST calls.
- Both `server/src/index.ts` files: Add Fastify `bodyLimit` and `requestTimeout` config (5 min for multipart routes).

### 2. Frontend File Size Validation and Warnings

**New file:** `src/lib/upload-limits.ts`
- Constants: `MAX_UPLOAD_SIZE_MB = 100`, `LARGE_FILE_WARNING_MB = 50`, `CATALOG_WARN_SIZE_MB = 25`
- Helper: `validateFileSize(file)` returns `{ ok, warning?, error? }`

**Update:** `src/components/upload/FileUploader.tsx`
- Client-side size check before calling `onFileSelected`
- Show file size in MB (not just KB)
- Warning badge for files > 50 MB ("Processing may take longer")
- Error state for files > 100 MB ("Exceeds maximum upload size")
- Allow reset/re-select after error

### 3. Upload Progress and Processing State

**Update:** `src/services/api.ts` — Replace `fetch` with `XMLHttpRequest` for upload calls to get progress events via `upload.onprogress`. Return a wrapper that exposes `onProgress` callback.

**Update:** `src/components/upload/FileUploader.tsx` and `src/pages/Optimize.tsx` / `UploadAnalyze.tsx`:
- Progress bar component during upload (0-100%)
- Distinct states: uploading → processing → complete / error
- Processing spinner with elapsed time for analyze/optimize
- On error: show failure stage (upload / parse / analysis / optimization / ingest), error message, and "Try again" action

### 4. Backend: Explicit Limits and Better Error Responses

**Update both** `server/src/index.ts` and `bjorq_asset_wizard/server/src/index.ts`:
- Add `requestTimeout: 300_000` to Fastify config
- Multipart `limits.fileSize` already configured from env

**Update** analyze and optimize routes (both server copies):
- Check `buffer.byteLength` against limit, return clear `413` with readable message
- Add `stage` field to error responses: `{ success: false, error: "...", stage: "upload" | "parse" | "analyze" | "optimize" }`
- Log file size on every request

**Update** `bjorq_asset_wizard/config.yaml`:
- `max_file_size_mb` default already 100 — confirmed correct

### 5. Catalog Storage Policy

**New file:** `server/src/services/catalog/policy.ts` (and bjorq copy)
- Constants: `CATALOG_SOFT_LIMIT_GB = 2`, `CATALOG_HARD_LIMIT_GB = 5`, `ASSET_WARN_SIZE_MB = 25`
- `getCatalogStorageUsage()` — walk catalog dir, sum file sizes
- `evaluateAssetForCatalog(fileSizeKB)` — returns warnings/blocks
- `getCatalogPolicy()` — returns current usage + limits for API

**Update** catalog ingest route:
- Before ingest, check catalog usage against limits
- Soft limit: warn but allow
- Hard limit: reject with clear message
- Warn if optimized file > 25 MB

**New route:** `GET /catalog/policy` — returns storage usage, limits, warnings

**Update** frontend Review section and catalog pages to show storage warnings

### 6. Richer Asset Metadata

**Update** `src/types/api.ts` `AssetMetadata`:
- Add: `originalFileSizeKB`, `reductionPercent`, `targetProfile`

**Update** `server/src/types/optimize.ts` and optimize route response:
- Include `originalFileSizeKB` and `reductionPercent` in metadata output

**Target profiles** (derived from triangle count + file size):
- `mobile`: < 10K tris, < 2 MB
- `tablet`: < 50K tris, < 10 MB  
- `wall`: < 25K tris, < 5 MB (flat/wall-mounted)
- `desktop`: < 100K tris, < 25 MB
- `heavy`: everything above

**New helper:** `deriveTargetProfile(triangles, fileSizeKB, placement)` in optimizer utils

### 7. Job Cleanup

**New file:** `server/src/services/cleanup/job-cleaner.ts` (and bjorq copy)
- `cleanStaleJobs(maxAgeDays = 7)` — scan `/data/storage/jobs`, remove dirs older than threshold
- `cleanFailedJobs(maxAgeDays = 1)` — remove jobs with no `result.json`
- Runs on server startup + interval (every 6 hours)
- Never touches catalog

**Update** `server/src/index.ts`: Register cleanup on startup and `setInterval`

**Update** `bjorq_asset_wizard/config.yaml`: `job_retention_hours` already exists (default 24) — use it

### 8. Improved Logging and Diagnostics

**Update** all route handlers (analyze, optimize, catalog):
- Structured error responses with `stage` field
- Consistent log format: `{ jobId, stage, fileName, fileSizeBytes, error }`

**Update** frontend error handling:
- Parse `stage` from API error response
- Show user-readable message per stage:
  - upload: "File upload failed"
  - parse: "Could not read the 3D model file"
  - analyze: "Model analysis failed"
  - optimize: "Optimization failed"
  - ingest: "Failed to save to catalog"

### 9. Version Bump and Documentation

- Bump all version references to `0.4.0`
- Update `CHANGELOG.md` with Phase 4 entry
- Update `bjorq_asset_wizard/README.md` and `DOCS.md`:
  - Document 100 MB upload limit
  - Document catalog storage policy (2 GB soft / 5 GB hard)
  - Document job cleanup behavior
  - Document target profiles

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/upload-limits.ts` | Frontend upload constants and validation |
| `server/src/services/catalog/policy.ts` | Catalog storage policy |
| `server/src/services/cleanup/job-cleaner.ts` | Stale job cleanup |
| Same files in `bjorq_asset_wizard/server/src/` | Mirror copies |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/api-client.ts` | Increase timeouts |
| `src/services/api.ts` | Upload progress, longer timeouts |
| `src/components/upload/FileUploader.tsx` | Size validation, progress bar, warnings, error states |
| `src/pages/Optimize.tsx` | Processing states, error stage display |
| `src/pages/UploadAnalyze.tsx` | Processing states, error stage display |
| `src/types/api.ts` | Extended metadata fields |
| `server/src/index.ts` | Request timeout, cleanup startup |
| `server/src/routes/analyze.ts` | Stage-aware errors, size check |
| `server/src/routes/optimize.ts` | Stage-aware errors, target profile |
| `server/src/routes/catalog.ts` | Storage policy checks |
| All bjorq_asset_wizard mirrors | Same changes |
| `bjorq_asset_wizard/config.yaml` | Version bump |
| `CHANGELOG.md` | Phase 4 entry |
| `bjorq_asset_wizard/README.md` | Upload limits, storage policy docs |
| `bjorq_asset_wizard/DOCS.md` | Upload limits, storage policy docs |
| Version files (package.json, health.ts, manager.ts) | 0.4.0 |

---

## Implementation Order

1. Upload limits + timeout fixes (unblocks the 16.4 MB failure)
2. FileUploader size validation + progress bar
3. Backend stage-aware error responses
4. Frontend error stage display
5. Catalog storage policy
6. Richer metadata + target profiles
7. Job cleanup
8. Version bump + documentation

