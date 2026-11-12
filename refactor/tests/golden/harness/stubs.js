// Shared stubs for the slice 1 golden tests (ADR 0002): the recorder of observable side effects
// and the REAL label helpers extracted from SelectionControl.js. The goldens were generated from
// the original functions of AnnotationIO.js (git history: commit 353ffa9e); step 3 deleted them.
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

function labelSources(sel) {
  const labelMap = sel.match(/var labelMap = \{[\s\S]*?\n\};/)[0];
  const labelFns = ['normalizeLabel', 'toLabelArray', 'hasLabel', 'containsLabel']
    .map((n) => extractFunction(sel, n));
  return [labelMap, ...labelFns].join('\n');
}

const PINNED_LOG = /ABORTED|unsupported|WARNING/;
// Errors are pinned by name only (V8 message text varies by Node version); duck-typed because
// errors thrown inside the vm context are not instanceof the host Error.
const fmt = (a) => (a && typeof a.message === 'string' && a.name ? a.name : String(a));

// What the tests pin: alerts, error-path logs, console.error (by name), SQL sent to the db stub.
function makeRecorder() {
  const rec = { alerts: [], logs: [], errors: [], sql: [] };
  const stubs = {
    log: (...a) => { const s = a.map(fmt).join(' '); if (PINNED_LOG.test(s)) rec.logs.push(s); },
    error: (...a) => rec.errors.push(a.map(fmt).join(' ')),
    alert: (m) => rec.alerts.push(String(m)),
  };
  return { rec, stubs };
}

// The real label helpers of SelectionControl.js (hasLabel and what it calls), alone in a vm.
function makeHasLabel() {
  const sel = fs.readFileSync(path.join(JS_DIR, 'SelectionControl.js'), 'utf8');
  const ctx = vm.createContext({ $: { inArray: (v, arr) => arr.indexOf(v) } });
  vm.runInContext(labelSources(sel), ctx, { filename: 'SelectionControl.js(extracted)' });
  return ctx.hasLabel;
}

module.exports = { makeRecorder, makeHasLabel, FUNCTIONS };
