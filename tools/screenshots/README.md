# Screenshots and the feature gallery

Every picture in the website's gallery is produced by one command from the **officially published
installer**, inside a throw-away Windows Sandbox. Nothing is staged on your own account, so no
setting, bookmark, drive label or user name of yours can reach a published image.

Design and decisions: `specs/007-release-news-gallery/` (research R1-R7,
`contracts/scene-catalog.md`).

## One-time setup

Windows 11 Pro with **Windows Sandbox** enabled - *Settings → System → Optional features → More
Windows features → Windows Sandbox*, then reboot. In an elevated PowerShell:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All
```

`npm run shots` refuses with this instruction when the feature is missing.

## Two absolute rules

1. **Never start `tandemcommander.exe` with `-C` on your machine, and never import a `.reg` into
   `HKCU\Software\Tandem Commander`.** The `-C` switch does *not* open a separate configuration -
   it imports the file into your one and only configuration and overwrites it. The guest driver
   refuses to run anywhere but inside the Sandbox for exactly this reason.
2. **Never publish an image that failed the personal-data review.** For scenes staged on your own
   machine the procedure asks for that review explicitly.

## Running

```bash
npm run shots                       # every automated scene, for the version in site.json
npm run shots -- --dry-run          # validate the catalog and print the plan; start nothing
npm run shots -- --scene code-viewer,markdown-viewer
npm run shots -- --theme dark
npm run shots -- --version 0.1.9    # a release newer than the site's (before the website release)
npm run shots -- --keep             # leave the Sandbox open afterwards (debugging)
npm run shots -- --diagnose         # environment probe: what the guest can do
```

Keep the Sandbox window open and un-minimised while a run is in progress; it closes itself at the
end. Only one Sandbox can run at a time - the preflight says so if one is already open.

What a run does, in order: check the prerequisites → download and verify the published installer
(size against the GitHub asset, Authenticode signature) → write `.work/shots/run.wsb` and a job
file → start the Sandbox → install WebView2 and the application in the guest → build the demo
workspace → play every scene → hand the PNGs back → post-process into WebP → update
`content/gallery/captures.json`.

**Exit codes**: `0` everything captured, `1` preflight refused (nothing started, nothing changed),
`2` at least one scene failed (the others are kept; a failed scene keeps its previous image),
`3` post-processing limit exceeded (an image over 300 KB, or the two themes differ in size).

## Adding a scene

1. Add an entry to `content/gallery/scenes.json` - copy the nearest existing one. Required:
   `id` (kebab-case, **never renamed once published** - it is the image name and the anchor),
   `title`, `caption` and `alt` in every site language, `themes`, `mode`, `showsVersion`, and a
   `stage` describing how to reach the scene. Catalog order is gallery order, and the catalog
   starts with `main-window`.
2. `npm run shots -- --dry-run` validates the catalog and the steps without starting anything.
3. `npm run shots -- --scene <id> --keep` captures just that scene; on failure the run leaves
   `<id>-<theme>.fail.png` and the title of the window that was in front.
4. `npm test` and `npm run build`; the new item appears in the gallery in both languages.

### Step vocabulary

Scenes are data, not code. Only these steps exist, and the driver rejects anything else *before*
starting the Sandbox:

| Step | Argument | Does |
|------|----------|------|
| `focus` | file name | types the name into the active panel (quick search) so the cursor lands on it |
| `keys` | `F3`, `Ctrl+Shift+T`, `Alt+5`, `Down*3` | one chord, sent to the foreground window |
| `text` | literal text | typed into the focused control |
| `waitWindow` | `{ titleContains, timeoutMs }` | waits for a window of the application and makes it current |
| `resize` | `{ width, height }` | resizes the current window (skipped for a fixed-size dialog) |
| `settle` | `{ timeoutMs }` | waits until two captures 250 ms apart are identical |
| `capture` | `main` \| `foreground` \| `withDialog` | writes the image; `withDialog` draws the dialog onto the application window |
| `close` | `foreground` \| `app` | closes it; `app` is implicit at the end of a scene |

No coordinates, no mouse, no bare sleeps - that is what keeps runs reproducible.

### Scene state

Before every scene the driver deletes the program's configuration key, so each scene starts as a
new user would: the program registers its plugins and follows the Windows display language, which
the driver sets to English (the captions carry the localization). A configuration value is written
only where a scene needs something other than the default - the dark theme, for instance. Panel
paths are passed on the command line, always with a trailing backslash. Nothing is ever saved
back, because instances are killed rather than closed, so one scene cannot leak state into the
next.

## Demo content

`demo/files/` is committed and copied to the guest verbatim; `demo/workspace.json` lists what the
guest generates on top of it (Unicode names, a path past 260 characters, archives, a bulk tree for
the disk map) and pins every file's modification time, so the dates in the panels are the same in
every run.

Everything here is invented. Nothing may come from your real documents, and any third-party file
must be freely redistributable and recorded in `demo/LICENSES.md` with its source and licence. A
preflight check refuses to start when your user name or computer name appears anywhere in
`demo/`.

## Manual scenes

Some scenes cannot be scripted: SFTP needs a server, cloud sync badges and TortoiseGit badges need
real accounts. They carry `mode: "manual-sandbox"` (staged inside the Sandbox, network enabled for
that scene) or `mode: "manual-host"` (staged on your machine, in your own installation) and a list
of `manualSteps`. The run shows the steps and waits; *Skip* keeps the previous image and does not
fail the run. A `manual-host` scene changes no setting - it only resizes and captures the window
you staged - and its last step is always the personal-data review.

## After a run

- `content/gallery/captures.json` records for every image the application version and build it was
  captured with. `npm run release:check` reports which images a new release makes stale.
- `src/assets/screenshot-light.png` and `screenshot-dark.png` are regenerated from the
  `main-window` and `dark-theme` scenes. **These two addresses are permanent** - software
  catalogues fetch the first one through `/pad.xml`.
- Commit the images together with `captures.json` and the regenerated `public/`.
