// Reads the application's CHANGELOG.md (spec: specs/007-release-news-gallery/,
// contracts/release-cli.md). The changelog is the source of truth for a
// release's date, build number and content; the website only digests it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// "## [0.1.8] — 2026-09-20" — em dash, en dash or hyphen; "## [Unreleased]".
const HEADING_RE = /^## \[([^\]]+)\](?:\s*[—–-]\s*(\d{4}-\d{2}-\d{2}))?\s*$/;

export function parseChangelog(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      current = { version: m[1], date: m[2] || null, lines: [] };
      sections.set(m[1].toLowerCase() === "unreleased" ? "unreleased" : m[1], current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  for (const section of sections.values()) {
    const body = section.lines.join("\n").trim();
    delete section.lines;
    section.body = body;
    section.isUnreleased = section.version.toLowerCase() === "unreleased";
    const build = /\*\*Build (\d+)\.\*\*/.exec(body);
    section.build = build ? Number(build[1]) : null;
    // The lead is everything before the first "### " group heading.
    const firstGroup = body.search(/^### /m);
    section.lead = (firstGroup === -1 ? body : body.slice(0, firstGroup)).trim();
    section.hasAdded = /^### Added\s*$/m.test(body);
  }
  return sections;
}

// A hint only — the digest author decides (tools/release/DIGEST-STYLE.md).
export function kindHint(section) {
  if (/\b(nothing in the application itself changed|application itself is unchanged|source code is identical)\b/i.test(section.lead)) {
    return "installer";
  }
  if (/first public release/i.test(section.lead)) return "first";
  return section.hasAdded ? "feature" : "bugfix";
}

// --changelog <path>  →  sibling checkout  →  the file at the release tag.
export async function locateChangelog({ explicitPath, version }) {
  if (explicitPath) {
    if (!fs.existsSync(explicitPath)) throw new Error(`changelog not found: ${explicitPath}`);
    return { source: explicitPath, text: fs.readFileSync(explicitPath, "utf8") };
  }
  const sibling = path.join(REPO_ROOT, "..", "tandemcommander", "CHANGELOG.md");
  if (fs.existsSync(sibling)) {
    return { source: sibling, text: fs.readFileSync(sibling, "utf8") };
  }
  const url = `https://raw.githubusercontent.com/tandemcommander/tandemcommander/v${version}/CHANGELOG.md`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`changelog not found locally and ${url} answered ${res.status}`);
  return { source: url, text: await res.text() };
}
