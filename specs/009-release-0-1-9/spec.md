# Feature Specification: Website Release for Tandem Commander 0.1.9

**Feature Branch**: `009-release-0-1-9`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Priprav vse pro vydani verze 0.1.9 dle kontextu."

## Context

Tandem Commander 0.1.9 (build 193) was published on 2026-10-07 with its installer
(`tandemcommander-0.1.9-x64-setup.exe`, 8,013,936 bytes) and a dated changelog section. The website
still presents 0.1.8 as the current version. This feature brings 0.1.9 onto the website through the
release procedure established by feature 007: the site's version facts, a bilingual release digest,
and a regenerated, checked site that the author can preview and publish.

0.1.9 is a feature release with an unusually long changelog (about 940 lines): a new-version check,
built-in RAR support on an updated 7-Zip engine, working external archivers, and a long series of
fixes for silent data loss around archives, for text and passwords in any script, for very long
paths and for PictView. The digest has to reduce this to what a visitor deciding to install or
update needs to know.

### State of the working tree when this specification was written

- The site's version facts already read 0.1.9 (version, release date 2026-10-07, installer size).
- A release record for 0.1.9 exists as an empty skeleton (no summary, no highlights).
- The generated site is incomplete: both home pages, both release-history pages, the PAD file and
  the sitemap are missing, most likely because a build stopped on the empty record.
- The digest (below) was presented to the author on 2026-10-07 and approved in full the same day;
  it is not yet written into the record.

### Digest (approved by the author on 2026-10-07)

**Kind**: feature

**Summary**

- EN: The program tells you when a newer version is out, RAR archives open without installing
  anything, and a long series of fixes ends silent data loss around archives.
- CS: Program nově upozorní na novější verzi, archivy RAR otevře bez instalace čehokoli dalšího a
  dlouhá řada oprav ukončuje tiché ztráty dat při práci s archivy.

**Highlights** (in home-page order)

| # | Id | Title EN | Title CS | What it tells the visitor |
|---|----|----------|----------|---------------------------|
| 1 | `update-check` | New version check | Kontrola nové verze | About once a day at start-up the program asks GitHub for the latest release; sends nothing about the user, downloads nothing, one option turns it off |
| 2 | `rar-built-in` | RAR archives built in | Archivy RAR bez dalšího programu | RAR including RAR5 opens like a folder, encrypted and split archives too; creating RAR remains WinRAR's job |
| 3 | `archive-edits-kept` | Edits inside archives are kept | Úpravy v archivech se neztrácejí | A file edited in an archive is packed back even with an accented name; further fixes end silent data loss when adding or moving into archives |
| 4 | `any-script-text` | Names and passwords in any script | Názvy a hesla v libovolném písmu | Cyrillic, Chinese or emoji stay as typed in Find Files, Configuration and the command line; archive and FTP passwords and plugins work with them |
| 5 | `pictview-save-as` | PictView saves again | PictView zase ukládá | Save As works again and never loses the file it replaces; the shown picture can be renamed and deleted |
| 6 | `no-password-in-history` | No passwords in history | Hesla už nejsou v historii | A password typed inside an address is no longer saved in history (until now plain text in the registry); a Markdown document can no longer open a web page by itself |

The full texts in both languages are in [contracts/digest-0.1.9.md](contracts/digest-0.1.9.md)
and are recorded exactly as written there.

**Deliberately left out**: working external archivers and the removal of MS-DOS archivers, the 7-Zip engine update and its security fixes, archives opening at
very long paths, updates
with viewer windows open, the many single fixes covered by highlights 3 to 5, and everything
addressed to plugin authors.

## Clarifications

### Session 2026-10-07

- Q: Should the screenshots that display the version number in a title bar be re-captured as part of this release? → A: Yes - re-capture only the pictures that display the version number; the release is not done until they show 0.1.9. Other pictures stay.
- Q: Should new gallery pictures be created for the 0.1.9 news (the new-version window, a RAR archive open in a panel)? → A: No new pictures in this release; both stay noted as candidates for later.
- Q: Should the permanent texts outside the news section (home-page description, feature cards, catalogue descriptions) be updated to mention built-in RAR? → A: No - they stay unchanged; the 0.1.9 news reaches the visitor through the release digest only.
- Q: Which change gets the sixth and last highlight of 0.1.9? → A: The privacy fixes (`no-password-in-history`): a password typed inside an address is no longer kept in history, and a Markdown document can no longer open a web page by itself. Archives in deep folders and the working external archivers stay out of the digest.
- Q: Is the wording of the digest approved as presented on 2026-10-07, including the four uncertain Czech wordings? → A: Yes, approved without changes (summary and highlights 1 to 5). The sixth highlight was replaced after that draft, so its new text alone still needs the author's approval.
- Q: Is the new text of the sixth highlight (`no-password-in-history`) approved? → A: Yes - everything is approved; the whole digest may be recorded as written in the contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor sees 0.1.9 as the current version (Priority: P1)

A visitor opening the website in English or Czech sees that the current version is 0.1.9, released
on 2026-10-07, with the correct installer size, and the download leads to the 0.1.9 installer.
Machine-readable descriptions of the program (the catalogue file and the sitemap) say the same.

**Why this priority**: A website that offers an older version than the one published is the one
thing a release must not leave behind. Everything else is editorial.

**Independent Test**: Open both home pages and the catalogue file after the site is regenerated and
compare version, date, size and download target with the published release.

**Acceptance Scenarios**:

1. **Given** the regenerated site, **When** a visitor opens the English or the Czech home page,
   **Then** the version shown is 0.1.9, the release date 2026-10-07 in that language's format, and
   the installer size matches 8,013,936 bytes.
2. **Given** the regenerated site, **When** the visitor follows the download, **Then** it leads to
   the 0.1.9 installer and to no earlier version.
3. **Given** the regenerated site, **When** a software catalogue reads the program's description
   file, **Then** it reports version 0.1.9, the same date and size, and the 0.1.9 highlight titles
   as the change information.

---

### User Story 2 - A visitor learns what 0.1.9 brings (Priority: P1)

A visitor deciding whether to install or update reads, in their language, one sentence summarising
0.1.9 and up to six short cards about its main changes, on the home page and in the release
history. The text states only what the changelog states.

**Why this priority**: The release digest is the reason the release procedure exists; without it
the build is rejected and nothing can be published.

**Independent Test**: Read the 0.1.9 entry in the release history and the home-page cards in both
languages and trace every claim to the changelog section of 0.1.9.

**Acceptance Scenarios**:

1. **Given** the approved digest is recorded, **When** a visitor opens the release history,
   **Then** 0.1.9 is the first entry, marked as a feature release, with its summary and highlights
   in the page's language.
2. **Given** the approved digest is recorded, **When** a visitor opens the home page, **Then** the
   news cards start with the 0.1.9 highlights in the approved order.
3. **Given** any sentence of the 0.1.9 digest, **When** it is compared with the changelog,
   **Then** the fact is found there and nothing is promised that the changelog makes conditional.
4. **Given** the Czech and the English digest, **When** they are compared, **Then** they carry the
   same facts in the same order.

---

### User Story 3 - The author approves the digest before anything is recorded (Priority: P1)

The author reads the complete draft in both languages, together with what was left out and why and
the open questions about Czech wording, and accepts it, asks for edits, or asks for a rewrite.
Nothing of the draft reaches the website's sources before that.

**Why this priority**: The digest is published under the author's name; the Czech text is reviewed
by the author personally.

**Independent Test**: Verify that the release record still has an empty summary and no highlights
until the author's approval is given, and that the recorded text equals the approved text.

**Acceptance Scenarios**:

1. **Given** a presented draft without a decision, **When** the working tree is inspected,
   **Then** the 0.1.9 record contains no digest text.
2. **Given** the author asks for edits, **When** they are applied, **Then** the changed parts are
   shown again and still nothing is recorded until approval.
3. **Given** the author's approval, **When** the record is written, **Then** it matches the
   approved text exactly and keeps the version, date and build established for the release.

---

### User Story 4 - The author receives a site that is checked and ready to publish (Priority: P2)

After the digest is recorded, the author gets a regenerated site that passes the project's checks,
re-captured pictures wherever the version number is displayed, a report of the pictures that are merely older, and a clear list of the steps that remain theirs:
preview, commit, merge and deployment.

**Why this priority**: It turns the recorded content into something that can be published, but it
has no value before stories 1 to 3.

**Independent Test**: Run the release check on the finished working tree; it passes, the six
missing generated files exist again, and the handover lists the stale screenshots and manual steps.

**Acceptance Scenarios**:

1. **Given** the recorded digest, **When** the release check runs, **Then** all tests and the site
   generation pass.
2. **Given** the regenerated site, **When** the generated output is inspected, **Then** both home
   pages, both release-history pages, the catalogue file and the sitemap exist and mention 0.1.9.
3. **Given** published pictures that display a version number older than 0.1.9, **When** the
   release is prepared, **Then** exactly those pictures are re-captured and display 0.1.9, and the
   author is told which other pictures are merely older and were left as they are.
4. **Given** the finished working tree, **When** the work is handed over, **Then** nothing has been
   committed to the main line, merged or deployed without the author.

---

### Edge Cases

- The author rejects the draft or wants a different set of highlights: the digest is redrafted
  within the same limits; the release is not recorded with a partial or placeholder digest.
- A digest text exceeds a length limit or contains a forbidden character (a long dash, markup):
  the check rejects it naming the field, and the text is shortened or corrected, not the limit.
- A highlight would reference a gallery picture that is not published: the reference is omitted.
- The published release facts change (the installer is re-uploaded with another size): the facts
  are gathered again and the site's values follow the published release, not the earlier snapshot.
- The check fails for a reason outside the release record: the author is asked before anything
  other than the record is changed.
- A picture that displays the version number cannot be re-captured (the capture environment is
  unavailable, or the capture fails): the release is not reported as done; the author is told which
  picture is still stale and why.
- A re-captured picture differs from the old one in more than the version number: it is shown to
  the author for acceptance before it replaces the published picture.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The website MUST present 0.1.9 as the current version with release date 2026-10-07
  and installer size 8,013,936 bytes, in every place and language where these facts appear.
- **FR-002**: Every download entry point MUST lead to the 0.1.9 installer.
- **FR-003**: The website MUST contain a release record for 0.1.9 with version 0.1.9, date
  2026-10-07, build 193, kind "feature", a one-sentence summary and 0 to 6 highlights, each in
  English and Czech.
- **FR-004**: The digest MUST follow the project's digest style guide: summary at most 200
  characters, highlight titles at most 40 and texts at most 220 per language, plain text, no long
  dashes, no internal names, key names and commands marked as such.
- **FR-005**: Every statement of the digest MUST be traceable to the 0.1.9 changelog section, and
  conditions stated there (for example that creating RAR archives needs WinRAR) MUST be preserved.
- **FR-006**: The Czech digest MUST carry the same facts in the same order as the English one and
  use the vocabulary of the application's Czech interface and of the existing site.
- **FR-007**: No digest text MUST be written into the website's sources before the author has
  explicitly approved it; requested edits MUST be shown again before recording.
- **FR-008**: The author MUST be told what was left out of the changelog and why, which highlights
  would deserve a new gallery picture, and which Czech wordings are uncertain.
- **FR-009**: A highlight MUST reference a gallery picture only if a published picture shows it.
- **FR-010**: After recording, the complete site MUST be regenerated and MUST pass the project's
  release check (tests and site generation) with no failures.
- **FR-011**: The regenerated site MUST show 0.1.9 as the newest entry of the release history and
  its highlights first among the home-page news cards, in both languages.
- **FR-012**: The catalogue description file and the sitemap MUST be regenerated consistently with
  the new version facts and highlight titles.
- **FR-013**: Every published gallery picture that displays the version number MUST be re-captured
  with 0.1.9 before the release is considered done; pictures that do not display it MUST NOT be
  re-captured in this feature and MUST be reported to the author as merely older.
- **FR-017**: No new gallery picture MUST be added in this feature; the 0.1.9 highlights therefore
  carry no picture reference, and the two candidates (the new-version window, a RAR archive open
  in a panel) MUST be named in the handover as later work.
- **FR-018**: The permanent texts of the site (home-page description, feature cards, catalogue
  descriptions) MUST remain unchanged in this feature; apart from the version facts, only the
  release digest carries 0.1.9 content.
- **FR-014**: All changes MUST be made on the feature branch `009-release-0-1-9`; committing,
  merging to the main line and deployment remain the author's actions.
- **FR-015**: The application repository MUST NOT be changed by this work.
- **FR-016**: The handover MUST list the remaining manual steps (preview, commit of sources and generated output, merge, deployment) and summarise what changed.

### Key Entities

- **Release facts**: version, release date, build number, installer name and size as published;
  the single source for every version-dependent value on the site.
- **Release record**: one per version; kind, bilingual summary, ordered bilingual highlights, each
  highlight with an identifier, a title, a text and an optional gallery picture.
- **Changelog section**: the application's complete, technical account of 0.1.9; the only source
  of truth for the digest.
- **Gallery picture**: a published screenshot with a note whether it displays the version number,
  which decides whether a release makes it stale.
- **Generated site**: the publishable pages, catalogue file and sitemap produced from the sources.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the places where the website states a version, release date or installer
  size show the 0.1.9 values, in both languages; no page mentions 0.1.8 as current.
- **SC-002**: A visitor can tell what 0.1.9 brings within 10 seconds of opening the home page: one
  summary sentence and at most six cards, each readable in a single glance.
- **SC-003**: Every one of the digest's statements (summary plus up to six highlights, two
  languages) can be matched to the changelog; zero unsupported claims.
- **SC-004**: The release check finishes with zero failed tests and zero generation errors.
- **SC-005**: All six generated files missing at the start exist again after regeneration.
- **SC-006**: The author's remaining work after handover is limited to review and publishing
  steps and takes no more than 15 minutes.
- **SC-008**: Zero published pictures display a version number other than 0.1.9.
- **SC-007**: Zero digest characters are recorded before the author's approval, and the recorded
  text differs from the approved text in zero characters.

## Assumptions

- The published release facts gathered on 2026-10-07 are final: build 193, installer of 8,013,936
  bytes, changelog section dated 2026-10-07.
- The version facts and the empty record already present in the working tree were produced by the
  release procedure's own recording step and are kept, not redone by hand.
- The six missing generated files are a side effect of an interrupted site generation and are
  restored by regenerating the site; they are not restored from history by hand.
- The new-version window cannot be captured honestly yet: 0.1.9 is the first version that can
  look, so it shows the window only once a later version is published.
- The pictures are captured from the published 0.1.9 installer in the isolated capture environment
  of feature 007, which is available on the author's machine; a local installation plays no part.
- The website's own statements need no privacy-related change: the application's new daily request
  to GitHub is described in the digest and in the application's privacy statement.
- The feature branch starts from `devel`, where the earlier version releases were committed.
