/*
 * Refresh: the explicit calls that bring the views up to date after a change (refactor slice 6, ADR 0009 section 0).
 * A controller or a writer calls the one that says what changed, where the change is requested; a view never calls it.
 * The steps are functions of the page, passed in by the bridge (this module does not know them). Order inside a call is fixed:
 * derived data, overlay, form, zoom.
 *   update()   soft: a field of an observation changed           = chrono, overlayUpdate, form, zoom
 *   rebuild()  hard: an observation appeared, went or changed id = chrono, overlayRebuild (includes the form), zoom
 * and the primitives chrono, overlayRebuild, overlayUpdate, form, zoom, frame, selection (the panels and the zoom that show
 * `selection`, ADR 0009 section 0b: it reads the model, it never writes it).
 * A call made while a refresh runs is an error and is dropped (no loop). `audit(events)` is a development check: it records
 * the store writes that no refresh call followed (`unrefreshed`), it never refreshes.
 */
import { timedRefresh, logError } from '../core/Notifier.js';

export class Refresh {
  #steps;
  #running = false;
  #count = 0; // number of refresh calls so far, to see if one followed a write
  #detach = null;
  unrefreshed = []; // the events heard by the audit with no refresh call before the end of the task

  /** @param {{chrono, overlayRebuild, overlayUpdate, form, zoom, frame, selection}} steps functions of the page */
  constructor(steps) {
    this.#steps = steps;
  }

  #run(name, fn) {
    if (this.#running) {
      logError(`refresh.${name}: called during a refresh, dropped (a view must not refresh, nor write the store)`);
      return;
    }
    this.#running = true;
    this.#count++;
    try {
      timedRefresh('refresh', `refresh.${name}`, fn);
    } finally {
      this.#running = false;
    }
  }

  chrono() { this.#run('chrono', () => this.#steps.chrono()); }
  overlayRebuild() { this.#run('overlayRebuild', () => this.#steps.overlayRebuild()); }
  overlayUpdate() { this.#run('overlayUpdate', () => this.#steps.overlayUpdate()); }
  form() { this.#run('form', () => this.#steps.form()); }
  zoom() { this.#run('zoom', () => this.#steps.zoom()); }
  frame() { this.#run('frame', () => this.#steps.frame()); }
  /** The selection changed (`selection` model already written): shows it in the panels and the zoom. Changes no model. */
  selection() { this.#run('selection', () => this.#steps.selection()); }

  update() {
    this.#run('update', () => {
      this.#steps.chrono();
      this.#steps.overlayUpdate();
      this.#steps.form();
      this.#steps.zoom();
    });
  }
  rebuild() {
    this.#run('rebuild', () => {
      this.#steps.chrono();
      this.#steps.overlayRebuild();
      this.#steps.zoom();
    });
  }

  /** Development check on `events` (subscribes once). */
  audit(events) {
    this.unaudit();
    this.#detach = events.subscribe((e) => {
      if (this.#running) {
        logError(`refresh: the store was written during a refresh (${e && e.op})`);
        this.unrefreshed.push({ ...e, during: true });
        return;
      }
      const seen = this.#count;
      queueMicrotask(() => {
        if (this.#count === seen) this.unrefreshed.push(e);
      });
    });
  }
  unaudit() {
    if (this.#detach) this.#detach();
    this.#detach = null;
  }
}
