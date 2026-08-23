# Implementation Plan: PAD 4.0 Compliance for the Published PAD File

**Branch**: `006-pad-v4-compliance` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-pad-v4-compliance/spec.md`

## Summary

Re-target the generated PAD file at `https://tandemcommander.org/pad.xml` from revision 3.11 to **PAD 4.0**, and replace the hand-maintained validation table introduced by 005 with rules **derived at build time from the vendored PAD 4.0 specification itself** — the machine-readable `PAD_Spec` document (104 field paths, each with a validation regex) recovered from the Internet Archive and committed to the repository.

Six content fixes plus one reordering bring the file to zero violations: version stamp `3.11` → `4.0`, `Program_OS_Support` `Win11 x64` → `WinOther` (per the clarification), `Program_Specific_Category` `System Utilities` → `Utilities`, three empty elements dropped whose 4.0 patterns forbid emptiness (`City_Town`, `Sales_Email`, `General_Email`), and `Program_Info` resequenced to the 4.0 field order.

**The end state is already verified.** A pre-flight applied all six fixes to the current output and validated the result against all 104 PAD 4.0 patterns in JavaScript: **65 present & valid, 0 violations, 39 absent** (all optional). See [research.md](research.md) R7.

## Technical Context

**Language/Version**: Node.js ≥22 (local v24), Eleventy 3.x, Nunjucks templates

**Primary Dependencies**: `@11ty/eleventy` ^3.0.0, `wrangler` ^4 — **no new dependencies** (the 4.0 regexes compile natively in JS; no XML or schema library needed)

**Storage**: Files — `src/_data/site.json` and `src/_data/i18n/{en,cs}.json` unchanged in shape; one new vendored data file, `vendor/pad-4.0-spec.xml`

**Testing**: Build-time gate in `eleventy.config.js` (established project pattern); red/green battery in [quickstart.md](quickstart.md). The project has no test framework and this feature does not introduce one.

**Target Platform**: Cloudflare Workers assets-only site (serves `./public` verbatim, atomic deploys); consumers are software-catalog PAD importers fetching `/pad.xml`

**Project Type**: Static web site (single Eleventy project)

**Performance Goals**: N/A — parsing a 52 KB spec file and compiling 104 regexes once per build is immaterial

**Constraints**: Build stays offline and deterministic (the spec host is defunct — FR-010); output stays UTF-8 with no BOM; the published URL never changes (FR-012); no new manual release step (FR-011)

**Scale/Scope**: 1 vendored spec file, 1 rewritten build gate (replacing ~115 lines of hand-maintained rules), 1 template edited (6 value/structure changes), 1 README section. No i18n changes, no data-model changes, no new `site.json` fields.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — no project-specific gates exist. General guardrails applied in its place, matching 005:

| Guardrail | Status |
|-----------|--------|
| No new dependencies | **PASS** — all 104 spec regexes compile in stock JS after one `\Z` → `$` substitution (research R3) |
| No new toolchain or test framework | **PASS** — same build-transform gate pattern as the existing i18n gates |
| Single source of truth, no duplicated facts | **IMPROVED** — the gate's rules stop being a hand-transcribed copy of the spec and become a read of the spec itself |
| Build stays offline and deterministic | **PASS** — the spec is vendored; nothing is fetched at build time |
| Net complexity | **Mixed — and the pre-implementation estimate here was wrong.** No *format knowledge* is hand-maintained any more: 105 lines of rule/vocabulary tables (`PAD_RULES`, `PAD_ENUMS`, `PAD_OS_TOKENS`, `PAD_LANGUAGE_TOKENS`, `PAD_DESC_FIELDS`) are gone. But the replacement is bigger than predicted: `readPadSpec` is 80 lines (not ~30), the explicit `PAD_REQUIRED_ELEMENTS` list is 40, and `validatePad` grew 123 → 164. **Measured: `eleventy.config.js` went 451 → 531 lines (+242/−162).** The win is that the drift-prone part is gone, not that the file shrank |

**PASS** (pre-research and post-design).

## Project Structure

### Documentation (this feature)

```text
specs/006-pad-v4-compliance/
├── plan.md                              # This file
├── spec.md                              # Feature specification
├── research.md                          # Phase 0 output — R1..R9
├── data-model.md                        # Phase 1 output — value sources and derivations
├── quickstart.md                        # Phase 1 output — red/green validation battery
├── contracts/
│   ├── pad-file.md                      # Phase 1 output — the PAD 4.0 output contract
│   ├── pad-4.0-spec.reference.xml       # Recovered PAD 4.0 spec, preserved for provenance
│   └── pad-check.reference.js           # The R7 pre-flight checker — independent cross-check,
│                                        #   NOT part of the build (quickstart step 4)
├── checklists/
│   └── requirements.md                  # Spec quality checklist (complete)
└── tasks.md                             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
vendor/
└── pad-4.0-spec.xml         # NEW — the vendored PAD 4.0 specification (52,258 bytes, 104 fields,
                             #       sha256 cb2107e31186caf09f5db57303828d772b9e6ce063c739456d942f1ff94768f6)
                             #       Outside src/, so Eleventy never publishes it.
eleventy.config.js           # REWRITE of the PAD gate: rules read from the vendored spec instead of
                             #   hand-maintained tables; adds unknown-element and required-field checks
src/
├── pad.njk                  # EDIT — version 4.0, WinOther, Utilities, three elements removed,
│                            #   Program_Info resequenced to the 4.0 field order
└── _data/
    ├── site.json            # unchanged
    ├── installer.js         # unchanged
    └── i18n/{en,cs}.json    # unchanged (all description/keyword values already satisfy 4.0)
README.md                    # EDIT — file targets PAD 4.0; the WinOther standing rule (FR-003a, FR-013)
public/pad.xml               # committed build output — regenerated
```

**Structure Decision**: Single Eleventy project, layout unchanged from 005. The one new location is `vendor/`, chosen because the spec must be readable by the build but must never be published: Eleventy's `input` is `src` and passthrough copying is limited to `src/root`, `src/assets`, `src/fonts`, `src/css`, `src/js`, so a file in `vendor/` is invisible to the output. Putting it in `src/_data/` was rejected — Eleventy treats that directory as the global data cascade and an `.xml` file there is confusing at best.

## Complexity Tracking

No constitution violations. The feature removes the drift-prone hand-maintained format tables, but it is not a net line reduction — `eleventy.config.js` grew 451 → 531 lines. See the Net complexity row above for the measured figures; the plan's original "~30-line spec reader" estimate was optimistic by roughly a factor of three.
