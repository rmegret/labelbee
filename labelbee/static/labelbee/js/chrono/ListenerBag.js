// ListenerBag (ADR 0011): records every listener a drag mode adds, so clear() removes exactly those.
export class ListenerBag {
  constructor() {
    this._undo = [];
  }

  // DOM-style target (addEventListener/removeEventListener)
  add(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._undo.push(() => target.removeEventListener(type, fn, opts));
  }

  // Anything else (d3 .on(type, null), a restored filter...): fn is run once by clear()
  addCleanup(fn) {
    this._undo.push(fn);
  }

  get size() {
    return this._undo.length;
  }

  clear() {
    const undo = this._undo;
    this._undo = [];
    for (let i = undo.length - 1; i >= 0; i--) undo[i]();
  }
}
