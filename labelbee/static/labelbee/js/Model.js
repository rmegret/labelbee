/*jshint esversion: 6, asi: true */

// Tracks, Tags (and TracksInfo, TagsInfo, tagsHaveDM) are owned by AnnotationStore; the globals
// are accessors installed by annotation/AnnotationStoreBridge.js (refactor ADR 0005).

// ######################################################################
// MODEL: Tracks data structure

/** Basic Annotation class */
function Observation(ID) {
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

function cloneObs(obs) {
  let cloned = {};
  copyObs(cloned, obs);
  return cloned;
}

function deepcopy(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

function copyObs(obs, tmpObs) {
  // Shallow copy: internal handles such aslabels or parts point to same thing...
  obs.ID = tmpObs.ID;
  obs.time = tmpObs.time;
  obs.frame = tmpObs.frame;

  obs.x = tmpObs.x;
  obs.y = tmpObs.y;
  obs.cx = tmpObs.cx;
  obs.cy = tmpObs.cy;
  obs.width = tmpObs.width;
  obs.height = tmpObs.height;
  //obs.marked = tmpObs.marked;
  //obs.permanent = tmpObs.permanent;
  obs.angle = tmpObs.angle;
  obs.notes = tmpObs.notes;
  obs.labels = tmpObs.labels;
  obs.parts = tmpObs.parts;
  obs.newid = tmpObs.newid; // in case of wrongid
  obs.fix = deepcopy(tmpObs.fix);
  if (tmpObs.visit)
    obs.visit = tmpObs.visit
}
function hasParts(obs) {
  return !!obs.parts && obs.parts.length > 0;
}

// The functions below are wrappers over `events` (annotation/Events.js, refactor slice 4, ADR 0007): the stored
// events are read and written only through its operations. They keep their names and behavior until their callers
// move to `events` directly, then disappear.

function getValidIDsForFrame(frame) {
  return events.frameIds(frame);
}
function getValidIDsForFrames(interval) {
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

function obsDoesExist(frame, id) {
  return events.has(frame, id);
}

function getObsHandle(frame, id, createIfEmpty) {
  if (createIfEmpty == null) createIfEmpty = false;

  if (createIfEmpty) {
    return events.getOrCreate(frame, id);
  }
  return events.get(frame, id);
}

function storeObs(tmpObs) {
  var obs = events.commit(tmpObs);

  if (logging.submitEvents) console.log("Submitting obs = ", obs);
}

/**
 * 
 * @param {*} frame 
 * @param {*} old_id 
 * @param {*} new_id 
 * @param {(false|true|'swap')} force 
 * @returns true if change was performed
 */
function changeObservationID(frame, old_id, new_id, force) {
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
function getFramesWithID(interval, id) {
    return events.framesWithId(interval, id, interval[1]==-1 ? videoinfo.nframes : undefined)
}
function getFramesWithSwapID(interval, id, new_id) {
    let fmin = interval[0];
    let fmax = interval[1];
    if (fmax==-1) {
        fmax = videoinfo.nframes-1
    }
    
    var frames = []
    for (let f=fmin; f<=fmax; f++) {
        if (obsDoesExist(f, id) && obsDoesExist(f, new_id)) {
            frames.push(f)
        }
    }    
    return frames;
}
function obs_swapID(interval, old_id, new_id) {
    events.swap(interval, old_id, new_id, interval[1]==-1 ? videoinfo.nframes : undefined)
}


function printTracks() {
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

function cacheTags() {
  tagCache = [];
  for (let F in AnnotationStore.getTags()) {
    let tags = AnnotationStore.getTags()[F].tags;
    for (let i in tags) {
      let tag = tags[i];
      let id = String(tag.id);
      let key = F.toString() + "," + id;
      if (typeof ttags[key] === "undefined") tagCache[key] = [tag];
      else tagCache[key].push(tag);
    }
  }
}

/** Returns a list of tags matching frame and id. 
    Can be empty, have one element, or several */
function getTags(frame, id) {
  let key = frame.toString() + "," + id.toString();
  let value = tagCache[key];
  return value;
  //if (typeof value === "undefined") return undefined;
  //return value
}
