# Feature Specification: PAD 4.0 Compliance for the Published PAD File

**Feature Branch**: `006-pad-v4-compliance`

**Created**: 2026-08-23

**Status**: Draft

**Input**: User description: "PAD soubor generovaný na základě minulé feature musí být kompatibilní PAD v4.0 nyní vypadá že není."

## Context

Feature [005-pad-file](../005-pad-file/spec.md) delivered a generated, build-validated PAD file at `https://tandemcommander.org/pad.xml`. It deliberately targeted the classic PAD revision **3.11**, on the research finding that PAD 4.0's governing bodies were defunct and 3.11 was the de-facto catalog baseline. The author now requires the published file to be **PAD 4.0** compliant instead. This feature re-targets the same published file at revision 4.0.

The file has not yet been submitted to any catalog (005 tasks T018 "deploy" and T019 "submit to slunecnice.cz" are still open), so the content can change freely at the same permanent URL without breaking existing listings.

## Research Findings (pre-spec)

- **PAD 4.0 is the final, public-domain revision.** The Association of Software Professionals dissolved in 2021 and released the final PAD specification, v4.0, into the public domain in January 2022. Its original host (`pad.asp-software.org`) no longer resolves, but the **machine-readable 4.0 specification survives**: `PAD_Spec` / `PAD_Spec_Version 4.0`, a flat list of **104 fields**, each with an absolute element path, a human-readable constraint description, and a validation regular expression. It is recoverable from the Internet Archive (snapshot of `repository.appvisor.com/padspec/files/padspec.xml`, captured 2018-01-18) — this is the authoritative 4.0 contract this feature targets, and the plan phase should vendor a copy into the repository so the build never depends on a defunct host.
- **The current file is measurably non-compliant.** Validating the published `public/pad.xml` against all 104 PAD 4.0 field regexes yields **5 failures**, plus one semantic failure the regexes cannot catch:
  1. `MASTER_PAD_VERSION` states `3.11` — the file declares compliance with the superseded revision. (Passes the loose version regex, but is the headline defect the author observed.)
  2. `Program_OS_Support` = `Win11 x64` — **not a PAD 4.0 token.** The 4.0 operating-system vocabulary was frozen around 2012; its newest Windows entries are `Windows 8`, `Windows RT`, `Windows Phone 7/8`, alongside `WinOther`, `Other` and `Not Applicable`. There is no Windows 10 or Windows 11 token in PAD 4.0 at all.
  3. `Program_Specific_Category` = `System Utilities` — **not a PAD 4.0 token.** The 4.0 vocabulary for this field is exactly: `Audio`, `Business`, `Development Tools`, `Education`, `Games`, `Graphics`, `Home/Hobby`, `Internet`, `Miscellaneous`, `Screen Savers`, `Utilities`. (`Program_Category_Class` = `System Utilities::File & Disk Management` *is* valid 4.0 — the two fields use different vocabularies.)
  4. `Company_Info/City_Town` is emitted **empty**, but its 4.0 pattern demands 2–40 characters — an empty element is itself a violation.
  5. `Support_Info/Sales_Email` is emitted **empty**, but its 4.0 pattern demands a full e-mail address.
  6. `Support_Info/General_Email` — same failure as Sales_Email.
- **"Empty" is not universally legal in PAD 4.0.** Some optional fields permit an empty value (`Address_1`, `State_Province`, `Zip_Postal_Code`, the whole `Expire_Info` block, the extra download URLs); others do not. 63 of the fields our file emits are already valid. The rule that follows: a field the project has no data for must be **omitted**, not emitted empty, unless its own 4.0 pattern explicitly permits emptiness.
- **36 PAD 4.0 elements are absent from the current file**, all of them optional and, with two exceptions, describing services that no longer exist: `CERTIFIED` / `CERTIFICATE_ID` / `CERTIFICATE_LICENSE` (a dead certification service), `PublisherID` and `AppID` (registry-issued identifiers matching `pid-`/`app-` + 12 characters — **these two patterns do not accept an empty value**, so they can only be omitted), company/product social pages, `Video_Link_1_URL` / `Video_Link_2_URL`, and the entire `Press_Release`, `NewsFeed`, `Affiliates` (ShareIt/PayPro) and `ASP` sections.
- **Element order changed between revisions.** PAD 4.0 sequences `Program_Info` as … `Program_Language`, `File_Info`, `Expire_Info`, `Program_Change_Info`, `Program_Category_Class`, `Program_Specific_Category`, `Program_System_Requirements` …; the current file emits `Program_Change_Info`, `Program_Specific_Category`, `Program_Category_Class`, `Program_System_Requirements` and only then `File_Info` and `Expire_Info`. Path-driven validators are order-agnostic, but a schema-driven or hand-rolled sequential importer is not.
- **The bilingual description mechanism survives.** The 4.0 field list enumerates description paths under `Program_Descriptions/English/…` only; additional per-language sibling blocks (our `<Czech>`) remain the format's documented localisation mechanism and are simply not inspected by a path-driven validator. Nothing in the 4.0 contract requires dropping the Czech block.
- **Everything else already passes.** Program name, version, release date split, cost, type, release status, install support, program language, file sizes, expire block, all URLs (the icon/screenshot patterns require a `.gif`/`.jpg`/`.png` extension — ours comply), permissions, EULA and both description blocks validate against their 4.0 patterns unchanged.

## Clarifications

### Session 2026-08-23

- Q: PAD 4.0's operating-system vocabulary is frozen at 2012 and has no Windows 11 token — which value should the operating-system support field carry? → A: `WinOther`, the vocabulary's generic "other Windows" member. Strictly 4.0-compliant and truthful; catalogs display a generic Windows entry while the system-requirements text and the descriptions carry "Windows 11" and the 64-bit requirement. This becomes the standing rule for every future Windows release with no PAD 4.0 token. Keeping the invalid `Win11 x64` was rejected because it defeats the purpose of the feature; `Windows 8, WinOther` was rejected because it asserts Windows 8 support the program does not have.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The published file passes as PAD 4.0 (Priority: P1)

The author points any catalog or PAD validator at `https://tandemcommander.org/pad.xml`. The file declares itself as PAD 4.0 and every field it contains satisfies the 4.0 specification's constraints, so a 4.0-era importer accepts it without complaint and a validator reports zero errors.

**Why this priority**: This is the entire request. Without it the file advertises a revision the author no longer wants to publish, and three of its field values are outright invalid under 4.0.

**Independent Test**: Validate the built file against all 104 PAD 4.0 field patterns — zero failures — and confirm the declared revision reads 4.0.

**Acceptance Scenarios**:

1. **Given** the built PAD file, **When** it is checked against the PAD 4.0 specification, **Then** the declared specification revision is 4.0 and no field violates its 4.0 constraint.
2. **Given** the built PAD file, **When** the operating-system and category fields are read, **Then** each value is drawn from the PAD 4.0 vocabulary for that field.
3. **Given** a field the project has no data for (postal town, sales e-mail, general e-mail, registry identifiers, affiliate and certification data), **When** the file is inspected, **Then** the field is either absent or carries a value its own 4.0 pattern permits — never an empty element that the pattern forbids.
4. **Given** the built PAD file, **When** its element sequence is compared with the PAD 4.0 field order, **Then** the elements appear in the specification's order.

---

### User Story 2 - Catalog listings still describe the program truthfully (Priority: P1)

A visitor browsing a catalog listing built from the PAD file still learns that Tandem Commander is a Windows 11 x64 file manager. The 4.0 vocabulary has no Windows 11 token, so the operating-system field alone can no longer say it — the system-requirements text carries the real requirement, and no field states anything untrue.

**Why this priority**: Equal to US1 — a file that validates by lying about which operating system it supports would satisfy the letter of the request and damage the listing. Both must hold together.

**Independent Test**: Read every field of the built file and confirm each statement is true of the shipped v0.1.4 installer, and that "Windows 11" and "x64" are still stated somewhere a catalog displays.

**Acceptance Scenarios**:

1. **Given** the built PAD file, **When** any field is read, **Then** its value is true of the actual program — no field claims support for an operating system the program does not support, and no placeholder or invented data appears anywhere.
2. **Given** the built PAD file, **When** a reader looks for the program's actual platform requirement, **Then** "Windows 11" and the 64-bit architecture are stated in a field catalogs display to visitors.
3. **Given** the file's bilingual descriptions, **When** the file is inspected after the upgrade, **Then** both the English and the Czech description blocks are still present and complete, with Czech diacritics intact.

---

### User Story 3 - The build gate enforces 4.0, not 3.11 (Priority: P2)

The author releases the next version the usual way. The build's PAD gate now checks the output against the PAD 4.0 contract, so a value that was legal under 3.11 but is not under 4.0 fails the build instead of being published — the same protection 005 delivered, re-aimed at the new revision.

**Why this priority**: The 4.0 upgrade is worthless if the next edit silently reintroduces a 3.11-only value. But a correct file shipped today already delivers the author's ask, so the gate lands just behind it.

**Independent Test**: Introduce each of the six known defects in turn, rebuild, and confirm the build fails naming the offending field; revert and confirm the build is green.

**Acceptance Scenarios**:

1. **Given** the build gate, **When** the PAD output declares a revision other than 4.0, **Then** the build fails with a message naming the version field.
2. **Given** the build gate, **When** an operating-system, category, program-type, release-status, install-support or language value outside the PAD 4.0 vocabulary is introduced, **Then** the build fails naming that field and the rejected value.
3. **Given** the build gate, **When** a field is emitted empty whose 4.0 pattern forbids emptiness, **Then** the build fails naming that field.
4. **Given** the release routine from 005 (update version, release date, installer size and What's New, then deploy), **When** a new version is released, **Then** no PAD-specific manual step is added by this feature and the published file remains 4.0 compliant.

---

### Edge Cases

- **PAD 4.0's vocabularies are frozen in time.** No Windows 10/11 token exists, and none ever will — the specification is final and its stewards are gone. Every future Windows release faces the same gap, which is why the resolution (`WinOther`, per the clarification) is a standing rule rather than a one-off patch for v0.1.4.
- **A field whose 4.0 pattern forbids empty but whose data the project lacks** (postal town, sales e-mail, general e-mail): omitting it is the only compliant option; the build must not emit it as an empty element, and must not invent a value.
- **Registry-issued identifiers** (`PublisherID`, `AppID`, `CERTIFICATE_ID`): the issuing service is defunct, so no valid value can ever be obtained. `PublisherID` and `AppID` cannot legally be empty either, so they must be absent entirely.
- **A catalog importer still built for 3.11** reads a file stamped 4.0: the element names it knows are unchanged, so it finds the data it looks for. The observable regression is the operating-system field, whose value must change to a 4.0 token.
- **Only the authoritative 4.0 field list is archived, not hosted.** The build must not depend on network access or on a defunct domain; the specification data has to live in the repository.
- **The Czech description block** is not enumerated in the 4.0 field list. It must survive the upgrade; if a target catalog later rejects the sibling block, that becomes a separate follow-up — this feature must not drop bilingual support to gain compliance.
- **The permanent URL must not change.** `https://tandemcommander.org/pad.xml` stays the published address; this feature changes the file's content and declared revision, never its location.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The PAD file published at the existing permanent URL MUST declare PAD specification revision **4.0** and MUST conform to the PAD 4.0 specification — every element it emits satisfying that revision's constraint for that element's path.
- **FR-002**: Every field value drawn from a PAD 4.0 controlled vocabulary (operating-system support, specific category, category class, program type, release status, install support, program language) MUST be a member of that field's 4.0 vocabulary.
- **FR-003**: The operating-system support field MUST carry a PAD 4.0 vocabulary value. Because PAD 4.0 has no Windows 11 token, the value MUST be `WinOther` — the vocabulary's generic "other Windows" member, which is true of the program and asserts no version the program does not support. The program's actual platform requirement ("Windows 11", 64-bit) MUST remain stated in the system-requirements field, which catalogs display to visitors, and in the descriptions.
- **FR-003a**: Choosing the generic `WinOther` member whenever the program's actual Windows version has no PAD 4.0 token MUST be recorded as a standing rule, so future Windows releases are handled the same way without re-deciding.
- **FR-004**: The specific-category field MUST use the PAD 4.0 vocabulary value that best describes the program (`Utilities`), while the category-class field retains its already-valid two-level classification.
- **FR-005**: A field for which the project has no truthful data MUST be omitted from the file unless that field's own 4.0 constraint permits an empty value. The file MUST NOT emit an element whose 4.0 constraint forbids emptiness with an empty value, and MUST NOT populate any field with placeholder, invented or borrowed data.
- **FR-006**: Elements that require an identifier issued by a service that no longer exists (publisher identifier, application identifier, certificate identifier) MUST be absent from the file.
- **FR-007**: Elements MUST appear in the order the PAD 4.0 specification defines, so that both path-driven and sequence-driven consumers accept the file.
- **FR-008**: The file MUST retain, unchanged in completeness, everything 005 established that remains valid under 4.0: the bilingual English and Czech description blocks with all length variants and keywords; program name, version and release date; cost and licence classification; installer file size; the current version's change summary; primary download URL; product website, screenshot, icon and self-reference URLs; author identity and contact e-mail; distribution permissions and EULA.
- **FR-009**: The site build MUST validate the produced file against the PAD 4.0 contract and MUST fail the build with a clear message naming the offending element and the reason whenever a value violates it. A non-compliant PAD file MUST never reach the public URL.
- **FR-010**: The PAD 4.0 specification data the build validates against MUST be stored in the repository, so the build stays deterministic and offline and does not depend on the specification's defunct original host.
- **FR-011**: This feature MUST NOT add any manual step to the existing release routine (update version, release date, installer size and What's New in the single data source, then deploy), and MUST NOT introduce a second copy of any program fact already held in that source.
- **FR-012**: The published file MUST keep its existing permanent URL and MUST remain publicly retrievable there after every deploy.
- **FR-013**: The project's documentation MUST record that the published file targets PAD 4.0, and MUST record the standing rule for choosing an operating-system value when a future Windows release has no PAD 4.0 token.

### Key Entities

- **PAD 4.0 specification data**: The authoritative, machine-readable description of the format — 104 element paths, each with its constraint and permitted values. Recovered from the Internet Archive and stored in the repository; the contract the build validates against.
- **Published PAD file**: The single generated document at the project's permanent PAD URL. Its content and declared revision change in this feature; its location does not.
- **Controlled vocabulary**: A PAD 4.0 field's closed list of permitted values (operating systems, categories, program type, release status, languages). Frozen in 2012, which is the source of the Windows 11 gap.
- **Program data source**: The site's existing single source of truth for program facts (name, version, release date, installer size, URLs, author). Unchanged by this feature; still the only place a release is recorded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The built PAD file validates against every applicable PAD 4.0 field constraint with **zero** failures, down from the 6 defects measured today, and declares revision 4.0.
- **SC-002**: Every one of the 36 PAD 4.0 elements the project has no data for is either absent or holds a value its own constraint permits — no element in the file is empty where 4.0 forbids emptiness.
- **SC-003**: Every field in the published file is a true statement about the shipped installer, and a catalog visitor reading a listing generated from the file can still see that the program requires Windows 11 on x64.
- **SC-004**: Each of the 6 known defects, reintroduced one at a time, fails the build with a message naming the offending element; the unmodified build is green.
- **SC-005**: Releasing a new version still takes exactly the steps the release routine already documents — zero additional PAD-specific actions — and the file published afterwards is still 4.0 compliant.
- **SC-006**: The file is publicly retrievable at its unchanged permanent URL after deploy, and both the English and the Czech description blocks are complete in the delivered bytes with Czech diacritics intact.

## Assumptions

- **PAD 4.0 replaces 3.11 in the same file at the same URL.** The author asked for *the* PAD file to be 4.0 compatible, and nothing has been submitted to a catalog yet, so a single 4.0 file supersedes the 3.11 one rather than being published alongside it. Should a catalog later demand 3.11 specifically, a second revision-pinned file can be added without disturbing the primary URL.
- **The archived 4.0 field list is the specification.** With the original host gone and the specification released into the public domain, the archived machine-readable field list (`PAD_Spec_Version 4.0`, 104 fields with validation patterns) is treated as the authoritative contract. Its recovery is already verified; the plan phase vendors it.
- **Optional sections describing defunct services are omitted, not stubbed** — certification, ASP membership, ShareIt/PayPro affiliate data, press release, news feed. They are optional under 4.0, the project has nothing truthful to put in them, and stubbing them would add elements no catalog needs.
- **Social and video URL fields are omitted** because the project has no social pages or product video today. If either appears later it is a one-line addition, not a re-specification.
- **The 3.11-era deviation is resolved in 4.0's favour.** Feature 005 knowingly used a post-2010 operating-system token (`Win11 x64`) outside the frozen enumeration and documented the trade-off. This feature reverses that decision in favour of `WinOther`, because "compliant with 4.0" is now the stated requirement. The build gate's extended operating-system token list from 005 is therefore retired along with it.
- **Description texts, keywords, permissions and EULA carry over unchanged.** Their 4.0 length and content patterns are already satisfied; this feature is not an editorial pass on the descriptions.
- **The screenshot and icon assets remain the current temporary placeholders**, as recorded for 005. Their URLs already satisfy the 4.0 image-extension patterns; replacing the images themselves is out of scope here.
- **Element order is corrected even though the archived validator is path-driven.** Following the specification's own sequence costs nothing and removes the risk that a sequence-driven importer or a future schema-based validator rejects the file.
