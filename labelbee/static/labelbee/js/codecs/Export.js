/*
 * Export: the annotations of the page state as a representation ready to be packaged, for a file (SaveToFile.js) or for the
 * server (`eventsToServer`, now annotation/ServerIO.js) (refactor slice 8 step 6a, ADR 0015). No DOM, no network.
 *
 * Naming rule: `convertX(args)` of AnnotationCodec.js is pure, it converts what it is given; `exportX(...)` here picks its
 * input from the state (the store, `getVideoInfo()`) and calls the codec. The GUI functions only package the result.
 *
 * One function per kind of result: the JSON formats return an object (the packagers stringify it), the text formats a
 * string. An unknown format or version throws.
 */
import * as codec from './AnnotationCodec.js';
import { AnnotationStore } from '../annotation/AnnotationStore.js';
import { getVideoInfo } from '../video/VideoInfo.js';

const events = AnnotationStore.events;

// format: "v1" (Tracks only) or "v2" (info, with the video info, and data)
export function exportTracks(format) {
  switch (format) {
    case "v1":
      return codec.convertTracksToV1(events.toObject());
    case "v2":
      return codec.convertTracksToV2(events.toObject(), events.info, getVideoInfo());
    default:
      throw new Error("exportTracks: unknown format '" + format + "', expected 'v1' or 'v2'");
  }
}

// CSV text: one line per observation
export function exportTracksCSV() {
  return codec.tracksToCSV(events.toObject());
}

// CSV text, simple format: frame, left, top, right, bottom, pollen
export function exportBBoxes() {
  return codec.tracksToBBoxes2(events.toObject());
}

// version: "v1" (the tags as stored) or "v2" (wrapped in info and data)
export function exportTags(version) {
  switch (version) {
    case "v1":
      return AnnotationStore.getTags();
    case "v2":
      return {
        info: {
          type: "tags-multiframe",
          "data-format": "root.data[frame].tags[id_in_frame]",
          //"source": "Exported from labelbee on "+Date()
        },
        data: AnnotationStore.getTags(),
      };
    default:
      throw new Error("exportTags: unknown version '" + version + "', expected 'v1' or 'v2'");
  }
}
