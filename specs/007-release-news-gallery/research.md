# Phase 0 Research: Release-Driven Website Content and Feature Gallery

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Date**: 2026-09-20

Each item: **Decision** / **Rationale** / **Alternatives considered**. R1 is the one finding that
changed the specification; everything else fills in what the spec deliberately left to planning.

---

## R1 - How the application is isolated from the author's settings during capture

**Finding (verified in the application source, `src/salamdr1.cpp` and `src/salamdr2.cpp`).**
The `-C <file>` start-up option does *not* run the program on an alternative configuration. The
comment at the call site says it outright - *"pokud soubor existuje, bude importován do registry"* -
and `ImportConfiguration()` merges the file into `HKCU\Software\Tandem Commander\0.1`, the single
hard-coded configuration root (`SalamanderConfigurationRoots[0]`). There is no portable mode, no
environment override, no second root. Any staged scene started under the author's Windows account
would therefore overwrite the author's real configuration, and any unstaged one would display it.
The pre-spec feasibility note was wrong and has been corrected in the spec.

What *is* true and useful: every piece of scene state is ordinary registry data under that root -
`Theme Mode`, `Language`, `Show Splash Screen`, `Panel Tabs`, the `Window` rectangle
(`Left/Top/Right/Bottom/Show/Split Position`), and per panel `Path`, `View Type`, `Sort Type`,
`Tabs\<n>` and `Active Tab` - and `-l`, `-r`, `-a`, `-p` set panel directories and the active panel
from the command line.

**Decision.** Capture runs inside **Windows Sandbox**, the disposable clean Windows 11 desktop
built into Windows 11 Pro. For each run the host orchestrator writes a `.wsb` file that maps four
host folders into the guest (guest scripts and demo content read-only, the cached installer
read-only, an output folder read-write), disables networking and clipboard sharing, and sets a
logon command that starts the guest driver. The guest driver silently installs the **officially
published installer** (`/VERYSILENT`, which works since 0.1.7), seeds `HKCU` of the throw-away
guest account per scene with `reg import`, runs the scenes, writes PNGs and a result manifest to
the output folder, and shuts the guest down. Nothing of the author's exists inside the guest, so
FR-027 and SC-007 hold *by construction* rather than by care: no profile name (the guest user is
`WDAGUtilityAccount`, paths are `C:\Workspace\…`), no author drives, bookmarks, hot paths, history
or cloud entries in the drive bar.

**Rationale.**
- It is the only option that satisfies FR-027 ("MUST NOT read, display or modify the author's
  settings") without an application change, which the spec rules out.
- It makes the clarified guarantee stronger, not weaker: the binary captured is *byte-for-byte the
  installer a visitor downloads*, verified by size against `site.json` and by Authenticode
  signature - the same check `tools/winget/publish.ps1` already performs in the application
  repository. The author need not even have that version installed.
- Reproducibility (SC-005) comes for free: every run starts from the same pristine OS image, with
  the default Windows theme, accent colour and title-bar style, no leftover state between runs.
- The machine qualifies: Windows 11 Pro, hypervisor present. The feature is currently not enabled
  (`WindowsSandbox.exe` absent) - a **one-time prerequisite**: *Turn Windows features on → Windows
  Sandbox*, reboot. Documented in quickstart and checked by the orchestrator's preflight.

**Alternatives considered.**
- *`-C` with a scene file on the author's account* - what the spec first assumed. Rejected: it
  destroys the author's configuration (see finding).
- *Export the author's registry key, import scene config, restore afterwards.* Rejected: violates
  FR-027 outright; a crash mid-run leaves the author with the screenshot configuration; an
  everyday instance that is running would write its state over the scene on exit and vice versa
  (FR-026b).
- *A dedicated local Windows account (`runas`).* Isolates `HKCU` and needs no reboot, but the guest
  still sees the author's drives, cloud providers and network; needs an account and a stored
  password; the desktop environment (scaling, accent colour) is the author's and drifts. Kept as
  the documented fallback if the R2 spike shows Sandbox cannot capture - not built otherwise.
- *A full VM (Hyper-V) with checkpoints.* Same isolation, much more setup and a Windows licence to
  maintain. Rejected as disproportionate.
- *A `-portable`/separate-store start-up option in the application.* The clean long-term answer and
  worth proposing to the application project, but out of scope here (spec: no application change)
  and it would not remove the author's drives and cloud entries from the pictures anyway.

**Consequence for hand-staged scenes.** Two kinds exist (see R6): staged inside the Sandbox (no
personal account needed - e.g. SFTP against a public test server) and staged on the author's
machine (needs the author's real cloud/VCS setup). Only the second kind ever shows the author's
instance, and the spec now says so explicitly (FR-027 exception, with a mandatory personal-data
review step).

---

## R2 - Capturing windows inside the guest (and the spike that must run first)

**Decision.** The guest driver is a **Windows PowerShell 5.1** script with a small `Add-Type` C#
block for Win32 calls - the only scripting runtime a fresh Sandbox has. It captures with
`PrintWindow(hwnd, PW_RENDERFULLCONTENT)` into a bitmap sized from
`DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS)`, which yields the window with its title bar,
without drop shadow and with square corners (the site's CSS rounds them), independent of what is
behind the window. Windows are positioned with `SetWindowPos`; input goes through `SendInput`
(keys) after `SetForegroundWindow`; waiting is always on a condition (window with a given title
fragment exists / is idle via `WaitForInputIdle` + a stable-pixels check), never a bare sleep.

**The spike (first implementation task, blocks the rest of the screenshot work).** Three things
cannot be known without trying on the author's machine, each with a prepared answer:

| Unknown | If it fails |
|---------|-------------|
| `PrintWindow` renders the main window, dialogs *and* the WebView2-based viewers correctly | Fall back to `Graphics.CopyFromScreen` over the frame bounds with the app on a plain backdrop window; requires the Sandbox window to stay un-minimised during the run (documented). |
| WebView2 Runtime is present in the guest (Markdown and Code Viewer scenes need it) | The orchestrator caches the Evergreen **standalone** installer next to the app installer and the guest installs it silently first. No network in the guest either way. |
| Guest display scaling is 100 % | Record the guest DPI in the manifest; if it follows a scaled host, the orchestrator refuses with a clear message naming the fix (run with the host display at 100 %, or on the external monitor). Images are never rescaled to fake a size - resampled UI text is visibly soft. |

**Rationale.** PowerShell + P/Invoke needs nothing installed in the guest and is the same stack the
application repository's release tooling uses (`tools/codesign`, `tools/winget`). `PrintWindow` with
full-content rendering is the documented way to capture a DWM-composed window without its
surroundings.

**Alternatives considered.** *Node/Python + a UI-automation package in the guest* - needs a runtime
installed at every run and network access. *AutoHotkey* - a third-party binary to vendor and trust
for little gain over `SendInput`. *Driving the Sandbox from the host through RDP automation* - far
more fragile than running the driver inside.

---

## R2a - Spike result (2026-09-20)

The spike of task T037 ran eight times against Windows Sandbox on the author's machine. What it
settled:

| Question | Answer |
|----------|--------|
| Does `PrintWindow(PW_RENDERFULLCONTENT)` capture the program? | **Yes.** The main window comes out exactly 1200 × 800 with its title bar, square corners and no desktop showing through; dialogs and the WebView2-based viewers render too. No fallback to `CopyFromScreen` is needed, so the Sandbox window may be covered during a run (it must stay un-minimised only for the manual scenes). |
| Is WebView2 present in the guest? | **No.** A fresh Sandbox has no WebView2 Runtime, and the Markdown viewer silently degrades to plain text without it. The orchestrator therefore caches Microsoft's standalone Evergreen installer (213 MB, signature verified) next to the application installer, and the guest installs it before the application - about 45 s per run, offline. |
| Is the guest at 100 % scaling? | **Yes**, 96 dpi regardless of the host's scaling, and the value is recorded in every capture. |

Three things the spike found that the plan had not anticipated:

1. **The guest inherits the host's regional settings.** The first run produced a Czech user
   interface with Czech date formats - and, incidentally, showed that the application's Czech UI
   is mojibake when the system code page is not 1250 (worth an issue in the application project,
   unrelated to this feature). The driver now forces `en-US` and the English language module.
2. **Windows Sandbox runs with UAC switched off** (`EnableLUA = 0`), so every process of its
   administrator account is High-integrity and the program appends "(Administrator)" to its
   title - unacceptable in a published screenshot. Neither `runas /trustlevel`, nor a scheduled
   task with `RunLevel Limited`, nor `explorer.exe`, nor a Safer normal-user token, nor a
   duplicate of the driver's own token lowered to medium integrity avoids it: the last two fail
   with `0xc0000142` because the window station itself is high. **The fix that works:** the driver
   switches UAC on in the guest and restarts it once (Windows Sandbox survives
   `Restart-Computer`); on the second boot the account has an ordinary split token, the program
   runs unelevated and its title is clean. `--no-uac-restart` skips this for debugging.
3. **A shared folder is not a safe place to tail a file.** Reading `progress.jsonl` from the host
   while the guest appended to it made the guest's own write fail and killed a run. The guest now
   retries such writes and treats progress as diagnostics; the host reads through a copy.

Also settled by the spike: the base configuration needs no manual export (task T035 as written is
void). The driver produces it by starting the freshly installed program once with no configuration
at all and closing it normally, which is how the program writes its defaults; every scene then
re-imports that file and layers its own values on top.

## R3 - Frame size, scaling and image formats

**Decision.**
- Main-window scenes: **1200 × 800 px at 100 %** (today's placeholders are 1089 × 773; 3:2 fits the
  card grid and leaves room for the tab strip). Secondary windows (viewers, comparator, dialogs)
  declare their own size per scene; dialogs that cannot be resized are captured at natural size.
- The guest writes lossless PNG. The host post-processes with **`sharp`** (new devDependency):
  per scene × theme a **lossless WebP** at native size for the enlarged view and a **640 px-wide
  WebP (quality 82)** for cards and small screens, plus `width`/`height` read back into the capture
  manifest so templates can reserve space (FR-020).
- PAD and legacy addresses: `src/assets/screenshot-light.png` and `screenshot-dark.png` remain,
  regenerated as PNG copies of the `main-window` and `dark-theme` scenes (FR-023; the PAD 4.0
  screenshot pattern requires a `.png/.jpg/.gif` extension).
- Generated variants are **committed** under `src/assets/gallery/`, consistent with the site's
  "everything needed to deploy is in the repository, Workers Builds runs no build step" rule. The
  Eleventy build itself does no image processing and stays dependency-free and fast.

**Rationale.** UI screenshots are flat colour and text: lossless WebP is typically 25-35 % smaller
than optimised PNG with no loss; today's 1089 × 773 PNGs are ~65 KB, so a 1200 × 800 lossless WebP
lands near 60-90 KB and even viewer scenes stay well under SC-006's 300 KB. A 640 px card variant
is ~25-40 KB, so 4-6 featured cards keep the home page's first screen within today's ~130 KB.
WebP is supported by every browser the site already targets (it uses `<dialog>`).

**Alternatives considered.** *AVIF* - better on photos, worse or equal on UI text, slower to
encode, no benefit here. *`@11ty/eleventy-img` at build time* - would make every site build
process ~60 images and pull `sharp` into the deploy path; the capture pipeline is the natural
single place where images change. *PNG only* - simplest, but roughly doubles the gallery page's
weight.

---

## R4 - Theme-matched images without scripting

**Finding.** The site theme is an attribute on `<html>` set by the bootstrap script (not a media
query), so `<picture><source media="(prefers-color-scheme)">` cannot follow the header's theme
switch.

**Decision.** A two-theme item renders **both** `<img>` elements with `loading="lazy"`,
`decoding="async"` and explicit `width`/`height`; CSS shows the one matching `[data-theme]` and
hides the other with `display:none`. Browsers do not fetch lazy images that are not rendered, so
only the visible variant downloads, and a theme switch swaps them with no script (FR-019). With
scripting disabled the theme attribute is absent and the light variant shows (FR-021). The first
featured card on the home page is `loading="eager"`. The light/dark comparison (FR-019, last
clause) is kept exactly as today's two-image section has it: `main-window` is captured **light
only** and `dark-theme` **dark only**, side by side as the first two featured items, so both are
visible whatever the site theme is. Every other two-theme scene follows the site theme.

**Alternatives considered.** *Swap `src` in JavaScript on theme change* - breaks without scripting
and flashes. *CSS `background-image`* - no text alternative, no intrinsic size.

---

## R5 - Driving scenes: a small declarative step language

**Decision.** A scene's staging is data, not code (FR-025, SC-008). Each automated scene has:
`config` (registry overrides on top of a committed base `.reg`: theme, panel paths, view type,
tabs, window rectangle), `launch` (`-l`/`-r`/`-p` arguments) and an ordered list of `steps` from a
closed vocabulary the guest driver implements once:

`focus` (type-ahead to a file name in the active panel) · `keys` (a key chord, e.g. `F3`,
`Ctrl+Shift+T`, `Alt+5`) · `waitWindow` (title fragment and/or class, with timeout) ·
`resize` (the window matched last) · `settle` (wait until two consecutive captures are identical,
bounded) · `capture` (`main` | `foreground`) · `close`.

The base `.reg` is produced once by exporting a first-run configuration *inside the Sandbox*
(English UI, splash off, confirmations as default) and committed; it contains nothing personal.
Scenes never edit it - they layer overrides, and the guest re-imports base + overrides before
every scene, so scenes cannot leak state into each other.

**Rationale.** Everything a scene needs at start is registry-seedable (R1), so steps are only
needed to *open* things (a viewer, a dialog, a menu). A closed vocabulary keeps the driver small
and makes "add a scene" a JSON edit. Quick-search type-ahead is the program's native way to put
the cursor on a file, so no coordinates are ever used.

**Alternatives considered.** *One PowerShell script per scene* - flexible, but every new scene is
code and copies boilerplate. *UI Automation element trees* - the classic Win32 panels expose
little; keyboard driving is what the program is built for.

---

## R6 - Scene modes and what each initial scene is expected to be

| Mode | Where | How | Initial scenes |
|------|-------|-----|----------------|
| `auto` | Sandbox, no network | fully scripted | main window + tabs, dark theme, Code Viewer, Markdown viewer, Unicode & long paths, thumbnails, image viewer, archive as folder, file comparator, batch rename, disk map, Command Shell configuration page |
| `manual-sandbox` | Sandbox, network on, kept open | guest prepares the app, shows the scene's written steps in a small always-on-top helper with a *Capture* button | SFTP in a panel - against the public read-only test server `test.rebex.net` (user `demo`), whose host name is neutral |
| `manual-host` | author's machine, author's installed instance | `capture-window` helper resizes the staged window to the standard frame and captures it; steps end with a personal-data review | cloud sync badges, TortoiseGit/SVN badges - **deferrable** under FR-017 |

Twelve `auto` scenes already exceed FR-017's minimum of ten, so the gallery can launch without any
manual scene. `manual-host` reads the version from the installed executable on the host and
applies the same "not older than the site" refusal (FR-026a).

**Risk noted.** A third-party test server may disappear; the scene is manual precisely so that the
author can substitute any server whose name they are happy to publish.

---

## R7 - Demo workspace

**Decision.** `tools/screenshots/demo/` holds the committed, hand-curated content (business-like
folders and documents, a few source files in C++, Python, TypeScript, JSON, YAML, a `README.md`
and a longer Markdown document with a table and code block, two text files that differ, a dozen
photos). A **manifest** (`workspace.json`) describes what must be *generated* in the guest because
Git and Windows tooling handle it badly or non-deterministically: Unicode-named files (Czech,
Greek, Japanese, emoji - the application repo's `create-test-fixtures.ps1` is the model), a path
beyond 260 characters, ZIP/7z archives built from listed folders, a large-ish tree for the disk
map, and - for every file - a **fixed modification time**, because dates and times are visible in
every panel and would otherwise differ between runs (SC-005). The guest builds `C:\Workspace` from
demo + manifest before the first scene.

Photos: **public-domain / CC0 images only**, ≤ 1600 px, including at least two portrait shots with
EXIF orientation set (they demonstrate the 0.1.4 fix), each listed with source URL, author and
licence in `tools/screenshots/demo/LICENSES.md` (FR-028). Preferred source: the author's own
photos dedicated to CC0 - no third-party terms at all; Wikimedia Commons CC0/PD as the alternative.

**Alternatives considered.** *Reuse `E:\Projects\tandemcommander\temp\Workspace`* - not
reproducible, not in this repository, shows a developer path. *Generated placeholder images* -
a thumbnail grid of flat colours sells nothing.

---

## R8 - Where release records and scenes live, and why not in the i18n catalogs

**Decision.** Structured content gets its own top-level folder, outside the Eleventy input tree:

- `content/releases/<version>.json` - one file per release record, texts inline per language
  (`{"en": "…", "cs": "…"}`).
- `content/gallery/scenes.json` - the ordered scene catalog, texts inline per language.
- `content/gallery/captures.json` - the capture manifest, written only by the capture pipeline.

`src/_data/releases.js` and `src/_data/gallery.js` load, **validate** and derive (sorted list,
current record, the six home-page cards, featured scenes, per-scene image facts) through one
shared pure-logic module, `lib/content.js`, which the release tooling and the tests use too. A
validation failure throws, which fails the build - the same mechanism as the existing i18n and PAD
gates (FR-009, FR-016).

**Rationale.** The README rule "all user-visible text lives in the i18n catalogs" exists to
guarantee language parity. Records and scenes are *lists of variable length*; flattening them into
`whatsNew.entry7Title`-style keys is exactly the four-fixed-slots structure the spec identifies as
the reason the texts were never refreshed. Inline per-language objects keep a record in one
reviewable file, and the loader enforces the same parity guarantee against `languages.json`
(every text must have exactly the site's language codes, non-empty). Fixed UI strings of the new
pages (headings, labels, button names) still go to the i18n catalogs. One file per release makes
"add a record" a new file with a trivial diff; file names with dots are harmless because Eleventy
never auto-loads this folder.

**Text format.** Plain text, with backticks as the only markup (`` `winget upgrade` `` renders as
the site's monospace span after escaping). No HTML in content files, so no new entries in
`RICH_TEXT_KEYS` and nothing to sanitise. The PAD change-info is derived from the current record:
summary plus highlight titles, English, single line, truncated at a sentence boundary to the PAD
field's limit - replacing the current derivation from `whatsNew.entry*`.

**Alternatives considered.** *Markdown files with front matter per release* - pleasant for prose,
awkward for two languages in one file. *`src/_data/releases/*.json` auto-loaded by Eleventy* -
dotted file names become nested keys and validation would have nowhere central to live.

---

## R9 - Release facts: where they come from

**Decision.** `tools/release/release.mjs` (plain Node ≥ 22, no dependencies, built-in `fetch`):

- **Installer size and publication** - GitHub REST `GET /repos/tandemcommander/tandemcommander/releases/tags/v<version>`
  (unauthenticated; the repository is public). The asset named exactly as `installer.js` derives
  it must exist; its `size` becomes `installerSizeBytes`. Draft or missing release → stop (FR-012).
- **Release date, kind hint, build number, changelog section** - parsed from the application's
  `CHANGELOG.md` heading `## [<version>] - <date>` and its `**Build N.**` lead. Source order:
  `--changelog <path>` → sibling checkout `../tandemcommander/CHANGELOG.md` → the file at tag
  `v<version>` on `raw.githubusercontent.com`. The changelog date is authoritative (it is what the
  application, winget and the PAD file already use); a GitHub `published_at` on a different day
  is reported as a warning, not an error.
- The section text is written to `.work/release/<version>-changelog.md` for the assistant (or the
  author) to digest from.

**Alternatives considered.** *`gh` CLI* - not installed on the author's machine and adds an
authentication step for public data. *Reading the size from a locally built installer* - the
author's build output is not necessarily the published asset.

---

## R10 - The assisted layer: a repository skill

**Decision.** `.claude/skills/release-web/SKILL.md`, committed next to the Spec Kit skills the
repository already tracks, invoked as `/release-web <version>`. It scripts the assistant's part of
FR-011: run `release facts`, read the changelog section, draft summary + highlights in every site
language following `tools/release/DIGEST-STYLE.md`, show the draft, write `content/releases/<v>.json`
**only after explicit approval**, run `release apply` and `release check`, relay the stale-image
report and the remaining manual steps. It never commits, pushes or deploys.

`DIGEST-STYLE.md` is the editorial contract so drafts are consistent across releases and across
assistants: who the reader is (a power user deciding whether to install or update), what earns a
highlight (something the visitor can see or that removes a reason not to install), 0-6 highlights,
title ≤ 40 characters, text ≤ 220, no internal identifiers, fixes grouped by theme, Czech written
natively rather than translated word for word, and the 0.1.0-0.1.8 backfill as worked examples.

Without an assistant the same three commands work by hand: `facts` → `apply` creates the record
skeleton with empty texts → the author fills them → `check`. The build gate rejects empty texts, so
a half-done release cannot ship (FR-011a, SC-003).

**Alternatives considered.** *Calling a model API from the release script* - needs a key, a network
dependency and error handling for a step the author performs inside an assistant session anyway.
*Instructions only in the README* - works, but a skill is discoverable and versioned with the repo.

---

## R11 - New pages, multi-language routing, navigation, sitemap

**Decision.**
- Two new templates, `src/pages/releases.njk` and `src/pages/gallery.njk`, each **paginated over
  `languages.json`** with `permalink: "{{ locale.url }}releases/"` (→ `/releases/`, `/cs/releases/`)
  - so "add a language" does not grow by two files per language. The home pages keep their
  existing one-file-per-language form; converting them is out of scope.
- `layout.njk` gains a `pagePath` value (`""`, `"releases/"`, `"gallery/"`): canonical, `hreflang`
  alternates, `og:url` and the language switcher links all append it, so the switcher leads to the
  same page in the other language (FR-015). The before-paint language redirect stays home-only.
  Titles and descriptions for the new pages are new i18n keys.
- Header navigation stays a home-page section menu; "Themes" becomes "Gallery" (`#gallery`). On the
  sub-pages the same links point at `{{ locale.url }}#…`. The new pages are reached from their
  home sections ("Full gallery →", "All releases →") and from the footer.
- `sitemap.xml` stops being a hand-maintained static file and is generated from
  `languages × pages`, with `lastmod` = the current release date.
- Gallery item address: `/gallery/#<scene-id>`; `:target` gives it a highlight and
  `scroll-margin-top` clears the sticky header (FR-022). Highlight→scene references are validated
  by the loader, so a dead in-page link fails the build (FR-009).

**Alternatives considered.** *Everything on the single page* - rejected in clarification Q2.
*Copying `index.njk` per language for each new page* - consistent with today, but triples the
"add a language" checklist.

---

## R12 - Gallery viewer - *superseded 2026-09-20, see R12a*

**Decision.** Extend the existing `<dialog>` lightbox (spec 002) rather than replace it: triggers
in the same container form a group; the dialog gains previous/next buttons, a caption
(`<figcaption>` text of the item) and an "n / N" counter; Left/Right arrows, Home/End, swipe on
touch, Escape unchanged; focus returns to the originating trigger of the *currently shown* item on
close. The enlarged image uses the full-size WebP of the **site's current theme**. The open/close
zoom animation from spec 002 is kept for open and close; stepping between items cross-fades.
No library.

**Rationale.** FR-018 asks for the existing interaction to be extended; the current code is ~100
lines of dependency-free script and already handles focus, scroll locking and reduced motion.

---

## R12a - PhotoSwipe (replaces R12, author's decision 2026-09-20)

**Decision.** The enlarged view is **PhotoSwipe 5** (MIT), vendored into `src/js/vendor/photoswipe/`
and served from the site like the fonts - no CDN, no runtime third-party request. `main.js` imports
`js/gallery.js` as a module only on pages that have a gallery; that module registers two extra UI
elements of its own: a caption bar carrying the item's title and caption, and a full-screen button
(PhotoSwipe has none). Because both are part of PhotoSwipe's own interface, the caption stays
visible in full screen, which the hand-written viewer could not do.

**Rationale.** The hand-written viewer of feature 002 had no pinch-zoom, no full screen, and would
have needed all of that written from scratch; PhotoSwipe is 68 KB of vendored, self-contained
JavaScript and is only fetched when a gallery is on the page. The "no library" line of the original
plan was a guideline, not a requirement, and the author asked for this one by name.

**Cards are links, not buttons.** Each item is an `<a href>` to the full-size picture carrying its
dimensions in `data-pswp-*`, so with scripting off (or on a browser without modules) the picture
still opens - the gallery degrades to plain links instead of going dead.

---

## R13 - Testing approach

**Decision.** The repository has no test runner; add the built-in **`node --test`** (no dependency)
with `npm test`, covering the pure logic in `lib/content.js` and `tools/release/`: record and scene
validation (every FR-009 / FR-016 failure has a fixture), the six-card selection (FR-010: more than
six, none, same-day releases, fewer than six in total), version ordering, changelog-section
parsing (against the real 0.1.0-0.1.8 sections), stale-image reporting, PAD change-info
derivation and truncation. Build-level behaviour is verified by building with broken fixtures via
an environment override of the content folder (`TC_CONTENT_DIR`), and everything visual or
Windows-side by the scenarios in [quickstart.md](quickstart.md). The guest driver's step parser
gets a dry-run mode (`-WhatIf`-style: validate and print, do nothing) that runs on the host.

**Alternatives considered.** *Vitest/Jest* - a dependency tree for a few dozen assertions.
*Playwright for the lightbox* - valuable, but a browser download and CI the project does not have;
the quickstart covers it manually, as specs 002 and 004 did.

---

## R14 - Social-preview image (FR-024) - *superseded, see note*

> **Implementation note (2026-09-20):** the existing `og-image.png` contains no screenshot and no
> version (lockup, tagline, repository URL only), so FR-024 already holds and nothing below was
> built. Kept for the record.

**Decision.** Commit the template the author's previous regeneration used ad hoc:
`tools/og-image/og.html` (lockup, tagline, a framed `main-window` screenshot) rendered to
`src/assets/og-image.png` at 1200 × 630 by headless Microsoft Edge (`--headless --screenshot`,
always present on Windows 11), wrapped as `npm run og`. The capture pipeline's closing summary
reminds the author to run it when the `main-window` scene changed.

---

## Open risks carried into tasks

1. **Sandbox capture viability (R2)** - resolved by the spike; fallback paths are decided, not open.
2. **Keyboard driving is timing-sensitive** - mitigated by condition waits and `settle`; SC-005's
   10-minute budget allows generous timeouts (≈ 13 scenes × 2 themes).
3. **Release-facts step depends on the GitHub API being reachable** - acceptable; the by-hand path
   needs no network.
4. **`sharp` is a native dependency** - installs prebuilt binaries on Windows x64 and is only used
   by capture tooling, never by the site build or deploy.
