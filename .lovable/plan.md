

# Plan: Catalog Export/Import, Sync-verifiering och Onboarding Guide

## 1. Catalog Export/Import

### Backend — Nya endpoints

**`GET /catalog/export`** — Exportera hela katalogen som `.tar.gz`
- Strömmar en tar.gz-arkiv av hela `/data/catalog/` (alla mappar med model.glb, meta.json, thumb.webp)
- Inkluderar `index.json` i arkivet
- `Content-Disposition: attachment; filename="bjorq-catalog-export-{timestamp}.tar.gz"`

**`POST /catalog/import`** — Importera ett catalog-arkiv
- Accepterar multipart med en `.tar.gz`-fil
- Extraherar till `/data/catalog/`, mergar med existerande (hoppar över duplikat-IDn eller skriver över — konfigurerbart via query `?strategy=merge|overwrite`)
- Kör `reindexCatalog()` efter import
- Returnerar `{ success, imported, skipped, errors }`

### Backend-filer som ändras

| Fil | Ändring |
|-----|---------|
| `server/src/routes/catalog.ts` + mirror | Lägg till `GET /catalog/export` och `POST /catalog/import` |
| `server/src/index.ts` + mirror | Registrera `/catalog/export` och `/catalog/import` i SPA not-found handler |

### Frontend — UI i Catalog-sidan

**`src/pages/Catalog.tsx`** — Lägg till Export/Import-knappar i header:
- **Export Catalog** — Hämtar `/catalog/export` som blob-download (samma mönster som `downloadAssetBlob`)
- **Import Catalog** — File input som accepterar `.tar.gz`, laddar upp via `/catalog/import`, visar resultat i toast

Inga nya sidor behövs — knapparna sitter i Catalog-sidans header bredvid titeln.

## 2. Sync-verifiering för Bjorq Dashboard

Sync-flödet är redan komplett:
- `POST /sync` uppdaterar `meta.json` med `syncStatus: "synced"` och `lifecycleStatus: "published"`
- Dashboard-API:t (`/libraries`, `/libraries/:lib/index`, `/assets/:id/meta`, `/assets/:id/model`, `/assets/:id/thumbnail`) serverar alla publicerade assets

**Saknas**: Dashboarden behöver kunna filtrera på `syncStatus === "synced"` — men det hanteras redan av att Library-API:t returnerar **alla** assets. Dashboarden filtrerar på sin sida.

**En sak att fixa**: `GET /libraries/:library/index` returnerar alla assets oavsett syncStatus. Om dashboarden bara ska se publicerade assets behöver vi filtrera:
- Lägg till filtrering i `buildCatalogIndex()` eller i library-endpointen: bara assets med `lifecycleStatus === "published"` inkluderas i library-indexet.

## 3. Onboarding Guide

**Ny fil**: `docs/ONBOARDING.md` — en steg-för-steg-guide för nya användare.

Innehåll:
1. **Vad är Bjorq Asset Wizard?** — Kort intro
2. **Installation** — Lägg till repo i HA, installera add-on
3. **Första modellen** — Steg-för-steg: ladda upp → analysera → optimera → spara till katalog → synka
4. **Dashboard-koppling** — Hur man ansluter Bjorq Dashboard till Wizard via port 3500
5. **Catalog Management** — Export/import, radera, kategorisera
6. **Felsökning** — Vanliga problem och lösningar
7. **API-referens** — Kort tabell med alla endpoints

## Filer som ändras/skapas

| Fil | Typ | Beskrivning |
|-----|-----|-------------|
| `server/src/routes/catalog.ts` | Ändra | `GET /catalog/export` + `POST /catalog/import` |
| `bjorq_asset_wizard/server/src/routes/catalog.ts` | Ändra | Mirror |
| `server/src/index.ts` | Ändra | Registrera nya routes i SPA handler |
| `bjorq_asset_wizard/server/src/index.ts` | Ändra | Mirror |
| `src/pages/Catalog.tsx` | Ändra | Export/Import-knappar |
| `src/services/api.ts` | Ändra | `exportCatalog()` + `importCatalog()` funktioner |
| `src/types/api.ts` | Ändra | `ImportCatalogResponse` typ |
| `docs/ONBOARDING.md` | **Ny** | Onboarding Guide |
| `CHANGELOG.md` | Ändra | Ny entry |

