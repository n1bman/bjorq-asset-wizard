

# v0.2.3 Release Alignment — Full Review

## Issues Found

After reviewing all files, here are the problems that need fixing before v0.2.3:

### 1. Version bump needed
`bjorq_asset_wizard/config.yaml` is at **0.2.1** — must be **0.2.3**.

### 2. Stale version references in docs
- `bjorq_asset_wizard/README.md` mentions "0.2.1" twice (line 36 and line 65)
- `bjorq_asset_wizard/DOCS.md` mentions "0.2.1" once (line 58)

### 3. Local-dev Dockerfile still broken
`bjorq_asset_wizard/Dockerfile` (used for local testing only) still has the old `npm ci --ignore-scripts && npm rebuild sharp` pattern that fails. Should be fixed for consistency even though HA doesn't use it.

### 4. Root Dockerfile — OK
The production Dockerfile that GHCR uses is correct (uses `npm install` without `--ignore-scripts`).

### 5. Workflow, repository.yaml, run.sh, docker-compose — all OK
No changes needed.

## Changes

| File | Change |
|------|--------|
| `bjorq_asset_wizard/config.yaml` | `version: "0.2.1"` → `"0.2.3"` |
| `bjorq_asset_wizard/README.md` | Update version refs from 0.2.1 → 0.2.3 (lines 36, 65) |
| `bjorq_asset_wizard/DOCS.md` | Update version ref from 0.2.1 → 0.2.3 (line 58) |
| `bjorq_asset_wizard/Dockerfile` | Fix `npm ci --ignore-scripts && npm rebuild sharp` → `npm install` |

## After merge

```
git tag v0.2.3 && git push origin v0.2.3
```

This triggers `.github/workflows/docker.yml` which publishes:
- `ghcr.io/n1bman/bjorq-asset-wizard-amd64:0.2.3`
- `ghcr.io/n1bman/bjorq-asset-wizard-aarch64:0.2.3`

HA can then install the add-on.

