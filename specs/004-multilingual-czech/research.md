# Research: Multilingual Site with Czech Localization

**Feature**: 004-multilingual-czech | **Date**: 2026-08-19

All Technical Context unknowns are resolved below. No NEEDS CLARIFICATION markers remain.

## R1: i18n mechanism in Eleventy

**Decision**: Per-language string catalogs as global data files (`src/_data/i18n/en.json`, `src/_data/i18n/cs.json`) with identical key structure, looked up by a custom Nunjucks filter `t` registered in `eleventy.config.js`. The filter resolves a dot-path key against the catalog for the page's `lang` and **throws** on a missing or empty value. A separate build-start check deep-compares the key sets of all catalogs and throws with the list of missing keys.

**Rationale**: The repo's precedent (releaseDate filter) is "bad config fails the build" — the same mechanism directly implements FR-013 (strict parity, publishing blocked). `npm run deploy` runs `npm run build` first, so a failing build blocks publishing with no extra tooling. Zero new dependencies; the whole mechanism is ~40 lines of config code.

**Alternatives considered**:
- **Eleventy bundled `I18nPlugin`** (`@11ty/eleventy`): provides `locale_url`/`locale_links` filters keyed off directory structure. Rejected: it solves URL mapping (trivial here — two known URLs) but provides no string dictionary and no parity enforcement, which is the actual problem.
- **Community `eleventy-plugin-i18n`**: dictionary lookup with fallback to a default language. Rejected: silent English fallback is exactly what the clarified FR-013 forbids; adds a dependency for behavior we must override anyway.
- **Duplicated templates per language** (copy sections into `cs/` versions): Rejected: violates FR-008 (adding a language would mean re-copying everything) and guarantees structural drift between versions.

## R2: Generating the Czech page

**Decision**: Keep `src/index.njk` (front matter `lang: en`) and add a thin `src/cs/index.njk` (front matter `lang: cs`, same layout and includes) which Eleventy outputs to `public/cs/index.html`. Section templates read all text via `t(lang, key)`.

**Rationale**: English output paths stay byte-identical in structure (FR-012). Eleventy's default permalink for `src/cs/index.njk` is exactly `/cs/index.html` — no permalink logic needed. Adding language N+1 = one folder + one catalog + one registry entry (FR-008). Cloudflare's `html_handling: "auto-trailing-slash"` already serves `/cs` → `/cs/` → `/cs/index.html`.

**Alternatives considered**:
- **Pagination over the locale list from a single template** (`pagination: data: languages`, computed permalinks): Rejected: clever but harder to read and debug for a two-locale site; permalink computation reintroduces risk to the English URL (FR-012).

## R3: Language detection and root redirect on assets-only hosting

**Decision**: A small inline script (≤ ~0.5 KB) in the `<head>` of the **English page only**, placed before paint (same anti-FOUC slot as the theme script):

1. Read `localStorage['tc-lang']` (try/catch — private mode falls through to detection).
2. `'cs'` → `location.replace('/cs/' + location.search + location.hash)`.
3. `'en'` → stay, done.
4. Nothing stored → if the first matching entry of `navigator.languages` (fallback `navigator.language`) starts with `cs` → `location.replace('/cs/' + …)`; anything else → stay.

The Czech page carries **no** redirect logic: a direct visit to `/cs/` always shows Czech, and a stored `'en'` never redirects away from an explicitly opened `/cs/` link (FR-006). Detection never writes to storage — only the switcher does.

**Rationale**: `wrangler.jsonc` is an assets-only Worker (`assets.directory`, no script) — there is deliberately no server-side code, so `Accept-Language` negotiation is unavailable. A pre-paint inline script gives the clarified auto-redirect UX (Q1) with no flash of English. `location.replace` keeps the back button working (the English root never enters history on redirect). Crawlers ignore localStorage and generally index the served HTML of both URLs; hreflang (R6) declares the relationship, satisfying FR-007. Carrying `location.hash` preserves shared section anchors (`/#download` → `/cs/#download`).

**Alternatives considered**:
- **Server-side redirect via Worker code**: Rejected: converts the assets-only Worker into a scripted one — a hosting-model change with caching and maintenance costs far exceeding the feature; also `Accept-Language`-varying responses complicate CDN caching.
- **Cloudflare `_redirects` file**: Rejected: static rules cannot condition on browser language.
- **`<meta http-equiv="refresh">`**: Rejected: no conditional logic, SEO-hostile.
- **Suggestion banner instead of redirect**: Rejected by clarification Q1 (auto-redirect chosen).

## R4: Switcher and preference persistence

**Decision**: The switcher is a pair of plain links styled as a compact segmented toggle — `EN` → `/`, `CS` → `/cs/` — rendered in the desktop nav and the mobile menu (mirroring the theme toggle placement). The current language gets `aria-current="true"` + highlight style; each link carries `hreflang`/`lang` attributes. A JS click handler (in `main.js`) writes `tc-lang` (`'en'`/`'cs'`) to localStorage inside try/catch and appends the current `location.hash` to the target so the visitor stays at the same section. Values: exactly `'en'` or `'cs'`; anything else is ignored by the redirect script.

**Rationale**: Progressive enhancement matching the site's existing patterns: without JS the links still switch language (persistence and detection are enhancements — spec edge case "storage unavailable" holds: the visit works, next visit re-detects). Key name `tc-lang` mirrors `tc-theme`. Links (not buttons) are correct semantics for navigation and are crawlable.

**Alternatives considered**:
- **Buttons + JS navigation**: Rejected: breaks without JS and hides the `/cs/` link from crawlers.
- **Cookie storage**: Rejected: no server to read it; localStorage precedent exists; avoids consent-banner ambiguity for a pure client preference.

## R5: Czech diacritics in the current fonts

**Finding**: `src/fonts/` ships only `latin` subsets and `main.css` declares `@font-face` **without `unicode-range`**. The `latin` subset lacks č ď ě ň ř š ť ů ž (U+010D, U+010F, U+011B, U+0148, U+0159, U+0161, U+0165, U+016F, U+017E) — today those glyphs would silently fall back to Arial/monospace, violating FR-009.

**Decision**: Copy the 7 matching `latin-ext` woff2 files from the already-installed `@fontsource` packages (`archivo-latin-ext-{400,500,600,700,800}`, `ibm-plex-mono-latin-ext-{400,500}` — verified present in `node_modules`) into `src/fonts/`, add `unicode-range` to the existing latin `@font-face` blocks, and add matching latin-ext blocks with the fontsource latin-ext ranges. Add a `preload` for `archivo-latin-ext-800` on the Czech page only (mirroring the existing latin-800 preload).

**Rationale**: `unicode-range` makes browsers download latin-ext files only when a page actually uses those glyphs — English visitors see zero new bytes (performance constraint), Czech visitors get correct diacritics (FR-009). Same licence files already cover the added subsets.

**Alternatives considered**:
- **Replace latin files with latin-ext-only**: Rejected: latin-ext subsets don't include basic ASCII — both are needed; and forcing latin-ext on English visitors wastes bytes.
- **System font fallback for Czech**: Rejected: visibly breaks the brand typography mid-word (mixed glyphs), failing FR-009.

## R6: SEO for two language versions

**Decision**: On both pages: `<html lang="{en|cs}">`; localized `<title>`, `meta description`, `og:title`, `og:description`; per-page `canonical` and `og:url` (`/` vs `/cs/`); `og:locale` (`en_US` / `cs_CZ`) plus `og:locale:alternate`; and three hreflang links on each page — `en` → `/`, `cs` → `/cs/`, `x-default` → `/`. `sitemap.xml` (static passthrough file) gains the `/cs/` URL and `xhtml:link` hreflang alternates on both entries. `robots.txt` unchanged. The 404 page stays `noindex` and becomes bilingual per the spec assumption.

**Rationale**: This is the standard, crawler-safe pattern for client-side language redirects: both URLs return full HTML directly (SC-006), hreflang + x-default tell search engines which version to serve to whom (FR-007), and per-language canonicals prevent the two pages competing.

**Alternatives considered**:
- **Generating sitemap.xml via Eleventy**: Rejected for now: the file is a hand-maintained static passthrough (precedent from spec 003's release-date workflow); two entries don't justify template machinery. Revisit if languages multiply.

## R7: Locale-aware release date formatting

**Finding**: The `releaseDate` filter hardcodes `Intl.DateTimeFormat("en-US")` — the Czech download card would show "August 18, 2026" instead of "18. srpna 2026".

**Decision**: Extend the filter with a locale parameter (`releaseDate(value, intlLocale)`), driven by the locale registry's `intl` field (`en-US` / `cs-CZ`), keeping the existing strict validation and throw-on-invalid behavior.

**Alternatives considered**: Duplicate Czech-specific filter — rejected: violates FR-008 (each new language would add a filter).

## R8: Scope of translated vs. untouched content

**Decision**: Everything user-visible in the page templates enters the catalogs and is translated: nav labels, all section copy, changelog ("What's New") entries, button/aria labels, image alt texts, meta title/description, footer. Untouched by design: the product name "Tandem Commander", technical terms (SFTP, Unicode, GPLv2, Visual Studio 2022), app screenshots and the OG image (the application UI itself is English), `site.json` technical config, and code-level identifiers. The 404 page is hand-edited bilingual static HTML, deliberately outside the catalog (it bypasses Eleventy via passthrough copy).

**Rationale**: Matches FR-002 and the spec assumptions; keeps the catalog the single source of truth for template text while not over-engineering the one static page that renders without Eleventy.
