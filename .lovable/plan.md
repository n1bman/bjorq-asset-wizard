

# Backend Infrastructure Scaffolding for Bjorq Asset Wizard

## Context

This is the Bjorq Dashboard (frontend) project. The Asset Wizard backend lives in a separate repository. We'll create production-ready infrastructure files under `docs/bjorq-asset-wizard-infra/` that serve as ready-to-copy scaffolding for the backend repo.

## What Gets Created

### 1. GitHub Actions Workflows

**`ci.yml`** — Install, lint, typecheck, test, build on push/PR to main.
**`docker.yml`** — Build and tag Docker image on release tags.
**`release.yml`** — Scaffold for semantic versioning and changelog generation.

### 2. Docker

**`Dockerfile`** — Multi-stage Node.js 20 Alpine build. Installs sharp native deps. Copies dist, creates storage dirs, exposes port 3500. Uses non-root user.
**`.dockerignore`** — Excludes node_modules, tests, docs, .git.
**`docker-compose.yml`** — Local dev compose with volume mounts for storage/catalog.

### 3. Home Assistant Add-on

**`config.yaml`** — HA add-on manifest (name, version, arch, ports, options, schema).
**`run.sh`** — Entry point script that reads HA options and maps to env vars.
**`DOCS.md`** — Add-on documentation for HA users.
**`icon.png` placeholder note** — Reminder to add add-on icon.

### 4. Repo Infrastructure

**`tsconfig.json`** — Backend-appropriate TypeScript config (ES2022, Node module resolution).
**`.eslintrc.cjs`** — ESLint config for Node/TS backend.
**`.env.example`** — Already exists in docs, will be included in the infra bundle.
**`.gitignore`** — Backend-specific ignores (storage/, dist/, .env).

### 5. Integration Architecture Doc

**`INTEGRATION.md`** — Explains how frontend, backend, Docker, and HA add-on relate. Clearly separates implemented vs scaffolded vs TODO.

## File List

| File | Purpose |
|------|---------|
| `docs/bjorq-asset-wizard-infra/github-actions/ci.yml` | CI pipeline |
| `docs/bjorq-asset-wizard-infra/github-actions/docker.yml` | Docker build workflow |
| `docs/bjorq-asset-wizard-infra/github-actions/release.yml` | Release scaffold |
| `docs/bjorq-asset-wizard-infra/docker/Dockerfile` | Production container |
| `docs/bjorq-asset-wizard-infra/docker/.dockerignore` | Docker build excludes |
| `docs/bjorq-asset-wizard-infra/docker/docker-compose.yml` | Local dev compose |
| `docs/bjorq-asset-wizard-infra/ha-addon/config.yaml` | HA add-on manifest |
| `docs/bjorq-asset-wizard-infra/ha-addon/run.sh` | HA entry point |
| `docs/bjorq-asset-wizard-infra/ha-addon/DOCS.md` | HA add-on docs |
| `docs/bjorq-asset-wizard-infra/repo/tsconfig.json` | Backend TS config |
| `docs/bjorq-asset-wizard-infra/repo/.gitignore` | Backend gitignore |
| `docs/bjorq-asset-wizard-infra/INTEGRATION.md` | Architecture & status doc |
| `docs/bjorq-asset-wizard-infra/README.md` | Index of all infra files |

13 new files. All documentation/scaffolding — no runtime changes.

