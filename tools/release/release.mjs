#!/usr/bin/env node
// Website release procedure — the scripted layer (spec:
// specs/011-tandem-new-version/, contracts/release-cli.md; first version in
// specs/007-release-news-gallery/).
//
//   npm run release:facts -- <version> [--json]
//   npm run release:apply -- <version>
//   npm run release:status -- <version> [--json]
//   npm run release:scan -- <version> [--json]
//   npm run release:verify [-- --json]
//   npm run release:check
//
// Deterministic, no dependencies, works without an AI assistant. Facts come
// only from the published GitHub release and the changelog at its tag. The
// assisted layer (.claude/skills/tandem-new-version) wraps these commands and
// drafts the texts. Nothing here commits, pushes or deploys.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseChangelog, kindHint, fetchChangelog, rateLimitNote } from "./changelog.mjs";
import { buildStatus } from "./status.mjs";
import { verifySite } from "./verify.mjs";
import { isScanned, scanSources } from "./scan.mjs";

const require = createRequire(import.meta.url);
const content = require("../../lib/content.js");

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE_FILE = path.join(REPO_ROOT, "src", "_data", "site.json");
const WORK_DIR = path.join(REPO_ROOT, ".work", "release");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");
const LANGUAGES_FILE = path.join(REPO_ROOT, "src", "_data", "languages.json");
const GITHUB_API = "https://api.github.com/repos/tandemcommander/tandemcommander";

const VERSION_RE = /^\d+\.\d+\.\d+$/;

const readSite = () => JSON.parse(fs.readFileSync(SITE_FILE, "utf8"));
// The same rule as src/_data/installer.js — the two must never disagree.
const installerName = (version) => `tandemcommander-${version}-x64-setup.exe`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") args.json = true;
    else if (argv[i] === "--changelog") args.removedChangelog = true;
    else args._.push(argv[i]);
  }
  return args;
}

// Establishes the facts of a release. Read-only with respect to src/ and
// content/; returns { facts } or { problems } — never a partial answer.
async function gatherFacts(version) {
  const problems = [];
  const warnings = [];
  if (!VERSION_RE.test(version || "")) {
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
      problems.push(`GitHub answered ${res.status} for release v${version}${rateLimitNote(res)}`);
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
    const found = await fetchChangelog(version);
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
  const { facts, problems } = await gatherFacts(args._[0]);
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
  const { facts, problems } = await gatherFacts(args._[0]);
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

const RELEASES_DIR = () => path.join(content.contentDir(), "releases");

// Raw records, without the build's validation: a skeleton is a valid state
// of a release in progress.
function readRecords() {
  const dir = RELEASES_DIR();
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function git(...gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd: REPO_ROOT, encoding: "utf8" });
  return { ok: result.status === 0, raw: result.stdout || "", out: (result.stdout || "").trim() };
}

function gatherGit(version) {
  const releaseBranch = `release-${version}`;
  const releaseBranchExists = git("rev-parse", "--verify", "--quiet", `refs/heads/${releaseBranch}`).ok;
  const behind = git("rev-list", "--count", "devel..origin/devel");
  // Porcelain lines are "XY path"; X may be a space, so the output is not trimmed.
  const dirty = git("status", "--porcelain").raw.split("\n").filter(Boolean)
    .map((line) => line.slice(3).replace(/^.* -> /, "").replace(/^"|"$/g, ""));
  const recordCommits = releaseBranchExists
    ? Number(git("rev-list", "--count", `devel..${releaseBranch}`, "--", `content/releases/${version}.json`).out) || 0
    : 0;
  return {
    branch: git("branch", "--show-current").out,
    releaseBranchExists,
    develBehindOrigin: behind.ok ? Number(behind.out) || 0 : 0,
    dirty,
    recordCommits,
  };
}

function releaseStatus(version) {
  const records = readRecords();
  return buildStatus({
    version,
    siteVersion: readSite().version,
    recordVersions: records.map((r) => r.version),
    record: records.find((r) => r.version === version) || null,
    gallery: content.loadGallery(),
    git: gatherGit(version),
  });
}

// Read-only: where the release of <version> stands (contracts/release-cli.md).
function cmdStatus(args) {
  const version = args._[0];
  if (!VERSION_RE.test(version || "")) {
    console.error(`"${version}" is not a version like 0.1.9`);
    return 1;
  }
  const status = releaseStatus(version);
  if (args.json) {
    console.log(JSON.stringify(status, null, 2));
    return 0;
  }
  const rows = (list) => list.map((r) => `${r.scene}/${r.theme} (${r.appVersion})`).join(", ") || "-";
  console.log(`Release ${status.version}`);
  console.log(`  previous     ${status.previousVersion ?? "-"}`);
  console.log(`  site.json    ${status.siteVersion}`);
  console.log(`  record       ${status.record}`);
  console.log(`  branch       ${status.git.branch} (release branch ${status.git.releaseBranch}: ${status.git.releaseBranchExists ? "exists" : "not yet"})`);
  if (status.git.develBehindOrigin) console.log(`  ! devel is ${status.git.develBehindOrigin} commit(s) behind origin/devel`);
  console.log(`  uncommitted  ${status.git.dirty.length ? status.git.dirty.join(", ") : "-"}`);
  console.log(`  committed    ${status.git.committed ? "yes" : "no"}`);
  console.log(`  re-capture   ${rows(status.captures.must)}`);
  console.log(`  older        ${rows(status.captures.review)}`);
  console.log(`next: ${status.next}`);
  return 0;
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).replace(/\\/g, "/")];
  });
}

// The generated site in public/ against site.json and the current record.
function verifyPublic() {
  const site = readSite();
  const record = readRecords().find((r) => r.version === site.version);
  if (!record) return { ok: false, checks: [{ id: "record", ok: false, problems: [`no record for ${site.version}`] }] };
  return verifySite({
    files: listFiles(PUBLIC_DIR).filter((rel) => /\.(html|xml)$/.test(rel)),
    read: (rel) => fs.readFileSync(path.join(PUBLIC_DIR, rel), "utf8"),
    site,
    record,
    languages: JSON.parse(fs.readFileSync(LANGUAGES_FILE, "utf8")),
  });
}

function printVerification(result) {
  for (const check of result.checks) {
    console.log(`  ${check.ok ? "✓" : "✗"} ${check.id}`);
    for (const problem of check.problems) console.log(`      ${problem}`);
  }
}

// Read-only: does public/ show the recorded release? (contracts/release-cli.md)
function cmdVerify(args) {
  const result = verifyPublic();
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printVerification(result);
    if (!result.ok) console.error(`\n✗ the generated site does not match ${readSite().version} — rebuild, or fix the sources named above`);
  }
  return result.ok ? 0 : 1;
}

// Read-only: candidates for text the new version made stale (contracts/release-cli.md).
function cmdScan(args) {
  const version = args._[0];
  if (!VERSION_RE.test(version || "")) {
    console.error(`"${version}" is not a version like 0.1.9`);
    return 1;
  }
  const older = readRecords().map((r) => r.version).filter((v) => content.compareVersions(v, version) < 0);
  const previousVersion = older.sort(content.compareVersions).pop() ?? null;
  const candidates = [
    ...listFiles(path.join(REPO_ROOT, "src")).map((rel) => `src/${rel}`),
    "content/gallery/scenes.json",
  ].filter((rel) => isScanned(rel) && fs.existsSync(path.join(REPO_ROOT, rel)));
  const result = scanSources({
    files: candidates.map((rel) => ({ path: rel, text: fs.readFileSync(path.join(REPO_ROOT, rel), "utf8") })),
    previousVersion,
    languages: JSON.parse(fs.readFileSync(LANGUAGES_FILE, "utf8")).map((l) => l.code),
  });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  console.log(`Scanned ${result.sources.length} source(s) for ${version} (previous release ${previousVersion ?? "-"})`);
  if (!result.findings.length) console.log("  no candidates");
  for (const f of result.findings) {
    const flag = f.kind === "version" && f.isPrevious ? "  ← previous release" : "";
    console.log(`  ${f.kind.padEnd(7)} ${f.file}#${f.key ?? f.line}${f.lang ? ` [${f.lang}]` : ""}  "${f.match}"${flag}`);
    console.log(`          ${f.excerpt}`);
  }
  console.log("Candidates only - judge each against the changelog; history is not stale.");
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

  console.log("\n── generated site ────────────────────────────────────");
  const verification = verifyPublic();
  printVerification(verification);
  if (!verification.ok) {
    console.error("\n✗ the generated site does not match the recorded release — see the problems above");
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
  console.log("     (assisted: /tandem-new-version commits on the release branch after your approval)");
  console.log(`\n✓ website is ready for ${site.version}`);
  return 0;
}

const USAGE =
  "usage: release.mjs facts <version> [--json] | apply <version> | status <version> [--json] |\n" +
  "       scan <version> [--json] | verify [--json] | check";

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const commands = { facts: cmdFacts, apply: cmdApply, status: cmdStatus, scan: cmdScan, verify: cmdVerify, check: cmdCheck };
if (!commands[command]) {
  console.error(USAGE);
  process.exit(64);
}
if (args.removedChangelog) {
  console.error("the changelog is read from the release tag on GitHub only (--changelog was removed)");
  process.exit(64);
}
// exitCode, not process.exit(): exiting while fetch's sockets are still closing
// trips a libuv assertion on Windows.
process.exitCode = await commands[command](args);
