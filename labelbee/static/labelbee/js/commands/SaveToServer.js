/*
 * SaveToServer: the command that saves the events as a new record of the server (refactor slice 8 step 14h1, ADR 0016). Moved unchanged
 * from annotation/ServerIO.js. The record names the one it was loaded from (`created_from_id`, the lineage of the store, ADR 0016); the
 * request is io/ServerIO.js; the success alert and the error display stay here until step 15. `eventsToServer` is installed as a global
 * by labelbeeBridge.js (the template button `eventsToServerV2`).
 *
 * DEBT: globals read at call time: `videoManager` (`currentVideoID`). `eventsToServer(format)` ignores `format` (always V2).
 */
import { exportTracks } from '../codecs/Export.js';
import { ajaxPostJSON } from '../io/ServerIO.js';
import { AnnotationStore } from '../annotation/AnnotationStore.js';
import { showAjaxError } from '../core/Alerts.js';
import { url_for } from '../core/Utils.js';
import { getUserId } from '../session/Login.js';

// The server field is a database id: only a load from a database record is a parent (ADR 0016)
function createdFromId() {
  const basedOn = AnnotationStore.getBasedOn();
  return basedOn && basedOn.source == "server-db" ? basedOn.id : undefined;
}

export function eventsToServer(format) {
  var route = "/api/v1/annotations";

  console.log("eventsToServer");

  const dataToSend = {
    video_id: videoManager.currentVideoID,
    created_by_id: getUserId(),
    data_type: "event",
    data: JSON.stringify(exportTracks("v2")),
    created_from_id: createdFromId()
  }

  ajaxPostJSON(url_for(route), dataToSend).then(
    function (json) {
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
    function (err) {
      showAjaxError("ERROR in eventsToServer")(err.jqXHR, err.textStatus, err.errorThrown);
    }
  );
}
