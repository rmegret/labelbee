// Tests of annotation/DebugGlobals.js (slice 4 step 5, the console-only debug globals). Run: node --test refactor/tests/golden/slice4/
// A vm script whose filename is a URL stands for page code; the default filename (`evalmachine.<anonymous>`) stands for the console.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

async function setup() {
  const { createAnnotationStore } = await load('annotation/AnnotationStore.js');
  const { installLegacyGlobals } = await load('annotation/AnnotationStoreBridge.js');
  const store = createAnnotationStore();
  const ctx = vm.createContext({});
  installLegacyGlobals(ctx, store);
  return { store, ctx };
}

test('callerIsPageCode looks at the frame that called the accessor', async () => {
  const { callerIsPageCode } = await load('annotation/DebugGlobals.js');
  const v8Console = 'Error\n    at Object.get (http://host/labelbee/js/annotation/DebugGlobals.js:30:23)\n    at <anonymous>:1:1';
  const v8Page = 'Error\n    at Object.get (http://host/labelbee/js/annotation/DebugGlobals.js:30:23)\n    at plotTags (http://host/labelbee/js/OverlayControl.js:2972:54)\n    at <anonymous>:1:1';
  const firefoxConsole = 'get@http://host/labelbee/js/annotation/DebugGlobals.js:30:23\n@debugger eval code:1:1';
  const firefoxPage = 'get@http://host/labelbee/js/annotation/DebugGlobals.js:30:23\nplotTags@http://host/labelbee/js/OverlayControl.js:2972:54\n';
  assert.equal(callerIsPageCode(v8Console), false);
  assert.equal(callerIsPageCode(v8Page), true);
  assert.equal(callerIsPageCode(firefoxConsole), false);
  assert.equal(callerIsPageCode(firefoxPage), true);
  assert.equal(callerIsPageCode('Error\n    at Object.get (x.js:1:1)'), false);   // no caller frame at all
});

test('off by default: the page has none of the five debug globals until installDebugGlobals() runs', async () => {
  const { ctx } = await setup();
  assert.equal(typeof ctx.installDebugGlobals, 'function');
  assert.equal(vm.runInContext('typeof Tracks', ctx), 'undefined');
  assert.equal(vm.runInContext('typeof TracksInfo', ctx), 'undefined');
});

test('installed: the console reads the live structures, page code gets an error naming the caller', async () => {
  const { store, ctx } = await setup();
  const data = { 0: { 1: { ID: '1' } } };
  const info = { notes: 'n' };
  store.replaceTracks(data, info);
  ctx.installDebugGlobals();
  // the console (default filename, an anonymous frame)
  assert.equal(vm.runInContext('Tracks', ctx), data);
  assert.equal(vm.runInContext('TracksInfo', ctx), info);
  assert.equal(vm.runInContext('Tracks[0][1].ID', ctx), '1');
  // page code: a function of a script that has a URL
  vm.runInContext('function readTracks() { return Tracks }', ctx, { filename: 'http://host/labelbee/js/OverlayControl.js' });
  assert.throws(() => vm.runInContext('readTracks()', ctx), (e) =>
    /console-only debug global/.test(e.message) && /events/.test(e.message) && /OverlayControl\.js/.test(e.message));
  vm.runInContext('function readInfo() { return TracksInfo }', ctx, { filename: 'http://host/labelbee/js/AnnotationIO.js' });
  assert.throws(() => vm.runInContext('readInfo()', ctx), /console-only debug global/);
  // a page function called from the console is still page code
  assert.throws(() => vm.runInContext('readTracks()', ctx, { filename: 'evalmachine.<anonymous>' }), /console-only/);
});

test('installed: the globals are read-only, not enumerable, and installing twice is harmless', async () => {
  const { store, ctx } = await setup();
  ctx.installDebugGlobals();
  ctx.installDebugGlobals();
  assert.throws(() => vm.runInContext('Tracks = {}', ctx), /read-only/);
  assert.throws(() => vm.runInContext('TracksInfo = {}', ctx), /read-only/);
  assert.ok(!Object.keys(ctx).includes('Tracks'));
  store.replaceTracks({ 5: {} }, undefined);
  assert.equal(JSON.stringify(vm.runInContext('Tracks', ctx)), '{"5":{}}');   // always the current structure
});

test('installed: Tags, TagsInfo and tagsHaveDM are guarded like Tracks (slice 4 step 5b)', async () => {
  const { store, ctx } = await setup();
  store.replaceTags({ 1: { tags: [{ dm: 1 }] } }, { t: 1 });
  assert.equal(vm.runInContext('typeof Tags', ctx), 'undefined');       // off until installed
  ctx.installDebugGlobals();
  assert.equal(vm.runInContext('Tags', ctx), store.getTags());
  assert.equal(vm.runInContext('TagsInfo', ctx), store.getTagsInfo());
  assert.equal(vm.runInContext('tagsHaveDM', ctx), true);
  for (const [name, hint] of [['Tags', 'getTags'], ['TagsInfo', 'getTagsInfo'], ['tagsHaveDM', 'getTagsHaveDM']]) {
    vm.runInContext(`function read_${name}() { return ${name} }`, ctx, { filename: 'http://host/labelbee/js/ChronoControl.js' });
    assert.throws(() => vm.runInContext(`read_${name}()`, ctx), (e) => /console-only debug global/.test(e.message) && e.message.includes(hint), name);
    assert.throws(() => vm.runInContext(`${name} = 1`, ctx), /read-only/, name);
  }
});
