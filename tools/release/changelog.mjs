// Reads the application's CHANGELOG.md (spec: specs/007-release-news-gallery/,
// contracts/release-cli.md; GitHub-only source: specs/011-tandem-new-version/,
// research R1). The changelog is the source of truth for a release's date,
// build number and content; the website only digests it.
const CHANGELOG_URL = (version) =>
  `https://raw.githubusercontent.com/tandemcommander/tandemcommander/v${version}/CHANGELOG.md`;

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

// The changelog as published at the release tag — never a local checkout, so
// the result is the same on every machine (FR-002a). fetchImpl is for tests.
export async function fetchChangelog(version, { fetchImpl = fetch } = {}) {
  const url = CHANGELOG_URL(version);
  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    throw new Error(`cannot fetch the changelog from ${url} (${err.message})`);
  }
  if (!res.ok) {
    throw new Error(`the changelog at tag v${version} is not available: ${url} answered ${res.status}${rateLimitNote(res)}`);
  }
  return { source: url, text: await res.text() };
}

// " — rate limit resets at …" for 403/429 answers that say when; else "".
export function rateLimitNote(res) {
  if (res.status !== 403 && res.status !== 429) return "";
  const reset = Number(res.headers && res.headers.get && res.headers.get("x-ratelimit-reset"));
  return reset > 0 ? ` — GitHub rate limit, resets at ${new Date(reset * 1000).toISOString()}` : "";
}
