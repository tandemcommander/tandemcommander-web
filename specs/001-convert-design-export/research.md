# Research: Převod exportu z Claude Design na nasaditelný web

**Feature**: 001-convert-design-export | **Date**: 2026-08-05

Všechny neznámé z Technical Context jsou vyřešeny níže. Formát: Rozhodnutí / Zdůvodnění / Zvažované alternativy.

## R1: Generátor webu (build nástroj)

**Decision**: Eleventy (11ty) v3 se šablonami Nunjucks, jako devDependency v existujícím `package.json`.

**Rationale**:
- Projekt už stojí na Node.js (Wrangler v4 v devDependencies) — Eleventy nepřidává nový toolchain, jen jeden balíček.
- Eleventy je „HTML-first": vstupem jsou šablony, výstupem čisté statické HTML bez jakéhokoli klientského runtime — přesně odpovídá FR-002 (web bez běhového prostředí) a FR-012 (žádné externí závislosti).
- Nunjucks poskytuje includes (sekce jako samostatné soubory) a globální data (`_data/site.json`) — přímé naplnění FR-007/FR-008 (sestavení ze zdrojů, sdílené hodnoty na jednom místě).
- Konfigurovatelný výstupní adresář (`./public`) — `wrangler.jsonc` zůstane beze změny.
- Vestavěný dev server s live reload (`eleventy --serve`) pro pohodlnou správu.

**Alternatives considered**:
- **Astro** — silnější komponentový model, ale zbytečně těžký pro jednu stránku; přidává vlastní ekosystém a koncepty (islands), které tu nemají využití.
- **Hugo** — velmi rychlý, ale vyžaduje samostatnou Go binárku mimo npm ekosystém; na Windows další instalační krok pro správce, Go templating strmější než Nunjucks.
- **Vite + HTML pluginy** — Vite je primárně bundler pro aplikace; templating a datové soubory by se doplňovaly pluginy třetích stran, výsledek křehčí než hotový SSG.
- **Vlastní Node build skript** — nejméně závislostí, ale znovu-vynalézá templating, watch mode a dev server; dlouhodobě dražší na údržbu, což je v rozporu s cílem „jednodušší správa".
- **Ponechat čisté HTML bez buildu** — nesplňuje FR-007/FR-008 (verze by se měnila ručně na 5 místech).

## R2: Strategie výstupu `./public` a tok nasazení

**Decision**: `public/` je plně generovaný adresář, který zůstává commitovaný v gitu. Build (`npm run build`) před generováním výstup vyčistí. Npm skripty: `build` (clean + eleventy), `dev` (eleventy --serve), `preview` (wrangler dev), `deploy` (build + wrangler deploy), `check` (build + wrangler deploy --dry-run).

**Rationale**:
- `wrangler.jsonc` (assets.directory = ./public) i případné Workers Builds v CI fungují beze změny konfigurace — commitovaný výstup nevyžaduje nastavování build kroku v Cloudflare dashboardu.
- Čištění před buildem zaručuje, že v `public/` nezůstanou osiřelé soubory (dnešní ručně psaný index.html „coming soon" bude nahrazen generovaným).
- Deploy skript vynucuje build před nasazením — nelze omylem nasadit zastaralý výstup.

**Alternatives considered**:
- **`public/` v .gitignore + build v CI** — čistší git historie, ale Workers Builds by vyžadoval konfiguraci build příkazu v dashboardu (mimo repo, netestovatelné odsud) a lokální klon by po checkoutu nebyl nasaditelný. Odmítnuto kvůli riziku rozbití stávajícího toku nasazení.

## R3: Sdílená konfigurace (jediný zdroj hodnot)

**Decision**: `src/_data/site.json` — globální data soubor Eleventy. Obsahuje: číslo verze, GitHub organizaci/repozitář, odvozené URL (releases, issues, download instalátoru), název instalačního souboru (šablonově složený z verze), kanonickou URL, kontakt, texty meta/OG. Název instalátoru a download URL se v šablonách skládají z `site.version`, takže vydání nové verze = změna jedné hodnoty (FR-008, SC-004).

**Rationale**: Vestavěný mechanismus Eleventy, nulová další režie; JSON je editovatelný bez znalosti šablon.

**Alternatives considered**: YAML/JS data soubor (ekvivalentní; JSON zvolen pro jednoznačnost), env proměnné (nevhodné pro obsahové hodnoty, hůř dohledatelné).

## R4: Konverze stylů (inline styly → CSS)

**Decision**: Jediný `src/css/main.css`: design tokeny exportu (`:root`/`[data-theme]` custom properties se přebírají 1:1), třídy pojmenované podle sekcí (`.site-header`, `.hero`, `.card`, …), hover stavy z `style-hover` atributů převedené na `:hover` pravidla, responsivní pravidla přes media queries. Grid s pevným minimem `minmax(430px, 1fr)` (sekce screenshotů) dostane fallback pro úzké displeje (`minmax(min(430px, 100%), 1fr)`), aby nevznikalo vodorovné přetékání (FR-006).

**Rationale**: Export používá výhradně inline styly + nestandardní `style-hover` atribut, který mimo runtime návrhového nástroje nefunguje — konverze do tříd je nutná pro FR-002 a FR-011. Jeden soubor bez preprocesoru = nejjednodušší správa.

**Alternatives considered**: Tailwind/PostCSS pipeline (další závislosti a build krok bez odpovídající hodnoty pro 1 stránku), ponechání inline stylů + `<style>` bloky pro hover (nečitelné, duplicitní, špatně udržovatelné).

## R5: Písma (self-hosting)

**Decision**: Self-hostovaná písma v `src/fonts/` → `public/fonts/`: Archivo (400, 500, 600, 700, 800) a IBM Plex Mono (400, 500), latin subset, formát woff2, s licenčními soubory (OFL). Zdrojem souborů jsou npm balíčky `@fontsource/archivo` a `@fontsource/ibm-plex-mono` (devDependencies) — potřebné woff2 se z nich jednorázově zkopírují do `src/fonts/` a commitnou. `@font-face` deklarace v main.css s `font-display: swap`; preload pro kritické řezy (Archivo 800 pro nadpisy).

**Rationale**: Export odkazuje na Google Fonts CDN, což FR-012 zakazuje; stávající stránka už Archivo self-hostuje (600/800) — rozšiřuje se stejný přístup. Fontsource balíčky dávají reprodukovatelný, licenčně čistý zdroj souborů bez ručního stahování z webu.

**Alternatives considered**: Google Fonts CDN (zakázáno FR-012), ruční stažení woff2 (nereprodukovatelné), variable fonty (menší podpora řezů IBM Plex Mono, zbytečná komplexita).

## R6: Motivy a perzistence (bez FOUC)

**Decision**: Atribut `data-theme="light|dark"` na `<html>`. Malý inline skript v `<head>` (před CSS) přečte `localStorage` klíč `tc-theme` a nastaví atribut ještě před prvním vykreslením — žádný záblesk opačného motivu (SC-003). Výchozí je light (bez uloženého klíče se atribut nenastavuje, `:root` tokeny = světlý motiv). Přepínač Light/Dark v hlavičce (desktop i mobilní menu) volá stejnou funkci v `main.js`; zápis do localStorage v try/catch (soukromý režim ⇒ motiv funguje jen v rámci návštěvy — edge case ze spec). Loga přepínají světlou/tmavou variantu přes opacity vázané na tokeny (převzato z návrhu).

**Rationale**: Jediný spolehlivý vzor proti FOUC u statických stránek; identická logika jako v exportu (tam klíč `nc-theme` — přejmenováno na `tc-theme` dle názvu projektu, žádní stávající uživatelé s uloženým klíčem neexistují, web dosud nesl jen „coming soon" bez motivů).

**Alternatives considered**: `prefers-color-scheme` jako výchozí (návrh explicitně určuje výchozí light — zachováno dle FR-003), cookie (zakázáno FR-012).

## R7: Mobilní navigace (hamburger)

**Decision**: Breakpoint **860 px**: pod ním se skryje vodorovná navigace a zobrazí tlačítko hamburgeru (`<button aria-expanded aria-controls aria-label>`); po otevření rozbalovací panel ukotvený pod sticky hlavičkou (položky pod sebou + přepínač motivu), ikona přechází na křížek. Zavření: volbou odkazu, opětovným klepnutím, klávesou Escape, nebo automaticky při zvětšení okna nad breakpoint (edge case ze spec — panel nesmí „viset"). Bez JS zůstává obsah plně čitelný a dosažitelný skrolováním + odkazy v patičce (kotvy dle spec edge case).

**Rationale**: 860 px je bezpečně nad bodem, kde se plná navigace (logo ~230 px + 4 odkazy ~380 px + přepínač ~130 px + mezery a odsazení) přestává vejít (~850 px) — plná navigace se tak nikdy nezlomí ani nepřeteče (Assumption ze spec). Panel pod hlavičkou byl potvrzen v clarify (Session 2026-08-05).

**Alternatives considered**: CSS-only řešení přes `:checked` checkbox (funguje bez JS, ale hůř přístupné — bez `aria-expanded`, bez Escape; a JS je stejně potřeba pro motiv), fullscreen overlay a boční zásuvka (zamítnuty uživatelem v clarify).

## R8: Konverze konstrukcí návrhového nástroje

**Decision**: Mapování prvků exportu na standardní web:
- `support.js` a obal `<x-dc>`/`<helmet>` — odstranit; obsah `<helmet>` přechází do `<head>` layoutu.
- `{{ theme }}`, `{{ chooseLight }}`, `{{ chooseDark }}` — nahrazeny `data-theme` mechanismem (R6) a event listenery v `main.js`.
- `sc-if value="{{ sideBySide }}"` → blok se vykreslí (výchozí true): screenshoty vedle sebe; `compareMode` blok (slider) se **nepřenáší** (FR-004).
- `sc-if showAgentic / showBuild` → obsah natrvalo součástí stránky (výchozí true).
- `style-hover="…"` → CSS `:hover` pravidla v main.css.
- Aktivní stav přepínače Light/Dark (`--seg-*` tokeny) — zachován beze změny, řízen motivem.

**Rationale**: Výchozí hodnoty props z exportu (`data-props` blok) jsou závazné dle FR-004; runtime nástroje nesmí přežít konverzi (FR-002).

**Alternatives considered**: Zachovat oba režimy screenshotů s přepínačem — zamítnuto (FR-004, zbytečný JS a složitost).

## R9: Podpůrné soubory a SEO/OG meta

**Decision**: Stávající podpůrné soubory `public/` se přesunou do `src/root/` (404.html, robots.txt, sitemap.xml, _headers, favicon.svg, favicon-32.png, apple-touch-icon.png) a `src/assets/` (og-image.png, icon-*.png) a dál se kopírují do výstupu (passthrough). `sitemap.xml` dostane aktuální `lastmod`. Meta v layoutu: titulek a popis dle nového obsahu („Tandem Commander — two-pane file manager for Windows"), canonical `https://tandemcommander.org/`, OG/Twitter tagy s existujícím og-image.png, ale aktualizovanými texty (bez „Coming soon"), `theme-color` pro oba motivy. Favicon návrhu (`tandem-commander-icon.svg`) se přidá do assets; kořenové favicony zůstávají.

**Rationale**: FR-009 + FR-010; og-image.png je brandový obrázek použitelný i pro nový web — texty meta se aktualizují, obrázek se přegenerovávat nemusí.

**Alternatives considered**: Nový OG obrázek ze screenshotů (blokováno R10 — screenshoty jsou dočasné; lze doplnit později výměnou souboru).

## R10: Dočasné screenshoty

**Decision**: Soubory `screenshot-light.png` a `screenshot-dark.png` se přebírají z exportu pod stejnými názvy do `src/assets/`; šablony na ně odkazují výhradně těmito názvy. Výměna za finální snímky = přepsání dvou souborů + `npm run build` (FR-013). Rozměry v layoutu nejsou natvrdo — obrázky jsou `width: 100%; height: auto`, výměna za jiné rozlišení layout nerozbije.

**Rationale**: Potvrzeno v clarify — snímky jsou zástupné; stabilní názvy souborů minimalizují budoucí zásah.

**Alternatives considered**: `<picture>` s více rozlišeními (předčasné — finální podklady ještě neexistují; lze doplnit později).
