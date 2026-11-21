/*
 * Bridge between the classic scripts and the ES module AnnotationCodec.js (refactor slice 1,
 * ADR 0002; save side slice 2, ADR 0004). Exposes the legacy function names on window.
 * Entries are removed when their callers move to modules (the loaders and the save-to-file/server
 * functions of AnnotationIO.js).
 */
import * as codec from './AnnotationCodec.js';

for (const name of [
  'sanitizeEvents', 'tagsAddFrames', 'decodeTags', 'db_to_json', 'flatjson_to_json', 'resultToObjects',
  'tracks_csv_to_json', 'tags_csv_to_json', 'tags_csv_to_tagjson', 'tracks_tagged_csv_to_json', 'events_csv_to_json', 'detections_csv_to_json',
]) {
  window[name] = codec[name];
}

// The functions over the page state (exportTracks, ...) are in Export.js (slice 8 step 6a).
