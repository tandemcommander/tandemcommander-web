# Implementation Plan: Release-Driven Website Content and Feature Gallery

**Branch**: `007-release-news-gallery` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-release-news-gallery/spec.md`

## Summary

The website still describes Tandem Commander 0.1.0 although 0.1.8 is current. This feature
(1) rewrites the site's content for 0.1.8, (2) replaces the four fixed "What's new" slots with
**release records** - one JSON file per version, bilingual, validated at build time - from which
the home page cards, a new release-history page and the PAD change-info are all derived, plus a
two-layer **release procedure** (a dependency-free Node script for facts, recording and checks; a
repository skill through which an assistant drafts the bilingual digest for the author's
approval), and (3) introduces a **scene catalog** that drives both a gallery (4-6 featured items
on the home page, a full gallery page) and a repeatable **screenshot pipeline**.

The decisive research finding: the application's `-C` option *imports* a configuration into the
author's registry instead of isolating one, and the program has no separate configuration store.
Isolation therefore comes from the operating system - scenes are captured inside **Windows
Sandbox**, where the pipeline installs the officially published installer, seeds the disposable
guest account's configuration per scene, drives the program by keyboard through a small
declarative step language, and hands lossless PNGs back to the host for WebP post-processing.
The spec was amended accordingly (research finding, FR-026a/b, FR-027). See
[research.md](research.md) R1.

## Technical Context

**Language/Version**: JavaScript - Node ≥ 22 (author's machine runs 24; CommonJS for Eleventy
config/data to match the repo, ES modules for new standalone tools) · Nunjucks templates · CSS ·
browser JavaScript (ES2017, no build step) · Windows PowerShell 5.1 with inline C# (P/Invoke) for
the Sandbox guest driver

**Primary Dependencies**: Eleventy 3 (existing) · `sharp` (new devDependency, capture
post-processing only - never in the site build or deploy path) · Windows Sandbox (OS feature) ·
Microsoft Edge headless (social image) · GitHub REST API (unauthenticated, release facts).
No front-end library is added.

**Storage**: Committed JSON files - `content/releases/*.json`, `content/gallery/scenes.json`,
`content/gallery/captures.json`; images under `src/assets/gallery/`; generated `public/` stays
committed (existing rule)

**Testing**: `node --test` (built-in, new `npm test`) for pure logic in `lib/` and `tools/release/`;
build gates (throw → failed build) for content integrity; manual scenarios in
[quickstart.md](quickstart.md) for UI, accessibility, performance and the Windows-side pipeline

**Target Platform**: Static site on Cloudflare Workers static assets (unchanged). Tooling runs on
the author's Windows 11 Pro machine; the capture guest is Windows Sandbox

**Project Type**: Static website + repository tooling (CLI scripts and one assistant skill)

**Performance Goals**: SC-006 - first screen readable < 2 s on broadband; ≤ 130 KB of images before
first scroll on home; < 1 MB of images on home in total; every gallery image ≤ 300 KB; zero
image-induced layout shift. SC-005 - full automated capture < 10 min. SC-002 - website release
< 15 min of author time

**Constraints**: all user-visible text in EN and CS with build-enforced parity · `public/` never
hand-edited · `/pad.xml` and `/assets/screenshot-light.png` addresses permanent · pages work
without scripting · the author's application settings are never read, shown or modified ·
capture only from the published, signature-verified installer · no application change · nothing
in this feature commits to `main` or deploys

**Scale/Scope**: 3 pages × 2 languages (was 1 × 2) · 9 backfilled release records · 16 scenes
defined, ≥ 10 published (≈ 24 images × 2 variants) · ~60 new i18n keys per language · 2 new
templates, 3 rewritten sections, lightbox extension · 1 host orchestrator, 1 guest driver, 1
release CLI, 1 skill, 1 style guide

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template - it defines no principles, so
there are no formal gates. The project's *de-facto* rules (README, prior specs 001-006, the
author's standing instructions) are used as the gate instead:

| # | Rule | Pre-research | Post-design |
|---|------|--------------|-------------|
| 1 | Sources in `src/`; `public/` is generated, committed, never hand-edited | PASS | PASS - new pages are templates; images are committed sources under `src/assets/gallery/` |
| 2 | Shared values only in `src/_data/site.json` | PASS | PASS - `release apply` is its single writer during a release; records must agree with it (gate V3/V4) |
| 3 | All user-visible text in the i18n catalogs, parity enforced by the build | **Deviation** | **Justified** - see Complexity Tracking: list-shaped content moves to `content/`, under the *same* parity guarantee |
| 4 | Inconsistent data fails the build (i18n, PAD precedent) | PASS | PASS - extended to records, scenes, captures |
| 5 | No build step on deploy; deploy path stays dependency-light | PASS | PASS - `sharp` is used only by `npm run shots`; Eleventy build does no image work |
| 6 | Permanent public addresses (`/pad.xml`, PAD screenshot) | PASS | PASS - FR-023 kept by regenerated PNG at the same path; `#screens` anchor aliased |
| 7 | One feature = one branch; never commit to `main`; merge/deploy is the author's | PASS | PASS - branch `007-release-news-gallery`; tools never commit, push or deploy |
| 8 | Self-hosted, no third-party runtime requests, no tracking | PASS | PASS - no CDN, no library, no external fetch from pages |
| 9 | Accessible, works without scripting, 860 px breakpoint shared by CSS and JS | PASS | PASS - contracts/pages-ui.md |

**Gate result**: PASS with one justified deviation. No unresolved NEEDS CLARIFICATION.

*Recommendation outside this feature*: run `/speckit-constitution` to write rules 1-9 down - three
features in a row have had to reconstruct them.

## Project Structure

### Documentation (this feature)

```text
specs/007-release-news-gallery/
├── spec.md                      # amended in plan phase (R1 correction, FR-026a/b, FR-027)
├── plan.md                      # this file
├── research.md                  # Phase 0 - R1-R14
├── data-model.md                # Phase 1 - ReleaseRecord, Scene, Capture, DemoWorkspace
├── quickstart.md                # Phase 1 - commands + validation scenarios V1-V5
├── contracts/
│   ├── release-record.md        # record format, validation V1-V11, derived outputs
│   ├── scene-catalog.md         # scene format, step vocabulary, orchestrator CLI, guest result
│   ├── release-cli.md           # release:facts / apply / check + /release-web skill obligations
│   └── pages-ui.md              # URLs, page structure, gallery viewer behaviour, budgets
├── checklists/requirements.md
└── tasks.md                     # created by /speckit-tasks
```

### Source Code (repository root)

```text
content/                               # NEW - structured, list-shaped content (not Eleventy input)
├── releases/
│   ├── 0.1.0.json … 0.1.8.json        # backfilled release records
└── gallery/
    ├── scenes.json                    # ordered scene catalog (hand-edited)
    └── captures.json                  # capture manifest (tool-written)

lib/
└── content.js                         # NEW - pure logic shared by build, tools and tests:
                                       #   load + validate records/scenes/captures, version order,
                                       #   homeCards, padChangeInfo, staleness, inline-code markup

src/
├── _data/
│   ├── releases.js                    # NEW - Eleventy data from lib/content.js (throws on invalid)
│   ├── gallery.js                     # NEW - published scenes + image facts, featured subset
│   ├── pad.js                         # CHANGED - change-info from releases.padChangeInfo
│   ├── site.json                      # unchanged shape
│   └── i18n/{en,cs}.json              # CHANGED - see data-model §6
├── _includes/
│   ├── layout.njk                     # CHANGED - pagePath in canonical/hreflang/og:url, per-page meta
│   ├── components/
│   │   ├── gallery-card.njk           # NEW - figure + theme-matched images + caption
│   │   └── gallery-viewer.njk         # NEW - the extended <dialog> (moved out of screens.njk)
│   └── sections/
│       ├── gallery.njk                # NEW - replaces screens.njk (featured items)
│       ├── whats-new.njk              # REWRITTEN - current-release line + homeCards
│       ├── download.njk               # CHANGED - winget block, disclaimer
│       ├── header.njk, footer.njk     # CHANGED - nav label/targets, links to new pages
│       ├── hero.njk, features.njk     # text keys only
│       └── screens.njk                # REMOVED
├── pages/
│   ├── gallery.njk                    # NEW - paginated over languages → /gallery/, /cs/gallery/
│   └── releases.njk                   # NEW - → /releases/, /cs/releases/
├── sitemap.njk                        # NEW - replaces static src/root/sitemap.xml
├── assets/
│   ├── gallery/<scene>-<theme>.webp, -640.webp   # NEW - committed capture output
│   ├── screenshot-light.png, screenshot-dark.png # REGENERATED at the same paths (PAD)
│   └── og-image.png                   # REGENERATED
├── css/main.css                       # CHANGED - gallery grid, cards, viewer chrome, release list, winget
└── js/main.js                         # CHANGED - viewer group/next/prev/swipe, copy button

tools/
├── release/
│   ├── release.mjs                    # NEW - facts | apply | check
│   ├── changelog.mjs                  # NEW - parse "## [x.y.z] - date" sections
│   └── DIGEST-STYLE.md                # NEW - editorial contract for digests
├── screenshots/
│   ├── capture.mjs                    # NEW - host orchestrator (preflight, .wsb, poll, post-process)
│   ├── postprocess.mjs                # NEW - sharp: WebP variants, limits, PAD PNG copies, contact sheet
│   ├── capture-window.ps1             # NEW - manual-host helper (resize + PrintWindow)
│   ├── guest/
│   │   ├── run.ps1                    # NEW - install, build workspace, scene loop, result.json
│   │   ├── Win32.cs                   # NEW - P/Invoke: PrintWindow, DWM bounds, SendInput, SetWindowPos
│   │   ├── steps.ps1                  # NEW - step vocabulary
│   │   └── manual-helper.ps1          # NEW - always-on-top steps window with Capture / Skip
│   ├── demo/
│   │   ├── files/**                   # NEW - committed demo content
│   │   ├── workspace.json             # NEW - generated items + fixed timestamps
│   │   ├── base-config.reg            # NEW - first-run config exported inside the Sandbox
│   │   └── LICENSES.md                # NEW - third-party demo content
│   └── README.md                      # NEW - how to add a scene / re-capture (FR-033)
└── og-image/
    ├── og.html                        # NEW - social image template
    └── render.mjs                     # NEW - headless Edge screenshot

tests/
├── content.records.test.js            # NEW - validation V1-V11, ordering, homeCards, padChangeInfo
├── content.gallery.test.js            # NEW - G1-G7, staleness
├── release.changelog.test.js          # NEW - parser against real 0.1.0-0.1.8 sections (fixture copy)
└── fixtures/                          # NEW - broken records/catalogs, CHANGELOG excerpt

.claude/skills/release-web/SKILL.md    # NEW - assistant layer of the release procedure
.work/                                 # NEW, git-ignored - installer cache, Sandbox job/output, changelog excerpts
eleventy.config.js                     # CHANGED - inline-code filter, watch targets for content/, TC_CONTENT_DIR override
package.json                           # CHANGED - scripts: test, release:*, shots, og; devDependency sharp
README.md                              # CHANGED - release and screenshot procedures rewritten (FR-013, FR-033)
.gitignore                             # CHANGED - .work/
```

**Structure Decision**: The existing single-project layout is kept and extended along its own
seams: templates and fixed texts stay in `src/`, tooling goes to a new `tools/`, list-shaped
content to a new `content/`, and the one module all three share to `lib/`. The boundary that
matters is that **the site build depends only on `content/`, `lib/` and `src/`** - never on
`tools/`, Windows, Sandbox, the network or `sharp` - so deploys stay as simple as today.

## Implementation Approach

Ordered so that every stage ends in something shippable, matching the spec's priorities.

**Stage A - Content foundation (US2 core, enables US1 and US5).** `lib/content.js` with tests;
`content/releases/` backfilled for 0.1.0-0.1.8 (digests written from the application changelog,
following the style guide that is drafted at the same time); `releases.js` data + build gates;
`pad.js` switched to `padChangeInfo`. At this point the old `whatsNew.entry*` keys are dead.

**Stage B - Home page catch-up (US1).** Rewritten "What's new" section, hero/features/meta/PAD
texts in both languages, winget block and disclaimer in the download section. Shippable on its own
with the two existing screenshots still in place - the P1 outcome does not wait for the gallery.

**Stage C - Release history + routing (US5, part of US2).** `pagePath` in the layout, paginated
`releases.njk`, generated sitemap, footer/nav links, language switcher on sub-pages.

**Stage D - Release procedure (US2).** `release.mjs` (`facts`, `apply`, `check`), changelog
parser, `DIGEST-STYLE.md`, the `/release-web` skill, README rewrite. Validated by replaying 0.1.8.

**Stage E - Capture spike (US4 gate).** Minimal orchestrator + guest driver: install, one main
window scene, one WebView2 scene. Decides between the primary path and the R2 fallbacks *before*
any further screenshot work. Requires the author to enable Windows Sandbox.

**Stage F - Capture pipeline (US4).** Demo workspace + manifest, base configuration, step
vocabulary, all `auto` scenes, post-processing, capture manifest, contact sheet, manual helpers,
`tools/screenshots/README.md`.

**Stage G - Gallery (US3).** `gallery.js` data + gates, card and viewer components, home section
replacing `screens.njk`, full gallery page, theme-matched images, viewer navigation, highlight →
scene links, PAD PNGs and social image regenerated. The catalog gate (≥ 10 published scenes with
images) is switched on here, once Stage F has produced them.

**Stage H - Validation.** quickstart V1-V5, performance and accessibility passes, README final.

Stages A-D need nothing from Windows Sandbox and can be completed and merged first if the author
wants the P1 outcome live early; E-G follow on the same branch or a continuation of it.

## Risks

| Risk | Mitigation |
|------|------------|
| Windows Sandbox cannot capture (PrintWindow / WebView2 / DPI) | Stage E spike with decided fallbacks (research R2); last resort: dedicated local account (R1) - a contained change to the orchestrator, the scene catalog and guest driver are unaffected |
| Author does not want to enable Sandbox / reboot | Stages A-D deliver US1, US2, US5 without it; gallery can launch from `manual-host`-style captures at the cost of FR-027's guarantee - a decision for the author, not taken here |
| Keyboard-driven scenes are flaky | condition waits + `settle`, per-scene retry once, failure evidence image, failed scenes keep previous images (exit code 2) |
| Digest quality varies between releases/assistants | `DIGEST-STYLE.md` + nine worked examples + mandatory author approval |
| Record/scene text limits too tight for Czech | limits are constants in `lib/content.js`; backfill of nine releases in both languages is the calibration run |
| Public SFTP test server disappears | scene is manual by design; any server name the author is willing to publish works; scene may stay unpublished |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| User-visible text outside the i18n catalogs (`content/releases/*.json`, `content/gallery/scenes.json`) | Release highlights and scenes are lists of variable length that grow with every release; each item's two language versions must be reviewed and edited together | Keeping them as numbered catalog keys (`whatsNew.entry7Title`) is the fixed-slot structure the spec identifies as the root cause of eight releases without a content update; the loader applies the identical guarantee (exact language set, non-empty) so no protection is lost |
| A second scripting stack (PowerShell 5.1 + inline C#) beside Node | The capture driver must run inside a pristine Windows Sandbox, which has no Node, Python or any other runtime | Installing a runtime into the guest on every run needs network access and minutes of setup, and defeats the offline, deterministic run; PowerShell is also what the application repository's release tooling already uses |
| New top-level folders `content/`, `lib/`, `tools/`, `tests/` | Keeps the deploy-critical build (`src/` + `content/` + `lib/`) separable from Windows-only tooling | Putting tools under `src/` makes Eleventy walk them and blurs "what ships"; putting content under `src/_data/` makes Eleventy auto-load dotted file names as nested keys and leaves validation without a home |
