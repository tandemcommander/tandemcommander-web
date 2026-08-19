# Feature Specification: Multilingual Site with Czech Localization

**Feature Branch**: `004-multilingual-czech`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Potřebuji vytvořit vícejazyčnou verzi webu včetně možnosti přepínače jazyků. Nyní je web v angličtině; v rámci tohoto rozšíření přidáme podporu pro další jazyky a zároveň přidáme nový jazyk — češtinu. Výsledkem tedy bude web v angličtině (výchozí jazyk) s možností přepnutí do češtiny na tandemcommander.org/cs. Pokud uživatel přijde na web poprvé a ještě nebude mít nastavený jazyk, detekuje se jazyk podle jeho prohlížeče / preferencí. Pokud si jazyk následně přepne, bude se držet toto zvolené nastavení. V rámci implementace zároveň proveď překlad anglických textů do češtiny — já je pak zkontroluji."

## Clarifications

### Session 2026-08-19

- Q: How should the root URL `/` behave for Czech-preferring visitors (stored choice or browser detection) — auto-redirect to `/cs`, or show English with a suggestion banner? → A: Auto-redirect to `/cs`; the address visibly changes to `/cs`.
- Q: When future English content (e.g. a new "What's New" entry) lacks a Czech translation, should publishing be blocked or should the Czech page show the English original? → A: Strict parity — publishing is blocked until every text has a Czech counterpart; no English fallback on `/cs`.
- Q: What form should the header language switcher take — compact codes "EN | CS", a single link naming the other language, or a dropdown? → A: Compact codes "EN | CS" side by side with the current language highlighted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Czech visitor reads the site in Czech (Priority: P1)

A Czech-speaking visitor opens `tandemcommander.org/cs` (directly, or via a shared link) and reads the complete Tandem Commander website — hero, screenshots, features, what's new, project info, story, download, and footer — entirely in Czech, with the same content, structure, and visual design as the English original.

**Why this priority**: This is the core value of the feature: without a complete, published Czech version there is nothing to switch to or detect. It is a viable MVP on its own — Czech users can be sent the `/cs` link even before the switcher or auto-detection exist.

**Independent Test**: Open `tandemcommander.org/cs` in any browser and verify every visible text (including page title, description shown in search/social previews, and image alternative texts) is in Czech and the page looks and behaves identically to the English version.

**Acceptance Scenarios**:

1. **Given** the site is published, **When** a visitor opens `/cs`, **Then** the full page is displayed in Czech with the same sections, images, and functionality as the English version.
2. **Given** the Czech page is open, **When** the visitor inspects the browser tab title and shares the link on social media, **Then** the title and preview description appear in Czech.
3. **Given** the site is published, **When** a visitor opens the root URL `/`, **Then** the English version is displayed exactly as today, with no changed or broken URLs.
4. **Given** the Czech page is open, **When** the visitor reads any section, **Then** Czech diacritics (ě, š, č, ř, ž, ů …) render correctly in all typefaces used on the page.

---

### User Story 2 - Visitor switches language and the choice sticks (Priority: P2)

Any visitor can see which language they are reading and switch between English and Czech with a single action from anywhere on the page. Once they switch, the site remembers the choice on that browser and shows the chosen language on subsequent visits.

**Why this priority**: The switcher is the visible entry point to the Czech version for visitors who land on the English page, and persistence is an explicit requirement ("pokud si jazyk přepne, bude se držet toto nastavení"). It depends on User Story 1 existing but is independently testable.

**Independent Test**: On the English page, use the switcher to go to Czech, close the browser, return to the root URL, and verify the Czech version is shown.

**Acceptance Scenarios**:

1. **Given** a visitor is on the English page, **When** they activate the language switcher and choose Czech, **Then** the Czech version of the same page is displayed.
2. **Given** a visitor switched to Czech earlier on this browser, **When** they later visit the root URL `/`, **Then** they are automatically redirected to `/cs`.
3. **Given** a visitor switched to English earlier on this browser, **When** they later visit the root URL `/`, **Then** the English version is shown with no redirect, regardless of their browser's language preference.
4. **Given** any page in either language, **When** the visitor looks at the page header on desktop or mobile, **Then** the language switcher is visible, indicates the current language, and is operable by keyboard.

---

### User Story 3 - First-time visitor gets their language automatically (Priority: P3)

A visitor who has never chosen a language opens the root URL. The site inspects the browser's language preferences: if Czech is preferred, the Czech version is shown; otherwise the English version is shown.

**Why this priority**: A convenience layer on top of Stories 1 and 2 — it improves the first impression for Czech users but the site is fully usable without it (they can still switch manually).

**Independent Test**: In a browser with no stored language choice and Czech set as the preferred browser language, open the root URL and verify the Czech version appears; repeat with English (or any other) preference and verify English appears.

**Acceptance Scenarios**:

1. **Given** a browser with Czech as the preferred language and no stored choice, **When** the visitor opens `/`, **Then** they are automatically redirected to `/cs` and the Czech version is displayed.
2. **Given** a browser with English (or any non-Czech) preferred language and no stored choice, **When** the visitor opens `/`, **Then** the English version is displayed.
3. **Given** a browser with Czech preference but a stored explicit choice of English, **When** the visitor opens `/`, **Then** the stored choice wins and English is displayed.
4. **Given** any browser, **When** the visitor opens a language-specific URL directly (e.g. `/cs` or a shared English link), **Then** the language of that URL is displayed regardless of detection or stored preference, and the stored preference is not silently changed.

---

### Edge Cases

- Browser prefers a third language (e.g. German): no stored choice → English (the default) is shown.
- Visitor has storage disabled (private browsing, blocked cookies/storage): switching still works for the current browsing session; on the next visit detection applies again. No errors are shown.
- Visitor opens a non-existent address (404): the error page must remain functional; it offers a way to both language homepages (see Assumptions).
- A future release adds new English content (e.g. a new "What's New" entry): publishing is blocked until every user-visible text has a counterpart in every supported language — the pre-publish check fails on missing translations; the Czech version never shows English fallback text.
- Search engine crawlers must always be able to reach and index both language versions directly; automatic language redirection must never hide one version from indexing.
- Social/link previews for `/cs` links must use Czech title, description, and preview image text where applicable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST be available in two languages: English as the default at the existing root URLs (unchanged), and Czech under the `/cs` URL prefix on the same domain.
- **FR-002**: Every user-visible text on the Czech version MUST be in Czech: all page sections, navigation, buttons, image alternative texts, page title, meta description, and social-sharing metadata. The product name "Tandem Commander" and established technical terms (e.g. SFTP, Unicode, GPLv2) remain untranslated.
- **FR-003**: A language switcher MUST be present on every page in both languages as a compact toggle of language codes shown side by side (e.g. "EN | CS") with the current language visually highlighted; it MUST switch to the equivalent page in the other language with a single action and be usable on both desktop and mobile layouts and via keyboard.
- **FR-004**: An explicit language choice made via the switcher MUST be remembered on the visitor's browser; on subsequent visits to the root URL, a stored Czech choice MUST automatically redirect to `/cs` (the address visibly changes), while a stored English choice keeps the root URL with no redirect.
- **FR-005**: On a first visit to the root URL with no stored choice, the site MUST select the language from the browser's language preferences: Czech preference → automatic redirect to `/cs`; anything else → English at the root URL with no redirect.
- **FR-006**: A direct visit to a language-specific URL MUST always display that URL's language, regardless of stored preference or browser detection; only an explicit switcher action updates the stored preference.
- **FR-007**: Both language versions MUST be independently reachable and indexable by search engines: each version declares its own language, the two versions reference each other as language alternates, and both are listed in the site map. Automatic redirection MUST NOT prevent crawlers from reading either version.
- **FR-008**: The solution MUST support adding further languages later by supplying a new set of translated texts, without restructuring the site or rewriting existing pages.
- **FR-009**: Czech text MUST render correctly with all Czech diacritics in every typeface used on the site.
- **FR-010**: If language detection is unavailable or fails, the site MUST default to English without visible errors.
- **FR-011**: The Czech translation of all current English texts MUST be produced as part of this feature and presented to the site owner for review before the Czech version is publicly announced.
- **FR-012**: The English version's existing URLs, content, and behavior MUST remain unchanged (no regressions for existing visitors, links, or search results).
- **FR-013**: Publishing MUST be blocked whenever any user-visible text lacks a counterpart in any supported language: the pre-publish check MUST fail and identify the missing entries, and the published Czech version MUST never display English fallback text.

### Key Entities

- **Language (locale)**: A supported site language — identifier (e.g. `en`, `cs`), display name shown in the switcher, URL prefix (none for the default language, `/cs` for Czech), and default flag.
- **Translated content set**: The complete collection of user-visible texts for one language — one entry per text used anywhere on the site (sections, metadata, alternative texts). Every language must have a value for every entry.
- **Visitor language preference**: The language a visitor explicitly chose via the switcher, stored on their browser; absent until the first explicit switch.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of user-visible texts on the Czech version are in Czech (excluding the product name and established technical terms) — verified by a full-page review of `/cs`.
- **SC-002**: Switching language takes exactly one action from any page and completes within normal page-load time (under 2 seconds on a typical connection).
- **SC-003**: A visitor who switched language sees their chosen language on 100% of subsequent root-URL visits from the same browser.
- **SC-004**: A first-time visitor with Czech browser preference reaches the Czech version without any manual action.
- **SC-005**: All pre-existing English URLs continue to resolve exactly as before the change (zero broken or redirected English links).
- **SC-006**: Both language versions appear in the site map and are directly loadable without executing any visitor-side logic (verifiable by fetching each URL directly).
- **SC-007**: The site owner receives the complete Czech translation for review as a deliverable of this feature.

## Assumptions

- The site remains a single-page site (plus the 404 error page); the Czech version mirrors the same single-page structure under `/cs`.
- The language switcher lives in the page header next to the existing header controls (e.g. the theme toggle) as a compact "EN | CS" code toggle, and is present in the mobile layout.
- The language preference is stored on the visitor's browser/device only — there are no user accounts and no server-side profiles.
- Automatic redirection based on detection or stored preference applies only at the root URL entry point; deep, language-specific links always show their own language (see FR-006).
- The 404 error page is kept simple: it remains a single page and provides links to both the English and Czech homepages rather than being fully localized per language.
- The "What's New" changelog entries are translated to Czech along with all other content; future changelog entries will be authored in both languages.
- Machine-assisted translation is acceptable as the first draft; the site owner (a native Czech speaker) reviews and corrects it before the Czech version is announced (FR-011, SC-007).
- The production deployment of this feature follows the project's existing release process; the pending final screenshot assets are an independent concern and not blocked by or blocking this feature.
