# Feature Specification: Installation Through winget on the Website

**Feature Branch**: `010-winget-install`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Navrhni a implementuj upravu webu tak, že bude přidána informace ohledně alternativní možnosti instalace aplikace přes winget."

## Context

Tandem Commander has been submitted to the Windows Package Manager (winget) catalogue since
version 0.1.6. Feature 007 prepared a winget option for the download section, but deliberately
kept it invisible: on 2026-09-20 the package was not in the catalogue yet, and a command that
fails is worse than no command. Until now the website therefore only says that a winget package
"is on its way".

That condition has changed. On 2026-10-09 the public winget catalogue lists the package:

| Fact | Value |
|------|-------|
| Package name | Tandem Commander |
| Package identifier | `PavelStupka.TandemCommander` |
| Short name (moniker) | `tandemcommander` |
| Version in the catalogue | 0.1.9 (released 2026-10-07) - the same version the website offers |
| Installer behind the package | the same signed installer the website's download button serves |

The website now understates what a visitor can do: it promises something that has already arrived.
This feature makes installation through winget a visible, usable alternative next to the installer
download, in both languages, and removes the "on its way" wording from the texts that describe the
program as it is today.

### State of the website when this specification was written

- The download section offers one way to install: the installer download. The prepared winget
  option exists but is switched off and has never been seen by a visitor.
- The feature card "Easy to move in" ends, in both languages, with a sentence saying the winget
  package is on its way.
- The release history describes 0.1.6 with the highlight "On the way to winget". That is a correct
  account of what 0.1.6 was at the time.
- The site's shared values already hold the package identifier and an install command, but in the
  short-name form (`winget install tandemcommander`); the prepared update hint likewise names
  `winget upgrade tandemcommander`. Both are replaced by the form decided in Clarifications.

## Clarifications

### Session 2026-10-09

- Q: Which form of the install command should the website display? → A: The form with the full package identifier, `winget install --id PavelStupka.TandemCommander -e`; the update command uses the same form (`winget upgrade --id PavelStupka.TandemCommander -e`). The short name `tandemcommander` is not displayed. (Changed the same day from an initial choice of the short form.)
- Q: What should the website do on a release day, when it already offers the new version but the winget catalogue still holds the previous one? → A: The winget option stays visible at all times; its text names no version and says nothing about the delay. The release procedure gains no extra step.
- Q: How should the sentence on the "Easy to move in" card read, which today says the winget package is on its way? → A: EN "Install with the signed installer or through winget." / CS "Instaluje se podepsaným instalátorem nebo přes winget." The rest of the card's text is unchanged.
- Q: When the author switches the winget option off with the one shared value, should the sentence on the "Easy to move in" card change too? → A: Yes. With the option off the card ends with "Install with the signed installer." / "Instaluje se podepsaným instalátorem."; with it on, with the approved winget wording.
- Q (author's review of the implemented page): May the command be shown in a line that scrolls when it does not fit? → A: No. The command must always be visible whole, with no scroll bar anywhere in the winget option. Wherever the width allows it, the install command is on one line, and the update hint - its text followed by the update command - is on one line too.
- Q (author's second review, same day): How should the download section be arranged around the winget option? → A: The disclaimer box is hidden (its texts are kept, it is not shown). The winget option and the build-from-source box have the same width. The winget option is visually emphasised as a card of its own so it does not blend into the page; the build-from-source box is deliberately quieter. The installer download stays the primary action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor installs the program through winget (Priority: P1)

A visitor who prefers the command line, or who manages their software through winget, opens the
download section in English or Czech. Below the installer download they find a clearly secondary
option: one line saying the program can also be installed through winget, and the exact command.
They copy the command with one action, paste it into a terminal, and the current version of Tandem
Commander is installed.

**Why this priority**: This is the feature. The channel exists and works; the website is the only
place where a visitor could learn about it, and today it says nothing usable.

**Independent Test**: Open the download section in both languages, copy the offered command, run
it on a Windows 11 machine without Tandem Commander, and confirm the program is installed in the
version the website presents as current.

**Acceptance Scenarios**:

1. **Given** the published home page in English or Czech, **When** a visitor reaches the download
   section, **Then** the installer download is still the first and most prominent action, and the
   winget option is shown below it as an alternative, in the page's language.
2. **Given** the winget option, **When** the visitor uses the copy action, **Then** the clipboard
   holds exactly the offered command and the visitor gets a visible and announced confirmation in
   the page's language.
3. **Given** a browser where copying to the clipboard is not possible or scripting is off,
   **When** the visitor reaches the winget option, **Then** the command is still displayed in full
   and can be selected and copied by hand, and no control is shown that would do nothing.
4. **Given** a Windows 11 machine without Tandem Commander, **When** the offered command is run as
   displayed, **Then** it resolves to the package `PavelStupka.TandemCommander` without asking the
   visitor to choose among several packages, and installs it.
5. **Given** a narrow screen (a phone), **When** the visitor views the winget option, **Then** the
   whole command is visible without scrolling - it continues on a second line - and neither the
   command line nor the page scrolls sideways.
6. **Given** a screen wide enough to hold them, **When** the visitor views the winget option,
   **Then** the install command is on a single line and the update hint, text and command
   together, is on a single line.

---

### User Story 2 - A visitor learns how updates work with winget (Priority: P2)

A visitor who installs through winget wants to know what happens when the next version comes out.
Next to the command, one short sentence tells them that later versions arrive through winget's own
update command, so they do not need to return to the website for an installer.

**Why this priority**: Updating is the main practical reason to choose winget over a downloaded
installer. Without it the option is a second way to do the same thing; with it, it is a reason.

**Independent Test**: Read the winget option in both languages and confirm it names the update
command, then run that command on a machine with an older winget-installed version and confirm it
offers the update.

**Acceptance Scenarios**:

1. **Given** the winget option, **When** a visitor reads it, **Then** it states in one sentence
   how later updates are obtained and shows the update command in the same typographic style as
   the install command.
2. **Given** the Czech and the English winget option, **When** they are compared, **Then** they
   carry the same facts, and the commands are identical character for character.

---

### User Story 3 - The website no longer says winget is still coming (Priority: P2)

A visitor reading what Tandem Commander offers today finds winget described as an available way to
install, not as a promise. No text that describes the current state of the program says the
package is "on its way" while the download section two screens below offers it.

**Why this priority**: A page that contradicts itself reads as unmaintained. The correction is
small, but the feature is not finished while the contradiction is published.

**Independent Test**: Search both home pages for wording that presents winget as future; none is
found outside the release history.

**Acceptance Scenarios**:

1. **Given** the published home page in either language, **When** a visitor reads the feature
   cards, **Then** the card about moving in presents winget as an available way to install,
   alongside the signed installer.
2. **Given** the published home page in either language, **When** all texts describing the current
   program are read, **Then** none states or implies that winget availability is still pending.
3. **Given** the release history, **When** a visitor reads the entry for 0.1.6, **Then** it still
   describes that release as it was (the package submitted to the catalogue), unchanged.

---

### User Story 4 - The author can withdraw the option without rework (Priority: P3)

If the package is ever removed from the catalogue or the command stops working, the author can
take the winget option off the website by changing one shared value, and the page returns to
offering the installer alone, with no leftover reference to a command that fails.

**Why this priority**: The catalogue is operated by a third party. The safeguard already exists
from feature 007; this story keeps it working rather than building it.

**Independent Test**: Switch the shared value off, regenerate the site, and confirm the winget
option is absent in both languages and the page still reads coherently.

**Acceptance Scenarios**:

1. **Given** the winget option is marked unavailable in the site's shared values, **When** the
   site is regenerated, **Then** neither language's download section shows the option, the
   command or the copy control.
2. **Given** the winget option is marked unavailable, **When** a visitor reads the home page,
   **Then** no remaining sentence tells them to install through winget: the "Easy to move in"
   card ends with "Install with the signed installer." / "Instaluje se podepsaným instalátorem."
3. **Given** the winget option is marked available again, **When** the site is regenerated,
   **Then** the download section shows the option and the card ends with the winget wording,
   with no other change needed.

---

### Edge Cases

- **The catalogue lags behind a new release.** A new version appears on the website on its release
  day, but the winget catalogue accepts it only after Microsoft's review, hours to days later. The
  winget option must therefore never name a version number or claim to install "the version shown
  above"; it installs what the catalogue holds. The option stays visible during that window and
  does not mention the delay; the author does not switch it off for a release.
- **The visitor's system has no winget** (an old or stripped-down Windows installation). The
  option is an alternative, clearly secondary; the installer download above it remains the way
  that always works. The website does not explain how to obtain winget.
- **Another package with a similar name enters the catalogue**, or the visitor has additional
  sources configured. The displayed command names the package by its full identifier with an exact
  match, so it keeps resolving to this package alone; the short name is not relied on.
- **The command is longer than the line on a narrow screen.** It continues on the next line,
  breaking at a space where possible; it is never cut off or scrolled, and the break inserts no
  characters or spaces when the command is copied.
- **The copy action fails** (permission denied by the browser). The visitor is not told the
  command was copied when it was not.
- **A visitor uses a screen reader.** The command is read as text, the copy control has a name in
  the page's language, and the confirmation is announced without moving focus.
- **The package is withdrawn from the catalogue.** Covered by User Story 4.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The download section MUST offer installation through winget as an alternative to the
  installer download, in English and in Czech, on every page where the download section appears.
- **FR-002**: The installer download MUST remain the primary action of the download section: first
  in reading order and visually more prominent than the winget option.
- **FR-003**: The winget option MUST display the complete install command as text that can be
  selected and copied by hand, in a monospaced style that distinguishes it from prose.
- **FR-004**: The displayed install command MUST be
  `winget install --id PavelStupka.TandemCommander -e`, and the update command
  `winget upgrade --id PavelStupka.TandemCommander -e`. Run as shown on a standard Windows 11
  installation, the install command MUST resolve to exactly that package without requiring the
  visitor to choose among packages; this MUST be verified before the option is published.
- **FR-005**: The winget option MUST provide a one-action way to copy the install command, which
  copies exactly the displayed command and confirms success visibly and to assistive technology in
  the page's language.
- **FR-006**: Where copying by one action is not possible, the copy control MUST NOT be shown, and
  the command MUST remain usable by hand; a failed copy MUST NOT be reported as a success.
- **FR-007**: The winget option MUST state in one sentence how later updates are obtained through
  winget and show the update command.
- **FR-008**: The winget option MUST NOT state a version number, a release date or an installer
  size, and MUST NOT claim that winget installs the version presented elsewhere on the page. It
  MUST stay visible when a new version is released and MUST NOT carry a note about the catalogue's
  delay; releasing a new version MUST NOT require any change to the winget option.
- **FR-009**: Texts that describe the program as it is today MUST NOT present winget availability
  as future or pending; the feature card that currently says the package "is on its way" MUST
  present winget as an available way to install, in both languages. Its closing sentence MUST
  read "Install with the signed installer or through winget." in English and "Instaluje se
  podepsaným instalátorem nebo přes winget." in Czech; the rest of the card is unchanged.
- **FR-010**: Entries in the release history MUST remain unchanged; they describe each release as
  it was when published.
- **FR-011**: The English and Czech versions MUST carry the same facts about winget, and every
  command MUST be identical in both languages.
- **FR-012**: The install command, the update command and the package identifier MUST each have a
  single authoritative place in the site's shared values, so that no page can show a command that
  differs from another page's.
- **FR-013**: The author MUST be able to withdraw the winget option from the whole website by
  changing one shared value, after which no page offers, or tells the visitor to use, winget.
  The same value MUST govern the closing sentence of the "Easy to move in" card: with the option
  withdrawn it MUST read "Install with the signed installer." in English and "Instaluje se
  podepsaným instalátorem." in Czech.
- **FR-014**: The winget option MUST always show the install command and the update command
  whole: no part of the option may scroll, show a scroll bar or cut text off, at any screen width.
  Where the width allows, the install command MUST be on one line and the update hint (its text
  followed by the update command) MUST be on one line; on narrower screens they continue on
  further lines. The page MUST NOT scroll horizontally because of the option, and the option MUST
  be equally legible in the light and the dark appearance of the website.
- **FR-015**: The website's existing checks MUST pass with the winget option visible, and the
  generated site MUST be regenerated so that the published pages match their sources.

### Key Entities

- **winget package**: The program's entry in the Windows Package Manager catalogue. Identified by
  the package identifier `PavelStupka.TandemCommander` and reachable by the short name
  `tandemcommander`. Holds its own current version, which follows the website's with a delay.
- **winget option**: The block in the download section presenting the alternative: a label, the
  install command, a copy action with its confirmation, and a one-sentence hint about updates.
- **Availability mark**: The single shared value that says whether the package is live in the
  catalogue and the option may be shown. It governs both the winget option in the download section
  and the closing sentence of the "Easy to move in" card.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor who opens the download section can find the winget install command and
  have it on their clipboard in at most one action after seeing it, in both languages.
- **SC-002**: The command copied from the website, run unchanged on a Windows 11 machine without
  the program, installs Tandem Commander in 100% of trial runs without any additional question
  about which package is meant.
- **SC-003**: Both language versions show the winget option in the same place with the same facts;
  a character-for-character comparison of the commands between the two languages finds no
  difference.
- **SC-004**: A search of both home pages finds zero statements that winget availability is
  pending or future, outside the release history.
- **SC-005**: The installer download remains the first actionable element of the download section
  in both languages, and its appearance and target are unchanged by this feature.
- **SC-006**: With the availability mark switched off, zero occurrences of the word "winget"
  remain on the generated home pages outside the release news, and the site's checks still pass.
- **SC-007**: On a 360-pixel-wide screen the page shows no horizontal scrolling in the download
  section, in either language.

## Assumptions

- **The package is live.** Verified on 2026-10-09 against the public winget catalogue: the package
  `PavelStupka.TandemCommander`, version 0.1.9, is found by the short name `tandemcommander`. The
  condition that kept the option hidden in feature 007 no longer holds.
- **The existing prepared option is the starting point.** Feature 007 already designed a winget
  block (label, command, copy action, update hint, bilingual texts). This feature reviews it
  against the requirements above, completes what is missing, and makes it visible; it does not
  design a second, different presentation.
- **Placement stays in the download section only.** The hero and the header keep their single
  download action leading to the download section; no winget command is added there.
- **The command is longer than a short-name command would be.** The author prefers a command that
  always resolves to this package over a shorter one; on narrow screens the line is handled as
  FR-014 requires.
- **Release history is a record of the past** and is not rewritten (FR-010). The 0.1.6 highlight
  "On the way to winget" stays as published.
- **No release digest is written for this change.** It is a change of the website, not a release
  of the application; the "What's new" section is untouched.
- **The catalogue description file for software directories (PAD) is out of scope.** Its
  descriptions do not currently mention winget and are not extended by this feature.
- **The website does not teach winget.** It does not explain what winget is, how to open a
  terminal or how to install winget; visitors who choose this option already know the tool, which
  is part of Windows 11, the only platform the program supports.
- **Keeping the catalogue current is the application's release procedure**, not the website's. The
  website assumes each new version reaches the catalogue within days of its release and words the
  option so that the delay never makes it untrue (FR-008).
- **Publishing remains the author's step.** The work is done on the feature branch; preview,
  commit, merge and deployment are decided by the author.
