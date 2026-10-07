# Implementation Plan: Website Release for Tandem Commander 0.1.9

**Branch**: `009-release-0-1-9` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-release-0-1-9/spec.md`

## Summary

Bring the published Tandem Commander 0.1.9 (build 193, 2026-10-07) onto the website. No code is
written: the feature is one run of the release procedure built by feature 007
(`specs/007-release-news-gallery/contracts/release-cli.md`), extended by the clarified decision
that the five pictures displaying the version number are re-captured before the release counts as
done.

The work is content and regeneration, in this order: confirm the release facts → write the
approved bilingual digest into `content/releases/0.1.9.json` → re-capture the five version-bearing
scenes from the published installer inside Windows Sandbox → regenerate `public/` and pass
`npm run release:check` with an empty *must re-capture* list → hand over to the author for
preview, commit, merge and deployment.

## Technical Context

**Language/Version**: No new code. Existing tooling: JavaScript on Node ≥ 22 (machine runs
24.19), Eleventy 3 with Nunjucks, Windows PowerShell 5.1 guest driver for captures

**Primary Dependencies**: Eleventy 3 (site generation) · `tools/release/release.mjs` (facts, apply,
check) · `tools/screenshots/capture.mjs` with `sharp` (capture and WebP post-processing) · Windows
Sandbox (present: `C:\Windows\System32\WindowsSandbox.exe`) · GitHub REST API, unauthenticated
(release facts, installer download)

**Storage**: Committed files - `src/_data/site.json`, `content/releases/0.1.9.json`,
`content/gallery/captures.json`, images under `src/assets/gallery/` and the two permanent
`src/assets/screenshot-*.png`, generated `public/` (committed, never edited by hand)

**Testing**: `npm run release:check` = `node --test` suites (`tests/content.records.test.js`,
`content.gallery.test.js`, `content.stale.test.js`, `release.changelog.test.js`) + Eleventy build
gates + stale-image report; manual scenarios in [quickstart.md](quickstart.md)

**Target Platform**: Static site on Cloudflare Workers static assets (unchanged); tooling on the
author's Windows 11 Pro machine

**Project Type**: Static website - a content release, no feature development

**Performance Goals**: Inherited from feature 007: every gallery image ≤ 300 KB (enforced by the
capture post-processing, exit code 3), light and dark main-window images of equal size

**Constraints**: the digest is recorded exactly as approved (whole digest approved 2026-10-07) ·
`public/` only regenerated, never hand-edited · the application repository is read-only · captures
only from the published, signature-verified installer inside the Sandbox, never from the local
installation · the `/pad.xml` and `/assets/screenshot-light.png` addresses are permanent · no
commit to `main`/`devel`, no merge, no deployment by the assistant · permanent site texts and the
scene catalog are not edited (FR-017, FR-018)

**Scale/Scope**: 1 release record (2 languages, 1 summary, 6 highlights) · 3 fact values in
`site.json` (already applied) · 5 scenes re-captured (10 WebP files, 2 PNG files, 5 entries in
`captures.json`) · about 10 regenerated files under `public/` plus the images

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template - it defines no principles, so
there are no constitutional gates to evaluate. The project's standing rules, taken from the
release skill, the screenshot README and the author's recorded instructions, are applied as gates
instead:

| Gate | Status |
|------|--------|
| Every feature on its own `NNN-name` branch; never commit to `main` | Pass - branch `009-release-0-1-9` |
| Nothing written before the author approves the digest | Pass - the whole digest was approved on 2026-10-07; the record is still the empty skeleton |
| `public/` is generated, not hand-edited | Pass - only `npm run build` via `release:check` |
| Application repository read-only | Pass - only `CHANGELOG.md` is read |
| Captures only inside Windows Sandbox from the published installer | Pass - `npm run shots` enforces it |
| Commit, merge, deploy are the author's | Pass - handover only |

Post-design re-check (after Phase 1): unchanged, no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-release-0-1-9/
├── plan.md              # This file
├── research.md          # Phase 0: facts verified, decisions R1-R7
├── data-model.md        # Phase 1: the files that change and their rules
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── digest-0.1.9.md  # The exact digest text and its approval status
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

Files this release touches. Nothing else is edited.

```text
src/_data/site.json                    # version, releaseDate, installerSizeBytes - already 0.1.9
content/releases/0.1.9.json            # skeleton exists; receives kind, summary, highlights
content/gallery/captures.json          # 5 entries move to appVersion 0.1.9 (written by the tool)
src/assets/gallery/
├── main-window-light{,-640}.webp      # re-captured
├── dark-theme-dark{,-640}.webp        # re-captured
├── panel-tabs-light{,-640}.webp       # re-captured
├── unicode-long-paths-light{,-640}.webp
└── thumbnails-light{,-640}.webp
src/assets/screenshot-light.png        # regenerated from main-window (permanent address)
src/assets/screenshot-dark.png         # regenerated from dark-theme
public/                                # regenerated as a whole by the build

.work/                                 # git-ignored: installer cache, Sandbox job, changelog excerpt
```

Not touched: `content/gallery/scenes.json`, `src/_data/i18n/*.json`, `src/pad.njk`, templates,
styles, scripts, `tools/`, `lib/`, `tests/`.

**Structure Decision**: The existing layout of feature 007 is used as it is. This feature adds no
directory and no source file; it changes data files and regenerates derived output.

## Phase 0: Research

Complete - see [research.md](research.md). No NEEDS CLARIFICATION remains. Findings that shape the
tasks:

- The facts are verified against the published release and the installer's signature is valid.
- The version facts and the record skeleton are already in the working tree; `release:apply` is
  idempotent and is run once more only to confirm it changes nothing.
- The scenes that must be re-captured are exactly the five with `showsVersion: true`; the three
  others are reported as older.
- The capture needs Windows Sandbox and the published installer, not a local installation - the
  spec's assumption was corrected.
- The capture opens a Sandbox window on the author's desktop for several minutes; it is started
  only with the author's go-ahead.

## Phase 1: Design

Complete - see [data-model.md](data-model.md), [contracts/digest-0.1.9.md](contracts/digest-0.1.9.md)
and [quickstart.md](quickstart.md).

Order of work for `/speckit-tasks`:

1. **Approve** the digest (author) - done on 2026-10-07.
2. **Record**: `npm run release:apply -- 0.1.9` (expect no change), then write the digest from the
   contract into `content/releases/0.1.9.json`.
3. **First check**: `npm run release:check` - tests and build must pass; the *must re-capture* list
   is expected to name the five scenes.
4. **Re-capture** (author's go-ahead): `npm run shots -- --version 0.1.9 --scene
   main-window,dark-theme,panel-tabs,unicode-long-paths,thumbnails`; exit code 0 required.
5. **Review pictures**: each re-captured image is looked at - title bar reads 0.1.9, nothing else
   changed unexpectedly; differences beyond the version number go to the author.
6. **Final check**: `npm run release:check` - passes, *must re-capture* is empty, three scenes
   listed as older.
7. **Verify output** against quickstart.md and **hand over**.

## Complexity Tracking

No violations - nothing to justify.
