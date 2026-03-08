#!/bin/bash
# ============================================
# Prepare the add-on directory for HA builder
# ============================================
# The HA add-on builder uses the add-on directory as Docker context.
# This script copies server source into the add-on directory so the
# Dockerfile can access it during build.
#
# Usage (from repo root):
#   ./bjorq_asset_wizard/prepare-addon.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Preparing bjorq_asset_wizard/ for HA add-on build..."

# Copy server source into add-on directory
rm -rf "$SCRIPT_DIR/server"
cp -r "$REPO_ROOT/server" "$SCRIPT_DIR/server"

echo "Done. Server source copied to bjorq_asset_wizard/server/"
echo "You can now build with the HA add-on builder."
