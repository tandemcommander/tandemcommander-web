# Implementation Plan: Multilingual Site with Czech Localization

**Branch**: `004-multilingual-czech` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-multilingual-czech/spec.md`

## Summary

Make the single-page Tandem Commander site bilingual: English stays at the root URLs unchanged, Czech is generated at `/cs/` from the same templates. All user-visible strings move out of the Nunjucks section templates into per-language string catalogs (`src/_data/i18n/en.json`, `cs.json`) looked up by a custom `t` filter that fails the build on any missing key (strict parity, FR-013). A compact "EN | CS" switcher joins the header next to the theme toggle; an explicit switch is stored in `localStorage` (`tc-lang`, mirroring the existing `tc-theme` pattern). A tiny inline script in the English page's `<head>` redirects the root URL to `/cs/` for visitors with a stored Czech choice or (when nothing is stored) a Czech browser preference — the hosting is an assets-only Cloudflare Worker, so detection must be client-side. Czech diacritics are covered by adding `latin-ext` font subsets with `unicode-range`, so English visitors download nothing new. hreflang alternates, per-language metadata, and a two-entry sitemap keep both versions independently indexable. The full Czech translation is produced as part of implementation for owner review.

## Technical Context

**Language/Version**: Node.js 20 locally (build/dev); Node 22 required for `wrangler deploy`/`preview` (known constraint). Eleventy 3.x with CommonJS config, Nunjucks templates, vanilla browser JS (no framework), plain CSS.

**Primary Dependencies**: `@11ty/eleventy` ^3.0.0, `@fontsource/archivo` ^5, `@fontsource/ibm-plex-mono` ^5, `wrangler` ^4. **No new dependencies** — the bundled Eleventy I18nPlugin is deliberately not used (see research.md R1).

**Storage**: Visitor's `localStorage` only — key `tc-lang`, values `en`/`cs`, written solely by the switcher. No backend, no cookies.

**Testing**: Build-time enforcement (catalog parity check + `t` filter throwing on missing keys) plus the manual validation scenarios in quickstart.md. The repo has no test framework; this matches existing practice.

**Target Platform**: Static site on Cloudflare Workers (assets-only, `wrangler.jsonc` — no server logic available). Evergreen browsers; core content must work without JS (links still navigate, only detection/persistence are JS enhancements).

**Project Type**: Static web (SSG) — one page rendered per locale, plus passthrough root files.

**Performance Goals**: Zero regression for English visitors: font files unchanged for them (unicode-range gating), inline redirect script ≤ ~0.5 KB, no extra requests. Czech page loads within the same budget (latin-ext subsets load only when Czech glyphs are used).

**Constraints**: Assets-only hosting (client-side detection only); `public/` is committed build output; strict translation parity must block `npm run build` (and therefore `deploy`, which runs build first); existing English URLs must not change (FR-012).

**Scale/Scope**: 1 page × 2 locales, 8 section templates + layout + header/footer, ~100–150 catalog strings, 7 new font files, 1 static 404, 1 sitemap.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unratified template — no project-specific gates are defined. Proceeding under the project's established conventions instead (verified against the codebase and prior specs 001–003):

| Convention | This plan |
|------------|-----------|
| Content/config values live in `src/_data` (site.json pattern) | PASS — strings move to `src/_data/i18n/*.json`, locale registry to `src/_data/languages.json` |
| `src/` builds into committed `public/`; no client frameworks | PASS — no new dependencies, vanilla JS additions only |
| Bad config fails the build (releaseDate filter precedent) | PASS — parity check and `t` filter throw at build time |
| Progressive enhancement (theme toggle, lightbox precedents) | PASS — switcher is plain links; JS only adds persistence/detection |

**Post-Phase-1 re-check**: PASS — design introduces no new projects, dependencies, or hosting changes. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-multilingual-czech/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── i18n-catalog.md      # String catalog format, parity rules, t filter contract
│   └── language-routing.md  # URLs, redirect algorithm, switcher, storage, SEO tags
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
eleventy.config.js           # MODIFIED: t filter, catalog parity check, locale-aware releaseDate
src/
├── _data/
│   ├── site.json            # MODIFIED: description (localizable) moves to i18n catalogs
│   ├── languages.json       # NEW: locale registry (code, url, labels, og/Intl locales)
│   └── i18n/
│       ├── en.json          # NEW: English string catalog (extracted from templates)
│       └── cs.json          # NEW: Czech string catalog (the translation deliverable)
├── _includes/
│   ├── layout.njk           # MODIFIED: lang attr, localized meta, canonical, hreflang, og:locale, redirect script (EN only)
│   └── sections/
│       ├── header.njk       # MODIFIED: t() lookups + "EN | CS" switcher (desktop + mobile menu)
│       ├── hero.njk         # MODIFIED: t() lookups
│       ├── screens.njk      # MODIFIED: t() lookups (incl. alt texts, lightbox labels)
│       ├── features.njk     # MODIFIED: t() lookups
│       ├── whats-new.njk    # MODIFIED: t() lookups (changelog entries enter the catalog)
│       ├── project.njk      # MODIFIED: t() lookups
│       ├── story.njk        # MODIFIED: t() lookups
│       ├── download.njk     # MODIFIED: t() lookups, locale-aware release date
│       └── footer.njk       # MODIFIED: t() lookups
├── index.njk                # MODIFIED: front matter lang: en
├── cs/
│   └── index.njk            # NEW: thin wrapper, front matter lang: cs → public/cs/index.html
├── css/main.css             # MODIFIED: unicode-range on existing @font-face + latin-ext blocks; switcher styles
├── fonts/                   # NEW FILES: 7× latin-ext woff2 (Archivo 400–800, Plex Mono 400/500)
├── js/main.js               # MODIFIED: switcher persistence handler (stores tc-lang, preserves #hash)
└── root/
    ├── 404.html             # MODIFIED: bilingual (adds Czech line + link to /cs/)
    └── sitemap.xml          # MODIFIED: adds /cs/ entry + xhtml:link hreflang alternates
```

**Structure Decision**: Single Eleventy project, unchanged layout. A new language = one thin page wrapper (`src/<code>/index.njk`), one catalog (`src/_data/i18n/<code>.json`), and one registry entry — satisfying FR-008 without restructuring. English output paths are untouched (FR-012).

## Complexity Tracking

No constitution violations — table not needed.
