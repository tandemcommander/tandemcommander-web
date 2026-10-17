// Release status — where a release of one version stands, derived only from
// the repository (spec: specs/011-tandem-new-version/, research R3,
// data-model §2 and §6). Pure: release.mjs gathers the inputs.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const content = require("../../lib/content.js");

// "filled" once every language has a summary; the approved texts are then on
// disk and the combined review is not repeated.
export function recordState(record) {
  if (!record) return "missing";
  const summaries = Object.values(record.summary || {});
  return summaries.length && summaries.every((s) => typeof s === "string" && s.trim()) ? "filled" : "skeleton";
}

// git: { branch, releaseBranchExists, develBehindOrigin, dirty: [paths], recordCommits }
export function buildStatus({ version, siteVersion, recordVersions, record, gallery, git }) {
  const older = recordVersions.filter((v) => content.compareVersions(v, version) < 0);
  older.sort(content.compareVersions);
  const state = recordState(record);
  const highlightScenes = state === "filled" ? (record.highlights || []).map((h) => h.scene) : [];
  const releaseBranch = `release-${version}`;
  const status = {
    version,
    previousVersion: older.length ? older[older.length - 1] : null,
    siteVersion,
    git: {
      branch: git.branch,
      releaseBranch,
      releaseBranchExists: git.releaseBranchExists,
      develBehindOrigin: git.develBehindOrigin,
      dirty: git.dirty,
      committed: git.recordCommits > 0 && git.dirty.length === 0,
    },
    record: state,
    captures: content.capturePlan(gallery, version, highlightScenes),
  };
  status.next = nextStep(status);
  return status;
}

// review → branch → capture → check (then handover and commit) → done. The
// branch and record steps follow the approval in the same session, so a run
// that lost the approval starts again at the review.
export function nextStep(status) {
  if (status.git.committed) return "done";
  if (status.record !== "filled" || status.siteVersion !== status.version) return "review";
  if (status.git.releaseBranchExists && status.git.branch !== status.git.releaseBranch) return "branch";
  if (status.captures.must.length) return "capture";
  return "check";
}
