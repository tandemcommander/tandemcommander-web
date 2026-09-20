#!/usr/bin/env node
// Screenshot capture — host orchestrator (spec: specs/007-release-news-gallery/,
// research R1/R2, contracts/scene-catalog.md).
//
//   npm run shots -- [--scene a,b] [--theme light|dark] [--version x.y.z] [--keep] [--dry-run]
//
// SPIKE CUT (task T033): preflight, Sandbox job, progress tailing, result
// summary. Catalog-driven scene selection, post-processing (sharp), manual
// scenes and --host come after the spike (T037) has decided the capture path.
//
// Capture runs INSIDE Windows Sandbox, from the officially published
// installer. The application is never started on the host, and the host's
// HKCU\Software\Tandem Commander is never read or written: the program's -C
// option IMPORTS a configuration into the registry, it does not isolate one.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { postprocess } from "./postprocess.mjs";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOLS = path.join(REPO_ROOT, "tools", "screenshots");
const WORK = path.join(REPO_ROOT, ".work");
const SHOTS = path.join(WORK, "shots");
const INSTALLERS = path.join(WORK, "installers");
const GITHUB_API = "https://api.github.com/repos/tandemcommander/tandemcommander";
const SANDBOX_EXE = path.join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsSandbox.exe");
const OVERALL_TIMEOUT_MS = 15 * 60 * 1000;
// src/themes.h: THEME_MODE_DEFAULT 0, THEME_MODE_DARK 1 (REG_DWORD "Theme Mode")
const THEME_VALUES = { light: 0, dark: 1 };

const site = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "src", "_data", "site.json"), "utf8"));

function parseArgs(argv) {
  const args = { scenes: null, theme: null, version: site.version, keep: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scene") args.scenes = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--theme") args.theme = argv[++i];
    else if (a === "--version") args.version = argv[++i];
    else if (a === "--keep") args.keep = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--diagnose") args.diagnose = true;   // one-off environment probe (research R2)
    else if (a === "--no-uac-restart") args.uacRestart = false;  // capture without switching UAC on in the guest
    else throw new Error(`unknown option ${a}`);
  }
  return args;
}

const fail = (lines) => {
  console.error("Preflight refused — nothing was started, nothing was changed:");
  for (const line of [].concat(lines)) console.error(`  ✗ ${line}`);
  process.exitCode = 1;
};

function compareVersions(a, b) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

// Host user and computer name must not leak into anything the guest displays.
function personalDataGuard() {
  const needles = [process.env.USERNAME, process.env.COMPUTERNAME].filter((n) => n && n.length >= 3).map((n) => n.toLowerCase());
  const hits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(TOOLS, full);
      if (needles.some((n) => entry.name.toLowerCase().includes(n))) hits.push(`file name: ${rel}`);
      if (entry.isDirectory()) walk(full);
      else if (/\.(json|reg|md|txt|ini|ya?ml|cpp|h|py|ts|js)$/i.test(entry.name) && fs.statSync(full).size < 2_000_000) {
        const text = fs.readFileSync(full, "latin1").toLowerCase().replace(/\0/g, "");
        if (needles.some((n) => text.includes(n))) hits.push(`content: ${rel}`);
      }
    }
  };
  walk(path.join(TOOLS, "demo"));
  return hits;
}

function sandboxRunning() {
  // tasklist truncates long image names, so match the common prefix.
  const out = spawnSync("tasklist", ["/NH"], { encoding: "utf8" });
  return /WindowsSandbox(RemoteSess|Client)/i.test(out.stdout || "");
}

async function ensureInstaller(version) {
  const res = await fetch(`${GITHUB_API}/releases/tags/v${version}`, {
    headers: { "User-Agent": "tandemcommander-web-shots", Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) throw new Error(`release v${version} is not published on GitHub — screenshots are taken only from published releases`);
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for release v${version}`);
  const release = await res.json();
  if (release.draft) throw new Error(`release v${version} is still a draft`);
  const name = `tandemcommander-${version}-x64-setup.exe`;
  const asset = (release.assets || []).find((a) => a.name === name);
  if (!asset) throw new Error(`release v${version} has no asset named ${name}`);

  fs.mkdirSync(INSTALLERS, { recursive: true });
  const file = path.join(INSTALLERS, name);
  if (!fs.existsSync(file) || fs.statSync(file).size !== asset.size) {
    console.log(`downloading ${name} (${asset.size} bytes)…`);
    const dl = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(300000) });
    if (!dl.ok) throw new Error(`download failed: ${dl.status}`);
    fs.writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
  }
  const size = fs.statSync(file).size;
  if (size !== asset.size) throw new Error(`cached installer is ${size} bytes, the published asset is ${asset.size}`);

  const sig = spawnSync("powershell.exe", ["-NoProfile", "-Command",
    `[Console]::OutputEncoding = [Text.Encoding]::UTF8; $s = Get-AuthenticodeSignature -LiteralPath '${file.replace(/'/g, "''")}'; "$($s.Status)|$($s.SignerCertificate.Subject)"`],
    { encoding: "utf8" });
  const [status, subject] = (sig.stdout || "").trim().split("|");
  if (status !== "Valid") throw new Error(`installer signature is "${status}" — refusing to run an unverified installer`);
  return { name, size, signer: subject };
}

function writeJob(args, installer) {
  fs.rmSync(path.join(SHOTS, "out"), { recursive: true, force: true });
  fs.mkdirSync(path.join(SHOTS, "out"), { recursive: true });
  fs.mkdirSync(path.join(SHOTS, "job"), { recursive: true });
  const job = {
    siteVersion: site.version,
    requestedVersion: args.version,
    installer: installer.name,
    webview2Installer: fs.existsSync(path.join(INSTALLERS, "MicrosoftEdgeWebView2RuntimeInstallerX64.exe"))
      ? "MicrosoftEdgeWebView2RuntimeInstallerX64.exe" : null,
    themeValues: THEME_VALUES,
    scenes: args.scenes,
    theme: args.theme,
    keep: args.keep,
    diagnose: Boolean(args.diagnose),
    uacRestart: args.uacRestart !== false,
  };
  fs.writeFileSync(path.join(SHOTS, "job", "job.json"), JSON.stringify(job, null, 2));
  // The guest reads the scene catalog from the demo folder it already has.
  fs.copyFileSync(path.join(REPO_ROOT, "content", "gallery", "scenes.json"), path.join(TOOLS, "demo", "scenes.json"));

  const map = (host, guest, readOnly) =>
    `    <MappedFolder><HostFolder>${host}</HostFolder><SandboxFolder>${guest}</SandboxFolder><ReadOnly>${readOnly}</ReadOnly></MappedFolder>`;
  const wsb = [
    "<Configuration>",
    "  <Networking>Disable</Networking>",
    "  <ClipboardRedirection>Disable</ClipboardRedirection>",
    "  <PrinterRedirection>Disable</PrinterRedirection>",
    "  <AudioInput>Disable</AudioInput>",
    "  <VideoInput>Disable</VideoInput>",
    "  <MappedFolders>",
    map(path.join(TOOLS, "guest"), "C:\\guest", true),
    map(path.join(TOOLS, "demo"), "C:\\demo", true),
    map(INSTALLERS, "C:\\installer", true),
    map(path.join(SHOTS, "job"), "C:\\job", true),
    map(path.join(SHOTS, "out"), "C:\\out", false),
    "  </MappedFolders>",
    `  <LogonCommand><Command>powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\guest\\${args.diagnose ? "diagnose.ps1" : "run.ps1"}</Command></LogonCommand>`,
    "</Configuration>",
    "",
  ].join("\r\n");
  const wsbFile = path.join(SHOTS, "run.wsb");
  fs.writeFileSync(wsbFile, wsb);
  return wsbFile;
}

async function waitForResult(resultName = "result.json") {
  const progressFile = path.join(SHOTS, "out", "progress.jsonl");
  const resultFile = path.join(SHOTS, "out", resultName);
  const started = Date.now();
  let seen = 0;
  while (Date.now() - started < OVERALL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1000));
    // Read through a copy: the guest appends to this file across a shared
    // folder, where holding it open makes the guest's own write fail.
    let lines = null;
    try {
      if (fs.existsSync(progressFile)) {
        const copy = progressFile + ".read";
        fs.copyFileSync(progressFile, copy);
        lines = fs.readFileSync(copy, "utf8").split(/\r?\n/).filter(Boolean);
        fs.rmSync(copy, { force: true });
      }
    } catch { /* the guest is mid-write; try again next tick */ }
    if (lines) {
      for (const line of lines.slice(seen)) {
        try {
          const e = JSON.parse(line.replace(/^\uFEFF/, ""));
          const detail = [e.id && `${e.id}/${e.theme}`, e.status, e.version, e.reason].filter(Boolean).join("  ");
          console.log(`  [guest] ${e.event}${detail ? "  " + detail : ""}`);
        } catch { /* half-written line */ }
      }
      seen = lines.length;
    }
    if (fs.existsSync(resultFile)) {
      await new Promise((r) => setTimeout(r, 500));
      return JSON.parse(fs.readFileSync(resultFile, "utf8").replace(/^\uFEFF/, ""));
    }
  }
  throw new Error(`no result after ${OVERALL_TIMEOUT_MS / 60000} minutes — is the Sandbox window stuck on a dialog? (${resultFile})`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.diagnose) args.keep = false;
  const problems = [];
  if (process.platform !== "win32") problems.push("screenshots are captured on Windows 11 Pro only");
  if (!/^\d+\.\d+\.\d+$/.test(args.version)) problems.push(`"${args.version}" is not a version`);
  else if (compareVersions(args.version, site.version) < 0) {
    problems.push(`requested version ${args.version} is older than the site's version ${site.version} — images of an older version are never published under a newer label`);
  }
  if (args.theme && !THEME_VALUES.hasOwnProperty(args.theme)) problems.push(`--theme must be light or dark`);
  const leaks = personalDataGuard();
  for (const hit of leaks) problems.push(`host user or computer name found in demo content — ${hit}`);
  if (!args.dryRun && !fs.existsSync(SANDBOX_EXE)) {
    problems.push(
      "Windows Sandbox is not enabled. One-time setup (needs a reboot): Settings → System → Optional features → " +
      "More Windows features → tick \"Windows Sandbox\"; or in an elevated PowerShell: " +
      "Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All"
    );
  }
  if (!args.dryRun && sandboxRunning()) {
    problems.push("a Windows Sandbox is already open — only one can run at a time. Close its window and start again.");
  }
  if (problems.length) return fail(problems);

  let installer;
  try {
    installer = await ensureInstaller(args.version);
  } catch (err) {
    return fail(err.message);
  }
  console.log(`installer   ${installer.name}  ${installer.size} bytes  signature valid`);
  console.log(`            ${installer.signer}`);

  if (args.dryRun) {
    console.log(`dry run     would capture version ${args.version}: spike scenes main-window/light, markdown-viewer/light`);
    console.log("            nothing started");
    return;
  }

  const wsb = writeJob(args, installer);
  console.log(`starting Windows Sandbox (${path.relative(REPO_ROOT, wsb)}) — keep its window open and un-minimised`);
  spawn(SANDBOX_EXE, [wsb], { detached: true, stdio: "ignore" }).unref();

  const result = await waitForResult(args.diagnose ? "diagnose.json" : "result.json");
  if (args.diagnose) {
    console.log("\n── environment probe ─────────────────────────────────");
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("\n── result ────────────────────────────────────────────");
  if (result.app) console.log(`application  ${result.app.version} build ${result.app.build}`);
  if (result.environment) console.log(`environment  ${result.environment.kind}, dpi ${result.environment.dpi}, base config: ${result.environment.baseConfig}`);
  for (const [k, v] of Object.entries(result.checks || {})) console.log(`check        ${k}: ${v}`);
  if (result.status === "refused" || result.status === "error") {
    console.error(`✗ ${result.status}: ${result.reason}`);
    process.exitCode = result.status === "refused" ? 1 : 2;
    return;
  }
  let failed = 0;
  for (const s of result.scenes || []) {
    if (s.status === "ok") console.log(`  ✓ ${s.id}/${s.theme}  ${s.width}×${s.height}  dominant colour ${s.dominantColourShare}  ${s.ms} ms`);
    else if (s.status === "skipped") console.log(`  – ${s.id}/${s.theme}  skipped: ${s.reason} (previous image kept)`);
    else { failed++; console.log(`  ✗ ${s.id}/${s.theme}  ${s.reason}${s.evidence ? `  (evidence: ${s.evidence}, foreground: "${s.foregroundTitle}")` : ""}`); }
  }
  // PNG → the two WebP variants the site serves + the capture manifest.
  // The catalog is read raw here: loadGallery() also checks that every scene
  // has its images, which is exactly what this step is about to produce.
  const scenes = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "content", "gallery", "scenes.json"), "utf8"));
  const { written, problems: imageProblems } = await postprocess({
    outDir: path.join(SHOTS, "out"),
    result,
    scenes,
  });
  console.log("\n── images ────────────────────────────────────────────");
  for (const w of written) {
    console.log(`  ${w.key}  ${w.width}×${w.height}  full ${Math.round(w.fullBytes / 1024)} KB, card ${Math.round(w.cardBytes / 1024)} KB`);
  }
  for (const p of imageProblems) console.error(`  ✗ ${p}`);
  console.log(`\nraw captures: ${path.relative(REPO_ROOT, path.join(SHOTS, "out"))}`);
  console.log(`contact sheet: ${path.relative(REPO_ROOT, path.join(SHOTS, "contact-sheet.html"))} — review every image for personal data`);
  if (written.some((w) => w.key.startsWith("main-window/"))) {
    console.log("src/assets/screenshot-light.png regenerated (the address software catalogues fetch through /pad.xml)");
  }
  if (imageProblems.length) process.exitCode = 3;
  else if (failed) process.exitCode = 2;
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exitCode = 2;
});
