
v1.1.5 Debug Pass — implementation plan

1) Findings from current codebase
- Analyze UI still collapses to generic messaging because frontend catches plain `Error` text and infers stage from string heuristics (`UploadAnalyze.tsx`, `Optimize.tsx`), without structured `stage/details`.
- `wizard-client.ts` still hardcodes `http://localhost:3500` and is still used by `WizardCatalogBrowser`, which explains persistent localhost polling failures in logs.
- Catalog preview is still thumbnail-only (`AssetPreviewPanel`), no real model viewer yet, so model-path failures are not isolated/displayed as viewer diagnostics.
- Server currently has no `GET /catalog/asset/:id/model` route, only thumbnail route + static mounts.
- Thumbnail generation is explicitly marked “not implemented yet” in optimizer (`FUTURE_SKIPPED`), so catalog thumbs remain null unless manually provided.
- Analyze logging is better than before, but still not emitting explicit per-stage lifecycle lines in the exact format needed for HA troubleshooting.

2) Backend hardening (server + mirrored server)
- Add structured analyze error contract:
  - Return `{ success:false, error, stage, details }` from `/analyze`.
  - Introduce explicit stage extraction (`glb_parse`, `geometry_scan`, `texture_scan`, `bounding_box`, `request_aborted`, `memory`), and keep `stage` stable for frontend mapping.
- Add explicit analyze stage logs in route/analyzer:
  - `[ANALYZE] Upload received`, `[ANALYZE] Parsing GLB`, `[ANALYZE] Geometry scan`, `[ANALYZE] Texture scan`, `[ANALYZE] Bounding box calculation`.
  - On failure: `[ANALYZE ERROR] Stage: ...`, `Reason: ...`, plus stack when available.
- Add request abort/disconnect detection on `/analyze`:
  - Listen for client disconnect/aborted signals and log with `jobId`, filename, size, stage.
- Add model-serving endpoint:
  - `GET /catalog/asset/:id/model` streaming `model.glb` with `model/gltf-binary`.
  - Keep path-safe lookup via existing `findAssetPath`.
- Thumbnail generation (stability-first):
  - Implement best-effort server thumbnail generation during optimize/ingest; write `thumb.webp` into job output and copy into catalog asset folder.
  - If generation fails, keep `thumbnail: null` and log reason explicitly (no silent failure).

3) Frontend consistency + error surfacing
- Extend `ApiError` to carry optional `stage/details/code` parsed from backend JSON.
- Update analyze screens (`UploadAnalyze.tsx`, `Optimize.tsx`) to display:
  - backend message (`error`)
  - backend stage (`stage`)
  - backend details (`details`)
  instead of generic “Request failed”.
- Remove remaining false-localhost integration path:
  - Refactor `WizardCatalogBrowser` away from `wizardClient`/`useWizard` to main `apiClient`/`useConnection` (or fully align wizard client base detection with ingress-safe logic).
- Add ingress-safe asset URL resolver utility:
  - Normalize metadata paths (`/jobs/...`, `/catalog/files/...`, `/<cat>/<sub>/<id>/model.glb`) into fetchable relative URLs.
  - Never hardcode `http://localhost:3500`.

4) Viewer robustness + UX polish
- Add real catalog viewer component with strong isolation:
  - New `AssetModelViewer` (React Three Fiber) wrapped by `PreviewErrorBoundary`.
  - States: loading spinner, success, fallback (`Preview unavailable / Model could not be rendered`), diagnostics block.
- Keep metadata usable when preview fails:
  - Drawer/page always render details, paths, and preview status independently of viewer.
- Auto camera framing:
  - Use `boundingBox` + `center` metadata when available.
  - Fallback to computed scene bounds when metadata missing.
- Thumbnail/placeholder behavior:
  - Asset cards and detail preview use thumbnail when valid.
  - Null/missing thumb shows clean placeholder and explicit status.
  - Never blank/brown panel.

5) Files to update
Frontend
- `src/services/api-client.ts`
- `src/pages/UploadAnalyze.tsx`
- `src/pages/Optimize.tsx`
- `src/components/upload/FileUploader.tsx`
- `src/components/wizard/WizardCatalogBrowser.tsx`
- `src/contexts/WizardContext.tsx` (or deprecate usage path)
- `src/components/catalog/AssetPreviewPanel.tsx`
- `src/components/catalog/AssetCard.tsx`
- `src/components/catalog/AssetDetailDrawer.tsx`
- `src/pages/AssetDetail.tsx`
- `src/types/api.ts`
- new: `src/lib/asset-paths.ts`
- new: `src/components/catalog/AssetModelViewer.tsx`

Backend
- `server/src/routes/analyze.ts`
- `server/src/services/analysis/analyzer.ts`
- `server/src/routes/catalog.ts`
- `server/src/services/optimization/optimizer.ts`
- `server/src/routes/optimize.ts`
- mirror same files under `bjorq_asset_wizard/server/...`

Release/docs
- `server/package.json` + mirror
- `server/src/index.ts` + mirror (VERSION)
- `server/src/routes/health.ts` + mirror (VERSION)
- `bjorq_asset_wizard/config.yaml`
- `CHANGELOG.md`
- `README.md` + preview behavior docs

6) Validation checklist (DoD-oriented)
- Analyze:
  - Small GLB succeeds.
  - Medium/heavy GLB failure shows real backend message + stage + details in UI.
  - HA logs contain explicit stage lines and failure reason/stack.
- Preview:
  - Clicking any catalog asset never breaks page.
  - Viewer failures always show fallback and keep metadata/actions interactive.
  - Camera frames loaded models correctly.
- Paths/ingress:
  - No browser calls to `http://localhost:3500` in HA.
  - Model/thumbnail fetches succeed via ingress-relative endpoints.
- Thumbnails:
  - Newly optimized/ingested assets produce usable thumbnail path or explicit null with fallback.
- Version:
  - All version surfaces report `v1.1.5`.
