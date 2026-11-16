/*
 * AnnotationCodec, load side: pure conversion of file/server payloads into the Tracks/Tags
 * JSON structures. Moved verbatim from AnnotationIO.js (refactor slice 1, ADR 0002).
 * The save/export side is at the end of the file (slice 2, ADR 0004).
 *
 * Pure: no access to Tracks/Tags/DOM/network/window. Alerts and logs go through core/Notifier.js
 * (ADR 0003); the labels helpers are the pure module Labels.js (ADR 0008 step 2).
 */
import { alert, log, logError, logIO } from "../core/Notifier.js";
import * as Labels from "./Labels.js";

/* Geometry of an observation: two sets describe the same box, the top-left corner (x, y) and the center
 * (cx, cy), with width and height. They must agree: cx = x + width/2, cy = y + height/2 (the angle is around
 * the center, so it does not change this). The policy says which set is the TRUTH when they disagree; the other
 * set is recomputed (ADR 0008 R7):
 *   "xy"   x, y are the truth, cx, cy are recomputed. Default, for the JSON formats v1 and v2.
 *   "cxcy" cx, cy are the truth, x, y are recomputed. For the CSV formats, whose source is the center.
 * Long-term (DEBT-739): only cx, cy, width, height, angle are used inside LabelBee and x, y become a field
 * computed when saving, because the top-left corner is a poor reference for a rotated rectangle. Then "cxcy"
 * becomes the only policy and this function goes.
 * The files round cx, cy, x, y to 3 decimals, so differences below CENTER_TOLERANCE are not disagreements.
 * An observation that lacks one of the sets is left as it is. Returns true when the observation was fixed. */
const CENTER_TOLERANCE = 0.0015;

function fixCenter(evt, policy) {
  const num = (v) => typeof v === "number" && Number.isFinite(v);
  if (evt == null || typeof evt !== "object") return false;
  if (![evt.x, evt.y, evt.cx, evt.cy, evt.width, evt.height].every(num)) return false;
  const dx = evt.cx - (evt.x + evt.width / 2);
  const dy = evt.cy - (evt.y + evt.height / 2);
  if (Math.abs(dx) <= CENTER_TOLERANCE && Math.abs(dy) <= CENTER_TOLERANCE) return false;
  if (policy === "cxcy") {
    evt.x = evt.cx - evt.width / 2;
    evt.y = evt.cy - evt.height / 2;
  } else {
    evt.cx = evt.x + evt.width / 2;
    evt.cy = evt.y + evt.height / 2;
  }
  return true;
}

/* options.centerPolicy: "xy" (default) or "cxcy", which set of fields is the truth for the center, see fixCenter.
 * The loader passes it because it is the one that knows the source of the data. */
export function sanitizeEvents(obj, options) {
  const centerPolicy = (options && options.centerPolicy) || "xy";
  if (centerPolicy !== "xy" && centerPolicy !== "cxcy") {
    throw new Error('sanitizeEvents: options.centerPolicy should be "xy" or "cxcy", got ' + centerPolicy);
  }
  let nFixed = 0; // observations whose geometry sets disagreed
  var info;
  var data;
  try{
    // null and primitives would make `"info" in obj` throw (DEBT-710)
    if (obj === null || typeof obj != "object") {
      log(
        "sanitizeEvents: ABORTED, unsupported file format. Should be either array of frames, or object with frame ids as keys."
      );
      return;
    }
    if ("info" in obj) {
      // New events format v2 with metainfo
  
      // obj['info']
      info = obj["info"];
  
      if (info["type"] != "events-multiframe") {
        log(
          'sanitizeEvents: ABORTED, unsupported file format. info["type"]=' +
            info["type"]
        );
        return;
      }
  
      //         function monthid(monthname) {
      //             var map = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
      //                        Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}
      //             return map[monthname]
      //         }
      //
      //         if (info.history && info.history[0]
      //             && typeof info.history[0] == 'string') {
      //             for (var k in info.history) {
      //                 var s = info.history[k]
      //                 var filename = undefined
      //                 if (s.startsWith('Saved using labelbee on')) {
      //                     filename = videoinfo.videoName+'-'
      //                         +s.substring(37,39)+monthid(s.substring(28,31))
      //                         +s.substring(32,34)
      //                         +s.substring(40,42)+s.substring(43,45)
      //                         +s.substring(46,48)+'.json'
      //                 }
      //                 info.history[k] = {filename:filename,notes:info.history[k]}
      //             }
      //         }
  
      // obj['data'].tags[tag_id_in_frame]
      const data0 = obj["data"];
  
      // New format more complex (store each frame as array of evts,
      // instead of dict of evts: allow duplicate ids,
      // which current interface does not support)
      // for the moment, downgrade to simpler format
  
      let hasDuplicateEntries = false;
  
      data = {};
      for (let f in data0) {
        let frameItem0 = data0[f];
        if (frameItem0 == null) continue;
  
        let frameItem = {};
        data[String(f)] = frameItem;
  
        for (let i in frameItem0) {
          let evt0 = frameItem0[i];
          if (evt0 == null) continue;
  
          // Normalize id (json)  to String ID (Tracks)
          let evt = Object.assign({ ID: String(evt0.id) }, evt0);
          delete evt.id;
  
          if (evt.labels == null) evt.labels = ""; // what the legacy hasLabel wrote on the observation
          delete evt.bool_acts; // derived from labels (Labels.bool_acts), not stored (ADR 0008 step 4)
          if (fixCenter(evt, centerPolicy)) nFixed++;
  
          if (frameItem[String(evt0.id)] == null) {
            frameItem[String(evt0.id)] = evt;
          } else {
            log(
              "sanitizeEvents: WARNING duplicate entry: data[" +
                f +
                "][" +
                i +
                "] with id=" +
                evt0.id +
                " ignored."
            );
            hasDuplicateEntries = true;
          }
        }
      }
  
      if (hasDuplicateEntries) {
        alert(
          "WARNING: Events file was loaded, but it has duplicate entries. Current version of software deleted redundant events."
        );
      }
    } 
    else {
      // Old format v1: Tracks JSON directly stored in the json
      // obj is an array
      // obj[frame][bee_id]
  
      // Create dummy info header
      info = {
        type: "events-multiframe",
        source: "Converted from Tracks v1",
      };
  
      if (logIO())
        log("sanitizeEvents: Tracks JSON v1");
      if (Array.isArray(obj)) {
        if (logIO())
          log("sanitizeEvents: got an array, converting to object");
        data = obj.reduce(function (acc, cur, i) {
          acc[i] = cur;
          return acc;
        }, {});
        info.source = "Converted from Tracks v1 array";
      } else {
        if (logIO())
          log("sanitizeEvents: got an object, use directly");
        data = obj;
        info.source = "Converted from Tracks v1 object";
      }
      if (
        !Object.keys(data).every((v) => /^(0|[1-9]\d*)$/.test(v)) &&
        !Object.keys(data).every((v) => Number.isInteger(v))
      ) {
        log(
          "sanitizeEvents: ABORTED, unsupported file format. All keys should be positive integers (frame ids)."
        );
        return;
      }
      // v1: the observations of the file are used as they are, fixed in place
      for (let f in data) {
        for (let i in data[f]) {
          if (data[f][i] != null && typeof data[f][i] === "object") delete data[f][i].bool_acts; // derived, not stored
          if (fixCenter(data[f][i], centerPolicy)) nFixed++;
        }
      }
    }
  }
  catch(error){ // Case: loaded json from server does not match expected structure
    logError(error);
    return;
  }


  if (nFixed > 0) {
    log(
      "sanitizeEvents: WARNING " + nFixed + " observation(s) had x, y and cx, cy that disagree; " +
        (centerPolicy === "cxcy" ? "cx, cy are the truth, x, y recomputed" : "x, y are the truth, cx, cy recomputed")
    );
  }

  return { info: info, data: data };
}

/* Augment tag items with frame field */
export function tagsAddFrames(Tags) {
  for (let f in Tags) {
    let tagsFrame = Tags[f].tags;
    if (tagsFrame == null) continue;

    for (let i in tagsFrame) {
      let tag = tagsFrame[i];
      if (tag == null) continue;
      if (Object(tag) !== tag) continue; // primitives: the old sloppy code ignored the write (DEBT-737)

      tag.frame = Number(f);
    }
  }
}

/* Decode a Tags JSON (v1: dictionary of frames, v2: {info, data}) into {data, info}.
 * Returns null when the format is rejected (setTags returns 0 then).
 * Moved from setTags (refactor slice 3, ADR 0005). `info` is always the dummy one, the v2 info is
 * dropped (DEBT-715); a v2 file whose `data` is missing or not an object is rejected (DEBT-733).
 * The v1 key check validates `obj` (DEBT-713: it used to read the previously loaded Tags global). */
export function decodeTags(obj) {
  var info;
  try{
    // null and primitives would make `"info" in obj` throw (DEBT-710)
    if (obj === null || typeof obj != "object") {
      log(
        'setTags: ABORTED, unsupported file format. typeof(obj) is "' +
          (obj === null ? "null" : typeof obj) +
          '", should be "object"'
      );
      return null;
    }
    if ("info" in obj) {
      // New tag format v2 with metainfo

      // obj['info']
      info = obj["info"];

      if (info["type"] != "tags-multiframe") {
        log(
          'setTags: ABORTED, unsupported file format. info["type"]=' +
            info["type"]
        );
        return null;
      }

      // obj['data'].tags[tag_id_in_frame]
      obj = obj["data"];
      if (obj === null || typeof obj != "object") {
        log(
          'setTags: ABORTED, unsupported file format. "data" should be an object, found ' +
            (obj === null ? "null" : typeof obj)
        );
        return null;
      }
    }
    else {
      // Old format v1: Tags JSON directly stored in the json
      // obj is an object
      // obj[frame].tags[tag_id_in_frame]

      log("setTags: Tags JSON v1, dictionary of frames");
      if (
        !Object.keys(obj).every((v) => /^(0|[1-9]\d*)$/.test(v)) &
        !Object.keys(obj).every((v) => Number.isInteger(v))
      ) {
        log(
          "setTags: ABORTED, unsupported file format. All keys should be positive integers (frame ids)."
        );
        return null;
      }
    }
    // Just use obj directly

    // Create dummy info header
    info = {
      type: "tags-multiframe",
      source: "Converted from Tags v1",
    };
  }
  catch(error){ // Case: loaded json from server does not match expected structure
    logError(error);
    return null;
  }

  return { data: obj, info: info };
}

export function db_to_json(db, info, limit = 100) {
  log("db_to_json: converting CSV to JSON...");

  const a=performance.now(); 
  const result = db.exec(`SELECT frame,CAST(track_id AS TEXT) as id, cx, cy, angle + 90 AS angle, 300 as width, 600 as height, cx-300/2 as x, cy-600/2 as y 
  FROM data 
  LIMIT ${limit}`); 
  const b=performance.now(); 
  log('DB query',b-a)

  const data = resultToObjects(result)
  const c=performance.now(); 
  log('Convert to field array',c-b)

  const obj = flatjson_to_json(data)

  const evts = {info: info, data: obj};

  const d=performance.now(); 
  log('Convert to dictionnary',d-c)

  return evts;
}

export function flatjson_to_json(data) {
  let obj = {};

  for (let i = 0; i < data.length; i++) {
    let item = data[i]
    let frame = item["frame"];
    if (!(frame in obj)) {
      obj[frame] = {}; // List of detections
      //obj[frame]["tags"] = [];
    }
    //let item = {};
    const w = 300
    const h = 600

    item['labels'] = ''
    // let parts = []
    // for (let name of ["head", "neck", "thorax", "waist", "tail"]) {
    //   if (+src[name+"_visibility"] > 0)
    //     parts.push({"posFrame": {"x": +src[name+"_x"], "y": +src[name+"_y"]}, "label": name})
    // }
    // item['parts'] = parts

    obj[frame][item['id']] = item;
  }
  return obj
}

export function resultToObjects(result) {
  if (!result || result.length === 0) return [];

  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function tracks_csv_to_json(data, info) {
  log("tracks_csv_to_json: converting CSV to JSON...");

  let obj = {};

  for (let i = 0; i < data.length; i++) {
    const src=data[i]
    let frame = src["frame"];
    if (!(frame in obj)) {
      obj[frame] = {}; // List of detections
      //obj[frame]["tags"] = [];
    }
    let item = {};
    const w = 300
    const h = 600

    item["id"] = src["track_id"];
    //item["ID"] = src["track_id"];
    item['frame'] = +src['frame']
    //item["label"] = src["label"];
    item["cx"] = +src["cx"];
    item["cy"] = +src["cy"];
    item["angle"] = +src["angle"]+90;
    item["width"] = +w;
    item["height"] = +h;
    item["x"] = +src["cx"]-w/2;
    item["y"] = +src["cy"]-h/2;
    item['labels'] = ''
    let parts = []
    for (let name of ["head", "neck", "thorax", "waist", "tail"]) {
      if (+src[name+"_visibility"] > 0)
        parts.push({"posFrame": {"x": +src[name+"_x"], "y": +src[name+"_y"]}, "label": name})
    }
    item['parts'] = parts

    if ((src["tag_id"] != null) && (src["tag_id"] != '')) {
      item["tag"] = {
        id: +src["tag_id"], frame: +src['frame'],
        c: [+src["tag_cx"],+src["tag_cy"]],
        hamming: +src["tag_hamming"], goodness: +src['tag_goodness'], dm: +src['tag_dm'],
        p: [[+src.tag_p0x,+src.tag_p0y],[+src.tag_p1x,+src.tag_p1y],[+src.tag_p2x,+src.tag_p2y],[+src.tag_p3x,+src.tag_p3y]]
      }
    }

    obj[frame][item['id']] = item;
  }

  const evts = {info: info, data: obj};

  return evts;
}

export function tags_csv_to_json(data, info) {
  log("tags_csv_to_json: converting CSV to JSON...");

  let obj = {};

  for (let i = 0; i < data.length; i++) {
    const src=data[i]
    let frame = src["frame"];
    if (!(frame in obj)) {
      obj[frame] = {}; // List of detections
      //obj[frame]["tags"] = [];
    }
    let item = {};
    const w = 300
    const h = 600

    item["id"] = src["id"];
    //item["ID"] = src["track_id"];
    item['frame'] = +src['frame']
    //item["label"] = src["label"];
    item["cx"] = +src["cx"];
    item["cy"] = +src["cy"];
    item["angle"] = +src["angle"]+90;
    item["width"] = +w;
    item["height"] = +h;
    item["x"] = +src["cx"]-w/2;
    item["y"] = +src["cy"]-h/2;
    item['labels'] = ''
    let parts = []
    for (let name of ["head", "neck", "thorax", "waist", "tail"]) {
      if (+src[name+"_visibility"] > 0)
        parts.push({"posFrame": {"x": +src[name+"_x"], "y": +src[name+"_y"]}, "label": name})
    }
    item['parts'] = parts

    obj[frame][item['id']] = item;
  }

  const evts = {info: info, data: obj};

  return evts;
}

export function tags_csv_to_tagjson(data, info) {
  log("tags_csv_to_tagjson: converting CSV to tag JSON...");

  let obj = {};

  for (let i = 0; i < data.length; i++) {
    const src=data[i]
    let frame = src["frame"];
    if (!(frame in obj)) {
      obj[frame] = {tags: []}; // List of detections
      //obj[frame]["tags"] = [];
    }
    let item = {};

    // Do not include in Tags detections that do not have one
    if (+src['dm'] == 0)
      continue

    item["id"] = src["id"];
    //item["ID"] = src["track_id"];
    item['frame'] = +src['frame']
    //item["label"] = src["label"];
    item['c'] = [+src["cx_tag"],+src["cy_tag"]]
    item["hamming"] = +src["hamming"];
    item['goodness'] = +src['goodness']
    item['dm'] = +src['dm']
    item["p"] = [[+src.p0x,+src.p0y],[+src.p1x,+src.p1y],[+src.p2x,+src.p2y],[+src.p3x,+src.p3y]]

    obj[frame].tags.push( item );
  }

  const tags = {info: info, data: obj};

  return tags;
}

export function tracks_tagged_csv_to_json(data, info) {
  log("tracks_tagged_csv_to_json: converting CSV to Tracks JSON with tags included...");

  let obj = {};

  for (let i = 0; i < data.length; i++) {
    const src=data[i]
    let frame = src["frame"];
    if (!(frame in obj)) {
      obj[frame] = {}; // List of detections
      //obj[frame]["tags"] = [];
    }
    let item = {};
    const w = 300
    const h = 600

    if ((src["track_tagid"] == null) || (src["track_tagid"] == '')) {
      item["id"] = 'T'+src["track_id"];
    } else {
      item["id"] = String(+src["track_tagid"]);
    }
    if ((src["tag_id"] != null) && (src["tag_id"] != '')) {
      const tag = {
        id: +src["tag_id"],
        frame: +src['frame'],
        c: [+src["tag_cx"],+src["tag_cy"]],
        hamming: +src["tag_hamming"],
        goodness: +src['tag_goodness'],
        dm: +src['tag_dm'],
        p: [[+src.tag_p0x,+src.tag_p0y],[+src.tag_p1x,+src.tag_p1y],[+src.tag_p2x,+src.tag_p2y],[+src.tag_p3x,+src.tag_p3y]]
      }
      item["tag"] = tag
    }
    //item["ID"] = src["track_id"];
    item['frame'] = +src['frame']
    //item["label"] = src["label"];
    item["cx"] = +src["cx"];
    item["cy"] = +src["cy"];
    item["angle"] = +src["angle"]+90;
    item["width"] = +w;
    item["height"] = +h;
    item["x"] = +src["cx"]-w/2;
    item["y"] = +src["cy"]-h/2;
    item['labels'] = ''
    let parts = []
    for (let name of ["head", "neck", "thorax", "waist", "tail"]) {
      if (+src[name+"_visibility"] > 0)
        parts.push({"posFrame": {"x": +src[name+"_x"], "y": +src[name+"_y"]}, "label": name})
    }
    item['parts'] = parts

    obj[frame][item['id']] = item;
  }

  const evts = {info: info, data: obj};

  return evts;
}

/* *.events.csv / *.events_tagged.csv: one row per track. Each row gives two observations, at track_startframe and
 * at track_endframe (frames < 0 are before the clip and skipped), id T<track_id>, labels = track_event, track_shape,
 * span {f1: track_startframe, f2: track_endframe} (the whole track, also on both events), partial tag {id: track_tagid} when there is one. See CsvSchemas.js for the mapping table. */
export function events_csv_to_json(data, info) {
  log("events_csv_to_json: converting CSV to JSON...");

  let obj = {};
  const w = 300
  const h = 600

  for (let i = 0; i < data.length; i++) {
    const src = data[i]
    for (const end of ["start", "end"]) {
      const frame = +src["track_" + end + "frame"];
      if (!(frame >= 0)) continue;
      if (!(frame in obj)) obj[frame] = {};
      const cx = +src["track_" + end + "x"], cy = +src["track_" + end + "y"];
      const item = {
        id: 'T' + src["track_id"],
        frame: frame,
        cx: cx, cy: cy,
        angle: +src["track_" + end + "a"] + 90,
        width: w, height: h,
        x: cx - w / 2, y: cy - h / 2,
        span: { f1: +src["track_startframe"], f2: +src["track_endframe"] },
        labels: [src["track_event"], src["track_shape"]].filter(l => l != null && l !== '').join(','),
        parts: [],
      }
      if ((src["track_tagid"] != null) && (src["track_tagid"] !== '')) {
        item["tag"] = { id: +src["track_tagid"], frame: frame }
      }
      obj[frame][item['id']] = item;
    }
  }

  return {info: info, data: obj};
}

/* *.detections.csv: one event per detection, id = detection_id, bbox_* = the box (x, y top-left), parts from
 * the keypoints whose visibility is > 0. No angle in the file: 0. */
export function detections_csv_to_json(data, info) {
  log("detections_csv_to_json: converting CSV to JSON...");

  let obj = {};

  for (let i = 0; i < data.length; i++) {
    const src = data[i]
    const frame = +src["frame"];
    if (!(frame in obj)) obj[frame] = {};
    const x = +src["bbox_x"], y = +src["bbox_y"], width = +src["bbox_width"], height = +src["bbox_height"];
    const item = {
      id: String(src["detection_id"]),
      frame: frame,
      x: x, y: y, width: width, height: height,
      cx: x + width / 2, cy: y + height / 2,
      angle: 0,
      labels: '',
    }
    let parts = []
    for (let name of ["head", "neck", "thorax", "waist", "tail"]) {
      if (+src[name+"_visibility"] > 0)
        parts.push({"posFrame": {"x": +src[name+"_x"], "y": +src[name+"_y"]}, "label": name})
    }
    item['parts'] = parts
    obj[frame][item['id']] = item;
  }

  return {info: info, data: obj};
}

/*
 * Save/export side (refactor slice 2, ADR 0004): conversion of the model into JSON/CSV objects and
 * text. Moved verbatim from AnnotationIO.js; the page globals Tracks, TracksInfo and videoinfo are now
 * parameters (the same references, so in-place effects are unchanged: DEBT-706, DEBT-707).
 * The legacy zero-argument signatures of convertTracksToV1/V2 are kept by AnnotationCodecBridge.js.
 */

export function convertTracksToV1(Tracks) {
  let obj = [];

  let nitems = 0;

  for (let f in Tracks) {
    let frameItem = Tracks[f];
    if (frameItem == null) continue;

    log("saveEventsToFile: frame " + f);

    let frameItem1 = {};
    obj[Number(f)] = frameItem1;

    for (let i in frameItem) {
      let evt = frameItem[i];
      if (evt == null) continue;

      log("saveEventsToFile: frame " + f + "  id " + evt.ID);

      let evt1 = Object.assign({}, evt);
      //delete evt1.ID
      evt1.bool_acts = Labels.bool_acts(evt); // a field of the v1 format, derived from labels
      delete evt1.marked;
      delete evt1.permanent;
      evt1.cx = evt1.x + evt1.width / 2;
      evt1.cy = evt1.y + evt1.height / 2;

      evt1.x = Math.round(evt1.x * 1000) / 1000;
      evt1.y = Math.round(evt1.y * 1000) / 1000;
      evt1.width = Math.round(evt1.width * 1000) / 1000;
      evt1.height = Math.round(evt1.height * 1000) / 1000;
      evt1.cx = Math.round(evt1.cx * 1000) / 1000;
      evt1.cy = Math.round(evt1.cy * 1000) / 1000;

      frameItem1[String(i)] = evt1;

      nitems++;
    }
  }

  log("convertTracksToV1: converted " + nitems + " items");

  return obj;
}

export function convertTracksToV2(Tracks, TracksInfo, videoinfo) {
  // info and videoinfo are deep copies: the live TracksInfo and videoinfo are not modified by a save
  let obj = { info: structuredClone(TracksInfo), data: {} };
  // TracksInfo should come with a few built-in fields:
  // notes

  obj.info.formatnote =
    "Warning: data[f][i] is `i`ˆth event in frame `f`, with id `id` obtained by data[f][i].id, do not access directly as data[f][id] !";

  // history is always an array (CSV and DB imports set it to a string)
  if (!obj.info.history) obj.info.history = [];
  else if (!Array.isArray(obj.info.history)) obj.info.history = [obj.info.history];
  obj.info.history.push("Saved using labelbee on " + Date());
  //let {preview: _, ...videoinfo_without_preview} = videoinfo;
  obj.info.videoinfo = structuredClone(videoinfo)

  let nitems = 0;

  for (let f in Tracks) {
    let frameItem = Tracks[f];
    if (frameItem == null) continue;

    log("saveEventsToFile: frame " + f);

    let frameItem1 = [];
    obj.data[String(f)] = frameItem1;

    for (let i in frameItem) {
      let evt = frameItem[i];
      if (evt == null) continue;

      log("saveEventsToFile: frame " + f + "  id " + evt.ID);

      let evt1 = Object.assign({ id: String(i) }, evt);
      delete evt1.ID;
      delete evt1.bool_acts;
      delete evt1.marked;
      delete evt1.permanent;
      evt1.cx = evt1.x + evt1.width / 2;
      evt1.cy = evt1.y + evt1.height / 2;

      evt1.x = Math.round(evt1.x * 1000) / 1000;
      evt1.y = Math.round(evt1.y * 1000) / 1000;
      evt1.width = Math.round(evt1.width * 1000) / 1000;
      evt1.height = Math.round(evt1.height * 1000) / 1000;
      evt1.cx = Math.round(evt1.cx * 1000) / 1000;
      evt1.cy = Math.round(evt1.cy * 1000) / 1000;

      frameItem1.push(evt1);

      nitems++;
    }
  }

  log("convertTracksToV2: converted " + nitems + " items");

  return obj;
}

export function tracksToCSV(Tracks) {
  var csv = "Date,Time (frame),ID,Action,Cargo,Shift\n";
  if (Tracks === undefined) return csv;
  for (let F in Tracks)
    for (let id in Tracks[F]) {
      var obs = Tracks[F][id];
      var acts = Labels.bool_acts(obs);
      var action = "",
        cargo = "";
      var conc = function (s1, s2) {
        if (s2 === "") s1 += s2;
        else s1 += ";" + s2;
      };
      if (acts[0]) action += (action === "" ? "" : ";") + "fanning";
      if (acts[2]) action += (action === "" ? "" : ";") + "came in";
      if (acts[3]) action += (action === "" ? "" : ";") + "went out";

      if (acts[1]) cargo += "pollen";
      csv += "nodate," + F + "," + obs.ID + "," + action + "," + cargo;

      csv += ","; // Shift ?

      csv += "\n";
    }
  return csv;
}

export function tracksToBBoxes(Tracks) {
  var csv =
    "#frame,left,top,right,bottom,pollen,arrive,leave,fanning,angleAroundCenter\n";
  if (Tracks === undefined) return csv;
  for (let F in Tracks)
    for (let id in Tracks[F]) {
      var obs = Tracks[F][id];
      var acts = Labels.bool_acts(obs);

      csv +=
        F +
        "," +
        obs.x +
        "," +
        obs.y +
        "," +
        (obs.x + obs.width) +
        "," +
        (obs.y + obs.height) +
        "," +
        Number(acts[1]) + // pollen
        "," +
        Number(acts[2]) + // arrive
        "," +
        Number(acts[3]) + // leave
        "," +
        Number(acts[0]) + // fanning
        "," +
        Number(obs.angle) + // angle
        "\n";
    }
  return csv;
}

export function tracksToBBoxes2(Tracks) {
  var csv =
    "#frame,id,tagx,tagy,angle,left,top,right,bottom,pollen,arrive,leave,fanning\n";
  if (Tracks === undefined) return csv;
  for (let F in Tracks)
    for (let id in Tracks[F]) {
      var obs = Tracks[F][id];
      var acts = Labels.bool_acts(obs);

      csv +=
        F +
        "," +
        obs.ID +
        "," +
        (obs.x + obs.width / 2) +
        "," +
        (obs.y + obs.height / 2) +
        "," +
        Number(obs.angle) + // angle
        "," +
        obs.x +
        "," +
        obs.y +
        "," +
        (obs.x + obs.width) +
        "," +
        (obs.y + obs.height) +
        "," +
        Number(acts[1]) + // pollen
        "," +
        Number(acts[2]) + // arrive
        "," +
        Number(acts[3]) + // leave
        "," +
        Number(acts[0]) + // fanning
        "\n";
    }
  return csv;
}
