/*
 * Decode: the details of the formats of the sources that are not plain JSON: which converter reads a CSV schema, with which
 * `centerPolicy`, which info header the loaded data gets (refactor slice 8 step 14f, ADR 0016). Split from Load.js (now commands/Load.js,
 * which applies the result to the store). Mirror of Export.js. Pure: it returns the converted data, it writes no store, refreshes
 * nothing and shows no message; a schema it does not know or a conversion that fails throws.
 *
 * DEBT: `decodeDBEvents` is given the sql.js database by its caller (the page global `db`).
 */
import * as codec from './AnnotationCodec.js';

const {
  db_to_json, tracks_csv_to_json, tags_csv_to_json, tags_csv_to_tagjson,
  tracks_tagged_csv_to_json, events_csv_to_json, detections_csv_to_json,
} = codec;

/* From the rows of a CSV of one of the schemas of codecs/CsvSchemas.js (the `loader` field of a schema: tracks, tags,
 * tracks_tagged, events, detections); `url` only names the source in the info of the converted data. The CSV and database sources
 * trust cx, cy over x, y (ADR 0008 R7), except the detections.
 * Returns {events: {obj, centerPolicy}, tags}: `tags` (the tags data) only for the schema "tags", one CSV building both.
 * Throws if the schema is unknown or the data is invalid. */
export function decodeCSVRows(rows, schema, url) {
  const info = (type) => ({
    type: type,
    source: `Converted from CSV "${url}"`,
    history: `Loaded in Labelbee on ${new Date().toISOString()}`,
  });

  if (schema == "tags") {
    let obj = tags_csv_to_json(rows, info("events-multiframe"));
    let objtag = tags_csv_to_tagjson(rows, info("tags-multiframe"));
    return { events: { obj: obj, centerPolicy: "cxcy" }, tags: objtag };
  }

  const converters = {
    tracks: [tracks_csv_to_json, "cxcy"],
    tracks_tagged: [tracks_tagged_csv_to_json, "cxcy"],
    events: [events_csv_to_json, "cxcy"],
    detections: [detections_csv_to_json, "xy"],
  };
  if (!converters[schema]) throw new Error("Unknown CSV schema: " + schema);
  const [convert, centerPolicy] = converters[schema];

  return { events: { obj: convert(rows, info("events-multiframe")), centerPolicy: centerPolicy } };
}

// From the sql.js database `db` (up to `limit` rows): the events, to load with centerPolicy "cxcy"
export function decodeDBEvents(db, limit) {
  let info = {
    type: "events-multiframe",
    source: `Imported form DB`,
    history: `Loaded in Labelbee on ${new Date().toISOString()}`,
  }
  return db_to_json(db, info, limit);
}
