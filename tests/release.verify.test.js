// Verification of the generated site (tools/release/verify.mjs,
// specs/011-tandem-new-version/ research R6, data-model §7).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const load = () => import("../tools/release/verify.mjs");
const DIR = path.join(__dirname, "fixtures", "release", "site");

const fixtureFiles = () => {
  const out = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[path.relative(DIR, full).replace(/\\/g, "/")] = fs.readFileSync(full, "utf8");
    }
  };
  walk(DIR);
  return out;
};

const site = { version: "0.1.9", releaseDate: "2026-10-07", installerSizeBytes: 8013936 };
const record = {
  version: "0.1.9",
  summary: { en: "Archives & paths are fixed.", cs: "Archivy a cesty jsou opravené." },
  highlights: [
    { id: "rar", title: { en: "RAR built in", cs: "RAR vestavěný" } },
    { id: "paths", title: { en: "Long paths", cs: "Dlouhé cesty" } },
  ],
};
const languages = [{ code: "en", url: "/" }, { code: "cs", url: "/cs/" }];

async function verify(change = (files) => files) {
  const { verifySite } = await load();
  const files = change(fixtureFiles());
  return verifySite({ files: Object.keys(files), read: (rel) => files[rel], site, record, languages });
}
const check = (result, id) => result.checks.find((c) => c.id === id);

test("the fixture site passes every check", async () => {
  const result = await verify();
  assert.deepEqual(result.checks.map((c) => [c.id, c.ok]), [
    ["pages-exist", true],
    ["home-shows-version", true],
    ["no-previous-installer", true],
    ["history-lists-version-first", true],
    ["pad-matches-facts", true],
  ]);
  assert.equal(result.ok, true);
});

test("a missing page fails pages-exist", async () => {
  const result = await verify((f) => (delete f["cs/releases/index.html"], f));
  assert.equal(result.ok, false);
  assert.deepEqual(check(result, "pages-exist").problems, ["cs/releases/index.html is missing"]);
  assert.equal(check(result, "history-lists-version-first").ok, true); // a missing page is reported once
});

test("a link to another version's installer fails, naming the file", async () => {
  const result = await verify((f) => {
    f["cs/index.html"] += '<a href="tandemcommander-0.1.8-x64-setup.exe">old</a>';
    return f;
  });
  assert.equal(result.ok, false);
  assert.deepEqual(check(result, "no-previous-installer").problems,
    ["cs/index.html links tandemcommander-0.1.8-x64-setup.exe"]);
});

test("a home page without the version fails home-shows-version", async () => {
  const result = await verify((f) => {
    f["index.html"] = f["index.html"].replace(/0\.1\.9/g, "0.1.8");
    return f;
  });
  const problems = check(result, "home-shows-version").problems;
  assert.ok(problems.includes("index.html does not show v0.1.9"));
  assert.ok(problems.includes("index.html does not link tandemcommander-0.1.9-x64-setup.exe"));
});

test("history listing an older version first fails", async () => {
  const result = await verify((f) => {
    f["releases/index.html"] = '<article id="v0.1.8"></article><article id="v0.1.9"></article>';
    return f;
  });
  assert.deepEqual(check(result, "history-lists-version-first").problems,
    ["releases/index.html lists 0.1.8 first, not 0.1.9"]);
});

test("PAD size, date and change info must match the facts and the record", async () => {
  const result = await verify((f) => {
    f["pad.xml"] = f["pad.xml"]
      .replace("8013936", "8000000")
      .replace("<Program_Release_Day>07", "<Program_Release_Day>08")
      .replace("Long paths", "Short paths");
    return f;
  });
  const problems = check(result, "pad-matches-facts").problems;
  assert.equal(problems.length, 3);
  assert.match(problems[0], /Program_Release_Day is "08", expected "07"/);
  assert.match(problems[1], /File_Size_Bytes is "8000000", expected "8013936"/);
  assert.match(problems[2], /Program_Change_Info differs from the record/);
});
