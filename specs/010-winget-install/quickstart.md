# Quickstart: Validating winget on the Website

Prerequisites: branch `010-winget-install`, `npm install` done, Node ≥ 22. Expected texts and
structure are in [contracts/download-ui.md](contracts/download-ui.md); values in
[data-model.md](data-model.md).

## Automated

| # | Command | Expected |
|---|---------|----------|
| A1 | `npm test` | all suites pass, including the new winget source checks (commands contain `--id <id> -e`; no command literal in the catalogs; card keys present in both languages) |
| A2 | `npm run build` | build succeeds - catalog parity and PAD gates pass; `public/index.html` and `public/cs/index.html` regenerated |
| A3 | `npm run release:check` | passes; the stale-screenshot report is unchanged from before the feature |

## Generated output (after A2)

| # | Check | Expected | Covers |
|---|-------|----------|--------|
| G1 | Search `public/index.html` and `public/cs/index.html` for `id="winget-cmd"` | present once in each; content `winget install --id PavelStupka.TandemCommander -e` | FR-001, FR-004 |
| G2 | Compare the `#winget-cmd` text and the command in `.winget-hint` between the two files | identical character for character | FR-011, SC-003 |
| G3 | Search both files for `on its way` and `na cestě` | no match | FR-009, SC-004 |
| G4 | Card 06 text in both files | ends with the winget wording of the contract, section 3 | FR-009 |
| G5 | `git diff --stat -- public/` | only the two home pages and `public/css/main.css` changed (plus the sitemap if its dates are regenerated); release-history pages and `pad.xml` unchanged | FR-010 |

## In the browser (`npm run dev`, open `/` and `/cs/`)

| # | Scenario | Expected | Covers |
|---|----------|----------|--------|
| B1 | Scroll to the download section | installer card and button first; winget option below it, visually secondary | FR-002, SC-005 |
| B2 | Press Copy / Kopírovat, paste into a text editor | exactly the install command; the button reads Copied / Zkopírováno for about 2 s | FR-005, SC-001 |
| B3 | Disable JavaScript, reload | command and hint visible, no copy button; the command can be selected by hand | FR-006 |
| B4 | Device toolbar at 360 px width, then widen slowly to 700 px | no scroll bar in the command box and no horizontal page scroll caused by it at any width; the whole command is always visible; at 360 px it is on two lines with the copy button below; from about 620 px command and hint are each on one line | FR-014, SC-007 |
| B5 | Switch the system between light and dark | command, label, hint and button legible in both | FR-014 |
| B6 | Tab through the section with the keyboard | the copy button is reachable, has a visible focus ring and a localized name | FR-005 |

## Withdrawal switch (US4)

| # | Step | Expected |
|---|------|----------|
| W1 | Set `site.json → winget.available` to `false`, run `npm test` and `npm run build` | both pass |
| W2 | Search both generated home pages for `winget` | no match outside the release-news cards; card 06 ends with the installer-only sentence |
| W3 | Set it back to `true`, rebuild | output identical to the state after A2 (`git status` shows no difference in `public/`) |

## Manual, by the author before publishing

| # | Step | Expected | Covers |
|---|------|----------|--------|
| Q6 | On a machine without Tandem Commander (Windows Sandbox or a second PC), paste the copied command into a terminal | winget finds exactly one package, asks no question about which package is meant, and installs Tandem Commander | FR-004, SC-002 |
| Q7 | On a machine with an older winget-installed version, run the update command from the hint | the update is offered (or "no newer version" when the catalogue holds the same version) | FR-007 |

Q6 and Q7 cannot be run by the assistant: Q6 needs a clean machine, and both change installed
software. Resolution of the command was verified without installing ([research.md](research.md)
R1).

## Handover

Nothing is committed to `devel` or `main`, merged or deployed by the assistant. After the checks
the author previews (`npm run preview`), commits on the feature branch, merges and deploys.
