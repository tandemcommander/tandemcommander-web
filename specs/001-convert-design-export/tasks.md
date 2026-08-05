# Tasks: Převod exportu z Claude Design na nasaditelný web

**Input**: Design documents from `/specs/001-convert-design-export/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Specifikace nepožaduje automatizované testy — validace probíhá scénáři V1–V7 z quickstart.md (manuální + grep kontroly). Testovací tasky se negenerují.

**Organization**: Tasky jsou seskupeny podle user stories, aby každá story byla samostatně implementovatelná a testovatelná.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Lze provádět paralelně (různé soubory, žádné závislosti na nedokončených taskách)
- **[Story]**: Ke které user story task patří (US1, US2, US3)

## Path Conventions

Struktura dle plan.md: zdroje `src/`, generovaný výstup `public/`, konfigurace v kořeni repozitáře.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalace závislostí, konfigurace Eleventy, přesun existujících podkladů do `src/`

- [X] T001 Nainstalovat devDependencies `@11ty/eleventy`, `@fontsource/archivo`, `@fontsource/ibm-plex-mono` a přepsat skripty v `package.json` na: `build` (vyčištění `public/` + eleventy), `dev` (eleventy --serve), `preview` (wrangler dev), `deploy` (build + wrangler deploy), `check` (build + wrangler deploy --dry-run) — dle kontraktu §4 v `specs/001-convert-design-export/contracts/page-structure.md`
- [X] T002 Vytvořit `eleventy.config.js`: input `src/`, output `public/`, passthrough kopie `src/root/` → `public/`, `src/assets/` → `public/assets/`, `src/fonts/` → `public/fonts/`, `src/css/` → `public/css/`, `src/js/` → `public/js/`
- [X] T003 [P] Přesunout stávající podpůrné soubory z `public/` do zdrojů: `404.html`, `robots.txt`, `sitemap.xml`, `_headers`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` → `src/root/`; `public/assets/og-image.png`, `icon-256.png`, `icon-512.png` → `src/assets/`; zkopírovat podklady návrhu `temp/web_source/assets/*` (lockupy, ikona, screenshoty) → `src/assets/`
- [X] T004 [P] Zkopírovat woff2 písma z `node_modules` do `src/fonts/`: Archivo latin 400/500/600/700/800 (`@fontsource/archivo/files/archivo-latin-{váha}-normal.woff2`), IBM Plex Mono latin 400/500 (`@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-{váha}-normal.woff2`) + licenční soubory obou rodin; odstranit staré duplicitní `public/fonts/archivo-*` (nahrazeny zdrojem v `src/fonts/`)

**Checkpoint**: `npx @11ty/eleventy --version` funguje; zdrojová struktura existuje

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Sdílená konfigurace, layout s meta/SEO a základ CSS — bez nich nelze stavět žádnou sekci

**⚠️ CRITICAL**: Musí být hotové před zahájením všech user stories

- [X] T005 Vytvořit `src/_data/site.json` dle `specs/001-convert-design-export/contracts/site-config.schema.json` a datového modelu (data-model.md §1): name, version 0.1.0, platform, license, toolchain, domain, url, description, github.{repoUrl,issuesUrl,releasesUrl}, author.{name,email}
- [X] T006 Vytvořit `src/css/main.css` — základ: design tokeny obou motivů zkopírované 1:1 z `temp/web_source/index.html` (`:root`/`[data-theme="dark"]` custom properties), reset/base pravidla (box-sizing, body, odkazy, nadpisy, img, button), `@font-face` deklarace pro všech 7 řezů z `public/fonts/` s `font-display: swap`
- [X] T007 Vytvořit `src/_includes/layout.njk`: `<!doctype html>`, `<html lang="en">`, `<head>` s meta (charset, viewport, title/description/canonical z `site.json`), OG/Twitter tagy (og-image absolutní URL, texty bez „Coming soon"), favicon linky, preload Archivo 800, inline anti-FOUC skript (čte `localStorage["tc-theme"]`, nastaví `data-theme` na `<html>` před CSS), link na `/css/main.css`, `<script defer src="/js/main.js">`, `theme-color` pro oba motivy; tělo vkládá `{{ content | safe }}`

**Checkpoint**: `npm run build` doběhne a `public/` obsahuje podpůrné soubory, CSS, fonty (zatím bez index.html obsahu)

---

## Phase 3: User Story 1 — Návštěvník si prohlédne finální web (Priority: P1) 🎯 MVP

**Goal**: Kompletní desktopový web dle návrhu — všechny sekce, funkční motivy s perzistencí bez FOUC, hover stavy, žádné zbytky návrhového nástroje

**Independent Test**: Quickstart V1 (úplnost výstupu + grep zákazů), V2 (obsahová parita s `temp/web_source`), V3 (motivy) na desktopové šířce

### Implementation for User Story 1

Konverzní pravidla pro všechny sekce: obsah 1:1 z `temp/web_source/index.html`, inline styly → třídy v main.css, `style-hover` → `:hover`, `sc-if` bloky dle FR-004 (side-by-side ano, slider ne, agentic note ano, build blok ano), sdílené hodnoty výhradně ze `site.json` (verze, URL, kontakt — viz data-model.md §4).

- [X] T008 [P] [US1] Sekce hlavička (sticky header, logo → `#top`, 4 navigační odkazy, segmentový přepínač Light/Dark) v `src/_includes/sections/header.njk`
- [X] T009 [P] [US1] Sekce hero (`id="top"`: lockup light+dark s opacity tokeny, H1, perex, tlačítka Download/Browse the source s verzí a URL ze site.json, mono poznámka) v `src/_includes/sections/hero.njk`
- [X] T010 [P] [US1] Sekce ukázek motivů (`id="screens"`: dvojice figure light/dark vedle sebe s popisky, obrázky `assets/screenshot-light.png` a `screenshot-dark.png`; slider varianta se NEpřenáší) v `src/_includes/sections/screens.njk`
- [X] T011 [P] [US1] Sekce „What it is" (3 karty: Two panels, Keyboard first, Its own core) v `src/_includes/sections/features.njk`
- [X] T012 [P] [US1] Sekce „What's new" (`id="new"`: 4 karty — Unicode, SFTP, Markdown View, PictView) v `src/_includes/sections/whats-new.njk`
- [X] T013 [P] [US1] Sekce „The project" (`id="project"`: texty s odkazy, agentic note blok, karta parametrů Version/Platform/License/Toolchain ze site.json) v `src/_includes/sections/project.njk`
- [X] T014 [P] [US1] Sekce „From the author" (`id="story"`: osobní poznámka, podpis + mailto ze site.json) v `src/_includes/sections/story.njk`
- [X] T015 [P] [US1] Sekce „Download" (`id="download"`: ikona, nadpis s verzí, karta instalátoru s odvozeným názvem souboru a URL, mono řádek odkazů releases/issues, disclaimer chip, blok „Build from source") v `src/_includes/sections/download.njk`
- [X] T016 [P] [US1] Sekce patička (logo, popis, sloupce Program/Source/Contact s odkazy a kontaktem ze site.json, spodní řádek s doménou) v `src/_includes/sections/footer.njk`
- [X] T017 [US1] Vytvořit `src/index.njk`: layout.njk + include sekcí v pořadí dle kontraktu §1 (header, hero, screens, features, whats-new, project, story, download, footer)
- [X] T018 [US1] Doplnit do `src/css/main.css` styly všech sekcí pro desktop: převod inline stylů na třídy, `:hover` pravidla z `style-hover` atributů, sticky header s backdrop-filter, gridy karet, `scroll-margin-top` kotev, stíny/glow — vizuální parita s návrhem
- [X] T019 [US1] Vytvořit `src/js/main.js` — přepínač motivu: klik Light/Dark nastaví `data-theme` na `<html>` + zápis `localStorage["tc-theme"]` v try/catch; aktivní stav segmentů řízený `--seg-*` tokeny; ověřit souhru s inline anti-FOUC skriptem z layoutu
- [X] T020 [US1] Build + validace: `npm run build`, scénáře quickstart V1 (grep zákazů — žádné `support.js`, `sc-if`, `style-hover`, `{{`, google fonts), V2 (parita obsahu vůči `temp/web_source/index.html`), V3 (motivy, perzistence, bez FOUC) na desktopu

**Checkpoint**: Web plně funkční na desktopu — MVP nasaditelné

---

## Phase 4: User Story 2 — Návštěvník na mobilním telefonu (Priority: P2)

**Goal**: Hamburger menu (panel pod hlavičkou, breakpoint 860 px) a plná responsivita od 320 px bez vodorovného přetékání

**Independent Test**: Quickstart V4 — šířky 320/375/430/800/900 px, chování menu dle kontraktu §3

### Implementation for User Story 2

- [X] T021 [US2] Doplnit do `src/_includes/sections/header.njk` mobilní navigaci: `<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Menu">` s ikonou tří čárek (přechází na křížek), panel `<nav id="mobile-menu">` pod hlavičkou se 4 odkazy pod sebou + přepínačem motivu
- [X] T022 [US2] Doplnit do `src/css/main.css` responsivní vrstvu: breakpoint 860 px (pod ním skrýt desktop nav, zobrazit hamburger; nad ním opačně), styly rozbalovacího panelu (ukotvení pod sticky hlavičkou, stránka zůstává viditelná), oprava gridů pro úzké displeje (`minmax(min(430px, 100%), 1fr)` u screens, obdobně karty a projekt), přetékání kódového bloku jen uvnitř rámečku (`overflow-x: auto`), redukce paddingů sekcí na mobilu
- [X] T023 [US2] Doplnit do `src/js/main.js` chování menu: toggle open/close (přepnutí `aria-expanded` + třídy), zavření volbou odkazu, klávesou Escape i opětovným klikem, automatický reset při resize ≥ 860 px (edge case „visící panel")
- [X] T024 [US2] Build + validace: quickstart V4 kompletně (320–900 px, žádný horizontální scroll, menu otevřít/zavřít/Escape/resize, kotvy nepřekryté hlavičkou) + regrese V2/V3 na desktopu

**Checkpoint**: US1 i US2 fungují nezávisle — web plně použitelný na mobilu i desktopu

---

## Phase 5: User Story 3 — Správce webu vydá novou verzi (Priority: P3)

**Goal**: Vydání nové verze = změna jediné hodnoty + jeden build; dokumentovaný postup správy webu

**Independent Test**: Quickstart V5 (výměna verze bez zbytků staré hodnoty) a V6 (drop-in výměna screenshotů)

### Implementation for User Story 3

- [X] T025 [US3] Audit jediného zdroje hodnot: `grep -rF "0.1.0" src/ --exclude-dir=_data` musí vrátit 0 nálezů (verze, název instalátoru i download URL smí existovat jen jako odvozeniny `site.version` v šablonách); totéž pro e-mail a GitHub URL mimo `site.json`; nalezené výskyty přepsat na reference
- [X] T026 [US3] Přepsat `README.md`: struktura zdrojů (`src/` vs generovaný `public/`), postup úprav obsahu (sekce v `src/_includes/sections/`), vydání nové verze (změna `site.json` → `npm run build`), výměna screenshotů (FR-013), příkazy build/dev/preview/deploy/check, zákaz ručních úprav `public/`
- [X] T027 [US3] Validace: quickstart V5 (verze 9.9.9 → grep bez 0.1.0 → vrátit zpět) a V6 (výměna screenshotů) včetně měření, že úkon zabere < 5 minut (SC-004)

**Checkpoint**: Všechny user stories nezávisle funkční

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Podpůrné soubory, finální validace celku, úklid

- [X] T028 [P] Aktualizovat `src/root/sitemap.xml` (aktuální `lastmod`, doména z site.json hodnot) a zkontrolovat `src/root/robots.txt` + `src/root/_headers` vůči novému webu; ověřit `src/root/404.html` (odkaz zpět na hlavní stránku funguje v novém webu)
- [X] T029 Finální průchod quickstart V1–V7 v čistém stavu (`npm install` po smazání `node_modules` není nutný — stačí čerstvý `npm run build`) + `npm run check` (dry-run nasazení bez chyby)
- [X] T030 Úklid: ověřit `git status` — `public/` obsahuje výhradně generované soubory z aktuálního buildu (žádné osiřelé z „coming soon" éry), `temp/web_source` nezměněn, commit připravených změn

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: bez závislostí; T003 a T004 paralelně po T001
- **Foundational (Phase 2)**: po Phase 1 — BLOKUJE všechny user stories; T005 → T006/T007 (layout odkazuje na CSS a data)
- **User Stories (Phase 3–5)**: po Phase 2; doporučené pořadí US1 → US2 → US3 (US2 rozšiřuje header.njk/main.css/main.js z US1; US3 audituje šablony z US1)
- **Polish (Phase 6)**: po dokončení všech stories

### User Story Dependencies

- **US1 (P1)**: jen na Foundational — samostatně testovatelná (desktop web)
- **US2 (P2)**: technicky navazuje na soubory z US1 (header.njk, main.css, main.js), testovatelná nezávisle scénářem V4
- **US3 (P3)**: audit + dokumentace nad výstupem US1; mechanismus site.json existuje už od Phase 2, testovatelná nezávisle scénářem V5/V6

### Parallel Opportunities

- Phase 1: T003 ‖ T004 (po T001)
- Phase 3: T008–T016 (9 sekčních šablon — každá vlastní soubor) plně paralelně; T017–T019 po nich; T020 poslední
- Phase 6: T028 ‖ příprava T029

---

## Parallel Example: User Story 1

```bash
# Všech 9 sekcí najednou (různé soubory, sdílejí jen čtení site.json a reference návrhu):
Task: "header.njk  — hlavička s navigací a přepínačem motivu"
Task: "hero.njk    — hero s lockupem a CTA tlačítky"
Task: "screens.njk — ukázky motivů vedle sebe"
Task: "features.njk, whats-new.njk, project.njk, story.njk, download.njk, footer.njk"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational)
2. Phase 3 (US1) → validace V1+V2+V3 → **desktopový web je nasaditelné MVP**

### Incremental Delivery

1. + Phase 4 (US2) → validace V4 → web kompletní pro mobil
2. + Phase 5 (US3) → validace V5+V6 → správa webu zjednodušená
3. Phase 6 (Polish) → V1–V7 celkově → připraveno k `npm run deploy` (ostré nasazení až po dodání finálních screenshotů)

---

## Notes

- Obsah sekcí se přebírá doslovně z `temp/web_source/index.html` (spec: obsah se nemění, jen převádí)
- Zakázané vzory ve výstupu hlídá grep z quickstart V1 — spouštět po každém checkpointu
- `public/` se nikdy needituje ručně; každá změna = úprava `src/` + `npm run build`
- Commit po každém checkpointu (konec fáze)
