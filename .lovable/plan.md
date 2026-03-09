

# v1.1.10 — Persistence Diagnostics + Large-file UX

## 1. Catalog persistence — root cause analysis

After tracing every file, the code paths are correct:

- `run.sh` sets `CATALOG_PATH=/data/catalog`
- `storage.ts` reads `process.env.CATALOG_PATH` at module load
- `ingestAsset()` writes to `CATALOG_PATH` (`/data/catalog/<cat>/<sub>/<id>/`)
- `buildCatalogIndex()` reads from the same `CATALOG_PATH`
- Job cleaner only touches `/data/storage/jobs/` — never catalog
- `initStorage()` only does `mkdir -p` — never deletes

**The code never deletes catalog assets on startup.** If assets disappear after restart, it is either:
- A) The HA Docker volume for `/data` is not properly persisted (infrastructure issue outside our code)
- B) The add-on was reinstalled (not just restarted), which wipes `/data`

**What we can do:** Add startup diagnostics so we can see exactly what happens. On every boot, the server will log `CATALOG_PATH`, list its contents, and count assets. This makes the next test definitive.

| File | Change |
|------|--------|
| `server/src/index.ts` | Add startup catalog scan: log CATALOG_PATH value, list directory contents, count assets |
| `server/src/routes/health.ts` | Add `catalogPath` and `catalogAssetCount` to health response |
| `bjorq_asset_wizard/server/src/index.ts` | Mirror |
| `bjorq_asset_wizard/server/src/routes/health.ts` | Mirror |

After this change, the validation flow is:
1. Save an asset to catalog
2. Check `/health` — verify `catalogAssetCount: 1`
3. Restart add-on
4. Check add-on logs — see startup line listing catalog contents
5. Check `/health` again — verify count is still 1 or 0 (proves whether `/data` survives)

This tells us definitively if the issue is our code or HA infrastructure.

---

## 2. Large-file UX — direct port link

The 413 detection and warning already exist from v1.1.9. What's missing is a clear action to open Wizard in a new tab on port 3500.

| File | Change |
|------|--------|
| `src/pages/UploadAnalyze.tsx` | Add "Open Wizard in direct mode" link/button that opens `http://<current-hostname>:3500` in new tab. Enhance the >10 MB warning with this link. |
| `src/pages/Optimize.tsx` | Same direct-mode link for the optimize upload flow |
| `src/components/layout/AppSidebar.tsx` | Add small "Direct mode" link at bottom of sidebar when running inside ingress (detected by URL pattern) |

The hostname is derived from `window.location.hostname` — works for both `homeassistant.local` and IP addresses. The link opens `http://{hostname}:3500` in a new browser tab.

---

## 3. Temporary vs persistent UI clarity

`StatsComparison.tsx` already has the "temporary — save to catalog" warning from v1.1.9. Enhance this:

| File | Change |
|------|--------|
| `src/pages/Catalog.tsx` | Add a small info badge or text near catalog header: "All assets here are permanently stored" |
| `src/components/catalog/AssetCard.tsx` | If asset has `lifecycleStatus: "published"`, show a subtle "Persistent" indicator |

---

## 4. Version bump to 1.1.10

All version surfaces updated (package.json files, index.ts, health.ts, config.yaml, CHANGELOG.md).

---

## Summary of all files

| File | Change |
|------|--------|
| `server/src/index.ts` | Startup catalog diagnostics logging |
| `server/src/routes/health.ts` | Catalog info in health response |
| `src/pages/UploadAnalyze.tsx` | "Open direct mode" link in large-file warning |
| `src/pages/Optimize.tsx` | Same direct-mode link |
| `src/components/layout/AppSidebar.tsx` | Direct mode link in sidebar |
| `src/pages/Catalog.tsx` | "Permanently stored" indicator |
| `src/components/catalog/AssetCard.tsx` | Published status indicator |
| All version surfaces | 1.1.10 |
| `CHANGELOG.md` | 1.1.10 entry |
| + mirrors in `bjorq_asset_wizard/server/` | |

## Validation steps after deployment

1. Start add-on — check logs for catalog scan output (path, asset count)
2. Save asset to catalog — verify `/health` shows `catalogAssetCount: 1`
3. Restart add-on — check logs again for catalog contents
4. If count is 0 after restart: confirmed HA volume issue (not our code)
5. If count is 1 after restart: persistence works, previous issue was likely a reinstall
6. Test "Open direct mode" link — verify it opens correct URL in new tab
7. Upload >10 MB file via direct mode — verify success

