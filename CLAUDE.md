# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static landing page for **VAULT Indoor Golf Club Köln** — a members-only indoor golf club opening Herbst 2026. The site collects waitlist signups and forwards them to Google Sheets via Google Apps Script.

## Local Development

```bash
# Start local server (required for Google Sheets fetch to work)
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Programming/VAULT
python3 -m http.server 8080
# → http://localhost:8080
```

## Deployment

```bash
git add index.html styles.css script.js   # or: git add -A
git commit -m "Description"
git push
```

Push to `main` triggers automatic GitHub Pages rebuild (~1 min). Live at: `https://nicosugardigital-afk.github.io/VAULT-Golf/`

The remote uses a dedicated deploy key (SSH alias `github-vault`) for account `nicosugardigital-afk`. The key is at `~/.ssh/id_vault_deploy`.

## Architecture

Three files, no build step:

- **`index.html`** — single page with four sections: Hero, Manifest, Pillars (I/II/III), Waitlist form
- **`styles.css`** — all styling including the BorderGlow card effect and animated background stripes
- **`script.js`** — three responsibilities: BorderGlow interaction, scroll reveal, waitlist form → Google Sheets

### Google Sheets Integration

Form submissions are sent via a hidden `<iframe name="vault-sink">` form POST (not `fetch`) to avoid CORS issues with GitHub Pages. The Google Apps Script endpoint is:

```js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
```

Apps Script deployment: account `nico.sugardigital@gmail.com`, Sheet ID `1NaOK7TDs3T0K0EJsvHVS1PMrsMr7V6HjVpAjsA4aZ24`. After any Apps Script code change, a **new version** must be deployed (Bereitstellen → Bereitstellungen verwalten → Neue Version).

### BorderGlow Effect

Vanilla JS port of `@react-bits/BorderGlow`. Applied to the three pillar cards and the waitlist form container. Brand colors are white/silver (`#d8d8d8`, `#f0f0f0`, `#b8b8b8`). Initialized in `script.js` via `initBorderGlow()` on all `.border-glow-card` elements. The effect is **border-only** (no fill) — `::after` fill is intentionally removed.

### Brand / Design Constraints

- **Fonts**: Archivo (display, weights 600–900) + Inter (body) — both from Google Fonts. The Vault Branding PDF confirms Archivo as the official brand font.
- **Colors**: Dark metal palette (`#0a0a0a` base), accent is **white** (not gold — gold was removed). `--gold` and `--gold-bright` CSS variables are now white/near-white.
- **Logos**: White PNG versions from `Vault-Logos/PNG/`. Header uses horizontal wordmark, footer uses icon mark only.
- **Animated stripes**: `.bg-stripes` layer moves right via `transform: translateX` (not `background-position`) — `will-change: transform` is set for GPU acceleration. The element uses `left/right: -12px` to avoid edge gaps during translation.

### Legal Pages

`impressum.html` and `datenschutz.html` share the same header/footer/CSS as `index.html`. Both contain placeholder text in `[brackets]` that must be replaced with real company details before launch.
