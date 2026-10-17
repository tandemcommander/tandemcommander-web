# Feature Specification: One-Command Website Update for a New Version (`/tandem-new-version`)

**Feature Branch**: `011-tandem-new-version`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "na zaklade kontextu pripravime a implementujeme novy skill /tandem-new-version veskere dotazy a nejasnosti vyresime v speckit-clarify fazi"

## Context

When a new version of Tandem Commander is published, the website has to follow: the version facts
(number, release date, installer size), a bilingual release digest, the news cards, the release
history, the PAD file, the gallery pictures that show the version in the title bar, and any text on
the site that the new version made untrue.

Feature 007 built the foundation: a scripted layer that establishes and writes the release facts
and checks the build, and an assisted layer (`/release-web`) that drafts the digest for the
author's approval. In practice the 0.1.9 release still needed a full feature cycle of its own
(spec 009, roughly a thousand lines of planning documents) and many manual steps: creating the
branch, deciding which pictures to re-capture and running the capture, checking the generated pages
by hand, noticing stale texts elsewhere on the site, and writing the commit. Later the winget
change (spec 010) showed that sentences such as "winget is on its way" go stale without anyone
being told.

This feature introduces one assistant command, `/tandem-new-version <version>`, that takes the
author from "the version is published" to "a reviewed, committed release branch ready to merge",
automating everything that is factual or checkable and stopping only for decisions that belong to
the author.

## Clarifications

### Session 2026-10-17

- Q: Should `/tandem-new-version` fully replace `/release-web`, or should both exist? → A: Replace - `/release-web` is deleted; README and the release contract point to `/tandem-new-version`.
- Q: What should the release branch be called? → A: `release-x.y.z` (e.g. `release-0.2.0`), derived from the version only, not numbered like a spec feature.
- Q: How far may the command go at the end of a release? → A: After explicit approval it commits on `release-x.y.z`; it never pushes, merges or deploys.
- Q: Which texts does the stale-content scan cover? → A: All text visible on the website in every language, including the personal story texts, for factual staleness only; the README is not scanned.
- Q: Should the digest draft and the content corrections be approved together or in two steps? → A: Together - one combined review before anything is written; each item can be accepted, edited or rejected.
- Q: When is it decided whether the gallery pictures are re-captured? → A: At the start of the run the command asks whether pictures should be re-captured for this version; some versions keep the previous pictures. The answer replaces the later capture go-ahead.
- Q: Where may the command take information about the new version from? → A: Only from the public GitHub repository `https://github.com/tandemcommander/tandemcommander/` after the version is published (the release, its installer asset, and the changelog at the release tag); it never depends on or reads a local checkout of the application's source code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Release the website with one command (Priority: P1)

The author has just published a new version of the application (release, installer, dated
changelog section). They type `/tandem-new-version 0.2.0` and the assistant: verifies the release
is really published, asks whether the gallery pictures should be re-captured this time (User
Story 3), drafts the bilingual digest together with the content corrections of User Story 2, waits
for one combined approval, prepares a dedicated release branch, records the facts, the approved
digest and the accepted corrections, rebuilds and checks the whole site, verifies
the generated pages show the new version and no longer link to the old installer, and hands over a
clear summary of what changed and what is left.

**Why this priority**: This is the core value - the release that used to take a feature cycle
becomes one guided session. Without it nothing else matters.

**Independent Test**: Run the command for a version whose release is published; at the end the
working tree on the release branch contains updated version facts, a filled release record, a
regenerated site whose home pages, release history and PAD file show the new version, and a
handover summary. Nothing was written before the combined review was approved.

**Acceptance Scenarios**:

1. **Given** a published release with installer and dated changelog section, **When** the author
   runs the command and approves the digest, **Then** the site's version facts, the release record
   and the generated site reflect the new version and the release check passes.
2. **Given** the release is not yet published (draft, missing installer, or changelog section still
   "Unreleased"), **When** the author runs the command, **Then** the assistant lists every missing
   fact and stops without changing any file or branch.
3. **Given** the digest draft is presented, **When** the author asks for edits, **Then** the
   assistant applies them and shows the changed parts again, repeating until explicit approval;
   nothing is written to the record before that approval.
4. **Given** the build succeeds, **When** the output verification runs, **Then** it confirms that
   every generated page that shows the current version shows the new one, that no page links to the
   previous installer, and that the PAD file carries the new version, date, size and highlight
   titles - and reports each discrepancy by page and value if not.
5. **Given** the command is started on `main` or `devel`, **When** it prepares the branch, **Then**
   it creates and switches to a dedicated release branch from `devel` and never writes to `main` or
   `devel` directly.

---

### User Story 2 - Find and fix everything else the new version made stale (Priority: P2)

Beyond the version facts, the site contains sentences that a release can make untrue: hard-coded
version numbers, "coming soon" or "planned" statements about features the new version delivers,
statements about availability (installers, package managers) that have changed. The assistant scans
all text visible on the website in every site language, compares it with the new changelog section and the
current facts, and proposes concrete corrections as a reviewable list, applying only those the
author accepts.

**Why this priority**: This is the step that "maximally automates the update of the whole site"
rather than just the version number; stale claims are exactly what slipped through before.

**Independent Test**: Plant a hard-coded previous version number and a "planned" sentence about a
feature listed in the changelog section into a text visible on the website; run the scan; both appear in
the proposal list with the location, the current text, the proposed text and the reason. Rejected
proposals leave the file untouched.

**Acceptance Scenarios**:

1. **Given** a text visible on the website mentions the previous version as the current one, **When** the
   scan runs, **Then** it is proposed for correction with its location.
2. **Given** a text says a feature is planned and the new changelog section lists it as added,
   **When** the scan runs, **Then** a correction is proposed, citing the changelog line.
3. **Given** a historical mention (e.g. a past release record or "since 0.1.7"), **When** the scan
   runs, **Then** it is not proposed for change.
4. **Given** the author accepts some proposals and rejects others, **When** the assistant applies
   them, **Then** only accepted ones change, and the same correction is applied consistently in
   every language.

---

### User Story 3 - Gallery pictures re-captured on request and verified (Priority: P3)

Pictures that show the version number in the title bar become outdated with every release, but not
every version is worth a new capture - for some versions the author is content to keep the previous
pictures. At the start of the run the assistant therefore asks whether the pictures should be
re-captured this time, naming the pictures that show the version. If the author says yes, the
assistant later runs one capture for exactly those scenes and the new version - without asking
again, only announcing the start and what the capture needs (a visible sandbox window, no other
sandbox open) - and afterwards looks at each re-captured picture to confirm it shows the new version
and nothing unexpected changed. If the author says no, no capture runs and the previous pictures
stay. Pictures that are merely older are reported for review, never re-captured automatically.

**Why this priority**: Pictures showing an old version look neglected, but a release can be
published with older pictures, so this is valuable rather than essential.

**Independent Test**: Answer "yes" at the start; after the facts are recorded the stale-image
report names N pictures that must be re-captured; after the capture it names none, and the
assistant's visual check lists each picture with the version it shows. Run again for another version
answering "no": no capture runs, no picture file changes, and the handover lists the pictures that
were kept from the previous version.

**Acceptance Scenarios**:

1. **Given** the run starts, **When** the release facts are established, **Then** the assistant asks
   whether to re-capture the pictures and names the pictures that show the version, before any file
   or branch is changed.
2. **Given** the author answered "yes", **When** the capture step is reached, **Then** the assistant
   starts one capture for exactly the scenes that must be re-captured and the new version, without
   asking again.
3. **Given** the author answered "no", **When** the session continues, **Then** no capture runs, no
   picture changes, the release completes, and the handover lists the pictures kept from the
   previous version as an intentional choice, not as an error.
4. **Given** the capture fails or the sandbox is unavailable, **When** the assistant reports it,
   **Then** the error is shown verbatim, the previous pictures stay in place and the release can
   still be completed.
5. **Given** a re-captured picture does not show the new version, **When** the visual check runs,
   **Then** the assistant flags it and does not treat the picture as current.

---

### User Story 4 - Commit ready for merge (Priority: P4)

At the end the assistant shows a summary of all changes (sources and regenerated site), proposes a
commit message in the style of the repository's previous release commits, and after the author's
approval creates the commit on the release branch. Pushing, merging and deploying remain the
author's actions.

**Why this priority**: Saves the last manual chore and guarantees sources and regenerated site are
committed together, but the release is complete without it.

**Independent Test**: After approval, one new commit exists on the release branch containing the
sources and the regenerated site; nothing was pushed; `main` and `devel` are unchanged.

**Acceptance Scenarios**:

1. **Given** all checks passed, **When** the author approves the commit message, **Then** exactly
   one commit with all release changes is created on the release branch.
2. **Given** the author declines, **When** the session ends, **Then** the changes stay uncommitted
   in the working tree and the handover says so.
3. **Given** any check failed, **When** the assistant reaches the commit step, **Then** it does not
   offer to commit until the failure is resolved or the author explicitly accepts it.

---

### User Story 5 - Resume an interrupted release (Priority: P5)

A release session can be interrupted (closed terminal, failed capture, author wants to come back
tomorrow). Running the command again for the same version detects what is already done - branch
exists, combined review approved and written, pictures current - and continues from the
first unfinished step without redoing or overwriting finished work.

**Why this priority**: Robustness; the steps are long enough that interruption is realistic.

**Independent Test**: Stop after the approved digest and corrections are recorded; run the command
again; it reports the completed steps and continues with the build and the picture step without
repeating the combined review.

**Acceptance Scenarios**:

1. **Given** a release record for the version already has approved texts, **When** the command
   runs again, **Then** it does not draft a new digest unless the author asks for one.
2. **Given** the release branch already exists, **When** the command runs again, **Then** it
   switches to it instead of creating another.

---

### Edge Cases

- The version is not greater than the site's current version: stop with a clear message (a
  re-release of the current version is allowed only as a resume of the same version).
- The version string is malformed or empty: ask for a valid version and stop.
- The working tree has uncommitted changes unrelated to the release: report them and ask before
  continuing; never include them in the release commit silently.
- A local checkout of the application's source code exists next to the website (as on the
  author's current machine): it is ignored; the result is identical to a machine without it.
- The release exists on GitHub but the changelog at its tag has no dated section for the version:
  stop with that fact named, even if a newer changelog exists on the default branch.
- No network access, or GitHub refuses or limits the requests: facts cannot be established; stop
  before changing anything and show GitHub's answer.
- An installer-only or bugfix release: the digest may have no highlights; whether the pictures are
  re-captured is the author's answer at the start, as for any release.
- The author answered "yes" but no picture shows the version (nothing must be re-captured): no
  capture runs and the handover says so.
- A resumed run (FR-020) whose pictures are not yet current asks the re-capture question again;
  if they are already current, it does not ask.
- The changelog says something depends on a third party (e.g. catalogue acceptance): the digest and
  any content correction must say so as well, not claim it as done.
- The build fails on the new record: the error names the file and field; the assistant fixes only
  its own record text and asks before touching anything else.
- The branch `release-<version>` already exists but contains commits or changes unrelated to this
  release: report it and ask.

## Requirements *(mandatory)*

### Functional Requirements

**Invocation and preconditions**

- **FR-001**: The command MUST take the new version as its only argument and validate it as
  `MAJOR.MINOR.PATCH`; when missing or malformed it MUST ask for it and stop.
- **FR-002**: Before changing any file or branch, the command MUST establish the release facts
  (published, installer and its exact size, release date, build, changelog section) and stop with
  one line per missing fact if any is missing.
- **FR-002a**: All information about the new version MUST come exclusively from the public GitHub
  repository `https://github.com/tandemcommander/tandemcommander/` as published: the release and
  its installer asset, and the changelog as it is at the release tag `v<version>`. The command MUST
  NOT read or depend on a local checkout of the application's source code, so that it gives the
  same result on any machine; the same applies to the manual (no assistant) release path.
- **FR-003**: The command MUST refuse a version lower than the site's current version and treat the
  same version as a resume (FR-020).
- **FR-004**: The command MUST report uncommitted changes that predate the session and ask before
  continuing.

**Branch**

- **FR-005**: The command MUST perform all changes on a dedicated release branch named
  `release-<version>` (e.g. `release-0.2.0`), created from `devel`, and MUST NOT commit to `main`
  or `devel`. The branch name is how a later run recognises the release in progress (FR-020).

**Digest**

- **FR-006**: The command MUST draft the release digest (kind, summary, 0-6 highlights) in every
  site language, following the existing editorial style guide and limits, with every claim
  traceable to the changelog section.
- **FR-007**: The command MUST present, in one combined review, the full digest draft (with what
  was left out and why, highlights that deserve a new gallery scene, and any uncertain wording)
  together with all content proposals of FR-012. Each item can be accepted, edited or rejected;
  edited items are shown again until the author approves. Nothing - facts, digest or content
  corrections - is written before this approval.

**Recording and build**

- **FR-008**: After approval the command MUST record the version facts and the approved digest
  through the existing release procedure, so that the same gates apply as for a manual release.
- **FR-009**: The command MUST run the release check (tests and build) and relay failures verbatim.

**Site-wide content update**

- **FR-010**: The command MUST scan all text visible on the website in every site language (page
  texts including the personal story, templates, page metadata, the PAD file template) for
  hard-coded current-version mentions and for statements contradicted by the new changelog section
  or the current facts. Only factual staleness is reported (versions, availability, "planned" /
  "coming soon" statements, figures); style and wording are not. The README is out of scope.
- **FR-011**: Historical mentions (past release records, "since version X", changelog quotes) MUST
  NOT be proposed for change.
- **FR-012**: Each proposal MUST show location, current text, proposed text and reason (with the
  changelog line or fact it rests on). Proposals are presented in the combined review of FR-007;
  only accepted proposals are applied, consistently across languages.

**Pictures**

- **FR-013**: Right after the release facts are established and before any file or branch is
  changed, the command MUST ask the author whether the gallery pictures should be re-captured for
  this version (yes / no), naming the pictures that show the version in the title bar.
- **FR-014**: On "yes" the command MUST derive the pictures that must be re-captured from the
  stale-image report and, once the facts are recorded, run one capture for exactly those scenes and
  the new version without asking again, only announcing the start and what the capture needs. On
  "no" it MUST NOT run any capture or change any picture, and the handover lists the kept pictures
  as an intentional choice. A failed capture MUST NOT block the rest of the release.
- **FR-015**: After a capture the command MUST inspect each re-captured picture and confirm it
  shows the new version, flagging any that do not.
- **FR-016**: The command MUST mention, at handover, the social sharing image if the main window
  picture changed, and pictures that are merely older.

**Output verification**

- **FR-017**: After the build an automated check MUST confirm that the generated home pages (all
  languages), release history pages, PAD file and sitemap exist; that the pages showing the current
  version show the new one; that no generated page links to the previous installer; and that the
  PAD file's version, release date, size and change list match the recorded facts and digest. This
  check MUST be runnable by hand without the assistant.

**Commit and handover**

- **FR-018**: The command MUST end with a handover: summary of changed files grouped by purpose,
  results of all checks, open items (pictures kept from the previous version by choice or after a
  failed capture, rejected proposals, gallery candidates, social image), and the remaining manual
  steps (preview, push, merge, deploy).
- **FR-019**: The command MUST propose a commit message and create a single commit with all release
  changes (sources and regenerated site) on the release branch only after explicit approval. It
  MUST NOT push any branch, merge, or deploy as part of the procedure; the handover lists these as
  the author's actions (a push to `main` triggers the production deploy).

**Resume and safety**

- **FR-020**: Re-running the command for the same version MUST detect completed steps and continue
  from the first unfinished one without overwriting approved texts or re-captured pictures.
- **FR-021**: The command MUST NOT write to the application's GitHub repository (no releases,
  tags, issues or commits there); it only reads published information (FR-002a).
- **FR-022**: The command MUST NOT hand-edit the generated site; the generated site changes only
  through the build.
- **FR-023**: The existing assisted release command (`/release-web`) MUST be removed (no alias
  remains); the project documentation (README, release procedure contract) MUST point to
  `/tandem-new-version` instead. The manual (no assistant) path MUST keep working with identical
  gates.

### Key Entities

- **Release facts**: version, release date, build number, installer name and exact size, changelog
  section, kind hint - established from the published GitHub release and the changelog at its tag;
  the input to everything else.
- **Release record**: the per-version bilingual digest (kind, summary, highlights) plus version,
  date and build; the source of news cards, release history and PAD change list.
- **Release session state**: which steps are complete for a given version (branch, facts recorded,
  combined review approved and recorded, pictures current, checks passed, committed); derived from
  the repository state, not stored separately.
- **Content proposal**: one suggested correction of a text visible on the website - location, language,
  current text, proposed text, reason, decision (accepted / rejected).
- **Stale-image report**: per picture, the version it was captured with and its status (must
  re-capture / older, review / current).
- **Verification result**: per check, pass or the list of discrepancies by page and value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A release of a published version is completed with at most three author stops: the
  re-capture question at the start, the combined review (digest and content proposals), and the
  commit approval; no planning documents are written for a routine release.
- **SC-002**: The author's active time for a routine release, excluding unattended capture time,
  is under 20 minutes.
- **SC-003**: After a completed release, zero generated pages present the previous version as
  current or link to the previous installer.
- **SC-004**: Zero files are changed before the combined review is approved, and zero commits are made to
  `main` or `devel`; zero pushes, merges or deploys are made by the assistant.
- **SC-005**: Every planted stale statement of the two kinds named in User Story 2 is detected by
  the content scan, and no historical mention is proposed for change.
- **SC-006**: When the author answers "yes", every picture in the "must re-capture" list shows the
  new version after the capture, confirmed by the visual check; when the author answers "no", zero
  picture files change.
- **SC-007**: A re-run after an interruption at any step completes the release without repeating an
  approval already given.
- **SC-008**: Running the release for the same version on a machine with and without a local copy
  of the application's source code produces identical release facts and identical recorded
  changes; on a machine without it the release completes end to end.

## Assumptions

Decisions taken as informed defaults so the specification is complete; all of them are open to the
clarification phase.

- The scripted release procedure of feature 007 is reused and extended, not rewritten
  (`/release-web` itself is removed, see FR-023).
- A routine release produces no spec-kit planning documents; the release record, the handover and
  the commit are the record of the release.
- The release branch is not numbered like a spec feature (FR-005) because a routine release
  creates no spec directory; the "one branch per feature" rule is satisfied by the release branch.
- Gallery scenes that would illustrate a new highlight are only proposed; creating a new scene is a
  separate feature.
- The capture tooling, the sandbox-based capture path and the editorial style guide from feature
  007 stay as they are.
- The author is the only user; the command runs in Claude Code on a Windows machine with network
  access to GitHub, Node 22 or later and Windows Sandbox available for captures. No local copy of
  the application's source code is needed; the capture already installs the published installer
  downloaded from the GitHub release.
- Unauthenticated access to GitHub's public data is sufficient for one release run.
