// Golden tests for the save/export functions (slice 2, ADR 0004). Run: node --test refactor/tests/golden/slice2/
// Implementation under test: annotation/AnnotationCodec.js. The golden was pinned from the original
// AnnotationIO.js functions (deleted in step 3).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { loadNewSaveImpl } = require('../harness/new-save-impl');
const { runCase } = require('../harness/run-case');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'annotation-save.golden.json'), 'utf8'));

test('golden covers exactly the fixture cases', () => {
  assert.deepEqual(Object.keys(golden).sort(), cases.map((c) => c.name).sort());
});

for (const c of cases) {
  test(c.name, async () => {
    assert.deepEqual(runCase(await loadNewSaveImpl(), c), golden[c.name]);
  });
}
