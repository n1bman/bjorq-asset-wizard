

# Add-on Metadata & Cache Troubleshooting Pass

## Current State

- `bjorq_asset_wizard/config.yaml` is already at **0.1.6** (not 0.1.5 as stated — it was bumped in the last round)
- Slug and folder both `bjorq_asset_wizard` — consistent
- Troubleshooting sections already exist in `bjorq_asset_wizard/README.md` and `docs/HANDBOOK.md`
- **Problem**: HANDBOOK.md lines 210-217 still reference the deleted `ha-addon/` directory as the active add-on location

## Changes

### 1. `bjorq_asset_wizard/config.yaml`
- Bump version from `0.1.6` to **0.2.0** (clear visual break from any cached 0.1.x)

### 2. `docs/HANDBOOK.md` (lines 210-217)
- Replace stale `ha-addon/` reference with correct `bjorq_asset_wizard/` path
- Add a note explaining the packaging difference between Wizard (local Dockerfile build) and Dashboard (prebuilt `image:` field), and why Wizard is more sensitive to HA caching

### 3. `bjorq_asset_wizard/README.md`
- Update version reference in troubleshooting section from 0.1.6 to 0.2.0
- Add a short "Wizard vs Dashboard packaging" note explaining the Dockerfile build vs prebuilt image difference

### 4. `bjorq_asset_wizard/DOCS.md`
- Add the same cache-refresh troubleshooting steps (currently missing from this file, which is the user-facing HA docs)

No other files changed. No features. No architecture changes.

## Post-implementation summary
- **Version**: 0.2.0
- **Slug/folder**: both `bjorq_asset_wizard` — match
- **Docs**: Cache-refresh steps in README.md, DOCS.md, and HANDBOOK.md; packaging difference explained

