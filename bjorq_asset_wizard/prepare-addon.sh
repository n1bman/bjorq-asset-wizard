#!/bin/bash
# ============================================
# Prepare the add-on directory for HA builder
# ============================================
# The HA add-on builder uses bjorq_asset_wizard/ as Docker context.
# This script copies the server source into the add-on directory
# so the Dockerfile can build it without needing repo root files.
#
# Usage (from repo root):
#   ./bjorq_asset_wizard/prepare-addon.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Preparing bjorq_asset_wizard/ for HA add-on build..."

# Clean previous staged files
rm -rf "$SCRIPT_DIR/server"

# Stage server source
mkdir -p "$SCRIPT_DIR/server"
cp "$REPO_ROOT/server/package.json" "$SCRIPT_DIR/server/"
[ -f "$REPO_ROOT/server/package-lock.json" ] && cp "$REPO_ROOT/server/package-lock.json" "$SCRIPT_DIR/server/"
cp "$REPO_ROOT/server/tsconfig.json" "$SCRIPT_DIR/server/"
cp -r "$REPO_ROOT/server/src" "$SCRIPT_DIR/server/src"

echo "Done. Staged files in bjorq_asset_wizard/server/:"
echo "  - package.json"
echo "  - tsconfig.json"
echo "  - src/"
echo ""
echo "You can now build with the HA add-on builder."
