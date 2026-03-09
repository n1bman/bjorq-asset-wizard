

# v1.1.3 — Consolidated Bugfix Pass

## Issues Identified

### Issue 1 & 2 — Analyze error messages lost
The analyze route (line 130-134) replaces specific error messages with `"Analysis failed unexpectedly"` for non-parse, non-OOM errors. The analyzer itself throws detailed stage-specific messages like `"Analyze failed at GLB parse: ..."`, but the route handler discards them. Fix: always propagate the actual error message.

### Issue 3 — Health/version log noise
The `onResponse` hook in `server/src/index.ts` (line 78-89) logs every request at `info` level, including `/health` and `/version` polls every 30s. Fix: skip or lower these to `debug`.

### Issue 4 — Integration page false "unreachable"
The `WizardClient` (wizard-client.ts) uses a separate connection to `localhost:3500` by default, completely ignoring the HA ingress URL detection that `apiClient` uses. The Wizard Integration page will always show "unreachable" in HA because it's trying to reach `localhost:3500` from the browser. Fix: make `WizardClient` use the same `detectBaseUrl()` logic, or better yet, remove the separate client and have the Integration page use the main `apiClient` + `useConnection()`.

### Issue 5 — Catalog asset click breaks
The `AssetDetailDrawer` and `AssetDetail` page look structurally sound. The "brown/blank" state is likely caused by the drawer's Sheet overlay rendering on top with no way to dismiss if the asset data fails to load. The drawer itself handles `null` asset gracefully. More likely, navigation to `/catalog/:id` renders the full-page `AssetDetail` which shows a placeholder Box icon — not "broken brown." Need to verify the catalog click handler. Looking at `Catalog.tsx`, clicking an asset opens the drawer (not navigates), which should be fine. The issue might be the Sheet backdrop remaining stuck. Adding `key={asset?.id}` to force re-render on asset change.

### Issue 6 — Catalog metadata paths
The catalog manager already writes correct catalog-relative paths (line 211, 161). The `meta.json` written by `ingestAsset()` uses `modelRelPath = "/<category>/<subcategory>/<id>/model.glb"` and `thumbnailRelPath` is either a catalog-relative path or `null`. This is correct. The `validateAssetMeta` function rejects empty strings for `model` (line 44). This looks fine.

### Issue 7 — Frontend consistency
The main connection (`useConnection`) and wizard connection (`useWizard`) are separate systems. The Integration page uses `useWizard` while everything else uses `useConnection`. Since both point to the same backend, the wizard client is redundant. Fix: have the Integration page use `useConnection` instead.

## Plan

### 1. Fix analyze route error propagation
**File: `server/src/routes/analyze.ts` + mirror**

Line 130-136 — change the catch block to always include the actual error message:
```typescript
return reply.status(isParseError ? 422 : 500).send({
  success: false,
  error: isParseError
    ? `Failed to parse model: ${message}`
    : `Analyze failed: ${message}`,
  stage,
});
```

Also add stack trace logging (line 102):
```typescript
log.error({ err, fileName, stage: "analyze", stack: err instanceof Error ? err.stack : undefined }, "Analysis failed");
```

### 2. Reduce health/version log noise
**File: `server/src/index.ts` + mirror**

In the `onResponse` hook (line 78-89), skip logging for `/health` and `/version` at info level:
```typescript
server.addHook("onResponse", (request, reply, done) => {
  const isPolling = request.url === "/health" || request.url === "/version";
  if (!isPolling) {
    request.log.info(
      { method: request.method, url: request.url, statusCode: reply.statusCode, responseTime: reply.elapsedTime },
      "Request completed",
    );
  }
  done();
});
```

### 3. Fix Integration page — use main connection
**File: `src/pages/WizardIntegration.tsx`**

Replace `WizardSettingsCard` and `WizardStatusWidget` (which use `useWizard()` → separate `wizardClient`) with components that use `useConnection()` from `ConnectionContext`. This ensures the Integration page shows the same connection state as the Status page.

**File: `src/components/wizard/WizardSettingsCard.tsx`**

Change from `useWizard()` to `useConnection()` — use `apiClient.baseUrl`, `apiClient.setBaseUrl()`, and `connection.refresh()`.

**File: `src/components/wizard/WizardStatusWidget.tsx`**

Change from `useWizard()` to `useConnection()` — show `health`, `version`, and `status` from the main connection context.

### 4. Harden catalog asset drawer
**File: `src/components/catalog/AssetDetailDrawer.tsx`**

The drawer looks correct. Add defensive rendering for missing `performance` and `dimensions` data to prevent crashes if catalog metadata is incomplete:
```typescript
<span>{asset.performance?.triangles?.toLocaleString() ?? "—"}</span>
```

### 5. Version bump to v1.1.3
Update version in:
- `server/package.json` + mirror
- `server/src/index.ts` + mirror  
- `server/src/routes/health.ts` + mirror
- `bjorq_asset_wizard/config.yaml`
- `CHANGELOG.md`

## Files to Modify

| File | Change |
|------|--------|
| `server/src/routes/analyze.ts` | Propagate actual error message, add stack trace logging |
| `server/src/index.ts` | Suppress health/version log noise |
| `src/components/wizard/WizardSettingsCard.tsx` | Switch from useWizard to useConnection |
| `src/components/wizard/WizardStatusWidget.tsx` | Switch from useWizard to useConnection |
| `src/components/catalog/AssetDetailDrawer.tsx` | Defensive rendering for missing data |
| `server/package.json` | 1.1.3 |
| `server/src/routes/health.ts` | VERSION → 1.1.3 |
| `CHANGELOG.md` | v1.1.3 entry |
| `bjorq_asset_wizard/server/src/routes/analyze.ts` | Mirror |
| `bjorq_asset_wizard/server/src/index.ts` | Mirror |
| `bjorq_asset_wizard/server/package.json` | Mirror |
| `bjorq_asset_wizard/server/src/routes/health.ts` | Mirror |
| `bjorq_asset_wizard/config.yaml` | Mirror |

