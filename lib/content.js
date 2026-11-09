// Structured site content (spec: specs/007-release-news-gallery/).
//
// Release records (content/releases/<version>.json) and the screenshot scene
// catalog (content/gallery/) are list-shaped, so they live outside the i18n
// catalogs — but under the same guarantee: every text must exist, non-empty,
// in exactly the languages of src/_data/languages.json. Everything here is
// pure logic shared by the site build (src/_data/releases.js, gallery.js),
// the release tooling (tools/release/) and the tests. Any violation throws,
// which fails the build — the same publishing gate as the i18n and PAD checks.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");

// Every picture file carries the first PICTURE_HASH_LENGTH hex characters of
// its SHA-256 in its name - <scene>-<theme>[-640].<hash>.webp - so a changed
// picture always has a new address: /assets/gallery/* is served as immutable
// for a year (src/root/_headers), and a picture re-captured under the same
// name would be shown from browser caches for days. npm run shots names the
// files this way; the build refuses a picture whose name does not match its
// content (author's decision, 2026-11-09).
const PICTURE_HASH_LENGTH = 10;
const PICTURE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.([0-9a-f]+)\.webp$/;

const LIMITS = {
  summary: 200,
  highlightTitle: 40,
  highlightText: 220,
  sceneTitle: 40,
  sceneCaption: 160,
  sceneAlt: 250,
  padChangeInfo: 300, // PAD 4.0 Program_Change_Info
};

// The gallery shows only what Tandem Commander added to Open Salamander, so
// the catalog is deliberately smaller than the first draft assumed.
const PUBLISHED_MIN = 7;
const FIRST_SCENE = "main-window";
// The home page's "What's new" shows at most this many highlights with a
// picture; the others are listed compactly (spec 012, data-model §4).
const SHOWCASE_MAX_BLOCKS = 3;
// Pictures replaced by a capture of a newer version are kept here, per app
// version, for the release history page (spec 012, data-model §7).
const ARCHIVE_DIR = "assets/gallery/archive";

const RELEASE_KINDS = ["first", "feature", "bugfix", "maintenance", "installer"];
// What a patch X.Y.Z (Z > 0, from 0.2.0 on) may be: never a feature release (spec 012, S3).
const PATCH_KINDS = ["bugfix", "maintenance", "installer"];
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

// From 0.2.0 on, a version X.Y.Z with Z > 0 is a patch (bug fixes only) and
// X.Y.0 is its main release (spec 012, data-model §2). In the 0.1.x line patch
// numbers still carried features, so there every version is its own main release.
const MAIN_RELEASE_LINE = "0.2.0";

function isPatchLine(version) {
  return compareVersions(version, MAIN_RELEASE_LINE) >= 0 && Number(String(version).split(".")[2]) > 0;
}

function mainVersionOf(version) {
  if (!isPatchLine(version)) return version;
  const [x, y] = String(version).split(".");
  return `${x}.${y}.0`;
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
  if (isPatchLine(record.version) && !PATCH_KINDS.includes(record.kind)) {
    fail(`kind "${record.kind}" is not allowed for a patch release — new features belong to a main release ${mainVersionOf(record.version)}`);
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
        `(npm run release:apply -- ${site.version}, or /tandem-new-version ${site.version})`
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

  // The home page presents the main release X.Y.0 of the current version;
  // patches X.Y.Z are bug fixes and live only on the history page (spec 012).
  const mainVersion = mainVersionOf(site.version);
  const main = byVersion.get(mainVersion);
  if (!main) {
    throw new Error(
      `releases: no record for main release ${mainVersion} (current version ${site.version}) — ` +
        `create content/releases/${mainVersion}.json`
    );
  }

  const releasesUrl = site.github && site.github.releasesUrl;
  for (const record of all) {
    record.notesUrl = `${releasesUrl}/tag/v${record.version}`;
    record.isCurrent = record === current;
  }
  return {
    all,
    current,
    main,
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

// The picture archive (content/gallery/archive.json, spec 012 rules A1-A4):
// { "<version>": { "<scene>/<theme>": capture record + its title, caption and
// alt as they were } }. Kept texts make the history independent of later
// catalog edits.
function validateArchive(archive, { srcDir, languages, captures }) {
  if (!archive || typeof archive !== "object" || Array.isArray(archive)) {
    throw new Error(`gallery: archive.json must map versions to pictures`);
  }
  for (const [version, entries] of Object.entries(archive)) {
    const fail = (msg) => {
      throw new Error(`gallery: archive ${version}: ${msg}`);
    };
    if (!VERSION_RE.test(version)) fail(`"${version}" is not a version like 0.1.8`);
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) fail(`must map <scene>/<theme> to a picture`);
    for (const [key, entry] of Object.entries(entries)) {
      const [id, theme, extra] = key.split("/");
      if (extra !== undefined || !KEBAB_RE.test(id || "") || !SCENE_THEMES.includes(theme)) {
        fail(`${key}: key must be <scene>/<light|dark>`);
      }
      if (entry.appVersion !== version) fail(`${key}: appVersion ${entry.appVersion} differs from ${version}`);
      checkLocalized(entry.title, languages, `${key}.title`, LIMITS.sceneTitle, fail);
      checkLocalized(entry.caption, languages, `${key}.caption`, LIMITS.sceneCaption, fail);
      checkLocalized(entry.alt, languages, `${key}.alt`, LIMITS.sceneAlt, fail);
      if (!(entry.width > 0) || !(entry.height > 0)) fail(`${key}: no width/height`);
      for (const k of ["full", "card"]) {
        checkPictureFile(srcDir, entry.files && entry.files[k], (msg) => fail(`${key}: ${msg}`));
      }
      if (captures && captures[key] && captures[key].appVersion === version) {
        fail(`${key}: is also the current picture - a picture is either current or archived`);
      }
    }
  }
}

// The pictures taken with one app version, for its entry on the release
// history page: archived ones plus current captures of that version, in
// catalog order (spec 012, data-model §7).
function releaseShots(gallery, version) {
  if (!gallery || !gallery.hasCaptures) return [];
  const order = new Map(gallery.scenes.map((scene, i) => [scene.id, i]));
  const shot = (key, capture, texts) => {
    const [scene, theme] = key.split("/");
    return {
      key, scene, theme,
      title: texts.title, caption: texts.caption, alt: texts.alt,
      full: "/" + capture.files.full, card: "/" + capture.files.card,
      width: capture.width, height: capture.height,
      cardWidth: capture.files.cardWidth, cardHeight: capture.files.cardHeight,
    };
  };
  const list = Object.entries((gallery.archive || {})[version] || {}).map(([key, c]) => shot(key, c, c));
  for (const scene of gallery.published) {
    for (const theme of scene.themes) {
      const capture = gallery.captures[`${scene.id}/${theme}`];
      if (capture && capture.appVersion === version) list.push(shot(`${scene.id}/${theme}`, capture, scene));
    }
  }
  const rank = (s) => (order.has(s.scene) ? order.get(s.scene) : Number.MAX_SAFE_INTEGER);
  return list.sort((a, b) => rank(a) - rank(b) || a.theme.localeCompare(b.theme));
}

// What a new capture of `key` with app version `version` does to the picture
// it replaces: nothing for the same version, otherwise its files move to
// archive/<old version>/ and its record - with the scene's texts as they are
// now - goes into archive.json. Pure; the capture tool performs the moves.
function archivePlan(capture, key, scene, version) {
  if (!capture || !scene || capture.appVersion === version) return null;
  const dir = `${ARCHIVE_DIR}/${capture.appVersion}`;
  const moved = (rel) => `${dir}/${path.posix.basename(rel)}`;
  return {
    version: capture.appVersion,
    key,
    entry: {
      ...capture,
      files: { ...capture.files, full: moved(capture.files.full), card: moved(capture.files.card) },
      title: scene.title,
      caption: scene.caption,
      alt: scene.alt,
    },
    moves: [
      { from: capture.files.full, to: moved(capture.files.full) },
      { from: capture.files.card, to: moved(capture.files.card) },
    ],
  };
}

function loadGallery(options = {}) {
  const base = options.contentDir || contentDir();
  const srcDir = options.srcDir || path.join(REPO_ROOT, "src");
  const languages = options.languages || loadLanguages();
  const scenesFile = path.join(base, "gallery", "scenes.json");
  const capturesFile = path.join(base, "gallery", "captures.json");

  if (!fs.existsSync(scenesFile)) {
    return { scenes: [], published: [], captures: null, hasCaptures: false, archive: {} };
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
          checkPictureFile(srcDir, capture.files && capture.files[key], (msg) => {
            throw new Error(`gallery: ${scene.id}: ${msg}`);
          });
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
  const archiveFile = path.join(base, "gallery", "archive.json");
  const archive = fs.existsSync(archiveFile) ? readJson(archiveFile) : {};
  validateArchive(archive, { srcDir, languages, captures });
  if (hasCaptures) checkNoStrayPictures(srcDir, captures, archive);
  return { scenes, published, captures, hasCaptures, archive };
}

// The hash a picture's file name carries, from the file's content.
function pictureHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, PICTURE_HASH_LENGTH);
}

// The file name for a picture with this content: <stem>.<hash>.webp, where
// the stem is <scene>-<theme> for the full picture and <scene>-<theme>-640
// for the card.
function pictureFileName(stem, buffer) {
  return `${stem}.${pictureHash(buffer)}.webp`;
}

// A picture must exist and be named after its content (see PICTURE_NAME_RE).
function checkPictureFile(srcDir, rel, fail) {
  if (!rel || !fs.existsSync(path.join(srcDir, rel))) fail(`image file missing: src/${rel}`);
  const actual = pictureHash(fs.readFileSync(path.join(srcDir, rel)));
  const match = PICTURE_NAME_RE.exec(path.posix.basename(rel));
  if (!match || match[1] !== actual) {
    fail(`src/${rel}: the file name must carry the picture's content hash (.${actual}.webp) - ` +
      `a changed picture needs a new name, or caches keep showing the old one; npm run shots names it so`);
  }
}

// Every picture under src/assets/gallery/ is a current capture or an archived
// one. With content-named files a re-capture leaves the old file behind
// unless it is removed, and such a leftover would be published for nothing.
function checkNoStrayPictures(srcDir, captures, archive) {
  const recorded = new Set();
  const record = (entry) => {
    for (const k of ["full", "card"]) if (entry && entry.files && entry.files[k]) recorded.add(entry.files[k]);
  };
  Object.values(captures || {}).forEach(record);
  Object.values(archive || {}).forEach((entries) => Object.values(entries).forEach(record));
  const root = path.join(srcDir, "assets", "gallery");
  if (!fs.existsSync(root)) return;
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(root)) {
    if (path.extname(file) !== ".webp") continue;
    const rel = path.relative(srcDir, file).split(path.sep).join("/");
    if (!recorded.has(rel)) {
      throw new Error(`gallery: src/${rel} belongs to no capture and no archived picture - delete it (a re-capture replaced it)`);
    }
  }
}

// The home page's "What's new" (spec 012, data-model §4): the main release's
// highlights, in record order, either as a block - a panel with the picture of
// its published scene (each scene once, at most SHOWCASE_MAX_BLOCKS) - or as a
// compact item, which keeps its scene, if published, for the "See it" link.
// `gallery` is a loadGallery() result; without captures nothing has a picture.
function buildShowcase(main, gallery) {
  const scenes = new Map(
    gallery && gallery.hasCaptures ? gallery.published.map((scene) => [scene.id, scene]) : []
  );
  const used = new Set();
  const blocks = [];
  const compact = [];
  for (const highlight of main.highlights) {
    const scene = highlight.scene ? scenes.get(highlight.scene) : undefined;
    const item = { id: highlight.id, title: highlight.title, text: highlight.text };
    if (scene) item.scene = scene;
    if (scene && !used.has(scene.id) && blocks.length < SHOWCASE_MAX_BLOCKS) {
      used.add(scene.id);
      blocks.push(item);
    } else {
      compact.push(item);
    }
  }
  return { version: main.version, date: main.date, summary: main.summary, blocks, compact };
}

// Which images are older than `version`, and which of those must be
// re-captured: the version shows in them, or a highlight of the release uses
// the scene (data-model §3 of specs/011-tandem-new-version/). Also answers
// "what would a capture for the next version touch?" before it is recorded.
function capturePlan(gallery, version, highlightScenes = []) {
  const touched = new Set(highlightScenes.filter(Boolean));
  const plan = { must: [], review: [], current: [] };
  if (!gallery || !gallery.captures) return plan;
  for (const scene of gallery.published) {
    for (const theme of scene.themes) {
      const capture = gallery.captures[`${scene.id}/${theme}`];
      if (!capture) continue;
      const row = { scene: scene.id, theme, appVersion: capture.appVersion };
      if (compareVersions(capture.appVersion, version) >= 0) plan.current.push(row);
      else if (scene.showsVersion || touched.has(scene.id)) plan.must.push(row);
      else plan.review.push(row);
    }
  }
  return plan;
}

// The same plan for the current release, as the build and release:check
// report it.
function staleReport(gallery, releases) {
  if (!gallery || !gallery.hasCaptures) return { available: false, must: [], review: [], current: [] };
  const scenes = releases.current.highlights.map((h) => h.scene);
  return { available: true, ...capturePlan(gallery, releases.current.version, scenes) };
}

module.exports = {
  LIMITS,
  SHOWCASE_MAX_BLOCKS,
  RELEASE_KINDS,
  STEP_NAMES,
  contentDir,
  loadLanguages,
  compareVersions,
  mainVersionOf,
  isPatchLine,
  escapeHtml,
  renderInline,
  stripInline,
  validateRecord,
  buildPadChangeInfo,
  buildShowcase,
  loadReleases,
  validateScene,
  loadGallery,
  pictureHash,
  pictureFileName,
  releaseShots,
  archivePlan,
  capturePlan,
  staleReport,
};
