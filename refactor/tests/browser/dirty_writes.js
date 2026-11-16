// Dirty-write detector (refactor/design/0007-slice-events-api.md): finds every place that modifies the stored
// events directly. Injected into every page by conftest.py when pytest runs with --dirty-writes=REPORT.json.
//
// What `events` hands out is wrapped in a recursive Proxy of the stored structure:
//   depth 0 = Tracks (frames), depth 1 = one frame (observations), depth 2 = one observation (its fields),
//   depth 3+ = nested values (bool_acts, parts, fix, ...).
// Every set / delete / defineProperty through the proxy is counted by (operation, depth, field, source file:line).
// The stored data itself is never wrapped (the proxy writes through to the raw object), and handles that the code
// keeps (flatTracks, rect handles, ...) are proxies too, so writes through them are seen as well.
// Since slice 5 step 6 there is no working copy: a rectangle holds the stored object (`rect.obs`), so a write through it is seen; only a draft rectangle's own observation is not recorded.
//
// Since slice 4 step 2 the data lives in `AnnotationStore.events` (annotation/Events.js) and, since step 6, in a private
// structure: the doors to the live data are `toObject`, `get`, `getOrCreate`, `commit`, `update`, `getFrame`, `forEach` and
// `observations`, and the detector wraps what each hands out. The
// operations of `Events` write to their private data, so they are never "dirty"; the detector subscribes to the
// observer of `Events` and reports each operation separately, "through the API", with the call site outside Events.js
// (window.__dirtyApi). A site that moves from the dirty list to the API list is a migration made visible.
//
// Indirect references (found by probing): an object that the stored events hold by reference together with outside code
// is a second door to the stored data. Two kinds are tracked:
//   - after `commit`, a field of the stored observation that is the same object as in the working copy (`parts`, `visit`):
//     both sides are given the proxy, so a write through the working copy is seen as a write to the stored data;
//   - an object given to `update` (`obs.tag` is the tag object of the Tags structure): `AnnotationStore.getTags()` hands
//     out a proxy that records writes only to objects that are shared with the events.
// A write through either is reported like any other dirty write, from its own call site.
//
// By hand, in a real browser session: the detector is not part of the page. Paste this file in the console (or run it
// as a DevTools snippet) and call `__dirtyWritesPatchNow()`: the current store is patched in place; then use the page,
// and read `__dirtyWrites` (dirty writes) and `__dirtyApi` (operations of Events) as tables with console.table.
(function () {
  if (window.__dirtyWritesInstalled) return;
  window.__dirtyWritesInstalled = true;
  const stats = {};
  const apiStats = {};
  window.__dirtyWrites = stats;
  window.__dirtyApi = apiStats;
  const proxies = new WeakMap(); // raw -> proxy
  const raws = new WeakMap(); // proxy -> raw
  const shared = new WeakSet(); // raw objects held by the stored events AND by outside code (see the header)
  const tagProxies = new WeakMap(); // raw -> proxy of the Tags structure (records only writes to shared objects)
  const tagRaws = new WeakMap();
  const unwrap = (v) => (v !== null && typeof v === 'object' ? raws.get(v) || tagRaws.get(v) || v : v);

  function markShared(v, level) {
    v = unwrap(v);
    if (v === null || typeof v !== 'object' || shared.has(v) || (level || 0) > 4) return;
    shared.add(v);
    for (const k in v) markShared(v[k], (level || 0) + 1);
  }
  // The Tags structure as the page sees it: writes are recorded only when the target is shared with the events.
  function wrapTags(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (tagRaws.has(obj)) return obj;
    const hit = tagProxies.get(obj);
    if (hit) return hit;
    const p = new Proxy(obj, {
      get(t, k) {
        const v = Reflect.get(t, k);
        return typeof k === 'string' && v !== null && typeof v === 'object' ? wrapTags(v) : v;
      },
      set(t, k, v) {
        if (shared.has(t)) __dw_record('set', 3, k);
        return Reflect.set(t, k, unwrap(v));
      },
      deleteProperty(t, k) {
        if (shared.has(t)) __dw_record('delete', 3, k);
        return Reflect.deleteProperty(t, k);
      },
      defineProperty(t, k, d) {
        if (shared.has(t)) __dw_record('define', 3, k);
        return Reflect.defineProperty(t, k, d);
      },
    });
    tagProxies.set(obj, p);
    tagRaws.set(p, obj);
    return p;
  }

  function __dw_site(skipFile) {
    const lines = new Error().stack.split('\n').slice(1);
    for (const l of lines) {
      if (l.includes('__dw_') || l.includes('__playwright') || l.includes('dirty_writes.js')) continue;
      if (skipFile && l.includes('/' + skipFile + ':')) continue;
      const m = l.match(/([\w.-]+\.js):(\d+):\d+/);
      if (m) {
        const f = l.match(/at (?:async )?([^\s(]+) /);
        return { file: m[1], line: Number(m[2]), fn: f ? f[1] : '(anonymous)' };
      }
    }
    return { file: '?', line: 0, fn: '?' };
  }

  function __dw_record(op, depth, key) {
    const s = __dw_site();
    const field = depth === 2 || depth >= 3 ? (/^\d+$/.test(String(key)) ? '#' : String(key)) : '#';
    const k = [op, depth, field, s.file + ':' + s.line].join('|');
    const e = stats[k];
    if (e) e.count++;
    else stats[k] = { op: op, depth: depth, field: field, file: s.file, line: s.line, fn: s.fn, count: 1 };
  }

  function __dw_api(event) {
    const s = __dw_site('Events.js');
    const k = [event.op, s.file + ':' + s.line].join('|');
    const e = apiStats[k];
    if (e) e.count++;
    else apiStats[k] = { op: event.op, file: s.file, line: s.line, fn: s.fn, count: 1 };
  }

  function wrap(obj, depth) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (raws.has(obj)) return obj; // already one of our proxies
    const hit = proxies.get(obj);
    if (hit) return hit;
    const p = new Proxy(obj, {
      get(t, k) {
        const v = Reflect.get(t, k);
        return typeof k === 'string' && v !== null && typeof v === 'object' ? wrap(v, depth + 1) : v;
      },
      set(t, k, v) {
        __dw_record('set', depth, k);
        return Reflect.set(t, k, raws.get(v) || v);
      },
      deleteProperty(t, k) {
        __dw_record('delete', depth, k);
        return Reflect.deleteProperty(t, k);
      },
      defineProperty(t, k, d) {
        __dw_record('define', depth, k);
        return Reflect.defineProperty(t, k, d);
      },
    });
    proxies.set(obj, p);
    raws.set(p, obj);
    return p;
  }

  function patch(store) {
    if (!store || store.__dwPatched || !store.events || typeof store.replaceTracks !== 'function') return;
    store.__dwPatched = true;
    const replaceTracks = store.replaceTracks;
    store.replaceTracks = function (data, info) {
      // replaceTracks goes through events.replace, reported through the API (no longer a dirty write)
      return replaceTracks.call(store, raws.get(data) || data, info);
    };
    const getTags = store.getTags;
    const replaceTags = store.replaceTags;
    store.getTags = function () {
      return wrapTags(getTags.call(store));
    };
    store.replaceTags = function (data, info) {
      return replaceTags.call(store, unwrap(data), info);
    };
    patchEvents(store.events);
  }

  // What Events hands out is wrapped, so a write through a handle that the code kept is seen. The operations
  // inside Events use private accessors, so they do not go through these wrappers.
  function patchEvents(ev) {
    if (!ev || ev.__dwPatched) return;
    ev.__dwPatched = true;
    for (const name of ['toObject']) {
      const orig = ev[name];
      ev[name] = (...args) => wrap(orig.apply(ev, args), 0);
    }
    for (const name of ['get', 'getOrCreate']) {
      const orig = ev[name];
      ev[name] = (...args) => wrap(orig.apply(ev, args), 2);
    }
    const commit = ev.commit;
    ev.commit = (tmp) => {
      const obs = commit.call(ev, tmp);
      // a field that is now the same object in the working copy and in the stored observation is shared (parts, visit):
      // give both sides the proxy, so that a later write through the working copy is seen as a write to the stored data
      for (const k of Object.keys(obs)) {
        const v = obs[k];
        if (v !== null && typeof v === 'object' && unwrap(tmp[k]) === v) {
          const p = wrap(v, 3);
          obs[k] = p;
          tmp[k] = p;
        }
      }
      return wrap(obs, 2);
    };
    const update = ev.update;
    ev.update = (frame, id, fields) => {
      const raw = {};
      for (const k of Object.keys(fields)) {
        raw[k] = unwrap(fields[k]);
        markShared(raw[k]);
      }
      return wrap(update.call(ev, frame, id, raw), 2);
    };
    const getFrame = ev.getFrame;
    ev.getFrame = (...args) => {
      const out = getFrame.apply(ev, args);            // a new object: its observations are the live ones
      for (const id in out) out[id] = wrap(out[id], 2);
      return out;
    };
    const forEach = ev.forEach;
    ev.forEach = (fn) => forEach.call(ev, (obs, F, id) => fn(wrap(obs, 2), F, id));
    const observations = ev.observations;
    ev.observations = function* () {
      for (const [obs, F, id] of observations.call(ev)) yield [wrap(obs, 2), F, id];
    };
    ev.setObserver(__dw_api);
  }

  // For a session by hand (see the header): patch the store that the page already has.
  window.__dirtyWritesPatchNow = () => patch(window.AnnotationStore);

  // The bridge assigns window.AnnotationStore once, at module load: patch the store at that moment. Pasted into a page
  // that is already running, the store exists: it is kept and patched at once.
  let current = window.AnnotationStore;
  Object.defineProperty(window, 'AnnotationStore', {
    configurable: true,
    get() {
      return current;
    },
    set(v) {
      current = v;
      patch(v);
    },
  });
  if (current) patch(current);
})();
