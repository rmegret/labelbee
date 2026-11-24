// Golden tests for the pure load functions (slice 1, ADR 0002). Run: node --test refactor/tests/golden/slice1/
// Implementation under test: codecs/AnnotationCodec.js. The golden was pinned from the
// original AnnotationIO.js functions (deleted in step 3).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { loadNewImpl } = require('../harness/new-impl');
const { runCase } = require('../harness/run-case');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'annotation-load.golden.json'), 'utf8'));

test('golden covers exactly the fixture cases', () => {
  assert.deepEqual(Object.keys(golden).sort(), cases.map((c) => c.name).sort());
});

for (const c of cases) {
  test(c.name, async () => {
    assert.deepEqual(runCase(await loadNewImpl(), c), golden[c.name]);
  });
}
