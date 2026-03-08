

# Fix Backend PostCSS Leak in Vitest

## Problem
Vitest uses Vite internally, and Vite auto-discovers `postcss.config.js` by walking up directories. Even though `server/vitest.config.ts` exists, Vite still finds the root `postcss.config.js` which references `tailwindcss` — not installed in `server/node_modules`.

## Fix
Add `css.postcss` override in `server/vitest.config.ts` to prevent Vite from loading the root PostCSS config:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  css: {
    postcss: {},          // empty object = no plugins, stops upward discovery
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
```

Also update `server/package.json` test script to explicitly reference the local config:
```
"test": "vitest run --config vitest.config.ts"
```

## Summary

| Question | Answer |
|----------|--------|
| `server/vitest.config.ts` exists and is backend-only? | Yes — updated with `css.postcss: {}` to block root discovery |
| `server/package.json` test script uses local config? | Yes — explicit `--config vitest.config.ts` |
| Backend tests isolated from frontend PostCSS/Tailwind? | Yes — empty postcss override prevents upward config resolution |
| Fixes CI failure? | Yes — Vite no longer tries to load tailwindcss |

