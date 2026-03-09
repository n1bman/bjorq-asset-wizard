

# v1.1.4 — Viewer Hardening & Final UX Polish

## Analysis

The catalog currently has **no 3D model viewer** — both the drawer (`AssetDetailDrawer`) and full page (`AssetDetail`) show a static `<Box>` placeholder icon. The "brown/blank state" is likely caused by either:
- The Sheet overlay rendering without proper content when asset data is malformed
- Unhandled errors in the drawer propagating up and breaking the page

The fix is straightforward: add an **ErrorBoundary**, improve the placeholder/diagnostics UI, and harden the drawer against edge cases.

## Changes

### 1. Create `PreviewErrorBoundary` component
**New file: `src/components/catalog/PreviewErrorBoundary.tsx`**

A React class-based ErrorBoundary that catches any rendering errors within the preview/drawer area. Shows a clean fallback: "Preview unavailable" with an error message. Prevents viewer failures from breaking the page.

### 2. Create `AssetPreviewPanel` component
**New file: `src/components/catalog/AssetPreviewPanel.tsx`**

Replaces the raw `<Box>` placeholder in both drawer and detail page. Shows:
- Thumbnail image if `asset.thumbnail` is a valid non-null string
- Fallback Box icon + "Preview unavailable" text if thumbnail is missing/null
- Model path and thumbnail path as small diagnostic text (e.g., `model: furniture/sofas/.../model.glb`)
- Wrapped in `PreviewErrorBoundary`

### 3. Update `AssetDetailDrawer.tsx`
- Replace the raw thumbnail placeholder div (line 48-50) with `<AssetPreviewPanel asset={asset} />`
- Wrap entire drawer content in `PreviewErrorBoundary`
- Add `key={asset.id}` to `SheetContent` to force clean re-render on asset change
- Add model/thumbnail path display in metadata section
- Add `targetProfile`, `boundingBox` display when available

### 4. Update `AssetDetail.tsx` (full page)
- Replace placeholder div (line 71-73) with `<AssetPreviewPanel asset={asset} />`
- Wrap page content in `PreviewErrorBoundary`
- Add defensive optional chaining for `dimensions` and `performance` (lines 127, 131, 135, 147, 151, 155 — currently crash on missing data)
- Add model/thumbnail path diagnostics

### 5. Update `AssetCard.tsx`
- Handle missing `performance` defensively (line 36-37 currently accesses `asset.performance.triangles` directly)

### 6. Version bump to v1.1.4
- `CHANGELOG.md` — new entry
- `server/package.json` + mirror
- `server/src/index.ts` + mirror
- `server/src/routes/health.ts` + mirror
- `bjorq_asset_wizard/config.yaml`

## Files

| File | Change |
|------|--------|
| `src/components/catalog/PreviewErrorBoundary.tsx` | **New** — React ErrorBoundary for preview isolation |
| `src/components/catalog/AssetPreviewPanel.tsx` | **New** — Thumbnail/preview with fallback + diagnostics |
| `src/components/catalog/AssetDetailDrawer.tsx` | Use new components, add key, add path diagnostics |
| `src/components/catalog/AssetCard.tsx` | Defensive `performance` access |
| `src/pages/AssetDetail.tsx` | Use new components, defensive rendering |
| `server/package.json` | 1.1.4 |
| `server/src/index.ts` | VERSION → 1.1.4 |
| `server/src/routes/health.ts` | VERSION → 1.1.4 |
| `bjorq_asset_wizard/server/package.json` | 1.1.4 |
| `bjorq_asset_wizard/server/src/index.ts` | 1.1.4 |
| `bjorq_asset_wizard/server/src/routes/health.ts` | 1.1.4 |
| `bjorq_asset_wizard/config.yaml` | 1.1.4 |
| `CHANGELOG.md` | v1.1.4 entry |

