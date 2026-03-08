

# Version Bump to 0.1.1

Update the add-on version from `0.1.0` to `0.1.1` in `bjorq_asset_wizard/config.yaml` so Home Assistant detects a new version and triggers a rebuild.

## Changes

### `bjorq_asset_wizard/config.yaml`
- Change `version: "0.1.0"` → `version: "0.1.1"`

This single change will make HA see an updated add-on version when the repo syncs via GitHub, allowing you to update/reinstall and verify the Dockerfile fix.

