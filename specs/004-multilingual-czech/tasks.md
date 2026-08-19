# Tasks: Multilingual Site with Czech Localization

**Input**: Design documents from `/specs/004-multilingual-czech/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/i18n-catalog.md, contracts/language-routing.md, quickstart.md

**Tests**: Not requested — the repo has no test framework. Validation is done by build-time gates (t filter + parity check) and the quickstart.md scenarios; each story phase ends with a validation task.

**Organization**: Tasks are grouped by user story so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: [US1] Czech version at /cs · [US2] Switcher + persistence · [US3] Browser-language detection

## Phase 1: Setup

**Purpose**: Create the locale registry every other piece reads.

- [x] T001 Create locale registry `src/_data/languages.json` with the two entries (en: label "EN", url "/", ogLocale "en_US", intl "en-US", default true; cs: label "CS", url "/cs/", ogLocale "cs_CZ", intl "cs-CZ") exactly per data-model.md §1

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Move every user-visible string out of the templates into the English catalog and wire the build-time i18n machinery — after this phase the English site builds from catalogs with unchanged output (FR-012), and any story can proceed.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Implement i18n machinery in `eleventy.config.js` per contracts/i18n-catalog.md: `t` filter (`{{ lang | t("ns.key") }}`) that throws on unknown language/missing key/empty value; catalog key-parity check on `eleventy.before` (deep leaf-path comparison across all `src/_data/i18n/*.json`, error lists missing/extra keys per file); `RICH_TEXT_KEYS` allowlist; extend `releaseDate` filter with optional `Intl` locale argument (default "en-US" stays backward compatible)
- [x] T003 Create complete English catalog `src/_data/i18n/en.json`: extract every user-visible string from `src/_includes/layout.njk` and all 9 section templates into the namespaces defined in data-model.md §2 (meta, nav, hero, screens, features, whatsNew, project, story, download, footer — including aria-labels, image alt texts, lightbox labels, changelog entries); move `description` from `src/_data/site.json` to `meta.description` and delete it from site.json
- [x] T004 Add `lang: en` to the front matter of `src/index.njk`
- [x] T005 Rewire `src/_includes/layout.njk` to catalog lookups: `<html lang="{{ lang }}">`, `<title>`, meta description, og:title/og:description/og:image:alt via `t`; keep canonical/og:url/hreflang unchanged for now (T020 localizes them)
- [x] T006 [P] Rewire `src/_includes/sections/header.njk` to `t()` lookups (nav links, menu/theme aria-labels, theme button labels)
- [x] T007 [P] Rewire `src/_includes/sections/hero.njk` to `t()` lookups
- [x] T008 [P] Rewire `src/_includes/sections/screens.njk` to `t()` lookups (heading, copy, screenshot alt texts, zoom/close button labels)
- [x] T009 [P] Rewire `src/_includes/sections/features.njk` to `t()` lookups
- [x] T010 [P] Rewire `src/_includes/sections/whats-new.njk` to `t()` lookups (heading, version line, all changelog entries)
- [x] T011 [P] Rewire `src/_includes/sections/project.njk` to `t()` lookups
- [x] T012 [P] Rewire `src/_includes/sections/story.njk` to `t()` lookups
- [x] T013 [P] Rewire `src/_includes/sections/download.njk` to `t()` lookups and locale-aware date: `{{ site.releaseDate | releaseDate(localeIntl) }}` where `localeIntl` comes from the `languages.json` entry matching `lang`
- [x] T014 [P] Rewire `src/_includes/sections/footer.njk` to `t()` lookups
- [x] T015 Regression gate: run `npm run build` and compare rendered `public/index.html` text content against the pre-change version — English output must be unchanged (FR-012, quickstart V1); fix any drift before proceeding

**Checkpoint**: English site builds from catalogs, byte-equivalent content — user stories can now begin.

---

## Phase 3: User Story 1 — Czech visitor reads the site in Czech (Priority: P1) 🎯 MVP

**Goal**: A complete, correctly rendered, SEO-discoverable Czech version at `/cs/`, shareable by direct link, with the full Czech translation ready for owner review.

**Independent Test**: Open `/cs/` and verify every visible text is Czech (quickstart V1–V6, V11, V14) — no switcher or detection needed.

- [x] T016 [P] [US1] Create Czech catalog `src/_data/i18n/cs.json`: translate every `en.json` key following the conventions in contracts/i18n-catalog.md (keep "Tandem Commander", SFTP, Unicode, GPLv2, Visual Studio 2022 etc. untranslated; Czech Windows terminology; real diacritics) — this file is the owner-review deliverable (FR-011)
- [x] T017 [P] [US1] Create `src/cs/index.njk`: front matter `layout: layout.njk` + `lang: cs`, body identical to `src/index.njk` includes → outputs `public/cs/index.html`
- [x] T018 [P] [US1] Copy 7 latin-ext font files into `src/fonts/`: `archivo-latin-ext-{400,500,600,700,800}-normal.woff2` from `node_modules/@fontsource/archivo/files/` and `ibm-plex-mono-latin-ext-{400,500}-normal.woff2` from `node_modules/@fontsource/ibm-plex-mono/files/` (verified present, research R5)
- [x] T019 [US1] Update `src/css/main.css` @font-face blocks: add fontsource `unicode-range` to the 7 existing latin declarations and add 7 matching latin-ext declarations with the latin-ext ranges (depends on T018)
- [x] T020 [US1] Localize SEO surface in `src/_includes/layout.njk` per contracts/language-routing.md table: per-locale canonical + og:url from `languages.json`, three hreflang alternates (en, cs, x-default → `/`), og:locale + og:locale:alternate, and preload `archivo-latin-ext-800` only when `lang == "cs"` (depends on T005)
- [x] T021 [P] [US1] Update `src/root/sitemap.xml`: add `xmlns:xhtml` namespace, `/cs/` url entry, and `xhtml:link` hreflang alternates (en, cs, x-default) on both entries; refresh lastmod
- [x] T022 [P] [US1] Make `src/root/404.html` bilingual per contracts/language-routing.md: add `<p lang="cs">Tato stránka neexistuje.</p>` and a second link `<a lang="cs" href="/cs/">Zpět na úvod</a>` alongside the English ones; keep noindex and single-file design
- [x] T023 [US1] Validate US1: `npm run build` passes; execute quickstart V1 (both pages), V2 (metadata/hreflang), V3 (no English remnants on /cs), V4 (sitemap), V5 (fonts), V6 (parity gate: removing a cs.json key fails the build with the key named), V11 (diacritics render in Archivo/Plex Mono), V14 (bilingual 404)

**Checkpoint**: MVP — `/cs/` is complete and shareable; `cs.json` handed to the owner for review.

---

## Phase 4: User Story 2 — Visitor switches language and the choice sticks (Priority: P2)

**Goal**: "EN | CS" switcher in header and mobile menu; explicit choice stored in `tc-lang` and honored on later root visits.

**Independent Test**: Switch EN→CS via the header, close the browser, reopen `/` → Czech loads (quickstart V8–V10, V12).

- [x] T024 [US2] Add the language switcher to `src/_includes/sections/header.njk` (desktop nav and mobile menu, next to the theme toggle): `nav.lang-toggle` with `aria-label` from `nav.langLabel`, one link per `languages.json` entry with `href`, `hreflang`, `lang`, `data-set-lang`, label, and `aria-current="true"` on the current page's language — markup per contracts/language-routing.md
- [x] T025 [P] [US2] Style the switcher in `src/css/main.css`: compact segmented toggle visually consistent with `.theme-toggle`, highlighted current language, visible `:focus-visible` outline, mobile-menu variant (breakpoint 860px)
- [x] T026 [P] [US2] Add persistence handler to `src/js/main.js`: on click of `[data-set-lang]`, `try { localStorage.setItem('tc-lang', value) } catch {}` and navigate to `href + location.hash` (preserve section); default navigation must still work if JS is absent
- [x] T027 [US2] Add the stored-choice redirect to `src/_includes/layout.njk` — inline pre-paint script rendered **only when `lang == "en"`** (after the theme script): read `tc-lang` in try/catch; `"cs"` → `location.replace('/cs/' + location.search + location.hash)`; `"en"` or anything else → stay; never write to storage (contract steps 1–3 of language-routing.md)
- [x] T028 [US2] Validate US2: quickstart V8 (switch + persistence across browser restart), V9 (direct `/cs/` visit with stored "en" shows Czech, storage untouched), V10 (keyboard + aria-current), V12 (private-mode fallback), V13 (back button never bounces after redirect)

**Checkpoint**: Switching works with persistence; US1 unaffected.

---

## Phase 5: User Story 3 — First-time visitor gets their language automatically (Priority: P3)

**Goal**: Root URL detects Czech browser preference when no choice is stored and auto-redirects to `/cs/`.

**Independent Test**: Clean profile with Czech browser language → `/` lands on `/cs/`; English browser language → stays on `/` (quickstart V7).

- [x] T029 [US3] Extend the inline redirect script in `src/_includes/layout.njk` with the detection branch (contract step 4): when nothing valid is stored, take the first entry of `navigator.languages` (fallback `navigator.language`), lowercase it; if it starts with "cs" → `location.replace('/cs/' + location.search + location.hash)`; otherwise stay; wrap everything so any error leaves the page English (FR-010); still never write to storage (FR-006)
- [x] T030 [US3] Validate US3: quickstart V7 (cs preference redirects, en preference stays), edge cases: third-language browser (e.g. de,cs,en order → English), stored "en" beats cs browser preference (US3 acceptance 3), V13 back-button after detection redirect

**Checkpoint**: All three stories functional and independent.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T031 [P] Document the i18n workflow in `README.md`: where strings live (`src/_data/i18n/`), the strict-parity build gate, and the three steps to add a language (registry entry + catalog + page wrapper, FR-008)
- [x] T032 Run the full quickstart.md pass V1–V15 including `npm run check` (wrangler dry-run; requires Node 22 — build-only validation on Node 20 is fine) and fix anything found
- [x] T033 Rebuild and commit the `public/` output (committed-build convention); hand `src/_data/i18n/cs.json` plus the `/cs/` preview to the owner for translation review — production deploy stays gated on that review (FR-011/SC-007) and on the project's pending-final-assets policy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs T001; **blocks all stories** (T002 → T003 → T004–T014 in parallel → T015 gate)
- **US1 (Phase 3)**: needs Phase 2. Internal: T016/T017/T018/T021/T022 parallel; T019 after T018; T020 after T005; T023 last
- **US2 (Phase 4)**: needs Phase 2 (switcher labels come from the catalog). Independent of US1 code, but full validation V8 assumes `/cs/` exists (US1). T024 first; T025/T026 parallel; T027 after T020 lands if both touch layout.njk in the same period (sequential P1→P2 order avoids conflicts); T028 last
- **US3 (Phase 5)**: needs T027 (extends the same inline script). T029 → T030
- **Polish (Phase 6)**: after all desired stories

### User Story Dependency Notes

- US1 has no dependency on US2/US3 — it is the MVP.
- US2 is code-independent of US1 but its end-to-end test needs US1's `/cs/` page; implement after US1.
- US3 builds directly on US2's redirect script (stored-choice branch first, detection branch second) — this split mirrors spec priorities.

### Parallel Opportunities

- Phase 2: T006–T014 (9 template rewires, all different files) after T003.
- Phase 3: T016, T017, T018, T021, T022 simultaneously (5 different files).
- Phase 4: T025 + T026 after T024.

## Parallel Example: User Story 1

```text
# After Phase 2 completes, launch together:
Task T016: "Create Czech catalog src/_data/i18n/cs.json (full translation)"
Task T017: "Create src/cs/index.njk (lang: cs wrapper)"
Task T018: "Copy 7 latin-ext woff2 files into src/fonts/"
Task T021: "Update src/root/sitemap.xml with /cs/ + hreflang alternates"
Task T022: "Make src/root/404.html bilingual"
# Then sequentially: T019 (css after fonts), T020 (layout SEO), T023 (validation)
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (T001) + Phase 2 (T002–T015) — the T015 regression gate is non-negotiable: English output must not change.
2. Phase 3 (T016–T023) → **STOP and VALIDATE**: `/cs/` is a complete shareable Czech site; hand `cs.json` to the owner for review while work continues.

### Incremental Delivery

1. MVP (above) — `/cs/` link can be shared for review even without a switcher.
2. Add US2 (T024–T028) → switcher + persistence → validate V8–V13.
3. Add US3 (T029–T030) → detection → validate V7.
4. Polish (T031–T033) → docs, full quickstart pass, committed `public/`, review handoff.

### Notes

- No test framework: the parity check and throwing `t` filter are the automated safety net; quickstart scenarios are the manual one.
- `layout.njk` is touched by T005, T020, T027, T029 — keep those sequential (they are, by phase order).
- Commit after each task or logical group; deploy is out of scope until the owner approves `cs.json` (FR-011).
