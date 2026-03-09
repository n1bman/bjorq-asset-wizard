

# Fix Backend Typecheck Errors in optimizer.ts

Three TypeScript errors in `server/src/services/optimization/optimizer.ts`:

1. **TS2305** (line 11): `textureResize` does not exist in `@gltf-transform/functions`. The correct export is `textureCompress` with a `resize` option.
2. **TS18047** (line 339): `t.width` is possibly `null` — `TextureDetail.width` is `number | null`.
3. **TS18047** (line 339): `t.height` is possibly `null` — same issue.

## Changes

### `server/src/services/optimization/optimizer.ts` (+ mirror)

**Line 11** — Change import:
```typescript
// Before
import { prune, dedup, flatten, textureResize } from "@gltf-transform/functions";

// After
import { prune, dedup, flatten, textureCompress } from "@gltf-transform/functions";
```

**Lines 330-331** — Change usage:
```typescript
// Before
textureResize({ size: [maxSize, maxSize], slots: /baseColor/ })

// After
textureCompress({ resize: [maxSize, maxSize], slots: /baseColor/ })
```

Note: `textureCompress` works without an explicit `encoder` — it uses a built-in fallback for resizing. If `sharp` is available it uses it automatically.

**Line 339** — Add null guards:
```typescript
// Before
(t) => (t.width > maxSize || t.height > maxSize) && t.type === "baseColor"

// After
(t) => ((t.width ?? 0) > maxSize || (t.height ?? 0) > maxSize) && t.type === "baseColor"
```

### Files
| File | Change |
|------|--------|
| `server/src/services/optimization/optimizer.ts` | Fix import, usage, null guards |
| `bjorq_asset_wizard/server/src/services/optimization/optimizer.ts` | Mirror same fixes |

