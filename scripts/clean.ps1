# Remove build caches and temp artifacts. Safe to run anytime.
# Usage: powershell -File scripts\clean.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$paths = @(
    "target",
    "frontend\src-tauri\target",
    "frontend\.next",
    "frontend\out"
)

foreach ($rel in $paths) {
    $path = Join-Path $root $rel
    if (Test-Path $path) {
        Write-Host "Removing $rel ..."
        Remove-Item -LiteralPath $path -Recurse -Force
    }
}

Write-Host "Done. Rebuild with: cargo build --bin omniparse-server  or  .\scripts\build-desktop.ps1"
