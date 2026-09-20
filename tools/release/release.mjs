#!/usr/bin/env node
// Website release procedure — the scripted layer (spec:
// specs/007-release-news-gallery/, contracts/release-cli.md).
//
//   npm run release:facts -- <version> [--changelog <path>] [--json]
//   npm run release:apply -- <version> [--changelog <path>]
//   npm run release:check
//
// Deterministic, no dependencies, works without an AI assistant. The assisted
// layer (.claude/skills/release-web) wraps these commands and drafts the
// digest texts. Nothing here commits, pushes or deploys.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseChangelog, kindHint, locateChangelog } from "./changelog.mjs";

const require = createRequire(import.meta.url);
const content = require("../../lib/content.js");

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE_FILE = path.join(REPO_ROOT, "src", "_data", "site.json");
const WORK_DIR = path.join(REPO_ROOT, ".work", "release");
const GITHUB_API = "https://api.github.com/repos/tandemcommander/tandemcommander";

const readSite = () => JSON.parse(fs.readFileSync(SITE_FILE, "utf8"));
// The same rule as src/_data/installer.js — the two must never disagree.
const installerName = (version) => `tandemcommander-${version}-x64-setup.exe`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") args.json = true;
    else if (argv[i] === "--changelog") args.changelog = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

// Establishes the facts of a release. Read-only with respect to src/ and
// content/; returns { facts } or { problems } — never a partial answer.
async function gatherFacts(version, options = {}) {
  const problems = [];
  const warnings = [];
  if (!/^\d+\.\d+\.\d+$/.test(version || "")) {
    return { problems: [`"${version}" is not a version like 0.1.9`] };
  }
  const site = readSite();
  if (content.compareVersions(version, site.version) < 0) {
    problems.push(`${version} is older than the site's current version ${site.version}`);
  }

  // Published release + installer asset
  let installer = null;
  let publishedAt = null;
  try {
    const res = await fetch(`${GITHUB_API}/releases/tags/v${version}`, {
      headers: { "User-Agent": "tandemcommander-web-release", Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 404) {
      problems.push(`release v${version} not found on GitHub — publish it first`);
    } else if (!res.ok) {
      problems.push(`GitHub answered ${res.status} for release v${version}`);
    } else {
      const release = await res.json();
      if (release.draft) problems.push(`release v${version} is still a draft on GitHub`);
      publishedAt = release.published_at ? release.published_at.slice(0, 10) : null;
      const asset = (release.assets || []).find((a) => a.name === installerName(version));
      if (!asset) problems.push(`release v${version} has no asset named ${installerName(version)}`);
      else installer = { name: asset.name, bytes: asset.size, url: asset.browser_download_url };
    }
  } catch (err) {
    problems.push(`cannot reach GitHub (${err.message}) — installer size cannot be determined`);
  }

  // Changelog section
  let section = null;
  let changelogSource = null;
  try {
    const found = await locateChangelog({ explicitPath: options.changelog, version });
    changelogSource = found.source;
    const sections = parseChangelog(found.text);
    section = sections.get(version) || null;
    if (!section) {
      problems.push(
        sections.has("unreleased")
          ? `the changelog has no section for ${version} — it is still headed "Unreleased" (${found.source})`
          : `the changelog has no section for ${version} (${found.source})`
      );
    } else if (!section.date) {
      problems.push(`the changelog heading of ${version} carries no date`);
    }
  } catch (err) {
    problems.push(err.message);
  }

  if (problems.length) return { problems };

  if (publishedAt && publishedAt !== section.date) {
    warnings.push(`GitHub published_at (${publishedAt}) differs from changelog date (${section.date}) — the changelog date is used`);
  }
  fs.mkdirSync(WORK_DIR, { recursive: true });
  const changelogFile = path.join(WORK_DIR, `${version}-changelog.md`);
  fs.writeFileSync(changelogFile, `## [${version}] — ${section.date}\n\n${section.body}\n`);

  return {
    facts: {
      version,
      date: section.date,
      build: section.build,
      installer: { name: installer.name, bytes: installer.bytes },
      changelogFile: path.relative(REPO_ROOT, changelogFile).replace(/\\/g, "/"),
      changelogSource,
      kindHint: kindHint(section),
      warnings,
    },
  };
}

function printProblems(problems) {
  console.error("Cannot establish the release facts — nothing was changed:");
  for (const p of problems) console.error(`  ✗ ${p}`);
}

async function cmdFacts(args) {
  const { facts, problems } = await gatherFacts(args._[0], args);
  if (problems) {
    printProblems(problems);
    return 1;
  }
  if (args.json) {
    console.log(JSON.stringify(facts, null, 2));
  } else {
    console.log(`Release ${facts.version}`);
    console.log(`  date        ${facts.date}`);
    console.log(`  build       ${facts.build ?? "(not stated)"}`);
    console.log(`  installer   ${facts.installer.name}  ${facts.installer.bytes} bytes`);
    console.log(`  kind hint   ${facts.kindHint}`);
    console.log(`  changelog   ${facts.changelogFile}  (from ${facts.changelogSource})`);
    for (const w of facts.warnings) console.log(`  ! ${w}`);
  }
  return 0;
}

// Replaces one top-level scalar in site.json without reformatting the file.
function setJsonValue(text, key, value) {
  const re = new RegExp(`("${key}"\\s*:\\s*)("[^"]*"|-?\\d+)`);
  if (!re.test(text)) throw new Error(`site.json: key "${key}" not found`);
  return text.replace(re, `$1${JSON.stringify(value)}`);
}

async function cmdApply(args) {
  const { facts, problems } = await gatherFacts(args._[0], args);
  if (problems) {
    printProblems(problems);
    return 1;
  }
  let siteText = fs.readFileSync(SITE_FILE, "utf8");
  const before = siteText;
  siteText = setJsonValue(siteText, "version", facts.version);
  siteText = setJsonValue(siteText, "releaseDate", facts.date);
  siteText = setJsonValue(siteText, "installerSizeBytes", facts.installer.bytes);
  if (siteText !== before) {
    fs.writeFileSync(SITE_FILE, siteText);
    console.log(`site.json      version ${facts.version}, releaseDate ${facts.date}, installerSizeBytes ${facts.installer.bytes}`);
  } else {
    console.log("site.json      already up to date");
  }

  const recordFile = path.join(content.contentDir(), "releases", `${facts.version}.json`);
  const recordRel = path.relative(REPO_ROOT, recordFile).replace(/\\/g, "/");
  if (fs.existsSync(recordFile)) {
    const existing = JSON.parse(fs.readFileSync(recordFile, "utf8"));
    console.log(`${recordRel}  exists — left untouched`);
    if (existing.date !== facts.date) console.log(`  ! its date ${existing.date} differs from the changelog date ${facts.date}`);
    if (facts.build && existing.build !== facts.build) console.log(`  ! its build ${existing.build} differs from the changelog build ${facts.build}`);
  } else {
    const empty = Object.fromEntries(content.loadLanguages().map((code) => [code, ""]));
    const skeleton = {
      version: facts.version,
      date: facts.date,
      ...(facts.build ? { build: facts.build } : {}),
      kind: facts.kindHint,
      summary: empty,
      highlights: [],
    };
    fs.writeFileSync(recordFile, JSON.stringify(skeleton, null, 2) + "\n");
    console.log(`${recordRel}  created — fill in "summary" (and highlights) in every language`);
    console.log(`  source text: ${facts.changelogFile}   style guide: tools/release/DIGEST-STYLE.md`);
  }
  for (const w of facts.warnings) console.log(`! ${w}`);
  console.log("Next: npm run release:check");
  return 0;
}

// One command string: npm is a .cmd shim on Windows, so a shell is needed.
function run(commandLine) {
  const result = spawnSync(commandLine, { cwd: REPO_ROOT, stdio: "inherit", shell: true });
  return result.status === 0;
}

function cmdCheck() {
  console.log("── tests ─────────────────────────────────────────────");
  if (!run("npm test --silent")) {
    console.error("\n✗ tests failed — fix them before releasing");
    return 1;
  }
  console.log("\n── build ─────────────────────────────────────────────");
  if (!run("npm run build --silent")) {
    console.error("\n✗ build failed — the message above names the file and field to fix");
    return 1;
  }

  console.log("\n── gallery images ────────────────────────────────────");
  const site = readSite();
  const gallery = content.loadGallery();
  const releases = content.loadReleases(site);
  const report = content.staleReport(gallery, releases);
  if (!report.available) {
    console.log("no gallery captures yet — nothing to report");
  } else {
    const line = (r) => `  ${r.scene}/${r.theme}  (captured with ${r.appVersion})`;
    if (report.must.length) {
      console.log(`MUST re-capture — shows the version or is a highlight of ${site.version}:`);
      report.must.forEach((r) => console.log(line(r)));
    }
    if (report.review.length) {
      console.log("older, review:");
      report.review.forEach((r) => console.log(line(r)));
    }
    console.log(`current: ${report.current.length} image(s)`);
  }

  console.log("\n── remaining manual steps ────────────────────────────");
  console.log("  1. npm run dev            preview both languages");
  if (report.available && report.must.length) console.log("  2. npm run shots          re-capture the images listed above");
  console.log("  •  commit on the release branch (sources + regenerated public/), merge, deploy — yours to do");
  console.log(`\n✓ website is ready for ${site.version}`);
  return 0;
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const commands = { facts: cmdFacts, apply: cmdApply, check: cmdCheck };
if (!commands[command]) {
  console.error("usage: release.mjs facts <version> [--changelog <path>] [--json] | apply <version> | check");
  process.exit(64);
}
// exitCode, not process.exit(): exiting while fetch's sockets are still closing
// trips a libuv assertion on Windows.
process.exitCode = await commands[command](args);
