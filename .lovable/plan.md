

# Bump to v0.3.2 — Fix Version References

## Problem

The v0.3.0 Docker build failed (`.dockerignore` blocked frontend source). You released v0.3.1 manually, but the codebase still references `0.3.0` everywhere. Need to bump to `0.3.2` so the next tag triggers a working build with correct version strings.

## Changes

Bump version `0.3.0` → `0.3.2` in all files:

| File | Field |
|------|-------|
| `server/package.json` | `"version"` |
| `server/src/index.ts` | `VERSION` constant |
| `server/src/routes/health.ts` | `VERSION` constant |
| `server/src/services/catalog/manager.ts` | `CATALOG_VERSION` |
| `bjorq_asset_wizard/server/package.json` | `"version"` |
| `bjorq_asset_wizard/server/src/index.ts` | `VERSION` constant |
| `bjorq_asset_wizard/server/src/routes/health.ts` | `VERSION` constant |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | `CATALOG_VERSION` |
| `bjorq_asset_wizard/config.yaml` | `version` |
| `CHANGELOG.md` | Add `[0.3.2]` entry (`.dockerignore` fix, version bump) |

No logic changes — pure version bump so `v0.3.2` tag produces a working image that HA can pull.

