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

function capturesFor(scenes) {
  const captures = {};
  for (const s of scenes.filter((x) => x.published !== false)) {
    for (const theme of s.themes) {
      captures[`${s.id}/${theme}`] = {
        appVersion: "0.1.8", appBuild: 192, capturedAt: "2026-09-20", environment: "sandbox", dpi: 96,
        width: 1200, height: 800,
        files: { full: `assets/gallery/${s.id}-${theme}.webp`, card: `assets/gallery/${s.id}-${theme}-640.webp`, cardWidth: 640, cardHeight: 427 },
        bytes: { full: 70000, card: 30000 },
      };
    }
  }
  return captures;
}

// Writes scenes + captures + the image files a valid catalog needs.
function make({ scenes, captures = capturesFor(scenes), skipFiles = [], noCaptures = false }) {
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
  assert.equal(tabs.images.dark.full, "/assets/gallery/panel-tabs-dark.webp");
  assert.equal(tabs.images.light.card, "/assets/gallery/panel-tabs-light-640.webp");
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

  assert.throws(() => load({ scenes, skipFiles: ["assets/gallery/code-viewer-light-640.webp"] }),
    /gallery: code-viewer: image file missing: src\/assets\/gallery\/code-viewer-light-640\.webp/);
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
