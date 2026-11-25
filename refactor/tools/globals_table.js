// Table of the page globals (slice 8 step 16a): one row and one ID per `window` property of the running page, classified
// necessary or spurious (criterion: "can it be imported?", maintainer 2026-11-25).
// Usage (repo root):
//   node refactor/tools/modularity_scan.js <dir holding node_modules/acorn> $TMPDIR/facts.json
//   (dump: run refactor/tools/globals_probe_test.py as a browser test, PROBE_OUT=$TMPDIR/windump.json)
//   node refactor/tools/globals_table.js $TMPDIR/facts.json $TMPDIR/windump.json
// Writes refactor/analysis/09-globals-table.md and refactor/tools/globals_ids.json (name -> ID, frozen: a new name gets the next number).
// Reads facts, the dump, the sources, the templates and the browser tests; runs no page code.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const JS = path.join(ROOT, "labelbee/static/labelbee/js");
const facts = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dump = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const OUT = path.join(ROOT, "refactor/analysis/09-globals-table.md");
const IDS = path.join(__dirname, "globals_ids.json");
const ids = fs.existsSync(IDS) ? JSON.parse(fs.readFileSync(IDS, "utf8")) : {};
const walk = (d, f) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "extern" ? [] : walk(path.join(d, e.name), f)) : f(e.name) ? [path.join(d, e.name)] : []));
const wordRe = (n) => new RegExp("(?<![\\w$.])" + n.replace(/\$/g, "\\$") + "(?![\\w$])");

// 1. What our code puts on window, and from which module: the bridge's imports, then install(...) / installGlobals({...}) / window.X =.
const owners = {}; // name -> file
const bridge = fs.readFileSync(path.join(JS, "labelbeeBridge.js"), "utf8");
const importFrom = {}; // local binding -> file
for (const m of bridge.matchAll(/import\s+(?:\*\s+as\s+(\w+)|\{([^}]*)\}|(\w+))\s+from\s+'\.\/([^']+)'/g)) {
  const file = m[4];
  if (m[1] || m[3]) importFrom[m[1] || m[3]] = file;
  else for (const part of m[2].split(",")) { const [a, b] = part.trim().split(/\s+as\s+/); if (a) importFrom[b || a] = file; }
}
for (const m of bridge.matchAll(/install\(\s*(\w+)\s*,\s*\[([^\]]*)\]/g)) for (const n of m[2].matchAll(/"([\w$]+)"/g)) owners[n[1]] = importFrom[m[1]] || "labelbeeBridge.js";
for (const m of bridge.matchAll(/installGlobals\(\{([^}]*)\}\)/g)) for (const n of m[1].split(",")) { const k = n.trim().split(":")[0].trim(); if (k) owners[k] = importFrom[k] || "labelbeeBridge.js"; }
for (const f of walk(JS, (n) => n.endsWith(".js"))) {
  const rel = path.relative(JS, f), src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bwindow\.([\w$]+)\s*=(?!=)\s*([\w$.]*)/g)) if (!owners[m[1]]) owners[m[1]] = (rel === "labelbeeBridge.js" && importFrom[m[2].split(".")[0]]) || rel;
}
// files that install names in a loop (`for (const name of [...]) window[name] = x[name]`): the names quoted in the file belong to its module
for (const f of walk(JS, (n) => n.endsWith(".js"))) {
  const src = fs.readFileSync(f, "utf8"), rel = path.relative(JS, f);
  if (rel === "labelbeeBridge.js" || !/window\[\w+\]\s*=/.test(src)) continue;
  const imp = src.match(/import\s+(?:\*\s+as\s+\w+|\{[^}]*\})\s+from\s+'([^']+)'/);
  const target = imp ? path.relative(JS, path.resolve(path.dirname(f), imp[1])) : rel;
  for (const m of src.matchAll(/'([\w$]+)'/g)) if (!owners[m[1]] && /^[a-zA-Z_]/.test(m[1])) owners[m[1]] = target;
}
owners.AnnotationStore = owners.events = owners.installDebugGlobals = "annotation/AnnotationStoreBridge.js"; // set through `target.X =` (installLegacyGlobals)
// implicit globals written without declaration (the scan): owner = the file of the writer
for (const u of facts.units) for (const [n, r] of Object.entries(u.refs || {})) if (r.write && !owners[n] && /^[a-z]/.test(n) && !["window", "document", "console"].includes(n)) owners[n] = owners[n] || u.file + " (implicit)";

// 2. Handlers of the pages (template attributes and generated HTML) and inline scripts of the labelbee page.
const handlerRoots = {};
for (const h of facts.htmlHandlers) { const r = h.call.split(".")[0]; handlerRoots[r] = (handlerRoots[r] || 0) + 1; }
const tplFiles = ["labelbee/blueprints/labelbee/templates/labelbee_page.html", "labelbee/blueprints/templates/layout.html", "labelbee/blueprints/templates/common/macros.html"].map((p) => path.join(ROOT, p));
// only the inline <script> blocks (no src), without comments: what runs in the page itself
const scriptText = tplFiles.filter(fs.existsSync).map((f) => fs.readFileSync(f, "utf8")).join("\n")
  .replace(/<!--[\s\S]*?-->/g, " ").match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g)?.join("\n").replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/[^\n]*/g, " ") || "";

// every identifier inside an inline handler attribute of the templates (`onclick="videoControl.rewind(videoToolbar.stepMinute)"`, also a malformed `onkeypress="f(event)""`)
const handlerWords = new Set();
for (const f of walk(path.join(ROOT, "labelbee/blueprints"), (n) => n.endsWith(".html"))) {
  for (const m of fs.readFileSync(f, "utf8").replace(/<!--[\s\S]*?-->/g, " ").matchAll(/\bon[a-z]+\s*=\s*"([^"]*)"/g)) for (const w of m[1].matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)) handlerWords.add(w[0]);
}

// 3. Module readers: files that use the name without importing or declaring it.
const imported = {}; // file -> Set of local names
for (const i of facts.imports) (imported[i.from] = imported[i.from] || new Set(), i.locals.forEach((l) => imported[i.from].add(l)));
const declared = {}; // file -> Set of top-level names
for (const u of facts.units) if (!u.owner) (declared[u.file] = declared[u.file] || new Set()).add(u.name);
const readers = {}; // name -> Set of files
for (const u of facts.units) for (const [n, r] of Object.entries(u.refs || {})) {
  if (!(r.read || r.call || r.write || r.mutate) || u.file === "labelbeeBridge.js") continue;
  if ((imported[u.file] || new Set()).has(n) || (declared[u.file] || new Set()).has(n)) continue;
  (readers[n] = readers[n] || new Set()).add(u.file);
}

// 4. Tests and console: browser tests, golden tests.
const testFiles = walk(path.join(ROOT, "refactor/tests"), (n) => /\.(py|js)$/.test(n) && !/^generate|dirty_writes/.test(n));
const testText = testFiles.map((f) => [f, fs.readFileSync(f, "utf8")]);

const LIB = new Set(["$", "jQuery", "fabric", "d3", "DataTable", "jsGrid", "FrameRates", "LRUCache", "ResizeSensor", "numeric", "PerspT", "initSqlJs", "bootstrap", "DataTable", "$_GET_PARAMETERS"]);
const rows = dump.map((d) => {
  const n = d.name;
  const handlers = handlerRoots[n] || (handlerWords.has(n) ? 1 : 0);
  const script = wordRe(n).test(scriptText);
  const mods = [...(readers[n] || [])].filter((f) => f !== (owners[n] || "").split(" ")[0]).sort();
  const tests = testText.filter(([, t]) => wordRe(n).test(t)).length;
  const owner = owners[n] || "";
  let verdict, why;
  if (!owner && (LIB.has(n) || /^(\$|jQuery|\$jscomp)/.test(n))) { verdict = "N"; why = "library"; }
  else if (!owner && !handlers && !script) { verdict = "?"; why = "owner not found"; }
  else if (handlers) { verdict = "N"; why = "handler"; }
  else if (script) { verdict = "N"; why = "page script"; }
  else if (mods.length) { verdict = "S"; why = /implicit/.test(owner) ? "state read by modules, no exporting owner" : "read by modules, importable"; }
  else if (tests) { verdict = "N"; why = "tests, console"; }
  else { verdict = "S"; why = "no reader"; }
  return { name: n, type: d.type === "object" ? (d.ctor && d.ctor !== "Object" ? "obj:" + d.ctor : "obj") : d.type, owner, verdict, why, handlers, script, mods, tests };
}).sort((a, b) => a.name.localeCompare(b.name));
let next = Object.values(ids).reduce((m, id) => Math.max(m, Number(id.slice(1))), 0) + 1;
for (const r of rows) { if (!ids[r.name]) ids[r.name] = "G" + String(next++).padStart(3, "0"); r.id = ids[r.name]; }
fs.writeFileSync(IDS, JSON.stringify(ids, null, 1) + "\n");

const cnt = (f) => rows.filter(f).length;
const md = [
  "# Globals table (generated by refactor/tools/globals_table.js, do not edit)\n",
  `${rows.length} own properties of \`window\` on the running page (labelbee page, a video and events loaded), minus a blank page. IDs are frozen in \`refactor/tools/globals_ids.json\`.`,
  `Necessary (N) ${cnt((r) => r.verdict === "N")}, spurious (S) ${cnt((r) => r.verdict === "S")}. Criterion and families: [09-globals.md](09-globals.md).\n`,
  "| ID | Name | Type | Owner | Verdict | Why | Handlers | Page script | Module readers | Test files |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | ${r.name} | ${r.type} | ${r.owner} | ${r.verdict} | ${r.why} | ${r.handlers || ""} | ${r.script ? "yes" : ""} | ${r.mods.length ? r.mods.length + ": " + r.mods.slice(0, 4).join(", ") + (r.mods.length > 4 ? ", ..." : "") : ""} | ${r.tests || ""} |`),
];
fs.writeFileSync(OUT, md.join("\n") + "\n");
fs.writeFileSync(path.join(process.env.TMPDIR || "/tmp", "globals_rows.json"), JSON.stringify(rows));
const by = {};
for (const r of rows) by[r.verdict + " " + r.why] = (by[r.verdict + " " + r.why] || 0) + 1;
console.log(rows.length, by);
