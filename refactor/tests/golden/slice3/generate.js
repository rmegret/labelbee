// Generates annotation-io.golden.json from the AnnotationIO.js of the working tree.
// Run ONLY before a step that changes behavior on purpose, and review the diff. Usage:
//   node refactor/tests/golden/slice3/generate.js
'use strict';
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { loadIoEnv } = require('../harness/io-env');
const { runIoCase } = require('../harness/run-io-case');

(async () => {
  const makeEnv = await loadIoEnv();
  const golden = {};
  for (const c of cases) golden[c.name] = await runIoCase(makeEnv, c);
  fs.writeFileSync(path.join(__dirname, 'annotation-io.golden.json'), JSON.stringify(golden, null, 1) + '\n');
  console.log('wrote', Object.keys(golden).length, 'cases');
})();
