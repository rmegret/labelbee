// Dirty-write detector (refactor/design/0007-slice-events-api.md): finds every place that modifies the stored
// events directly. Injected into every page by conftest.py when pytest runs with --dirty-writes=REPORT.json.
//
// AnnotationStore.getTracks() is patched to return a recursive Proxy of the stored structure:
//   depth 0 = Tracks (frames), depth 1 = one frame (observations), depth 2 = one observation (its fields),
//   depth 3+ = nested values (bool_acts, parts, fix, ...).
// Every set / delete / defineProperty through the proxy is counted by (operation, depth, field, source file:line).
// The stored data itself is never wrapped (the proxy writes through to the raw object), and handles that the code
// keeps (flatTracks, rect handles, ...) are proxies too, so writes through them are seen as well.
// Working copies (rect.obs, made by cloneObs) are separate objects and are not recorded: that is the intended path.
//
// Since slice 4 step 2 the data lives in `AnnotationStore.events` (annotation/Events.js). The detector also wraps what
// `events.tracks`, `get`, `getOrCreate`, `commit`, `update`, `getFrame`, `toObject`, `forEach` and `observations` hand out. The
// operations of `Events` write to their private data, so they are never "dirty"; the detector subscribes to the
// observer of `Events` and reports each operation separately, "through the API", with the call site outside Events.js
// (window.__dirtyApi). A site that moves from the dirty list to the API list is a migration made visible.
(function () {
  if (window.__dirtyWritesInstalled) return;
  window.__dirtyWritesInstalled = true;
  const stats = {};
  const apiStats = {};
  window.__dirtyWrites = stats;
  window.__dirtyApi = apiStats;
  const proxies = new WeakMap(); // raw -> proxy
  const raws = new WeakMap(); // proxy -> raw

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
    if (!store || store.__dwPatched || typeof store.getTracks !== 'function') return;
    store.__dwPatched = true;
    const getTracks = store.getTracks;
    const replaceTracks = store.replaceTracks;
    store.getTracks = function () {
      return wrap(getTracks.call(store), 0);
    };
    store.replaceTracks = function (data, info) {
      // replaceTracks goes through events.replace, reported through the API (no longer a dirty write)
      return replaceTracks.call(store, raws.get(data) || data, info);
    };
    patchEvents(store.events);
  }

  // What Events hands out is wrapped, so a write through a handle that the code kept is seen. The operations
  // inside Events use private accessors, so they do not go through these wrappers.
  function patchEvents(ev) {
    if (!ev || ev.__dwPatched) return;
    ev.__dwPatched = true;
    const proto = Object.getPrototypeOf(ev);
    const tracksGetter = Object.getOwnPropertyDescriptor(proto, 'tracks').get;
    Object.defineProperty(ev, 'tracks', { configurable: true, get: () => wrap(tracksGetter.call(ev), 0) });
    for (const name of ['toObject']) {
      const orig = ev[name];
      ev[name] = (...args) => wrap(orig.apply(ev, args), 0);
    }
    for (const name of ['get', 'getOrCreate', 'commit', 'update']) {
      const orig = ev[name];
      ev[name] = (...args) => wrap(orig.apply(ev, args), 2);
    }
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

  // The bridge assigns window.AnnotationStore once, at module load: patch the store at that moment.
  let current;
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
})();
