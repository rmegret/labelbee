/*
 * Bridge between the classic scripts and the ES module Labels.js (refactor slice 5 step 2, ADR 0008):
 * exposes the legacy function names on window. Entries are removed when their callers move to modules.
 */
import * as Labels from './Labels.js';

window.Labels = Labels; // the namespace, for the classic scripts: Labels.bool_acts(obs), ...
window.toLabelArray = Labels.toArray;
window.toLabelString = Labels.toString;
window.cleanLabels = Labels.clean;
window.containsLabel = Labels.contains;
window.getLabels = (obs) => Labels.toArray(obs.labels);

// The legacy hasLabel wrote `labels = ""` on an observation that had none; it writes nothing now that the
// label editors write through `events.update` (ADR 0008 step 5). updateObsLabel is gone.
window.hasLabel = Labels.has;
