// Globals inventory (slice 8, ADR 0015 step 1): for every global of the classic scripts, who defines it, what kind it is,
// and which other files read, call or write it; plus the globals named by inline handlers of the page, and the
// implicit globals (writes to a name that is declared nowhere).
// Usage (repo root):
//   node refactor/tools/modularity_scan.js <dir holding node_modules/acorn> $TMPDIR/facts.json
//   node refactor/tools/globals_inventory.js $TMPDIR/facts.json [out-prefix]
// Writes (default) refactor/scratch/globals-inventory.{json,md}. Reads the facts of the scan only, runs no page code.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const IN = process.argv[2];
if (!IN) { console.error("usage: node globals_inventory.js <facts.json> [out-prefix]"); process.exit(1); }
const OUT = process.argv[3] || path.join(ROOT, "refactor/scratch/globals-inventory");
const facts = JSON.parse(fs.readFileSync(IN, "utf8"));
const classic = new Set(facts.scripts.filter((s) => !s.module).map((s) => s.file));
const isTop = (u) => ["var", "function", "class"].includes(u.kind) && !u.owner;

// 1. Definitions: top-level names of classic scripts, and names a module puts on window (the bridges).
const defs = new Map(); // name -> {file, kind, ...}
const methodsOf = {};
for (const u of facts.units) if (u.owner && ["method", "ctor", "getter", "setter"].includes(u.kind)) (methodsOf[u.owner] = methodsOf[u.owner] || []).push(u);
for (const u of facts.units) {
  if (!isTop(u) || u.toplevel) continue;
  const viaWindow = !classic.has(u.file) && u.viaWindow;
  if (!classic.has(u.file) && !viaWindow) continue;
  for (const name of u.names || [u.name]) {
    if (defs.has(name) && classic.has(defs.get(name).file)) { defs.get(name).duplicates = (defs.get(name).duplicates || []).concat(u.file + ":" + u.line); continue; }
    let role = "state";
    if (u.kind === "class" || methodsOf[name]) role = "class";
    else if (u.instanceOf) role = "instance of " + u.instanceOf;
    else if (u.kind === "function") role = "function";
    else if (u.initType === "ObjectExpression") role = "namespace object";
    else if (u.declKind === "const") role = "constant";
    defs.set(name, { name, file: u.file, line: u.line, role, declKind: u.declKind, viaWindow: !!viaWindow, implicit: u.declKind === "implicit", alias: u.alias, members: u.objectKeys, nMethods: (methodsOf[name] || []).length, lines: u.end - u.line + 1 });
  }
}

// 2. Uses: per defined name, per other file, aggregate of the refs of every unit of that file.
const uses = {}; // name -> file -> {read, write, call, mutate, units: Set}
const undeclared = {}; // name -> {write, files}
const allRefs = {}; // name -> {units: Set, files: Set, read}: every unit touching a name, for the implicit globals
for (const u of facts.units) {
  for (const [name, r] of Object.entries(u.refs || {})) {
    const a = (allRefs[name] = allRefs[name] || { units: new Set(), files: new Set(), read: 0 });
    a.units.add(u.file + ":" + u.name); a.files.add(u.file); a.read += r.read + r.call;
    if (defs.has(name)) {
      const d = defs.get(name);
      if (u.file === d.file) continue;
      const f = ((uses[name] = uses[name] || {})[u.file] = (uses[name][u.file] || { read: 0, write: 0, call: 0, mutate: 0, units: new Set() }));
      for (const k of ["read", "write", "call", "mutate"]) f[k] += r[k];
      f.units.add(u.name);
    } else if (r.write) { // write to a name nobody declares: implicit global (or a library global)
      const x = (undeclared[name] = undeclared[name] || { write: 0, files: new Set() });
      x.write += r.write; x.files.add(u.file + ":" + u.name);
    }
  }
}

// 3. Inline handlers: the first identifier of each call, resolved against the globals.
const handlers = {};
for (const h of facts.htmlHandlers) { const root = h.call.split(".")[0]; (handlers[root] = handlers[root] || new Set()).add(h.call); }

// 4. Assemble.
const rows = [...defs.values()].map((d) => {
  const u = uses[d.name] || {};
  const files = Object.keys(u);
  const tot = (k) => files.reduce((a, f) => a + u[f][k], 0);
  return { ...d, readers: files.length, files: Object.fromEntries(files.map((f) => [f, { read: u[f].read, call: u[f].call, write: u[f].write + u[f].mutate }])), read: tot("read"), call: tot("call"), write: tot("write") + tot("mutate"), handlers: handlers[d.name] ? [...handlers[d.name]] : [] };
});
const classicRows = rows.filter((r) => classic.has(r.file));
const bridgeRows = rows.filter((r) => !classic.has(r.file));
const unresolvedHandlers = Object.keys(handlers).filter((h) => !defs.has(h)).sort();
const implicit = Object.entries(undeclared).filter(([n]) => !/^(window|document|console|module|exports|\[\])$/.test(n)).map(([name, x]) => {
  const a = allRefs[name];
  const shared = a.units.size >= 2; // one unit only: a forgotten `var` of a temporary; several: real shared state
  return { name, kind: shared ? "shared" : "leak", write: x.write, units: a.units.size, files: [...a.files], where: [...x.files].slice(0, 6) };
}).sort((a, b) => (a.kind === b.kind ? b.units - a.units : a.kind === "shared" ? -1 : 1));

// per file summary and the file -> file matrix (number of references)
const perFile = {};
for (const f of classic) perFile[f] = { globals: 0, state: 0, functions: 0, classes: 0, instances: 0, usedElsewhere: 0, onlyLocal: 0, inRefs: 0, outRefs: 0, outFiles: {} };
for (const r of classicRows) {
  const p = perFile[r.file]; p.globals++;
  if (r.role === "state" || r.role === "constant" || r.role === "namespace object") p.state++;
  else if (r.role === "function") p.functions++;
  else if (r.role === "class") p.classes++;
  else p.instances++;
  if (r.readers) p.usedElsewhere++; else p.onlyLocal++;
  p.inRefs += r.read + r.call + r.write;
  for (const [f, c] of Object.entries(r.files)) { const n = c.read + c.call + c.write; if (perFile[f]) { perFile[f].outRefs += n; perFile[f].outFiles[r.file] = (perFile[f].outFiles[r.file] || 0) + n; } }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT + ".json", JSON.stringify({ perFile, globals: classicRows, bridges: bridgeRows, implicit, unresolvedHandlers }, null, 1));

const md = [];
md.push("# Globals inventory (generated by refactor/tools/globals_inventory.js, do not edit)\n");
md.push(`${classicRows.length} globals of ${classic.size} classic scripts; ${bridgeRows.length} names put on window by modules; ${facts.htmlHandlers.length} inline handler calls.\n`);
md.push("## Per file\n\n`in` = references to the file's globals from other files, `out` = references by this file to other files' globals. `state` = variables, constants, namespace objects.\n");
md.push("| File | globals | state | fn | class | instances | used elsewhere | local only | in | out | main dependencies (refs) |\n|---|---|---|---|---|---|---|---|---|---|---|");
for (const [f, p] of Object.entries(perFile).sort((a, b) => a[1].outRefs - b[1].outRefs)) md.push(`| ${f} | ${p.globals} | ${p.state} | ${p.functions} | ${p.classes} | ${p.instances} | ${p.usedElsewhere} | ${p.onlyLocal} | ${p.inRefs} | ${p.outRefs} | ${Object.entries(p.outFiles).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k.replace(/\.js$/, "") + ":" + v).join(", ")} |`);
md.push("\n## Globals read or written by other files\n\nSorted by file then by total references. `w` = writes from other files (state owned by one file, changed by another).\n");
md.push("| Global | File:line | Role | refs | w | readers (file:read/call/write) | inline handlers |\n|---|---|---|---|---|---|---|");
for (const r of classicRows.filter((x) => x.readers).sort((a, b) => a.file.localeCompare(b.file) || b.read + b.call + b.write - (a.read + a.call + a.write))) md.push(`| ${r.name} | ${r.file}:${r.line} | ${r.role} | ${r.read + r.call + r.write} | ${r.write} | ${Object.entries(r.files).map(([f, c]) => f.replace(/\.js$/, "") + ":" + c.read + "/" + c.call + "/" + c.write).join(", ")} | ${r.handlers.length} |`);
md.push("\n## Globals used by inline handlers of the page\n");
md.push("| Handler root | defined in | role | calls |\n|---|---|---|---|");
for (const [root, set] of Object.entries(handlers).sort()) { const d = defs.get(root); md.push(`| ${root} | ${d ? d.file + ":" + d.line : "(not found: DOM, library or bridge)"} | ${d ? d.role : ""} | ${[...set].slice(0, 4).join(", ")}${set.size > 4 ? ", ..." : ""} |`); }
md.push("\n## Names put on window by modules (the bridges)\n");
md.push("| Name | File | Role | readers |\n|---|---|---|---|");
for (const r of bridgeRows.sort((a, b) => a.file.localeCompare(b.file))) md.push(`| ${r.name} | ${r.file}:${r.line} | ${r.role}${r.alias ? " (alias of " + r.alias + ")" : ""} | ${Object.keys(r.files).map((f) => f.replace(/\.js$/, "")).join(", ") || "-"} |`);
md.push("\n## Implicit globals (written, declared nowhere)\n\nA module is strict: each of these throws once its file becomes a module. Library names (`$`, `fabric`...) are not written, so they do not appear.\n");
md.push("`shared`: touched by two or more functions (state of the page, to be declared in its owner); `leak`: one function only (a forgotten `var` of a temporary, to be declared there).\n");
md.push("| Name | kind | writes | functions | files | where written |\n|---|---|---|---|---|---|");
for (const x of implicit) md.push(`| ${x.name} | ${x.kind} | ${x.write} | ${x.units} | ${x.files.map((f) => f.replace(/\.js$/, "")).join(", ")} | ${x.where.slice(0, 3).join(", ")} |`);
const dup = classicRows.filter((r) => r.duplicates);
md.push("\n## Names declared twice in classic scripts\n");
for (const r of dup) md.push(`- ${r.name}: ${r.file}:${r.line} and ${r.duplicates.join(", ")}`);
fs.writeFileSync(OUT + ".md", md.join("\n") + "\n");
console.log("globals", classicRows.length, "bridges", bridgeRows.length, "implicit", implicit.length, "->", path.relative(ROOT, OUT) + ".{json,md}");
