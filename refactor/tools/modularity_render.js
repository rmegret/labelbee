// Modularity map, stage 3: embeds refactor/scratch/modularity-boxes.json in modularity_template.html.
// Usage (repo root): node refactor/tools/modularity_render.js [boxes.json] [out.html]
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ROOT, "refactor/scratch/modularity-boxes.json"), "utf8"));
const slim = { boxes: d.boxes, edges: d.edges, pages: d.pages };
const n = d.boxes.reduce((a, b) => a + b.subs.reduce((x, s) => x + s.units, 0), 0);
const html = fs.readFileSync(path.join(__dirname, process.argv[5] || "modularity_template.html"), "utf8").replace("__NUNITS__", n).replace("__DATA__", () => JSON.stringify(slim).replace(/</g, "\\u003c"));
const out = process.argv[3] || path.join(ROOT, "refactor/analysis/modularity-map.html");
fs.writeFileSync(out, html); console.log("wrote", path.relative(ROOT, out), (html.length / 1024).toFixed(0) + " KB");
