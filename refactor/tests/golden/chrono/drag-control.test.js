// chrono/ChronoDragControl.js (ADR 0011, step 1): listener bookkeeping and mode switching, against a fake DOM target.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const JS_DIR = path.resolve(__dirname, '../../../../labelbee/static/labelbee/js');
const load = () => import(pathToFileURL(path.join(JS_DIR, 'chrono/ChronoDragControl.js')).href);

function fakeElement() {
  const l = new Map();
  const doc = { defaultView: null, addEventListener(t, f) { l.set('doc:' + t, f); }, removeEventListener(t, f) { if (l.get('doc:' + t) === f) l.delete('doc:' + t); } };
  return {
    ownerDocument: doc,
    addEventListener(t, f) { l.set(t, f); },
    removeEventListener(t, f) { if (l.get(t) === f) l.delete(t); },
    fire(t, e) { const f = l.get(t); if (f) f(e); },
    fireDoc(t, e) { const f = l.get('doc:' + t); if (f) f(e); },
    size: () => l.size,
  };
}

function fakeTarget() {
  const l = new Map();
  return {
    addEventListener(t, f) { (l.get(t) || l.set(t, new Set()).get(t)).add(f); },
    removeEventListener(t, f) { l.get(t)?.delete(f); },
    pan: true,
    setPan(v) { this.pan = v; },
    element: fakeElement(),                 // CtrlHover listens here; not counted in count()
    count() { let n = 0; for (const s of l.values()) n += s.size; return n; },
  };
}

test('ListenerBag removes exactly what it added, cleanups run in reverse order', async () => {
  const { ListenerBag } = await load();
  const t = fakeTarget();
  const other = () => {};
  t.addEventListener('x', other);
  const bag = new ListenerBag();
  const order = [];
  bag.add(t, 'a', () => {});
  bag.add(t, 'b', () => {});
  bag.addCleanup(() => order.push(1));
  bag.addCleanup(() => order.push(2));
  assert.equal(bag.size, 4);
  assert.equal(t.count(), 3);
  bag.clear();
  assert.equal(t.count(), 1);
  assert.deepEqual(order, [2, 1]);
  assert.equal(bag.size, 0);
  bag.clear(); // idempotent
});

class Probe {
  constructor(Mode, name) {
    const self = new (class extends Mode {
      _attach(target) { this.bag.add(target, 'pointerdown', () => {}); this.bag.add(target, 'pointermove', () => {}); }
    })(name, name);
    return self;
  }
}

test('Mode attach/detach are idempotent and leave no listener', async () => {
  const { Mode } = await load();
  const t = fakeTarget();
  const m = new Probe(Mode, 'p');
  m.attach(t); m.attach(t);
  assert.equal(t.count(), 2);
  assert.ok(m.attached);
  m.detach(); m.detach();
  assert.equal(t.count(), 0);
  assert.ok(!m.attached);
});

test('Mode clears its listeners even if _detach throws', async () => {
  const { Mode } = await load();
  const t = fakeTarget();
  class Bad extends Mode {
    _attach(target) { this.bag.add(target, 'x', () => {}); }
    _detach() { throw new Error('boom'); }
  }
  const m = new Bad('bad', 'Bad');
  m.attach(t);
  assert.throws(() => m.detach(), /boom/);
  assert.equal(t.count(), 0);
  assert.ok(!m.attached);
});

test('DragControl: initial mode, switching detaches the old before attaching the new', async () => {
  const { Mode, IgnoreMode, DragControl } = await load();
  const t = fakeTarget();
  const log = [];
  const a = new Probe(Mode, 'a'), b = new Probe(Mode, 'b');
  const ignore = new IgnoreMode();
  for (const m of [a, b]) {
    const at = m._attach.bind(m), de = m._detach.bind(m);
    m._attach = (x) => { log.push('+' + m.name + ':' + t.count()); at(x); };
    m._detach = () => { log.push('-' + m.name); de(); };
  }
  const c = new DragControl(t, [ignore, a, b], { initial: 'a' });
  assert.equal(c.mode, 'a');
  assert.equal(t.count(), 2);
  const seen = [];
  const off = c.onChange((n, p) => seen.push([p, n]));
  c.setMode('a'); // same mode: nothing
  assert.deepEqual(seen, []);
  c.setMode('b');
  assert.equal(t.count(), 2);                                 // never both attached
  assert.deepEqual(log, ['+a:0', '-a', '+b:0']);              // old detached first: count was 0 when b attached
  c.setMode('ignore');
  assert.equal(t.count(), 0);
  assert.deepEqual(seen, [['a', 'b'], ['b', 'ignore']]);
  off();
  c.setMode('a');
  assert.equal(seen.length, 2);
  c.destroy();
  assert.equal(t.count(), 0);
  assert.equal(c.mode, null);
});

test('PanMode turns the pan on, Ignore turns it off', async () => {
  const { IgnoreMode, PanMode, DragControl } = await load();
  const t = fakeTarget();
  const c = new DragControl(t, [new PanMode(), new IgnoreMode()], { initial: 'pan' });
  assert.equal(t.pan, true);
  c.setMode('ignore');
  assert.equal(t.pan, false);
  c.setMode('pan');
  assert.equal(t.pan, true);
  assert.deepEqual(Object.keys(c.modes), ['pan', 'ignore']);
});

test('DragControl: default is the first mode, unknown mode throws and changes nothing', async () => {
  const { IgnoreMode, DragControl } = await load();
  const c = new DragControl(fakeTarget(), [new IgnoreMode()]);
  assert.equal(c.mode, 'ignore');
  assert.throws(() => c.setMode('nope'), /unknown mode/);
  assert.equal(c.mode, 'ignore');
});

test('CtrlHover previews on Ctrl+hover in every mode, ignores buttons and touch, ends on Ctrl release', async () => {
  const { IgnoreMode, PanMode, DragControl } = await load();
  for (const initial of ['pan', 'ignore']) {
    const t = fakeTarget();
    const sent = [];
    t.hit = () => ({ frame: 5, id: 2 });
    t.emit = (name) => sent.push(name);
    const c = new DragControl(t, [new PanMode(), new IgnoreMode()], { initial });
    const el = t.element;
    el.fire('pointermove', { ctrlKey: false, buttons: 0, pointerType: 'mouse' });
    assert.deepEqual(sent, [], initial + ': no Ctrl, nothing');
    el.fire('pointermove', { ctrlKey: true, buttons: 0, pointerType: 'mouse' });
    assert.deepEqual(sent, ['trackmove'], initial + ': Ctrl+hover previews');
    el.fire('pointermove', { ctrlKey: true, buttons: 1, pointerType: 'mouse' });
    el.fire('pointermove', { ctrlKey: true, buttons: 0, pointerType: 'touch' });
    assert.deepEqual(sent, ['trackmove'], initial + ': a drag or a touch is not a hover');
    el.fireDoc('keyup', { key: 'Control' });
    assert.deepEqual(sent, ['trackmove', 'trackend'], initial + ': releasing Ctrl ends it');
    el.fireDoc('keydown', { key: 'Control' });
    assert.deepEqual(sent, ['trackmove', 'trackend', 'trackmove'], initial + ': pressing Ctrl over the plot previews at once');
    c.destroy();
    assert.deepEqual(sent.slice(-1), ['trackend'], initial + ': destroy ends a running preview');
    assert.equal(el.size(), 0, initial + ': nothing left attached');
  }
});
