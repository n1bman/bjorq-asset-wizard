

# Bump to v0.3.3 — ESM __dirname Fix

## Changes

All version references `0.3.2` → `0.3.3` plus README/doc updates:

### Version bumps (10 files)

| File | What changes |
|------|-------------|
| `server/src/index.ts` | `VERSION = "0.3.3"` |
| `server/src/routes/health.ts` | `VERSION = "0.3.3"` |
| `server/src/services/catalog/manager.ts` | `CATALOG_VERSION = "0.3.3"` |
| `server/package.json` | `"version": "0.3.3"` |
| `bjorq_asset_wizard/server/src/index.ts` | `VERSION = "0.3.3"` |
| `bjorq_asset_wizard/server/src/routes/health.ts` | `VERSION = "0.3.3"` |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | `CATALOG_VERSION = "0.3.3"` |
| `bjorq_asset_wizard/server/package.json` | `"version": "0.3.3"` |
| `bjorq_asset_wizard/config.yaml` | `version: "0.3.3"` |

### CHANGELOG.md

Add `[0.3.3]` entry: ESM compatibility fix — replaced CJS `__dirname` with `fileURLToPath`/`dirname` shim so the server starts correctly under `"type": "module"`.

### README updates (version references + accuracy)

| File | Changes |
|------|---------|
| `bjorq_asset_wizard/README.md` | Line 65: `0.3.0` → `0.3.3` in troubleshooting section. Line 36: update example tag from `v0.2.3` to `v0.3.3`. |
| `bjorq_asset_wizard/DOCS.md` | Line 58: `0.3.0` → `0.3.3` in troubleshooting section. |

No logic changes — pure version sync and documentation accuracy.

