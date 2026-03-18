

## Version Bump till 2.3.2

Changelog listar redan 2.3.2 med alla CI-fixar, men versionsnumren i `package.json` och `config.yaml` hänger kvar på äldre värden. Vi behöver bumpa alla versionssurfacer till **2.3.2** så att en ny push triggar CI med rätt tagg.

### Filer att uppdatera

| Fil | Nuvarande | Ny |
|-----|-----------|-----|
| `server/package.json` | 2.2.0 | 2.3.2 |
| `bjorq_asset_wizard/server/package.json` | 2.2.0 | 2.3.2 |
| `bjorq_asset_wizard/config.yaml` | 2.3.1 | 2.3.2 |

### Vad som händer efter push

Lovable pushar ändringarna till GitHub automatiskt. CI-workflowen (`ci.yml`) triggas på push och kör backend typecheck med de fixade filerna. Docker/release-workflows triggas bara på `v*`-taggar, så de körs inte förrän du manuellt skapar en release via workflow_dispatch.

