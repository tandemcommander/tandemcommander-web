# Feature Specification: Release-Driven Website Content and Feature Gallery

**Feature Branch**: `007-release-news-gallery`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Proved detailni analyzu projektu v E:\Projects\tandemcommander a navrhni upravu webu tak, aby reflektovala novou verzi, resp. novinky, ktere se od prvni verze 0.1.0 realizovali. zaroven navrhni zpusob jak aktualizovat web pri kazdem novem vydani tak, aby se hlavni zmeny dostaly na web. Zaroven VYmysli zpusob jak vytvorit nove screenshoty a idealne pridat dalsi tedy celou galerii, ve ktere budou zobrazeny / komunukovany vsechny dulezite funkce Tandem Commanderu."

## Context

The website was written for the first public release (0.1.0, 2026-08-05). Since then the application has shipped eight more versions (0.1.1 - 0.1.8, the latest on 2026-09-20), but every website release so far changed only three values - version, release date and installer size. The page a visitor reads today still describes 0.1.0: its "What's new" section, hero text, catalog descriptions and both screenshots (whose title bar literally reads "Tandem Commander 0.1.0") predate panel tabs, the Code Viewer, winget distribution and everything else delivered since.

This feature has three parts, matching the three things the author asked for:

1. **Catch up** - bring the website's content in line with what Tandem Commander 0.1.8 actually is.
2. **Stay caught up** - give every future release a defined, quick and checked path by which its main changes reach the website.
3. **Show it** - replace the two temporary screenshots with a repeatable way of producing screenshots, and grow them into a gallery that communicates every important capability of the program.

## Research Findings (pre-spec)

Findings from the analysis of the application repository (`E:\Projects\tandemcommander`: `CHANGELOG.md`, `README.md`, `specs/001`-`081`, `plugins.cfg`, the release tooling) and of the current website.

### What changed between 0.1.0 and 0.1.8

| Version | Date | Kind | What a visitor would care about |
|---------|------|------|---------------------------------|
| 0.1.8 | 2026-09-20 | Feature | **Panel tabs** - several directories per panel, browser-style: new/duplicate/close, drag to reorder, middle-click opens a folder in a background tab, each tab keeps its own view, sort, filter, selection and history, the whole set is restored at next start, one checkbox turns the feature off. **Runs without the Visual C++ runtime** (0.1.0-0.1.7 silently refused to start on a clean PC). **Antivirus-friendly**: the background crash-reporter process and the start-up in-memory patch - the two things antivirus engines flagged - are gone. **Updates while running**: an idle program closes for the update by itself and is restarted afterwards with the same directories and tabs. Markdown viewer moved onto the same hardened rendering surface as the Code Viewer. |
| 0.1.7 | 2026-08-29 | Installer fix | Unattended (silent) installation works for the first time - the precondition for winget acceptance and managed deployment. Application unchanged. |
| 0.1.6 | 2026-08-29 | Feature | **Code Viewer** - F3 on source and configuration files shows syntax highlighting for 200+ languages and formats in 12 colour schemes (5 light, 7 dark, or follow the application theme). **Configurable Command Shell** - `Num /` opens Command Prompt, Windows PowerShell, PowerShell 7, Windows Terminal, Git Bash or any custom program. **winget** - `winget install tandemcommander` / `winget upgrade`. Ships 20 plugins (was 19). |
| 0.1.5 | 2026-08-25 | Bug fix | Product-wide review of accented and non-Latin text: Compare Directories, command line, external archivers, cloud entries in the drive bar, shortcuts, drag-and-drop, volume information. Files with broken (unpaired-surrogate) names can finally be deleted, copied and renamed. **Markdown files open instantly** after the first view of a session. A crash on long names on the command line removed. |
| 0.1.4 | 2026-08-19 | Bug fix | **Thumbnails appear immediately** even in folders with thousands of photos, and honour EXIF rotation. DEL moves to the Recycle Bin again in folders with accented paths (it had been deleting permanently). Clipboard copies keep accents. **TortoiseGit/TortoiseSVN badges** are back at display scaling other than 100 %. |
| 0.1.3 | 2026-08-18 | Feature | **Settings migration from Altap Salamander** (hot paths, FTP bookmarks, user menu, associations, colours, plugin configurations; with backup and one-click restore). **Cloud sync-status badges as in Explorer**, including the "sync in progress" badge and folders with non-ASCII names (Google Drive's `Můj disk`). |
| 0.1.2 | 2026-08-07 | Maintenance | SFTP dialogs and connection handling reworked; ~3,300 UI strings re-translated with context in all 8 non-English languages; plugin names render correctly everywhere. |
| 0.1.1 | 2026-08-05 | Bug fix | SFTP private-key authentication: OpenSSH-format RSA/ECDSA keys work, passphrases work, no SFTP operation can hang the application, lost connections are noticed and reconnected. |
| 0.1.0 | 2026-08-05 | First release | Own identity, Unicode and long paths throughout, SFTP plugin, Markdown viewer, light and dark themes, 9 UI languages, signed installer. |

### Where the website is out of date

- **"What's new" describes 0.1.0.** Its four cards (Unicode/long paths, SFTP, Markdown View, PictView) are the first release's headlines. Of the 0.1.1 - 0.1.8 headlines - tabs, Code Viewer, configurable shell, winget, Altap migration, cloud badges, fast thumbnails - only the last was ever added (one sentence appended to the PictView card); the other six appear nowhere on the site. The section lead even claims these are "the main additions and improvements in this release".
- **The catalog changelog is wrong by inheritance.** The PAD file's change-info text is generated from those same four cards, so software catalogs are being told that 0.1.8's changes are the 0.1.0 feature list.
- **Hero, meta description, keywords and all five PAD descriptions** enumerate the 0.1.0 feature set only.
- **The download section has no winget path** although it has been a supported installation channel since 0.1.6, and its disclaimer still opens with "This is a first release".
- **Both screenshots are temporary placeholders** (confirmed by the author on 2026-08-05), captured from version 0.1.0 - visible in the title bar - and show no tab strip. They are 1089 × 773 px, light and dark, and are the site's *only* images of the program. One of them is also the screenshot that software catalogs fetch through the PAD file, at an address that must not change.
- **There is no release history on the site at all.** A visitor cannot find out what changed in the version they are about to install without leaving for GitHub, and a returning user of 0.1.4 cannot see what they gain by updating.
- **The release routine is three numbers.** The documented website release procedure already says "refresh the What's New texts", but nothing enforces or supports it, so in eight consecutive releases it did not happen. The texts live as four fixed slots (`entry1`-`entry4`) in two language catalogs - a structure that invites leaving them alone.

### What makes the solution feasible

- **The application repository already keeps a disciplined, user-facing `CHANGELOG.md`** - every version has a date, a build number, a one-paragraph summary written for users, and Added / Changed / Fixed / Removed entries with bold one-line headlines. The winget publishing script already extracts release date and release notes from it. It is the natural single source for website release content; the website needs a *curated, bilingual digest* of it, not a copy.
- **Repeatable screenshots are achievable with what the application already offers - but not the way first assumed.** Everything a scene needs is ordinary stored configuration: theme, UI language, window rectangle, panel directories, the set of open tabs, the splash screen; and start-up options set the left, right and active panel directories. *Correction from the plan phase (2026-09-20):* the pre-spec reading of the `-C <file>` start-up option was wrong. It does not run the program on a separate configuration - it **imports that file into the user's one and only configuration store and overwrites it**, and the program has no portable mode or alternative store. Running staged scenes under the author's own Windows account would therefore destroy or expose the author's settings. Isolation has to come from outside the program: a disposable, clean Windows environment in which the officially published installer is installed for the run (see [research.md](research.md) R1). A small neutral demo workspace (Contracts, Invoices, Reports, …) already exists from the first screenshots, and the application repository has a fixture script that creates Unicode and long-path test data.
- **Some scenes cannot be fully scripted** - a live SFTP session needs a server, cloud sync badges need a real cloud-synced folder, overlay badges need a versioned working copy. The method must allow hand-staged scenes beside automated ones rather than pretend everything is automatable.
- **The website already has the right building blocks**: one shared-values file, per-language text catalogs with build-time parity checks, a lightbox for enlarging screenshots, and a build that fails on inconsistent data. This feature extends those patterns instead of introducing new ones.

## Clarifications

### Session 2026-09-20

- Q: Who prepares the proposed bilingual digest (summary and highlights in EN and CS) from the application changelog at each release? → A: An AI assistant proposes, a script guards. The release procedure is an assistant-driven command kept in the website repository: it reads the changelog section, drafts the digest in both languages, and the author approves or rewrites it. The factual and checking parts (version, date, installer size, build gate, stale-screenshot report) are plain scripted steps that work without the assistant. Pure script extraction was rejected because bold changelog headlines make poor visitor-facing highlights and leave all Czech text to hand work; keeping the digest in the application repository was rejected because it changes the application's release process.
- Q: Where does the feature gallery live - a home-page section, its own page, or both? → A: Both, from one catalog. The home page shows a featured selection of 4-6 items in the place of the current themes section, with a link to the full gallery; a dedicated gallery page per language shows every item. Scenes carry a "featured" flag. Home-page-only was rejected because 10-14 images make the single page long and heavy and leave the gallery no room to grow; dedicated-page-only was rejected because most visitors would never see it.
- Q: In which application UI language are screenshots captured, and which site languages show them? → A: English UI only, shown on every site language. One image set per scene and theme; titles, captions and text alternatives carry the localization. Capturing featured or all scenes with the Czech UI as well was rejected to keep the image set and the capture run at their smallest.
- Plan-phase amendment to the next answer (2026-09-20): "installed" means *installed from the officially published installer inside the disposable capture environment*, because research showed the program cannot be isolated from the author's settings on the author's own account. The guarantee chosen below - images show exactly what a visitor downloads, never a development build, and only after the release is published - is unchanged. Only hand-staged scenes that need the author's real accounts (cloud sync, version-control badges) are captured from the installation on the author's machine. FR-026a, FR-026b and FR-027 were reworded accordingly.
- Q: From which form of the application are screenshots captured - the installed released version, a local release build, or either? → A: Only the installed, released version. Every published image is guaranteed to show exactly what a visitor downloads, and the procedure needs no application source tree or build. The accepted cost: images of a new version can be captured only after it has been released and installed, so re-capture is a step *after* the application release and before (or shortly after) the website release. Capturing from a local build was rejected because images could then show something that never shipped.
- Q: What does the home page "What's new" section show when releases differ so much in size? → A: The current release on top, topped up from earlier ones. The section opens with the current version's number, date and one-sentence summary - always, even for a fix-only release - followed by six cards in total: the current version's highlights first, the remaining places filled with the most recent highlights of earlier versions; every card carries its version label. Current-release-only was rejected because a fix release would leave the section nearly empty; a plain "latest six across versions" was rejected because a fix release's summary would never reach the home page; hand-picked highlights were rejected as one more step to forget.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor sees what Tandem Commander is today (Priority: P1)

A power user hears about Tandem Commander and opens the website. Within the first screen or two they learn not only that it is a two-pane file manager born from Open Salamander, but what it offers *now*: panel tabs, a syntax-highlighting Code Viewer, a Markdown viewer, SFTP, a configurable command shell, cloud sync badges, light and dark themes, installation through winget. The "What's new" section talks about the version they are about to download, and nothing on the page - text or image - still presents 0.1.0 as current.

**Why this priority**: This is the core of the request and the only part with an immediate cost of delay: every visitor today is shown a program that is eight releases behind the one they download. It can ship on its own, with hand-written texts, before any release process or gallery exists.

**Independent Test**: Read the English and Czech pages and the PAD file against the 0.1.8 changelog: every headline capability listed in the research table is mentioned on the page, "What's new" names 0.1.8's changes, the download section offers winget, and no text or catalog field presents the 0.1.0 feature list as the current release's changes.

**Acceptance Scenarios**:

1. **Given** the published home page, **When** a visitor reads the "What's new" section, **Then** it opens with the current version's number, release date and one-sentence summary, followed by six highlight cards - the current version's highlights first (for 0.1.8: panel tabs leading), the rest filled from the preceding versions, newest first - each labelled with the version that delivered it.
2. **Given** the published home page, **When** a visitor reads the hero and feature descriptions, **Then** the capabilities added since 0.1.0 that define the product today (tabs, Code Viewer, configurable command shell, cloud sync badges, winget installation, Altap Salamander settings migration) are each mentioned at least once.
3. **Given** the download section, **When** a visitor looks for ways to install, **Then** the installer download remains the primary action and the winget command is offered as an alternative that can be copied, and the disclaimer no longer calls the program "a first release".
4. **Given** the PAD file, **When** a catalog reads its change-info, descriptions and keywords, **Then** they describe the current release and the current feature set in both English and Czech-facing texts, within the format's length limits.
5. **Given** either language version, **When** the page is compared with the other, **Then** both carry the same content - no entry, section or caption exists in only one language.

---

### User Story 2 - The author publishes a release and the website follows (Priority: P1)

The author has just published version 0.1.9 on GitHub. They run one guided website release procedure. It picks up the new version's facts (version, date, installer size), reads that version's section of the application changelog, and proposes a short bilingual digest: a one-sentence summary and a handful of highlights. The author edits or accepts it, is told which screenshots may be outdated, previews the site, and publishes. If they try to skip the digest - bumping only the version number, as happened for eight releases - the site refuses to build.

**Why this priority**: Without this, Story 1 decays with the very next release and the site is back where it is today. The content catch-up and the mechanism that keeps it current are two halves of one deliverable.

**Independent Test**: Simulate a release: change the site's current version to one that has no release record - the build must fail with a message naming what is missing. Add a release record with highlights in both languages - the build passes, the home page's "What's new", the release history and the PAD change-info all show the new content without any other hand edit.

**Acceptance Scenarios**:

1. **Given** the site's current version is set to a version with no release record, **When** the site is built, **Then** the build fails and the message names the version and the missing record.
2. **Given** a release record whose highlights exist in only one language, or whose date disagrees with the site's release date, **When** the site is built, **Then** the build fails and names the inconsistency.
3. **Given** a complete release record for the new version, **When** the site is built, **Then** the home page "What's new" section, the release history and the PAD change-info are all derived from it - the author edits release content in exactly one place.
4. **Given** the application changelog contains a section for the new version, **When** the author runs the release procedure, **Then** they receive a proposed summary and highlights in English and Czech drawn from that section, which they can accept or rewrite before anything is published.
5. **Given** a release that changes nothing a visitor cares about (an installer-only fix such as 0.1.7), **When** its record contains only a one-sentence summary and no highlights, **Then** the record is valid, the release appears in the history, and the home page "What's new" shows that release's summary on top with all six cards filled from earlier releases rather than an empty or trivial section.
6. **Given** the release procedure has finished, **When** the author reads its closing report, **Then** it lists the gallery images captured with an older version, so the author can decide which to re-capture, and reminds them of the steps that remain manual (preview, publish).

---

### User Story 3 - A visitor tours the program through a feature gallery (Priority: P2)

A visitor who wants to see the program before installing it scrolls to the gallery section of the home page. Instead of two near-identical window shots they find a handful of featured, captioned images and a link to the full gallery page, where the whole set awaits, each showing one capability in use: two panels with tabs, the dark theme, the Code Viewer on a source file, a rendered Markdown document, a Linux server in one panel over SFTP, a folder of Unicode names, a thumbnail view of photos, cloud sync badges, an archive browsed like a folder, the file comparator, batch rename, the disk-usage map. They click any image to enlarge it and step to the next and previous image without closing the enlarged view.

**Why this priority**: A gallery is the most persuasive content the site can carry for this audience, and it is the vehicle for communicating features that four text cards cannot. It depends on Story 4 for its images but is independently valuable the moment a first set of images exists.

**Independent Test**: Open the home-page gallery section and the full gallery page on a desktop and a phone in both languages: the home page shows only the featured items and links to the full gallery; every gallery item shows an image, a title and a one-sentence caption in the page's language; every image enlarges; next/previous and Escape work with keyboard and touch; the page remains readable and the images visible with scripting disabled.

**Acceptance Scenarios**:

1. **Given** the home page, **When** a visitor reaches the gallery section, **Then** they see the four to six featured items - the main window with tabs first - and a link to the full gallery; **and given** the full gallery page, **Then** they see every item, at least ten, in catalog order. On both, each item has an image, a short title naming the capability and a one-sentence caption, in the language of the page.
2. **Given** the gallery, **When** the visitor activates an image by mouse, touch or keyboard, **Then** it opens enlarged with its caption, and the visitor can move to the next and previous item and close the view without losing their place on the page.
3. **Given** the current site theme is light or dark, **When** a gallery item exists in both application themes, **Then** the visitor sees the variant matching the site theme and can still view the other.
4. **Given** a slow connection or a small screen, **When** the page loads, **Then** the text and the first screenful are usable before the gallery's images have arrived, and images outside the visible area do not delay them.
5. **Given** a "What's new" entry or release-history highlight that has a matching gallery item, **When** the visitor follows it, **Then** they land on that item on the full gallery page, whether or not it is featured on the home page.
6. **Given** a catalog or an old link requests the screenshot address published in the PAD file, **When** it is fetched, **Then** it still resolves to a current main-window screenshot.

---

### User Story 4 - The author regenerates the screenshots on demand (Priority: P2)

A feature release is out, and the author wants fresh images for the website. They run the screenshot procedure. It fetches the published installer, installs it in a disposable clean environment, prepares a neutral demo workspace there, starts the released Tandem Commander in a clean, dedicated configuration - never the author's own - and produces every automatable scene in both themes at a fixed size, named and placed where the website expects them. For the few scenes that need a real server or a real cloud folder, the procedure gives written staging steps and captures the window once the author says the scene is ready. Two runs on the same installed version produce the same pictures.

**Why this priority**: This is what makes the gallery sustainable. Hand-made screenshots are why the site still shows 0.1.0: they are tedious, inconsistent in size and content, and easy to postpone. It ranks below Story 3 only because a first gallery could be assembled by hand once.

**Independent Test**: On the author's machine, with the current version published, run the procedure twice: both runs complete without touching the author's personal program settings, produce the full set of automated scenes in light and dark with identical dimensions, and the two runs' images are visually identical apart from content that legitimately varies (none should). Inspect every image for personal data.

**Acceptance Scenarios**:

1. **Given** the published release and the website repository, **When** the author runs the screenshot procedure, **Then** every scene marked automated is produced in each theme it is defined for, with the same window size and scaling, without any manual interaction.
2. **Given** the author's own Tandem Commander settings (hot paths, FTP/SFTP bookmarks, tabs, history, window layout), **When** the procedure runs, **Then** none of them is read, shown in any image, or modified.
3. **Given** any produced image, **When** it is inspected, **Then** it contains no personal data - no user-profile names in paths, no private drive labels, network locations, bookmarks, host names, or file names from outside the demo workspace.
4. **Given** a scene marked manual, **When** the procedure reaches it, **Then** it shows the written staging steps, waits for the author, and captures the same window at the same size as the automated scenes; the author can skip it and keep the existing image.
5. **Given** a new capability ships, **When** the author adds a scene description for it (what to show, in which state, with which caption in both languages), **Then** the next run produces its image and the gallery gains the item, with no other change to the site.
6. **Given** a finished run, **When** the author reads the summary, **Then** each image is recorded with the application version it was captured with, and scenes that failed or were skipped are listed.

---

### User Story 5 - A returning user reads the release history (Priority: P3)

A user running 0.1.4 sees that 0.1.8 is out. On the website they open the release history and scan, newest first, what each version since theirs brought: a date, a one-sentence summary, the highlights, and a link to the complete notes on GitHub. In two minutes they know whether to update.

**Why this priority**: Valuable and cheap once release records exist (Story 2), but the home page and gallery reach far more visitors. The history must be backfilled for 0.1.0 - 0.1.8 so it is complete from its first day.

**Independent Test**: Open the release history in both languages: all nine versions from 0.1.8 down to 0.1.0 appear in order with date, summary and a working link to that version's full notes; the current version is marked as such.

**Acceptance Scenarios**:

1. **Given** the release history, **When** a visitor reads it, **Then** every published version from 0.1.0 onwards appears once, newest first, with its release date formatted for the page language, its kind (feature / bug-fix / installer), a one-sentence summary and its highlights.
2. **Given** any listed version, **When** the visitor follows its "full notes" link, **Then** they reach that version's complete release notes on GitHub.
3. **Given** the home page "What's new" section, **When** the visitor wants more, **Then** a link takes them to the release history, and the history links back to the download.

---

### Edge Cases

- **A release with nothing to show** (installer-only, internal hardening): the record is valid with a summary alone; the home page shows its summary line above six cards from earlier releases - never an empty or one-line "What's new".
- **A release with more than six highlights**: the home page shows its first six; the rest are visible in the release history. The record's order decides which.
- **Two releases on the same day** (0.1.6 and 0.1.7 were both published 2026-08-29): ordering follows the version number, not the date.
- **The author bumps the version but the GitHub release asset is not uploaded yet**: the release procedure reports that the installer size cannot be determined and stops before changing anything, rather than recording a guess.
- **The application changelog has no section for the version**, or the section is still headed "Unreleased": the procedure says so and lets the author write the digest by hand; the build gate still applies.
- **A highlight links to a gallery item that was later removed or renamed**: the build fails rather than publishing a dead in-page link.
- **A gallery item defined for both themes has only one image**: the build fails and names the missing file; an item defined for a single theme is shown for both site themes.
- **A scene cannot be staged on this machine** (no SFTP server reachable, no cloud-synced folder): the scene is skipped with a notice, the previous image stays, and the run still succeeds.
- **The captured version is behind the site** (an older installer was requested, or a hand-staged scene uses an installation on the author's machine that was not upgraded): the screenshot procedure refuses to capture rather than publish images of an older version under a newer label.
- **The author's own instance is running during capture**: the run is unaffected and does not disturb it.
- **The capture environment differs from last time** (different display scaling, a different Windows accent colour or title-bar style): the procedure fixes what it can control (window size, scaling-independent output size, application theme) and reports the conditions it recorded, so differences are explainable.
- **Images that show the version number** (the main window's title bar): they go stale at every release. Scenes either avoid showing the version or are part of the set the release procedure always flags for re-capture.
- **The visitor has scripting disabled or uses a screen reader**: all gallery images and captions are present in the page itself, every image has a meaningful text alternative in the page language, and the enlarged view is operable and announced correctly.
- **A very narrow screen**: gallery items stack in a single column; the enlarged view fits the screen and remains dismissible.
- **The PAD screenshot address**: catalogs have stored it. Re-organising image files for the gallery must not break it.
- **Growth**: after twenty releases the history is long and the gallery may hold thirty scenes. The home page shows only a bounded number of highlights and of featured gallery items; the history and full gallery pages stay complete.

## Requirements *(mandatory)*

### Functional Requirements

#### Content catch-up

- **FR-001**: The home page MUST present Tandem Commander as of its current version: the hero, feature descriptions, page metadata and social-preview texts MUST mention the capabilities delivered since 0.1.0 that define the product today - at minimum panel tabs, the Code Viewer, the configurable command shell, cloud sync-status badges, winget installation and the Altap Salamander settings migration - alongside the 0.1.0 foundations (Unicode, long paths, SFTP, Markdown viewer, themes).
- **FR-002**: The "What's new" section MUST open with the current version's number, release date and one-sentence summary, and below it show highlight cards composed as defined in FR-010, each labelled with the version that delivered it. Its heading and lead MUST NOT claim that all cards belong to the current release.
- **FR-003**: The download section MUST offer installation through winget as a secondary option with a command the visitor can copy, keeping the installer download as the primary action, and its disclaimer MUST no longer describe the program as a first release while keeping the no-warranty and agentic-development statements. *Implementation note (2026-09-20):* the package `PavelStupka.TandemCommander` is **not yet in the winget catalogue** (verified with `winget search` and against `microsoft/winget-pkgs`), so the winget option is built but rendered only while the shared site values mark it as available; until then the site describes winget as "on its way" rather than offering a command that fails.
- **FR-004**: The PAD file's change-info, descriptions (all length tiers) and keywords MUST reflect the current release and feature set, within the format's existing length limits and validation rules.
- **FR-005**: Every text added or changed by this feature MUST exist in English and Czech, under the site's existing rule that a build with a missing or empty translation fails.

#### Release records and the release procedure

- **FR-006**: The site MUST keep one release record per published application version, holding: version, release date, kind (feature, bug-fix, installer/maintenance), a one-sentence summary, zero or more highlights (each a short title and a one-to-two-sentence text), and for each highlight an optional reference to a gallery item. All texts MUST exist in every site language.
- **FR-007**: Release records MUST be the single source for the home page "What's new" section, the release history and the PAD change-info; no release text may be maintained in a second place.
- **FR-008**: Release records MUST be backfilled for all nine versions 0.1.0 - 0.1.8, digested from the application changelog.
- **FR-009**: The build MUST fail, with a message naming the problem, when: the site's current version has no release record; the current version's record date differs from the site's release date; a record lacks a text in any site language; a highlight references a gallery item that does not exist; two records share a version.
- **FR-010**: The home page "What's new" section MUST show exactly six highlight cards (fewer only while fewer than six highlights exist in all records together), selected automatically: all highlights of the current version in their recorded order, up to six; then, if places remain, the highlights of the preceding versions, newest version first, each version's highlights in their recorded order, until six are shown. A release without highlights therefore contributes only its summary line, and the cards come from its predecessors. No per-highlight "show on home page" marking exists; the order of highlights within a record is the author's only lever.
- **FR-011**: There MUST be one documented, guided release procedure for the website that, for a given new version: (a) obtains version, release date and exact installer size from the published release; (b) reads that version's section of the application changelog and proposes a summary and highlights in all site languages; (c) lets the author accept or rewrite the proposal before anything is recorded; (d) updates the shared version values and adds the release record; (e) builds the site and reports the result; (f) lists gallery images captured with an older application version, marking those whose subject the release touched; (g) ends with the remaining manual steps. It MUST NOT publish the site on its own.
- **FR-011a**: The release procedure MUST be split into two layers. Steps (a), (d), (e) and (f) - establishing the release facts, recording them, building, and reporting stale images - MUST be deterministic scripted steps that run and give the same result without any AI assistant. Steps (b) and (c) - drafting the digest and its translation - are performed by an AI coding assistant following instructions kept in the website repository; the assistant's output is only ever a proposal, written into the release record after the author's explicit approval. When no assistant is available, the scripted layer MUST create the release record with empty texts for the author to fill in, and the FR-009 checks decide whether the result may be built.
- **FR-012**: The release procedure MUST stop without changing anything when the release's facts cannot be established (release not published, installer asset missing, changelog section absent) and say which fact is missing; the author MUST still be able to complete a release entirely by hand, subject to the FR-009 checks.
- **FR-013**: The website's written release instructions MUST be replaced with the new procedure, including what to do for a release with no visitor-facing changes.

#### Release history

- **FR-014**: The site MUST provide a release history in every site language listing all release records newest first (ordered by version), each with localized date, kind, summary, highlights, and a link to that version's full release notes on GitHub; the current version MUST be visibly marked.
- **FR-015**: The home page "What's new" section MUST link to the release history; the release history MUST link to the download. Every page this feature adds (release history, full gallery) MUST exist in every site language, keep the site's header, footer, theme and language switching, and appear in the site's navigation aids for search engines (sitemap, language alternates) like the existing pages; the language switcher MUST lead to the same page in the other language, not to the home page.

#### Gallery

- **FR-016a**: Each item MUST put its **title and caption above the picture**, visually separated from it, and MUST centre the picture within a frame of uniform height, so a row of cards lines up whatever the shape of the window inside it. Captions MUST NOT state which version introduced a capability - a visitor installs the current one (author's decision, 2026-09-20).
- **FR-016**: The gallery MUST live **entirely on the home page**, in the place of the former two-image themes section and keeping its message (light by default, dark available): every published scene, in catalog order, starting with the main window. There is no separate gallery page and no featured subset (author's decision, 2026-09-20). Each item has an image, a title naming the capability and a one-sentence caption, in the page language.
- **FR-017**: The gallery MUST show **only what Tandem Commander added to the Open Salamander it grew out of** - a picture of a capability the program has always had tells a visitor nothing about this project (author's decision, 2026-09-20). It MUST cover, each as its own item: the main window with panel tabs; the dark theme; panel tabs in use; the Code Viewer; the Markdown viewer; Unicode and long-path names; the faster, correctly rotated thumbnails; the configurable command shell; SFTP in a panel; and cloud sync-status badges. Items whose scene cannot yet be staged MAY be deferred, but at least seven items MUST ship. Capabilities inherited from Open Salamander - the file comparator, batch rename, the disk-usage map, browsing archives as folders - MUST NOT appear.
- **FR-018**: Every gallery image MUST be enlargeable in a viewer that shows the item's title and caption, steps to the next and previous item, offers full screen (with the title and caption still visible there), and is fully operable by keyboard, pointer and touch. The viewer MUST be **PhotoSwipe**, self-hosted with the rest of the site's assets (author's decision, 2026-09-20); it replaces the hand-written enlarged-screenshot view of feature 002. An enlarged picture MUST never be displayed smaller than the card it was opened from.
- **FR-019**: For items available in both application themes, the gallery MUST show the variant matching the site's current theme and follow a theme switch without a page reload; the opposite variant MUST remain reachable for the main-window item so the light/dark comparison is preserved.
- **FR-020**: Gallery images MUST NOT delay the initial display of the page: only images in or near the visible area may load up front, each image MUST reserve its space so the page does not jump as images arrive, and the gallery MUST serve appropriately sized images to small screens.
- **FR-021**: The gallery MUST remain complete and readable with scripting disabled, and every image MUST carry a text alternative in the page language that describes what the scene demonstrates.
- **FR-022**: Each gallery item MUST have a stable address on the home page (`/#<scene-id>`) so that highlights (FR-006) and external links can point at it. Following such a link MUST bring the item into view.
- **FR-023**: The screenshot address published in the PAD file MUST keep resolving to a current light-theme main-window screenshot.
- **FR-024**: The social-preview image MUST be refreshed so that it does not depict a superseded version of the program.

#### Screenshot production

- **FR-025**: The site MUST keep a catalog of screenshot scenes. Each scene describes: the capability it demonstrates, the program state to show (panel locations, open tabs, the window or dialog in front, what is focused or selected), the themes it is captured in, whether it is automated or manual, whether it is featured on the home page, its position in the gallery order, and its title, caption and text alternative in every site language. The gallery MUST be generated from this catalog.
- **FR-026**: There MUST be a screenshot procedure that, using the installed released application, produces every automated scene without manual interaction, in each theme the scene defines, at one fixed window size and one fixed output size, and stores the images under predictable names where the site expects them.
- **FR-026a**: The procedure MUST capture only the released application installed from its officially published installer - never a development build. Automated scenes and hand-staged scenes that need no personal account run in a disposable, clean environment into which the procedure installs that installer, after verifying that it is the published file (size and publisher signature). Before capturing, the procedure MUST read the installed program's version and MUST stop, naming both versions, when it is older than the site's current version; a newer version is allowed (images are prepared before the website release). When the release or its installer is not published yet, it MUST say so and stop.
- **FR-026b**: The procedure MUST NOT disturb the author's everyday instance of the program or its settings, whether or not that instance is running during the run.
- **FR-027**: The procedure MUST run the application in a dedicated, clean configuration created for the run and MUST NOT read, display or modify the author's own application settings, history, bookmarks or tabs. The single exception is a scene marked as staged on the author's machine (it needs the author's real cloud or version-control setup): there the procedure only resizes and captures the window the author has staged, changes no setting, and its staging steps MUST include a personal-data review before the image is accepted.
- **FR-028**: The procedure MUST create the demo content it needs - a neutral workspace of plausible folders and documents, source files in several languages, Markdown documents, a set of freely licensed photos, archives, Unicode and long-path names, a pair of files that differ - at a neutral location, so that no image reveals a user-profile name, private folder, private drive label, network location or host name. The demo content MUST be reproducible from the repository, and any third-party material in it MUST be freely redistributable with its licence recorded.
- **FR-029**: For scenes marked manual, the procedure MUST present the scene's written staging steps, wait for the author's confirmation, then capture with the same framing as automated scenes; skipping a manual scene MUST keep its existing image and MUST NOT fail the run.
- **FR-030**: Every produced image MUST be recorded with the application version and build number read from the installed program, and the capture date; this record is what the release procedure (FR-011 f) reports from.
- **FR-031**: Images MUST be captured with the application's English user interface, forced by the procedure regardless of the language of Windows or of the author's own installation, and the same image set MUST be used for all site languages; titles, captions and text alternatives carry the localization. No per-language image variants exist.
- **FR-032**: Images MUST be stored in a form that keeps interface text crisp when enlarged while keeping each image's download size reasonable for the web (see SC-006).
- **FR-033**: The procedure and the scene catalog format MUST be documented in the website repository well enough that adding a scene or re-running the capture needs no knowledge beyond that document.

### Key Entities

- **Release record**: One published application version as the website presents it - version, date, kind, one-sentence summary, ordered highlights; all texts per site language. Source of "What's new", the release history and the PAD change-info.
- **Highlight**: One visitor-relevant change within a release - short title, short text, optional link to a gallery item. Belongs to exactly one release record.
- **Scene**: The definition of one screenshot - the capability it demonstrates, the program state to stage, themes, automated or manual (with staging steps), title, caption and text alternative per site language, display order, the featured flag that puts it on the home page, and whether it is a main-window scene whose version display goes stale.
- **Gallery item**: A scene as it appears on the site - its produced image(s) per theme, the capture record (application version, date), and its stable address on the full gallery page.
- **Demo workspace**: The reproducible, neutral set of folders and files that scenes are staged in, with the licence record of any third-party content.
- **Shared site values**: The existing single source of current version, release date and installer size, which the current release record must agree with.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature ships, a reader comparing the site with the application changelog finds every headline capability of 0.1.1 - 0.1.8 listed in the research table mentioned on the site, and finds no text, catalog field or image that presents 0.1.0 as the current state. (Today: 1 of 7 post-0.1.0 headlines appears.)
- **SC-002**: For a routine release, the author takes the website from "release published on GitHub" to "ready to publish, previewed" in under 15 minutes of their own time, of which writing or approving the digest is the only creative step.
- **SC-003**: It is impossible to publish the site with a current version that lacks release content: 100 % of attempts to build with a missing, untranslated or date-inconsistent current release record fail with a message that names the fix.
- **SC-004**: The full gallery launches with at least 10 items covering at least 10 distinct capabilities, the home page features 4-6 of them, and every "What's new" highlight that describes something visible has a gallery item to point to.
- **SC-005**: A full run of the automated scenes completes in under 10 minutes without the author touching the keyboard, and two consecutive runs on the same installed version yield images with identical dimensions and no visible differences.
- **SC-006**: Adding the gallery does not make the page feel slower: on a typical broadband connection the home page's first screen is readable within 2 seconds, the images needed for that first screen weigh no more than today's two screenshots together (about 130 KB), no single gallery image exceeds 300 KB, and the home page's total image weight stays under 1 MB however large the full gallery grows.
- **SC-007**: A review of every published image finds zero items of personal data (profile names, private paths, drive labels, bookmarks, host names).
- **SC-008**: Adding a new automated scene - from writing its description to seeing it in the locally built gallery in both languages - takes under 30 minutes and touches no page template.
- **SC-009**: English and Czech pages have complete parity: the same sections, release records, highlights and gallery items, verified by the build.
- **SC-010**: The release history lists all nine versions 0.1.0 - 0.1.8 on its first day, and each entry's link reaches the correct full release notes.

## Assumptions

- **The application changelog is the source of truth; the website carries a digest.** The site does not reproduce full release notes - it summarizes what a visitor cares about and links to GitHub for the rest. Fix-by-fix detail (dozens of encoding fixes in 0.1.4/0.1.5) is condensed into one or two highlights per release.
- **Release records live in the website repository** and are written in English and Czech by the author with drafting help; the application repository is read, never written, by this feature. Both repositories are available side by side on the author's machine (`E:\Projects\tandemcommander` next to the website), and the procedures may rely on that.
- **Digest drafting is assisted, approval is human.** Turning a changelog section into visitor-facing highlights in two languages is editorial work; an AI coding assistant, working from instructions committed in the website repository, proposes, and the author decides. Everything factual or checkable is scripted and does not depend on the assistant (FR-011a). A fully unattended website release on every GitHub release is out of scope - publishing stays a deliberate manual step, consistent with the current deploy-on-push arrangement.
- **The release history is a separate page per language** (home page stays an overview with a bounded "What's new"). With the full gallery page (see Clarifications) the site grows from one page to three per language; the home page remains the entry point and the only page in the header's section navigation, with the new pages reached through links from their home-page sections and the footer.
- **Screenshots are captured on the author's Windows 11 Pro machine, inside a disposable clean Windows environment provided by the operating system, from the officially published installer** (see Clarifications and its plan-phase amendment). Enabling that operating-system feature is a one-time prerequisite for the author. The order at a feature release is therefore: publish the application release → re-capture (the procedure fetches and installs the published installer itself) → run the website release procedure. A website release may go out with older images when re-capture is postponed; the release procedure's stale-image report (FR-011 f) keeps that visible. Capturing in a hosted build environment is out of scope.
- **Screenshots use the English UI for both site languages** (confirmed in Clarifications). The scene catalog therefore has no language dimension for images - only scene × theme. Should localized screenshots ever be wanted, that is a follow-up feature.
- **Not every scene is automatable, and that is acceptable.** SFTP (needs a server), cloud sync badges (need a real synced folder) and version-control badges (need a third-party shell extension) are expected to be manual scenes; the main window, tabs, viewers, archives, comparator, rename, disk map, thumbnails and configuration pages are expected to be automated.
- **No application changes are required.** Scenes are staged through the program's ordinary stored configuration and start-up options inside a disposable environment (see the corrected research finding). A start-up option that selects a separate configuration store would make capture simpler and is worth proposing to the application project, but this feature does not depend on it. If the plan phase finds a scene that cannot be staged without an application change, that scene becomes manual rather than blocking this feature.
- **Video, animated captures and interactive demos are out of scope**; the gallery is still images with captions.
- **The memory note that final screenshots will be supplied by the author is superseded by this feature**: the screenshot procedure becomes the way final screenshots are produced, and the still-open catalog submission from feature 005 (slunecnice.cz) can proceed once the first set is published.
- **Work happens on branch `007-release-news-gallery`**, cut from `devel`; nothing is merged or deployed by this feature's specification step.
