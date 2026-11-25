// Assertions on what the loaders RETURN (slice 3 step 4, ADR 0005); the golden pins what they do.
// `tagsFromServer` deliberately keeps returning undefined, because its caller depends on today's value.
// Run: node --test refactor/tests/golden/slice3/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIoEnv } = require('../harness/io-env');

const csvRow = { frame: '0', track_id: '1', cx: '1', cy: '2', angle: '3' };
const evts = JSON.stringify({ info: { type: 'events-multiframe', source: 's' }, data: { 0: [{ id: 1, cx: 1, cy: 2 }] } });
const isThenable = (p) => p && typeof p.then === 'function';
// The html written in the main alert, if any
const alertHtml = (rec) => {
  const f = rec.fx.find((e) => e[0] === '$' && e[1] === '#mainAlertDialog .modal-body' && e[2] === 'html');
  return f && f[3];
};

test('tagsFromServer keeps returning undefined: FromServerDialog.loadEvents reads it as "success" (DEBT-719)', async () => {
  const { ctx } = (await loadIoEnv())({ net: { getJSON: { ok: { data: { data: { info: { type: 'tags-multiframe' }, data: {} } } } } }, init: { Tags: {} } });
  assert.equal(ctx.tagsFromServer('T1', 'div'), undefined);
  await new Promise((r) => setImmediate(r));
});

test('loadEventsFromServerByID resolves once the events are loaded and sets the lineage (DEBT-722)', async () => {
  const { ctx, rec } = (await loadIoEnv())({ net: { ajax: { ok: { data: { data: evts } } } } });
  const p = ctx.loadEventsFromServerByID(12);
  assert.ok(isThenable(p));
  await p;
  assert.equal(JSON.stringify(Object.keys(ctx.AnnotationStore.events.toObject())), '["0"]');
  assert.deepEqual({ ...ctx.AnnotationStore.getBasedOn() }, { source: 'server-db', id: 12, retrievedOn: '2000-01-02T03:04:05.000Z' });
});

// The lineage of the next save (ADR 0016, step 14g): every load of events replaces it with its own source, an erase clears it
test('every load of events sets the lineage to its own source, and an erase clears it', async () => {
  const env = await loadIoEnv();
  const T = '2000-01-02T03:04:05.000Z';
  const { ctx } = env({ net: { ajax: { ok: { data: { data: evts } } } } });
  await ctx.loadEventsFromServerByID(12);
  assert.equal(ctx.AnnotationStore.getBasedOn().source, 'server-db');
  await ctx.loadEventsFromFile({ target: { files: [{ name: 'a.json', text: evts }], value: 'x' } });
  assert.deepEqual({ ...ctx.AnnotationStore.getBasedOn() }, { source: 'local-file', id: 'a.json', retrievedOn: T });
  ctx.eraseEvents();
  assert.equal(ctx.AnnotationStore.getBasedOn(), undefined);
  const e2 = env({ net: { getJSON: { ok: { data: { data: evts } } }, csv: { ok: [csvRow] } } });
  await e2.ctx.loadCSVFromServer('/d/t.tracks.csv', 'tracks');
  assert.deepEqual({ ...e2.ctx.AnnotationStore.getBasedOn() }, { source: 'server-file', id: '/d/t.tracks.csv', retrievedOn: T });
  e2.ctx.loadTags({});
  assert.equal(e2.ctx.AnnotationStore.getBasedOn().source, 'server-file', 'the tags have no lineage and leave the events one alone');
});

test('loadEventsFromServerByID rejects on a request error or invalid data, and shows the message (DEBT-722, Q23)', async () => {
  for (const net of [{ ajax: { err: true } }, { ajax: { ok: { data: { data: JSON.stringify({ a: 1 }) } } } }]) {
    const { ctx, rec } = (await loadIoEnv())({ net });
    await assert.rejects(ctx.loadEventsFromServerByID(12), (e) => e.name === 'Error' && /video_data id=12/.test(e.message));
    assert.match(alertHtml(rec), /loading events with ID 12/);
    assert.equal(rec.fx.some((f) => f[0] === 'basedOn'), false);
  }
});

test('file loaders return a Promise that resolves once the model is applied; a canceled pick returns undefined', async () => {
  const { ctx } = (await loadIoEnv())({});
  const p = ctx.loadEventsFromFile({ target: { files: [{ text: evts }], value: 'x' } });
  assert.ok(isThenable(p));
  await p;
  assert.equal(JSON.stringify(Object.keys(ctx.AnnotationStore.events.toObject())), '["0"]');
  assert.equal(ctx.loadEventsFromFile({ target: { files: [], value: 'x' } }), undefined);
});

test('invalid JSON rejects the returned Promise of loadEventsFromFile', async () => {
  const { ctx } = (await loadIoEnv())({});
  const p = ctx.loadEventsFromFile({ target: { files: [{ text: '{no' }], value: 'x' } });
  await assert.rejects(p, (e) => e.name === 'SyntaxError');
});

test('eventsFromServer returns a Promise that resolves after the apply stage', async () => {
  const { ctx } = (await loadIoEnv())({ net: { ajax: { ok: JSON.parse(evts) } } });
  await ctx.eventsFromServer('/u');
  assert.equal(JSON.stringify(Object.keys(ctx.AnnotationStore.events.toObject())), '["0"]');
});

test('an exception of the apply stage is not handled as a request error', async () => {
  // eventsFromServer: a failing loadTracks is reported as a load error, not through showAjaxError
  // (which would read jqXHR.responseText of an undefined jqXHR), and the rejection goes on
  const { ctx, rec } = (await loadIoEnv())({ net: { ajax: { ok: JSON.parse(evts) } } });
  ctx.loadTracks = () => { throw new RangeError('apply failed'); };
  await assert.rejects(ctx.eventsFromServer('/u'), (e) => e.name === 'RangeError');
  assert.match(alertHtml(rec), /loading events from \/u<br>apply failed/);
  assert.doesNotMatch(alertHtml(rec), /Status:/);
});

test('a load error goes to the from-server dialog when it is open, else to the main alert (Q23)', async () => {
  const open = (await loadIoEnv())({ net: { ajax: { err: true }, visible: { '#from-server-dialog': true } } });
  await assert.rejects(open.ctx.loadEventsFromServerByID(12));
  assert.equal(open.rec.fx.some((f) => f[0] === 'setMessage' && f[1] === 'red' && /Could not load video_data id=12/.test(f[2])), true);
  assert.equal(alertHtml(open.rec), undefined);
  const closed = (await loadIoEnv())({ net: { ajax: { err: true } } });
  await assert.rejects(closed.ctx.loadEventsFromServerByID(12));
  assert.equal(closed.rec.fx.some((f) => f[0] === 'setMessage' && f[1] === 'red'), false);
  assert.match(alertHtml(closed.rec), /Could not load video_data id=12/);
});

test('markup in an error message or file name is escaped in the alert (Q23)', async () => {
  const { ctx, rec } = (await loadIoEnv())({});
  await assert.rejects(ctx.loadEventsFromFile({ target: { files: [{ name: '<b>x.json', text: '<img src=x onerror=alert(1)>' }], value: 'x' } }));
  const html = alertHtml(rec);
  assert.doesNotMatch(html.replace('<br>', ''), /</);   // the only markup left is our own <br>
  assert.match(html, /&lt;b&gt;x\.json/);
});

test('a rejected format is an error: nothing is refreshed, the model is kept, the user is told (Q23)', async () => {
  const old = { 9: { 9: { id: 9 } } };
  const { ctx, rec } = (await loadIoEnv())({ net: { ajax: { ok: { a: 1 } } }, init: { Tracks: old, TracksInfo: { n: 1 } } });
  await assert.rejects(ctx.eventsFromServer('/u'), (e) => /Invalid events format/.test(e.message));
  assert.equal(rec.fx.some((f) => f[0] === 'refreshChronogram'), false);
  assert.equal(JSON.stringify(Object.keys(ctx.AnnotationStore.events.toObject())), '["9"]');
  assert.match(alertHtml(rec), /Invalid events format/);
});

test('CSV loaders return their Promise', async () => {
  const { ctx } = (await loadIoEnv())({ net: { csv: { ok: [csvRow] } } });
  const p = ctx.loadCSVFromServer('/t.csv');
  assert.ok(isThenable(p));
  await p;
  assert.equal(JSON.stringify(Object.keys(ctx.AnnotationStore.events.toObject())), '["0"]');
});

test('a failed request still rejects the CSV loader Promise (no catch, DEBT-725)', async () => {
  const { ctx } = (await loadIoEnv())({ net: { csv: { err: true } } });
  await assert.rejects(ctx.loadCSVFromServer('/t.csv'), (e) => e.name === 'Error');
});
