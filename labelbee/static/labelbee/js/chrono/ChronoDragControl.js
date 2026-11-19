// ChronoDragControl namespace (ADR 0011): what a drag on the chronogram does, as pluggable modes.
//   DragControl  owns the current mode of a target; exactly one mode is attached
//   Mode         base class: attach(target)/detach(), listeners go through this.bag
//   IgnoreMode   a drag does nothing (a click still seeks, handled elsewhere)
// Used as ChronoDragControl.DragControl, ChronoDragControl.IgnoreMode...; instances of the modes are
// reached as drag.modes.ignore, drag.modes.pan, drag.modes.preview.
export { ListenerBag } from "./ListenerBag.js";
import { ListenerBag } from "./ListenerBag.js";

export class Mode {
  constructor(name, label) {
    this.name = name;
    this.label = label;
    this.target = null;
    this.bag = new ListenerBag();
  }

  get attached() {
    return this.target !== null;
  }

  attach(target) {
    if (this.attached) return; // idempotent
    this.target = target;
    this._attach(target);
  }

  detach() {
    if (!this.attached) return;
    try {
      this._detach();
    } finally {
      this.bag.clear();
      this.target = null;
    }
  }

  _attach(target) {}
  _detach() {}
}

export class IgnoreMode extends Mode {
  constructor() {
    super("ignore", "Ignore");
  }
}

export class DragControl {
  // modes: array of Mode, exposed by name in this.modes; initial: name, default the first
  constructor(target, modes, { initial } = {}) {
    this.target = target;
    this.modes = {};
    for (const m of modes) this.modes[m.name] = m;
    this.current = null;
    this._listeners = [];
    this.setMode(initial !== undefined ? initial : modes[0].name);
  }

  get mode() {
    return this.current ? this.current.name : null;
  }

  // The old mode is detached before the new one is attached
  setMode(name) {
    const next = this.modes[name];
    if (!next) throw new Error("DragControl: unknown mode '" + name + "'");
    if (next === this.current) return;
    const previous = this.mode;
    if (this.current) this.current.detach();
    this.current = next;
    next.attach(this.target);
    for (const fn of this._listeners.slice()) fn(next.name, previous);
  }

  // fn(newName, previousName); returns the unsubscribe function
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((f) => f !== fn);
    };
  }

  destroy() {
    if (this.current) this.current.detach();
    this.current = null;
    this._listeners = [];
  }
}
