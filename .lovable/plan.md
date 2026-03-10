

# Fix: Isolera Docker-cachen mellan workflows

## Rotorsak
`docker.yml` och `ha-addon.yml` triggas båda på `v*`-taggar och använder `cache-from: type=gha` / `cache-to: type=gha,mode=max` utan separata cache-scopes. Docker Buildx GHA-cache kan dela layers mellan workflows, vilket gör att HA-builden får kompilerad TypeScript-output (`dist/`) från en gammal cachad layer istället för att köra `npx tsc` på den nya koden.

## Fix

### 1. `ha-addon.yml` — ta bort cache helt
Cache sparar ~1 min på en build som körs sällan. Korrekthet >> hastighet.

```yaml
# Ta bort dessa rader:
cache-from: type=gha
cache-to: type=gha,mode=max
```

### 2. `docker.yml` — lägg till cache-scope (valfritt, säkerhetsbälte)
```yaml
cache-from: type=gha,scope=standalone
cache-to: type=gha,mode=max,scope=standalone
```

### 3. `bjorq_asset_wizard/config.yaml` — bumpa till `2.0.6`
Eftersom `2.0.5`-imagen på GHCR redan är byggd med den trasiga cachen behöver vi en ny tag som aldrig existerat.

### 4. Version bump till `2.0.6` — alla 10 ytor
Samma lista som förra bumpen: `package.json`, `server/package.json`, `bjorq_asset_wizard/server/package.json`, `bjorq_asset_wizard/config.yaml`, plus VERSION-konstanter i `index.ts`, `health.ts`, `manager.ts` (×2 mirror).

### 5. `CHANGELOG.md` — ny entry
```
## [2.0.6] — 2026-03-10
### Fixed
- Isolate Docker layer cache between HA and standalone workflows to prevent stale builds
```

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `.github/workflows/ha-addon.yml` | Ta bort `cache-from`/`cache-to` |
| `.github/workflows/docker.yml` | Lägg till `scope=standalone` på cache |
| `bjorq_asset_wizard/config.yaml` | version → `2.0.6` |
| `package.json` | version → `2.0.6` |
| `server/package.json` | version → `2.0.6` |
| `bjorq_asset_wizard/server/package.json` | version → `2.0.6` |
| `server/src/index.ts` | VERSION → `2.0.6` |
| `server/src/routes/health.ts` | VERSION → `2.0.6` |
| `server/src/services/catalog/manager.ts` | CATALOG_VERSION → `2.0.6` |
| `bjorq_asset_wizard/server/src/index.ts` | VERSION → `2.0.6` |
| `bjorq_asset_wizard/server/src/routes/health.ts` | VERSION → `2.0.6` |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | CATALOG_VERSION → `2.0.6` |
| `CHANGELOG.md` | Ny 2.0.6-entry |

## Efter deploy
1. Pusha, tagga `v2.0.6`, verifiera att `ha-addon.yml` är grön
2. Uppdatera add-on i HA
3. Loggen ska visa `v2.0.6` — inte `v1.1.10`

