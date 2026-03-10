

# v2.0.0 — Major Version Bump

## Current State

Version surfaces are split between 1.1.10 and 1.1.11:
- `package.json` (root): **1.1.10** (behind)
- `server/package.json`: 1.1.11
- `bjorq_asset_wizard/server/package.json`: 1.1.11
- `bjorq_asset_wizard/config.yaml`: 1.1.11
- All `VERSION` constants in `.ts` files: 1.1.11
- `CATALOG_VERSION`: 1.1.11

No refactoring needed — codebase is clean and consistent. The server mirrors (`bjorq_asset_wizard/server/` vs `server/`) are intentionally duplicated. All recent fixes (persistence, thumbnails, dimensions, profiles) are in place.

## Changes

All version surfaces updated to `2.0.0`. No functional code changes — this is a clean version bump.

| File | Change |
|------|--------|
| `package.json` | `1.1.10` → `2.0.0` |
| `server/package.json` | `1.1.11` → `2.0.0` |
| `bjorq_asset_wizard/server/package.json` | `1.1.11` → `2.0.0` |
| `bjorq_asset_wizard/config.yaml` | `1.1.11` → `2.0.0` |
| `server/src/index.ts` | VERSION → `2.0.0` |
| `server/src/routes/health.ts` | VERSION → `2.0.0` |
| `server/src/services/catalog/manager.ts` | CATALOG_VERSION → `2.0.0` |
| `bjorq_asset_wizard/server/src/index.ts` | VERSION → `2.0.0` |
| `bjorq_asset_wizard/server/src/routes/health.ts` | VERSION → `2.0.0` |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | CATALOG_VERSION → `2.0.0` |
| `CHANGELOG.md` | Add `## [2.0.0]` header summarizing the major milestone |

## CHANGELOG entry

```
## [2.0.0] — 2026-03-10

### Major Release — Bjorq Asset Wizard v2

Marks the first stable production release with full end-to-end asset pipeline:

- **Persistent catalog storage** — assets survive HA add-on restarts (`/data/catalog`)
- **Thumbnail rendering** — catalog cards show real asset thumbnails
- **Dimensions pipeline** — dimensions persist through analyze → optimize → catalog → UI
- **Optimization profiles** — High Quality / Balanced / Low Power presets
- **Large-file UX** — direct port link for bypassing HA ingress limits
- **Catalog diagnostics** — startup scan + /health catalog info
- **Startup reliability** — correct initialization order, permission handling

Includes all fixes from v1.0.0 through v1.1.11.
```

No breaking changes, no refactoring needed. Everything currently in place continues to work.

