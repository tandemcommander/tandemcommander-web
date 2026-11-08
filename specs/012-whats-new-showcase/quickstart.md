# Quickstart: validating the What's New Showcase

**Feature**: [spec.md](spec.md) | **Contracts**: [contracts/](contracts/)

## Prerequisites

- Branch `012-whats-new-showcase`, `npm install` done (Node 22+; local Node 24 is fine for build and
  tests).
- Gallery captures present (`content/gallery/captures.json`, images in `src/assets/gallery/`).

## 1. Automated checks

```sh
npm test                 # content rules S1/S3, buildShowcase cases, winget test without card 06
npm run build            # catalog parity, content validation, PAD gate
npm run release:verify   # generated site matches site.json and the current record
npm run release:status -- 0.2.0
```

Expected: all green; status prints
`home page    0.2.0 - 2 panels (quick-search, tabs-configuration), 4 compact`.

## 2. Home page, desktop (1280 px), both languages

`npm run dev`, open `/` and `/cs/`.

1. Order: hero → What's new (tinted band) → gallery → project → story → download; header, mobile
   menu and footer list What's new, Gallery, Project, Download. (US2-4, FR-004/005)
2. No "Old habits / Staré návyky" section; the gallery lead no longer says nothing moved. (SC-001)
3. What's new: "Version 0.2.0 · …" with the 0.2.0 summary; two panels - quick search, tab
   shortcuts - each with title and text on the left and the picture on the right; the pictures are
   exactly the size of the gallery pictures below. (US1-1, US1-4, SC-002/003)
4. "Also in 0.2.0 / Také ve verzi 0.2.0" lists the four other highlights once each, no picture
   frames; then "All releases →". (US1-3, FR-013/015)
5. Click a panel picture → PhotoSwipe viewer with title and caption (never the bare image); arrow
   goes to the other panel picture only; Escape closes, focus is back on the picture. Repeat with
   keyboard (Tab, Enter). Reload and click immediately: the viewer still opens. (US1-2, FR-010/011)
6. Dark theme: the pictures keep their gallery frame; light/dark switch shows no duplicate images.
7. DevTools Network, fresh load: no showcase image requested before scrolling near the section;
   total showcase images ≤ 150 KB. (SC-005)

## 3. Phone width (360 px)

Panels stack text above picture; no horizontal scroll; no scrollbar inside any box. (SC-006)

## 4. Without JavaScript

Disable JavaScript: a picture link then opens the full screenshot in a new tab - the only case in
which the viewer is not used.

## 5. Release-cycle simulations (do not commit)

Use a scratch copy of `content/` via `TC_CONTENT_DIR`, or the unit tests' fixtures:

1. **Patch**: add `0.2.1.json` (kind `bugfix`), set `site.json` to 0.2.1 / its date, build. The
   `#new` section is identical to the 0.2.0 build; `/releases/` lists 0.2.1 first as a bug-fix
   release; `release:status -- 0.2.1` says "unchanged - patch of 0.2.0". (US3-1, SC-007)
2. **Patch with a feature kind**: change 0.2.1's kind to `feature` → build fails with the S3
   message.
3. **Main without record**: set `site.json` to 0.3.1 without `0.3.0.json` → build fails with the S1
   message.
4. **Main release**: add `0.3.0.json` referencing `panel-tabs`, set `site.json` to 0.3.0 → What's
   new shows 0.3.0 with one panel and status reports `1 panel (panel-tabs), 1 compact`. (US3-2)

Work on a copy of `content/` (`TC_CONTENT_DIR`) and back up `site.json`; restore it afterwards.

## 6. Note for the 0.3.0 website update

The settings import from Salamander is mentioned on the home page only through the 0.2.0 digest.
When 0.3.0 becomes the main release, make sure it is still mentioned (planned: an import scene and
highlight), or add it to the hero lead.
