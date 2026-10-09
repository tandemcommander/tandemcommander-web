# Implementation Plan: Installation Through winget on the Website

**Branch**: `010-winget-install` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-winget-install/spec.md`

## Summary

The package `PavelStupka.TandemCommander` is live in the winget catalogue (verified 2026-10-09),
so the winget option that feature 007 built and kept hidden is switched on, with the command the
author decided: `winget install --id PavelStupka.TandemCommander -e`.

The work is small and mostly data: the shared values get the new install command, a new update
command and `available: true`; the update hint stops carrying its own copy of a command; the
"Easy to move in" card loses "on its way" and its closing sentence starts following the
availability mark; the block's styles are widened for a 50-character command and made safe at
360 px; one test guards the source-level rules; `public/` is regenerated. The copy script and the
block's structure are reused unchanged.

## Technical Context

**Language/Version**: JavaScript on Node ≥ 22 (machine runs 24), Nunjucks templates, CSS; no new
language or dependency

**Primary Dependencies**: Eleventy 3 (existing); the `t`, `inline` and `replace` filters already
used by the download section

**Storage**: Committed files - `src/_data/site.json`, `src/_data/i18n/{en,cs}.json`, templates
under `src/_includes/sections/`, `src/css/main.css`, generated `public/` (committed, never edited
by hand)

**Testing**: `node --test` (`npm test`) with one new suite `tests/site.winget.test.js`; Eleventy
build gates (catalog parity, PAD) via `npm run build`; `npm run release:check`; manual scenarios
in [quickstart.md](quickstart.md)

**Target Platform**: Static site on Cloudflare Workers static assets; evergreen browsers, with a
no-script and no-clipboard fallback

**Project Type**: Static website

**Performance Goals**: No measurable change - no new script, image or request; a few hundred bytes
of HTML and CSS

**Constraints**: commands written only in `site.json` (FR-012) · both catalogs keep an identical
key set and plain-text values (build gate) · release history, PAD file, hero and header untouched
(FR-010, spec Assumptions) · no horizontal page scroll at 360 px; existing 860 px breakpoint
unchanged · `public/` only regenerated · no commit to `devel`/`main`, no merge, no deployment by
the assistant

**Scale/Scope**: 1 data object (3 values changed, 1 added) · 4 catalog keys per language (1
shortened, 2 new, 1 reworded) · 2 templates · about 3 CSS declarations · 1 new test file ·
README note · 3 regenerated files under `public/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so it defines no gates. The
project's standing rules are applied instead:

| Gate | Status |
|------|--------|
| Every feature on its own `NNN-name` branch; never commit to the main line | Pass - branch `010-winget-install` |
| Every user-visible string in the i18n catalogs, identical key sets, no stray markup | Pass - three plain-text keys per language; no change to `RICH_TEXT_KEYS` |
| Values that appear in more than one place come from `site.json` | Pass - this feature removes the one duplicate (update command in the catalogs) |
| `public/` is generated, not hand-edited | Pass - `npm run build` only |
| A command the site shows must work | Pass - resolution verified ([research.md](research.md) R1); a clean-machine install is the author's pre-publish scenario Q6 |
| Commit, merge, deploy are the author's | Pass - handover only |

Post-design re-check (after Phase 1): unchanged, no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-winget-install/
├── plan.md              # This file
├── research.md          # Phase 0: R1-R7
├── data-model.md        # Phase 1: site.json winget object, catalog keys
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── download-ui.md   # What the generated pages guarantee
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks - not created here
```

### Source Code (repository root)

```text
src/
├── _data/
│   ├── site.json                  # CHANGED - winget.command, + winget.upgradeCommand, available: true
│   └── i18n/
│       ├── en.json                # CHANGED - features.card6Text split (+card6Install,
│       └── cs.json                #           +card6InstallWinget); download.wingetHint → {command}
├── _includes/sections/
│   ├── download.njk               # CHANGED - hint filled from site.winget.upgradeCommand; comment
│   └── features.njk               # CHANGED - card 06 closing sentence chosen by winget.available
├── css/main.css                   # CHANGED - .winget max-width, .winget-hint .mono wrapping; comment
└── js/main.js                     # unchanged - generic copy behaviour from feature 007

tests/
└── site.winget.test.js            # NEW - commands contain --id <id> -e; no command literal in
                                   #       catalogs; card keys in both languages

README.md                          # CHANGED - the note about winget.available
public/                            # REGENERATED - index.html, cs/index.html, css/main.css
```

**Structure Decision**: The existing single static-site layout is kept; no directory is added.
All changes land in files that feature 007 already touched for the same block, plus one test file
next to the existing suites.

## Design

Details and alternatives are in [research.md](research.md); values in
[data-model.md](data-model.md); visible guarantees in
[contracts/download-ui.md](contracts/download-ui.md).

| Requirement | How it is met |
|-------------|---------------|
| FR-001, FR-002 | `winget.available: true` renders the existing block below the installer card on both home pages |
| FR-003, FR-004 | `winget.command` = `winget install --id PavelStupka.TandemCommander -e`, printed in `code#winget-cmd` (R1) |
| FR-005, FR-006 | existing copy script, unchanged (R5) |
| FR-007 | `download.wingetHint` with `{command}` filled from `winget.upgradeCommand`, rendered through `inline` |
| FR-008 | no version-dependent value is used in the block; nothing in the release procedure touches it |
| FR-009, FR-013 | card 06: base text + `card6InstallWinget` or `card6Install`, chosen by `winget.available` (R3) |
| FR-010 | `content/releases/` not touched |
| FR-011, FR-012 | commands only in `site.json`; guarded by `tests/site.winget.test.js` (R2) |
| FR-014 | `.winget` widened to 680 px; the command wraps and never scrolls; the copy button drops below it when they do not fit side by side; hint command may wrap (R4) |
| FR-015 | `npm test`, `npm run build`, `npm run release:check`; `public/` regenerated (R7) |

### Order of work

1. Data: `site.json`, both catalogs.
2. Templates: `download.njk`, `features.njk`.
3. Styles: `main.css`.
4. Test: `tests/site.winget.test.js`.
5. README note.
6. Build, automated checks, generated-output and browser scenarios, withdrawal-switch round trip.
7. Handover with the two manual scenarios (Q6, Q7) that remain the author's.

Steps 1 and 2 must land together: after step 1 alone the build would still pass, but the hint
would show a literal `{command}`.

## Complexity Tracking

No violations; nothing to justify.
