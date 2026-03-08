

# Add Logging System to Backend Scaffolding

## Overview

Fastify already uses pino internally — no extra dependency needed. We'll configure it properly with structured logging, request tracing, file output, and job-scoped child loggers.

## Changes

### 1. `server/src/lib/logger.ts` (new)

Central logging configuration module:
- Export a `createLoggerConfig()` function that returns Fastify-compatible pino options
- Structured JSON logging in production, pretty-printed in development
- File transport via `LOG_FILE` env var (e.g., `/data/storage/logs/wizard.log`) using pino's built-in file destination
- `createJobLogger(parentLogger, jobId, jobType)` helper that returns a child logger with `jobId` and `jobType` fields bound — ready for use in analyze/optimize/ingest routes
- `generateJobId()` utility (crypto.randomUUID)

### 2. `server/src/index.ts` (modify)

- Import `createLoggerConfig` and pass to Fastify constructor
- Add request duration logging via Fastify's built-in `onResponse` hook (method, url, statusCode, responseTime)
- Add global `setErrorHandler` for unhandled route errors with structured error logging

### 3. Route stubs — `analyze.ts`, `optimize.ts`, `catalog.ts` (modify)

- Add example job logger usage in TODO comments showing how future implementations should use `createJobLogger(request.log, jobId, "analyze")` for traceable pipeline logs

### 4. `server/.env.example` (modify)

Add:
```
# Logging
LOG_LEVEL=info
LOG_FILE=
# Set LOG_FILE to write logs to a file, e.g. ./storage/logs/wizard.log
```

### 5. `docker-compose.yml` (modify)

Add `LOG_FILE` env var and a logs volume mount.

### 6. `ha-addon/run.sh` (modify)

Add `LOG_FILE=/data/storage/logs/wizard.log`, create the logs directory.

### 7. `Dockerfile` (modify)

Add `storage/logs` to the mkdir list.

### 8. `docs/HANDBOOK.md` (modify)

Add a "Logging" section covering:
- Log levels and `LOG_LEVEL` env var
- Structured JSON output format
- File logging via `LOG_FILE`
- Job tracing with `jobId`
- Docker and HA add-on log locations
- How to use `createJobLogger` in route implementations

## Files

| Action | File |
|--------|------|
| Create | `server/src/lib/logger.ts` |
| Modify | `server/src/index.ts` |
| Modify | `server/src/routes/analyze.ts` |
| Modify | `server/src/routes/optimize.ts` |
| Modify | `server/src/routes/catalog.ts` |
| Modify | `server/.env.example` |
| Modify | `docker-compose.yml` |
| Modify | `ha-addon/run.sh` |
| Modify | `Dockerfile` |
| Modify | `docs/HANDBOOK.md` |

No new dependencies — pino is built into Fastify. `pino-pretty` added as dev dependency for human-readable local output.

