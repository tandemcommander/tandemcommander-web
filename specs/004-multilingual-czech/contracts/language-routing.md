# Contract: Language Routing, Switcher & SEO Surface

**Feature**: 004-multilingual-czech | Governs URLs, the redirect script, the switcher UI, `localStorage`, and language-related SEO markup.

## URL structure

| URL | Serves | Notes |
|-----|--------|-------|
| `/` | English page (`public/index.html`) | Unchanged from today (FR-012) |
| `/cs/` | Czech page (`public/cs/index.html`) | New |
| `/cs` | 301/308 → `/cs/` | Provided by Cloudflare `html_handling: "auto-trailing-slash"` — no config change |
| any other path | Existing 404 (`404-page` handling), now bilingual | `noindex` stays |

Section anchors are identical in both languages (`#screens`, `#new`, `#project`, `#download`), so `/{#hash}` ↔ `/cs/{#hash}` are always equivalent.

## Root redirect script (English page `<head>` only)

Inline, before render, after the theme script. Pseudocode — this is the behavioral contract:

```text
lang ← try localStorage.getItem('tc-lang') catch → null
if lang == 'cs':                    location.replace('/cs/' + search + hash); stop
if lang == 'en':                    stop                          # explicit choice wins (FR-004)
# nothing stored → detect (FR-005)
prefs ← navigator.languages or [navigator.language]
first ← first entry of prefs (lowercased)
if first starts with 'cs':          location.replace('/cs/' + search + hash)
else:                               stop                          # default English (FR-010)
```

**Invariants**:

- The script NEVER writes to localStorage (FR-006 — only the switcher stores).
- The Czech page contains NO redirect logic (direct `/cs/` visit always shows Czech, even with stored `'en'`).
- Uses `location.replace` (no history entry → back button never bounces).
- Any thrown error (storage blocked, missing APIs) is swallowed → page stays English (FR-010).
- Detection checks only the **first** preference entry: a browser ordered `de, cs, en` gets English (spec edge case: third-language browsers → default).

## Language switcher

**Markup contract** (desktop nav and mobile menu, next to the theme toggle):

```html
<nav class="lang-toggle" aria-label="Language"><!-- aria-label from catalog: nav.langLabel -->
  <a href="/"    hreflang="en" lang="en" data-set-lang="en" aria-current="true|false">EN</a>
  <a href="/cs/" hreflang="cs" lang="cs" data-set-lang="cs" aria-current="true|false">CS</a>
</nav>
```

- Rendered from `languages.json` (order = display order); labels are the registry `label` values, current page's entry gets `aria-current="true"` and the highlighted style (clarification Q3: compact codes, current highlighted).
- Plain links: work without JS (progressive enhancement; crawlable `/cs/` link).
- JS enhancement (`main.js`): on click of `[data-set-lang]` → `try { localStorage.setItem('tc-lang', value) } catch {}`, then navigate to `href + location.hash` (preserves the section the visitor is reading). Default navigation is allowed to proceed if JS fails.
- Keyboard operability: native link semantics (FR-003) — no custom key handling needed; visible `:focus-visible` styles required, consistent with existing header controls.

## localStorage contract

| Key | Values | Writers | Readers |
|-----|--------|---------|---------|
| `tc-lang` | `"en"` \| `"cs"` | switcher click handler only | root redirect script only |

Unknown values are ignored by readers (treated as absent). Key is never migrated or expired.

## SEO / metadata surface (per page)

| Element | English page | Czech page |
|---------|-------------|------------|
| `<html lang>` | `en` | `cs` |
| `<title>` / `meta description` | catalog `meta.*` (en) | catalog `meta.*` (cs) |
| `link rel=canonical` | `https://tandemcommander.org/` | `https://tandemcommander.org/cs/` |
| `link rel=alternate hreflang=en` | `https://tandemcommander.org/` | same |
| `link rel=alternate hreflang=cs` | `https://tandemcommander.org/cs/` | same |
| `link rel=alternate hreflang=x-default` | `https://tandemcommander.org/` | same |
| `og:url` | `…/` | `…/cs/` |
| `og:locale` (+ `og:locale:alternate`) | `en_US` (+ `cs_CZ`) | `cs_CZ` (+ `en_US`) |
| `og:title` / `og:description` / `og:image:alt` | en catalog | cs catalog |
| font preload | `archivo-latin-800` | `archivo-latin-800` + `archivo-latin-ext-800` |

`sitemap.xml` lists both URLs, each with `xhtml:link rel="alternate"` entries for `en`, `cs`, and `x-default` (namespace `xmlns:xhtml="http://www.w3.org/1999/xhtml"` added to `<urlset>`).

## 404 page (static, bilingual)

Keeps single-file design and `noindex`. Content adds a Czech paragraph and a second home link: `<p lang="cs">Tato stránka neexistuje.</p>` and links "Back to home" → `/` plus `<a lang="cs" href="/cs/">Zpět na úvod</a>`. No detection logic on the 404.
