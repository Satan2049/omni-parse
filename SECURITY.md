# Security Policy

## Verify downloads

See [docs/TRUST.md](docs/TRUST.md) for SHA-256 checksums ([SHA256.txt](SHA256.txt)) and VirusTotal guidance.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.5.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report them privately by opening a GitHub Security Advisory (if enabled on the repository) or by contacting the maintainers through a private channel listed in the repository profile.

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge reports within 7 days.

## Scope

OmniParse fetches user-supplied URLs server-side. Deployments should:

- Run the API on trusted networks or behind authentication for production use
- Restrict outbound network access if operating in sensitive environments
- Keep dependencies updated via `cargo update` (in `frontend/src-tauri`) and `npm update` (in `frontend`)
