/*
 * Labels: pure helpers on the `labels` field of an observation (a comma separated string such as
 * "pollen,fanning") and on the four activities derived from it (refactor slice 5 step 2, ADR 0008).
 * Moved from SelectionControl.js (labelMap, toLabelArray, toLabelString, containsLabel, hasLabel,
 * updateObsLabel); no behavior change. Pure: no DOM, no jQuery, no window, nothing is written on an observation.
 *
 * `bool_acts(obs)` is the single definition of the `bool_acts` field ([fanning, pollen, entering, leaving]),
 * a value derived from `labels` (ADR 0008 R7, step 4 stops storing it).
 */

// Aliases accepted in a labels string, and the name they stand for.
export const LABEL_MAP = {
  f: "fanning",
  p: "pollen",
  e: "entering",
  d: "leaving",
  l: "leaving",
  pollen: "pollen",
  entering: "entering",
  leaving: "leaving",
  departing: "leaving",
  expulsion: "expulsion",
};

// The activities of bool_acts, in order.
export const ACTIVITIES = ["fanning", "pollen", "entering", "leaving"];

export function normalize(label) {
  return LABEL_MAP[label] == null ? label : LABEL_MAP[label];
}

/* "Pollen, f" -> ["pollen", "fanning"]: lower case, trimmed, no empty item, aliases resolved */
export function toArray(labels) {
  return labels
    .split(",")
    .map((d) => d.toLowerCase())
    .map((d) => d.trim())
    .filter((d) => d != "")
    .map(normalize);
}

export function toString(labelArray) {
  return labelArray
    .map((d) => d.toLowerCase())
    .map((d) => d.trim())
    .filter((d) => d != "")
    .map(normalize)
    .join(",");
}

export function clean(labels) {
  return toString(toArray(labels));
}

/* Does the labels string contain this label (or an alias of it)? A null string contains nothing. */
export function contains(labels, label) {
  if (labels == null) {
    return false;
  }
  return toArray(labels).indexOf(normalize(label)) >= 0;
}

/* Does the observation have this label? Reads obs.labels, writes nothing. */
export function has(obs, label) {
  return contains(obs.labels, label);
}

/* The four booleans [fanning, pollen, entering, leaving] of an observation, from its labels. */
export function bool_acts(obs) {
  return ACTIVITIES.map((a) => has(obs, a));
}

/* The labels string with `label` added (active) or removed (not active); returns a new string. */
export function update(labels, label, active) {
  const labelArray = toArray(labels == null ? "" : labels);
  const k = labelArray.indexOf(label);
  if (!active && k >= 0) {
    labelArray.splice(k, 1);
  }
  if (active && k < 0) {
    labelArray.push(label);
  }
  return toString(labelArray);
}
