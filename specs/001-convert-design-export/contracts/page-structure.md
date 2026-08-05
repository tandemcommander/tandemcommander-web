# Kontrakt: Struktura stránky, navigace a build CLI

**Feature**: 001-convert-design-export | **Date**: 2026-08-05

Tento kontrakt fixuje rozhraní, na která se váže validace (quickstart.md) a budoucí úpravy webu. Změna kterékoli položky je změnou kontraktu a musí projít specifikací.

## 1. Kotvy sekcí a navigace

Pořadí sekcí na stránce a jejich `id` (kotvy). Sticky hlavička má výšku 72 px; všechny cílové sekce mají `scroll-margin-top` ≥ 88 px, aby je hlavička nepřekrývala.

| Pořadí | Sekce | `id` | V hlavní navigaci | V patičce |
|--------|-------|------|-------------------|-----------|
| 1 | Hero | `top` | — (logo v hlavičce → `#top`) | — |
| 2 | Ukázky motivů | `screens` | „Themes" | „Themes" |
| 3 | What it is (3 karty) | — | — | — |
| 4 | What's new (4 karty) | `new` | „What's new" | „What's new" |
| 5 | The project | `project` | „Project" | „Project" |
| 6 | From the author | `story` | — | — |
| 7 | Download | `download` | „Download" | „Download" |
| 8 | Footer | — | — | — |

## 2. Kontrakt motivu

| Prvek | Hodnota |
|-------|---------|
| Atribut | `data-theme` na `<html>` |
| Hodnoty | `"light"` (výchozí, platí i bez atributu) \| `"dark"` |
| Úložiště | `localStorage`, klíč `tc-theme` |
| Anti-FOUC | Inline skript v `<head>` před odkazem na CSS nastaví atribut z úložiště |
| Ovládání | Segmentový přepínač Light/Dark v hlavičce (desktop) i v mobilním panelu |
| Loga | Světlá/tmavá varianta lockupu řízená tokeny `--light-op` / `--dark-op` |

## 3. Kontrakt responsivní navigace

| Prvek | Hodnota |
|-------|---------|
| Breakpoint | `860px` — jediná hodnota, definovaná v main.css |
| ≥ 860 px | Vodorovná navigace dle návrhu, hamburger skrytý |
| < 860 px | Navigační odkazy skryté; tlačítko hamburger (tři čárky) viditelné |
| Tlačítko | `<button type="button" aria-expanded="false|true" aria-controls="mobile-menu" aria-label="Menu">`; ikona přechází na křížek při otevření |
| Panel | `id="mobile-menu"`, ukotven pod hlavičkou, položky svisle + přepínač motivu; zbytek stránky zůstává viditelný |
| Zavření | volba odkazu · opětovný klik na tlačítko · klávesa Escape · resize ≥ 860 px |
| Bez JS | Obsah stránky plně dostupný skrolováním; kotvy dostupné z patičky |

## 4. Kontrakt build CLI (`package.json` skripty)

| Příkaz | Chování | Garance |
|--------|---------|---------|
| `npm run build` | Vyčistí `public/` a vygeneruje kompletní web ze `src/` | Po doběhu je `public/` úplný kořen nasazení; exit code ≠ 0 při chybě šablon |
| `npm run dev` | Lokální dev server s live reload nad zdroji | Neovlivňuje `public/` v gitu jinak než buildem |
| `npm run preview` | `wrangler dev` — servíruje `public/` jako v produkci | Věrné chování 404/_headers |
| `npm run deploy` | `build` + `wrangler deploy` | Nikdy nenasadí bez čerstvého buildu |
| `npm run check` | `build` + `wrangler deploy --dry-run` | CI/ruční kontrola nasaditelnosti |

## 5. Kontrakt výstupu (`public/`)

Po `npm run build` musí `public/` obsahovat minimálně:

```text
index.html            404.html            robots.txt
sitemap.xml           _headers            favicon.svg
favicon-32.png        apple-touch-icon.png
css/main.css          js/main.js
assets/  (lockupy, ikona, screenshot-light.png, screenshot-dark.png, og-image.png, icon-256.png, icon-512.png)
fonts/   (archivo-*.woff2 ×5, ibm-plex-mono-*.woff2 ×2, licence)
```

Zakázané ve výstupu: `support.js`, značky `<x-dc>`/`<helmet>`/`<sc-if>`, atribut `style-hover`, nezpracované `{{ … }}` výrazy, odkazy na `fonts.googleapis.com`/`fonts.gstatic.com`, jakékoli analytické skripty.
