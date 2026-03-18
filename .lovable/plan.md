
Goal: remove the actual backend CI blocker shown in GitHub Actions and stop this error loop.

What I found
- The failing step is still `Backend — Lint, Typecheck, Build`, specifically `bun run typecheck`.
- The screenshots show the exact TypeScript errors:
  - `server/src/services/generation/lod-generator.ts(108,16)`
  - `server/src/services/generation/style-normalizer.ts(105,30)`
  - Error: `'tolerance' does not exist in type 'WeldOptions'`
- I verified the code and both files currently call:
  - `weld({ tolerance: 0.001 })` in `lod-generator.ts`
  - `weld({ tolerance: 0.0005 })` in `style-normalizer.ts`
- I also checked `server/src/services/optimization/optimizer.ts`, which already uses the correct pattern: `weld()` with no options.
- This means the current CI failure is not the texture resize issue anymore. The regression is that deprecated `weld` options were reintroduced in the generation pipeline.
- The same bad calls also exist in the mirrored add-on code under `bjorq_asset_wizard/server/src/services/generation/...`.

Implementation plan
1. Fix the backend CI source of truth
- Update `server/src/services/generation/style-normalizer.ts`
  - Replace `weld({ tolerance: 0.0005 })` with `weld()`
- Update `server/src/services/generation/lod-generator.ts`
  - Replace `weld({ tolerance: 0.001 })` with `weld()`

2. Keep add-on parity so other workflows do not fail later
- Apply the same two changes in:
  - `bjorq_asset_wizard/server/src/services/generation/style-normalizer.ts`
  - `bjorq_asset_wizard/server/src/services/generation/lod-generator.ts`

3. Document the fix so the repo history is consistent
- Add a short `Fixed` entry in `CHANGELOG.md` for the next patch version noting:
  - backend CI/typecheck fix
  - removed unsupported `weld()` tolerance options from generation + LOD pipeline
- If versioning has been bumped elsewhere recently, align the changelog note with that active version instead of inventing a conflicting release number.

Why this should fix GitHub Actions
- The failing workflow only typechecks `server/`, and those two exact lines are the ones GitHub is reporting.
- `optimizer.ts` proves the repo already expects `weld()` without options.
- Mirroring the same fix into the add-on prevents the HA/release/add-on workflows from hitting the same regression later.

Technical details
- Current working pattern in repo:
```ts
await doc.transform(weld());
```
- Broken pattern currently causing CI:
```ts
await doc.transform(weld({ tolerance: 0.0005 }));
await doc.transform(weld({ tolerance: 0.001 }));
```
- Expected outcome after implementation:
  - backend lint unchanged
  - backend typecheck passes
  - backend build/test continue
  - add-on codebase remains in sync with main server

Scope of files to change
- `server/src/services/generation/style-normalizer.ts`
- `server/src/services/generation/lod-generator.ts`
- `bjorq_asset_wizard/server/src/services/generation/style-normalizer.ts`
- `bjorq_asset_wizard/server/src/services/generation/lod-generator.ts`
- `CHANGELOG.md`

Notes
- The exact-version pinning for `@gltf-transform` already exists in both `server/package.json` files, so I would not change dependency versions again unless a new CI error appears after this weld fix.
- The GitHub warning about Node 20 deprecation is not the reason the job is failing right now; the hard failure is the TypeScript `weld` error.
