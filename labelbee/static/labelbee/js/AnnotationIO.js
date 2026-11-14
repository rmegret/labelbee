/*jshint esversion: 6, asi: true */

// ######################################################################
// INPUT/OUTPUT

function initAnnotationIO() {
  document
    .getElementById("load")
    .addEventListener("change", loadEventsFromFile);
  document
    .getElementById("loadtags")
    .addEventListener("change", loadTagsFromFile);

  ttags = [];
  labelListFromServerDialog = new LabelListFromServerDialog();
  fromServerDialog = new FromServerDialog();
  pickEventsCSVDialog = new EventsCSVManualFilePicker();

  $("#events-notes").on("input", onChanged_events_notes);
}

function ajaxlogin(email, password) {
  var url = url_for("/api/v1/auth/login");

  //console.log(url)
  console.log("ajaxlogin, email=", email);

  $.ajax({
    url: url, //server url
    type: "POST", //passing data as post method
    //contentType: 'application/json', // returning data as json
    data: { email: email, password: password }, //form values
    success: function (json) {
      console.log("ajaxlogin: json=", json);
      if (json.status == "SUCCESS") {
        whoami();
        loginDialog.closeDialog();
      } else {
        console.log("ajaxlogin: ERROR json=", json);
        loginDialog.message("ERROR: " + json.message);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("ajaxlogin: ERROR ", textStatus, errorThrown, jqXHR);
      loginDialog.message(
        "ERROR: " + textStatus + " " + errorThrown + " " + jqXHR.responseText
      );
    },
  });
}

function ajaxlogout(email, password) {
  var url = url_for("/api/v1/auth/logout");

  //console.log(url)

  $.ajax({
    url: url, //server url
    type: "POST", //passing data as post method
    success: function (json) {
      console.log("ajaxlogout: json=", json);
      if (json.status == "SUCCESS") {
        whoami();
      } else {
        console.log("ajaxlogout: ERROR json=", json);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("ajaxlogout: ERROR ", textStatus, errorThrown, jqXHR);
    },
  });
}

function LoginDialog() {
  this.div = $("#dialog-login");

  this.openDialog = function () {
    let div = this.div;

    console.log("LoginDialog.openDialog");

    loginDialog.message("");
    div.dialog("open");
  };
  this.initDialog = function () {
    let that = this;
    let div = this.div;

    div.dialog({
      autoOpen: false,
      title: "Login",
      modal: true,
      width: 335,
      buttons: {
        Ok: function () {
          var email = div.find('input[id="email"]').val();
          var password = div.find('input[id="password"]').val();
          var tmp = $(this);
          ajaxlogin(email, password, function () {
            console.log("test");
            tmp.dialog("close");
          });
        },
        Cancel: function () {
          $(this).dialog("close");
        },
      },
      open: function () {
        $("body").css("overflow", "hidden");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });
  };
  this.closeDialog = function () {
    this.div.dialog("close");
  };
  this.message = function (html) {
    this.div.find("#message").html(html);
  };

  this.initDialog();
}

function try_login() {
  console.log("try_login: Open Login Dialog");
  loginDialog.openDialog();
}

function try_logout() {
  if (confirm("Confirm log out?")) {
    ajaxlogout();
  } else {
    console.log("User canceled log out");
  }
}

user_data = {is_authenticated:false};
function whoami() {
  $.getJSON(url_for("/api/v1/auth/whoami"), function (data) {
    console.log("whoami: data=", data);
    user_data = data;
  })
    .done(function (data) {
      //$('#whoami').html(JSON.stringify(data))
      if (data.is_authenticated) {
        $("#whoami").html(
          '<button onclick="whoami()" type="button" class="btn btn-black btn-xs" title="Refresh user info"><span class="glyphicon glyphicon-refresh small"></span></button>'+
          " Logged as " +
            data.first_name +
            ' <button onclick="try_logout()" type="button" class="btn btn-black btn-xs" title="Log out current user">Log out</button>'
        );
        user_id = data.id
        $(".require-server").toggleClass("disabled", false);
      } else {
        $("#whoami").html(
          '<button onclick="try_login()" type="button" class="btn btn-success btn-xs" title="Log in">Log in</button>'
        );
        $(".require-server").toggleClass("disabled", true);
      }
    })
    .fail(function (data) {
      console.log("whoami: ERROR", data);
      $("#whoami").html(
        '<button onclick="whoami()" type="button" class="btn btn-black btn-xs" title="Refresh user info"><span class="glyphicon glyphicon-refresh small"></span></button>'+
        " No connection " +
          '<button onclick="try_login()" type="button" class="btn btn-success btn-xs" title="Log in">Log in</button>'
      );
      $(".require-server").toggleClass("disabled", true);
    });
}

function show_log_in() {}

// ## Manual load of events

class EventsCSVManualFilePicker {
  constructor() {
    this.filePicker = new FilePickerFromServerDialog();
    this.filePicker.initDialog({
      base_uri: url_for("/api/v1/rawdata/"),
      loadFileFunction: function (uri) {
        loadTracksCSVFromServer(uri);
      },
      dialogName: "Load tracks CSV Manually",
    });
  }
  open() {
    this.filePicker.openDialog();
  }
  close() {
    this.filePicker.closeDialog();
  }
}

// ## Annotations control

function saveBlobToFile(blob, filename) {
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.hidden = true;
  document.body.appendChild(a);
  a.href = url;
  a.download = filename;
  a.click();
  console.log("saveBlobToFile: waiting for user to save to file");
  //window.URL.revokeObjectURL(url);
  console.log("saveBlobToFile: done");

  // New simplified API?
  //saveAs(blob, filename)
}
function saveObjToJsonFile(obj, filename) {
  var json = JSON.stringify(obj);

  var blob = new Blob([json], {
    type: "text/json",
  });

  saveBlobToFile(blob, filename);
}
function saveCSVToFile(txt, filename) {
  var blob = new Blob([txt], {
    type: "text/csv",
  });
  saveBlobToFile(blob, filename);
}

function getTimestampNow() {
  function addZero(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return String(i);
  }

  let D = new Date();
  let timestamp =
    D.getFullYear() +
    addZero(D.getMonth() + 1) +
    addZero(D.getDate()) +
    "_" +
    addZero(D.getHours()) +
    addZero(D.getMinutes()) +
    addZero(D.getSeconds());
  return timestamp;
}
function getTimestampedVideoname() {
  return videoinfo.name + "-" + getTimestampNow();
}

function saveEventsToFile(format) {
  console.log("saveEventsToFile: exporting to JSON...");

  if (!format) {
    format = "v2";
  }

  let filename = getTimestampedVideoname() + "_Tracks.json";

  let obj = null;
  if (format == "v1") obj = convertTracksToV1();
  else if (format == "v2") obj = convertTracksToV2();
  if (obj == null) {
    console.log("saveEventsToFile: error while preparing data, Aborted.");
  }

  saveObjToJsonFile(obj, filename);
}

function saveEventsToCSV() {
  console.log("saveEventsToCSV: exporting to CSV...");

  var txt = tracksToCSV(events.toObject());

  saveCSVToFile(txt, "Tracks.csv");
}

function saveEventsToBBoxes() {
  console.log("saveEventsToBBoxes: exporting bounding boxes to CSV...");
  console.log("with simple format: frame, left, top, right, bottom, pollen");

  var txt = tracksToBBoxes2(events.toObject());

  saveCSVToFile(txt, "BBoxes.csv");
}

function eraseEvents() {
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
function setTracks(obj, skipRefresh) {
  console.log("setTracks: changing events data structure and refreshing...");

  var evts = sanitizeEvents(obj);

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
function setEventsProp(option, value) {
  if (!events.info) {
    console.log("setEventsProp: ERROR TracksInfo non existing. Created it");
  }
  events.setInfo(option, value); // creates the info when missing
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
function onReaderLoad(event) {
  eventsFromText(event.target.result);
}
function loadEventsFromFile0(fileToRead) {
  console.log("loadFromFile0: importing from JSON...");

  return new Promise(function (resolve, reject) {
    $.get(fileToRead, resolve).fail(reject);
  }).then(function (data) {
    console.log("JSON loaded: ", data);
    var obj = JSON.parse(data);
    if (!setTracks(obj)) throw new Error("Invalid events format (details in the console)");
  }).catch(reportLoadError("loading events from " + fileToRead));
}
function loadEventsFromFile(event) {
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

function eraseTags() {
  var r = confirm("Are you sure you want to ERASE all Tags?");
  if (r == true) {
    console.log("ERASING all Tags...");
    setTags({}, "");
  } else {
    console.log("User CANCELED Erase Tags ...");
  }
}

function setTags(obj, div) {
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
function onTagsReaderLoad(event) {
  //console.log(event.target.result);
  tagsFromText(event.target.result);
}

function loadTagsFromFile(event) {
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

function saveTagsToFile(version) {
  console.log("saveTagsToFile: exporting to JSON... v=", version);

  let filename = getTimestampedVideoname() + "_Tags.json";

  if (version == "v1") {
    saveObjToJsonFile(AnnotationStore.getTags(), filename);
  } else if (version == "v2") {
    obj = {
      info: {
        type: "tags-multiframe",
        "data-format": "root.data[frame].tags[id_in_frame]",
        //"source": "Exported from labelbee on "+Date()
      },
      data: AnnotationStore.getTags(),
    };
    saveObjToJsonFile(obj, filename);
  } else {
    console.log("ERROR in saveTagsToFile: unknown version=", version);
  }
}

// Server I/O

function LabelListFromServerDialog() {
  var theDialog = this;
  this.div = $("#dialog-labellist-from-server");
  var div = this.div;

  if (!div.length) {
    console.log(
      "LabelListFromServerDialog: ERROR, could not find #dialog-labellist-from-server"
    );
  }

  this.updateDialog = function (uri) {
    var route = "/rest/config/labellist/"; // Hardcoded

    console.log(
      "LabelListFromServerDialog: importing labellist from URL '" +
        route +
        "'..."
    );

    if (!!uri) {
      route = uri;
    }

    var data = { format: "json" };
    $.ajax({
      url: url_for(route),
      type: "GET",
      contentType: "application/json",
      data: data,
      success: function (json) {
        // Get the file list in JSON format

        console.log(
          "LabelListFromServerDialog: ajax SUCCESS\nlabellist=",
          json
        );
        theDialog.json = json;

        let html = "";
        for (let item of json.files) {
          html +=
            '<button onclick="labelListFromServerDialog.onClickFile(' +
            "'" +
            item["uri"] +
            "'" +
            ')">' +
            item["filename"] +
            "</button> <br>";
        }

        for (let item of json.dirs) {
          html +=
            '<button onclick="labelListFromServerDialog.onClickDir(' +
            "'" +
            item["uri"] +
            "'" +
            ')">' +
            item["filename"] +
            "</button> <br>";
        }

        div.find(".modal-body").html(html);
        div.find(".modal-message").html("");

        // Nothing else to do here:
        // The modal #loadTracksFromServerDialog is supposed to be open
        // and filled with links to each Track file
        // Clicking on one of the link will trigger eventsFromServer()
      },
      error: typesetAjaxError(
        "ERROR in LabelListFromServerDialog dialog",
        function (html) {
          div.find(".modal-message").html(html);
        }
      ),
    });
  };
  this.openDialog = function () {
    console.log("LabelListFromServerDialog.openDialog");

    div.find(".modal-body").html("[...]");
    div
      .find(".modal-message")
      .html(
        "<div>Loading labelList file list from server. Please wait...</div>"
      );

    div.modal("show");
    //        div.dialog("open");

    this.updateDialog();
  };
  this.initDialog = function () {
    //           div.dialog({
    //             autoOpen: false,
    //             modal: false,
    //             buttons: {
    //                 "Cancel": function() {
    //                     $(this).dialog("close");
    //                 }
    //             },
    //             open: function(){
    //                 $("body").css("overflow", "hidden");
    //             },
    //             close: function(){
    //                 $("body").css("overflow", "auto");
    //             }
    //         });

    theDialog.diruri = "";

    div.modal({
      show: false,
      autoOpen: false,
      modal: true,
      open: function () {
        $("body").css("overflow", "auto");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });
    div.find(".modal-dialog").draggable({
      handle: ".modal-header",
    });
    div.find(".modal-content").resizable({
      alsoResize: ".modal-content",
      minHeight: 300,
      minWidth: 300,
    });
  };
  this.closeDialog = function () {
    div.modal("hide");
    //div.dialog("close");
  };

  this.onClickFile = function (url) {
    console.log(
      "labelListFromServerDialog: importing labelList from URL '" + url + "'..."
    );

    div.find(".modal-message").html("Loading labels from " + url + "...");

    labelListFromServer(url).then(function () {
      div.find(".modal-message").html("Labels loaded. Closing.");
      theDialog.closeDialog();
    });
  };
  this.onClickDir = function (uri) {
    console.log("labelListFromServerDialog::onClickDir: going to " + uri);

    this.updateDialog(uri);
  };

  this.initDialog();
}

function labelListFromServer(url) {
  console.log(
    "labelListFromServer: importing labelList from URL '" + url + "'..."
  );

  return $.ajax({
    url: url, //server url
    type: "GET", //passing data as post method
    contentType: "application/json", // returning data as json
    data: "",
    success: function (obj) {
      console.log("labelListFromServer: SUCCESS\nobj=", obj);
      //let obj = JSON.parse(json);

      if (!obj || !obj.labelButtonsArray) {
        console.log("labelListFromServer: could not parse JSON. Abort.");
        return false;
      }

      console.log("labelListFromServer: updating labelButtonsArray...");
      labelButtonsArray = obj.labelButtonsArray;

      console.log("labelListFromServer: hardRefreshLabelTogglePanel...");
      hardRefreshLabelTogglePanel();

      //$('#loadTracksFromServerDialog').modal('hide');
    },
    error: showAjaxError("labelListFromServer: ERROR"),
  });
}


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

/* REST API Tracks files */

function FromServerDialog() {
  var theDialog = this;
  this.div = $("#from-server-dialog");
  var div = this.div;
  this.dataType = null;

  this.setTitle = function(html){
    div.find(".modal-title").html(html);
    return
  }

  this.setCheckboxes = function(html){
    div.find(".checkboxes").html(html);
    return
  }

  this.setBody = function(html){
    div.find(".modal-body").html(html);
    return
  }

  this.setMessage = function(color, html){
    div.find(".modal-message").css("color",color);
    div.find(".modal-message").html(html);
    return
  }

  this.resetAllHTML = function(){
    this.setTitle("");
    this.setCheckboxes("");
    this.setMessage("black","");
    this.setBody("");
  }

  this.openDialog = function(){
    div.modal("show");
  }

  this.closeDialog = function () {
    div.modal("hide");
  };

  this.openRecentLoadingDialog = function(data_type){
    // videoManager.currentVideoID = 9371; // ONLY FOR DEV PURPOSES! COMMENT WHEN DEPLOYING TO LIVE SERVICE
    this.data_type = data_type;
    this.resetAllHTML();
    this.setTitle("Most recent " + data_type + " file for " + videoinfo.videoPath);
    let checkboxHTML = 
    '<label>'+ 
    '<input type="checkbox" id="showAdvancedMenu" onclick="fromServerDialog.showAdvancedLoadingDialog(false)">'+ 
    'Show advanced loading menu </label> <br>' + 
    "Select type of event: <select id='DropdownElement' onchange='fromServerDialog.openRecentLoadingDialog(this.value);'>" +
    "<option value='tag'>tag</option>" +
    "<option value='event'>event</option>" +
    "</select>";
    this.setCheckboxes(checkboxHTML);
    div.find("#showAdvancedMenu").prop('checked', false);
    div.find('#DropdownElement').val(data_type);
    this.setBody("[...]")
    this.setMessage("black", "Loading most recent " + data_type + " file information. Please wait...");
    
    if (!videoManager.currentVideoID){
      this.resetAllHTML();
      this.setTitle("No video loaded!");
      this.setMessage("red", "No video has been selected. Please select a video before attempting to load tag/event files.");
      this.openDialog();
      return
    }

    // Display Modal
    this.openDialog();

    // Load first tag/event file information through GET request
    $.ajax({
      url: url_for("api/v1/annotations"),
      method: 'get',
      data: {video_id : videoManager.currentVideoID, data_type: data_type}, 
      dataType: 'json',
      error: typesetAjaxError(
        "ERROR in FromServerDialog.openRecentLoadingDialog",
        function (html) {
          theDialog.setMessage("red", html)
        }
      ),
      success: function(json){
          console.log("FromServerDialog.openRecentLoadingDialog: (ajax) Load most recent "+ data_type +"file from server: Success", json);
          theDialog.json = json["data"];
          let html = "";
          html +=
          "<table id='RecentFromServerTable' style='width:100%'><thead>" +
          "<th>File Name</th>" +
          "<th>Created on</th>" +
          "<th>Owner</th>";
          html += "</thead><tbody>";
          fileData = json["data"][0];
          if (fileData == null){
            fromServerDialog.setMessage("red","Current user has not recently opened any " + data_type + " files for the current video.\
            \nUse the advanced loading menu to load a file.");
             return
          }
          html +=
            '<tr data-row="' +
            0 +
            '">' +
            "<td>" +
            fileData["file_name"] +
            "</td>" +
            "<td>" +
            fileData["timestamp"].split("T").join(' ') +
            "</td>" +
            "<td>" +
            '['+fileData["created_by_id"]+'] ' + fileData["created_by"] +
            "</td>";
          html += "</tr>";
          html += "</tbody></table><br>";
          html += "<h4>Do you wish to load this " + data_type + " file?</h4>";
          html += '<button onclick="fromServerDialog.loadEvents(\'0\')" class="btn btn-success btn-lg">Yes</button> '
          html += '<button type="button" class="btn btn-danger btn-lg" data-dismiss="modal">No</button>';
          html += "<br><br><h4>WARNING: If another " + data_type + " file is currently loaded, unsaved changes may be lost.<h4>";
          
          // Display table with file information
          theDialog.setBody(html);

          // Reset message
          theDialog.setMessage("black", "");
      }
    });
  }

  this.showAdvancedLoadingDialog = function(allusers) {
    this.resetAllHTML();
    this.setTitle("Advanced " + this.data_type + " loading menu for " + videoinfo.videoPath);
    let checkboxHTML = 
    '<label> '+ 
    '<input type="checkbox" id="showAdvancedMenu" onclick="fromServerDialog.openRecentLoadingDialog(\''+ this.data_type +'\');"> '+ 
    'Show advanced loading menu</label> &nbsp; &nbsp;' +
    '<label>'+ 
    '<input type="checkbox" id="showAllUsers" onclick="fromServerDialog.showAdvancedLoadingDialog'
    if (allusers){
      checkboxHTML += '(false);"> ' 
    }
    else{
      checkboxHTML += '(true);"> ' 
    }
    checkboxHTML += 'Show files from all users</label> <br>' +
    "<label>Select type of event: </label> &nbsp; <select id='DropdownElement' "+
    "onchange='fromServerDialog.data_type = this.value; fromServerDialog.showAdvancedLoadingDialog(false);'>" +
        "<option value='tag'>tag</option>" +
        "<option value='event'>event</option>" +
      "</select>";  
    this.setCheckboxes(checkboxHTML);
    div.find("#showAdvancedMenu").prop('checked', true);
    if (allusers){
      div.find("#showAllUsers").prop('checked', true);
    }
    div.find('#DropdownElement').val(this.data_type);

    // Loading video tag/event data
    // GET request that sends a video ID and data_type to receive a json
    // json includes information about all event files related to the current video 
    // videoID obtained from URL as GET parameter, dataType entered as argument when called in labelbee_page.html
    $.ajax({
      url: url_for("api/v1/annotations"),
      method: 'get',
      data: {video_id : videoManager.currentVideoID, data_type: theDialog.data_type, allusers: allusers}, 
      dataType: 'json',
      error: typesetAjaxError(
        "ERROR in EventsFromServer dialog",
        function (html) {
          theDialog.setMessage(html);
        }
      ),
      success: function(json){
      theDialog.json = json["data"];
      console.log("fromServerDialog: (ajax) Load "+ theDialog.data_type + "files data from server: Success", json);
        html =
        "<table id='TagOrEventFileListFromServer' style='width:100%'>" +
        "<thead>" +
        "<th></th>" +
        "<th>File Name</th>" +
        "<th>Created on</th>" +
        "<th>Owner</th></thead>" +
        "</table>";
        html += "<br><br><h4>WARNING: If another " + theDialog.data_type + " file is currently loaded, unsaved changes may be lost.<h4>";
        // console.log("HTML produced from database response:\n", html);
        
        // Creating table with only headers
        theDialog.setBody(html);
        theDialog.setMessage("");
        // Filling empty table using data from json
        idx = 0
        div.find("#TagOrEventFileListFromServer").DataTable({
          data: json["data"],
          columns:[
            {data:"id", render: function(id){
              var tag_event_ID = theDialog.json[idx]?.["id"];
              buttonHTML = '<button onclick="fromServerDialog.loadEvents(\''+idx+'\')" class="small">Load #'+tag_event_ID+'</button>';
              idx += 1;
              return buttonHTML;
            }},
            {data:"file_name"},
            {data:"timestamp", render: function(timestamp){
              return timestamp.split('T').join(' ');
            }},
            {data:"created_by", render:function(created_by, type, full){
              return '[' + full.created_by_id + '] ' + created_by;
            }}
          ]
        });
      }
    });
  };
  this.initDialog = function () {
    div.modal({
      show: false,
      autoOpen: false,
      modal: true,
      open: function () {
        $("body").css("overflow", "auto");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });
    div.find(".modal-dialog").draggable({
      handle: ".modal-header",
    });
    div.find(".modal-content").resizable({
      alsoResize: ".modal-content",
      minHeight: 300,
      minWidth: 300,
    });
  };

  this.loadEvents = function (k) {
    console.log(theDialog.json);
    var tag_event_ID = theDialog.json[k]["id"];
    //MODIFY CONSOLE MESSAGE DEPENDING ON FILE
    console.log("RecentTagOrEventFromServerDialog: importing " + this.dataType + "s from database for file ID '" + tag_event_ID + "'...");
    
    div.find(".modal-message h4").css("color","black");
    div.find(".modal-message h4").html("Loading " + this.dataType + "s from database for file ID " + tag_event_ID + "...");
    // Load tag or event file
    if(this.data_type== "tag"){      // Case: tag file
      success = tagsFromServer(tag_event_ID, this.div);
      if(success){
        theDialog.basedOn = tag_event_ID;
        div.find(".modal-message h4").css("color","black");
        div.find('.modal-message h4').html("Tags loaded successfully.")        
      }
      else{
        div.find(".modal-message h4").css("color","red");
        div.find('.modal-message h4').html("ERROR <br> setTags: Invalid tag information obtained from server.")
      }
    }
    else{                           // Case: event file
      //Sending GET request to flask API to retrieve json containing annotation data
      $.ajax({
        url: url_for("api/v1/annotation/" + tag_event_ID), // url to tag/event file
        type: "GET", //passing data as get method
        contentType: "application/json", // returning data as json
        data: "",
        success: function (json) {
          //alert("success");  //response from the server given as alert message

          console.log("loadEvents: Loaded events data:", json["data"]["data"]);
          // Case: event file
          let obj = JSON.parse(json["data"]["data"]);
          success = setTracks(obj);
          // Setting basedon information
          // {
          //   var basedon = {};
          //   var fields = [
          //     "video",
          //     "filename",
          //     "timestamp",
          //     "user_name",
          //     "user_id",
          //   ];
          //   for (var f of fields) basedon[f] = info[f];
          //   setEventsProp("basedon", basedon);
          // }

          videoControl.onFrameChanged();

          refreshChronogram();
          if(success){
            console.log("Loaded event. ID:", tag_event_ID)
            theDialog.basedOn = tag_event_ID;
            fromServerDialog.setMessage("black","Events loaded.");
          }
          else{
            div.find(".modal-message h4").css("color","red");
            div.find('.modal-message h4').html("ERROR <br> setTracks: Invalid event information obtained from server.");
          }
        },
        error:  function () {
          div.find(".modal-message h4").css("color","red");
          div.find(".modal-message h4").html("ERROR in loading tag or event with ID " + tag_event_ID);
          },
      });
    }
  };
  this.clickedShowMetadata = function () {
    this.updateDialog();
  };
  this.showMetadata = function (k) {
    var data = theDialog.json[k]["metadata"];
    var html = JSON.stringify(data, undefined, 2);
    html = '<pre class="json">' + html + "</pre>";
    div.find(".modal-message").html(html);
  };
  this.initDialog();
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
    data: { format: "json", video: videoinfo.videoName }, /* videoName deprecated */
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
            boldize(item["video"], item["video"] == videoinfo.videoName) + /* videoName deprecated */
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

async function loadEventsFromServerByID(video_data_id) {
    //Sending GET request to flask API to retrieve json containing annotation data
    // Resolves once the events are loaded; rejects when the request fails or the data is invalid
    // (the message is also written in the from-server dialog)
    return ajaxGetJSON(url_for("api/v1/annotation/" + video_data_id)).then(
      function (json) {
        //alert("success");  //response from the server given as alert message

        console.log("loadEvents: Loaded events data:", json["data"]["data"]);
        // Case: event file
        let obj = JSON.parse(json["data"]["data"]);
        success = setTracks(obj);

        videoControl.onFrameChanged();

        refreshChronogram();
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

function eventsFromServer(url) {
  console.log("eventsFromServer: importing Tracks from URL '" + url + "'...");

  return ajaxGetJSON(url).then(
    function (json) {
      //alert("success");  
      console.log("eventsFromServer: SUCCESS\njson=", json);
      let obj = json; //JSON.parse(json);

      if (!setTracks(obj)) throw new Error("Invalid events format (details in the console)");

      videoControl.onFrameChanged();

      refreshChronogram();

      $("#loadTracksFromServerDialog").modal("hide");
    },
    function (err) {
      showAjaxError("ERROR in eventsFromServer")(err.jqXHR, err.textStatus, err.errorThrown);
    }
  ).catch(reportLoadError("loading events from " + url));
}

function loadTracksCSVFromDB(limit = 100) {

    let info = {
        type: "events-multiframe",
        source: `Imported form DB`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }

  const a=performance.now(); 
  let obj = db_to_json(db, info, limit)
  const b=performance.now(); 
  console.log('DB query + convert to JSON',b-a)
  setTracks(obj)
  const c=performance.now(); 
  console.log('setTracks',c-b)
  videoControl.onFrameChanged();
  refreshChronogram();
  const d=performance.now(); 
  console.log('refreshChronogram',d-c)
}
function loadTracksCSVFromServer(url) {
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

      if (!setTracks(obj)) throw new Error("Invalid events in the CSV (details in the console)")

      videoControl.onFrameChanged();

      refreshChronogram();
    })
  .catch(reportLoadError("loading tracks CSV from " + url))

}
function loadTagsCSVFromServer(url) {
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
      if (!setTracks(obj)) throw new Error("Invalid events in the CSV (details in the console)")

      info = {
        type: "tags-multiframe",
        source: `Converted from CSV "${url}"`,
        history: `Loaded in Labelbee on ${new Date().toISOString()}`,
      }
      obj = tags_csv_to_tagjson(data, info)
      if (!setTags(obj)) throw new Error("Invalid tags in the CSV (details in the console)")

      videoControl.onFrameChanged();

      refreshChronogram();
    })
  .catch(reportLoadError("loading tags CSV from " + url))

}
function loadTrackTaggedCSVFromServer(url) {
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
      if (!setTracks(obj)) throw new Error("Invalid events in the CSV (details in the console)")

      videoControl.onFrameChanged();

      refreshChronogram();
    })
  .catch(reportLoadError("loading tracks_tagged CSV from " + url))

}

async function clickLoadTracksCSVFromServer() {
  console.log("clickLoadTracksCSVFromServer: loading .tracks.csv from URL");
  const url = prompt("Enter tracks URL", url_for("/data")+"/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv");
  if (url == null || url == "") {
    console.log("clickLoadTracksCSVFromServer: no URL entered");
    return;
  }
  return loadTracksCSVFromServer(url);
}
async function clickLoadTracksTaggedCSVFromServer() {
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


function mainAlert(text) {
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

function typesetAjaxError(title, hook) {
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
function showAjaxError(title, prehook, onlyConsole) {
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

function eventsToServer(format) {
  var route = "/api/v1/annotations";

  console.log("eventsToServer");

  // Hardcoded test data
  // dataToSend = {
  //   video_id: "1",
  //   created_by_id: "1",
  //   data_type:"event",
  //   data:"testData"
  // }

  dataToSend = {
    video_id: videoManager.currentVideoID,
    created_by_id: user_id,
    data_type: "event",
    data: JSON.stringify(convertTracksToV2()),
    created_from_id: fromServerDialog.basedOn
  }

  $.ajax({
    url: url_for(route), //server url
    type: "POST", //passing data as post method
    data: dataToSend, //form values OLD : JSON.stringify({ video: videoinfo.videoName, data: data })
    dataType: 'json',
    success: function (json) {
      console.log(json)
      json = json['data']
      alertMSG = "Save Events JSON (" + format + ") to server: Success." +
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


function tagsFromServer(tagFileID, div) {

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
      tags = data["data"]["data"];
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


/* METADATA EDITION */

function onChanged_events_notes(event) {
  if (events.info) {
    events.setInfo("notes", $("#events-notes").val());
  }
}
function updateEventsNotes() {
  if (events.info) {
    $("#events-notes").val(events.info["notes"]);
  }
}

