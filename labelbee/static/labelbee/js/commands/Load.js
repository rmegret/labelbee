/*
 * Load: the commands that take a payload (events, tags, CSV rows) into the store: `loadTracks`, `loadTags`, the loads from a text,
 * from CSV rows and from the database, and the erases (refactor slice 8 steps 6b to 6d and 14f, ADR 0015, 0016). The details of the
 * formats (converters, `centerPolicy`, info headers) are in codecs/Decode.js and codecs/AnnotationCodec.js; this file validates through
 * them, replaces the store, refreshes and confirms. The transports that fetch the payload, LoadFromFile.js (a local file) and
 * ServerIO.js (AJAX), know the formats only by name, and show the errors (core/Alerts.js). A load that fails throws;
 * `loadTracks` and `loadTags` return a boolean for the callers that check it.
 * `loadTracks`, `loadTags`, `eraseEvents` and `eraseTags` are installed as globals by labelbeeBridge.js (labelBee.js, template buttons, tests).
 *
 * A load is: decode (the codec validates, nothing is written when it rejects), replace in the store, refresh.chrono(), refresh.frame().
 *
 * `eraseEvents` and `eraseTags` (the confirm dialogs of the template buttons) are here too: an erase is a load of nothing.
 *
 * DEBT: globals read at call time, set by the page and not yet modules: `db`, `adjustChronogramHeight`.
 */
import * as codec from '../codecs/AnnotationCodec.js';
import { decodeCSVRows, decodeDBEvents } from '../codecs/Decode.js';
import { AnnotationStore } from '../annotation/AnnotationStore.js';
import { logging } from '../core/Notifier.js';
import { refresh } from '../annotation/RefreshBridge.js';
import { updateEventsNotes } from '../form/EventsNotes.js';

const { sanitizeEvents, decodeTags, tagsAddFrames } = codec;

/* options.centerPolicy: which fields are the truth for the center when x, y and cx, cy disagree, "xy" (default,
 * the JSON formats) or "cxcy" (the CSV and database sources): the loader knows its source (ADR 0008 R7).
 * Takes ownership of `obj`: it is not copied, the store keeps it (and `sanitizeEvents` edits it), so pass freshly parsed data.
 * Returns false, with the events kept, when the format is rejected. */
export function loadTracks(obj, skipRefresh, options) {
  console.log("loadTracks: changing events data structure and refreshing...");

  var evts = sanitizeEvents(obj, options);

  if (!evts) {
    console.log("loadTracks: ABORTED, wrong format.");
    return false;
  }

  AnnotationStore.replaceTracks(evts.data, evts.info);

  updateEventsNotes();

  if (!skipRefresh) {
    refresh.chrono();
    refresh.frame();
  }
  return true;
}

/* Takes ownership of `obj`: it is not copied, the store keeps it (and `tagsAddFrames` writes `frame` into each tag), so pass
 * freshly parsed data.
 * Returns false, with the Tags kept, when the format is rejected (decodeTags: what it accepts is well-formed). */
export function loadTags(obj) {
  console.log("loadTags: changing Tags data structure and refreshing...");

  var decoded = decodeTags(obj);
  if (!decoded) return false;

  tagsAddFrames(decoded.data);
  AnnotationStore.replaceTags(decoded.data, decoded.info);

  refresh.chrono();
  adjustChronogramHeight();
  refresh.frame();
  return true;
}

// Buttons of the page: confirm, then replace by an empty set
export function eraseEvents() {
  var r = confirm(
    "Are you sure you want to ERASE all manual annotations (Tracks)?"
  );
  if (r == true) {
    console.log("ERASING all Tracks...");
    loadTracks([]);
  } else {
    console.log("User CANCELED Erase Tracks ...");
  }
}
export function eraseTags() {
  var r = confirm("Are you sure you want to ERASE all Tags?");
  if (r == true) {
    console.log("ERASING all Tags...");
    loadTags({});
  } else {
    console.log("User CANCELED Erase Tags ...");
  }
}

// From the JSON text of the events or of the tags; throws if the text or the format is invalid
export function loadTracksFromText(text) {
  if (logging.io) {
    console.log(text);
  }
  var obj = JSON.parse(text);
  if (logging.io) {
    console.log(obj);
  }

  if (!loadTracks(obj)) throw new Error("Invalid events format (details in the console)");
}
export function loadTagsFromText(text) {
  var obj = JSON.parse(text);
  //console.log(obj) // Caution: heavy

  if (!loadTags(obj)) throw new Error("Invalid tags format (details in the console)");

  console.log("loadTagsFromFile: importing from JSON file. DONE");
}

/* From the rows of a CSV of one of the schemas of codecs/CsvSchemas.js (see decodeCSVRows); `url` only names the source in the
 * info of the loaded data. Throws if the schema is unknown or the data is invalid. */
export function loadCSVFromRows(rows, schema, url) {
  const decoded = decodeCSVRows(rows, schema, url);

  // skipRefresh when there are tags: loadTags below refreshes once for the events and the tags
  if (!loadTracks(decoded.events.obj, !!decoded.tags, { centerPolicy: decoded.events.centerPolicy })) {
    throw new Error("Invalid events in the CSV (details in the console)");
  }
  if (decoded.tags && !loadTags(decoded.tags)) throw new Error("Invalid tags in the CSV (details in the console)");
}

export function loadTracksCSVFromDB(limit = 100) {
  const a=performance.now();
  let obj = decodeDBEvents(db, limit)
  const b=performance.now();
  console.log('DB query + convert to JSON',b-a)
  loadTracks(obj, false, { centerPolicy: "cxcy" })
  const c=performance.now();
  console.log('loadTracks (with its refresh)',c-b)
}
