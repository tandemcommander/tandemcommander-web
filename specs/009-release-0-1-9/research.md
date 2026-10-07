# Research: Website Release for Tandem Commander 0.1.9

All findings were established on 2026-10-07 on the author's machine, on branch
`009-release-0-1-9`.

## R1 - Release facts

**Decision**: Use version 0.1.9, date 2026-10-07, build 193, installer
`tandemcommander-0.1.9-x64-setup.exe` of 8,013,936 bytes.

**Rationale**: `npm run release:facts -- 0.1.9 --json` exited 0 with these values and no
warnings; the changelog section came from `E:\Projects\tandemcommander\CHANGELOG.md` and was saved
to `.work/release/0.1.9-changelog.md`. The screenshot tool independently downloaded the installer:
same size, Authenticode signature valid.

**Alternatives considered**: none - the published release is the only source.

## R2 - What is already in the working tree

**Decision**: Keep `src/_data/site.json` (already 0.1.9, 2026-10-07, 8013936) and the skeleton
`content/releases/0.1.9.json` (version, date, build 193, kind `feature`, empty summary, no
highlights). Run `release:apply` once more only as a confirmation.

**Rationale**: Both match R1 exactly and are what `release:apply` produces; the command is
idempotent by contract.

**Alternatives considered**: reverting and re-applying - no benefit, same result.

## R3 - The six missing files under `public/`

**Decision**: Do not restore them from git; the build recreates them.

**Rationale**: `npm run build` deletes `public/` and runs Eleventy. With the skeleton's empty
summary the build gate rejects the record, which leaves exactly the pages that depend on release
records missing: both home pages, both release-history pages, `pad.xml`, `sitemap.xml`. This
explanation is inferred from the build script and the contract, not reproduced by running the
failing build again.

**Alternatives considered**: `git restore public/` - would bring back 0.1.8 pages that the next
build overwrites anyway.

## R4 - Kind and digest

**Decision**: kind `feature`; summary and six highlights as in
[contracts/digest-0.1.9.md](contracts/digest-0.1.9.md). No highlight carries a `scene`.

**Rationale**: The section has user-visible *Added* entries (new-version check, RAR archives).
The selection follows `tools/release/DIGEST-STYLE.md`; all lengths were counted (summary 163/156,
titles ≤ 33, texts ≤ 214). No published scene shows any of the six highlights, and no new scene is
created (clarification 2). Highlight 6 was changed to the privacy fixes by the author
(clarification 4).

**Alternatives considered**: long-path archives or working external archivers as highlight 6 -
rejected by the author in favour of the privacy fixes.

## R5 - Which pictures are re-captured

**Decision**: Re-capture exactly `main-window/light`, `dark-theme/dark`, `panel-tabs/light`,
`unicode-long-paths/light`, `thumbnails/light`.

**Rationale**: `lib/content.js` `staleReport` puts a capture into *must re-capture* when its
`appVersion` is older than the current release and the scene has `showsVersion: true` or is
referenced by a highlight of the current release. All published captures are from 0.1.8; five
scenes have `showsVersion: true`; no 0.1.9 highlight references a scene. The other three published
scenes (`code-viewer`, `markdown-viewer`, `command-shell`) land in *older, review* and stay
(FR-013). `sftp` and `cloud-sync-badges` are unpublished and have no capture.

**Alternatives considered**: all scenes (rejected in clarification 1) · none (rejected, same).

## R6 - How the pictures are captured

**Decision**: `npm run shots -- --version 0.1.9 --scene
main-window,dark-theme,panel-tabs,unicode-long-paths,thumbnails`, started only after the author's
go-ahead.

**Rationale**: The tool installs the published installer inside Windows Sandbox and never uses the
local installation, so the spec's assumption "0.1.9 is installed on the machine" was wrong and has
been corrected - the real prerequisite is the Windows Sandbox feature, which is present. (0.1.9
happens to be installed locally as well; it is irrelevant.) `site.json` already says 0.1.9, so
`--version` is redundant but harmless and explicit. The Sandbox window must stay open and
un-minimised on the author's desktop for the run, and only one Sandbox can run at a time - hence
the go-ahead. The run also regenerates `src/assets/screenshot-light.png` and `screenshot-dark.png`
from `main-window` and `dark-theme`, and rewrites the five entries of `captures.json`.

Exit codes: 0 all captured · 1 preflight refused · 2 a scene failed (it keeps its old image) ·
3 an image over 300 KB or the two themes differ in size.

Note: `--dry-run` prints a fixed line naming "spike scenes main-window/light,
markdown-viewer/light" whatever `--scene` says. That text is a leftover in the tool; the scene
filter itself is passed to the job. Not fixed here (no tooling change in this feature), reported
to the author.

**Alternatives considered**: capturing on the host from the local installation - forbidden by the
screenshot README (personal data, `-C` overwrites the author's configuration).

## R7 - Social image

**Decision**: Out of scope; reported in the handover.

**Rationale**: The release contract mentions `npm run og` for regenerating the social image when
the main window changes, but `package.json` has no such script. `src/_includes/layout.njk` points
at `/assets/og-image.png`. Whether that image shows a version number was not examined; the spec's
requirement (SC-008) is about published gallery pictures.

**Alternatives considered**: regenerating it by hand - no defined procedure exists in the repo.

## R8 - Gates that the record must pass

**Decision**: Rely on `npm run release:check`.

**Rationale**: It runs the `node --test` suites and the build, whose gates enforce the record
contract (`specs/007-release-news-gallery/contracts/release-record.md`): language parity, length
limits, plain text, no long dashes, no reference to an unpublished scene. The same run prints the
stale-image report used for FR-013 and SC-008.
