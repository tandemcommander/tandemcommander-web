# Research: `/tandem-new-version`

Decisions for the open technical points of [plan.md](plan.md). Each: Decision, Rationale,
Alternatives considered.

## R1 - Where the changelog comes from

**Decision**: Only from `https://raw.githubusercontent.com/tandemcommander/tandemcommander/v<version>/CHANGELOG.md`.
`locateChangelog` becomes `fetchChangelog(version, { fetchImpl })`; the sibling-checkout lookup
(`../tandemcommander/CHANGELOG.md`) and the `--changelog <path>` option are removed from
`changelog.mjs`, `release.mjs` and the README. `changelogSource` in the facts is always that URL.

**Rationale**: FR-002a - the result must be the same on any machine and reflect what was
*published*. The file at the tag is exactly the released changelog; a local checkout can be ahead
(unreleased edits) or behind. The raw host is not subject to the REST API's 60-requests-per-hour
limit and is the path the code already uses as its last fallback. An injectable `fetchImpl` lets the
tests cover success, 404 and network failure without network.

**Alternatives considered**: REST `contents` API (rate-limited, base64 payload, no gain); the
default branch's changelog (may contain the next version's unreleased work - wrong source); keeping
`--changelog` for offline use (violates "only GitHub" and would let manual and assisted results
differ).

## R2 - GitHub access and its failures

**Decision**: Unauthenticated requests, as today: one REST call for `releases/tags/v<version>`
(published? draft? installer asset and exact size) and one raw fetch for the changelog, per
`facts` run. `status`, `scan` and `verify` make no network calls. On a non-2xx answer the problem
line quotes the HTTP status and, for 403/429, GitHub's rate-limit reset time from the response
headers; on a network error the error message. Nothing is written in either case.

**Rationale**: A full run calls `facts` at most twice (start and `apply`), i.e. ≤ 4 requests; the
capture tool adds one REST call to locate the installer. Far below the limit (spec Assumptions),
so no token handling is needed.

**Alternatives considered**: `GITHUB_TOKEN` support (unneeded complexity); caching facts in
`.work/` between `facts` and `apply` (`apply` must re-check that nothing changed on GitHub; two
cheap calls are simpler than cache invalidation).

## R3 - How a run knows where it is (resume)

**Decision**: New read-only command `release:status <version> --json` reports the observable state;
the skill maps it to the first unfinished step. No state file.

| Step done when | Observed through |
|---|---|
| branch | current branch is `release-<version>` (or it exists) |
| facts recorded | `site.json` `version` equals the target |
| combined review recorded | record exists and every `summary` language is non-empty |
| pictures | capture plan for the target lists nothing older (or the author said "no" - asked again on resume, spec Edge Cases) |
| checks | last `release:check` is re-run on resume anyway (cheap, idempotent) |
| committed | `git log devel..release-<version>` contains a commit touching the record and the working tree is clean |

Plus: uncommitted paths (to report pre-existing changes, FR-004), whether local `devel` is behind
`origin/devel` (from the last fetch; the skill runs `git fetch origin devel` first).

**Rationale**: The repository already holds every fact; a separate state file could disagree with
it and would have to be committed or ignored. Deriving state keeps re-runs idempotent (SC-007).

**Alternatives considered**: `.work/release/<version>.state.json` (can go stale, invisible across
machines); letting the skill inspect files ad hoc (non-deterministic, untestable).

## R4 - Which pictures the re-capture question names

**Decision**: New pure function `capturePlan(gallery, version, highlightScenes = [])` in
`lib/content.js` returning `{ must, review, current }` rows `{ scene, theme, appVersion }`; a
capture is *must* when older than `version` and its scene `showsVersion` or is in
`highlightScenes`. `staleReport(gallery, releases)` becomes a thin wrapper
(`capturePlan(gallery, releases.current.version, <current highlight scenes>)`), so the build report
does not change. At the start (before the digest exists) the skill asks with
`capturePlan(gallery, target)` - the version-bearing pictures; after recording, the actual capture
uses the full plan, which may add scenes chosen for highlights in the approved digest. The skill
names any such additions when it announces the capture.

**Rationale**: The question must be asked before anything is written (FR-013), when the highlights
are not yet known; the version-bearing pictures are what decides "worth a new capture?". Highlight
scenes were approved by the author in the combined review, so including them under the same "yes"
is consistent.

**Alternatives considered**: Asking after the review (adds a stop, contradicts the author's
request to decide at start); re-capturing every published scene (slower, changes pictures that did
not need it).

## R5 - Finding stale text (content scan)

**Decision**: Hybrid. `release:scan <version> --json` (pure logic in `tools/release/scan.mjs`)
reads every source of text visible on the website and reports deterministic *candidates*:

- every version-like string `\d+\.\d+\.\d+` (and `v`-prefixed) with file, line/key, language, and
  whether it equals the previous release (highest record below the target);
- phrases that announce the future, from a short per-language list (EN: *planned, coming, soon, on
  its way, will be, not yet*; CS: *plánuj, připravuj, chystá, brzy, zatím ne, bude*);
- the list of scanned sources, so the assistant reads exactly those.

Sources: `src/_data/i18n/*.json` (all catalog values incl. the story), `src/**/*.njk` (literal text
in templates, incl. `pad.njk`), `content/gallery/scenes.json` (titles, captions, alt text).
Excluded: `content/releases/` (history, FR-011), `README.md` (spec Clarifications), `specs/`,
`public/`.

The skill then judges each candidate and reads the sources in full against the changelog section
and facts, producing *content proposals* (data-model §5) for the combined review. Historical
phrasing ("since 0.1.7", "first released in") is filtered by the assistant, not by the script.

**Rationale**: The deterministic part guarantees no hard-coded version is missed and is testable
(SC-005 for the version kind); recognising that "planned" refers to a feature the changelog now
lists requires reading comprehension - the assistant's job. Today the scan finds no hard-coded
version outside `site.json` (checked 2026-10-17), so a hit is meaningful.

**Alternatives considered**: Purely assistant-driven scan (no guarantee, not repeatable); purely
regex-driven corrections (cannot judge meaning, many false positives in the story).

## R6 - Verifying the generated site

**Decision**: Pure module `tools/release/verify.mjs`: `verifySite({ files, read, site, record,
languages })` returns `{ ok, checks: [{ id, ok, problems: [] }] }`; `release.mjs verify` wires it to
the file system and prints it; `release:check` runs it after the build and fails on any problem.
Checks (FR-017):

1. existence: home and release-history page per language (`/`, `/cs/`, `/releases/`,
   `/cs/releases/` from `languages.json`), `pad.xml`, `sitemap.xml`;
2. each home page contains `v<version>` and the installer name `tandemcommander-<version>-x64-setup.exe`;
3. no generated `.html`/`.xml` contains an installer name of any other version;
4. each release-history page lists the target version before every other version;
5. `pad.xml`: `Program_Version`, release year/month/day, `File_Size_Bytes` equal `site.json`;
   `Program_Change_Info` equals `buildPadChangeInfo(record)` (XML entities decoded).

**Rationale**: Turns the manual greps of the 0.1.9 quickstart (V5) into a gate usable by hand;
injecting `files`/`read` keeps it testable over small fixtures.

**Alternatives considered**: An HTML parser dependency (no new dependencies; string and regex
checks over our own generated markup suffice); checking in the Eleventy build (the build cannot see
its own final output reliably, and the check must be runnable separately).

## R7 - Branch handling

**Decision**: Done by the skill with git, after the combined review is approved and before the
first write: `git fetch origin devel`; if local `devel` is behind, tell the author and ask (do not
fast-forward silently); then `git switch -c release-<version> devel`, or `git switch` to it if it
exists. If it exists with commits unrelated to the release, stop and ask (spec Edge Cases).

**Rationale**: Creating the branch is cheap and reversible but still a change; doing it after the
approval honours "nothing changed before approval" literally (SC-004) while the facts and the scan
are read-only and run on any branch. Git operations stay in the skill because they are
author-facing decisions, not facts.

**Alternatives considered**: Branch first (changes state before approval); a `release:branch`
script command (adds little; the decisions around it are conversational).

## R8 - Commit

**Decision**: Before staging, `release:status` lists changed paths; anything outside `src/`,
`content/`, `public/` (or present before the session, FR-004) is shown and excluded unless the
author says otherwise. Staging is by path (`git add -A -- src content public`), never `git add .`.
Message, in the style of `bcff876`:

```text
Version <version> release.

<one paragraph: record with the approved bilingual digest, site facts, re-captured scenes
(or "pictures kept from <previous>"), content corrections, regenerated public/>

<attribution trailer required by the session>
```

The commit is created only after the author approves the message (FR-019). No `--no-verify`,
no amend.

**Rationale**: Sources and regenerated site in one commit (the project rule); path-limited staging
prevents sweeping in stray files.

**Alternatives considered**: Leaving commits to the author (rejected in clarification);
one commit per step (noisier history, the author asked for one).

## R9 - Looking at re-captured pictures

**Decision**: After `npm run shots`, the skill opens each re-captured full-size image
(`src/assets/gallery/<scene>-<theme>.webp`) and `src/assets/screenshot-*.png` with its image-reading
tool and confirms the title bar reads "Tandem Commander <version>" and the content looks like the
scene's caption. `release:status` independently confirms `captures.json` records the target
`appVersion` for each. A picture failing either is reported and not treated as current (FR-015).

**Rationale**: The capture tool already validates sizes and records metadata; only a visual check
catches a wrong window state. WebP is readable by the assistant's image input; if a file cannot be
read, the PNG counterpart from `.work/shots/` is used.

**Alternatives considered**: OCR in the script (new dependency, brittle on small title-bar text).

## R10 - Retiring `/release-web`

**Decision**: Delete `.claude/skills/release-web/`. Repoint every live reference: README release
section and tree, `tools/release/DIGEST-STYLE.md`, the build error message in `lib/content.js`
(`… or /tandem-new-version <version>`), comments in `release.mjs`. Historic spec documents of 007
stay as written, except a one-line note at the top of `contracts/release-cli.md` that 011
supersedes it.

**Rationale**: FR-023 - one entry point, no alias; historic specs record what was decided then.

**Alternatives considered**: Alias skill (rejected in clarification).

## R11 - Language of the conversation

**Decision**: The skill talks to the author in the language the author uses in the session
(Czech today); the digest and corrections are drafted in every site language as before. The
combined review lists, per item, both languages side by side.

**Rationale**: The author reviews Czech and English texts together (DIGEST-STYLE: same facts, same
order); the surrounding explanations follow the conversation.

**Alternatives considered**: English-only dialogue (needless friction for the author).
