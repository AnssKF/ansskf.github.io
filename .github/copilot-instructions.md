# GitHub Copilot / AI Agent Instructions

## Project Overview
Personal portfolio static site for **Anss Khaled** — published at `ansskf.github.io` via GitHub Pages.  
**No build step. No package manager. No framework CLI.** Deploy = push to `main`.

**File map:**
| File | Role |
|---|---|
| `index.html` | Single page; all 5 views declared here |
| `app.js` | Alpine.js component (`portfolio()`) — all state and logic |
| `styles.css` | All styles; single file, section-commented |
| `resume.json` | Only file to edit for content changes (jsonresume.org schema v1) |
| `CNAME` | `ansskf.github.io` — **never rename or delete** |
| `README.md` | GitHub profile card — keep contact info unchanged without owner approval |

---

## Architecture & Data Flow

```
resume.json  ──fetch──▶  app.js (Alpine.js portfolio())  ──binds──▶  index.html views
```

- On `init()`, `portfolio()` fetches `./resume.json`, populates `this.resume`, then updates `<title>` and `<meta name="description">` from `basics.name` / `basics.summary`.
- All template rendering uses Alpine `x-for` / `x-text` / `x-show` binding to `resume.*`.
- **Content updates belong exclusively in `resume.json`** — never hardcode content in HTML.
- The site has a 280 ms intentional loader delay (`_sleep(280)`) to prevent flash; do not remove it.

### View System
5 views (`landing`, `education`, `skills`, `experience`, `contact`) are stacked `position: absolute` panels inside `.content-area`.  
State lives in `currentView` and `exitingView`. Transitions are CSS-only (`opacity` + `translateY`):
- Entering view: `is-active` → slides up from `translateY(24px)` → `0`
- Exiting view: `is-exiting` → slides to `translateY(-16px)` → cleared after 600 ms via `setTimeout`

**Script load order is critical** — `app.js` must load before Alpine (`defer` preserves document order):
```html
<script src="app.js" defer></script>
<script defer src="https://unpkg.com/alpinejs@3.14.1/dist/cdn.min.js"></script>
```

### Navigation Dock
`navItems` array in `app.js` drives the floating bottom nav. To add a view: add entry to `navItems`, add a `<section class="view" …>` block in `index.html`, and add any needed styles in `styles.css`.

---

## Design System — Modern Typographic Minimalism (Swiss Style)

The visual identity is **Swiss / International Typographic Style** with a utilitarian dark aesthetic. Every UI decision should reinforce this; do not introduce decorative elements, rounded corners, gradients, or color accents.

### Palette (strict monochrome dark)
All colors are CSS custom properties — **never use raw hex values** outside `:root`:
```css
--c-bg:       #0a0a0a   /* page background */
--c-surface:  #0e0e0e
--c-card:     #111111
--c-border:   #ffffff   /* primary hairline — white on dark */
--c-border-2: #2a2a2a   /* secondary / subtle dividers */
--c-text:     #f0f0f0   /* body text */
--c-muted:    #3a3a3a   /* de-emphasised */
--c-dim:      #606060   /* metadata, labels */
--c-faint:    #141414   /* hover backgrounds */
--c-accent:   #ffffff
```

### Typography
- `--f-display: 'Space Grotesk'` — headings, body, UI labels
- `--f-mono: 'Space Mono'` — all metadata, dates, tags, section labels, dock buttons, spec annotations

**Rules:**
- Section labels: `font-family: var(--f-mono); font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase`
- Dates / metadata: mono, `letter-spacing: 0.06em`, `color: var(--c-dim)`
- Hero name: `clamp(72px, 13vw, 160px)`, `letter-spacing: -0.04em`, `font-weight: 700`
- Last name uses **outlined / ghost** treatment: `color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,0.18)`
- Tags: `border-radius: 0` (square), `border: 1px solid var(--c-border-2)`, invert on hover

### Layout Conventions
- No border-radius on structural elements — square corners only.
- Hairline rules (`1px solid var(--c-border)`) are the primary structural dividers.
- Corner registration marks on `.view-landing` (CSS `::before` / `::after`) — a Swiss poster motif; preserve these.
- Cards: left `2px transparent` border that reveals `var(--c-border)` on hover (not background color).
- Highlight list bullets use `//` pseudo-content, not `•` or standard list markers.
- Link hover: text fades + `→` arrow nudges `translateX(4px)` — no underlines.

### Icons
`css.gg` (pure CSS, CDN) — class pattern `gg-<name>`. New icons must come from this library.  
Social network → icon mapping lives in `profileIcon()` in `app.js`.

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
- **Resume Drive link** in `index.html` (`https://drive.google.com/file/d/1JVNd-xHBrdpktsuDREXfbxVwLKMbNYjy/view`) — treat as protected.

---

## Developer Workflow

- **No build step** — open `index.html` directly in a browser or serve with any static server:
  ```bash
  npx --yes serve -l 5500 .
  ```
- **Deploy** — push to `main`; GitHub Pages serves the root automatically.
- **Content changes** — edit `resume.json` only; fields follow [jsonresume.org schema v1](https://jsonresume.org/schema/).
- **Adding a new view** — three touch points: `navItems` in `app.js` → `<section class="view">` in `index.html` → styles in `styles.css`.

---

## PR & Commit Style

- Small, focused commits. Title format: `site: <short summary>` (e.g., `site: add new project to resume.json`).
- Visual/layout changes: include a before/after screenshot in the PR description.
- Any change touching `CNAME`, CDN URLs, or the Alpine version must note the risk in the PR body.
