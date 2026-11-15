// annotation/Labels.js (slice 5 step 2, ADR 0008): the pure label helpers moved from SelectionControl.js.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = () => import(pathToFileURL(path.join(JS_DIR, 'annotation/Labels.js')).href);

test('normalize resolves aliases and keeps unknown labels', async () => {
  const L = await load();
  assert.equal(L.normalize('f'), 'fanning');
  assert.equal(L.normalize('p'), 'pollen');
  assert.equal(L.normalize('e'), 'entering');
  assert.equal(L.normalize('d'), 'leaving');
  assert.equal(L.normalize('l'), 'leaving');
  assert.equal(L.normalize('departing'), 'leaving');
  assert.equal(L.normalize('expulsion'), 'expulsion');
  assert.equal(L.normalize('wrongid'), 'wrongid');
});

test('toArray, toString, clean: lower case, trimmed, no empty item, aliases', async () => {
  const L = await load();
  assert.deepEqual(L.toArray(' Pollen, f ,, WrongID'), ['pollen', 'fanning', 'wrongid']);
  assert.deepEqual(L.toArray(''), []);
  assert.equal(L.toString(['P', ' e ', '']), 'pollen,entering');
  assert.equal(L.clean('f, p'), 'fanning,pollen');
});

test('contains and has: aliases count, null contains nothing, nothing is written', async () => {
  const L = await load();
  assert.equal(L.contains('pollen,fanning', 'f'), true);
  assert.equal(L.contains('pollen', 'fanning'), false);
  assert.equal(L.contains(null, 'pollen'), false);
  assert.equal(L.contains(undefined, 'pollen'), false);
  const obs = Object.freeze({});
  assert.equal(L.has(obs, 'pollen'), false);
  assert.deepEqual(obs, {});
  assert.equal(L.has({ labels: 'e' }, 'entering'), true);
});

test('bool_acts gives [fanning, pollen, entering, leaving] from labels', async () => {
  const L = await load();
  assert.deepEqual(L.bool_acts({ labels: 'pollen,fanning' }), [true, true, false, false]);
  assert.deepEqual(L.bool_acts({ labels: 'd,wrongid' }), [false, false, false, true]);
  assert.deepEqual(L.bool_acts({ labels: '' }), [false, false, false, false]);
  assert.deepEqual(L.bool_acts({}), [false, false, false, false]);
});

test('update adds or removes a label and returns a new string', async () => {
  const L = await load();
  assert.equal(L.update('', 'pollen', true), 'pollen');
  assert.equal(L.update('pollen', 'fanning', true), 'pollen,fanning');
  assert.equal(L.update('pollen,fanning', 'pollen', true), 'pollen,fanning');
  assert.equal(L.update('pollen,fanning', 'pollen', false), 'fanning');
  assert.equal(L.update('fanning', 'pollen', false), 'fanning');
  assert.equal(L.update(null, 'wrongid', true), 'wrongid');
});
