// Modularity map, PNG variant: boxes laid out by their couplings (Louvain communities + force layout, best of many seeds
// by fewest edge crossings), written as SVG. Convert to PNG with modularity_png.py.
// Usage (repo root): node refactor/tools/modularity_graph.js <parser dir with d3-force, graphology, graphology-communities-louvain>
//                    [--min 10] [--hub 9] [--out refactor/analysis/modularity-graph.svg]
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const lib = (m) => require(require.resolve(m, { paths: [path.resolve(process.argv[2])] }));
const d3 = lib("d3-force"), Graph = lib("graphology"), louvain = lib("graphology-communities-louvain");
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const MIN = +arg("min", 10), HUB = +arg("hub", 9), OUT = arg("out", path.join(ROOT, "refactor/analysis/modularity-graph.svg"));
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "refactor/scratch/modularity-boxes.json"), "utf8"));

// ---- box-level graph ---------------------------------------------------------------------------------------------
const boxOf = {}; D.boxes.forEach((b) => b.subs.forEach((s) => (boxOf[s.key] = b.id)));
const bb = new Map(); // "a>b" -> weight
for (const e of D.edges) { const a = boxOf[e.s], b = boxOf[e.d]; if (!a || !b || a === b) continue; bb.set(a + ">" + b, (bb.get(a + ">" + b) || 0) + e.call + e.data + e.ref); }
const und = new Map(); for (const [k, w] of bb) { const [a, b] = k.split(">"); const u = a < b ? a + "|" + b : b + "|" + a; und.set(u, (und.get(u) || 0) + w); }
const strong = [...und].filter(([, w]) => w >= MIN);
const nb = new Map(); for (const [u] of strong) { const [a, b] = u.split("|"); (nb.get(a) || nb.set(a, new Set()).get(a)).add(b); (nb.get(b) || nb.set(b, new Set()).get(b)).add(a); }
const hubs = new Set([...nb].filter(([, s]) => s.size >= HUB).map(([k]) => k)); // shared services: drawn aside, no edges
const meta = Object.fromEntries(D.boxes.map((b) => [b.id, b]));
const nodes = [...nb.keys()].filter((k) => !hubs.has(k)).map((id) => ({ id, name: meta[id].name, kind: meta[id].kind, topic: meta[id].topic }));
const ids = new Set(nodes.map((n) => n.id));
const links = strong.map(([u, w]) => { const [a, b] = u.split("|"); return { source: a, target: b, w }; }).filter((l) => ids.has(l.source) && ids.has(l.target));
const dir = (a, b) => bb.get(a + ">" + b) || 0;

// ---- communities -------------------------------------------------------------------------------------------------
const g = new Graph({ type: "undirected" }); nodes.forEach((n) => g.addNode(n.id));
links.forEach((l) => g.addEdge(l.source, l.target, { weight: Math.log2(1 + l.w) }));
const comm = louvain(g, { getEdgeWeight: "weight", resolution: 0.9, rng: (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })() });
nodes.forEach((n) => (n.c = comm[n.id]));
const nc = new Set(nodes.map((n) => n.c)).size;
for (const n of nodes) { n.w = Math.max(96, 8 * n.name.length + 24); n.h = 30; }

// ---- layout: best of many seeds ------------------------------------------------------------------------------------
const seg = (p, q, r, s) => { const o = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); return o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0; };
const hitRect = (p, q, n) => { const x0 = n.x - n.w / 2, x1 = n.x + n.w / 2, y0 = n.y - n.h / 2, y1 = n.y + n.h / 2; const cs = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ({ x, y })); return [0, 1, 2, 3].some((i) => seg(p, q, cs[i], cs[(i + 1) % 4])) || (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1); };
function score(L, NS) { NS = NS || best.ns; let cr = 0, hit = 0; for (let i = 0; i < L.length; i++) { for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.source === b.source || a.source === b.target || a.target === b.source || a.target === b.target) continue; if (seg(a.source, a.target, b.source, b.target)) cr++; } for (const n of NS) if (n !== L[i].source && n !== L[i].target && hitRect(L[i].source, L[i].target, n)) hit++; } return { cr, hit, s: cr + 4 * hit }; }
function run(seed) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ns = nodes.map((n) => ({ ...n, x: (rnd() - .5) * 900, y: (rnd() - .5) * 900 }));
  const byId = Object.fromEntries(ns.map((n) => [n.id, n])); const ls = links.map((l) => ({ ...l }));
  const cen = {}; ns.forEach((n) => { const c = cen[n.c] || (cen[n.c] = { x: 0, y: 0, k: 0 }); c.x += n.x; c.y += n.y; c.k++; });
  const sim = d3.forceSimulation(ns).randomSource(rnd).force("link", d3.forceLink(ls).id((d) => d.id).distance((l) => (l.source.c === l.target.c ? 130 : 300) / (1 + Math.log2(l.w) / 10)).strength((l) => (l.source.c === l.target.c ? .5 : .06)))
    .force("charge", d3.forceManyBody().strength(-1100)).force("cx", d3.forceX().strength(.02)).force("cy", d3.forceY().strength(.03))
    .force("grp", () => { const c = {}; ns.forEach((n) => { const e = c[n.c] || (c[n.c] = { x: 0, y: 0, k: 0 }); e.x += n.x; e.y += n.y; e.k++; }); ns.forEach((n) => { const e = c[n.c]; n.vx += (e.x / e.k - n.x) * .06; n.vy += (e.y / e.k - n.y) * .06; }); })
    .force("col", d3.forceCollide().radius((d) => d.w / 2 + 14).iterations(3)).stop();
  for (let i = 0; i < 500; i++) sim.tick();
  // push apart wider than tall boxes: rectangle separation
  for (let it = 0; it < 80; it++) for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { const a = ns[i], b = ns[j]; const dx = b.x - a.x, dy = b.y - a.y, ox = (a.w + b.w) / 2 + 16 - Math.abs(dx), oy = (a.h + b.h) / 2 + 22 - Math.abs(dy); if (ox > 0 && oy > 0) { if (oy < ox) { const m = oy / 2 * Math.sign(dy || 1); a.y -= m; b.y += m; } else { const m = ox / 2 * Math.sign(dx || 1); a.x -= m; b.x += m; } } }
  const L = ls.map((l) => ({ source: l.source, target: l.target, w: l.w }));
  return { ns, L, ...score(L, ns) };
}
let best = null; const N = +arg("seeds", 60);
for (let sd = 1; sd <= N; sd++) { const r = run(sd); if (!best || r.s < best.s) best = r; }
// hill-climb: move one node at a time to a nearby free spot when that lowers the score
{ let rs = 11; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647); const per = () => { const xs = best.ns.map((m) => m.x), ys = best.ns.map((m) => m.y); return Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys); }; const free = (n) => best.ns.every((m) => m === n || Math.abs(m.x - n.x) > (m.w + n.w) / 2 + 12 || Math.abs(m.y - n.y) > (m.h + n.h) / 2 + 20);
  for (let it = 0; it < +arg("climb", 4000) && best.s > 0; it++) { const n = best.ns[Math.floor(rnd() * best.ns.length)]; const ox = n.x, oy = n.y; const r = 30 + rnd() * 140; const per0 = per(); const a = rnd() * 6.283; n.x += Math.cos(a) * r; n.y += Math.sin(a) * r; if (!free(n)) { n.x = ox; n.y = oy; continue; } const sc = score(best.L); if (sc.s < best.s || (sc.s === best.s && per() <= per0)) { Object.assign(best, sc); } else { n.x = ox; n.y = oy; } } }
console.log("nodes", nodes.length, "edges", links.length, "communities", nc, "hubs", [...hubs].map((h) => meta[h].name).join(", "), "| crossings", best.cr, "edge-through-box", best.hit);

// ---- SVG ---------------------------------------------------------------------------------------------------------------
best.ns.forEach((n) => { n.x *= 1.4; n.y *= 1.4; });
const ns = best.ns; const minx = Math.min(...ns.map((n) => n.x - n.w / 2)) - 70, maxx = Math.max(Math.max(...ns.map((n) => n.x + n.w / 2)) + 70, Math.min(...ns.map((n) => n.x - n.w / 2)) + 1180), miny = Math.min(...ns.map((n) => n.y - n.h / 2)) - 80, maxy = Math.max(...ns.map((n) => n.y + n.h / 2)) + 70;
const PAL = ["#3b82c4", "#d9822b", "#2e9e6b", "#a24fc7", "#c9a227", "#d6456b", "#2aa0a8", "#7a6f5c", "#6b7fd6", "#8a9a3d"];
const kindStroke = { class: "#1f6f8b", file: "#a15c07", module: "#6a3fa0", html: "#888" };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const comms = [...new Set(ns.map((n) => n.c))];
const hullOf = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minx} ${miny} ${maxx - minx} ${maxy - miny + 90}" width="${Math.round(maxx - minx)}" height="${Math.round(maxy - miny + 90)}" font-family="Inter, DejaVu Sans, sans-serif"><rect x="${minx}" y="${miny}" width="100%" height="100%" fill="#fff"/>`;
svg += `<defs><marker id="a" viewBox="0 0 8 8" refX="7" refY="4" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="#2b3a46"/></marker></defs>`;
svg += `<text x="${minx + 20}" y="${miny + 26}" font-size="20" font-weight="700" fill="#1d2328">LabelBee: how the blocks couple</text><text x="${minx + 20}" y="${miny + 46}" font-size="12" fill="#5d6872">Boxes are placed by their couplings (strong links pull together); shaded groups are detected communities. Line width = number of uses (calls + reads + writes);</text><text x="${minx + 20}" y="${miny + 62}" font-size="12" fill="#5d6872">edges with fewer than ${MIN} uses are not drawn. Box border: blue = class, orange = classic script (its globals), violet = ES module. Arrow = direction of use.</text>`;
comms.forEach((c, i) => { const ms = ns.filter((n) => n.c === c); const pts = ms.flatMap((n) => [[n.x - n.w / 2, n.y - n.h / 2], [n.x + n.w / 2, n.y - n.h / 2], [n.x + n.w / 2, n.y + n.h / 2], [n.x - n.w / 2, n.y + n.h / 2]]); const h = hullOf(pts); const col = PAL[i % PAL.length]; const cx = ms.reduce((a, n) => a + n.x, 0) / ms.length, top = Math.min(...ms.map((n) => n.y - n.h / 2)) - 30;
  svg += `<polygon points="${h.map((p) => p.join(",")).join(" ")}" fill="${col}" fill-opacity=".13" stroke="${col}" stroke-opacity=".13" stroke-width="44" stroke-linejoin="round"/>`; });
const clip = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const t = Math.min((a.w / 2 + 3) / Math.abs(dx || 1e-9), (a.h / 2 + 3) / Math.abs(dy || 1e-9)); return { x: a.x + dx * t, y: a.y + dy * t }; };
for (const l of best.L) { const a = l.source, b = l.target; const p = clip(a, b), q = clip(b, a); const f = dir(a.id, b.id), r = dir(b.id, a.id); const wd = Math.min(7, .8 + Math.log2(l.w) * .75);
  svg += `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="#2b3a46" stroke-opacity=".55" stroke-width="${wd.toFixed(1)}" ${f > 0 && r / (f + r) < .15 ? 'marker-end="url(#a)"' : r > 0 && f / (f + r) < .15 ? 'marker-start="url(#a)"' : 'marker-end="url(#a)" marker-start="url(#a)"'}/>`;
  if (l.w >= 25) svg += `<text x="${((p.x + q.x) / 2).toFixed(1)}" y="${((p.y + q.y) / 2 - 3).toFixed(1)}" font-size="10" text-anchor="middle" fill="#2b3a46" stroke="#fff" stroke-width="3" paint-order="stroke">${l.w}</text>`; }
for (const n of ns) svg += `<rect x="${(n.x - n.w / 2).toFixed(1)}" y="${(n.y - n.h / 2).toFixed(1)}" width="${n.w}" height="${n.h}" rx="5" fill="#fff" stroke="${kindStroke[n.kind]}" stroke-width="2"/><text x="${n.x.toFixed(1)}" y="${(n.y + 4.5).toFixed(1)}" font-size="13" font-weight="600" text-anchor="middle" fill="#1d2328">${esc(n.name)}</text>`;
const hl = [...hubs].map((h) => `${meta[h].name} (${nb.get(h).size})`);
if (hubs.size) svg += `<text x="${minx + 20}" y="${maxy + 40}" font-size="12" fill="#5d6872">Shared services, used from many blocks and not drawn (number of blocks coupled): ${esc(hl.join(", "))}.</text></svg>`;
fs.writeFileSync(OUT, svg); console.log("wrote", path.relative(ROOT, OUT));
