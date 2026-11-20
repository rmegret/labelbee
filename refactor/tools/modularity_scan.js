// Modularity map, stage 1: static facts about the frontend scripts (what each file defines, what each function touches).
// Usage (repo root):  node refactor/tools/modularity_scan.js <dir holding node_modules/acorn> [out.json]
//   e.g. npm install --cache $TMPDIR/npmcache --prefix $TMPDIR/parser acorn@8.14.0   (nothing is installed in the repo)
// Writes (default) refactor/scratch/modularity-facts.json. Parsing only, no code of the page is run.
// A "unit" is a top-level function, a variable, a class, or a method (prototype or class syntax). Every reference made
// anywhere inside a unit (nested functions and callbacks included) is attributed to that unit.
const fs = require("fs");
const path = require("path");
const acorn = require(path.join(process.argv[2], "node_modules", "acorn"));
const ROOT = path.resolve(__dirname, "..", "..");
const JS = path.join(ROOT, "labelbee/static/labelbee/js");
const PAGE = path.join(ROOT, "labelbee/blueprints/labelbee/templates/labelbee_page.html");
const OUT = process.argv[3] || path.join(ROOT, "refactor/scratch/modularity-facts.json");

// Files in script order of the page (classic scripts), then the ES modules (the page's modules and what they import).
const html = fs.readFileSync(PAGE, "utf8");
const scripts = [...html.matchAll(/<script[^>]*type="(text\/javascript|module)"[^>]*src="js\/([^"]+)"/g)]
  .filter((m) => !html.slice(0, m.index).split("\n").pop().includes("<!--") && !/(^extern\/|\/(SQLiteDB|DuckDB)\.js)/.test(m[2]))
  .map((m) => ({ file: m[2], module: m[1] === "module" }));
const files = new Map(scripts.map((s) => [s.file, s.module]));
for (const f of ["chrono/ChronoDragControl.js", "chrono/ListenerBag.js", "chrono/VideoCacheStatus.js", "chrono/VideoKeyframes.js"]) files.set(f, true); // import()ed by ChronoControl.js
(function addImports() { // static imports of the modules, transitively
  const todo = [...files.keys()].filter((f) => files.get(f));
  while (todo.length) {
    const f = todo.pop();
    for (const m of fs.readFileSync(path.join(JS, f), "utf8").matchAll(/^\s*import[^'"]*['"]([^'"]+)['"]/gm)) {
      if (!m[1].startsWith(".")) continue;
      const g = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
      if (!files.has(g)) { files.set(g, true); todo.push(g); }
    }
  }
})();

const LIB = new Set(("window document console Math JSON Object Array String Number Boolean Date Promise Set Map WeakMap WeakSet Symbol Error TypeError RangeError RegExp Image Blob URL " +
  "FileReader FormData XMLHttpRequest fetch setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame performance navigator location history localStorage sessionStorage " +
  "alert confirm prompt parseInt parseFloat isNaN isFinite Infinity NaN undefined arguments encodeURIComponent decodeURIComponent escape unescape Function Proxy Reflect Uint8Array Float32Array Float64Array Int32Array " +
  "ArrayBuffer DataView MutationObserver ResizeObserver IntersectionObserver CustomEvent Event KeyboardEvent MouseEvent Element HTMLElement HTMLVideoElement HTMLCanvasElement CSS globalThis structuredClone queueMicrotask " +
  "TextDecoder TextEncoder AbortController Intl BigInt WebAssembly Worker EventTarget DOMParser XMLSerializer atob btoa getComputedStyle screen self top parent").split(/\s+/));
const VENDOR = new Set("$ jQuery d3 fabric VideoFrame LRUCache ResizeSensor ElementQueries PerspectiveTransform perspectiveTransform jsGrid Papa DataTable saveAs Sortable".split(/\s+/));

const facts = { scripts: [...files].map(([file, module]) => ({ file, module, lines: fs.readFileSync(path.join(JS, file), "utf8").split("\n").length })), units: [], imports: [], exports: {}, windowAssign: [], htmlHandlers: [] };

function scanFile(file, isModule) {
  const src = fs.readFileSync(path.join(JS, file), "utf8");
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: isModule ? "module" : "script", locations: true, allowReturnOutsideFunction: true, allowHashBang: true });
  const lineOf = (n) => n.loc.start.line, endOf = (n) => n.loc.end.line;
  const topNames = new Set(); // names declared at top level of the script (globals of the page for classic scripts)

  // ---- scopes --------------------------------------------------------------------------------------------------
  class Scope { constructor(parent, isFn) { this.parent = parent; this.isFn = isFn; this.names = new Set(); } has(n) { for (let s = this; s; s = s.parent) if (s.names.has(n)) return true; return false; } }
  const patNames = (p, out) => {
    if (!p) return out;
    if (p.type === "Identifier") out.push(p.name);
    else if (p.type === "ObjectPattern") p.properties.forEach((q) => patNames(q.type === "RestElement" ? q.argument : q.value, out));
    else if (p.type === "ArrayPattern") p.elements.forEach((q) => patNames(q, out));
    else if (p.type === "RestElement") patNames(p.argument, out);
    else if (p.type === "AssignmentPattern") patNames(p.left, out);
    return out;
  };
  const kids = (n) => { const r = []; for (const k in n) { if (k === "loc" || k === "type") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && r.push(c)); else if (v && typeof v.type === "string") r.push(v); } return r; };
  const FN = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
  function hoistVars(n, scope, top) { // var + function declarations of a function body (not crossing nested functions)
    if (n.type === "VariableDeclaration" && n.kind === "var") n.declarations.forEach((d) => patNames(d.id, []).forEach((x) => scope.names.add(x)));
    if (n.type === "FunctionDeclaration" && !top) { scope.names.add(n.id.name); return; }
    if (FN.has(n.type) || n.type === "ClassDeclaration" || n.type === "ClassExpression") return;
    kids(n).forEach((c) => hoistVars(c, scope, false));
  }
  function blockDecls(stmts, scope) { // let / const / class / function declarations directly in a block
    for (const s of stmts) {
      if (s.type === "VariableDeclaration" && s.kind !== "var") s.declarations.forEach((d) => patNames(d.id, []).forEach((x) => scope.names.add(x)));
      else if (s.type === "FunctionDeclaration" || s.type === "ClassDeclaration") scope.names.add(s.id.name);
      else if ((s.type === "ExportNamedDeclaration" || s.type === "ExportDefaultDeclaration") && s.declaration) blockDecls([s.declaration], scope);
    }
  }

  // ---- units -----------------------------------------------------------------------------------------------------
  const globalScope = new Scope(null, true);
  hoistVars(ast, globalScope, true);
  blockDecls(ast.body, globalScope);
  globalScope.names.forEach((n) => topNames.add(n));

  const units = [];
  function newUnit(u) { u.file = file; u.refs = {}; u.thisWrites = {}; u.thisReads = {}; u.writesState = false; u.returnsValue = false; u.news = []; u.signals = []; units.push(u); return u; }

  // reference recording: ref(unit, name, mode, chain)
  function ref(u, name, mode, chain) {
    if (!u) return;
    const r = u.refs[name] || (u.refs[name] = { read: 0, write: 0, call: 0, mutate: 0, members: {} });
    r[mode]++;
    if (chain && chain.length) { const key = chain.join("."); const m = r.members[key] || (r.members[key] = { read: 0, write: 0, call: 0 }); m[mode === "mutate" ? "write" : mode]++; }
  }
  const chainOf = (n) => { // a.b.c -> {root: Identifier|This|null, names: ['b','c'] (computed steps stop the chain)}
    const names = []; let cur = n;
    while (cur.type === "MemberExpression") { if (cur.computed) { names.length = 0; names.push("[]"); } else names.push(cur.property.name); cur = cur.object; }
    names.reverse();
    return { root: cur, names };
  };

  function visit(n, scope, u, ctx) {
    if (!n) return;
    switch (n.type) {
      case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression": {
        if (n.type === "FunctionDeclaration" && u && u.aliases && ctx.fnDepth === 1 && n.id && !n.synthLocal) { // local function of a constructor with `var self = this`
          const owner = u.owner || u.name;
          const mu = newUnit({ name: owner + ".#" + n.id.name, kind: "localfn", owner, local: n.id.name, line: lineOf(n), end: endOf(n), params: n.params.length, synthesized: true });
          visit({ ...n, synthLocal: true }, scope, mu, { fnDepth: 0 });
          return;
        }
        const s = new Scope(scope, true);
        if (n.type === "FunctionExpression" && n.id) s.names.add(n.id.name);
        n.params.forEach((p) => patNames(p, []).forEach((x) => s.names.add(x)));
        if (n.body.type === "BlockStatement") { hoistVars(n.body, s, true); blockDecls(n.body.body, s); }
        n.params.forEach((p) => visitPattern(p, s, u, ctx));
        const c2 = { ...ctx, fnDepth: ctx.fnDepth + 1 };
        if (n.body.type === "BlockStatement") n.body.body.forEach((x) => visit(x, s, u, c2)); else visit(n.body, s, u, c2);
        return;
      }
      case "ClassDeclaration": case "ClassExpression": {
        const s = new Scope(scope, false); if (n.id) s.names.add(n.id.name);
        visit(n.superClass, scope, u, ctx);
        n.body.body.forEach((m) => { if (m.computed) visit(m.key, s, u, ctx); if (m.value) visit(m.value, s, u, ctx); if (m.type === "StaticBlock") m.body.forEach((x) => visit(x, s, u, ctx)); });
        return;
      }
      case "BlockStatement": case "StaticBlock": { const s = new Scope(scope, false); blockDecls(n.body, s); n.body.forEach((x) => visit(x, s, u, ctx)); return; }
      case "ForStatement": case "ForInStatement": case "ForOfStatement": {
        const s = new Scope(scope, false); const d = n.type === "ForStatement" ? n.init : n.left;
        if (d && d.type === "VariableDeclaration" && d.kind !== "var") d.declarations.forEach((x) => patNames(x.id, []).forEach((y) => s.names.add(y)));
        kids(n).forEach((c) => visit(c, s, u, ctx)); return;
      }
      case "SwitchStatement": { visit(n.discriminant, scope, u, ctx); const s = new Scope(scope, false); n.cases.forEach((c) => blockDecls(c.consequent, s)); n.cases.forEach((c) => { visit(c.test, s, u, ctx); c.consequent.forEach((x) => visit(x, s, u, ctx)); }); return; }
      case "CatchClause": { const s = new Scope(scope, false); patNames(n.param, []).forEach((x) => s.names.add(x)); visit(n.body, s, u, ctx); return; }
      case "VariableDeclaration": n.declarations.forEach((d) => {
        if (u && d.init && d.init.type === "ThisExpression" && d.id.type === "Identifier") (u.aliases = u.aliases || {})[d.id.name] = 1; // var self = this
        visit(d.init, scope, u, ctx); visitPattern(d.id, scope, u, ctx); }); return;
      case "AssignmentExpression": {
        if (n.left.type === "MemberExpression" && FN.has(n.right.type) && ctx.fnDepth === 1 && u && ["function", "ctor", "method"].includes(u.kind)) {
          // this.f = function ...  (or through an alias of this): a member of the class, with its own unit
          const { root, names } = chainOf(n.left);
          const isThis = root.type === "ThisExpression" || (root.type === "Identifier" && u.aliases && u.aliases[root.name] && scope.has(root.name));
          if (isThis && names.length === 1) {
            const owner = u.owner || u.name;
            const mu = newUnit({ name: owner + "." + names[0], kind: "method", owner, member: names[0], line: lineOf(n), end: endOf(n), params: n.right.params.length, synthesized: true });
            u.thisWrites = u.thisWrites || {}; u.thisWrites[names[0]] = (u.thisWrites[names[0]] || 0) + 1; u.writesState = true;
            visit(n.right, scope, mu, { fnDepth: 0 });
            return;
          }
        }
        if (n.left.type === "MemberExpression" && n.right.type === "Identifier" && ctx.fnDepth === 1 && u && u.aliases) { // self.f = localFunction
          const { root, names } = chainOf(n.left);
          if (root.type === "Identifier" && u.aliases[root.name] && names.length === 1) (u.thisAlias = u.thisAlias || {})[names[0]] = n.right.name;
        }
        visit(n.right, scope, u, ctx);
        assignTarget(n.left, scope, u, ctx, n.operator !== "=", n.right);
        return;
      }
      case "UpdateExpression": assignTarget(n.argument, scope, u, ctx, true, null); return;
      case "CallExpression": {
        const c = n.callee;
        if (c.type === "Identifier") { if (!scope.has(c.name)) ref(u, c.name, "call"); }
        else if (c.type === "MemberExpression") memberRef(c, scope, u, ctx, "call");
        else visit(c, scope, u, ctx);
        n.arguments.forEach((a) => visit(a, scope, u, ctx));
        return;
      }
      case "NewExpression": {
        if (n.callee.type === "Identifier" && !scope.has(n.callee.name)) { ref(u, n.callee.name, "call"); u && u.news.push(n.callee.name); } else visit(n.callee, scope, u, ctx);
        n.arguments.forEach((a) => visit(a, scope, u, ctx)); return;
      }
      case "MemberExpression": memberRef(n, scope, u, ctx, "read"); return;
      case "Identifier": if (!scope.has(n.name)) ref(u, n.name, "read"); return;
      case "Property": if (n.computed) visit(n.key, scope, u, ctx); visit(n.value, scope, u, ctx); return;
      case "MethodDefinition": case "PropertyDefinition": if (n.computed) visit(n.key, scope, u, ctx); visit(n.value, scope, u, ctx); return;
      case "ReturnStatement": if (n.argument && u && ctx.fnDepth <= 1) u.returnsValue = true; visit(n.argument, scope, u, ctx); return;
      case "LabeledStatement": visit(n.body, scope, u, ctx); return;
      case "BreakStatement": case "ContinueStatement": return;
      case "ImportDeclaration": case "ExportAllDeclaration": return;
      case "ExportNamedDeclaration": case "ExportDefaultDeclaration": if (n.declaration) visit(n.declaration, scope, u, ctx); return;
      default: kids(n).forEach((c) => visit(c, scope, u, ctx));
    }
  }
  function visitPattern(p, scope, u, ctx) { // defaults and computed keys of a binding pattern
    if (!p) return;
    if (p.type === "AssignmentPattern") { visit(p.right, scope, u, ctx); visitPattern(p.left, scope, u, ctx); }
    else if (p.type === "ObjectPattern") p.properties.forEach((q) => { if (q.computed) visit(q.key, scope, u, ctx); visitPattern(q.type === "RestElement" ? q.argument : q.value, scope, u, ctx); });
    else if (p.type === "ArrayPattern") p.elements.forEach((q) => visitPattern(q, scope, u, ctx));
    else if (p.type === "RestElement") visitPattern(p.argument, scope, u, ctx);
  }
  function assignTarget(t, scope, u, ctx, alsoRead, rhs) {
    if (t.type === "Identifier") { if (!scope.has(t.name)) { ref(u, t.name, "write"); if (alsoRead) ref(u, t.name, "read"); if (u && rhs && rhs.type === "NewExpression" && rhs.callee.type === "Identifier") u.news.push(t.name + "=" + rhs.callee.name); } else if (u && ctx.fnDepth === 0) { /* local */ } }
    else if (t.type === "MemberExpression") { memberRef(t, scope, u, ctx, "write", rhs); if (u) u.writesState = true; }
    else if (t.type === "ObjectPattern" || t.type === "ArrayPattern") { patNames(t, []).forEach((x) => { if (!scope.has(x)) ref(u, x, "write"); }); visitPattern(t, scope, u, ctx); }
  }
  function memberRef(n, scope, u, ctx, mode, rhs) {
    const { root, names } = chainOf(n);
    // computed subscripts and calls inside the chain are visited as ordinary expressions
    (function inner(m) { if (m.type !== "MemberExpression") return; if (m.computed) visit(m.property, scope, u, ctx); inner(m.object); })(n);
    if (root.type === "ThisExpression" || (root.type === "Identifier" && u && u.aliases && u.aliases[root.name] && scope.has(root.name))) {
      if (!u) return; const k = names[0]; if (!k) return;
      if (mode === "write") { u.thisWrites[k] = (u.thisWrites[k] || 0) + 1; if (rhs && rhs.type === "NewExpression" && rhs.callee.type === "Identifier") u.news.push("this." + k + "=" + rhs.callee.name); }
      else u.thisReads[k] = (u.thisReads[k] || 0) + 1;
      return;
    }
    if (root.type === "Identifier") {
      let name = root.name, ch = names;
      if (name === "window" && ch.length) { name = ch[0]; ch = ch.slice(1); } // window.foo is the global foo
      if (scope.has(name) && name !== root.name) { /* shadowed window property: still a global access */ }
      else if (scope.has(root.name)) { return; }
      const m = mode === "write" && ch.length > 1 ? "mutate" : mode === "write" && ch.length === 1 ? "mutate" : mode;
      if (mode === "write" && ch.length === 0) { ref(u, name, "write"); return; }
      ref(u, name, m, ch);
      if (rhs && FN.has(rhs.type) && u) u.signals.push(name + "." + ch.join("."));
      return;
    }
    visit(root, scope, u, ctx); // (expr).member, call().member
  }

  // ---- top-level walk: one unit per top-level declaration / prototype method ----------------------------------
  const topScope = globalScope;
  const exportsList = [];
  for (let stmt of ast.body) {
    let exported = false;
    if ((stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportDefaultDeclaration") && stmt.declaration) { stmt = stmt.declaration; exported = true; }
    else if (stmt.type === "ExportNamedDeclaration") { stmt.specifiers.forEach((sp) => exportsList.push(sp.exported.name)); continue; }
    if (stmt.type === "ImportDeclaration") { facts.imports.push({ from: file, to: path.posix.normalize(path.posix.join(path.posix.dirname(file), stmt.source.value)), names: stmt.specifiers.map((s) => (s.imported ? s.imported.name : s.type === "ImportNamespaceSpecifier" ? "*" : "default")) , locals: stmt.specifiers.map((s) => s.local.name) }); continue; }
    if (stmt.type === "FunctionDeclaration") { const u = newUnit({ name: stmt.id.name, kind: "function", line: lineOf(stmt), end: endOf(stmt), params: stmt.params.length, exported }); visit(stmt, topScope, u, { fnDepth: 0 }); if (exported) exportsList.push(u.name); }
    else if (stmt.type === "ClassDeclaration") {
      exportsList.push(...(exported ? [stmt.id.name] : []));
      const cu = newUnit({ name: stmt.id.name, kind: "class", line: lineOf(stmt), end: endOf(stmt), exported });
      visit(stmt.superClass, topScope, cu, { fnDepth: 0 }); cu.extends = stmt.superClass && stmt.superClass.name;
      for (const m of stmt.body.body) {
        if (m.type === "StaticBlock") continue;
        const nm = m.key.type === "PrivateIdentifier" ? "#" + m.key.name : m.key.name || "[computed]";
        const mu = newUnit({ name: stmt.id.name + "." + nm, kind: m.type === "PropertyDefinition" ? "field" : m.kind === "constructor" ? "ctor" : m.kind === "get" ? "getter" : m.kind === "set" ? "setter" : "method", owner: stmt.id.name, member: nm, static: m.static, private: m.key.type === "PrivateIdentifier", line: lineOf(m), end: endOf(m), params: m.value && m.value.params ? m.value.params.length : 0 });
        const s = new Scope(topScope, false); s.names.add(stmt.id.name);
        visit(m.value, s, mu, { fnDepth: 0 }); if (m.value && FN.has(m.value.type)) mu.returnsValue = mu.returnsValue || m.value.body.type !== "BlockStatement";
      }
    } else if (stmt.type === "VariableDeclaration") {
      for (const d of stmt.declarations) {
        const names = patNames(d.id, []);
        const init = d.init;
        const isFn = init && (FN.has(init.type));
        const u = newUnit({ name: names[0], names, kind: isFn ? "function" : "var", declKind: stmt.kind, line: lineOf(d), end: endOf(d), exported, initType: init ? init.type : null, params: isFn ? init.params.length : undefined });
        if (init && init.type === "NewExpression" && init.callee.type === "Identifier") u.instanceOf = init.callee.name;
        if (init && init.type === "ObjectExpression") u.objectKeys = init.properties.map((p) => (p.key && (p.key.name || p.key.value)) || "?").slice(0, 80);
        if (init && init.type === "CallExpression" && init.callee.type === "Identifier") u.initCall = init.callee.name;
        visit(init, topScope, u, { fnDepth: 0 }); visitPattern(d.id, topScope, u, { fnDepth: 0 });
        if (exported) names.forEach((x) => exportsList.push(x));
        if (init && init.type === "ObjectExpression" && !isModule) { // an object literal of functions is a module-like namespace: its methods are units too
          for (const p of init.properties) if (p.value && FN.has(p.value.type) && p.key && !p.computed) { const mu = newUnit({ name: names[0] + "." + (p.key.name || p.key.value), kind: "method", owner: names[0], member: p.key.name || p.key.value, line: lineOf(p), end: endOf(p), params: p.value.params.length }); visit(p.value, topScope, mu, { fnDepth: 0 }); }
        }
      }
    } else if (stmt.type === "ExpressionStatement") {
      const e = stmt.expression;
      // X.prototype.m = function ...   /  X.prototype = {...}  /  X.m = function ... (static)  /  X = function ...
      if (e.type === "AssignmentExpression" && e.left.type === "MemberExpression") {
        const { root, names } = chainOf(e.left);
        if (root.type === "Identifier" && names[0] === "prototype" && names.length === 2 && FN.has(e.right.type)) {
          const mu = newUnit({ name: root.name + "." + names[1], kind: "method", owner: root.name, member: names[1], line: lineOf(stmt), end: endOf(stmt), params: e.right.params.length });
          visit(e.right, topScope, mu, { fnDepth: 0 }); continue;
        }
        if (root.type === "Identifier" && names[0] === "prototype" && names.length === 1 && e.right.type === "ObjectExpression") {
          for (const p of e.right.properties) if (p.value && FN.has(p.value.type) && p.key && !p.computed) { const nm = p.key.name || p.key.value; const mu = newUnit({ name: root.name + "." + nm, kind: "method", owner: root.name, member: nm, line: lineOf(p), end: endOf(p), params: p.value.params.length }); visit(p.value, topScope, mu, { fnDepth: 0 }); }
          continue;
        }
        if (root.type === "Identifier" && root.name === "window" && names.length === 1) { // window.X = ...
          const u = newUnit({ name: names[0], kind: FN.has(e.right.type) ? "function" : "var", declKind: "window", line: lineOf(stmt), end: endOf(stmt), initType: e.right.type, params: FN.has(e.right.type) ? e.right.params.length : undefined, viaWindow: true });
          if (e.right.type === "Identifier") u.alias = e.right.name;
          if (e.right.type === "NewExpression" && e.right.callee.type === "Identifier") u.instanceOf = e.right.callee.name;
          visit(e.right, topScope, u, { fnDepth: 0 }); continue;
        }
        if (root.type === "Identifier" && FN.has(e.right.type) && names.length === 1 && topNames.has(root.name)) { // static: Class.fn = function
          const mu = newUnit({ name: root.name + "." + names[0], kind: "method", owner: root.name, member: names[0], static: true, line: lineOf(stmt), end: endOf(stmt), params: e.right.params.length });
          visit(e.right, topScope, mu, { fnDepth: 0 }); continue;
        }
      }
      if (e.type === "AssignmentExpression" && e.left.type === "Identifier" && !topNames.has(e.left.name)) { // implicit global at top level
        const u = newUnit({ name: e.left.name, kind: FN.has(e.right.type) ? "function" : "var", declKind: "implicit", line: lineOf(stmt), end: endOf(stmt), initType: e.right.type, params: FN.has(e.right.type) ? e.right.params.length : undefined });
        if (e.right.type === "NewExpression" && e.right.callee.type === "Identifier") u.instanceOf = e.right.callee.name;
        visit(e.right, topScope, u, { fnDepth: 0 }); continue;
      }
      const u = newUnit({ name: "(top-level code)@" + lineOf(stmt), kind: "toplevel", line: lineOf(stmt), end: endOf(stmt) });
      visit(stmt, topScope, u, { fnDepth: 0 });
    } else { const u = newUnit({ name: "(top-level code)@" + lineOf(stmt), kind: "toplevel", line: lineOf(stmt), end: endOf(stmt) }); visit(stmt, topScope, u, { fnDepth: 0 }); }
  }
  if (exportsList.length) facts.exports[file] = exportsList;
  for (const u of units) {
    // plain data: the aggregate of what the unit does
    u.thisWrites = Object.keys(u.thisWrites).length ? u.thisWrites : undefined; u.thisReads = Object.keys(u.thisReads).length ? u.thisReads : undefined;
    u.writesState = u.writesState || !!u.thisWrites;
    facts.units.push(u);
  }
}
for (const [f, m] of files) scanFile(f, m);

// Inline handlers of the page template: onclick="fn(...)" etc.
for (const m of html.matchAll(/\bon(click|change|input|keydown|keyup|submit|load|mouseover|mousedown|mouseup|dblclick|focus|blur)\s*=\s*"([^"]*)"/g)) {
  for (const c of m[2].matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g)) facts.htmlHandlers.push({ event: m[1], call: c[1] });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(facts));
const byFile = {}; facts.units.forEach((u) => { (byFile[u.file] = byFile[u.file] || { n: 0, fn: 0, cls: 0, meth: 0, vars: 0 }); const b = byFile[u.file]; b.n++; if (u.kind === "function") b.fn++; else if (u.kind === "var") b.vars++; else if (u.kind === "class") b.cls++; else if (u.kind === "method" || u.kind === "ctor" || u.kind === "getter" || u.kind === "setter") b.meth++; });
console.log("units", facts.units.length, "html handlers", facts.htmlHandlers.length, "->", path.relative(ROOT, OUT));
for (const [f, b] of Object.entries(byFile)) console.log(f.padEnd(44), JSON.stringify(b));
