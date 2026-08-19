const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// i18n (spec: specs/004-multilingual-czech/)
//
// Every user-visible string lives in src/_data/i18n/<code>.json — one catalog
// per language listed in src/_data/languages.json. The build FAILS when any
// catalog is missing a key, holds an empty value, or a template asks for a
// key that does not exist. This is the publishing gate: a page can never ship
// with a missing or half-done translation.
// ---------------------------------------------------------------------------

const LANGUAGES = require("./src/_data/languages.json");

// Keys whose values intentionally contain HTML; templates render exactly
// these with `| safe`. Any other value containing markup fails the build.
const RICH_TEXT_KEYS = [
  "hero.title",
  "features.card3Text",
  "whatsNew.entry2Text",
  "whatsNew.entry3Text",
  "project.text1",
  "project.text2",
  "story.p3",
  "story.p5",
];

// Flattens {a: {b: "x"}} into ["a.b"], validating leaves along the way.
function leafPaths(obj, file, prefix = "") {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...leafPaths(value, file, full));
    } else if (typeof value !== "string") {
      throw new Error(`i18n: ${file}: value of "${full}" must be a string`);
    } else if (!value.trim()) {
      throw new Error(`i18n: ${file}: empty value for "${full}"`);
    } else {
      if (value.includes("<") && !RICH_TEXT_KEYS.includes(full)) {
        throw new Error(
          `i18n: ${file}: "${full}" contains markup but is not in RICH_TEXT_KEYS`
        );
      }
      paths.push(full);
    }
  }
  return paths;
}

// Catalogs are re-read when their file changes so `eleventy --serve` picks up
// translation edits without a restart.
const catalogCache = new Map(); // code -> { mtimeMs, data }
function catalogFor(code) {
  const file = path.join(__dirname, "src", "_data", "i18n", `${code}.json`);
  const { mtimeMs } = fs.statSync(file);
  const cached = catalogCache.get(code);
  if (cached && cached.mtimeMs === mtimeMs) return cached.data;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  catalogCache.set(code, { mtimeMs, data });
  return data;
}

// Publishing gate: every catalog must expose exactly the same key set.
function checkCatalogParity() {
  const keySets = LANGUAGES.map((lang) => ({
    code: lang.code,
    keys: new Set(leafPaths(catalogFor(lang.code), `${lang.code}.json`)),
  }));
  const problems = [];
  const union = new Set(keySets.flatMap(({ keys }) => [...keys]));
  for (const { code, keys } of keySets) {
    const missing = [...union].filter((k) => !keys.has(k));
    if (missing.length) {
      problems.push(`${code}.json is missing keys: ${missing.sort().join(", ")}`);
    }
  }
  if (problems.length) {
    throw new Error(`i18n parity: ${problems.join(" | ")}`);
  }
}

module.exports = function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", checkCatalogParity);

  // {{ lang | t("ns.key") }} — throws on unknown language, missing key, or
  // empty value, so a typo or an untranslated string fails the build.
  eleventyConfig.addFilter("t", function (lang, key) {
    if (!LANGUAGES.some((l) => l.code === lang)) {
      throw new Error(`i18n: unknown language "${lang}"`);
    }
    const value = String(key)
      .split(".")
      .reduce(
        (node, part) =>
          node && typeof node === "object" ? node[part] : undefined,
        catalogFor(lang)
      );
    if (typeof value !== "string") {
      throw new Error(`i18n: missing key "${key}" for language "${lang}"`);
    }
    if (!value.trim()) {
      throw new Error(`i18n: empty value for "${key}" (${lang})`);
    }
    return value;
  });

  // {{ lang | locale }} — the languages.json entry for a page's language.
  eleventyConfig.addFilter("locale", function (lang) {
    const entry = LANGUAGES.find((l) => l.code === lang);
    if (!entry) throw new Error(`i18n: unknown language "${lang}"`);
    return entry;
  });

  // Formats site.json's releaseDate ("YYYY-MM-DD") for the given Intl locale,
  // e.g. "August 5, 2026" (en-US) or "5. srpna 2026" (cs-CZ). Throws on a
  // missing or invalid value so a bad config fails the build instead of
  // publishing the site without a release date.
  eleventyConfig.addFilter("releaseDate", function (value, intlLocale) {
    const fail = () => {
      throw new Error(
        `site.json: "releaseDate" must be a valid YYYY-MM-DD date, got ${JSON.stringify(value)}`
      );
    };
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail();
    const date = new Date(value + "T00:00:00Z");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail();
    return new Intl.DateTimeFormat(intlLocale || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  });

  // Static passthrough: everything in src/root lands at the site root,
  // the rest keeps its folder name under public/.
  eleventyConfig.addPassthroughCopy({ "src/root": "." });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  return {
    dir: {
      input: "src",
      output: "public",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk"],
  };
};
