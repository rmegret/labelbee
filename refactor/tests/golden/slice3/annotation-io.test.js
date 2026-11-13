// Golden tests for setTracks/setTags and the loaders of AnnotationIO.js (slice 3, ADR 0005).
// Run: node --test refactor/tests/golden/slice3/
// Implementation under test: the functions of labelbee/static/labelbee/js/AnnotationIO.js, extracted into a vm.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { loadIoEnv } = require('../harness/io-env');
const { runIoCase } = require('../harness/run-io-case');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'annotation-io.golden.json'), 'utf8'));

test('golden covers exactly the fixture cases', () => {
  assert.deepEqual(Object.keys(golden).sort(), cases.map((c) => c.name).sort());
});

for (const c of cases) {
  test(c.name, async () => {
    assert.deepEqual(await runIoCase(await loadIoEnv(), c), golden[c.name]);
  });
}
