# Feature Specification: PAD File for Software Catalogs

**Feature Branch**: `005-pad-file`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "Cílem je vytvoření a pravidelná aktualizace PAD souboru, pomocí kterého můžu přidat program na podporované weby - katalogy softwaru jako je např. slunecnice.cz. Program se na slunecnice.cz přidává zde: https://www.slunecnice.cz/admin/programy/pridat/ Analyzuj tuto stránku. Nechci ji vyplňovat ručně, ale mít PAD soubor jako součást webu a ten sem nahrát. PAD soubor musí obsahovat všechna pole, které slunečnice vyžaduje, musí být lokalizovatelný (nevím, jestli oba jazyky v jednom, nebo pro každý jazyk samostatný PAD - to musíme prozkoumat)."

## Research Findings (pre-spec)

- **Slunečnice.cz accepts PAD by URL.** The public "Přidání programu" page (https://www.slunecnice.cz/pridani-programu/) offers two paths: manual entry ("Vyplnit údaje") and "Nahrát URL s PAD souborem" — supplying the address of a PAD file hosted on the program's own website. This matches the requested workflow exactly: the PAD file lives on tandemcommander.org and only its URL is handed to the catalog.
- **The admin form itself sits behind a login wall** (https://www.slunecnice.cz/admin/programy/pridat/ redirects to authentication), so its exact field list could not be inspected. Catalog PAD importers are, however, built around the standard PAD field set — that standard is the contract this feature targets (see Assumptions).
- **Localization: one file, both languages.** The PAD format officially supports multiple languages inside a single file — the description section is repeated once per language as a named language block. Slunečnice takes a single PAD URL, so a single bilingual (English + Czech) file is the answer to the "one file vs. one per language" question.
- **Format version.** The classic PAD 3.x specification (final revision 3.11) is the format software catalogs broadly accept. Its successor PAD 4.0 (2012) is effectively orphaned — the originating association dissolved in 2021 and the successor platform has been offline since 2024 — so the classic specification is the target.

## Clarifications

### Session 2026-08-22

- Q: Where does the installer file size (bytes) required by the PAD file come from — manually recorded in site data at each release, or discovered automatically from GitHub Releases at build time? → A: Manually — a new field in the site's single data source, updated with each release alongside version and release date; the build stays deterministic and offline.
- Q: Which contact e-mail should the PAD file publish as the author/support contact that catalogs display? → A: The existing author e-mail from the site's data source (already publicly rendered in the site footer and Story section); no dedicated alias is created.
- Q: Should the PAD file carry a changelog ("what's new") for the current version, which catalogs display next to program updates? → A: Yes — a brief English change summary for the current version, derived from the site's existing bilingual "What's New" content (spec 004), so no separate changelog is maintained for the PAD.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit the program to a catalog with just a URL (Priority: P1)

The author wants Tandem Commander listed on slunecnice.cz. They open the catalog's "add program" page, choose the PAD option, paste the public address of the PAD file hosted on tandemcommander.org, and the catalog imports every listing detail — name, version, release date, license, supported system, file size, descriptions, download link, screenshot, icon, author contact — without the author typing any of it into the form.

**Why this priority**: This is the entire point of the feature. A complete, valid, publicly hosted PAD file is the deliverable; everything else (automatic updates, second language) builds on it.

**Independent Test**: Fetch the PAD file from its public URL, check it against the PAD specification with an independent validator, and confirm every listing field a catalog needs is present and correct for the current release (0.1.4, released 2026-08-19). Actual submission to slunecnice.cz then serves as the end-to-end confirmation.

**Acceptance Scenarios**:

1. **Given** the website is deployed, **When** anyone requests the PAD file's public URL, **Then** the file is returned and parses as a valid PAD document.
2. **Given** the PAD file, **When** a catalog importer reads it, **Then** it finds the program name, version, release month/day/year, license/cost classification (free, open source), supported operating system, installer file size, primary download URL, product website URL, screenshot URL, icon URL, author/company identification and contact e-mail, distribution permissions, and descriptions — none of the fields the catalog requires are missing or empty.
3. **Given** the PAD file URL, **When** the author submits it on slunecnice.cz's "add program" page, **Then** the catalog accepts the file and pre-fills its listing from it, and the author completes the submission without manually re-typing program data.

---

### User Story 2 - A new release updates the PAD file automatically (Priority: P2)

The author releases a new version of Tandem Commander the usual way (bumping the version, release date, and download details in the site's single source of data, then deploying the site). The published PAD file now shows the new version, release date, file size, and download link — the author performed no PAD-specific editing. Catalogs that re-crawl the PAD URL pick the update up on their own; that is why they ask for a URL rather than an uploaded copy.

**Why this priority**: "Pravidelná aktualizace" is the second half of the request. Without it the PAD file silently rots and catalogs advertise a stale version — worse than no listing.

**Independent Test**: Change the version/release data in the site's data source, rebuild, and confirm the PAD file output reflects the change with no other edits.

**Acceptance Scenarios**:

1. **Given** the site data records version 0.1.5 with a new release date, **When** the site is rebuilt and deployed, **Then** the PAD file at the same unchanged URL reports version 0.1.5, the new date, and the matching download details.
2. **Given** program facts already maintained on the site (name, version, release date, website URL, repository/download location, author identity), **When** the PAD file is produced, **Then** those values come from the existing single source — there is no second, manually synchronized copy of them.
3. **Given** a produced PAD file that violates the format (a missing required field, an over-length description), **When** the site is built, **Then** the build fails visibly with a message naming the offending field, and the broken file is never published.

---

### User Story 3 - Czech and English descriptions in one file (Priority: P3)

A Czech catalog such as slunečnice.cz shows Tandem Commander with Czech descriptions; an international catalog reading the same file shows the English ones. Both languages travel in the single PAD file using the format's per-language description blocks, mirroring the bilingual website (spec 004).

**Why this priority**: Localization is explicitly requested, but a valid English-only PAD would already be submittable — so this lands after the file itself and its update mechanism.

**Independent Test**: Open the published PAD file and verify it contains a complete English description block and a complete Czech description block, each with all description length variants and keywords filled in.

**Acceptance Scenarios**:

1. **Given** the published PAD file, **When** its description section is inspected, **Then** it contains both an English and a Czech language block, and every description variant the format defines (from the shortest one-line summary to the full-length description) plus keywords is present in both languages.
2. **Given** the Czech description block, **When** it is read, **Then** the text is real reviewed Czech (consistent with the site's existing Czech texts), not machine-translated filler, and Czech diacritics survive intact in the delivered file.

---

### Edge Cases

- A description text exceeds its variant's character limit (the format defines exact maximum lengths per variant): the build must refuse to publish rather than emit an invalid or silently truncated file.
- Czech diacritics vs. strict validators: some legacy PAD validators expect a restricted character set in certain fields. The file must declare its text encoding correctly; if a target catalog rejects diacritics in a specific field, that field's Czech text is adjusted (this is verified against slunečnice.cz during first submission).
- The installer's file size changes with every release: the size is recorded manually in the site's data source as part of the release routine (alongside version and release date). The build must fail when the field is missing or not a positive number; staleness cannot be machine-detected, so the release routine pairs the size update with the version bump.
- Fields the project genuinely does not have (postal address, phone/fax numbers, sales e-mail): left empty where the specification permits an empty value; never filled with invented data.
- A catalog crawls the PAD URL mid-deploy: deploys of the site are atomic (whole-site swap), so a fetch returns either the old complete file or the new complete file, never a half-written one.
- The PAD URL must never change once submitted to catalogs — catalogs re-crawl the address they were given. Renaming or moving the file after first submission breaks all existing listings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The website MUST publish a PAD file at a stable, public, permanent URL on the tandemcommander.org domain, delivered as part of every site deploy.
- **FR-002**: The PAD file MUST conform to the classic PAD specification (revision 3.11): correct document structure, required elements present, and each field satisfying the specification's per-field constraints, so that automated catalog importers parse it without errors.
- **FR-003**: The PAD file MUST contain every field a software catalog needs to create a complete listing, including at minimum: program name; version; release month, day, and year; cost (free) and license classification (open source, GPLv2 or later); program type/release status; a brief summary of changes in the current version (what's new); supported operating system(s); installer file size; primary download URL; product website URL; screenshot URL; icon URL; author/company name and contact e-mail; distribution permissions; and the description set of FR-004.
- **FR-004**: The PAD file MUST carry descriptions in both English and Czech within the single file, using the format's per-language description blocks. Each language block MUST provide keywords and every description length variant the format defines, each within its character limit.
- **FR-005**: Every program fact that already lives in the site's single data source (name, version, release date, site URL, repository and release URLs, author identity and e-mail) MUST be derived from that source at build time. The installer's file size in bytes becomes a new field in that same data source, maintained manually as part of the release routine. The feature MUST NOT introduce a second manually synchronized copy of any of these facts, and the build MUST NOT depend on network access to produce the PAD file.
- **FR-006**: Releasing a new program version through the existing release process (updating the site's data source and deploying) MUST be sufficient to update the published PAD file's version, release date, file size, and download details. No PAD-specific manual step may be required, with the sole exception of optionally revising description/keyword texts; the current version's change summary derives from the site's existing "What's New" content, which the release routine already updates.
- **FR-007**: The PAD file MUST state its own public URL in the field the format designates for it, so catalogs can re-crawl the file for updates.
- **FR-008**: The site build MUST validate the produced PAD file (required fields present and non-empty where mandated, character limits respected, field formats matching the specification's constraints) and MUST fail the build with a clear, field-naming error message when validation fails. An invalid PAD file must never reach the public URL.
- **FR-009**: The screenshot and icon referenced from the PAD file MUST be publicly reachable image URLs on the site, in a form catalogs accept, and MUST depict the current version of the program (they may reuse the site's existing screenshot assets).
- **FR-010**: The author MUST be able to find the PAD file's public URL without archaeology — it is recorded in the project's documentation and/or discoverable on the site — so it can be submitted to additional catalogs at any time.

### Key Entities

- **PAD file**: The single machine-readable product description document published on the site; the contract between the project and every software catalog. Carries company/author info, program info, bilingual descriptions, web locations (download, screenshot, icon, its own URL), and distribution permissions.
- **Program data source**: The site's existing single source of truth for program facts (name, version 0.1.4, release date 2026-08-19, URLs, author). Feeds both the visible website and the PAD file.
- **Localized description set**: The English and Czech texts (keywords + all length variants) describing the program; sourced from/consistent with the site's existing bilingual texts, subject to per-variant character limits.
- **Software catalog**: External consumer (slunečnice.cz first; others later). Reads the PAD file by URL at submission time and re-crawls it for updates. Its requirements define which fields are mandatory in practice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The author lists Tandem Commander on slunecnice.cz by providing only the PAD file's URL — zero program-data fields typed by hand into the catalog's form.
- **SC-002**: The published PAD file passes an independent PAD-specification validator with zero errors.
- **SC-003**: Publishing a new program version requires zero PAD-specific manual steps beyond the existing release routine (data-source update + deploy); the PAD file at the unchanged URL reflects the new version immediately after the deploy.
- **SC-004**: Both an English and a Czech description block are present and complete in the published file; a Czech-language catalog displays Czech text for the listing.
- **SC-005**: The PAD file is publicly retrievable by anyone from its stable URL, immediately after every deploy, with the same address it had at first catalog submission.

## Assumptions

- **Slunečnice's PAD import covers its admin form.** The exact admin form (behind login) could not be inspected; the assumption is that the catalog's PAD importer maps the standard PAD field set onto the form — that is the documented purpose of its "Nahrát URL s PAD souborem" option. The first real submission validates this; any field the catalog still demands manually becomes a small follow-up.
- **Classic PAD 3.11 is the right target.** PAD 4.0's governing organizations are defunct (association dissolved 2021, successor platform offline since 2024), while catalogs continue accepting the classic format. Should slunečnice require a different revision, only the output template changes — the data model does not.
- **One bilingual file, not one file per language.** The format's official multi-language mechanism (per-language description blocks in one file) is used; slunečnice accepts a single PAD URL. If a future catalog demands single-language files, per-language variants can be added later without breaking the primary URL.
- **The installer is distributed via GitHub Releases**, as the site's data source records today; the download URL derives from the release location, and the installer's byte size is recorded by hand in the site's data source at release time (per clarification — no build-time lookup against GitHub).
- **The program is classified as free, open-source software** (GPLv2 or later): cost is zero and the distribution permissions allow catalogs to list and link the download.
- **Description texts start from the site's existing English and Czech texts** (site description/tagline, spec 004 translations) and are reviewed by the author, who is a Czech speaker; character-limit-fitting rewrites are part of authoring, not automation.
- **Contact fields not applicable to a solo open-source project** (postal address, phone, fax, sales contact) are left empty where the specification permits. The published author/support contact is the site's existing public author e-mail from the single data source (per clarification); no dedicated alias is introduced.
- **Update cadence equals release cadence.** The PAD file is static between releases; no scheduled regeneration is needed because the program's facts change only when a release changes them.
