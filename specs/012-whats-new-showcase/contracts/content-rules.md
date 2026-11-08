# Contract: Content rules and release status

**Feature**: [../spec.md](../spec.md) | **Data**: [../data-model.md](../data-model.md)

Extends `specs/007-release-news-gallery/contracts/release-record.md` (V1-V11),
`scene-catalog.md` (G1-G7) and `specs/011-tandem-new-version/contracts` (`release:status`).
All rules run in `lib/content.js`, so the Eleventy build, the release tools and the tests apply them
identically. Every failure throws with the file / scene and the reason.

## Release rules (new)

| Id | Rule | Failure message (pattern) |
|----|------|---------------------------|
| S1 | The record `X.Y.0` of the site version `X.Y.Z` exists | `releases: no record for main release X.Y.0 (current version X.Y.Z) - create content/releases/X.Y.0.json` |
| S3 | From 0.2.0 on, a patch (`Z > 0`) has kind `bugfix`, `maintenance` or `installer` | `releases: X.Y.Z.json: kind "<kind>" is not allowed for a patch release - new features belong to a main release X.Y.0` |
| S4 | The showcase lists every main-release highlight exactly once (blocks + compact) | internal invariant, unit-tested |

## Scene rules

Unchanged. (Focus areas F1-F4 were dropped in the implementation review of 2026-11-08: panels show
the whole gallery picture.)

## Retired

`HOME_CARD_COUNT`, `selectHomeCards`, `releases.homeCards` (spec 007's six home cards).

## `release:status` (addition)

Text output gains one line after `older`:

```text
  home page    0.2.0 - 2 panels (quick-search, tabs-configuration), 4 compact
  home page    unchanged - 0.2.1 is a patch of 0.2.0
  home page    0.3.0 - no record yet
```

`--json` gains `homePage` as defined in [data-model.md](../data-model.md) §5.

## `/tandem-new-version` (skill text)

Stop 2 (combined review) gains item 6 - **home page**:

- patch release → "The home page's What's new stays unchanged (it shows X.Y.0)."
- main release → which highlights become picture panels (max 3, with published scenes) and which
  are compact items.

The skill's step 9 (Check) reads the same information from `release:status` after recording.
