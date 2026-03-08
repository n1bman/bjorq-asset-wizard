

# Conversion Import Preparation — UI Architecture Extension

## Summary

Add an optional "conversion-based import" concept as a pre-step to the existing pipeline. No structural changes to current flows. This is purely UI preparation for a future backend feature that converts raw/large models (SketchUp, building models) to GLB before entering the standard Wizard pipeline.

## What Changes

### 1. Types — New `ImportType` and `ConversionStatus` (`src/types/api.ts`)
- Add `ImportType = "direct-upload" | "converted-project" | "catalog" | "synced"`
- Add `ConversionStatus = "not_converted" | "converting" | "converted" | "error"`
- Add `importType?: ImportType` and `conversionStatus?: ConversionStatus` to `AssetMetadata`
- Keep existing `AssetSource` type unchanged

### 2. Badges — `ConversionBadge` and `ImportTypeBadge` (`src/components/catalog/AssetStatusBadge.tsx`)
- Add `ImportTypeBadge` component showing direct-upload / converted-project / catalog / synced
- Add `ConversionBadge` showing conversion status
- Display both in `AssetDetail.tsx` alongside existing badges

### 3. Upload page — Import type selector (`src/pages/UploadAnalyze.tsx`)
- Add a toggle/selector at the top: "Direct Model (GLB/GLTF)" vs "Convert Project (coming soon)"
- The "Convert Project" option shows a disabled card with supported format list (SketchUp, IFC, OBJ, FBX) and a "Coming soon" badge
- Direct Model continues to work exactly as today
- Update the page description to mention support for larger models

### 4. Optimize page — Conditional stepper step (`src/pages/Optimize.tsx`)
- When import type is "converted-project", prepend a "Convert" step to the stepper
- For "direct-upload" (default), stepper remains exactly as-is: Upload → Analyze → Configure → Optimize → Review → Save
- The Convert step would show a placeholder "Conversion in progress…" card (for future use)
- No changes to actual pipeline logic

### 5. FileUploader — Accept prop for conversion formats (`src/components/upload/FileUploader.tsx`)
- Add messaging for larger project formats in the drop zone when conversion mode is active
- Keep default `.glb,.gltf` accept unchanged

### 6. API layer — Import endpoint stubs (`src/services/api.ts`)
- Add `importDirect(file)` and `importConvert(file)` functions that map to `POST /import/direct` and `POST /import/convert`
- Both fall back to mock data
- `importDirect` delegates to existing `analyzeModel` internally for now

### 7. Asset Detail — Extended metadata section (`src/pages/AssetDetail.tsx`)
- Add an "Import & Pipeline" card showing: import source, conversion status, optimization status, ingest status, sync status
- Uses existing badge components plus new ones

### 8. Documentation (`docs/bjorq-asset-optimizer/README.md`)
- Add section explaining both import paths and that they produce the same catalog output

## Files

| Action | File |
|--------|------|
| Modify | `src/types/api.ts` — add `ImportType`, `ConversionStatus`, extend `AssetMetadata` |
| Modify | `src/components/catalog/AssetStatusBadge.tsx` — add `ImportTypeBadge`, `ConversionBadge` |
| Modify | `src/pages/UploadAnalyze.tsx` — import type selector with "coming soon" conversion option |
| Modify | `src/pages/Optimize.tsx` — conditional Convert step in stepper |
| Modify | `src/pages/AssetDetail.tsx` — pipeline status card |
| Modify | `src/services/api.ts` — `importDirect` / `importConvert` stubs |
| Modify | `docs/bjorq-asset-optimizer/README.md` — import path docs |

7 modified files. No new files. No structural changes.

