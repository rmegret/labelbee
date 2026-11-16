// sanitizeEvents centerPolicy (slice 5 step 3, ADR 0008 R7): which of (x, y) and (cx, cy) is the truth.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

async function run(obj, options) {
  const codec = await load('annotation/AnnotationCodec.js');
  const { setNotifier } = await load('core/Notifier.js');
  const logs = [];
  setNotifier({ alert: () => {}, log: (m) => logs.push(String(m)), logError: () => {} });
  const r = codec.sanitizeEvents(obj, options);
  return { r, warnings: logs.filter((m) => /WARNING.*disagree/.test(m)) };
}

const v2 = (evts) => ({ info: { type: 'events-multiframe' }, data: { 0: evts } });
const box = (o) => Object.assign({ id: 1, x: 10, y: 20, width: 4, height: 6, angle: 0, cx: 12, cy: 23 }, o);

test('consistent center: nothing changes, no warning, whatever the policy', async () => {
  for (const centerPolicy of [undefined, 'xy', 'cxcy']) {
    const { r, warnings } = await run(v2([box()]), centerPolicy && { centerPolicy });
    assert.deepEqual([r.data[0][1].x, r.data[0][1].y, r.data[0][1].cx, r.data[0][1].cy], [10, 20, 12, 23]);
    assert.equal(warnings.length, 0);
  }
});

test('default policy "xy": x, y are the truth, cx, cy are recomputed, one warning with the count', async () => {
  const { r, warnings } = await run(v2([box({ id: 1, cx: 99 }), box({ id: 2, cy: 99 }), box({ id: 3 })]));
  assert.deepEqual([r.data[0][1].x, r.data[0][1].cx, r.data[0][1].cy], [10, 12, 23]);
  assert.deepEqual([r.data[0][2].y, r.data[0][2].cx, r.data[0][2].cy], [20, 12, 23]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /2 observation\(s\)/);
  assert.match(warnings[0], /x, y are the truth/);
});

test('policy "cxcy": cx, cy are the truth, x, y are recomputed', async () => {
  const { r, warnings } = await run(v2([box({ x: 0, y: 0 })]), { centerPolicy: 'cxcy' });
  assert.deepEqual([r.data[0][1].x, r.data[0][1].y, r.data[0][1].cx, r.data[0][1].cy], [10, 20, 12, 23]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /cx, cy are the truth/);
});

test('the 3-decimal rounding of the files is not a disagreement', async () => {
  const { r, warnings } = await run(v2([box({ x: 10.0004, y: 20.0004, width: 4.0006, cx: 12.0009, cy: 23 })]));
  assert.equal(r.data[0][1].cx, 12.0009);
  assert.equal(warnings.length, 0);
});

test('an observation that lacks one of the sets, or has no number, is left as it is', async () => {
  const a = { id: 1, x: 10, y: 20, width: 4, height: 6 };            // no cx, cy
  const b = { id: 2, cx: 5, cy: 5, width: 4, height: 6 };            // no x, y
  const c = { id: 3, x: '10', y: 20, width: 4, height: 6, cx: 1, cy: 1 }; // x is a string
  const { r, warnings } = await run(v2([a, b, c]), { centerPolicy: 'cxcy' });
  assert.deepEqual(Object.keys(r.data[0][1]).sort(), ['ID', 'height', 'labels', 'width', 'x', 'y']);
  assert.equal(r.data[0][2].x, undefined);
  assert.equal(r.data[0][3].cx, 1);
  assert.equal(warnings.length, 0);
});

test('v1 files: the policy applies to the observations, fixed in place', async () => {
  const obs = { id: 1, x: 10, y: 20, width: 4, height: 6, cx: 99, cy: 99 };
  const { r, warnings } = await run([[obs]]);
  assert.deepEqual([obs.cx, obs.cy], [12, 23]);
  assert.equal(r.data[0][0], obs);
  assert.equal(warnings.length, 1);
});

test('an unknown policy throws', async () => {
  const codec = await load('annotation/AnnotationCodec.js');
  assert.throws(() => codec.sanitizeEvents(v2([]), { centerPolicy: 'xyz' }), /centerPolicy should be/);
});
