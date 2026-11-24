// codecs/AnnotationCodec.js: the two CSV loaders added with the /data dialog schemas (CSV loading debuggability),
// events_csv_to_json (*.events.csv, *.events_tagged.csv) and detections_csv_to_json (*.detections.csv).
// New code, no old implementation to pin: the expected values are written by hand from the mapping documented in
// codecs/CsvSchemas.js. Run: node --test refactor/tests/golden/csvloaders/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const urlOf = (rel) => pathToFileURL(path.join(JS_DIR, rel)).href;
const load = async () => {
  const { setNotifier } = await import(urlOf('core/Notifier.js'));
  setNotifier({ alert() {}, log() {}, logError() {} });
  return import(urlOf('codecs/AnnotationCodec.js'));
};

const INFO = { type: 'events-multiframe', source: 'synthetic' };

// One row of *.events.csv: a track from frame 10 to frame 20.
const track = (extra = {}) => ({
  track_id: '7', track_startframe: '10', track_endframe: '20',
  track_startx: '100', track_starty: '200', track_starta: '5',
  track_endx: '110', track_endy: '220', track_enda: '15',
  track_event: 'entering', track_shape: 'round', track_tagid: '42',
  ...extra,
});

test('events: a track gives a start and an end observation', async () => {
  const C = await load();
  const out = C.events_csv_to_json([track()], INFO);
  assert.equal(out.info, INFO);
  assert.deepEqual(Object.keys(out.data).sort(), ['10', '20']);
  assert.deepEqual(out.data[10].T7, {
    id: 'T7', frame: 10, cx: 100, cy: 200, angle: 95, width: 300, height: 600, x: -50, y: -100,
    span: { f1: 10, f2: 20 }, labels: 'entering,round', parts: [], tag: { id: 42, frame: 10 },
  });
  assert.deepEqual(out.data[20].T7, {
    id: 'T7', frame: 20, cx: 110, cy: 220, angle: 105, width: 300, height: 600, x: -40, y: -80,
    span: { f1: 10, f2: 20 }, labels: 'entering,round', parts: [], tag: { id: 42, frame: 20 },
  });
});

test('events: frames before the clip (< 0) are skipped, the span stays the whole track', async () => {
  const C = await load();
  const out = C.events_csv_to_json([track({ track_startframe: '-5' })], INFO);
  assert.deepEqual(Object.keys(out.data), ['20']);
  assert.deepEqual(out.data[20].T7.span, { f1: -5, f2: 20 });
  const none = C.events_csv_to_json([track({ track_startframe: '-5', track_endframe: '-1' })], INFO);
  assert.deepEqual(none.data, {});
});

test('events: no tag key without a track_tagid (empty or missing)', async () => {
  const C = await load();
  assert.equal('tag' in C.events_csv_to_json([track({ track_tagid: '' })], INFO).data[10].T7, false);
  const row = track();
  delete row.track_tagid;
  assert.equal('tag' in C.events_csv_to_json([row], INFO).data[10].T7, false);
  assert.deepEqual(C.events_csv_to_json([track({ track_tagid: '0' })], INFO).data[10].T7.tag, { id: 0, frame: 10 });
});

test('events: labels join the non-empty event and shape', async () => {
  const C = await load();
  const lab = (r) => C.events_csv_to_json([track(r)], INFO).data[10].T7.labels;
  assert.equal(lab({ track_event: '', track_shape: 'round' }), 'round');
  assert.equal(lab({ track_event: 'leaving', track_shape: '' }), 'leaving');
  assert.equal(lab({ track_event: '', track_shape: '' }), '');
  assert.equal(lab({ track_event: undefined, track_shape: undefined }), '');
});

test('events: several tracks share a frame; a one-frame track gives one observation', async () => {
  const C = await load();
  const out = C.events_csv_to_json([
    track(),
    track({ track_id: '8', track_startframe: '10', track_endframe: '10' }),
  ], INFO);
  assert.deepEqual(Object.keys(out.data[10]).sort(), ['T7', 'T8']);
  assert.deepEqual(out.data[10].T8.span, { f1: 10, f2: 10 });
  assert.equal(out.data[10].T8.cx, 110); // the end row overwrites the start row on the same frame
  assert.equal(out.data[10].T8.cy, 220);
});

test('events: no rows give an empty model, info kept', async () => {
  const C = await load();
  const out = C.events_csv_to_json([], INFO);
  assert.deepEqual(out.data, {});
  assert.equal(out.info, INFO);
});

// One row of *.detections.csv.
const det = (extra = {}) => ({
  detection_id: '3', frame: '5', bbox_x: '10', bbox_y: '20', bbox_width: '40', bbox_height: '60',
  head_visibility: '2', head_x: '1', head_y: '2',
  neck_visibility: '0', neck_x: '3', neck_y: '4',
  thorax_visibility: '1', thorax_x: '5', thorax_y: '6',
  waist_visibility: '', waist_x: '7', waist_y: '8',
  tail_visibility: '1', tail_x: '9', tail_y: '10',
  ...extra,
});

test('detections: bbox is the box, center derived, angle 0, id a string', async () => {
  const C = await load();
  const out = C.detections_csv_to_json([det()], INFO);
  assert.equal(out.info, INFO);
  const o = out.data[5]['3'];
  assert.equal(o.id, '3');
  assert.equal(o.frame, 5);
  assert.deepEqual([o.x, o.y, o.width, o.height, o.cx, o.cy, o.angle, o.labels], [10, 20, 40, 60, 30, 50, 0, '']);
});

test('detections: only parts with visibility > 0, in head..tail order', async () => {
  const C = await load();
  const o = C.detections_csv_to_json([det()], INFO).data[5]['3'];
  assert.deepEqual(o.parts, [
    { posFrame: { x: 1, y: 2 }, label: 'head' },
    { posFrame: { x: 5, y: 6 }, label: 'thorax' },
    { posFrame: { x: 9, y: 10 }, label: 'tail' },
  ]);
});

test('detections: several detections per frame and across frames', async () => {
  const C = await load();
  const out = C.detections_csv_to_json([det(), det({ detection_id: '4' }), det({ detection_id: '5', frame: '6' })], INFO);
  assert.deepEqual(Object.keys(out.data).sort(), ['5', '6']);
  assert.deepEqual(Object.keys(out.data[5]).sort(), ['3', '4']);
  assert.deepEqual(Object.keys(out.data[6]), ['5']);
  assert.deepEqual(C.detections_csv_to_json([], INFO).data, {});
});
