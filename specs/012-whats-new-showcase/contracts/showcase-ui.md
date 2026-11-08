# Contract: Home-page "What's new" showcase

**Feature**: [../spec.md](../spec.md) | **Data**: [../data-model.md](../data-model.md)

Replaces the "What's new" part of `specs/007-release-news-gallery/contracts/pages-ui.md` and
removes its "What it is" (features) section. Revised after the author's implementation review
(2026-11-08, spec Clarifications): panels with gallery-sized pictures, every picture in PhotoSwipe.

## 1. Page order and navigation

```text
<main>
  hero            #top
  What's new      #new       section band section--roomy      ← moved up, band background
  gallery         #gallery   (#screens alias kept)
  project         #project   band
  story           #story
  download        #download
  [data-gallery-strings]     viewer strings, once per page
</main>
```

Header (desktop + mobile) and footer: **What's new · Gallery · Project · Download**. No element,
link or text of the removed features section remains in any language.

## 2. Section structure

```html
<section id="new" class="section band section--roomy">
  <div class="section-inner">
    <div class="section-head">            kicker · h2 title · lead (whatsNew.lead)
    <div class="whats-new-current">       "Version 0.2.0 · October 25, 2026" + main summary
    <div class="showcase" data-showcase>
      <article class="showcase-block" id="new-{highlight.id}">     × panels (max 3)
        <div class="showcase-text">
          <h3 class="showcase-title">     highlight title
          <p class="showcase-body">       highlight text (inline markup: `code`)
        </div>
        <div class="gallery-shots">       ← galleryShots(scene, lang, { wide, label }) - the SAME
          <a class="gallery-link …" href="{full}" data-pswp-*  aria-label="{title} - gallery.zoomLabel">
            <img class="shot-img" src="{card}" srcset="{card} 640w, {full} 1200w" sizes=… loading="lazy">
          </a>                              markup as a gallery card's picture
        </div>
      </article>
      <section class="showcase-more" aria-labelledby="new-also">  ← only if compact items exist
        <h3 id="new-also">                 whatsNew.alsoIn with {version}
        <ul class="showcase-list">
          <li><strong>title</strong> <span>text</span>
              [<a class="card-link card-link--inline" href="{full}" data-pswp-…>whatsNew.seeIt</a>]
        </ul>
      </section>
    </div>
    <p class="section-more showcase-history"><a class="btn btn--secondary" href="{lang}/releases/">whatsNew.allReleases</a></p>
  </div>
</section>
```

Without captures there are no panels: the compact list and the history link only, no empty frames.

## 3. Layout

| Width | Panel | Picture |
|-------|-------|---------|
| ≥ 860 px | one row per novelty: `grid-template-columns: repeat(2, minmax(0, 1fr))`, gap 26 px - the gallery's columns; text left, picture always right | the gallery link fills the right half; its frame merges into the panel (left border only); rendered size equals a gallery picture (545 × 364 at 1280 px) |
| < 860 px | one column: text, then picture | as a gallery picture on mobile |

Panel: `--surface` background, 1 px `--line` border, radius 14 px. Text wraps freely; no fixed
heights, no `overflow: auto/scroll` anywhere in the section.

## 4. Behaviour

- Every enlargeable picture (gallery, panels, compact "See it") opens in PhotoSwipe with the
  scene title and caption - **never as the bare image file**. Arrows in the "What's new" viewer
  move only between its pictures; Escape or the close button closes and focus returns.
- `main.js` holds a plain left click on such a link while the viewer module is not ready
  (`preventDefault`, remembered in `window.tcViewerPending`); `gallery.js` replays it after both
  lightboxes are initialised (`window.tcViewerReady`). Modified clicks (Ctrl, middle button) keep
  their browser meaning.
- `main.js`, `main.css` and the viewer module are referenced with a content hash
  (`?v=<sha256-10>`, Eleventy filter `assetUrl`; the module URL in `data-gallery-module`), so a
  cached old script can never run with a new page.
- Only when the module cannot load at all (or without scripting) does a link open the image file.

## 5. Texts (both catalogs, identical keys)

Removed: `features.*`. Changed: `whatsNew.lead`, `gallery.lead`. Added: `whatsNew.alsoIn`
(contains `{version}`). Reused: `gallery.zoomLabel` for the pictures' accessible names. Kept:
`whatsNew.kicker`, `title`, `currentLine`, `seeIt`, `allReleases`, `gallery.*` viewer strings.

## 6. Guarantees checked by tests / verification

- Home pages contain none of: `nothing to relearn`, `nic nového k učení`, `nothing moved`,
  `nic se nepřesunulo` (SC-001).
- Built home page at a patch version has a `#new` section identical to the main release's (SC-007).
- Every highlight of the main release appears exactly once inside `#new` (S4).
- Panel pictures and gallery pictures render at the same size (SC-003).

## 7. Release history page - screenshots per version (US4)

```html
<article class="release" id="v0.1.8">
  …summary, highlights…
  <details class="release-shots">                       ← only if the version has pictures
    <summary class="release-shots-toggle">releases.shots with {count}</summary>
    <div class="release-shots-grid" data-release-shots>  ← one PhotoSwipe set per release
      <a class="release-shot gallery-link gallery-link--any" href="{full}" data-pswp-width data-pswp-height
         data-pswp-title="{title} · {version}" data-pswp-caption="{caption}"
         aria-label="{title} ({version}) - gallery.zoomLabel">
        <img class="shot-img" src="{card}" loading="lazy" alt="{alt}">
      </a> …
    </div>
  </details>
  <p class="release-notes">…</p>
</article>
```

Grid `repeat(auto-fill, minmax(220px, 1fr))`; closed by default, so lazy pictures load only when
opened. The page loads `photoswipe.css` and renders the viewer strings once. New key:
`releases.shots` ("Screenshots of this version ({count})" / "Screenshoty této verze ({count})").
