# Research: Installation Through winget on the Website

All facts below were established on 2026-10-09 on the author's machine (Windows 11 Pro, winget
with the default sources `winget` and `msstore`) and in the working tree of branch
`010-winget-install`.

## R1 - Is the package live, and does the decided command resolve to it?

**Decision**: The option may be published. The command decided in the spec's Clarifications,
`winget install --id PavelStupka.TandemCommander -e`, names exactly one package.

**Evidence**:

| Check | Result |
|-------|--------|
| `winget search tandemcommander --source winget` | one row: Tandem Commander, `PavelStupka.TandemCommander`, 0.1.9, moniker `tandemcommander` |
| `winget show --id PavelStupka.TandemCommander -e` (no `--source`, so `winget` and `msstore` are both searched) | "Found Tandem Commander [PavelStupka.TandemCommander]", version 0.1.9, release date 2026-10-07 |
| Installer in the manifest | `…/releases/download/v0.1.9/tandemcommander-0.1.9-x64-setup.exe` - the same file the website's download button serves; type `inno` |
| `winget list --id PavelStupka.TandemCommander -e` | the locally installed 0.1.9 is correlated with the catalogue package (source `winget`), so `winget upgrade --id … -e` will find it |

**Rationale**: `--id` with `-e` (exact match) cannot be satisfied by another package in the
`winget` source, and Microsoft Store identifiers have a different shape, so no disambiguation
prompt can appear. `show` uses the same resolution as `install`; it proves the resolution without
changing the machine.

**What is not proven here**: an actual installation on a machine without the program. That is the
one manual scenario in [quickstart.md](quickstart.md) (Q6), run by the author in Windows Sandbox
or on a second machine before publishing (FR-004, SC-002).

**Alternatives considered**: the short form `winget install tandemcommander` - also resolves
today, initially chosen, then replaced by the author with the exact-identifier form.

## R2 - Where the commands live (FR-012)

**Decision**: Both commands are stored as complete strings in `src/_data/site.json` under
`winget`: the existing `command` (install) and a new `upgradeCommand`. The i18n catalogs contain
no command; the update hint carries a `{command}` placeholder that the template fills from
`site.winget.upgradeCommand`.

**Rationale**: Today the install command comes from `site.json` but the update command is typed
into both catalogs (`download.wingetHint`), i.e. in two places that can drift apart - exactly what
FR-011/FR-012 forbid. The `{placeholder}` + `replace` idiom is already used throughout
`download.njk` (`{version}`, `{date}`). A small test asserts that both commands contain
`--id <winget.id> -e` and that neither catalog contains a literal `winget install` or
`winget upgrade`.

**Alternatives considered**:

- *Derive both commands from `winget.id` in the template.* One fact instead of three, but the
  command's flags would then live in a template, where the author would not look for them when the
  command has to change. Rejected.
- *Keep the update command in the catalogs.* Rejected: two copies, and a translator could alter a
  command.

## R3 - Making the card sentence follow the availability mark (FR-013)

**Decision**: `features.card6Text` is split. It keeps the first sentence (the Altap Salamander
migration); the closing sentence moves to two new keys, `features.card6Install` (installer only)
and `features.card6InstallWinget` (approved wording). `features.njk` prints the base text and then
one of the two, chosen by `site.winget.available`.

**Rationale**: The build's catalog gate requires every key in every language and forbids markup
outside `RICH_TEXT_KEYS`; three plain-text keys satisfy both with no change to the gate. Both
variants exist in both languages at all times, so switching the mark never needs a text edit.

**Alternatives considered**:

- *Two complete variants of the whole card text.* Duplicates the migration sentence four times.
  Rejected.
- *A conditional inside the catalog value.* The catalogs are plain strings by design. Rejected.

## R4 - Does the prepared block fit the longer command?

**Decision** (revised after the author's review of the implemented page): the command never
scrolls. The block is widened, the command wraps when it has to, and the copy button drops below
the command when the two no longer fit side by side. No structural change to the markup.

| Finding | Adjustment |
|---------|------------|
| The command is 50 characters; at 14 px IBM Plex Mono about 420 px, with padding and the copy button about 540 px. The hint (Czech text plus the 50-character update command at 13 px) needs about 515 px. The block's `max-width` was 460 px. | `.winget` `max-width` 460 px → 680 px (the section is 820 px wide), leaving more than 100 px of slack for both lines |
| The first implementation kept `white-space: nowrap; overflow-x: auto`, i.e. a scrolling line. The author rejected it: a scroll bar in the box is bad UX and the command must be visible whole. | `.winget-cmd`: no `nowrap`, no `overflow-x`; `overflow-wrap: anywhere` as the last resort |
| With wrapping alone, a 360 px screen would leave the command about 200 px beside the button - too little even for `PavelStupka.TandemCommander`. | `.winget-line { flex-wrap: wrap }`, command `flex: 999 1 auto`, button `flex: 1 0 auto`: when command and button do not fit on one line the button takes a full-width row below. The divider is drawn as a box-shadow on the left and top of the button; `.winget-line` clips the one that falls outside |
| The update command in the hint is one unbreakable `<span class="mono">`. | `.winget-hint .mono { overflow-wrap: anywhere; }` - it breaks at its spaces first |

**Measured** (Edge, Czech and English pages): from a 600 px viewport up, command and hint are each
on one line; at 560 px the button moves below; at 360 px the command is on two lines broken at a
space; nothing scrolls at any width from 320 to 1280 px, with and without scripting.

**Rationale**: A command the visitor cannot see whole invites mistrust and hides the part that
matters (the identifier). Wrapping inserts nothing into a selection, and the copy action reads the
element's text, so the copied command is unaffected.

**Alternatives considered**: a horizontally scrolling line (first implementation, rejected by the
author) · a smaller font for the command (hurts legibility and still does not fit a phone) · a
breakpoint that stacks the button (works, but flex wrapping needs no extra breakpoint beside the
project's single 860 px one).

**Second revision (author's review, 2026-10-09)**: the option became a card - `--surface`
background, `--line-strong` border, `--shadow-sm`, label as a 17 px title, the command on a
`--code-bg` strip with a light copy button. The build-from-source box lost its dark background
and shadow (`--surface-alt`, `--line` border, token text colours) and its `overflow-x: auto`; its
lines wrap. Both boxes share `max-width: 680px`. Below the 860 px breakpoint their padding is
reduced so that at 360 px the command still takes two lines. The disclaimer box is commented out
in `download.njk`; its catalog keys and styles remain.

## R5 - Copy behaviour against FR-005 and FR-006

**Decision**: No change to `src/js/main.js`.

**Evidence** (`src/js/main.js`, copy block from feature 007): the button is rendered with
`hidden` and un-hidden only when `navigator.clipboard.writeText` exists; it copies the trimmed
text of the `<code>` element; on success it swaps its label to the localized "copied" text and
writes the same text into an `aria-live="polite"` status element for 2 seconds; on rejection it
does nothing, so a failure is never reported as success. The code is generic
(`[data-copy-target]`) and independent of the command's content.

## R6 - Where "winget" appears, and what stays

| Place | Today | Action |
|-------|-------|--------|
| `src/_data/site.json` → `winget` | short install command, `available: false` | new commands, `available: true` |
| `download.wingetHint` (en, cs) | literal `winget upgrade tandemcommander` | `{command}` placeholder |
| `download.wingetLabel`, `wingetCopy`, `wingetCopied` | written in 007 | unchanged |
| `features.card6Text` (en, cs) | "… a winget package is on its way." | split (R3) |
| `content/releases/0.1.6.json`, `0.1.7.json` | history ("On the way to winget") | unchanged (FR-010) |
| `README.md` lines 96-97 | "flip it once the package is live" | reworded: live since 2026-10-09; the mark is now the withdrawal switch and also governs the card |
| Comments in `download.njk`, `main.css` | refer to spec 007 and to waiting for the catalogue | updated to the present state |
| PAD file, hero, header, meta description | no winget mention | unchanged (out of scope) |
| `tools/release/DIGEST-STYLE.md`, test fixtures | examples and changelog excerpts | unchanged |

The release-history page (`src/pages/releases.njk`) links to `#download` and does not include the
download section; the section is included only by the two home pages.

## R7 - Checks and regeneration (FR-015)

**Decision**: `npm test` then `npm run build` (the build runs the catalog-parity and PAD gates),
followed by `npm run release:check` as the project's combined check. `public/` is regenerated by
the build and committed with the sources; it is never edited by hand.

**Rationale**: This is the procedure every earlier feature used. The feature adds one test file
for the new source-level rules (R2, R3); the visible result is verified by the scenarios in
[quickstart.md](quickstart.md).

## Open items

None. No NEEDS CLARIFICATION remains.
