# Contract: String Catalog & `t` Filter

**Feature**: 004-multilingual-czech | Governs `src/_data/i18n/*.json`, `src/_data/languages.json`, and the build-time i18n machinery in `eleventy.config.js`.

## Catalog files

- One file per language: `src/_data/i18n/<code>.json`, where `<code>` is a `code` from `src/_data/languages.json`. A registry entry without a catalog file (or vice versa) fails the build.
- Content: nested JSON objects; **leaf values are strings only** (no arrays of mixed types, no numbers, no null). Lists (e.g. feature items, changelog entries) are objects with stable keys (`item1`, `item2`, …) or arrays of objects with identical shape across languages — the parity check compares full leaf paths, so array length differences fail the build.
- Encoding: UTF-8. Czech text uses real diacritics (no HTML entities).
- Values are plain text by default and get HTML-escaped by Nunjucks on output. Keys that intentionally contain markup MUST be listed in a `RICH_TEXT_KEYS` allowlist in `eleventy.config.js` and are the only ones templates may render with `| safe`.

## `t` filter

**Signature (in templates)**: `{{ lang | t("namespace.key") }}` — `lang` comes from page front matter (`en` / `cs`).

**Behavior**:

| Input | Result |
|-------|--------|
| Known lang + known key | The catalog string for that language |
| Unknown lang | **Throw**: `i18n: unknown language "<lang>"` |
| Unknown/missing key | **Throw**: `i18n: missing key "<key>" for language "<lang>"` |
| Value empty/whitespace | **Throw**: `i18n: empty value for "<key>" (<lang>)` |

Throwing aborts the Eleventy build → `npm run build`, `npm run deploy`, and `npm run check` all fail (FR-013).

## Parity check (build gate)

Runs before templates render (Eleventy `eleventy.before` event or at config load):

1. Collect the sorted set of leaf key paths for every catalog.
2. If any two sets differ, throw one error naming every missing/extra key per file, e.g.
   `i18n parity: cs.json is missing keys: whatsNew.entry3.title, whatsNew.entry3.body`.
3. Also validates rule "leaf values non-empty strings" across all catalogs so an untranslated placeholder can never ship.

**Acceptance test for this contract**: temporarily delete one key from `cs.json` → `npm run build` exits non-zero and names the key; restore → build passes. (See quickstart.md, scenario V6.)

## `releaseDate` filter (extended)

`{{ site.releaseDate | releaseDate(locale.intl) }}` — existing validation unchanged (must be valid `YYYY-MM-DD`, throws otherwise); new second argument selects `Intl.DateTimeFormat` locale. `releaseDate` with no argument keeps formatting as `en-US` (backward compatible). Expected outputs for `2026-08-18`: `en-US` → "August 18, 2026"; `cs-CZ` → "18. srpna 2026".

## Czech translation deliverable

`cs.json` fully populated is a deliverable of this feature (FR-011). Translation conventions:

- Address the reader informally-neutrally per Czech web convention for developer tools ("Stáhněte si", not "Rač si stáhnouti"); keep sentences as concise as the English originals.
- Keep untranslated: "Tandem Commander", "Open Salamander", SFTP, Unicode, Markdown, GPLv2, Visual Studio 2022, "Windows 11 · x64", version numbers.
- UI terms follow Czech Windows conventions (e.g. "světlý/tmavý motiv" for light/dark theme, "stáhnout" for download).
- The owner reviews `cs.json` as a single file before the Czech version is announced (SC-007).
