---
name: release-web
description: Bring a newly published Tandem Commander version onto the website - establish the release facts, draft the bilingual release digest from the application changelog for the author's approval, record it, and verify the site builds. Use when the author says a new version is out, asks to "release the web", or runs /release-web <version>.
argument-hint: <version, e.g. 0.1.9>
---

# /release-web - website release for a published application version

You are the **assisted layer** of the website release procedure (spec
`specs/007-release-news-gallery/`, contract `contracts/release-cli.md`). The scripted layer does
everything factual and checkable; your job is the one editorial step - turning a changelog section
into a short, bilingual digest - and keeping the author in control of it.

**Version**: `$ARGUMENTS`. If it is empty, ask which version and stop.

## Hard rules

- **Nothing is written before the author explicitly approves the draft.** Your draft is a proposal.
- Never commit, push, merge, deploy, or edit anything under `public/` by hand.
- Never edit the application repository (`../tandemcommander`); it is read-only here.
- Do not invent facts. Every claim in the digest must be traceable to the changelog section. If the
  changelog says something depends on a third party (e.g. acceptance into the winget catalogue),
  the digest says so too.
- Work on the current feature/release branch; if the current branch is `main` or `devel`, tell the
  author and ask which branch to use before changing files.

## Steps

1. **Facts.** Run `npm run release:facts --silent -- <version> --json`.
   If it exits non-zero, relay each missing fact verbatim and **stop** - nothing can be released
   until the application release is published with its installer and the changelog has a dated
   section for the version.

2. **Read.** Read `.work/release/<version>-changelog.md` (written by step 1),
   `tools/release/DIGEST-STYLE.md` (the editorial contract - follow it exactly), the two most recent
   files in `content/releases/` (for tone), and the scene ids in `content/gallery/scenes.json` if
   that file exists (only scenes that are not `"published": false` may be referenced).

3. **Draft** a complete record in every language listed in `src/_data/languages.json`:
   - `kind` - start from the `kindHint` of step 1, correct it if the style guide says otherwise;
   - `summary` - one sentence, ≤ 200 characters per language;
   - `highlights` - 0 to 6, most important first; each `id` (kebab-case), `title` (≤ 40), `text`
     (≤ 220); plain text, backticks only around keys and commands;
   - `scene` on a highlight only when an existing published scene shows it.
   Count the characters - the build rejects anything over the limits.

4. **Present** the draft to the author in full: for each language the summary and every highlight
   (title + text), plus
   - what you deliberately left out of the changelog section and why (one line each),
   - any highlight that deserves a **new** gallery scene (none is created here),
   - anything in the Czech text you are unsure about.
   Then ask: accept, edit, or rewrite? **Wait for the answer.** Apply requested edits and show the
   changed parts again until the author approves.

5. **Record.** Run `npm run release:apply --silent -- <version>` (updates `src/_data/site.json`,
   creates the record skeleton if missing). Then write the approved `kind`, `summary` and
   `highlights` into `content/releases/<version>.json`, keeping the `version`, `date` and `build`
   the script wrote. 2-space JSON, UTF-8, trailing newline.

6. **Check.** Run `npm run release:check`. If tests or the build fail, show the message - it names
   the file and field - fix what is yours (the record), and ask before touching anything else.

7. **Hand over.** Relay the stale-image report from step 6 as is (which screenshots must be
   re-captured, which are merely older) and the remaining manual steps: preview with `npm run dev`,
   `npm run shots` if images are stale, then
   commit (sources **and** the regenerated `public/`), merge and deploy - all of which are the
   author's to do. Finish with a one-paragraph summary of what changed in the working tree.
