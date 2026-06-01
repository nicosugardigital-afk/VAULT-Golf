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
git push origin main
```

Push to `main` triggers automatic GitHub Pages rebuild (~1 min). Live at `https://nicosugardigital-afk.github.io/VAULT-Golf/` (custom domain: vault-golf.de).

The remote uses a dedicated deploy key (SSH alias `github-vault`) for account `nicosugardigital-afk`. The key is at `~/.ssh/id_vault_deploy`. The git remote is named `origin` (points to `git@github-vault:nicosugardigital-afk/VAULT-Golf.git`).

**ffmpeg** is installed at `~/homebrew/bin/ffmpeg` (user Homebrew, no sudo required).

## Architecture

No build step. Core files:

- **`index.html`** — single page: Hero, Manifest, Pillars (I/II/III), Waitlist form
- **`styles.css`** — all styling
- **`script.js`** — BorderGlow interaction, scroll reveal, waitlist form → Google Sheets

Decorator scripts (each has a paired `.css` file):

- **`split-text.js`** — animates hero title characters in on scroll
- **`circular-text.js`** — spinning "VAULT·INDOOR·GOLF·MEMBERS·ONLY·CLUB·" badge bottom-right
- **`glare-hover.js`** — glare sweep on hover for pillar cards

### Background Layer Stack

`.bg-layer` is `position: fixed; inset: 0; z-index: 0; overflow: hidden`. Children render bottom-to-top in DOM order:

1. `<video class="bg-video">` — looping B&W golf footage (`media/bg-720.webm` / `media/bg-720.mp4`), `position: fixed; width: 100vw; height: 100vh; object-fit: cover; filter: grayscale(100%)`
2. `.bg-metal` — semi-transparent radial gradient (dark metal look); kept semi-transparent so video shows through
3. `.bg-stripes` — animated horizontal brushed-metal lines, masked to top 42% only
4. `.bg-metal-overlay` — top/bottom edge lighting
5. `.bg-vignette` — radial dark vignette

### Video Assets

Optimised outputs tracked in git under `media/`:

| File | Size | Use |
|---|---|---|
| `media/bg-720.webm` | 3.0 MB | VP9, primary source |
| `media/bg-720.mp4` | 3.2 MB | H.264, fallback |
| `media/bg-1080.mp4` | 6.5 MB | H.264 hi-res (not used by default) |
| `media/poster.jpg` | 78 KB | First-frame poster + prefers-reduced-motion fallback |

Raw source clips are in `media-source/` (gitignored). Concat order: `hf_20260528_175519...` → `hf_20260528_180310...` → `hf_20260528_180736...` (chronological by filename timestamp).

### Google Sheets Integration

Form submissions use a hidden `<iframe name="vault-sink">` form POST (not `fetch`) to avoid CORS issues. The Apps Script endpoint URL is in `script.js` as `GOOGLE_SCRIPT_URL`. Account: `nico.sugardigital@gmail.com`, Sheet ID `1NaOK7TDs3T0K0EJsvHVS1PMrsMr7V6HjVpAjsA4aZ24`. After any Apps Script code change, deploy a **new version** (Bereitstellen → Bereitstellungen verwalten → Neue Version).

### BorderGlow Effect

Vanilla JS port of `@react-bits/BorderGlow`. Applied to `.border-glow-card` elements (pillar cards + waitlist form). Effect is **border-only** — `::after` fill is intentionally absent. Brand colors: white/silver (`#d8d8d8`, `#f0f0f0`, `#b8b8b8`).

### Brand / Design Constraints

- **Fonts**: Archivo (display, weights 600–900) + Inter (body) from Google Fonts
- **Colors**: Dark metal palette (`#0a0a0a` base), accent is **white** (not gold). `--gold`/`--gold-bright` CSS variables are white/near-white.
- **Logos**: White PNGs from `Vault-Logos/PNG/`. Header: horizontal wordmark. Footer: icon mark only.
- **Animated stripes**: `.bg-stripes` moves via `transform: translateX` (not `background-position`), `left/right: -12px` to avoid edge gaps.
- **Hero title centering**: `letter-spacing: -0.02em` shifts text visually right; compensated with `padding-right: 0.02em` on `.title-row`. `.title-row` also has `white-space: nowrap`.
- **SplitText chars**: `.st-char` must be `display: inline` (not `inline-block`) — `inline-block` creates gaps between letter spans due to letter-spacing.

### Legal Pages

`impressum.html` and `datenschutz.html` share the same header/footer/CSS as `index.html`. Both contain placeholder text in `[brackets]` that must be replaced with real company details before launch.
