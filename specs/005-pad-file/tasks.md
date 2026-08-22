# Tasks: PAD File for Software Catalogs

**Input**: Design documents from `/specs/005-pad-file/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pad-file.md, quickstart.md

**Tests**: Not requested — the project has no test framework. Verification = the build gate (itself an implementation task) plus the red/green scenarios from quickstart.md, encoded below as verification tasks.

**Organization**: Tasks are grouped by user story so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1] submit via URL · [US2] automatic updates · [US3] Czech + English descriptions

## Phase 1: Setup

**Purpose**: The one new datum every later task builds on.

- [X] T001 Add `"installerSizeBytes"` to `src/_data/site.json` with the **real** byte size of the v0.1.4 installer asset (`tandemcommander-0.1.4-x64-setup.exe` on the GitHub release page — exact bytes, not the rounded MB display; ask the author if the exact value is not visible). Place it next to `version`/`releaseDate` per data-model.md §1.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared single-source installer helper both the PAD template and the download button consume (FR-005). Blocks US1.

- [X] T002 Create `src/_data/installer.js` exporting `{ fileName, url }` derived from `./site.json` (`tandemcommander-{version}-x64-setup.exe`; `{github.repoUrl}/releases/download/v{version}/{fileName}`) — exactly the construction currently inlined in `src/_includes/sections/download.njk` (data-model.md §2).
- [X] T003 Refactor `src/_includes/sections/download.njk` to read `installer.fileName` / `installer.url` instead of building the strings inline; run `npm run build` and confirm the download link and file-name line in `public/index.html` (and `public/cs/index.html`) are byte-identical to before.

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Submit the program to a catalog with just a URL (Priority: P1) 🎯 MVP

**Goal**: A complete, valid, English-described PAD file published at `https://tandemcommander.org/pad.xml`, gate-protected so an invalid file can never ship.

**Independent Test**: `npm run build` succeeds; `public/pad.xml` matches [contracts/pad-file.md](contracts/pad-file.md); `npm run preview` serves it at `/pad.xml` (quickstart steps 1 + 4).

> Note: T005 (Czech texts) belongs to this phase even though the *template* uses them only in US3 — the existing i18n **parity gate** fails any build where `en.json` has `pad.*` keys and `cs.json` does not. Both catalogs must gain the keys together.

- [X] T004 [P] [US1] Add the `pad` namespace to `src/_data/i18n/en.json`: `pad.keywords` (≤250, comma-separated), `pad.desc45` (≤45), `pad.desc80` (≤80), `pad.desc250` (≤250), `pad.desc450` (≤450), `pad.desc2000` (≤2000) — plain text, no markup, seeded from `hero.tagline` / `meta.description` / features & project sections per data-model.md §3.
- [X] T005 [P] [US1] Add the same `pad.*` keys to `src/_data/i18n/cs.json` with real Czech translations (consistent with the site's existing Czech texts; same length caps apply to the Czech strings; flag for author review).
- [X] T006 [US1] Create `src/_data/pad.js` computing the derived PAD values per data-model.md §6: `releaseMonth`/`releaseDay`/`releaseYear` (zero-padded split of `site.releaseDate`), `fileSizeBytes`/`fileSizeK` (round(bytes/1024))/`fileSizeMB` (2 decimals), and `changeInfo` = English `whatsNew.entry*Title` values from `./i18n/en.json` enumerated in numeric order and joined with `"; "` (research R6). Depends on T001.
- [X] T007 [US1] Create `src/pad.njk` with front matter `permalink: "pad.xml"` and `eleventyExcludeFromCollections: true`, emitting the full `XML_DIZ_INFO` tree exactly per [contracts/pad-file.md](contracts/pad-file.md) — **English description block only in this phase** — using `site`/`installer`/`pad` data, the `t` filter with `"en"` for descriptions, the PAD-only constants from data-model.md §5, and the UTF-8 XML declaration. Author the `Distribution_Permissions` and `EULA` texts per research R11. Depends on T002, T004, T006.
- [X] T008 [US1] Add the PAD validation gate to `eleventy.config.js`: a transform scoped to the `pad.xml` output implementing contract gate rules 1–7 (well-formed tree, required fields non-empty, length caps, enum membership incl. the modern OS tokens, zero-padded date consistency with `site.releaseDate`, https URL shape, screenshot/icon files exist in `src/assets/`, File_Size_K/MB recompute from Bytes, no `<` in text values, plausible `installerSizeBytes` range). Validate **every present** language block generically; required-blocks list = `["English"]` for now (US3 extends it). Throw `pad: <element>: <reason>` — same style as the i18n gates. Depends on T007.
- [X] T009 [US1] Verify quickstart steps 1 + 4: green build, `public/pad.xml` contract spot-checks (version, date split, size, `Primary_Download_URL` equals the page's download link), `npm run preview` → `GET /pad.xml` returns the XML. Depends on T008.
- [X] T010 [P] [US1] Document the PAD file in `README.md`: its purpose, the permanent URL `https://tandemcommander.org/pad.xml`, and the warning that the URL must never change once submitted to catalogs (FR-010).

**Checkpoint**: An English-only PAD is complete, valid, served locally — submittable in principle.

---

## Phase 4: User Story 2 — A new release updates the PAD file automatically (Priority: P2)

**Goal**: Proof that the release routine alone (edit `site.json`, deploy) keeps the PAD current, and that the gate blocks every invalid state (FR-006, FR-008).

**Independent Test**: Quickstart steps 2 + 3 pass — every red-build edit fails naming the field; the release simulation updates `public/pad.xml` with zero edits outside `site.json`.

- [X] T011 [US2] Run the red-build battery from quickstart step 2 against `src/_data/site.json`, `src/_data/i18n/cs.json`, `src/_data/i18n/en.json` (each temporary edit → `npm run build` fails naming the field → revert): missing `installerSizeBytes`; `installerSizeBytes` `"abc"` and `12`; over-length `pad.desc45` (cs); deleted `pad.keywords` (cs only → parity gate); `<b>x</b>` in `pad.desc80`. Fix the gate in `eleventy.config.js` where any case slips through.
- [X] T012 [US2] Run the release simulation from quickstart step 3: bump `version`/`releaseDate`/`installerSizeBytes` in `src/_data/site.json` → `npm run build` → confirm `public/pad.xml` shows the new version, date split, sizes, and a `v0.1.5` download URL with zero other edits → revert.
- [X] T013 [P] [US2] Document the release routine in `README.md`: a release = update `version`, `releaseDate`, `installerSizeBytes`, and the What's New texts, then `npm run deploy` — the PAD file (version, date, size, download URL, changelog) updates itself from these (FR-006, data-model.md §1).

**Checkpoint**: Updates are automatic and the gate is proven; US1 remains intact.

---

## Phase 5: User Story 3 — Czech and English descriptions in one file (Priority: P3)

**Goal**: The published PAD carries a complete Czech description block alongside English (FR-004); diacritics survive to the consumer.

**Independent Test**: `public/pad.xml` contains `<Czech>` with all six fields, real Czech text, intact diacritics, within caps (quickstart step 1, Czech aspects).

- [X] T014 [US3] Add the `<Czech>` block to `src/pad.njk` — same six fields rendered via the `t` filter with `"cs"` (`pad.keywords`…`pad.desc2000`), sibling of `<English>` per the contract. Texts already exist from T005.
- [X] T015 [US3] Extend the required-language list in the `eleventy.config.js` PAD gate to `["English", "Czech"]` so a future removal of the Czech block fails the build.
- [X] T016 [US3] Verify: `npm run build`, inspect `public/pad.xml` — both blocks complete, Czech diacritics intact (UTF-8, no entities/mojibake), caps hold; `npm run preview` → fetch `/pad.xml` and re-check diacritics in the served bytes. Depends on T014, T015.

**Checkpoint**: All three user stories functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 Full quickstart pass (steps 1–5 locally: green build, red battery spot-check, release simulation, preview fetch) and commit the source changes together with the rebuilt committed `public/` output, per the project's build-output-is-committed convention.
- [ ] T018 Deploy (`npm run deploy`) and verify SC-005 per quickstart step 5: `curl https://tandemcommander.org/pad.xml` returns the XML; screenshot and icon URLs referenced by the PAD respond 200. **Precondition note**: current screenshots are temporary placeholders (memory: pending-final-assets) — deploying the PAD is fine, but coordinate timing with the author if final assets are imminent.
- [ ] T019 Catalog submission — **author-performed** (requires the author's slunecnice.cz login; quickstart step 7): submit `https://tandemcommander.org/pad.xml` via "Nahrát URL s PAD souborem" at slunecnice.cz **after final assets are deployed**; verify the form pre-fills (SC-001) and the listing shows Czech text (SC-004); record any field slunečnice still demands manually as a follow-up issue.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: independent of T001 (different files) but completes before user stories
- **US1 (Phase 3)**: needs T001 (for T006) and T002 (for T007)
- **US2 (Phase 4)**: needs US1 complete (exercises the gate and template)
- **US3 (Phase 5)**: needs US1 complete (extends the template); independent of US2
- **Polish (Phase 6)**: needs all stories; T018 → T019 in order

### Task-level notes

- T003 depends on T002 · T006 on T001 · T007 on T002+T004+T006 · T008 on T007 · T009 on T008 · T016 on T014+T015
- US2 and US3 can run in parallel after US1 (different concerns; only T015 touches the gate — coordinate if simultaneous with T011 gate fixes).

### Parallel Opportunities

```text
Wave 1: T001 ∥ T002          (different files)
Wave 2: T003 ∥ T004 ∥ T005   (template refactor ∥ two i18n catalogs)
Wave 3: T006 → T007 → T008 → T009, with T010 ∥ anytime
Wave 4: (T011, T012, T013) ∥ (T014, T015, T016)   (US2 ∥ US3, gate edits coordinated)
```

---

## Implementation Strategy

**MVP first (US1)**: Phases 1–3 alone give a valid, published, English-described PAD — already submittable. Stop and validate at the Phase 3 checkpoint.

**Incremental delivery**: Phase 4 proves the update automation (the feature's second half), Phase 5 adds the Czech block, Phase 6 deploys and hands the URL to slunecnice.cz. Each checkpoint leaves the site deployable — the gate guarantees no intermediate state can publish a broken PAD.

**Single-developer reality**: this is a solo project; the parallel waves above mainly show safe ordering, not required staffing.

## Notes

- The PAD texts (T004/T005, Permissions in T007) need author review — they are catalog-facing copy.
- T019 cannot be performed by an agent (author login required); everything before it can.
- Total: 19 tasks — US1: 7 · US2: 3 · US3: 3 · Setup/Foundational: 3 · Polish: 3.
