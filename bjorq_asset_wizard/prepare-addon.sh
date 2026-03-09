#!/bin/bash
# ============================================
# Prepare the add-on directory for HA builder
# ============================================
# The HA add-on builder uses bjorq_asset_wizard/ as Docker context.
# This script copies the server source AND frontend source into
# the add-on directory so the Dockerfile can build both.
#
# Usage (from repo root):
#   ./bjorq_asset_wizard/prepare-addon.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Preparing bjorq_asset_wizard/ for HA add-on build..."

# Clean previous staged files
rm -rf "$SCRIPT_DIR/server"
rm -rf "$SCRIPT_DIR/frontend"

# Stage server source
mkdir -p "$SCRIPT_DIR/server"
cp "$REPO_ROOT/server/package.json" "$SCRIPT_DIR/server/"
[ -f "$REPO_ROOT/server/package-lock.json" ] && cp "$REPO_ROOT/server/package-lock.json" "$SCRIPT_DIR/server/"
cp "$REPO_ROOT/server/tsconfig.json" "$SCRIPT_DIR/server/"
cp -r "$REPO_ROOT/server/src" "$SCRIPT_DIR/server/src"

# Stage frontend source
mkdir -p "$SCRIPT_DIR/frontend"
cp "$REPO_ROOT/package.json" "$SCRIPT_DIR/frontend/"
[ -f "$REPO_ROOT/package-lock.json" ] && cp "$REPO_ROOT/package-lock.json" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/index.html" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/vite.config.ts" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/tsconfig.json" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/tsconfig.app.json" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/tsconfig.node.json" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/tailwind.config.ts" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/postcss.config.js" "$SCRIPT_DIR/frontend/"
cp "$REPO_ROOT/components.json" "$SCRIPT_DIR/frontend/"
cp -r "$REPO_ROOT/src" "$SCRIPT_DIR/frontend/src"
cp -r "$REPO_ROOT/public" "$SCRIPT_DIR/frontend/public"

echo "Done. Staged files in bjorq_asset_wizard/:"
echo "  server/"
echo "    - package.json"
echo "    - tsconfig.json"
echo "    - src/"
echo "  frontend/"
echo "    - package.json, vite.config.ts, etc."
echo "    - src/"
echo "    - public/"
echo ""
echo "You can now build with the HA add-on builder."
