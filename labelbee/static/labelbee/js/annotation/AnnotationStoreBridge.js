/*
 * Bridge between the classic scripts and the ES module AnnotationStore.js (refactor slice 3, ADR 0005).
 * Exposes the store as `window.AnnotationStore` (and its `events` as `window.events`) and keeps the legacy
 * globals `Tags`, `TagsInfo`, `tagsHaveDM` working as accessors on it, so every legacy read and assignment
 * reaches the store (`Tracks` and `TracksInfo` are not page globals any more, slice 4 step 5a; the console can still get
 * them as read-only debug views, see DebugGlobals.js). Replacement is progressive: when a file calls `AnnotationStore.getTracks()` etc.
 * instead of the global, and no file reads the global any more, its entry is removed from `LEGACY_GLOBALS`.
 * The accessors need `var Tracks` / `var Tags` gone from Model.js (a top-level `var` cannot become one).
 * Installed by a deferred module, before window.onload calls init(); nothing reads them while the page parses.
 */
import { AnnotationStore } from './AnnotationStore.js';
import { installDebugGlobals } from './DebugGlobals.js';

// name -> [getter, setter]; a legacy assignment of one half keeps the other half of the pair.
// `Tracks` and `TracksInfo` are gone (slice 4 step 5a): the stored events are `events` (annotation/Events.js).
const LEGACY_GLOBALS = {
  Tags: [(s) => s.getTags(), (s, v) => s.replaceTags(v, s.getTagsInfo())],
  TagsInfo: [(s) => s.getTagsInfo(), (s, v) => s.replaceTags(s.getTags(), v)],
  tagsHaveDM: [(s) => s.getTagsHaveDM(), (s, v) => s.setTagsHaveDM(v)],
};

/** Defines the legacy globals on `target` (the page's window) as accessors on `store`. */
export function installLegacyGlobals(target, store) {
  for (const [name, [get, set]] of Object.entries(LEGACY_GLOBALS)) {
    Object.defineProperty(target, name, {
      get: () => get(store),
      set: (value) => set(store, value),
      enumerable: true,
      configurable: true, // so a later step can delete the entry
    });
  }
  target.AnnotationStore = store;
  target.events = store.events; // the stored events (ADR 0007, Q27), like `overlay` or `videoControl`
  // New observations are built by the page's `Observation` (Model.js, a classic script); looked up at call time.
  store.events.setObservationFactory((id) => new target.Observation(id));
  // Optional console tool, off by default: window.installDebugGlobals() or the page URL query `?debug_globals`.
  target.installDebugGlobals = () => installDebugGlobals(target, store);
}

if (typeof window !== 'undefined') {
  installLegacyGlobals(window, AnnotationStore);
  if (/[?&]debug_globals\b/.test(window.location.search)) window.installDebugGlobals();
}
