/*
 * Refresh instrumentation (refactor slice 6, ADR 0009, step 0): wraps every function that redraws a view from the
 * state, the "entry points" of the refresh, so that `refreshLog` (core/Notifier.js) records each call, its nesting and
 * its duration. One list, no change in the classic scripts: it runs as a module, after them and before window.onload,
 * which is before any handler is bound by reference (`$(x).on(event, updateTimeMark)`). Behavior-preserving (same
 * arguments, `this` and result). Removed when the Refresher replaces the scattered calls (ADR 0009 step 7).
 */
import { timedRefresh } from "./Notifier.js";

// [phase, global function]
const GLOBALS = [
  ["chrono", "refreshChronogram"],
  ["derived", "updateChronoData"],
  ["chrono", "drawChrono"],
  ["chrono", "updateChrono"],
  ["table", "renderObsTable"],
  ["chrono", "updateTimeMark"],
  ["chrono", "updatePreviewTimeMark"],
  ["chrono", "updateTrackWindowSpan"],
  ["chrono", "updateChronoSelection"],
  ["chrono", "updateChronoXDomainFromVideo"],
  ["chrono", "updateTagIntervals"],
  ["form", "updateForm"],
  ["form", "updateEventTree"],
  ["form", "updateSelectID"],
  ["form", "updateFormButtons"],
  ["form", "updateDeleteButton"],
  ["form", "updateUndoButton"],
  ["form", "updateEventsNotes"],
];
// [phase, constructor, method]
const METHODS = [
  ["overlay", "VideoControl", "refresh"],
  ["frame", "VideoControl", "onFrameChanged"],
  ["overlay", "OverlayControl", "hardRefresh"],
  ["overlay", "OverlayControl", "refreshOverlay"],
  ["zoom", "ZoomOverlay", "refreshZoom"],
];

function wrap(phase, name, fn) {
  return function refreshWrapper(...args) {
    return timedRefresh(phase, name, () => fn.apply(this, args));
  };
}

const wrapped = [];
const missing = [];
for (const [phase, name] of GLOBALS) {
  if (typeof window[name] === "function") {
    window[name] = wrap(phase, name, window[name]);
    wrapped.push(name);
  } else missing.push(name);
}
for (const [phase, cls, method] of METHODS) {
  const proto = window[cls] && window[cls].prototype;
  if (proto && typeof proto[method] === "function") {
    proto[method] = wrap(phase, `${cls}.${method}`, proto[method]);
    wrapped.push(`${cls}.${method}`);
  } else missing.push(`${cls}.${method}`);
}
if (missing.length) console.warn("RefreshInstrumentBridge: not found, not logged:", missing);

window.refreshInstrumented = { wrapped, missing };
