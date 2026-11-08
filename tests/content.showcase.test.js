// The home page's "What's new" showcase: blocks and compact items built from
// the main release (specs/012-whats-new-showcase/data-model.md §4, rule S4).
const { test } = require("node:test");
const assert = require("node:assert/strict");

const content = require("../lib/content.js");

const both = (text) => ({ en: text, cs: text });
const highlight = (id, scene) => ({ id, title: both(`Title ${id}`), text: both(`Text ${id}.`), ...(scene ? { scene } : {}) });
const main = (highlights) => ({ version: "0.2.0", date: "2026-10-25", summary: both("Summary."), highlights });

const image = { full: "/assets/gallery/x.webp", card: "/assets/gallery/x-640.webp", width: 1200, height: 800 };
const sceneOf = (id) => ({ id, title: both(id), caption: both(`Caption ${id}.`), alt: both(`Alt ${id}.`),
  themes: ["light"], images: { light: image } });
const gallery = (ids, hasCaptures = true) => ({ hasCaptures, published: hasCaptures ? ids.map(sceneOf) : [] });

const ids = (list) => list.map((x) => x.id);

test("highlights with a published scene become blocks, the rest compact, in record order", () => {
  const s = content.buildShowcase(main([highlight("a", "s1"), highlight("b"), highlight("c", "s2"), highlight("d")]),
    gallery(["s1", "s2"]));
  assert.deepEqual(ids(s.blocks), ["a", "c"]);
  assert.deepEqual(ids(s.compact), ["b", "d"]);
  assert.equal(s.blocks[0].scene.id, "s1");
  assert.equal(s.blocks[0].scene.images.light.full, image.full);
  assert.equal(s.compact[0].scene, undefined);
  assert.equal(s.version, "0.2.0");
  assert.equal(s.date, "2026-10-25");
  assert.deepEqual(s.summary, both("Summary."));
});

test("at most three blocks; later eligible highlights stay compact with their scene", () => {
  const s = content.buildShowcase(
    main([highlight("a", "s1"), highlight("b", "s2"), highlight("c", "s3"), highlight("d", "s4")]),
    gallery(["s1", "s2", "s3", "s4"]));
  assert.equal(content.SHOWCASE_MAX_BLOCKS, 3);
  assert.deepEqual(ids(s.blocks), ["a", "b", "c"]);
  assert.deepEqual(ids(s.compact), ["d"]);
  assert.equal(s.compact[0].scene.id, "s4");
});

test("a scene already shown by a block makes a later highlight compact", () => {
  const s = content.buildShowcase(main([highlight("a", "s1"), highlight("b", "s1")]), gallery(["s1"]));
  assert.deepEqual(ids(s.blocks), ["a"]);
  assert.deepEqual(ids(s.compact), ["b"]);
  assert.equal(s.compact[0].scene.id, "s1");
});

test("without captures every highlight is compact and none carries a scene", () => {
  const s = content.buildShowcase(main([highlight("a", "s1"), highlight("b")]), gallery(["s1"], false));
  assert.deepEqual(s.blocks, []);
  assert.deepEqual(ids(s.compact), ["a", "b"]);
  assert.ok(s.compact.every((c) => c.scene === undefined));
});

test("every highlight of the main release appears exactly once (S4)", () => {
  const hs = ["a", "b", "c", "d", "e", "f"].map((id, i) => highlight(id, i % 2 ? undefined : `s${i}`));
  const s = content.buildShowcase(main(hs), gallery(["s0", "s2", "s4"]));
  assert.deepEqual([...ids(s.blocks), ...ids(s.compact)].sort(), ["a", "b", "c", "d", "e", "f"]);
});

test("a main release without highlights yields an empty showcase", () => {
  const s = content.buildShowcase(main([]), gallery(["s1"]));
  assert.deepEqual(s.blocks, []);
  assert.deepEqual(s.compact, []);
});
