# Research: What's New Showcase

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-08

The spec left no `NEEDS CLARIFICATION` (five answers recorded on 2026-11-08). The decisions below
resolve the technical unknowns of the plan. Findings come from the current code: `lib/content.js`,
`src/_data/{releases,gallery}.js`, `src/_includes/sections/*.njk`, `src/_includes/components/
gallery-card.njk`, `src/js/{main,gallery}.js`, `src/css/main.css`, `tools/release/*.mjs`, the
`/tandem-new-version` skill and the tests.

## R1 - Which record is the "main release"

**Decision**: `mainVersionOf(v) = "X.Y.0"` for site version `X.Y.Z`. `loadReleases` returns
`main` = the record with that version; if it is missing the build throws
`releases: no record for main release X.Y.0 (current version X.Y.Z) - …`. `current` keeps its
meaning (newest record = `site.json` version) for the PAD change info, the release page's
"current" chip and `release:verify`.

**Rationale**: The author defined the rule by version number, not by content ("X.Y.Z, kde se mění
pouze Z, jsou bug fixy"). A pure version rule is predictable, testable and needs no new field in the
records. Keeping `current` untouched means the PAD file, the history page and the verification keep
working unchanged (FR-024).

**Alternatives considered**: *Newest release with screenshot-backed highlights* (the pre-clarify
spec) - rejected by the author's answer: a patch must not change the home page, and a main release
without scenes must not fall back to an older one. *An explicit `main: true` flag in records* -
redundant with the version number and one more thing to forget.

## R2 - Enforcing "patches are bug fixes only"

**Decision**: New rule in `validateRecord`/`loadReleases`: for versions ≥ 0.2.0 with Z > 0 the
`kind` must be `bugfix`, `maintenance` or `installer` (not `first` or `feature`). Records before
0.2.0 are exempt - in the 0.1.x line, patch numbers carried features (0.1.3, 0.1.6, 0.1.8, 0.1.9 are
`feature`), and history is not rewritten. The release history page already prints the kind label
("Bug-fix release", "Maintenance release", …) next to every version, so with this rule FR-014
("patches distinguishable at a glance") is met without new markup.

**Rationale**: Turns the author's release policy into a gate the skill and manual releases cannot
miss; a mis-kinded patch would otherwise silently hide new features from the home page.

**Alternatives considered**: *A new "patch" badge on the history page* - duplicates the kind label.
*Relabel 0.1.x records* - rewrites published history for no visitor benefit.

## R3 - Showcase model and the retired six-card selection

**Decision**: Pure function `buildShowcase(mainRecord, gallery)` in `lib/content.js` returning
`{ version, date, summary, blocks: [...], compact: [...] }`:

1. Walk `mainRecord.highlights` in order.
2. A highlight becomes a **block** when its `scene` is a published scene with images, that scene is
   not yet used by an earlier block, and fewer than `SHOWCASE_MAX_BLOCKS = 3` blocks exist.
3. Every other highlight becomes a **compact item**; it carries the scene's images when it has a
   published scene (for the "See it" control), otherwise none.
4. Without captures (`gallery.hasCaptures === false`) every highlight is compact (FR-016).

`selectHomeCards`, `HOME_CARD_COUNT` and `releases.homeCards` are removed with their tests
(FR-015). `src/_data/releases.js` already loads the gallery; it passes it to `buildShowcase` and
exposes `releases.main` and `releases.showcase`.

**Rationale**: Mirrors the existing split (pure logic in `lib/`, thin data files), so all edge cases
of the spec (cap, duplicate scene, unpublished scene, no captures) are unit-testable without a
build.

**Alternatives considered**: *Computing blocks in Nunjucks* - untestable and duplicates rules.
*Keeping `homeCards` for a future use* - dead code; the release page does not use it.

## R4 - How a close-up is produced

**Decision**: CSS crop of the existing **full-size** capture. The template renders a frame with
`aspect-ratio = focus.width / focus.height` and `max-width = focus.width px` (never upscaled); the
`<img>` inside is absolutely positioned with width `captureWidth / focus.width × 100 %` and offsets
`-x / focus.width × 100 %` (left) and `-y / focus.height × 100 %` (top). The four numbers are
precomputed in `lib/content.js` and passed as CSS custom properties in a `style` attribute (the site
sends no Content-Security-Policy, so inline style attributes are allowed). Without a focus area the
frame shows the whole capture (`focus = {0, 0, width, height}`).

**Rationale**: No new image files, no change to the capture pipeline, and focus areas survive the
0.3.0 re-capture because they are stored in capture pixels and every scene has a fixed window size.
Full captures are small (15-27 KB, `thumbnails` 138 KB is not in the showcase), and the viewer opens
the *same* file, so enlarging costs nothing. 0.2.0 adds ≈ 46 KB (SC-005: ≤ 150 KB).

**Alternatives considered**: *Pre-cropped files made by `sharp`* - either a build-time step (slower
builds, generated files in `src/`) or a capture-time step (changing a focus area would need a
re-run of the capture tool); smaller bytes, but the viewer would then load a second file.
*`object-view-box`* - not supported in Firefox/Safari. *Scaling the 640 px card image* - too blurry
for UI text.

## R5 - Legibility limits for focus areas

**Decision**: Layout: a block is a two-column grid inside `.section-inner` (1160 px) - text
`5fr`, picture `7fr`, gap 48 px - so the picture column is ≈ 649 px on a 1280 px window. The
close-up is shown at `min(column, focus.width)` px. Validation (build fails, naming scene and
problem):

| Rule | Value | Why |
|------|-------|-----|
| F1 integers, `x, y ≥ 0`, `width, height > 0` | - | shape |
| F2 `x + width ≤ captureWidth`, `y + height ≤ captureHeight` for every theme of the scene | - | inside the screenshot |
| F3 `width ≥ 320`, `height ≥ 120` | min | a smaller area is not a meaningful close-up |
| F4 `width ≤ 840` | max | 649 / 840 = 0.77 ≥ 0.75 → SC-003 at 1280 px |

**Rationale**: Never upscaling removes blur; the maximum keeps the 75 % legibility promise at the
reference desktop width. Below 860 px the close-up fills the column (smaller than native - accepted
by the spec, SC-003 is a desktop criterion; the viewer is one tap away).

**Alternatives considered**: *Percent coordinates* - harder to measure from a screenshot, and
pixel areas stay valid at a fixed window size anyway. *Allow upscaling to 1.5×* - visibly soft UI
text.

**Initial focus areas** (measured on the 0.2.0 captures, 1200 × 800; to be confirmed visually
during implementation):

| Scene | Focus `{x, y, width, height}` | Shows |
|-------|-------------------------------|-------|
| `quick-search` | `{0, 100, 600, 160}` | left panel's tab, directory line "Search: chat (3 of 12)" and the three matching rows |
| `tabs-configuration` | `{256, 156, 692, 488}` | the Configuration dialog with the Tabs page and its shortcut table |

## R6 - Opening the viewer from close-ups

**Decision**: Refactor `src/js/gallery.js` into `openLightbox(containerSelector)` and create one
PhotoSwipe lightbox for `[data-gallery]` and one for `[data-showcase]` (children: every
`a[data-pswp-width]` inside). `main.js` imports the module when either container exists. The
close-up and the compact "See it" control are ordinary links to the full image with the same
`data-pswp-*` attributes as gallery cards, so without JavaScript they open the picture in a new tab
(FR-017). PhotoSwipe returns focus to the opening element on close (`returnFocus` default), which
covers FR-011. The viewer strings element stays in `gallery-viewer.njk`; it is moved out of the
gallery section into the page so the showcase does not depend on the gallery's position.

**Rationale**: Reuses the existing, accessible viewer; two lightboxes keep showcase arrows from
paging into the gallery's ten pictures.

**Alternatives considered**: *One lightbox over both containers* - the arrows would mix the
showcase and gallery sets. *Linking close-ups to the gallery anchor* (as the old "See it →") - the
author asked for visual communication in place.

## R7 - Page order, backgrounds, navigation

**Decision**: `src/index.njk` and `src/cs/index.njk`: hero → whats-new → gallery → project → story →
download. `whats-new.njk` gets `class="section band section--roomy"` (as `project`), the order of
backgrounds becomes hero / band / plain / band / plain(divided) / download. Header, mobile menu and
footer list *What's new, Gallery, Project, Download*.

**Rationale**: Clarification Q1. The band class is exactly what the removed section had.

## R8 - Removing the features section without losing content

**Decision**: Delete `features.njk`, its includes, all `features.*` keys in both catalogs, the CSS
`.card-grid--features` and the card-06 test in `tests/site.winget.test.js` (the winget command test
stays). Coverage of the removed subjects (FR-002), checked against current texts:

| Subject | Still on the home page in |
|---------|---------------------------|
| two panels + tabs | hero lead; gallery `main-window`, `panel-tabs` |
| keyboard-first, function keys | hero lead ("funkční klávesové zkratky" / "function keys"), footer tagline |
| Command Shell key | gallery `command-shell` |
| Unicode, long paths | hero lead; gallery `unicode-long-paths` |
| viewers on F3 | hero lead; gallery `code-viewer`, `markdown-viewer` |
| SFTP, cloud sync badges | hero lead |
| settings import from Salamander | What's new 0.2.0 (compact items) |
| winget | download section |

The import is covered only by the 0.2.0 digest. When 0.3.0 replaces it on the home page, the
subject disappears unless 0.3.0 keeps it (e.g. the planned import scene). `quickstart.md` lists
this as a check for the 0.3.0 website update; no extra text is added now.

Gallery lead (FR-003), proposed:

- EN: "The classic light look is still the default, and the dark theme keeps the same layout and
  information density. Below: the program at work."
- CS: "Výchozí zůstává klasický světlý vzhled a tmavý motiv má stejné rozložení i hustotu
  informací. Níže program při práci."

**Rationale**: FR-001-FR-003; no new section is created to compensate.

## R9 - Release workflow: telling the author the home-page effect

**Decision**: `releaseStatus(version)` gains `homePage`:
`{ main: "0.2.0", isPatch: false, blocks: ["quick-search", "tabs-configuration"], compact: 4,
noFocus: [] }` - for a patch `{ main: "0.2.0", isPatch: true }`. `release:status` prints one line
(`home page  0.2.0 - 2 blocks (quick-search, tabs-configuration), 4 compact` or
`home page  unchanged - patch of 0.2.0`). The skill's Stop 2 gets item 6: the home-page effect
(patch → "What's new stays unchanged"; main → which highlights become blocks, which have no scene,
which scenes lack a focus area), derived from the drafted digest with the same rules, and confirmed
by `release:status` after the record is written.

**Rationale**: FR-023, while keeping the rule in one place (`buildShowcase`) so the CLI and the
build cannot disagree.

**Alternatives considered**: *Only text in the skill* - the rule would be restated in prose and
drift from the code.

## R10 - Texts

**Decision** (final wording approved by the author during implementation, both languages):

| Key | EN | CS |
|-----|----|----|
| `whatsNew.lead` (changed) | "What the current version brought - shown in the program. Every earlier release is in the release history." | "Co přinesla aktuální verze - ukázané přímo v programu. Všechna dřívější vydání najdete v historii vydání." |
| `whatsNew.currentLine` (kept) | "Version {version} · {date}" | "Verze {version} · {date}" |
| `whatsNew.alsoIn` (new) | "Also in {version}" | "Také ve verzi {version}" |
| `whatsNew.closeupLabel` (new) | "view the full screenshot" | "zobrazit celý screenshot" |
| `whatsNew.seeIt` (kept; history page + compact items) | "See it →" | "Ukázka →" |
| `whatsNew.allReleases` (kept, styled as a button-like link) | "All releases →" | "Všechna vydání →" |
| `gallery.lead` (changed) | see R8 | see R8 |
| `features.*` | removed | removed |

## R11 - Revision after the author's implementation review (2026-11-08)

**Decision**: R4 (CSS close-up crop), R5 (focus-area limits) and the alternating layout are
**withdrawn**. Each novelty with a picture is one panel: text left, picture right, the picture
rendered by the gallery's own macro (`galleryShots` in `gallery-card.njk`) in a column of the
gallery's width - so it is exactly a gallery picture (545 × 364 at 1280 px). The `focus` field,
its validation, the close-up geometry and `whatsNew.closeupLabel` are removed.

Every enlargeable picture opens in PhotoSwipe. Two causes of a picture opening as a bare file were
found and closed: (1) `/js/*` had no version and no cache rule, so a browser could keep the old
`gallery.js` (which bound only the gallery) next to the new page - script and style URLs now carry
a content hash (`assetUrl` filter); (2) a click before the dynamically imported viewer module was
ready followed the link - `main.js` now holds such a click and `gallery.js` replays it.

**Rationale**: The author's rules - consistent picture size across the page and a single,
UX-friendly way of enlarging pictures - outweigh larger close-ups.
