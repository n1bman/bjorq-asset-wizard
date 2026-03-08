

# Convert Wizard Add-on to Prebuilt Image Mode

## What Changes

### 1. `bjorq_asset_wizard/config.yaml`
Add the `image` field so HA pulls prebuilt images instead of building locally:
```yaml
image: "ghcr.io/n1bman/bjorq-asset-wizard-{arch}"
```
Bump version to **0.2.1** so HA sees the change.

### 2. Remove `bjorq_asset_wizard/build.yaml`
Not needed when using prebuilt images. HA ignores `Dockerfile` when `image:` is present.

### 3. Update `.github/workflows/docker.yml`
The current workflow publishes a single multi-platform image as `ghcr.io/n1bman/bjorq-asset-wizard`. HA add-ons with `image:` expect **per-arch images** named `ghcr.io/n1bman/bjorq-asset-wizard-amd64` and `ghcr.io/n1bman/bjorq-asset-wizard-aarch64`, tagged with the version string from `config.yaml`.

Replace the current workflow with a matrix build that:
- Builds `linux/amd64` → pushes to `ghcr.io/n1bman/bjorq-asset-wizard-amd64:0.2.1`
- Builds `linux/arm64` → pushes to `ghcr.io/n1bman/bjorq-asset-wizard-aarch64:0.2.1`
- Also tags `latest`
- Uses the root `Dockerfile` (multi-stage production build), not the HA add-on Dockerfile

### 4. Keep `bjorq_asset_wizard/Dockerfile` and `prepare-addon.sh`
These remain for local testing but are no longer used by HA during install. Add a comment noting this.

### 5. Update documentation
- **`bjorq_asset_wizard/README.md`**: Replace the "Add-on Packaging" / "Wizard vs Dashboard" sections to explain both now use prebuilt GHCR images. Remove `prepare-addon.sh` from the install flow. Keep it documented for dev/testing only.
- **`bjorq_asset_wizard/DOCS.md`**: Brief note that the add-on now uses prebuilt images.

## Files Changed
| File | Action |
|------|--------|
| `bjorq_asset_wizard/config.yaml` | Add `image:`, bump to 0.2.1 |
| `bjorq_asset_wizard/build.yaml` | Delete |
| `.github/workflows/docker.yml` | Per-arch image builds |
| `bjorq_asset_wizard/README.md` | Update packaging docs |
| `bjorq_asset_wizard/DOCS.md` | Add prebuilt image note |

## Summary (post-implementation)
- **config.yaml**: version 0.2.1, `image: ghcr.io/n1bman/bjorq-asset-wizard-{arch}`
- **Image pattern**: `ghcr.io/n1bman/bjorq-asset-wizard-{amd64,aarch64}:{version}`
- **Workflow**: `.github/workflows/docker.yml` publishes per-arch images on `v*` tags
- **Same model as Dashboard**: yes — prebuilt image, no local Dockerfile build by HA

