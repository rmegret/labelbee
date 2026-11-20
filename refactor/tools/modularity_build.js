// Modularity map, stage 2: boxes, interfaces and edges from the facts of modularity_scan.js and modularity_config.json.
// Usage (repo root): node refactor/tools/modularity_build.js [facts.json] [out.json]
//   defaults: refactor/scratch/modularity-facts.json -> refactor/scratch/modularity-boxes.json
// Box = a class (ES class, or constructor function with prototype methods) or the globals of one file (classic script
// or ES module). A big box is cut into sub-blocks by concern (config "splits"). Interface of a member = how the OTHER
// boxes use it: read-only (read, or a function that returns a value without writing state), write/input (a function
// that does something, a signal slot), read/write (a field or global variable that others also assign).
// Red lists per sub-block: global variables of other boxes it touches, and the calls it makes / receives.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const facts = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ROOT, "refactor/scratch/modularity-facts.json"), "utf8"));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "modularity_config.json"), "utf8"));
const OUT = process.argv[3] || path.join(ROOT, "refactor/scratch/modularity-boxes.json");
const LIB = new Set(("window document console Math JSON Object Array String Number Boolean Date Promise Set Map WeakMap Symbol Error RegExp Image Blob URL FileReader FormData XMLHttpRequest fetch setTimeout clearTimeout setInterval clearInterval " +
  "requestAnimationFrame cancelAnimationFrame performance navigator location history localStorage sessionStorage alert confirm prompt parseInt parseFloat isNaN isFinite Infinity NaN undefined arguments encodeURIComponent decodeURIComponent " +
  "Function Reflect Uint8Array Float32Array Float64Array Int32Array ArrayBuffer MutationObserver ResizeObserver CustomEvent Event KeyboardEvent MouseEvent Element HTMLElement globalThis structuredClone queueMicrotask " +
  "$ jQuery d3 fabric VideoFrame LRUCache ResizeSensor PerspectiveTransform perspectiveTransform jsGrid Papa DataTable saveAs Sortable require module exports define").split(/\s+/));

const U = facts.units;
const foldFile = (f) => cfg.fold[f] || f;
const isModuleFile = new Map(facts.scripts.map((s) => [s.file, s.module]));
const scriptOrder = new Map(facts.scripts.map((s, i) => [s.file, i]));

// ---------- classes -------------------------------------------------------------------------------------------------
const classes = new Map(); // name -> {name, file, es}
for (const u of U) if (u.kind === "class") classes.set(u.name, { name: u.name, file: u.file, es: true });
for (const u of U) if (u.owner && !classes.has(u.owner)) { const c = U.find((x) => x.name === u.owner && (x.kind === "function" || x.kind === "var")); classes.set(u.owner, { name: u.owner, file: c ? c.file : u.file, es: false }); }
const isCtorUnit = (u) => (u.kind === "class" || u.kind === "function") && classes.has(u.name) && !u.owner;

// ---------- boxes and sub-blocks ----------------------------------------------------------------------------------------
const boxes = new Map(); // id -> box
const subOf = (file, line) => { const sp = cfg.splits[file]; if (!sp) return ""; for (const [a, b, n] of sp) if (line >= a && line <= b) return n; return "other"; };
const topicOf = (box, file) => {
  const t = cfg.topics; if (t.byBox[box.name]) return t.byBox[box.name];
  for (const k of Object.keys(t.byFile)) if (k.endsWith("/") ? file.startsWith(k) : file === k) return t.byFile[k];
  return "shell";
};
function getBox(id, kind, name, file) {
  let b = boxes.get(id);
  if (!b) { b = { id, kind, name, file, files: new Set(), subs: new Map(), topic: null }; boxes.set(id, b); }
  b.files.add(file); return b;
}
function getSub(box, name) {
  let s = box.subs.get(name);
  if (!s) { s = { key: box.id + "|" + name, name, box: box.id, members: new Map(), units: 0, lines: 0, reds: { globals: new Map(), calls: new Map(), calledBy: new Map() } }; box.subs.set(name, s); }
  return s;
}
function placeUnit(u) { // -> {box, sub}
  const sub0 = subOf(u.file, u.line);
  if (u.owner) { const b = getBox("class:" + u.owner, "class", u.owner, classes.get(u.owner).file); return { box: b, sub: getSub(b, sub0) }; }
  if (isCtorUnit(u)) { const b = getBox("class:" + u.name, "class", u.name, u.file); return { box: b, sub: getSub(b, sub0) }; }
  const f = foldFile(u.file); const b = getBox("file:" + f, isModuleFile.get(f) ? "module" : "file", f, f);
  return { box: b, sub: getSub(b, sub0) };
}
for (const u of U) { const p = placeUnit(u); u.box = p.box.id; u.subKey = p.sub.key; p.sub.units++; p.sub.lines += u.end - u.line + 1; }

// ---------- members ------------------------------------------------------------------------------------------------------
const members = new Map(); // box::name -> member
function member(box, sub, name, kind, unit) {
  const k = box.id + "::" + name; let m = members.get(k);
  if (!m) { m = { key: k, box: box.id, sub: sub.key, name, kind, unit: unit || null, ext: { read: 0, write: 0, call: 0, signal: 0 }, callers: new Set(), callerUnits: new Set() }; members.set(k, m); sub.members.set(name, m); }
  else if (unit && !m.unit) { m.unit = unit; m.kind = kind; }
  return m;
}
const memberKind = (u) => (u.kind === "var" ? "var" : u.kind === "field" ? "field" : u.kind === "function" ? "fn" : u.kind === "getter" ? "get" : u.kind === "setter" ? "set" : u.kind === "ctor" ? "ctor" : "fn");
const globalsTable = new Map(); // global name -> {kind:'fn'|'var'|'class'|'singleton', box, name}
const singletonOf = new Map(); // global name -> box id (class or module) ; instance of
const fieldInstance = new Map(); // class -> {field -> class}

const sorted = [...U].sort((a, b) => (scriptOrder.get(a.file) ?? 99) - (scriptOrder.get(b.file) ?? 99) || a.line - b.line);
for (const u of sorted) {
  const box = boxes.get(u.box); const sub = [...box.subs.values()].find((s) => s.key === u.subKey);
  if (u.kind === "toplevel") continue;
  if (u.owner) {
    if (u.kind === "localfn") { u.localOf = u.local; continue; } // attached to its class member below
    const nm = u.member; if (u.private) { member(box, sub, nm, memberKind(u), u); continue; }
    member(box, sub, nm, u.static ? "static" : memberKind(u), u);
    continue;
  }
  if (isCtorUnit(u)) { for (const f of Object.keys(u.thisWrites || {})) { const m = member(box, sub, f, "field", null); if (u.thisAlias && u.thisAlias[f]) { const lf = U.find((x) => x.kind === "localfn" && x.owner === u.name && x.local === u.thisAlias[f]); if (lf) { m.unit = lf; m.kind = "fn"; } } } continue; }
  // free function / variable of a file
  const isGlobalDecl = !isModuleFile.get(u.file) || u.viaWindow || u.declKind === "window";
  const isExport = isModuleFile.get(u.file) ? (facts.exports[u.file] || []).includes(u.name) : true;
  const m = member(box, sub, u.name, memberKind(u), u);
  if (u.kind === "var" || u.kind === "function") {
    if (isGlobalDecl || !isModuleFile.get(u.file)) {
      if (!globalsTable.has(u.name) && (isGlobalDecl)) globalsTable.set(u.name, { kind: u.kind === "var" ? "var" : "fn", box: box.id, name: u.name });
    }
    if (u.instanceOf && classes.has(u.instanceOf) && isGlobalDecl) singletonOf.set(u.name, "class:" + u.instanceOf);
  }
  m.exported = isExport;
}
// implicit globals (assigned inside functions without declaration) and singleton instances
for (const u of sorted) {
  for (const n of u.news || []) { const mm = /^([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)$/.exec(n); if (mm && classes.has(mm[2]) && !singletonOf.has(mm[1]) && !isLocalName(u, mm[1])) singletonOf.set(mm[1], "class:" + mm[2]); const tm = /^this\.([\w$]+)=([A-Za-z_$][\w$]*)$/.exec(n); if (tm && classes.has(tm[2]) && u.owner) { const o = (fieldInstance.get(u.owner) || fieldInstance.set(u.owner, {}).get(u.owner)); o[tm[1]] = tm[2]; } else if (tm && classes.has(tm[2]) && isCtorUnit(u)) { const o = (fieldInstance.get(u.name) || fieldInstance.set(u.name, {}).get(u.name)); o[tm[1]] = tm[2]; } }
}
function isLocalName() { return false; }
for (const u of sorted) {
  for (const [name, r] of Object.entries(u.refs)) {
    if (r.write > 0 && !globalsTable.has(name) && !LIB.has(name) && !singletonOf.has(name) && !cfg.singletons[name] && u.file && !isModuleFile.get(u.file)) {
      const b = boxes.get(u.box); const f = foldFile(u.file); const fb = getBox("file:" + f, "file", f, f); const sub = getSub(fb, subOf(u.file, u.line));
      globalsTable.set(name, { kind: "var", box: fb.id, name, implicit: true }); const m = member(fb, sub, name, "var", null); m.implicit = true; m.writtenIn = u.name;
    }
  }
}
for (const [n, target] of Object.entries(cfg.singletons)) { if (n === "_doc") continue; const id = target.includes("/") || target.endsWith(".js") ? "file:" + target : "class:" + target; if (boxes.has(id)) singletonOf.set(n, id); }
// a member of a class that is assigned through "this.f = new C"
for (const [cls, fields] of fieldInstance) for (const f of Object.keys(fields)) { const b = boxes.get("class:" + cls); if (b) { const sub = getSub(b, ""); /* make sure the field exists */ if (!members.has(b.id + "::" + f)) member(b, [...b.subs.values()][0], f, "field", null); } }

// ---------- resolve references -------------------------------------------------------------------------------------------
const importsOf = new Map(); // file -> Map(local -> {to, imported})
for (const im of facts.imports) { const mm = importsOf.get(im.from) || importsOf.set(im.from, new Map()).get(im.from); im.locals.forEach((l, i) => mm.set(l, { to: im.to, imported: im.names[i] })); }
const edges = new Map(); // srcSub|dstSub -> {call,data,ref,names}
const unresolved = new Map();
const htmlBox = getBox("html", "html", "labelbee_page.html", "labelbee_page.html"); const htmlSub = getSub(htmlBox, "inline on…= handlers");
const subByKey = (k) => { for (const b of boxes.values()) for (const s of b.subs.values()) if (s.key === k) return s; };
const subIndex = new Map(); const reindex = () => { subIndex.clear(); for (const b of boxes.values()) for (const s of b.subs.values()) subIndex.set(s.key, s); }; reindex();
function addEdge(srcSubKey, dst, kind, mname, unitKey) {
  if (!dst || srcSubKey === dst.sub) return;
  const e = edges.get(srcSubKey + ">" + dst.sub) || edges.set(srcSubKey + ">" + dst.sub, { s: srcSubKey, d: dst.sub, call: 0, data: 0, ref: 0, names: new Map(), pairs: new Set() }).get(srcSubKey + ">" + dst.sub);
  const pk = unitKey + "|" + mname + "|" + kind; if (e.pairs.has(pk)) return; e.pairs.add(pk); e[kind]++; e.names.set(mname, (e.names.get(mname) || 0) + 1);
}
const classMemberFor = (cls, name) => members.get("class:" + cls + "::" + name);
function useMember(m, mode, srcBoxId, srcSubKey, unitKey, signal) {
  if (m.box === srcBoxId) return;
  if (mode === "write") m.ext.write++; else if (mode === "call") m.ext.call++; else m.ext.read++;
  if (signal) m.ext.signal++;
  m.callers.add(srcBoxId); m.callerUnits.add(unitKey);
  const isVar = m.kind === "var" || m.kind === "field" || m.kind === "get" || m.kind === "set";
  addEdge(srcSubKey, { sub: m.sub }, mode === "call" ? "call" : isVar ? "data" : "ref", m.name, unitKey);
  if (m.kind === "var" && !singletonOf.has(m.name)) { // red: a plain global variable of another box
    const s = subIndex.get(srcSubKey); if (!s) return; const g = s.reds.globals.get(m.name) || s.reds.globals.set(m.name, { n: m.name, r: 0, w: 0, owner: m.box }).get(m.name); if (mode === "write") g.w++; else g.r++;
  }
}
function resolveChainOnClass(cls, parts, mode, srcBoxId, srcSubKey, unitKey, signal) {
  let cur = cls;
  for (let i = 0; i < parts.length; i++) {
    const nm = parts[i];
    let m = classMemberFor(cur, nm);
    const last = i === parts.length - 1;
    const fi = fieldInstance.get(cur); const next = fi && fi[nm];
    if (!m) { // a member the class does not declare (dynamic / jQuery / Object.assign): keep it, so the interface lists what the page uses
      const b = boxes.get("class:" + cur); if (!b) return; m = member(b, [...b.subs.values()][0], nm, "dyn", null);
    }
    if (last) { useMember(m, mode, srcBoxId, srcSubKey, unitKey, signal); return; }
    if (next && classes.has(next)) { useMember(m, "read", srcBoxId, srcSubKey, unitKey); cur = next; continue; }
    useMember(m, "read", srcBoxId, srcSubKey, unitKey); return; // deeper steps are on plain objects
  }
}
function resolveModuleMember(modId, parts, mode, srcBoxId, srcSubKey, unitKey) {
  const b = boxes.get(modId); if (!b) return; const nm = parts[0]; if (!nm) return;
  let m = members.get(modId + "::" + nm); if (!m) m = member(b, [...b.subs.values()][0], nm, "dyn", null);
  useMember(m, mode, srcBoxId, srcSubKey, unitKey);
}
function resolveRef(srcBoxId, srcSubKey, unitKey, fileOfUnit, name, r, srcUnit) {
  const modeOf = (c) => (c.call > 0 ? "call" : c.write > 0 ? "write" : "read");
  // 1. imports of an ES module
  const imp = importsOf.get(fileOfUnit) && importsOf.get(fileOfUnit).get(name);
  let target = null;
  if (imp) {
    const to = foldFile(imp.to);
    if (imp.imported === "*") target = { kind: "namespace", box: "file:" + to };
    else if (classes.has(imp.imported)) target = { kind: "class", cls: imp.imported };
    else { const m = members.get("file:" + to + "::" + imp.imported); if (m) target = { kind: "member", m }; }
  } else if (isModuleFile.get(fileOfUnit) && !globalsTable.has(name)) {
    // same module file: top-level unit
    const f = foldFile(fileOfUnit); const m = members.get("file:" + f + "::" + name);
    if (m) target = { kind: "member", m }; else if (classes.has(name)) target = { kind: "class", cls: name };
  }
  if (!target) {
    if (singletonOf.has(name)) { const id = singletonOf.get(name); target = id.startsWith("class:") ? { kind: "class", cls: id.slice(6), instance: true } : { kind: "namespace", box: id }; }
    else if (globalsTable.has(name)) { const g = globalsTable.get(name); const m = members.get(g.box + "::" + g.name); if (m) target = { kind: "member", m }; }
    else if (classes.has(name)) target = { kind: "class", cls: name };
  }
  if (!target) { if (!LIB.has(name)) unresolved.set(name, (unresolved.get(name) || 0) + r.read + r.write + r.call); return; }
  if (target.kind === "member") {
    const m = target.m; const own = (r.call > 0 ? "call" : null);
    if (r.call > 0) useMember(m, "call", srcBoxId, srcSubKey, unitKey);
    if (r.read > 0 && r.call === 0 || Object.keys(r.members).length) { if (m.kind === "var") { if (r.read > r.call || Object.keys(r.members).length) useMember(m, "read", srcBoxId, srcSubKey, unitKey); } else if (r.read > 0 && r.call === 0) useMember(m, "read", srcBoxId, srcSubKey, unitKey); }
    if (r.write > 0 || r.mutate > 0) useMember(m, "write", srcBoxId, srcSubKey, unitKey);
    return;
  }
  if (target.kind === "namespace") {
    const keys = Object.keys(r.members);
    for (const k of keys) { const c = r.members[k]; resolveModuleMember(target.box, k.split("."), modeOf(c), srcBoxId, srcSubKey, unitKey); }
    if (!keys.length && (r.call || r.read)) addEdge(srcSubKey, { sub: [...boxes.get(target.box).subs.values()][0].key }, "ref", "(namespace)", unitKey);
    return;
  }
  // class (instance or static)
  const cls = target.cls; const keys = Object.keys(r.members);
  for (const k of keys) { const c = r.members[k]; const mo = c.write > 0 && c.call === 0 ? "write" : c.call > 0 ? "call" : "read"; resolveChainOnClass(cls, k.split("."), mo, srcBoxId, srcSubKey, unitKey, false); }
  if (!keys.length && r.write > 0 && target.instance) { /* the global holding the instance is (re)assigned: not an interface of the class */ }
  if (!keys.length && (r.call > 0 || r.read > 0) && !target.instance) { const b = boxes.get("class:" + cls); const s0 = [...b.subs.values()][0]; if (b.id !== srcBoxId) addEdge(srcSubKey, { sub: s0.key }, "call", "new " + cls, unitKey); }
  if (!keys.length && target.instance && r.read > 0) { const b = boxes.get("class:" + cls); const s0 = [...b.subs.values()][0]; if (b.id !== srcBoxId) addEdge(srcSubKey, { sub: s0.key }, "ref", "(instance)", unitKey); }
}
for (const u of sorted) {
  const ukey = u.file + "#" + u.name + "@" + u.line;
  for (const [name, r] of Object.entries(u.refs)) resolveRef(u.box, u.subKey, ukey, u.file, name, r, u);
  for (const sg of u.signals || []) { // x.slot = function: a signal slot of x filled by this unit
    const parts = sg.split("."); const nm = parts[0]; const cls = singletonOf.get(nm);
    if (cls && cls.startsWith("class:")) { const m = classMemberFor(cls.slice(6), parts[1]); if (m && m.box !== u.box) { m.ext.signal++; } }
  }
}
for (const h of facts.htmlHandlers) {
  const parts = h.call.split("."); const name = parts[0]; const r = { read: 0, write: 0, call: 1, mutate: 0, members: {} }; if (parts.length > 1) { r.call = 0; r.members[parts.slice(1).join(".")] = { read: 0, write: 0, call: 1 }; r.read = 1; }
  resolveRef("html", htmlSub.key, "html#" + h.call, "labelbee_page.html", name, r, null);
}

// ---------- classification of members ----------------------------------------------------------------------------------------
const NAMEQ = /^(get|is|has|can|find|compute|to[A-Z]|xdomain$|ydomain$|x$|y$)/;
for (const m of members.values()) {
  const ext = m.ext; const used = ext.read + ext.write + ext.call;
  m.nCallers = m.callers.size;
  if (!used) { m.group = "internal"; continue; }
  if (m.kind === "var" || m.kind === "field" || m.kind === "static") m.group = ext.write > 0 ? "rw" : "ro";
  else if (m.kind === "get") m.group = "ro"; else if (m.kind === "set") m.group = "in";
  else if (m.kind === "dyn") m.group = ext.write > 0 ? "rw" : ext.call > 0 ? "in" : "ro";
  else { const u = m.unit; m.group = u ? (!u.writesState && u.returnsValue ? "ro" : "in") : (NAMEQ.test(m.name) ? "ro" : "in"); if (u && u.writesState === false && !u.returnsValue && NAMEQ.test(m.name)) m.group = "ro"; if (ext.signal > 0) m.group = "in"; }
  if (m.kind === "ctor") m.group = "internal";
}

// ---------- red call lists ----------------------------------------------------------------------------------------------
for (const e of edges.values()) {
  const s = subIndex.get(e.s), d = subIndex.get(e.d); if (!s || !d) continue;
  const w = e.call + e.data + e.ref;
  s.reds.calls.set(e.d, (s.reds.calls.get(e.d) || 0) + w); d.reds.calledBy.set(e.s, (d.reds.calledBy.get(e.s) || 0) + w);
}

// ---------- output ----------------------------------------------------------------------------------------------------------
const outBoxes = [];
for (const b of boxes.values()) {
  const subs = [...b.subs.values()].filter((s) => s.units > 0 || s.members.size > 0);
  if (!subs.length) continue;
  const hasMembers = subs.some((s) => s.members.size > 0);
  if (b.kind !== "class" && b.kind !== "html" && !hasMembers && !subs.some((s) => s.units > 0 && b.kind !== "module")) continue;
  const file = [...b.files][0]; const topic = b.kind === "html" ? "shell" : topicOf(b, file);
  const o = { id: b.id, kind: b.kind, name: b.name, files: [...b.files], topic, subs: [] };
  if (b.kind === "class") { const c = classes.get(b.name); o.defFile = c && c.file; const fi = fieldInstance.get(b.name); if (fi) o.fieldClasses = fi; }
  const order = (cfg.splits[file] || []).map((x) => x[2]);
  subs.sort((x, y) => { const ix = order.indexOf(x.name), iy = order.indexOf(y.name); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); });
  for (const s of subs) {
    const g = { ro: [], in: [], rw: [], internal: [] };
    for (const m of s.members.values()) {
      if (m.name === "constructor") continue;
      const item = { n: m.name, k: m.kind, c: m.nCallers || 0, u: m.callerUnits ? m.callerUnits.size : 0, l: m.unit ? m.unit.line : undefined, sig: m.ext.signal > 0 ? 1 : undefined, imp: m.implicit ? 1 : undefined, w: m.unit && m.unit.writesState ? 1 : undefined };
      if (g[m.group]) g[m.group].push(item); else g.internal.push(item);
    }
    for (const k of ["ro", "in", "rw"]) g[k].sort((a, b) => b.u - a.u || a.n.localeCompare(b.n));
    g.internal.sort((a, b) => a.n.localeCompare(b.n));
    o.subs.push({ key: s.key, name: s.name, units: s.units, lines: s.lines, ro: g.ro, in: g.in, rw: g.rw, internal: g.internal.map((x) => x.n),
      redGlobals: [...s.reds.globals.values()].sort((a, b) => b.r + b.w - a.r - a.w), calls: [...s.reds.calls].map(([k, w]) => [k, w]), calledBy: [...s.reds.calledBy].map(([k, w]) => [k, w]) });
  }
  outBoxes.push(o);
}
const outEdges = [...edges.values()].map((e) => ({ s: e.s, d: e.d, call: e.call, data: e.data, ref: e.ref, top: [...e.names].sort((a, b) => b[1] - a[1]).slice(0, 8) }));
fs.writeFileSync(OUT, JSON.stringify({ boxes: outBoxes, edges: outEdges, pages: cfg.topics._pages, singletons: Object.fromEntries(singletonOf), scripts: facts.scripts }));
const tot = outBoxes.reduce((a, b) => a + b.subs.length, 0);
console.log("boxes", outBoxes.length, "sub-blocks", tot, "edges", outEdges.length, "->", path.relative(ROOT, OUT));
console.log("singletons:", [...singletonOf].map(([k, v]) => k + "=" + v.replace(/^(class|file):/, "")).join(" "));
console.log("unresolved free names (top 40):", [...unresolved].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => k + ":" + v).join(" "));
