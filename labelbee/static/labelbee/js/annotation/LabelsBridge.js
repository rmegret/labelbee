/*
 * Bridge between the classic scripts and the ES module Labels.js (refactor slice 5 step 2, ADR 0008):
 * exposes the legacy function names on window. Entries are removed when their callers move to modules.
 */
import * as Labels from './Labels.js';

window.toLabelArray = Labels.toArray;
window.toLabelString = Labels.toString;
window.cleanLabels = Labels.clean;
window.containsLabel = Labels.contains;
window.getLabels = (obs) => Labels.toArray(obs.labels);

// The legacy hasLabel and updateObsLabel wrote `labels = ""` on an observation that had none; kept
// for now, they go with the editors that still use them (ADR 0008 step 5).
window.hasLabel = (obs, label) => {
  if (obs.labels == null) {
    obs.labels = "";
  }
  return Labels.has(obs, label);
};
window.updateObsLabel = (obs, label, active) => {
  if (obs.labels == null) {
    obs.labels = "";
  }
  obs.labels = Labels.update(obs.labels, label, active);
};
