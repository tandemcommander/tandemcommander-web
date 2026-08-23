# Contract: `https://tandemcommander.org/pad.xml` (PAD 4.0)

**Supersedes** [005's 3.11 contract](../../005-pad-file/contracts/pad-file.md). **Consumers**: software-catalog PAD importers (slunecnice.cz first). **Producer**: Eleventy build (`src/pad.njk`). **Authority**: the vendored `vendor/pad-4.0-spec.xml` (`PAD_Spec_Version` 4.0, 104 fields) — where this document and the vendored spec disagree, the spec wins and the build fails.

**Stability**: the URL is permanent. The declared revision is `4.0`.

Delivery: `GET /pad.xml` → `200`, well-formed XML, UTF-8 (`<?xml version="1.0" encoding="UTF-8"?>`), no BOM.

Legend for **Src**: `S` = site.json · `I` = installer.js · `P` = pad.js (derived) · `T` = i18n `pad.*` via the `t` filter · `C` = constant in pad.njk.
Empty-allowed fields are emitted as empty elements (importers expect the tree); fields whose 4.0 pattern rejects an empty value are **omitted** when the project has no data. Constraints in parentheses are the spec's own `RegExDocumentation`.

```text
XML_DIZ_INFO
├── MASTER_PAD_VERSION_INFO
│   ├── MASTER_PAD_VERSION        C  "4.0"                       (must equal the vendored PAD_Spec_Version)
│   ├── MASTER_PAD_EDITOR         C  "tandemcommander-web build" (text 0-100)
│   ├── MASTER_PAD_INFO           C  fixed PAD boilerplate       (text 0-1000)
│   └── ── CERTIFIED / CERTIFICATE_ID / CERTIFICATE_LICENSE      OMITTED (dead certification service;
│                                                                 CERTIFIED rejects an empty value)
├── Company_Info
│   ├── ── PublisherID                                           OMITTED (needs "pid-" + 12 chars from a
│   │                                                              defunct registry; rejects empty — FR-006)
│   ├── Company_Name              S  author.name                 (text 2-40, required)
│   ├── Address_1 / Address_2     C  empty                       (empty permitted)
│   ├── ── City_Town                                             OMITTED (text 2-40 — rejects empty)
│   ├── State_Province            C  empty                       (empty permitted)
│   ├── Zip_Postal_Code           C  empty                       (empty permitted)
│   ├── Country                   C  "Czech Republic"            (text 2-40, required)
│   ├── Company_WebSite_URL       S  url                         (http/https URL, required)
│   ├── Contact_Info
│   │   ├── Author_First_Name     P  first word of author.name   (text 2-30, required)
│   │   ├── Author_Last_Name      P  rest of author.name         (text 2-30, required)
│   │   ├── Author_Email          S  author.email                (e-mail, required)
│   │   ├── Contact_First_Name    P  = Author_First_Name         (required)
│   │   ├── Contact_Last_Name     P  = Author_Last_Name          (required)
│   │   └── Contact_Email         S  author.email                (e-mail, required)
│   ├── Support_Info
│   │   ├── ── Sales_Email                                       OMITTED (e-mail — rejects empty)
│   │   ├── Support_Email         S  author.email                (e-mail, required in practice)
│   │   ├── ── General_Email                                     OMITTED (e-mail — rejects empty)
│   │   └── Sales_Phone / Support_Phone / General_Phone / Fax_Phone  C empty (empty permitted)
│   └── ── GooglePlusPage / LinkedinPage / TwitterCompanyPage /
│          FacebookCompanyPage / CompanyStorePage                OMITTED (no such pages)
├── Program_Info                                                 ORDER BELOW IS THE 4.0 SEQUENCE — FR-007
│   ├── ── AppID                                                 OMITTED (needs "app-" + 12 chars from a
│   │                                                              defunct registry; rejects empty — FR-006)
│   ├── Program_Name              S  name                        (text 2-40, required)
│   ├── Program_Version           S  version                     (text 1-15, required)
│   ├── Program_Release_Month     P  from releaseDate            (01-12, required)
│   ├── Program_Release_Day       P  from releaseDate            (01-31, required)
│   ├── Program_Release_Year      P  from releaseDate            (4 digits, required)
│   ├── Program_Cost_Dollars      C  "0"                         (numeric, "." decimal separator)
│   ├── Program_Cost_Other_Code   C  empty                       (empty permitted)
│   ├── Program_Cost_Other        C  empty                       (empty permitted)
│   ├── Program_Type              C  "Freeware"                  (Shareware|Freeware|Adware|Demo|Commercial|Data Only)
│   ├── Program_Release_Status    C  "New Release"               (Major Update|Minor Update|New Release|Beta|Alpha|Media Only)
│   ├── Program_Install_Support   C  "Install and Uninstall"     (from the 4.0 list)
│   ├── Program_OS_Support        C  "WinOther"                  (4.0 OS vocabulary — NO Win10/Win11 token
│   │                                                              exists; see the standing rule below)
│   ├── Program_Language          C  "English"                   (4.0 language vocabulary)
│   ├── File_Info                                                ← MOVED UP to the 4.0 position
│   │   ├── File_Size_Bytes       S  installerSizeBytes          (digits, required; gate: 1e5 < n < 2^30)
│   │   ├── File_Size_K           P  round(bytes/1024)           (digits, required; recomputed — gate-checked)
│   │   └── File_Size_MB          P  bytes/1048576, 2 decimals   (numeric, required; recomputed — gate-checked)
│   ├── Expire_Info                                              ← MOVED UP to the 4.0 position
│   │   ├── Has_Expire_Info       C  "N"                         (Y|y|N|n)
│   │   └── Expire_Count / Expire_Based_On / Expire_Other_Info /
│   │       Expire_Month / Expire_Day / Expire_Year   C empty     (must be empty while Has_Expire_Info = N)
│   ├── Program_Change_Info       P  joined whatsNew titles      (text 0-300, single line)
│   ├── Program_Category_Class    C  "System Utilities::File & Disk Management"
│   │                                                            (two-level 4.0 category list — already valid)
│   ├── Program_Specific_Category C  "Utilities"                 (Audio|Business|Development Tools|Education|
│   │                                                              Games|Graphics|Home/Hobby|Internet|
│   │                                                              Miscellaneous|Screen Savers|Utilities)
│   ├── Program_System_Requirements C "Windows 11, x64"          (text 0-100 — the ONLY field that now states
│   │                                                              the real platform; keep it accurate)
│   └── ── FacebookProductPage / GooglePlusProductPage           OMITTED (no such pages)
├── Program_Descriptions
│   ├── English                                                   (block required)
│   │   ├── Keywords              T  pad.keywords (en)           (text 0-250, single line)
│   │   ├── Char_Desc_45          T  pad.desc45 (en)             (text 0-45, single line)
│   │   ├── Char_Desc_80          T  pad.desc80 (en)             (text 0-80, single line)
│   │   ├── Char_Desc_250         T  pad.desc250 (en)            (text 0-250)
│   │   ├── Char_Desc_450         T  pad.desc450 (en)            (text 0-450)
│   │   └── Char_Desc_2000        T  pad.desc2000 (en)           (text 0-2000)
│   └── Czech                                                     (block required by FR-008; same six fields)
│       └── …                     T  pad.* (cs)                  (validated against the English paths'
│                                                                  patterns; UTF-8 diacritics allowed)
├── Web_Info
│   ├── Application_URLs
│   │   ├── Application_Info_URL        S  url                   (http/https URL)
│   │   ├── Application_Order_URL       C  empty                 (empty permitted — no purchases)
│   │   ├── Application_Screenshot_URL  P  {url}/assets/screenshot-light.png  (URL ending .gif|.jpg|.png)
│   │   ├── Application_Icon_URL        P  {url}/assets/icon-256.png          (URL ending .gif|.jpg|.png)
│   │   ├── Application_XML_File_URL    P  {url}/pad.xml         (URL — self-reference; gate pins it)
│   │   └── ── Video_Link_1_URL / Video_Link_2_URL               OMITTED (no product video)
│   └── Download_URLs
│       ├── Primary_Download_URL        I  installer.url         (URL, required)
│       ├── Secondary_Download_URL      C  empty                 (empty permitted)
│       └── Additional_Download_URL_1 / Additional_Download_URL_2  C empty (empty permitted)
├── Permissions
│   ├── Distribution_Permissions  C  GPLv2 redistribution statement  (text, plain)
│   └── EULA                      C  GPLv2 no-warranty notice + repo license pointer  (text, plain)
└── ── Press_Release / NewsFeed / Affiliates / ASP               OMITTED (optional 4.0 sections describing
                                                                  services that no longer exist; ASP_Member
                                                                  rejects an empty value)
```

## Gate rules (enforced by the build transform on this output — FR-009)

**Layer 1 — PAD 4.0 conformance, derived from `vendor/pad-4.0-spec.xml`:**

1. Well-formed XML; single root `XML_DIZ_INFO`; UTF-8 decodable; no BOM; UTF-8 declaration present.
2. `MASTER_PAD_VERSION` equals the vendored spec's `PAD_Spec_Version` (`4.0`). This is the check the spec's own loose version pattern cannot make.
3. Every element path in the output is one of the spec's 104 known paths — an unknown element name fails the build. Per-language `Program_Descriptions/<Language>/…` blocks map onto the `English` paths; a block name that is not a 4.0 language token fails.
4. Every emitted value matches its path's compiled pattern. An empty `RegEx` in the spec means no constraint (9 fields) and must not be compiled as `new RegExp("")`.
5. Failure message quotes the spec's own `RegExDocumentation`, e.g. `pad: Company_Info/City_Town: value "" does not match — needs: Text string 2-40 characters`.

**Layer 2 — project completeness and cross-checks the format cannot express:**

6. Every element marked *required* above is present and non-empty; both the `English` and `Czech` description blocks are present with all six fields.
7. Release month/day/year are zero-padded and agree with `site.json`'s `releaseDate`; `File_Size_Bytes` equals `installerSizeBytes` and lies in the plausible range (100 KB – 1 GB); `File_Size_K` and `File_Size_MB` recompute from it.
8. `Application_XML_File_URL` equals `{site.url}/pad.xml`; the screenshot and icon files referenced exist under `src/assets/`.
9. `Expire_*` are empty while `Has_Expire_Info` is `N`.
10. No `<` in any text value after rendering (no HTML leaked from i18n) — also covered by the spec's own `[^<\x09]` classes.
11. Violation ⇒ build throws `pad: <element>: <reason>` and nothing is published.

## Standing rule: operating-system value (FR-003a)

PAD 4.0's OS vocabulary is frozen — its newest Windows members are `Windows 8`, `Windows RT`, `Windows Phone 7`/`8`, plus `WinOther`, `Other`, `Not Applicable`. **When the program's actual Windows version has no 4.0 token, use `WinOther`** and state the real requirement in `Program_System_Requirements`. Never pick a lower Windows token to look more specific — that publishes a false compatibility claim. This applies unchanged to Windows 12 and beyond.

## Compatibility notes

- **Versus 005's 3.11 output**: element names are unchanged, so a 3.x-era importer still finds every field it knows. The observable differences are the version stamp, `WinOther` in place of `Win11 x64`, `Utilities` in place of `System Utilities`, three absent empty elements, and the `Program_Info` order.
- **Dropping `City_Town`, `Sales_Email`, `General_Email`** is safe for importers: they were empty, so no information is lost, and 4.0 rejects them empty.
- Catalogs that ignore the `Czech` block fall back to `English` — additive, non-breaking.
- Adding a future language = adding a sibling block; the gate validates it automatically against the English paths.
- **Verified end state** (research R7): 65 present & valid, **0 violations**, 39 absent — all optional.
