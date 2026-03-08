

# Fix Corrupted Lines in `server/src/index.ts`

Two lines remain corrupted from prior edits:

**Line 11** — imports for Fastify and cors are merged into one garbled line:
```
import Fastify, { FastifyError }mport cors from "@fastify/cors";
```
Fix: split into two proper import statements.

**Line 32** — `setErrorHandler` method name is garbled with type fragments:
```
server.setE: FastifyErrorrrorrrorHandler((error: FastifyEly) => {
```
Fix: restore to `server.setErrorHandler((error: FastifyError, request, reply) => {`

## Changes (single file: `server/src/index.ts`)

| Line | Current (corrupted) | Fixed |
|------|---|---|
| 11 | `import Fastify, { FastifyError }mport cors from "@fastify/cors";` | Two lines: `import Fastify, { FastifyError } from "fastify";` and `import cors from "@fastify/cors";` |
| 32 | `server.setE: FastifyErrorrrorrrorHandler((error: FastifyEly) => {` | `server.setErrorHandler((error: FastifyError, request, reply) => {` |

No behavioral changes. The rest of the file (lines 12–31, 33–118) stays exactly as-is.

