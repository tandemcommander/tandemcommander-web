# Contract: Release record

**File**: `content/releases/<version>.json` · **Consumers**: site build (`src/_data/releases.js`),
`tools/release/release.mjs`, the `/release-web` skill, the PAD file · **Model**:
[data-model.md §1](../data-model.md)

## Shape

```json
{
  "version": "0.1.8",
  "date": "2026-09-20",
  "build": 192,
  "kind": "feature",
  "summary": {
    "en": "Each panel can now keep several directories open in tabs, and the program no longer needs the Visual C++ runtime or trips antivirus heuristics.",
    "cs": "Každý panel teď umí držet několik adresářů v záložkách a program už nepotřebuje Visual C++ runtime ani nedráždí antiviry."
  },
  "highlights": [
    {
      "id": "panel-tabs",
      "title": { "en": "Panel tabs", "cs": "Záložky v panelech" },
      "text": {
        "en": "Several directories per panel, browser-style. Each tab keeps its own view, sort order, selection and history, and the whole set comes back at the next start. `Ctrl+Shift+T` opens one.",
        "cs": "Několik adresářů v jednom panelu jako v prohlížeči. Každá záložka si drží vlastní zobrazení, řazení, výběr i historii a po startu se vše obnoví. Novou otevře `Ctrl+Shift+T`."
      },
      "scene": "panel-tabs"
    }
  ]
}
```

A release with nothing visitor-facing is valid with `"highlights": []` (0.1.7).

## Validation - every failure stops the site build with `releases: <file>: <reason>`

| # | Rule | Message names |
|---|------|---------------|
| V1 | file name equals `version + ".json"`; version is `N.N.N` | file, version |
| V2 | versions unique across files | both files |
| V3 | a record exists for `site.json.version` | the missing version and the path to create |
| V4 | current record `date` = `site.json.releaseDate` | both dates |
| V5 | no record has a version greater than `site.json.version` | the record |
| V6 | `kind` ∈ `first, feature, bugfix, maintenance, installer` | value |
| V7 | every LocalizedText has exactly the codes of `languages.json`, all non-empty | field path, language |
| V8 | lengths: summary ≤ 200, title ≤ 40, text ≤ 220 | field path, length |
| V9 | highlight `id` kebab-case and unique within the record | id |
| V10 | `scene`, when present, is the id of a **published** scene | highlight id, scene id |
| V11 | no `<`, `>` or tab in any text (texts are plain; keeps PAD derivation safe) | field path |

## Derived outputs (must not be hand-maintained anywhere else - FR-007)

| Output | Rule |
|--------|------|
| Home "What's new" - header line | current record: version, localized date, `summary[lang]` |
| Home "What's new" - cards | `homeCards` (exactly 6, see data-model §1); each shows version label, title, text; a card whose highlight has `scene` links to `{{ locale.url }}gallery/#<scene>` |
| Release history page | all records, newest first; current one badged; kind label from i18n; `notesUrl` per record |
| PAD `Program_Change_Info` | `padChangeInfo`, ≤ 300 characters, single line |

## Text markup

Plain text. A pair of backticks marks inline code and is rendered - after HTML escaping - as
`<span class="mono">…</span>`. For the PAD file the backticks are dropped. Nothing else is
interpreted.
