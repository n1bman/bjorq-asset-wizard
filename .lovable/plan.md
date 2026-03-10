

# v2.0.1 — HA Startup Fix + Legacy Path Cleanup

## Root Cause

**Issue 1 — EACCES on /data**: The HA Dockerfile (`bjorq_asset_wizard/Dockerfile`) does not pre-create `/data` subdirectories at build time. While `run.sh` creates them, if `bashio::config` calls fail (missing options, first boot), `set -e` aborts the script before reaching the `mkdir` block. Node never starts, or starts without directories.

**Fix**: Add `mkdir -p` for `/data/storage` and `/data/catalog` subdirectories in the HA Dockerfile. Also move directory creation in `run.sh` to before the `bashio::config` calls, so it runs regardless of config parsing.

**Issue 2 — `/app/public/catalog` in logs**: Two remaining legacy path references:
- `docker-compose.yml` sets `STORAGE_PATH=./storage` and `CATALOG_PATH=./public/catalog` and mounts volumes to `/app/storage` and `/app/public/catalog`
- `server/package.json` `init-storage` script creates `public/catalog/*` and `storage/*`
- `server/.env.example` has `STORAGE_PATH=./storage` and `CATALOG_PATH=./public/catalog`

These are the standalone/dev surfaces. If someone runs with docker-compose or copies `.env.example` to `.env`, they get old paths. For consistency and safety, update all to `/data/` paths.

## Changes

| File | Change |
|------|--------|
| `bjorq_asset_wizard/Dockerfile` | Add `RUN mkdir -p /data/storage/jobs /data/storage/uploads ... /data/catalog` before CMD |
| `bjorq_asset_wizard/run.sh` | Move `mkdir -p` block before `bashio::config` calls; add `set +e` around config reads |
| `docker-compose.yml` | Update volumes to `/data/storage` and `/data/catalog`; update env vars to match |
| `server/package.json` | Update `init-storage` script paths |
| `server/.env.example` | Update `STORAGE_PATH` and `CATALOG_PATH` defaults |
| Version surfaces | Bump to `2.0.1` |
| `CHANGELOG.md` | Add `2.0.1` entry |

### HA Dockerfile addition (before CMD)

```dockerfile
# Pre-create /data structure (safety net — run.sh also creates)
RUN mkdir -p \
    /data/storage/uploads /data/storage/jobs /data/storage/originals \
    /data/storage/optimized /data/storage/thumbs /data/storage/logs \
    /data/catalog
```

### run.sh reorder

Move directory creation to the very top (after `set -e`, before bashio calls), so directories always exist even if config parsing fails.

### docker-compose.yml

```yaml
volumes:
  - wizard-storage:/data/storage
  - wizard-catalog:/data/catalog
environment:
  - STORAGE_PATH=/data/storage
  - CATALOG_PATH=/data/catalog
```

