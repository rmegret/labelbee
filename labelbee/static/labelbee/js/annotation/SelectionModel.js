/*
 * SelectionModel: what is selected (refactor slice 6, ADR 0009 section 0b). The one place that decides it; it has no view,
 * calls no `refresh.*` and emits nothing: the views ask it (`getKey`, `getId`), the controllers tell it (`select`,
 * `changeFrame`, `clear`).
 * It stores the id to follow and the frame it was chosen on. The key `{frame, id}` is derived from them and from the stored
 * events at each call, so it is idempotent and never stale after a delete or a rename. The rectangle (geometry, drag) stays
 * fabric's (ADR 0008 P3).
 */
export class SelectionModel {
  #events;
  #id = undefined; // the id to follow from frame to frame, kept when the frame has no observation of it
  #frame = undefined; // the frame the selection is on
  #draft = false; // the selected rectangle is a draft: not in the store, so it has no key

  /** @param {{has: (frame, id) => boolean}} events the store of observations, only read */
  constructor(events) {
    this.#events = events;
  }

  /** The id to follow, `undefined` when none (explicit deselect). */
  getId() {
    return this.#id;
  }

  /** `{frame, id}` of the selected observation of the store, or `null` (no id, a draft, or no observation of the id there). */
  getKey() {
    if (this.#id === undefined || this.#id === null || this.#draft) return null;
    if (this.#frame === undefined || !this.#events.has(this.#frame, this.#id)) return null;
    return { frame: this.#frame, id: this.#id };
  }

  /** A choice: the id is kept even when the frame has no observation of it (the key is then null). */
  select(frame, id, draft = false) {
    this.#frame = frame;
    this.#id = id;
    this.#draft = draft;
  }

  /** The video moved to `frame`: same id, so the key is the observation of that id there, or null with the id kept. */
  changeFrame(frame) {
    this.#frame = frame;
    this.#draft = false;
  }

  /** Explicit deselect: forgets the id. */
  clear() {
    this.#id = undefined;
    this.#draft = false;
  }
}
