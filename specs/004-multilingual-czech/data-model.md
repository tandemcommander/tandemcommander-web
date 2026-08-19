# Data Model: Multilingual Site with Czech Localization

**Feature**: 004-multilingual-czech | **Date**: 2026-08-19

Three entities from the spec, mapped to concrete data files and one browser-side value. No database, no server state.

## 1. Locale (language registry)

**File**: `src/_data/languages.json` — an array, order defines switcher display order.

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `code` | string | unique; lowercase ISO 639-1; matches a catalog file name | Page `lang` attribute, catalog lookup, localStorage value |
| `label` | string | short uppercase code shown in the switcher | "EN", "CS" (clarification Q3) |
| `url` | string | absolute path with trailing slash | `/` for English, `/cs/` for Czech; switcher href, hreflang href, canonical |
| `ogLocale` | string | `ll_TT` format | `og:locale` / `og:locale:alternate` |
| `intl` | string | valid `Intl` locale tag | `releaseDate` filter formatting (`en-US`, `cs-CZ`) |
| `default` | boolean | exactly one entry `true` | Root-URL language, hreflang `x-default` target |

**Initial content**:

```json
[
  { "code": "en", "label": "EN", "url": "/",    "ogLocale": "en_US", "intl": "en-US", "default": true  },
  { "code": "cs", "label": "CS", "url": "/cs/", "ogLocale": "cs_CZ", "intl": "cs-CZ", "default": false }
]
```

**Lifecycle**: Adding a language appends one entry here + one catalog file + one page wrapper (FR-008). Nothing else changes.

## 2. Translated content set (string catalog)

**Files**: `src/_data/i18n/<code>.json` — one per registry entry; nested objects, leaf values are strings.

**Key structure** (namespaces mirror the section templates so a string is findable from its template):

```text
meta.title, meta.description, meta.ogImageAlt
nav.themes, nav.whatsNew, nav.project, nav.download,
nav.menuLabel, nav.themeLabel, nav.themeLight, nav.themeDark, nav.langLabel
hero.*            (headline, tagline, CTAs, badge texts)
screens.*         (heading, copy, screenshot alt texts, zoom/close labels)
features.*        (heading + per-feature title/description)
whatsNew.*        (heading, version line, changelog entries)
project.*         (heading, copy, link labels)
story.*           (heading, narrative paragraphs)
download.*        (heading, installer card texts, releaseDate label, requirements)
footer.*          (license line, link labels)
```

Exact leaf keys are fixed during implementation when strings are extracted from the templates; the contract in [contracts/i18n-catalog.md](contracts/i18n-catalog.md) governs their form, not their enumeration.

**Validation rules** (enforced at build time — FR-013):

1. Every catalog MUST contain **exactly** the same key set as every other catalog (deep comparison of leaf paths). Any difference fails the build, listing the offending keys and file.
2. Every leaf value MUST be a non-empty string after trimming. Empty string = missing translation = build failure.
3. The `t` filter throws on a lookup miss (unknown key or unknown language), so a typo in a template also fails the build.
4. HTML is not allowed in values except where a key is explicitly documented as rich text in the catalog contract (kept to a minimum; rendered with Nunjucks `safe` only for those keys).

**Relationships**: `Locale.code` → catalog file name; templates reference leaf keys; `t(lang, key)` joins the two.

## 3. Visitor language preference

**Storage**: browser `localStorage`, key **`tc-lang`** (naming mirrors the existing `tc-theme`).

| Aspect | Rule |
|--------|------|
| Values | exactly `"en"` or `"cs"` (a `Locale.code`); any other value is treated as absent |
| Written by | the language switcher click handler only (FR-006) — never by detection, never by the redirect script |
| Read by | the root-redirect inline script on the English page only |
| Absent | means "no explicit choice yet" → browser-language detection applies at the root URL (FR-005) |
| Unavailable (private mode / blocked) | all reads/writes wrapped in try/catch; behavior degrades to per-visit detection (spec edge case) |

**State transitions**:

```text
(absent) --switcher EN clicked--> "en"
(absent) --switcher CS clicked--> "cs"
"en" <--switcher clicks--> "cs"        (overwrite, no other transitions)
any state --detection/redirect-->      (no change: read-only consumers)
```

## Out-of-catalog content (documented exceptions)

- `src/root/404.html` — hand-edited bilingual static page (passthrough copy, renders without Eleventy). Adds a Czech line + `/cs/` link.
- `src/root/sitemap.xml` — hand-maintained; gains the `/cs/` entry + hreflang alternates.
- `src/_data/site.json` — keeps only non-localizable config (name, version, releaseDate, platform, license, toolchain, URLs, author). Its `description` value is superseded by `meta.description` in the catalogs and is removed from site.json to avoid a second source of truth.
- Product name, technical terms, screenshots, OG image — intentionally identical across languages (research R8).
