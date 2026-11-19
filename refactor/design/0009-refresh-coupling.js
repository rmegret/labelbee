// ADR 0009 step 1: coupling table and graph of the refresh calls, from the static inventory of 0009-refresh-coupling-inventory.js.
// Usage (repo root): node refactor/design/0009-refresh-coupling.js inventory.json   -> markdown tables on stdout, writes refactor/design/0009-refresh-coupling.svg
// The classes of the sites (A..V) are the reading of step 1 (each enclosing function was read), kept as the lists below.
const fs = require("fs");
const sites = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const TARGET = {
  refreshChronogram: "ChronoControl", drawChrono: "ChronoControl", updateChrono: "ChronoControl", updateChronoXDomainFromVideo: "ChronoControl", renderObsTable: "ChronoControl",
  "videoControl.refresh": "VideoControl", onFrameChanged: "VideoControl",
  "overlay.hardRefresh": "OverlayControl", "overlay.refreshOverlay": "OverlayControl",
  refreshZoom: "ZoomView", updateForm: "SelectionControl", updateEventTree: "SelectionControl", updateEventsNotes: "AnnotationIO",
};
// Class of a refresh call by the function that makes it
const A = new Set(`setTracks loadEvents loadEventsFromServerByID eventsFromServer loadTracksCSVFromDB loadTracksCSVFromServer loadTrackTaggedCSVFromServer loadConvertedCSVFromServer
  cleanObsoleteEvents onKeyDown_IDEdit onKeyDown_NewIDEdit doSetSpanEnd doSetSpanStart newRectForCurrentTag onMouseUp_interactiveRect doSwap2 submitDraft storeUnit deleteEvent undoAction labelToggle
  setSpanFrame newVisit onClickAlternateTag rotateTag bakeAllTagFixes deleteFalsealarmEvents deleteWrongIdEvents`.split(/\s+/));
const C = new Set("setTags loadTagsCSVFromServer deleteFalsealarmTags undoAllTagFixes".split(/\s+/));
const classOf = (s) => {
  if (s.entry === "onFrameChanged") return "D";
  if (s.entry !== "refreshChronogram" && s.entry !== "videoControl.refresh") return "V"; // the view chain itself (selection, overlay, zoom)
  if (A.has(s.fn)) return "A";
  if (C.has(s.fn)) return "C";
  if (s.entry === "refreshChronogram") return "B"; // filters, toggles, parameters, ids, auto-event mode
  return "E"; // overlay only: pan, zoom, show tags, deselect, re-select, ctrl+r
};
const CLASS = { A: "store write", B: "derived config", C: "tags", D: "frame / video", E: "display only", V: "view chain" };
const COLOR = { A: "#d62728", B: "#1f77b4", C: "#9467bd", D: "#2ca02c", E: "#7f7f7f", V: "#bcbd22" };

for (const s of sites) { s.cls = classOf(s); s.target = TARGET[s.entry]; s.caller = s.file.replace(/^.*\//, "").replace(".js", ""); }
const cross = sites.filter((s) => s.caller !== s.target);

// ---- markdown tables
const callers = [...new Set(sites.map((s) => s.caller))];
const targets = ["ChronoControl", "VideoControl", "OverlayControl", "ZoomView", "SelectionControl", "AnnotationIO"];
const count = (f) => sites.filter(f).length;
const out = [];
out.push("| caller file | " + targets.join(" | ") + " | same file | cross-file |", "|---|" + "---|".repeat(targets.length + 2));
for (const c of callers.sort((a, b) => count((s) => s.caller === b && s.caller !== s.target) - count((s) => s.caller === a && s.caller !== s.target))) {
  const row = targets.map((t) => count((s) => s.caller === c && s.target === t && c !== t) || "");
  out.push(`| ${c} | ${row.join(" | ")} | ${count((s) => s.caller === c && s.target === c) || ""} | ${count((s) => s.caller === c && s.target !== c)} |`);
}
out.push("", "| class | sites | refreshChronogram | videoControl.refresh | other entry points |", "|---|---|---|---|---|");
for (const k of Object.keys(CLASS)) {
  const n = (e) => count((s) => s.cls === k && s.entry === e);
  out.push(`| ${k} ${CLASS[k]} | ${count((s) => s.cls === k)} | ${n("refreshChronogram")} | ${n("videoControl.refresh")} | ${count((s) => s.cls === k && s.entry !== "refreshChronogram" && s.entry !== "videoControl.refresh")} |`);
}
console.log(out.join("\n"));
console.log(`\nsites ${sites.length}, cross-file ${cross.length}, per entry:`, JSON.stringify(Object.fromEntries(Object.keys(TARGET).map((e) => [e, count((s) => s.entry === e)]))));

// ---- graph: two panels of callers (left) -> entry points (right), cross-file calls only, one edge per (caller, entry, class).
// Panel 1: data-change refreshes (classes A, B, C, E: they only ask for the two global refreshes). Panel 2: the view chain and the frame (V, D).
// Each edge has its own port on both nodes (sorted by the other end), so the edges do not run on top of each other.
const PANELS = [
  { title: "1. Who asks for a global refresh: data and configuration changes", classes: ["A", "B", "C", "E"] },
  { title: "2. The view chain and the frame change (selection, overlay, zoom, chronogram axes)", classes: ["V", "D"] },
];
const entryOrder = ["refreshChronogram", "videoControl.refresh", "updateForm", "updateEventTree", "overlay.hardRefresh", "overlay.refreshOverlay", "refreshZoom", "onFrameChanged", "drawChrono", "updateChrono", "updateChronoXDomainFromVideo", "renderObsTable", "updateEventsNotes"];
const W = 1000, xL = 40, xR = 650, nodeW = 190, portGap = 7, minH = 34;
const svg = [];
let y0 = 70;
svg.push(`<text x="${xL}" y="28" font-size="16" font-weight="bold">Who asks whom to refresh (cross-file calls, eb473985 + step 0)</text>`);
svg.push(`<text x="${xL}" y="46" fill="#555">left: the file that calls; right: the refresh entry point it calls. Width = number of call sites; colour = class of the site.</text>`);
for (const P of PANELS) {
  const es = {};
  for (const s of cross.filter((s) => P.classes.includes(s.cls))) {
    const k = `${s.caller}|${s.entry}|${s.cls}`;
    (es[k] = es[k] || { caller: s.caller, entry: s.entry, cls: s.cls, n: 0 }).n++;
  }
  const edges = Object.values(es);
  const entries = entryOrder.filter((e) => edges.some((x) => x.entry === e));
  let callersP = [...new Set(edges.map((x) => x.caller))];
  const bary = (c) => { const m = edges.filter((x) => x.caller === c); return m.reduce((a, x) => a + entries.indexOf(x.entry) * x.n, 0) / m.reduce((a, x) => a + x.n, 0); };
  callersP.sort((a, b) => bary(a) - bary(b));
  // node heights: one port per edge
  const height = (list) => Math.max(minH, list.length * portGap + 14);
  const place = (names, getEdges, startY) => {
    const pos = {}; let y = startY;
    for (const nme of names) { const h = height(getEdges(nme)); pos[nme] = { y, h }; y += h + 12; }
    return [pos, y];
  };
  const [pL, endL] = place(callersP, (c) => edges.filter((x) => x.caller === c), y0 + 24);
  const [pR, endR] = place(entries, (e) => edges.filter((x) => x.entry === e), y0 + 24);
  // ports: at the caller, sorted by target position then class; at the entry, sorted by caller position then class
  const port = (list, pos, key, other, otherPos) => {
    const byNode = {};
    for (const x of list) (byNode[x[key]] = byNode[x[key]] || []).push(x);
    for (const [nme, xs] of Object.entries(byNode)) {
      xs.sort((a, b) => otherPos[a[other]].y - otherPos[b[other]].y || a.cls.localeCompare(b.cls));
      xs.forEach((x, i) => (x[key === "caller" ? "yL" : "yR"] = pos[nme].y + 7 + i * portGap));
    }
  };
  port(edges, pL, "caller", "entry", pR);
  port(edges, pR, "entry", "caller", pL);
  svg.push(`<text x="${xL}" y="${y0 + 8}" font-size="14" font-weight="bold">${P.title}</text>`);
  for (const x of edges)
    svg.push(`<path d="M${xL + nodeW},${x.yL} C${xL + nodeW + 200},${x.yL} ${xR - 200},${x.yR} ${xR},${x.yR}" fill="none" stroke="${COLOR[x.cls]}" stroke-width="${(1.5 + Math.sqrt(x.n)).toFixed(1)}" opacity="0.7"><title>${x.caller} -> ${x.entry}: ${x.n} (${CLASS[x.cls]})</title></path>`);
  for (const c of callersP) {
    const n = edges.filter((x) => x.caller === c).reduce((a, x) => a + x.n, 0);
    svg.push(`<rect x="${xL}" y="${pL[c].y}" width="${nodeW}" height="${pL[c].h}" rx="5" fill="#fff" fill-opacity="0.85" stroke="#555"/><text x="${xL + 8}" y="${pL[c].y + 15}" font-weight="bold">${c}</text><text x="${xL + nodeW - 8}" y="${pL[c].y + 15}" text-anchor="end" fill="#555">${n}</text>`);
  }
  for (const e of entries) {
    const n = edges.filter((x) => x.entry === e).reduce((a, x) => a + x.n, 0);
    svg.push(`<rect x="${xR}" y="${pR[e].y}" width="${nodeW + 80}" height="${pR[e].h}" rx="5" fill="#fff" fill-opacity="0.85" stroke="#555"/><text x="${xR + 8}" y="${pR[e].y + 15}" font-weight="bold">${e}</text><text x="${xR + nodeW + 72}" y="${pR[e].y + 15}" text-anchor="end" fill="#555">${n}</text><text x="${xR + 8}" y="${pR[e].y + 28}" fill="#777" font-size="10">${TARGET[e]}</text>`);
  }
  y0 = Math.max(endL, endR) + 24;
}
svg.push(`<text x="${xL}" y="${y0 + 8}" font-weight="bold">Class of the site</text>`);
Object.keys(CLASS).forEach((k, i) => svg.push(`<rect x="${xL + (i % 3) * 220}" y="${y0 + 22 + Math.floor(i / 3) * 22}" width="24" height="6" fill="${COLOR[k]}"/><text x="${xL + (i % 3) * 220 + 32}" y="${y0 + 29 + Math.floor(i / 3) * 22}">${k} ${CLASS[k]}</text>`));
const H = y0 + 80;
fs.writeFileSync("refactor/design/0009-refresh-coupling.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" font-family="sans-serif" font-size="12"><rect width="${W}" height="${H}" fill="#fff"/>\n${svg.join("\n")}\n</svg>\n`);
