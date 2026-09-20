// Release records: validation V1–V11, ordering, home-page card selection and
// the PAD change-info (specs/007-release-news-gallery/contracts/release-record.md).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const content = require("../lib/content.js");

const LANGS = ["en", "cs"];
const SITE = {
  version: "0.2.0",
  releaseDate: "2026-10-01",
  github: { releasesUrl: "https://example.test/releases" },
};

const both = (text) => ({ en: text, cs: text });

function highlight(id, extra = {}) {
  return { id, title: both(`Title ${id}`), text: both(`Text for ${id}.`), ...extra };
}

function record(version, date, highlights = [], extra = {}) {
  return { version, date, build: 1, kind: "feature", summary: both(`Summary of ${version}.`), highlights, ...extra };
}

// Writes the given { fileName: record } map into a throw-away content dir.
function makeContent(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tc-records-"));
  fs.mkdirSync(path.join(dir, "releases"));
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, "releases", name), JSON.stringify(data, null, 2));
  }
  return dir;
}

function load(files, options = {}) {
  return content.loadReleases(SITE, { contentDir: makeContent(files), languages: LANGS, ...options });
}

const current = () => record("0.2.0", "2026-10-01", [highlight("a"), highlight("b")]);

test("a valid set loads, newest first, with notes URLs", () => {
  const r = load({
    "0.1.9.json": record("0.1.9", "2026-09-25"),
    "0.2.0.json": current(),
    "0.1.10.json": record("0.1.10", "2026-09-28"),
  });
  assert.deepEqual(r.all.map((x) => x.version), ["0.2.0", "0.1.10", "0.1.9"]);
  assert.equal(r.current.version, "0.2.0");
  assert.equal(r.current.notesUrl, "https://example.test/releases/tag/v0.2.0");
  assert.equal(r.current.isCurrent, true);
});

test("versions order numerically, never by date", () => {
  assert.ok(content.compareVersions("0.1.10", "0.1.9") > 0);
  assert.ok(content.compareVersions("0.1.7", "0.1.6") > 0);
  assert.equal(content.compareVersions("1.0.0", "1.0.0"), 0);
  const r = load({
    "0.2.0.json": current(),
    "0.1.6.json": record("0.1.6", "2026-08-29"),
    "0.1.7.json": record("0.1.7", "2026-08-29"),
  });
  assert.deepEqual(r.all.map((x) => x.version), ["0.2.0", "0.1.7", "0.1.6"]);
});

test("V1: file name must match the version", () => {
  assert.throws(() => load({ "0.2.0.json": current(), "old.json": record("0.1.0", "2026-08-05") }),
    /releases: old\.json: file name must be 0\.1\.0\.json/);
  assert.throws(() => load({ "0.2.0.json": { ...current(), version: "v2" } }), /"version" must look like/);
});

test("V3: the site's current version needs a record, and the message says how to create it", () => {
  assert.throws(() => load({ "0.1.9.json": record("0.1.9", "2026-09-25") }),
    /no record for current version 0\.2\.0 — create content\/releases\/0\.2\.0\.json/);
});

test("V4: the current record's date must equal site.json releaseDate", () => {
  assert.throws(() => load({ "0.2.0.json": record("0.2.0", "2026-10-02") }),
    /0\.2\.0\.json: date 2026-10-02 differs from site\.json releaseDate 2026-10-01/);
});

test("V5: no record may be newer than the site's version", () => {
  assert.throws(() => load({ "0.2.0.json": current(), "0.3.0.json": record("0.3.0", "2026-11-01") }),
    /0\.3\.0\.json: newer than site\.json version 0\.2\.0/);
});

test("V6: kind is a closed vocabulary", () => {
  assert.throws(() => load({ "0.2.0.json": { ...current(), kind: "hotfix" } }), /"kind" must be one of/);
});

test("V7: every text needs exactly the site's languages, non-empty", () => {
  const missing = current();
  delete missing.summary.cs;
  assert.throws(() => load({ "0.2.0.json": missing }), /summary\.cs: missing translation/);

  const empty = current();
  empty.highlights[0].text.cs = "  ";
  assert.throws(() => load({ "0.2.0.json": empty }), /highlights\[0\]\(a\)\.text\.cs: empty text/);

  const extra = current();
  extra.summary.de = "Zusammenfassung";
  assert.throws(() => load({ "0.2.0.json": extra }), /summary\.de: "de" is not a site language/);
});

test("V8: length limits name the field and the length", () => {
  const long = current();
  long.highlights[1].title.en = "x".repeat(content.LIMITS.highlightTitle + 1);
  assert.throws(() => load({ "0.2.0.json": long }), /highlights\[1\]\(b\)\.title\.en: 41 characters, limit is 40/);
});

test("V9: highlight ids are kebab-case and unique within a record", () => {
  assert.throws(() => load({ "0.2.0.json": record("0.2.0", "2026-10-01", [highlight("Bad_Id")]) }), /must be kebab-case/);
  assert.throws(() => load({ "0.2.0.json": record("0.2.0", "2026-10-01", [highlight("a"), highlight("a")]) }), /"a" is used twice/);
});

test("V10: a scene reference must be a published scene", () => {
  const files = { "0.2.0.json": record("0.2.0", "2026-10-01", [highlight("a", { scene: "panel-tabs" })]) };
  assert.doesNotThrow(() => load(files)); // not checked without a scene set
  assert.doesNotThrow(() => load(files, { publishedScenes: new Set(["panel-tabs"]) }));
  assert.throws(() => load(files, { publishedScenes: new Set(["other"]) }),
    /highlight "a" references scene "panel-tabs", which is not a published scene/);
});

test("V11: texts are plain — no angle brackets or tabs", () => {
  const html = current();
  html.summary.en = "Now with <b>bold</b>.";
  assert.throws(() => load({ "0.2.0.json": html }), /summary\.en: texts are plain/);
});

test("invalid date and non-array highlights are rejected", () => {
  assert.throws(() => load({ "0.2.0.json": { ...current(), date: "2026-02-30" } }), /"date" must be a valid/);
  assert.throws(() => load({ "0.2.0.json": { ...current(), highlights: null } }), /"highlights" must be an array/);
});

test("home cards: current release first, topped up from older ones, exactly six", () => {
  const r = load({
    "0.2.0.json": record("0.2.0", "2026-10-01", [highlight("a"), highlight("b")]),
    "0.1.9.json": record("0.1.9", "2026-09-25", []),
    "0.1.8.json": record("0.1.8", "2026-09-20", [highlight("c"), highlight("d"), highlight("e")]),
    "0.1.7.json": record("0.1.7", "2026-09-10", [highlight("f"), highlight("g")]),
  });
  assert.deepEqual(r.homeCards.map((c) => `${c.version}:${c.id}`),
    ["0.2.0:a", "0.2.0:b", "0.1.8:c", "0.1.8:d", "0.1.8:e", "0.1.7:f"]);
  assert.deepEqual(r.homeCards.map((c) => c.isCurrent), [true, true, false, false, false, false]);
});

test("home cards: a release without highlights leaves all six to its predecessors", () => {
  const six = ["a", "b", "c", "d", "e", "f", "g"].map((id) => highlight(id));
  const r = load({
    "0.2.0.json": record("0.2.0", "2026-10-01", []),
    "0.1.9.json": record("0.1.9", "2026-09-25", six),
  });
  assert.equal(r.homeCards.length, 6);
  assert.ok(r.homeCards.every((c) => c.version === "0.1.9" && !c.isCurrent));
});

test("home cards: more than six current highlights are capped in recorded order", () => {
  const many = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => highlight(id));
  const r = load({ "0.2.0.json": record("0.2.0", "2026-10-01", many), "0.1.9.json": record("0.1.9", "2026-09-25", [highlight("z")]) });
  assert.deepEqual(r.homeCards.map((c) => c.id), ["a", "b", "c", "d", "e", "f"]);
});

test("home cards: fewer than six only when that is all there is", () => {
  const r = load({ "0.2.0.json": current() });
  assert.equal(r.homeCards.length, 2);
});

test("PAD change-info: single line, within the limit, never cut mid-word, backticks dropped", () => {
  const rec = record("0.2.0", "2026-10-01",
    Array.from({ length: 12 }, (_, i) => ({ ...highlight(`h${i}`), title: both(`A fairly long highlight title no ${i}`) })));
  rec.summary.en = "Press `F3` to see it.";
  const info = content.buildPadChangeInfo(rec);
  assert.ok(info.length <= content.LIMITS.padChangeInfo, `length ${info.length}`);
  assert.ok(info.startsWith("Press F3 to see it. New: A fairly long highlight title no 0;"));
  assert.ok(/no \d+$/.test(info), "ends on a whole title");
  assert.ok(!/[\n\t<`]/.test(info));

  const verbose = record("0.2.0", "2026-10-01");
  verbose.summary.en = "word ".repeat(80).trim();
  const cut = content.buildPadChangeInfo(verbose);
  assert.ok(cut.length <= content.LIMITS.padChangeInfo);
  assert.ok(cut.endsWith("word"));
});

test("renderInline escapes HTML and turns backticks into the mono span", () => {
  assert.equal(content.renderInline("Press `F3` & go"), 'Press <span class="mono">F3</span> &amp; go');
  assert.equal(content.renderInline("a < b"), "a &lt; b");
  assert.equal(content.stripInline("run `winget upgrade` now"), "run winget upgrade now");
});

test("the repository's real release records load against the real site.json", () => {
  const site = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "_data", "site.json"), "utf8"));
  const saved = process.env.TC_CONTENT_DIR;
  delete process.env.TC_CONTENT_DIR;
  try {
    const r = content.loadReleases(site);
    assert.equal(r.current.version, site.version);
    assert.ok(r.all.length >= 9);
    assert.equal(r.homeCards.length, content.HOME_CARD_COUNT);
    assert.ok(r.padChangeInfo.length <= content.LIMITS.padChangeInfo);
  } finally {
    if (saved !== undefined) process.env.TC_CONTENT_DIR = saved;
  }
});
