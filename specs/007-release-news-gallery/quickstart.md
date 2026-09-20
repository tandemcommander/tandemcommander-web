# Quickstart & Validation: Release-Driven Website Content and Feature Gallery

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

How to run what this feature adds, and the scenarios that prove it works. Details of formats and
commands live in [contracts/](contracts/) and [data-model.md](data-model.md); they are referenced,
not repeated.

## Prerequisites

| For | Need |
|-----|------|
| site build, tests, release commands | Node ≥ 22, `npm install` (adds `sharp` as a devDependency; nothing else new) |
| `release:facts` | network access to `api.github.com`; optionally the application repository at `../tandemcommander` |
| `/release-web` | an AI coding assistant that loads repository skills (Claude Code) - optional, see V2.5 |
| `npm run shots` | Windows 11 Pro with **Windows Sandbox enabled** - one time: *Turn Windows features on or off → Windows Sandbox*, reboot (or elevated `Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM`); host display at 100 % scaling during a run if the spike (V4.1) says the guest inherits it |

Work on branch `007-release-news-gallery`. Nothing here deploys; pushing to `main` does.

## Everyday commands

```bash
npm test                          # pure-logic tests (node --test)
npm run build                     # site build incl. release/gallery/PAD gates
npm run dev                       # preview at http://localhost:8080

npm run release:facts -- 0.1.9    # read-only: is the release published, what are its facts
npm run release:apply -- 0.1.9    # site.json + record skeleton
npm run release:check             # tests + build + stale-image report + remaining steps

npm run shots -- --dry-run        # validate scenes and demo manifest, start nothing
npm run shots                     # all automated scenes for the site's version
npm run shots -- --scene code-viewer --theme dark
npm run shots -- --manual         # also hand-staged Sandbox scenes (SFTP)
npm run shots -- --host cloud-sync-badges
```

---

## V1 - Content catch-up (User Story 1)

| # | Do | Expect |
|---|----|--------|
| 1.1 | `npm run build`, open `/` and `/cs/` | hero, features and meta description mention tabs, Code Viewer, configurable command shell, cloud sync badges, winget, Altap migration (FR-001) - in both languages |
| 1.2 | read "What's new" | header line "Version 0.1.8 · date" + summary; six cards, 0.1.8's first (Panel tabs leading), then 0.1.6, …; every card has a version label; lead text does not say "in this release" (FR-002, FR-010) |
| 1.3 | download section - set `site.json → winget.available` to `true` first (it is `false` until the package is live in the catalogue; with `false` the block must be absent) | installer button primary; winget command with Copy → clipboard holds `winget install tandemcommander`; disclaimer no longer says "first release"; with scripting off the command is still selectable (FR-003) |
| 1.4 | open `public/pad.xml` | `Program_Change_Info` describes 0.1.8, ≤ 300 chars, single line; descriptions and keywords mention the new capabilities; build's PAD 4.0 gate passes (FR-004) |
| 1.5 | grep the built pages for `0.1.0` | appears only in the release history and "since" labels - nowhere as the current state (SC-001) |

## V2 - Release procedure and build gate (User Story 2)

Run in a scratch copy or stash afterwards - these scenarios edit `site.json` and `content/`.

| # | Do | Expect |
|---|----|--------|
| 2.1 | set `site.json.version` to `9.9.9`, `npm run build` | build fails: `releases: no record for current version 9.9.9 - create content/releases/9.9.9.json` (SC-003) |
| 2.2 | restore; in `0.1.8.json` delete the `cs` summary → build | fails naming `summary.cs`; set `date` to another day → fails naming both dates; set a highlight `scene` to `nope` → fails naming highlight and scene (FR-009) |
| 2.3 | `npm run release:facts -- 0.1.8` | exit 0; prints date 2026-09-20, build 192, installer name and `8247136` bytes; writes `.work/release/0.1.8-changelog.md` containing the 0.1.8 section only |
| 2.4 | `npm run release:facts -- 9.9.9` | exit 1, "release v9.9.9 not found on GitHub", no file changed (FR-012) |
| 2.5 | simulate a release by hand: copy `0.1.8.json` aside, delete it, `npm run release:apply -- 0.1.8` | skeleton recreated with empty texts; `release:check` fails at the build naming the empty `summary.en`; fill texts → passes; stale report printed (FR-011a) |
| 2.6 | `/release-web 0.1.8` on a copy without the record | assistant shows a bilingual draft, writes nothing until approved, then runs apply + check and relays the report; never commits (contracts/release-cli.md) |
| 2.7 | temporarily give 0.1.8 `"highlights": []` → build | home shows 0.1.8's summary line above six cards from 0.1.6 and older - section never empty (US2 scenario 5) |
| 2.8 | time a dry run of the whole procedure for one version | under 15 minutes of author time (SC-002) |

## V3 - Gallery and viewer (User Story 3)

| # | Do | Expect |
|---|----|--------|
| 3.1 | home, both languages | 4-6 featured cards; first row = light main window + dark theme; link "Full gallery (N)"; old `/#screens` links still land on the section |
| 3.2 | `/gallery/`, `/cs/gallery/` | ≥ 10 items in catalog order, title + caption + alt in the page language (FR-016, FR-017, FR-021) |
| 3.3 | switch site theme with the header control | two-theme items swap image without reload; DevTools network shows only the visible variant was fetched (FR-019) |
| 3.4 | open an item; `→` `←` `Home` `End` `Esc`; swipe on a phone | steps through the group with caption and counter; focus returns to the last shown item's card (FR-018) |
| 3.5 | click "See it →" on a What's-new card | lands on `/gallery/#<scene>` with the item outlined and not hidden under the header (FR-022) |
| 3.6 | DevTools, disable JavaScript, reload | all cards, images and captions visible; nothing broken (FR-021) |
| 3.7 | DevTools, *Fast 4G*, cache off, load `/` | first screen readable < 2 s; image bytes before first scroll ≤ 130 KB; total home image bytes < 1 MB; no layout shift as images arrive (SC-006, FR-020) |
| 3.8 | language switch on `/gallery/` and `/releases/` | goes to the same page in the other language, fragment kept (FR-015) |
| 3.9 | `public/sitemap.xml` | six URLs (2 languages × 3 pages) with alternates |
| 3.10 | fetch `/assets/screenshot-light.png` | current light main window with tab strip, version 0.1.8 in the title (FR-023) |
| 3.11 | set seven scenes `featured`, build | fails: `gallery: featured count 7, allowed 4-6`; remove an image file of a published scene → fails naming the file |

## V4 - Screenshot production (User Story 4)

| # | Do | Expect |
|---|----|--------|
| 4.1 | **Spike, first**: `npm run shots -- --scene main-window,markdown-viewer --keep` | Sandbox opens, installer installs silently, two PNGs appear; check: title bar and tab strip rendered, Markdown content rendered (WebView2), `result.json` says `dpi: 96`. Any failure → apply the fallback decided in research R2 before building more scenes |
| 4.2 | `npm run shots -- --dry-run` | lists every scene × theme, validates steps and the demo manifest, starts nothing |
| 4.3 | `npm run shots` (hands off) | all `auto` scenes produced in < 10 min; summary lists ok / failed / skipped; `captures.json` updated with version 0.1.8, build 192 (SC-005, FR-030) |
| 4.4 | run 4.3 again; compare `.work/shots/out/*.png` of both runs | identical dimensions; pixel-identical or differences limited to a blinking caret - if anything else differs, the scene needs a `settle` or a fixed timestamp |
| 4.5 | before and after a run, export `HKCU\Software\Tandem Commander` on the host and diff; keep your own instance running during the run | no difference; your instance undisturbed (FR-026b, FR-027) |
| 4.6 | open `.work/shots/contact-sheet.html`; search every image for your user name, host name, drive labels, bookmarks | none (SC-007) |
| 4.7 | `npm run shots -- --version 0.0.1` | preflight refuses (release not found); with an older real version than the site's: refuses naming both versions (FR-026a) |
| 4.8 | `npm run shots -- --manual --scene sftp` | Sandbox stays open with network; helper shows the written steps and a *Capture* button; *Skip* keeps the old image and the run still exits 0 (FR-029) |
| 4.9 | add a new `auto` scene to `scenes.json` (copy `code-viewer`, other file), capture it, build | appears on `/gallery/` in both languages; no template touched; < 30 min (SC-008) |
| 4.10 | open `src/assets/og-image.png` | shows no screenshot and no version number - FR-024 holds without regeneration (verified 2026-09-20; `npm run og` was not built) |

## V5 - Release history (User Story 5)

| # | Do | Expect |
|---|----|--------|
| 5.1 | `/releases/`, `/cs/releases/` | nine entries 0.1.8 → 0.1.0; 0.1.7 listed above 0.1.6 although both are dated 29 August; dates localized; 0.1.8 badged current (FR-014) |
| 5.2 | click every "Full release notes" link | each opens the matching GitHub release (SC-010) |
| 5.3 | "All releases →" from home; download link from history | both work in both languages (FR-015) |

## Done

All of V1-V5 pass, `npm test` and `npm run build` are green, README's "Release a new version" and
"Replace the screenshots" sections are rewritten to the new procedures (FR-013, FR-033), and the
branch is ready for the author's review and merge. Deployment and the pending slunecnice.cz
submission (spec 005, T018/T019) remain the author's steps.

## Validation log

### 2026-09-20 - stages A-D + US5 (no Windows Sandbox yet)

| Scenario | Result |
|----------|--------|
| V1.1 | pass - hero, six feature cards and meta description name tabs, Code Viewer, command shell, cloud sync badges, winget ("on its way"), Altap migration, EN + CS |
| V1.2 | pass - "Version 0.1.8 · September 20, 2026" / "Verze 0.1.8 · 20. září 2026", six cards: four of 0.1.8, then Code Viewer and command shell of 0.1.6; checked visually in headless Edge |
| V1.3 | pass with `winget.available: true` (block, copy button un-hidden by script); block absent with `false`. Shipped as `false`: the package is not in the winget catalogue yet |
| V1.4 | pass - `Program_Change_Info` = 0.1.8 summary + four titles, 219 characters; PAD 4.0 gate green |
| V1.5 | pass - `0.1.0` does not occur on the home pages; "first release" gone |
| V2.1 | pass - `releases: no record for current version 0.1.8 - create content/releases/0.1.8.json (…)` |
| V2.2 | pass - empty text and date mismatch both fail naming file and field (scene reference: unit-tested, V10) |
| V2.3 | pass - date 2026-09-20, build 192, 8247136 bytes, kind hint `feature` |
| V2.4 | pass - exit 1, two missing facts named, nothing written |
| V2.5 | pass - run against a temporary `TC_CONTENT_DIR`: skeleton created, build rejects `summary.en: empty text` |
| V2.6 | not run - needs an interactive session with the author (`/release-web` is registered and loads) |
| V2.7 | covered by unit test "a release without highlights leaves all six to its predecessors" |
| V3.8, V3.9 | pass for `/releases/` - switcher targets `/cs/releases/`; sitemap lists 4 URLs (2 languages × home, releases) |
| V5.1 | pass - nine releases, 0.1.7 above 0.1.6, localized dates, current badge |
| V5.2 | pass - all nine `…/releases/tag/v0.1.x` URLs answer 200 |
| V5.3 | pass |
| V4 (preparation) | `Win32.cs` compiles under Windows PowerShell 5.1; self-test capture of a throw-away form is exactly 640 × 400 at 96 dpi with title bar and square corners; `run.ps1` parses and **refuses to run on the host**; `npm run shots -- --dry-run` downloads the 0.1.8 installer (8247136 bytes) and verifies its signature; `npm run shots` stops at preflight: Windows Sandbox not enabled |

`npm test`: 26 passing. `npm run build`: green.

### 2026-09-20 (later) - screenshot pipeline and gallery

The capture path was settled over eight Sandbox runs; what it took is recorded in
[research.md R2a](research.md). Outcome:

| Scenario | Result |
|----------|--------|
| V4.1 (spike) | pass - `PrintWindow` captures the main window, dialogs and the WebView2 viewers; guest at 96 dpi; WebView2 is absent from a fresh Sandbox and is installed from a cached, signature-verified Microsoft installer |
| V4.2 | pass - `--dry-run` validates and starts nothing |
| V4.3 | pass - ten scenes captured, about 25 s each; `captures.json` records 0.1.8 build 192 for every image |
| V4.5 | pass by construction - the application never runs on the host; the driver refuses to run outside the Sandbox |
| V4.6 | pass - every image shows `C:\Workspace…` only: no user name, no host name, no drives but C:, no bookmarks |
| V4.7 | pass - a version older than the site's is refused before anything starts |
| V4.10 | not applicable - the social image carries no screenshot (see T049) |
| V3.1, V3.2 | pass - 4 featured items on the home page, 10 on `/gallery/`, both languages |
| V3.7 (budget) | pass with room to spare: 32 KB of images before first scroll (budget 130 KB), 73 KB on the whole home page (budget 1 MB), largest gallery image 26 KB (budget 300 KB), every gallery image carries `width`/`height` |
| V3.9 | pass - the sitemap lists 6 URLs (2 languages × home, gallery, releases) |
| accessibility | heading order correct on all three pages (`h1` → `h2` → `h3`), every image has a text alternative in the page language, every icon button has a label; the theme buttons are labelled by their visible text |

Two scenes are deferred, exactly as the specification allows: `cloud-sync-badges` and `vcs-badges`
need the author's real cloud and version-control setup (`manual-host`), and the SFTP scene needs a
server. Ten published scenes exceed the ten the specification requires.

Demo photographs: 11 pictures under CC0 1.0 from Openverse, recorded in
`tools/screenshots/demo/LICENSES.md`. **The author's own photographs are deliberately not used**,
on the author's instruction (2026-09-20).

### 2026-09-20 (revision) - author's four corrections

| Correction | How it was met |
|------------|----------------|
| Only what Tandem Commander added | The catalog lost the file comparator, batch rename, the disk map and archive browsing (all inherited from Open Salamander) and gained the faster thumbnails and the configurable command shell: 8 published scenes, 5 featured. `PUBLISHED_MIN` is 7. |
| An enlarged picture must never be smaller than its card | Dialog scenes are captured with the new `withDialog` step, which draws the dialog onto the application window: the Configuration dialog now yields a 1200 × 800 picture instead of a 554-pixel one. Every image in the gallery is 1100-1200 px wide. |
| Captions above the picture, pictures centred, no version label | The card renders `<figcaption>` first, separated by a rule and given a uniform height so a row lines up; the picture is centred in its frame. The `since` label is gone from the markup and from both catalogs. |
| PhotoSwipe for the enlarged view | PhotoSwipe 5.4.4 (MIT) vendored in `src/js/vendor/photoswipe/`, driven by `src/js/gallery.js`. Verified in a real browser through the DevTools protocol: the viewer opens, shows "Two panels, many tabs" with its caption, counts `1 / 8`, offers a full-screen button, and stepping moves to "Dark theme" and `2 / 8`. Cards are plain links, so without scripting the picture still opens. |

`npm test`: 37 passing. `npm run build`: green. Home page images: 32 KB before first scroll, 86 KB
in total. The hand-written lightbox of feature 002 and its styles are gone.
