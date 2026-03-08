

# Release Alignment — Current State & Minimal Changes

## Already Correct

After reviewing the files, the state is better than expected:

- **`bjorq_asset_wizard/config.yaml`** is already at version **0.2.1** (not 0.2.0 as stated), with the `image:` field set correctly
- **`.github/workflows/docker.yml`** correctly publishes per-arch images on `v*` tags, tagging them as `ghcr.io/n1bman/bjorq-asset-wizard-{amd64,aarch64}:0.2.1` and `:latest`
- **`bjorq_asset_wizard/README.md`** already documents the release steps (bump config, create tag, workflow publishes)

## What's Missing

The README documents the steps but doesn't make it explicit that **all three steps must complete successfully before HA can install**. A small addition to emphasize the dependency chain.

## Changes

### 1. `bjorq_asset_wizard/README.md` — Add a "Release Requirements" note
After the "Releasing a new version" section (line 38), add a short callout:

> **Important**: Home Assistant cannot install a version until the matching GHCR image exists. All three steps (version bump in config.yaml → git tag → successful Docker workflow) must complete before the add-on is installable. If the workflow fails, HA will show the version but fail to pull the image.

### 2. No version change needed
`config.yaml` is already at 0.2.1. No bump required.

### 3. No workflow changes needed
The workflow is correctly configured.

## Summary

- **Final version in config.yaml**: 0.2.1
- **Git tag to create**: `v0.2.1`
- **Docker workflow**: Will publish `ghcr.io/n1bman/bjorq-asset-wizard-amd64:0.2.1` and `ghcr.io/n1bman/bjorq-asset-wizard-aarch64:0.2.1` when the tag is pushed
- **Action required**: Run `git tag v0.2.1 && git push origin v0.2.1` to trigger the image build

