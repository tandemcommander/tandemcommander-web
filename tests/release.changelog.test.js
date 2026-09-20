// Changelog parser (tools/release/changelog.mjs) against a verbatim copy of
// the application's 0.1.0–0.1.8 sections.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const fixture = fs.readFileSync(path.join(__dirname, "fixtures", "CHANGELOG.excerpt.md"), "utf8");
const load = () => import("../tools/release/changelog.mjs");

test("all nine releases are found with their dates and build numbers", async () => {
  const { parseChangelog } = await load();
  const sections = parseChangelog(fixture);
  const expected = {
    "0.1.8": ["2026-09-20", 192], "0.1.7": ["2026-08-29", 191], "0.1.6": ["2026-08-29", 190],
    "0.1.5": ["2026-08-25", 189], "0.1.4": ["2026-08-19", 188], "0.1.3": ["2026-08-18", 187],
    "0.1.2": ["2026-08-07", 186], "0.1.1": ["2026-08-05", 185], "0.1.0": ["2026-08-05", 184],
  };
  for (const [version, [date, build]] of Object.entries(expected)) {
    const s = sections.get(version);
    assert.ok(s, `section ${version}`);
    assert.equal(s.date, date);
    assert.equal(s.build, build);
  }
});

test("a section ends where the next one begins", async () => {
  const { parseChangelog } = await load();
  const s = parseChangelog(fixture).get("0.1.7");
  assert.match(s.body, /Unattended installation works/);
  assert.doesNotMatch(s.body, /Code Viewer/); // that is 0.1.6
  assert.doesNotMatch(s.body, /^## \[/m);
});

test("kind hints: installer, feature, bugfix, first", async () => {
  const { parseChangelog, kindHint } = await load();
  const sections = parseChangelog(fixture);
  assert.equal(kindHint(sections.get("0.1.7")), "installer");
  assert.equal(kindHint(sections.get("0.1.6")), "feature");
  assert.equal(kindHint(sections.get("0.1.4")), "bugfix");
  assert.equal(kindHint(sections.get("0.1.0")), "first");
});

test("heading variants and an Unreleased section", async () => {
  const { parseChangelog } = await load();
  const sections = parseChangelog(
    "# Changelog\r\n\r\n## [Unreleased]\r\n\r\nwork in progress\r\n\r\n## [1.2.3] - 2027-01-02\r\n\r\n**Build 200.** Text.\r\n\r\n### Fixed\r\n\r\n- x\r\n\r\n## [1.2.2] – 2026-12-01\r\n\r\nolder\r\n"
  );
  assert.equal(sections.get("unreleased").isUnreleased, true);
  assert.equal(sections.get("1.2.3").date, "2027-01-02");
  assert.equal(sections.get("1.2.3").build, 200);
  assert.equal(sections.get("1.2.3").lead, "**Build 200.** Text.");
  assert.equal(sections.get("1.2.2").date, "2026-12-01");
  assert.equal(sections.get("9.9.9"), undefined);
});
