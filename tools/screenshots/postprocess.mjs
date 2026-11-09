// Turns the PNGs a capture run produced into the two WebP variants the site
// serves, and records them in the capture manifest (spec:
// specs/007-release-news-gallery/, research R3, data-model section 3).
//
// Lossless WebP for the enlarged view (UI screenshots are flat colour and
// text, so lossless beats an optimised PNG by a quarter and loses nothing),
// and a 640 px variant for the cards. The site build itself never processes
// images — everything is committed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const content = require("../../lib/content.js");

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(REPO_ROOT, "src");
const GALLERY_DIR = path.join(SRC, "assets", "gallery");
const CAPTURES = path.join(REPO_ROOT, "content", "gallery", "captures.json");
// Pictures replaced by a newer version's capture (spec 012): kept per version
// for the release history page.
const ARCHIVE = path.join(REPO_ROOT, "content", "gallery", "archive.json");

const CARD_WIDTH = 640;
const CARD_QUALITY = 82;
const MAX_FULL_BYTES = 300 * 1024; // SC-006

// The two addresses software catalogues and old links use (FR-023).
const LEGACY_PNG = {
  "main-window/light": path.join(SRC, "assets", "screenshot-light.png"),
  "dark-theme/dark": path.join(SRC, "assets", "screenshot-dark.png"),
};

const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")) : fallback;

// Keeps the manifest stable so a re-capture of one scene is a one-line diff.
function writeCaptures(captures) {
  const ordered = {};
  for (const key of Object.keys(captures).sort()) ordered[key] = captures[key];
  fs.writeFileSync(CAPTURES, JSON.stringify(ordered, null, 2) + "\n");
}

function writeArchive(archive) {
  const ordered = {};
  for (const version of Object.keys(archive).sort(content.compareVersions)) {
    ordered[version] = {};
    for (const key of Object.keys(archive[version]).sort()) ordered[version][key] = archive[version][key];
  }
  fs.writeFileSync(ARCHIVE, JSON.stringify(ordered, null, 2) + "\n");
}

export async function postprocess({ outDir, result, scenes }) {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
  const captures = readJson(CAPTURES, {});
  const archive = readJson(ARCHIVE, {});
  const catalog = new Map(scenes.map((s) => [s.id, s]));
  let archived = false;
  const problems = [];
  const written = [];

  for (const scene of result.scenes || []) {
    if (scene.status !== "ok") continue;
    const key = `${scene.id}/${scene.theme}`;
    const source = path.join(outDir, scene.file);
    if (!fs.existsSync(source)) {
      problems.push(`${key}: the guest reported ${scene.file} but it is not there`);
      continue;
    }
    // The picture this capture replaces keeps its place in the history of the
    // version it showed (archive/<old version>/) before it is overwritten.
    const plan = content.archivePlan(captures[key], key, catalog.get(scene.id), result.app.version);
    if (plan) {
      for (const move of plan.moves) {
        fs.mkdirSync(path.dirname(path.join(SRC, move.to)), { recursive: true });
        fs.copyFileSync(path.join(SRC, move.from), path.join(SRC, move.to));
      }
      (archive[plan.version] = archive[plan.version] || {})[key] = plan.entry;
      archived = true;
    }

    const image = sharp(source);
    const meta = await image.metadata();
    const full = await image.clone().webp({ lossless: true, effort: 6 }).toBuffer();
    const { data: card, info: cardInfo } = await image
      .clone()
      .resize({ width: Math.min(CARD_WIDTH, meta.width), withoutEnlargement: true })
      .webp({ quality: CARD_QUALITY, effort: 6 })
      .toBuffer({ resolveWithObject: true });

    // The file name carries the content hash (lib/content.js): a changed
    // picture is a new address, so no browser or CDN cache can keep showing
    // the old one, and the build refuses a picture named otherwise.
    const base = `${scene.id}-${scene.theme}`;
    const fullRel = path.posix.join("assets", "gallery", content.pictureFileName(base, full));
    const cardRel = path.posix.join("assets", "gallery", content.pictureFileName(`${base}-640`, card));
    fs.writeFileSync(path.join(SRC, fullRel), full);
    fs.writeFileSync(path.join(SRC, cardRel), card);

    // The files this capture replaces (already copied into the archive above
    // when they showed an older version) are removed - with content names a
    // changed picture no longer overwrites them, and the build rejects a
    // picture that belongs to no record.
    const previous = captures[key] ? [captures[key].files.full, captures[key].files.card] : [];
    for (const rel of previous) {
      if (rel !== fullRel && rel !== cardRel) fs.rmSync(path.join(SRC, rel), { force: true });
    }

    const fullBytes = full.length;
    if (fullBytes > MAX_FULL_BYTES) {
      problems.push(`${key}: ${Math.round(fullBytes / 1024)} KB exceeds the ${MAX_FULL_BYTES / 1024} KB budget`);
    }

    captures[key] = {
      appVersion: result.app.version,
      appBuild: result.app.build,
      capturedAt: new Date().toISOString().slice(0, 10),
      environment: (result.environment && result.environment.kind) || "sandbox",
      dpi: (result.environment && result.environment.dpi) || null,
      width: meta.width,
      height: meta.height,
      files: { full: fullRel, card: cardRel, cardWidth: cardInfo.width, cardHeight: cardInfo.height },
      bytes: { full: fullBytes, card: card.length },
    };
    written.push({ key, width: meta.width, height: meta.height, fullBytes, cardBytes: card.length });

    if (LEGACY_PNG[key]) {
      await sharp(source).png({ compressionLevel: 9, palette: true }).toFile(LEGACY_PNG[key]);
    }
  }

  // Both themes of one scene must have the same size, or the card grid jumps
  // when the visitor switches theme.
  for (const scene of scenes.filter((s) => s.themes.length > 1)) {
    const sizes = scene.themes
      .map((theme) => captures[`${scene.id}/${theme}`])
      .filter(Boolean)
      .map((c) => `${c.width}x${c.height}`);
    if (new Set(sizes).size > 1) problems.push(`${scene.id}: themes differ in size (${sizes.join(", ")})`);
  }

  writeCaptures(captures);
  if (archived) writeArchive(archive);
  writeContactSheet(outDir, captures, written);
  return { written, problems };
}

// One page with every image at half size, for the personal-data review.
function writeContactSheet(outDir, captures, written) {
  const rows = Object.entries(captures)
    .map(([key, c]) => `<figure><img src="../../../src/${c.files.card}" alt="${key}">
      <figcaption>${key}<br>${c.width}×${c.height} · ${c.appVersion} build ${c.appBuild} · ${Math.round(c.bytes.full / 1024)} KB</figcaption></figure>`)
    .join("\n");
  const html = `<!doctype html><meta charset="utf-8"><title>Capture contact sheet</title>
<style>body{font:14px system-ui;background:#111;color:#eee;margin:24px}
h1{font-size:18px}figure{display:inline-block;margin:0 16px 24px 0;width:420px;vertical-align:top}
img{width:100%;border:1px solid #444;border-radius:6px}figcaption{font-size:12px;color:#aaa;margin-top:6px}</style>
<h1>Capture contact sheet — ${written.length} image(s) updated</h1>
<p>Check every picture for personal data before committing: user names, private paths, drive labels, bookmarks, host names.</p>
${rows}`;
  fs.writeFileSync(path.join(outDir, "..", "contact-sheet.html"), html);
}
