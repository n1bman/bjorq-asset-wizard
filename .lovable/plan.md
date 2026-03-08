

# Fix Backend Typecheck — `server/src/index.ts`

## Problem

Lines 39, 44, 46 access `.statusCode` and `.message` on the `error` parameter in `setErrorHandler`, which TypeScript treats as `unknown`.

## Fix

Type the `error` parameter in the `setErrorHandler` callback as `FastifyError` (from `fastify`), which includes `.statusCode` and `.message`. This is the correct Fastify type for this callback.

| File | Change |
|------|--------|
| `server/src/index.ts` | Add `FastifyError` import; type `error` parameter as `FastifyError` in `setErrorHandler` |

```ts
import Fastify, { FastifyError } from "fastify";

// line 33:
server.setErrorHandler((error: FastifyError, request, reply) => {
```

Single-line change plus an import update. No structural or behavioral changes.

