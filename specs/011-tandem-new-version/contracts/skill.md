# Contract: Skill `/tandem-new-version <version>`

File: `.claude/skills/tandem-new-version/SKILL.md` (frontmatter `name`, `description`,
`argument-hint: <version, e.g. 0.2.0>`). Replaces `.claude/skills/release-web/`, which is deleted
(FR-023). Script commands: [release-cli.md](release-cli.md). Steps and states:
[data-model.md §6](../data-model.md).

## Hard rules (verbatim in the skill)

- Facts about the version come only from the published GitHub release and the changelog at its tag
  (via `release:facts`). Never read `../tandemcommander` or any local application source.
- Nothing is written - no file, no branch - before the author approves the combined review.
- Never edit `public/` by hand; it changes only through the build.
- Never commit to `main` or `devel`; never push, merge or deploy. The only commit is on
  `release-<version>`, after the author approves its message.
- Never write to the application's GitHub repository.
- Every claim in the digest and in a correction is traceable to the changelog section or a fact.
- Do not overwrite approved record texts or re-captured pictures on a resume unless the author asks.

## Stops (exactly three in a full run)

| # | When | Asks |
|---|---|---|
| 1 | right after facts are established | "Re-capture the pictures for <version>?" - lists version-bearing pictures from `status.captures.must` (yes / no) |
| 2 | after drafting | combined review: digest (EN + CS) + left-outs + gallery candidates + uncertain wording + content proposals; each item accept / edit / reject; repeat edited parts until approved |
| 3 | after checks and handover | proposed commit message; approve / edit / decline |

Other questions arise only for exceptional states: pre-existing changes (FR-004), local `devel`
behind `origin/devel`, an existing `release-<version>` with unrelated commits, a build failure
outside the record.

## Steps

1. **Version.** Empty or not `MAJOR.MINOR.PATCH` → ask and stop.
2. **Where are we.** `git fetch origin devel`, then `release:status <version> --json`. Report
   pre-existing changes and ask (FR-004). If `record == filled`, skip to the first unfinished step
   (resume) and say which steps are done.
3. **Facts.** `release:facts <version> --json`; on exit 1 relay every line and stop.
4. **Stop 1** - the picture question (skip if `captures.must` is empty: say so).
5. **Draft.** Read the saved changelog section, `tools/release/DIGEST-STYLE.md`, the two newest
   records, published scene ids; draft `kind`, `summary`, `highlights` in every language within the
   limits. Run `release:scan <version> --json`; read every listed source; turn real staleness into
   proposals, drop historical mentions.
6. **Stop 2** - combined review.
7. **Branch.** Create or switch to `release-<version>` from `devel` (research R7).
8. **Record.** `release:apply <version>`; write the approved texts into the record (keep
   `version`, `date`, `build`); apply accepted proposals in every language.
9. **Capture** (only on "yes" and non-empty `must`). Re-run `status` for the full plan; announce
   the scenes (naming any added by highlights) and the Sandbox requirements; run
   `npm run shots -- --version <version> --scene <list>`; on failure relay verbatim and continue.
   Look at each re-captured picture (research R9); flag any that does not show the version.
10. **Check.** `release:check` (tests, build, verify, stale report). On failure fix only the record
    or an accepted correction; ask before touching anything else.
11. **Handover.** Changed files grouped by purpose; results of every check; open items (pictures
    kept by choice or after failure, older pictures, rejected proposals, gallery candidates, social
    image if the main window changed); remaining steps: preview `npm run dev`, push, merge, deploy.
12. **Stop 3** - commit message; on approval stage by path and commit (research R8). On decline,
    leave the tree uncommitted and say so.

## Output to the author

Conversation language follows the author; digest and corrections shown in every site language side
by side (research R11). Final message: one-paragraph summary and the branch name.
