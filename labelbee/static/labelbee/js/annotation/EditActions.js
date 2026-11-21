/*
 * EditActions: the store writes behind the selection and the editors, without DOM (refactor slice 8 step 4, ADR 0015).
 * Moved as is from SelectionControl.js (`deleteEvent`, `storeUnit`, `submitDraft`); no behavior change. They are
 * installed as globals by labelbeeBridge.js for the classic scripts that still call them (OverlayControl.js, ZoomView.js,
 * VisitControl.js, labelBee.js, SelectionControl.js).
 *
 * DEBT: `submitDraft` calls the classic global `printMessage` (labelBee.js) at call time; it becomes an import when
 * the status widget moves.
 */
import { AnnotationStore } from './AnnotationStore.js';
import { refresh } from './RefreshBridge.js';
import { selection } from './SelectionModelBridge.js';
import { deepcopy, getObsHandle, obsDoesExist } from './Model.js';

const events = AnnotationStore.events;

export function deleteEvent(frame, id) {
  if (!obsDoesExist(frame, id)) {
    console.log('deleteEvent: Event not found (frame,id)=', frame, id)
    return false
  }
  // Undo is deactivated until its own slice (ADR 0008 step 1): a delete is final, nothing is cloned or pushed.
  events.delete(frame, id); // also removes the frame when it ends up empty

  refresh.rebuild();
  return true
}

/**
 * A draft rectangle (the one drawn while ctrl-dragging, the only rectangle that is not in the store) becomes an
 * observation: stored with `events.commit`, and from then on the rectangle holds the stored object. Refuses an id
 * that already exists on the frame.
 */
export function submitDraft(rect) {
  let frame = rect.obs.frame;
  let id = rect.id;
  if (getObsHandle(frame, id, false) !== undefined) {
    console.log("submitDraft: trying to replace existing bee with new observation. ABORT");
    printMessage("Conflict of ID: bee " + id + " already exists in this frame.", "red");
    return false;
  }
  rect.obs.ID = id;
  rect.obs = events.commit(rect.obs);
  rect.draft = false;
  selection.select(frame, id); // no longer a draft: it has a key

  refresh.rebuild();
  return true;
}

/**
 * Stores the fields of one unit edited on the selected rectangle (ADR 0008 R3): the store gets only these fields,
 * with `events.update` (the rectangle holds the stored object). It does not refresh: the caller calls the `refresh.*`
 * that fits its field (ADR 0009 section 0). A draft rectangle (the ctrl-drag in progress) is not in the store: the fields
 * go to its own observation, and `submitNew` submits it (the newid box did; `submitDraft` refreshes). Returns whether
 * the store was written.
 */
export function storeUnit(rect, fields, submitNew) {
  let key = selection.getKey();
  if (!key) Object.assign(rect.obs, fields); // not in the store yet: the working copy is the only holder
  if (key) {
    let stored = Object.assign({}, fields);
    if (stored.fix) stored.fix = deepcopy(stored.fix); // the store never shares `fix` with the working copy
    events.update(key.frame, key.id, stored);
    return true;
  }
  if (submitNew && rect.draft) submitDraft(rect);
  return false;
}
