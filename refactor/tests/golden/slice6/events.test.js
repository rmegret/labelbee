// Tests of `Events.subscribe` / `Events.batch` (slice 6 step 2, ADR 0009). Run: node --test refactor/tests/golden/slice6/
// New behavior (nothing to pin from), expected values written by hand from the ADR: sync subscribers, one batched notification, the observer unchanged.
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

