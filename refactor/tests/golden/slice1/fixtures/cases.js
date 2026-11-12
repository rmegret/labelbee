// Synthetic fixtures (Q8) for the pure load functions of slice 1 (ADR 0002).
// Each case: {name, fn, args(rec)}; args build FRESH inputs per run (functions mutate them).
'use strict';

const INFO_EVENTS = { type: 'events-multiframe', source: 'synthetic' };
const INFO_TAGS = { type: 'tags-multiframe', source: 'synthetic' };

const evt = (id, extra = {}) => ({ id, cx: 10, cy: 20, angle: 30, width: 5, height: 6, x: 1, y: 2, ...extra });

const csvTrack = (frame, track_id, extra = {}) => ({
  frame: String(frame), track_id: String(track_id), cx: '100.5', cy: '200', angle: '10',
  head_visibility: '1', head_x: '1', head_y: '2',
  neck_visibility: '0', neck_x: '3', neck_y: '4',
  thorax_visibility: '2', thorax_x: '5', thorax_y: '6',
  waist_visibility: '0', waist_x: '', waist_y: '',
  tail_visibility: '1', tail_x: '7', tail_y: '8',
  ...extra,
});

const csvTagFields = (pre, extra = {}) => ({
  [pre + 'cx']: '11', [pre + 'cy']: '12', [pre + 'hamming']: '0', [pre + 'goodness']: '45.5', [pre + 'dm']: '60',
  [pre + 'p0x']: '1', [pre + 'p0y']: '2', [pre + 'p1x']: '3', [pre + 'p1y']: '4',
  [pre + 'p2x']: '5', [pre + 'p2y']: '6', [pre + 'p3x']: '7', [pre + 'p3y']: '8', ...extra,
});

const cases = [
  // ---- sanitizeEvents ----
  { name: 'sanitize v1 object', fn: 'sanitizeEvents', args: () => [{ 0: { 1: evt(1, { labels: 'f,pollen' }) }, 5: {} }] },
  { name: 'sanitize v1 array', fn: 'sanitizeEvents', args: () => [[{ 3: evt(3) }, { 4: evt(4) }]] },
  { name: 'sanitize v1 array with null entry and hole', fn: 'sanitizeEvents', args: () => [[{ 3: evt(3) }, null, , { 4: evt(4) }]] },
  { name: 'sanitize v1 empty object', fn: 'sanitizeEvents', args: () => [{}] },
  { name: 'sanitize v1 bad key', fn: 'sanitizeEvents', args: () => [{ a: { 1: evt(1) } }] },
  { name: 'sanitize v1 leading-zero key', fn: 'sanitizeEvents', args: () => [{ '01': {} }] },
  { name: 'sanitize v1 decimal key', fn: 'sanitizeEvents', args: () => [{ '1.5': {} }] },
  { name: 'sanitize v1 negative key', fn: 'sanitizeEvents', args: () => [{ '-1': {} }] },
  { name: 'sanitize v1 mixed good and bad keys', fn: 'sanitizeEvents', args: () => [{ 1: {}, b: {} }] },
  { name: 'sanitize null', fn: 'sanitizeEvents', args: () => [null] },
  { name: 'sanitize undefined', fn: 'sanitizeEvents', args: () => [undefined] },
  { name: 'sanitize number', fn: 'sanitizeEvents', args: () => [5] },
  { name: 'sanitize string', fn: 'sanitizeEvents', args: () => ['abc'] },
  { name: 'sanitize v2 plain', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: [evt(1, { labels: 'F, l' }), evt(2)], 7: [evt(1)] } }] },
  { name: 'sanitize v2 data as dict of dicts', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 2: { a: evt(9, { labels: 'entering' }) } } }] },
  { name: 'sanitize v2 duplicate ids', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: [evt(1, { cx: 1 }), evt(1, { cx: 2 }), evt(2)] } }] },
  { name: 'sanitize v2 wrong info.type', fn: 'sanitizeEvents', args: () => [{ info: { type: 'tags-multiframe' }, data: {} }] },
  { name: 'sanitize v2 info without type', fn: 'sanitizeEvents', args: () => [{ info: {}, data: {} }] },
  { name: 'sanitize v2 info null', fn: 'sanitizeEvents', args: () => [{ info: null, data: {} }] },
  { name: 'sanitize v2 ID alias instead of id', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: [{ ID: '7', cx: 1 }] } }] },
  { name: 'sanitize v2 id and ID both', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: [{ id: 3, ID: 'X' }] } }] },
  { name: 'sanitize v2 label aliases and null labels', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: [evt(1, { labels: 'p,d,departing' }), evt(2, { labels: null }), evt(3, { labels: '' })] } }] },
  { name: 'sanitize v2 primitive event and frame', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: ['ab', 7], 1: 5, 2: 'xy' } }] },
  { name: 'sanitize v2 without data', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS } }] },
  { name: 'sanitize v2 null frames and null events', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS }, data: { 0: null, 1: [null, evt(5)], 2: [] } }] },
  { name: 'sanitize v2 info kept by reference fields', fn: 'sanitizeEvents', args: () => [{ info: { ...INFO_EVENTS, history: ['a', 'b'] }, data: {} }] },

  // ---- tagsAddFrames ----
  { name: 'tagsAddFrames basic', fn: 'tagsAddFrames', args: () => [{ 3: { tags: [{ id: 1 }, { id: 2 }] }, 10: { tags: [{ id: 3 }] } }], mutates: 0 },
  { name: 'tagsAddFrames null holes', fn: 'tagsAddFrames', args: () => [{ 0: { tags: null }, 1: { tags: [null, { id: 4 }] }, 2: {}, 3: { tags: [] } }], mutates: 0 },
  { name: 'tagsAddFrames overwrites frame', fn: 'tagsAddFrames', args: () => [{ 5: { tags: [{ id: 1, frame: 99 }] } }], mutates: 0 },
  { name: 'tagsAddFrames non numeric key', fn: 'tagsAddFrames', args: () => [{ x: { tags: [{ id: 1 }] } }], mutates: 0 },
  { name: 'tagsAddFrames null frame entry', fn: 'tagsAddFrames', args: () => [{ 1: null }], mutates: 0 },
  { name: 'tagsAddFrames primitive tag (sloppy: ignored)', fn: 'tagsAddFrames', args: () => [{ 1: { tags: [5, 'x', { id: 1 }] } }], mutates: 0 },
  { name: 'tagsAddFrames null Tags', fn: 'tagsAddFrames', args: () => [null], mutates: 0 },

  // ---- tracks_csv_to_json ----
  { name: 'tracks_csv two frames', fn: 'tracks_csv_to_json', args: () => [[csvTrack(0, 1), csvTrack(0, 2), csvTrack(3, 1)], { ...INFO_EVENTS }] },
  { name: 'tracks_csv empty', fn: 'tracks_csv_to_json', args: () => [[], { ...INFO_EVENTS }] },
  { name: 'tracks_csv missing fields', fn: 'tracks_csv_to_json', args: () => [[{ frame: '1', track_id: '5' }], null] },
  { name: 'tracks_csv numeric fields', fn: 'tracks_csv_to_json', args: () => [[{ frame: 2, track_id: 8, cx: 1, cy: 2, angle: 3, head_visibility: 1, head_x: 4, head_y: 5 }], { ...INFO_EVENTS }] },
  { name: 'tracks_csv duplicate id same frame', fn: 'tracks_csv_to_json', args: () => [[csvTrack(1, 1, { cx: '1' }), csvTrack(1, 1, { cx: '2' })], { ...INFO_EVENTS }] },

  // ---- tags_csv_to_json ----
  { name: 'tags_csv two frames', fn: 'tags_csv_to_json', args: () => [[{ ...csvTrack(0, 1), id: '12' }, { ...csvTrack(2, 2), id: '13' }], { ...INFO_EVENTS }] },
  { name: 'tags_csv missing tag id', fn: 'tags_csv_to_json', args: () => [[{ ...csvTrack(0, 1) }], { ...INFO_EVENTS }] },
  { name: 'tags_csv empty', fn: 'tags_csv_to_json', args: () => [[], undefined] },

  // ---- tags_csv_to_tagjson ----
  { name: 'tags_tagjson two frames', fn: 'tags_csv_to_tagjson', args: () => [[
    { frame: '0', id: '5', dm: '60', ...csvTagFields('', { cx_tag: '11', cy_tag: '12' }) },
    { frame: '0', id: '6', dm: '55', ...csvTagFields('', { cx_tag: '21', cy_tag: '22' }) },
    { frame: '4', id: '7', dm: '50', ...csvTagFields('', { cx_tag: '31', cy_tag: '32' }) },
  ], { ...INFO_TAGS }] },
  { name: 'tags_tagjson dm zero skipped but frame created', fn: 'tags_csv_to_tagjson', args: () => [[
    { frame: '1', id: '5', dm: '0', cx_tag: '1', cy_tag: '2' },
    { frame: '1', id: '6', dm: '', cx_tag: '1', cy_tag: '2' },
    { frame: '1', id: '7', dm: 'x', cx_tag: '1', cy_tag: '2' },
  ], { ...INFO_TAGS }] },
  { name: 'tags_tagjson empty', fn: 'tags_csv_to_tagjson', args: () => [[], { ...INFO_TAGS }] },

  // ---- tracks_tagged_csv_to_json ----
  { name: 'tracks_tagged with tag and track_tagid', fn: 'tracks_tagged_csv_to_json', args: () => [[
    csvTrack(0, 1, { track_tagid: '42', tag_id: '42', ...csvTagFields('tag_', { tag_p0x: '9' }) }),
  ], { ...INFO_EVENTS }] },
  { name: 'tracks_tagged missing tag ids', fn: 'tracks_tagged_csv_to_json', args: () => [[
    csvTrack(0, 1), csvTrack(0, 2, { track_tagid: '', tag_id: '' }), csvTrack(1, 3, { track_tagid: null, tag_id: null }),
  ], { ...INFO_EVENTS }] },
  { name: 'tracks_tagged tag without track_tagid', fn: 'tracks_tagged_csv_to_json', args: () => [[
    csvTrack(0, 7, { tag_id: '3', ...csvTagFields('tag_') }),
  ], { ...INFO_EVENTS }] },
  { name: 'tracks_tagged invisible parts', fn: 'tracks_tagged_csv_to_json', args: () => [[
    csvTrack(0, 1, { head_visibility: '0', thorax_visibility: '0', tail_visibility: '-1' }),
  ], { ...INFO_EVENTS }] },
  { name: 'tracks_tagged empty', fn: 'tracks_tagged_csv_to_json', args: () => [[], { ...INFO_EVENTS }] },

  // ---- flatjson_to_json / resultToObjects / db_to_json ----
  { name: 'flatjson two frames', fn: 'flatjson_to_json', args: () => [[
    { frame: 0, id: '1', cx: 1 }, { frame: 0, id: '2', cx: 2 }, { frame: 5, id: '1', cx: 3 },
  ]] },
  { name: 'flatjson empty', fn: 'flatjson_to_json', args: () => [[]] },
  { name: 'resultToObjects normal', fn: 'resultToObjects', args: () => [[{ columns: ['a', 'b'], values: [[1, 2], [3, 4]] }]] },
  { name: 'resultToObjects empty array', fn: 'resultToObjects', args: () => [[]] },
  { name: 'resultToObjects null', fn: 'resultToObjects', args: () => [null] },
  { name: 'resultToObjects no rows', fn: 'resultToObjects', args: () => [[{ columns: ['a'], values: [] }]] },
  { name: 'db_to_json two frames, default limit', fn: 'db_to_json', args: (rec) => [{
    exec: (sql) => { rec.sql.push(sql); return [{ columns: ['frame', 'id', 'cx', 'cy', 'angle', 'width', 'height', 'x', 'y'],
      values: [[0, '1', 10, 20, 100, 300, 600, -140, -280], [0, '2', 11, 21, 101, 300, 600, -139, -279], [3, '1', 12, 22, 102, 300, 600, -138, -278]] }]; } },
    { ...INFO_EVENTS }] },
  { name: 'db_to_json explicit limit and empty result', fn: 'db_to_json', args: (rec) => [{ exec: (sql) => { rec.sql.push(sql); return []; } }, { ...INFO_EVENTS }, 7] },
];

module.exports = { cases };
