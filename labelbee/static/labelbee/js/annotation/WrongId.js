/*
 * WrongId: the wrong-id unit of an observation, `newid` and `fix` (refactor slice 5 step 5, ADR 0008 R1/R3).
 * It replaces the four writers that edited these fields each in its own way (the label toggle, the newid box,
 * the alternate tag click, the tag rotation). Pure: each function takes the observation and returns the fields
 * that change, `{newid, fix, labels}` or fewer; it writes nothing, and the caller stores them with `events.update`.
 * The `wrongid` token of `labels` is part of the edit, so it travels with it.
 * No behavior change: `fix` objects keep the exact shape each writer gave them (see test_j7, wrongid.test.js).
 */
import * as Labels from "./Labels.js";

const LABEL = "wrongid";

function copyFix(obs, initial) {
  return Object.assign({}, obs.fix || initial);
}

/** The label button `wrongid` was toggled: the label follows, and switching it on creates an empty `fix`. */
export function wrongidToggled(obs, on) {
  const fields = { labels: Labels.update(obs.labels, LABEL, on) };
  if (on && !obs.fix) fields.fix = { newid: undefined };
  return fields;
}

/** A new id was typed in the newid box (`newid` is undefined for an empty box). */
export function newidTyped(obs, newid) {
  const fields = { newid: newid };
  if (newid != null) {
    fields.fix = Object.assign(copyFix(obs, { newid: undefined }), { newid: newid });
    if (!Labels.has(obs, LABEL)) fields.labels = Labels.update(obs.labels, LABEL, true);
  }
  return fields;
}

/** An alternate tag was clicked: the same id as the observation cancels the fix, another one sets it. */
export function alternateTagChosen(obs, id) {
  if (obs.ID == id) {
    const fields = { newid: undefined, labels: Labels.update(obs.labels, LABEL, false) };
    if (obs.fix) {
      const fix = copyFix(obs);
      delete fix.newid;
      delete fix.tagangle;
      fields.fix = fix;
    }
    return fields;
  }
  return {
    labels: Labels.update(obs.labels, LABEL, true),
    newid: id,
    fix: Object.assign(copyFix(obs, { newid: undefined, tagangle: 0 }), { newid: id }),
  };
}

/** The tag was rotated by `angle` (90 or -90 degrees); the angle is kept in (-180, 180]. */
export function tagRotated(obs, angle) {
  const fix = copyFix(obs, { newid: undefined, tagangle: 0 });
  if (angle == 90 || angle == -90) fix.tagangle += angle; // DEBT-740: NaN when `fix` has no `tagangle` (made by the toggle)
  if (fix.tagangle > 180) fix.tagangle -= 360;
  if (fix.tagangle <= -180) fix.tagangle += 360;
  return { labels: Labels.update(obs.labels, LABEL, true), newid: undefined, fix: fix };
}
