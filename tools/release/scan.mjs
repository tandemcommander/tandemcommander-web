// Candidates for website text a new version may have made stale (spec:
// specs/011-tandem-new-version/, research R5, data-model §4). Pure: the
// caller passes the files. Findings are candidates for the assistant (or the
// author) to judge, never verdicts.

// Every source of text visible on the website. Release records are history
// (FR-011); the README is not part of the website.
export const SOURCE_RULES = [
  /^src\/_data\/i18n\/[^/]+\.json$/,
  /^src\/.+\.njk$/,
  /^content\/gallery\/scenes\.json$/,
];
export const EXCLUDED = [/^content\/releases\//, /^README\.md$/, /^specs\//, /^public\//];

export const isScanned = (rel) => SOURCE_RULES.some((re) => re.test(rel)) && !EXCLUDED.some((re) => re.test(rel));

// Stems that announce the future; matched at a word start, letters may follow.
export const FUTURE_PHRASES = {
  en: ["planned", "coming", "soon", "on its way", "will be", "not yet"],
  cs: ["plánuj", "připravuj", "chyst", "brzy", "zatím ne", "bude"],
};

const VERSION_RE = /(?<![\w.])v?(\d+\.\d+\.\d+)(?!\.?\d)/g;
const futureRe = (stems) => new RegExp(`(?<!\\p{L})(?:${stems.join("|")})\\p{L}*`, "giu");

const excerpt = (text, index, length) => {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
};

// String leaves of a JSON value as dotted keys; array items that have an id
// are named by it (scenes.json → "main-window.caption.en").
function leaves(value, prefix = []) {
  if (typeof value === "string") return [{ key: prefix.join("."), text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leaves(item, [...prefix, item && item.id ? item.id : String(i)]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => (k === "id" ? [] : leaves(v, [...prefix, k])));
  }
  return [];
}

// Nunjucks comments are never shown; blank them out, keeping line numbers.
const stripComments = (text) => text.replace(/\{#[\s\S]*?#\}/g, (c) => c.replace(/[^\n]/g, " "));

export function scanSources({ files, previousVersion, languages = Object.keys(FUTURE_PHRASES) }) {
  const sources = files.map((f) => f.path).filter(isScanned).sort();
  const findings = [];
  const byPath = new Map(files.map((f) => [f.path, f.text]));

  const look = (text, where, lang) => {
    for (const m of text.matchAll(VERSION_RE)) {
      findings.push({ kind: "version", ...where, lang, match: m[1], isPrevious: m[1] === previousVersion,
        excerpt: excerpt(text, m.index, m[0].length) });
    }
    const stems = lang ? FUTURE_PHRASES[lang] || [] : Object.values(FUTURE_PHRASES).flat();
    if (!stems.length) return;
    for (const m of text.matchAll(futureRe(stems))) {
      findings.push({ kind: "future", ...where, lang, match: m[0], excerpt: excerpt(text, m.index, m[0].length) });
    }
  };

  for (const file of sources) {
    const text = byPath.get(file);
    if (file.endsWith(".json")) {
      const catalogLang = /i18n\/([^/]+)\.json$/.exec(file);
      for (const leaf of leaves(JSON.parse(text))) {
        const last = leaf.key.split(".").pop();
        const lang = catalogLang ? catalogLang[1] : languages.includes(last) ? last : null;
        look(leaf.text, { file, key: leaf.key }, lang);
      }
    } else {
      stripComments(text).split(/\r?\n/).forEach((line, i) => look(line, { file, line: i + 1 }, null));
    }
  }
  return { previousVersion, sources, findings };
}
