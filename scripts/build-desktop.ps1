# Build the OmniParse desktop installer (Rust backend embedded in Tauri).
$ErrorActionPreference = "Stop"
$Frontend = Join-Path (Split-Path -Parent $PSScriptRoot) "frontend"

Write-Host ""
Write-Host " ========================================"
Write-Host "  OmniParse - Desktop Build"
Write-Host " ========================================"
Write-Host ""

Push-Location $Frontend
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "[BUILD] Installing frontend dependencies..."
        npm install
    }

    Write-Host "[BUILD] Building Tauri desktop app..."
    npm run tauri:build
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "[DONE] Portable exe: target\release\omniparse.exe"
Write-Host "[DONE] Installers:    target\release\bundle\"
Write-Host ""
