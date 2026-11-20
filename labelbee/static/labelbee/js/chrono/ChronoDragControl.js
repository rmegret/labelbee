// ChronoDragControl namespace (ADR 0011): what a drag on the chronogram does, as pluggable modes.
//   DragControl  owns the current mode of a target; exactly one mode is attached
//   Mode         base class: attach(target)/detach(), listeners go through this.bag
//   IgnoreMode   a drag does nothing (a click still seeks, handled elsewhere)
//   PanMode      a drag pans the view (d3.zoom)
//   PreviewMode  a drag previews the frame under the pointer
//   CtrlHover    Ctrl+hover previews the frame under the pointer, in every mode (owned by DragControl)
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

// Target interface used by the modes (ChronoAxes.dragTarget):
//   element            where listeners are added
//   setPan(bool)       does a one-pointer drag pan the view?
//   hit(event)         {frame, id} under the pointer, null outside the plot
//   emit(name, props)  "trackmove" / "trackend" preview events

export class IgnoreMode extends Mode {
  constructor() {
    super("ignore", "Ignore");
  }
  _attach(target) {
    target.setPan(false);
  }
}

// Click-drag (or one-finger drag) pans the view: the d3.zoom behavior of the chronogram
export class PanMode extends Mode {
  constructor() {
    super("pan", "Pan View");
  }
  _attach(target) {
    target.setPan(true);
  }
}

// Click-drag or touch-drag previews the frame under the pointer; releasing ends the preview.
// A second finger (pinch) ends the preview and is left to the zoom.
export class PreviewMode extends Mode {
  constructor() {
    super("preview", "Preview Frame");
    this.dragThreshold = 3; // px before a press becomes a drag (a plain click still seeks)
    this._reset();
  }

  _reset() {
    this.pointers = new Set();
    this.drag = null; // {id, x, y, moved}
    this.previewing = false; // a trackmove was sent without trackend yet
  }

  _attach(target) {
    const el = target.element;
    const doc = el.ownerDocument;
    this._reset();
    target.setPan(false);
    const bag = this.bag;
    bag.add(el, "pointerdown", (e) => this._down(e));
    bag.add(el, "pointermove", (e) => this._move(e));
    bag.add(el, "pointerup", (e) => this._up(e));
    bag.add(el, "pointercancel", (e) => this._up(e));
    bag.add(el, "pointerleave", () => {
      if (!this.drag) this._end();
    });
    if (doc.defaultView) bag.add(doc.defaultView, "blur", () => this._end());
    // Touch (Android): without touch-action none the browser takes the touch for a scroll or a long press
    // and sends pointercancel; touch-action only applies to the root <svg>, not to a <g>
    const box = el.ownerSVGElement || el;
    if (box.style) {
      this._touchBox = box;
      this._touchAction = box.style.touchAction;
      box.style.touchAction = "none";
    }
    bag.add(el, "contextmenu", (e) => {
      if (this.drag || e.pointerType === "touch") e.preventDefault(); // long press
    });
  }

  _detach() {
    this._end();
    if (this._touchBox) this._touchBox.style.touchAction = this._touchAction;
    this._touchBox = null;
    this._reset();
  }

  _preview(event) {
    const hit = this.target.hit(event);
    if (!hit) return; // outside the plot: keep the last previewed frame
    this.previewing = true;
    this.target.emit("trackmove", { frame: hit.frame, id: hit.id, mouseevent: event });
  }

  _end() {
    if (!this.previewing) return;
    this.previewing = false;
    this.target.emit("trackend");
  }

  _down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.pointers.add(e.pointerId);
    if (this.pointers.size > 1) {
      this.drag = null; // pinch: not ours
      this._end();
      return;
    }
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try {
      this.target.element.setPointerCapture(e.pointerId);
    } catch (err) {} // not an active pointer (synthetic event)
  }

  _move(e) {
    const d = this.drag;
    if (d) {
      if (e.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) >= this.dragThreshold) d.moved = true;
      if (d.moved) this._preview(e);
    }
  }

  _up(e) {
    this.pointers.delete(e.pointerId);
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    this._end();
    if (d.moved) this._swallowClick();
  }

  // The click that follows a drag must not seek: it is the end of the drag, not a click
  _swallowClick() {
    const el = this.target.element;
    const swallow = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    el.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => el.removeEventListener("click", swallow, true), 100);
  }
}

// Ctrl+hover previews the frame under the pointer, whatever the drag mode (ADR 0011 addendum). Not a Mode: DragControl
// attaches it once. A pointer with a button pressed (a drag) or a touch is left to the mode; Ctrl released, the pointer
// leaving the element or the window losing focus ends the preview.
export class CtrlHover {
  constructor() {
    this.target = null;
    this.bag = new ListenerBag();
    this.previewing = false; // a trackmove was sent without trackend yet
    this.last = null; // last pointermove inside the element
  }

  attach(target) {
    if (this.target) return; // idempotent
    this.target = target;
    const el = target.element;
    const doc = el.ownerDocument;
    const bag = this.bag;
    bag.add(el, "pointermove", (e) => {
      if (e.pointerType === "touch" || e.buttons) return;
      this.last = e;
      if (e.ctrlKey) this._preview(e);
      else this._end();
    });
    bag.add(el, "pointerleave", () => {
      this.last = null;
      this._end();
    });
    bag.add(doc, "keydown", (e) => {
      if (e.key === "Control" && this.last) this._preview(this.last);
    });
    bag.add(doc, "keyup", (e) => {
      if (e.key === "Control") this._end();
    });
    if (doc.defaultView) bag.add(doc.defaultView, "blur", () => this._end());
  }

  detach() {
    if (!this.target) return;
    this._end();
    this.bag.clear();
    this.target = null;
    this.last = null;
  }

  _preview(event) {
    const hit = this.target.hit(event);
    if (!hit) return; // outside the plot: keep the last previewed frame
    this.previewing = true;
    this.target.emit("trackmove", { frame: hit.frame, id: hit.id, mouseevent: event });
  }

  _end() {
    if (!this.previewing) return;
    this.previewing = false;
    this.target.emit("trackend");
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
    this.ctrlHover = new CtrlHover();
    this.ctrlHover.attach(target);
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
    this.ctrlHover.detach();
    if (this.current) this.current.detach();
    this.current = null;
    this._listeners = [];
  }
}
