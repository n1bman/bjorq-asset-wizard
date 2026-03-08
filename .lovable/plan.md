

# Add-on Metadata Sanity Pass

## Audit Results

All files are internally consistent:
- **Slug** `bjorq_asset_wizard` matches folder name `bjorq_asset_wizard/` -- OK
- **Port** 3500 consistent across `config.yaml`, `Dockerfile`, `run.sh` -- OK
- **Base images** in `build.yaml` match `Dockerfile` ARG default -- OK
- **Architectures** `amd64`/`aarch64` in both `config.yaml` and `build.yaml` -- OK
- **Legacy `ha-addon/`** directory is deleted -- OK
- **`bjorq_asset_wizard/server/`** source is committed (not gitignored) -- OK
- **`repository.yaml`** at repo root with correct URL -- OK

## Only Issue: HA Cache

HA is reading a stale snapshot. The version is already `0.1.5` which is correct, but to force a visible change we bump to `0.1.6`.

## Changes

### 1. `bjorq_asset_wizard/config.yaml`
- Bump version from `0.1.5` to `0.1.6`

### 2. `docs/HANDBOOK.md`
- Add a "Troubleshooting: HA Shows Wrong Version" section with exact cache-refresh steps:
  1. Remove the repo URL from Settings > Add-ons > Add-on Store > Repositories
  2. Click the reload button / restart Supervisor
  3. Re-add the repo URL
  4. Verify version before installing
  5. If still wrong, restart Home Assistant Core

### 3. `bjorq_asset_wizard/README.md`
- Add same short troubleshooting section

No other files changed. No feature work. No backend/frontend changes.

## Summary (post-implementation)
- **Version in config.yaml**: 0.1.6
- **Folder/slug match**: yes (`bjorq_asset_wizard`)
- **Dockerfile/build.yaml/config.yaml consistent**: yes (port 3500, arch amd64+aarch64, base images aligned)
- **Cache refresh steps**: documented in HANDBOOK.md and add-on README.md

