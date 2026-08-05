# Implementation Plan: Převod exportu z Claude Design na nasaditelný web

**Branch**: `001-convert-design-export` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-convert-design-export/spec.md`

## Summary

Jednostránkový marketingový web Tandem Commanderu, exportovaný z nástroje Claude Design (`temp/web_source`), se převede na plně samostatný statický web sestavovaný generátorem **Eleventy (11ty)** ze zdrojů v `src/` do adresáře `./public` (kořen nasazení na Cloudflare Workers, beze změny `wrangler.jsonc`). Sdílené hodnoty (verze, odkazy ke stažení, kontakt) žijí v jediném datovém souboru `src/_data/site.json`. Inline styly a nestandardní konstrukce exportu (runtime `support.js`, `{{ }}` výrazy, `sc-if`, `style-hover`) se přepíší do standardního HTML + jednoho CSS souboru s CSS custom properties pro světlý/tmavý motiv; drobný vanilla JS obslouží přepínač motivu (s perzistencí, bez FOUC) a nové mobilní hamburger menu (panel pod hlavičkou, breakpoint 860 px).

## Technical Context

**Language/Version**: HTML5 + CSS3 + vanilla JavaScript (ES2020); Node.js ≥ 20 pouze pro sestavení

**Primary Dependencies**: Eleventy (11ty) v3 (devDependency, šablony Nunjucks); Wrangler v4 (již v projektu, jen nasazení); @fontsource/archivo a @fontsource/ibm-plex-mono (zdroj woff2 souborů, kopírují se do repozitáře)

**Storage**: N/A (statické soubory; jediný klientský stav je volba motivu v `localStorage`, klíč `tc-theme`)

**Testing**: Manuální validace v prohlížeči dle quickstart.md + build-time kontroly (úspěšné `npm run build`, absence šablonovacích zbytků a starých čísel verze ve výstupu ověřovaná grepem)

**Target Platform**: Moderní prohlížeče (desktop + mobil, šířky od 320 px); hosting Cloudflare Workers static assets servírující `./public`

**Project Type**: Statický web (single page + podpůrné soubory)

**Performance Goals**: Celková váha stránky bez screenshotů < 300 KB; žádné externí požadavky za běhu (fonty self-hostované); bez layout shiftů při načtení motivu

**Constraints**: Výstup musí být čistě statický (žádná serverová logika); žádná analytika, měřicí skripty ani cookies (FR-012); obsah beze změn dle exportu; `./public` zůstává úplným kořenem nasazení včetně 404/robots/sitemap/_headers/ikon/fontů (FR-009)

**Scale/Scope**: 1 stránka, 8 sekcí + hlavička a patička, 2 motivy, ~10 obrazových podkladů, 2 rodiny písem (7 řezů)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` je nevyplněná šablona — projekt zatím nemá ratifikované principy, žádné konkrétní gaty tedy nelze vynutit. Uplatňuji obecné zásady jednoduchosti:

| Gate | Stav | Poznámka |
|------|------|----------|
| Minimální závislosti | PASS | Jediná nová build závislost (Eleventy); žádné runtime závislosti ani klientský framework |
| Žádná spekulativní funkcionalita | PASS | Přenáší se pouze obsah návrhu + explicitně vyžádané mobilní menu; varianta compare-slider se nepřenáší |
| Opakovatelné sestavení | PASS | `npm run build` deterministicky generuje `./public` ze `src/` |
| Zachování stávajícího nasazení | PASS | `wrangler.jsonc` beze změny; mění se jen obsah `./public` |

**Post-design re-check (po Phase 1)**: PASS — návrh nepřidal žádnou další závislost ani strukturu nad rámec výše uvedeného.

## Project Structure

### Documentation (this feature)

```text
specs/001-convert-design-export/
├── plan.md              # Tento soubor
├── research.md          # Phase 0 — rozhodnutí a zdůvodnění
├── data-model.md        # Phase 1 — datový model (site.json, struktura stránky)
├── quickstart.md        # Phase 1 — validační průvodce
├── contracts/           # Phase 1 — kontrakty (schéma konfigurace, struktura stránky, build CLI)
│   ├── site-config.schema.json
│   └── page-structure.md
└── tasks.md             # Phase 2 (/speckit-tasks — negeneruje tento příkaz)
```

### Source Code (repository root)

```text
eleventy.config.js        # Konfigurace Eleventy: input src/, output public/, passthrough kopie
package.json              # + devDependency @11ty/eleventy; skripty build/dev/preview/deploy

src/
├── index.njk             # Stránka: skládá sekce, čte site.json
├── _includes/
│   ├── layout.njk        # <html>, <head> (meta/SEO/OG, fonty, inline theme skript), patička dokumentu
│   └── sections/         # Jedna sekce = jeden soubor (header, hero, screens, features,
│                         #   whats-new, project, story, download, footer)
├── _data/
│   └── site.json         # JEDINÝ zdroj sdílených hodnot: verze, odkazy, kontakt, canonical
├── css/
│   └── main.css          # Design tokeny (custom properties, motivy), třídy, responsivita
├── js/
│   └── main.js           # Mobilní menu (hamburger) + obsluha přepínače motivu
├── assets/               # → public/assets/ (loga, screenshoty, og-image, ikony aplikace)
├── fonts/                # → public/fonts/ (Archivo + IBM Plex Mono woff2 + licence)
└── root/                 # → public/ (404.html, robots.txt, sitemap.xml, _headers,
                          #   favicon.svg, favicon-32.png, apple-touch-icon.png)

public/                   # GENEROVANÝ výstup (commitovaný), kořen nasazení — ručně se neupravuje

temp/web_source/          # Reference návrhu (mimo nasazení, beze změny)
```

**Structure Decision**: Jediný projekt statického webu. Zdroje v `src/` (šablony Nunjucks + data + statika), `public/` je plně generovaný adresář commitovaný do gitu, aby stávající tok nasazení (lokální `wrangler deploy` i Workers Builds bez konfigurace build kroku v dashboardu) fungoval beze změny. Ruční úpravy `public/` končí — vše jde přes `src/` a `npm run build` (build před zápisem výstup čistí, takže v `public/` nezůstávají osiřelé soubory).

## Complexity Tracking

Žádná porušení — tabulka se nevyplňuje.
