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

// GitHub-only source (specs/011-tandem-new-version/, research R1, R2).
const answer = (status, body = "", headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  text: async () => body,
});

test("the changelog is fetched from the release tag on GitHub", async () => {
  const { fetchChangelog } = await load();
  const urls = [];
  const found = await fetchChangelog("0.2.0", {
    fetchImpl: async (url) => (urls.push(url), answer(200, "## [0.2.0] - 2026-11-02\n")),
  });
  const expected = "https://raw.githubusercontent.com/tandemcommander/tandemcommander/v0.2.0/CHANGELOG.md";
  assert.deepEqual(urls, [expected]);
  assert.deepEqual(found, { source: expected, text: "## [0.2.0] - 2026-11-02\n" });
});

test("a missing tag names the URL and the status", async () => {
  const { fetchChangelog } = await load();
  await assert.rejects(fetchChangelog("9.9.9", { fetchImpl: async () => answer(404) }),
    /v9\.9\.9\/CHANGELOG\.md answered 404/);
});

test("a rate-limited answer names the reset time", async () => {
  const { fetchChangelog } = await load();
  const reset = String(Date.UTC(2026, 9, 17, 12, 0, 0) / 1000);
  await assert.rejects(
    fetchChangelog("0.2.0", { fetchImpl: async () => answer(403, "", { "x-ratelimit-reset": reset }) }),
    /answered 403 — GitHub rate limit, resets at 2026-10-17T12:00:00\.000Z/);
});

test("a network failure is reported with its message", async () => {
  const { fetchChangelog } = await load();
  await assert.rejects(
    fetchChangelog("0.2.0", { fetchImpl: async () => { throw new Error("getaddrinfo ENOTFOUND"); } }),
    /cannot fetch the changelog from https:\/\/raw\.githubusercontent\.com\/.+ \(getaddrinfo ENOTFOUND\)/);
});

test("no local checkout of the application is ever read", () => {
  for (const file of ["changelog.mjs", "release.mjs"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", "tools", "release", file), "utf8");
    assert.doesNotMatch(source, /\.\.["'\/\, ]+tandemcommander/, file);
  }
});
