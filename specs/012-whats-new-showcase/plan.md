# Implementation Plan: What's New Showcase (replacing the "Old habits" section)

**Branch**: `012-whats-new-showcase` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-whats-new-showcase/spec.md`

## Summary

Remove the home page's "Old habits, nothing to relearn." section and rebuild "What's new" as a
visual showcase of the **main release X.Y.0** of the current version, placed directly under the
hero. Patch releases X.Y.Z never touch the home page; they live on the release history page.

The approach extends the data layer of feature 007 instead of adding a new one:

- **Main release** - `lib/content.js` derives the X.Y.0 record from `site.json`'s version (build
  fails if it is missing) and validates that, from 0.2.0 on, a patch release never carries a
  feature kind ([research.md](research.md) R1, R2).
- **Showcase model** - a pure function turns the main release and the published gallery into
  *blocks* (highlight + close-up, max 3) and *compact items*; it replaces the retired
  six-card selection (`selectHomeCards`) (R3).
- **Focus area** - a scene may carry `focus: {x, y, width, height}` in capture pixels; the close-up
  is a CSS crop of the **existing full-size capture** (no new images, the viewer reuses the
  cached file), never upscaled, validated against the capture size (R4, R5).
- **Viewer** - the existing PhotoSwipe module gets a second, independent lightbox for the showcase
  (R6).
- **Page structure** - section order hero → What's new (band) → gallery → project → story →
  download; navigation reordered; features section, its texts and its winget test removed; gallery
  lead reworded (R7, R8).
- **Release workflow** - `release:status` reports the home-page effect of a version; the
  `/tandem-new-version` skill states it at the combined review (R9).

## Technical Context

**Language/Version**: JavaScript on Node ≥ 22 (machine runs 24); CommonJS for `lib/content.js` and
`src/_data/*.js`, ES modules for `tools/` and `src/js/` (existing split); Nunjucks templates; CSS

**Primary Dependencies**: none new - Eleventy 3, PhotoSwipe 5 (self-hosted), `sharp` only in the
existing capture tool (not used by this feature)

**Storage**: Committed files - `content/releases/*.json` (unchanged shape),
`content/gallery/scenes.json` (+ optional `focus`), `content/gallery/captures.json` (read only),
`src/_data/i18n/{en,cs}.json`, templates, CSS, generated `public/`

**Testing**: `node --test` (`tests/**/*.test.js`), Eleventy build as publishing gate (i18n parity,
content validation, PAD), `npm run release:verify` over `public/`, visual check in a browser at
1280 px and 360 px

**Target Platform**: Static site on Cloudflare Workers (`wrangler`); evergreen browsers; works
without JavaScript except the enlargement viewer

**Project Type**: Static website (Eleventy, two languages, `src/` → committed `public/`)

**Performance Goals**: Showcase adds ≤ 150 KB of images (today: 2 full captures ≈ 46 KB), all lazy;
no change to hero rendering

**Constraints**: No scrollbars inside boxes; mobile breakpoint 860 px; no horizontal scroll at
360 px; close-ups never upscaled and ≥ 75 % of native size at desktop width; every visible string in
both catalogs with identical keys; `public/` changed only by `npm run build`

**Scale/Scope**: 2 languages, 12 release records, 12 scenes (10 published), 2 focus areas now;
1 section removed, 1 section rebuilt, ~10 files touched in `src/`, 3 in `lib/`/`tools/`, 4 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so it defines no gates. The
project's standing rules are applied instead:

| Gate | Status |
|------|--------|
| Every feature on its own `NNN-name` branch; never commit to the main line | Pass - work happens on `012-whats-new-showcase` |
| `public/` is generated, not hand-edited | Pass - `public/` changes only through `npm run build` |
| Values that appear in more than one place come from `site.json` / content files | Pass - the main release is derived from `site.json`'s version; close-up geometry from `scenes.json` + `captures.json`; nothing duplicated in templates |
| Every user-visible string in the i18n catalogs, identical key sets | Pass - removed keys disappear from both catalogs; new keys (`whatsNew.alsoIn`, `whatsNew.closeupLabel`) added to both; parity stays a build gate |
| Invalid content fails the build with a message naming the item | Pass - missing X.Y.0 record, patch with a feature kind, and invalid focus areas all throw from `lib/content.js` |
| A release can be done without the assistant, with identical gates | Pass - the home-page effect is computed by `release:status`; the skill only reports it |
| No scrollbars inside UI boxes; long text wraps | Pass - blocks and compact items are plain flow content, no fixed heights |
| Commit, merge, deploy are the author's | Pass - nothing is committed without approval |

Post-design re-check (after Phase 1): unchanged, no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/012-whats-new-showcase/
├── spec.md              # Feature specification (clarified 2026-11-08)
├── plan.md              # This file
├── research.md          # Phase 0 - decisions R1-R10
├── data-model.md        # Phase 1 - main release, showcase, focus area, validation rules
├── quickstart.md        # Phase 1 - validation guide
├── contracts/
│   ├── showcase-ui.md   # Home-page "What's new" markup, behaviour, texts
│   └── content-rules.md # New/changed content rules (S1-S4, F1-F4) and release:status output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks - not created here)
```

### Source Code (repository root)

```text
lib/
└── content.js                     # + mainVersionOf, selectMainRelease, buildShowcase,
                                   #   focus validation, patch-kind rule; - selectHomeCards

src/
├── index.njk, cs/index.njk        # section order; features include removed
├── _data/
│   ├── releases.js                # exposes releases.main and releases.showcase
│   └── i18n/{en,cs}.json          # - features.*; ~ whatsNew.lead, gallery.lead; + whatsNew.alsoIn,
│                                  #   whatsNew.closeupLabel
├── _includes/sections/
│   ├── features.njk               # deleted
│   ├── whats-new.njk              # rebuilt: main-release head, blocks, compact items, history link
│   ├── header.njk, footer.njk     # navigation order
│   └── gallery.njk                # unchanged markup (lead text only via i18n)
├── css/main.css                   # + showcase styles; - .card-grid--features/.card-grid--news
└── js/
    ├── main.js                    # loads gallery.js when [data-gallery] or [data-showcase] exists
    └── gallery.js                 # one lightbox per container (gallery, showcase)

content/gallery/scenes.json        # + focus for quick-search, tabs-configuration

tools/release/release.mjs          # status: "home page" line (+ JSON field)
.claude/skills/tandem-new-version/SKILL.md   # Stop 2 states the home-page effect

tests/
├── content.records.test.js        # home-card tests → main-release/showcase/patch-kind tests
├── content.gallery.test.js        # + focus-area tests
├── content.showcase.test.js       # new: buildShowcase cases
└── site.winget.test.js            # - card 06 test
```

**Structure Decision**: Single static-site project; the feature touches the existing layers in
place - content rules in `lib/content.js`, data exposure in `src/_data/`, presentation in
`src/_includes/` + CSS + `src/js/`, release tooling in `tools/release/` and the skill. No new
directories outside `specs/`.

## Complexity Tracking

No violations - nothing to justify.
