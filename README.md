# Bjorq Asset Wizard

**3D-asset pipeline, katalogserver och startbibliotek för Bjorq-ekosystemet.**

Wizard fokuserar nu på den stabila kärnan: ladda upp, analysera, optimera, katalogisera och publicera GLB/glTF-assets för Dashboard. All tidigare TRELLIS- och Photo → 3D-funktionalitet är borttagen från projektet.

## Vad som finns i `v2.9.1`

- Upload & Analyze för GLB/glTF
- Optimize-pipeline för mesh och texturer
- Catalog ingest och katalogbläddring
- Library/API-endpoints för Dashboard
- Home Assistant add-on med ingress
- Inbyggt **starter-bibliotek** med färdiga low-poly GLB-assets och thumbnails

## Starter-bibliotek

Wizard levereras nu med ett färdigt 3D-bibliotek under `catalog-seed/`.

- Format: `GLB`
- Preview: `thumb.webp`
- Metadata: `meta.json`
- Kategorier:
  - `architecture`
  - `decor`
  - `furniture`
  - `lighting`
  - `vehicles`

Biblioteket seedas automatiskt **första gången** om live-katalogen är tom. Befintlig katalog skrivs inte över.

## Kärnflöde

```text
Upload → Analyze → Optimize → Ingest → Published
```

Dashboard ska läsa publicerade assets via Wizard API:t, och starter-biblioteket kan användas direkt utan manuell import.

## Viktiga API-endpoints

- `GET /health`
- `GET /version`
- `POST /analyze`
- `POST /optimize`
- `GET /catalog/index`
- `POST /catalog/ingest`
- `POST /catalog/reindex`
- `GET /catalog/diagnostics`
- `POST /sync`
- `GET /libraries`
- `GET /libraries/:library/index`
- `GET /assets/:id/meta`
- `GET /assets/:id/model`
- `GET /assets/:id/thumbnail`

## Snabbstart

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
npm run dev
```

### Docker

```bash
docker compose up -d
```

## Home Assistant Add-on

1. Gå till `Settings → Add-ons → Add-on Store → Repositories`
2. Lägg till repo-URL:en
3. Installera `Bjorq Asset Wizard`
4. Starta add-onet
5. Öppna Wizard-panelen och kontrollera katalogen

All data ligger kvar under `/data/` i add-on-miljön.

## Status

- Upload & Analyze: klart
- Optimize pipeline: klart
- Catalog ingest: klart
- Dashboard library API: klart
- Starter-bibliotek: klart
- TRELLIS / Photo → 3D: borttaget

## License