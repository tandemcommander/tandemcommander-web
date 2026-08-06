# Contract: Site configuration & rendered output

**Feature**: 003-download-release-date | **Date**: 2026-08-06

This static site exposes two maintainer/user-facing interfaces touched by this feature: the JSON configuration contract (maintainer-facing) and the rendered Download section (visitor-facing).

## 1. Configuration contract — `src/_data/site.json`

New required key:

```json
{
  "version": "0.1.1",
  "releaseDate": "2026-08-05"
}
```

| Aspect | Contract |
|--------|----------|
| Key | `releaseDate` (top level, by convention placed directly after `version`) |
| Type | string |
| Format | ISO 8601 calendar date `YYYY-MM-DD` (zero-padded, no time, no timezone) |
| Semantics | Publication date of the installer version named by `version` |
| Update protocol | Edited by hand together with `version` on each release; takes effect on next `npm run build` |

### Failure contract (FR-006)

| Input | Build behavior |
|-------|----------------|
| Key missing | Build aborts, non-zero exit, error names `site.json` / `releaseDate` |
| Empty string or non-string | Build aborts, same error shape |
| Malformed (`5.8.2026`, `2026-8-5`, `August 5`) | Build aborts, error includes the offending value |
| Impossible date (`2026-02-30`, `2026-13-01`) | Build aborts, error includes the offending value |
| Valid `YYYY-MM-DD` | Build succeeds; date rendered per contract 2 |

The failure applies to every script that runs Eleventy: `npm run build`, `npm run deploy`, `npm run check`.

## 2. Rendering contract — Download section (`public/index.html`)

Template: `src/_includes/sections/download.njk`, installer card description line.

| Aspect | Contract |
|--------|----------|
| Location | `<p class="installer-desc">` inside the installer card — the only place the release date renders (SC-003) |
| Text shape | `Version {version} for Windows 11, x64 · released {Month D, YYYY}.` |
| Example | `Version 0.1.1 for Windows 11, x64 · released August 5, 2026.` |
| Date format | US English long date via `Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })` |
| Separator | `·` (U+00B7), matching the existing `download-meta` idiom |
| Layout | No CSS changes; `.installer-desc` wraps naturally at both desktop and mobile (≤860 px) widths (FR-005) |

## 3. Filter contract — `releaseDate` (Nunjucks filter, `eleventy.config.js`)

| Aspect | Contract |
|--------|----------|
| Name | `releaseDate` |
| Input | `site.releaseDate` string |
| Output | Human-readable US English long date string |
| Errors | Throws `Error("site.json: \"releaseDate\" must be a valid YYYY-MM-DD date, got <value>")`-style message on any invalid input, aborting the build |
| Timezone | Input parsed as UTC; output formatted in UTC — the rendered day never shifts with the build machine's timezone |
