# UI Contract: Screenshot Lightbox

**Feature**: [../spec.md](../spec.md) | **Date**: 2026-08-05

The feature's only external interface is the DOM/interaction surface on the landing page. This contract pins the markup, classes, ARIA, and interaction map that CSS, JS, and validation all rely on.

## Markup contract (`src/_includes/sections/screens.njk`)

### Trigger (one per screenshot, inside `.shot-frame`)

```html
<button type="button" class="shot-zoom" aria-label="View screenshot full size">
  <img src="/assets/screenshot-light.png" alt="Tandem Commander in its light theme, …">
  <span class="shot-zoom-icon"><!-- inline SVG magnifier --></span>
</button>
```

- MUST be a `<button type="button">` (native focus + Enter/Space activation — FR-008).
- MUST NOT introduce visible layout change to `.shot-frame` (button is display:block, borderless, padding 0).
- Cursor over the trigger MUST be `zoom-in`; clickability is communicated by the always-visible magnifier badge (`.shot-zoom-icon`) in the shot's corner — no hover effect alters the image itself (FR-009 + clarification).

### Lightbox (one per page, after `.screens-grid`)

```html
<dialog class="lightbox" aria-label="Enlarged screenshot">
  <button type="button" class="lightbox-close" aria-label="Close enlarged view">×</button>
  <img class="lightbox-img" src="" alt="">
</dialog>
```

- Opened exclusively via `showModal()` (top layer, focus containment, Escape via `cancel` event).
- `.lightbox-close` MUST render as a cross anchored to the top-right corner of the viewport-covering dialog, with a touch target ≥ 40×40 px.
- `.lightbox-img` `src`/`alt` are copied from the clicked image at open time and MAY be cleared on close.
- Backdrop dimming via `dialog::backdrop`.

## CSS contract (`src/css/main.css`, new "Lightbox" block)

| Selector | Obligation |
|----------|------------|
| `.shot-zoom` | Resets button chrome; `cursor: zoom-in`; visible `:focus-visible` outline; hosts the `.shot-zoom-icon` magnifier badge (no image-altering hover effects) |
| `.lightbox` | Fills viewport; centers `.lightbox-img` at max ~90vw/90vh (aspect ratio preserved, no crop — FR-002, SC-003) |
| `.lightbox-img` | Declares its own `transition` on `transform`/`opacity` (~300 ms open / ~220 ms close, smooth easing, **no overshoot**); the animation is fade + `translateY` rise only — it MUST NOT scale the image (raster rescaling aliases — FR-004 + clarification); overrides the global `body *` transition rule (main.css:103) |
| `.lightbox::backdrop` | Dimmed (e.g. rgba black ~0.75), fades in/out with the zoom |
| `html.lightbox-open` | `overflow: hidden` (scroll lock — FR-006) |
| `@media (prefers-reduced-motion: reduce)` | Disables the transform transition; open/close reduced to instant or short fade (FR-007) |
| `@media (max-width: 859.98px)` | Close button and margins adapted so the cross stays reachable on phones (FR-010) |

## Behavior contract (`src/js/main.js`, new IIFE section)

| Event | On | Required behavior |
|-------|----|-------------------|
| `click` | `.shot-zoom` | Ignore if not `closed`; else copy src/alt, `showModal()`, add `lightbox-open` class, play the entrance (backdrop fade + image rise; never scales the image) |
| `click` | `.lightbox-close` | Begin animated close |
| `cancel` | `dialog` | `preventDefault()`, then begin the same animated close (covers Escape — FR-005) |
| `click` | `dialog` (backdrop area only, i.e. target === dialog) | Begin animated close (FR-005) |
| `transitionend` / timeout (~450 ms) | `.lightbox-img` | Settle `opening`→`open` and `closing`→`closed`; on `closed`: `dialog.close()`, remove scroll-lock class (focus returns to trigger natively) |

Non-obligations (out of scope by spec/clarifications): no prev/next navigation, no zoom/pan inside the view, no swipe gestures, no separate image assets, no analytics events.

## Validation hooks

Every obligation above maps to a scenario in [quickstart.md](../quickstart.md); SC-001–SC-006 in the spec are the acceptance measures.
