// Stale-image report (lib/content.js staleReport, data-model §3).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { staleReport } = require("../lib/content.js");

const scene = (id, themes, extra = {}) => ({ id, themes, ...extra });
const releases = (version, scenes) => ({
  current: { version, highlights: scenes.map((s, i) => ({ id: `h${i}`, scene: s })) },
});

test("no captures yet → nothing to report", () => {
  assert.deepEqual(staleReport({ hasCaptures: false }, releases("0.1.9", [])),
    { available: false, must: [], review: [], current: [] });
});

test("images are sorted into must re-capture / review / current", () => {
  const gallery = {
    hasCaptures: true,
    published: [
      scene("main-window", ["light"], { showsVersion: true }),
      scene("panel-tabs", ["light", "dark"]),
      scene("disk-map", ["light"]),
      scene("code-viewer", ["light"]),
    ],
    captures: {
      "main-window/light": { appVersion: "0.1.8" },
      "panel-tabs/light": { appVersion: "0.1.8" },
      "panel-tabs/dark": { appVersion: "0.1.9" },
      "disk-map/light": { appVersion: "0.1.8" },
      "code-viewer/light": { appVersion: "0.1.10" },
    },
  };
  const r = staleReport(gallery, releases("0.1.9", ["panel-tabs"]));
  assert.equal(r.available, true);
  assert.deepEqual(r.must.map((x) => `${x.scene}/${x.theme}`), ["main-window/light", "panel-tabs/light"]);
  assert.deepEqual(r.review.map((x) => x.scene), ["disk-map"]);
  assert.deepEqual(r.current.map((x) => `${x.scene}/${x.theme}`), ["panel-tabs/dark", "code-viewer/light"]);
});
