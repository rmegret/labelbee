/*
 * AnnotationCodec, load side: pure conversion of file/server payloads into the Tracks/Tags
 * JSON structures. Moved verbatim from AnnotationIO.js (refactor slice 1, ADR 0002).
 * The save/export side is at the end of the file (slice 2, ADR 0004).
 *
 * Pure: no access to Tracks/Tags/DOM/network/window. Alerts and logs go through core/Notifier.js
 * (ADR 0003); the global hasLabel is connected with configure() by AnnotationCodecBridge.js.
 */
import { alert, log, logError, logIO } from "../core/Notifier.js";

let hasLabel = () => { throw new Error("AnnotationCodec: hasLabel not configured"); };

/* Connect the module to the outside: {hasLabel(obs, label)} (required) */
export function configure(deps) {
  if (typeof deps.hasLabel !== "function") {
    throw new Error("AnnotationCodec.configure: hasLabel is required");
  }
  hasLabel = deps.hasLabel;
}

export function sanitizeEvents(obj) {
  var info;
  var data;
  try{
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
  
          evt.bool_acts = [
            hasLabel(evt, "fanning"),
            hasLabel(evt, "pollen"),
            hasLabel(evt, "entering"),
            hasLabel(evt, "leaving"),
          ];
  
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
      } else if (typeof obj == "object") {
        if (logIO())
          log("sanitizeEvents: got an object, use directly");
        data = obj;
        info.source = "Converted from Tracks v1 object";
      } else {
        log(
          "sanitizeEvents: ABORTED, unsupported file format. Should be either array of frames, or object with frame ids as keys."
        );
        return;
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
    }
  }
  catch(error){ // Case: loaded json from server does not match expected structure
    logError(error);
    return;
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

    item['bool_acts'] = [false,false,false,false]
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
    item['bool_acts'] = [false,false,false,false]
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
    item['bool_acts'] = [false,false,false,false]
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
    item['bool_acts'] = [false,false,false,false]
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

      let evt1 = Object.assign(evt);
      //delete evt1.ID
      //delete evt1.bool_acts
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
  let obj = { info: TracksInfo, data: {} };
  // TracksInfo should come with a few built-in fields:
  // notes

  obj.info.formatnote =
    "Warning: data[f][i] is `i`ˆth event in frame `f`, with id `id` obtained by data[f][i].id, do not access directly as data[f][id] !";

  if (!obj.info.history) obj.info.history = [];
  obj.info.history.push("Saved using labelbee on " + Date());
  //let {preview: _, ...videoinfo_without_preview} = videoinfo;
  obj.info.videoinfo = videoinfo

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
      var action = "",
        cargo = "";
      var conc = function (s1, s2) {
        if (s2 === "") s1 += s2;
        else s1 += ";" + s2;
      };
      if (obs.bool_acts[0]) action += (action === "" ? "" : ";") + "fanning";
      if (obs.bool_acts[2]) action += (action === "" ? "" : ";") + "came in";
      if (obs.bool_acts[3]) action += (action === "" ? "" : ";") + "went out";

      if (obs.bool_acts[1]) cargo += "pollen";
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
        Number(obs.bool_acts[1]) + // pollen
        "," +
        Number(obs.bool_acts[2]) + // arrive
        "," +
        Number(obs.bool_acts[3]) + // leave
        "," +
        Number(obs.bool_acts[0]) + // fanning
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
        Number(obs.bool_acts[1]) + // pollen
        "," +
        Number(obs.bool_acts[2]) + // arrive
        "," +
        Number(obs.bool_acts[3]) + // leave
        "," +
        Number(obs.bool_acts[0]) + // fanning
        "\n";
    }
  return csv;
}
