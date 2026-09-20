# Contract: Pages, URLs and UI behaviour

**Decisions**: [research.md R4, R11, R12](../research.md)

## URLs (permanent once published)

| URL | Page | Template |
|-----|------|----------|
| `/`, `/cs/` | home | `src/index.njk`, `src/cs/index.njk` (existing) |
| `/releases/`, `/cs/releases/` | release history | `src/pages/releases.njk`, paginated over languages |
| `/#<scene-id>` | one gallery item on the home page | scene ids are never renamed |
| `/releases/#v<version>` | one release | e.g. `#v0.1.8` |
| `/assets/screenshot-light.png` | PAD screenshot (FR-023) | regenerated PNG of `main-window/light` |
| `/assets/screenshot-dark.png` | legacy address | PNG of `dark-theme/dark` |
| `/sitemap.xml` | generated: every language × {home, releases}, `hreflang` alternates, `lastmod` = release date |

Every page: same header, footer, theme switch; `canonical`, `hreflang`, `og:url` and the language
switcher include the page path, so switching language keeps the visitor on the same page and
carries the `#fragment` over (existing behaviour, generalised). The before-paint language
redirect runs on the home page only.

## Home page - section order

hero → **gallery (featured)** `#gallery` → features → **what's new** `#new` → project → story →
download. Header nav: Gallery · What's new · Project · Download. The old `#screens` anchor is kept
as an alias on the gallery section so existing links still land.

### Gallery section (replaces "Themes") - the whole gallery lives here

- Heading keeps the light/dark message. 4-6 featured cards in catalog order: `main-window` (light only)
  and `dark-theme` (dark only) form the first row as a pair - today's light/dark comparison,
  visible in either site theme; the rest follow in a 2- or 3-column grid; one column below 640 px.
- Card = `<figure id="<scene-id>">`: `<figcaption>` **first** (title as a heading, then the caption,
  separated from the picture by a rule), then the picture as an `<a href="<full image>">` that
  PhotoSwipe opens. No version label. The picture is centred in a frame of uniform height.
- Images: card variant (`-640.webp`) in the grid, with `width`/`height`; two-theme scenes render
  both `<img>`; CSS shows the one matching `html[data-theme]`, the other is `display:none`
  (never fetched - lazy). First card `loading="eager" fetchpriority="high"`, all others `lazy`.
- Cards in the first row use `srcset` with both variants (`-640.webp` and full size) and `sizes`
  from the grid, so a wide desktop layout gets a crisp image and a phone the small one.

### What's new section

- Header line: `Version 0.1.8 · 20 September 2026` + the current record's summary.
- Exactly six cards (`releases.homeCards`): version label chip, title, text; a card with a scene
  links "See it →" to the gallery item. Cards of the current version are visually marked.
- Link "All releases →" to `{{ locale.url }}releases/`.

### Download section

- Primary: installer button (unchanged).
- Secondary: "Or with winget" - `<code>winget install tandemcommander</code>` with a Copy button
  (`navigator.clipboard`, label flips to "Copied" for 2 s, `aria-live="polite"`); without
  scripting the button is absent and the command is selectable text.
- Disclaimer reworded (FR-003).

## Release history page

Newest first. Per release: `<article id="v0.1.8">` - version, localized date, kind label, "current"
badge on the first, summary, highlights as a list (title + text, optional "See it →"), link "Full
release notes on GitHub ↗" (`notesUrl`). Closing block links to the download section.

## Gallery viewer (extends the spec-002 lightbox)

| Aspect | Behaviour |
|--------|-----------|
| Library | PhotoSwipe 5, self-hosted under `/js/vendor/photoswipe/` (MIT), loaded as a module only on pages that have a gallery |
| Group | all `a.gallery-link` elements of the page's gallery container, in DOM order |
| Image | full-size WebP of the current site theme; single-theme scenes show their only variant |
| Chrome | close, previous, next, zoom, **full screen**, counter, and a caption bar with the item's title and caption - visible in full screen too |
| Keyboard | `Esc` close · `←`/`→` previous/next (no wrap-around) · `Home`/`End` first/last · `Tab` cycles the three controls |
| Pointer/touch | click on backdrop closes; horizontal swipe ≥ 48 px steps; vertical scroll is not hijacked |
| Focus | on open → close button (as today); on close → the trigger of the item **shown last**, scrolled into view |
| Motion | spec-002 zoom on open/close; cross-fade between items; both disabled under `prefers-reduced-motion` |
| Announcements | dialog `aria-label` from i18n; caption region `aria-live="polite"` so stepping announces the new title |
| No scripting | every card is a plain link to the full-size picture, so it still opens; cards, captions and images remain fully visible (FR-021) |
| URL | stepping does not change the URL; opening from `/#<scene-id>` does not auto-open the viewer |

## Performance budget (SC-006) - checked in quickstart

| Item | Budget |
|------|--------|
| images fetched before first scroll on home (desktop) | ≤ 130 KB |
| any single gallery image | ≤ 300 KB (enforced by the capture pipeline) |
| all images of the home page | < 1 MB |
| layout shift caused by images | none - every `<img>` has `width`/`height` |
| new script | no library; `main.js` growth ≤ ~150 lines |
