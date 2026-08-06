# Data Model: Download Release Date

**Feature**: 003-download-release-date | **Date**: 2026-08-06

## Entity: Site settings (`src/_data/site.json`)

Central Eleventy global data file holding all site-wide release facts. Exposed to every template as `site.*`. This feature adds one field; all existing fields are unchanged.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | yes (existing) | Version number of the currently offered installer, e.g. `"0.1.1"` |
| **`releaseDate`** | string | **yes (new)** | Release date of the currently offered installer version, ISO 8601 calendar date `YYYY-MM-DD`, e.g. `"2026-08-05"`. Placed immediately after `version` so both are edited together during a release. |
| *(other existing fields)* | — | — | `name`, `platform`, `license`, `toolchain`, `domain`, `url`, `description`, `github.*`, `author.*` — untouched |

### Validation rules (`releaseDate`)

Enforced at build time by the `releaseDate` Nunjucks filter in `eleventy.config.js` (see [contracts/site-config.md](./contracts/site-config.md)):

1. MUST be present and a non-empty string — missing/empty value aborts the build (FR-006).
2. MUST match `^\d{4}-\d{2}-\d{2}$`.
3. MUST denote a real calendar date — parsed as UTC and round-trip checked, so `2026-02-30` or `2026-13-01` fail.
4. Violation of any rule throws an `Error` whose message names the file, the key, and the offending value; Eleventy exits non-zero.

### Relationships & lifecycle

- `releaseDate` describes the same release as `version` — a 1:1 pairing maintained by hand: both values are updated together in the same file during the release workflow (SC-002).
- No history is kept; the file always describes only the currently offered release (spec assumption: exactly one installer download at a time).
- No state transitions; value changes only via maintainer edit + rebuild.

## Derived value: rendered release date

| Property | Value |
|----------|-------|
| Source | `site.releaseDate` |
| Transformation | `releaseDate` Nunjucks filter → `Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })` |
| Output example | `August 5, 2026` |
| Rendered in | `src/_includes/sections/download.njk`, installer card description line (single site location, satisfying SC-003) |
