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

// ---------------------------------------------------------------------------
// PAD file gate (spec: specs/006-pad-v4-compliance/, supersedes 005-pad-file)
//
// Validates the rendered pad.xml in two layers. Layer 1 is PAD 4.0 conformance
// and is derived entirely from the vendored specification (see readPadSpec
// below): element paths, value patterns and every controlled vocabulary come
// from the spec file, so there is no list here to fall out of date. Layer 2 is
// the handful of project facts the format cannot express — which elements this
// project considers mandatory, and agreement with site.json. Any violation
// throws, so a non-compliant PAD file can never be published.
// ---------------------------------------------------------------------------

const PAD_REQUIRED_LANGUAGES = ["English", "Czech"];

// Layer 2. PAD 4.0 carries no optionality flag — its patterns say what a value
// may look like, never whether the element has to be there. These are the ones
// a catalog listing genuinely needs: present AND non-empty. Everything else may
// be absent, or empty where its own 4.0 pattern permits an empty value.
const PAD_REQUIRED_ELEMENTS = [
  "MASTER_PAD_VERSION_INFO/MASTER_PAD_VERSION",
  "MASTER_PAD_VERSION_INFO/MASTER_PAD_INFO",
  "Company_Info/Company_Name",
  "Company_Info/Country",
  "Company_Info/Company_WebSite_URL",
  "Company_Info/Contact_Info/Author_First_Name",
  "Company_Info/Contact_Info/Author_Last_Name",
  "Company_Info/Contact_Info/Author_Email",
  "Company_Info/Contact_Info/Contact_First_Name",
  "Company_Info/Contact_Info/Contact_Last_Name",
  "Company_Info/Contact_Info/Contact_Email",
  "Company_Info/Support_Info/Support_Email",
  "Program_Info/Program_Name",
  "Program_Info/Program_Version",
  "Program_Info/Program_Release_Month",
  "Program_Info/Program_Release_Day",
  "Program_Info/Program_Release_Year",
  "Program_Info/Program_Cost_Dollars",
  "Program_Info/Program_Type",
  "Program_Info/Program_Release_Status",
  "Program_Info/Program_Install_Support",
  "Program_Info/Program_OS_Support",
  "Program_Info/Program_Language",
  "Program_Info/File_Info/File_Size_Bytes",
  "Program_Info/File_Info/File_Size_K",
  "Program_Info/File_Info/File_Size_MB",
  "Program_Info/Expire_Info/Has_Expire_Info",
  "Program_Info/Program_Change_Info",
  "Program_Info/Program_Category_Class",
  "Program_Info/Program_Specific_Category",
  "Program_Info/Program_System_Requirements",
  "Web_Info/Application_URLs/Application_Info_URL",
  "Web_Info/Application_URLs/Application_Screenshot_URL",
  "Web_Info/Application_URLs/Application_Icon_URL",
  "Web_Info/Application_URLs/Application_XML_File_URL",
  "Web_Info/Download_URLs/Primary_Download_URL",
  "Permissions/Distribution_Permissions",
  "Permissions/EULA",
];

// Layer 2. PAD 4.0 permits plain http in its URL patterns; this site is
// https-only, so any non-empty *_URL value must be an absolute https URL.
const PAD_HTTPS_URL_SUFFIX = "_URL";

// Layer 2. These must resolve to a real file under src/assets/.
const PAD_ASSET_ELEMENTS = [
  "Web_Info/Application_URLs/Application_Screenshot_URL",
  "Web_Info/Application_URLs/Application_Icon_URL",
];

// Layer 2. Fields the 4.0 pattern would allow to span lines, but which this
// project keeps to a single line so catalog listings render predictably.
const PAD_SINGLE_LINE_ELEMENTS = ["Program_Info/Program_Change_Info"];


function padDecode(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Minimal parser for attribute-free, paired-tag XML. Serves both documents
// this gate handles: the pad.xml the build emits, and the vendored PAD 4.0
// specification (neither uses attributes).
function padParse(src, fail, expectedRoot) {
  const decl = src.indexOf("?>");
  let pos = decl >= 0 ? decl + 2 : 0;
  const doc = { name: null, children: [], text: "" };
  const stack = [doc];
  while (pos < src.length) {
    const lt = src.indexOf("<", pos);
    if (lt === -1) {
      if (src.slice(pos).trim()) fail("malformed XML: text outside the root element");
      break;
    }
    stack[stack.length - 1].text += src.slice(pos, lt);
    const gt = src.indexOf(">", lt);
    if (gt === -1) fail("malformed XML: unterminated tag");
    const tag = src.slice(lt + 1, gt).trim();
    if (tag.startsWith("/")) {
      const name = tag.slice(1).trim();
      const top = stack.pop();
      if (!top || top.name !== name) fail(`malformed XML: unexpected </${name}>`);
    } else {
      if (!/^[A-Za-z_][\w.-]*$/.test(tag)) fail(`malformed XML: bad tag <${tag}>`);
      const node = { name: tag, children: [], text: "" };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    pos = gt + 1;
  }
  if (stack.length !== 1) fail(`malformed XML: unclosed <${stack[stack.length - 1].name}>`);
  const roots = doc.children.filter((n) => n.name);
  if (roots.length !== 1 || roots[0].name !== expectedRoot) {
    fail(`root element must be ${expectedRoot}`);
  }
  return roots[0];
}

// ---------------------------------------------------------------------------
// PAD 4.0 specification reader (spec: specs/006-pad-v4-compliance/)
//
// The format rules this gate enforces are not hand-maintained — they are read
// from the PAD 4.0 specification itself, vendored at vendor/pad-4.0-spec.xml.
// PAD 4.0 is the final revision: the originating association dissolved in 2021
// and released it into the public domain, and its host no longer resolves, so
// the file is committed rather than fetched (the build stays offline). Each of
// its 104 <Field> entries carries an element Path, a human-readable constraint
// and a validation RegEx. Deriving the rules from that file is what stops this
// gate drifting away from the format, which is exactly what the hand-written
// 3.11 tables it replaced had done.
// ---------------------------------------------------------------------------

const PAD_SPEC_FILE = path.join(__dirname, "vendor", "pad-4.0-spec.xml");
const PAD_SPEC_VERSION = "4.0";
const PAD_SPEC_MIN_FIELDS = 104;

let padSpecCache = null;

function readPadSpec() {
  if (padSpecCache) return padSpecCache;

  const fail = (msg) => {
    throw new Error(`pad spec: ${msg}`);
  };

  let src;
  try {
    src = fs.readFileSync(PAD_SPEC_FILE, "utf8");
  } catch {
    fail(`cannot read vendor/pad-4.0-spec.xml — the PAD 4.0 specification must be vendored in the repository`);
  }

  const root = padParse(src, fail, "PAD_Spec");
  const child = (node, name) => node.children.find((c) => c.name === name);
  const textOf = (node, name) => {
    const found = child(node, name);
    return found ? padDecode(found.text).trim() : "";
  };

  const specVersion = textOf(root, "PAD_Spec_Version");
  if (specVersion !== PAD_SPEC_VERSION) {
    fail(`PAD_Spec_Version is ${JSON.stringify(specVersion)}, expected ${PAD_SPEC_VERSION}`);
  }

  const fieldsNode = child(root, "Fields");
  const fields = fieldsNode ? fieldsNode.children.filter((c) => c.name === "Field") : [];
  if (fields.length < PAD_SPEC_MIN_FIELDS) {
    fail(`found ${fields.length} <Field> entries, expected at least ${PAD_SPEC_MIN_FIELDS}`);
  }

  const rules = new Map();
  for (const field of fields) {
    const fullPath = textOf(field, "Path");
    if (!fullPath.startsWith("XML_DIZ_INFO/")) {
      fail(`unexpected field path ${JSON.stringify(fullPath)}`);
    }
    // Keyed by path, never by Name: "Keywords" exists at two different paths
    // (Program_Descriptions/English/ and Press_Release/) with different limits.
    const key = fullPath.slice("XML_DIZ_INFO/".length);
    const source = textOf(field, "RegEx");
    let pattern = null;
    if (source) {
      try {
        // The patterns are .NET-flavoured; \Z (end of input) becomes $, which
        // is exactly what $ asserts in JavaScript without the /m flag.
        pattern = new RegExp(source.replace(/\\Z/g, "$"));
      } catch (error) {
        fail(`${key}: specification pattern does not compile (${error.message})`);
      }
    }
    // An empty <RegEx> means the field carries no constraint at all — nine do
    // (the Affiliates_* group and ASP_Member_Number). It must stay null:
    // new RegExp("") would match anything and silently pass every value.
    rules.set(key, { pattern, doc: textOf(field, "RegExDocumentation") });
  }

  padSpecCache = { specVersion, rules, knownPaths: new Set(rules.keys()) };
  return padSpecCache;
}

function validatePad(xml) {
  const fail = (msg) => {
    throw new Error(`pad: ${msg}`);
  };
  const site = JSON.parse(
    fs.readFileSync(path.join(__dirname, "src", "_data", "site.json"), "utf8")
  );
  const spec = readPadSpec();

  if (xml.charCodeAt(0) === 0xfeff) fail("file must not start with a BOM");
  if (!xml.trimStart().startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    fail("missing UTF-8 XML declaration");
  }

  const root = padParse(xml, fail, "XML_DIZ_INFO");
  const find = (node, pathStr) =>
    pathStr.split("/").reduce(
      (cur, name) => cur && cur.children.find((c) => c.name === name),
      node
    );
  const textOf = (node) => padDecode(node.text).trim();

  // Description blocks repeat one element set per language; the specification
  // only enumerates the English ones, so every block is checked against those.
  const asSpecPath = (elementPath) =>
    elementPath.replace(/^Program_Descriptions\/[^/]+/, "Program_Descriptions/English");

  // -------------------------------------------------------------------------
  // Layer 1 — PAD 4.0 conformance, every rule from the vendored specification.
  // -------------------------------------------------------------------------
  // Container paths are not fields, so they are not in the specification's
  // path list; a misnamed container is caught by matching it against the known
  // paths' prefixes.
  const knownContainers = new Set();
  for (const knownPath of spec.knownPaths) {
    const parts = knownPath.split("/");
    for (let i = 1; i < parts.length; i++) knownContainers.add(parts.slice(0, i).join("/"));
  }

  const walk = (node, trail) => {
    for (const child of node.children) {
      const elementPath = [...trail, child.name].join("/");
      const specPath = asSpecPath(elementPath);
      if (child.children.length) {
        if (!knownContainers.has(specPath)) {
          fail(`${elementPath}: not an element of PAD ${spec.specVersion}`);
        }
        walk(child, [...trail, child.name]);
        continue;
      }
      const rule = spec.rules.get(specPath);
      // An element the specification does not define cannot be validated, and
      // a path-driven consumer would silently ignore it — so a typo would ship
      // unnoticed. Reject it instead.
      if (!rule) fail(`${elementPath}: not an element of PAD ${spec.specVersion}`);
      const value = textOf(child);
      if (value.includes("<")) fail(`${elementPath}: markup is not allowed in PAD text`);
      if (rule.pattern && !rule.pattern.test(value)) {
        fail(
          `${elementPath}: value ${JSON.stringify(value)} is not valid PAD ${spec.specVersion}` +
          ` — needs: ${rule.doc}`
        );
      }
      if (PAD_SINGLE_LINE_ELEMENTS.includes(elementPath) && /[\r\n]/.test(value)) {
        fail(`${elementPath}: line breaks are not allowed`);
      }
      if (value && child.name.endsWith(PAD_HTTPS_URL_SUFFIX) && !/^https:\/\/\S+$/.test(value)) {
        fail(`${elementPath}: must be an absolute https URL, got ${JSON.stringify(value)}`);
      }
    }
  };
  walk(root, []);

  // The one defect the specification's own patterns cannot catch: its version
  // pattern (^\d.\d+$) accepts "3.11" perfectly happily, so without this the
  // file could go back to declaring a superseded revision unnoticed.
  const declaredVersion = textOf(find(root, "MASTER_PAD_VERSION_INFO/MASTER_PAD_VERSION"));
  if (declaredVersion !== spec.specVersion) {
    fail(
      `MASTER_PAD_VERSION: declares ${JSON.stringify(declaredVersion)} but the vendored` +
      ` specification is PAD ${spec.specVersion}`
    );
  }

  // -------------------------------------------------------------------------
  // Layer 2 — project facts the format cannot express.
  // -------------------------------------------------------------------------
  for (const elementPath of PAD_REQUIRED_ELEMENTS) {
    const node = find(root, elementPath);
    if (!node) fail(`${elementPath}: element is missing`);
    if (!textOf(node)) fail(`${elementPath}: required value is empty`);
  }

  for (const elementPath of PAD_ASSET_ELEMENTS) {
    const value = textOf(find(root, elementPath));
    const prefix = `${site.url}/assets/`;
    if (!value.startsWith(prefix)) fail(`${elementPath}: must live under ${prefix}`);
    const assetFile = path.join(__dirname, "src", "assets", value.slice(prefix.length));
    if (!fs.existsSync(assetFile)) {
      fail(`${elementPath}: asset ${value.slice(prefix.length)} not found in src/assets/`);
    }
  }

  // Consistency with site.json: release date and installer size.
  const [year, month, day] = site.releaseDate.split("-");
  if (textOf(find(root, "Program_Info/Program_Release_Month")) !== month) fail("Program_Release_Month: does not match site.json releaseDate");
  if (textOf(find(root, "Program_Info/Program_Release_Day")) !== day) fail("Program_Release_Day: does not match site.json releaseDate");
  if (textOf(find(root, "Program_Info/Program_Release_Year")) !== year) fail("Program_Release_Year: does not match site.json releaseDate");

  const bytes = Number(textOf(find(root, "Program_Info/File_Info/File_Size_Bytes")));
  if (!Number.isInteger(site.installerSizeBytes)) {
    fail('File_Size_Bytes: site.json "installerSizeBytes" must be an integer number of bytes');
  }
  if (bytes !== site.installerSizeBytes) fail("File_Size_Bytes: does not match site.json installerSizeBytes");
  if (bytes <= 100000 || bytes >= 1073741824) {
    fail(`File_Size_Bytes: ${bytes} is not a plausible installer size (100 KB – 1 GB)`);
  }
  if (textOf(find(root, "Program_Info/File_Info/File_Size_K")) !== String(Math.round(bytes / 1024))) {
    fail("File_Size_K: does not recompute from File_Size_Bytes");
  }
  if (textOf(find(root, "Program_Info/File_Info/File_Size_MB")) !== (bytes / 1048576).toFixed(2)) {
    fail("File_Size_MB: does not recompute from File_Size_Bytes");
  }

  // Expire block must stay inert.
  if (textOf(find(root, "Program_Info/Expire_Info/Has_Expire_Info")) === "N") {
    for (const child of find(root, "Program_Info/Expire_Info").children) {
      if (child.name !== "Has_Expire_Info" && textOf(child)) {
        fail(`Expire_Info/${child.name}: must be empty when Has_Expire_Info is N`);
      }
    }
  }

  // The self-reference must point at the canonical PAD URL.
  if (textOf(find(root, "Web_Info/Application_URLs/Application_XML_File_URL")) !== `${site.url}/pad.xml`) {
    fail(`Application_XML_File_URL: must be ${site.url}/pad.xml`);
  }

  // Language description blocks. The field set and its limits come from the
  // specification's English paths; which languages are mandatory is ours.
  const descFields = [...spec.knownPaths]
    .filter((p) => p.startsWith("Program_Descriptions/English/"))
    .map((p) => p.slice("Program_Descriptions/English/".length));
  const languagePattern = spec.rules.get("Program_Info/Program_Language").pattern;

  const descriptions = find(root, "Program_Descriptions");
  if (!descriptions) fail("Program_Descriptions: element is missing");
  const blockNames = descriptions.children.map((c) => c.name);
  for (const language of PAD_REQUIRED_LANGUAGES) {
    if (!blockNames.includes(language)) fail(`Program_Descriptions: required language block <${language}> is missing`);
  }
  for (const block of descriptions.children) {
    // A block name must be a single PAD language: the Program_Language pattern
    // also accepts comma-separated lists, which is meaningless for a block.
    if (block.name.includes(",") || !languagePattern.test(block.name)) {
      fail(`Program_Descriptions: <${block.name}> is not a PAD ${spec.specVersion} language`);
    }
    for (const field of descFields) {
      const node = block.children.find((c) => c.name === field);
      if (!node) fail(`Program_Descriptions/${block.name}/${field}: element is missing`);
      if (!textOf(node)) fail(`Program_Descriptions/${block.name}/${field}: required value is empty`);
    }
  }
}

module.exports = function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", checkCatalogParity);

  // Publishing gate for the PAD file: validates the final rendered pad.xml
  // and throws on any contract violation (spec: specs/005-pad-file/).
  eleventyConfig.addTransform("pad-validate", function (content) {
    if (this.page.outputPath && this.page.outputPath.endsWith("pad.xml")) {
      validatePad(content);
    }
    return content;
  });

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
