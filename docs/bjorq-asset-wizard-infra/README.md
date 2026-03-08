# Bjorq Asset Wizard — Infrastructure Reference

> **Note:** Infrastructure files have been moved to their production locations in the monorepo.
> This directory is kept as historical reference for the scaffolding origin.

## Where Files Live Now

| Original Location | New Location | Status |
|-------------------|--------------|--------|
| `github-actions/ci.yml` | `.github/workflows/ci.yml` | ✅ Moved |
| `github-actions/docker.yml` | `.github/workflows/docker.yml` | ✅ Moved |
| `github-actions/release.yml` | `.github/workflows/release.yml` | ✅ Moved |
| `docker/Dockerfile` | `Dockerfile` (root) | ✅ Moved |
| `docker/.dockerignore` | `.dockerignore` (root) | ✅ Moved |
| `docker/docker-compose.yml` | `docker-compose.yml` (root) | ✅ Moved |
| `ha-addon/config.yaml` | `ha-addon/config.yaml` (root) | ✅ Moved |
| `ha-addon/run.sh` | `ha-addon/run.sh` (root) | ✅ Moved |
| `ha-addon/DOCS.md` | `ha-addon/DOCS.md` (root) | ✅ Moved |
| `repo/tsconfig.json` | `server/tsconfig.json` | ✅ Moved |
| `repo/.gitignore` | Merged into root `.gitignore` | ✅ Applied |

## See Also

- [INTEGRATION.md](./INTEGRATION.md) — Integration architecture overview
- [Root README](../../README.md) — Full project documentation
