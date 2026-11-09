// Scene catalog and capture manifest: rules G1–G7
// (specs/007-release-news-gallery/contracts/scene-catalog.md).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const content = require("../lib/content.js");

const LANGS = ["en", "cs"];
const both = (text) => ({ en: text, cs: text });

function scene(id, over = {}) {
  return {
    id,
    title: both(`Title ${id}`),
    caption: both(`Caption for ${id}.`),
    alt: both(`A window showing ${id}.`),
    themes: ["light"],
    mode: "auto",
    featured: false,
    showsVersion: false,
    stage: { steps: [{ focus: "a.txt" }, { keys: "F3" }, { capture: "foreground" }, { close: "foreground" }] },
    ...over,
  };
}

// Eight published scenes, four of them featured, main-window first — the
// shape of the real catalog, which shows only what Tandem Commander added.
function catalog(extra = [], over = {}) {
  const base = [
    scene("main-window", { featured: true, showsVersion: true }),
    scene("dark-theme", { featured: true, themes: ["dark"] }),
    scene("panel-tabs", { featured: true, themes: ["light", "dark"] }),
    scene("code-viewer", { featured: true }),
    ...["markdown-viewer", "unicode-long-paths", "thumbnails", "command-shell"].map((id) => scene(id)),
  ];
  return base.map((s) => ({ ...s, ...(over[s.id] || {}) })).concat(extra);
}

// Every fixture image holds the text "x"; a picture's name carries its
// content hash (rule G8), and this is the hash of "x".
const HASH = "2d711642b7";
const picture = (stem, dir = "assets/gallery") => `${dir}/${stem}.${HASH}.webp`;

function capturesFor(scenes) {
  const captures = {};
  for (const s of scenes.filter((x) => x.published !== false)) {
    for (const theme of s.themes) {
      captures[`${s.id}/${theme}`] = {
        appVersion: "0.1.8", appBuild: 192, capturedAt: "2026-09-20", environment: "sandbox", dpi: 96,
        width: 1200, height: 800,
        files: { full: picture(`${s.id}-${theme}`), card: picture(`${s.id}-${theme}-640`), cardWidth: 640, cardHeight: 427 },
        bytes: { full: 70000, card: 30000 },
      };
    }
  }
  return captures;
}

// Writes scenes + captures + the image files a valid catalog needs.
function make({ scenes, captures = capturesFor(scenes), skipFiles = [], noCaptures = false, archive }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tc-gallery-"));
  fs.mkdirSync(path.join(dir, "gallery"), { recursive: true });
  fs.writeFileSync(path.join(dir, "gallery", "scenes.json"), JSON.stringify(scenes, null, 2));
  const srcDir = path.join(dir, "src");
  fs.mkdirSync(path.join(srcDir, "assets", "gallery"), { recursive: true });
  if (!noCaptures) {
    fs.writeFileSync(path.join(dir, "gallery", "captures.json"), JSON.stringify(captures, null, 2));
    for (const capture of Object.values(captures)) {
      for (const key of ["full", "card"]) {
        const rel = capture.files[key];
        if (skipFiles.includes(rel)) continue;
        fs.writeFileSync(path.join(srcDir, rel), "x");
      }
    }
  }
  if (archive) {
    fs.writeFileSync(path.join(dir, "gallery", "archive.json"), JSON.stringify(archive, null, 2));
    for (const entries of Object.values(archive)) {
      for (const entry of Object.values(entries)) {
        for (const key of ["full", "card"]) {
          const rel = entry.files && entry.files[key];
          if (!rel || skipFiles.includes(rel)) continue;
          fs.mkdirSync(path.dirname(path.join(srcDir, rel)), { recursive: true });
          fs.writeFileSync(path.join(srcDir, rel), "x");
        }
      }
    }
  }
  return { contentDir: dir, srcDir, languages: LANGS };
}

const load = (opts) => content.loadGallery(make(opts));

test("a valid catalog loads with images resolved per theme", () => {
  const g = load({ scenes: catalog() });
  assert.equal(g.published.length, 8);
  assert.equal(g.published[0].id, "main-window");
  assert.equal(g.hasCaptures, true);
  const tabs = g.published.find((s) => s.id === "panel-tabs");
  assert.deepEqual(Object.keys(tabs.images), ["light", "dark"]);
  assert.equal(tabs.images.dark.full, `/assets/gallery/panel-tabs-dark.${HASH}.webp`);
  assert.equal(tabs.images.light.card, `/assets/gallery/panel-tabs-light-640.${HASH}.webp`);
  assert.equal(tabs.images.light.width, 1200);
});

test("without a capture manifest the catalog is shape-checked only", () => {
  const g = load({ scenes: catalog(), noCaptures: true });
  assert.equal(g.hasCaptures, false);
  assert.equal(g.scenes.length, 8);
  // fewer than ten published is fine as long as no images exist yet
  assert.doesNotThrow(() => load({ scenes: catalog().slice(0, 5), noCaptures: true }));
});

test("G1: ids are unique and kebab-case", () => {
  assert.throws(() => load({ scenes: catalog([scene("Bad_Id")]) }), /gallery: Bad_Id: "id" must be kebab-case/);
  assert.throws(() => load({ scenes: catalog([scene("thumbnails")]) }), /gallery: thumbnails: id is used twice/);
});

test("G2: language parity and length limits", () => {
  const missing = catalog([], { "command-shell": { caption: { en: "only english" } } });
  assert.throws(() => load({ scenes: missing }), /gallery: command-shell: caption\.cs: missing translation/);
  const long = catalog([], { "command-shell": { title: both("x".repeat(content.LIMITS.sceneTitle + 1)) } });
  assert.throws(() => load({ scenes: long }), /gallery: command-shell: title\.en: 41 characters, limit is 40/);
  const markup = catalog([], { "command-shell": { alt: both("a <b>window</b>") } });
  assert.throws(() => load({ scenes: markup }), /gallery: command-shell: alt\.en: texts are plain/);
});

test("G3: the catalog starts with the main window", () => {
  const reordered = catalog();
  const [first, ...rest] = reordered;
  assert.throws(() => load({ scenes: [...rest, first] }),
    /gallery: dark-theme: the catalog must start with "main-window"/);
});

test("G4: at least seven published scenes once images exist", () => {
  const scenes = catalog();
  scenes.find((s) => s.id === "thumbnails").published = false;
  scenes.find((s) => s.id === "command-shell").published = false;
  assert.throws(() => load({ scenes }), /gallery: 6 published scenes, at least 7 required/);
});

test("G5: every published theme needs a capture and its files on disk", () => {
  const scenes = catalog();
  const captures = capturesFor(scenes);
  delete captures["panel-tabs/dark"];
  assert.throws(() => load({ scenes, captures }), /gallery: panel-tabs: no capture for theme "dark"/);

  assert.throws(() => load({ scenes, skipFiles: [picture("code-viewer-light-640")] }),
    new RegExp(`gallery: code-viewer: image file missing: src/assets/gallery/code-viewer-light-640\\.${HASH}\\.webp`));
});

test("G8: a picture is named after its content, and no picture is left unrecorded", () => {
  const scenes = catalog();
  // the name carries no hash
  const unnamed = capturesFor(scenes);
  unnamed["code-viewer/light"].files.full = "assets/gallery/code-viewer-light.webp";
  assert.throws(() => load({ scenes, captures: unnamed }),
    /gallery: code-viewer: src\/assets\/gallery\/code-viewer-light\.webp: the file name must carry the picture's content hash \(\.2d711642b7\.webp\)/);
  // the name carries the hash of another content: the picture changed, the name did not
  const changed = make({ scenes });
  fs.writeFileSync(path.join(changed.srcDir, picture("thumbnails-light")), "y");
  assert.throws(() => content.loadGallery(changed),
    /gallery: thumbnails: src\/assets\/gallery\/thumbnails-light\.2d711642b7\.webp: the file name must carry the picture's content hash \(\.a1fce4363\w\.webp\)/);
  // the same for an archived picture
  const archive = { "0.1.7": { "main-window/light": archived("main-window", "light", "0.1.7") } };
  const old = make({ scenes, archive });
  fs.writeFileSync(path.join(old.srcDir, picture("main-window-light-640", "assets/gallery/archive/0.1.7")), "y");
  assert.throws(() => content.loadGallery(old), /archive 0\.1\.7: main-window\/light: src\/assets\/gallery\/archive\/0\.1\.7\/main-window-light-640\.2d711642b7\.webp: the file name must carry/);
  // a file no capture and no archive entry records
  const stray = make({ scenes });
  fs.writeFileSync(path.join(stray.srcDir, "assets/gallery/thumbnails-light.0000000000.webp"), "x");
  assert.throws(() => content.loadGallery(stray),
    /gallery: src\/assets\/gallery\/thumbnails-light\.0000000000\.webp belongs to no capture and no archived picture/);
  // names: the hash of the content, after the stem
  assert.equal(content.pictureHash(Buffer.from("x")), HASH);
  assert.equal(content.pictureFileName("panel-tabs-light-640", Buffer.from("x")), `panel-tabs-light-640.${HASH}.webp`);
});

test("G6: captures carry pixel dimensions", () => {
  const scenes = catalog();
  const captures = capturesFor(scenes);
  captures["command-shell/light"].width = 0;
  assert.throws(() => load({ scenes, captures }), /gallery: command-shell: capture light has no width\/height/);
});

test("G7: mode-specific fields — manual steps, closed step vocabulary", () => {
  const noSteps = catalog([], { "command-shell": { mode: "manual-sandbox", stage: {} } });
  assert.throws(() => load({ scenes: noSteps }), /gallery: command-shell: manual scenes need "manualSteps"/);

  const hostScene = catalog([], {
    "command-shell": { mode: "manual-host", stage: {}, manualSteps: ["open a cloud folder", "resize the window"] },
  });
  assert.throws(() => load({ scenes: hostScene }), /gallery: command-shell: the last manual step of a manual-host scene must be the personal-data review/);

  const goodHost = catalog([], {
    "command-shell": { mode: "manual-host", stage: {}, manualSteps: ["open a cloud folder", "check the image for personal data before accepting it"] },
  });
  assert.doesNotThrow(() => load({ scenes: goodHost }));

  const badStep = catalog([], { "command-shell": { stage: { steps: [{ click: "somewhere" }, { capture: "main" }] } } });
  assert.throws(() => load({ scenes: badStep }), /gallery: command-shell: stage\.steps\[0\]: unknown step/);

  const noCapture = catalog([], { "command-shell": { stage: { steps: [{ keys: "F3" }] } } });
  assert.throws(() => load({ scenes: noCapture }), /gallery: command-shell: an automated scene needs exactly one "capture" step, found 0/);

  const afterCapture = catalog([], { "command-shell": { stage: { steps: [{ capture: "main" }, { keys: "F3" }] } } });
  assert.throws(() => load({ scenes: afterCapture }), /gallery: command-shell: only "close" steps may follow "capture"/);
});

test("themes must be a non-empty subset of light and dark", () => {
  assert.throws(() => load({ scenes: catalog([], { "command-shell": { themes: [] } }) }), /gallery: command-shell: "themes" must be a non-empty subset/);
  assert.throws(() => load({ scenes: catalog([], { "command-shell": { themes: ["sepia"] } }) }), /gallery: command-shell: "themes" must be a non-empty subset/);
  assert.throws(() => load({ scenes: catalog([], { "command-shell": { themes: ["light", "light"] } }) }), /gallery: command-shell: "themes" must be a non-empty subset/);
});

test("the repository's own catalog validates (once it exists)", () => {
  const file = path.join(__dirname, "..", "content", "gallery", "scenes.json");
  if (!fs.existsSync(file)) return; // written in T042
  const saved = process.env.TC_CONTENT_DIR;
  delete process.env.TC_CONTENT_DIR;
  try {
    assert.doesNotThrow(() => content.loadGallery());
  } finally {
    if (saved !== undefined) process.env.TC_CONTENT_DIR = saved;
  }
});


// The picture archive and the pictures of one release
// (specs/012-whats-new-showcase/data-model.md §7, rules A1-A4).
const archived = (id, theme, version) => ({
  appVersion: version, appBuild: 190, capturedAt: "2026-09-01", environment: "sandbox", dpi: 96, width: 1200, height: 800,
  files: { full: picture(`${id}-${theme}`, `assets/gallery/archive/${version}`), card: picture(`${id}-${theme}-640`, `assets/gallery/archive/${version}`), cardWidth: 640, cardHeight: 427 },
  bytes: { full: 1, card: 1 },
  title: both(`Old ${id}`), caption: both(`Old caption ${id}.`), alt: both(`Old alt ${id}.`),
});

test("A1-A4: archive entries are checked like captures, with their own texts", () => {
  const scenes = catalog();
  const ok = { "0.1.7": { "main-window/light": archived("main-window", "light", "0.1.7") } };
  assert.doesNotThrow(() => load({ scenes, archive: ok }));
  assert.throws(() => load({ scenes, archive: { "v1": {} } }), /gallery: archive v1: "v1" is not a version/);
  assert.throws(() => load({ scenes, archive: { "0.1.7": { "main-window": archived("main-window", "light", "0.1.7") } } }),
    /archive 0\.1\.7: main-window: key must be <scene>\/<light\|dark>/);
  assert.throws(() => load({ scenes, archive: { "0.1.6": { "main-window/light": archived("main-window", "light", "0.1.7") } } }),
    /main-window\/light: appVersion 0\.1\.7 differs from 0\.1\.6/);
  const noText = archived("main-window", "light", "0.1.7");
  delete noText.caption.cs;
  assert.throws(() => load({ scenes, archive: { "0.1.7": { "main-window/light": noText } } }), /main-window\/light\.caption\.cs: missing translation/);
  assert.throws(() => load({ scenes, archive: ok, skipFiles: [picture("main-window-light-640", "assets/gallery/archive/0.1.7")] }),
    new RegExp(`image file missing: src/assets/gallery/archive/0\\.1\\.7/main-window-light-640\\.${HASH}\\.webp`));
  // the current picture of a version cannot also be archived for it
  assert.throws(() => load({ scenes, archive: { "0.1.8": { "main-window/light": archived("main-window", "light", "0.1.8") } } }),
    /is also the current picture/);
});

test("release pictures: archived and current ones of that version, in catalog order", () => {
  const scenes = catalog();
  const archive = { "0.1.7": {
    "thumbnails/light": archived("thumbnails", "light", "0.1.7"),
    "main-window/light": archived("main-window", "light", "0.1.7"),
  } };
  const g = load({ scenes, archive });
  const old = content.releaseShots(g, "0.1.7");
  assert.deepEqual(old.map((s) => s.key), ["main-window/light", "thumbnails/light"]);
  assert.equal(old[0].full, `/assets/gallery/archive/0.1.7/main-window-light.${HASH}.webp`);
  assert.deepEqual(old[0].title, both("Old main-window"));
  const current = content.releaseShots(g, "0.1.8"); // every fixture capture is 0.1.8
  assert.equal(current.length, 9);
  assert.equal(current[0].key, "main-window/light");
  assert.deepEqual(current[0].title, both("Title main-window"));
  assert.deepEqual(content.releaseShots(g, "0.1.9"), []);
  assert.deepEqual(content.releaseShots(load({ scenes, noCaptures: true }), "0.1.8"), []);
});

test("a capture of a newer version archives the picture it replaces", () => {
  const scene = { id: "main-window", title: both("T"), caption: both("C."), alt: both("A.") };
  const capture = { appVersion: "0.1.8", width: 1200, height: 800,
    files: { full: "assets/gallery/main-window-light.webp", card: "assets/gallery/main-window-light-640.webp", cardWidth: 640, cardHeight: 427 } };
  const plan = content.archivePlan(capture, "main-window/light", scene, "0.1.9");
  assert.equal(plan.version, "0.1.8");
  assert.deepEqual(plan.moves, [
    { from: "assets/gallery/main-window-light.webp", to: "assets/gallery/archive/0.1.8/main-window-light.webp" },
    { from: "assets/gallery/main-window-light-640.webp", to: "assets/gallery/archive/0.1.8/main-window-light-640.webp" },
  ]);
  assert.equal(plan.entry.files.full, "assets/gallery/archive/0.1.8/main-window-light.webp");
  assert.deepEqual(plan.entry.title, both("T"));
  assert.equal(content.archivePlan(capture, "main-window/light", scene, "0.1.8"), null); // same version: overwrite
  assert.equal(content.archivePlan(undefined, "main-window/light", scene, "0.1.9"), null); // first capture
});
