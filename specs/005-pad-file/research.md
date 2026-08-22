# Phase 0 Research: PAD File for Software Catalogs

**Date**: 2026-08-22 · **Spec**: [spec.md](spec.md)

Sources used: the public slunecnice.cz "Přidání programu" page; real-world PAD files of
[Setup-Assistant](https://github.com/maciakl/Setup-Assistant/blob/master/pad_file.xml) (MASTER_PAD_VERSION 3.11)
and [PSPad](http://www.pspad.com/pad_file.xml) (a Czech editor listed on slunecnice.cz — the closest possible
precedent for what the target catalog accepts); the [i-net pad-file-editor-validator](https://github.com/i-net-software/pad-file-editor-validator);
Wikipedia's PAD and ASP articles. The official spec hosts are dead (ASP dissolved 2021; repository.appvisor.com
unreachable — TLS failure confirmed during this research; web.archive.org not fetchable from this environment).

## R1. PAD revision and document structure

- **Decision**: Emit the classic `XML_DIZ_INFO` tree with `MASTER_PAD_VERSION` = `3.11`, structured exactly as the verified real-world 3.11 file: `MASTER_PAD_VERSION_INFO`, `Company_Info` (with `Contact_Info`, `Support_Info`), `Program_Info` (with `File_Info`, `Expire_Info`), `Program_Descriptions` (per-language blocks), `Web_Info` (`Application_URLs`, `Download_URLs`), `Permissions`. Full tree with constraints in [contracts/pad-file.md](contracts/pad-file.md).
- **Rationale**: 3.11 is the last classic revision and what catalogs' importers were built against. Real-world files (incl. PSPad's, consumed by Czech catalogs) still use this tree — PSPad merely stamps "4.0" into the version field while keeping 3.x structure, confirming the 3.x tree is the de-facto contract.
- **Alternatives considered**: PAD 4.0 proper — rejected: its governing bodies are defunct, its extra fields serve a dead certification service, and 3.11 remains the widely parsed baseline.

## R2. Localization mechanism (answers the spec's one-file-vs-two question)

- **Decision**: One PAD file. `Program_Descriptions` carries two sibling language blocks, `<English>` and `<Czech>`, each with `Keywords`, `Char_Desc_45`, `Char_Desc_80`, `Char_Desc_250`, `Char_Desc_450`, `Char_Desc_2000`.
- **Rationale**: This is the format's official multi-language mechanism (leaf tags duplicated per named language block). "Czech" is a valid PAD language token (it appears in the spec's `Program_Language` enumeration, and PAD tooling offers the same language list for description blocks). Slunečnice accepts a single PAD URL.
- **Alternatives considered**: Two files (pad-en.xml / pad-cs.xml) — rejected: no catalog asks for it, doubles maintenance, and splits the permanent URL. Can be added later without moving the primary URL if some catalog ever demands it.
- **Note**: PSPad ships English-only descriptions even though it is a Czech program — so slunečnice does not *require* a Czech block. Ours includes Czech anyway (spec FR-004); worst case a catalog ignores it.

## R3. Encoding

- **Decision**: `<?xml version="1.0" encoding="UTF-8"?>`, file written as UTF-8 without BOM.
- **Rationale**: Czech diacritics require it; PSPad's PAD (consumed by Czech catalogs) declares UTF-8; the reference validator explicitly handles UTF-8.
- **Alternatives considered**: Windows-1252 (PADGen's historical default) — rejected: cannot encode Czech text.

## R4. Operating-system tokens

- **Decision**: `Program_OS_Support` = `Win11 x64` (exactly what site.json's "Windows 11 · x64" states).
- **Rationale**: Real-world precedent — PSPad's PAD lists `Win10 x64,Win11 x64,…` and is accepted by catalogs including slunecnice.cz. Claiming older Windows versions we don't support would be dishonest metadata.
- **Alternatives considered**: `WinOther` (strictly 3.11-legal — the 2010 enumeration ends at Win7-era tokens) — rejected: catalogs would display "Other", hiding the real requirement. **Accepted trade-off**: an archaic strict-3.11 validator may flag this one field; our vendored validation rules (R9) extend the OS enumeration with the modern tokens (`Win 8`, `Win8 x64`, `Win10 x32`, `Win10 x64`, `Win11 x64`) and this deviation is documented in the contract.

## R5. Classification field values

- **Decision**:
  - `Program_Type` = `Freeware` (GPLv2, cost 0 — the classic enumeration has no "Open Source" value; the license is stated in descriptions and Permissions)
  - `Program_Cost_Dollars` = `0`
  - `Program_Release_Status` = `New Release` — the site's own disclaimer calls 0.1.4 a "first release", not a beta; resolves the clarify-phase outstanding item
  - `Program_Install_Support` = `Install and Uninstall` (distributed as a setup.exe installer)
  - `Program_Category_Class` = `System Utilities::File & Disk Management` (the official category pair for file managers)
  - `Program_Language` = `English` — this field describes the **application's UI languages**, not the website's; the app UI is English today. Extend when the app itself gains localization.
- **Rationale**: Every value is from the official enumerations (verified against real 3.11 files) and truthful for the product.
- **Alternatives considered**: `Program_Release_Status` = `Beta` for a 0.x version — rejected: the site presents 0.1.4 as a released first version; `Beta` would contradict the site's own messaging.

## R6. Changelog (`Program_Change_Info`, per clarification Q3)

- **Decision**: Join the English "What's New" entry **titles** from `en.json` (`whatsNew.entry*Title`, enumerated dynamically) with `; ` — e.g. "Full Unicode, long paths; New SFTP plugin; Markdown View; PictView, repaired" — capped at 300 characters (build gate).
- **Rationale**: Titles are plain text (the HTML-bearing keys are only entry *texts*), already maintained per release under the existing i18n parity gate, and comfortably under the limit. No new text to maintain.
- **Alternatives considered**: Full entry texts — rejected (HTML present, far over 300 chars); a dedicated changelog field in site.json — rejected (second copy of what "What's New" already says; violates FR-005's single-source rule).

## R7. Installer size (per clarification Q1)

- **Decision**: New manual field `site.json` → `installerSizeBytes` (positive integer). Build derives `File_Size_K` = round(bytes/1024) and `File_Size_MB` = bytes/1048576 rounded to 2 decimals. Build fails if the field is missing, not a positive integer, or absurd (< 100 KB or > 1 GB — typo guard).
- **Rationale**: Clarification Q1 chose manual entry; deterministic offline build; one number per release next to the version/date the author already edits.
- **Alternatives considered**: GitHub API lookup at build time — rejected in clarification (network-dependent builds).

## R8. Generation mechanism in this codebase

- **Decision**: A Nunjucks template `src/pad.njk` with `permalink: "pad.xml"` and `eleventyExcludeFromCollections: true`, rendering the XML from: `site.json` (facts), `src/_data/installer.js` (NEW shared helper deriving installer file name + download URL — extracted from the construction currently duplicated inside `download.njk`, which is refactored to use it), and a new `pad.*` namespace in the i18n catalogs (`pad.keywords`, `pad.desc45`, `pad.desc80`, `pad.desc250`, `pad.desc450`, `pad.desc2000`) read via the existing `t` filter for both `en` and `cs`.
- **Rationale**: Zero new dependencies; the file is one more build output on the existing pipeline (FR-001, FR-006); putting descriptions into the i18n catalogs makes the **existing** parity gate enforce "both languages, never empty" for free (FR-004); the installer helper makes the PAD and the download button provably identical (FR-005). Nunjucks autoescaping covers XML escaping of `& < > " '`.
- **Alternatives considered**: Generating in an `eleventy.after` hook with string building — rejected: bypasses template conventions and the i18n filter's error gates. A static hand-maintained `src/root/pad.xml` — rejected: violates FR-005/FR-006 (manual sync of version/date/size).

## R9. Validation gate (FR-008)

- **Decision**: An Eleventy transform in `eleventy.config.js` scoped to the `pad.xml` output: checks well-formedness (regex-free tag balance via a small parser walk), required fields non-empty, character limits (45/80/250/450/2000, Keywords ≤ 250, Program_Change_Info ≤ 300, Program_Name ≤ 40, Program_Version ≤ 15), enumeration membership (Program_Type, Release_Status, Install_Support, OS tokens incl. the modern extensions, month/day/year formats), URL shape for all `*_URL` fields, and File_Size consistency (K and MB match Bytes). Any violation throws → build fails with the field name (mirrors the i18n gate style).
- **Rationale**: The project's established pattern is "gates live in eleventy.config.js and throw with precise messages"; validating the **final rendered output** also catches template mistakes, not just bad data. This vendored rule set *is* the "independent validator" of SC-002 now that official validators are dead — with the documented OS-token modernization from R4.
- **Alternatives considered**: External XSD + a schema validator dependency — rejected: no official XSD survives, new dependency for less precise errors.

## R10. URL, discoverability, and remaining asset choices

- **Decision**: Permanent URL `https://tandemcommander.org/pad.xml` (output `public/pad.xml`, served automatically by the existing assets-only Worker; wrangler deploys swap assets atomically — covers the mid-deploy-fetch edge case). Documented in README (FR-010). `Application_Screenshot_URL` → `/assets/screenshot-light.png` (light variant: catalogs render listings on light backgrounds; resolves the clarify-phase outstanding item), `Application_Icon_URL` → `/assets/icon-256.png`, `Application_Info_URL` → site root, `Application_XML_File_URL` → the PAD URL itself (FR-007), `Primary_Download_URL` → from installer.js (GitHub release asset).
- **Rationale**: Short, conventional name; the serving/deploy pipeline needs zero changes. All referenced assets already exist in `src/assets/`.
- **Alternatives considered**: `tandemcommander_pad.xml` (PADGen convention) — rejected: the domain already names the program; shorter is cleaner and the name is free to choose as long as it never changes.
- **Note (memory/pending-final-assets)**: current screenshots are placeholders; first catalog submission should wait for final assets — flagged in quickstart.

## R11. Permissions texts

- **Decision**: `Distribution_Permissions`: short English statement that Tandem Commander is free software under GPLv2-or-later and may be freely listed and redistributed in unchanged form by download sites. `EULA`: brief GPLv2 no-warranty notice with a pointer to the full license in the repository. Both plain text, authored during implementation.
- **Rationale**: Catalogs display these verbatim; GPLv2 already grants redistribution, the text just says so in catalog-friendly words.
- **Alternatives considered**: Embedding the full GPLv2 text — rejected: thousands of characters of noise; a pointer suffices.

## Resolved clarify-phase outstanding items

| Item | Resolution |
|------|------------|
| Screenshot light vs dark | Light (R10) |
| Release status for 0.x | `New Release` (R5) |

No NEEDS CLARIFICATION markers remain.
