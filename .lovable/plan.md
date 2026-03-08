
Mål: få HA att visa rätt version och säkerställa att add-on faktiskt kan byggas/startas från GitHub-repot.

1) Rotorsak (bekräftad i koden)
- Det finns två add-on-manifest med samma slug `bjorq_asset_wizard`:
  - `bjorq_asset_wizard/config.yaml` (v0.1.3)
  - `ha-addon/config.yaml` (v0.1.0)
- HA plockar den gamla (`ha-addon`) och därför ser du 0.1.0.
- Dessutom är `bjorq_asset_wizard/server/` git-ignored, vilket gör att HA-bygget från GitHub saknar backend-koden.

2) Plan för att lösa allt (utan arkitekturändring)
- Behåll endast en aktiv add-on i repot: `bjorq_asset_wizard/`.
- Avaktivera legacy add-on-mappen så HA inte kan indexera den:
  - ta bort `ha-addon/config.yaml` (eller byt namn så den inte heter `config.yaml`)
  - uppdatera README/HANDBOOK så inga instruktioner pekar på `ha-addon/` som aktiv add-on.
- Gör add-on self-contained i Git:
  - ta bort `server/` från `bjorq_asset_wizard/.gitignore`
  - stagea backend-filer in i `bjorq_asset_wizard/server/` via `prepare-addon.sh`
  - committa staged filer så HA kan bygga direkt från repo
- Gör build robust:
  - uppdatera Dockerfile-installsteg så det fungerar både med/utan `server/package-lock.json` (eller lägg till lockfile)
  - behåll run-flödet med `exec node /app/dist/index.js` och port 3000 (ingress).
- Version bump:
  - bump `bjorq_asset_wizard/config.yaml` till nästa version (t.ex. 0.1.4) så HA säkert upptäcker ändring.
- Dokumentation:
  - tydlig “source of truth”: endast `bjorq_asset_wizard/` är giltig add-on
  - exakt prepare/build-testflöde och vilka filer som stageas.

3) Konkreta filer att ändra
- `ha-addon/config.yaml` (neutralisera/ta bort från HA-indexering)
- `bjorq_asset_wizard/.gitignore` (sluta ignorera `server/`)
- `bjorq_asset_wizard/prepare-addon.sh` (behåll/säkra staging)
- `bjorq_asset_wizard/Dockerfile` (dependency install fallback + befintlig build)
- `bjorq_asset_wizard/config.yaml` (version bump)
- `README.md`, `docs/HANDBOOK.md`, ev. `ha-addon/DOCS.md` (markera legacy tydligt)

4) Verifiering efter implementation
- I repo: endast en aktiv `config.yaml` för slug `bjorq_asset_wizard`.
- `bjorq_asset_wizard/server/` finns i Git med:
  - `package.json`
  - `tsconfig.json`
  - `src/`
  - ev. `package-lock.json` om vi väljer lockfile-spår.
- Lokal test:
  - `./bjorq_asset_wizard/prepare-addon.sh`
  - `cd bjorq_asset_wizard && docker build ...` ska gå igenom
- HA:
  - ta bort och lägg till repot igen (för att slå ut cache)
  - kontrollera att kortet visar nya versionen (inte 0.1.0)
  - install/start via ingress.

5) Förväntat resultat
- Versionen i HA slutar fastna på 0.1.0.
- Add-on är self-contained i `bjorq_asset_wizard/`.
- HA ska kunna både bygga och starta add-on korrekt från GitHub-repot.
