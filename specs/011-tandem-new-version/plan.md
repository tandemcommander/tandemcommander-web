# Implementation Plan: One-Command Website Update for a New Version (`/tandem-new-version`)

**Branch**: `011-tandem-new-version` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-tandem-new-version/spec.md`

## Summary

Replace the assisted release command `/release-web` with `/tandem-new-version <version>`, a
Claude Code skill that takes the author from "the version is published on GitHub" to "a
reviewed, committed `release-x.y.z` branch" with three stops: the re-capture question, one combined
review (digest and content corrections), and the commit approval.

The approach keeps the two-layer split of feature 007: everything factual and checkable goes into
the deterministic script `tools/release/release.mjs` (usable by hand, testable without an
assistant); the skill only does what needs judgement (digest wording, recognising stale statements,
looking at pictures) and talks to the author. The script layer gains:

- **GitHub-only facts** - the changelog is read only from the release tag on GitHub; the sibling
  checkout lookup and `--changelog` are removed ([research.md](research.md) R1).
- **`release:status`** - read-only snapshot of a release in progress (branch, recorded facts,
  record state, pictures, build, commit) from which the skill derives where to resume (R3).
- **`release:scan`** - deterministic candidates for stale text: version-like strings and
  "planned / coming soon" phrases in every source of visible text, outside the release records (R5).
- **`release:verify`** - checks the generated site against the recorded facts (FR-017); also run as
  part of `release:check` (R6).
- a **capture plan** for a target version (which pictures show the version and are older), shared
  by `status` and the existing stale-image report (R4).

## Technical Context

**Language/Version**: JavaScript on Node ≥ 22 (machine runs 24); ES modules for tools, CommonJS
for `lib/content.js` (existing split); Markdown for the skill

**Primary Dependencies**: none new - Node built-ins (`fetch`, `child_process`, `fs`), Eleventy 3
for the build, the existing capture tool `tools/screenshots/capture.mjs` (Windows Sandbox, `sharp`)

**Storage**: Committed files only - `src/_data/site.json`, `content/releases/<version>.json`,
`src/_data/i18n/{en,cs}.json`, templates, `content/gallery/{scenes,captures}.json`, images under
`src/assets/`, generated `public/`. Scratch output under the ignored `.work/release/`. No session
state file: state is derived from the repository (R3).

**Testing**: `node --test` (`npm test`) - new suites for the GitHub changelog source, the release
status, the capture plan, the scan, and the verification (all pure functions over fixtures, no network); the existing
suites keep passing; build gates via `npm run build`; end-to-end scenarios in
[quickstart.md](quickstart.md)

**Target Platform**: The author's Windows 11 machine running Claude Code, with network access to
GitHub and Windows Sandbox for captures; the website itself is unchanged (Cloudflare Workers
static assets)

**Project Type**: Developer tooling for a static website (CLI script + assistant skill)

**Performance Goals**: `status`, `scan`, `verify` finish in a few seconds on the current site
(≈ 10 sources of visible text, ≈ 10 generated pages); GitHub requests per run ≤ 5, well inside the
unauthenticated limit of 60 per hour

**Constraints**: facts only from `github.com/tandemcommander/tandemcommander` (FR-002a) · nothing
written before the combined review is approved (FR-007) · `public/` only through the build ·
no push, merge or deploy (FR-019) · never write to `main`/`devel` · manual path keeps identical
gates (FR-023) · no new npm dependency

**Scale/Scope**: 1 new skill, 1 removed skill · `release.mjs` gains 3 commands and loses 1 option ·
3 new tool modules (`status.mjs`, `scan.mjs`, `verify.mjs`), `changelog.mjs` and
`lib/content.js` adjusted · 5 new test files · README, DIGEST-STYLE, one build message and the 007 contract repointed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so it defines no gates. The
project's standing rules are applied instead:

| Gate | Status |
|------|--------|
| Every feature on its own `NNN-name` branch; never commit to the main line | Pass - this feature is on `011-tandem-new-version`. The *releases* the skill later prepares use `release-x.y.z` by the author's decision (spec Clarifications); they create no spec directory |
| `public/` is generated, not hand-edited | Pass - the skill and scripts change `public/` only via `npm run build` (FR-022) |
| Values that appear in more than one place come from `site.json` | Pass - verification reads the expected values from `site.json` and the record; nothing new is duplicated |
| Every user-visible string in the i18n catalogs, identical key sets | Pass - content corrections edit catalog values in all languages together (FR-012); catalog parity stays a build gate |
| A release can be done without the assistant, with identical gates | Pass - every check lives in `release.mjs` (`facts`, `apply`, `scan`, `verify`, `check`, `status`) |
| Commit, merge, deploy are the author's | Changed by decision - the skill may commit on `release-x.y.z` after explicit approval; push, merge and deploy stay with the author (spec Clarifications, FR-019) |
| No dependency on files outside this repository | Pass - the sibling `../tandemcommander` lookup is removed (FR-002a) |

Post-design re-check (after Phase 1): unchanged, no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/011-tandem-new-version/
├── plan.md              # This file
├── research.md          # Phase 0 - decisions R1-R11
├── data-model.md        # Phase 1 - facts, status, capture plan, scan finding, verification result
├── quickstart.md        # Phase 1 - validation scenarios
├── contracts/
│   ├── release-cli.md   # scripted layer v2 (supersedes 007 contracts/release-cli.md layer 1)
│   └── skill.md         # /tandem-new-version - steps, stops, rules
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
.claude/skills/
├── tandem-new-version/SKILL.md   # NEW - the assisted layer
└── release-web/                  # REMOVED

tools/release/
├── release.mjs          # + status, scan, verify; check runs verify; --changelog removed
├── changelog.mjs        # locateChangelog → fetchChangelog (GitHub tag only); parser unchanged
├── status.mjs           # NEW - pure: release status + next step from gathered inputs
├── scan.mjs             # NEW - pure: findings from visible-text sources
├── verify.mjs           # NEW - pure: checks over generated files
└── DIGEST-STYLE.md      # wording: /release-web → /tandem-new-version

lib/content.js           # capturePlan(gallery, version, highlightScenes); staleReport reuses it;
                         # build message points to /tandem-new-version

tests/
├── release.changelog.test.js    # + GitHub source URL / failure messages (injected fetch)
├── release.scan.test.js         # NEW
├── release.verify.test.js       # NEW
├── release.status.test.js       # NEW
├── content.capture-plan.test.js # NEW
└── fixtures/                    # + small generated-page and source fixtures

README.md                                     # release section rewritten for the new command
specs/007-release-news-gallery/contracts/release-cli.md   # note: superseded by 011
```

**Structure Decision**: Extend the existing release tooling in place (`tools/release/`,
`lib/content.js`, `tests/`) and add one skill directory; no new top-level directory, no new
package. Pure logic sits in importable modules so it can be tested without network, Sandbox or
build; `release.mjs` stays the only entry point that touches the network, git or the file system
beyond reading.

## Complexity Tracking

No violations to justify.
