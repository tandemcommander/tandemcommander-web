// Release status and next step (tools/release/status.mjs,
// specs/011-tandem-new-version/ data-model §2 and §6).
const { test } = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../tools/release/status.mjs");

const gallery = {
  published: [{ id: "main-window", themes: ["light"], showsVersion: true }, { id: "code-viewer", themes: ["light"] }],
  captures: { "main-window/light": { appVersion: "0.1.9" }, "code-viewer/light": { appVersion: "0.1.8" } },
};
const filled = { summary: { en: "Text.", cs: "Text." }, highlights: [{ id: "a", scene: "code-viewer" }] };
const skeleton = { summary: { en: "", cs: "" }, highlights: [] };
const git = (extra = {}) => ({
  branch: "devel", releaseBranchExists: false, develBehindOrigin: 0, dirty: [], recordCommits: 0, ...extra,
});
const input = (extra = {}) => ({
  version: "0.2.0", siteVersion: "0.1.9", recordVersions: ["0.1.8", "0.1.9"], record: null, gallery, git: git(),
  ...extra,
});

test("a fresh release starts at the review", async () => {
  const { buildStatus } = await load();
  const s = buildStatus(input());
  assert.equal(s.next, "review");
  assert.equal(s.record, "missing");
  assert.equal(s.previousVersion, "0.1.9");
  assert.equal(s.git.releaseBranch, "release-0.2.0");
  assert.deepEqual(s.captures.must.map((r) => r.scene), ["main-window"]);
});

test("a skeleton record means the approval was lost: back to the review", async () => {
  const { buildStatus } = await load();
  const s = buildStatus(input({ siteVersion: "0.2.0", record: skeleton,
    git: git({ branch: "release-0.2.0", releaseBranchExists: true }) }));
  assert.equal(s.record, "skeleton");
  assert.equal(s.next, "review");
});

test("recorded on another branch: switch to the release branch first", async () => {
  const { buildStatus } = await load();
  const s = buildStatus(input({ siteVersion: "0.2.0", record: filled, git: git({ releaseBranchExists: true }) }));
  assert.equal(s.next, "branch");
});

test("filled record with pictures to re-capture; highlight scenes join the plan", async () => {
  const { buildStatus } = await load();
  const s = buildStatus(input({ siteVersion: "0.2.0", record: filled,
    git: git({ branch: "release-0.2.0", releaseBranchExists: true }) }));
  assert.equal(s.next, "capture");
  assert.deepEqual(s.captures.must.map((r) => r.scene), ["main-window", "code-viewer"]);
});

test("nothing to capture and not committed: check; committed and clean: done", async () => {
  const { buildStatus } = await load();
  const current = { ...gallery, captures: { "main-window/light": { appVersion: "0.2.0" }, "code-viewer/light": { appVersion: "0.2.0" } } };
  const onBranch = { branch: "release-0.2.0", releaseBranchExists: true };
  const base = { siteVersion: "0.2.0", record: filled, gallery: current };
  assert.equal(buildStatus(input({ ...base, git: git({ ...onBranch, dirty: ["public/index.html"] }) })).next, "check");
  assert.equal(buildStatus(input({ ...base, git: git({ ...onBranch, recordCommits: 1, dirty: ["x"] }) })).next, "check");
  const done = buildStatus(input({ ...base, git: git({ ...onBranch, recordCommits: 1 }) }));
  assert.equal(done.git.committed, true);
  assert.equal(done.next, "done");
});

test("previousVersion ignores versions at or above the target", async () => {
  const { buildStatus } = await load();
  assert.equal(buildStatus(input({ recordVersions: ["0.1.10", "0.1.9", "0.2.0", "0.3.0"] })).previousVersion, "0.1.10");
  assert.equal(buildStatus(input({ recordVersions: [] })).previousVersion, null);
});

test("record state: missing, skeleton, filled", async () => {
  const { recordState } = await load();
  assert.equal(recordState(null), "missing");
  assert.equal(recordState({ summary: { en: "x", cs: " " } }), "skeleton");
  assert.equal(recordState(filled), "filled");
});

// The home page's "What's new" for a version (specs/012-whats-new-showcase/data-model.md §5).
const both = (text) => ({ en: text, cs: text });
const shown = (id) => ({ id, themes: ["light"], title: both(id), caption: both(id), alt: both(id),
  images: { light: { full: `/${id}.webp`, width: 1200, height: 800 } } });
const showcaseGallery = { hasCaptures: true, published: [shown("quick-search"), shown("panel-tabs")] };
const mainRecord = {
  version: "0.3.0", summary: both("Main."),
  highlights: [{ id: "a", scene: "quick-search" }, { id: "b" }, { id: "c", scene: "panel-tabs" }, { id: "d" }],
};

test("home page: a main release lists its picture panels and compact items", async () => {
  const { buildStatus } = await load();
  const s = buildStatus(input({ version: "0.3.0", record: mainRecord, gallery: showcaseGallery }));
  assert.deepEqual(s.homePage, { main: "0.3.0", isPatch: false, blocks: ["quick-search", "panel-tabs"], compact: 2 });
});

test("home page: a patch leaves What's new at its main release", async () => {
  const { buildStatus } = await load();
  const s = buildStatus(input({ version: "0.3.1", record: null, mainRecord, gallery: showcaseGallery }));
  assert.deepEqual(s.homePage, { main: "0.3.0", isPatch: true });
});

test("home page: a main release without its record says so", async () => {
  const { buildStatus } = await load();
  assert.deepEqual(buildStatus(input({ version: "0.3.0", gallery: showcaseGallery })).homePage,
    { main: "0.3.0", isPatch: false, missing: true });
});
