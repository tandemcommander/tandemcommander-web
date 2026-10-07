# Quickstart: Validating the 0.1.9 Website Release

Run from the repository root on branch `009-release-0-1-9`. Details of what changes:
[data-model.md](data-model.md); the digest text: [contracts/digest-0.1.9.md](contracts/digest-0.1.9.md).

## Prerequisites

- Node ≥ 22 and `npm install` done.
- Internet access (GitHub: release facts and installer download).
- Windows Sandbox enabled, no other Sandbox window open (for the capture only).
- The application repository at `../tandemcommander` (read-only; only `CHANGELOG.md` is read).

## V1 - Facts are the published ones (FR-001, FR-002)

```bash
npm run release:facts --silent -- 0.1.9 --json
npm run release:apply --silent -- 0.1.9
git diff --stat src/_data/site.json
```

Expected: facts exit 0 with version 0.1.9, date 2026-10-07, build 193, installer 8013936 bytes, no
warnings. `release:apply` reports nothing to change. `site.json` differs from the last commit in
exactly three values.

## V2 - Nothing recorded before approval (FR-007, SC-007)

Until the recording step, `content/releases/0.1.9.json` still has an empty `summary` in both
languages and `"highlights": []`. After recording, its texts equal the contract character for
character and `version`, `date`, `build` are unchanged.

## V3 - The release check passes (FR-010, SC-004)

```bash
npm run release:check
```

Expected: all tests pass, the build completes without a gate error, exit code 0. Before the
capture the *must re-capture* list names the five version-bearing scenes; that is a warning.

## V4 - Pictures show 0.1.9 (FR-013, SC-008)

```bash
npm run shots -- --version 0.1.9 --scene main-window,dark-theme,panel-tabs,unicode-long-paths,thumbnails
npm run release:check
```

Keep the Sandbox window open and un-minimised until it closes itself. Expected: `shots` exits 0;
the second check lists nothing under *must re-capture*, three scenes (`code-viewer`,
`markdown-viewer`, `command-shell`) under *older, review* and five as current. Open each of the
five images under `src/assets/gallery/` and both `src/assets/screenshot-*.png`: the title bar reads
"Tandem Commander 0.1.9" and nothing else changed unexpectedly. `git status` shows no change to
`content/gallery/scenes.json`.

## V5 - The generated site (FR-011, FR-012, SC-001, SC-005)

```bash
ls public/index.html public/cs/index.html public/releases/index.html public/cs/releases/index.html public/pad.xml public/sitemap.xml
grep -c "0\.1\.9" public/index.html public/cs/index.html public/pad.xml
grep -l "tandemcommander-0\.1\.8" public/index.html public/cs/index.html public/pad.xml
```

Expected: all six files exist; each of the three counted files mentions 0.1.9; the last command
prints nothing (no download link to the 0.1.8 installer). In `public/pad.xml` the version is
0.1.9, the release date 2026-10-07, the size matches 8013936 bytes, and the change information
lists the six highlight titles.

## V6 - What a visitor sees (User Stories 1 and 2)

```bash
npm run dev
```

On `/` and `/cs/`:

- the version, the release date in the page's language and the installer size are those of 0.1.9;
- the download button leads to `tandemcommander-0.1.9-x64-setup.exe`;
- the news cards start with the six 0.1.9 highlights in contract order;
- the gallery pictures of the main window, dark theme, tabs, Unicode and thumbnails show 0.1.9.

On `/releases/` and `/cs/releases/`: 0.1.9 is the first entry, marked as a feature release, with
its summary and six highlights; 0.1.8 follows unchanged.

Compare the Czech and English cards side by side: same facts, same order (FR-006).

## V7 - Scope was respected (FR-014, FR-015, FR-017, FR-018)

```bash
git status --short
git -C ../tandemcommander status --short
git log --oneline devel..HEAD
```

Expected: changes only in `src/_data/site.json`, `content/releases/0.1.9.json`,
`content/gallery/captures.json`, the image files listed in the data model, `public/`,
`.specify/feature.json` and `specs/009-release-0-1-9/`. No change in `src/_data/i18n/`,
`src/pad.njk` or `content/gallery/scenes.json`. The application repository shows no change caused
by this work. Nothing was committed, merged or deployed by the assistant.

## Handover to the author

Preview (`npm run dev`), commit sources together with the regenerated `public/` on this branch,
merge, deploy. Reported alongside: the three pictures that are merely older, the two gallery
candidates left for later (the new-version window, a RAR archive in a panel), the unexamined
social image, and the misleading `--dry-run` line of the screenshot tool
([research.md](research.md) R6, R7).
