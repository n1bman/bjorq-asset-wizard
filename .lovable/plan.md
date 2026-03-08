

# CI Stabilization — Root Cause & Fix Plan

## Issues Found

### Frontend: 4 files with `catch (e: any)` — lint errors
The `@typescript-eslint/no-explicit-any` rule (enabled by `tseslint.configs.recommended`) flags `any` as an error. Four component files were missed in the previous fix pass:

| File | Line |
|------|------|
| `src/components/sync/SyncStatusBar.tsx` | 32 |
| `src/components/catalog/AssetDetailDrawer.tsx` | 33 |
| `src/components/ingest/IngestForm.tsx` | 43 |
| `src/components/system/CatalogStatusCard.tsx` | 17 |

**Fix**: Change `catch (e: any)` to `catch (e: unknown)` and use `e instanceof Error ? e.message : "Unknown error"` for the description.

### Frontend: `eslint-disable-next-line` misapplied (potential)
Three files use `// eslint-disable-next-line` before imports, but `react-refresh/only-export-components` is a module-level warning. Since the rule is configured as `"warn"` (not error), this won't block CI by default. However, to be safe and correct, change these to file-level `/* eslint-disable react-refresh/only-export-components */` comments.

| File |
|------|
| `src/components/ui/toggle.tsx` |
| `src/contexts/ConnectionContext.tsx` |
| `src/contexts/WizardContext.tsx` |

### Backend: Should be clean now
The server ESLint config, tsconfig, test file, and CI workflow changes from previous passes should make the backend job pass. No additional backend changes needed.

## Changes

| File | Change |
|------|--------|
| `src/components/sync/SyncStatusBar.tsx` | `catch (e: any)` → `catch (e: unknown)` with type guard |
| `src/components/catalog/AssetDetailDrawer.tsx` | Same pattern |
| `src/components/ingest/IngestForm.tsx` | Same pattern |
| `src/components/system/CatalogStatusCard.tsx` | Same pattern |
| `src/components/ui/toggle.tsx` | `eslint-disable-next-line` → `eslint-disable` (file-level) |
| `src/contexts/ConnectionContext.tsx` | Same |
| `src/contexts/WizardContext.tsx` | Same |

All fixes are mechanical type-safety improvements. No behavior changes.

