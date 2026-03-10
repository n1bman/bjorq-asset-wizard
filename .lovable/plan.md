

# Fix: CI Build Failures + Version Bump to 2.0.9

## Identifierade problem

### 1. Saknade dependencies — `@react-three/fiber` och `@react-three/drei`
`ModelThumbnailCapture.tsx` importerar dessa men de finns INTE i `package.json`. Frontend-bygget failar med "module not found".

### 2. Duplicerad import i optimizer.ts
`import sharp from "sharp";` finns på **rad 14 OCH 15** i både `server/src/services/optimization/optimizer.ts` och mirrors. Orsakar TypeScript/lint-error.

### 3. CATALOG_VERSION inte uppdaterad
`server/src/services/catalog/manager.ts` (och mirror) har fortfarande `CATALOG_VERSION = "2.0.7"` — ska vara `"2.0.8"`.

## Åtgärder

| Fil | Ändring |
|-----|---------|
| `package.json` | Lägg till `@react-three/fiber` och `@react-three/drei` som dependencies |
| `server/src/services/optimization/optimizer.ts` | Ta bort duplicerad `import sharp` (rad 15) |
| `bjorq_asset_wizard/server/src/services/optimization/optimizer.ts` | Samma fix |
| `server/src/services/catalog/manager.ts` | CATALOG_VERSION → "2.0.9" |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | Samma fix |
| Versionsbump till 2.0.9 i alla package.json + server index + catalog routes + CHANGELOG |

