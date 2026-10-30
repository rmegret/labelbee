// Golden tests for the pure load functions (slice 1, ADR 0002). Run: node --test refactor/tests/golden/slice1/
// Implementations under test: 'old' = functions of AnnotationIO.js in a vm. Step 2 adds 'new'
// (annotation/AnnotationCodec.js) to IMPLS; both must match the same golden.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cases } = require('./fixtures/cases');
const { makeOldImpl } = require('../harness/old-impl');
const { runCase } = require('../harness/run-case');

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'annotation-load.golden.json'), 'utf8'));
const IMPLS = { old: makeOldImpl };

test('golden covers exactly the fixture cases', () => {
  assert.deepEqual(Object.keys(golden).sort(), cases.map((c) => c.name).sort());
});

for (const [implName, makeImpl] of Object.entries(IMPLS)) {
  for (const c of cases) {
    test(`${implName}: ${c.name}`, () => {
      assert.deepEqual(runCase(makeImpl, c), golden[c.name]);
    });
  }
}
