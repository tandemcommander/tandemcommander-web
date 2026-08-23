# Phase 1 Data Model: PAD 4.0 Compliance

This feature changes **no data sources**. `site.json`, `installer.js`, `pad.js` and both i18n catalogs keep their existing shape and values; every description, keyword, permission and EULA string already satisfies its PAD 4.0 pattern. What changes is the set of PAD-only constants in the template, the removal of three elements, the element order, and where the build gate gets its rules.

## 1. New vendored artifact: the PAD 4.0 specification

**Location**: `vendor/pad-4.0-spec.xml` — outside Eleventy's `input` (`src`) and outside every passthrough-copy root, so it is never published.

**Provenance**: `http://web.archive.org/web/20180118232330if_/http://repository.appvisor.com/padspec/files/padspec.xml`
**Integrity**: 52,258 bytes · sha256 `cb2107e31186caf09f5db57303828d772b9e6ce063c739456d942f1ff94768f6` · 104 `<Field>` entries · `PAD_Spec_Version` = `4.0`

**Shape** (attribute-free paired tags — parseable by the same minimal approach the gate already uses):

```text
PAD_Spec
├── PAD_Spec_Version                "4.0"
└── Fields
    └── Field  × 104
        ├── Name                    e.g. "Program_OS_Support"
        ├── Path                    e.g. "XML_DIZ_INFO/Program_Info/Program_OS_Support"
        ├── Title                   human label
        ├── ShortDescription        human description
        ├── RegExDocumentation      e.g. "Text string 2-40 characters"  → used in gate error messages
        └── RegEx                   e.g. "^[^&lt;\x09]{2,40}\Z"          → the constraint
```

**Derived rule table** (built once per build, in memory — never committed):

| Derivation | Rule |
|-----------|------|
| `path` | `Field/Path` with the leading `XML_DIZ_INFO/` stripped, matching the gate's existing path style |
| `pattern` | `Field/RegEx`, entity-decoded (`&lt;` → `<`), with `\Z` → `$`, compiled as a JS `RegExp`. **An empty `RegEx` means "no constraint"** — 9 fields (`Affiliates_*` ×8, `ASP_Member_Number`) carry one; they must not be compiled as `new RegExp("")`, which matches everything |
| `doc` | `Field/RegExDocumentation`, quoted verbatim in the failure message |
| `knownPaths` | the set of all 104 paths — any element in the output outside this set fails the build |
| `specVersion` | `PAD_Spec_Version`; the output's `MASTER_PAD_VERSION` must equal it |

## 2. Changed PAD-only constants in `src/pad.njk`

| Element | 005 value | 006 value | Why |
|---------|-----------|-----------|-----|
| `MASTER_PAD_VERSION` | `3.11` | `4.0` | FR-001 |
| `Program_OS_Support` | `Win11 x64` | `WinOther` | FR-003 — no Windows 11 token exists in 4.0 (research R5) |
| `Program_Specific_Category` | `System Utilities` | `Utilities` | FR-004 — 4.0 vocabulary for this field |

Unchanged constants: `MASTER_PAD_EDITOR`, `MASTER_PAD_INFO`, `Country`, `Program_Cost_Dollars` (`0`), `Program_Type` (`Freeware`), `Program_Release_Status` (`New Release`), `Program_Install_Support` (`Install and Uninstall`), `Program_Language` (`English`), `Program_Category_Class` (`System Utilities::File & Disk Management` — already valid 4.0), `Program_System_Requirements` (`Windows 11, x64` — now the only place the real platform is stated), `Has_Expire_Info` (`N`), `Distribution_Permissions`, `EULA`.

## 3. Removed elements

| Element | 4.0 requirement | Action |
|---------|-----------------|--------|
| `Company_Info/City_Town` | Text string 2–40 characters | Omit — no postal address is published |
| `Support_Info/Sales_Email` | E-mail address | Omit — no sales contact exists |
| `Support_Info/General_Email` | E-mail address | Omit — no general alias exists |

Each is currently emitted as an empty element, which its 4.0 pattern rejects (research R4/R6). Omission is the only compliant option; inventing values is forbidden by FR-005.

**Kept as empty elements** (their patterns permit empty — 20 in total): `Address_1`, `Address_2`, `State_Province`, `Zip_Postal_Code`, `Sales_Phone`, `Support_Phone`, `General_Phone`, `Fax_Phone`, `Program_Cost_Other_Code`, `Program_Cost_Other`, `Expire_Count`, `Expire_Based_On`, `Expire_Other_Info`, `Expire_Month`, `Expire_Day`, `Expire_Year`, `Application_Order_URL`, `Secondary_Download_URL`, `Additional_Download_URL_1`, `Additional_Download_URL_2`.

**Permanently omitted** (FR-006 — the issuing service is defunct and their patterns reject empty): `PublisherID`, `AppID`, `CERTIFIED`, `ASP_Member`. And by choice, as optional sections with nothing truthful to say: `CERTIFICATE_ID`, `CERTIFICATE_LICENSE`, the five company social/store pages, `FacebookProductPage`, `GooglePlusProductPage`, `Video_Link_1_URL`, `Video_Link_2_URL`, and the whole `Press_Release`, `NewsFeed`, `Affiliates` and `ASP` sections.

## 4. Element order (FR-007)

Only `Program_Info` changes. Target order, verified in the R7 pre-flight:

```text
Program_Name, Program_Version, Program_Release_Month, Program_Release_Day,
Program_Release_Year, Program_Cost_Dollars, Program_Cost_Other_Code,
Program_Cost_Other, Program_Type, Program_Release_Status,
Program_Install_Support, Program_OS_Support, Program_Language,
File_Info, Expire_Info, Program_Change_Info, Program_Category_Class,
Program_Specific_Category, Program_System_Requirements
```

Moved: `File_Info` and `Expire_Info` rise to just after `Program_Language`; `Program_Category_Class` now precedes `Program_Specific_Category`. Every other section already matches the 4.0 order.

## 5. Unchanged data sources

| Source | Role | Change |
|--------|------|--------|
| `src/_data/site.json` | name, version, `releaseDate`, `installerSizeBytes`, `url`, `author.*`, `github.repoUrl` | none |
| `src/_data/installer.js` | installer file name + download URL | none |
| `src/_data/pad.js` | release date split, file-size trio, author name split, `changeInfo` from `whatsNew` | none |
| `src/_data/i18n/en.json`, `cs.json` | `pad.keywords`, `pad.desc45/80/250/450/2000` | none — all already within 4.0 limits |

FR-011 holds by construction: the release routine (`version`, `releaseDate`, `installerSizeBytes`, What's New → deploy) is untouched.

## 6. Validation state transitions

```text
template renders  →  gate reads vendored spec  →  parse output tree
                                                        │
        ┌───────────────────────────────────────────────┤
        │  layer 1 — 4.0 conformance (from the spec)    │
        │    · every emitted path is a known 4.0 path   │
        │    · every value matches its path's pattern   │
        │    · MASTER_PAD_VERSION == PAD_Spec_Version   │
        ├───────────────────────────────────────────────┤
        │  layer 2 — project completeness + cross-checks│
        │    · required elements present and non-empty  │
        │    · dates/sizes agree with site.json         │
        │    · assets exist; self-URL canonical         │
        │    · Expire_* empty while Has_Expire_Info = N │
        │    · English + Czech blocks complete          │
        └───────────────────────────────────────────────┘
                          │
              pass → publish       fail → throw `pad: <element>: <reason>`, nothing published
```
