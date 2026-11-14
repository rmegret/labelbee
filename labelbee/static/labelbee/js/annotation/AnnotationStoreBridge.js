/*
 * Bridge between the classic scripts and the ES module AnnotationStore.js (refactor slice 3, ADR 0005).
 * Exposes the store as `window.AnnotationStore` and its `events` as `window.events`. The legacy globals `Tracks`,
 * `TracksInfo`, `Tags`, `TagsInfo`, `tagsHaveDM` are gone (slice 4 step 5, Q26): page code reads the stored events
 * through `events` and the tags through `AnnotationStore.getTags()`, `getTagsInfo()`, `getTagsHaveDM()`. The console can
 * still get the five as read-only debug views, see DebugGlobals.js.
 * Installed by a deferred module, before window.onload calls init(); nothing reads the store while the page parses.
 * (The name `installLegacyGlobals` is kept for the tests that import it; it installs the page's globals.)
 */
import { AnnotationStore } from './AnnotationStore.js';
import { installDebugGlobals } from './DebugGlobals.js';

/** Defines the page's globals on `target` (the page's window): `AnnotationStore`, `events`, `installDebugGlobals`. */
export function installLegacyGlobals(target, store) {
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
