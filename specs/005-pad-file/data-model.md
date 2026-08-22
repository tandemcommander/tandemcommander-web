# Data Model: PAD File for Software Catalogs

**Date**: 2026-08-22 · **Spec**: [spec.md](spec.md) · **Contract**: [contracts/pad-file.md](contracts/pad-file.md)

The feature adds no database and no new storage kind — it extends the site's existing file-based
data (single source of truth) and derives everything else at build time.

## 1. Program facts — `src/_data/site.json` (extended)

| Field | Type | New? | Used by PAD as | Validation (build gate) |
|-------|------|------|----------------|-------------------------|
| `name` | string | no | `Program_Name` | non-empty, ≤ 40 chars |
| `version` | string | no | `Program_Version`, installer file name/URL | non-empty, ≤ 15 chars |
| `releaseDate` | string `YYYY-MM-DD` | no | `Program_Release_Month/Day/Year` | already gated by the `releaseDate` filter pattern; PAD gate re-checks split values |
| `installerSizeBytes` | integer | **YES** | `File_Size_Bytes` (+ derived K/MB) | required; integer; > 100 000 and < 1 073 741 824 (typo guard) |
| `url` | string | no | `Application_Info_URL`, base of `Application_XML_File_URL`, screenshot/icon URLs | absolute https URL |
| `github.repoUrl` | string | no | base of `Primary_Download_URL` | absolute https URL |
| `author.name` | string | no | `Company_Name`; split into `Author_First_Name` / `Author_Last_Name` (last space wins) | non-empty; split must yield two non-empty parts |
| `author.email` | string | no | `Author_Email`, `Contact_Email`, `Support_Email` (clarification Q2) | e-mail shape |

**Release routine impact** (FR-006): a release now edits `version`, `releaseDate`, **`installerSizeBytes`**, and the What's New texts — nothing else.

## 2. Derived installer data — `src/_data/installer.js` (NEW)

Single place for the construction currently duplicated inside `download.njk`:

| Output | Derivation |
|--------|------------|
| `installer.fileName` | `tandemcommander-{site.version}-x64-setup.exe` |
| `installer.url` | `{site.github.repoUrl}/releases/download/v{site.version}/{fileName}` |

Consumers: `download.njk` (refactored) and `pad.njk`. No other module may rebuild these strings.

## 3. Localized description set — `pad.*` namespace in `src/_data/i18n/{en,cs}.json` (NEW keys)

Plain text only (no `RICH_TEXT_KEYS` entries). The **existing** i18n parity gate already enforces:
both catalogs have every key, no empty values → FR-004's "both languages, complete" comes free.
The PAD gate adds the length limits.

| Key | Max length | Seed (EN) |
|-----|-----------:|-----------|
| `pad.keywords` | 250 | authored: "file manager, two-pane, dual-pane, …" |
| `pad.desc45` | 45 | trimmed from `hero.tagline` |
| `pad.desc80` | 80 | expanded from `hero.tagline` |
| `pad.desc250` | 250 | trimmed from `meta.description` |
| `pad.desc450` | 450 | authored from site texts |
| `pad.desc2000` | 2000 | authored from site texts (features + project sections) |

Czech values: authored alongside (author is a Czech speaker; spec assumption). Character limits
apply to the **rendered** value in both languages — Czech translations must fit the same caps.

## 4. Changelog derivation (clarification Q3)

`Program_Change_Info` = English `whatsNew.entry*Title` values, enumerated dynamically
(`entry1Title`, `entry2Title`, … in numeric order), joined with `"; "`.
Constraints: result ≤ 300 chars (gate); titles are plain-text keys (HTML-bearing keys are only
the entry *texts*), gate still rejects `<` in the result as defense.

## 5. PAD-only constants (live in `src/pad.njk`, nowhere else)

Facts that exist only for the PAD file and are not duplicated from anywhere:

| Constant | Value |
|----------|-------|
| `MASTER_PAD_VERSION` | `3.11` |
| `Country` | `Czech Republic` |
| `Program_Type` | `Freeware` |
| `Program_Cost_Dollars` | `0` |
| `Program_Release_Status` | `New Release` |
| `Program_Install_Support` | `Install and Uninstall` |
| `Program_OS_Support` | `Win11 x64` |
| `Program_Language` | `English` (app UI language — not the website's) |
| `Program_Category_Class` | `System Utilities::File & Disk Management` |
| `Program_System_Requirements` | `Windows 11, x64` |
| `Has_Expire_Info` | `N` |
| Distribution/EULA texts | authored per research R11 |

## 6. Derivations at build time

| PAD field | Derivation |
|-----------|-----------|
| `Program_Release_Month` / `Day` / `Year` | split of `site.releaseDate` (`MM`, `DD`, `YYYY`) |
| `File_Size_K` | `round(installerSizeBytes / 1024)` |
| `File_Size_MB` | `installerSizeBytes / 1048576`, 2 decimals |
| `Application_Screenshot_URL` | `{site.url}/assets/screenshot-light.png` |
| `Application_Icon_URL` | `{site.url}/assets/icon-256.png` |
| `Application_XML_File_URL` | `{site.url}/pad.xml` (FR-007) |
| `Primary_Download_URL` | `installer.url` |

## State transitions

None — the PAD file is stateless build output, fully regenerated every build. Its lifecycle equals
the site deploy lifecycle (atomic swap; old complete file or new complete file, never partial).
