/*
 * Load: the loaders of the events and the tags, from a file, the server or a CSV, and what they apply: `setTracks`, `setTags`
 * and the load errors (refactor slice 8 step 6b, ADR 0015). Moved from AnnotationIO.js with the slice 3 behavior
 * (ADR 0005); the dialogs that call them (FromServerDialog, the CSV file picker, LabelListFromServerDialog) stay classic until
 * step 9. The entry points are installed as globals by labelbeeBridge.js, as before (template buttons, labelBee.js, the
 * dialogs, the console); the helpers used only inside this module (readFileAsText, ajaxGetJSON, getJSONPromise, escapeHTML,
 * showLoadError, reportLoadError, eventsFromText, tagsFromText) are not exported.
 *
 * Strict mode: three implicit globals of the old code are declared (`success` in loadEventsFromServerByID, `tags` in
 * tagsFromServer); nobody read them.
 *
 * DEBT: globals read at call time, set by the page and not yet modules: `$`, `d3`, `db`, `videoControl`,
 * `videoManager`, `statusWidget`, `fromServerDialog`, `refreshChronogram`, `adjustChronogramHeight`, `getTTags`,
 * `updateEventsNotes` (a form update that stays in AnnotationIO.js: core/RefreshInstrumentBridge.js instruments it by its
 * global name, so `setTracks` must call the global), and `ttags`, a global `var` of ChronoControl.js that `setTags` reads
 * and assigns.
 */
import * as codec from './AnnotationCodec.js';
import { AnnotationStore } from './AnnotationStore.js';
import { logging } from '../core/Notifier.js';
import { url_for } from '../core/Utils.js';
import { mainAlert, showAjaxError } from './ServerIO.js';

const events = AnnotationStore.events;
const {
  sanitizeEvents, decodeTags, tagsAddFrames, db_to_json, tracks_csv_to_json, tags_csv_to_json, tags_csv_to_tagjson,
  tracks_tagged_csv_to_json, events_csv_to_json, detections_csv_to_json,
} = codec;

// Loaders of the CSV schemas of annotation/CsvSchemas.js (the `loader` field of a schema)
export function csvLoaderFor(name) {
  return {
    tracks: loadTracksCSVFromServer,
    tags: loadTagsCSVFromServer,
    tracks_tagged: loadTrackTaggedCSVFromServer,
    events: (url) => loadConvertedCSVFromServer(url, events_csv_to_json, "cxcy", "events"),
    detections: (url) => loadConvertedCSVFromServer(url, detections_csv_to_json, "xy", "detections"),
  }[name];
}

// ## Annotations control

export function eraseEvents() {
  var r = confirm(
    "Are you sure you want to ERASE all manual annotations (Tracks)?"
  );
  if (r == true) {
    console.log("ERASING all Tracks...");
    setTracks([]);
  } else {
    console.log("User CANCELED Erase Tracks ...");
  }
}
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

/* LOADER HELPERS (refactor ADR 0005). A loader is: get (a Promise) -> decode (the codec) -> apply
 * (setTracks / setTags). Chain the apply stage with `.then(apply, onError)`, never with
 * `.then(apply).catch(onError)`: an exception of the apply stage is not a request error. */
function readFileAsText(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (event) {
      resolve(event.target.result);
    };
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
}
// Resolves with the JSON of the response; rejects with {jqXHR, textStatus, errorThrown}
function ajaxGetJSON(url) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: url,
      type: "GET",
      contentType: "application/json",
      data: "",
      success: resolve,
      error: function (jqXHR, textStatus, errorThrown) {
        reject({ jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown });
      },
    });
  });
}
function getJSONPromise(url) {
  return new Promise(function (resolve, reject) {
    $.getJSON(url).done(resolve).fail(reject);
  });
}

/* LOAD ERRORS (refactor ADR 0005, Q23): a failed load is told to the user, in the from-server dialog when
 * it is open, else in the main alert, and the rejection goes on to whoever awaits the loader. */
function escapeHTML(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function showLoadError(what, error) {
  console.error(what, error);
  var html = "ERROR " + escapeHTML(what) + "<br>" + escapeHTML((error && error.message) || error);
  if ($("#from-server-dialog").is(":visible")) {
    fromServerDialog.setMessage("red", html);
  } else {
    mainAlert(html);
  }
}
// To be used as the last `.catch` of a loader pipeline
function reportLoadError(what) {
  return function (error) {
    showLoadError(what, error);
    throw error;
  };
}

function eventsFromText(text) {
  if (logging.io) {
    console.log(text);
  }
  var obj = JSON.parse(text);
  if (logging.io) {
    console.log(obj);
  }

  if (!setTracks(obj)) throw new Error("Invalid events format (details in the console)");
}
export function onReaderLoad(event) {
  eventsFromText(event.target.result);
}
export function loadEventsFromFile0(fileToRead) {
  console.log("loadFromFile0: importing from JSON...");

  return new Promise(function (resolve, reject) {
    $.get(fileToRead, resolve).fail(reject);
  }).then(function (data) {
    console.log("JSON loaded: ", data);
    var obj = JSON.parse(data);
    if (!setTracks(obj)) throw new Error("Invalid events format (details in the console)");
  }).catch(reportLoadError("loading events from " + fileToRead));
}
export function loadEventsFromFile(event) {
  console.log("loadEventsFromFile: importing from JSON...");

  const fileToRead = event.target.files[0];
  event.target.value = ""; // Reinit value to allow loading same file again

  if (!fileToRead) {
    console.log("loadEventsFromFile: Canceled by user.");
    return;
  }
  console.log("loadEventsFromFile: importing from JSON file:", fileToRead);

  return readFileAsText(fileToRead).then(eventsFromText)
    .catch(reportLoadError("loading events from file " + fileToRead.name));
}

export function eraseTags() {
  var r = confirm("Are you sure you want to ERASE all Tags?");
  if (r == true) {
    console.log("ERASING all Tags...");
    setTags({}, "");
  } else {
    console.log("User CANCELED Erase Tags ...");
  }
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
function tagsFromText(text) {
  var obj = JSON.parse(text);
  //console.log(obj) // Caution: heavy

  if (!setTags(obj)) throw new Error("Invalid tags format (details in the console)");

  console.log("loadTagsFromFile: importing from JSON file. DONE");
}
export function onTagsReaderLoad(event) {
  //console.log(event.target.result);
  tagsFromText(event.target.result);
}

export function loadTagsFromFile(event) {
  //console.log("loadTagsFromFile: importing from JSON...")

  const fileToRead = event.target.files[0];
  event.target.value = ""; // Reinit value to allow loading same file again

  if (!fileToRead) {
    console.log("loadTagsFromFile: Canceled by user.");
    return;
  }
  console.log("loadTagsFromFile: importing from JSON file:", fileToRead);

  return readFileAsText(fileToRead).then(tagsFromText)
    .catch(reportLoadError("loading tags from file " + fileToRead.name));
}

export async function loadEventsFromServerByID(video_data_id) {
    //Sending GET request to flask API to retrieve json containing annotation data
    // Resolves once the events are loaded; rejects when the request fails or the data is invalid
    // (the message is also written in the from-server dialog)
    return ajaxGetJSON(url_for("api/v1/annotation/" + video_data_id)).then(
      function (json) {
        //alert("success");  //response from the server given as alert message

        console.log("loadEvents: Loaded events data:", json["data"]["data"]);
        // Case: event file
        let obj = JSON.parse(json["data"]["data"]);
        const success = setTracks(obj);

        if(success){
          console.log("Loaded event. ID:", video_data_id)
          fromServerDialog.basedOn = video_data_id;
          fromServerDialog.setMessage("black","Events loaded.");
        }
        else{
          throw new Error("Invalid event information obtained from server (video_data id="+video_data_id+")")
        }
      },
      function () {
        throw new Error("Could not load video_data id="+video_data_id)
      }
    ).catch(reportLoadError("loading events with ID " + video_data_id));
}

export function eventsFromServer(url) {
  console.log("eventsFromServer: importing Tracks from URL '" + url + "'...");

  return ajaxGetJSON(url).then(
    function (json) {
      //alert("success");  
      console.log("eventsFromServer: SUCCESS\njson=", json);
      let obj = json; //JSON.parse(json);

      if (!setTracks(obj)) throw new Error("Invalid events format (details in the console)");

      $("#loadTracksFromServerDialog").modal("hide");
    },
    function (err) {
      showAjaxError("ERROR in eventsFromServer")(err.jqXHR, err.textStatus, err.errorThrown);
    }
  ).catch(reportLoadError("loading events from " + url));
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
export function loadTracksCSVFromServer(url) {
  console.log("loadTracksDataFrameFromServer: importing Tracks in CSV format from URL '" + url + "'...");

  return d3.csv(url)
  .then(function (data) {
      console.log("loadTracksDataFrameFromServer: SUCCESS\ncsv=", data);

      //tracks_csv = data

      let info = {
        type: "events-multiframe",
        source: `Converted from CSV "${url}"`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }

      let obj = tracks_csv_to_json(data, info)

      if (!setTracks(obj, false, { centerPolicy: "cxcy" })) throw new Error("Invalid events in the CSV (details in the console)")
    })
  .catch(reportLoadError("loading tracks CSV from " + url))

}
export function loadTagsCSVFromServer(url) {
  console.log("loadTagsCSVFromServer: importing Tags+Tracks in CSV format from URL '" + url + "'...");

  return d3.csv(url)
  .then(function (data) {
      console.log("loadTagsCSVFromServer: SUCCESS\ncsv=", data);

      //tracks_csv = data

      let info = {
        type: "events-multiframe",
        source: `Converted from CSV "${url}"`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }
      let obj = tags_csv_to_json(data, info)

      info = {
        type: "tags-multiframe",
        source: `Converted from CSV "${url}"`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }
      let objtag = tags_csv_to_tagjson(data, info)

      // no skipRefresh in setTracks: setTags below refreshes once for the events and the tags
      if (!setTracks(obj, true, { centerPolicy: "cxcy" })) throw new Error("Invalid events in the CSV (details in the console)")
      if (!setTags(objtag)) throw new Error("Invalid tags in the CSV (details in the console)")
    })
  .catch(reportLoadError("loading tags CSV from " + url))

}
export function loadTrackTaggedCSVFromServer(url) {
  console.log("loadTrackWithTagsCSVFromServer: importing Tags+Tracks in CSV format from URL '" + url + "'...");

  return d3.csv(url)
  .then(function (data) {
      console.log("loadTrackWithTagsCSVFromServer: SUCCESS\ncsv=", data);

      //tracks_csv = data

      let info = {
        type: "events-multiframe",
        source: `Converted from CSV "${url}"`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }
      let obj = tracks_tagged_csv_to_json(data, info)
      if (!setTracks(obj, false, { centerPolicy: "cxcy" })) throw new Error("Invalid events in the CSV (details in the console)")
    })
  .catch(reportLoadError("loading tracks_tagged CSV from " + url))

}

// Same pipeline as the loaders above, for the CSV types converted by a codec function (see CsvSchemas.js)
export function loadConvertedCSVFromServer(url, converter, centerPolicy, what) {
  return d3.csv(url)
  .then(function (data) {
      let info = {
        type: "events-multiframe",
        source: `Converted from CSV "${url}"`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }
      let obj = converter(data, info)
      if (!setTracks(obj, false, { centerPolicy: centerPolicy })) throw new Error("Invalid events in the CSV (details in the console)")
    })
  .catch(reportLoadError("loading " + what + " CSV from " + url))
}

export async function clickLoadTracksCSVFromServer() {
  console.log("clickLoadTracksCSVFromServer: loading .tracks.csv from URL");
  const url = prompt("Enter tracks URL", url_for("/data")+"/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv");
  if (url == null || url == "") {
    console.log("clickLoadTracksCSVFromServer: no URL entered");
    return;
  }
  return loadTracksCSVFromServer(url);
}
export async function clickLoadTracksTaggedCSVFromServer() {
  console.log("clickLoadTracksTaggedCSVFromServer: loading video and .tracks_tagged.csv from URL");
  const col_videoname = prompt("Enter gurabo4 col_videoname", "col10/9_02_R_190809120000.cfr.mp4");
  if (col_videoname == null || col_videoname == "") {
    console.log("clickLoadTracksCSVFromServer: no video entered");
    return;
  }
  const videoURL = url_for("/data")+`/datasets/gurabo4/mp4/${col_videoname}`
  console.log(`Trying to load video from ${videoURL}`)
  videoManager.loadVideoManual(videoURL);
  
  const tracksURL = url_for("/data")+`/datasets/gurabo4/tracks/${col_videoname}.tracks_tagged.csv`
  console.log(`Trying to load tracks_tagged from ${tracksURL}`)
  return loadTrackTaggedCSVFromServer(tracksURL)
}

export function tagsFromServer(tagFileID, div) {

  // Files are not being loaded from a specific URL anymore, 
  // Commented code block should no longer be necessary

  //var path = "data/Gurabo/Tags-C02_170624100000.json" ;// Default

  // if (path == null) {
  //   var p = videoControl.name.split("/");
  //   var q = p[p.length - 1].split(".");
  //   q[0] = "Tags-" + q[0];
  //   q[q.length - 1] = "json";
  //   p[p.length - 1] = q.join(".");

  //   var path = p.join("/"); // Default
  // }
  // if (!quiet) {
  //   path = window.prompt("Please enter path for Tags JSON (server)", path);
  //   if (path == null || path == "") {
  //     console.log("tagsFromServer: canceled");
  //     return;
  //   }
  // }

  if (logging.io) {
    console.log('tagsFromServer: loading tag file with ID "' + tagFileID + '"...');
  }
  statusWidget.statusRequest("tagsLoad", "");

  // The Promise is deliberately not returned: FromServerDialog.loadEvents reads the return value as
  // "success", and it has always been undefined (DEBT-719)
  getJSONPromise(url_for("rest/v2/annotation/" + tagFileID)).then(
    function (data) {
      console.log('tagsFromServer: loaded tag file with ID "' + tagFileID + '"');
      statusWidget.statusUpdate("tagsLoad", true, "");
      const tags = data["data"]["data"];
      console.log("Loaded tag data:", tags)
      if (tags == null){
        fromServerDialog.setMessage("red", "ERROR: Tag data stored in server is null.");
        return
      }
      return setTags(tags, div);
    },
    function () {
      console.log('tagsFromServer: ERROR loading tag file with ID "' + tagFileID + '"');
      statusWidget.statusUpdate("tagsLoad", false, "");
      return setTags([], div);
    }
  );
}

// function tagsFromServer(videoID){
//   tagLoadDialog = new FilePickerFromServerDialog();
//   tagLoadDialog.openDialog();

// }
