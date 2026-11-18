// Tests of annotation/Refresh.js (slice 6 step 4, ADR 0009 section 0). Run: node --test refactor/tests/golden/slice6/
// New behavior, expected values written by hand from the ADR: the sequence of update / rebuild and of each primitive, no refresh
// from inside a refresh, the audit lists the writes that no refresh followed.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

async function make(calls, extra = {}) {
  const { Refresh } = await load('annotation/Refresh.js');
  const names = ['chrono', 'overlayRebuild', 'overlayUpdate', 'form', 'zoom', 'frame', 'selection'];
  const steps = Object.fromEntries(names.map((n) => [n, () => calls.push(n)]));
  return new Refresh({ ...steps, ...extra });
}

test('update is chrono, overlayUpdate, form, zoom; rebuild is chrono, overlayRebuild, zoom (the rebuild runs the form itself)', async () => {
  const calls = [];
  const r = await make(calls);
  r.update();
  assert.deepEqual(calls, ['chrono', 'overlayUpdate', 'form', 'zoom']);
  calls.length = 0;
  r.rebuild();
  assert.deepEqual(calls, ['chrono', 'overlayRebuild', 'zoom']);
});

test('each primitive runs its own step only', async () => {
  const calls = [];
  const r = await make(calls);
  for (const n of ['chrono', 'overlayRebuild', 'overlayUpdate', 'form', 'zoom', 'frame', 'selection']) {
    calls.length = 0;
    r[n]();
    assert.deepEqual(calls, [n]);
  }
});

test('a refresh called from inside a refresh is an error and dropped, not a loop', async () => {
  const calls = [];
  const { setNotifier } = await load('core/Notifier.js');
  const errors = [];
  setNotifier({ logError: (...a) => errors.push(a.join(' ')) });
  let r;
  r = await make(calls, { overlayUpdate: () => { calls.push('overlayUpdate'); r.update(); } });
  r.update();
  assert.deepEqual(calls, ['chrono', 'overlayUpdate', 'form', 'zoom']);                  // the inner update did not run
  assert.equal(errors.length, 1);
  assert.match(errors[0], /refresh\.update: called during a refresh/);
  calls.length = 0;
  r.zoom();                                                                              // the guard is released afterwards
  assert.deepEqual(calls, ['zoom']);
  setNotifier({ logError: (...a) => console.error(...a) });
});

test('the guard is released when a step throws', async () => {
  const calls = [];
  const r = await make(calls, { chrono: () => { throw new Error('boom'); } });
  assert.throws(() => r.update(), /boom/);
  calls.length = 0;
  r.zoom();
  assert.deepEqual(calls, ['zoom']);
});

async function store() {
  const { Events } = await load('annotation/Events.js');
  const ev = new Events();
  ev.replace({ 0: { 1: { ID: '1' }, 2: { ID: '2' } } }, { type: 'events-multiframe' });
  return ev;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('audit: a write followed by a refresh call in the same task is fine; one that is not followed is listed', async () => {
  const ev = await store();
  const r = await make([]);
  r.audit(ev);
  ev.update(0, 1, { a: 1 });
  r.update();
  ev.update(0, 2, { a: 1 });                                                             // no refresh after this one
  await tick();
  assert.equal(r.unrefreshed.length, 1);
  assert.equal(String(r.unrefreshed[0].id), '2');
});

test('audit: a batch followed by one refresh is fine; unaudit stops the check', async () => {
  const ev = await store();
  const r = await make([]);
  r.audit(ev);
  ev.batch(() => { ev.update(0, 1, { a: 1 }); ev.delete(0, 2); });
  r.rebuild();
  await tick();
  assert.deepEqual(r.unrefreshed, []);
  r.unaudit();
  ev.update(0, 1, { a: 2 });
  await tick();
  assert.deepEqual(r.unrefreshed, []);
});

test('audit: a store write made by a refresh step is an error, listed with during: true', async () => {
  const ev = await store();
  const { setNotifier } = await load('core/Notifier.js');
  const errors = [];
  setNotifier({ logError: (...a) => errors.push(a.join(' ')) });
  const r = await make([], { chrono: () => ev.update(0, 1, { written: true }) });
  r.audit(ev);
  r.update();
  await tick();
  assert.equal(errors.length, 1);
  assert.match(errors[0], /the store was written during a refresh \(update\)/);
  assert.equal(r.unrefreshed.length, 1);
  assert.equal(r.unrefreshed[0].during, true);
  setNotifier({ logError: (...a) => console.error(...a) });
});

test('the refresh log shows the steps nested under the refresh call', async () => {
  const { refreshLog, timedRefresh } = await load('core/Notifier.js');
  const r = await make([], {
    chrono: () => timedRefresh('chrono', 'refreshChronogram', () => {}),
    form: () => timedRefresh('form', 'updateForm', () => {}),
  });
  refreshLog.clear();
  r.update();
  assert.equal(refreshLog.tree(), 'refresh.update(refreshChronogram,updateForm)');
});
