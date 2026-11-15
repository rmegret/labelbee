// annotation/WrongId.js (slice 5 step 5, ADR 0008): the wrong-id unit, `newid` and `fix`, as pure functions returning the changed fields.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = () => import(pathToFileURL(path.join(JS_DIR, 'annotation/WrongId.js')).href);
const json = (o) => JSON.parse(JSON.stringify(o)); // what the file keeps: undefined values drop

test('wrongidToggled on: the label, and an empty fix when there is none', async () => {
  const W = await load();
  assert.deepEqual(json(W.wrongidToggled({ ID: '1', labels: 'pollen' }, true)), { labels: 'pollen,wrongid', fix: {} });
  assert.deepEqual(json(W.wrongidToggled({ ID: '1', labels: null }, true)), { labels: 'wrongid', fix: {} });
  const fix = { newid: '9', tagangle: 90 };
  assert.deepEqual(W.wrongidToggled({ ID: '1', labels: '', fix }, true), { labels: 'wrongid' }); // an existing fix stays
});

test('wrongidToggled off: the label only', async () => {
  const W = await load();
  assert.deepEqual(W.wrongidToggled({ ID: '1', labels: 'wrongid,pollen', fix: { newid: '9' } }, false), { labels: 'pollen' });
});

test('newidTyped: newid and fix.newid, the label, the other fields of fix kept, the input not mutated', async () => {
  const W = await load();
  assert.deepEqual(json(W.newidTyped({ ID: '1', labels: '' }, '9')), { newid: '9', fix: { newid: '9' }, labels: 'wrongid' });
  const obs = { ID: '1', labels: 'wrongid', fix: { newid: '4', tagangle: 90 } };
  assert.deepEqual(W.newidTyped(obs, '9'), { newid: '9', fix: { newid: '9', tagangle: 90 } });
  assert.deepEqual(obs.fix, { newid: '4', tagangle: 90 });
});

test('newidTyped with an empty box clears newid and touches nothing else', async () => {
  const W = await load();
  const f = W.newidTyped({ ID: '1', labels: 'wrongid', fix: { newid: '4' } }, undefined);
  assert.deepEqual(Object.keys(f), ['newid']);
  assert.equal(f.newid, undefined);
});

test('alternateTagChosen: another id sets newid and fix, creating them with a zero angle', async () => {
  const W = await load();
  assert.deepEqual(W.alternateTagChosen({ ID: '1', labels: 'pollen' }, '7'), { labels: 'pollen,wrongid', newid: '7', fix: { newid: '7', tagangle: 0 } });
  assert.deepEqual(W.alternateTagChosen({ ID: '1', labels: '', fix: { newid: '4', tagangle: 90 } }, '7').fix, { newid: '7', tagangle: 90 });
});

test('alternateTagChosen: the same id cancels the fix and the label', async () => {
  const W = await load();
  const f = W.alternateTagChosen({ ID: '1', labels: 'wrongid,pollen', fix: { newid: '4', tagangle: 90, oldp: 1 } }, '1');
  assert.deepEqual(json(f), { labels: 'pollen', fix: { oldp: 1 } });
  assert.deepEqual(json(W.alternateTagChosen({ ID: '1', labels: 'wrongid' }, '1')), { labels: '' }); // no fix: nothing to cancel
});

test('tagRotated: label on, newid cleared, angle added and kept in (-180, 180]', async () => {
  const W = await load();
  assert.deepEqual(json(W.tagRotated({ ID: '1', labels: '' }, 90)), { labels: 'wrongid', fix: { tagangle: 90 } });
  assert.equal(W.tagRotated({ ID: '1', labels: '', fix: { tagangle: 90 } }, 90).fix.tagangle, 180);
  assert.equal(W.tagRotated({ ID: '1', labels: '', fix: { tagangle: 180 } }, 90).fix.tagangle, -90);
  assert.equal(W.tagRotated({ ID: '1', labels: '', fix: { tagangle: -90 } }, -90).fix.tagangle, 180);
  assert.equal(W.tagRotated({ ID: '1', labels: '', fix: { newid: '4', tagangle: 90 } }, 90).newid, undefined);
});

test('tagRotated after the toggle stores NaN (DEBT-740, kept as it was)', async () => {
  const W = await load();
  assert.ok(Number.isNaN(W.tagRotated({ ID: '1', labels: '', fix: { newid: undefined } }, 90).fix.tagangle));
});
