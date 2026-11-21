/*
 * Load: what takes a payload (events, tags, CSV rows) into the store: `setTracks`, `setTags`, the loads from a text, from CSV
 * rows and from the database (refactor slice 8 steps 6b and 6c, ADR 0015). Mirror of Export.js: all the details of the formats
 * are here (converters, `centerPolicy`, info headers); the transports that fetch the payload, FileImport.js (a local file) and
 * ServerIO.js (AJAX), know the formats only by name, and show the errors (core/Alerts.js). A load that fails throws; `setTracks`
 * and `setTags` return a boolean for the callers that check it.
 * `setTracks` and `setTags` are installed as globals by labelbeeBridge.js (labelBee.js, AnnotationIO.js, tests).
 *
 * Strict mode: the implicit global `tags` of the old `tagsFromServer` is now a declared constant in ServerIO.js.
 *
 * DEBT: globals read at call time, set by the page and not yet modules: `db`, `videoControl`, `refreshChronogram`,
 * `adjustChronogramHeight`, `getTTags`, `updateEventsNotes` (a form update that stays in AnnotationIO.js:
 * core/RefreshInstrumentBridge.js instruments it by its global name, so `setTracks` must call the global), and `ttags`, a
 * global `var` of ChronoControl.js that `setTags` reads and assigns.
 */
import * as codec from './AnnotationCodec.js';
import { AnnotationStore } from './AnnotationStore.js';
import { logging } from '../core/Notifier.js';

const {
  sanitizeEvents, decodeTags, tagsAddFrames, db_to_json, tracks_csv_to_json, tags_csv_to_json, tags_csv_to_tagjson,
  tracks_tagged_csv_to_json, events_csv_to_json, detections_csv_to_json,
} = codec;

/* options.centerPolicy: which fields are the truth for the center when x, y and cx, cy disagree, "xy" (default,
 * the JSON formats) or "cxcy" (the CSV and database sources): the loader knows its source (ADR 0008 R7). */
export function setTracks(obj, skipRefresh, options) {
  console.log("setTracks: changing events data structure and refreshing...");

  var evts = sanitizeEvents(obj, options);

  if (!evts) {
    console.log("setTracks: ABORTED, wrong format.");
    return false;
  }

  AnnotationStore.replaceTracks(evts.data, evts.info);

  updateEventsNotes();

  if (!skipRefresh) {
    videoControl.onFrameChanged();
    refreshChronogram();
  }
  return true;
}

export function setTags(obj, div) {
  console.log("setTags: changing Tags data structure and refreshing...");

  // Decode and validate (pure, in the codec)
  var decoded = decodeTags(obj);
  if (!decoded) return 0;

  // Apply as a whole: if one step throws on a malformed file, the previous Tags are put back (DEBT-733)
  var previous = {
    data: AnnotationStore.getTags(),
    info: AnnotationStore.getTagsInfo(),
    haveDM: AnnotationStore.getTagsHaveDM(),
    ttags: ttags,
  };
  try {
    AnnotationStore.replaceTags(decoded.data, decoded.info);

    tagsAddFrames(AnnotationStore.getTags());

    ttags = getTTags();

    // Check if Tags data structure support the DM field
    AnnotationStore.updateTagsHaveDM();
  } catch (error) {
    console.error(error);
    AnnotationStore.replaceTags(previous.data, previous.info);
    AnnotationStore.setTagsHaveDM(previous.haveDM);
    ttags = previous.ttags;
    console.log("setTags: ABORTED, malformed tag data. The previous Tags are kept.");
    return 0;
  }
  // Disable DM field if not there
  $(".requireDM").prop("disabled", !AnnotationStore.getTagsHaveDM());
  $(".requireDM").toggleClass("disabled", !AnnotationStore.getTagsHaveDM());

  console.log(
    "setTags: done. Sending signals to refresh chronogram and video..."
  );

  refreshChronogram();
  adjustChronogramHeight();
  videoControl.onFrameChanged();
  return 1;
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

  if (!setTracks(obj)) throw new Error("Invalid events format (details in the console)");
}
export function loadTagsFromText(text) {
  var obj = JSON.parse(text);
  //console.log(obj) // Caution: heavy

  if (!setTags(obj)) throw new Error("Invalid tags format (details in the console)");

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

    // no skipRefresh in setTracks: setTags below refreshes once for the events and the tags
    if (!setTracks(obj, true, { centerPolicy: "cxcy" })) throw new Error("Invalid events in the CSV (details in the console)");
    if (!setTags(objtag)) throw new Error("Invalid tags in the CSV (details in the console)");
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
  if (!setTracks(obj, false, { centerPolicy: centerPolicy })) throw new Error("Invalid events in the CSV (details in the console)");
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
  setTracks(obj, false, { centerPolicy: "cxcy" })
  const c=performance.now();
  console.log('setTracks (with its refresh)',c-b)
}
