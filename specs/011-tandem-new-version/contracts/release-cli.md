# Contract: Release script, version 2 (`tools/release/release.mjs`)

Supersedes layer 1 of [007 contracts/release-cli.md](../../007-release-news-gallery/contracts/release-cli.md).
Node ≥ 22, no dependencies. None of the commands commits, pushes, merges or deploys. Output
shapes: [data-model.md](../data-model.md). Decisions: [research.md](../research.md).

| npm script | Command | Network | Writes |
|---|---|---|---|
| `release:facts` | `facts <version> [--json]` | GitHub | `.work/release/` only |
| `release:apply` | `apply <version>` | GitHub (via facts) | `site.json`, record skeleton |
| `release:status` | `status <version> [--json]` | none | nothing |
| `release:scan` | `scan <version> [--json]` | none | nothing |
| `release:verify` | `verify [--json]` | none | nothing |
| `release:check` | `check` | none | `public/` (build) |

Exit codes: `0` success · `1` refused / check failed (one line per problem on stderr) · `64` usage.

## `facts <version> [--json]` - changed

As in 007, except the changelog source:

- Changelog: only `https://raw.githubusercontent.com/tandemcommander/tandemcommander/v<version>/CHANGELOG.md`.
- `--changelog <path>` is **removed**; passing it is a usage error (exit 64) naming the reason
  ("the changelog is read from the release tag on GitHub only").
- `../tandemcommander/` is never read, even if present (SC-008).
- Problem lines name the URL and GitHub's HTTP status; for 403/429 also the rate-limit reset time.

## `apply <version>` - unchanged

Runs `facts` first, refuses on any problem before writing. Sets `version`, `releaseDate`,
`installerSizeBytes` in `site.json` (formatting preserved); creates the record skeleton if missing;
never overwrites an existing record. Idempotent.

## `status <version> [--json]` - new

Read-only snapshot ([data-model.md §2](../data-model.md)). Uses local git (no fetch - the skill
fetches first) and local files only. Exit `0` whenever the snapshot can be produced, regardless of
progress; `1` only for an invalid version or a repository it cannot read. Human output: one line per
field, `next:` last.

## `scan <version> [--json]` - new

Read-only candidates for stale text ([data-model.md §4](../data-model.md), research R5). Sources
and exclusions are fixed in `scan.mjs` and printed in `sources`. Exit `0` even with findings
(findings are candidates, not failures).

## `verify [--json]` - new

Checks the generated site in `public/` against `site.json`, `languages.json` and the current record
([data-model.md §7](../data-model.md), research R6). Does not build. Exit `0` only if every check
passes; human output lists each failing check with its problems (page and value).

## `check` - changed

1. `npm test`; 2. `npm run build`; 3. **`verify`** (new; failure fails the check); 4. stale-image
report (unchanged wording); 5. remaining manual steps - now naming `/tandem-new-version` for the
assisted path. Exit `0` only if 1-3 pass; a non-empty *must re-capture* list stays a warning.

## By hand, without an assistant

```bash
npm run release:facts -- 0.2.0
npm run release:scan -- 0.2.0         # review the candidates yourself
git switch -c release-0.2.0 devel
npm run release:apply -- 0.2.0
#   … fill summary + highlights in content/releases/0.2.0.json, fix texts the scan pointed to …
npm run shots                          # optional: re-capture pictures that show the version
npm run release:check                  # tests + build + verify + stale-image report
git add -A -- src content public && git commit
```

Identical gates to the assisted path (FR-023).
