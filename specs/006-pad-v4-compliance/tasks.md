# Tasks: PAD 4.0 Compliance for the Published PAD File

**Input**: Design documents from `/specs/006-pad-v4-compliance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pad-file.md, quickstart.md

**Tests**: Not requested — the project has no test framework and this feature does not introduce one. Verification = the build gate (itself an implementation task), the independent reference checker at [contracts/pad-check.reference.js](contracts/pad-check.reference.js), and the red/green battery from quickstart.md, encoded below as verification tasks.

**Organization**: Tasks are grouped by user story so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1] the file passes as PAD 4.0 (P1) · [US2] listings stay truthful (P1) · [US3] the gate enforces 4.0 (P2)

## ⚠️ Read before starting: the build goes red mid-phase, by design

The gate shipped by 005 pins `MASTER_PAD_VERSION` to `/^3\.11$/` (`eleventy.config.js:139`) and requires `City_Town`, `Sales_Email` and `General_Email` to exist. So **the template edits and the gate rewrite cannot land separately** — either one alone breaks `npm run build`. Phase 3 is therefore a single atomic increment (T006–T010) and must be committed as one commit. Phases 1 and 2 are deliberately designed to be non-breaking so the build stays green up to that point.

The end state is already proven: research R7 applied all six fixes plus the reordering to today's output and measured **65 present & valid, 0 violations, 39 absent**. Implementation is transcription, not exploration.

---

## Phase 1: Setup

**Purpose**: Get the specification into the repository, verified.

- [X] T001 Create `vendor/` at the repository root and fetch the PAD 4.0 specification into `vendor/pad-4.0-spec.xml` per quickstart.md step 0: `curl -sSL -o vendor/pad-4.0-spec.xml "http://web.archive.org/web/20180118232330if_/http://repository.appvisor.com/padspec/files/padspec.xml"`. Verify **all four** invariants before continuing — sha256 `cb2107e31186caf09f5db57303828d772b9e6ce063c739456d942f1ff94768f6`, 52258 bytes, 104 `<Field>` entries, `<PAD_Spec_Version>4.0`. If the archive is unreachable or any invariant differs, copy the byte-identical preserved copy [contracts/pad-4.0-spec.reference.xml](contracts/pad-4.0-spec.reference.xml) instead and re-verify.
- [X] T002 Run `npm run build` and confirm two things: the build is still green (nothing consumes the new file yet), and `public/` contains **no** copy of the spec — `vendor/` sits outside Eleventy's `input: "src"` and outside every `addPassthroughCopy` root (`src/root`, `src/assets`, `src/fonts`, `src/css`, `src/js`), so the spec must never reach the published site.

**Checkpoint**: The specification is vendored and verified; the build is unchanged and green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the spec reader as new, unused code so it can be developed and sanity-checked without breaking the build. Nothing here changes validation behaviour yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Generalise `padParse` in `eleventy.config.js:213-246` to take the expected root element name as a parameter instead of hardcoding `XML_DIZ_INFO` (currently line 241-243), so the same minimal parser reads both `pad.xml` and the vendored spec. Both documents are attribute-free paired-tag XML — verified, the spec file contains zero tags with attributes. Keep the existing call site working (`padParse(xml, fail, "XML_DIZ_INFO")`). Build stays green.
- [X] T004 Add `readPadSpec()` to `eleventy.config.js`, placed above the PAD gate section, returning `{ specVersion, rules, knownPaths }` from `vendor/pad-4.0-spec.xml` per data-model.md §1:
  - `specVersion` = the `PAD_Spec_Version` text (expected `4.0`).
  - `rules` = a `Map` **keyed by the full path with the leading `XML_DIZ_INFO/` stripped** — keying by path, not by `Name`, is mandatory: `Keywords` appears at two different paths (`Program_Descriptions/English/Keywords` and `Press_Release/Keywords`) with different constraints.
  - Each rule holds `{ pattern, doc }` where `doc` = `RegExDocumentation` (quoted verbatim in failure messages) and `pattern` = the `RegEx` entity-decoded via the existing `padDecode` (the patterns contain `&lt;` inside negated classes such as `[^<\x09]`), with `\Z` replaced by `$`, compiled as a `RegExp`.
  - **An empty `<RegEx>` means "no constraint"** — store `pattern: null`, never `new RegExp("")`, which matches everything and would silently pass. Exactly 9 fields are affected (the eight `Affiliates_*` fields and `ASP_Member_Number`).
  - `knownPaths` = a `Set` of all rule keys.
  - Throw a clear error if the file is missing or unparseable, if `PAD_Spec_Version` is not `4.0`, if fewer than 104 fields are found, or if any non-empty pattern fails to compile.
- [X] T005 Sanity-check `readPadSpec()` in isolation before wiring it in (temporary `console.log` or a scratch `node -e`, removed afterwards): expect **104 rules, 9 with `pattern: null`, 0 compile failures, `specVersion === "4.0"`**, and spot-check that `rules.get("Program_Info/Program_OS_Support").pattern.test("WinOther")` is `true` while `.test("Win11 x64")` is `false`. Build stays green.

**Checkpoint**: The spec reader works and is verified, but nothing uses it yet. The build is still green on the existing 3.11 output.

---

## Phase 3: User Story 1 — The published file passes as PAD 4.0 (Priority: P1) 🎯 MVP

**Goal**: The generated file declares PAD 4.0 and every element satisfies its 4.0 constraint — zero violations.

**Independent Test**: `npm run build` is green, then `node specs/006-pad-v4-compliance/contracts/pad-check.reference.js vendor/pad-4.0-spec.xml public/pad.xml` reports `present&valid: 65 | violations: 0 | absent: 39` (quickstart steps 1–4).

> **T006–T010 land as one commit.** The build is expected to fail between them; that is not a bug to chase. Do the gate first (T006), then the three template edits, then verify.

- [X] T006 [US1] Rewrite `validatePad` in `eleventy.config.js:248-370` to source its rules from `readPadSpec()`, and **delete** the hand-maintained tables that caused the drift: `PAD_ENUMS` (97-101), `PAD_OS_TOKENS` (103-113), `PAD_LANGUAGE_TOKENS` (114-124), `PAD_DESC_FIELDS` (125-132), `PAD_RULES` (138-201), plus the enum/token loops inside `validatePad` (lines ~299-313). Per contract gate rules 1–5 and research R2/R9:
  - For every element in the parsed output, look up its path in `rules` and check the value against `pattern` (skip when `pattern` is `null`). Failure message quotes the spec's own wording: `pad: <path>: value <json> does not match — needs: <doc>`.
  - Vocabularies (OS support, both categories, program type, release status, install support, language) now come from the patterns themselves — no lists to maintain.
  - Description-block fields derive from the six `Program_Descriptions/English/*` paths; each language block is validated against those same patterns, so the `Czech` block keeps its limits.
  - A language block name is valid iff it matches the `Program_Info/Program_Language` pattern **and contains no comma** (the pattern permits comma-separated lists, which is meaningless for a block name).
  - Keep `PAD_REQUIRED_LANGUAGES` (line 95) — required blocks are a project decision, not a spec rule.
  - Keep every 005 cross-check that encodes project facts the spec cannot know (contract gate rules 6–10): required-and-non-empty elements, zero-padded dates matching `site.releaseDate`, `File_Size_Bytes` equal to `installerSizeBytes` and in the plausible 100 KB – 1 GB range, `File_Size_K`/`File_Size_MB` recomputed, `Application_XML_File_URL` equal to `{site.url}/pad.xml`, screenshot and icon files present in `src/assets/`, `Expire_*` empty while `Has_Expire_Info` is `N`, no BOM, UTF-8 declaration present.
- [X] T007 [US1] In `src/pad.njk`, change the three values per data-model.md §2: `MASTER_PAD_VERSION` `3.11` → `4.0`; `Program_OS_Support` `Win11 x64` → `WinOther` (FR-003, research R5); `Program_Specific_Category` `System Utilities` → `Utilities` (FR-004). Leave `Program_Category_Class` alone — `System Utilities::File & Disk Management` is already valid 4.0.
- [X] T008 [US1] In `src/pad.njk`, delete the three elements whose 4.0 patterns reject an empty value (data-model.md §3): `<City_Town>`, `<Sales_Email>`, `<General_Email>`. Leave the other 20 empty elements in place — their patterns permit empty and importers expect the tree. Do not invent values (FR-005).
- [X] T009 [US1] In `src/pad.njk`, resequence `Program_Info` to the 4.0 field order (data-model.md §4, FR-007): move the `File_Info` and `Expire_Info` blocks up to sit immediately after `Program_Language`, and swap `Program_Category_Class` before `Program_Specific_Category`. Final order: `Program_Name`, `Program_Version`, `Program_Release_Month`, `Program_Release_Day`, `Program_Release_Year`, `Program_Cost_Dollars`, `Program_Cost_Other_Code`, `Program_Cost_Other`, `Program_Type`, `Program_Release_Status`, `Program_Install_Support`, `Program_OS_Support`, `Program_Language`, `File_Info`, `Expire_Info`, `Program_Change_Info`, `Program_Category_Class`, `Program_Specific_Category`, `Program_System_Requirements`. No other section needs reordering.
- [X] T010 [US1] Verify quickstart steps 1–4: `npm run build` green; the step-2 greps confirm `4.0` / `WinOther` / `Utilities` and zero hits for `City_Town|Sales_Email|General_Email`; the step-3 order check matches T009's list exactly; and the independent checker reports `violations: 0` with `present&valid: 65`, `absent: 39`. Commit T006–T010 together with the rebuilt `public/pad.xml`.

**Checkpoint**: The published file is PAD 4.0 compliant and the build enforces the format from the vendored spec. This alone satisfies the author's request.

---

## Phase 4: User Story 2 — Catalog listings still describe the program truthfully (Priority: P1)

**Goal**: Nothing in the file is false, and a catalog visitor can still see that the program needs Windows 11 on x64 — despite the OS field no longer being able to say so.

**Independent Test**: Read every field of the built file against the shipped v0.1.4 installer; confirm "Windows 11" and 64-bit are stated in a displayed field; confirm both description blocks are complete with intact diacritics.

- [ ] T011 [US2] Field-by-field truthfulness pass over `public/pad.xml` (FR-003, spec US2 scenario 1): confirm `Program_System_Requirements` still reads `Windows 11, x64` — it is now the **only** field stating the real platform, so it carries the weight the OS field used to; confirm no field claims support for an OS the program does not have (in particular that `WinOther` was used rather than a specific older Windows token); confirm no placeholder or invented value appears anywhere, especially in the three elements removed in T008.
- [ ] T012 [US2] Verify both description blocks survived the upgrade intact (FR-008, spec US2 scenario 3): `English` and `Czech` each present with all six fields non-empty, and Czech diacritics intact in the built bytes **and** in the served bytes — `npm run preview`, then fetch `/pad.xml` and confirm the Czech text renders correctly with no entities or mojibake (quickstart step 7).
- [ ] T013 [P] [US2] Document in `README.md` (FR-013, FR-003a): the published PAD file targets **PAD 4.0**, validated at build time against the vendored `vendor/pad-4.0-spec.xml`; and record the standing rule — *PAD 4.0's operating-system vocabulary is frozen and has no Windows 10/11 token, so `Program_OS_Support` uses the generic `WinOther` and the real requirement lives in `Program_System_Requirements`; never pick a lower Windows token to look more specific, because that publishes a false compatibility claim.* This rule applies unchanged to future Windows releases.

**Checkpoint**: The file is both compliant and honest, and the reasoning is recorded for the next release.

---

## Phase 5: User Story 3 — The build gate enforces 4.0, not 3.11 (Priority: P2)

**Goal**: The next edit cannot silently reintroduce a 3.11-only value or a typo'd element. Adds the two enforcement guarantees the format's own patterns cannot provide, then proves the whole gate with the red battery.

**Independent Test**: Each of the 13 quickstart step-5 defects, introduced one at a time, fails `npm run build` with a message naming the offending element; the unmodified build is green.

- [ ] T014 [US3] Add the version pin to `validatePad` in `eleventy.config.js` (contract gate rule 2): assert the output's `MASTER_PAD_VERSION` equals `readPadSpec().specVersion`. This is the one defect the spec's own patterns cannot catch — `^\d.\d+\Z` accepts `3.11` happily, so without this check the original defect could return undetected (research R4).
- [ ] T015 [US3] Add unknown-element rejection to `validatePad` (contract gate rule 3, research R9): walk every element in the output and fail when its path is not in `knownPaths`, mapping `Program_Descriptions/<Language>/…` onto the `English` paths first. This catches a mistyped element name — which a purely path-driven validator would silently ignore — and is new protection 005 did not have.
- [ ] T016 [US3] Run the full red battery from quickstart step 5 — all 13 cases, each edit → `npm run build` fails naming the element → revert. Cases 1–6 are this feature's defects (version `3.11`, `Win11 x64`, `System Utilities`, re-added empty `City_Town`, re-added empty `Sales_Email`, a renamed element such as `<Program_Nam>`); cases 7–13 are 005's protections that must survive the gate rewrite (invalid `Program_Type`, misnamed `<Czechh>` block, deleted `<Czech>` block, over-length `pad.desc45` in `cs.json`, markup in `pad.desc80`, implausible `installerSizeBytes`, release-date mismatch). Fix the gate wherever a case slips through.
- [ ] T017 [US3] Run the release simulation from quickstart step 6 (FR-011, SC-005): bump `version`, `releaseDate` and `installerSizeBytes` in `src/_data/site.json` → `npm run build` → confirm `public/pad.xml` shows the new version, the matching `v<version>` download URL and the new size trio, still with zero violations and **zero PAD-specific edits** → revert.

**Checkpoint**: All three stories are complete and the format contract is self-enforcing.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Remove any leftover scaffolding from Phase 2 (the T005 sanity-check logging) and confirm no hand-maintained PAD vocabulary list survives anywhere in `eleventy.config.js` — a leftover table is the exact failure mode this feature exists to remove. Net line count of the PAD gate section should be *lower* than before (plan.md: ~115 lines of tables replaced by a ~30-line reader).
- [ ] T019 Full quickstart pass (steps 1–7 locally) and commit the source changes together with the rebuilt committed `public/` output, per the project's build-output-is-committed convention.
- [ ] T020 Deploy (`npm run deploy`) and verify quickstart step 8 (SC-006): `curl https://tandemcommander.org/pad.xml` returns the 4.0 file at the unchanged URL; the referenced screenshot and icon URLs respond 200. This supersedes 005's open T018. **Precondition**: screenshots are still temporary placeholders (memory: pending-final-assets) — deploying the PAD file is fine, but coordinate timing with the author if final assets are imminent.
- [ ] T021 Catalog submission — **author-performed** (requires the author's slunecnice.cz login; quickstart step 9): submit `https://tandemcommander.org/pad.xml` via "Nahrát URL s PAD souborem" **after final assets are deployed**, now with a PAD 4.0 file rather than the 3.11 one. Verify the form pre-fills (SC-001 of spec 005) and the listing shows Czech text; record any field the catalog still demands manually as a follow-up. This supersedes 005's open T019.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on T001 (the spec file must exist). **Blocks all user stories.**
- **User Story 1 (Phase 3)**: depends on Phase 2. Delivers the compliance the author asked for.
- **User Story 2 (Phase 4)**: depends on Phase 3 — it inspects the file US1 produces. T013 (README) has no code dependency and can be written any time after the `WinOther` decision.
- **User Story 3 (Phase 5)**: depends on Phase 3 (the gate must exist to be hardened and exercised). Independent of Phase 4.
- **Polish (Phase 6)**: depends on Phases 3–5.

### Story Independence

Unlike a typical feature, **US1 and US2 share one artifact** and US2 is largely verification of it — it cannot precede US1. US3 is genuinely separable: US1 already yields a compliant file; US3 guarantees it stays that way. Stopping after Phase 3 delivers the author's request; stopping after Phase 4 delivers it defensibly documented; Phase 5 makes it durable.

### Within Phase 3

T006 (gate) → T007, T008, T009 (all edit `src/pad.njk`, so strictly sequential) → T010 (verify). The build is red until all four land; commit them together.

### Parallel Opportunities

Genuinely limited — this feature touches two files. Only two tasks carry `[P]`:

- **T013** (`README.md`) is parallel to everything in Phases 4–5; it edits a file no other task touches.
- **T018** (cleanup sweep) is parallel to T019's quickstart pass.

Phase 2's T003 and T004 both edit `eleventy.config.js` in different regions and could be done by one person in either order, but they are not marked `[P]` because they collide in the same file. T007–T009 likewise all edit `src/pad.njk`.

---

## Implementation Strategy

### MVP (Phases 1–3)

1. Phase 1 — vendor and verify the spec.
2. Phase 2 — build the spec reader, keeping the build green.
3. Phase 3 — swap the gate and fix the template in one commit.
4. **STOP and VALIDATE**: independent checker reports `violations: 0`. The published file is PAD 4.0 compliant. This is a shippable answer to the author's request.

### Incremental delivery

- **+ Phase 4** — truthfulness confirmed, the `WinOther` rule recorded for future releases.
- **+ Phase 5** — the gate pins the version and rejects unknown elements; the 13-case battery proves it.
- **+ Phase 6** — deploy, then catalog submission (closing 005's two open tasks).

### Risk notes

- The one-commit constraint in Phase 3 is the only awkward part of the sequence; it comes from 005's gate pinning `3.11`, and there is no ordering that avoids it.
- Nine spec fields carry an empty `<RegEx>`. Compiling those as `new RegExp("")` would make them match anything — a silent hole. T004 handles it; T005 verifies the count is exactly 9.
- Keying rules by `Name` instead of `Path` collides on `Keywords`. T004 calls this out explicitly.
