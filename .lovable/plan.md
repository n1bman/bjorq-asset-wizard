

# v2.0.5 — Version bump to force clean HA image pull

## Why
v2.0.4 was already tagged on GHCR but `config.yaml` still pointed to `2.0.3`. We cannot re-tag `2.0.4` since it already exists. Clean tag `2.0.5` ensures HA pulls a fresh, never-cached image.

## Changes (11 files)

| File | Line | `2.0.3` → `2.0.5` |
|------|------|--------------------|
| `package.json` | 4 | version |
| `server/package.json` | 3 | version |
| `bjorq_asset_wizard/server/package.json` | 3 | version |
| `bjorq_asset_wizard/config.yaml` | 3 | version |
| `server/src/index.ts` | ~20 | VERSION constant |
| `server/src/routes/health.ts` | 12 | VERSION constant |
| `server/src/services/catalog/manager.ts` | 24 | CATALOG_VERSION |
| `bjorq_asset_wizard/server/src/index.ts` | ~20 | VERSION constant |
| `bjorq_asset_wizard/server/src/routes/health.ts` | 12 | VERSION constant |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | 24 | CATALOG_VERSION |
| `CHANGELOG.md` | top | Add 2.0.5 entry |

## CHANGELOG entry

```
## [2.0.5] — 2026-03-10

### Changed
- Version bump to 2.0.5 — forces HA to pull a clean, never-cached image tag.
- No functional changes from 2.0.3.
```

## After Lovable pushes
1. Create tag: `git tag -a v2.0.5 -m "v2.0.5" && git push origin v2.0.5`
2. Verify `ha-addon.yml` succeeds in GitHub Actions
3. Update/reinstall add-on in HA
4. Verify logs: `v2.0.5`, `/data/catalog`, no EACCES, no s6 errors

