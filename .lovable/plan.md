

# Plan: Thumbnail-rendering, nedladdning, geometriförenkling och uppdaterad dokumentation

## 1. Client-side 3D-thumbnail (ersätter SVG info-card)

Server-side 3D-rendering i Docker/HA är opålitligt (kräver headless OpenGL). Istället: **rendera thumbnails client-side** med Three.js i en dold canvas.

**Ny komponent**: `src/components/optimize/ModelThumbnailCapture.tsx`
- Dold `<Canvas>` (512x512) som laddar den optimerade GLB:n via `@react-three/fiber` + `@react-three/drei` (`useGLTF`, `OrbitControls`, `Environment`)
- Auto-framing: `boundingBox` → positionera kamera så hela modellen syns
- Efter render: `gl.domElement.toDataURL("image/webp")` → skicka base64-blob till servern som thumbnail vid ingest
- Visas även som preview i Review-steget istället för info-carden

**Påverkar**:
- `src/pages/Optimize.tsx` — ReviewSection visar den renderade thumbnailn, skickar med den vid `handleSaveToCatalog`
- `src/services/api.ts` — `ingestAsset` accepterar en thumbnail-blob
- `server/src/routes/catalog.ts` — ingest-endpointen sparar medskickad thumbnail (om den finns) istället för att generera en info-card

**Nya dependencies**: `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`

## 2. Download-knapp aktiveras

`src/pages/Optimize.tsx` rad 594:
- Ta bort `disabled`
- `onClick` → `resolveStoragePath(result.outputs.optimizedModel)` → blob-fetch → anchor-download (samma mönster som `downloadAssetBlob` i `asset-paths.ts`)

## 3. Geometriförenkling (mesh simplification)

**Ny dependency**: `meshoptimizer` i `server/package.json` + mirror

**`server/src/services/optimization/optimizer.ts`**:
- Importera `weld`, `simplify` från `@gltf-transform/functions` + `MeshoptSimplifier` från `meshoptimizer`
- Init `MeshoptSimplifier` vid start
- Profilpresets utökas:

| Profil | simplifyRatio | simplifyError |
|--------|--------------|---------------|
| high-quality | — (ingen) | — |
| balanced | 0.75 | 0.001 |
| low-power | 0.5 | 0.01 |

- Efter `flatten()`, före write: kör `weld({ tolerance: 0.001 })` + `simplify({ simplifier: MeshoptSimplifier, ratio, error })`
- Logga triangelreduktion

**Types** (`server/src/types/optimize.ts` + mirror): lägg till `simplifyRatio?`, `simplifyError?`

## 4. Uppdaterad dokumentation

**`bjorq_asset_wizard/README.md`**:
- Version → 2.0.7
- Uppdatera features (V2-optimering, mesh simplification, 3D thumbnails, catalog management med radering/export)
- Ta bort "aarch64 temporarily disabled" om vi vill, eller behåll
- Uppdatera troubleshooting-version (1.0.0 → 2.0.7)

**`bjorq_asset_wizard/DOCS.md`**:
- Version → 2.0.7
- Uppdatera features och API-tabell (lägg till export, delete, model-endpoint)
- Troubleshooting version → 2.0.7

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/optimize/ModelThumbnailCapture.tsx` | **Ny** — dold Three.js canvas som renderar GLB och returnerar bild |
| `src/pages/Optimize.tsx` | Download-knapp + thumbnail-preview i Review |
| `src/services/api.ts` | Ingest accepterar thumbnail-blob |
| `server/src/services/optimization/optimizer.ts` + mirror | weld + simplify |
| `server/src/types/optimize.ts` + mirror | simplifyRatio, simplifyError |
| `server/package.json` + mirror | meshoptimizer dependency |
| `bjorq_asset_wizard/README.md` | Uppdaterad dokumentation |
| `bjorq_asset_wizard/DOCS.md` | Uppdaterad dokumentation |

