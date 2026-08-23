# Quickstart: validating PAD 4.0 compliance

Runnable checks that prove the feature works. Contract details live in [contracts/pad-file.md](contracts/pad-file.md); value sources in [data-model.md](data-model.md).

**Prerequisites**: Node ≥22 (local v24), `npm install` already done. Everything below runs offline.

---

## Step 0 — Vendor the specification (once)

The build must not depend on the defunct spec host, so the specification is committed.

```bash
curl -sSL -o vendor/pad-4.0-spec.xml \
  "http://web.archive.org/web/20180118232330if_/http://repository.appvisor.com/padspec/files/padspec.xml"
```

Verify the bytes are the ones this plan was written against:

```bash
sha256sum vendor/pad-4.0-spec.xml     # cb2107e31186caf09f5db57303828d772b9e6ce063c739456d942f1ff94768f6
wc -c < vendor/pad-4.0-spec.xml       # 52258
grep -c "<Field>" vendor/pad-4.0-spec.xml   # 104
grep -o "<PAD_Spec_Version>[^<]*" vendor/pad-4.0-spec.xml   # 4.0
```

If the archive is unreachable, a byte-identical copy is preserved at
[contracts/pad-4.0-spec.reference.xml](contracts/pad-4.0-spec.reference.xml) — copy that instead and confirm the same checksum.

---

## Step 1 — Green build

```bash
npm run build
```

Expect a clean build and a regenerated `public/pad.xml`.

---

## Step 2 — Confirm the six fixes landed

```bash
grep -o "<MASTER_PAD_VERSION>[^<]*"        public/pad.xml   # 4.0
grep -o "<Program_OS_Support>[^<]*"        public/pad.xml   # WinOther
grep -o "<Program_Specific_Category>[^<]*" public/pad.xml   # Utilities
grep -o "<Program_Category_Class>[^<]*"    public/pad.xml   # System Utilities::File & Disk Management
grep -c "City_Town\|Sales_Email\|General_Email" public/pad.xml   # 0
grep -o "<Program_System_Requirements>[^<]*" public/pad.xml # Windows 11, x64  (the real platform, still stated)
```

---

## Step 3 — Confirm the 4.0 element order (FR-007)

```bash
sed -n '/<Program_Info>/,/<\/Program_Info>/p' public/pad.xml | grep -o "^\s*<[A-Za-z_]*>" | tr -d ' <>'
```

Expect, in this order: `Program_Name`, `Program_Version`, `Program_Release_Month`, `Program_Release_Day`, `Program_Release_Year`, `Program_Cost_Dollars`, `Program_Cost_Other_Code`, `Program_Cost_Other`, `Program_Type`, `Program_Release_Status`, `Program_Install_Support`, `Program_OS_Support`, `Program_Language`, `File_Info`, `Expire_Info`, `Program_Change_Info`, `Program_Category_Class`, `Program_Specific_Category`, `Program_System_Requirements`.

---

## Step 4 — Independent 4.0 validation (SC-001)

The build gate is the enforcement, but an independent check confirms the gate is not grading its own homework. The exact checker used for the R7 pre-flight is preserved with this feature — it is **not** part of the build and is not installed into the project:

```bash
node specs/006-pad-v4-compliance/contracts/pad-check.reference.js \
     vendor/pad-4.0-spec.xml public/pad.xml
```

Expected output after implementation:

```text
PAD_Spec_Version: 4.0
parsed fields: 104 | empty paths: 0 | empty regexes: 9
JS compile failures: 0 / 104

verdict -> present&valid: 65 | violations: 0 | absent: 39
```

Run against today's file it reports the baseline instead — `63 | violations: 5 | absent: 36` — which is the before/after evidence for SC-001.

> The checker is deliberately a separate, simpler implementation from the gate: it walks the tree and applies the spec patterns and nothing else. Two independent implementations (Python `re` with a real XML parser, and this JS one) produce identical verdicts on both the current and the target file.

---

## Step 5 — Red battery: every known defect must fail the build

Make each edit, run `npm run build`, confirm it **fails naming the element**, then revert.

| # | Edit in `src/pad.njk` (or data) | Expected failure |
|---|--------------------------------|------------------|
| 1 | `MASTER_PAD_VERSION` → `3.11` | version does not match the vendored `PAD_Spec_Version` |
| 2 | `Program_OS_Support` → `Win11 x64` | `Program_OS_Support` — not in the 4.0 OS vocabulary |
| 3 | `Program_Specific_Category` → `System Utilities` | `Program_Specific_Category` — not in the 4.0 category list |
| 4 | re-add `<City_Town></City_Town>` | `City_Town` — needs: Text string 2-40 characters |
| 5 | re-add `<Sales_Email></Sales_Email>` | `Sales_Email` — needs an e-mail address |
| 6 | rename an element, e.g. `<Program_Nam>` | unknown element — not a PAD 4.0 path |
| 7 | `Program_Type` → `Free` | `Program_Type` — not in the 4.0 list |
| 8 | rename the `<Czech>` block to `<Czechh>` | not a 4.0 language token |
| 9 | delete the `<Czech>` block | required language block missing |
| 10 | over-length `pad.desc45` in `cs.json` | `Char_Desc_45` — exceeds 45 characters |
| 11 | `<b>x</b>` inside `pad.desc80` | markup not allowed in PAD text |
| 12 | `installerSizeBytes` → `12` in `site.json` | implausible installer size |
| 13 | change `releaseDate` without rebuilding derived values | release date parts disagree with `site.json` |

Items 1–6 are the defects this feature fixes; 7–13 are 005's protections, which must survive the gate rewrite.

---

## Step 6 — Release simulation (SC-005, FR-011)

Bump `version`, `releaseDate` and `installerSizeBytes` in `src/_data/site.json`, then:

```bash
npm run build
grep -o "<Program_Version>[^<]*" public/pad.xml
grep -o "<Primary_Download_URL>[^<]*" public/pad.xml
grep -o "<File_Size_Bytes>[^<]*" public/pad.xml
```

Expect the new version, the matching `v<version>` download URL and the new size — with no PAD-specific edits — and the file still 4.0 compliant. Revert afterwards.

---

## Step 7 — Serve and fetch (SC-006)

```bash
npm run preview      # wrangler dev
curl -s http://127.0.0.1:8787/pad.xml | head -5
curl -s http://127.0.0.1:8787/pad.xml | grep -c "Tandem Commander je rychlý"   # 1 — Czech diacritics intact
```

---

## Step 8 — Deploy verification (SC-006)

```bash
npm run deploy
curl -s https://tandemcommander.org/pad.xml | grep -o "<MASTER_PAD_VERSION>[^<]*"
curl -sI https://tandemcommander.org/assets/screenshot-light.png | head -1   # 200
curl -sI https://tandemcommander.org/assets/icon-256.png | head -1           # 200
```

> **Coordinate first**: screenshots are still temporary placeholders (see 005 T018). Deploying the PAD file is fine; catalog submission should wait for final assets.

---

## Step 9 — Catalog submission (author-performed, after this feature)

Submit `https://tandemcommander.org/pad.xml` at slunecnice.cz via "Nahrát URL s PAD souborem". This closes 005's T019, now with a 4.0 file rather than a 3.11 one. Record any field the catalog still demands manually as a follow-up.
