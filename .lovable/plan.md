

## Problem

Loggen visar tydligt:

```
spawn git ENOENT
```

`git` finns inte installerat i Docker-imagen. TRELLIS-installationen försöker klona repot med `git clone`, men Alpine-basen har bara `nodejs` och `npm`.

Dessutom saknas `python3` som behövs för venv-skapande, pip-installation och GPU-detektering.

## Fix

### 1. Lägg till `git` och `python3` i Dockerfile

I `bjorq_asset_wizard/Dockerfile`, rad 5:

```dockerfile
# Nuvarande:
RUN apk add --no-cache nodejs npm

# Nytt:
RUN apk add --no-cache nodejs npm git python3 py3-pip
```

### 2. Version bump till 2.3.4

Bumpa version i alla fem ställen (`server/package.json`, `server/src/index.ts`, `bjorq_asset_wizard/config.yaml`, `bjorq_asset_wizard/server/package.json`, `bjorq_asset_wizard/server/src/index.ts`) till **2.3.4**.

### Scope
- `bjorq_asset_wizard/Dockerfile` — lägg till `git python3 py3-pip`
- 5 filer — version bump till 2.3.4

