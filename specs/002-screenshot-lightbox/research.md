# Research: Screenshot Lightbox

**Feature**: [spec.md](spec.md) | **Date**: 2026-08-05

No `NEEDS CLARIFICATION` markers remained in the Technical Context; the items below are the technology/pattern decisions that shape the design, each with the alternatives that were weighed.

## R1: Zoom animation technique — FLIP with CSS transforms

> **Superseded (2026-08-05, implementation feedback)**: the FLIP zoom continuously rescaled the raster screenshots and aliased visibly. Replaced by a non-scaling entrance — backdrop fade + the image (already at final size) rising into place via `translateY` + opacity (~300 ms in / ~220 ms out, same easing family). Translation and opacity never resample the bitmap, so no aliasing. The FLIP notes below are kept for history. The thumbnail hover cue went through the same feedback loop — `scale(1.015)`, then `brightness(1.07)` — and ended as a static magnifier badge (`.shot-zoom-icon`) in the shot's corner: no hover effect alters the image at all.

- **Decision**: Animate the enlarged image with the FLIP pattern (First-Last-Invert-Play): measure the thumbnail's `getBoundingClientRect()`, position the lightbox image at its final centered rect, apply an inverting `transform: translate(...) scale(...)` so it visually starts at the thumbnail, then transition the transform to `none`. Closing plays the inverse. Easing `cubic-bezier(0.2, 0, 0.2, 1)`-family (standard ease-in-out feel), duration ~300 ms open / ~250 ms close — brisk, smooth, no overshoot (per clarification), within the 500 ms budget of SC-002.
- **Rationale**: Transform+opacity-only animation stays compositor-friendly (60 fps, SC-002), works in every evergreen browser, needs ~30 lines of JS, and gives the exact "grows from its place in the page" behavior the spec demands (FR-004, US2).
- **Alternatives considered**:
  - **View Transitions API** (`document.startViewTransition` + `view-transition-name`) — the most elegant modern option, but same-document support only reached Firefox in late-2025 releases and behavior differences across engines would still require the FLIP fallback anyway; maintaining two paths for a two-image page is not worth it.
  - **Animation libraries (GSAP, Motion One) / lightbox libraries (PhotoSwipe, GLightbox)** — rejected: the project deliberately has zero runtime dependencies and the need is tiny.
  - **CSS-only `:target`/checkbox hacks** — no clean position-to-position zoom, poor accessibility, history pollution. Rejected.

## R2: Overlay container — native `<dialog>` opened with `showModal()`

- **Decision**: Use a single static `<dialog class="lightbox">` element opened via `showModal()`.
- **Rationale**: The native dialog provides for free exactly what FR-005/FR-008 require: top-layer rendering (no `z-index` management), Escape-key closing via the `cancel` event, focus moved into the dialog on open and restored to the invoking element on close, and `aria-modal` semantics. Browser support is universal in evergreen browsers. Backdrop dimming uses `::backdrop`.
- **Alternatives considered**:
  - **`<div role="dialog" aria-modal="true">` overlay** — needs manual Escape handling, manual focus save/restore, manual inert/z-index management; strictly more code for the same result. Rejected.
  - **Fullscreen API (`requestFullscreen`)** — true fullscreen is jarring for a marketing page ("jakoby na fullscreen" = fullscreen-like, not literal), has awkward exit UX and Safari quirks. Rejected.

## R3: Lightbox markup — static in `screens.njk`, behavior wired by JS

- **Decision**: The `<dialog>` (image element, close button with visible cross and `aria-label`) is authored once in `src/_includes/sections/screens.njk` after the grid. JS clones nothing structural; it only fills `src`/`alt` from the clicked image and toggles classes.
- **Rationale**: Keeps all user-facing markup/ARIA text in templates (consistent with the rest of the site), keeps `main.js` behavioral only, and guarantees the DOM the CSS targets actually exists.
- **Alternatives considered**: JS-injected dialog (`document.createElement`) — hides markup from the template layer and adds string-building code for no benefit. Rejected.

## R4: Click target — `<button>` wrapping the image inside `.shot-frame`

- **Decision**: In the template, wrap each screenshot `<img>` in a `<button type="button" class="shot-zoom">` carrying an `aria-label` ("View screenshot full size"). CSS gives it `cursor: zoom-in` and a subtle hover cue; JS listens on these buttons.
- **Rationale**: A real button is natively focusable and keyboard-activatable (FR-008), announces as interactive to assistive tech (FR-009), and needs no `tabindex`/keydown shims that an `<img>` click handler would require.
- **Alternatives considered**: click handler directly on `<img>` (+`tabindex="0"` + Enter/Space handling) — reimplements button semantics by hand. Rejected. `<a href="/assets/...png">` — navigates without JS (nice) but to a raw image tab, which is a worse no-JS experience than a static image; also pollutes history. Rejected.

## R5: Scroll lock — `overflow: hidden` on the root element while open

- **Decision**: Add a class (e.g. `lightbox-open`) to `<html>` while the dialog is open that sets `overflow: hidden`; remove it on close. Combined with `overscroll-behavior: contain` on the dialog to stop scroll chaining on touch.
- **Rationale**: Two lines of CSS, preserves scroll position natively on close (FR-006, SC-006), works across evergreen browsers. The layout is not scrollbar-gutter-sensitive; if shift is visible, `scrollbar-gutter: stable` is the one-line remedy.
- **Alternatives considered**: `position: fixed` body-freeze technique — needed only for legacy iOS Safari; adds scroll-restore bookkeeping. Rejected unless testing shows chaining on current iOS, which `overscroll-behavior` handles.

## R6: Reduced motion — CSS media query gates the transition

- **Decision**: Under `@media (prefers-reduced-motion: reduce)`, the FLIP transform transition is disabled (image appears/disappears with a short opacity fade or instantly); JS still runs the same open/close code paths, transition-end handling falls through via a guard (check `matchMedia('(prefers-reduced-motion: reduce)')` or rely on `transitioncancel`/timeout fallback).
- **Rationale**: Satisfies FR-007/US2-AS3 with a pure CSS override plus one JS guard; the functional path stays identical.
- **Alternatives considered**: separate no-animation JS branch — more code paths to test for the same visible result. Rejected as primary approach; the JS guard doubles as a safety net against a stuck "waiting for transitionend" state.

## R7: Coexistence with the global transition rule

- **Decision**: The site applies `body * { transition: background-color .22s, color .22s, border-color .22s, opacity .28s }` (src/css/main.css:103). The lightbox elements declare their own explicit `transition` (transform + opacity with the R1 timings), which overrides the global rule by normal cascade on the same property.
- **Rationale**: Prevents the global 0.28 s opacity timing from desynchronizing the backdrop/image fade from the 300 ms zoom; making it explicit in the lightbox block documents the dependency.
- **Alternatives considered**: relying on the global rule for the fade — timing coupling to an unrelated site-wide rule is fragile. Rejected.

## R8: Enlarged image asset — reuse the page asset as-is

- **Decision**: The lightbox shows the same `/assets/screenshot-*.png` file already rendered in the grid (per spec Assumptions). No `srcset`, no hi-res variant, no preloading work: the asset is already in the browser cache when the user clicks.
- **Rationale**: Current assets are placeholders (finals pending per project memory); the lightbox stays agnostic to the file that eventually lands. Instant display keeps SC-001's 5-second loop trivially satisfiable.
- **Alternatives considered**: dedicated high-resolution variants — deferred until final assets exist and prove insufficient at fullscreen size.
