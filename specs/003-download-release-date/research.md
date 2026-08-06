# Research: Download Release Date

**Feature**: 003-download-release-date | **Date**: 2026-08-06

No NEEDS CLARIFICATION markers remained in the Technical Context; the open design choices below were resolved from the codebase and Eleventy/Nunjucks conventions.

## Decision 1: Stored date format — ISO 8601 (`YYYY-MM-DD`)

- **Decision**: Store the release date in `src/_data/site.json` as `"releaseDate": "2026-08-05"` (ISO 8601 calendar date, no time component).
- **Rationale**: Unambiguous and machine-parseable (satisfies the spec assumption of a "machine-friendly form"), trivially validated with a regex plus a `Date` round-trip, sorts lexicographically, and is the conventional interchange format for dates in JSON. The display format is decoupled from storage by the filter (Decision 3).
- **Alternatives considered**:
  - *Pre-formatted display string* ("August 5, 2026") — rejected: not validatable, couples storage to presentation, invites typos and inconsistent formatting.
  - *Unix timestamp* — rejected: not human-editable; the maintainer edits this file by hand during releases.
  - *Full ISO datetime* — rejected: time of day is meaningless for a release date and invites timezone bugs.

## Decision 2: Key name and placement — `releaseDate` at top level of `site.json`

- **Decision**: Add `"releaseDate"` immediately after `"version"` in `site.json`.
- **Rationale**: The spec requires the date to live "in the same central JSON settings file that already holds the version number" and the edge-case analysis wants the two values side by side so a forgotten date is easy to spot during release edits. Top-level flat keys match the existing style (`version`, `platform`, `license`).
- **Alternatives considered**:
  - *Nested `release: { version, date }` object* — rejected: would break every existing `site.version` reference across five templates for no functional gain.

## Decision 3: Rendering — Nunjucks filter `releaseDate` in `eleventy.config.js`

- **Decision**: Add a filter (e.g. `{{ site.releaseDate | releaseDate }}`) that formats the ISO date with `Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })` → "August 5, 2026".
- **Rationale**: The site's language is English and the clarified display format is a human-readable long date. `Intl` is built into Node — no new dependency. Parsing as UTC (`new Date(value + "T00:00:00Z")` or `timeZone: "UTC"`) prevents off-by-one-day shifts on build machines in non-UTC timezones. A filter keeps the template declarative and the format definable in exactly one place.
- **Alternatives considered**:
  - *Format inline in the template* — rejected: Nunjucks has no built-in date formatting; string surgery in templates is fragile.
  - *Add a date library (Luxon, dayjs)* — rejected: a dependency for one `Intl` call violates the project's minimal-dependency posture.
  - *Computed global data (`_data/*.js`)* — viable, but a filter co-locates validation and formatting and needs no new file.

## Decision 4: Build-failing validation — the filter throws on missing/empty/invalid input

- **Decision**: The same `releaseDate` filter validates its input before formatting: value must be a string matching `^\d{4}-\d{2}-\d{2}$` AND survive a `Date` round-trip (rejects e.g. `2026-02-30`). On failure it throws `Error` with a message naming the file and key (e.g. `site.json: "releaseDate" must be a valid YYYY-MM-DD date, got "..."`). An uncaught filter error aborts the Eleventy build with a non-zero exit code, satisfying FR-006 for `npm run build`, `npm run deploy`, and `npm run check` alike.
- **Rationale**: One mechanism covers formatting and validation; the template always pipes the value through the filter (FR-001), so a missing key reaches the filter as `undefined` and fails the build. Clear error text tells the maintainer exactly what to fix.
- **Alternatives considered**:
  - *Separate `eleventy.before` event hook reading `site.json`* — slightly more robust (fails even if no template uses the value) but duplicates file-reading logic Eleventy already does and adds a second mechanism; rejected for simplicity. Can be revisited if more validated config values appear.
  - *JSON Schema validation of `site.json`* — over-engineering for a single field in a hand-edited three-key workflow.

## Decision 5: Template wording — appended to the installer-desc line

- **Decision**: Change `download.njk` line 10 to `Version {{ site.version }} for Windows 11, x64 · released {{ site.releaseDate | releaseDate }}.` The `·` separator matches the site's existing meta-line idiom ("Windows 11 · x64 · GPLv2 or later").
- **Rationale**: Matches the clarified placement (appended to the existing version line in the installer card, confirmed 2026-08-06) and reuses the site's visual vocabulary. `.installer-desc` is a normal wrapping paragraph, so no CSS change is needed at the 860 px breakpoint (FR-005).
- **Alternatives considered**: separate line in card, meta line below card — both explicitly rejected by the user in the clarification session.

## Decision 6: Initial value — `2026-08-05`

- **Decision**: Seed `releaseDate` with `2026-08-05`, the date of the "Version upgrade to 0.1.1" commit (`8726fc9`).
- **Rationale**: Best available evidence for when v0.1.1 was cut. The quickstart instructs the maintainer to verify against the GitHub releases page before deploying (final assets/ship date are still pending per project notes).
