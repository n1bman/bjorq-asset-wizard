

# Fix: Docker Build Failing — `.dockerignore` Blocks Frontend Source

## Root Cause

The `.dockerignore` file excludes `src/`, `public/`, `index.html`, `vite.config.ts`, and all other frontend files (lines 2-11). The multi-stage Dockerfile needs these files in Stage 1 (frontend build), but `.dockerignore` strips them from the build context before any stage runs.

Error: `"/public": not found`

## Fix

**`.dockerignore`** — Remove the frontend source exclusions. The multi-stage build already ensures only compiled output reaches the final image, so excluding source files provides no size benefit and breaks the build.

Remove lines 1-11 (the "Frontend source" block):
```
# Frontend source (not needed in backend container)
src/
public/
index.html
vite.config.ts
postcss.config.js
tailwind.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
components.json
```

Keep all other exclusions (`node_modules/`, `dist/`, `.git/`, etc.) as-is.

## Result

- Docker build context includes frontend source files
- Stage 1 can `COPY` and build the Vite frontend
- Final image size unchanged (multi-stage only copies compiled output)
- `v0.3.0` tag re-push will produce a working Docker image

