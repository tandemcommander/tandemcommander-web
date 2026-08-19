# Quickstart: Validating the Multilingual Site

**Feature**: 004-multilingual-czech | Run these scenarios to prove the feature end-to-end.

## Prerequisites

- Node.js 20+ (build/dev). **Node 22 required only for `npm run preview` / `npm run deploy`** (wrangler constraint — known project limitation).
- `npm install` already done (no new dependencies are added by this feature).

## Build & static checks

```powershell
npm run build
```

- **V1 — Both pages exist**: `public/index.html` (English) and `public/cs/index.html` (Czech) are generated; `public/index.html` content/URLs unchanged in structure (FR-012).
- **V2 — Metadata**: In `public/cs/index.html` verify `<html lang="cs">`, Czech `<title>`, canonical `…/cs/`, and three hreflang alternates (`en`, `cs`, `x-default`); in `public/index.html` verify `<html lang="en">`, canonical `…/`, same three alternates. Quick check:

  ```powershell
  Select-String -Path public/index.html,public/cs/index.html -Pattern 'hreflang|canonical|og:locale'
  ```

- **V3 — No English remnants on /cs**: open `public/cs/index.html` and scan all rendered text — only the product name and technical terms (SFTP, Unicode, GPLv2…) may be English (SC-001). This is also the owner's translation-review entry point: review `src/_data/i18n/cs.json` (FR-011/SC-007).
- **V4 — Sitemap**: `public/sitemap.xml` lists `/` and `/cs/`, each with `xhtml:link` alternates.
- **V5 — Fonts**: `public/fonts/` contains the 7 `latin-ext` woff2 files; `public/css/main.css` has `unicode-range` on every `@font-face`.

## Build-gate check (strict parity, FR-013)

- **V6 — Missing translation blocks publishing**: temporarily remove any one key from `src/_data/i18n/cs.json` → `npm run build` MUST fail and name the missing key (so `npm run deploy` cannot publish). Restore the key → build passes. Repeat with an empty-string value → same failure.

## Browser scenarios

```powershell
npm run dev   # http://localhost:8080
```

Use a clean profile or DevTools → Application → Local Storage to clear `tc-lang` between scenarios.

- **V7 — Detection (US3)**: With no `tc-lang` stored and browser language Czech (DevTools → Sensors → Location/Language override, or a Czech-locale browser profile), open `/` → address changes to `/cs/`, Czech page shows. With English browser language → stays on `/`, English shows.
- **V8 — Switcher + persistence (US2)**: On `/`, the header shows `EN | CS` with EN highlighted (desktop and inside the mobile menu at < 860 px). Click `CS` → lands on `/cs/` (same section if a `#hash` was active), CS highlighted. Close and reopen the browser, open `/` → auto-redirects to `/cs/`. Switch back to `EN` on the Czech page → `/` opens; reopening `/` later stays English even with a Czech browser (stored choice wins).
- **V9 — URL wins (FR-006)**: With `tc-lang = "en"` stored, open `/cs/` directly → Czech page shows, no redirect, and `tc-lang` still reads `"en"` afterwards.
- **V10 — Keyboard & a11y (FR-003)**: Tab to the switcher links, activate with Enter; `aria-current="true"` sits on the active language; focus outline visible.
- **V11 — Diacritics (FR-009)**: On `/cs/`, inspect headline glyphs (ě š č ř ž ů) — rendered in Archivo/IBM Plex Mono, not a fallback font (DevTools → Rendered fonts shows only Archivo / IBM Plex Mono).
- **V12 — Storage blocked (edge case)**: In a private window (or with storage disabled), switching languages still navigates correctly; no console errors; next root visit falls back to detection.
- **V13 — Back button (Q1 UX)**: After an auto-redirect `/` → `/cs/`, pressing Back does NOT bounce back to `/cs/` (redirect used `location.replace`).
- **V14 — 404**: Open a nonsense path → bilingual 404 with working links to `/` and `/cs/`.

## Pre-deploy

```powershell
npm run check   # build + wrangler deploy --dry-run (needs Node 22)
```

- **V15**: Dry-run passes; `public/` diff reviewed and committed (build output is committed by convention). Actual deploy remains gated on the owner's translation review (FR-011) and the project's pending-final-assets policy.
