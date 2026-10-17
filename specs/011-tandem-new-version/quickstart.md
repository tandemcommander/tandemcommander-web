# Quickstart: Validating `/tandem-new-version`

Run from the repository root on branch `011-tandem-new-version` after implementation. Commands and
outputs: [contracts/release-cli.md](contracts/release-cli.md), [data-model.md](data-model.md);
skill behaviour: [contracts/skill.md](contracts/skill.md).

No version newer than 0.1.9 is published yet, so V1-V7 validate the parts against 0.1.9 and
synthetic input; V8 is a rehearsal of the skill; V9 is the first real release.

## Prerequisites

- Node ≥ 22, `npm install` done, network access to GitHub.
- For V8 capture only: Windows Sandbox enabled, no other Sandbox window open.

## V1 - Unit tests (FR-002a, FR-011, FR-017, R4)

```bash
npm test
```

Expected: all suites pass, including `release.changelog`, `release.status`, `release.scan`,
`release.verify`, `content.capture-plan`; no test touches the network.

## V2 - Facts come from GitHub only (FR-002a, SC-008)

```bash
npm run release:facts --silent -- 0.1.9 --json
npm run release:facts --silent -- 0.1.9 --changelog ../tandemcommander/CHANGELOG.md; echo "exit $?"
```

Expected: first command exits 0 with date 2026-10-07, build 193, installer 8013936 bytes and
`changelogSource` equal to the raw GitHub URL at tag `v0.1.9` - identical whether or not
`../tandemcommander` exists (rename it temporarily to compare). Second command exits 64 explaining
that the changelog is read from the release tag only.

## V3 - Refusal changes nothing (FR-002, SC-004)

```bash
git status --short > /tmp/before.txt
npm run release:facts --silent -- 9.9.9; echo "exit $?"
npm run release:facts --silent -- 0.1.8; echo "exit $?"
npm run release:facts --silent -- 0.2; echo "exit $?"
git status --short | diff /tmp/before.txt -
```

Expected: each exits 1 with a reason (release not found / older than the site's version / not a
version); `diff` prints nothing.

## V4 - Status reads the state (FR-020, R3)

```bash
npm run release:status --silent -- 0.1.9 --json
```

Expected: `siteVersion` 0.1.9, `record` `filled`, `previousVersion` 0.1.8, `captures.must` empty
(the five version-bearing pictures were re-captured for 0.1.9), `git.releaseBranchExists` false.

## V5 - Scan finds planted staleness, ignores history (FR-010, FR-011, SC-005)

Temporarily add to `src/_data/i18n/en.json` a value containing "since 0.1.8 the program is
planned to open RAR archives" and the same idea to `cs.json`; then:

```bash
npm run release:scan --silent -- 0.1.9 --json
git checkout -- src/_data/i18n
```

Expected: findings of kind `version` (`0.1.8`, `isPrevious: true`) and `future` (`planned` /
the Czech phrase) at the planted keys in both languages; no finding from `content/releases/` or
`README.md`; `sources` lists both catalogs, the templates and `content/gallery/scenes.json`.

## V6 - Verify passes on the current site and catches a stale page (FR-017, SC-003)

```bash
npm run build && npm run release:verify; echo "exit $?"
sed -i 's/tandemcommander-0\.1\.9-x64/tandemcommander-0.1.8-x64/' public/cs/index.html
npm run release:verify; echo "exit $?"
npm run build
```

Expected: first run all checks ok, exit 0; after the edit `no-previous-installer` (and
`home-shows-version` if affected) fail naming `public/cs/index.html`, exit 1; the rebuild restores
the file.

## V7 - Check includes verify; build report unchanged (R4, R6)

```bash
npm run release:check
```

Expected: tests, build and verify pass; the stale-image report prints the same groups as before
the change (no *must re-capture*, three *older, review*, five current), and the manual steps name
`/tandem-new-version`.

## V8 - Rehearsal of the skill (User Stories 1-5)

On a throwaway branch from `devel` (e.g. `rehearsal`), run `/tandem-new-version 0.1.9`.
Expected:

- it reports 0.1.9 as already recorded (resume, FR-020): no picture question (nothing must be
  re-captured), no digest drafted, no files rewritten;
- it still runs the scan (findings, if any, are shown as proposals), `release:check`, and offers
  the handover; decline the commit at stop 3 → tree unchanged and the skill says so;
- `.claude/skills/release-web/` no longer exists and `/release-web` is not offered.

Then delete the throwaway branch. Optionally, to exercise the picture path, edit
`content/gallery/captures.json` so one version-bearing scene claims `0.1.8`, answer "yes" at
stop 1, and confirm the skill captures exactly that scene and looks at the result (Sandbox
required); restore with `git checkout -- .`.

## V9 - First real release (all SCs)

At the next published version: `/tandem-new-version <x.y.z>` on a clean `devel`.
Expected: three stops only (SC-001); nothing changed before stop 2 is approved (SC-004); branch
`release-<x.y.z>`; after the run `release:verify` passes (SC-003); exactly one commit on the release
branch, nothing pushed, `main` and `devel` unchanged; the author's active time under 20 minutes
(SC-002).

## Scope check

```bash
git status --short
git diff --stat devel...HEAD
```

Expected changes: `.claude/skills/tandem-new-version/`, removal of `.claude/skills/release-web/`,
`tools/release/{release,changelog,status,scan,verify}.mjs`, `tools/release/DIGEST-STYLE.md`,
`lib/content.js`, `tests/` (new suites, fixtures), `package.json` (three scripts), `README.md`,
`specs/007-release-news-gallery/contracts/release-cli.md` (superseded note),
`specs/011-tandem-new-version/`, `.specify/feature.json`. No change under `content/`, `src/` or
`public/` from this feature.
