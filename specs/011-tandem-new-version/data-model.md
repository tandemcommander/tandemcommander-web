# Data Model: `/tandem-new-version`

No new persisted data. All entities are either existing committed files (unchanged formats) or JSON
printed by `release.mjs` for the skill and for people. Decisions: [research.md](research.md).

## 1. Release facts (`release:facts --json`) - existing, one field changed

```json
{ "version": "0.2.0", "date": "2026-11-02", "build": 194,
  "installer": { "name": "tandemcommander-0.2.0-x64-setup.exe", "bytes": 8123456 },
  "changelogFile": ".work/release/0.2.0-changelog.md",
  "changelogSource": "https://raw.githubusercontent.com/tandemcommander/tandemcommander/v0.2.0/CHANGELOG.md",
  "kindHint": "feature",
  "warnings": [] }
```

- `changelogSource` is now always the URL at tag `v<version>` (R1); never a local path.
- Validation unchanged: `MAJOR.MINOR.PATCH`; not lower than `site.json` `version`; published, not
  draft; installer asset present; dated changelog section present. Any failure → `problems`, exit 1,
  nothing written.

## 2. Release status (`release:status <version> --json`) - new, read-only

```json
{ "version": "0.2.0",
  "previousVersion": "0.1.9",
  "siteVersion": "0.1.9",
  "git": { "branch": "devel", "releaseBranch": "release-0.2.0", "releaseBranchExists": false,
           "develBehindOrigin": 0, "dirty": ["README.md"], "committed": false },
  "record": "missing",
  "captures": { "must": [ { "scene": "main-window", "theme": "light", "appVersion": "0.1.9" } ],
                "review": [], "current": [] },
  "next": "review" }
```

| Field | Meaning / rule |
|---|---|
| `previousVersion` | highest release record version lower than `version` |
| `siteVersion` | `site.json` `version`; equals `version` once facts are recorded |
| `git.dirty` | `git status --porcelain` paths, for FR-004 and commit scoping |
| `git.develBehindOrigin` | commits `origin/devel` has that `devel` lacks (as of the last fetch) |
| `git.committed` | `devel..release-<version>` has a commit touching `content/releases/<version>.json` and the tree is clean |
| `record` | `missing` · `skeleton` (any `summary` language empty) · `filled` |
| `captures` | `capturePlan(gallery, version, highlightScenes of the record if filled)` (§3) |
| `next` | first unfinished step (§6) - a hint for the skill, derived only from the fields above |

## 3. Capture plan - `lib/content.js` `capturePlan(gallery, version, highlightScenes = [])`

Rows `{ scene, theme, appVersion }` for every published scene × theme that has a capture:

- `current` - `appVersion` ≥ `version`;
- `must` - older, and the scene has `showsVersion: true` or its id is in `highlightScenes`;
- `review` - older, otherwise.

`staleReport(gallery, releases)` = `capturePlan(gallery, releases.current.version, scenes of the
current record's highlights)` plus `available` - output identical to today.

## 4. Scan finding (`release:scan <version> --json`) - new

```json
{ "previousVersion": "0.1.9",
  "sources": ["src/_data/i18n/en.json", "src/_data/i18n/cs.json", "src/_includes/sections/hero.njk", "…",
              "content/gallery/scenes.json"],
  "findings": [
    { "kind": "version", "file": "src/_data/i18n/en.json", "key": "story.p4", "lang": "en",
      "match": "0.1.9", "isPrevious": true, "excerpt": "…as of 0.1.9 the program…" },
    { "kind": "future", "file": "src/_data/i18n/cs.json", "key": "features.archives.text", "lang": "cs",
      "match": "připravuje", "excerpt": "…podpora RAR se připravuje…" } ] }
```

- `kind`: `version` (version-like string) or `future` (phrase from the per-language list, R5).
- Location: `key` (dotted path) for JSON sources, `line` for templates; `lang` from the catalog
  file, or the scene field's language key; templates have `lang: null`.
- Sources exclude `content/releases/`, `README.md`, `specs/`, `public/` (FR-011, Clarifications).
- A finding is a candidate, not a verdict.

## 5. Content proposal - in the conversation only

| Field | Rule |
|---|---|
| location | file + key/line, per language |
| current | exact current text per language |
| proposed | replacement per language; same fact in every language (FR-012) |
| reason | the changelog line or fact it rests on; quoted |
| decision | accepted · edited (then accepted) · rejected |

Created by the skill from scan findings and its own reading (R5); shown in the combined review
together with the digest; only accepted ones are written, after approval. Not persisted - a
rejected proposal leaves no trace (the next run's scan may find it again, which is intended).

## 6. Release steps and state transitions

```text
facts ─► question(pictures) ─► review ─► branch ─► record ─► capture? ─► check+verify ─► handover ─► commit
  │ fail: stop, nothing changed           │approve                       │"no": skip     │fail: fix own record
```

| Step | Writes | Done when (from §2) |
|---|---|---|
| facts | `.work/release/` only | `release:facts` exit 0 |
| question | nothing | answer given (not persisted; asked again on resume while `captures.must` non-empty) |
| review | nothing | author approved digest + proposals |
| branch | git branch | `git.branch == releaseBranch` |
| record | `site.json`, record, accepted corrections | `siteVersion == version` and `record == filled` |
| capture | images, `captures.json`, `screenshot-*.png` | `captures.must` empty, or answer "no" |
| check+verify | `public/` (build) | `release:check` exit 0 |
| commit | one commit | `git.committed` |

`status.next` (computed by `tools/release/status.mjs`) compresses this into the steps a run can
resume at: `review` (record not `filled` or site not recorded - the approval is not persisted, so
branch and record always follow it in the same session) → `branch` (release branch exists but is
not checked out) → `capture` (`captures.must` non-empty) → `check` (check, handover, commit) →
`done` (committed, tree clean).

Resume (FR-020): `record == filled` ⇒ the review is not repeated; existing record texts are never
overwritten without the author asking.

## 7. Verification result (`release:verify [--json]`) - new

```json
{ "ok": false,
  "checks": [
    { "id": "pages-exist", "ok": true, "problems": [] },
    { "id": "home-shows-version", "ok": true, "problems": [] },
    { "id": "no-previous-installer", "ok": false,
      "problems": ["public/cs/index.html links tandemcommander-0.1.9-x64-setup.exe"] },
    { "id": "history-lists-version-first", "ok": true, "problems": [] },
    { "id": "pad-matches-facts", "ok": true, "problems": [] } ] }
```

Expected values come only from `site.json`, `languages.json` and the current record (R6). Exit 0
only when every check is ok.
