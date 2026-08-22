# Quickstart Validation: PAD File for Software Catalogs

**Spec**: [spec.md](spec.md) · **Contract**: [contracts/pad-file.md](contracts/pad-file.md) · **Data model**: [data-model.md](data-model.md)

## Prerequisites

- `npm install` done; Node ≥ 22 available for wrangler steps (local machine runs v24).
- No network needed for build steps (the build is offline by design — clarification Q1).

## 1. Green build produces the file (US1, FR-001)

```powershell
npm run build
```

Expected: build succeeds; `public/pad.xml` exists; starts with `<?xml version="1.0" encoding="UTF-8"?>`;
root element `XML_DIZ_INFO`; contains `<English>` **and** `<Czech>` blocks with all six description fields each
(see the [contract](contracts/pad-file.md) for the full tree). Spot-check that `Program_Version`,
release month/day/year, and `File_Size_Bytes` match `src/_data/site.json`, and that
`Primary_Download_URL` equals the download button URL on the built page (`public/index.html`).

## 2. Red builds — the gate blocks invalid output (US2 scenario 3, FR-008)

Each check: make the temporary edit, run `npm run build`, expect **failure naming the field**, then revert.

| Temporary edit | Expected failure mentions |
|----------------|---------------------------|
| Remove `installerSizeBytes` from `site.json` | `File_Size_Bytes` / `installerSizeBytes` |
| Set `installerSizeBytes` to `"abc"` or `12` | size not a plausible positive integer |
| Make `pad.desc45` in `cs.json` longer than 45 chars | `Char_Desc_45` (Czech) over limit |
| Delete `pad.keywords` from `cs.json` only | existing i18n **parity** gate fires (missing key) |
| Put `<b>x</b>` into `pad.desc80` | markup rejected (i18n gate or PAD gate) |

## 3. Release simulation — automatic update (US2, FR-006, SC-003)

1. In `site.json` bump `version` (e.g. `0.1.5`), change `releaseDate`, change `installerSizeBytes`.
2. `npm run build`
3. Expected: `public/pad.xml` shows the new version, new date split, new size, and a
   `Primary_Download_URL` containing `v0.1.5` — with **zero** edits outside `site.json`.
4. Revert.

## 4. Serving locally (FR-001)

```powershell
npm run preview   # wrangler dev
# then fetch http://localhost:8787/pad.xml
```

Expected: `200`, the XML body, no redirect. (`npm run check` for a deploy dry-run.)

## 5. After deploy (SC-005)

```powershell
curl.exe -s https://tandemcommander.org/pad.xml | Select-Object -First 5
```

Expected: the XML, same content as the local build. Also verify
`https://tandemcommander.org/assets/screenshot-light.png` and `/assets/icon-256.png` load (contract gate 4 references them).

## 6. External validation (SC-002)

The official ASP/AppVisor validators are offline (research: sources note). SC-002 is satisfied by:
- the build gate (the vendored rule set from the [contract](contracts/pad-file.md)) passing, plus
- one independent check: open the [i-net PAD editor/validator](https://github.com/i-net-software/pad-file-editor-validator)
  locally (PHP) or any surviving PAD parser and confirm it parses the file with no structural errors.
  The single documented deviation is the modern OS token (`Win11 x64`, research R4).

## 7. Catalog submission — the real end-to-end test (US1, SC-001)

> ⏸ **Precondition (memory: pending-final-assets)**: current screenshots are temporary placeholders.
> Submit to catalogs only after final assets land and are deployed.

1. Log in at slunecnice.cz (author account) and open https://www.slunecnice.cz/admin/programy/pridat/.
2. Choose the PAD route ("Nahrát URL s PAD souborem") and enter `https://tandemcommander.org/pad.xml`.
3. Expected: the form pre-fills from the PAD file; complete submission without re-typing program data (SC-001).
4. Record any field slunečnice still demands manually → follow-up task (spec assumption: none expected).
5. Verify the resulting listing shows Czech description text (SC-004).

## Success criteria coverage

| SC | Proven by step |
|----|----------------|
| SC-001 | 7 |
| SC-002 | 2 + 6 |
| SC-003 | 3 |
| SC-004 | 1 + 7 |
| SC-005 | 5 |
