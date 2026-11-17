// ADR 0009 step 1: static inventory of the calls of the refresh entry points (regex scan, no code run). Output: JSON of call sites on stdout.
// Usage (repo root): node refactor/design/0009-refresh-coupling-inventory.js > inventory.json; then node refactor/design/0009-refresh-coupling.js inventory.json
const fs = require("fs"), path = require("path");
const root = "labelbee/static/labelbee/js";
const skip = /\/(extern|legacy)\//;
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (skip.test(p + "/")) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js")) files.push(p);
  }
})(root);

// entry point -> regex of a call (not the definition, not a comment line)
const ENTRY = {
  "refreshChronogram": /\brefreshChronogram\s*\(/,
  "videoControl.refresh": /\b(videoControl|this\.videoControl|vc)\.refresh\s*\(/,
  "updateForm": /\bupdateForm\s*\(/,
  "onFrameChanged": /\bonFrameChanged\s*\(/,
  "drawChrono": /\bdrawChrono\s*\(/,
  "overlay.hardRefresh": /\b(overlay|this)\.hardRefresh\s*\(/,
  "overlay.refreshOverlay": /\b(overlay|this)\.refreshOverlay\s*\(/,
  "refreshZoom": /\brefreshZoom\s*\(/,
  "updateChronoXDomainFromVideo": /\bupdateChronoXDomainFromVideo\s*\(/,
  "updateChrono": /\bupdateChrono\s*\(/,
  "renderObsTable": /\brenderObsTable\s*\(/,
  "updateEventTree": /\bupdateEventTree\s*\(/,
  "updateEventsNotes": /\bupdateEventsNotes\s*\(/,
};
const DEF = /(function\s+(\w+)\s*\()|((?:[\w$]+\.)*prototype\.(\w+)\s*=\s*function)|(this\.(\w+)\s*=\s*function)|(^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{\s*$)|((?:var|let|const)\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))/;
const out = [];
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  // enclosing function by a backwards scan for the nearest definition with smaller-or-equal indentation
  const encl = (i) => {
    const ind = lines[i].match(/^\s*/)[0].length;
    for (let j = i; j >= 0; j--) {
      const l = lines[j];
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue;
      const m = DEF.exec(l);
      if (m) {
        const jind = l.match(/^\s*/)[0].length;
        if (jind < ind || j === i) {
          const name = m[2] || m[4] || m[6] || m[8] || m[10];
          if (/^(if|for|while|switch|catch|function)$/.test(name || "")) continue;
          return { name: name || "?", line: j + 1 };
        }
      }
    }
    return { name: "<top>", line: 0 };
  };
  lines.forEach((l, i) => {
    const code = l.replace(/\/\/.*$/, "");
    if (/^\s*(\*|\/\*)/.test(l)) return;
    for (const [entry, re] of Object.entries(ENTRY)) {
      if (!re.test(code)) continue;
      if (/function\s+\w+\s*\(/.test(code) && !/;\s*$/.test(code.trim()) && new RegExp("function\\s+" + entry.split(".").pop() + "\\s*\\(").test(code)) continue; // definition
      if (/prototype\.\w+\s*=\s*function/.test(code)) continue;
      const e = encl(i);
      out.push({ file: f.replace(root + "/", ""), line: i + 1, entry, fn: e.name, fnLine: e.line, text: l.trim().slice(0, 110) });
    }
  });
}
console.log(JSON.stringify(out, null, 0));
