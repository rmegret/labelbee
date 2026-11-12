// Regenerates annotation-save.golden.json by running the OLD code (AnnotationIO.js in a vm).
// Only run this to (re)pin current behavior, never to make a failing test pass silently:
// review the diff of the golden file. Usage: node refactor/tests/golden/slice2/generate.js
// Stops working once step 3 of ADR 0004 deletes the old definitions; the golden then stays the reference.
'use strict';
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { makeOldSaveImpl } = require('../harness/old-save-impl');
const { runCase } = require('../harness/run-case');

const golden = {};
for (const c of cases) {
  if (golden[c.name]) throw new Error('duplicate case name: ' + c.name);
  golden[c.name] = runCase(makeOldSaveImpl, c);
}
const file = path.join(__dirname, 'annotation-save.golden.json');
fs.writeFileSync(file, JSON.stringify(golden, null, 2) + '\n');
console.log('wrote ' + Object.keys(golden).length + ' cases to ' + path.relative(process.cwd(), file));
