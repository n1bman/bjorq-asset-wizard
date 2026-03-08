

# Fix Remaining CI Errors

## 1. Frontend — Remove empty interface in `src/components/ui/command.tsx`

Remove `interface CommandDialogProps extends DialogProps {}` (line 24) and change the `CommandDialog` parameter type from `CommandDialogProps` to `DialogProps` directly.

## 2. Backend — Type-safe catch block in `server/src/index.ts`

Line 109: change `catch (err)` to `catch (err: unknown)` and use a type guard:

```typescript
} catch (err: unknown) {
  if (err instanceof Error) {
    server.log.error(err);
  } else {
    server.log.error(String(err));
  }
  process.exit(1);
}
```

| File | Change |
|------|--------|
| `src/components/ui/command.tsx` | Remove empty `CommandDialogProps` interface, use `DialogProps` directly |
| `server/src/index.ts` | `catch (err)` → `catch (err: unknown)` with type guard |

