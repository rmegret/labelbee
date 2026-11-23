/*jshint esversion: 6, asi: true */
// Annotation IO dialogs: the load and save buttons, the dialogs that list the files of the server (labels, events, tags), the login
// dialog and the user info (moved to session/Login.js in step 13b). ES module (refactor slice 8 step 12c, ADR 0015); no statement cut. Page globals
// (`events`, `videoManager`, `loadTracks`, `printMessage`, `chronoState`...) are read at call time; what the page reads is on `window`
// (the bridge installs the exported functions, this file assigns the instances `fromServerDialog`...).


// Formerly implicit globals, used as temporaries by the dialogs below (module scope, same sharing as before)
let html, idx, buttonHTML, success, fileData

// ######################################################################
// INPUT/OUTPUT

export function initAnnotationIO() {
  document
    .getElementById("load")
    .addEventListener("change", loadEventsFromFile);
  document
    .getElementById("loadtags")
    .addEventListener("change", loadTagsFromFile);

  chronoState.ttags = [];
}

function show_log_in() {}

// Timestamp parsing
function formattimestamp(timestamp) {
  if (timestamp.length == 12) {
    return (
      "20" +
      timestamp.slice(0, 2) +
      "-" +
      timestamp.slice(2, 4) +
      "-" +
      timestamp.slice(4, 6) +
      " " +
      timestamp.slice(6, 8) +
      ":" +
      timestamp.slice(8, 10) +
      ":" +
      timestamp.slice(10, 12)
    );
  } else return timestamp;
}

// WARNING: DEPRECATED. Use loadEventsFromServerByID() instead
function tracksListFromServer() {

  var route = "/rest/events/"; // Hardcoded

  console.log(
    "tracksListFromServer: importing Tracks List from URL '" + route + "'..."
  );

  $("#loadTracksFromServerDialog .modal-body").html(
    "<div>Loading Tracks file list from server. Please wait...</div>"
  );

  $.ajax({
    url: url_for(route),
    type: "GET",
    contentType: "application/json",
    //data:{format:'json'}, // Without 'video', list all videos
    data: { format: "json", video: getVideoInfo().videoName }, /* videoName deprecated */
    success: function (json) {
      // Get the file list in JSON format

      console.log("tracksListFromServer: SUCCESS\ntracksList=", json);

      let html = "";
      if (false) {
        for (let item of json) {
          html +=
            '<button onclick="eventsFromServer(' +
            "'" +
            item["uri"] +
            "'" +
            ')">' +
            item["filename"] +
            "</button> <br>";
        }
      } else {
        html +=
          "<table><thead>" +
          "<th>Link</th>" +
          "<th>Video</th>" +
          "<th>Owner</th>" +
          "<th>Created on</th>" +
          "</thead><tbody>";
        function boldize(text, flag) {
          if (flag) {
            return "<b>" + text + "</b>";
          } else return text;
        }
        function formattimestamp(timestamp) {
          if (timestamp.length == 12) {
            return (
              "20" +
              timestamp.slice(0, 2) +
              "-" +
              timestamp.slice(2, 4) +
              "-" +
              timestamp.slice(4, 6) +
              " " +
              timestamp.slice(6, 8) +
              ":" +
              timestamp.slice(8, 10) +
              ":" +
              timestamp.slice(10, 12)
            );
          } else return timestamp;
        }
        for (let item of json) {
          html +=
            "<tr>" +
            '<td><button onclick="eventsFromServer(' +
            "'" +
            item["uri"] +
            "'" +
            ')">' +
            item["filename"] +
            "</button></td>" +
            "<td>" +
            boldize(item["video"], item["video"] == getVideoInfo().videoName) + /* videoName deprecated */
            "</td>" +
            "<td>" +
            item["user_name"] +
            " (" +
            item["user_id"] +
            ")</td>" +
            "<td>" +
            formattimestamp(item["timestamp"]) +
            "</td>" +
            "</tr>";
        }
        html += "</tbody></table>";
      }
      $("#loadTracksFromServerDialog .modal-body").html(html);

      // Nothing else to do here:
      // The modal #loadTracksFromServerDialog is supposed to be open
      // and filled with links to each Track file
      // Clicking on one of the link will trigger eventsFromServer()
    },
    error: showAjaxError("ERROR in EventsFromServerDialog", function () {
      $("#loadTracksFromServerDialog").modal("hide");
    }),
  });
}

// The loaders, loadTracks/loadTags, mainAlert, the AJAX errors and eventsToServer are in annotation/Load.js and
// annotation/ServerIO.js (slice 8 step 6b)
