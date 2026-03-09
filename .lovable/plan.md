

# Fix: TypeScript Build Error — Missing `stage` in Error Response Types

## Problem

The Docker build fails because `OptimizeErrorResponse` (and the analyze equivalent) don't include the `stage` property that was added to error responses in Phase 4.

```
TS2353: Object literal may only specify known properties, and 'stage' does not exist in type 'OptimizeErrorResponse'.
```

## Fix

Add `stage?` to the error response types in both server directories:

**`server/src/types/optimize.ts`** and **`bjorq_asset_wizard/server/src/types/optimize.ts`** (line 110-113):
```typescript
export interface OptimizeErrorResponse {
  success: false;
  error: string;
  stage?: string;
}
```

**`server/src/types/analyze.ts`** and **`bjorq_asset_wizard/server/src/types/analyze.ts`** — if there's a similar error response type, add `stage?` there too. If not, check the analyze route for inline typing.

4 files changed, 1 line added per file. No logic changes.

