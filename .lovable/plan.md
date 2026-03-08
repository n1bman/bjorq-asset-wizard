

# Fix CI Workflow — npm Cache Path Error

## Problem

The GitHub Actions CI fails at "Setup Node.js 20" in the backend job with:
> Error: Some specified paths were not resolved, unable to cache dependencies.

This happens because `cache-dependency-path: server/package-lock.json` references a file that doesn't exist in the repo. The server directory only has a `package.json` — no lockfile has been committed.

## Fix

**`.github/workflows/ci.yml`** — Remove the `cache` and `cache-dependency-path` options from the backend job's `setup-node` step. Without a committed lockfile, npm caching can't work. Once a `server/package-lock.json` is committed to the repo, caching can be re-enabled.

Also applies to the frontend job if `package-lock.json` isn't committed there either (though `bun.lock` / `bun.lockb` exist, npm cache expects `package-lock.json`).

### Changes

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Remove `cache` and `cache-dependency-path` from backend job's setup-node step. Remove `cache: npm` from frontend job if no `package-lock.json` exists at root. |

Single file, two small edits.

