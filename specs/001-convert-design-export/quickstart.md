# Quickstart: Validace webu Tandem Commander

**Feature**: 001-convert-design-export | **Date**: 2026-08-05

Průvodce ověřením, že web funguje end-to-end. Odkazuje na [kontrakty](./contracts/page-structure.md) a [datový model](./data-model.md); nic z nich neduplikuje.

## Prerekvizity

- Node.js ≥ 20, npm
- `npm install` v kořeni repozitáře

## Základní příkazy

```bash
npm run build     # vyčistí a vygeneruje ./public ze src/
npm run dev       # dev server s live reload (vývoj)
npm run preview   # wrangler dev — produkční chování (404, _headers)
npm run check     # build + dry-run nasazení
```

## Validační scénáře

### V1: Sestavení a úplnost výstupu (SC-001, SC-005, FR-009)

1. Čistý klon → `npm install` → `npm run build` — musí doběhnout bez chyby na první pokus.
2. Ověřit obsah `public/` proti [kontraktu výstupu §5](./contracts/page-structure.md#5-kontrakt-výstupu-public).
3. Negativní kontrola zbytků návrhového nástroje a externích služeb (musí vrátit 0 nálezů):

```bash
grep -rEl "support\.js|<x-dc>|<sc-if|style-hover|\{\{|fonts\.googleapis|fonts\.gstatic" public/ && echo "FAIL" || echo "OK"
```

### V2: Obsahová parita s návrhem (SC-001, FR-001, FR-004)

1. `npm run preview`, otevřít v prohlížeči vedle `temp/web_source` reference.
2. Zkontrolovat přítomnost všech sekcí v pořadí dle [kontraktu §1](./contracts/page-structure.md#1-kotvy-sekcí-a-navigace) a jejich texty.
3. Ověřit: screenshoty vedle sebe (žádný slider), poznámka o agentním vývoji zobrazena, blok „Build from source" zobrazen.
4. Konzole prohlížeče bez chyb, síťový panel bez failed requestů a bez požadavků na cizí domény (FR-012).

### V3: Motivy (SC-003, FR-003)

1. První návštěva → světlý motiv, světlá varianta loga.
2. Klik „Dark" → celá stránka + logo do tmavého; reload → tmavý **bez záblesku světlého** (throttling CPU v DevTools pomůže záblesk odhalit).
3. Klik „Light" → zpět; nová záložka na stejné URL přebírá uloženou volbu.
4. Soukromé okno: přepínání funguje, volba se po zavření nezachová (očekávané).

### V4: Mobilní navigace a responsivita (SC-002, FR-005, FR-006)

1. DevTools responsive mode, šířka 375 px: místo odkazů hamburger; chování dle [kontraktu §3](./contracts/page-structure.md#3-kontrakt-responsivní-navigace) — otevřít, zvolit „Download" (menu se zavře + scroll na sekci), otevřít a zavřít Escape i opětovným klikem.
2. Šířky 320, 375, 430 px: projít celou stránku — žádný vodorovný scroll celé stránky; blok „Build from source" skroluje jen uvnitř rámečku.
3. Otevřít menu na 800 px → rozšířit na 900 px: menu zmizí, plná navigace zpět, panel nikde „nevisí".
4. 860 px a výše: plná navigace se nezalamuje ani nepřetéká.
5. Klik na odkazy navigace na desktopu: cílová sekce není překryta sticky hlavičkou.

### V5: Vydání nové verze (SC-004, FR-007, FR-008)

```bash
# 1. Ve src/_data/site.json změnit "version": "0.1.0" → "9.9.9"
npm run build
grep -rF "0.1.0" public/ && echo "FAIL: stará verze zůstala" || echo "OK"
grep -rlF "9.9.9" public/   # očekávané výskyty: index.html (hero, projekt, download, URL)
# 2. Vrátit verzi zpět na 0.1.0 a znovu npm run build
```

Časový limit celého úkonu: do 5 minut (SC-004).

### V6: Výměna dočasných screenshotů (FR-013)

1. Nahradit `src/assets/screenshot-light.png` a `screenshot-dark.png` libovolnými jinými PNG (stejné názvy).
2. `npm run build` → nové obrázky ve výstupu, layout nerozbitý (obrázky škálují na šířku sloupce).
3. Vrátit původní soubory (do dodání finálních snímků).

### V7: SEO a sdílení (SC-006, FR-010)

1. `view-source:` — zkontrolovat `<title>`, `meta description`, `canonical`, OG/Twitter tagy (texty bez „Coming soon", obrázek `assets/og-image.png` absolutní URL).
2. `public/robots.txt` a `public/sitemap.xml` existují; sitemap má aktuální `lastmod` a správnou doménu.
3. `npm run preview` → neexistující cesta vrací 404.html se stavovým kódem 404.

## Definice hotovo

Všechny scénáře V1–V7 procházejí; poté je web připraven k nasazení (`npm run deploy`) — ostré nasazení až po dodání finálních screenshotů (viz Assumptions ve spec.md).
