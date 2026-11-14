// Round trips on the sample files (slice 4 step 7d, ADR 0007 section 3): load, put in Events, commit working copies, save.
// Run: node --test refactor/tests/golden/slice4/
//  - load -> save -> load is the identity (modulo the conventions: ids as strings, 3 decimals, `info`);
//  - an edit session that commits every unchanged working copy (made by the real `cloneObs` of Model.js) changes nothing in the file saved;
//  - a field of the stored observation that the working copy does not carry (an unknown field, `span`, `tag`) survives the commit.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const { loadNewImpl } = require('../harness/new-impl');
const { loadNewSaveImpl } = require('../harness/new-save-impl');

const REPO = path.resolve(__dirname, '../../../..');
const JS_DIR = path.join(REPO, 'labelbee/static/labelbee/js');
const SAMPLES = path.join(REPO, 'tests/webapp/data/sample');
const FILES = ['events_v2.json', 'events_v1.json', 'events_v1_array.json', 'events_v2_duplicates.json'];

const read = (name) => JSON.parse(fs.readFileSync(path.join(SAMPLES, name), 'utf8'));

// The page's own cloneObs / copyObs (Model.js is a classic script: run it in a vm, as the page does)
function loadModel() {
  const ctx = vm.createContext({ console: { log() {} }, logging: {}, videoinfo: { nframes: 40 } });
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, 'Model.js'), 'utf8'), ctx, { filename: 'Model.js' });
  return ctx;
}

async function setup() {
  const { Events } = await import(pathToFileURL(path.join(JS_DIR, 'annotation/Events.js')).href);
  const { sanitizeEvents } = (await loadNewImpl())().fns;
  const { convertTracksToV2 } = (await loadNewSaveImpl())().fns;
  const model = loadModel();
  const load = (name) => sanitizeEvents(read(name));
  const save = (data, info) => convertTracksToV2(data, info, { name: 'v' });
  const newEvents = (loaded) => {
    const ev = new Events({ createObservation: (id) => new model.Observation(id) });
    ev.replace(loaded.data, loaded.info);
    return ev;
  };
  // an edit session that does nothing: a working copy of every observation, committed back
  const commitAll = (ev) => {
    const copies = [];
    ev.forEach((obs) => copies.push(model.cloneObs(obs)));
    for (const wc of copies) ev.commit(wc);
  };
  return { load, save, newEvents, commitAll, sanitizeEvents, model };
}

// the conventions: numbers rounded to 3 decimals (the save does it); null and empty frames not saved; `ID` as a string (a v1 file loads the number it holds, a save
// writes `id` and the next load gives the string, ADR 0007 section 1); the history of `info` grows at each save (not compared)
function normalize(x) {
  if (Array.isArray(x)) return x.map(normalize);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'ID' ? String(v) : normalize(v)]));
  return typeof x === 'number' ? Math.round(x * 1000) / 1000 : x;
}
// null and empty frames are not saved (a v1 array has a null per frame without events): compared without them
const withoutEmptyFrames = (data) => Object.fromEntries(Object.entries(data).filter(([, f]) => f !== null && Object.keys(f).length > 0));
const sameModel = (a, b, msg) =>
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(withoutEmptyFrames(a)))), normalize(JSON.parse(JSON.stringify(withoutEmptyFrames(b)))), msg);

for (const name of FILES) {
  test(`${name}: load, save, load is the identity (modulo the conventions)`, async () => {
    const { load, save, sanitizeEvents } = await setup();
    const first = load(name);
    const saved = JSON.parse(JSON.stringify(save(first.data, first.info)));       // through JSON, as a file
    const second = sanitizeEvents(saved);
    sameModel(second.data, first.data, 'observations');
    assert.equal(second.info.type, 'events-multiframe');
  });

  test(`${name}: committing every unchanged working copy changes nothing in the file saved`, async () => {
    const { load, save, newEvents, commitAll } = await setup();
    const reference = JSON.parse(JSON.stringify(save(load(name).data, load(name).info)));
    const ev = newEvents(load(name));
    commitAll(ev);
    const after = JSON.parse(JSON.stringify(save(ev.toObject(), ev.info)));
    assert.deepEqual(after.data, reference.data);
    assert.deepEqual(Object.keys(after.data), Object.keys(reference.data));        // same frames, same order
  });
}

test('a field of the stored observation that the working copy does not carry survives the commit (unknown field, span, tag)', async () => {
  const { load, newEvents, model, save } = await setup();
  const ev = newEvents(load('events_v2.json'));
  const stored = ev.get(0, 1);
  stored.span = { f1: 0, f2: 9 };
  stored.tag = { id: 1, dm: 60 };
  stored.custom = { keep: 'me' };
  const wc = model.cloneObs(stored);
  assert.ok(!('custom' in wc) && !('span' in wc) && !('tag' in wc));              // the working copy is the 17 fields (+visit)
  wc.x = 111;                                                                      // an edit of the editor's own field
  ev.commit(wc);
  assert.equal(ev.get(0, 1).x, 111);
  assert.deepEqual(ev.get(0, 1).span, { f1: 0, f2: 9 });                           // untouched
  assert.deepEqual(ev.get(0, 1).tag, { id: 1, dm: 60 });
  assert.deepEqual(ev.get(0, 1).custom, { keep: 'me' });
  const saved = save(ev.toObject(), ev.info);
  const e = saved.data['0'].find((o) => String(o.id) === '1');
  assert.deepEqual(e.custom, { keep: 'me' });                                      // the unknown field goes through the save too
  assert.equal(e.x, 111);
});

test('an edit of one field changes that field and what is derived from it, and nothing else in the saved file', async () => {
  const { load, save, newEvents, model } = await setup();
  const ref = JSON.parse(JSON.stringify(save(load('events_v2.json').data, load('events_v2.json').info)));
  const ev = newEvents(load('events_v2.json'));
  const wc = model.cloneObs(ev.get(10, 2));
  wc.notes = 'edited';
  ev.commit(wc);
  const after = JSON.parse(JSON.stringify(save(ev.toObject(), ev.info)));
  const diff = [];
  for (const f of Object.keys(ref.data)) {
    ref.data[f].forEach((o, i) => {
      for (const k of Object.keys(o)) if (JSON.stringify(o[k]) !== JSON.stringify(after.data[f][i][k])) diff.push(`${f}/${o.id}/${k}`);
    });
  }
  assert.deepEqual(diff, ['10/2/notes']);
});
