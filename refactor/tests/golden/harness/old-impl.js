// Evaluates the ORIGINAL functions of AnnotationIO.js in a vm context with stubbed globals.
// Source of truth for goldens (slice 1, ADR 0002). Fresh context per call: implicit globals
// (data0, src, evts...) cannot leak between cases.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const FUNCTIONS = [
  'sanitizeEvents', 'tagsAddFrames', 'tracks_csv_to_json', 'tags_csv_to_json',
  'tags_csv_to_tagjson', 'tracks_tagged_csv_to_json', 'db_to_json', 'flatjson_to_json',
  'resultToObjects',
];

// Text of `function name(...) {...}` up to the next top-level `function`/`var`/comment block.
function extractFunction(src, name) {
  const start = src.indexOf('\nfunction ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  const rest = src.slice(start + 1);
  const end = rest.slice(1).search(/\n(function |var |\/\*|\/\/ )/);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

function loadSources() {
  const io = fs.readFileSync(path.join(JS_DIR, 'AnnotationIO.js'), 'utf8');
  const sel = fs.readFileSync(path.join(JS_DIR, 'SelectionControl.js'), 'utf8');
  const labelMap = sel.match(/var labelMap = \{[\s\S]*?\n\};/)[0];
  const labelFns = ['normalizeLabel', 'toLabelArray', 'hasLabel', 'containsLabel']
    .map((n) => extractFunction(sel, n));
  return [labelMap, ...labelFns, ...FUNCTIONS.map((n) => extractFunction(io, n))].join('\n');
}

const PINNED_LOG = /ABORTED|unsupported|WARNING/;
// Errors are pinned by name only (V8 message text varies by Node version); duck-typed because
// errors thrown inside the vm context are not instanceof the host Error.
const fmt = (a) => (a && typeof a.message === 'string' && a.name ? a.name : String(a));

// Returns {fns, rec}. rec collects what the tests pin: alerts, error-path logs, SQL sent to db.
function makeOldImpl({ logIO = true } = {}) {
  const rec = { alerts: [], logs: [], errors: [], sql: [] };
  const sandbox = {
    console: {
      log: (...a) => { const s = a.map(fmt).join(' '); if (PINNED_LOG.test(s)) rec.logs.push(s); },
      error: (...a) => rec.errors.push(a.map(fmt).join(' ')),
    },
    alert: (m) => rec.alerts.push(String(m)),
    logging: { io: logIO },
    $: { inArray: (v, arr) => arr.indexOf(v) },
    performance: { now: () => 0 },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(loadSources(), ctx, { filename: 'AnnotationIO.js(extracted)' });
  const fns = {};
  for (const n of FUNCTIONS) fns[n] = ctx[n];
  return { fns, rec };
}

module.exports = { makeOldImpl, FUNCTIONS };
