

# Fix Backend Test Configuration

## Problem
`server/` has no `vitest.config.ts`. When `vitest run` executes inside `server/`, it walks up the directory tree and finds the root `vitest.config.ts`, which references `@vitejs/plugin-react-swc` and jsdom — packages not installed in the server workspace. This causes the "Cannot find package 'vitest'" error in CI.

## Changes

### 1. Create `server/vitest.config.ts`
A minimal Node-oriented Vitest config:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
```

No other files need to change — `server/package.json` already has `vitest` in devDependencies and the test script is `vitest run`, which will now pick up the local config.

## Summary
| Question | Answer |
|----------|--------|
| `server/` gets its own Vitest config? | Yes — new `server/vitest.config.ts` |
| `server/package.json` test script updated? | No change needed — `vitest run` already correct |
| Backend tests isolated from frontend? | Yes — local config stops upward resolution |
| Fixes CI failure? | Yes — vitest resolves from local `node_modules` using local config |

