

# v2.0.3 — Fix HA workflow permission error

## What happened

**Two workflows ran** — this is correct and intentional:
1. `ha-addon.yml` → builds the HA add-on image (failed)
2. `docker.yml` → builds the standalone image (succeeded)

Both trigger on `v*` tags. One for HA users, one for docker-compose users. This is the expected behavior.

**Why the HA build failed**: `prepare-addon.sh` lacks the execute bit in Git. Error code 126 = "Permission denied" (file not executable). The GitHub Actions runner checks out the file without `+x`.

## Fix

One-line change in `.github/workflows/ha-addon.yml` — add `chmod +x` before running the script:

```yaml
- name: Prepare add-on directory
  run: |
    chmod +x ./bjorq_asset_wizard/prepare-addon.sh
    ./bjorq_asset_wizard/prepare-addon.sh
```

Also bump version to `2.0.3` across all surfaces and add CHANGELOG entry.

| File | Change |
|------|--------|
| `.github/workflows/ha-addon.yml` | Add `chmod +x` before running prepare script |
| Version surfaces (10+) | `2.0.2` → `2.0.3` |
| `CHANGELOG.md` | Add `2.0.3` entry |

