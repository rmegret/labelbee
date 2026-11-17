// Tests of `Events.subscribe` / `Events.batch` and of annotation/Refresher.js (slice 6 step 2, ADR 0009). Run: node --test refactor/tests/golden/slice6/
// New behavior (nothing to pin from), expected values written by hand from the ADR: sync subscribers, one batched notification,
// the observer unchanged, a fixed refresh sequence whatever the order of registration, no loop on a write during a refresh.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

async function fresh() {
  const { Events } = await load('annotation/Events.js');
  const ev = new Events();
  ev.replace({ 0: { 1: { ID: '1' }, 2: { ID: '2' } }, 1: { 1: { ID: '1' } } }, { type: 'events-multiframe' });
  return ev;
}

test('a subscriber hears each command synchronously, after it was applied, in the order of registration', async () => {
  const ev = await fresh();
  const heard = [];
  ev.subscribe((e) => heard.push(['a', e.op, ev.get(0, 1).span]));
  ev.subscribe((e) => heard.push(['b', e.op]));
  ev.update(0, 1, { span: 7 });
  assert.deepEqual(heard, [['a', 'update', 7], ['b', 'update']]);                      // applied before the call, one event each
  ev.update(0, 9, { span: 1 });                                                          // no such observation: silent, like the observer
  assert.equal(heard.length, 2);
});

test('subscribe returns its unsubscribe; one subscriber can leave while another stays', async () => {
  const ev = await fresh();
  const a = [], b = [];
  const offA = ev.subscribe((e) => a.push(e.op));
  ev.subscribe((e) => b.push(e.op));
  ev.setInfo('k', 1);
  offA();
  offA();                                                                                // twice: harmless
  ev.setInfo('k', 2);
  assert.deepEqual(a, ['setInfo']);
  assert.deepEqual(b, ['setInfo', 'setInfo']);
});

test('the observer and the subscribers are independent', async () => {
  const ev = await fresh();
  const obs = [], sub = [];
  ev.setObserver((e) => obs.push(e.op));
  ev.subscribe((e) => sub.push(e.op));
  ev.update(0, 1, { a: 1 });
  ev.setObserver(null);
  ev.update(0, 1, { a: 2 });
  assert.deepEqual(obs, ['update']);
  assert.deepEqual(sub, ['update', 'update']);
});

test('batch: the subscribers hear one batch event at the end, the observer still hears each command', async () => {
  const ev = await fresh();
  const obs = [], sub = [];
  ev.setObserver((e) => obs.push(e.op));
  ev.subscribe((e) => sub.push(e));
  const r = ev.batch(() => {
    ev.update(0, 1, { a: 1 });
    ev.delete(0, 2);
    ev.delete(1, 1);
    assert.equal(sub.length, 0);                                                         // nothing yet, inside
    return 'done';
  });
  assert.equal(r, 'done');
  assert.deepEqual(obs, ['update', 'delete', 'delete']);
  assert.equal(sub.length, 1);
  assert.equal(sub[0].op, 'batch');
  assert.deepEqual(sub[0].events.map((e) => [e.op, e.frame, e.id]), [['update', 0, 1], ['delete', 0, 2], ['delete', 1, 1]]);
});

test('batches nest: one notification when the outermost ends; an empty batch notifies nobody', async () => {
  const ev = await fresh();
  const sub = [];
  ev.subscribe((e) => sub.push(e));
  ev.batch(() => {
    ev.update(0, 1, { a: 1 });
    ev.batch(() => ev.update(0, 2, { a: 1 }));
    assert.equal(sub.length, 0);                                                         // the inner end is not the outermost
    ev.update(0, 1, { a: 2 });
  });
  assert.equal(sub.length, 1);
  assert.equal(sub[0].events.length, 3);
  ev.batch(() => {});
  ev.batch(() => ev.update(0, 9, { a: 1 }));                                             // only silent commands
  assert.equal(sub.length, 1);
  ev.update(0, 1, { a: 3 });                                                             // outside a batch: back to one event each
  assert.equal(sub.length, 2);
  assert.equal(sub[1].op, 'update');
});

test('a batch that throws still flushes what it did, then rethrows', async () => {
  const ev = await fresh();
  const sub = [];
  ev.subscribe((e) => sub.push(e));
  assert.throws(() => ev.batch(() => { ev.update(0, 1, { a: 1 }); throw new Error('boom'); }), /boom/);
  assert.equal(sub.length, 1);
  assert.equal(sub[0].events.length, 1);
  ev.update(0, 1, { a: 2 });                                                             // the depth was restored
  assert.equal(sub.length, 2);
  assert.equal(sub[1].op, 'update');
});

async function refresherWith(calls, extra = {}) {
  const { Refresher } = await load('annotation/Refresher.js');
  return new Refresher({
    derived: [() => calls.push('derive')],
    views: [() => calls.push('chrono'), () => calls.push('table'), () => calls.push('overlay'), () => calls.push('form')],
    ...extra,
  });
}

test('the Refresher runs derived then views, in its own order, once per notification', async () => {
  const ev = await fresh();
  const calls = [];
  const r = await refresherWith(calls);
  r.attach(ev);
  ev.update(0, 1, { a: 1 });
  assert.deepEqual(calls, ['derive', 'chrono', 'table', 'overlay', 'form']);
  calls.length = 0;
  ev.batch(() => { ev.update(0, 1, { a: 2 }); ev.delete(0, 2); ev.update(1, 1, { a: 1 }); });
  assert.deepEqual(calls, ['derive', 'chrono', 'table', 'overlay', 'form']);             // a loop of commands: one refresh
});

test('the order does not depend on who subscribed first', async () => {
  const ev = await fresh();
  const calls = [];
  ev.subscribe(() => calls.push('other-before'));
  const r = await refresherWith(calls);
  r.attach(ev);
  ev.subscribe(() => calls.push('other-after'));
  ev.update(0, 1, { a: 1 });
  assert.deepEqual(calls, ['other-before', 'derive', 'chrono', 'table', 'overlay', 'form', 'other-after']);
});

test('attach is idempotent, detach stops it', async () => {
  const ev = await fresh();
  const calls = [];
  const r = await refresherWith(calls);
  r.attach(ev);
  r.attach(ev);
  assert.equal(r.attached, true);
  ev.update(0, 1, { a: 1 });
  assert.equal(calls.filter((c) => c === 'derive').length, 1);                           // not twice
  r.detach();
  assert.equal(r.attached, false);
  ev.update(0, 1, { a: 2 });
  assert.equal(calls.filter((c) => c === 'derive').length, 1);
});

test('a store write during a refresh is an error and its notification is dropped, not a loop', async () => {
  const ev = await fresh();
  const calls = [];
  const { setNotifier } = await load('core/Notifier.js');
  const errors = [];
  setNotifier({ logError: (...a) => errors.push(a.join(' ')) });
  const r = await refresherWith(calls, { views: [() => { calls.push('view'); ev.update(0, 1, { written: true }); }] });
  r.attach(ev);
  ev.update(0, 1, { a: 1 });
  assert.deepEqual(calls, ['derive', 'view']);                                           // not 'derive', 'view', 'derive', 'view', ...
  assert.equal(ev.get(0, 1).written, true);                                              // the write itself went through
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Refresher: the store was written during a refresh \(update\)/);
  ev.update(0, 1, { a: 2 });                                                             // the guard is released afterwards
  assert.equal(calls.length, 4);
  setNotifier({ logError: (...a) => console.error(...a) });
});

test('the refresh log shows the sequence nested under the Refresher entry', async () => {
  const ev = await fresh();
  const { refreshLog, timedRefresh } = await load('core/Notifier.js');
  const r = await refresherWith([], {
    derived: [() => timedRefresh('derived', 'updateChronoData', () => {})],
    views: [() => timedRefresh('chrono', 'drawChrono', () => {}), () => timedRefresh('form', 'updateForm', () => {})],
  });
  r.attach(ev);
  refreshLog.clear();
  ev.update(0, 1, { a: 1 });
  assert.equal(refreshLog.tree(), 'store:update,Refresher update(updateChronoData,drawChrono,updateForm)');
});
