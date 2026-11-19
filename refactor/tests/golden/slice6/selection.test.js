// Tests of annotation/SelectionModel.js (slice 6 step 6b, ADR 0009 section 0b). Run: node --test refactor/tests/golden/slice6/
// New behavior, expected values written by hand from the ADR: the id is kept from frame to frame, the key exists only where the
// store has the observation, a draft or a deselect has no key.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

async function make(stored) {
  const { SelectionModel } = await load('annotation/SelectionModel.js');
  const has = new Set(stored.map(([f, id]) => `${f}/${id}`));
  const store = { has: (f, id) => has.has(`${f}/${id}`), stored: has };
  return { sel: new SelectionModel(store), store };
}

test('nothing selected: no id, no key', async () => {
  const { sel } = await make([[0, '1']]);
  assert.equal(sel.getId(), undefined);
  assert.equal(sel.getKey(), null);
});

test('select gives the id and the key of the stored observation', async () => {
  const { sel } = await make([[3, '7']]);
  sel.select(3, '7');
  assert.equal(sel.getId(), '7');
  assert.deepEqual(sel.getKey(), { frame: 3, id: '7' });
});

test('select of an id with no observation keeps the id, the key is null', async () => {
  const { sel } = await make([[3, '7']]);
  sel.select(3, '8');
  assert.equal(sel.getId(), '8');
  assert.equal(sel.getKey(), null);
});

test('changeFrame keeps the id: key on the frames that have it, null elsewhere, id kept', async () => {
  const { sel } = await make([[3, '7'], [5, '7'], [4, '9']]);
  sel.select(3, '7');
  sel.changeFrame(4);
  assert.equal(sel.getKey(), null);
  assert.equal(sel.getId(), '7');
  sel.changeFrame(5);
  assert.deepEqual(sel.getKey(), { frame: 5, id: '7' });
});

test('the key follows the store at each call (a delete or a rename leaves no stale key)', async () => {
  const { sel, store } = await make([[3, '7']]);
  sel.select(3, '7');
  store.stored.delete('3/7');
  assert.equal(sel.getKey(), null);
  assert.equal(sel.getId(), '7');
  store.stored.add('3/7');
  assert.deepEqual(sel.getKey(), { frame: 3, id: '7' });
});

test('a draft has no key but has its id; changeFrame drops the draft flag', async () => {
  const { sel } = await make([[3, '7']]);
  sel.select(3, '7', true);
  assert.equal(sel.getKey(), null);
  assert.equal(sel.getId(), '7');
  sel.changeFrame(3);
  assert.deepEqual(sel.getKey(), { frame: 3, id: '7' });
});

test('clear forgets the id and the key', async () => {
  const { sel } = await make([[3, '7']]);
  sel.select(3, '7');
  sel.clear();
  assert.equal(sel.getId(), undefined);
  assert.equal(sel.getKey(), null);
  sel.changeFrame(3);
  assert.equal(sel.getKey(), null);
});

test('getKey is idempotent', async () => {
  const { sel } = await make([[3, '7']]);
  sel.select(3, '7');
  assert.deepEqual(sel.getKey(), sel.getKey());
  assert.equal(sel.getId(), sel.getId());
});

test('is: true when select would change nothing (ids as strings), false on another frame, id or draft flag', async () => {
  const { sel } = await make([[3, '7']]);
  assert.equal(sel.is(3, '7'), false); // nothing selected yet
  sel.select(3, '7');
  assert.equal(sel.is(3, '7'), true);
  assert.equal(sel.is(3, 7), true);
  assert.equal(sel.is(4, '7'), false);
  assert.equal(sel.is(3, '8'), false);
  assert.equal(sel.is(3, '7', true), false);
  sel.clear();
  assert.equal(sel.is(3, '7'), false);
});
