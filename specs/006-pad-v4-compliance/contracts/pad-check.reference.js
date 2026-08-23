// Feasibility probe for spec 006: can the vendored PAD 4.0 spec drive a JS
// build gate? Compiles all 104 field regexes in JS and validates public/pad.xml.
const fs = require("fs");
const specPath = process.argv[2];
const padPath = process.argv[3];

const un = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
   .replace(/&#39;/g, "'").replace(/&amp;/g, "&");

const tag = (name) => new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">");

const src = fs.readFileSync(specPath, "utf8");
const specVersion = tag("PAD_Spec_Version").exec(src)[1];

const fields = [...src.matchAll(/<Field>([\s\S]*?)<\/Field>/g)].map((m) => {
  const chunk = m[1];
  const g = (t) => {
    const r = tag(t).exec(chunk);
    return r ? un(r[1]) : "";
  };
  return { name: g("Name"), path: g("Path"), doc: g("RegExDocumentation"), rxRaw: g("RegEx") };
});

console.log(`PAD_Spec_Version: ${specVersion}`);
console.log(
  `parsed fields: ${fields.length}` +
  ` | empty paths: ${fields.filter((f) => !f.path).length}` +
  ` | empty regexes: ${fields.filter((f) => !f.rxRaw).length}`
);

// PAD regexes are .NET-flavoured: \Z = end of input -> JS $ (no /m flag).
let compileFails = 0;
for (const f of fields) {
  try {
    f.re = new RegExp(f.rxRaw.replace(/\\Z/g, "$"));
  } catch (e) {
    compileFails++;
    f.re = null;
    console.log(`  COMPILE FAIL ${f.name}: ${e.message}`);
  }
}
console.log(`JS compile failures: ${compileFails} / ${fields.length}`);

// Minimal tree walk over the attribute-free paired-tag XML the build emits.
function parse(s) {
  const doc = { name: "#doc", children: [], text: "" };
  const stack = [doc];
  let pos = s.indexOf("?>") + 2;
  while (pos < s.length) {
    const lt = s.indexOf("<", pos);
    if (lt < 0) break;
    stack[stack.length - 1].text += s.slice(pos, lt);
    const gt = s.indexOf(">", lt);
    const name = s.slice(lt + 1, gt).trim();
    if (name.startsWith("/")) stack.pop();
    else {
      const node = { name, children: [], text: "" };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    pos = gt + 1;
  }
  return doc.children[0];
}

const root = parse(fs.readFileSync(padPath, "utf8"));
const get = (p) => {
  let node = root;
  for (const el of p.split("/").slice(1)) {
    node = node.children.find((c) => c.name === el);
    if (!node) return null;
  }
  return un(node.text).trim();
};

const viol = [];
const absent = [];
let ok = 0;
for (const f of fields) {
  const v = get(f.path);
  if (v === null) {
    absent.push(f.path);
    continue;
  }
  if (f.re && f.re.test(v)) ok++;
  else viol.push([f.path, JSON.stringify(v).slice(0, 50), f.doc]);
}

console.log(`\nverdict -> present&valid: ${ok} | violations: ${viol.length} | absent: ${absent.length}`);
for (const [p, v, doc] of viol) console.log(`  VIOL ${p} = ${v}\n       needs: ${doc}`);

// Which absent elements could legally be emitted empty, and which could not?
const cannotBeEmpty = [];
for (const f of fields) {
  if (get(f.path) !== null) continue;
  if (!f.re.test("")) cannotBeEmpty.push(f.name);
}
console.log(`\nabsent elements whose pattern FORBIDS an empty value (must stay omitted): ${cannotBeEmpty.length}`);
console.log("  " + cannotBeEmpty.join(", "));

const unconstrained = fields.filter((f) => !f.rxRaw).map((f) => f.name);
console.log(`\nfields with an EMPTY <RegEx> (no constraint at all): ${unconstrained.length}`);
console.log("  " + unconstrained.join(", "));

const emittedEmptyLegally = fields
  .filter((f) => get(f.path) === "" && f.re.test(""))
  .map((f) => f.name);
console.log(`\nemitted empty and LEGAL under 4.0 (may stay as empty elements): ${emittedEmptyLegally.length}`);
console.log("  " + emittedEmptyLegally.join(", "));
