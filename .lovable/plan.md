

# Plan: Dashboard-kompatibel API + Version 2.1.0

## Problemet

Dashboarden förväntar sig en **platt array av assets** med fälten `id`, `name`, `category`, `triangleCount`, `fileSize`. Men Wizard returnerar en **nästlad struktur** (`categories > subcategories > assets`) med fältnamn som `performance.triangles` och `performance.fileSizeKB`. Dashboarden hittar 0 assets eftersom den inte kan parsa den nästlade strukturen.

## Lösning

Modifiera tre API-endpoints för att inkludera en platt `assets`-array med Dashboard-vänliga fältnamn, utan att bryta existerande format.

### 1. Hjälpfunktion: `flattenCatalogAssets()`

Ny funktion i `catalog.ts` som:
- Plattar ut `categories > subcategories > assets` till en enkel array
- Lägger till Dashboard-kompatibla alias: `triangleCount`, `fileSize`, `thumbnailUrl`, `modelUrl`

### 2. `GET /catalog/index` — Lägg till `assets`-array

Returnerar nuvarande format PLUS en platt `assets`-array i toppnivån:
```json
{
  "schemaVersion": "1.0",
  "categories": [...],
  "totalAssets": 5,
  "assets": [
    { "id": "abc", "name": "Chair", "triangleCount": 1200, "fileSize": 50000, ... }
  ]
}
```

### 3. `GET /libraries/:lib/index` — Samma tillägg

Lägger till `assets`-array med plattade, filtrerade (published/synced) assets.

### 4. `GET /libraries` — Dubbelt format

Returnerar BÅDE `{ libraries: [...] }` OCH gör arrayen tillgänglig direkt om Dashboarden förväntar sig det.

### 5. CORS — redan hanterat

Wizard använder `@fastify/cors` med `origin: true` (eller `*` via `CORS_ORIGINS`). Detta täcker alla endpoints inklusive `/libraries` och `/assets`. Inga ändringar behövs.

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `server/src/routes/catalog.ts` | Lägg till `flattenCatalogAssets()`, uppdatera 3 endpoints |
| `bjorq_asset_wizard/server/src/routes/catalog.ts` | Mirror |
| Alla versionsfiler | Bump till 2.1.0 |
| `CHANGELOG.md` | Ny entry |

