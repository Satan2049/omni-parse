# Generate SHA-256 checksum manifests for OmniParse.
# Run from repo root:  powershell -File scripts\generate-sha256.ps1
# Optional release build:  powershell -File scripts\generate-sha256.ps1 -Release

param(
    [switch]$Release
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$sourceFiles = @(
    "start.bat",
    "scripts\run-backend.bat",
    "scripts\run-frontend.bat",
    "scripts\build-desktop.ps1",
    "scripts\generate-sha256.ps1",
    "Cargo.toml",
    "crates\omniparse-core\Cargo.toml",
    "LICENSE"
)

$releaseFiles = @(
    "target\release\omniparse.exe",
    "target\release\bundle\nsis\OmniParse_1.5.0_x64-setup.exe",
    "target\release\bundle\msi\OmniParse_1.5.0_x64_en-US.msi"
)

function Write-Manifest {
    param(
        [string]$OutFile,
        [string[]]$Files,
        [string]$Title
    )

    $lines = @(
        "# $Title",
        "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')",
        "# Verify (Windows): certutil -hashfile <file> SHA256",
        "# Verify (PowerShell): (Get-FileHash <file> -Algorithm SHA256).Hash.ToLower()",
        ""
    )

    $written = 0
    foreach ($rel in $Files) {
        $path = Join-Path $root $rel
        if (-not (Test-Path $path)) {
            Write-Warning "Skip missing: $rel"
            continue
        }
        $hash = (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower()
        $lines += "$hash  $rel"
        $written++
    }

    if ($written -eq 0) {
        Write-Warning "No files hashed for $OutFile"
        return
    }

    Set-Content -Path $OutFile -Value $lines -Encoding UTF8
    Write-Host "Wrote $OutFile ($written files)"
}

Write-Manifest -OutFile (Join-Path $root "SHA256.txt") -Files $sourceFiles -Title "OmniParse source SHA-256 checksums"

if ($Release) {
    $version = "1.5.0"
    $releaseOut = Join-Path $root "SHA256-release-v$version.txt"
    Write-Manifest -OutFile $releaseOut -Files $releaseFiles -Title "OmniParse v$version release SHA-256 checksums"
} else {
    Write-Host "Tip: run with -Release after 'npm run tauri:build' to hash installer artifacts."
}
