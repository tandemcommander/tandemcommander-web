# Feature Specification: Download Release Date

**Feature Branch**: `003-download-release-date`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Uprav web tak, aby v sekci Download u stažení souboru bylo uvedeno i datum vydání. Toto datum bude konfigurovatelné v JSON nastavení stejně jako číslo verze."

## Clarifications

### Session 2026-08-06

- Q: Co se má stát, když datum vydání v JSON nastavení chybí nebo je neplatné? → A: Build selže s jasnou chybou; web se bez platného data nesestaví.
- Q: Kde přesně v sekci Download se má datum vydání zobrazit? → A: Připojené k existujícímu řádku s verzí v kartě instalátoru (např. "Version 0.1.1 for Windows 11, x64 · released August 6, 2026").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor sees the release date next to the download (Priority: P1)

A visitor considering downloading Tandem Commander opens the Download section and, alongside the version number and platform information for the installer file, sees the date the offered version was released. This tells them at a glance how fresh the build is before they commit to downloading it.

**Why this priority**: This is the core of the feature — the release date visible at the point of download is the entire user-facing value. Without it, nothing else in this feature matters.

**Independent Test**: Open the published site, scroll to the Download section, and confirm a human-readable release date is displayed together with the installer's version information.

**Acceptance Scenarios**:

1. **Given** the site is built with a release date configured, **When** a visitor views the Download section, **Then** the release date is displayed in the installer card on the same line as the installer's version and platform description (e.g., "Version 0.1.1 for Windows 11, x64 · released August 6, 2026").
2. **Given** the site is viewed on a mobile-width screen, **When** a visitor views the Download section, **Then** the release date remains visible and legible without breaking the section layout.
3. **Given** the displayed release date, **When** a visitor reads it, **Then** it is formatted as a human-readable date consistent with the site's language (English), not as a raw technical value.

---

### User Story 2 - Site maintainer updates the release date in one place (Priority: P2)

When publishing a new release, the site maintainer edits the same central JSON settings file where the version number already lives, changes the release date value, rebuilds the site, and the new date appears in the Download section — with no edits to page templates or content files.

**Why this priority**: Single-place configurability is the second half of the request. It keeps release upkeep as cheap as the existing version-number workflow, but it only matters once the date is displayed at all.

**Independent Test**: Change the release date value in the central settings file, rebuild the site, and confirm the Download section shows the new date without any other file having been touched.

**Acceptance Scenarios**:

1. **Given** a release date value in the central JSON settings, **When** the maintainer changes it and rebuilds the site, **Then** the Download section shows the updated date.
2. **Given** the existing version-number workflow, **When** the maintainer publishes a new release, **Then** updating the date requires editing only the same settings file already edited for the version number.

---

### Edge Cases

- When the release date is missing or empty in the settings, the site build fails with a clear error naming the missing value — the site is never published without a release date, and a broken placeholder (e.g., "Released undefined") can never render.
- When the configured date is not a valid date, the site build likewise fails with a clear error, so the maintainer discovers the mistake at build time rather than the site silently rendering nonsense.
- The version number and release date are updated independently — a maintainer could bump the version and forget the date. The two values live side by side in the same file to make the omission easy to spot during release edits.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Download section MUST display the release date of the offered installer in the installer card, appended to the existing line carrying the version and platform description (e.g., "Version 0.1.1 for Windows 11, x64 · released August 6, 2026").
- **FR-002**: The release date MUST be sourced from the same central JSON settings file that already holds the version number, as a single configurable value.
- **FR-003**: Changing the release date MUST require editing only that settings value; no page templates or content need to be touched for the date to update after a rebuild.
- **FR-004**: The displayed date MUST be human-readable and consistent with the site's language (English), regardless of how the value is stored in the settings.
- **FR-005**: The Download section layout MUST remain intact with the date present, on both desktop and mobile widths.
- **FR-006**: The site build MUST fail with a clear error identifying the problem when the release date value is missing, empty, or not a valid date — the site can never be published without a valid release date.

### Key Entities

- **Site settings**: The central JSON configuration holding site-wide release facts (name, version, platform, license, links). Gains one new attribute: the release date of the currently offered version.
- **Release date**: A single date value describing when the currently offered installer version was published. Stored once in settings, rendered in the Download section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can determine the release date of the offered version from the Download section within seconds, without leaving the page or visiting the external releases listing.
- **SC-002**: A maintainer can update the release date for a new release by editing exactly one value in one file, in under a minute.
- **SC-003**: 100% of pages/places that show the release date reflect the configured value after a rebuild — no stale or hard-coded dates remain anywhere on the site.

## Assumptions

- "U stažení souboru" (next to the file download) means the installer card in the Download section: the date is appended to the same line where the version and platform are already shown (confirmed in clarification session 2026-08-06).
- Only the Download section gains the date; other places that mention the version (hero badge, project facts, screenshots note) are out of scope unless requested later.
- The date is stored in the settings in an unambiguous machine-friendly form and rendered as a human-readable English date (e.g., "August 6, 2026"), matching the site's language.
- One release date applies to the single currently offered version — the site offers exactly one installer download at a time, so no per-release date list is needed.
- The maintainer updates the date manually as part of the existing release workflow (same as the version number); no automatic synchronization with the external releases system is expected.
