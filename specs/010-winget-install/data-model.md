# Data Model: Installation Through winget on the Website

No new entity. The feature changes one object in the site's shared values and a handful of
catalog keys. Decisions referenced as R1-R7 are in [research.md](research.md).

## 1. winget package - `src/_data/site.json` → `winget`

| Field | Before | After | Meaning |
|-------|--------|-------|---------|
| `id` | `PavelStupka.TandemCommander` | unchanged | package identifier in the catalogue |
| `command` | `winget install tandemcommander` | `winget install --id PavelStupka.TandemCommander -e` | install command, displayed and copied |
| `upgradeCommand` | - (new) | `winget upgrade --id PavelStupka.TandemCommander -e` | update command, shown in the hint |
| `available` | `false` | `true` | availability mark |

Rules:

- `command` and `upgradeCommand` are the only places on the site where a winget command is
  written (FR-012).
- Both contain `--id <id> -e` with the value of `id` (test).
- Neither contains a version number (FR-008).
- `available` is a boolean. It is not touched by the release procedure (`release:apply` writes
  only `version`, `releaseDate`, `installerSizeBytes`).

### Availability mark - what it governs

```text
available: true                         available: false
---------------------------------       ---------------------------------
download section: winget option         download section: no winget option
card 06 ends: card6InstallWinget        card 06 ends: card6Install
```

Both states build and pass the checks. The transition in either direction is one edit of
`available` plus a rebuild (FR-013).

## 2. Catalog keys - `src/_data/i18n/en.json`, `cs.json`

Every key exists in both catalogs (build gate). All values are plain text; none is added to
`RICH_TEXT_KEYS`.

| Key | Change | EN | CS |
|-----|--------|----|----|
| `features.card6Text` | shortened to the first sentence | "A one-time utility brings your hot paths, FTP bookmarks, user menu, colours and plugin settings over from Altap Salamander." | "Jednorázový nástroj přenese oblíbené cesty, FTP záložky, uživatelské menu, barvy a nastavení pluginů z Altap Salamanderu." |
| `features.card6Install` | new | "Install with the signed installer." | "Instaluje se podepsaným instalátorem." |
| `features.card6InstallWinget` | new | "Install with the signed installer or through winget." | "Instaluje se podepsaným instalátorem nebo přes winget." |
| `download.wingetHint` | command → placeholder | "Later updates arrive with \`{command}\`." | "Další aktualizace pak zajistí \`{command}\`." |
| `download.wingetLabel` | unchanged | "Or install with winget" | "Nebo nainstalujte přes winget" |
| `download.wingetCopy` / `wingetCopied` | unchanged | "Copy" / "Copied" | "Kopírovat" / "Zkopírováno" |

Rules:

- The first sentence of `card6Text` is today's text verbatim; only the closing sentence moves.
- The two closing sentences are the wordings approved in the spec's Clarifications.
- No catalog value contains `winget install` or `winget upgrade` (test); `{command}` in
  `wingetHint` is replaced with `site.winget.upgradeCommand` before the `inline` filter turns the
  backticks into monospaced text.

## 3. Rendered composition

| Output | Composition |
|--------|-------------|
| Card 06 text | `card6Text` + space + (`card6InstallWinget` if `available` else `card6Install`) |
| winget option (only if `available`) | `wingetLabel` · `command` in `<code>` + copy button · `wingetHint` with `upgradeCommand` |

## 4. Unchanged by design

- `content/releases/*.json` - release history (FR-010).
- `src/pad.njk`, `src/_data/pad.js` - catalogue description file.
- `src/js/main.js` - copy behaviour (R5).
- `version`, `releaseDate`, `installerSizeBytes` and everything derived from them.
