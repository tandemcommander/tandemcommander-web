# Quickstart: Validating the Screenshot Lightbox

**Feature**: [spec.md](spec.md) | **Contract**: [contracts/lightbox-ui.md](contracts/lightbox-ui.md)

## Prerequisites

- Node 20+ (build/dev; `wrangler preview/deploy` needs Node 22 — not required for this validation)
- `npm install` completed

## Run

```bash
npm run dev        # Eleventy dev server, opens on http://localhost:8080
```

Scroll to the **"Light by default. Dark when you want it."** section (`#screens`).

## Validation scenarios

Each scenario cites the success criteria (SC) / requirements (FR) it proves.

### 1. Open & close via cross (US1 — SC-001, FR-001/002/003)

1. Click the **Light** screenshot → it enlarges over a dimmed backdrop, aspect ratio kept, no cropping, filling ~90% of the viewport's limiting dimension (SC-003).
2. A cross sits top-right; click it → view closes, page unchanged, same scroll position (SC-006).
3. Repeat for the **Dark** screenshot.

### 2. Animation quality (US2 — SC-002, FR-004)

1. Open and close each screenshot; the backdrop must fade while the image **rises into place at its final size** (and drifts down/fades on close) — no pop-in, **no bounce/overshoot**, **no visible rescaling or aliasing of the image**, each direction under 0.5 s and stutter-free.
2. DevTools → Rendering → "Frame Rendering Stats" (optional): confirm no long janky frames during the transition.

### 3. Alternative dismissals (US3 — FR-005)

1. Open → press **Escape** → closes (animated).
2. Open → click the dimmed backdrop outside the image → closes.
3. Open → clicking the image itself does **not** close the view.

### 4. Keyboard-only cycle (SC-005, FR-008)

1. Tab to a screenshot — a visible focus outline appears on the frame.
2. Press **Enter** (and again with **Space**) → opens; focus is inside the dialog (Tab reaches the cross).
3. Activate the cross (or Escape) → closes; focus returns to the originating screenshot button.

### 5. Scroll lock (FR-006)

1. Open a screenshot, then scroll with the wheel/trackpad → the page behind must not move.
2. Close → scroll position identical to before opening.

### 6. Reduced motion (FR-007)

1. DevTools → Rendering → **Emulate CSS media feature `prefers-reduced-motion: reduce`**.
2. Open/close → still fully functional; transition instant or a brief fade, no zoom flight.

### 7. Mobile / touch (FR-009/010, SC-004)

1. DevTools device toolbar → e.g. iPhone-class viewport (<860 px).
2. Tap a screenshot → opens; the cross is comfortably tappable (≥40 px) and inside the safe area.
3. Rotate (swap dimensions) while open → image re-fits, cross stays top-right.
4. Tap backdrop → closes.

### 8. Rapid clicks (Edge case)

Double/triple-click a screenshot quickly → exactly one lightbox opens, animation does not restart or stack.

## Build check

```bash
npm run check      # Eleventy build + wrangler dry-run must pass
```

`public/` is regenerated and committed per project convention; verify `git status` shows only expected changes (`src/` sources + rebuilt `public/` files).
