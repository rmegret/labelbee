/*
 * AnnotationStore: owner of the in-memory annotation data (refactor slice 3, ADR 0005, SEAM-701).
 * Holds only the data structures: the Tracks and their info, the Tags and their info, and the flag
 * telling whether the loaded Tags carry the DM field (derived by `replaceTags`). No decoding, no I/O, no DOM, no refresh, no
 * derived data. The getters return the stored object itself, not a copy: the page code edits
 * `Tracks[frame][id]` in place and must keep seeing the same object.
 * The stored events and their info live in `events` (annotation/Events.js, refactor slice 4, ADR 0007) and are read
 * and written through it; the store only replaces them (`replaceTracks`, used by the loaders), and keeps where they come from
 * (`getBasedOn`, step 14g). The page reaches the
 * store through `window.AnnotationStore` (AnnotationStoreBridge.js).
 */
import { Events } from './Events.js';

/* Whether the Tags carry the DM field, looking at the first tag of the first frame (rule moved from setTags, DEBT-715 kept). */
function detectDM(tags) {
  const frame = tags ? tags[Object.keys(tags)[0]] : undefined;
  const tag0 = frame && Array.isArray(frame.tags) ? frame.tags[0] : undefined;
  return Object(tag0) === tag0 && "dm" in tag0;
}

export function createAnnotationStore() {
  const events = new Events();
  let tags = [];
  let tagsInfo;
  let tagsHaveDM = false;
  let basedOn;

  return {
    events,
    getTags: () => tags,
    getTagsInfo: () => tagsInfo,
    getTagsHaveDM: () => tagsHaveDM,
    /** Where the events were loaded from: undefined, or {source: "server-db"|"server-file"|"local-file", id, retrievedOn} (ADR 0016). */
    getBasedOn: () => basedOn,

    /** Replaces the Tracks and their info together (no validation: decoding is the codec's job). `fromSource`: the new
     * `getBasedOn()`; every replace sets it, to undefined when not given. */
    replaceTracks(data, info, fromSource) {
      events.replace(data, info);
      basedOn = fromSource;
    },
    /** Replaces the Tags and their info together (no validation: decoding is the codec's job) and derives `tagsHaveDM`. */
    replaceTags(data, info) {
      tags = data;
      tagsInfo = info;
      tagsHaveDM = detectDM(data);
    },
  };
}

/** The page's single store. */
export const AnnotationStore = createAnnotationStore();
