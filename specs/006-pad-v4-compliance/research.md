# Phase 0 Research: PAD 4.0 Compliance

All findings below were established by measurement against the recovered PAD 4.0 specification, not by recollection. Reproduction commands are in [quickstart.md](quickstart.md).

## Sources

- **PAD 4.0 machine-readable specification** — `PAD_Spec` / `PAD_Spec_Version 4.0`, 104 `<Field>` entries, each carrying `Name`, `Path`, `Title`, `ShortDescription`, `RegExDocumentation` and `RegEx`. Recovered from the Internet Archive: `http://web.archive.org/web/20180118232330if_/http://repository.appvisor.com/padspec/files/padspec.xml` (snapshot 2018-01-18). 52,258 bytes, sha256 `cb2107e31186caf09f5db57303828d772b9e6ce063c739456d942f1ff94768f6`. Preserved in this feature at [contracts/pad-4.0-spec.reference.xml](contracts/pad-4.0-spec.reference.xml).
- **PAD 4.0's status** — the Association of Software Professionals dissolved in 2021 and released the final specification, v4.0, into the public domain in January 2022 (asp-software.org historical archive). The original spec host `pad.asp-software.org` no longer resolves; `repository.appvisor.com` is a parked domain. There is no live official validator.
- **Existing implementation** — `src/pad.njk`, `src/_data/pad.js`, and the PAD gate in `eleventy.config.js:85-201` from feature [005-pad-file](../005-pad-file/spec.md).

---

## R1 — Which document defines "PAD 4.0 compliant"?

- **Decision**: The vendored `PAD_Spec_Version 4.0` field list is the contract. Compliance = every element the file emits satisfies the `RegEx` for its `Path`, and every element the file emits is a known 4.0 path.
- **Rationale**: It is the specification's own machine-readable form — the same artifact third-party PAD validators consumed while the service was alive. It is unambiguous (104 paths, 104 patterns), it is frozen (the spec is final), and it removes all judgement from the question the author asked.
- **Alternatives considered**:
  - *An XSD schema* — rejected: no PAD 4.0 XSD is archived (`pad.asp-software.org/spec/pad_spec.xsd` has no Wayback snapshot), and validating against one would need a new dependency.
  - *A live third-party validator* — rejected: the surviving open-source validator fetches the spec from the now-parked `repository.appvisor.com`, so it is inoperable; and FR-010 forbids depending on a remote host.
  - *Continue hand-maintaining rules, just updated to 4.0* — rejected: hand transcription is exactly what produced the current drift (a 3.11 table with locally invented OS tokens). See R2.

## R2 — How should the build gate obtain its rules?

- **Decision**: Vendor the spec file at `vendor/pad-4.0-spec.xml` and **derive the rules at build time** by parsing it. Delete the hand-maintained `PAD_RULES`, `PAD_ENUMS`, `PAD_OS_TOKENS` and `PAD_LANGUAGE_TOKENS` tables from `eleventy.config.js`.
- **Rationale**: One source of truth for the format, mirroring the project's existing single-source-of-truth discipline for program facts. Enumerations (operating systems, categories, languages, program type, release status, install support) stop being separate hand-typed lists and become part of the field's own pattern, so a value outside a vocabulary fails automatically with no list to maintain. It also makes FR-010 literal: the specification data lives in the repository and the build reads it.
- **Trade-off accepted**: the gate's error messages now quote the spec's `RegExDocumentation` (e.g. *"Text string 2-40 characters"*) rather than a hand-written sentence. Measured on the real defects, these messages are more informative, not less.
- **Alternatives considered**:
  - *Generate a JS rule module once from the spec and commit that instead* — viable, since PAD 4.0 is frozen and can never change. Rejected as strictly worse: it keeps two artifacts in the repo that can disagree, for no gain, and it costs a build step.
  - *Vendor the spec but keep hand-written rules alongside it* — rejected: the drift risk returns immediately.

## R3 — Do the spec's regexes work in JavaScript?

- **Decision**: Yes, after one substitution: the patterns are .NET-flavoured and terminate with `\Z` (end of input), which becomes `$` in JavaScript with no `/m` flag. Nine fields (the eight `Affiliates_*` fields and `ASP_Member_Number`) carry an **empty** `RegEx`, meaning no constraint — the gate must treat an empty pattern as "any value permitted" rather than compiling `new RegExp("")`, which matches everything and would silently pass.
- **Rationale**: Verified by compiling all 104 patterns in Node v24 — **0 compile failures** — and by reproducing the verdict on the current `public/pad.xml` identically in two independent implementations (Python `re` with a real XML parser, and JS with a minimal tree walk): 63 present & valid, 5 violations, 36 absent in both.
- **Notes for implementation**: The spec's `RegEx` values are XML-escaped (`&lt;` for the `<` that appears in negated classes such as `[^<\x09]`), so they must be entity-decoded before compiling. `$` without `/m` asserts true end-of-input in JavaScript, so the `\Z` translation is exact.
- **Alternatives considered**: *Translating the patterns into hand-written checks* — rejected, that is R2's rejected option in disguise.

## R4 — What exactly is non-compliant today?

Measured against all 104 patterns. **Five pattern violations plus one semantic defect:**

| Element | Current value | 4.0 requirement | Fix |
|---------|---------------|-----------------|-----|
| `MASTER_PAD_VERSION` | `3.11` | Declares which revision the file complies with | → `4.0` |
| `Program_OS_Support` | `Win11 x64` | Token from the frozen 4.0 OS vocabulary | → `WinOther` (R5) |
| `Program_Specific_Category` | `System Utilities` | One of `Audio`, `Business`, `Development Tools`, `Education`, `Games`, `Graphics`, `Home/Hobby`, `Internet`, `Miscellaneous`, `Screen Savers`, `Utilities` | → `Utilities` |
| `Company_Info/City_Town` | *(empty)* | Text string 2–40 characters | omit the element |
| `Support_Info/Sales_Email` | *(empty)* | E-mail address | omit the element |
| `Support_Info/General_Email` | *(empty)* | E-mail address | omit the element |

The version stamp is the one defect the patterns cannot catch: `^\d.\d+\Z` accepts `3.11` happily. The gate must therefore assert the declared revision equals the vendored spec's own `PAD_Spec_Version`, which ties the two together permanently.

**`Program_Category_Class` is already valid 4.0** — `System Utilities::File & Disk Management` is a member of that field's (separate, two-level) vocabulary. The two category fields use different vocabularies; only the specific-category one is wrong.

## R5 — The Windows 11 gap

- **Decision**: `Program_OS_Support` = `WinOther`. Per the spec's clarification session, this is a standing rule for any future Windows release with no PAD 4.0 token, not a one-off.
- **Rationale**: The 4.0 OS vocabulary was frozen around 2012; its newest Windows members are `Windows 8`, `Windows RT` and `Windows Phone 7`/`8`, plus the generic `WinOther`, `Other` and `Not Applicable`. There is no Windows 10 or Windows 11 token and there never will be. `WinOther` is the only member that is both legal and true. The real requirement stays visible to catalog visitors in `Program_System_Requirements` (`Windows 11, x64`, free text up to 100 characters) and throughout the descriptions.
- **Alternatives considered**:
  - *Keep `Win11 x64`* — rejected by the author: it is precisely the non-compliance this feature exists to remove. (005 had accepted it deliberately, with the extended token list at `eleventy.config.js:105-114`; that list is now deleted.)
  - *`Windows 8, WinOther`* — rejected: asserts Windows 8 support the program does not have.
  - *`Other`* — legal, but `WinOther` is the Windows-specific generic and strictly more informative.

## R6 — Omit or emit-empty?

- **Decision**: Emit an element empty **only** where its own 4.0 pattern accepts an empty string; otherwise omit it entirely. Never invent a value.
- **Rationale**: Measurement shows 4.0 is not uniform about this. Of the elements the current file emits empty, **20 are legal empty** (`Address_1`, `Address_2`, `State_Province`, `Zip_Postal_Code`, the four phone fields, `Program_Cost_Other_Code`, `Program_Cost_Other`, all six `Expire_*` fields, `Application_Order_URL`, `Secondary_Download_URL`, `Additional_Download_URL_1`/`_2`) and **3 are not** (`City_Town`, `Sales_Email`, `General_Email`). Keeping the legal-empty elements preserves 005's "importers expect the full tree" convention at zero compliance cost; dropping the three illegal ones is the only compliant option.
- Of the 36 elements absent from the file today, **4 have patterns that forbid an empty value** — `CERTIFIED`, `PublisherID`, `AppID`, `ASP_Member` — so they can only ever be omitted or carry a real value. `PublisherID` (`^pid-[0-9a-z]{12}$`) and `AppID` (`^app-[0-9a-z]{12}$`) require identifiers issued by the defunct AppVisor registry, so **omission is permanent**, satisfying FR-006.
- **Alternatives considered**: *Emit the complete 104-element tree with empty values* — rejected, and not merely on taste: it is impossible. Five of the fields reject an empty string outright, so a "complete" tree is a non-compliant tree.

## R7 — Does the plan actually reach zero violations?

- **Decision**: Yes — verified before implementation.
- **Method**: A pre-flight script applied all six fixes plus the R8 reordering to the current `public/pad.xml`, then validated the result against all 104 patterns.
- **Result**: **65 present & valid, 0 violations, 39 absent.** All 39 absent elements are optional; 7 of them have patterns forbidding empty values and so must stay omitted (`CERTIFIED`, `PublisherID`, `City_Town`, `Sales_Email`, `General_Email`, `AppID`, `ASP_Member`).
- **Consequence for implementation**: the template edits are known-good in advance; the work is transcription plus the gate rewrite, not exploration.

## R8 — Element order

- **Decision**: Resequence `Program_Info` to the 4.0 field order: … `Program_OS_Support`, `Program_Language`, **`File_Info`, `Expire_Info`, `Program_Change_Info`, `Program_Category_Class`, `Program_Specific_Category`**, `Program_System_Requirements`. Current output emits `Program_Change_Info`, `Program_Specific_Category`, `Program_Category_Class`, `Program_System_Requirements` first and only then `File_Info` and `Expire_Info`.
- **Rationale**: FR-007. Costs nothing, and removes the risk that a sequence-driven importer or any future schema-based validator rejects the file. Verified in the R7 pre-flight.
- **Note**: the vendored field list is a flat path list, so the gate itself is order-agnostic — the two `Video_Link_*` fields appear in it *after* the `Download_URLs` block despite living inside `Application_URLs`, confirming the list is not a strict document-order description. Order is therefore a template concern verified by inspection (quickstart step 3), not a gate rule. All other sections already match: top-level order, `Company_Info`, `Support_Info`, and `Web_Info` (`Application_URLs` then `Download_URLs`) need no change.

## R9 — What the gate must check beyond the spec's patterns

The vendored spec constrains values but says nothing about which elements must be *present* — it carries no optionality flag. The gate therefore keeps two layers:

1. **4.0 conformance** (derived from the vendored spec): every emitted element's value matches its path's pattern; the declared `MASTER_PAD_VERSION` equals the vendored `PAD_Spec_Version`; **no element is emitted whose path is unknown to 4.0** (this is new — it catches a mistyped element name that a path-driven validator would silently ignore).
2. **Project completeness** (a short local list, carried over from 005's intent — FR-008): the elements a catalog listing actually needs are present and non-empty — program name, version, the three release-date parts, cost, type, release status, install support, OS support, language, the three file sizes, change info, both category fields, system requirements, company name, country, company website, the six contact fields, support e-mail, the four required application URLs plus the self-reference, primary download URL, distribution permissions, EULA — and both the `English` and `Czech` description blocks are complete.

Retained from 005 and still required: cross-checks that are stricter than the format (release date parts agree with `site.json`'s `releaseDate`; `File_Size_K`/`File_Size_MB` recompute from `File_Size_Bytes`; the plausible installer-size range; `Application_XML_File_URL` equals the canonical PAD URL; screenshot and icon files exist in `src/assets/`; `Expire_*` stay empty while `Has_Expire_Info` is `N`; no BOM; UTF-8 declaration). These encode project facts the PAD spec cannot know and are the reason the gate is not merely a spec validator.

**Per-language description blocks**: the spec enumerates description paths under `Program_Descriptions/English/` only. The gate maps every language block onto the English paths for pattern purposes, so the `Czech` block is validated with the same limits, and a block whose name is not a 4.0 `Program_Language` token is rejected. This preserves 005's behaviour and FR-008.

## Deliberately out of scope

- **`MASTER_PAD_INFO` still points at the dead `pad.asp-software.org`.** The field is free text, valid under 4.0, and FR-008 says to retain what remains valid. Repointing it at a live reference is a cosmetic follow-up, not part of compliance.
- **Screenshot and icon assets remain the current placeholders** (memory: pending final assets). Their URLs already satisfy 4.0's `.gif|.jpg|.png` patterns.
- **Description, keyword, permission and EULA texts are unchanged** — all already satisfy their 4.0 patterns.
- **Line endings**: the committed `public/pad.xml` uses CRLF on this Windows checkout. Unchanged, and irrelevant to validation.

---

## R10 — Post-implementation correction: the vendored field list is not the whole format

**Trigger**: after the 4.0 file was deployed, slunecnice.cz still rejected it with *"Zadaný PAD soubor musí být validní PAD v4.0"*. The live file was confirmed current, well-formed, and passing all 104 vendored patterns — so passing those patterns is **necessary but not sufficient**.

- **Source**: PSPad's PAD file (`http://www.pspad.com/pad_file.xml`), `MASTER_PAD_VERSION 4.0`, `MASTER_PAD_EDITOR AppVisor 1.0.43` — generated by the actual PAD 4.0 tooling for a Czech program listed on slunecnice.cz. It is the only PAD 4.0 file we can confirm a target catalog accepts, so it is treated here as the reference implementation.

**Two errors in R1–R8 that this corrects:**

1. **R1 overstated the vendored file.** It is a *validator's* field set (104 paths with patterns) and carries **no required/optional flags at all** — so nothing in the gate knew which elements must be *present*. The reference file also contains many elements the vendored list does not enumerate: `MASTER_PAD_EDITOR_URL`, `Contact_Phone`, `ASP_FORM`, `Program_Categories`, `Program_Target_Platform`, `Limitations`, `Awards`, `FacebookFanPage`, `GooglePlusFanPage`, `VideoLink1URL`, `VideoLink2URL`, `Includes_JAVA_VM`, `Includes_DirectX`, `Includes_VB_Runtime`, plus whole sections (`RoboSoft`, `Site`, `Dynamic_PAD`, and a far larger `Affiliates`). The unknown-element check from T015 therefore needed an explicit allowlist of reference-observed elements, or it would reject legitimate PAD 4.0 markup.
2. **R8's reordering had no basis.** R8 itself noted the flat `<Path>` list "is not a strict document-order description" — and then reordered `Program_Info` to match it anyway. The reference's order is materially different (`Program_Category_Class`/`Program_Specific_Category` right after `Program_Type`; `File_Info` near the end after `Awards`; `Program_Change_Info` and `Program_System_Requirements` before `Limitations`), and its `Company_Info` order differs too (`Country`, `State_Province`, `City_Town`, `Zip_Postal_Code`, `Address_1`; `Contact_*` before `Author_*`). The reference order is now authoritative for this file.

**The reference is lenient about values, strict about nothing obvious.** Its accepted file has *unpadded* release month/day (`8`, `5`), an **empty** `Program_Specific_Category`, no `Application_XML_File_URL` (commented out), and **only an `<English>` description block**. So catalog acceptance does not hinge on value strictness — which points at element *presence* as the likely cause.

**Resolution applied**: mirror the reference's element set and order for the sections that carry product information, and add the elements it fills that we had omitted (`Sales_Email`, `General_Email`, `CERTIFIED`, `CERTIFICATE_ID`, `CERTIFICATE_LICENSE`, the `ASP` block, the company social pages, `Press_Release`, and the empty `Program_Info` extras). Coverage went from 65 to 82 fields present and valid, still 0 violations.

**Deliberately still omitted**: `PublisherID`, `BrandID`, `AppID` (issued by the defunct AppVisor registry — unobtainable, and their patterns reject empty), and the `RoboSoft`, `Dynamic_PAD`, `Site`, `Affiliates` and `NewsFeed` sections (AppVisor's own submission bookkeeping, carrying no product information).

**Open**: `City_Town` requires a real city — the reference publishes a full postal address. It is the last element the reference has that we do not, and it cannot be invented (FR-005).

**Next suspect if the rejection persists**: the `<Czech>` sibling block. It is the only place our file diverges from *both* the vendored spec's enumerated paths (English only) and the reference implementation (English only). A validator built from an XSD generated off that spec would treat a `<Czech>` sibling as a schema violation. Testing that costs one edit, but it trades away the bilingual descriptions from spec 004/005.
