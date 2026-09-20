# Release digest style guide

How to turn a section of the application's `CHANGELOG.md` into a release record
(`content/releases/<version>.json`) for the website. Written for whoever drafts the digest - an
AI assistant running `/release-web`, or the author by hand. Format and validation rules:
`specs/007-release-news-gallery/contracts/release-record.md`.

## Who reads it

A power user deciding whether to **install** Tandem Commander or to **update** the copy they have.
They know what a two-pane file manager is; they do not know the code base, the spec numbers or the
history of a bug. They read English or Czech. They will give the home page a few seconds.

The changelog is the complete, technical truth and stays on GitHub. The website carries a
**digest**: what changed *for the person at the keyboard*, in their words.

## The three parts of a record

**`kind`**

| Value | Use when |
|-------|----------|
| `feature` | the section has an *Added* entry a user would notice |
| `bugfix` | fixes only (an *Added* entry that merely supports a fix does not count) |
| `maintenance` | reworks, re-translations, internal quality with visible polish |
| `installer` | only the installer or packaging changed; the application is identical |
| `first` | 0.1.0 only |

**`summary`** - one sentence, ≤ 200 characters, that would make sense on its own in a list of
releases. Lead with the biggest thing. Name at most three things. For a fix release say what works
now, not what was broken. For an installer-only release say so plainly and that the application is
unchanged.

**`highlights`** - 0 to 6, most important first. The order is the author's only lever over what
reaches the home page: the home page shows six cards - this release's highlights first, then the
newest highlights of earlier releases.

## What earns a highlight

Yes:

- something the visitor can **see or do** that they could not before (tabs, a viewer, a setting);
- something that **removes a reason not to install or update** (starts on a clean PC, no antivirus
  alarm, DEL no longer deletes permanently);
- a fix for something that **loses data or blocks work**, stated as the behaviour that is now right.

No:

- internal hardening "with no known way to trigger it", refactors, build and test changes;
- one highlight per fixed dialog. A release with thirty encoding fixes gets **one** highlight about
  accents working everywhere, with three or four concrete places named;
- anything whose explanation needs the words *regression*, *code page*, *buffer* or a spec number.

A release may have **no highlights** (0.1.7). That is valid: the summary appears in the release
history and above the home-page cards, and the cards come from earlier releases.

## Writing rules

- **Title** ≤ 40 characters. A noun phrase naming the capability or the outcome - "Panel tabs",
  "DEL goes to the Recycle Bin". No version numbers, no "New:", no full stop. Titles also feed the
  PAD file's change-info, so they must read well in a semicolon-separated list.
- **Text** ≤ 220 characters, one or two sentences. First sentence: what it is or what works now.
  Second: the detail that makes it concrete - a shortcut, a number, the situation it fixes.
- Present tense, active voice. "Each tab keeps its own view", not "tabs have been implemented".
- **Plain text.** The only markup is a pair of backticks around something the user types or
  presses: `` `F3` ``, `` `Ctrl+Shift+T` ``, `` `winget upgrade` ``. No HTML, no `<`, `>`, tabs or
  line breaks - the build rejects them. **Never use a long dash.** An aside is set off with a plain
  hyphen and spaces ( - ), like this one; em and en dashes are not used anywhere on the site
  (author's decision, 2026-09-20).
- Numbers from the changelog are welcome when they impress honestly ("over 200 languages and
  formats", "about 3,300 strings"). Never invent or round up.
- **Do not promise what is not live.** If the changelog says availability depends on a third party
  (the winget catalogue), say so.
- No internal names: no `salmon.exe`, no `SetUnhandledExceptionFilter`, no plugin file names, no
  "feature 078". Product and third-party names the user knows are fine (OneDrive, TortoiseGit,
  PowerShell 7).

## Czech

Write it, do not translate it. Same facts, same order, natural Czech word order and idiom; it may
be slightly longer or shorter than the English as long as it fits the limits. Use the vocabulary
the application's Czech interface and the site already use: *panel*, *záložka*, *prohlížeč*,
*plugin*, *Koš*, *diakritika*, *motiv* (theme), *zástupce* (shortcut file). Keep product names and
key names as they are (`F3`, Command Shell, Code Viewer may be rendered as *Prohlížeč kódu*).
Czech quotation marks are „…“. The author reviews the Czech text personally - flag anything you
are unsure about instead of smoothing it over.

## `scene`

If a published gallery scene (`content/gallery/scenes.json`, `published` not `false`) shows the
highlight, set `"scene": "<id>"` - the card then links to the picture. If a highlight clearly
deserves a picture and no scene exists, say so when presenting the draft; adding a scene is a
separate, deliberate step (`tools/screenshots/README.md`). Never reference an unpublished scene -
the build rejects it.

## Worked examples

### A feature release - 0.1.8

Changelog: a very long *Added* entry on panel tabs, five *Changed* entries, four *Fixed*, one
*Removed*. Digest: two highlights.

- *Panel tabs* - the headline; text names what each tab remembers and the shortcut.
- *No runtime to install* - from a *Fixed* entry, promoted because it removes a reason the program
  would not start at all.

Left out on purpose: the antivirus-related removals and the close-and-restart behaviour during an
update (the author's editorial call - the summary mentions the former in one clause, the release
notes on GitHub carry the detail), the Markdown viewer's shared rendering host (invisible), the
viewer title fix for paths over 260 bytes (rare), the hardening entry (nothing a user has seen),
the manual pages, the re-assigned `Ctrl+Shift+Page Up/Down` (covered by the manual, not news).
A long changelog does not oblige a long digest.

```json
{
  "id": "no-vc-runtime",
  "title": { "en": "No runtime to install", "cs": "Bez instalace runtime" },
  "text": {
    "en": "The Microsoft Visual C++ runtime now ships inside the program folder. On a clean PC, earlier versions installed fine and then refused to start - that is over.",
    "cs": "Microsoft Visual C++ runtime je nově přímo ve složce programu. Na čistém počítači se starší verze nainstalovaly, ale nespustily - to už neplatí."
  }
}
```

### An installer-only release - 0.1.7

One *Fixed* entry about `/VERYSILENT`. Nothing a visitor of the home page needs as a card; the
summary carries it and says the application is unchanged.

```json
{
  "version": "0.1.7",
  "date": "2026-08-29",
  "build": 191,
  "kind": "installer",
  "summary": {
    "en": "Installer fix: unattended installation with `/VERYSILENT` works for the first time - the precondition for winget and managed deployment. The application itself is unchanged.",
    "cs": "Oprava instalátoru: bezobslužná instalace s `/VERYSILENT` poprvé funguje - což je podmínka pro winget i hromadné nasazení. Samotná aplikace se nezměnila."
  },
  "highlights": []
}
```

### A fix release - 0.1.5

About twenty *Fixed* entries, nearly all about accented and non-Latin names. Digest: one highlight
that names five places and the one fix people will feel most (files with broken names), plus one
for the only *Added* entry (instant Markdown). See `content/releases/0.1.5.json`.
