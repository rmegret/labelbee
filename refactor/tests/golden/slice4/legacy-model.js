// Frozen copy of the legacy direct operations on `Tracks`, as they were in labelbee/static/labelbee/js/Model.js
// and the writers outside it at commit 07314c1e (before slice 4 step 2 turns the Model.js functions into
// wrappers over `events`). The differential tests (events.test.js) run the same operations on this and on
// annotation/Events.js and compare the results. Only changes: `Tracks` is `state.Tracks`, the console logs and
// `logging` are gone, `videoinfo.nframes` is `state.nframes`. Do not "improve" this file: it is the reference.
'use strict';

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
  this.angle = 0;

  this.bool_acts = [false, false, false, false];
  this.notes = '';
  this.labels = '';
}

function deepcopy(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

function copyObs(obs, tmpObs) {
  obs.ID = tmpObs.ID;
  obs.time = tmpObs.time;
  obs.frame = tmpObs.frame;

  obs.x = tmpObs.x;
  obs.y = tmpObs.y;
  obs.cx = tmpObs.cx;
  obs.cy = tmpObs.cy;
  obs.width = tmpObs.width;
  obs.height = tmpObs.height;
  if (tmpObs.bool_acts) {
    obs.bool_acts = [];
    obs.bool_acts[0] = tmpObs.bool_acts[0];
    obs.bool_acts[1] = tmpObs.bool_acts[1];
    obs.bool_acts[2] = tmpObs.bool_acts[2];
    obs.bool_acts[3] = tmpObs.bool_acts[3];
  } else {
    obs.bool_acts = [false, false, false, false];
  }
  obs.angle = tmpObs.angle;
  obs.notes = tmpObs.notes;
  obs.labels = tmpObs.labels;
  obs.parts = tmpObs.parts;
  obs.newid = tmpObs.newid;
  obs.fix = deepcopy(tmpObs.fix);
  if (tmpObs.visit) obs.visit = tmpObs.visit;
}

function getValidIDsForFrame(S, frame) {
  if (S.Tracks[frame] == null) {
    return [];
  }
  let trackf = S.Tracks[frame];
  let ids = [];
  for (let id in trackf) {
    if (trackf[id] != null) {
      ids.push(id);
    }
  }
  return ids;
}

function obsDoesExist(S, frame, id) {
  if (S.Tracks[frame] == null) {
    return false;
  }
  if (S.Tracks[frame][id] == null) {
    return false;
  }
  return true;
}

function getObsHandle(S, frame, id, createIfEmpty) {
  if (createIfEmpty == null) createIfEmpty = false;

  if (S.Tracks[frame] == null) {
    if (createIfEmpty) {
      S.Tracks[frame] = {};
    } else {
      return undefined;
    }
  }

  if (S.Tracks[frame][id] == null) {
    if (createIfEmpty) {
      S.Tracks[frame][id] = new Observation(id);
    } else {
      return undefined;
    }
  }
  return S.Tracks[frame][id];
}

function storeObs(S, tmpObs) {
  var obs = getObsHandle(S, tmpObs.frame, tmpObs.ID, true);
  copyObs(obs, tmpObs);
}

function changeObservationID(S, frame, old_id, new_id, force) {
  const Tracks = S.Tracks;
  if (old_id == new_id) {
    return false;
  }
  if (Tracks[frame] != null) {
    if (!force) {
      if (Tracks[frame][new_id] != null) {
        return false;
      }
    }
    if (Tracks[frame][old_id] != null) {
      let backup_new_id = Tracks[frame][new_id];
      Tracks[frame][new_id] = Tracks[frame][old_id];
      if (backup_new_id && force == 'swap') {
        Tracks[frame][old_id] = backup_new_id;
        Tracks[frame][old_id].ID = old_id;
      } else {
        delete Tracks[frame][old_id];
      }
      Tracks[frame][new_id].ID = new_id;
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function getFramesWithID(S, interval, id) {
  let fmin = interval[0];
  let fmax = interval[1];
  if (fmax == -1) {
    fmax = S.nframes - 1;
  }
  var frames = [];
  for (let f = fmin; f <= fmax; f++) {
    if (obsDoesExist(S, f, id)) {
      frames.push(f);
    }
  }
  return frames;
}

function obs_swapID(S, interval, old_id, new_id) {
  let fmin = interval[0];
  let fmax = interval[1];
  if (fmax == -1) {
    fmax = S.nframes - 1;
  }

  for (let f = fmin; f <= fmax; f++) {
    if (obsDoesExist(S, f, old_id)) {
      let exist = obsDoesExist(S, f, new_id);
      if (exist) {
        changeObservationID(S, f, new_id, 'SWAP_save_' + new_id);
      }
      changeObservationID(S, f, old_id, new_id);
      if (exist) {
        changeObservationID(S, f, 'SWAP_save_' + new_id, old_id);
      }
    }
  }
}

// ---- writers outside Model.js (SelectionControl.js deleteEvent, ZoomView.js deleteFalsealarmEvents, ChronoControl.js
// cleanObsoleteEvents): a plain `delete`; only the two ZoomView deletes then pruned the frame, and only if it ended up
// empty (they pruned every empty frame they met; `Events.delete` prunes after an actual deletion, ADR 0007 section 2).
function deleteObs(S, frame, id) {
  delete S.Tracks[frame][id];
}
function pruneIfEmpty(S, frame) {
  let empty = true;
  for (const k in S.Tracks[frame]) {
    empty = false;
    break;
  }
  if (empty) delete S.Tracks[frame];
}

function setEventsProp(S, option, value) {
  var info = S.TracksInfo;
  if (!info) {
    info = {};
    S.TracksInfo = info;
  }
  info[option] = value;
}

module.exports = {
  Observation,
  copyObs,
  getValidIDsForFrame,
  obsDoesExist,
  getObsHandle,
  storeObs,
  changeObservationID,
  getFramesWithID,
  obs_swapID,
  deleteObs,
  pruneIfEmpty,
  setEventsProp,
};
