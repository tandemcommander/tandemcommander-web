# Data Model: Screenshot Lightbox

**Feature**: [spec.md](spec.md) | **Date**: 2026-08-05

The feature persists no data and defines no domain entities. Its only model is transient UI state held in the DOM/JS for the lifetime of an open lightbox.

## Entities

### LightboxState (transient, singleton)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `status` | enum | `closed` → `opening` → `open` → `closing` → `closed` | Only one instance; never two lightboxes at once (spec Edge Cases) |
| `sourceButton` | DOM reference | The `.shot-zoom` button that opened the view | Needed to return focus on close (FR-008); provides the thumbnail rect for FLIP |
| `imageSrc` / `imageAlt` | string | Copied from the clicked `<img>` to the dialog `<img>` | Always mirrors an existing page image (R8 — same asset) |

### State transitions

```text
closed --click/Enter/Space on .shot-zoom--> opening   (dialog.showModal(), FLIP play)
opening --transitionend | reduced-motion | timeout--> open
open --cross click | Escape (dialog cancel) | backdrop click--> closing  (inverse FLIP)
closing --transitionend | reduced-motion | timeout--> closed  (dialog.close(), focus restored)
```

Rules derived from requirements:

- **Re-entrancy guard**: activation while `status !== 'closed'` is ignored (rapid repeated clicks must not stack — spec Edge Cases).
- **Timeout fallback**: `opening`/`closing` must always resolve even if `transitionend` never fires (R6 guard), so the UI cannot wedge mid-state.
- **Resize/orientation while `open`**: the enlarged image re-fits via CSS (viewport-relative sizing); no JS state changes needed.
- **On `closed`**: scroll-lock class removed from `<html>`, page scroll position untouched (FR-006, SC-006).
