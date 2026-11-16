/*
 * Events: the stored events, one observation per (frame, id), behind named operations (refactor slice 4,
 * ADR 0007, DEC-007, SEAM-701). Pure module: no DOM, no global, no logging. The structure is the one the
 * page always had: `frames[frame][id] = observation`, plain objects keyed by the string frame and id (a
 * number key is coerced), sparse, `null` entries tolerated, the empty start is an array `[]`.
 *
 * Operations and what they replace (ADR 0007 section 2):
 *   queries   has, get, getFrame, frameIds, frames, forEach, observations, framesWithId, info, toObject
 *   commands  replace, getOrCreate, commit, update, delete, rename, swap, setInfo
 * `delete` removes the frame too when the deletion leaves it empty (maintainer, 2026-11-13). `swap` is
 * `obs_swapID` of Model.js with its temporary key made internal. `commit` is `copyObs` of Model.js: the
 * 17-field copy, and since step 7a the other fields of the working copy are kept (they were dropped).
 *
 * The structure is private (`#frames`, slice 4 step 6): there is no `tracks` property and no store getter any more.
 * `toObject()` is the one door to the live structure, for the codec export (and the console debug view,
 * DebugGlobals.js); `get` and `getFrame` hand out live observations until read-only views exist (Q29). The
 * operations write to the private data directly, so the dirty-write detector, which wraps what `toObject`,
 * `get`, `getFrame` and the callbacks hand out, never sees them; the observer reports them instead.
 *
 * Observer: `setObserver(fn)`; `fn({ op, frame, id, ... })` is called after each command that changed
 * something (the detector uses it for "through the API"; change events are built on it later).
 */

import { logging } from "../core/Notifier.js";

// Same test as jQuery.isEmptyObject (no enumerable property, inherited ones included; true for undefined).
function isEmptyObject(obj) {
  for (const key in obj) return false; // eslint-disable-line no-unused-vars
  return true;
}

function deepcopy(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// The fields that `copyFields` copies one by one; any other field of a working copy (`span` of a new visit, ...) is copied as it is.
// `bool_acts` is listed so that it is not copied as an extra: it is derived from `labels` (Labels.bool_acts) and not stored (ADR 0008 step 4).
const COMMIT_FIELDS = new Set(['ID', 'time', 'frame', 'x', 'y', 'cx', 'cy', 'width', 'height', 'bool_acts', 'angle', 'notes',
  'labels', 'parts', 'newid', 'fix', 'visit']);

/** The 17-field copy of Model.js `copyObs`; shares `labels`, `parts`, `visit` by reference as it did. Since slice 4 step 7a the
 * other fields of the working copy are kept too (they used to be dropped: the `span` that `newVisit` gives a new visit). */
function copyFields(obs, tmp) {
  obs.ID = tmp.ID;
  obs.time = tmp.time;
  obs.frame = tmp.frame;

  obs.x = tmp.x;
  obs.y = tmp.y;
  obs.cx = tmp.cx;
  obs.cy = tmp.cy;
  obs.width = tmp.width;
  obs.height = tmp.height;
  obs.angle = tmp.angle;
  obs.notes = tmp.notes;
  obs.labels = tmp.labels;
  obs.parts = tmp.parts;
  obs.newid = tmp.newid; // in case of wrongid
  obs.fix = deepcopy(tmp.fix);
  if (tmp.visit) obs.visit = tmp.visit;
  for (const k of Object.keys(tmp)) if (!COMMIT_FIELDS.has(k) && tmp[k] !== undefined) obs[k] = tmp[k];
}

export class Events {
  #frames = [];
  #info;
  #observer = null;
  #createObservation;

  /** @param {{createObservation?: (id) => object}} [opts] builds a new observation (the page passes `Observation`) */
  constructor(opts = {}) {
    this.#createObservation = opts.createObservation || ((id) => ({ ID: id }));
  }

  setObserver(fn) {
    this.#observer = fn || null;
  }
  /** Replaces the builder of new observations (the page registers `new Observation(id)`, Model.js). */
  setObservationFactory(fn) {
    this.#createObservation = fn;
  }
  #emit(event) {
    if (this.#observer) this.#observer(event);
  }

  // ---- queries

  /** The info of the events (`type`, `notes`, `history`, ...), or undefined before the first load. */
  get info() {
    return this.#info;
  }
  /** The live structure, for the codec export and the console debug view (O(1)). The only door to it. */
  toObject() {
    return this.#frames;
  }

  /** Does the observation exist? (`obsDoesExist`: a null entry does not.) */
  has(frame, id) {
    return this.#get(frame, id) !== undefined;
  }
  /** The live observation, or undefined (`getObsHandle(frame, id)` without creation). */
  get(frame, id) {
    return this.#get(frame, id);
  }
  // The operations use this one, never the public `get`, which the dirty-write detector replaces.
  #get(frame, id) {
    const f = this.#frames[frame];
    if (f == null) return undefined;
    return f[id] == null ? undefined : f[id];
  }
  /** A new `{id: observation}` object of the non-null observations of a frame (empty for a missing frame). */
  getFrame(frame) {
    const out = {};
    const f = this.#frames[frame];
    if (f == null) return out;
    for (const id in f) if (f[id] != null) out[id] = f[id];
    return out;
  }
  /** The ids of the non-null observations of a frame (`getValidIDsForFrame`), as strings. */
  frameIds(frame) {
    const f = this.#frames[frame];
    if (f == null) return [];
    const ids = [];
    for (const id in f) if (f[id] != null) ids.push(id);
    return ids;
  }
  /** The keys of the frames that exist, null entries included, in `for...in` order. */
  frames() {
    const out = [];
    for (const f in this.#frames) out.push(f);
    return out;
  }
  /** Calls `fn(observation, frame, id)` for each non-null observation, in `for...in` order (frame, then id). */
  forEach(fn) {
    const frames = this.#frames;
    for (const F in frames) {
      const f = frames[F];
      for (const id in f) {
        const obs = f[id];
        if (obs != null) fn(obs, F, id);
      }
    }
  }
  /** Generator of `[observation, frame, id]`, same order as `forEach`; for the loops that `continue`. */
  *observations() {
    const frames = this.#frames;
    for (const F in frames) {
      const f = frames[F];
      for (const id in f) {
        const obs = f[id];
        if (obs != null) yield [obs, F, id];
      }
    }
  }
  /** The numeric frames of the interval `[fmin, fmax]` that hold id (`getFramesWithID`); fmax -1 means `nframes - 1`. */
  framesWithId(interval, id, nframes) {
    const fmin = interval[0];
    let fmax = interval[1];
    if (fmax == -1) fmax = nframes - 1;
    const out = [];
    for (let f = fmin; f <= fmax; f++) if (this.#get(f, id) !== undefined) out.push(f);
    return out;
  }

  // ---- commands

  /** Replaces the whole structure and its info together (`setTracks`): no validation, decoding is the codec's job. */
  replace(data, info) {
    if (logging.store)
      console.log(`Events.replace(data,info):`,data, info)
    this.#frames = data;
    this.#info = info;
    this.#emit({ op: 'replace' });
  }

  /** The observation of (frame, id), created empty when missing (`getObsHandle(frame, id, true)`). */
  getOrCreate(frame, id) {
    return this.#getOrCreate(frame, id);
  }
  #getOrCreate(frame, id) {
    let created = false;
    if (this.#frames[frame] == null) {
      this.#frames[frame] = {};
      created = true;
    }
    if (this.#frames[frame][id] == null) {
      this.#frames[frame][id] = this.#createObservation(id);
      created = true;
    }
    if (created) {
      if (logging.store)
        console.log(`Events.#getOrCreate(frame,id): created=true`,frame,id)
      this.#emit({ op: 'create', frame, id });
    }
    return this.#frames[frame][id];
  }

  /** Commits a working copy (`storeObs`): creates the observation when needed, then the 17-field copy. */
  commit(workingCopy) {
    if (logging.store)
      console.log(`Events.commit(workingCopy):`, workingCopy)
    const frame = workingCopy.frame;
    const id = workingCopy.ID;
    const obs = this.#getOrCreate(frame, id);
    copyFields(obs, workingCopy);
    this.#emit({ op: 'commit', frame, id });
    return obs;
  }

  /** `Object.assign` on the stored observation: sets the given fields, a value of undefined means "none".
   * Returns the observation, or undefined when it does not exist (nothing is created). */
  update(frame, id, fields) {
    if (logging.store)
      console.log(`Events.update(frame,id,fields):`, frame, id, fields)
    const obs = this.#get(frame, id);
    if (obs === undefined) return undefined;
    Object.assign(obs, fields);
    this.#emit({ op: 'update', frame, id, fields: Object.keys(fields) });
    return obs;
  }

  /** Basci check that obs is valid */
  checkValid(frame, id) {
    if (logging.store)
      console.log(`Events.checkValid(frame,id):`, frame, id)
    const obs = this.#get(frame, id);
    if (obs === undefined) return undefined;
    
    if (!logging.storeCheckValid) return;

    let cx = obs.x + obs.width/2;
    let cy = obs.y + obs.height/2;
    const TOL = 1e-3;
    if (Math.abs(cx-obs.cx) > TOL)
      console.log(`Events.checkValid(${frame},${id}): WARNING x+w/2 <> cx`,cx,obs.cx);
    if (Math.abs(cy-obs.cy) > TOL)
      console.log(`Events.checkValid(${frame},${id}): WARNING y+h/2 <> cy`,cy,obs.cy);
  }

  /** Deletes an observation; the frame goes too when the deletion leaves it empty. Returns whether the key existed. */
  delete(frame, id) {
    if (logging.store)
      console.log(`Events.delete(frame,id):`, frame, id)
    const f = this.#frames[frame];
    if (f == null || !(id in f)) return false;
    delete f[id];
    if (isEmptyObject(f)) delete this.#frames[frame];
    this.#emit({ op: 'delete', frame, id });
    return true;
  }

  /**
   * Changes the id of an observation in one frame (`changeObservationID`, quirks included).
   * @param {(false|true|'swap')} force  true: overwrite an existing new_id; 'swap': put it under old_id
   * @returns true if the change was performed
   */
  rename(frame, oldId, newId, force) {
    if (logging.store)
      console.log(`Events.rename(frame, oldId, newId, force):`, frame, oldId, newId, force)
    const done = this.#rename(frame, oldId, newId, force);
    if (done) this.#emit({ op: 'rename', frame, id: oldId, newId, force });
    return done;
  }
  #rename(frame, oldId, newId, force) {
    const frames = this.#frames;
    if (oldId == newId) return false;
    if (frames[frame] == null) return false;
    if (!force && frames[frame][newId] != null) return false;
    if (frames[frame][oldId] == null) return false;
    const backup = frames[frame][newId];
    frames[frame][newId] = frames[frame][oldId];
    if (backup && force == 'swap') {
      frames[frame][oldId] = backup;
      frames[frame][oldId].ID = oldId;
    } else {
      delete frames[frame][oldId];
    }
    frames[frame][newId].ID = newId;
    return true;
  }

  /** Swaps two ids over an interval (`obs_swapID`): where both exist their observations trade ids, where only
   * oldId exists it becomes newId. fmax -1 means `nframes - 1`. The temporary key is internal. */
  swap(interval, oldId, newId, nframes) {
    if (logging.store)
      console.log(`Events.swap(interval, oldId, newId, nframes):`, interval, oldId, newId, nframes)
    const fmin = interval[0];
    let fmax = interval[1];
    if (fmax == -1) fmax = nframes - 1;
    for (let f = fmin; f <= fmax; f++) {
      if (this.#get(f, oldId) !== undefined) {
        const exist = this.#get(f, newId) !== undefined;
        const tmp = 'SWAP_save_' + newId;
        if (exist) this.#rename(f, newId, tmp);
        this.#rename(f, oldId, newId);
        if (exist) this.#rename(f, tmp, oldId);
      }
    }
    this.#emit({ op: 'swap', interval: [fmin, fmax], id: oldId, newId });
  }

  /** `info[key] = value`; the info object is created when missing (`setEventsProp`). */
  setInfo(key, value) {
    if (!this.#info) this.#info = {};
    this.#info[key] = value;
    this.#emit({ op: 'setInfo', key });
  }
}
