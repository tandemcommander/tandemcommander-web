# UI Contract: winget in the Download Section and on Card 06

What a visitor (and a test reading the generated HTML) can rely on. Applies to `/` and `/cs/`.
Values come from [data-model.md](../data-model.md).

## 1. Download section, `available: true`

Order inside `#download` (unchanged except that item 3 is now present):

1. Heading
2. Installer card with the primary button - first actionable element (FR-002, SC-005)
3. **winget option**
4. Meta line, build-from-source box (the disclaimer box is hidden since 2026-10-09)

### winget option

```text
.winget
├── p.winget-label          "Or install with winget" / "Nebo nainstalujte přes winget"
├── .winget-line
│   ├── code#winget-cmd     winget install --id PavelStupka.TandemCommander -e
│   └── button.winget-copy  [hidden until scripting confirms the clipboard]  "Copy" / "Kopírovat"
├── p.winget-hint           "Later updates arrive with <mono>winget upgrade --id PavelStupka.TandemCommander -e</mono>."
└── span[aria-live=polite]  empty; receives "Copied" / "Zkopírováno" for 2 s
```

Guarantees:

| # | Guarantee | Requirement |
|---|-----------|-------------|
| U1 | The text content of `#winget-cmd` equals `site.winget.command` exactly, with no line break or extra whitespace inside | FR-003, FR-004 |
| U2 | `#winget-cmd` is identical on `/` and `/cs/`; so is the command inside the hint | FR-011, SC-003 |
| U3 | The copy button is in the HTML with the `hidden` attribute; it is shown only by script when the Clipboard API exists | FR-006 |
| U4 | Activating the button puts U1's text on the clipboard, changes the button's label to the localized "copied" text and writes it to the live region; both revert after 2 s | FR-005 |
| U5 | A rejected clipboard write changes nothing visible | FR-006 |
| U6 | The option contains no version number, date or size | FR-008 |
| U7 | Nothing in the winget option scrolls or is cut off at any width: no scroll bar, the whole command always visible. The option adds no horizontal page scroll | FR-014, SC-007 |
| U8 | From a viewport of about 640 px up, the command is on one line with the copy button beside it, and the hint (text + update command) is on one line | FR-014 |
| U8a | Below that, the copy button moves under the command at full width; narrower still, the command and the hint continue on further lines, breaking at spaces where possible. Selecting or copying yields the command without inserted characters | FR-014 |
| U8b | The winget option is a card (surface, border, shadow) with the label as its title and the command on a dark terminal strip; the build-from-source box is a quiet bordered panel. Both have the same width (680 px maximum, equal at every viewport) | author's review |
| U9 | Colours come from the existing tokens (`--fg`, `--fg-3`, `--surface`, `--line`), so light and dark follow the theme | FR-014 |

## 2. Download section, `available: false`

No element with class `winget`, no `#winget-cmd`, no copy button; items 1, 2 and 4 are unchanged
(FR-013, SC-006).

## 3. Card 06 "Easy to move in" / "Snadné nastěhování"

One paragraph, `p.card-text`, plain text:

| `available` | EN ends with | CS ends with |
|-------------|--------------|--------------|
| `true` | "Install with the signed installer or through winget." | "Instaluje se podepsaným instalátorem nebo přes winget." |
| `false` | "Install with the signed installer." | "Instaluje se podepsaným instalátorem." |

The preceding sentence about the Altap Salamander migration is the same in both states. The
phrases "on its way" / "na cestě" do not occur on the home pages in either state (FR-009, SC-004).

## 4. Not part of this contract

The release-history pages, the PAD file, the hero and the header are unchanged; the 0.1.6 entry
keeps "On the way to winget" (FR-010).
