/*
 * Model: the `Observation` class and the legacy accessors over the stored events (refactor slice 8 step 3, ADR 0015).
 * Moved as is from Model.js, a classic script until then; no behavior change. The names are installed as globals by
 * labelbeeBridge.js for the classic scripts that still call them, and disappear with their last caller.
 *
 * The functions of the first block are wrappers over `events` (annotation/Events.js, refactor slice 4, ADR 0007): the
 * stored events are read and written only through its operations. They keep their names and behavior until their
 * callers move to `events` directly.
 *
 * DEBT: `getFramesWithID`, `getFramesWithSwapID`, `obs_swapID` read `getVideoInfo()` (video/VideoInfo.js), `getIdsInFocus` the globals `getCurrentFrame` (set by `init()`) and `getWindow` (ChronoControl.js),
 * at call time; they become imports when those owners move. `cacheTags` and `getTags(frame, id)` are dead
 * code: their only caller is `computeMotionDirection` (chrono/ChronoData.js), which nobody calls.
 */
import { AnnotationStore } from './AnnotationStore.js';
import { logging } from '../core/Notifier.js';
import { getVideoInfo } from '../video/VideoInfo.js';

const events = AnnotationStore.events;

// ######################################################################
// MODEL: Tracks data structure

/** Basic Annotation class */
export function Observation(ID) {
  this.ID = ID;
  this.time = 0;
  this.frame = 0;
  this.x = 0;
  this.y = 0;
  this.cx = 0;
  this.cy = 0;
  this.width = 0;
  this.height = 0;
  //this.marked = false;
  //this.permanent = false;
  this.angle = 0;

  this.notes = "";
  this.labels = "";
}

export function deepcopy(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

export function hasParts(obs) {
  return !!obs.parts && obs.parts.length > 0;
}

export function getValidIDsForFrame(frame) {
  return events.frameIds(frame);
}
export function getValidIDsForFrames(interval) {
  let fmin = interval[0];
  let fmax = interval[1];

  var ids = new Set();
  for (let f = fmin; f <= fmax; f++) {
    let fids = getValidIDsForFrame(f);
    for (let id of fids) {
      ids.add(id);
    }
  }
  return [...ids.values()];
}

export function obsDoesExist(frame, id) {
  return events.has(frame, id);
}

export function getObsHandle(frame, id, createIfEmpty) {
  if (createIfEmpty == null) createIfEmpty = false;

  if (createIfEmpty) {
    return events.getOrCreate(frame, id);
  }
  return events.get(frame, id);
}

/**
 *
 * @param {*} frame
 * @param {*} old_id
 * @param {*} new_id
 * @param {(false|true|'swap')} force
 * @returns true if change was performed
 */
export function changeObservationID(frame, old_id, new_id, force) {
  // REMI: modified to be be independent of View
  if (events.rename(frame, old_id, new_id, force)) {
    if (logging.submitEvents)
      console.log("changeObservationID: frame=", frame, "old_id=", old_id, " new_id=", new_id);
    return true;
  }
  // Not performed: say why, in the order the checks are made
  if (old_id == new_id) {
    console.log("changeObservationID: ABORT, old_id=", old_id, " same as new_id=", new_id);
  } else if (events.frameIds(frame).length == 0) {
    console.log("changeObservationID: Empty frame, frame=", frame);
  } else if (!force && events.has(frame, new_id)) {
    console.log("changeObservationID: ABORT, new_id=", new_id, " already exists");
  } else {
    console.log("changeObservationID: There's no bee id=", old_id, " on frame=", frame);
  }
  return false;
}
export function getFramesWithID(interval, id) {
    return events.framesWithId(interval, id, interval[1]==-1 ? getVideoInfo().nframes : undefined)
}
export function getFramesWithSwapID(interval, id, new_id) {
    let fmin = interval[0];
    let fmax = interval[1];
    if (fmax==-1) {
        fmax = getVideoInfo().nframes-1
    }

    var frames = []
    for (let f=fmin; f<=fmax; f++) {
        if (obsDoesExist(f, id) && obsDoesExist(f, new_id)) {
            frames.push(f)
        }
    }
    return frames;
}
export function obs_swapID(interval, old_id, new_id) {
    events.swap(interval, old_id, new_id, interval[1]==-1 ? getVideoInfo().nframes : undefined)
}


export function printTracks() {
  //Just for debugging
  console.log("This is Tracks:");
  events.forEach((obs, F, iid) => {
    console.log(
      "F =",
      F,
      ", iid =",
      iid,
      ", Tracks[F][idd] =",
      obs
    );
  });
}

// Model of Tags

// Was an implicit global (`tagCache = []` without declaration); only these two functions read it.
let tagCache = [];

export function cacheTags() {
  tagCache = [];
  for (let F in AnnotationStore.getTags()) {
    let tags = AnnotationStore.getTags()[F].tags;
    for (let i in tags) {
      let tag = tags[i];
      let id = String(tag.id);
      let key = F.toString() + "," + id;
      if (typeof tagCache[key] === "undefined") tagCache[key] = [tag];
      else tagCache[key].push(tag);
    }
  }
}

/** Returns a list of tags matching frame and id.
    Can be empty, have one element, or several */
export function getTags(frame, id) {
  let key = frame.toString() + "," + id.toString();
  let value = tagCache[key];
  return value;
  //if (typeof value === "undefined") return undefined;
  //return value
}

/** The ids of the tags in the frames of the tracking window around the current frame (strings). */
export function getIdsInFocus() {
  let F = getCurrentFrame();

  let win = getWindow();
  let fmin = win[0],
    fmax = win[1];
  let frange = F - fmin > fmax - F ? F - fmin : fmax - F;

  const ids = new Set();
  for (let f = fmin; f <= fmax; f++) {
    let tagsFrame = AnnotationStore.getTags()[f];
    if (typeof tagsFrame === "undefined") continue;
    let tags = tagsFrame.tags;

    for (let i in tags) {
      ids.add(String(tags[i].id));
    }
  }
  return [...ids];
}
