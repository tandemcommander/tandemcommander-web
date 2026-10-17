// Candidates for stale website text (tools/release/scan.mjs,
// specs/011-tandem-new-version/ research R5, data-model §4).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const load = () => import("../tools/release/scan.mjs");
const DIR = path.join(__dirname, "fixtures", "release", "sources");

const fixtureFiles = () => {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push({ path: path.relative(DIR, full).replace(/\\/g, "/"), text: fs.readFileSync(full, "utf8") });
    }
  };
  walk(DIR);
  return out;
};

async function scan() {
  const { scanSources } = await load();
  return scanSources({ files: fixtureFiles(), previousVersion: "0.1.8", languages: ["en", "cs"] });
}
const where = (f) => `${f.file}#${f.key ?? f.line}`;

test("release records and the README are never scanned", async () => {
  const result = await scan();
  assert.deepEqual(result.sources, [
    "content/gallery/scenes.json",
    "src/_data/i18n/cs.json",
    "src/_data/i18n/en.json",
    "src/_includes/sections/hero.njk",
  ]);
  assert.ok(!result.findings.some((f) => /releases|README/.test(f.file)));
});

test("version strings in the catalogs carry key, language and isPrevious", async () => {
  const versions = (await scan()).findings.filter((f) => f.kind === "version" && f.file.includes("i18n"));
  assert.deepEqual(versions.map((f) => [where(f), f.lang, f.match, f.isPrevious]), [
    ["src/_data/i18n/cs.json#hero.badge", "cs", "0.1.8", true],
    ["src/_data/i18n/cs.json#features.history", "cs", "0.1.5", false],
    ["src/_data/i18n/en.json#hero.badge", "en", "0.1.8", true],
    ["src/_data/i18n/en.json#features.history", "en", "0.1.5", false],
  ]);
  assert.match(versions[0].excerpt, /Vyšla verze 0\.1\.8/);
});

test("future phrases are found with each language's list", async () => {
  const future = (await scan()).findings.filter((f) => f.kind === "future");
  assert.deepEqual(future.map((f) => [where(f), f.lang, f.match]), [
    ["content/gallery/scenes.json#main-window.caption.cs", "cs", "brzy"],
    ["src/_data/i18n/cs.json#features.archives", "cs", "připravujeme"],
    ["src/_data/i18n/en.json#features.archives", "en", "planned"],
  ]);
});

test("templates report lines, no language, and skip Nunjucks comments", async () => {
  const hero = (await scan()).findings.filter((f) => f.file.endsWith("hero.njk"));
  assert.deepEqual(hero.map((f) => [f.kind, f.line, f.lang, f.match]), [["version", 4, null, "0.1.8"]]);
});

test("scene fields report their language and the scene id in the key", async () => {
  const scenes = (await scan()).findings.filter((f) => f.file.endsWith("scenes.json") && f.kind === "version");
  assert.deepEqual(scenes.map((f) => [f.key, f.lang, f.isPrevious]), [["main-window.caption.en", "en", true]]);
});

test("the result is stable", async () => {
  assert.deepEqual(await scan(), await scan());
});
