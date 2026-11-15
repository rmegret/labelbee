// Tests of annotation/Events.js (slice 4 step 1, ADR 0007). Run: node --test refactor/tests/golden/slice4/
//  1. differential: random operation sequences run on Events and on the frozen legacy code (legacy-model.js),
//     the structure (content, key order, array or object start), the return values and the queries must be equal;
//  2. contract: the behaviors that the ADR states and the random sequences cannot name (prune, observer, ...);
//  3. store: AnnotationStore.events holds the data, the legacy accessors still reach it.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');
const L = require('./legacy-model.js');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = (rel) => import(pathToFileURL(path.join(JS_DIR, rel)).href);

// ---- deterministic random
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

// the fields that the legacy copyObs copies; the others used to be dropped by a commit and are kept since step 7a
const COMMIT_FIELDS = new Set(['ID', 'time', 'frame', 'x', 'y', 'cx', 'cy', 'width', 'height', 'bool_acts', 'angle', 'notes',
  'labels', 'parts', 'newid', 'fix', 'visit']);
const FRAMES = [0, 1, 2, 3, 4];
const IDS = [1, 2, 3, '1', 'a', 'SWAP_save_2'];
const NFRAMES = 6;

function obsData(r, f, id) {
  const o = { ID: String(id), time: f, frame: f, x: Math.floor(r() * 100), y: 2, cx: 3, cy: 4, width: 5, height: 6,
    angle: 0, notes: '', labels: pick(r, ['', 'pollen', 'falsealarm']), bool_acts: [false, false, false, false], zz: 'unknown' };
  if (r() < 0.3) o.parts = [{ label: 'head' }];
  return o;
}
/** Fresh initial data; the same seed gives the same (but distinct) objects. */
function initial(seed) {
  const r = rng(seed);
  const data = r() < 0.3 ? [] : {};
  for (const f of FRAMES) {
    const x = r();
    if (x < 0.25) continue;
    if (x < 0.32) {
      data[f] = null;
      continue;
    }
    data[r() < 0.5 ? f : String(f)] = (() => {
      const frame = {};
      for (const id of IDS) {
        const y = r();
        if (y < 0.45) frame[id] = obsData(r, f, id);
        else if (y < 0.5) frame[id] = null;
      }
      return frame;
    })();
  }
  const info = r() < 0.3 ? undefined : { type: 'events-multiframe', notes: 'n' };
  return { data, info };
}

function workingCopy(r) {
  const f = pick(r, FRAMES);
  const id = pick(r, IDS);
  const w = { ID: id, frame: f, time: f, x: Math.floor(r() * 100), y: 1, cx: 2, cy: 3, width: 4, height: 5, angle: 0, notes: 'w', labels: 'pollen',
    extra: 'kept by commit since step 7a' };
  if (r() < 0.7) w.bool_acts = [true, false, r() < 0.5, false];
  if (r() < 0.5) w.parts = [{ label: 'tail' }];
  if (r() < 0.5) w.fix = { newid: 'x' };
  if (r() < 0.3) w.visit = { v: 1 };
  if (r() < 0.3) w.newid = 'n';
  return w;
}

function makeOps(seed, n) {
  const r = rng(seed * 7919 + 13);
  const ops = [];
  for (let i = 0; i < n; i++) {
    const kind = pick(r, ['create', 'commit', 'rename', 'rename', 'swap', 'delete', 'delete', 'update', 'setInfo', 'replace']);
    const f = pick(r, [...FRAMES, ...FRAMES.map(String)]);
    switch (kind) {
      case 'create': ops.push({ kind, f, id: pick(r, IDS) }); break;
      case 'commit': ops.push({ kind, w: workingCopy(r) }); break;
      case 'rename': ops.push({ kind, f, a: pick(r, IDS), b: pick(r, IDS), force: pick(r, [undefined, false, true, 'swap']) }); break;
      case 'swap': ops.push({ kind, interval: pick(r, [[0, 4], [1, 3], [2, -1], [0, 0], [3, 2]]), a: pick(r, IDS), b: pick(r, IDS) }); break;
      case 'delete': ops.push({ kind, f, id: pick(r, IDS) }); break;
      case 'update': ops.push({ kind, f, id: pick(r, IDS), fields: pick(r, [{ span: { f1: 0, f2: 3 } }, { tag: { dm: 5 } }, { cx: 9, cy: undefined }]) }); break;
      case 'setInfo': ops.push({ kind, key: pick(r, ['notes', 'history']), value: String(i) }); break;
      case 'replace': ops.push({ kind, seed: Math.floor(r() * 1e6) }); break;
    }
  }
  return ops;
}
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

// ---- the two implementations behind one tiny driver
function legacyDriver(seed) {
  const S = { ...initialToState(seed), nframes: NFRAMES };
  const factory = L.Observation;
  return {
    state: () => ({ tracks: S.Tracks, info: S.TracksInfo }),
    apply(op) {
      switch (op.kind) {
        case 'create': return L.getObsHandle(S, op.f, op.id, true) && 'ok';
        case 'commit': {
          // the one deliberate difference from the frozen legacy code (step 7a): the other fields of the working copy are kept
          const w = clone(op.w);
          L.storeObs(S, w);
          const obs = S.Tracks[w.frame][w.ID];
          for (const k of Object.keys(w)) if (!COMMIT_FIELDS.has(k) && w[k] !== undefined) obs[k] = w[k];
          return 'ok';
        }
        case 'rename': return L.changeObservationID(S, op.f, op.a, op.b, op.force);
        case 'swap': L.obs_swapID(S, op.interval, op.a, op.b); return 'ok';
        case 'delete': {
          const frame = S.Tracks[op.f];
          if (frame == null || !(op.id in frame)) return false;
          L.deleteObs(S, op.f, op.id);
          L.pruneIfEmpty(S, op.f);
          return true;
        }
        case 'update': {
          const obs = L.getObsHandle(S, op.f, op.id);
          if (!obs) return undefined;
          Object.assign(obs, op.fields);
          return 'ok';
        }
        case 'setInfo': L.setEventsProp(S, op.key, op.value); return 'ok';
        case 'replace': { const i = initial(op.seed); S.Tracks = i.data; S.TracksInfo = i.info; return 'ok'; }
      }
    },
    queries(f, id) {
      const out = { has: L.obsDoesExist(S, f, id), get: L.getObsHandle(S, f, id), ids: L.getValidIDsForFrame(S, f),
        withId: L.getFramesWithID(S, [0, -1], id), frames: [], seq: [] };
      for (const F in S.Tracks) out.frames.push(F);
      for (const F in S.Tracks) for (const i in S.Tracks[F]) if (S.Tracks[F][i] != null) out.seq.push([F, i]);
      return out;
    },
    factory,
  };
}
function initialToState(seed) {
  const i = initial(seed);
  return { Tracks: i.data, TracksInfo: i.info };
}
async function eventsDriver(seed) {
  const { Events } = await load('annotation/Events.js');
  const i = initial(seed);
  const ev = new Events({ createObservation: (id) => new L.Observation(id) });
  ev.replace(i.data, i.info);
  return {
    state: () => ({ tracks: ev.toObject(), info: ev.info }),
    apply(op) {
      switch (op.kind) {
        case 'create': return ev.getOrCreate(op.f, op.id) && 'ok';
        case 'commit': ev.commit(clone(op.w)); return 'ok';
        case 'rename': return ev.rename(op.f, op.a, op.b, op.force);
        case 'swap': ev.swap(op.interval, op.a, op.b, NFRAMES); return 'ok';
        case 'delete': return ev.delete(op.f, op.id);
        case 'update': return ev.update(op.f, op.id, op.fields) && 'ok';
        case 'setInfo': ev.setInfo(op.key, op.value); return 'ok';
        case 'replace': { const j = initial(op.seed); ev.replace(j.data, j.info); return 'ok'; }
      }
    },
    queries(f, id) {
      const seq = [];
      ev.forEach((obs, F, i) => seq.push([F, i]));
      const gen = [...ev.observations()].map(([, F, i]) => [F, i]);
      assert.deepEqual(gen, seq, 'observations() and forEach() visit the same observations in the same order');
      return { has: ev.has(f, id), get: ev.get(f, id), ids: ev.frameIds(f), withId: ev.framesWithId([0, -1], id, NFRAMES), frames: ev.frames(), seq };
    },
  };
}

// `bool_acts` is derived from `labels` and no longer stored (slice 5 step 4): `commit` does not copy it, the frozen legacy code does.
// The comparison ignores that one field.
const noActs = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x, (k, v) => (k === 'bool_acts' ? undefined : v))));

function sameState(a, b, where) {
  assert.equal(Array.isArray(a.tracks), Array.isArray(b.tracks), where + ': array or object');
  assert.deepEqual(noActs(a.tracks), noActs(b.tracks), where + ': content');
  assert.equal(JSON.stringify(noActs(a.tracks)), JSON.stringify(noActs(b.tracks)), where + ': key order');
  assert.deepEqual(a.info, b.info, where + ': info');
}

test('differential: 300 random sequences of 40 operations, Events equals the legacy code at every step', async () => {
  for (let seed = 1; seed <= 300; seed++) {
    const legacy = legacyDriver(seed);
    const events = await eventsDriver(seed);
    const rq = rng(seed + 99);
    sameState(legacy.state(), events.state(), `seed ${seed} initial`);
    const ops = makeOps(seed, 40);
    for (let i = 0; i < ops.length; i++) {
      const where = `seed ${seed} op ${i} ${JSON.stringify(ops[i])}`;
      const ra = legacy.apply(ops[i]);
      const rb = events.apply(ops[i]);
      assert.deepEqual(ra, rb, where + ': return value');
      sameState(legacy.state(), events.state(), where);
      const f = pick(rq, FRAMES);
      const id = pick(rq, IDS);
      assert.deepEqual(noActs(legacy.queries(f, id)), noActs(events.queries(f, id)), where + ': queries');
    }
  }
});

// ---- contract
async function fresh(data, info) {
  const { Events } = await load('annotation/Events.js');
  const ev = new Events();
  if (data !== undefined) ev.replace(data, info);
  return ev;
}

test('a new Events starts like the page did: Tracks is [], no info', async () => {
  const ev = await fresh();
  assert.deepEqual(ev.toObject(), []);
  assert.ok(Array.isArray(ev.toObject()));
  assert.equal(ev.info, undefined);
  assert.deepEqual(ev.frames(), []);
});

test('replace keeps the given objects, no copy; toObject and tracks are the live structure', async () => {
  const data = { 0: { 1: { ID: '1' } } };
  const info = { notes: 'x' };
  const ev = await fresh(data, info);
  assert.equal(ev.toObject(), data);
  assert.equal(ev.toObject(), data);
  assert.equal(ev.info, info);
  assert.equal(ev.get(0, 1), data[0][1]);
});

test('delete removes the frame when the deletion empties it, and only then', async () => {
  const ev = await fresh({ 0: { 1: { ID: '1' } }, 1: { 1: { ID: '1' }, 2: { ID: '2' } }, 2: {} });
  assert.equal(ev.delete(0, 1), true);
  assert.deepEqual(ev.frames(), ['1', '2']);                     // frame 0 pruned
  assert.equal(ev.delete(1, 1), true);
  assert.deepEqual(ev.frames(), ['1', '2']);                     // frame 1 still holds id 2
  assert.equal(ev.delete(1, 9), false);                          // nothing deleted: nothing pruned
  assert.equal(ev.delete(2, 1), false);                          // a frame that was empty in the loaded data stays as loaded
  assert.deepEqual(ev.toObject()[2], {});
  assert.equal(ev.delete(7, 1), false);                          // missing frame
});

test('getFrame is a new object: adding keys to it does not touch the store; null entries are left out', async () => {
  const ev = await fresh({ 0: { 1: { ID: '1' }, 2: null } });
  const frame = ev.getFrame(0);
  assert.deepEqual(Object.keys(frame), ['1']);
  frame[5] = { ID: '5' };
  assert.deepEqual(Object.keys(ev.toObject()[0]), ['1', '2']);
  assert.equal(frame[1], ev.get(0, 1));                          // the observations themselves are live
  assert.deepEqual(ev.getFrame(9), {});
});

test('update is Object.assign on the stored observation, never creates, undefined means none', async () => {
  const ev = await fresh({ 0: { 1: { ID: '1', labels: 'a' } } });
  const obs = ev.get(0, 1);
  assert.equal(ev.update(0, 1, { span: { f1: 0, f2: 2 }, labels: undefined }), obs);
  assert.deepEqual(obs, { ID: '1', labels: undefined, span: { f1: 0, f2: 2 } });
  assert.ok('labels' in obs);
  assert.equal(ev.update(0, 2, { x: 1 }), undefined);
  assert.equal(ev.update(5, 1, { x: 1 }), undefined);
  assert.deepEqual(ev.frames(), ['0']);
});

test('commit creates when missing, copies the 17 fields and keeps the other fields of the working copy (step 7a); shares parts by reference', async () => {
  const ev = await fresh({});
  const parts = [{ label: 'head' }];
  const w = { ID: '3', frame: 2, time: 2, x: 1, y: 2, cx: 3, cy: 4, width: 5, height: 6, angle: 7, notes: 'n', labels: 'pollen',
    parts, bool_acts: [true, false, true, false], fix: { newid: 'q' }, extra: 'kept', span: { f1: 2, f2: 4 }, gone: undefined };
  const obs = ev.commit(w);
  assert.equal(obs, ev.get(2, '3'));
  assert.equal(obs.parts, parts);
  assert.notEqual(obs.fix, w.fix);                                // fix is deep-copied
  assert.equal(obs.bool_acts, undefined);                         // derived from labels, not stored (slice 5 step 4)
  assert.equal(obs.extra, 'kept');                                // unknown fields are kept (they were dropped before step 7a)
  assert.deepEqual(obs.span, { f1: 2, f2: 4 });
  assert.ok(!('gone' in obs));                                    // an undefined field is not created
  ev.commit({ ID: '3', frame: 2, x: 9 });
  assert.equal(ev.get(2, '3').bool_acts, undefined);
  assert.equal(ev.get(2, '3').x, 9);
});

test('rename aborts on identical ids, an existing target (unless forced) and a missing source; swap mode trades', async () => {
  const ev = await fresh({ 0: { 1: { ID: '1' }, 2: { ID: '2' } } });
  assert.equal(ev.rename(0, 1, 1), false);
  assert.equal(ev.rename(0, 1, 2), false);
  assert.equal(ev.rename(0, 5, 6), false);
  assert.equal(ev.rename(3, 1, 6), false);
  assert.equal(ev.rename(0, 1, 7), true);
  assert.deepEqual(Object.keys(ev.toObject()[0]), ['2', '7']);
  assert.equal(ev.get(0, 7).ID, 7);                               // ID mirrors the key, as given (a number here)
  assert.equal(ev.rename(0, 7, 2, 'swap'), true);
  assert.equal(ev.get(0, 2).ID, 2);
  assert.equal(ev.get(0, 7).ID, 7);
});

test('swap trades the observations of two ids over the interval and leaves no temporary key', async () => {
  const ev = await fresh({
    0: { 1: { ID: '1', n: 'a0' } },
    1: { 1: { ID: '1', n: 'a1' }, 2: { ID: '2', n: 'b1' } },
    2: { 2: { ID: '2', n: 'b2' } },
  });
  ev.swap([0, -1], 1, 2, 3);
  assert.equal(ev.get(0, 2).n, 'a0');
  assert.equal(ev.get(1, 2).n, 'a1');
  assert.equal(ev.get(1, 1).n, 'b1');
  assert.equal(ev.get(2, 2).n, 'b2');                             // frame 2 has no id 1: untouched
  assert.deepEqual(ev.get(1, 1).ID, 1);
  for (const f of ev.frames()) for (const id in ev.toObject()[f]) assert.ok(!String(id).startsWith('SWAP_save_'));
});

test('setInfo creates the info when missing', async () => {
  const ev = await fresh();
  ev.setInfo('notes', 'hello');
  assert.deepEqual(ev.info, { notes: 'hello' });
  ev.setInfo('notes', 'again');
  assert.equal(ev.info.notes, 'again');
});

test('the observer hears each command that changed something, with the operation and its target', async () => {
  const ev = await fresh({ 0: { 1: { ID: '1' } } });
  const heard = [];
  ev.setObserver((e) => heard.push(e));
  ev.getOrCreate(0, 1);                                           // exists: silent
  ev.getOrCreate(0, 2);
  ev.commit({ ID: '2', frame: 0 });
  ev.update(0, 1, { span: 1 });
  ev.update(0, 9, { span: 1 });                                   // no such observation: silent
  ev.rename(0, 1, 5);
  ev.rename(0, 8, 9);                                             // aborted: silent
  ev.swap([0, 0], 5, 2);
  ev.delete(0, 2);
  ev.delete(0, 99);                                               // nothing deleted: silent
  ev.setInfo('k', 1);
  ev.replace({}, undefined);
  assert.deepEqual(heard.map((e) => e.op), ['create', 'commit', 'update', 'rename', 'swap', 'delete', 'setInfo', 'replace']);
  assert.deepEqual(heard[0], { op: 'create', frame: 0, id: 2 });
  ev.setObserver(null);
  ev.setInfo('k', 2);
  assert.equal(heard.length, 8);
});

test('callback iteration and the generator skip null entries and visit frames and ids in for...in order', async () => {
  const ev = await fresh({ 2: { b: { ID: 'b' }, a: { ID: 'a' }, 10: { ID: '10' }, 3: null }, 1: null, 0: { 1: { ID: '1' } } });
  const seen = [];
  ev.forEach((obs, F, id) => seen.push(F + ':' + id));
  assert.deepEqual(seen, ['0:1', '2:10', '2:b', '2:a']);          // integer-like keys ascend, then insertion order
  assert.deepEqual([...ev.observations()].map(([, F, id]) => F + ':' + id), seen);
  assert.deepEqual(ev.frames(), ['0', '1', '2']);
});

// ---- store
test('AnnotationStore.events holds the data: the getters return its live structure, replaceTracks goes through it', async () => {
  const { createAnnotationStore } = await load('annotation/AnnotationStore.js');
  const { installLegacyGlobals } = await load('annotation/AnnotationStoreBridge.js');
  const store = createAnnotationStore();
  assert.deepEqual(store.events.toObject(), []);
  assert.equal(store.getTracks, undefined);                         // the store getters are gone (step 6)
  assert.equal(store.getTracksInfo, undefined);
  assert.equal(store.events.tracks, undefined);                    // and so is the public structure
  const data = { 0: { 1: { ID: '1' } } };
  const info = { notes: 'z' };
  store.replaceTracks(data, info);
  assert.equal(store.events.toObject(), data);
  assert.equal(store.events.toObject(), data);
  assert.equal(store.events.info, info);
  assert.equal(store.events.info, info);
  const target = {};
  installLegacyGlobals(target, store);
  assert.equal(target.events, store.events);                      // window.events
  assert.ok(!('Tracks' in target) && !('TracksInfo' in target));  // the legacy globals are retired (step 5a)
});
