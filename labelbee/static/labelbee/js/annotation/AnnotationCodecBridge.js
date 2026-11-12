/*
 * Bridge between the classic scripts and the ES module AnnotationCodec.js (refactor slice 1,
 * ADR 0002). Connects the page global hasLabel (read at call time as the original code did)
 * and exposes the legacy function names on window.
 * Entries are removed when their callers move to modules (slice 2).
 */
import * as codec from './AnnotationCodec.js';

codec.configure({ hasLabel: (obs, label) => hasLabel(obs, label) });

for (const name of [
  'sanitizeEvents', 'tagsAddFrames', 'db_to_json', 'flatjson_to_json', 'resultToObjects',
  'tracks_csv_to_json', 'tags_csv_to_json', 'tags_csv_to_tagjson', 'tracks_tagged_csv_to_json',
]) {
  window[name] = codec[name];
}
