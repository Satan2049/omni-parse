# Generate SHA-256 checksum manifests for OmniParse.
# Run from repo root:  powershell -File scripts\generate-sha256.ps1
# Optional release build:  powershell -File scripts\generate-sha256.ps1 -Release

param(
    [switch]$Release
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Get-AppVersion {
    $cargoToml = Get-Content (Join-Path $root "Cargo.toml") -Raw
    if ($cargoToml -match 'version\s*=\s*"([^"]+)"') {
        return $Matches[1]
    }
    throw "Could not read version from Cargo.toml"
}

$sourceFiles = @(
    "start.bat",
    "scripts\run-backend.bat",
    "scripts\run-frontend.bat",
    "scripts\build-desktop.ps1",
    "scripts\build-desktop.sh",
    "scripts\generate-sha256.ps1",
    "scripts\generate-sha256.sh",
    "scripts\clean.ps1",
    "frontend\.npmrc",
    ".github\workflows\ci.yml",
    ".github\workflows\build-desktop.yml",
    "Cargo.toml",
    "crates\omniparse-core\Cargo.toml",
    "LICENSE"
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
        "# Verify (Linux/macOS): sha256sum <file>",
        ""
    )

    $written = 0
    foreach ($rel in $Files) {
        $path = Join-Path $root ($rel -replace '/', '\')
        if (-not (Test-Path $path)) {
            Write-Warning "Skip missing: $rel"
            continue
        }
        $hash = (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower()
        $lines += "$hash  $($rel -replace '\\', '/')"
        $written++
    }

    if ($written -eq 0) {
        Write-Warning "No files hashed for $OutFile"
        return
    }

    Set-Content -Path $OutFile -Value $lines -Encoding UTF8
    Write-Host "Wrote $OutFile ($written files)"
}

function Get-ReleaseArtifacts {
    $files = @()
    $candidates = @(
        "target\release\omniparse.exe",
        "target\release\omniparse"
    )

    foreach ($rel in $candidates) {
        $path = Join-Path $root $rel
        if (Test-Path $path) {
            $files += ($rel -replace '\\', '/')
        }
    }

    $bundleRoot = Join-Path $root "target\release\bundle"
    if (Test-Path $bundleRoot) {
        Get-ChildItem -Path $bundleRoot -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($root.Length + 1) -replace '\\', '/'
            $files += $relative
        }
    }

    return $files | Select-Object -Unique
}

Write-Manifest -OutFile (Join-Path $root "SHA256.txt") -Files $sourceFiles -Title "OmniParse source SHA-256 checksums"

if ($Release) {
    $version = Get-AppVersion
    $releaseFiles = Get-ReleaseArtifacts
    if ($releaseFiles.Count -eq 0) {
        throw "No release artifacts found under target/release/. Run a desktop build first."
    }
    $releaseOut = Join-Path $root "SHA256-release-v$version.txt"
    Write-Manifest -OutFile $releaseOut -Files $releaseFiles -Title "OmniParse v$version release SHA-256 checksums"
} else {
    Write-Host "Tip: run with -Release after a desktop build to hash installer artifacts."
}
