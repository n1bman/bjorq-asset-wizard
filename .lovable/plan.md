

# Fix: Dubbla kommatecken i alla tre package.json-filer

Alla tre `package.json`-filer har `"version": "2.0.6",,` (dubbelt komma) som gör att `bun install` och `npm ci` kraschar.

## Ändringar

| Fil | Rad | Fix |
|-----|-----|-----|
| `package.json` | 4 | `"2.0.6",,` → `"2.0.6",` |
| `server/package.json` | 3 | `"2.0.6",,` → `"2.0.6",` |
| `bjorq_asset_wizard/server/package.json` | 3 | `"2.0.6",,` → `"2.0.6",` |

Tre rader, tre filer — inga andra ändringar.

