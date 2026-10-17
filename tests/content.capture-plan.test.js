// Capture plan for a target version (lib/content.js capturePlan,
// specs/011-tandem-new-version/ data-model §3).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const content = require("../lib/content.js");

const key = (rows) => rows.map((r) => `${r.scene}/${r.theme}`);
const gallery = {
  hasCaptures: true,
  published: [
    { id: "main-window", themes: ["light"], showsVersion: true },
    { id: "panel-tabs", themes: ["light", "dark"] },
    { id: "code-viewer", themes: ["light"] },
    { id: "not-captured", themes: ["light"], showsVersion: true },
  ],
  captures: {
    "main-window/light": { appVersion: "0.1.9" },
    "panel-tabs/light": { appVersion: "0.1.9" },
    "panel-tabs/dark": { appVersion: "0.2.0" },
    "code-viewer/light": { appVersion: "0.1.10" },
  },
};

test("an older capture of a version-bearing scene must be re-captured", () => {
  const plan = content.capturePlan(gallery, "0.2.0");
  assert.deepEqual(key(plan.must), ["main-window/light"]);
  assert.deepEqual(plan.must[0], { scene: "main-window", theme: "light", appVersion: "0.1.9" });
});

test("a highlight scene is a must only when it is named", () => {
  assert.deepEqual(key(content.capturePlan(gallery, "0.2.0").review), ["panel-tabs/light", "code-viewer/light"]);
  const plan = content.capturePlan(gallery, "0.2.0", ["panel-tabs", undefined]);
  assert.deepEqual(key(plan.must), ["main-window/light", "panel-tabs/light"]);
  assert.deepEqual(key(plan.review), ["code-viewer/light"]);
});

test("equal or newer captures are current; versions compare numerically", () => {
  assert.deepEqual(key(content.capturePlan(gallery, "0.2.0").current), ["panel-tabs/dark"]);
  assert.deepEqual(key(content.capturePlan(gallery, "0.1.10").current),
    ["panel-tabs/dark", "code-viewer/light"]);
});

test("scenes without a capture and an empty gallery are skipped", () => {
  const all = content.capturePlan(gallery, "0.2.0");
  assert.ok(![...all.must, ...all.review, ...all.current].some((r) => r.scene === "not-captured"));
  assert.deepEqual(content.capturePlan({ published: [], captures: null }, "0.2.0"),
    { must: [], review: [], current: [] });
});

test("the stale-image report of the real site is unchanged", () => {
  const site = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "..", "src", "_data", "site.json"), "utf8"));
  const report = content.staleReport(content.loadGallery(), content.loadReleases(site));
  assert.equal(report.available, true);
  assert.equal(report.must.length, 0);
  assert.deepEqual(report.review.map((r) => r.scene), ["code-viewer", "markdown-viewer", "command-shell"]);
  assert.equal(report.current.length, 5);
});
