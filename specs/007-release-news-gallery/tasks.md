---

description: "Task list for feature 007 - Release-Driven Website Content and Feature Gallery"
---

# Tasks: Release-Driven Website Content and Feature Gallery

**Input**: Design documents from `/specs/007-release-news-gallery/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included for pure logic only - the plan (research R13) introduces `node --test` for `lib/content.js` and `tools/release/`. UI, accessibility, performance and the Windows-side capture pipeline are validated through the quickstart scenarios, as in specs 002-006.

**Organization**: Grouped by user story. Phase order follows priority, with one deliberate swap: **US4 (screenshot production) comes before US3 (gallery)** - both are P2, and the gallery needs US4's images. US5 (P3) is listed last but depends only on Phase 2; it can be done right after US2 (see Dependencies).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1-US5 as in spec.md
- All paths are relative to the repository root `E:\Projects\tandemcommander-web`

## Standing rules for every task

- Work on branch `007-release-news-gallery`. Never commit to `main`/`devel`, never push, merge or deploy - those are the author's steps.
- Never hand-edit `public/`; run `npm run build` and commit the regenerated output together with the source change.
- Every user-visible string exists in **English and Czech**. Fixed UI text → `src/_data/i18n/en.json` + `cs.json` (same keys; keys whose value contains HTML must be added to `RICH_TEXT_KEYS` in `eleventy.config.js`). List-shaped content → `content/` with inline `{ "en": …, "cs": … }`.
- **Never start `tandemcommander.exe` with `-C` on the host and never import a `.reg` into the host's `HKCU\Software\Tandem Commander`** - it overwrites the author's configuration (research R1). All staging happens inside Windows Sandbox.
- The application repository `E:\Projects\tandemcommander` is read-only for this feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: folders, scripts and dependencies every later phase uses.

- [X] T001 Create the new top-level folders with a `.gitkeep` where empty: `content/releases/`, `content/gallery/`, `lib/`, `tools/release/`, `tools/screenshots/guest/`, `tools/screenshots/demo/files/`, `tools/og-image/`, `tests/fixtures/`, `src/pages/`, `src/_includes/components/`, `src/assets/gallery/`
- [X] T002 Update `package.json`: add scripts `"test": "node --test tests/"`, `"release:facts": "node tools/release/release.mjs facts"`, `"release:apply": "node tools/release/release.mjs apply"`, `"release:check": "node tools/release/release.mjs check"`, `"shots": "node tools/screenshots/capture.mjs"`, `"og": "node tools/og-image/render.mjs"`; add devDependency `sharp` (`npm install --save-dev sharp`) and commit the updated `package-lock.json`
- [X] T003 [P] Add `.work/` to `.gitignore` (installer cache, Sandbox job/output, changelog excerpts)
- [X] T004 [P] Copy the application changelog sections 0.1.0-0.1.8 from `E:\Projects\tandemcommander\CHANGELOG.md` verbatim into `tests/fixtures/CHANGELOG.excerpt.md` (test fixture for the parser; keeps tests independent of the sibling repository)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the release-record data layer and multi-page routing. US1, US2 and US5 read records; US3 and US5 add pages.

**⚠️ CRITICAL**: no user-story work starts before this phase is complete.

- [X] T005 Implement the record half of `lib/content.js` (CommonJS, no dependencies) per [data-model.md §1](data-model.md) and [contracts/release-record.md](contracts/release-record.md): `loadLanguages()`, `compareVersions(a,b)` (numeric per component), `loadReleases(contentDir, site)` → `{ all, current, homeCards, padChangeInfo }`, validation V1-V11 throwing `Error("releases: <file>: <reason>")`, `homeCards` selection (FR-010: current record's highlights first, then older records newest-first, exactly six, each card carrying `version`), `padChangeInfo` (English summary + `" New: "` + titles joined by `"; "`, ≤ 300 chars, never cut mid-word, backticks stripped), `notesUrl`, and `renderInline(text)` (HTML-escape, then `` `code` `` → `<span class="mono">code</span>`). Text limits (summary 200, title 40, text 220) as exported constants. Content directory resolves from `process.env.TC_CONTENT_DIR` or `<repo>/content`
- [X] T006 [P] Write `tools/release/DIGEST-STYLE.md` per [research R10](research.md): audience, what earns a highlight, 0-6 highlights, limits, plain text + backticks, grouping of fix lists into one themed highlight, Czech written natively, `kind` values and when to use each, when to set `scene`
- [X] T007 Backfill nine release records `content/releases/0.1.0.json` … `0.1.8.json` from `E:\Projects\tandemcommander\CHANGELOG.md` following `tools/release/DIGEST-STYLE.md` and the summary table in [spec.md](spec.md) "What changed between 0.1.0 and 0.1.8": `version`, `date`, `build` (184-192), `kind` (`first`, `bugfix`, `maintenance`, `feature`, `bugfix`, `bugfix`, `feature`, `installer`, `feature`), bilingual `summary`, highlights in importance order (0.1.8: panel-tabs, no-vc-runtime, antivirus-friendly, update-while-running; 0.1.7: none; 0.1.6: code-viewer, command-shell, winget; 0.1.5: unicode-review, instant-markdown; 0.1.4: fast-thumbnails, recycle-bin-fix, vcs-badges; 0.1.3: altap-migration, cloud-sync-badges; 0.1.2: sftp-dialogs, retranslation; 0.1.1: sftp-key-auth; 0.1.0: unicode-long-paths, sftp, markdown-viewer, themes). Leave `scene` unset for now (added in T060). Append the 0.1.8 and 0.1.7 records to `DIGEST-STYLE.md` as worked examples
- [X] T008 [P] Write `tests/content.records.test.js` (`node:test` + `node:assert`): one failing fixture per rule V1-V11 under `tests/fixtures/records-*/`; version ordering incl. 0.1.7 above 0.1.6 (same date) and 0.1.10 above 0.1.9; `homeCards` for: current with >6 highlights, current with none (0.1.7-style), fewer than six in total, normal case; `padChangeInfo` ≤ 300 chars, single line, no mid-word cut; `renderInline` escapes `<` and converts backticks. Also assert the real `content/releases/` loads cleanly against the real `src/_data/site.json`
- [X] T009 Create `src/_data/releases.js` (function export, same shape convention as `src/_data/installer.js`): reads `src/_data/site.json`, calls `loadReleases`, returns the derived object; any validation error propagates and fails the build
- [X] T010 Update `eleventy.config.js`: add filter `inline` (→ `renderInline`, output marked safe in templates), add `content/` and `lib/` as watch targets for `--serve`, honour `TC_CONTENT_DIR`; no other behaviour change
- [X] T011 Generalise `src/_includes/layout.njk` for multiple pages per [contracts/pages-ui.md](contracts/pages-ui.md): accept front-matter `pagePath` (default `""`) and `metaKey` (default `"meta"`); `canonical`, every `hreflang` alternate, `x-default` and `og:url` become `site.url + l.url + pagePath`; `<title>`/description/og texts read `<metaKey>.title` / `.description`; the before-paint language-redirect script runs only when `pagePath == ""`
- [X] T012 Update `src/_includes/sections/header.njk` and `src/_includes/sections/footer.njk`: language-switcher links become `l.url + pagePath`; section nav links become `locale.url + "#…"` when `pagePath != ""` (plain `#…` on home). Footer links to the new pages are **not** added here - each page's own task adds its link, so no phase ever ships a dead link. Verify in `src/js/main.js` that the fragment carry-over of the language switcher still works with the longer hrefs
- [X] T013 Replace the static sitemap: delete `src/root/sitemap.xml`, add `src/sitemap.njk` (`permalink: /sitemap.xml`, `eleventyExcludeFromCollections: true`) emitting one `<url>` per language × page path, the page paths read from a new `src/_data/pages.json` (created here with the home entry `""` only; T056 adds `"gallery/"`, T062 adds `"releases/"`, so the sitemap never lists a page that does not exist) with all `xhtml:link` alternates + `x-default` and `lastmod` = `site.releaseDate`; keep the existing priorities for home (1.0) and use 0.7 for sub-pages

**Checkpoint**: `npm test` green, `npm run build` green, built site visually unchanged (records are loaded but not yet rendered).

---

## Phase 3: User Story 1 - A visitor sees what Tandem Commander is today (Priority: P1) 🎯 MVP

**Goal**: both language versions of the home page, the page metadata and the PAD file describe 0.1.8, with "What's new" generated from release records.

**Independent Test**: quickstart **V1** (1.1-1.5): every post-0.1.0 headline capability is mentioned; "What's new" opens with the 0.1.8 line and shows six version-labelled cards; winget is offered; PAD change-info describes 0.1.8; nothing presents 0.1.0 as current.

- [X] T014 [US1] Rewrite `src/_includes/sections/whats-new.njk` per [contracts/pages-ui.md](contracts/pages-ui.md) "What's new section": header line (version, `releaseDate`-filtered date, `releases.current.summary[lang] | inline`), then a loop over `releases.homeCards` - version chip, title, `text[lang] | inline`, class `card--current` when `card.version == site.version`, optional "See it →" link to `{{ locale.url }}gallery/#<scene>` when `card.scene` is set. Do **not** add the "All releases →" link yet - the page does not exist until US5 (T062 adds it)
- [X] T015 [US1] Update the i18n catalogs `src/_data/i18n/en.json` and `src/_data/i18n/cs.json` for What's new: remove `whatsNew.entry1Title…entry4Text`; rewrite `whatsNew.title`/`lead` so they do not claim "in this release"; add `whatsNew.versionLabel`, `whatsNew.currentLine`, `whatsNew.seeIt`; remove the two `whatsNew.entry*Text` entries from `RICH_TEXT_KEYS` in `eleventy.config.js`
- [X] T016 [US1] Switch `src/_data/pad.js` to `require("../../lib/content.js")`-derived `padChangeInfo` for `Program_Change_Info` (delete the `whatsNew.entry*` derivation); confirm `validatePad` in `eleventy.config.js` still passes (single line, ≤ 300 chars)
- [X] T017 [P] [US1] Rewrite product texts in `src/_data/i18n/en.json` and `cs.json` (FR-001): `meta.description`, `hero.lead`, `features.lead` and the three `features.card*` texts (or add a fourth card "Viewers and plugins": Code Viewer, Markdown, image viewer, 20 plugins - then extend `src/_includes/sections/features.njk` accordingly) so that panel tabs, Code Viewer, configurable command shell, cloud sync badges, winget and Altap Salamander settings migration are each named at least once next to Unicode, long paths, SFTP, Markdown viewer and themes
- [X] T018 [P] [US1] Rewrite the catalog texts `pad.keywords`, `pad.desc45`, `pad.desc80`, `pad.desc250`, `pad.desc450`, `pad.desc2000` in `src/_data/i18n/en.json` and `cs.json` for the 0.1.8 feature set, respecting the hard caps (45/80/250/450/2000, keywords 250) enforced by the build (FR-004)
- [X] T019 [US1] Add the winget block to `src/_includes/sections/download.njk`: below the installer card a secondary block with label, `<code id="winget-cmd">winget install tandemcommander</code>`, a Copy button rendered with the `hidden` attribute (script reveals it), an `aria-live="polite"` status span, and a one-line hint about `winget upgrade`; new keys `download.wingetLabel`, `download.wingetHint`, `download.wingetCopy`, `download.wingetCopied` in both catalogs; reword `download.disclaimerText` in both catalogs so it no longer says "first release" but keeps the agentic-development and no-warranty statements (FR-003)
- [X] T020 [US1] Add the copy behaviour to `src/js/main.js` (un-hide the button when `navigator.clipboard` exists, copy the `<code>` text, swap the label to the "copied" text for 2 s, write the status span) and the styles to `src/css/main.css`: `.card--current`, `.version-chip`, `.whats-new-current`, `.winget` block (mono command, button, responsive at the existing 860 px breakpoint, light and dark tokens)
- [X] T021 [US1] Run `npm test` and `npm run build`; walk quickstart V1.1-V1.5 on `/` and `/cs/`; commit sources and regenerated `public/`

**Checkpoint**: US1 is shippable on its own (old screenshots still in place).

---

## Phase 4: User Story 2 - The author publishes a release and the website follows (Priority: P1)

**Goal**: a two-layer release procedure and a build that refuses a version without release content.

**Independent Test**: quickstart **V2** (2.1-2.8): version without record fails the build; untranslated/date-mismatched record fails; `release:facts 0.1.8` reports date 2026-09-20, build 192 and 8 247 136 bytes; `release:apply` creates a skeleton that `release:check` rejects until filled; `/release-web` drafts, waits for approval, never commits.

- [X] T022 [P] [US2] Implement `tools/release/changelog.mjs`: `parseChangelog(text)` → map of version → `{ date, build, lead, body, hasAdded, isUnreleased }` from headings `## [x.y.z] - YYYY-MM-DD` (accept em dash, en dash and hyphen) and the `**Build N.**` lead; `kindHint(section)` (`feature` if an `### Added` heading exists, `installer` if the lead says the application/source is unchanged, else `bugfix`); `locateChangelog({ explicitPath, version })` trying `--changelog`, then `../tandemcommander/CHANGELOG.md`, then `https://raw.githubusercontent.com/tandemcommander/tandemcommander/v<version>/CHANGELOG.md`
- [X] T023 [P] [US2] Write `tests/release.changelog.test.js` against `tests/fixtures/CHANGELOG.excerpt.md`: all nine versions found with the right dates and builds 184-192; 0.1.7 → `installer`, 0.1.6 → `feature`, 0.1.5 → `bugfix`; a section body ends before the next `## [` heading; an `## [Unreleased]` heading is reported as unreleased; unknown version → undefined
- [X] T024 [US2] Implement `facts` in `tools/release/release.mjs` per [contracts/release-cli.md](contracts/release-cli.md): GitHub `GET https://api.github.com/repos/tandemcommander/tandemcommander/releases/tags/v<version>` (built-in `fetch`, `User-Agent` header, 20 s timeout), refuse drafts, find the asset named by the same rule as `src/_data/installer.js`, read its `size`; combine with the changelog facts; write the section to `.work/release/<version>-changelog.md`; warn when `published_at` and the changelog date differ; human output by default, `--json` for the documented object; exit 1 with one line per missing fact and **no file written under `src/` or `content/`** (FR-012)
- [X] T025 [US2] Implement `apply` in `tools/release/release.mjs`: run `facts` first and abort on failure before touching anything; update `version`, `releaseDate`, `installerSizeBytes` in `src/_data/site.json` preserving key order, indentation and trailing newline; create `content/releases/<version>.json` skeleton (empty string per language from `src/_data/languages.json`, `highlights: []`, `kind` = hint) only if it does not exist; report (never overwrite) when an existing record's `date`/`build` differ; idempotent
- [X] T026 [US2] Add the staleness logic to `lib/content.js` - `staleReport(scenes, captures, releases)` per [data-model.md §3](data-model.md) (*must re-capture* / *older, review* / *current*), tolerating a missing `content/gallery/` (reports "no gallery captures yet") - and implement `check` in `tools/release/release.mjs`: spawn `npm test`, then `npm run build`, print the stale-image report, print the remaining manual steps (preview, `npm run shots`, `npm run og`, commit on the release branch, merge, deploy); exit 0 only if tests and build passed
- [X] T027 [P] [US2] Extend `tests/content.records.test.js` with the build-gate cases of FR-009 through the public loader (no record for `site.version`; date mismatch; record newer than `site.version`; missing language; duplicate version) asserting that each message names the version/file/field, and add `tests/content.stale.test.js` for `staleReport` (showsVersion scene, scene referenced by a current highlight, untouched older scene, current scene, no captures file)
- [X] T028 [US2] Create the assistant layer `.claude/skills/release-web/SKILL.md` (front matter `name: release-web`, description, argument = version) encoding the seven obligations of [contracts/release-cli.md](contracts/release-cli.md) "Layer 2": run `npm run release:facts -- <v> --json` and stop on failure; read `.work/release/<v>-changelog.md` and `tools/release/DIGEST-STYLE.md`; draft `kind`, `summary`, 0-6 `highlights` in every language of `src/_data/languages.json`, proposing `scene` ids from `content/gallery/scenes.json` and naming highlights that deserve a new scene; show the full draft and wait for explicit approval; then `release:apply`, write the texts, `release:check`; relay the stale report and manual steps; never commit, push, merge or deploy
- [X] T029 [US2] Rewrite the "Release a new version" section of `README.md` (FR-013): the assisted path (`/release-web <version>`), the by-hand path (`release:facts` → `release:apply` → fill texts → `release:check`), what a release with no visitor-facing change looks like (summary only), where release text lives (`content/releases/`), and the order at a feature release (publish app release → `npm run shots` → website release); update the "Structure" tree for `content/`, `lib/`, `tools/`, `tests/`
- [X] T030 [US2] Validate by replaying 0.1.8: run quickstart V2.1-V2.5 and V2.7 in a throw-away working copy (or restore with `git checkout -- .` afterwards); fix any message that does not name its fix (SC-003); commit

**Checkpoint**: US1 + US2 together are the P1 deliverable and need nothing from Windows Sandbox - a good point for the author to review and merge.

---

## Phase 5: User Story 4 - The author regenerates the screenshots on demand (Priority: P2)

**Goal**: `npm run shots` produces every automated scene inside Windows Sandbox from the published installer; manual scenes are guided.

**Independent Test**: quickstart **V4** (4.1-4.10).

**Prerequisite (author, one time)**: enable Windows Sandbox and reboot (quickstart "Prerequisites"). T031-T036 can be written without it; T037 cannot run without it.

### Spike - decides the capture path (research R2); blocks T038+

- [X] T031 [US4] Write `tools/screenshots/guest/Win32.cs` (loaded with `Add-Type` from Windows PowerShell 5.1, .NET Framework 4.8 APIs only): `FindTopLevelWindows(pid tree)`, `GetFrameBounds(hwnd)` via `DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS)`, `MoveResize(hwnd,w,h)` via `SetWindowPos`, `Capture(hwnd, path)` via `PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT)` cropped to the frame bounds and saved as PNG, `CaptureScreen(rect, path)` fallback via `Graphics.CopyFromScreen`, `SendChord(string)` via `SendInput` (modifiers, F-keys, arrows, Enter, Esc, `*n` repeat), `TypeText(string)`, `GetDpi(hwnd)`, `IsResizable(hwnd)`
- [X] T032 [US4] Write a minimal `tools/screenshots/guest/run.ps1`: read `C:\job\job.json`; log every step as a JSON line to `C:\out\progress.jsonl`; install `C:\installer\<file>` with `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /NORESTARTAPPLICATIONS`; read version and build from the installed exe's version resource; refuse (`status: "refused"`) when older than `job.siteVersion`; launch with `-l`/`-r`, wait for the main window, resize to 1200×800, capture to `C:\out`; write `C:\out\result.json` per [contracts/scene-catalog.md](contracts/scene-catalog.md); `Stop-Computer -Force` unless `job.keep`
- [X] T033 [US4] Write the first cut of `tools/screenshots/capture.mjs` (ES module): preflight - `%WINDIR%\System32\WindowsSandbox.exe` exists (else print the enable instructions and exit 1), GitHub release `v<version>` published, installer cached at `.work/installers/<name>` or downloaded, cached size equals the GitHub asset size, `powershell Get-AuthenticodeSignature` status `Valid`; write `.work/shots/job.json` and `.work/shots/run.wsb` (MappedFolders: `tools/screenshots/guest`→`C:\guest` RO, `tools/screenshots/demo`→`C:\demo` RO, `.work/installers`→`C:\installer` RO, `.work/shots/job`→`C:\job` RO, `.work/shots/out`→`C:\out` RW; `<Networking>Disable</Networking>`, `<ClipboardRedirection>Disable</ClipboardRedirection>`, `<LogonCommand>` = `powershell -ExecutionPolicy Bypass -File C:\guest\run.ps1`); start the Sandbox, tail `progress.jsonl`, overall timeout 15 min, read `result.json`; options `--scene`, `--theme`, `--keep`, `--version`
- [X] T034 [P] [US4] Create the first slice of demo content under `tools/screenshots/demo/files/`: `Documents/` (Contracts, Invoices, Reports, Templates, `checklist.txt`, `meeting-notes.md`, `reading-list.txt`), `Projects/engine/src/` (`renderer.cpp`, `renderer.h`, `build.py`, `config.yaml`, `package.json`, `README.md` with headings, a table and a fenced code block) - all invented, neutral, English content; nothing copied from real documents
- [X] T035 [US4] ~~Export a base configuration by hand~~ - **void (2026-09-20)**: the driver produces it inside the run by starting the freshly installed program once with no configuration and closing it normally, so nothing is exported by hand and nothing personal can be in it (research R2a)
- [X] T036 [US4] Extend the minimal `run.ps1` to import `C:\demo\base-config.reg` and then write the theme value (`Configuration\Theme Mode`) and panel paths before launch, and add a second hard-coded spike scene: focus `README.md`, send `F3`, wait for a window whose title contains `README.md`, settle, capture foreground
- [X] T037 [US4] **(blocked: needs Windows Sandbox - author enables it, then re-run `/speckit-implement`)** **Run the spike** (quickstart V4.1): `npm run shots -- --scene main-window,markdown-viewer --keep`. Record the three outcomes in a new section "R2 spike result (date)" of `specs/007-release-news-gallery/research.md`: (a) does `PrintWindow` render the main window with title bar and tab strip and the WebView2 content - if not, switch `steps` capture to `CaptureScreen` with a plain backdrop window and document that the Sandbox window must stay un-minimised; (b) is WebView2 present - if not, add the Evergreen standalone installer to the `.work/installers` cache, install it silently in `run.ps1` before the app, and add its download + signature check to preflight; (c) guest DPI - if ≠ 96, make preflight refuse with the message from research R2. **Stop and consult the author if none of the prepared fallbacks works** (last resort: dedicated local account, research R1)

### Pipeline

- [X] T038 [US4] Implement `tools/screenshots/guest/steps.ps1`: the closed step vocabulary of [contracts/scene-catalog.md](contracts/scene-catalog.md) (`focus`, `keys`, `text`, `waitWindow`, `resize`, `settle`, `capture`, `close`) on top of `Win32.cs`; `focus` verifies the focused item by reading it back (copy-name chord or window text) and fails otherwise; `settle` compares two captures 250 ms apart until identical or timeout; every failure writes `<id>-<theme>.fail.png` and a reason; a `Test-Steps` function validates a step list without executing (used by `--dry-run`)
- [X] T039 [US4] Implement the config layering in `tools/screenshots/guest/run.ps1`: one mapping table from catalog keys to registry values (theme, `Language`, `Show Splash Screen`, `Panel Tabs`, `Window\Left/Top/Right/Bottom/Show/Split Position`, `Left Panel`/`Right Panel` → `Path`, `View Type`, `Sort Type`, `Tabs\<n>`, `Active Tab`, `Right Panel Focused`), value names and encodings taken from `base-config.reg`; before **every** scene × theme: kill any running instance, `reg delete` the product key, `reg import` base, apply overrides, launch with `stage.launch` + `-l`/`-r`/`-p`; scene loop with one retry per failed scene; `result.json` entries `ok` / `failed` / `skipped`
- [X] T040 [US4] Implement the demo-workspace builder in `tools/screenshots/guest/run.ps1` from `tools/screenshots/demo/workspace.json` ([data-model.md §4](data-model.md)): copy `C:\demo\files` → `C:\Workspace`; `generate[]` types `file`, `dir`, `zip` (`Compress-Archive`), `longpath` (via `\\?\`), `bulk` (N files of given sizes for the disk map); Unicode names from `\u` escapes; then apply `times` (glob → fixed `LastWriteTime`, with a default) so every date in a panel is deterministic
- [X] T041 [P] [US4] Complete the demo content: `tools/screenshots/demo/files/` gains `Pictures/` (12 photos ≤ 1600 px, public-domain/CC0 only, at least two portrait shots with EXIF orientation 6 or 8), `Compare/config-old.ini` + `config-new.ini` (a handful of differing lines), `Rename/` (a dozen inconsistently named files for batch rename), `Archives/` source folders; `tools/screenshots/demo/workspace.json` with the generate list (Unicode folder with Czech, Greek, Japanese and emoji names; a > 260-character path; `project-backup.zip`; a `DiskUsage/` bulk tree) and the `times` table; `tools/screenshots/demo/LICENSES.md` with path, source URL, author and licence for every third-party file (FR-028). **Ask the author** whether to use their own photos (dedicated CC0) or Wikimedia Commons CC0/PD images
- [X] T042 [US4] Create `content/gallery/scenes.json` with all 16 scenes of [data-model.md §2](data-model.md) "Initial catalog" in that order: ids, bilingual `title`/`caption`/`alt` within limits (40/160/250), `themes`, `mode`, `featured` (main-window, dark-theme, panel-tabs, code-viewer, markdown-viewer, sftp), `showsVersion` (main-window, dark-theme), `since`, `published: false` for `cloud-sync-badges` and `vcs-badges`, `manualSteps` for the three manual scenes (the two `manual-host` ones ending with the personal-data review), and `stage` for every `auto`/`manual-sandbox` scene - main-window with three tabs per panel; panel-tabs with the tab context menu open (`Shift+F10` on the strip or the list button); code-viewer on `renderer.cpp`; markdown-viewer on `README.md`; unicode-long-paths in the generated Unicode folder; thumbnails with view `Alt+5` in `Pictures`; image-viewer `F3` on a photo; archive-as-folder inside `project-backup.zip`; file-comparator on the two ini files; batch-rename dialog on `Rename/`; disk-map on `DiskUsage/`; command-shell = Configuration dialog on the *Command Shell* page. Verify each chord against the application manual (`E:\Projects\tandemcommander\help\src\hh\salamand\shortcuts_keyboard.htm`) before relying on it
- [X] T043 [US4] Implement the gallery half of `lib/content.js`: `loadGallery(contentDir, srcDir)` → `{ scenes, published, featured, captures }` with validation G1-G7 of [contracts/scene-catalog.md](contracts/scene-catalog.md) (messages `gallery: <scene id>: <reason>`), plus `validateStage(scene)` for the step vocabulary; G4 (≥ 10 published) and G5 (captures + files exist) are skipped while `content/gallery/captures.json` does not exist, so the site build keeps passing until the first capture run
- [X] T044 [P] [US4] Write `tests/content.gallery.test.js`: a failing fixture per rule G1-G7 under `tests/fixtures/gallery-*/` (incl. featured count 3 and 7, first featured not `main-window`, two-theme scene with one capture, missing image file, unknown step name, `auto` scene without a final `capture`, `manual-host` scene whose last step is not the review); the real `content/gallery/scenes.json` validates
- [X] T045 [US4] Implement `tools/screenshots/postprocess.mjs` with `sharp`: for each `ok` result read the PNG, assert both themes of a scene have equal dimensions, write `src/assets/gallery/<id>-<theme>.webp` (lossless) and `<id>-<theme>-640.webp` (width 640, quality 82), fail with exit code 3 if a full image exceeds 300 KB; rewrite `src/assets/screenshot-light.png` from `main-window/light` and `src/assets/screenshot-dark.png` from `dark-theme/dark` (PNG, palette-optimised); upsert `content/gallery/captures.json` entries per [data-model.md §3](data-model.md) (stable key order, 2-space JSON, trailing newline); write `.work/shots/contact-sheet.html` showing every image at 50 % with id, theme, version and bytes
- [X] T046 [US4] Complete `tools/screenshots/capture.mjs`: load and validate the catalog through `lib/content.js`; `--dry-run` (print scene × theme plan, run step validation, validate `workspace.json`, start nothing); personal-data guard - abort if the host user name or computer name occurs in `tools/screenshots/demo/**` file names, `workspace.json` or any `stage.config` value; pass the selected scenes in `job.json`; call `postprocess.mjs`; summary table (ok / failed / skipped, captured version and build, reminder to run `npm run og` when `main-window` changed); exit codes 0/1/2/3 per the contract; failed scenes keep their previous images
- [ ] T047 [US4] Implement manual scenes: `tools/screenshots/guest/manual-helper.ps1` (WinForms, always-on-top, shows the scene title and numbered `manualSteps`, buttons *Capture* and *Skip*; on *Capture* it hides itself, resizes the application's foreground window to the scene's frame and captures) and the `--manual` path in `capture.mjs` (`<Networking>Enable</Networking>` only when a selected scene has `stage.network: true`, no guest shutdown until all manual scenes are answered; *Skip* → `status: "skipped"`, previous image kept, exit code still 0) (FR-029)
- [ ] T048 [P] [US4] Implement `tools/screenshots/capture-window.ps1` for `manual-host` scenes and the `--host <id>` path in `capture.mjs`: print the scene's `manualSteps`, wait for Enter, find the foreground `tandemcommander.exe` main window, read version/build from that process's executable and refuse if older than `site.json.version` (FR-026a), remember the window rectangle, resize to the scene frame, capture with the same `Win32.cs`, restore the rectangle, then require the author to type `reviewed` after the personal-data review before the image is handed to `postprocess.mjs`; changes no setting (FR-027 exception)
- [X] T049 [P] [US4] ~~Social-image template and renderer~~ - **resolved without change (2026-09-20)**: inspection of `src/assets/og-image.png` shows it carries only the lockup, tagline and repository URL - no screenshot and no version - so FR-024 ("does not depict a superseded version") already holds. No `tools/og-image/`, no `npm run og`; research R14 and the quickstart step V4.10 are void. Revisit only if the author wants a screenshot inside the social image
- [X] T050 [US4] Write `tools/screenshots/README.md` (FR-033): one-time Sandbox setup; how a run works; how to add an automated scene (copy an entry in `content/gallery/scenes.json`, step vocabulary table, `--dry-run`, `--scene <id> --keep` to debug, where failure evidence lands); how to add demo files and keep `LICENSES.md` complete; manual scenes; the two absolute rules (never `-C`/`reg import` on the host; never publish an image that failed the personal-data review)
- [X] T051 [US4] Full capture run and validation: `npm run shots`, then again; walk quickstart V4.2-V4.7 and V4.9; fix flaky scenes with `settle`/`waitWindow` rather than delays; run `npm run shots -- --manual --scene sftp` (V4.8) with the author, or set `sftp` to `published: false` and make `unicode-long-paths` featured if it cannot be staged; run `npm run og` (V4.10); commit `src/assets/gallery/*`, `content/gallery/captures.json`, the two PNGs and `og-image.png`

**Checkpoint**: ≥ 10 published scenes have images; `npm test` and `npm run build` green with gates G4/G5 now active.

---

## Phase 6: User Story 3 - A visitor tours the program through a feature gallery (Priority: P2)

**Goal**: featured gallery section on the home page, full gallery page per language, extended viewer.

**Independent Test**: quickstart **V3** (3.1-3.11).

**Depends on**: Phase 5 (images and `captures.json`).

- [X] T052 [US3] Create `src/_data/gallery.js` (function export): calls `loadGallery`, returns `published`, `featured` and per scene a `images[theme]` object (`full`, `card`, `width`, `height`, `cardWidth`, `cardHeight`) built from `captures.json`; errors fail the build
- [X] T053 [P] [US3] Create `src/_includes/components/gallery-card.njk` (Nunjucks macro `galleryCard(scene, lang, opts)`): `<figure class="gallery-item" id="<scene.id>">`, a `<button type="button" class="shot-zoom" data-gallery-index aria-label>` containing one `<img>` per theme with classes `shot-img shot-img--light|dark` (single-theme scenes: one `<img class="shot-img shot-img--any">`), each with `src` = card variant, `width`/`height`, `alt` = `scene.alt[lang]`, `loading="lazy" decoding="async"`, `data-full` = full-size URL; `opts.eager` → `loading="eager" fetchpriority="high"`; `opts.wide` → `srcset` card + full with `sizes`; `<figcaption>` with title, caption and an optional "since" label
- [X] T054 [P] [US3] Create `src/_includes/components/gallery-viewer.njk`: the `<dialog class="lightbox">` moved out of `screens.njk` and extended with previous/next buttons, a caption element (`aria-live="polite"`) and a counter; all labels from new i18n keys
- [X] T055 [US3] Create `src/_includes/sections/gallery.njk` replacing `src/_includes/sections/screens.njk`: `<section id="gallery">` with an empty `<span id="screens">` alias at its top, kicker/title/lead keeping the light/dark message, `gallery.featured` rendered through `galleryCard` (first two = `wide`, first = `eager`), link "Full gallery (N) →" to `{{ locale.url }}gallery/`, the viewer include; update `src/index.njk` and `src/cs/index.njk` to include it in place of `screens.njk`; delete `src/_includes/sections/screens.njk`; change the header nav label/target in `src/_includes/sections/header.njk` from Themes/`#screens` to Gallery/`#gallery`
- [X] T056 [P] [US3] Create `src/pages/gallery.njk`: `pagination: { data: languages, size: 1, alias: locale }`, `permalink: "{{ locale.url }}gallery/"`, `eleventyComputed.lang` = `locale.code`, `pagePath: "gallery/"`, `metaKey: "metaGallery"`, `layout: layout.njk`; add `"gallery/"` to `src/_data/pages.json`; header, `<main>` with page title/lead, every `gallery.published` scene through `galleryCard`, the viewer include, a closing link to `{{ locale.url }}#download`, footer; add the gallery link to the "Program" column of `src/_includes/sections/footer.njk` (key `footer.linkGallery`, added in T057). Confirm the layout's `locale` lookup works with the computed `lang` (adjust `layout.njk` if the alias collides)
- [X] T057 [US3] Update i18n catalogs `src/_data/i18n/en.json` and `cs.json`: remove the `screens.*` keys no longer used and `nav.themes`; add `nav.gallery`, `footer.linkGallery`, `gallery.kicker`, `gallery.title`, `gallery.lead`, `gallery.fullLink`, `gallery.pageTitle`, `gallery.pageLead`, `gallery.sinceLabel`, `gallery.zoomLabel`, `gallery.viewerLabel`, `gallery.viewerClose`, `gallery.viewerPrev`, `gallery.viewerNext`, `gallery.viewerCounter`, `gallery.backToDownload`, `metaGallery.title`, `metaGallery.description`
- [X] T058 [US3] Extend the lightbox in `src/js/main.js` per [contracts/pages-ui.md](contracts/pages-ui.md) "Gallery viewer": group = all `[data-gallery-index]` triggers on the page; show the `data-full` image of the **currently visible** theme variant; previous/next buttons, `←`/`→` (no wrap), `Home`/`End`, horizontal swipe ≥ 48 px via pointer events without hijacking vertical scroll; caption + counter update; cross-fade between items, spec-002 zoom kept for open/close, both off under `prefers-reduced-motion`; on close focus the trigger of the item shown last and scroll it into view; previous/next hidden for a one-item group; no auto-open from a URL fragment
- [X] T059 [US3] Add gallery styles to `src/css/main.css`: `.gallery-grid` (first row two wide cards; then 3 columns ≥ 1100 px, 2 columns ≥ 860 px, 1 below; full gallery page 2 columns ≥ 860 px), `.gallery-item` card look reusing the `.shot` frame tokens, theme switching - `html[data-theme="dark"] .shot-img--light { display:none }`, `html:not([data-theme="dark"]) .shot-img--dark { display:none }` (so the light variant shows without scripting), `aspect-ratio` from width/height as a fallback, `.gallery-item:target` accent outline and `scroll-margin-top` = header height, viewer chrome (prev/next, caption bar, counter) in both themes, `.since-label`; remove the now-unused `.screens-grid` rules
- [X] T060 [US3] Link highlights to scenes: add `"scene"` to the backfilled highlights in `content/releases/*.json` wherever a **published** scene illustrates them (panel-tabs, code-viewer, command-shell, instant-markdown → markdown-viewer, fast-thumbnails → thumbnails, unicode-review/unicode-long-paths → unicode-long-paths, sftp*, markdown-viewer, themes → dark-theme); confirm gate V10 accepts them and the "See it →" links of T014 resolve
- [X] T061 [US3] Run `npm test` and `npm run build`; walk quickstart V3.1-V3.11 (desktop + phone width, both languages, both themes, scripting off, *Fast 4G* throttling for the SC-006 budgets); commit sources and regenerated `public/`

**Checkpoint**: gallery live on home and `/gallery/`; PAD screenshot address serves the new light main window.

---

## Phase 7: User Story 5 - A returning user reads the release history (Priority: P3)

**Goal**: `/releases/` and `/cs/releases/` list every version with summary, highlights and a link to the full notes.

**Independent Test**: quickstart **V5** (5.1-5.3).

**Depends on**: Phase 2 only - may be implemented any time after Phase 4.

- [X] T062 [P] [US5] Create `src/pages/releases.njk`: paginated over `languages` like `gallery.njk`, `permalink: "{{ locale.url }}releases/"`, `pagePath: "releases/"`, `metaKey: "metaReleases"`; add `"releases/"` to `src/_data/pages.json`; page title/lead; loop over `releases.all` → `<article class="release" id="v{{ r.version }}">` with version, `releaseDate`-filtered localized date, kind label (`releases.kind.<kind>`), "current" badge when `r.version == site.version`, `summary[lang] | inline`, highlights as a list (title, `text | inline`, optional "See it →" to `{{ locale.url }}gallery/#<scene>` only when the scene is published), external link "Full release notes on GitHub ↗" = `r.notesUrl`; closing block linking to `{{ locale.url }}#download`. In the same task add the links that lead here: "All releases →" at the end of `src/_includes/sections/whats-new.njk` and a "Program"-column link in `src/_includes/sections/footer.njk`
- [X] T063 [P] [US5] Add i18n keys to `src/_data/i18n/en.json` and `cs.json`: `whatsNew.allReleases`, `footer.linkReleases`, `releases.pageTitle`, `releases.pageLead`, `releases.current`, `releases.fullNotes`, `releases.getIt`, `releases.kind.first`, `.feature`, `.bugfix`, `.maintenance`, `.installer`, `metaReleases.title`, `metaReleases.description`
- [X] T064 [US5] Add release-history styles to `src/css/main.css` (`.release` article rhythm, version heading with date and kind chip, current badge reusing `.version-chip`, highlight list, `:target` outline with `scroll-margin-top`), responsive at 860 px, light and dark tokens
- [X] T065 [US5] Run `npm run build`; walk quickstart V5.1-V5.3 and V3.8-V3.9 for the releases page (language switch keeps the page, sitemap lists it, every `notesUrl` opens the right GitHub release); commit

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T066 [P] Finish `README.md`: replace "Replace the (temporary) screenshots" with a short "Screenshots and gallery" section pointing to `tools/screenshots/README.md`; extend "Add a language" with the new obligations (every record and scene text gains the language - the build names what is missing; no new page files needed thanks to pagination); document `npm test`, `npm run shots`, `npm run og`
- [X] T067 [P] Accessibility pass on `/`, `/gallery/`, `/releases/` in both languages: keyboard-only walk (nav, cards, viewer, copy button), visible focus everywhere, screen-reader labels of the viewer and the copy status, heading order on the new pages, contrast of chips/badges in both themes; fix findings in `src/css/main.css`, `src/js/main.js` and the templates
- [X] T068 Performance pass against the budgets in [contracts/pages-ui.md](contracts/pages-ui.md): measure images fetched before first scroll (≤ 130 KB), total home images (< 1 MB), zero layout shift, no single image > 300 KB; tune `sizes`/`srcset`, the eager set and card quality in `tools/screenshots/postprocess.mjs` if needed and re-run post-processing
- [ ] T069 Full quickstart run V1-V5 on a clean `npm ci` checkout of the branch; confirm `npm test` and `npm run build` are green and `git status` is clean after the build (i.e. `public/` is committed in its regenerated state)
- [ ] T070 Record outcomes in `specs/007-release-news-gallery/quickstart.md` (a dated "Validation log" section: what passed, measured numbers for SC-002, SC-005, SC-006, any deferred scene) and hand over to the author: summary of what is ready to merge, the remaining author-only steps (merge, deploy, slunecnice.cz submission from spec 005 T018/T019), and the suggestion to propose a separate-configuration start-up option to the application project (research R1)

---

## Dependencies & Execution Order

### Phase dependencies

```text
Phase 1 Setup
   └─► Phase 2 Foundational (records, routing)
          ├─► Phase 3 US1 (P1)  ──┐
          ├─► Phase 4 US2 (P1)  ──┼─► P1 deliverable - mergeable without Windows Sandbox
          ├─► Phase 7 US5 (P3)  ──┘   (US5 needs only Phase 2; do it here if convenient)
          └─► Phase 5 US4 (P2) ─► Phase 6 US3 (P2)
                                         └─► Phase 8 Polish
```

- **US1** needs Phase 2 (records + `releases.js`). Independent of US2-US5.
- **US2** needs Phase 2. T026's stale report tolerates a missing gallery, so US2 does not wait for US4.
- **US4** needs Phase 1 only in principle; T043 extends `lib/content.js` from Phase 2. **T037 (spike) gates T038-T051** and needs the author to have enabled Windows Sandbox.
- **US3** needs US4's output (`captures.json`, images) and Phase 2's routing (T011-T013). T060 touches records created in T007.
- **US5** needs Phase 2 only. Its "See it →" links become active once US3 has published scenes (the template already guards on `published`).

### Within phases (beyond the obvious top-to-bottom order)

- T005 → T007, T008, T009; T006 → T007.
- T011 → T012, T013, T056, T062.
- T013's sitemap lists `gallery/` and `releases/` only once their templates exist - drive its page list from a small array in `src/_data/pages.json` that T056 and T062 each extend (create it in T013 with the home entry only).
- T014 → T015 → T021; T016 independent of T014; T019 → T020.
- T022 → T024 → T025 → T026 → T028, T030.
- T031 → T032 → T033 → T036 → T037; T035 needs T033; T034 before T036.
- T038, T039, T040 → T046 → T051; T042 → T043 → T044; T045 → T046.
- T052 → T055, T056; T053, T054 → T055, T056; T057 before the build in T061.

### Parallel opportunities

- Phase 1: T003, T004 alongside T002.
- Phase 2: T006 ‖ T005; T008 ‖ T009 (after T005); T011-T013 are independent of T005-T010.
- US1: T017 ‖ T018 ‖ T014-T016 (different keys of the same two JSON files - merge carefully or do T017/T018 in one sitting).
- US2: T022 ‖ T023; T027 ‖ T028 ‖ T029.
- US4: T034 ‖ T031-T033; T041 ‖ T038-T040; T044 ‖ T045; T048 ‖ T049 ‖ T047.
- US3: T053 ‖ T054 ‖ T056 ‖ T057.
- US5: T062 ‖ T063.
- US1, US2 and US5 can be worked by different people/sessions at the same time once Phase 2 is done; US4's tooling (T031-T050) is independent of all site templates.

### Parallel example - User Story 4 after the spike

```text
Session A: T038 steps.ps1  →  T039 config layering  →  T040 workspace builder
Session B: T041 demo content + LICENSES.md  →  T042 scenes.json
Session C: T043 lib/content.js gallery half  →  T044 tests  →  T045 postprocess.mjs
Join:      T046 capture.mjs complete  →  T047/T048/T049 in parallel  →  T050  →  T051 full run
```

---

## Implementation Strategy

### MVP first (US1, then US2)

1. Phase 1 → Phase 2 → **Phase 3 (US1)**: the site finally describes 0.1.8. Stop, validate V1, let the author look at the texts - the Czech wording in particular is editorial and deserves the author's eye.
2. **Phase 4 (US2)**: the mechanism that keeps it that way. Validate V2 by replaying 0.1.8.
3. Optionally Phase 7 (US5) - cheap, and it makes the release records visible in full.
4. **Review/merge point.** Everything so far works with the two old screenshots and without Windows Sandbox.

### Then the gallery

5. Author enables Windows Sandbox. **Phase 5 starts with the spike (T031-T037)** - a day at most, and it decides the capture path before any scene work is invested.
6. Rest of Phase 5 → Phase 6 → Phase 8.

### Points where the author must be involved

| Task | Why |
|------|-----|
| T007, T017, T018 | editorial texts in two languages - review before they ship |
| before T037 | enable Windows Sandbox + reboot (one time) |
| T037 | go/no-go on the capture path if no prepared fallback works |
| T041 | source of demo photos (own photos as CC0 vs. Wikimedia Commons) |
| T051 (V4.8) | staging the SFTP scene; deciding to defer it |
| T048 scenes | cloud-sync and VCS badges need the author's real accounts - deferred by default |
| after T070 | merge, deploy, catalog submission |

---

## Phase 9: Author's revisions (2026-09-20)

Four corrections after the author reviewed the first gallery.

- [X] T071 Gallery shows **only what Tandem Commander added** to Open Salamander: `content/gallery/scenes.json` rewritten (file comparator, batch rename, disk map and archive browsing retired with their images; thumbnails and the configurable command shell added), `PUBLISHED_MIN` in `lib/content.js` lowered to 7, FR-017 and data-model updated
- [X] T072 An enlarged picture is never smaller than its card: dialog scenes are captured with the new `capture: "withDialog"` step, which draws the dialog onto the application window (`CaptureWithDialog` in `tools/screenshots/guest/Win32.cs`)
- [X] T073 Card layout in `src/_includes/components/gallery-card.njk` and `src/css/main.css`: title and caption **above** the picture and separated by a rule, picture centred in a frame of uniform height, no version label (the `since` field stays in the catalog, unused)
- [X] T074 Viewer replaced with **PhotoSwipe 5** (MIT), vendored in `src/js/vendor/photoswipe/`, driven by `src/js/gallery.js`: title and caption in the viewer, previous/next, zoom, counter and a full-screen button, captions visible in full screen; cards are plain links, so the gallery works without scripting. The hand-written lightbox of feature 002 and its CSS are gone
