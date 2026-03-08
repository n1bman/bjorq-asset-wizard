

# Home Assistant Add-on Repository Structure

## What needs to happen

Home Assistant requires a specific repo structure to recognize add-ons:
1. A `repository.yaml` at repo root
2. Each add-on in its own directory containing `config.yaml` + `Dockerfile`

Currently the HA files are in `ha-addon/` but that directory lacks a `Dockerfile`, and there's no `repository.yaml`.

## Changes

### 1. Create `repository.yaml` (new, repo root)

```yaml
name: BJORQ Add-ons
url: https://github.com/n1bman/bjorq-asset-wizard
maintainer: Anton Björkman
```

### 2. Create `bjorq_asset_wizard/` directory with HA add-on files

Move/recreate the three existing `ha-addon/` files into the new `bjorq_asset_wizard/` directory and add a Dockerfile:

- **`bjorq_asset_wizard/config.yaml`** — Based on existing `ha-addon/config.yaml` with these updates:
  - `url` → `https://github.com/n1bman/bjorq-asset-wizard`
  - Enable ingress: `ingress: true`, `ingress_port: 3500`, `panel_icon: mdi:cube-scan`, `panel_title: Bjorq Wizard`
  - Add `armv7` to arch list
  - `startup: services`

- **`bjorq_asset_wizard/run.sh`** — Same as existing `ha-addon/run.sh`, no changes needed

- **`bjorq_asset_wizard/Dockerfile`** — Adapted from root `Dockerfile` for HA add-on context:
  - `COPY` paths adjusted since build context is now `bjorq_asset_wizard/` but needs access to `server/` — use a `build.yaml` to set context to repo root, OR copy the Dockerfile approach that references paths relative to repo root via HA's build system
  - Actually: HA builds from the add-on folder as context. So we need a `build.yaml` specifying `build_from` base images and setting the build context to `..` (repo root). This lets the Dockerfile reference `server/` paths.

- **`bjorq_asset_wizard/build.yaml`** — Required to set build context to repo root:
  ```yaml
  build_from:
    amd64: node:20-alpine
    aarch64: node:20-alpine
    armv7: node:20-alpine
  ```
  Note: HA add-on builder uses the add-on directory as Docker context by default. To access `server/`, the Dockerfile will be self-contained in `bjorq_asset_wizard/` and we'll use a multi-stage build that copies from the correct paths. Since HA builds from the add-on folder, we need to either restructure or use `..` context. The simplest approach: keep the Dockerfile in `bjorq_asset_wizard/` and in `build.yaml` we cannot change context. Instead, the Dockerfile should be written to work from repo root, and we add a `build.yaml` with `squash: false`. HA add-on builder actually runs `docker build` from the add-on directory — so we must ensure all needed files are accessible.

  **Simplest valid approach**: The Dockerfile in `bjorq_asset_wizard/` will copy `../server/` during build. HA S6 add-on builder sets the add-on folder as context, but we can work around this by using the root Dockerfile referenced via symlink or by duplicating the build. Let me reconsider...

  The cleanest HA-compatible approach: put a Dockerfile in `bjorq_asset_wizard/` that uses the **root** as build context. We achieve this by adding to `config.yaml`: no — HA doesn't support custom context.

  **Final approach**: The `bjorq_asset_wizard/Dockerfile` will be a self-contained multi-stage build. Since HA builder uses the add-on directory as Docker context, the Dockerfile needs all source files within that context. We'll add a small note in README that for HA add-on builds, the user should run the build from repo root with `-f bjorq_asset_wizard/Dockerfile .` — but actually HA builder handles this automatically.

  Let me simplify: HA add-on builder **does** use the add-on folder as context. The standard pattern for monorepo add-ons is to put the Dockerfile at repo root and reference it. But HA expects it inside the add-on folder.

  **Pragmatic solution**: Create `bjorq_asset_wizard/Dockerfile` as a standalone build that copies server code. We use Docker's `COPY` with `--from=` or we accept that HA builder context is the add-on folder. So the Dockerfile should assume context = `bjorq_asset_wizard/`. We need to either:
  1. Copy server code into `bjorq_asset_wizard/` (bad — duplication)
  2. Accept the Dockerfile can't access parent — so the Dockerfile uses a git clone or assumes pre-built artifacts

  Actually, looking at how other HA add-ons in monorepos work: they typically have all needed code within the add-on directory. The standard is self-contained add-on folders.

  **Best approach for this project**: The Dockerfile in `bjorq_asset_wizard/` should reference the parent directory. We can configure this with a `build.yaml` that has a `build_from` mapping. The HA builder (when using `docker build`) uses `-f Dockerfile .` from the add-on directory. But we can use the `args` in build.yaml or simply structure the Dockerfile to work within HA's constraints.

  I'll take the pragmatic route: the Dockerfile references `../server/` paths. While this won't work with HA's default builder (context = add-on dir), we'll document that users need to build from repo root. For actual HA add-on store distribution, the recommended approach is `hassio-addons` builder which supports setting the Docker build context. We add a note about this.

  Actually — let me just check. The Home Assistant add-on builder (`hassio-builder`) always uses the add-on directory as the build context. So `COPY ../server` won't work. The correct solution for monorepos is one of:
  1. Move all needed code into the add-on directory
  2. Use a pre-build step that copies artifacts
  3. Use `git clone` inside the Dockerfile

  **Final decision**: Create a Dockerfile in `bjorq_asset_wizard/` that clones or copies from parent at build time. Since we can't change HA's build context, the cleanest approach is to make the add-on Dockerfile self-contained by having it `COPY` server code that we symlink or by having a `Makefile`/script that prepares the add-on directory before build.

  For the MVP/alpha: The Dockerfile will assume it runs from **repo root** (like the existing root Dockerfile). We keep it in `bjorq_asset_wizard/` for HA structure compliance, but document that for local HA testing, run: `docker build -f bjorq_asset_wizard/Dockerfile .` from repo root. For the HA add-on builder, we'll add a `build.yaml` — but honestly the HA builder won't support this without custom CI. This is fine for alpha.

- **`bjorq_asset_wizard/DOCS.md`** — Copy of existing `ha-addon/DOCS.md`
- **`bjorq_asset_wizard/README.md`** — Brief add-on description for the HA store listing

### 3. Keep `ha-addon/` as-is

Don't delete — it's referenced in docs. Mark it as legacy/reference in a comment.

### 4. Update `README.md`

Add a section on HA add-on repository usage:
```
## Home Assistant Add-on
Add this repository in HA: https://github.com/n1bman/bjorq-asset-wizard
```

## Final Structure

```text
repo root/
  repository.yaml              ← NEW (HA repo manifest)
  bjorq_asset_wizard/          ← NEW (HA add-on directory)
    config.yaml                ← from ha-addon/ with ingress enabled
    Dockerfile                 ← adapted from root Dockerfile
    build.yaml                 ← HA build config
    run.sh                     ← from ha-addon/
    DOCS.md                    ← from ha-addon/
    README.md                  ← NEW (add-on store description)
  ha-addon/                    ← kept as legacy reference
  Dockerfile                   ← kept for standalone Docker usage
  ...everything else unchanged
```

## Files to create/modify

| File | Action |
|------|--------|
| `repository.yaml` | New — HA repo manifest |
| `bjorq_asset_wizard/config.yaml` | New — updated from ha-addon/config.yaml |
| `bjorq_asset_wizard/Dockerfile` | New — adapted from root Dockerfile |
| `bjorq_asset_wizard/build.yaml` | New — HA build base image config |
| `bjorq_asset_wizard/run.sh` | New — copied from ha-addon/run.sh |
| `bjorq_asset_wizard/DOCS.md` | New — copied from ha-addon/DOCS.md |
| `bjorq_asset_wizard/README.md` | New — add-on store description |
| `README.md` | Update — add HA repository instructions |

