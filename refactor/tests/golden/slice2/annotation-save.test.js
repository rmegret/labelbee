// Golden tests for the save/export functions (slice 2, ADR 0004). Run: node --test refactor/tests/golden/slice2/
// Implementation under test: 'old' = functions of AnnotationIO.js in a vm. Step 2 adds 'new' =
// annotation/AnnotationCodec.js; both must match the same golden.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { makeOldSaveImpl } = require('../harness/old-save-impl');
const { runCase } = require('../harness/run-case');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'annotation-save.golden.json'), 'utf8'));
const IMPLS = { old: async () => makeOldSaveImpl };

test('golden covers exactly the fixture cases', () => {
  assert.deepEqual(Object.keys(golden).sort(), cases.map((c) => c.name).sort());
});

for (const [implName, load] of Object.entries(IMPLS)) {
  for (const c of cases) {
    test(`${implName}: ${c.name}`, async () => {
      assert.deepEqual(runCase(await load(), c), golden[c.name]);
    });
  }
}
