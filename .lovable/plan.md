

# Fix: `__dirname` Not Defined in ES Module

## Problem

`package.json` has `"type": "module"`, so Node treats `.js` files as ESM. `__dirname` is only available in CommonJS. The server crashes on startup.

## Fix

Add the ESM-compatible `__dirname` shim to both `server/src/index.ts` and `bjorq_asset_wizard/server/src/index.ts`:

```typescript
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

Place this before the `PUBLIC_PATH` line. The existing `resolve`/`join` imports from `node:path` stay, just add `dirname` to that import. Add the new `fileURLToPath` import from `node:url`.

No other files affected — this is the only place `__dirname` is used.

