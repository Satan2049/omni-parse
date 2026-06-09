# Trust & Verification

OmniParse is open source. You can audit the code, reproduce builds locally, and verify file integrity before running anything.

## SHA-256 checksums

Two manifests are maintained:

| File | Contents |
|------|----------|
| [`SHA256.txt`](../SHA256.txt) | Source tree — launchers, workspace manifest, scripts |
| [`SHA256-release-v1.5.0.txt`](../SHA256-release-v1.5.0.txt) | Release binaries — `omniparse.exe`, NSIS installer, MSI |

Regenerate after code or build changes:

```powershell
# Source / launcher files
powershell -ExecutionPolicy Bypass -File scripts\generate-sha256.ps1

# After npm run tauri:build — includes installer hashes
powershell -ExecutionPolicy Bypass -File scripts\generate-sha256.ps1 -Release
```

### Verify a file (Windows)

```powershell
certutil -hashfile start.bat SHA256
(Get-FileHash start.bat -Algorithm SHA256).Hash.ToLower()
```

Compare the output to the matching line in `SHA256.txt`.

### Verify a release artifact

```powershell
(Get-FileHash "target\release\omniparse.exe" -Algorithm SHA256).Hash.ToLower()
(Get-FileHash "target\release\bundle\nsis\OmniParse_1.5.0_x64-setup.exe" -Algorithm SHA256).Hash.ToLower()
(Get-FileHash "target\release\bundle\msi\OmniParse_1.5.0_x64_en-US.msi" -Algorithm SHA256).Hash.ToLower()
```

Compare against `SHA256-release-v1.5.0.txt`.

## VirusTotal (v1.5.0)

Community scans for the **v1.5.0** release build:

| Artifact | SHA-256 | Detections | Report |
|----------|---------|------------|--------|
| Portable `omniparse.exe` | `7747f9dfae83b697a8c1a4eab1782fd3f91ee5c7879fd27d89191ae419c9af7c` | 1 / 71 | [View on VirusTotal](https://www.virustotal.com/gui/file/7747f9dfae83b697a8c1a4eab1782fd3f91ee5c7879fd27d89191ae419c9af7c/detection) |
| MSI installer | `4734d63bc79e82e85c618a2ee2a876b5284f60cfc0a559c98d473b88000b676a` | See report | [View on VirusTotal](https://www.virustotal.com/gui/file/4734d63bc79e82e85c618a2ee2a876b5284f60cfc0a559c98d473b88000b676a) |
| NSIS setup | `02d8ced2f0caa4047e88a2a7c132e8abcfeb687789880d1ed120a5df51953359` | 3 / 71 | [View on VirusTotal](https://www.virustotal.com/gui/file/02d8ced2f0caa4047e88a2a7c132e8abcfeb687789880d1ed120a5df51953359) |

> Detection counts change as vendors update signatures. Open each link for the current vendor list.

### About antivirus flags (false positives)

A small number of **heuristic / ML** detections on unsigned desktop software is common — especially for:

- **New, low-prevalence binaries** (few users worldwide have run this exact build yet)
- **No Authenticode code signing** (no publisher identity on the file)
- **Expected behavior** for a web extractor: local HTTP API, outbound URL fetching, headless browser automation

The portable exe was flagged **1/71** (Trapmine: `Malicious.high.ml.score` — an ML score, not a named virus). The NSIS installer may show **more** flags than the raw exe because packers/installers are often abused by malware and trigger broader heuristics.

**What we recommend:**

1. Prefer verifying **SHA-256** against `SHA256-release-v1.5.0.txt` or building from source.
2. Review the [open-source repository](https://github.com/Satan2049/omni-parse) — the app does not phone home or auto-download third-party binaries.
3. If you do not trust the installer, use the **portable exe** or build locally with `scripts\build-desktop.ps1`.
4. Report false positives to the vendor via the “Feedback” link on each [VirusTotal](https://www.virustotal.com) report.

Code signing (Authenticode) is planned to reduce SmartScreen and heuristic noise over time.

## What we do not do

- No telemetry or outbound analytics in the core app
- No auto-download of executables from third-party CDNs — JS rendering uses your locally installed Chrome or Edge via CDP
- SSRF protection blocks requests to private networks by default (see README)

## Report security issues

See [SECURITY.md](../SECURITY.md).
