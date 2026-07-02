#!/usr/bin/env bash
# Generate SHA-256 checksum manifests for OmniParse.
# Run from repo root:  ./scripts/generate-sha256.sh
# Optional release build:  ./scripts/generate-sha256.sh --release

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE=false

for arg in "$@"; do
  case "$arg" in
    --release|-Release) RELEASE=true ;;
  esac
done

read_version() {
  grep -m1 '^version' "$ROOT/Cargo.toml" | sed -E 's/version = "([^"]+)"/\1/'
}

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    shasum -a 256 "$file" | awk '{print $1}'
  fi
}

write_manifest() {
  local out_file="$1"
  local title="$2"
  shift 2
  local files=("$@")
  local written=0

  {
    echo "# $title"
    echo "# Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
    echo "# Verify (Linux/macOS): sha256sum <file>"
    echo "# Verify (macOS): shasum -a 256 <file>"
    echo ""
  } >"$out_file"

  for rel in "${files[@]}"; do
    local path="$ROOT/$rel"
    if [ ! -f "$path" ]; then
      echo "Skip missing: $rel" >&2
      continue
    fi
    local hash
    hash="$(hash_file "$path")"
    echo "$hash  $rel" >>"$out_file"
    written=$((written + 1))
  done

  if [ "$written" -eq 0 ]; then
    echo "Warning: no files hashed for $out_file" >&2
    return 1
  fi

  echo "Wrote $out_file ($written files)"
}

SOURCE_FILES=(
  "start.bat"
  "scripts/run-backend.bat"
  "scripts/run-frontend.bat"
  "scripts/build-desktop.ps1"
  "scripts/build-desktop.sh"
  "scripts/generate-sha256.ps1"
  "scripts/generate-sha256.sh"
  "scripts/clean.ps1"
  "frontend/.npmrc"
  ".github/workflows/ci.yml"
  ".github/workflows/build-desktop.yml"
  "Cargo.toml"
  "crates/omniparse-core/Cargo.toml"
  "LICENSE"
)

write_manifest "$ROOT/SHA256.txt" "OmniParse source SHA-256 checksums" "${SOURCE_FILES[@]}"

if [ "$RELEASE" = true ]; then
  VERSION="$(read_version)"
  RELEASE_OUT="$ROOT/SHA256-release-v${VERSION}.txt"
  RELEASE_FILES=()

  [ -f "$ROOT/target/release/omniparse.exe" ] && RELEASE_FILES+=("target/release/omniparse.exe")
  [ -f "$ROOT/target/release/omniparse" ] && RELEASE_FILES+=("target/release/omniparse")

  shopt -s nullglob
  for file in "$ROOT"/target/release/bundle/**/*; do
    if [ -f "$file" ]; then
      RELEASE_FILES+=("${file#"$ROOT"/}")
    fi
  done

  if [ "${#RELEASE_FILES[@]}" -eq 0 ]; then
    echo "No release artifacts found under target/release/. Run a desktop build first." >&2
    exit 1
  fi

  write_manifest "$RELEASE_OUT" "OmniParse v${VERSION} release SHA-256 checksums" "${RELEASE_FILES[@]}"
else
  echo "Tip: run with --release after a desktop build to hash installer artifacts."
fi
