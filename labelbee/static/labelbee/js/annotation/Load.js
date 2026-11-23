/*
 * Load: what takes a payload (events, tags, CSV rows) into the store: `loadTracks`, `loadTags`, the loads from a text, from CSV
 * rows and from the database (refactor slice 8 steps 6b to 6d, ADR 0015). Mirror of Export.js: all the details of the formats
 * are here (converters, `centerPolicy`, info headers); the transports that fetch the payload, FileImport.js (a local file) and
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
import * as codec from './AnnotationCodec.js';
import { AnnotationStore } from './AnnotationStore.js';
import { logging } from '../core/Notifier.js';
import { refresh } from './RefreshBridge.js';
import { updateEventsNotes } from '../form/EventsNotes.js';

const {
  sanitizeEvents, decodeTags, tagsAddFrames, db_to_json, tracks_csv_to_json, tags_csv_to_json, tags_csv_to_tagjson,
  tracks_tagged_csv_to_json, events_csv_to_json, detections_csv_to_json,
} = codec;

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

/* From the rows of a CSV of one of the schemas of annotation/CsvSchemas.js (the `loader` field of a schema: tracks, tags,
 * tracks_tagged, events, detections); `url` only names the source in the info of the loaded data. The CSV and database sources
 * trust cx, cy over x, y (ADR 0008 R7), except the detections. Throws if the schema is unknown or the data is invalid. */
export function loadCSVFromRows(rows, schema, url) {
  const info = (type) => ({
    type: type,
    source: `Converted from CSV "${url}"`,
    history: `Loaded in Labelbee on ${new Date().toISOString()}`,
  });

  if (schema == "tags") {
    // one CSV builds both: the events, then the tags
    let obj = tags_csv_to_json(rows, info("events-multiframe"));
    let objtag = tags_csv_to_tagjson(rows, info("tags-multiframe"));

    // skipRefresh in loadTracks: loadTags below refreshes once for the events and the tags
    if (!loadTracks(obj, true, { centerPolicy: "cxcy" })) throw new Error("Invalid events in the CSV (details in the console)");
    if (!loadTags(objtag)) throw new Error("Invalid tags in the CSV (details in the console)");
    return;
  }

  const converters = {
    tracks: [tracks_csv_to_json, "cxcy"],
    tracks_tagged: [tracks_tagged_csv_to_json, "cxcy"],
    events: [events_csv_to_json, "cxcy"],
    detections: [detections_csv_to_json, "xy"],
  };
  if (!converters[schema]) throw new Error("Unknown CSV schema: " + schema);
  const [convert, centerPolicy] = converters[schema];

  let obj = convert(rows, info("events-multiframe"));
  if (!loadTracks(obj, false, { centerPolicy: centerPolicy })) throw new Error("Invalid events in the CSV (details in the console)");
}

export function loadTracksCSVFromDB(limit = 100) {

    let info = {
        type: "events-multiframe",
        source: `Imported form DB`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }

  const a=performance.now();
  let obj = db_to_json(db, info, limit)
  const b=performance.now();
  console.log('DB query + convert to JSON',b-a)
  loadTracks(obj, false, { centerPolicy: "cxcy" })
  const c=performance.now();
  console.log('loadTracks (with its refresh)',c-b)
}
