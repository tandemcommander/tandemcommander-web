# Data Model: What's New Showcase

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

All entities are committed JSON content plus values derived at build time in `lib/content.js`.
Existing shapes from feature 007 (`specs/007-release-news-gallery/data-model.md`) are unchanged
unless listed here.

## 1. Release record (existing, `content/releases/<version>.json`)

Shape unchanged: `version`, `date`, `build?`, `kind`, `summary{lang}`, `highlights[]` with `id`,
`title{lang}`, `text{lang}`, `scene?`.

**New validation rule (S3)**: if `version ≥ 0.2.0` and its patch number `Z > 0`, then `kind ∈
{bugfix, maintenance, installer}`. Message: `releases: 0.2.1.json: kind "feature" is not allowed
for a patch release (0.2.1) - new features belong to a main release X.Y.0`.

## 2. Main release (derived)

| Field | Source |
|-------|--------|
| `version` | `mainVersionOf(site.version)` = `X.Y.0` |
| record | the release record with that version |
| `isPatch` | `site.version !== main.version` |

Rules:

- **S1** The record `X.Y.0` must exist; otherwise the build fails:
  `releases: no record for main release 0.2.0 (current version 0.2.1) - …`.
- **S2** `main.version ≤ current.version` (follows from S1 and the existing V5 rule).
- **Legacy line**: for site versions below 0.2.0 the main release is the current record itself
  (in 0.1.x, patch numbers carried features), so S1 applies only from 0.2.0 on - the same boundary
  as S3. This keeps older test fixtures and the published history valid.
- The main release is the only record the home page's "What's new" reads.

`current` (the record of `site.version`) is unchanged and still drives the PAD change info, the
release page's "current" chip and `release:verify`.

## 3. Gallery scene (existing, `content/gallery/scenes.json`)

Unchanged. A panel reuses the scene's gallery images (`images[theme].card`, `.full`, sizes). The
optional `focus` area of the first design was dropped in the implementation review (2026-11-08).

## 4. Showcase (derived, `releases.showcase`)

`buildShowcase(mainRecord, gallery)` →

```text
Showcase
├── version, date, summary        ← main record
├── blocks[]   (0..3)             ← picture panels: highlights with a published scene, first use
│     └── { id, title, text, scene: { id, title, caption, alt, themes, images{theme → card,
│                                      full, width, height, cardWidth, cardHeight} } }
└── compact[]                     ← every other highlight, record order
      └── { id, title, text, scene? }   scene present only if published with images
```

Rules:

- **S4** Order is the record's order in both lists; together they contain every highlight of the
  main release exactly once.
- A scene already used by a block makes later highlights with the same scene compact.
- More than 3 eligible highlights → the 4th onward are compact (with `scene`, so they get "See it").
- `gallery.hasCaptures === false` → `blocks = []`, all highlights compact.
- A highlight whose scene is unpublished never reaches here: the existing V10 rule fails the build
  first.

Constant: `SHOWCASE_MAX_BLOCKS = 3`. Retired: `HOME_CARD_COUNT`, `selectHomeCards`,
`releases.homeCards`.

## 5. Release status (`tools/release/release.mjs status`) - new field

```json
"homePage": {
  "main": "0.2.0",
  "isPatch": false,
  "blocks": ["quick-search", "tabs-configuration"],
  "compact": 4
}
```

For a patch: `{ "main": "0.2.0", "isPatch": true }`. When the main record does not exist yet:
`{ "main": "0.3.0", "isPatch": false, "missing": true }`.

## 6. State over the release cycle

```text
0.2.0 released      → home page shows 0.2.0 (main)
0.2.1, 0.2.2 …      → home page unchanged; history page lists them first, kind = bug-fix/…
0.3.0 released      → home page shows 0.3.0; 0.2.x only on the history page
```

## 7. Picture archive (`content/gallery/archive.json`) - release history pictures

```json
{
  "0.1.8": {
    "main-window/light": { "appVersion": "0.1.8", "appBuild": 192, "capturedAt": "...", "width": 1200,
      "height": 800, "files": { "full": "assets/gallery/archive/0.1.8/main-window-light.webp",
      "card": "assets/gallery/archive/0.1.8/main-window-light-640.webp", "cardWidth": 640, "cardHeight": 427 },
      "bytes": { ... }, "title": { "en": "...", "cs": "..." }, "caption": { ... }, "alt": { ... } }
  }
}
```

Rules (checked in `loadGallery`, message prefix `gallery: archive <version>:`):

- **A1** keys are versions; entry keys are `<scene>/<light|dark>`;
- **A2** `appVersion` equals the version key; width/height present; both files exist under `src/`;
- **A3** `title`, `caption`, `alt` in every site language, within the scene limits;
- **A4** a picture is either current (`captures.json`) or archived for a version, never both.

`releaseShots(gallery, version)` = archive[version] + current published captures whose
`appVersion` is `version`, in catalog order (unknown scenes last), then by theme.
`archivePlan(capture, key, scene, newVersion)` returns `null` for a first capture or the same
version, otherwise the two file moves and the archive entry; `tools/screenshots/postprocess.mjs`
performs it before writing the new picture.
