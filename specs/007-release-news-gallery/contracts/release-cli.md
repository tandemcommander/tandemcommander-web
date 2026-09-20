# Contract: Website release procedure

Two layers (FR-011a): a deterministic script and an assistant skill that wraps it.
**Model**: [data-model.md](../data-model.md) · **Decisions**: [research.md R9, R10](../research.md)

## Layer 1 - `tools/release/release.mjs` (Node ≥ 22, no dependencies)

Exposed as npm scripts. None of them commits, pushes or deploys (FR-011).

### `npm run release:facts -- <version> [--changelog <path>] [--json]`

Read-only. Establishes the facts of a release and writes nothing under `src/` or `content/`.

| Fact | Source |
|------|--------|
| published, not draft | GitHub `releases/tags/v<version>` |
| installer asset + exact size | asset named `tandemcommander-<version>-x64-setup.exe` |
| release date, build number | `## [<version>] - <date>` and `**Build N.**` in the application changelog |
| changelog section | same; saved to `.work/release/<version>-changelog.md` |

Changelog lookup order: `--changelog` → `../tandemcommander/CHANGELOG.md` → raw file at tag
`v<version>` on GitHub.

Output (`--json`):

```json
{ "version": "0.1.9", "date": "2026-10-04", "build": 193,
  "installer": { "name": "tandemcommander-0.1.9-x64-setup.exe", "bytes": 8301234 },
  "changelogFile": ".work/release/0.1.9-changelog.md",
  "kindHint": "feature",
  "warnings": ["GitHub published_at (2026-10-05) differs from changelog date (2026-10-04)"] }
```

Exit `1` with one line per missing fact when: release not found or draft · installer asset
missing · no changelog section for the version · section still headed *Unreleased* · version not
greater than or equal to the site's current one (FR-012). `kindHint` is `feature` when the section
has an *Added* heading, `installer` when its lead says the application is unchanged, else `bugfix`
- a hint only.

### `npm run release:apply -- <version>`

Runs `facts` first and refuses on any failure, **before changing anything**. Then:

1. sets `version`, `releaseDate`, `installerSizeBytes` in `src/_data/site.json` (formatting
   preserved);
2. if `content/releases/<version>.json` does not exist, creates the skeleton - `version`, `date`,
   `build`, `kind` = hint, `summary` with an empty string per site language, `highlights: []`;
   an existing record is never overwritten, only its `date`/`build` are reported if they differ.

Idempotent: a second run changes nothing.

### `npm run release:check`

1. `npm test` (pure-logic tests) and `npm run build` - the build gates of
   [release-record.md](release-record.md) and [scene-catalog.md](scene-catalog.md) apply; an
   empty summary from the skeleton fails here with the field named (SC-003);
2. prints the **stale-image report** from `captures.json` (data-model §3): *must re-capture* /
   *older, review* / *current*, with the capturing version per image;
3. prints the remaining manual steps: preview (`npm run dev`), re-capture if needed
   (`npm run shots`), social image if the main window changed (`npm run og`), commit on the release
   branch, merge, deploy.

Exit `0` only if tests and build passed. A non-empty *must re-capture* list is a warning, not a
failure - the spec allows a website release with older images.

## Layer 2 - skill `.claude/skills/release-web/SKILL.md` (`/release-web <version>`)

The assistant's obligations, in order:

1. run `release:facts`; on failure relay the missing facts and **stop**;
2. read the saved changelog section and `tools/release/DIGEST-STYLE.md`;
3. draft `kind`, `summary` and 0-6 `highlights` in **every** site language, proposing a `scene`
   for each highlight that an existing published scene illustrates, and naming any highlight that
   deserves a *new* scene;
4. show the draft in full and wait for the author: accept, edit, or rewrite - nothing is written
   before an explicit approval;
5. run `release:apply`, then write the approved texts into the record;
6. run `release:check`; relay build errors verbatim and fix only what the author approves;
7. relay the stale-image report and the manual steps. Never commit, push, merge or deploy.

`DIGEST-STYLE.md` fixes: audience, what qualifies as a highlight, limits (title ≤ 40, text ≤ 220,
summary ≤ 200), plain text + backticks, how to group fix lists, tone per language, and the nine
backfilled records as worked examples.

## By hand, without an assistant

`release:facts` → `release:apply` → fill the record's texts in an editor → `release:check`.
Identical gates, identical result (FR-011a, FR-012).
