

# Fix Sharp Build Failure in Dockerfile

## Problem

`npm install --ignore-scripts` skips sharp's postinstall script (which downloads prebuilt native binaries). Then `npm rebuild sharp` tries to compile from source via node-gyp but fails because `node-addon-api` isn't in the dependency tree.

## Fix

**Builder stage**: Remove `--ignore-scripts` from `npm install` and drop the separate `npm rebuild sharp` line. This lets sharp's postinstall download prebuilt binaries for the target platform (Alpine/musl). The `vips-dev` package is already installed as a fallback.

**Production stage**: Same — remove `--ignore-scripts` from the production install so sharp's prebuilt binaries are downloaded directly, eliminating the need to copy sharp from the builder stage.

### `Dockerfile` changes

**Lines 19-21** (builder):
```dockerfile
COPY server/package.json ./
RUN npm install
```
Remove the separate `npm rebuild sharp` line entirely.

**Lines 41-45** (production):
```dockerfile
COPY server/package.json ./
RUN npm install --omit=dev
```
Remove the `COPY --from=builder /app/node_modules/sharp` line — no longer needed since production stage installs sharp with its own prebuilt binaries.

4 lines changed, 2 lines removed. No other changes.

