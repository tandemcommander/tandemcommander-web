# Feature Specification: Převod exportu z Claude Design na nasaditelný web

**Feature Branch**: `001-convert-design-export`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "V adresari ./temp/web_source je exportovany web z Claude design. Jedna se o graficky navrh webu z tohoto nastroje (Claude Desing). Cilem upravy je prevest tento design do projektu, aby vysledkem byl finalni web pro nasazeni v adresari ./public. Zaroven bude vhodne navrhnout zpusob, nebo vybrat jednoduchy framework na sestaveni celeho webu ze zdroju, tak aby sprava byla jednodussi a nemuselo se vse menit primo v HTML kodu, napr. vydani nove verze, atd. Zaroven je potreba upravit tak, aby se web spravne nacital a zobrazoval a to vcetne menu pro zobrazeni na mobilnich telefonech, tedy od urcite sirky se zobrazi klasicke oteviratelen menu, tri carky."

## Clarifications

### Session 2026-08-05

- Q: Budou GitHub repozitář `tandemcommander/tandemcommander` a release v0.1.0 s instalátorem v době nasazení webu existovat, takže odkazy ke stažení mohou zůstat přesně podle návrhu? → A: Ano — repozitář i release budou v době nasazení existovat; odkazy z návrhu se přebírají beze změny (centralizované v konfiguraci).
- Q: Jakou podobu má mít otevřené mobilní menu po klepnutí na ikonu se třemi čárkami? → A: Rozbalovací panel hned pod hlavičkou — položky pod sebou, zbytek stránky zůstává viditelný; ikona se změní na křížek pro zavření.
- Q: Jsou snímky obrazovky aplikace v exportu návrhu finálními podklady pro ostrý web? → A: Ne — jsou dočasné (zástupné); finální snímky ve vyšší kvalitě budou dodány před nasazením a musí jít vyměnit prostým nahrazením souborů ve zdrojích.
- Q: Má web sbírat statistiky návštěvnosti (analytiku)? → A: Ne — žádný měřicí skript ani cookies; postačí serverové metriky hostingové platformy. FR-012 platí bez výjimek.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Návštěvník si prohlédne finální web (Priority: P1)

Návštěvník otevře web Tandem Commanderu a vidí plnohodnotnou, správně vykreslenou stránku odpovídající grafickému návrhu: hlavičku s navigací, hero sekci s logem a tlačítky ke stažení, ukázky světlého a tmavého motivu, přehled vlastností, novinky ve verzi, informace o projektu, osobní poznámku autora, sekci ke stažení a patičku. Web funguje samostatně — bez závislosti na nástroji, ze kterého návrh vzešel. Návštěvník může přepínat mezi světlým a tmavým motivem a jeho volba zůstane zachována i při příští návštěvě.

**Why this priority**: Bez správně se načítajícího a zobrazujícího webu nemá nic ostatního smysl — toto je jádro celého záměru a samo o sobě nahrazuje současnou dočasnou „coming soon" stránku plnohodnotným webem.

**Independent Test**: Otevřít web z adresáře `./public` v prohlížeči na počítači a projít všechny sekce: veškerý obsah návrhu je přítomen, odkazy v menu skrolují na správné sekce, přepínač motivu funguje a volba přežije obnovení stránky.

**Acceptance Scenarios**:

1. **Given** nasazený web z `./public`, **When** návštěvník otevře úvodní stránku, **Then** zobrazí se kompletní obsah návrhu (všechny sekce, texty, obrázky, loga) bez chyb a bez viditelných zbytků šablonovacích značek.
2. **Given** zobrazený web ve výchozím světlém motivu, **When** návštěvník klikne na přepínač „Dark", **Then** celá stránka se přepne do tmavého motivu včetně log a po obnovení stránky zůstane tmavý motiv zachován.
3. **Given** zobrazený web, **When** návštěvník klikne na položku menu (např. „Download"), **Then** stránka plynule přejede na odpovídající sekci, která není překryta přilepenou hlavičkou.
4. **Given** zobrazený web, **When** návštěvník najede myší na tlačítka a odkazy, **Then** projeví se zvýrazňovací (hover) stavy odpovídající návrhu.

---

### User Story 2 - Návštěvník na mobilním telefonu (Priority: P2)

Návštěvník otevře web na mobilním telefonu. Místo vodorovné navigace, která by se na úzkou obrazovku nevešla, vidí ikonu menu („tři čárky" / hamburger). Po klepnutí se otevře menu se všemi navigačními odkazy a přepínačem motivu; volbou položky se menu zavře a stránka přejede na příslušnou sekci. Veškerý obsah je na mobilu čitelný a nic nepřetéká do stran.

**Why this priority**: Uživatel výslovně požaduje mobilní menu a významná část návštěvníků přijde z telefonu; současný návrh žádnou mobilní variantu navigace nemá a na úzkých displejích by byl nepoužitelný.

**Independent Test**: Otevřít web v prohlížeči se zúženým oknem (nebo na telefonu) a ověřit: pod stanovenou šířkou se navigace nahradí ikonou hamburgeru, menu jde otevřít i zavřít, odkazy fungují a žádná sekce nezpůsobuje vodorovné skrolování.

**Acceptance Scenarios**:

1. **Given** obrazovka užší než stanovený práh, **When** návštěvník stránku načte, **Then** místo řádku odkazů se v hlavičce zobrazí ikona menu se třemi čárkami.
2. **Given** zobrazená ikona menu, **When** na ni návštěvník klepne, **Then** otevře se menu obsahující všechny navigační odkazy i přepínač světlého/tmavého motivu.
3. **Given** otevřené mobilní menu, **When** návštěvník zvolí položku menu, **Then** menu se zavře a stránka přejede na odpovídající sekci.
4. **Given** otevřené mobilní menu, **When** návštěvník klepne na ikonu znovu (nebo mimo menu), **Then** menu se zavře bez další akce.
5. **Given** telefon s běžnou šířkou displeje (od 320 px výše), **When** návštěvník prochází celou stránku, **Then** žádná sekce (mřížky karet, snímky obrazovky, blok s příkazy pro sestavení) nezpůsobuje vodorovné přetékání a obrázky se zmenšují úměrně displeji.
6. **Given** obrazovka širší než stanovený práh, **When** návštěvník stránku načte nebo okno rozšíří, **Then** zobrazí se původní vodorovná navigace jako v návrhu.

---

### User Story 3 - Správce webu vydá novou verzi programu (Priority: P3)

Správce webu (autor projektu) potřebuje po vydání nové verze Tandem Commanderu aktualizovat web: číslo verze se objevuje na více místech (štítek na tlačítku v hero sekci, karta s parametry projektu, nadpis sekce ke stažení, název instalačního souboru a odkaz ke stažení). Místo ručního přepisování všech výskytů v HTML upraví jedinou hodnotu ve zdrojích webu, spustí sestavení a v adresáři `./public` vznikne aktuální web se všemi výskyty správně propsanými.

**Why this priority**: Zjednodušení správy je výslovný požadavek — bez něj je každé vydání nové verze ruční a chybové (snadno zůstane zapomenutý starý výskyt). Web ale může být nasazen a fungovat i před zavedením tohoto mechanismu, proto P3.

**Independent Test**: Ve zdrojích změnit číslo verze na zkušební hodnotu, spustit sestavení a ověřit, že se nová hodnota objevila na všech místech výsledného webu a žádný výskyt staré hodnoty nezůstal.

**Acceptance Scenarios**:

1. **Given** zdroje webu s centrálně definovanou verzí, **When** správce změní hodnotu verze a spustí sestavení, **Then** všechny výskyty verze ve výsledném webu (hero štítek, karta projektu, sekce ke stažení, název souboru instalátoru, odkaz ke stažení) odpovídají nové hodnotě.
2. **Given** zdroje webu, **When** správce upraví text některé sekce ve zdrojovém souboru a spustí sestavení, **Then** změna se promítne do `./public` bez ručních zásahů do výsledného HTML.
3. **Given** čerstvě naklonovaný projekt, **When** správce spustí dokumentovaný postup sestavení, **Then** v `./public` vznikne kompletní nasaditelný web identický s verzovaným stavem.

---

### Edge Cases

- Co se stane, když návštěvník má vypnutý JavaScript? Obsah stránky musí zůstat čitelný a odkazy v navigaci použitelné; přepínač motivu a otevírání mobilního menu mohou vyžadovat skripty, ale jejich nefunkčnost nesmí zablokovat přístup k obsahu.
- Co se stane, když prohlížeč nedovolí ukládat data (soukromý režim)? Přepínání motivu musí fungovat alespoň v rámci aktuální návštěvy; volba se pouze nezapamatuje.
- Návštěvník s uloženým tmavým motivem znovu otevře web — stránka se nesmí nejprve bliknout světle a teprve pak ztmavnout (rušivý záblesk při načtení).
- Návštěvník otevře menu na mobilu a poté otočí telefon / zvětší okno nad práh — navigace se vrátí do plné podoby a otevřené menu nesmí zůstat „viset" přes obsah.
- Velmi úzké displeje (320 px): mřížky karet s pevnou minimální šířkou sloupce a dvojice snímků obrazovky se musí přeskládat pod sebe, nikoli přetékat.
- Blok s příkazy pro sestavení ze zdrojů obsahuje dlouhé neděliteľné řádky — na mobilu smí skrolovat vodorovně uvnitř svého rámečku, ale nesmí rozšířit celou stránku.
- Sdílení odkazu na sociálních sítích a ve zprávách — náhled musí ukazovat správný titulek, popis a obrázek odpovídající novému webu (nikoli původní „coming soon" stránce).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Výsledný web MUSÍ obsahovat veškerý obsah grafického návrhu z `./temp/web_source`: hlavičku s navigací a přepínačem motivu, hero sekci s logem a tlačítky, sekci s ukázkami světlého a tmavého motivu (vedle sebe), sekci „What it is" se třemi kartami, sekci „What's new" se čtyřmi kartami, sekci „The project" včetně poznámky o agentním vývoji a karty s parametry, osobní poznámku autora, sekci „Download" včetně upozornění (disclaimer) a bloku s příkazy pro sestavení, a patičku s odkazy a kontaktem.
- **FR-002**: Výsledný web MUSÍ fungovat zcela samostatně jako běžná webová stránka — bez běhového prostředí návrhového nástroje, bez šablonovacích značek a zástupných výrazů ve výstupu a bez souborů specifických pro návrhový nástroj.
- **FR-003**: Web MUSÍ nabízet přepínání světlého a tmavého motivu; výchozí je světlý motiv, zvolený motiv se uchová pro příští návštěvy a při načtení stránky se uplatní bez viditelného záblesku opačného motivu. S motivem se přepínají i varianty loga (světlá/tmavá).
- **FR-004**: Volitelné bloky návrhu MUSÍ být ve výsledném webu rozhodnuty podle výchozích hodnot návrhu: snímky obrazovky vedle sebe (bez posuvného porovnávání), poznámka o agentním vývoji zobrazena, blok s příkazy pro sestavení zobrazen.
- **FR-005**: Od stanovené šířky obrazovky dolů MUSÍ hlavička místo vodorovné navigace zobrazit ikonu menu („tři čárky"), která otevírá a zavírá rozbalovací panel ukotvený přímo pod hlavičkou — navigační odkazy pod sebou a přepínač motivu, zbytek stránky zůstává viditelný; při otevření se ikona změní na křížek. Volba odkazu menu zavře a přejede na cílovou sekci. Nad stanovenou šířkou zůstává vodorovná navigace dle návrhu.
- **FR-006**: Web NESMÍ na šířkách displeje od 320 px výše způsobovat vodorovné skrolování celé stránky; vícesloupcové mřížky se musí přeskládávat, obrázky zmenšovat a bloky s dlouhými řádky smí skrolovat pouze uvnitř vlastního rámečku.
- **FR-007**: Web MUSÍ být sestavován z upravitelných zdrojů do adresáře `./public` dokumentovaným, opakovatelným postupem; přímé ruční úpravy vygenerovaných souborů v `./public` nesmí být součástí běžné správy webu.
- **FR-008**: Sdílené hodnoty — přinejmenším číslo verze programu, název instalačního souboru a odkaz ke stažení — MUSÍ být ve zdrojích definovány na jediném místě a při sestavení se propsat do všech výskytů na webu.
- **FR-009**: Adresář `./public` MUSÍ po sestavení zůstat úplným kořenem nasazení: podpůrné soubory webu (chybová stránka 404, pokyny pro roboty, mapa webu, ikony webu, konfigurace hlaviček, písma) musí zůstat zachovány, případně aktualizovány tak, aby odpovídaly novému obsahu.
- **FR-010**: Úvodní stránka MUSÍ nést správné popisné údaje pro vyhledávače a náhledy při sdílení (titulek, popis, kanonická adresa, náhledový obrázek a texty odpovídající skutečnému obsahu nového webu), navazující na údaje stávající stránky.
- **FR-011**: Interaktivní stavy návrhu (zvýraznění odkazů, tlačítek a položek navigace při najetí) MUSÍ být ve výsledném webu zachovány standardními prostředky.
- **FR-012**: Web NESMÍ za běhu záviset na externích službách třetích stran (např. externí služba pro načítání písem) a NESMÍ obsahovat žádnou klientskou analytiku, měřicí skripty ani cookies; písma návrhu musí být poskytována z vlastního nasazení, ve shodě s přístupem stávající stránky. Statistiky návštěvnosti pokrývají výhradně serverové metriky hostingové platformy.
- **FR-013**: Snímky obrazovky aplikace MUSÍ být ve zdrojích vedeny tak, aby jejich výměna (dodání finálních snímků ve vyšší kvalitě pod stejnými názvy) proběhla prostým nahrazením souborů a jedním sestavením, bez úprav obsahu či šablon.

### Key Entities

- **Zdroje webu**: Upravitelné podklady (obsah sekcí, šablony stránky, styly, chování), ze kterých se web sestavuje; oddělené od vygenerovaného výstupu.
- **Sdílená konfigurace webu**: Centrálně definované hodnoty propisované do více míst — číslo verze, název instalačního souboru, odkazy ke stažení a na repozitář, kontakt.
- **Grafické podklady**: Loga (světlá a tmavá varianta, ikona), snímky obrazovky obou motivů, ikony webu a písma; přenášejí se z návrhu a ze stávajícího webu do výstupu. Snímky obrazovky z exportu jsou dočasné a před nasazením budou nahrazeny finálními.
- **Výstup nasazení (`./public`)**: Kompletní vygenerovaný web připravený k nasazení, včetně podpůrných souborů (404, roboty, mapa webu, hlavičky).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Web sestavený do `./public` zobrazuje 100 % sekcí a obsahu grafického návrhu a při načtení nevykazuje žádné chybějící zdroje ani viditelné vady zobrazení, ve světlém i tmavém motivu.
- **SC-002**: Na displeji o šířce 320–430 px projde návštěvník celou stránku bez jediného vodorovného posunu celé stránky a na libovolnou sekci se dostane nejvýše dvěma klepnutími (otevření menu + volba položky).
- **SC-003**: Zvolený motiv zůstane zachován po obnovení stránky i při opakované návštěvě a při načtení se neobjeví záblesk opačného motivu.
- **SC-004**: Vydání nové verze programu na webu vyžaduje změnu jediné hodnoty ve zdrojích a jedno spuštění sestavení; po něm neexistuje ve výstupu žádný výskyt předchozího čísla verze a celý úkon zabere správci do 5 minut.
- **SC-005**: Nový správce podle dokumentace projektu sestaví web z čistého klonu repozitáře na první pokus, bez dalších instrukcí.
- **SC-006**: Náhled odkazu sdíleného ve zprávách či na sociálních sítích ukazuje titulek, popis a obrázek odpovídající novému webu.

## Assumptions

- Výchozí hodnoty volitelných prvků návrhu platí: snímky obrazovky vedle sebe (varianta s posuvným porovnáváním se nepřenáší), poznámka o agentním vývoji i blok s příkazy pro sestavení jsou zobrazeny.
- Textový obsah webu zůstává v angličtině přesně dle exportovaného návrhu; tato úprava obsah nemění, pouze jej převádí.
- Stávající podpůrné soubory v `./public` (ikony, chybová stránka, pokyny pro roboty, mapa webu, konfigurace hlaviček, self-hostovaná písma) se zachovají a aktualizují jen tam, kde to nový obsah vyžaduje; dočasná „coming soon" úvodní stránka bude nahrazena.
- Hosting nadále servíruje `./public` jako statické soubory; web nevyžaduje žádnou serverovou logiku.
- Přesná šířka, pod kterou se navigace mění na hamburger menu, bude zvolena při návrhu řešení tak, aby se plná navigace nikdy nelámala ani nepřetékala; požadavkem je existence a funkčnost obou režimů, nikoli konkrétní číslo.
- Písmo „IBM Plex Mono", které stávající stránka zatím self-hostovaná nemá, bude doplněno stejným způsobem jako již používané písmo „Archivo".
- Adresář `./temp/web_source` zůstává pouze zdrojovou referencí návrhu a není součástí nasazení.
- Snímky obrazovky z exportu jsou zástupné; ostré nasazení webu počká na dodání finálních snímků od autora (výměna dle FR-013 nemění rozvržení stránky).
- Aktuální hodnoty sdílené konfigurace odpovídají návrhu: verze 0.1.0, instalátor `tandemcommander-0.1.0-x64-setup.exe`, odkazy na repozitář `github.com/tandemcommander/tandemcommander`. GitHub repozitář i release v0.1.0 s instalátorem budou v době nasazení webu existovat, odkazy se proto přebírají beze změny a nevyžadují žádné náhradní chování.
