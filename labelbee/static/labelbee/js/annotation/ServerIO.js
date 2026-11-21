/*
 * ServerIO: the main alert, the AJAX error handlers and the save of the events to the server (refactor slice 8 step 6b,
 * ADR 0015). Moved from AnnotationIO.js; installed as globals by labelbeeBridge.js (labelBee.js, ZoomView.js and the dialogs
 * call `typesetAjaxError`, `showAjaxError`, `mainAlert`; the template button calls `eventsToServer`).
 *
 * Strict mode: the implicit globals `dataToSend` and `alertMSG` of `eventsToServer` are declared; nobody read them.
 *
 * DEBT: globals read at call time: `$`, `videoManager`, `user_id` (set by the login), `fromServerDialog`.
 */
import { exportTracks } from './Export.js';
import { url_for } from '../core/Utils.js';

export function mainAlert(text) {
  var modal = $("#mainAlertDialog");
  var bs = modal.data("bs.modal");
  // Bootstrap 3 loses a modal opened while the previous one is still fading out: its pending hide runs after the
  // new show and hides it again, leaving the backdrop. While a hide is in progress, wait for it to finish.
  var hiding = bs && !bs.isShown && (bs.$backdrop || modal.is(":visible"));
  var show = function () {
    $("#mainAlertDialog .modal-body").html(text);
    modal.modal("show");
  };
  if (hiding) {
    modal.one("hidden.bs.modal", show);
  } else {
    show();
  }
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

export function eventsToServer(format) {
  var route = "/api/v1/annotations";

  console.log("eventsToServer");

  // Hardcoded test data
  // dataToSend = {
  //   video_id: "1",
  //   created_by_id: "1",
  //   data_type:"event",
  //   data:"testData"
  // }

  const dataToSend = {
    video_id: videoManager.currentVideoID,
    created_by_id: user_id,
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
