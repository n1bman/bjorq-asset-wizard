

# Fix: Version Detection & Port Conflict

## Problem 1: Version stuck at 0.1.0
The code shows 0.1.2 but HA displays 0.1.0. Most likely the changes haven't been pushed to GitHub. No code change needed — just push.

## Problem 2: Potential port conflict
Two add-ons cannot share the same host port. Since ingress is enabled, we don't need to expose a host port at all.

## Changes

### `bjorq_asset_wizard/config.yaml`
- Remove host port mapping (set to `null`) so HA doesn't try to bind a host port
- Keep internal `ingress_port: 3000` — HA handles proxying

```yaml
# Change from:
ports:
  3000/tcp: 3000

# Change to:
ports:
  3000/tcp: null
```

This means the add-on is only accessible via HA ingress (sidebar panel), not via a direct port — which is the recommended approach for HA add-ons.

### Version bump to `0.1.3`
So the next push is clearly distinguishable from what's currently installed.

