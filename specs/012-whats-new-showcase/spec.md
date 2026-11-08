# Feature Specification: What's New Showcase (replacing the "Old habits" section)

**Feature Branch**: `012-whats-new-showcase`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Analyzu probirane upravy ve struktre webu dle kontextu a navrni implementaci upravy, v clarify fazi pak spolecne upresnime upravy" - i.e. specify the website restructuring discussed in the session: remove the "Old habits, nothing to relearn." section entirely and instead make the "What's new in Tandem Commander" section communicate the novelties visually.

## Context

The home page currently runs: hero → feature gallery → **"Old habits, nothing to relearn."** (six feature cards) → **"What's new in Tandem Commander"** (six text-only highlight cards) → project → author's story → download.

The author (2026-11-08) considers the "Old habits" section out of date, and the analysis confirms it:

- **Its promise is no longer true.** "Nothing to relearn" is contradicted by what the program has gained since: panel tabs (0.1.8) with browser-style shortcuts `Ctrl+T` / `Ctrl+W` (0.2.0), the Command Shell key and the Code Viewer on F3 (0.1.6), RAR archives opened as folders and the update check (0.1.9) - and above all **0.2.0 changed the default behaviour of quick search** (it now matches anywhere in the name and ignores diacritics), which a long-time Salamander user notices on the first keystroke. The gallery lead repeats the same claim ("nothing moved, nothing was reflowed") although the panels now carry a tab row.
- **Its content is covered elsewhere.** The hero lead already enumerates two panels, function keys, plugins, Unicode, long paths, panel tabs, SFTP, Code and Markdown viewers on F3, cloud sync status and the dark theme; the gallery shows tabs, viewers, the command shell and Unicode paths; the download section offers winget; the footer tagline carries the positioning sentence ("a fast two-pane file manager for Windows, driven mainly by the keyboard"). Its weakest card ("Its own core": own icon, own window titles) speaks to the author, not to visitors, and the 0.2.0 headline - quick search - is missing from it altogether.
- **"What's new" has no pictures although they exist.** Every highlight that has a gallery scene (e.g. 0.2.0: quick search → `quick-search`, tab shortcuts → `tabs-configuration`) is shown only as text with a "See it →" link that jumps up the page to the gallery.
- **Whole-window screenshots do not work at card size.** Checked on the published `quick-search` image: at 640 px the very thing the scene is about - the directory line reading "Search: chat (3 of 12)" and three filtered rows - occupies a few percent of the picture, the rest is empty panels. A visual "What's new" therefore needs to show the *relevant part* of a screenshot, not the whole window scaled down.

This feature removes the stale section and turns "What's new" into a visual showcase of the novelties of the current main release X.Y, built from the release records and gallery scenes the website already maintains (spec 007), so that every future release keeps it current without extra hand work.

## Clarifications

### Session 2026-11-08

- Q: Where does "What's new" sit on the home page - directly after the hero, or after the gallery? → A: Directly after the hero: hero → What's new → gallery → project → story → download; navigation reordered to What's new, Gallery, Project, Download; What's new takes over the band background of the removed section.
- Q: Is a new "Import settings from Salamander" gallery scene in scope, so the import highlight gets a showcase block? → A: Not now - this feature only prepares the showcase; new scenes (import included) come with the 0.3.0 website update, which re-captures all screenshots anyway.
- Q: What closes the section below the showcase - cards from earlier versions or only a link to the release history? → A: Only a prominent link to the release history; no cards from earlier versions on the home page.
- Q: What does "What's new" show when the current release is a fix-only patch (e.g. 0.2.1)? → A: The home page always presents the main release X.Y (its X.Y.0 record): its novelties and screenshots. Patch releases X.Y.Z (Z > 0) are bug fixes only, do not change what the home page communicates, and appear solely on the release history page, where they are presented as patch / bug-fix releases.
- Q: Should the gallery below "What's new" keep showing scenes that already appear there? → A: Yes - the gallery stays unchanged (all published scenes, catalog order); the repetition is accepted because the gallery is the complete tour. (The close-up distinction no longer applies after the implementation review below.)
- Implementation review (author, 2026-11-08): (1) the pictures were too large - every novelty with a picture is one panel split vertically, title and detailed text on the left, the picture on the right, the picture exactly the size of a gallery picture (no close-up crops, no alternating sides; focus areas dropped); (2) every enlargeable picture opens in the PhotoSwipe viewer, never as a direct link to the image file - a click that comes before the viewer is loaded is held and replayed, and script URLs carry a content hash so a cached old viewer can never be used.
- Q: Should the screenshots a version showed stay available after the next re-capture? → A: Yes - under each version on the release history page, an expandable gallery of the screenshots taken with that version (0.1.8: 8, 0.1.9: 5, 0.2.0: 7; a version without new screenshots has none), opened in PhotoSwipe. Part of this feature (012). Replaced pictures are archived by the capture tool; 0.1.8 and 0.1.9 are restored from git history.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor sees the latest novelties, not just reads about them (Priority: P1)

A Salamander user who installed Tandem Commander a few versions ago - or a newcomer - opens the home page. In the "What's new" section they see the novelties of the current main release (X.Y - today 0.2) as panels: each panel is split vertically, the novelty's title and detailed text on the left, its screenshot on the right - exactly the size of a picture in the gallery below. Clicking the picture opens it in the same PhotoSwipe viewer the gallery uses. The release's other highlights, which have no picture, follow as a short list, and a prominent link to the full release history closes the section; earlier versions' novelties live on that page, not on the home page.

**Why this priority**: This is the value the author asked for - novelties communicated visually - and the reason the stale section can go. It is also where a returning user decides whether to update.

**Independent Test**: Build the site at version 0.2.0 and open both language home pages: "What's new" shows one panel (text left, gallery-sized picture right) for each 0.2.0 highlight that has a published scene, the remaining 0.2.0 highlights as a list, a prominent link to the release history, and each picture opens in the viewer.

**Acceptance Scenarios**:

1. **Given** the site at 0.2.0, **When** a visitor reaches "What's new", **Then** they see the main release's version (0.2.0), its date and one-sentence summary, followed by one panel for each 0.2.0 highlight that references a published scene - in the record's order - with title and text on the left and the scene's picture on the right.
2. **Given** a panel, **When** the visitor activates its picture (mouse, touch or keyboard) - even before the page has finished loading its scripts - **Then** the full screenshot opens in the PhotoSwipe viewer (never as the bare image file), which can be closed with Escape or its close button and returns focus to the picture.
3. **Given** the 0.2.0 highlights without a scene (accent-insensitive search, settings import, safe import, settings move), **When** the visitor reads past the blocks, **Then** each appears once, as a compact item with its title and text - never as an empty picture frame.
4. **Given** any window width, **When** the visitor compares a panel's picture with a gallery picture, **Then** both have the same size; **Given** a phone-width window, **Then** each panel stacks text above picture with no horizontal scrolling and no scrollbar inside any box.
5. **Given** the Czech page, **When** the visitor reads the section, **Then** every title, text, alternative text and label is Czech; the screenshots themselves remain the English-UI captures, as everywhere on the site.

---

### User Story 2 - The home page stops promising "nothing new" (Priority: P2)

A visitor reading the home page no longer meets the "Old habits, nothing to relearn." section or any other sentence claiming that nothing changed. The page flows from the hero straight into the sections that show the program as it is today, and nothing that section uniquely said is lost.

**Why this priority**: It removes a statement the product now contradicts. It is small and could ship on its own, but on its own it would leave the page with less to show; its full value comes together with Story 1.

**Independent Test**: Search both built home pages for the section and its texts: they are gone, no navigation item or link points at them, the gallery lead no longer claims nothing moved, and every capability the removed cards named is still mentioned somewhere on the page.

**Acceptance Scenarios**:

1. **Given** the built English and Czech home pages, **When** they are inspected, **Then** neither contains the "Old habits, nothing to relearn." / "Staré návyky, nic nového k učení." section, its six cards, or any of its texts.
2. **Given** the removed cards' subjects (two panels with tabs, keyboard-first work and the Command Shell key, Unicode and long paths, viewers on F3, SFTP and cloud sync badges, settings import from Salamander, installation through winget), **When** the rest of the page is read, **Then** each is still mentioned at least once (hero, gallery, What's new or download section).
3. **Given** the gallery section, **When** its lead is read, **Then** it no longer says that nothing moved or was reflowed, while still telling the visitor that the classic light look remains the default.
4. **Given** the header, mobile menu and footer navigation, **When** their items are compared with the section order on the page, **Then** they list the sections in the same order as they appear.

---

### User Story 3 - A new release keeps the showcase current by itself (Priority: P3)

When the author publishes a new version through the existing release procedure, the showcase updates from the release record and scene catalog alone. A new main release X.Y.0 takes over the section; a patch release X.Y.Z leaves the home page's "What's new" untouched - it appears only on the release history page, as a patch / bug-fix release. The build refuses records that would break this rule.

**Why this priority**: Without it the showcase degrades exactly like the old texts did. It mostly reuses the release workflow from spec 007/011, so it carries less new work than Stories 1 and 2.

**Independent Test**: Build the site with a hypothetical patch 0.2.1 record and, separately, with a hypothetical main 0.3.0 record whose highlights reference scenes; verify the section in both cases, and that a patch with a feature kind or a missing X.Y.0 record fails the build.

**Acceptance Scenarios**:

1. **Given** a current patch release 0.2.1, **When** the site is built, **Then** the home page's "What's new" is identical to the one built at 0.2.0 - no 0.2.1 version, summary or highlight appears in it - and 0.2.1 is shown on the release history page as a patch / bug-fix release.
2. **Given** a new main release 0.3.0 whose highlights reference published scenes, **When** the site is built, **Then** the section presents 0.3.0 with its panels, and 0.2.x leaves the home page (it remains on the release history page).
3. **Given** the release procedure (`/tandem-new-version`), **When** the author approves the digest of a main release, **Then** they are told which highlights will become picture panels and which have no scene yet; **When** the release is a patch, **Then** they are told that the home page's "What's new" stays unchanged.

---

### User Story 4 - A returning user sees how each version looked (Priority: P3)

On the release history page, every version that brought new screenshots offers "Screenshots of this version (N)". Expanding it shows small pictures of the program exactly as that version looked - also after later versions re-captured the same scenes - and each opens in the PhotoSwipe viewer with its title and the version.

**Why this priority**: History for the curious and for comparison; the home page is unaffected.

**Independent Test**: Open `/cs/releases/`: 0.2.0, 0.1.9 and 0.1.8 offer 7, 5 and 8 screenshots, other versions none; pictures load only when expanded; the 0.1.8 pictures show "Tandem Commander 0.1.8" in their title bar; a picture opens in the viewer (counter "1 / 8"), never as the bare file.

**Acceptance Scenarios**:

1. **Given** the release history page, **When** a visitor expands "Screenshots of this version" under 0.1.8, **Then** the eight pictures captured with 0.1.8 appear in catalog order, including those later replaced on the home page.
2. **Given** an expanded release gallery, **When** a picture is activated, **Then** it opens in PhotoSwipe titled "<scene title> · <version>", and the arrows page only through that release's pictures.
3. **Given** a future capture run for version X, **When** it replaces a picture taken with an older version, **Then** the older picture is kept under its own version on the history page.

---

### Edge Cases

- **No published screenshots at all** (e.g. a fresh checkout before the first capture run, the state in which spec 007 already hides "See it" links): the section falls back to text-only - summary, highlights as compact items, release-history link - and never shows empty frames.
- **Current version X.Y.Z without an X.Y.0 record**: the build fails and names the missing main-release record.
- **The main release has no screenshot-backed highlight**: its highlights are all compact items (text-only fallback); the section never falls back to an older main release.
- **More screenshot-backed highlights than panels allowed**: the first N in record order become panels; the rest become compact items whose "See it" opens their screenshot in the viewer.
- **Two highlights of the main release reference the same scene**: only the first gets a panel; the second becomes a compact item.
- **A scene referenced by a highlight is unpublished or its capture is missing**: treated as "no scene" for the showcase (the existing build check for unknown scene references stays in force).
- **Highlight texts of very different lengths**: the text column wraps and the panel grows; the picture keeps the gallery size, nothing is clipped and no box scrolls.
- **Dark site theme**: the pictures are light-theme captures framed exactly like gallery pictures; the panel follows the site theme.
- **Reduced motion**: if any entrance or hover effect is used, it is disabled under the visitor's reduced-motion preference.
- **Old links**: links to the home page's `#new` anchor keep working; the removed section had no anchor, so no link breaks.
- **The release history page** (`/releases/`): unchanged in this feature except that its "See it" links keep working.

## Requirements *(mandatory)*

### Functional Requirements

#### Removing the stale section

- **FR-001**: The home page in every language MUST no longer contain the "Old habits, nothing to relearn." section; its texts MUST be removed from all language catalogs and no template, test or tooling may keep referring to them.
- **FR-002**: Every subject the removed cards named (see Story 2, scenario 2) MUST remain mentioned at least once elsewhere on the home page; where one would otherwise disappear, the nearest fitting existing text (hero lead, gallery, download section) MUST absorb it rather than a new section being added.
- **FR-003**: The gallery lead MUST be reworded in both languages so that it no longer claims nothing moved or was reflowed, keeping the message that the classic light look remains the default and the dark theme has the same layout.
- **FR-003a**: The gallery MUST keep showing all published scenes in catalog order, including scenes shown in "What's new"; its content and order MUST NOT depend on the main release.
- **FR-004**: The home-page sections MUST appear in the order hero → What's new → gallery → project → story → download, and the header, mobile and footer navigation MUST list them in that same order (What's new, Gallery, Project, Download).
- **FR-005**: The alternating section backgrounds MUST still alternate after the change: What's new takes over the tinted band background of the removed section, so the sequence is hero → band (What's new) → plain (gallery) → band (project) → plain (story) → download, and no two adjacent sections share the band background.

#### The showcase

- **FR-006**: The "What's new" section MUST present the **main release** of the current version: for current version X.Y.Z this is the release record X.Y.0. The section MUST open with that release's version, release date and one-sentence summary.
- **FR-007**: Patch releases X.Y.Z with Z > 0 MUST NOT appear in the home page's "What's new" in any form (version, summary or highlight); they are shown only on the release history page, presented there as patch / bug-fix releases. If the X.Y.0 record does not exist, the build MUST fail naming it.
- **FR-008**: For the main release the section MUST show one **panel** per highlight that references a published scene, in the record's order, up to a maximum of 3 panels; each panel is split vertically: the highlight's title and detailed text on the left, the scene's picture on the right.
- **FR-009**: The picture in a panel MUST be exactly the size of a gallery picture at every window width (same markup and column width as the gallery); the picture is always on the right on wide screens, and below the site's mobile breakpoint the panel stacks text above picture, without horizontal page scroll and without any scrollbar inside a panel.
- **FR-010**: Every enlargeable picture on the site MUST open in the PhotoSwipe viewer, never as a direct link to the image file: a click that arrives before the viewer is loaded MUST be held and opened in the viewer once it is ready, and script URLs MUST carry a content version so a browser cannot combine a new page with a cached old viewer. Only when the viewer cannot load at all (no scripting, failed module) may a link open the image file.
- **FR-011**: The viewer MUST show the scene's caption, work with keyboard, touch and pointer, page only through the pictures of "What's new" (not into the gallery), and return focus to the picture when it closes.
- **FR-012**: Each picture MUST carry the scene's localized text alternative and an accessible name made of the highlight title and the gallery's "view full size" label.
- **FR-013**: The main release's highlights that do not get a panel MUST be listed as **compact items** (title and text) under a heading such as "Also in 0.2.0" / "Také ve verzi 0.2.0"; a compact item whose highlight has a published scene MUST offer a "See it" control that opens that screenshot in the viewer.
- **FR-014**: The release history page MUST mark patch releases X.Y.Z (Z > 0) as patch / bug-fix releases, distinguishable at a glance from main releases X.Y.0.
- **FR-015**: The section MUST end with a prominent link to the full release history ("All releases →" / "Všechna vydání →"); it MUST NOT show highlights of any other release than the main release. The home page's earlier selection of six cards topped up from previous versions (spec 007) is retired.
- **FR-016**: When the main release has no highlight with a published scene (or no screenshots are published at all), the section MUST show its summary, all its highlights as compact items and the release-history link, with no empty picture frames.
- **FR-017**: Panel pictures MUST load lazily and MUST NOT delay the display of the hero.
- **FR-018**: The section's lead text MUST be updated in both languages to describe the new structure (the latest novelties shown, older ones on the release history page).

#### Data and release workflow

- **FR-022**: No new gallery scene is added in this feature. The 0.2.0 settings-import highlights stay compact items. The showcase MUST be ready to take new scenes without template changes: adding a scene and its capture and referencing it from a highlight is all the 0.3.0 website update (which re-captures every screenshot) will need to turn a highlight into a panel.
- **FR-023**: The release procedure (`/tandem-new-version`) MUST, when presenting a main release's digest for approval, state which highlights will become picture panels and which have no scene; for a patch release it MUST state that the home page's "What's new" stays unchanged.
- **FR-025**: The release history page MUST offer, under every release with pictures taken with its version, a collapsed "Screenshots of this version (N)" gallery of exactly those pictures (archived and current), in catalog order, loaded only when expanded and opened in PhotoSwipe (one set per release).
- **FR-026**: A capture run MUST keep every picture it replaces when that picture was taken with another app version: its files move to `archive/<old version>/` and its record, with the scene's title, caption and alt text at that moment, into the archive manifest. The build MUST validate the archive (versions, keys, texts in all languages, files present, no picture both current and archived).
- **FR-027**: The pictures of 0.1.8 and 0.1.9 that later captures replaced MUST be restored from the repository history into the archive.
- **FR-024**: The release history page, the PAD file and the scene catalog's existing rules MUST keep working unchanged apart from the additions above; the existing check that a highlight's scene reference points at a published scene MUST stay in force.

### Key Entities

- **Picture archive** (new, `content/gallery/archive.json` + `src/assets/gallery/archive/<version>/`): per app version, the pictures replaced by later captures, each with its capture record and the scene texts it had.

- **Release record** (existing, `content/releases/<version>.json`): version, date, kind, bilingual summary and highlights; a highlight may reference a gallery scene. Unchanged in shape.
- **Gallery scene** (existing, scene catalog): id, bilingual title, caption and alt text, themes, capture definition. Unchanged.
- **Main release** (derived): the release record X.Y.0 of the current version X.Y.Z; the only release the home page's "What's new" presents.
- **Patch release**: a release X.Y.Z with Z > 0 - bug fixes only, shown solely on the release history page.
- **Panel** (derived; "block" in the data model): a highlight of the main release paired with the gallery picture of its scene; at most 3.
- **Compact item** (derived): a highlight shown as title and text only, optionally with a "See it" control.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On both language home pages, the phrases "nothing to relearn" / "nic nového k učení" and "nothing moved" / "nic se nepřesunulo" occur zero times.
- **SC-002**: At 0.2.0, a visitor sees at least 2 screenshot-backed novelties in "What's new" without leaving the section or scrolling to the gallery.
- **SC-003**: On a 1280 px-wide page and at 360 px, every panel picture has the same rendered size as a gallery picture, and clicking it - before or after the scripts have loaded - opens the PhotoSwipe viewer, never the bare image.
- **SC-004**: 100 % of the subjects named by the removed cards are still mentioned on the home page (checklist in Story 2, scenario 2).
- **SC-005**: The showcase adds no more than 150 KB of images to a full home-page load, and none of it is loaded before the visitor scrolls towards the section.
- **SC-006**: At 360 px viewport width, the section causes no horizontal scrolling and contains no scrollable box.
- **SC-007**: A simulated patch release 0.2.1 leaves the built "What's new" section identical to 0.2.0's, and a simulated main release 0.3.0 builds into a correct section, both with no manual edits outside their release records.
- **SC-008**: The build, the language-parity checks and the existing test suite pass on the branch.
- **SC-009**: On the release history page 0.2.0, 0.1.9 and 0.1.8 offer 7, 5 and 8 screenshots; none load before expanding; each opens in PhotoSwipe.

## Assumptions

- The section title "What's new in Tandem Commander." and its `#new` anchor are kept; only the lead and structure change.
- All screenshots will be re-captured for the 0.3.0 website update; new scenes are deferred to that update.
- Panels reuse the gallery's card images (640 px, full size for wide screens via `srcset`); no new images or capture technique. Animated pictures are out of scope (possible follow-up).
- Screenshots remain English-UI, light-theme captures shown on every language, as decided in spec 007.
- Up to 3 panels is the default; the current mobile breakpoint (860 px) and the "no scrollbar inside boxes" rule apply.
- Removing the section also removes the conditional winget sentence of its last card; the download section's winget block remains the single place for installation channels, and the winget tests are adjusted accordingly.
- Wording of the new texts (lead, "Also in", gallery lead, patch label on the release history page) is drafted during planning and approved by the author in both languages.
- The PAD file is unaffected: it is generated from release records and meta texts, not from the removed section.
