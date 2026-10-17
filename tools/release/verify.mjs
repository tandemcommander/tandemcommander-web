// Verification of the generated site against the recorded release (spec:
// specs/011-tandem-new-version/, research R6, data-model §7). Pure: the
// caller passes the list of generated files and a reader, so it runs the same
// over public/ and over test fixtures.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const content = require("../../lib/content.js");

const INSTALLER_RE = /tandemcommander-(\d+\.\d+\.\d+)-x64-setup\.exe/g;
const installerName = (version) => `tandemcommander-${version}-x64-setup.exe`;

const decodeXml = (text) =>
  text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

const padValue = (xml, tag) => {
  const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml);
  return m ? decodeXml(m[1]).trim() : null;
};

// files: generated paths relative to the output root ("index.html",
// "cs/releases/index.html", …); read(rel) returns a file's text.
export function verifySite({ files, read, site, record, languages }) {
  const present = new Set(files);
  const version = site.version;
  const homePages = languages.map((l) => `${l.url.replace(/^\//, "")}index.html`);
  const historyPages = languages.map((l) => `${l.url.replace(/^\//, "")}releases/index.html`);
  const checks = [];
  const add = (id, problems) => checks.push({ id, ok: problems.length === 0, problems });

  add("pages-exist", [...homePages, ...historyPages, "pad.xml", "sitemap.xml"]
    .filter((rel) => !present.has(rel))
    .map((rel) => `${rel} is missing`));

  const home = [];
  for (const rel of homePages.filter((r) => present.has(r))) {
    const html = read(rel);
    if (!html.includes(`v${version}`)) home.push(`${rel} does not show v${version}`);
    if (!html.includes(installerName(version))) home.push(`${rel} does not link ${installerName(version)}`);
  }
  add("home-shows-version", home);

  const stale = [];
  for (const rel of files.filter((r) => /\.(html|xml)$/.test(r))) {
    const others = new Set([...read(rel).matchAll(INSTALLER_RE)].map((m) => m[1]).filter((v) => v !== version));
    for (const other of others) stale.push(`${rel} links ${installerName(other)}`);
  }
  add("no-previous-installer", stale);

  const history = [];
  for (const rel of historyPages.filter((r) => present.has(r))) {
    const first = /id="v(\d+\.\d+\.\d+)"/.exec(read(rel));
    if (!first) history.push(`${rel} lists no release`);
    else if (first[1] !== version) history.push(`${rel} lists ${first[1]} first, not ${version}`);
  }
  add("history-lists-version-first", history);

  const pad = [];
  if (present.has("pad.xml")) {
    const xml = read("pad.xml");
    const [year, month, day] = site.releaseDate.split("-");
    const expected = {
      Program_Version: version,
      Program_Release_Year: year,
      Program_Release_Month: month,
      Program_Release_Day: day,
      File_Size_Bytes: String(site.installerSizeBytes),
    };
    for (const [tag, value] of Object.entries(expected)) {
      const actual = padValue(xml, tag);
      if (actual !== value) pad.push(`pad.xml ${tag} is "${actual}", expected "${value}"`);
    }
    const changeInfo = padValue(xml, "Program_Change_Info");
    const wanted = content.buildPadChangeInfo(record);
    if (changeInfo !== wanted) pad.push(`pad.xml Program_Change_Info differs from the record: "${changeInfo}" ≠ "${wanted}"`);
  }
  add("pad-matches-facts", pad);

  return { ok: checks.every((c) => c.ok), checks };
}
