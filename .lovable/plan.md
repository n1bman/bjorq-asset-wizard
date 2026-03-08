

# Fix CI Failures — Two Root Causes

## Problem Analysis

From the screenshots:

1. **Backend job** fails at `bun run lint` with `ERR_MODULE_NOT_FOUND: Cannot find package '@eslint/js'`. The server directory has no `eslint.config.js`, so ESLint 9 walks up to the root config, which imports `@eslint/js`, `globals`, `typescript-eslint`, `eslint-plugin-react-hooks`, etc. — none of which are installed in `server/node_modules`.

2. **Frontend job** likely fails because `eslint .` at root scans `server/` source files too, applying React-specific rules to non-React backend code.

## Changes

### 1. Root `eslint.config.js` — add `server` to ignores

Add `"server"` to the ignores array so the frontend lint pass does not scan backend files.

### 2. Create `server/eslint.config.js` — minimal TS config

A simple ESLint flat config for the backend using only `typescript-eslint` (no React plugins). This requires `@eslint/js`, `typescript-eslint`, and `globals` as devDependencies.

### 3. `server/package.json` — add missing ESLint dependencies

Add to devDependencies:
- `@eslint/js: "^9.32.0"`
- `typescript-eslint: "^8.38.0"`
- `globals: "^15.15.0"`

### 4. `bun.lock` / `bun.lockb` update

After adding server deps, the lockfile needs regenerating. The CI uses `--frozen-lockfile`, so the lock must be committed.

| File | Change |
|------|--------|
| `eslint.config.js` | Add `"server"` to ignores |
| `server/eslint.config.js` | New file — minimal TS eslint config (no React) |
| `server/package.json` | Add `@eslint/js`, `typescript-eslint`, `globals` to devDeps |

