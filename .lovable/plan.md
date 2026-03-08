

# Fix: Port Conflict with Dashboard Add-on

## Problem
Both add-ons use internal port 3000. Even though host port is `null`, the `ingress_port` must be unique per add-on.

## Changes (3 files, port 3000 → 3500)

### `bjorq_asset_wizard/config.yaml`
- `ports: 3500/tcp: null`
- `ingress_port: 3500`
- Version bump to `0.1.5`

### `bjorq_asset_wizard/run.sh`
- `export PORT=3500`

### `bjorq_asset_wizard/Dockerfile`
- `ENV PORT=3500`
- `EXPOSE 3500`

