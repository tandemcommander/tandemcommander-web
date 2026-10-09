// winget commands and the texts that depend on the availability mark
// (specs/010-winget-install/data-model.md §1–§2).
const { test } = require("node:test");
const assert = require("node:assert/strict");

const site = require("../src/_data/site.json");
const LANGUAGES = require("../src/_data/languages.json");

const catalog = (code) => require(`../src/_data/i18n/${code}.json`);

// Every string value of a catalog, with its dotted key.
function leaves(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" ? leaves(value, full) : [[full, value]];
  });
}

test("both commands name the package by its exact identifier", () => {
  const { id, command, upgradeCommand, available } = site.winget;
  assert.ok(typeof id === "string" && id.length > 0);
  assert.equal(command, `winget install --id ${id} -e`);
  assert.equal(upgradeCommand, `winget upgrade --id ${id} -e`);
  assert.equal(typeof available, "boolean");
});

test("no command carries a version number", () => {
  for (const command of [site.winget.command, site.winget.upgradeCommand]) {
    assert.doesNotMatch(command, /\d+\.\d+/);
  }
});

for (const { code } of LANGUAGES) {
  test(`${code}: commands are written in site.json only`, () => {
    for (const [key, value] of leaves(catalog(code))) {
      assert.doesNotMatch(value, /winget (install|upgrade)/, key);
    }
    const hint = catalog(code).download.wingetHint;
    assert.equal(hint.split("`{command}`").length, 2, "download.wingetHint");
  });

  test(`${code}: card 06 has a closing sentence for both states of the mark`, () => {
    const { card6Text, card6Install, card6InstallWinget } = catalog(code).features;
    for (const text of [card6Text, card6Install, card6InstallWinget]) {
      assert.ok(typeof text === "string" && text.trim().length > 0);
    }
    assert.doesNotMatch(card6Text, /winget/);
    assert.doesNotMatch(card6Install, /winget/);
    assert.match(card6InstallWinget, /winget/);
    for (const [key, value] of leaves(catalog(code).features, "features")) {
      assert.doesNotMatch(value, /on its way|na cestě/, key);
    }
  });
}
