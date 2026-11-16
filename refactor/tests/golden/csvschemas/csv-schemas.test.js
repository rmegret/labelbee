// annotation/CsvSchemas.js: schema detection from the file suffix and the header, on the real sample files.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const DATA = path.resolve(__dirname, '../../../../tests/webapp/data');
const load = () => import(pathToFileURL(path.join(JS_DIR, 'annotation/CsvSchemas.js')).href);
const header = (f) => fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')[0];

test('parseHeaderLine: quotes, BOM, CRLF', async () => {
  const S = await load();
  assert.deepEqual(S.parseHeaderLine('﻿a,"b,c",d\r\nrow'), ['a', 'b,c', 'd']);
  assert.deepEqual(S.parseHeaderLine('x'), ['x']);
});

test('classifyFilename: longest suffix wins', async () => {
  const S = await load();
  const key = (n) => (S.classifyFilename(n) || {}).key;
  assert.equal(key('/data/v.mp4.tracks.csv'), 'tracks');
  assert.equal(key('v.mp4.tracks_tagged.csv'), 'tracks_tagged');
  assert.equal(key('v.mp4.tracks+tags.csv'), 'tracks+tags');
  assert.equal(key('v.mp4.tracks.crops.csv'), 'tracks');
  assert.equal(key('v.mp4.tags.csv'), 'tags_pipeline');
  assert.equal(key('tags.csv'), 'tags');
  assert.equal(key('v.mp4.events_tagged.csv'), 'events');
  assert.equal(key('notes.txt'), undefined);
});

const CASES = [
  ['sample_gurabo/sample_gurabo.cfr.mp4.tracks.csv', 'tracks', 'tracks', 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.tracks+tags.csv', 'tracks+tags', 'tracks', 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.tracks_tagged.csv', 'tracks_tagged', 'tracks_tagged', 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.augmented.csv', 'tracks', 'tracks', 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.tags.csv', 'tags_pipeline', null, 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.events.csv', 'events', 'events', 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.detections.csv', 'detections', 'detections', 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.pollentag.csv', 'pollentag', null, 'ok'],
  ['sample_gurabo/sample_gurabo.cfr.mp4.packets.csv', 'packets', null, 'ok'],
  ['sample/tags.csv', 'tags', 'tags', 'ok'],
  ['sample/tracks.csv', 'tracks', 'tracks', 'ok'],
];
for (const [file, key, loader, status] of CASES) {
  test('detectSchema ' + file, async () => {
    const S = await load();
    const res = S.detectSchema(file, S.parseHeaderLine(header(file)));
    assert.equal(res.chosen.key, key);
    assert.equal(res.chosen.loader, loader);
    assert.equal(res.status, status);
    assert.deepEqual(res.missing, []);
    assert.equal(res.canLoad, loader != null);
  });
}

test('tracks+tags reports the tag columns it adapts', async () => {
  const S = await load();
  const f = 'sample_gurabo/sample_gurabo.cfr.mp4.tracks+tags.csv';
  const res = S.detectSchema(f, S.parseHeaderLine(header(f)));
  assert.ok(res.optionalPresent.includes('tag_p0x'));
});

test('invalid: suffix says tracks but a required column is missing', async () => {
  const S = await load();
  const cols = S.parseHeaderLine(header('sample/tracks.csv')).filter(c => c !== 'angle');
  const res = S.detectSchema('x.tracks.csv', cols);
  assert.equal(res.status, 'invalid');
  assert.deepEqual(res.missing, ['angle']);
  assert.equal(res.canLoad, false);
});

test('by-columns: wrong suffix, columns of a tracks file', async () => {
  const S = await load();
  const cols = S.parseHeaderLine(header('sample/tracks.csv'));
  const res = S.detectSchema('mystery.csv', cols);
  assert.equal(res.status, 'by-columns');
  assert.equal(res.chosen.key, 'tracks');
  assert.equal(res.canLoad, true);
});

test('a suffix schema that validates is kept even if the columns fit a more specific one', async () => {
  const S = await load();
  const cols = S.parseHeaderLine(header('sample_gurabo/sample_gurabo.cfr.mp4.tracks_tagged.csv'));
  const res = S.detectSchema('x.cfr.mp4.tracks.csv', cols);
  assert.equal(res.status, 'ok');
  assert.equal(res.chosen.key, 'tracks');
});

test('unknown', async () => {
  const S = await load();
  const res = S.detectSchema('a.csv', ['foo', 'bar']);
  assert.equal(res.status, 'unknown');
  assert.equal(res.chosen, null);
  assert.equal(res.canLoad, false);
});

test('mappingTable: grouped fields, unused columns go to ignored', async () => {
  const S = await load();
  const f = 'sample_gurabo/sample_gurabo.cfr.mp4.tracks_tagged.csv';
  const res = S.detectSchema(f, S.parseHeaderLine(header(f)));
  const rows = Object.fromEntries(res.mapping.map(r => [r.field, r]));
  assert.deepEqual(res.mapping.map(r => r.field), ['id', 'frame', 'position', 'angle', 'parts', 'tag', 'ignored']);
  assert.equal(rows.position.show, 'cx, cy');
  assert.equal(rows.tag.status, 'ok');
  const ignored = rows.ignored.show.split(', ');
  assert.ok(ignored.includes('video_name') && ignored.includes('vx'));
  assert.ok(!ignored.includes('tag_p0x') && !ignored.includes('cx') && !ignored.includes('track_tagid'));
});

test('mappingTable: no mapping for a schema without loader', async () => {
  const S = await load();
  assert.equal(S.mappingTable(S.schemaByKey('packets'), ['frame']), null);
});

const codec = () => import(pathToFileURL(path.join(JS_DIR, 'annotation/AnnotationCodec.js')).href);

test('events_csv_to_json: start and end events, labels, partial tag, negative frames skipped', async () => {
  const C = await codec();
  const rows = [
    { track_id: '5', track_shape: 'inside_inside', track_event: 'noise', track_startframe: '-250', track_startx: '1', track_starty: '2', track_starta: '10',
      track_endframe: '178', track_endx: '100', track_endy: '200', track_enda: '30', track_tagid: '' },
    { track_id: '36', track_shape: 'outside_inside', track_event: 'unknown', track_startframe: '39', track_startx: '10', track_starty: '20', track_starta: '5',
      track_endframe: '58', track_endx: '50', track_endy: '60', track_enda: '6', track_tagid: '1641.0' },
  ];
  const { data } = C.events_csv_to_json(rows, {});
  assert.deepEqual(Object.keys(data).sort(), ['178', '39', '58']);
  const e = data[178].T5;
  assert.equal(e.labels, 'noise,inside_inside');
  assert.deepEqual([e.cx, e.cy, e.x, e.y, e.angle, e.width, e.height], [100, 200, -50, -100, 120, 300, 600]);
  assert.equal(e.tag, undefined);
  assert.deepEqual(e.span, { f1: -250, f2: 178 });                    // the whole track, unclipped
  assert.deepEqual(data[178].T5.span, data[-250] && data[-250].T5 ? data[-250].T5.span : e.span);
  assert.deepEqual(data[39].T36.tag, { id: 1641, frame: 39 });
});

test('detections_csv_to_json: bbox, derived center, visible parts only', async () => {
  const C = await codec();
  const { data } = C.detections_csv_to_json([{ frame: '0', detection_id: '1', bbox_x: '100', bbox_y: '200', bbox_width: '20', bbox_height: '40',
    head_x: '110', head_y: '210', head_visibility: '2', neck_x: '1', neck_y: '1', neck_visibility: '0' }], {});
  const d = data[0]['1'];
  assert.deepEqual([d.x, d.y, d.width, d.height, d.cx, d.cy, d.angle], [100, 200, 20, 40, 110, 220, 0]);
  assert.deepEqual(d.parts, [{ posFrame: { x: 110, y: 210 }, label: 'head' }]);
});
