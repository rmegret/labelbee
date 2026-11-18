/*
 * Bridge between the classic scripts and the ES module Refresh.js (refactor slice 6, ADR 0009 section 0): builds the page's
 * `window.refresh`. The steps are looked up at each call (they are classic globals, some wrapped by the refresh log).
 * The audit is attached from the start: `refresh.unrefreshed` lists the store writes with no refresh call after them.
 */
import { Refresh } from './Refresh.js';

window.refresh = new Refresh({
  chrono: () => refreshChronogram(),
  overlayRebuild: () => videoControl.refresh(),
  overlayUpdate: () => overlay.refreshOverlay(),
  form: () => updateForm(overlay.getActiveRect()),
  zoom: () => zoomOverlay.refreshZoom(),
  frame: () => videoControl.onFrameChanged(),
  selection: () => activateSelection(),
});
// AnnotationStoreBridge.js runs before this one and defines `window.events`
window.refresh.audit(window.events);
