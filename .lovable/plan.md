

# Analysis: Why HA is still broken

## The smoking gun in the logs

The log proves exactly what image HA is running:

```
Bjorq Asset Wizard v1.1.10 listening on 0.0.0.0:3500
Catalog startup scan: 0 asset(s) found in /app/public/catalog
```

**HA is running v1.1.10** — not v2.0.1, not v2.0.2, not v2.0.3. None of our fixes are in the running container.

## Why: No HA image has ever been successfully pushed

Here is the timeline:

| Release | `docker.yml` (standalone) | `ha-addon.yml` (HA) | What HA pulls |
|---------|--------------------------|---------------------|---------------|
| ≤ v2.0.0 | Pushed to `bjorq-asset-wizard-amd64` | **Did not exist** | Standalone image (wrong) |
| v2.0.1 | Pushed to `bjorq-asset-wizard-amd64` | **Did not exist** | Standalone image (wrong) |
| v2.0.2 | Pushed to `-standalone-amd64` (renamed) | **Failed** (chmod 126) | Still old standalone image |
| v2.0.3 | Not yet tagged | Not yet tagged | Still old standalone image |

The `ha-addon.yml` workflow was created in v2.0.2 but failed due to the `prepare-addon.sh` permission error. The `chmod +x` fix was applied in v2.0.3, but **v2.0.3 has not been tagged and pushed to GitHub yet**. It only exists as edits in Lovable.

## The s6-overlay error explained

```
s6-overlay-suexec: fatal: can only run as pid 1
```

This is **not a bug in our code**. HA Supervisor expects containers built from the HA base image (`ghcr.io/home-assistant/amd64-base`). The currently running container is the standalone `node:20-alpine` image which has no s6-overlay. When HA Supervisor tries to manage the container using s6 conventions, it fails.

Once the correct HA image (built from the HA base) is running, this error disappears.

## The EACCES error explained

The standalone image creates a non-root `bjorq` user (UID 1001) and runs Node as that user. When HA mounts `/data` at runtime, the `bjorq` user cannot write to it. The HA Dockerfile runs as root — no EACCES. But the HA Dockerfile has never been built and pushed.

## What needs to happen

**No code changes are needed.** The code and workflows are correct. The fix is operational:

1. Commit and push v2.0.3 changes to GitHub
2. Create and push the `v2.0.3` tag: `git tag v2.0.3 && git push origin v2.0.3`
3. Verify in GitHub Actions that **both** workflows run and `ha-addon.yml` succeeds
4. In HA, go to the add-on and click "Update" / reinstall to pull the new `2.0.3` tag
5. Check logs — should show `v2.0.3`, `/data/catalog`, no EACCES, no s6 error

## Verification checklist after deploying v2.0.3

The HA log should show:
- `Bjorq Asset Wizard v2.0.3` (not v1.1.10)
- `Catalog startup scan: X asset(s) found in /data/catalog` (not `/app/public/catalog`)
- No `EACCES` errors
- No `s6-overlay-suexec` errors
- `Starting Bjorq Asset Wizard...` from bashio (proves `run.sh` is executing)

