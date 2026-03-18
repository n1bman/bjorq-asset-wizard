

## Analysis

The Dockerfile at `bjorq_asset_wizard/Dockerfile` line 5 already contains `git python3 py3-pip`. However, the v2.3.5 GHCR image was almost certainly built from a commit **before** that line was added. The HA addon workflow triggers on `v*` tags — if the tag `v2.3.5` was pushed before the Dockerfile fix commit, the published image lacks git.

Home Assistant caches images aggressively by tag. Even if you rebuild `v2.3.5`, HA may not re-pull it. A new version tag (`v2.3.6`) is the only reliable way to force a fresh pull.

## Changes

### 1. Add startup dependency check (`server/src/index.ts` + `bjorq_asset_wizard/server/src/index.ts`)

Add a `checkRuntimeDeps()` function that runs at startup and logs availability of `git`, `python3`, and `pip3`:

```typescript
import { execSync } from "node:child_process";

function checkRuntimeDeps(log: FastifyBaseLogger) {
  const deps = ["git", "python3", "pip3"];
  for (const dep of deps) {
    try {
      const version = execSync(`${dep} --version`, { timeout: 5000 }).toString().trim();
      log.info({ dep, version }, `Runtime dependency OK: ${dep}`);
    } catch {
      log.warn({ dep }, `Runtime dependency MISSING: ${dep}`);
    }
  }
}
```

Call `checkRuntimeDeps(server.log)` right after storage init, before route registration. This makes missing deps immediately visible in logs.

### 2. Version bump to 2.3.6

Update in all 5 locations:
- `server/package.json`
- `server/src/index.ts`
- `bjorq_asset_wizard/config.yaml`
- `bjorq_asset_wizard/server/package.json`
- `bjorq_asset_wizard/server/src/index.ts`

### 3. Update CHANGELOG.md

Add a `[2.3.6]` entry explaining the packaging fix and startup dep check.

### 4. Update docs

- `bjorq_asset_wizard/README.md` line 80: change version reference from `2.3.1` to `2.3.6`
- `README.md` line 216: update "Known Limitations" version reference

### Scope
- 7 files modified, no new files
- After pushing this commit, you need to create git tag `v2.3.6` and push it to trigger the HA addon build workflow

