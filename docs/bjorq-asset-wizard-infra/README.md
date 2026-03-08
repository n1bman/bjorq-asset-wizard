# Bjorq Asset Wizard — Infrastructure Scaffolding

Ready-to-copy infrastructure files for the backend repository.

> **These files live in the dashboard repo as reference scaffolding.**
> Copy them into the backend repo when setting it up.

## File Index

| Path | Purpose | Copy to |
|------|---------|---------|
| `github-actions/ci.yml` | CI: install, lint, typecheck, test, build | `.github/workflows/ci.yml` |
| `github-actions/docker.yml` | Docker image build on release tags | `.github/workflows/docker.yml` |
| `github-actions/release.yml` | Semantic release scaffold | `.github/workflows/release.yml` |
| `docker/Dockerfile` | Production multi-stage container | `Dockerfile` |
| `docker/.dockerignore` | Docker build excludes | `.dockerignore` |
| `docker/docker-compose.yml` | Local dev compose | `docker-compose.yml` |
| `ha-addon/config.yaml` | Home Assistant add-on manifest | `config.yaml` |
| `ha-addon/run.sh` | HA entry point script | `run.sh` |
| `ha-addon/DOCS.md` | HA add-on user documentation | `DOCS.md` |
| `repo/tsconfig.json` | Backend TypeScript config | `tsconfig.json` |
| `repo/.gitignore` | Backend-specific ignores | `.gitignore` |
| `INTEGRATION.md` | Architecture & status overview | `docs/INTEGRATION.md` |

## Status Legend

- ✅ **Implemented** — Working code exists
- 🔧 **Scaffolded** — Config/infra ready, needs backend code
- ⬜ **TODO** — Not yet started

See [INTEGRATION.md](./INTEGRATION.md) for full status breakdown.
