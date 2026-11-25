/*
 * LoadFromServer: the commands that load annotations from the server: events by database id, events from a URL, a CSV from a URL
 * (refactor slice 8 step 14h2, ADR 0016). Moved from annotation/ServerIO.js (slice 3 behavior, ADR 0005): get (io/ServerIO.js) -> payload
 * -> apply (commands/Load.js) -> report a failure (core/Alerts.js, which also tells it to the from-server dialog when it is open) and
 * reject. The success message of the dialog is shown by the dialog after the promise resolves (rule 1: a command shows no dialog message).
 * Installed as globals by labelbeeBridge.js (labelBee.js, VideoControl.js, tests).
 */
import { loadTracks, loadCSVFromRows } from './Load.js';
import { classifyFilename } from '../codecs/CsvSchemas.js';
import { ajaxGetJSON, fetchCSVRows } from '../io/ServerIO.js';
import { reportLoadError, showAjaxError } from '../core/Alerts.js';
import { url_for } from '../core/Utils.js';

/* A loader is: get (a Promise, io/ServerIO.js) -> payload (Load.js) -> report. Chain the apply stage with `.then(apply, onError)`,
 * never with `.then(apply).catch(onError)`: an exception of the apply stage is not a request error. */
/* LOADS FROM THE SERVER */
export async function loadEventsFromServerByID(video_data_id) {
    //Sending GET request to flask API to retrieve json containing annotation data
    // Resolves once the events are loaded; rejects when the request fails or the data is invalid
    // (a failure is also written in the from-server dialog when it is open, core/Alerts.js; its caller shows the success)
    return ajaxGetJSON(url_for("api/v1/annotation/" + video_data_id)).then(
      function (json) {
        //alert("success");  //response from the server given as alert message

        console.log("loadEvents: Loaded events data:", json["data"]["data"]);
        // Case: event file
        let obj = JSON.parse(json["data"]["data"]);
        const success = loadTracks(obj, false, { basedOn: { source: "server-db", id: video_data_id } });

        if(success){
          console.log("Loaded event. ID:", video_data_id)
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

      if (!loadTracks(obj, false, { basedOn: { source: "server-file", id: url } })) throw new Error("Invalid events format (details in the console)");
    },
    function (err) {
      showAjaxError("ERROR in eventsFromServer")(err.jqXHR, err.textStatus, err.errorThrown);
    }
  ).catch(reportLoadError("loading events from " + url));
}

/* `schema`: one of the `loader` fields of codecs/CsvSchemas.js (tracks, tags, tracks_tagged, events, detections);
 * by default the one the file name announces, else tracks. */
export function loadCSVFromServer(url, schema) {
  schema = schema || (classifyFilename(url) || {}).loader || "tracks";
  console.log("loadCSVFromServer: importing " + schema + " CSV from URL '" + url + "'...");

  return fetchCSVRows(url)
  .then(function (rows) {
      console.log("loadCSVFromServer: SUCCESS\ncsv=", rows);

      loadCSVFromRows(rows, schema, url);
    })
  .catch(reportLoadError("loading " + schema + " CSV from " + url))
}
