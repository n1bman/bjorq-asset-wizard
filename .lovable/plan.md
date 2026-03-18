

## Problem

`handleInstall` in `EngineStatus.tsx` has no polling loop. The flow is:

1. `await installTrellis()` — backend returns 202 immediately (async install started)
2. `await checkStatus()` — checks once, install hasn't completed yet, still shows "not installed"
3. `finally { setInstalling(false) }` — resets UI back to initial state

The user sees a brief flicker and then nothing changes. The installation IS running on the backend, but the UI never polls to track progress.

## Fix

Add a polling loop after the install POST returns. While the backend reports `installing: true`, keep polling every 2-3 seconds until either `installed: true` or an error occurs.

### Changes to `src/components/generate/EngineStatus.tsx`

Replace `handleInstall` with a version that starts polling:

```typescript
const handleInstall = async () => {
  setInstalling(true);
  setError(null);
  try {
    await installTrellis();
    // Poll status until installation completes or fails
    await pollUntilDone();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Installation failed");
    setInstalling(false);
  }
};

const pollUntilDone = async () => {
  const MAX_POLLS = 120; // ~6 minutes at 3s intervals
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await getTrellisStatus();
    setStatus(s);

    if (s.installed) {
      setInstalling(false);
      if (s.running) onReady?.();
      return;
    }
    if (!s.installing) {
      // Stopped installing but not installed = error
      setInstalling(false);
      setError("Installation stopped unexpectedly");
      return;
    }
  }
  setInstalling(false);
  setError("Installation timed out");
};
```

This ensures the UI:
- Shows the "Installing 3D engine…" state with progress bar updates (the backend already reports `installProgress`)
- Transitions to "Engine ready" when installation completes
- Shows an error if installation fails or times out

### Scope
- **1 file**: `src/components/generate/EngineStatus.tsx`

