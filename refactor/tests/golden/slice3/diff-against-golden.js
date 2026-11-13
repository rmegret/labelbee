// Prints, per case, which parts of the observation differ from annotation-io.golden.json (before/after).
// Use it to review exactly what a step changes before running generate.js. Usage:
//   node refactor/tests/golden/slice3/diff-against-golden.js
'use strict';
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { loadIoEnv } = require('../harness/io-env');
const { runIoCase } = require('../harness/run-io-case');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'annotation-io.golden.json'), 'utf8'));

(async () => {
  const makeEnv = await loadIoEnv();
  let n = 0;
  for (const c of cases) {
    const got = await runIoCase(makeEnv, c);
    const want = golden[c.name];
    const keys = Object.keys({ ...want, ...got }).filter((k) => JSON.stringify(got[k]) !== JSON.stringify(want[k]));
    if (!keys.length) continue;
    n++;
    console.log(c.name);
    for (const k of keys) console.log('   ' + k + ': ' + JSON.stringify(want[k]) + '  ->  ' + JSON.stringify(got[k]));
  }
  console.log(n + ' case(s) differ from the golden');
})();
