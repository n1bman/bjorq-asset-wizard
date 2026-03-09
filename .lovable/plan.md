
Jag har läst felet i loggen och isolerat den faktiska orsaken.

Do I know what the issue is? Ja.

## Faktiskt fel (root cause)

TypeScript-fel i backend typecheck:

- `server/src/services/catalog/manager.ts:40`
- `TS2677: A type predicate's type must be assignable to its parameter's type`
- Nuvarande signatur:
  - `function validateAssetMeta(meta: Record<string, unknown>): meta is CatalogAssetMeta`
- Problem:
  - `CatalogAssetMeta` är **inte** assignable till `Record<string, unknown>` (saknar index-signature), därför kraschar CI på `bun run typecheck`.

Samma kod finns i mirror:
- `bjorq_asset_wizard/server/src/services/catalog/manager.ts`

## Plan för fix

1. **Byt type guard-signatur till säker variant**
   - Ändra parameter från `Record<string, unknown>` till `unknown`.
   - Lägg första check:
     - `if (!meta || typeof meta !== "object") return false;`
   - Casta lokalt till en läsbar indexerbar form (t.ex. `const record = meta as Partial<Record<keyof CatalogAssetMeta, unknown>>`) innan fältloop.
   - Behåll return type `meta is CatalogAssetMeta`.

2. **Behåll nuvarande valideringslogik**
   - Samma required fields (`id`, `name`, `category`, `schemaVersion`, `model`, `placement`).
   - Inga schemaändringar, ingen contract-break.

3. **Spegla fixen i båda kodträden**
   - `server/src/services/catalog/manager.ts`
   - `bjorq_asset_wizard/server/src/services/catalog/manager.ts`

4. **Verifiering efter ändring**
   - Backend CI-step: `bun run typecheck` ska passera.
   - Kontrollera att `/catalog/index` fortfarande bygger index korrekt med malformed `meta.json` utan crash.

## Varför detta löser felet

TS2677 triggas när predicate-typen (`CatalogAssetMeta`) inte kan vara en under-typ av parameter-typen (`Record<string, unknown>`). Genom att använda `unknown` som inputtyp och göra runtime-guards innan fältaccess blir type guarden korrekt och kompatibel med TypeScript-regeln.

## Om något fortfarande failar efter detta

Nästa troliga kandidat är en osynkad mirror-fil eller annan strict typing-regel i samma fil. Då tar vi nästa CI-loggrad och fixar direkt i samma pass.
