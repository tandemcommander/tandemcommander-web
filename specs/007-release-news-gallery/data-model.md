# Phase 1 Data Model: Release-Driven Website Content and Feature Gallery

**Feature**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Date**: 2026-09-20

All data is committed JSON in the website repository. There is no database and no runtime state -
"lifecycle" below means how a file changes across releases. `LocalizedText` is an object with
**exactly** the language codes of `src/_data/languages.json` (today `en`, `cs`) and non-empty
string values; plain text, backticks mark inline code (research R8).

```text
site.json ──(version, releaseDate must match)──► ReleaseRecord (current)
ReleaseRecord 1 ──── 0..n Highlight ──(scene, optional)──► Scene
Scene 1 ──── 1..2 Capture (one per theme)           [captures.json, tool-written]
Scene.featured ──► home-page gallery section (4..6)
Highlights of records, newest first ──► home-page "What's new" cards (6)
ReleaseRecord (current) ──► PAD Program_Change_Info
```

---

## 1. ReleaseRecord - `content/releases/<version>.json`

One file per published application version. File name = `version` + `.json`.

| Field | Type | Rules |
|-------|------|-------|
| `version` | string | `MAJOR.MINOR.PATCH`, numeric parts; equals the file name; unique across records |
| `date` | string | `YYYY-MM-DD`, a real calendar date, not in the future relative to the build day + 1 |
| `build` | integer | the application's internal build number (from the changelog lead); informational |
| `kind` | enum | `first` · `feature` · `bugfix` · `maintenance` · `installer` |
| `summary` | LocalizedText | one sentence, ≤ 200 characters per language |
| `highlights` | Highlight[] | 0..n, order = importance, author-controlled (FR-010) |

**Highlight**

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | kebab-case, unique within the record; stable (used in tests and anchors) |
| `title` | LocalizedText | ≤ 40 characters per language, plain text (also feeds the PAD change-info) |
| `text` | LocalizedText | ≤ 220 characters per language |
| `scene` | string, optional | must equal the `id` of an existing Scene (FR-009) |

**Cross-record rules (enforced by the loader → build failure, FR-009)**

- a record exists whose `version` equals `site.json.version` - the *current record*;
- the current record's `date` equals `site.json.releaseDate`;
- no two records share a `version`; no record is newer than the current one;
- every LocalizedText has exactly the site's language codes, none empty;
- every `scene` reference resolves.

**Ordering.** By version, numerically per component, descending. Never by date (0.1.6 and 0.1.7
share 2026-08-29).

**Derived values (computed by `lib/content.js`, exposed as Eleventy data `releases`)**

| Name | Definition |
|------|------------|
| `releases.all` | every record, newest first |
| `releases.current` | the record matching `site.json.version` |
| `releases.homeCards` | FR-010: all highlights of `current` in recorded order, capped at 6; then highlights of preceding records, newest version first, each record's order kept, until 6. Each card carries its record's `version`. Fewer than 6 only if all records together hold fewer. |
| `releases.padChangeInfo` | English, single line: `current.summary.en`, then - while the result stays ≤ 300 characters (PAD 4.0 `Program_Change_Info` limit) - `" New: "` + highlight titles joined by `"; "`. Never cut mid-word; no `<` or tab. |
| per record `notesUrl` | `site.github.releasesUrl + "/tag/v" + version` |

**Lifecycle.** Created once per release by `release apply` (skeleton) or the `/release-web` skill
(complete); edited freely afterwards (typo fixes, adding a `scene` reference once its image
exists). Never deleted. Backfill: nine files, 0.1.0 - 0.1.8 (FR-008).

---

## 2. Scene - entries of `content/gallery/scenes.json`

A single ordered array; **array order is gallery order** (FR-025).

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | kebab-case, unique; becomes the anchor `/gallery/#<id>` and the image base name - **never renamed** once published (FR-022) |
| `title` | LocalizedText | ≤ 40 characters; names the capability |
| `caption` | LocalizedText | one sentence, ≤ 160 characters |
| `alt` | LocalizedText | describes what the picture demonstrates, ≤ 250 characters (FR-021) |
| `themes` | array | non-empty subset of `["light","dark"]` |
| `mode` | enum | `auto` · `manual-sandbox` · `manual-host` (research R6) |
| `featured` | boolean | shown on the home page; **4 ≤ count(featured) ≤ 6**, and the first featured scene in array order must be `main-window` (FR-016) |
| `showsVersion` | boolean | the image displays the application version (title bar) → always flagged for re-capture at a release |
| `since` | string, optional | version that introduced the capability; **not shown** - captions carry no version labels (author's decision, 2026-09-20) |
| `stage` | object | required for `auto` and `manual-sandbox`; see below |
| `manualSteps` | LocalizedText-free string[] | required for both manual modes; English only (author-facing); for `manual-host` the last step must be the personal-data review |
| `published` | boolean, default `true` | `false` = defined but deferred: excluded from the site and from the ≥ 10 count, not required to have captures |

**`stage`** (consumed only by the guest driver; contract in
[contracts/scene-catalog.md](contracts/scene-catalog.md))

| Field | Type | Notes |
|-------|------|-------|
| `window` | `{ "width", "height" }` | main-window frame; default 1200 × 800 |
| `config` | object | registry overrides layered on the base configuration: `left`/`right` panel `{ path, view, sort, tabs[], activeTab }`, `activePanel`, plugin-specific values |
| `launch` | string[] | extra start-up arguments |
| `steps` | Step[] | closed vocabulary: `focus`, `keys`, `waitWindow`, `resize`, `settle`, `capture`, `close` |
| `network` | boolean | `manual-sandbox` only; default `false` |

**Catalog rules (loader → build failure)**

- unique ids; LocalizedText parity as above;
- featured count and first-featured rule;
- at least 7 scenes with `published: true` (FR-017: the gallery shows only what Tandem Commander added, so the catalog is smaller than the first draft assumed);
- every published scene has a Capture for **each** of its `themes`, and the referenced image
  files exist on disk (spec edge case: "defined for both themes, only one image");
- `manual-*` scenes have `manualSteps`; `auto` scenes have `stage.steps` ending in a `capture`.

**Initial catalog (order; ★ = featured)**

| # | id | mode | themes | since |
|---|----|------|--------|-------|
| 1 | `main-window` ★ | auto | light | - (shows tabs; `showsVersion`; light only so the light/dark pair is always visible - research R4) |
| 2 | `dark-theme` ★ | auto | dark | 0.1.0 (`showsVersion`) |
| 3 | `panel-tabs` ★ | auto | light, dark | 0.1.8 (tab context menu / overflow list) |
| 4 | `code-viewer` ★ | auto | light, dark | 0.1.6 |
| 5 | `markdown-viewer` ★ | auto | light, dark | 0.1.0 |
| 6 | `sftp` ★ | manual-sandbox | light, dark | 0.1.0 |
| 7 | `unicode-long-paths` | auto | light, dark | 0.1.0 |
| 8 | `thumbnails` | auto | light, dark | 0.1.4 |
| 9 | `image-viewer` | auto | light | - |
| 10 | `archive-as-folder` | auto | light, dark | - |
| 11 | `file-comparator` | auto | light, dark | - |
| 12 | `batch-rename` | auto | light | - |
| 13 | `disk-map` | auto | light | - |
| 14 | `command-shell` | auto | light, dark | 0.1.6 |
| 15 | `cloud-sync-badges` | manual-host | light | 0.1.3 (`published: false` until staged) |
| 16 | `vcs-badges` | manual-host | light | 0.1.4 (`published: false` until staged) |

If `sftp` cannot be staged for launch it is set `published: false` and `unicode-long-paths`
becomes featured instead - the catalog stays valid with 13 published scenes.

---

## 3. Capture - entries of `content/gallery/captures.json`

Written **only** by the capture pipeline (`npm run shots`), never by hand. Keyed by
`"<sceneId>/<theme>"`.

| Field | Type | Notes |
|-------|------|-------|
| `appVersion` | string | read from the installed executable's version resource (FR-030) |
| `appBuild` | integer | likewise |
| `capturedAt` | string | ISO date |
| `environment` | enum | `sandbox` · `host` |
| `dpi` | integer | recorded; `96` expected (research R2) |
| `width`, `height` | integer | native pixel size → `width`/`height` attributes in templates (FR-020) |
| `files.full` | path | `assets/gallery/<id>-<theme>.webp` (lossless) |
| `files.card` | path | `assets/gallery/<id>-<theme>-640.webp` |
| `files.cardWidth`, `files.cardHeight` | integer | |
| `bytes.full`, `bytes.card` | integer | checked against SC-006 (full ≤ 300 KB) - a larger file fails the pipeline, not the site build |

**Staleness (FR-011 f), computed by `release check`:** for the current version *V*,

- **must re-capture** - `capture.appVersion < V` and (`scene.showsVersion` **or** the scene is
  referenced by a highlight of record *V*);
- **older, review** - `capture.appVersion < V` otherwise;
- **current** - `capture.appVersion ≥ V`.

**Legacy/PAD images.** `src/assets/screenshot-light.png` and `screenshot-dark.png` are PNG copies
of `main-window/light` and `dark-theme/dark`, rewritten by the pipeline whenever those captures
change; not listed in `captures.json` (FR-023).

---

## 4. DemoWorkspace - `tools/screenshots/demo/` + `workspace.json`

| Part | Content |
|------|---------|
| `demo/files/**` | committed tree copied verbatim to `C:\Workspace` in the guest |
| `demo/workspace.json` → `generate[]` | items created in the guest: `{ type: "file" \| "dir" \| "zip" \| "7z" \| "longpath" \| "bulk", path, from?, content?, count? }` - Unicode names are written as `\u` escapes so the JSON stays ASCII |
| `demo/workspace.json` → `times` | glob → fixed modification time; a default applies to everything else, so every date shown in a panel is deterministic |
| `demo/LICENSES.md` | one row per third-party file: path, source URL, author, licence (FR-028) |
| `demo/base-config.reg` | first-run configuration exported inside the Sandbox, English UI, splash off; contains no personal data by construction |

Rule: nothing in `demo/` may originate from the author's real documents; the capture pipeline
greps the built workspace listing and every registry override for the host user name and host
name and aborts on a hit (defence in depth for SC-007).

---

## 5. Shared site values - `src/_data/site.json` (existing, unchanged shape)

`version`, `releaseDate`, `installerSizeBytes` remain the single source for the hero badge,
download section, installer URL and PAD. New coupling only: they must agree with the current
ReleaseRecord, and `release apply` is the one writer during a release.

---

## 6. i18n catalogs - `src/_data/i18n/{en,cs}.json` (existing, keys change)

Fixed UI text only. Removed: `whatsNew.entry1..4*` (replaced by records), `screens.*` keys that
described the two-image section. Added (both languages, build-enforced parity): `nav.gallery`;
`gallery.*` (section kicker/title/lead, "full gallery" link, page title/lead, "since" label,
lightbox previous/next/counter/close labels); `whatsNew.*` (current-release line, version label,
"all releases" link); `releases.*` (page title/lead, kind labels, "current" badge, "full notes"
link, "download" link); `download.winget*` (label, hint, copy/copied); `metaReleases.*`,
`metaGallery.*` (title, description); rewritten `meta.*`, `hero.lead`, `features.*`,
`download.disclaimerText`, `pad.*` (FR-001, FR-003, FR-004).
