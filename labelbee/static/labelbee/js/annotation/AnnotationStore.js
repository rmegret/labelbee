/*
 * AnnotationStore: owner of the in-memory annotation data (refactor slice 3, ADR 0005, SEAM-701).
 * Holds only the data structures: the Tracks and their info, the Tags and their info, and the flag
 * telling whether the loaded Tags carry the DM field. No decoding, no I/O, no DOM, no refresh, no
 * derived data. The getters return the stored object itself, not a copy: the page code edits
 * `Tracks[frame][id]` in place and must keep seeing the same object.
 * Legacy code reaches it through the globals defined by AnnotationStoreBridge.js.
 * The Tracks and their info live in `events` (annotation/Events.js, refactor slice 4, ADR 0007):
 * `getTracks()` returns its live structure, the temporary dirty path of Q29.
 */
import { Events } from './Events.js';

// Same test as jQuery.isEmptyObject (no enumerable property, inherited ones included; true for undefined).
function isEmptyObject(obj) {
  for (const key in obj) return false; // eslint-disable-line no-unused-vars
  return true;
}

export function createAnnotationStore() {
  const events = new Events();
  let tags = [];
  let tagsInfo;
  let tagsHaveDM = false;

  return {
    events,
    getTracks: () => events.tracks,
    getTracksInfo: () => events.info,
    getTags: () => tags,
    getTagsInfo: () => tagsInfo,
    getTagsHaveDM: () => tagsHaveDM,

    /** Replaces the Tracks and their info together (no validation: decoding is the codec's job). */
    replaceTracks(data, info) {
      events.replace(data, info);
    },
    /** Replaces the Tags and their info together. Does not touch tagsHaveDM. */
    replaceTags(data, info) {
      tags = data;
      tagsInfo = info;
    },
    setTagsHaveDM(value) {
      tagsHaveDM = value;
    },
    /** Decides whether the loaded Tags carry the DM field, looking at the first tag of the first frame
     * (rule moved from setTags, DEBT-715 kept). Like the old code it resets the flag first, so a
     * malformed Tags that throws below leaves it false. */
    updateTagsHaveDM() {
      tagsHaveDM = false;
      if (!isEmptyObject(tags)) {
        const tags0 = tags[Object.keys(tags)[0]].tags;
        if (tags0.length > 0) {
          tagsHaveDM = "dm" in tags0[0];
        }
      }
    },
  };
}

/** The page's single store. */
export const AnnotationStore = createAnnotationStore();
