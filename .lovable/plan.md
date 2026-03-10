

# Fix: S6 Overlay V3-krasch — `init: false` saknas

## Rotorsak

HA:s basavbildning `amd64-base:3.19` använder **S6 Overlay V3**. Enligt HA:s officiella dokumentation:

> "Starting in V3 of S6 setting `init` to `false` is required or the addon won't start."

Vår `config.yaml` saknar `init`-nyckeln, vilket ger default `true`. Med `init: true` injicerar HA Docker's `--init` (tini) som PID 1, vilket gör att S6 Overlay inte kan köra som PID 1 → `s6-overlay-suexec: fatal: can only run as pid 1`. Konsekvensen: `run.sh` körs aldrig ordentligt → `mkdir -p` körs aldrig → Node kraschar med `EACCES: permission denied, mkdir '/data/storage'`.

## Åtgärder

### 1. `bjorq_asset_wizard/config.yaml` — lägg till `init: false`
```yaml
init: false
```

### 2. `bjorq_asset_wizard/run.sh` — fix shebang
HA docs rekommenderar `#!/usr/bin/with-contenv bashio` (laddar s6-kontextmiljön korrekt):
```
#!/usr/bin/with-contenv bashio
```

### 3. Version bump → 2.0.7
Alla ytor som tidigare (config.yaml, package.json ×3, VERSION-konstanter ×6, CHANGELOG.md).

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `bjorq_asset_wizard/config.yaml` | Lägg till `init: false`, version → 2.0.7 |
| `bjorq_asset_wizard/run.sh` | Shebang → `#!/usr/bin/with-contenv bashio` |
| `package.json` | version → 2.0.7 |
| `server/package.json` | version → 2.0.7 |
| `bjorq_asset_wizard/server/package.json` | version → 2.0.7 |
| `server/src/index.ts` | VERSION → 2.0.7 |
| `server/src/routes/health.ts` | VERSION → 2.0.7 |
| `server/src/services/catalog/manager.ts` | CATALOG_VERSION → 2.0.7 |
| `bjorq_asset_wizard/server/src/index.ts` | VERSION → 2.0.7 |
| `bjorq_asset_wizard/server/src/routes/health.ts` | VERSION → 2.0.7 |
| `bjorq_asset_wizard/server/src/services/catalog/manager.ts` | CATALOG_VERSION → 2.0.7 |
| `CHANGELOG.md` | Ny 2.0.7-entry |

## Efter deploy
1. Pusha, tagga `v2.0.7`
2. Verifiera att `ha-addon.yml` är grön
3. Installera om add-on i HA
4. Loggen ska visa `v2.0.7` utan EACCES eller s6-fel

