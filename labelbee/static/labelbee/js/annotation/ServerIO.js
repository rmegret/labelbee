/*
 * ServerIO: the AJAX of the annotations, in both directions (refactor slice 8 steps 6b and 6c, ADR 0015). Moved from AnnotationIO.js
 * and Load.js (slice 3 behavior, ADR 0005). It owns the requests and their errors and separates the envelope of a response (the
 * metadata: `json.data.data`, `created_by_id`...) from the payload, which it hands to Load.js; it knows the formats only by name
 * (`exportTracks("v2")`, the CSV schema of `loadCSVFromServer`). A failed load is shown by core/Alerts.js and rejects.
 * The AJAX error handlers and the entry points still called by a classic script, a template button or a test are installed as
 * globals by labelbeeBridge.js (the template buttons `clickLoadTracks*`).
 *
 * Strict mode: the implicit globals `dataToSend`, `alertMSG`, `success` and `tags` of the old code are declared; nobody read them.
 *
 * DEBT: globals read at call time: `$`, `d3`, `videoManager`, `fromServerDialog` (the lineage
 * `basedOn` and its message) and `statusWidget`. `eventsToServer(format)` ignores `format` (always V2).
 */
import { exportTracks } from './Export.js';
import { loadTracks, loadTags, loadCSVFromRows } from './Load.js';
import { classifyFilename } from './CsvSchemas.js';
import { mainAlert, reportLoadError } from '../core/Alerts.js';
import { logging } from '../core/Notifier.js';
import { url_for } from '../core/Utils.js';
import { getUserId } from '../session/Login.js';

/* REQUESTS. A loader is: get (a Promise) -> payload (Load.js) -> report. Chain the apply stage with `.then(apply, onError)`,
 * never with `.then(apply).catch(onError)`: an exception of the apply stage is not a request error. */
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

export function typesetAjaxError(title, hook) {
  var callback = function (jqXHR, textStatus, errorThrown) {
    console.log(
      "AJAX ERROR: " + title,
      jqXHR,
      textStatus,
      errorThrown,
      jqXHR.responseText
    );
    if (hook) {
      var html =
        "<div>" +
        title +
        "<br>Status: " +
        textStatus +
        "<br>Error: " +
        errorThrown +
        "<br>" +
        jqXHR.responseText +
        "</div>";
      hook(html);
    }
  };
  return callback;
}
export function showAjaxError(title, prehook, onlyConsole) {
    var callback = function(jqXHR, textStatus, errorThrown) {
        console.log('AJAX ERROR: '+title, jqXHR, textStatus, errorThrown, jqXHR.responseText)
        if (prehook) {
            prehook(jqXHR, textStatus, errorThrown)
        }
        if (!onlyConsole) {
            mainAlert(title
                    +'<br>Status: '+ textStatus
                    +'<br>Error: '+ errorThrown
                    +'<br>'+ jqXHR.responseText
            )
        }
    }
    return callback
}

/* LOADS FROM THE SERVER */
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
        const success = loadTracks(obj);

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

      if (!loadTracks(obj)) throw new Error("Invalid events format (details in the console)");
    },
    function (err) {
      showAjaxError("ERROR in eventsFromServer")(err.jqXHR, err.textStatus, err.errorThrown);
    }
  ).catch(reportLoadError("loading events from " + url));
}

/* `schema`: one of the `loader` fields of annotation/CsvSchemas.js (tracks, tags, tracks_tagged, events, detections);
 * by default the one the file name announces, else tracks. */
export function loadCSVFromServer(url, schema) {
  schema = schema || (classifyFilename(url) || {}).loader || "tracks";
  console.log("loadCSVFromServer: importing " + schema + " CSV from URL '" + url + "'...");

  return d3.csv(url)
  .then(function (rows) {
      console.log("loadCSVFromServer: SUCCESS\ncsv=", rows);

      loadCSVFromRows(rows, schema, url);
    })
  .catch(reportLoadError("loading " + schema + " CSV from " + url))
}

// Buttons of the page: ask the user for a URL, then load it (DEBT: the defaults hardcode the datasets `bee_feeder` and `gurabo4`)
export async function clickLoadTracksCSVFromServer() {
  console.log("clickLoadTracksCSVFromServer: loading .tracks.csv from URL");
  const url = prompt("Enter tracks URL", url_for("/data")+"/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv");
  if (url == null || url == "") {
    console.log("clickLoadTracksCSVFromServer: no URL entered");
    return;
  }
  return loadCSVFromServer(url, "tracks");
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
  return loadCSVFromServer(tracksURL, "tracks_tagged")
}

export function tagsFromServer(tagFileID) {
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
      return loadTags(tags);
    },
    function () {
      console.log('tagsFromServer: ERROR loading tag file with ID "' + tagFileID + '"');
      statusWidget.statusUpdate("tagsLoad", false, "");
      return loadTags([]);
    }
  );
}

/* SAVE TO THE SERVER */
export function eventsToServer(format) {
  var route = "/api/v1/annotations";

  console.log("eventsToServer");

  const dataToSend = {
    video_id: videoManager.currentVideoID,
    created_by_id: getUserId(),
    data_type: "event",
    data: JSON.stringify(exportTracks("v2")),
    created_from_id: fromServerDialog.basedOn
  }

  $.ajax({
    url: url_for(route), //server url
    type: "POST", //passing data as post method
    data: dataToSend, //form values OLD : JSON.stringify({ video: getVideoInfo().videoName, data: data })
    dataType: 'json',
    success: function (json) {
      console.log(json)
      json = json['data']
      const alertMSG = "Save Events JSON (" + format + ") to server: Success." +
      "\ncreated_by_id: " + json['created_by_id'] +
      "\nfile_name: " + json['file_name'] +
      "\npath: " + json['path'] +
      "\ndata_type: " + json['data_type'] +
      "\nid: " + json['id'] +
      "\ncreated_from_id: " + json['created_from_id'] +
      "\nvideo_id: " + json['video_id'] +
      "\ntimestamp: " + json['timestamp'];
      alert(alertMSG); //response from the server given as alert message
    },
    error: showAjaxError("ERROR in eventsToServer"),
  });
}
