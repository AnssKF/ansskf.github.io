# GitHub Copilot / AI Agent Instructions

## Project Overview
Personal portfolio static site for **Anss Khaled** — published at `anssk.me` (repo `ansskf.github.io`) via GitHub Pages.  
**No build step. No package manager. No framework CLI.** Deploy = push to `main`.

**File map:**
| File | Role |
|---|---|
| `index.html` | Single long-scroll page; SEO fallbacks in `<head>`; all sections declared here |
| `js/main.js` | Entry point (ES module): registers Alpine stores, the `x-anchor` directive and the `site` / `palette` components |
| `js/config/sections.js` | **Section registry** — the one place that lists sections (id, view, heading, visibility, palette command) |
| `js/services.js` | Composition root: one instance of each service (ink engine, router, theme, SEO sync, viewport observer) |
| `js/services/`, `js/ink/`, `js/lib/`, `js/model/` | Plain classes / pure helpers, no Alpine: `HashRouter`, `ThemeManager`, `MetaSync`, `ViewportObserver`; `DotField`, `InkLine`, `HeroSubject`, `Signature`; formatters + math; `Resume` |
| `js/ui/` | Thin Alpine glue: `stores.js`, `sitePage.js` (page component + boot), `palettePanel.js` + `commands.js`, `anchorDirective.js` |
| `css/site.css` | All styles; single file |
| `resume.json` | Only file to edit for content changes (jsonresume.org schema v1, plus `basics.resumeUrl`) |
| `assets/signature.svg` | Owner's hand-drawn signature, one `<path>` per stroke, drawn in stroke order |
| `tools/build-static.mjs` + `tools/templates/` + `tools/lib/template.mjs` | Fills the templates (`{placeholder}` syntax, documented in template.mjs) with data from `resume.json` to generate what non-JS crawlers/AI agents read from `resume.json`: the `build:seo` / `build:content` regions of `index.html` (title, meta, JSON-LD, plain-HTML resume shown only without JS), plus `resume.md`, `llms.txt`, `robots.txt`, `sitemap.xml`. **Run `node tools/build-static.mjs` after editing `resume.json`**; `--check` fails if stale. Never hand-edit between the markers |
| `assets/og.png` | 1200×630 social preview (`og:image`, `twitter:image`). Regenerate with `tools/og-image.html` (render steps in its header comment) after changing the name or job title |
| `favicon.svg`, `sitemap.xml`, `.nojekyll` | Static assets |
| `CNAME` | `anssk.me` — **never rename or delete** |
| `README.md` | GitHub profile card — keep contact info unchanged without owner approval |

---

## Architecture & Data Flow

```
resume.json ──▶ model/Resume ──▶ Alpine store 'resume' ──▶ index.html templates
config/sections.js ──▶ section loop in index.html · hash routes · palette "jump" commands
js/services.js ──▶ ink engine, HashRouter, ThemeManager, MetaSync   (plain classes)
js/ui/*        ──▶ Alpine glue calling the services
```

Layering rule: **services and ink classes never import Alpine**; `js/ui/` is the only layer that does. State templates must react to lives in Alpine stores (`resume`, `theme`, `toast`); logic lives in services. Use `#private` members in service classes, but not inside objects handed to Alpine (it wraps them in proxies).

- Boot (`ui/sitePage.js` `init()`): theme → dot field → load `resume.json` → `MetaSync` → wait for sections to render → hero subject → `InkLine.mount` → signature/reveal observers → `HashRouter.start()` (last, because deep links need real layout).
- **Content updates belong exclusively in `resume.json`** — never hardcode content in HTML.
- Hero: `basics.name` is drawn by the dot field (no photo) or `basics.image` as a halftone portrait (if set). The visible `<h1>` is screen-reader only.
- Scripts: `js/main.js` is a `type="module"` script placed **before** the Alpine `<script defer>` so its `alpine:init` listener exists in time. Modules need http(s), not `file://` (as does `fetch('resume.json')`).

### Sections & hash routing
- `config/sections.js` lists the sections. `index.html` renders them with one `x-for` loop: shared chrome (route, heading, copy-link icon, ink-line node) once, body chosen by `s.view` via `<template x-if>`.
- Any element with `data-section` and an `id` is a route. `HashRouter`: opening `/#id` scrolls there; scrolling rewrites the hash with `history.replaceState` (empty hash at the top); changing the hash / back-forward scrolls; `copyLink(id)` copies the full URL.
- `x-anchor="id"` on a heading adds the little link icon that copies that section's URL.
- Old deep links stay valid: `#home`, `#experience`, `#skills`, `#education`, `#contact` (plus `#projects`).


### Ink engine (js/ink/)
- `DotField` — fixed full-viewport `<canvas>` dot grid. Dots repel from the pointer, darken near the pen tip, and the hero subject (`HeroSubject`) dissolves on scroll. Redraws only while something is moving. Colours come from CSS vars via `ink/colors.js`.
- `InkLine` — one SVG pen stroke through every `[data-ink]` element (DOM order; `data-ink="start"` is the hero origin). Curve/width maths is in `ink/geometry.js`. Variable-width outline revealed by a dash-offset mask that follows scroll; blots at each node. Rebuilds on layout change (ResizeObserver).
- `Signature` — draws each stroke of `assets/signature.svg` in order. The ink line's last node is the signature's first stroke (`data-ink="signature"`); `InkLine.onArrive` starts the writing when the pen gets there (viewport trigger is only a fallback if the line has no path).
- `prefers-reduced-motion` (`lib/motion.js`): everything renders fully drawn, no motion.

### Command palette
`ui/commands.js` is a list of providers `(ctx) => Command[]` (jump, contact, theme, misc). Section "jump" commands come from the registry automatically. Opens with Ctrl/⌘+K or `/`; the floating chip opens it on touch devices. Add commands to a provider there.

---

### Print
Ctrl/⌘+P prints a clean one-column CV: always light, no dots/ink line/controls, the name as real text, all work highlights expanded, external link URLs shown, signature fully drawn. It lives in the `@media print` block at the end of `css/site.css`; any new decorative layer must be hidden there.

---

## Design System — Ink on Paper

Minimal, flat, warm paper with black ink only. Emphasis comes from ink weight (line thickness, blots, dot density), never from colour. No gradients, shadows or extra accent colours.

### Palette (CSS custom properties in `:root`, never raw hex elsewhere)
```css
--paper: #F3EEE4   /* page */
--ink:   #141412   /* text, line, dots */
--ink-2: #3E3B35   /* secondary text */
--muted: #736D62   /* metadata */
--faint: #CFC7B5   /* background dots */
--hair:  rgba(20,20,18,.16) /* hairlines */
```
Dark theme (`:root[data-theme="dark"]`) inverts it: `--paper #161513`, `--ink #ECE6D9`, `--ink-2 #C9C2B4`, `--muted #959082`. Every colour must exist in both blocks (plus the `prefers-color-scheme` no-JS fallback). The canvas reads `--dot`, `--dot-mid` and `--ink` at runtime, so never hardcode colours in `js/ink/`.

### Theme
- Default follows the OS (`prefers-color-scheme`) and keeps following it live.
- The round icon (top-right) toggles light/dark; the choice is saved in `localStorage.theme`. Toggling back to the OS value clears it (back to "follow system"). The palette has "Switch to … theme" and "Follow system theme".
- An inline script in `<head>` sets `data-theme` before first paint — keep it first in `<head>` scripts to avoid a flash.
- The switch spreads from the icon with a View Transition (instant when unsupported or with reduced motion).

### Typography
- `--serif: 'Newsreader'` — headings and body (700 is used for the dotted hero name).
- `--mono: 'JetBrains Mono'` — dates, keys like `work[]`, tags, palette hints.
- Section keys are the resume.json path in mono (`work[]`, `skills[]`), headings are playful serif lines.

### Voice
Microcopy is playful and short ("scroll, I'll draw you the rest", "+3 more I'm proud of", "Nothing matches. The pen ran dry.").

---

## Prompt Modes

Mode is set by listing one or more keywords on the **very first line** of the prompt (comma/space separated).

| Mode | Behaviour |
|---|---|
| `IMPLEMENT` *(default)* | Code edits allowed. Ask confirmation before any change that risks breaking behaviour. |
| `ADVICE-ONLY` | No file edits. Provide guidance + exact file/line references only. |
| `TEST-ONLY` | Only create/modify test files; leave production code untouched. |
| `NO-CONTEXT` | Do not read repository files; overrides all other modes. |
| `VERBOSE` | Include detailed reasoning in responses. |

If context is insufficient for the requested mode, respond exactly: **"NOT ENOUGH CONTEXT"** and stop.

---

## Agent Operating Rules

- Always present a short TODO list **before starting** any task.
- Never run background terminal commands; output must be visible.
- `IMPLEMENT`: use file patches; ask owner before changes that could break publishing.
- `ADVICE-ONLY`: suggest only — no file modifications.

---

## Protected Content

- **`CNAME`** — never rename or delete; breaks the live domain.
- **`README.md` contact fields** — email, LinkedIn URL, resume Drive link — require owner confirmation to change.
- **Resume Drive link** (`basics.resumeUrl` in `resume.json`, and `sitemap.xml`: `https://drive.google.com/file/d/1JVNd-xHBrdpktsuDREXfbxVwLKMbNYjy/view`) — treat as protected.

---

## Developer Workflow

- **No build step** — open `index.html` directly in a browser or serve with any static server:
  ```bash
  npx --yes serve -l 5500 .
  ```
- **Deploy** — push to `main`; GitHub Pages serves the root automatically.
- **Content changes** — edit `resume.json` only; fields follow [jsonresume.org schema v1](https://jsonresume.org/schema/).
- **Adding a section** — add an entry to `js/config/sections.js` (id, view, key, title, `has`, palette). Reuse an existing `view` or add a `<template x-if="s.view === '…'">` block in `index.html` (put `data-ink` on its entries). Add styles in `css/site.css`. Route, copy-link icon, ink-line node and palette command come for free.

---

## PR & Commit Style

- Small, focused commits. Title format: `site: <short summary>` (e.g., `site: add new project to resume.json`).
- Visual/layout changes: include a before/after screenshot in the PR description.
- Any change touching `CNAME`, CDN URLs, or the Alpine version must note the risk in the PR body.
