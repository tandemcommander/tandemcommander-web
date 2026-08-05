# Feature Specification: Screenshot Lightbox

**Feature Branch**: `002-screenshot-lightbox`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "Uprav zobrazeni screenshotu aplikace, tak ze kdyz na ne uzivatel klikne, tak se zobrazi zvetsene, jakoby na fullscreen, s moznosti zavreni nahledu pomoci krizku vpravo nahore. Prechod z obrazku do zvetseneho zobrazeni bude animovany, proste aby to bylo takove hrave."

## Clarifications

### Session 2026-08-05

- Q: Should the enlarged view allow navigating between screenshots (prev/next arrows, swipe), or does it always show only the one clicked image? → A: Single image only — to view the other screenshot, the visitor closes the view and clicks it.
- Q: What should the "playful" animation feel like — a slight overshoot/bounce at the end of the zoom, or a purely smooth zoom? → A: Purely smooth zoom in both directions, no overshoot or bounce; the playfulness comes from a brisk tempo.
- Q (implementation feedback): The zoom-from-thumbnail animation visibly aliased while continuously rescaling the raster screenshots — keep it? → A: No. The animation must never scale the image; replaced with a non-scaling entrance (backdrop fade + the image gently rising into its final position). The same applies to hover cues on the thumbnails.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enlarge a screenshot on click (Priority: P1)

A visitor browsing the landing page wants to see an application screenshot in detail. They click (or tap) the screenshot and it opens in an enlarged, near-fullscreen view over the page, with a dimmed backdrop behind it. A close button (a cross) sits in the top-right corner of the view; clicking it returns the visitor to the page exactly where they left off.

**Why this priority**: This is the core of the request — without the enlarge-and-close loop there is no feature. It delivers standalone value even with no animation at all.

**Independent Test**: Can be fully tested by clicking each screenshot on the page, verifying an enlarged view appears with the image clearly readable, and verifying the cross in the top-right corner closes it and restores the page unchanged.

**Acceptance Scenarios**:

1. **Given** the landing page with the screenshots section visible, **When** the visitor clicks a screenshot, **Then** an enlarged view of that same screenshot opens over the page with a dimmed backdrop, scaled to fit the viewport while keeping its aspect ratio.
2. **Given** the enlarged view is open, **When** the visitor clicks the cross in the top-right corner, **Then** the enlarged view closes and the page is back in its previous state, at the same scroll position.
3. **Given** the enlarged view is open, **When** the visitor looks at the underlying page, **Then** the page content behind the overlay does not scroll while the view is open.

---

### User Story 2 - Playful animated transition (Priority: P2)

When the visitor clicks a screenshot, the enlarged view animates in rather than appearing abruptly: the page dims and the image, already at its final size, gently rises into place while fading in; closing plays the reverse. The motion never scales the image (continuous rescaling of a raster screenshot shimmers/aliases) and stays smooth and brisk — no bouncing or overshoot — so it feels playful rather than sluggish.

**Why this priority**: The animation is an explicit part of the request ("aby to bylo takové hravé") and is what makes the interaction feel polished, but the feature is functional without it.

**Independent Test**: Can be tested by opening and closing the enlarged view and observing that the image animates smoothly between its thumbnail position and the enlarged position in both directions.

**Acceptance Scenarios**:

1. **Given** the screenshots section, **When** the visitor clicks a screenshot, **Then** the enlarged view animates in (backdrop fade, image rising into place) — it does not simply pop in, and the image is never visibly rescaled mid-animation.
2. **Given** the enlarged view is open, **When** the visitor closes it, **Then** the view animates out in reverse (image drifts down and fades, backdrop clears).
3. **Given** a visitor whose device or system settings request reduced motion, **When** they open or close the enlarged view, **Then** the view still opens and closes correctly with the animation reduced or removed.

---

### User Story 3 - Convenient closing and accessibility (Priority: P3)

A visitor can also dismiss the enlarged view in the ways they intuitively expect: pressing the Escape key or clicking the dimmed area outside the image. Keyboard-only visitors can open a screenshot, reach the close control, and close the view without a pointing device, and assistive technologies announce the screenshots as enlargeable.

**Why this priority**: These are conventions visitors expect from any image preview; missing them causes friction but the primary flow (P1) still works via the cross.

**Independent Test**: Can be tested by opening the enlarged view and dismissing it with Escape, then again by clicking the backdrop, then repeating the whole open/close cycle using only the keyboard.

**Acceptance Scenarios**:

1. **Given** the enlarged view is open, **When** the visitor presses the Escape key, **Then** the view closes.
2. **Given** the enlarged view is open, **When** the visitor clicks the dimmed backdrop outside the image, **Then** the view closes.
3. **Given** a keyboard-only visitor on the page, **When** they move focus to a screenshot and activate it, **Then** the enlarged view opens and focus moves into it so the close control is reachable; on close, focus returns to the screenshot they started from.
4. **Given** a visitor hovering over a screenshot with a mouse, **When** the cursor is over the image, **Then** the cursor and/or a subtle visual cue indicates the image can be clicked.

---

### Edge Cases

- What happens when the visitor clicks a screenshot repeatedly in quick succession? Only one enlarged view opens; the interaction does not stack or break the animation.
- What happens on a small phone screen? The enlarged view still fits the viewport, the image remains fully visible without cropping, and the cross remains reachable and large enough to tap.
- What happens when the browser window is resized (or the phone rotated) while the enlarged view is open? The image re-fits the new viewport size and the cross stays in the top-right corner.
- What happens for visitors who prefer reduced motion? The view opens and closes without the playful animation (or with a minimal fade), never trapping them.
- What happens if an image is slow to load or fails to load on the page? The enlarged view shows the same asset the page shows; a broken page image simply yields the same broken state enlarged — no separate error handling is introduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every application screenshot in the screenshots section MUST be clickable/tappable and open an enlarged view of that screenshot.
- **FR-002**: The enlarged view MUST cover the viewport with a dimmed backdrop and display the image at the largest size that fits the viewport while preserving its aspect ratio, without cropping.
- **FR-003**: The enlarged view MUST show a close control rendered as a cross in its top-right corner, and activating it MUST close the view.
- **FR-004**: Opening MUST animate the enlarged view in (dimming backdrop plus the image gently rising into its final position); closing MUST animate it out in reverse. The animation MUST NOT scale the image at any point (continuous raster rescaling produces visible aliasing) and MUST stay smooth and brisk — no overshoot or bounce — so it feels playful rather than abrupt or sluggish.
- **FR-005**: The enlarged view MUST also close when the visitor presses the Escape key or clicks/taps the backdrop outside the image.
- **FR-006**: While the enlarged view is open, the page behind it MUST NOT scroll; on close, the page MUST be restored to its previous state and scroll position.
- **FR-007**: For visitors who request reduced motion, the view MUST open and close with the animation reduced or removed while remaining fully functional.
- **FR-008**: The interaction MUST work with keyboard alone: screenshots are focusable and activatable, focus moves into the enlarged view on open, and returns to the originating screenshot on close.
- **FR-009**: Screenshots MUST visually communicate their clickability (e.g., cursor change or subtle hover cue), and the close control MUST be comfortably tappable on touch devices.
- **FR-010**: The behavior MUST apply uniformly to all screenshots in the section, including any added in the future, and MUST work at both the site's desktop and mobile layouts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can enlarge any screenshot with a single click/tap and dismiss it with a single click/tap, in under 5 seconds end to end.
- **SC-002**: The open and close transitions each complete in under half a second and play smoothly, with no visible stutter or layout jumping on a typical laptop or phone.
- **SC-003**: In the enlarged view, the image occupies at least 85% of the viewport's limiting dimension, and visitors can discern UI detail in the screenshot that is not readable at thumbnail size.
- **SC-004**: 100% of the ways to dismiss the view (cross, Escape, backdrop click) work on desktop, and the cross and backdrop tap work on touch devices.
- **SC-005**: A keyboard-only visitor can complete the full open-and-close cycle without using a mouse.
- **SC-006**: After closing, the page is visually identical to its state before opening — same scroll position, no layout shift.

## Assumptions

- The feature applies to the application screenshots in the landing page's screenshots section (currently the light-theme and dark-theme shots); other decorative imagery on the site is out of scope.
- The enlarged view shows the same image asset already used on the page; no separate high-resolution assets are required (the current assets are placeholders awaiting final versions, which will drop in without changes to this feature).
- Only one image is viewed at a time; navigating between screenshots inside the enlarged view (prev/next arrows, swiping) is out of scope.
- No zooming or panning inside the enlarged view is required — fit-to-viewport is sufficient.
- The feature is purely client-side presentation; it introduces no data collection, storage, or backend dependency.
