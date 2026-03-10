

# v1.1.11 hotfix — Startup order + permission fix

## Root Cause

Two bugs:

**Bug 1 — Initialization order in `server/src/index.ts`:**
`fastifyStatic` plugin registration (lines 111-126) requires `root` directories to exist at registration time. But `initStorage()` which creates those directories is called AFTER on line 129. fastifyStatic throws `"root" path must exist` before storage init ever runs.

**Bug 2 — Standalone Dockerfile permissions:**
The standalone `Dockerfile` creates a non-root `bjorq` user and switches to it (`USER bjorq`), but never creates `/data/` directories. The user can't `mkdir /data/storage`.

The HA Dockerfile (`bjorq_asset_wizard/Dockerfile`) doesn't have the user issue (HA base images run as root), but still hits Bug 1.

## Fix

| File | Change |
|------|--------|
| `server/src/index.ts` | Move `await initStorage()` BEFORE the `fastifyStatic` registrations |
| `bjorq_asset_wizard/server/src/index.ts` | Same fix (mirror) |
| `Dockerfile` | Create `/data/storage/jobs`, `/data/catalog` etc. before `USER bjorq`, and `chown` them |

### server/src/index.ts change

Move `await initStorage()` from line 129 to just after the multipart registration (after line 108), before the static file serving blocks. This ensures all directories exist before fastifyStatic tries to validate them.

### Dockerfile change

Add `/data` directory creation in the build stage (as root), before switching to the `bjorq` user:

```dockerfile
RUN mkdir -p /data/storage/jobs /data/storage/uploads /data/storage/originals \
    /data/storage/optimized /data/storage/thumbs /data/storage/logs \
    /data/catalog && \
    chown -R bjorq:bjorq /data
```

No changes to `run.sh` — it already creates dirs correctly and runs before Node in HA context.

No changes to `bjorq_asset_wizard/Dockerfile` — HA base image runs as root, so `initStorage()` and `run.sh` can create dirs fine once the order bug is fixed.

## Validation

1. Add-on starts without errors
2. Startup logs show `Catalog path: /data/catalog`
3. Save asset → restart → asset persists

