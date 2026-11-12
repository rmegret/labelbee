// Round trip (slice 2, ADR 0004): what convertTracksToV2 saves, sanitizeEvents (slice 1) loads back.
// Both from annotation/AnnotationCodec.js. Assertions on the documented contract (BEH-710, BEH-717),
// not a golden.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadNewSaveImpl } = require('../harness/new-save-impl');
const { loadNewImpl } = require('../harness/new-impl');

const obs = (ID, extra = {}) => ({
  ID, time: 0, frame: 0, x: 10.12345, y: 20.6789, cx: 0, cy: 0, width: 30.5555, height: 40, angle: 1.5,
  bool_acts: [false, true, false, false], notes: 'n', labels: 'pollen', ...extra,
});

test('v2 save then sanitizeEvents returns the saved model', async () => {
  const save = (await loadNewSaveImpl())().fns;
  const load = (await loadNewImpl())().fns;
  const Tracks = {
    0: { 1: obs(1), 2: obs(2, { labels: 'fanning', bool_acts: [true, false, false, false] }) },
    3: { 1: obs(1, { frame: 3 }) },
  };
  const saved = save.convertTracksToV2(Tracks, { type: 'events-multiframe', source: 's' }, { name: 'v' });
  const back = load.sanitizeEvents(JSON.parse(JSON.stringify(saved))); // through JSON, as a file

  assert.equal(back.info.type, 'events-multiframe');
  assert.equal(back.info.source, 's');
  assert.deepEqual(Object.keys(back.data), ['0', '3']);
  assert.deepEqual(Object.keys(back.data['0']), ['1', '2']);
  const e = back.data['0']['1'];
  assert.equal(e.ID, '1');
  assert.equal(e.x, 10.123); // rounded to 3 decimals by the save
  assert.equal(e.cx, 25.401);
  assert.equal(e.notes, 'n');
  assert.equal(e.labels, 'pollen');
  assert.deepEqual(e.bool_acts, [false, true, false, false]); // rebuilt from labels at load
  assert.deepEqual(back.data['0']['2'].bool_acts, [true, false, false, false]);
  assert.equal(back.data['3']['1'].frame, 3);
});
