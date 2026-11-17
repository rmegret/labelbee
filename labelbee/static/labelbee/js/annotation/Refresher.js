/*
 * Refresher: the one subscriber of `events` that refreshes the views, in a fixed order (refactor slice 6, ADR 0009 D1-D3).
 * A notification runs the `derived` steps (recompute the derived data), then the `views` steps (redraw), in the order given
 * to the constructor, whatever the order of registration. The steps are functions of the page, passed in by the bridge:
 * this module does not know them. A store write made by a step while it runs is an error, and its notification is dropped
 * (no loop): a view must not write the store.
 */
import { timedRefresh, logError } from '../core/Notifier.js';

export class Refresher {
  #derived;
  #views;
  #running = false;
  #detach = null;

  /** @param {{derived: Function[], views: Function[]}} steps each called with the event that caused the refresh */
  constructor({ derived = [], views = [] } = {}) {
    this.#derived = derived;
    this.#views = views;
  }

  /** The sequence for one notification; also what `attach` subscribes. */
  run(event) {
    if (this.#running) {
      logError(`Refresher: the store was written during a refresh (${event && event.op}), notification dropped`);
      return;
    }
    this.#running = true;
    try {
      timedRefresh('refresher', `Refresher ${event && event.op}`, () => {
        for (const step of this.#derived) step(event);
        for (const step of this.#views) step(event);
      });
    } finally {
      this.#running = false;
    }
  }

  /** Subscribes to `events` (once: attaching again first detaches). */
  attach(events) {
    this.detach();
    this.#detach = events.subscribe((e) => this.run(e));
  }
  detach() {
    if (this.#detach) this.#detach();
    this.#detach = null;
  }
  get attached() {
    return this.#detach !== null;
  }
}
