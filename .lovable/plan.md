

# Fix CI Workflows for Bun

## Problem
CI uses `npm ci` / `npm run` commands but the project uses Bun (evidenced by `bun.lock` / `bun.lockb` files). No `package-lock.json` exists, so `npm ci` fails.

## Changes

### `.github/workflows/ci.yml`

**Frontend job:**
- Remove Node.js matrix strategy (Bun bundles its own runtime)
- Replace `actions/setup-node` with `oven-sh/setup-bun@v2`
- Replace `npm ci` → `bun install --frozen-lockfile`
- Replace `npm run lint/build/test` → `bun run lint/build/test`

**Backend job:**
- Same Bun setup
- Keep `working-directory: server`
- Replace all npm commands with bun equivalents

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  frontend:
    name: Frontend — Lint, Build, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run build
      - run: bun run test

  backend:
    name: Backend — Lint, Typecheck, Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run build
      - run: bun run test
```

### `Dockerfile` — no changes needed
The Dockerfile targets production deployment with Node.js Alpine, which is correct for running the built server. Docker builds don't go through CI.

### `.github/workflows/docker.yml` and `release.yml` — no changes needed
Docker workflow uses Docker Buildx (no npm/bun). Release workflow only creates git tags.

