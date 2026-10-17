---
name: tandem-new-version
description: Bring a newly published Tandem Commander version onto the whole website in one guided run - establish the release facts from GitHub, ask whether to re-capture the screenshots, draft the bilingual release digest and corrections of every text the version made stale for one combined approval, record everything on a release branch, re-capture and check the pictures, verify the generated site, and commit after approval. Use when the author says a new version is out, asks to "release the web" or update the site for a new version, or runs /tandem-new-version <version>.
argument-hint: <version, e.g. 0.2.0>
---

# /tandem-new-version - the website follows a published version

You are the **assisted layer** of the website release procedure (spec
`specs/011-tandem-new-version/`, contracts `contracts/skill.md` and `contracts/release-cli.md`).
The script `tools/release/release.mjs` does everything factual and checkable; you do what needs
judgement - the digest wording, recognising stale statements, looking at pictures - and you keep
the author in control with exactly three stops.

**Version**: `$ARGUMENTS`. If it is empty or not `MAJOR.MINOR.PATCH` (e.g. `0.2.0`), ask for it
and stop.

Talk to the author in the language they use in this session. Show every website text in all site
languages (`src/_data/languages.json`) side by side.

## Hard rules

- Facts about the version come **only** from the published GitHub release
  (`https://github.com/tandemcommander/tandemcommander/`) and the changelog at its tag, through
  `npm run release:facts`. Never read `../tandemcommander` or any local copy of the application's
  source, even if it exists.
- **Nothing is written - no file, no branch - before the author approves the combined review**
  (stop 2). Reading, `facts`, `status` and `scan` are fine before that.
- Never edit anything under `public/` by hand; it changes only through the build.
- Never commit to `main` or `devel`. Never push, merge or deploy - not as part of this procedure.
  The only commit is on `release-<version>`, after the author approves its message (stop 3).
- Never write to the application's GitHub repository (no releases, tags, issues, commits).
- Do not invent facts. Every claim in the digest and in a correction must be traceable to the
  changelog section or to a release fact. If the changelog says something depends on a third party
  (e.g. acceptance into the winget catalogue), the text says so too.
- On a resumed run, never overwrite an approved record text or re-capture a current picture unless
  the author asks.

## The three stops

1. **Pictures** - right after the facts: re-capture the screenshots for this version, yes or no?
2. **Combined review** - the digest and all content corrections, each item accept / edit / reject.
3. **Commit** - the proposed commit message on `release-<version>`.

Ask anything else only for an exceptional state named in the steps below (pre-existing changes,
`devel` behind `origin/devel`, a foreign `release-<version>` branch, a failure outside your own
texts).

## Steps

### 1. Where are we

Run `git fetch origin devel` (read-only for the working tree), then
`npm run release:status --silent -- <version> --json`.

- `git.dirty` not empty at the start: list the paths, say they are not part of the release, and ask
  whether to continue. They are never staged by this procedure unless the author says so.
- `git.develBehindOrigin > 0`: say that `devel` is behind `origin/devel` by that many commits and
  ask whether to continue (the author may want to update `devel` first). Do not fast-forward it.
- `git.releaseBranchExists` and the branch contains commits that do not belong to this release
  (`git log --oneline devel..release-<version>`): show them and ask.
- `next` tells where to continue (resume, FR-020):
  - `review` - a fresh release, or an approval that was never recorded: go on with step 2;
  - `branch` - the release is recorded on `release-<version>` but another branch is checked out:
    switch to it (`git switch release-<version>`), then follow the new `next`;
  - `capture` - recorded, pictures still older: run step 2 (facts), then step 3 (the picture
    question again), then step 8;
  - `check` - recorded and pictures current: run step 2 (facts), then continue at step 9;
  - `done` - already committed: say so, run step 9 as a confirmation and stop after the handover.
  Tell the author which steps are already done.

### 2. Facts

`npm run release:facts --silent -- <version> --json`. If it exits non-zero, relay every line
verbatim and **stop** - nothing can be released until the GitHub release is published with its
installer and the changelog at the tag has a dated section for the version. Relay any `warnings`.

### 3. Stop 1 - the picture question

From `status.captures.must` (a fresh run: the pictures that show the version in the title bar and
were captured with an older version), ask:

> Re-capture the screenshots for <version>? These show the version: <scene/theme (captured with
> x.y.z)>, …. Without a new capture they keep showing the previous version.

If `captures.must` is empty, do not ask - say that no picture shows an older version. Remember the
answer for step 8; it is not asked again in this run.

### 4. Draft the digest

Read `.work/release/<version>-changelog.md` (written by step 2), `tools/release/DIGEST-STYLE.md`
(the editorial contract - follow it exactly), the two most recent files in `content/releases/` (for
tone) and the scene ids in `content/gallery/scenes.json` (only scenes without `"published": false`
may be referenced).

Draft a complete record in every site language:

- `kind` - start from the `kindHint` of step 2, correct it if the style guide says otherwise;
- `summary` - one sentence, ≤ 200 characters per language;
- `highlights` - 0 to 6, most important first; each `id` (kebab-case), `title` (≤ 40),
  `text` (≤ 220); plain text, backticks only around keys and commands;
- `scene` on a highlight only when an existing published scene shows it.

Count the characters - the build rejects anything over the limits.

### 5. Find what else the version made stale

Run `npm run release:scan --silent -- <version> --json`. Then read **every** file in `sources` in
full - not only the lines with findings - against the changelog section and the facts:

- a hard-coded version presented as the current one (`isPrevious: true` is the strongest sign);
- "planned", "coming soon", "on its way", "připravujeme" and similar statements about something the
  changelog now lists as done - or the opposite, a claim the changelog withdraws;
- availability, requirements or figures the facts contradict.

Leave alone: historical mentions ("since 0.1.7", "first released in", quotes of past releases),
everything in `content/releases/`, `README.md`, and anything that is only a matter of style or
wording - this is a factual check. The story texts are in scope, but only for facts.

For each real case prepare a **proposal**: location (file + key or line), the current text and the
proposed text in every language, and the reason quoting the changelog line or fact it rests on.
The same correction in every language.

### 6. Stop 2 - the combined review

Present in one message:

1. the digest - for each language the summary and every highlight (title + text), the `kind`;
2. what you deliberately left out of the changelog section and why (one line each);
3. any highlight that deserves a **new** gallery scene (none is created here);
4. anything in a non-English text you are unsure about;
5. the content proposals, numbered (or "no stale text found", with the number of sources read).

Ask: accept, edit or reject - per item, or all at once. **Wait for the answer.** Apply requested
edits and show the changed items again until the author approves. Rejected proposals are dropped
and listed in the handover.

### 7. Branch and record

Only now change the repository:

1. `git switch release-<version>` if it exists, otherwise `git switch -c release-<version> devel`.
2. `npm run release:apply --silent -- <version>` (updates `src/_data/site.json`, creates the record
   skeleton if missing).
3. Write the approved `kind`, `summary` and `highlights` into `content/releases/<version>.json`,
   keeping the `version`, `date` and `build` the script wrote. 2-space JSON, UTF-8, trailing
   newline.
4. Apply the accepted proposals exactly as approved, in every language. Keep the catalogs' key sets
   identical.

### 8. Pictures

Only if the answer at stop 1 was **yes**. Run `release:status` again: `captures.must` now also
contains scenes the approved highlights point to. If it is empty, say so and skip.

Announce - without asking again - the scenes to capture (name any that were added by highlights)
and what the capture needs: Windows Sandbox enabled, no other Sandbox window open, keep its window
open and un-minimised until it closes itself. Then run

```
npm run shots -- --version <version> --scene <scene,scene,…>
```

If it fails, relay the output verbatim, leave the previous pictures in place and continue with
step 9; the handover lists the pictures that remain older.

After a successful capture, open each re-captured `src/assets/gallery/<scene>-<theme>.webp` and
both `src/assets/screenshot-*.png` with your image-reading tool. Confirm that the title bar reads
"Tandem Commander <version>" and that the picture still matches its scene (window state, no stray
dialog). Run `release:status` once more: `captures.must` must be empty. Flag every picture that
fails either check - it is not current.

If the answer was **no**: no capture, no picture changes; the handover lists the kept pictures as
the author's choice.

### 9. Check

`npm run release:check` - tests, build, verification of the generated site, stale-image report. If
it fails, show the message (it names the file and field or the page and value). Fix only what is
yours - the record texts and the accepted corrections - and run it again. Ask before touching
anything else.

### 10. Handover

Report:

- changed files grouped by purpose: release facts (`site.json`), release record, content
  corrections, pictures (`captures.json`, images), regenerated `public/`;
- the result of every check (tests, build, each verification check, picture check);
- open items: pictures kept from the previous version (by choice or after a failed capture),
  pictures that are merely older (*older, review*), rejected proposals, highlights that deserve a
  new scene, and the social image `src/assets/og-image.png` if the main-window picture changed
  (it is not regenerated automatically);
- the author's remaining steps: preview with `npm run dev`, then push, merge and deploy.

### 11. Stop 3 - commit

Offer the commit only when step 9 passed, or when the author explicitly accepts a failure.

1. `npm run release:status --silent -- <version> --json` → `git.dirty`. Everything outside `src/`,
   `content/` and `public/`, and every path that was dirty before this run started, is listed and
   excluded unless the author says otherwise.
2. Propose the message, in the style of the repository's previous release commits:

   ```
   Version <version> release.

   <One paragraph: release record with the approved bilingual digest, site facts for <version>,
   the re-captured scenes (or "pictures kept from <previous>"), the content corrections, and the
   regenerated public/.>
   ```

   followed by the attribution lines your session's instructions require for commits.
3. On approval: `git add -A -- src content public`, then `git commit` with the approved message.
   No amend, no `--no-verify`. Show `git log --oneline -1` and `git status --short`.
4. On decline: leave everything uncommitted and say so.

Never push, merge or deploy. Finish with a one-paragraph summary and the branch name.
