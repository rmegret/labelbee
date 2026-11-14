// Contract tests (assertions, not a golden) for annotation/AnnotationStore.js and the legacy globals of
// annotation/AnnotationStoreBridge.js (slice 3 step 2, ADR 0005). Run: node --test refactor/tests/golden/slice3/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

async function fresh() {
  const { createAnnotationStore } = await load('annotation/AnnotationStore.js');
  const { installLegacyGlobals } = await load('annotation/AnnotationStoreBridge.js');
  const store = createAnnotationStore();
  const target = {};
  installLegacyGlobals(target, store);
  return { store, target };
}

test('store defaults equal the old page globals', async () => {
  const { store } = await fresh();
  assert.deepEqual(store.getTracks(), []);
  assert.deepEqual(store.getTags(), []);
  assert.equal(store.getTracksInfo(), undefined);
  assert.equal(store.getTagsInfo(), undefined);
  assert.equal(store.getTagsHaveDM(), false);
});

test('getters return the stored object itself, never a copy', async () => {
  const { store } = await fresh();
  const tracks = { 0: { 1: { id: 1 } } };
  const info = { type: 'events-multiframe' };
  store.replaceTracks(tracks, info);
  assert.equal(store.getTracks(), tracks);
  assert.equal(store.getTracksInfo(), info);
  const tags = { 0: { tags: [] } };
  const tinfo = { type: 'tags-multiframe' };
  store.replaceTags(tags, tinfo);
  assert.equal(store.getTags(), tags);
  assert.equal(store.getTagsInfo(), tinfo);
});

test('replaceTracks / replaceTags are independent and keep tagsHaveDM', async () => {
  const { store } = await fresh();
  store.setTagsHaveDM(true);
  const tracks = {};
  store.replaceTracks(tracks, { a: 1 });
  store.replaceTags({ 1: { tags: [] } }, { b: 2 });
  assert.equal(store.getTracks(), tracks);
  assert.equal(store.getTagsHaveDM(), true);
  store.replaceTracks({}, undefined);
  assert.deepEqual(store.getTagsInfo(), { b: 2 });
});

test('the bridge installs AnnotationStore and events, and no data global (slice 4 step 5)', async () => {
  const { store, target } = await fresh();
  assert.equal(target.AnnotationStore, store);
  assert.equal(target.events, store.events);
  for (const name of ['Tracks', 'TracksInfo', 'Tags', 'TagsInfo', 'tagsHaveDM']) assert.ok(!(name in target), name);
});

test('in-place edits of the tags are seen through the getters (the structure is the stored object)', async () => {
  const { store } = await fresh();
  store.replaceTags({}, { n: 1 });
  store.getTags()[3] = { tags: [{ id: 7 }] };
  assert.deepEqual(store.getTags()[3], { tags: [{ id: 7 }] });
  delete store.getTags()[3];
  assert.deepEqual(store.getTags(), {});
});

test('sloppy classic code gets a ReferenceError for the retired data globals (vm context as the page)', async () => {
  const { store } = await fresh();
  const { installLegacyGlobals } = await load('annotation/AnnotationStoreBridge.js');
  const ctx = vm.createContext({});
  installLegacyGlobals(ctx, store);
  for (const name of ['Tracks', 'TracksInfo', 'Tags', 'TagsInfo', 'tagsHaveDM']) {
    assert.equal(vm.runInContext('typeof ' + name, ctx), 'undefined', name);
    assert.throws(() => vm.runInContext(name, ctx), { name: 'ReferenceError' }, name);
  }
  vm.runInContext('AnnotationStore.replaceTags({2: {tags: []}}, {k: 1}); AnnotationStore.setTagsHaveDM(true)', ctx);
  // objects built inside the vm come from another realm: compare as JSON
  assert.equal(JSON.stringify(store.getTags()), '{"2":{"tags":[]}}');
  assert.equal(JSON.stringify(store.getTagsInfo()), '{"k":1}');
  assert.equal(store.getTagsHaveDM(), true);
  assert.equal(vm.runInContext('Object.keys(AnnotationStore.getTags()).join()', ctx), '2');
});

test('the bridge module does nothing without a window', async () => {
  assert.equal(typeof globalThis.window, 'undefined');
  await load('annotation/AnnotationStoreBridge.js'); // import must not throw
});

test('updateTagsHaveDM: the rule moved from setTags (first tag of the first frame, DEBT-715)', async () => {
  const { store } = await fresh();
  const run = (tags) => { store.replaceTags(tags, undefined); store.updateTagsHaveDM(); return store.getTagsHaveDM(); };
  assert.equal(run({ 0: { tags: [{ id: 1, dm: 60 }] } }), true);
  assert.equal(run({ 0: { tags: [{ id: 1 }] } }), false);
  assert.equal(run({ 0: { tags: [] }, 1: { tags: [{ dm: 1 }] } }), false); // only the first frame is looked at
  assert.equal(run({}), false);
  assert.equal(run([]), false);
  assert.equal(run(undefined), false);  // v2 file without data (DEBT-733): empty by the jQuery test
});

test('updateTagsHaveDM resets to false before a malformed Tags throws', async () => {
  const { store } = await fresh();
  store.setTagsHaveDM(true);
  store.replaceTags({ 0: {} }, undefined);          // first frame without `tags`
  assert.throws(() => store.updateTagsHaveDM(), TypeError);
  assert.equal(store.getTagsHaveDM(), false);
});
