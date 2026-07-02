#!/usr/bin/env bash
# Build the OmniParse desktop app (Rust API embedded in Tauri).
# Run from repo root:  ./scripts/build-desktop.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"

echo ""
echo " ========================================"
echo "  OmniParse - Desktop Build"
echo " ========================================"
echo ""

cd "$FRONTEND"

if [ ! -d node_modules ]; then
  echo "[BUILD] Installing frontend dependencies..."
  npm install
fi

echo "[BUILD] Building Tauri desktop app..."
npm run tauri:build

echo ""
echo "[DONE] Binary:     target/release/omniparse (or omniparse.exe on Windows)"
echo "[DONE] Installers: target/release/bundle/"
echo ""
