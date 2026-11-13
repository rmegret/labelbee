// Assertions on what the loaders RETURN (slice 3 step 4, ADR 0005); the golden pins what they do.
// Two returns are deliberately not the natural ones, because callers depend on today's value.
// Run: node --test refactor/tests/golden/slice3/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIoEnv } = require('../harness/io-env');
const { withUnhandledRejections } = require('../harness/unhandled');

const csvRow = { frame: '0', track_id: '1', cx: '1', cy: '2', angle: '3' };
const evts = JSON.stringify({ info: { type: 'events-multiframe', source: 's' }, data: { 0: [{ id: 1, cx: 1, cy: 2 }] } });
const isThenable = (p) => p && typeof p.then === 'function';

// Rejections nobody handles are expected in some cases (DEBT-722, DEBT-725): take the event over, ignore them.
const withSwallowedRejections = (fn) => withUnhandledRejections(() => {}, async () => {
  const r = await fn();
  await new Promise((resolve) => setImmediate(resolve)); // let the event fire while it is taken over
  return r;
});

test('tagsFromServer keeps returning undefined: FromServerDialog.loadEvents reads it as "success" (DEBT-719)', async () => {
  const { ctx } = (await loadIoEnv())({ net: { getJSON: { ok: { data: { data: { info: { type: 'tags-multiframe' }, data: {} } } } } }, init: { Tags: {} } });
  assert.equal(ctx.tagsFromServer('T1', 'div'), undefined);
  await new Promise((r) => setImmediate(r));
});

test('loadEventsFromServerByID resolves at once even though its handlers throw: onhashchange awaits it (DEBT-722)', async () => {
  await withSwallowedRejections(async () => {
    const { ctx } = (await loadIoEnv())({ net: { ajax: { err: true } } });
    const p = ctx.loadEventsFromServerByID(1);
    assert.ok(isThenable(p));
    assert.equal(await p, undefined);   // resolves, does not reject
  });
});

test('file loaders return a Promise that resolves once the model is applied; a canceled pick returns undefined', async () => {
  const { ctx } = (await loadIoEnv())({});
  const p = ctx.loadEventsFromFile({ target: { files: [{ text: evts }], value: 'x' } });
  assert.ok(isThenable(p));
  await p;
  assert.equal(JSON.stringify(Object.keys(ctx.Tracks)), '["0"]');
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
  assert.equal(JSON.stringify(Object.keys(ctx.Tracks)), '["0"]');
});

test('an exception of the apply stage is not handled as a request error', async () => {
  // eventsFromServer: a failing setTracks must reject, not call showAjaxError (which would read jqXHR.responseText)
  const { ctx, rec } = (await loadIoEnv())({ net: { ajax: { ok: JSON.parse(evts) } } });
  ctx.setTracks = () => { throw new RangeError('apply failed'); };
  await assert.rejects(ctx.eventsFromServer('/u'), (e) => e.name === 'RangeError');
  assert.equal(rec.fx.some((f) => f[0] === '$' && f[1] === '#mainAlertDialog .modal-body'), false);
});

test('CSV loaders return their Promise', async () => {
  const { ctx } = (await loadIoEnv())({ net: { csv: { ok: [csvRow] } } });
  const p = ctx.loadTracksCSVFromServer('/t.csv');
  assert.ok(isThenable(p));
  await p;
  assert.equal(JSON.stringify(Object.keys(ctx.Tracks)), '["0"]');
});

test('a failed request still rejects the CSV loader Promise (no catch, DEBT-725)', async () => {
  const { ctx } = (await loadIoEnv())({ net: { csv: { err: true } } });
  await assert.rejects(ctx.loadTracksCSVFromServer('/t.csv'), (e) => e.name === 'Error');
});
