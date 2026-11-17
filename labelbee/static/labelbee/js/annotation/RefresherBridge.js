/*
 * Bridge between the classic scripts and the ES module Refresher.js (refactor slice 6, ADR 0009 step 2): builds the page's
 * Refresher, `window.refresher`, with the sequence of today's `storeUnit` (the functions are looked up at each call, they
 * are classic globals). Not attached to `events` yet: the writers still refresh by hand, `refresher.attach(events)` comes with
 * the first migrated writer (ADR 0009 step 4).
 */
import { Refresher } from './Refresher.js';

window.refresher = new Refresher({
  derived: [() => updateChronoData()],
  views: [() => drawChrono(), () => renderObsTable(), () => videoControl.refresh(), () => updateForm(overlay.getActiveObject())],
});
