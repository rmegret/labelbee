/*
 * AnnotationStore: owner of the in-memory annotation data (refactor slice 3, ADR 0005, SEAM-701).
 * Holds only the data structures: the Tracks and their info, the Tags and their info, and the flag
 * telling whether the loaded Tags carry the DM field. No decoding, no I/O, no DOM, no refresh, no
 * derived data. The getters return the stored object itself, not a copy: the page code edits
 * `Tracks[frame][id]` in place and must keep seeing the same object.
 * Legacy code reaches it through the globals defined by AnnotationStoreBridge.js.
 */

export function createAnnotationStore() {
  let tracks = [];
  let tracksInfo;
  let tags = [];
  let tagsInfo;
  let tagsHaveDM = false;

  return {
    getTracks: () => tracks,
    getTracksInfo: () => tracksInfo,
    getTags: () => tags,
    getTagsInfo: () => tagsInfo,
    getTagsHaveDM: () => tagsHaveDM,

    /** Replaces the Tracks and their info together (no validation: decoding is the codec's job). */
    replaceTracks(data, info) {
      tracks = data;
      tracksInfo = info;
    },
    /** Replaces the Tags and their info together. Does not touch tagsHaveDM. */
    replaceTags(data, info) {
      tags = data;
      tagsInfo = info;
    },
    setTagsHaveDM(value) {
      tagsHaveDM = value;
    },
  };
}

/** The page's single store. */
export const AnnotationStore = createAnnotationStore();
