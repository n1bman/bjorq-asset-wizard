

# Wizard Integration Layer for Bjorq Dashboard

## What We're Building

Adding a dedicated integration layer so the Bjorq Dashboard can connect to the Bjorq Asset Wizard as an external local service. This includes a separate Wizard API client, connection management, a Wizard catalog browser, and an asset import flow.

## Architecture

The Wizard integration is separate from the existing `apiClient` (which connects to the Bjorq backend). A new `WizardClient` targets the Wizard service specifically.

```text
src/
  services/
    wizard-client.ts        ← New HTTP client for Wizard API
    wizard-mock-data.ts     ← Mock responses for Wizard endpoints
  contexts/
    WizardContext.tsx        ← Wizard connection state, enable/disable, polling
  components/
    wizard/
      WizardSettingsCard.tsx    ← URL config, enable toggle, status, last ping
      WizardStatusWidget.tsx    ← Health/version/availability widget
      WizardCatalogBrowser.tsx  ← Dialog/panel browsing Wizard catalog
      WizardAssetCard.tsx       ← Asset card for Wizard assets
      WizardAssetDetail.tsx     ← Inspect + import action
      WizardImportButton.tsx    ← Import/select asset into Bjorq
  pages/
    WizardIntegration.tsx      ← Settings + status + catalog browser page
```

## Key Changes

### 1. Wizard Client (`wizard-client.ts`)
Separate `WizardClient` class mirroring the existing `ApiClient` pattern: configurable base URL (`localStorage` key `bjorq_wizard_url`, default `http://localhost:3500`), connection check via `/health`, typed requests, timeout handling. Exports functions: `getWizardHealth()`, `getWizardVersion()`, `getWizardCatalog()`, `getWizardAsset(id)`.

### 2. Wizard Context (`WizardContext.tsx`)
Provides: `enabled` (toggle on/off, persisted to localStorage), `status`, `health`, `version`, `lastPingAt`, `baseUrl`, `setBaseUrl`, `setEnabled`, `refresh`. Polls `/health` every 30s only when enabled.

### 3. Wizard Integration Page (`/wizard`)
New route with three sections:
- **Settings**: Enable/disable toggle, base URL input, connection status badge, last successful ping timestamp, test connection button
- **Status Widget**: Health status, version info, uptime — or clear "Wizard Unreachable" state
- **Catalog Browser**: Grid of Wizard assets with category filter, each card showing thumbnail placeholder, name, category, dimensions, triangle count, and an "Import to Bjorq" button

### 4. Asset Source Extension
Extend the existing `AssetSource` type with `"wizard"` value. Update `AssetStatusBadge` with a wizard source color (cyan). Update `CategoryFilter` to optionally filter by source.

### 5. Import Flow
- Browse Wizard catalog on the integration page
- Click asset → opens detail panel (Sheet) with full metadata
- "Import to Bjorq" button → mock success toast (structured for real API call later)
- Imported assets get `source: "wizard"` and appear in main catalog

### 6. Sidebar Update
Add "Wizard" nav item under a new "Integration" group with a plug icon.

### 7. Documentation
Update `UI_README.md` with Wizard integration architecture notes.

## Files

| Action | File |
|--------|------|
| Create | `src/services/wizard-client.ts` |
| Create | `src/services/wizard-mock-data.ts` |
| Create | `src/contexts/WizardContext.tsx` |
| Create | `src/components/wizard/WizardSettingsCard.tsx` |
| Create | `src/components/wizard/WizardStatusWidget.tsx` |
| Create | `src/components/wizard/WizardCatalogBrowser.tsx` |
| Create | `src/components/wizard/WizardAssetCard.tsx` |
| Create | `src/components/wizard/WizardAssetDetail.tsx` |
| Create | `src/pages/WizardIntegration.tsx` |
| Modify | `src/types/api.ts` — add `"wizard"` to `AssetSource` |
| Modify | `src/components/catalog/AssetStatusBadge.tsx` — wizard badge color |
| Modify | `src/components/layout/AppSidebar.tsx` — add Integration group |
| Modify | `src/App.tsx` — add WizardProvider + route |
| Modify | `docs/bjorq-asset-optimizer/UI_README.md` — integration docs |

~9 new files, ~5 modified files.

