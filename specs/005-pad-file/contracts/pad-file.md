# Contract: `https://tandemcommander.org/pad.xml`

**Consumers**: software-catalog PAD importers (slunecnice.cz first). **Producer**: Eleventy build (`src/pad.njk`).
**Stability**: the URL and the element tree are permanent once first submitted to a catalog.

Delivery: `GET /pad.xml` → `200`, well-formed XML, UTF-8 (`<?xml version="1.0" encoding="UTF-8"?>`), no BOM.

Legend for **Src**: `S` = site.json · `I` = installer.js · `T` = i18n `pad.*` via `t` filter · `W` = derived from `whatsNew.*` · `C` = constant in pad.njk · `D` = derived value.
Empty-allowed fields are emitted as empty elements (never omitted — importers expect the full tree).

```text
XML_DIZ_INFO
├── MASTER_PAD_VERSION_INFO
│   ├── MASTER_PAD_VERSION        C  "3.11"                      (required)
│   ├── MASTER_PAD_EDITOR         C  "tandemcommander-web build" (≤ 100)
│   └── MASTER_PAD_INFO           C  "Portable Application Description, or PAD for short, is a data set that is used by shareware authors to disseminate information to anyone interested in their software products. To find out more go to http://pad.asp-software.org" (fixed boilerplate)
├── Company_Info
│   ├── Company_Name              S  author.name "Pavel Stupka"  (required, 2–40)
│   ├── Address_1 / Address_2     C  empty                       (optional)
│   ├── City_Town / State_Province / Zip_Postal_Code  C empty    (optional)
│   ├── Country                   C  "Czech Republic"            (required, 2–40)
│   ├── Company_WebSite_URL       S  url                         (required, https URL)
│   ├── Contact_Info
│   │   ├── Author_First_Name     D  first word of author.name   (required, 1–30)
│   │   ├── Author_Last_Name      D  rest of author.name         (required, 1–30)
│   │   ├── Author_Email          S  author.email                (required, e-mail — clarification Q2)
│   │   ├── Contact_First_Name    D  = Author_First_Name         (required)
│   │   ├── Contact_Last_Name     D  = Author_Last_Name          (required)
│   │   └── Contact_Email         S  author.email                (required)
│   └── Support_Info
│       ├── Sales_Email           C  empty                       (optional)
│       ├── Support_Email         S  author.email                (optional; filled per Q2)
│       ├── General_Email         C  empty                       (optional)
│       └── Sales_Phone / Support_Phone / General_Phone / Fax_Phone  C empty (optional)
├── Program_Info
│   ├── Program_Name              S  name                        (required, 1–40)
│   ├── Program_Version           S  version                     (required, 1–15)
│   ├── Program_Release_Month     D  from releaseDate            (required, 01–12)
│   ├── Program_Release_Day       D  from releaseDate            (required, 01–31)
│   ├── Program_Release_Year      D  from releaseDate            (required, 4 digits)
│   ├── Program_Cost_Dollars      C  "0"                         (required for Freeware)
│   ├── Program_Cost_Other_Code   C  empty                       (optional)
│   ├── Program_Cost_Other        C  empty                       (optional)
│   ├── Program_Type              C  "Freeware"                  (enum: Shareware|Freeware|Adware|Demo|Commercial|Data Only)
│   ├── Program_Release_Status    C  "New Release"               (enum: Major Update|Minor Update|New Release|Beta|Alpha|Media Only)
│   ├── Program_Install_Support   C  "Install and Uninstall"     (enum: Install and Uninstall|Install Only|No Install Support|Uninstall Only)
│   ├── Program_OS_Support        C  "Win11 x64"                 (comma list; vendored enumeration = classic 3.11 tokens + modern extensions "Win 8","Win8 x64","Win10 x32","Win10 x64","Win11 x64" — documented deviation, see research R4)
│   ├── Program_Language          C  "English"                   (comma list from official token set; = app UI languages)
│   ├── Program_Change_Info       W  joined whatsNew titles      (≤ 300, plain text)
│   ├── Program_Specific_Category C  "System Utilities"          (legacy category, ≤ 2000)
│   ├── Program_Category_Class    C  "System Utilities::File & Disk Management" (official category pair)
│   ├── Program_System_Requirements C "Windows 11, x64"          (≤ 100)
│   ├── File_Info
│   │   ├── File_Size_Bytes       S  installerSizeBytes          (required, digits, gate: 1e5 < n < 2^30)
│   │   ├── File_Size_K           D  round(bytes/1024)           (required, consistent with Bytes — gate-checked)
│   │   └── File_Size_MB          D  bytes/1048576, 2 decimals   (required, consistent with Bytes — gate-checked)
│   └── Expire_Info
│       ├── Has_Expire_Info       C  "N"                         (Y|N)
│       └── Expire_Count / Expire_Based_On / Expire_Other_Info / Expire_Month / Expire_Day / Expire_Year  C empty (must be empty when N)
├── Program_Descriptions
│   ├── English                                                   (block required)
│   │   ├── Keywords              T  pad.keywords (en)           (≤ 250, comma-separated)
│   │   ├── Char_Desc_45          T  pad.desc45 (en)             (≤ 45, plain text, no line breaks)
│   │   ├── Char_Desc_80          T  pad.desc80 (en)             (≤ 80, plain text, no line breaks)
│   │   ├── Char_Desc_250         T  pad.desc250 (en)            (≤ 250, plain text)
│   │   ├── Char_Desc_450         T  pad.desc450 (en)            (≤ 450, plain text)
│   │   └── Char_Desc_2000        T  pad.desc2000 (en)           (≤ 2000, plain text)
│   └── Czech                                                     (block required by FR-004; same five fields + Keywords)
│       └── …                     T  pad.* (cs)                  (same limits; UTF-8 diacritics allowed)
├── Web_Info
│   ├── Application_URLs
│   │   ├── Application_Info_URL        S  url                   (https URL)
│   │   ├── Application_Order_URL       C  empty                 (no purchases)
│   │   ├── Application_Screenshot_URL  D  {url}/assets/screenshot-light.png (https URL, image exists in src/assets)
│   │   ├── Application_Icon_URL        D  {url}/assets/icon-256.png         (https URL, image exists in src/assets)
│   │   └── Application_XML_File_URL    D  {url}/pad.xml         (https URL — self-reference, FR-007)
│   └── Download_URLs
│       ├── Primary_Download_URL        I  installer.url         (required, https URL)
│       ├── Secondary_Download_URL      C  empty                 (optional)
│       └── Additional_Download_URL_1 / Additional_Download_URL_2  C empty (optional)
└── Permissions
    ├── Distribution_Permissions  C  authored GPLv2 redistribution statement (≤ 2000, plain text)
    └── EULA                      C  authored GPLv2 no-warranty notice + repo license pointer (≤ 20000, plain text)
```

## Gate rules (enforced by the build transform on this output — FR-008)

1. Well-formed XML; single root `XML_DIZ_INFO`; UTF-8 decodable; no BOM.
2. Every element marked *required* above is present and non-empty; every element in the tree is present (possibly empty).
3. Length caps and enum memberships exactly as annotated; month/day/year zero-padded and consistent with `site.releaseDate`.
4. All non-empty `*_URL` values are absolute `https://` URLs; `Application_*_URL` asset paths exist in `src/assets/`.
5. `File_Size_K`/`File_Size_MB` recompute from `File_Size_Bytes` (tolerance: rounding only).
6. No `<` in any text value after rendering (i.e., no HTML leaked from i18n), except the XML markup itself.
7. Violation ⇒ build throws `pad: <element>: <reason>` and nothing is published.

## Compatibility notes

- **OS token deviation** from strict 3.11 (research R4): `Win11 x64` postdates the frozen 2010 enumeration; real-world precedent is PSPad's PAD, accepted by slunecnice.cz.
- Catalogs that ignore the `Czech` block simply use `English` — additive, non-breaking.
- Adding future languages = adding sibling blocks; consumers are unaffected.
