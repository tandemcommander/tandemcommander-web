# Contract: Release digest 0.1.9

The exact content of `content/releases/0.1.9.json` beyond the fields the release script wrote
(`version` 0.1.9, `date` 2026-10-07, `build` 193). Format and limits:
`specs/007-release-news-gallery/contracts/release-record.md` and `tools/release/DIGEST-STYLE.md`.
Source of every statement: the 0.1.9 section of the application changelog
(`.work/release/0.1.9-changelog.md`).

## Approval status

| Part | Status |
|------|--------|
| kind, summary, highlights 1 to 5 | Approved by the author on 2026-10-07, without changes |
| highlight 6 `no-password-in-history` | Approved by the author on 2026-10-07, without changes ("vse schvaleno") |

The whole digest is approved; it may be recorded as written below.

No highlight has a `scene` (FR-017).

## Record content

**kind**: `feature`

**summary** (limit 200)

- en (163): The program tells you when a newer version is out, RAR archives open without installing anything, and a long series of fixes ends silent data loss around archives.
- cs (156): Program nově upozorní na novější verzi, archivy RAR otevře bez instalace čehokoli dalšího a dlouhá řada oprav ukončuje tiché ztráty dat při práci s archivy.

**highlights** (title limit 40, text limit 220; order is home-page order)

### 1. `update-check`

- title en (17): New version check
- title cs (19): Kontrola nové verze
- text en (213): About once a day at start-up the program asks GitHub which release is the latest and tells you when a newer one is out. It sends nothing about you or your PC, downloads nothing itself, and one option turns it off.
- text cs (190): Zhruba jednou denně se program při startu zeptá GitHubu na nejnovější vydání a dá vědět, když vyšlo novější. Neposílá nic o vás ani o počítači, sám nic nestahuje a jednou volbou jde vypnout.

### 2. `rar-built-in`

- title en (21): RAR archives built in
- title cs (32): Archivy RAR bez dalšího programu
- text en (191): RAR archives, RAR5 included, open in the panel like a folder: `F3` views, `F5` copies out, `Alt+F9` unpacks. Encrypted and split archives work too. Creating RAR archives remains WinRAR's job.
- text cs (191): Archivy RAR včetně RAR5 se v panelu otevřou jako složka: `F3` zobrazí, `F5` zkopíruje ven, `Alt+F9` rozbalí. Fungují i šifrované a rozdělené archivy. Vytváření archivů RAR zůstává na WinRARu.

### 3. `archive-edits-kept`

- title en (30): Edits inside archives are kept
- title cs (32): Úpravy v archivech se neztrácejí
- text en (212): A file edited inside an archive with `F4` is packed back even when its name has accents - until now such an edit was lost without a word. More fixes end silent data loss when adding or moving files into archives.
- text cs (204): Soubor upravený v archivu přes `F4` se zabalí zpět, i když má v názvu diakritiku - dosud se taková úprava beze slova ztratila. Další opravy ukončují tiché ztráty dat při přidávání a přesouvání do archivů.

### 4. `any-script-text`

- title en (33): Names and passwords in any script
- title cs (32): Názvy a hesla v libovolném písmu
- text en (214): Cyrillic, Chinese or emoji typed into Find Files, Configuration or the command line stays as typed instead of turning into question marks. Archive and FTP passwords with such characters work, and so do the plugins.
- text cs (203): Azbuka, čínština nebo emoji napsané do hledání souborů, Konfigurace či příkazové řádky zůstanou tak, jak jste je napsali, místo otazníků. S takovými znaky fungují i hesla k archivům a FTP a také pluginy.

### 5. `pictview-save-as`

- title en (20): PictView saves again
- title cs (20): PictView zase ukládá
- text en (211): Save As (`Ctrl+S`) writes BMP, PNG, JPEG, GIF and TIFF again and never loses the file it replaces: if anything goes wrong, the existing file stays as it was. The picture on screen can be renamed and deleted too.
- text cs (204): Uložit jako (`Ctrl+S`) znovu zapisuje BMP, PNG, JPEG, GIF a TIFF a nepřijde o soubor, který nahrazuje: když se něco pokazí, původní soubor zůstane beze změny. Zobrazený obrázek lze i přejmenovat a smazat.

### 6. `no-password-in-history`

- title en (23): No passwords in history
- title cs (26): Hesla už nejsou v historii
- text en (209): A password typed inside an address like `ftp://user:password@server` is no longer saved in history - until now it sat in the registry as plain text. A Markdown document can no longer open a web page by itself.
- text cs (193): Heslo napsané přímo v adrese typu `ftp://user:password@server` se už neukládá do historie - dosud leželo v registru jako čitelný text. Dokument Markdown už sám od sebe neotevře webovou stránku.

## Traceability

| Highlight | Changelog entries |
|-----------|-------------------|
| 1 | Added: *Check for a new version* |
| 2 | Added: *RAR archives*; Changed: *Only programs that work are offered* |
| 3 | Fixed: *An edited file with an accented name is packed back into its archive* (feature 096); features 099, 106, 110, 112, 113 |
| 4 | Fixed: *Find Files accepts any text*, *Configuration keeps such text*, *The command line keeps such text*, the ZIP, 7z and FTP password entries, *The plugins use the file and folder names you give them* |
| 5 | Fixed: *PictView's Save As saves again* (feature 105), *PictView renames, deletes and saves over the picture it shows* (feature 111) |
| 6 | Fixed: *A password typed as part of an address is no longer kept in history*, *A Markdown document can no longer open a web page or another window by itself* |

## Deliberately not in the digest

Working external archivers and the removed MS-DOS archivers · the 7-Zip engine update and its
security fixes · archives at very long paths · updates with viewer windows open · the single fixes
covered by highlights 3 to 5 · everything addressed to plugin authors.
