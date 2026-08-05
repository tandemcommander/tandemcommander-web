# Data Model: Převod exportu z Claude Design na nasaditelný web

**Feature**: 001-convert-design-export | **Date**: 2026-08-05

Statický web nemá databázi; „datový model" tvoří sdílená konfigurace, struktura zdrojů a klientský stav.

## 1. Sdílená konfigurace webu — `src/_data/site.json`

Jediný zdroj sdílených hodnot (FR-008). Dostupná ve všech šablonách jako `site.*`.

| Pole | Typ | Příklad | Použití |
|------|-----|---------|---------|
| `name` | string | `"Tandem Commander"` | Titulky, hlavička, patička, OG |
| `version` | string (semver) | `"0.1.0"` | Hero štítek, karta projektu, sekce Download, název instalátoru, download URL |
| `platform` | string | `"Windows 11 · x64"` | Hero poznámka, karta projektu, Download |
| `license` | string | `"GPLv2 or later"` | Karta projektu, patička, Download |
| `toolchain` | string | `"Visual Studio 2022"` | Karta projektu |
| `domain` | string | `"tandemcommander.org"` | Patička |
| `url` | string (URL) | `"https://tandemcommander.org"` | Canonical, OG, sitemap |
| `description` | string | popis webu | `<meta name="description">`, OG description |
| `github.repoUrl` | string (URL) | `"https://github.com/tandemcommander/tandemcommander"` | Tlačítko „Browse the source", patička, build-from-source blok |
| `github.issuesUrl` | string (URL) | `…/issues` | Download sekce, patička |
| `github.releasesUrl` | string (URL) | `…/releases` | Download sekce („all releases") |
| `author.name` | string | `"Pavel Stupka"` | Sekce Story, patička |
| `author.email` | string (email) | `"pavel.stupka@gmail.com"` | Sekce Story, patička |

**Odvozené hodnoty** (skládají se v šablonách, nikdy se nezapisují ručně):

| Odvozená hodnota | Vzorec |
|------------------|--------|
| Název instalátoru | `tandemcommander-{{ site.version }}-x64-setup.exe` |
| URL instalátoru | `{{ site.github.repoUrl }}/releases/download/v{{ site.version }}/tandemcommander-{{ site.version }}-x64-setup.exe` |

**Validační pravidla**:
- `version` je jediné místo, kde se číslo verze vyskytuje ve zdrojích (SC-004: po změně a rebuild nesmí ve výstupu zůstat žádný výskyt staré verze).
- Schéma: [contracts/site-config.schema.json](./contracts/site-config.schema.json).

## 2. Struktura zdrojů stránky

| Entita | Umístění | Obsah |
|--------|----------|-------|
| Layout | `src/_includes/layout.njk` | `<head>` (meta, OG, fonty, inline theme skript), kostra dokumentu |
| Sekce | `src/_includes/sections/*.njk` | header, hero, screens, features, whats-new, project, story, download, footer — jedna sekce = jeden soubor; text obsahu se edituje zde |
| Stránka | `src/index.njk` | Pořadí sekcí (viz [contracts/page-structure.md](./contracts/page-structure.md)) |
| Styly | `src/css/main.css` | Design tokeny obou motivů (custom properties z exportu 1:1), třídy, `:hover`, media queries |
| Chování | `src/js/main.js` | Mobilní menu, přepínač motivu |
| Grafika | `src/assets/` | loga (lockup light/dark, ikona), screenshot-light.png / screenshot-dark.png (dočasné, FR-013), og-image.png, icon-256/512.png |
| Písma | `src/fonts/` | Archivo 400/500/600/700/800, IBM Plex Mono 400/500 (woff2, latin) + licence |
| Kořenové soubory | `src/root/` | 404.html, robots.txt, sitemap.xml, _headers, favicon.svg, favicon-32.png, apple-touch-icon.png |

## 3. Klientský stav

| Stav | Úložiště | Hodnoty | Přechody |
|------|----------|---------|----------|
| Motiv | `localStorage["tc-theme"]` + atribut `data-theme` na `<html>` | `"light"` \| `"dark"`; bez klíče = light | Klik na Light/Dark (hlavička i mobilní menu) → nastaví atribut + uloží; čtení při načtení v inline skriptu (před prvním paintem). Zápis v try/catch — při nedostupném úložišti stav žije jen po dobu návštěvy |
| Mobilní menu | Pouze DOM (`aria-expanded` na tlačítku, třída na panelu) | otevřeno / zavřeno (výchozí) | Otevře: klik na hamburger. Zavře: klik na odkaz, opětovný klik, Escape, resize nad 860 px |

## 4. Vztahy a invarianty

- `site.version` → propisuje se do 5 míst výstupu (hero štítek, karta projektu, nadpis/text Download, název souboru, download URL); žádné z nich nesmí být v šablonách zapsáno doslovně.
- Screenshoty jsou referencované výhradně názvy `screenshot-light.png` / `screenshot-dark.png` (FR-013 — drop-in výměna).
- Tokeny motivů v `main.css` jsou jediným místem definice barev; sekce je pouze konzumují (var(--…)).
- `public/` neobsahuje nic, co nemá zdroj v `src/` — celý adresář je reprodukovatelný jedním buildem.
