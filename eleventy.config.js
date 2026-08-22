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
// PAD file gate (spec: specs/005-pad-file/)
//
// Validates the rendered pad.xml against the vendored PAD rules from
// specs/005-pad-file/contracts/pad-file.md — required elements, length caps,
// enumerations, URL shapes, size/date consistency with site.json. Any
// violation throws, so an invalid PAD file can never be published. The OS
// token list extends the frozen 2010 enumeration with the modern Windows
// tokens (documented deviation, research R4).
// ---------------------------------------------------------------------------

const PAD_REQUIRED_LANGUAGES = ["English", "Czech"];

const PAD_ENUMS = {
  "Program_Info/Program_Type": ["Shareware", "Freeware", "Adware", "Demo", "Commercial", "Data Only"],
  "Program_Info/Program_Release_Status": ["Major Update", "Minor Update", "New Release", "Beta", "Alpha", "Media Only"],
  "Program_Info/Program_Install_Support": ["Install and Uninstall", "Install Only", "No Install Support", "Uninstall Only"],
};

const PAD_OS_TOKENS = new Set([
  "Win95", "Win98", "WinME", "WinNT 3.x", "WinNT 4.x", "Win2000", "WinXP",
  "Win2003", "WinVista", "WinVista x64", "Win7 x32", "Win7 x64",
  "Win 8", "Win8 x64", "Win10 x32", "Win10 x64", "Win11 x64",
  "WinServer", "WinMobile", "WinCE", "WinOther", "Handheld/Mobile Other",
  "Java", "Linux", "Linux Console", "Linux Gnome", "Linux GPL",
  "Linux Open Source", "Mac OS X", "Mac Other", "MS-DOS", "Netware",
  "OpenVMS", "Palm", "Pocket PC", "Symbian", "Unix", "Android",
  "BlackBerry", "iPhone", "iPod", "iTouch", "Other",
]);

const PAD_LANGUAGE_TOKENS = new Set([
  "Arabic", "Bulgarian", "Byelorussian", "Catalan", "Chinese",
  "ChineseSimplified", "ChineseTraditional", "Croatian", "Czech", "Danish",
  "Dutch", "English", "Estonian", "Finnish", "French", "German", "Greek",
  "Hebrew", "Hungarian", "Icelandic", "Indonesian", "Italian", "Japanese",
  "Korean", "Latvian", "Lithuanian", "Norwegian", "Polish", "Portuguese",
  "Romanian", "Russian", "Serbian", "Slovak", "Slovenian", "Spanish",
  "Swedish", "Thai", "Turkish", "Ukrainian", "Vietnamese", "Other",
]);

// Per-language description block: element name -> max length.
const PAD_DESC_FIELDS = {
  Keywords: 250,
  Char_Desc_45: 45,
  Char_Desc_80: 80,
  Char_Desc_250: 250,
  Char_Desc_450: 450,
  Char_Desc_2000: 2000,
};

// Every element the contract requires to exist (possibly empty), with
// constraints. required = must be non-empty; max = decoded length cap;
// pattern = full-match regex; url = must be an absolute https URL when
// non-empty (required + url = must be present and a URL).
const PAD_RULES = {
  "MASTER_PAD_VERSION_INFO/MASTER_PAD_VERSION": { required: true, pattern: /^3\.11$/ },
  "MASTER_PAD_VERSION_INFO/MASTER_PAD_EDITOR": { max: 100 },
  "MASTER_PAD_VERSION_INFO/MASTER_PAD_INFO": { required: true },
  "Company_Info/Company_Name": { required: true, max: 40 },
  "Company_Info/Address_1": { max: 40 },
  "Company_Info/Address_2": { max: 40 },
  "Company_Info/City_Town": { max: 40 },
  "Company_Info/State_Province": { max: 30 },
  "Company_Info/Zip_Postal_Code": { max: 20 },
  "Company_Info/Country": { required: true, max: 40 },
  "Company_Info/Company_WebSite_URL": { required: true, url: true },
  "Company_Info/Contact_Info/Author_First_Name": { required: true, max: 30 },
  "Company_Info/Contact_Info/Author_Last_Name": { required: true, max: 30 },
  "Company_Info/Contact_Info/Author_Email": { required: true, email: true },
  "Company_Info/Contact_Info/Contact_First_Name": { required: true, max: 30 },
  "Company_Info/Contact_Info/Contact_Last_Name": { required: true, max: 30 },
  "Company_Info/Contact_Info/Contact_Email": { required: true, email: true },
  "Company_Info/Support_Info/Sales_Email": { email: true },
  "Company_Info/Support_Info/Support_Email": { email: true },
  "Company_Info/Support_Info/General_Email": { email: true },
  "Company_Info/Support_Info/Sales_Phone": { max: 40 },
  "Company_Info/Support_Info/Support_Phone": { max: 40 },
  "Company_Info/Support_Info/General_Phone": { max: 40 },
  "Company_Info/Support_Info/Fax_Phone": { max: 40 },
  "Program_Info/Program_Name": { required: true, max: 40 },
  "Program_Info/Program_Version": { required: true, max: 15 },
  "Program_Info/Program_Release_Month": { required: true, pattern: /^(0[1-9]|1[0-2])$/ },
  "Program_Info/Program_Release_Day": { required: true, pattern: /^(0[1-9]|[12]\d|3[01])$/ },
  "Program_Info/Program_Release_Year": { required: true, pattern: /^\d{4}$/ },
  "Program_Info/Program_Cost_Dollars": { required: true, pattern: /^\d+(\.\d{1,2})?$/ },
  "Program_Info/Program_Cost_Other_Code": { max: 10 },
  "Program_Info/Program_Cost_Other": { max: 20 },
  "Program_Info/Program_Type": { required: true },
  "Program_Info/Program_Release_Status": { required: true },
  "Program_Info/Program_Install_Support": { required: true },
  "Program_Info/Program_OS_Support": { required: true },
  "Program_Info/Program_Language": { required: true },
  "Program_Info/Program_Change_Info": { max: 300, singleLine: true },
  "Program_Info/Program_Specific_Category": { required: true, max: 2000 },
  "Program_Info/Program_Category_Class": { required: true, max: 80, pattern: /^[\w &.'-]+::[\w &.,'()/-]+$/ },
  "Program_Info/Program_System_Requirements": { max: 100 },
  "Program_Info/File_Info/File_Size_Bytes": { required: true, pattern: /^\d+$/ },
  "Program_Info/File_Info/File_Size_K": { required: true, pattern: /^\d+$/ },
  "Program_Info/File_Info/File_Size_MB": { required: true, pattern: /^\d+(\.\d{1,2})?$/ },
  "Program_Info/Expire_Info/Has_Expire_Info": { required: true, pattern: /^[YN]$/ },
  "Program_Info/Expire_Info/Expire_Count": {},
  "Program_Info/Expire_Info/Expire_Based_On": {},
  "Program_Info/Expire_Info/Expire_Other_Info": {},
  "Program_Info/Expire_Info/Expire_Month": {},
  "Program_Info/Expire_Info/Expire_Day": {},
  "Program_Info/Expire_Info/Expire_Year": {},
  "Web_Info/Application_URLs/Application_Info_URL": { required: true, url: true },
  "Web_Info/Application_URLs/Application_Order_URL": { url: true },
  "Web_Info/Application_URLs/Application_Screenshot_URL": { required: true, url: true, asset: true },
  "Web_Info/Application_URLs/Application_Icon_URL": { required: true, url: true, asset: true },
  "Web_Info/Application_URLs/Application_XML_File_URL": { required: true, url: true },
  "Web_Info/Download_URLs/Primary_Download_URL": { required: true, url: true },
  "Web_Info/Download_URLs/Secondary_Download_URL": { url: true },
  "Web_Info/Download_URLs/Additional_Download_URL_1": { url: true },
  "Web_Info/Download_URLs/Additional_Download_URL_2": { url: true },
  "Permissions/Distribution_Permissions": { required: true, max: 2000 },
  "Permissions/EULA": { required: true, max: 20000 },
};

function padDecode(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Minimal parser for the attribute-free, paired-tag XML this build emits.
function padParse(src, fail) {
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
  if (roots.length !== 1 || roots[0].name !== "XML_DIZ_INFO") {
    fail("root element must be XML_DIZ_INFO");
  }
  return roots[0];
}

function validatePad(xml) {
  const fail = (msg) => {
    throw new Error(`pad: ${msg}`);
  };
  const site = JSON.parse(
    fs.readFileSync(path.join(__dirname, "src", "_data", "site.json"), "utf8")
  );

  if (xml.charCodeAt(0) === 0xfeff) fail("file must not start with a BOM");
  if (!xml.trimStart().startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    fail("missing UTF-8 XML declaration");
  }

  const root = padParse(xml, fail);
  const find = (node, pathStr) =>
    pathStr.split("/").reduce(
      (cur, name) => cur && cur.children.find((c) => c.name === name),
      node
    );
  const textOf = (node) => padDecode(node.text).trim();

  const checkValue = (label, value, rule) => {
    if (rule.required && !value) fail(`${label}: required value is empty`);
    if (value.includes("<")) fail(`${label}: markup is not allowed in PAD text`);
    if (rule.max && value.length > rule.max) {
      fail(`${label}: ${value.length} chars exceeds the ${rule.max}-char limit`);
    }
    if (rule.singleLine && /[\r\n]/.test(value)) fail(`${label}: line breaks are not allowed`);
    if (value && rule.pattern && !rule.pattern.test(value)) {
      fail(`${label}: value ${JSON.stringify(value)} does not match the required format`);
    }
    if (value && rule.url && !/^https:\/\/\S+$/.test(value)) {
      fail(`${label}: must be an absolute https URL, got ${JSON.stringify(value)}`);
    }
    if (value && rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      fail(`${label}: must be an e-mail address, got ${JSON.stringify(value)}`);
    }
    if (rule.asset && value) {
      const prefix = `${site.url}/assets/`;
      if (!value.startsWith(prefix)) fail(`${label}: must live under ${prefix}`);
      const assetFile = path.join(__dirname, "src", "assets", value.slice(prefix.length));
      if (!fs.existsSync(assetFile)) fail(`${label}: asset ${value.slice(prefix.length)} not found in src/assets/`);
    }
  };

  for (const [rulePath, rule] of Object.entries(PAD_RULES)) {
    const node = find(root, rulePath);
    if (!node) fail(`${rulePath}: element is missing`);
    checkValue(rulePath, textOf(node), rule);
  }

  // Enumerations and token lists.
  for (const [rulePath, allowed] of Object.entries(PAD_ENUMS)) {
    const value = textOf(find(root, rulePath));
    if (!allowed.includes(value)) {
      fail(`${rulePath}: ${JSON.stringify(value)} is not one of: ${allowed.join(", ")}`);
    }
  }
  for (const [rulePath, tokens] of [
    ["Program_Info/Program_OS_Support", PAD_OS_TOKENS],
    ["Program_Info/Program_Language", PAD_LANGUAGE_TOKENS],
  ]) {
    for (const token of textOf(find(root, rulePath)).split(",")) {
      const trimmed = token.trim();
      if (trimmed && !tokens.has(trimmed)) fail(`${rulePath}: unknown token ${JSON.stringify(trimmed)}`);
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

  // Language description blocks.
  const descriptions = find(root, "Program_Descriptions");
  if (!descriptions) fail("Program_Descriptions: element is missing");
  const blockNames = descriptions.children.map((c) => c.name);
  for (const language of PAD_REQUIRED_LANGUAGES) {
    if (!blockNames.includes(language)) fail(`Program_Descriptions: required language block <${language}> is missing`);
  }
  for (const block of descriptions.children) {
    if (!PAD_LANGUAGE_TOKENS.has(block.name)) fail(`Program_Descriptions: <${block.name}> is not a known PAD language`);
    for (const [field, max] of Object.entries(PAD_DESC_FIELDS)) {
      const node = block.children.find((c) => c.name === field);
      if (!node) fail(`Program_Descriptions/${block.name}/${field}: element is missing`);
      checkValue(`Program_Descriptions/${block.name}/${field}`, textOf(node), {
        required: true,
        max,
        singleLine: field === "Char_Desc_45" || field === "Char_Desc_80",
      });
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
