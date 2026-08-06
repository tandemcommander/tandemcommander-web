# Quickstart: Validating Download Release Date

**Feature**: 003-download-release-date | **Date**: 2026-08-06

Runnable scenarios proving the feature end-to-end. Contracts: [contracts/site-config.md](./contracts/site-config.md); data rules: [data-model.md](./data-model.md).

## Prerequisites

- Node.js 20+ (build/dev work on Node 20; `npm run preview`/`deploy` need Node 22 — not required for these checks)
- `npm install` completed
- Feature implemented per plan.md

## Scenario 1 — Happy path: date renders in the installer card (US1)

```powershell
npm run build
Select-String -Path public/index.html -Pattern "released"
```

**Expected**: build exits 0; the `installer-desc` paragraph contains
`Version 0.1.1 for Windows 11, x64.<br>Released August 5, 2026`
— the date on its own line via `<br>`, same typography as the version line (month spelled out in English, day unpadded, matching the `releaseDate` value in `src/_data/site.json`).

## Scenario 2 — Single-source update (US2, SC-002)

1. Edit **only** `src/_data/site.json`: change `releaseDate` to `"2026-12-24"`.
2. `npm run build`
3. `Select-String -Path public/index.html -Pattern "released"`

**Expected**: the date line now reads `Released December 24, 2026`. No template or content file was touched. Revert the value afterwards.

## Scenario 3 — Missing date fails the build (FR-006)

1. Temporarily delete the `releaseDate` line from `src/_data/site.json`.
2. `npm run build`

**Expected**: build fails (non-zero exit); error message names `site.json` and `releaseDate`. No `public/` output is produced with a missing date. Restore the line afterwards.

## Scenario 4 — Invalid date fails the build (FR-006)

Repeat Scenario 3 with `"releaseDate": ""`, `"5.8.2026"`, and `"2026-02-30"`.

**Expected**: each variant fails the build with an error that includes the offending value.

## Scenario 5 — Layout intact on desktop and mobile (FR-005, US1 scenario 2)

```powershell
npm run dev
```

Open `http://localhost:8080/#download`; check the installer card at full width and at ≤860 px (responsive mode).

**Expected**: the version line shows the date, wraps cleanly if needed, and the card/section layout is unchanged.

## Scenario 6 — No stale dates anywhere (SC-003)

```powershell
Select-String -Path public/index.html -Pattern "released|August|December"
```

**Expected**: every date hit traces back to the configured `releaseDate` value; no hard-coded release dates exist elsewhere in the page.

## Before deploying for real

Verify `releaseDate` against the actual v0.1.1 publication date on the [GitHub releases page](https://github.com/tandemcommander/tandemcommander/releases) — the seeded value `2026-08-05` comes from the version-bump commit date. Note: final screenshots/assets are still pending per project notes; deploy timing is governed by that, not by this feature.
