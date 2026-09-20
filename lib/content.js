// Structured site content (spec: specs/007-release-news-gallery/).
//
// Release records (content/releases/<version>.json) and the screenshot scene
// catalog (content/gallery/) are list-shaped, so they live outside the i18n
// catalogs — but under the same guarantee: every text must exist, non-empty,
// in exactly the languages of src/_data/languages.json. Everything here is
// pure logic shared by the site build (src/_data/releases.js, gallery.js),
// the release tooling (tools/release/) and the tests. Any violation throws,
// which fails the build — the same publishing gate as the i18n and PAD checks.
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");

const LIMITS = {
  summary: 200,
  highlightTitle: 40,
  highlightText: 220,
  sceneTitle: 40,
  sceneCaption: 160,
  sceneAlt: 250,
  padChangeInfo: 300, // PAD 4.0 Program_Change_Info
};

const HOME_CARD_COUNT = 6;
// The gallery shows only what Tandem Commander added to Open Salamander, so
// the catalog is deliberately smaller than the first draft assumed.
const PUBLISHED_MIN = 7;
const FIRST_SCENE = "main-window";

const RELEASE_KINDS = ["first", "feature", "bugfix", "maintenance", "installer"];
const SCENE_MODES = ["auto", "manual-sandbox", "manual-host"];
const SCENE_THEMES = ["light", "dark"];
const STEP_NAMES = ["focus", "keys", "text", "waitWindow", "resize", "settle", "capture", "close"];
// "withDialog" draws the current dialog onto the main window (contracts/scene-catalog.md).
const CAPTURE_TARGETS = ["main", "foreground", "withDialog"];

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function contentDir() {
  return process.env.TC_CONTENT_DIR
    ? path.resolve(process.env.TC_CONTENT_DIR)
    : path.join(REPO_ROOT, "content");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`${path.basename(file)}: cannot read JSON (${err.message})`);
  }
}

function loadLanguages() {
  return readJson(path.join(REPO_ROOT, "src", "_data", "languages.json")).map((l) => l.code);
}

// Numeric per component: 0.1.10 > 0.1.9. Never order releases by date —
// 0.1.6 and 0.1.7 share one.
function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

// Plain text with backticks as the only markup: escape, then `code` → mono span.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
}

function stripInline(text) {
  return String(text).replace(/`([^`]+)`/g, "$1");
}

// A LocalizedText is an object with exactly the site's language codes.
// `allowEmpty` exists for nothing in the build — an empty text always fails.
function checkLocalized(value, languages, where, maxLength, fail) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${where}: must be an object with the languages ${languages.join(", ")}`);
  }
  const codes = Object.keys(value);
  for (const code of languages) {
    if (!codes.includes(code)) fail(`${where}.${code}: missing translation`);
    const text = value[code];
    if (typeof text !== "string" || !text.trim()) fail(`${where}.${code}: empty text`);
    if (/[<>\t]/.test(text)) fail(`${where}.${code}: texts are plain — no "<", ">" or tab`);
    if (maxLength && text.length > maxLength) {
      fail(`${where}.${code}: ${text.length} characters, limit is ${maxLength}`);
    }
  }
  for (const code of codes) {
    if (!languages.includes(code)) fail(`${where}.${code}: "${code}" is not a site language`);
  }
}

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// ---------------------------------------------------------------------------
// Release records (contracts/release-record.md, rules V1–V11)
// ---------------------------------------------------------------------------

function validateRecord(record, fileName, languages) {
  const fail = (msg) => {
    throw new Error(`releases: ${fileName}: ${msg}`);
  };
  if (!record || typeof record !== "object") fail("record must be a JSON object");
  if (typeof record.version !== "string" || !VERSION_RE.test(record.version)) {
    fail(`"version" must look like 0.1.8, got ${JSON.stringify(record.version)}`);
  }
  if (fileName !== `${record.version}.json`) {
    fail(`file name must be ${record.version}.json to match "version"`);
  }
  if (!isRealDate(record.date)) {
    fail(`"date" must be a valid YYYY-MM-DD date, got ${JSON.stringify(record.date)}`);
  }
  if (record.build !== undefined && !Number.isInteger(record.build)) {
    fail(`"build" must be an integer`);
  }
  if (!RELEASE_KINDS.includes(record.kind)) {
    fail(`"kind" must be one of ${RELEASE_KINDS.join(", ")}, got ${JSON.stringify(record.kind)}`);
  }
  checkLocalized(record.summary, languages, "summary", LIMITS.summary, fail);
  if (!Array.isArray(record.highlights)) fail(`"highlights" must be an array (may be empty)`);
  const ids = new Set();
  record.highlights.forEach((h, i) => {
    const where = `highlights[${i}]`;
    if (!h || typeof h.id !== "string" || !KEBAB_RE.test(h.id)) {
      fail(`${where}.id: must be kebab-case, got ${JSON.stringify(h && h.id)}`);
    }
    if (ids.has(h.id)) fail(`${where}.id: "${h.id}" is used twice in this record`);
    ids.add(h.id);
    checkLocalized(h.title, languages, `${where}(${h.id}).title`, LIMITS.highlightTitle, fail);
    checkLocalized(h.text, languages, `${where}(${h.id}).text`, LIMITS.highlightText, fail);
    if (h.scene !== undefined && (typeof h.scene !== "string" || !KEBAB_RE.test(h.scene))) {
      fail(`${where}(${h.id}).scene: must be a scene id`);
    }
  });
}

// English, single line, ≤ 300 characters, never cut mid-word: the summary,
// then as many highlight titles as still fit.
function buildPadChangeInfo(record) {
  const clean = (s) => stripInline(s).replace(/\s+/g, " ").trim();
  let info = clean(record.summary.en);
  if (info.length > LIMITS.padChangeInfo) {
    info = info.slice(0, LIMITS.padChangeInfo + 1);
    info = info.slice(0, info.lastIndexOf(" ")).replace(/[,;:\s]+$/, "");
  }
  const titles = record.highlights.map((h) => clean(h.title.en));
  let list = "";
  for (const title of titles) {
    const next = list ? `${list}; ${title}` : ` New: ${title}`;
    if ((info + next).length > LIMITS.padChangeInfo) break;
    list = next;
  }
  return info + list;
}

function selectHomeCards(all, current) {
  const cards = [];
  const ordered = [current, ...all.filter((r) => compareVersions(r.version, current.version) < 0)];
  for (const record of ordered) {
    for (const highlight of record.highlights) {
      if (cards.length === HOME_CARD_COUNT) return cards;
      cards.push({ ...highlight, version: record.version, isCurrent: record === current });
    }
  }
  return cards;
}

// `site` is the parsed src/_data/site.json. `publishedScenes` (optional) is
// the set of published scene ids; when given, highlight→scene references are
// checked against it (V10).
function loadReleases(site, options = {}) {
  const dir = path.join(options.contentDir || contentDir(), "releases");
  const languages = options.languages || loadLanguages();
  if (!fs.existsSync(dir)) {
    throw new Error(`releases: folder ${dir} does not exist`);
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const byVersion = new Map();
  for (const fileName of files) {
    const record = readJson(path.join(dir, fileName));
    validateRecord(record, fileName, languages);
    if (byVersion.has(record.version)) {
      throw new Error(`releases: ${fileName}: version ${record.version} is already defined`);
    }
    byVersion.set(record.version, record);
  }
  const all = [...byVersion.values()].sort((a, b) => compareVersions(b.version, a.version));

  const current = byVersion.get(site.version);
  if (!current) {
    throw new Error(
      `releases: no record for current version ${site.version} — create content/releases/${site.version}.json ` +
        `(npm run release:apply -- ${site.version}, or /release-web ${site.version})`
    );
  }
  if (current.date !== site.releaseDate) {
    throw new Error(
      `releases: ${site.version}.json: date ${current.date} differs from site.json releaseDate ${site.releaseDate}`
    );
  }
  for (const record of all) {
    if (compareVersions(record.version, site.version) > 0) {
      throw new Error(
        `releases: ${record.version}.json: newer than site.json version ${site.version} — bump site.json or remove the record`
      );
    }
  }
  if (options.publishedScenes) {
    for (const record of all) {
      for (const h of record.highlights) {
        if (h.scene && !options.publishedScenes.has(h.scene)) {
          throw new Error(
            `releases: ${record.version}.json: highlight "${h.id}" references scene "${h.scene}", which is not a published scene`
          );
        }
      }
    }
  }

  const releasesUrl = site.github && site.github.releasesUrl;
  for (const record of all) {
    record.notesUrl = `${releasesUrl}/tag/v${record.version}`;
    record.isCurrent = record === current;
  }
  return {
    all,
    current,
    homeCards: selectHomeCards(all, current),
    padChangeInfo: buildPadChangeInfo(current),
  };
}

// ---------------------------------------------------------------------------
// Scene catalog + capture manifest (contracts/scene-catalog.md, rules G1–G7)
// ---------------------------------------------------------------------------

function validateStage(scene, fail) {
  const stage = scene.stage;
  if (!stage || typeof stage !== "object") fail(`"stage" is required for mode ${scene.mode}`);
  if (scene.mode === "auto") {
    if (!Array.isArray(stage.steps) || stage.steps.length === 0) fail(`"stage.steps" must be a non-empty array`);
  }
  const steps = stage.steps || [];
  steps.forEach((step, i) => {
    const names = step && typeof step === "object" ? Object.keys(step) : [];
    if (names.length !== 1 || !STEP_NAMES.includes(names[0])) {
      fail(`stage.steps[${i}]: unknown step ${JSON.stringify(step)} — allowed: ${STEP_NAMES.join(", ")}`);
    }
  });
  if (scene.mode === "auto") {
    const captures = steps.filter((s) => "capture" in s);
    if (captures.length !== 1) fail(`an automated scene needs exactly one "capture" step, found ${captures.length}`);
    const tail = steps.slice(steps.findIndex((s) => "capture" in s) + 1);
    if (tail.some((s) => !("close" in s))) fail(`only "close" steps may follow "capture"`);
  }
}

function validateScene(scene, index, languages) {
  const label = scene && typeof scene.id === "string" ? scene.id : `#${index}`;
  const fail = (msg) => {
    throw new Error(`gallery: ${label}: ${msg}`);
  };
  if (!scene || typeof scene.id !== "string" || !KEBAB_RE.test(scene.id)) fail(`"id" must be kebab-case`);
  checkLocalized(scene.title, languages, "title", LIMITS.sceneTitle, fail);
  checkLocalized(scene.caption, languages, "caption", LIMITS.sceneCaption, fail);
  checkLocalized(scene.alt, languages, "alt", LIMITS.sceneAlt, fail);
  if (!Array.isArray(scene.themes) || scene.themes.length === 0 ||
      scene.themes.some((t) => !SCENE_THEMES.includes(t)) ||
      new Set(scene.themes).size !== scene.themes.length) {
    fail(`"themes" must be a non-empty subset of ${SCENE_THEMES.join(", ")}`);
  }
  if (!SCENE_MODES.includes(scene.mode)) fail(`"mode" must be one of ${SCENE_MODES.join(", ")}`);
  if (scene.since !== undefined && !VERSION_RE.test(String(scene.since))) fail(`"since" must be a version`);
  if (scene.mode === "auto" || scene.mode === "manual-sandbox") validateStage(scene, fail);
  if (scene.mode !== "auto") {
    if (!Array.isArray(scene.manualSteps) || scene.manualSteps.length === 0 ||
        scene.manualSteps.some((s) => typeof s !== "string" || !s.trim())) {
      fail(`manual scenes need "manualSteps" (a non-empty list of instructions)`);
    }
    if (scene.mode === "manual-host" &&
        !/personal[- ]data/i.test(scene.manualSteps[scene.manualSteps.length - 1])) {
      fail(`the last manual step of a manual-host scene must be the personal-data review`);
    }
  }
}

function loadGallery(options = {}) {
  const base = options.contentDir || contentDir();
  const srcDir = options.srcDir || path.join(REPO_ROOT, "src");
  const languages = options.languages || loadLanguages();
  const scenesFile = path.join(base, "gallery", "scenes.json");
  const capturesFile = path.join(base, "gallery", "captures.json");

  if (!fs.existsSync(scenesFile)) {
    return { scenes: [], published: [], captures: null, hasCaptures: false };
  }
  const scenes = readJson(scenesFile);
  if (!Array.isArray(scenes)) throw new Error(`gallery: scenes.json must be an array`);
  const ids = new Set();
  scenes.forEach((scene, i) => {
    validateScene(scene, i, languages);
    if (ids.has(scene.id)) throw new Error(`gallery: ${scene.id}: id is used twice`);
    ids.add(scene.id);
  });

  const published = scenes.filter((s) => s.published !== false);
  // Every published scene is shown, in catalog order, on the home page: there
  // is no second gallery page and no featured subset any more (author's
  // decision, 2026-09-20). The order still starts with the main window.
  if (published[0].id !== FIRST_SCENE) {
    throw new Error(`gallery: ${published[0].id}: the catalog must start with "${FIRST_SCENE}"`);
  }

  // Until the first capture run there is no manifest: the catalog is checked
  // for shape only, and the site renders no gallery.
  const hasCaptures = fs.existsSync(capturesFile);
  const captures = hasCaptures ? readJson(capturesFile) : null;
  if (hasCaptures) {
    if (published.length < PUBLISHED_MIN) {
      throw new Error(`gallery: ${published.length} published scenes, at least ${PUBLISHED_MIN} required`);
    }
    for (const scene of published) {
      scene.images = {};
      for (const theme of scene.themes) {
        const capture = captures[`${scene.id}/${theme}`];
        if (!capture) {
          throw new Error(`gallery: ${scene.id}: no capture for theme "${theme}" — run npm run shots -- --scene ${scene.id}`);
        }
        if (!(capture.width > 0) || !(capture.height > 0)) {
          throw new Error(`gallery: ${scene.id}: capture ${theme} has no width/height`);
        }
        for (const key of ["full", "card"]) {
          const rel = capture.files && capture.files[key];
          if (!rel || !fs.existsSync(path.join(srcDir, rel))) {
            throw new Error(`gallery: ${scene.id}: image file missing: src/${rel}`);
          }
        }
        scene.images[theme] = {
          full: "/" + capture.files.full,
          card: "/" + capture.files.card,
          width: capture.width,
          height: capture.height,
          cardWidth: capture.files.cardWidth,
          cardHeight: capture.files.cardHeight,
        };
      }
    }
  }
  return { scenes, published, captures, hasCaptures };
}

// Which images are older than the current release, and which of those the
// release actually touched (data-model §3).
function staleReport(gallery, releases) {
  if (!gallery || !gallery.hasCaptures) return { available: false, must: [], review: [], current: [] };
  const version = releases.current.version;
  const touched = new Set(releases.current.highlights.map((h) => h.scene).filter(Boolean));
  const report = { available: true, must: [], review: [], current: [] };
  for (const scene of gallery.published) {
    for (const theme of scene.themes) {
      const capture = gallery.captures[`${scene.id}/${theme}`];
      if (!capture) continue;
      const row = { scene: scene.id, theme, appVersion: capture.appVersion };
      if (compareVersions(capture.appVersion, version) >= 0) report.current.push(row);
      else if (scene.showsVersion || touched.has(scene.id)) report.must.push(row);
      else report.review.push(row);
    }
  }
  return report;
}

module.exports = {
  LIMITS,
  HOME_CARD_COUNT,
  RELEASE_KINDS,
  STEP_NAMES,
  contentDir,
  loadLanguages,
  compareVersions,
  escapeHtml,
  renderInline,
  stripInline,
  validateRecord,
  buildPadChangeInfo,
  selectHomeCards,
  loadReleases,
  validateScene,
  loadGallery,
  staleReport,
};
