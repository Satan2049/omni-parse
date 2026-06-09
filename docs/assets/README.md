# Media assets

Files in this folder are used by the README, GitHub Pages landing, and release notes.

## Current assets

| File | Used for |
|------|----------|
| `omniparse-logo.png` | README header, marketing |
| `logo.png` | Copy of logo for Pages |
| `logo.svg` | Favicon / lightweight vector mark |
| `screenshot-workspace.png` | README — main workspace |
| `screenshot-images.png` | README — Images tab |

## Replace with real captures (recommended)

The workspace and images screenshots are **UI mockups**. For a production release, replace them with real captures:

1. Run `start.bat` or the desktop app
2. Extract a public article URL with images enabled
3. Save PNGs at 1920×1080 (or 16:9) with the same filenames above

### Demo GIF (`demo.gif`)

Record a 10–20 second screen capture showing:

1. Paste a URL
2. Click Extract
3. Switch preview tabs (Content → Images)
4. Download or export

Suggested tools: Windows **Xbox Game Bar** (Win+G), **ScreenToGif**, or **OBS**.

Save as `docs/assets/demo.gif` (keep under ~5 MB for GitHub). Then add to README:

```markdown
![Demo](docs/assets/demo.gif)
```

## VirusTotal

v1.5.0 scans are documented in [docs/TRUST.md](../TRUST.md) and the README. After each new release, re-upload artifacts and update those links.
