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

  eventsFromServerDialog = new EventsFromServerDialog();
  labelListFromServerDialog = new LabelListFromServerDialog();
  fromServerDialog = new FromServerDialog();

  $("#events-notes").on("input", onChanged_events_notes);
}

function ajaxlogin(email, password) {
  var url = url_for("/rest/auth/login");

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
  var url = url_for("/rest/auth/logout");

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
      modal: true,
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

function whoami() {
  $.getJSON(url_for("/rest/auth/whoami"), function (data) {
    console.log("whoami: data=", data);
  })
    .done(function (data) {
      //$('#whoami').html(JSON.stringify(data))
      if (data.is_authenticated) {
        $("#whoami").html(
          "Logged as " +
            data.first_name +
            ' <button onclick="try_logout()" type="button" class="btn btn-black btn-xs" title="Log out current user">Log out</button>'
        );
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
      $("#whoami").html("No connection to server storage");
      $(".require-server").toggleClass("disabled", true);
    });
}

function show_log_in() {}

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

function convertTracksToV1() {
  let obj = [];

  let nitems = 0;

  for (let f in Tracks) {
    let frameItem = Tracks[f];
    if (frameItem == null) continue;

    console.log("saveEventsToFile: frame " + f);

    let frameItem1 = {};
    obj[Number(f)] = frameItem1;

    for (let i in frameItem) {
      let evt = frameItem[i];
      if (evt == null) continue;

      console.log("saveEventsToFile: frame " + f + "  id " + evt.ID);

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

  console.log("convertTracksToV1: converted " + nitems + " items");

  return obj;
}
function convertTracksToV2() {
  let obj = { info: TracksInfo, data: {} };

  obj.info.formatnote =
    "Warning: data[f][i] is `i`ˆth event in frame `f`, with id `id` obtained by data[f][i].id, do not access directly as data[f][id] !";

  if (!obj.info.history) obj.info.history = [];
  obj.info.history.push("Saved using labelbee on " + Date());

  let nitems = 0;

  for (let f in Tracks) {
    let frameItem = Tracks[f];
    if (frameItem == null) continue;

    console.log("saveEventsToFile: frame " + f);

    let frameItem1 = [];
    obj.data[String(f)] = frameItem1;

    for (let i in frameItem) {
      let evt = frameItem[i];
      if (evt == null) continue;

      console.log("saveEventsToFile: frame " + f + "  id " + evt.ID);

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

  console.log("convertTracksToV2: converted " + nitems + " items");

  return obj;
}

function getTimestampNow() {
  function addZero(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
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
  return videoinfo.videoName + "-" + getTimestampNow();
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

function tracksToCSV(Tracks) {
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

function saveEventsToCSV() {
  console.log("saveEventsToCSV: exporting to CSV...");

  var txt = tracksToCSV(Tracks);

  saveCSVToFile(txt, "Tracks.csv");
}

function tracksToBBoxes(Tracks) {
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
function tracksToBBoxes2(Tracks) {
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

function saveEventsToBBoxes() {
  console.log("saveEventsToBBoxes: exporting bounding boxes to CSV...");
  console.log("with simple format: frame, left, top, right, bottom, pollen");

  var txt = tracksToBBoxes2(Tracks);

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
function sanitizeEvents(obj) {
  var info;
  var data;
  try{
    if ("info" in obj) {
      // New events format v2 with metainfo
  
      // obj['info']
      info = obj["info"];
  
      if (info["type"] != "events-multiframe") {
        console.log(
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
      data0 = obj["data"];
  
      // New format more complex (store each frame as array of evts,
      // instead of dict of evts: allow duplicate ids,
      // which current interface does not support)
      // for the moment, downgrade to simpler format
  
      hasDuplicateEntries = false;
  
      data = {};
      for (let f in data0) {
        let frameItem0 = data0[f];
        if (frameItem0 == null) continue;
  
        let frameItem = {};
        data[String(f)] = frameItem;
  
        for (let i in frameItem0) {
          let evt0 = frameItem0[i];
          if (evt0 == null) continue;
  
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
            console.log(
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
  
      console.log("sanitizeEvents: Tracks JSON v1");
      if (typeof obj == "array") {
        console.log("sanitizeEvents: got an array, converting to object");
        data = obj.reduce(function (acc, cur, i) {
          acc[i] = cur;
          return acc;
        }, {});
        info.source = "Converted from Tracks v1 array";
      } else if (typeof obj == "object") {
        console.log("sanitizeEvents: got an object, use directly");
        data = obj;
        info.source = "Converted from Tracks v1 object";
      } else {
        console.log(
          "sanitizeEvents: ABORTED, unsupported file format. Should be either array of frames, or object with frame ids as keys."
        );
        return;
      }
      if (
        !Object.keys(data).every((v) => /^(0|[1-9]\d*)$/.test(v)) &
        !Object.keys(data).every((v) => Number.isInteger(v))
      ) {
        console.log(
          "sanitizeEvents: ABORTED, unsupported file format. All keys should be positive integers (frame ids)."
        );
        return;
      }
    }
  }
  catch(error){ // Case: loaded json from server does not match expected structure
    console.error(error);
    return;
  }


  return { info: info, data: data };
}
function setTracks(obj) {
  console.log("setTracks: changing events data structure and refreshing...");

  var evts = sanitizeEvents(obj);

  if (!evts) {
    console.log("setTracks: ABORTED, wrong format.");
    return 0;
  }

  Tracks = evts.data;
  TracksInfo = evts.info;

  updateEventsNotes();

  videoControl.onFrameChanged();
  refreshChronogram();
  return 1;
}
function setEventsProp(option, value) {
  if (!TracksInfo) {
    TracksInfo = {};
    console.log("setEventsProp: ERROR TracksInfo non existing. Created it");
  }
  TracksInfo[option] = value;
}

function onReaderLoad(event) {
  if (logging.io) {
    console.log(event.target.result);
  }
  var obj = JSON.parse(event.target.result);
  if (logging.io) {
    console.log(obj);
  }

  setTracks(obj);
}
function loadEventsFromFile0(fileToRead) {
  console.log("loadFromFile0: importing from JSON...");

  $.get(fileToRead, function (data) {
    console.log("JSON loaded: ", data);
    var obj = JSON.parse(data);
    setTracks(obj);
  });
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

  var reader = new FileReader();
  reader.onload = onReaderLoad;
  reader.readAsText(fileToRead);
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

/* Augment tag items with frame field */
function tagsAddFrames(Tags) {
  for (let f in Tags) {
    let tagsFrame = Tags[f].tags;
    if (tagsFrame == null) continue;

    for (let i in tagsFrame) {
      let tag = tagsFrame[i];
      if (tag == null) continue;

      tag.frame = Number(f);
    }
  }
}
function setTags(obj, div) {
  console.log("setTags: changing Tags data structure and refreshing...");

  var info;
  try{
    if ("info" in obj) {
      // New tag format v2 with metainfo
  
      // obj['info']
      info = obj["info"];
  
      if (info["type"] != "tags-multiframe") {
        console.log(
          'setTags: ABORTED, unsupported file format. info["type"]=' +
            info["type"]
        );
        return 0;
      }
  
      // obj['data'].tags[tag_id_in_frame]
      obj = obj["data"];
    }
    else {
      // Old format v1: Tags JSON directly stored in the json
      // obj is an object
      // obj[frame].tags[tag_id_in_frame]
  
      console.log("setTags: Tags JSON v1, dictionary of frames");
      if (typeof obj != "object") {
        console.log(
          'setTags: ABORTED, unsupported file format. typeof(obj) is "' +
            typeof obj +
            '", should be "object"'
        );
        return 0;
      }
      if (
        !Object.keys(Tags).every((v) => /^(0|[1-9]\d*)$/.test(v)) &
        !Object.keys(Tags).every((v) => Number.isInteger(v))
      ) {
        console.log(
          "setTags: ABORTED, unsupported file format. All keys should be positive integers (frame ids)."
        );
        return 0;
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
    console.error(error);
    return 0;
  }

  Tags = obj;
  TagsInfo = info;

  tagsAddFrames(Tags);

  ttags = getTTags();

  // Check if Tags data structure support the DM field
  tagsHaveDM = false;
  if (!jQuery.isEmptyObject(Tags)) {
    let tags0 = Tags[Object.keys(Tags)[0]].tags;
    if (tags0.length > 0) {
      tagsHaveDM = "dm" in tags0[0];
    }
  }
  // Disable DM field if not there
  $(".requireDM").prop("disabled", !tagsHaveDM);
  $(".requireDM").toggleClass("disabled", !tagsHaveDM);

  console.log(
    "setTags: done. Sending signals to refresh chronogram and video..."
  );

  refreshChronogram();
  adjustChronogramHeight();
  videoControl.onFrameChanged();
  return 1;
}
function onTagsReaderLoad(event) {
  //console.log(event.target.result);
  var obj = JSON.parse(event.target.result);
  //console.log(obj) // Caution: heavy

  setTags(obj);

  console.log("loadTagsFromFile: importing from JSON file. DONE");
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

  var reader = new FileReader();
  reader.onload = onTagsReaderLoad;
  reader.readAsText(fileToRead);
}

function saveTagsToFile(version) {
  console.log("saveTagsToFile: exporting to JSON... v=", version);

  let filename = getTimestampedVideoname() + "_Tags.json";

  if (version == "v1") {
    saveObjToJsonFile(Tags, filename);
  } else if (version == "v2") {
    obj = {
      info: {
        type: "tags-multiframe",
        "data-format": "root.data[frame].tags[id_in_frame]",
        //"source": "Exported from labelbee on "+Date()
      },
      data: Tags,
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

    div.find(".modal-message").html("Loading events from " + url + "...");

    labelListFromServer(url).then(function () {
      div.find(".modal-message").html("Events loaded. Closing.");
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

function EventsFromServerDialog() {
  var theDialog = this;
  this.div = $("#dialog-event-from-server");
  var div = this.div;
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

  this.initDialog();

  this.updateDialog = function (dataType) {
    // var route = "/rest/events/"; // Hardcoded
    this.dataType = dataType;
    // console.log(
    //   "EventsFromServerDialog: importing Tracks List from URL '" +
    //     route +
    //     "'..."
    // );

    // Setting showMetadata and showNotes checkboxes to "checked"
    // Part of modal header
    var showMetadata = div.find(".showMetadata").prop("checked");
    var showNotes = div.find(".showNotes").prop("checked");
    var data = { format: "json", video: videoinfo.videoName };
    if (showNotes || showMetadata) data["metadata"] = "1";
  
    
    // Loading video tag/event data
    // GET request that sends a video ID and data_type to receive a json
    // json includes information about all event files related to the current video 
    // videoID obtained from URL as GET parameter, dataType entered as argument when called in labelbee_page.html
    $.ajax({
      url: url_for("rest/v2/videodata"),
      method: 'get',
      data: {video_id : this.videoID, data_type: dataType, allusers:this.showAll}, 
      dataType: 'json',
      error: typesetAjaxError(
        "ERROR in EventsFromServer dialog",
        function (html) {
          div.find(".modal-message h4").text(html);
        }
      ),
      success: function(json){
      console.log("EventsFromServerDialog: (ajax) Load"+ this.dataType +"files data from server: Success", json);
        html =
        "<table id='TagOrEventFileListFromServer' style='width:100%'>" +
        "<thead>" +
        "<th></th>" +
        "<th>File Name</th>" +
        "<th>Created on</th>" +
        "<th>Owner</th></thead>" +
        "</table>";
        html += "<br><br><h4>WARNING: If another " + dataType + " file is currently loaded, unsaved changes may be lost.<h4>";
        // console.log("HTML produced from database response:\n", html);
        
        // Creating table with only headers
        div.find(".modal-body").html(html);
        div.find(".modal-message h4").html("");
        // Filling empty table using data from json
        div.find("#TagOrEventFileListFromServer").DataTable({
          data: json["data"],
          columns:[
            {data:"id", render: function(id){
              return "<button onclick='eventsFromServerDialog.loadEvents("+id+")'>Load</button>";
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
    

      // $.ajax({
      //   url: url_for("/rest/events/"),
      //   type: "GET",
      //   contentType: "application/json",
      //   //data:{format:'json'}, // Without 'video', list all videos
      //   data: data,
      //   success: function (json) {
      //     // Get the file list in JSON format

      //     console.log("EventsFromServerDialog: ajax SUCCESS\ntracksList=", json);
      //     theDialog.json = json;

      //     let html = "";
      //     if (false) {
      //       for (let item of json) {
      //         html +=
      //           '<button onclick="eventsFromServer(' +
      //           "'" +
      //           item["uri"] +
      //           "'" +
      //           ')">' +
      //           item["filename"] +
      //           "</button> <br>";
      //       }
      //     } else {
      //       html +=
      //         "<table class='eventFiles'><thead>" +
      //         "<th></th>" +
      //         "<th>Video</th>" +
      //         "<th>Created on</th>" +
      //         "<th>Owner</th>";
      //       if (showNotes) {
      //         html += "<th>Notes</th>";
      //       }
      //       if (showMetadata) {
      //         html += "<th>Info</th>";
      //         html += "<th>Filename</th>";
      //         html += "<th>Based on</th>";
      //       }
      //       html += "</thead><tbody>";
      //       function boldize(text, flag) {
      //         if (flag) {
      //           return "<b>" + text + "</b>";
      //         } else return text;
      //       }
      //       function formattimestamp(timestamp) {
      //         if (timestamp.length == 12) {
      //           return (
      //             "20" +
      //             timestamp.slice(0, 2) +
      //             "-" +
      //             timestamp.slice(2, 4) +
      //             "-" +
      //             timestamp.slice(4, 6) +
      //             " " +
      //             timestamp.slice(6, 8) +
      //             ":" +
      //             timestamp.slice(8, 10) +
      //             ":" +
      //             timestamp.slice(10, 12)
      //           );
      //         } else return timestamp;
      //       }
      //       for (let k in json) {
      //         json[k].k = k;
      //       }
      //       for (let k in json) {
      //         var item = json[k];
      //         html +=
      //           '<tr data-row="' +
      //           k +
      //           '">' +
      //           '<td id="' +
      //           item["filename"] +
      //           '"><button onclick="eventsFromServerDialog.loadEvents(' +
      //           k +
      //           ')">' +
      //           k +
      //           " Load</button></td>" +
      //           "<td>" +
      //           boldize(item["video"], item["video"] == videoinfo.videoName) +
      //           "</td>" +
      //           "<td>" +
      //           formattimestamp(item["timestamp"]) +
      //           "</td>" +
      //           "<td>U" +
      //           item["user_id"] +
      //           " " +
      //           item["user_name"] +
      //           " </td>";
      //         if (showNotes) {
      //           let notes = "";
      //           let metadata = item["metadata"];
      //           if (metadata && metadata["notes"]) {
      //             notes = metadata["notes"];
      //           }
      //           html += '<td class="metadata-notes">' + notes + "</td>";
      //         }
      //         if (showMetadata) {
      //           let info = "";
      //           let basedon = "";
      //           let metadata = item["metadata"];
      //           if (metadata) {
      //             info +=
      //               '<button class="btn btn-xs" onclick="eventsFromServerDialog.showMetadata(' +
      //               k +
      //               ')">Show</button>';
      //             var history = metadata["history"];
      //             if (history) {
      //               for (let h of history) {
      //                 if (h["filename"]) {
      //                   let kk = json.find(
      //                     (el) => el["filename"] == h["filename"]
      //                   );
      //                   if (kk != null)
      //                     basedon +=
      //                       '<div class="basedon" data-basedon="' +
      //                       kk.k +
      //                       '">' +
      //                       kk.k +
      //                       "</div>";
      //                 }
      //               }
      //             }
      //           }
      //           html += "<td>" + info + "</td>";
      //           html += "<td>" + item["filename"] + "</td>";
      //           html += "<td>" + basedon + "</td>";
      //         }
      //         html += "</tr>";
      //       }
      //       html += "</tbody></table>";
      //     }
      //     div.find(".modal-body").html(html);
      //     div.find(".modal-message").html("");

      //     div
      //       .find(".modal-body div.basedon")
      //       .mouseover(function () {
      //         var k = $(this).attr("data-basedon");
      //         div
      //           .find('.modal-body tr[data-row="' + k + '"]')
      //           .toggleClass("active", true);
      //       })
      //       .mouseout(function () {
      //         div.find(".modal-body tr").toggleClass("active", false);
      //       });

          // Nothing else to do here:
          // The modal #loadTracksFromServerDialog is supposed to be open
          // and filled with links to each Track file
          // Clicking on one of the link will trigger eventsFromServer()
        // },
      //   error: typesetAjaxError(
      //     "ERROR in EventsFromServer dialog",
      //     function (html) {
      //       div.find(".modal-message").html(html);
      //     }
      //   ),
      // });
    };
  this.openDialog = function (dataType) {
    // Default value for show all checkbox
    this.showAll = "false";

    // Setting data type according to which button user used to open dialog(function parameter on html side)
    console.log("EventsFromServerDialog.openDialog('"+dataType+"')");
    this.dataType = dataType;
    if (dataType=="tag"){
      $("#EventDropdownMenu").html("");
    }
    else{
      $("#EventDropdownMenu").html(
        "Select type of event: " +
        "<select id='EventDropdownElement' onchange='eventsFromServerDialog.updateDialog(this.value);'>" +
          "<option value='tag'>tag</option>" +
          "<option value='event' selected='selected'>event</option>" +
          "<option value='flowers'>flowers</option>"+
        "</select>");
    }
    //Extracting GET parameters from URL
    var getParams = new URLSearchParams(window.location.search);
    if (!getParams){
      console.log("Error obtaining any parameters from URL");
    }
    this.videoID = getParams.get('video')
    if (!this.videoID){
      console.log("Error obtaining GET parameter \"video\"");
    }
    else{
      console.log("EventsFromServerDialog: Video ID obtained from URL:", this.videoID);
    }

    // Loading video file name for dialog window title
    $.ajax({
      url: url_for("/rest/v2/get_video/" + this.videoID),
      method: 'get',
      data: "", 
      dataType: 'json',
      error: function (){
          div.find(".modal-message h4").css("color","red");
          div.find(".modal-message h4").html("ERROR: Invalid Video ID.");
        },
      success: function(json){
        div
          .find(".modal-title")
          .html(dataType.charAt(0).toUpperCase() + dataType.slice(1) + " Files for " + json["data"]["file_name"]);
      }
    });
    
    // Resetting checkbox to unchecked 
    div.find("#showAllUsers").prop('checked', false);

    div.find(".modal-body").html("[...]");
    div.find(".modal-message h4").html("Loading " + dataType + " file list from server. Please wait...");

    this.updateDialog(dataType);

    div.modal("show");
  };

  this.closeDialog = function () {
    div.modal("hide");
  };

  this.loadEvents = function (tag_event_ID) {
    //MODIFY CONSOLE MESSAGE DEPENDING ON FILE
    console.log("eventsFromServerDialog: importing " + this.dataType + "s from database for ID '" + tag_event_ID);
    $(".modal-message h4").css("color","black");
    $(".modal-message h4").html("Loading " + this.dataType + "s from database for ID " + tag_event_ID + "...");
    // Load tag or event file
    if(this.dataType== "tag"){      // Case: tag file
      success = tagsFromServer(tag_event_ID, div);
      
      // Confirmation or error message after attempting to load
      if (success){
        $(".modal-message h4").css("color","black");
        $('.modal-message h4').html("Tags loaded successfully.");
      }
      else{
        $(".modal-message h4").css("color","red");
        $('.modal-message h4').html("ERROR" + " <br> " + "setTags: Invalid tag information obtained from server.");
      }
    }
    else{                           // Case: event file
      //Sending GET request to flask API to retrieve json containing annotation data
      $.ajax({
        url: url_for("rest/v2/get_video_data/" + tag_event_ID), // url to tag/event file
        type: "GET", //passing data as get method
        contentType: "application/json", // returning data as json
        data: "",
        success: function (json) {
          //alert("success");  //response from the server given as alert message

          console.log("loadEvents: Loaded events data:", json["data"]["data"]);
          // Case: event file
          try{
            var obj = JSON.parse(json["data"]["data"]);
          }
          catch{
            $(".modal-message h4").css("color","red");
            $('.modal-message h4').html("ERROR <br> EventsFromServerDialog.loadEvents: Unable to parse json file.")
          }
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
          
          // Confirmation or error message after attempting to load
          if(success){
            $(".modal-message h4").css("color","black");
            $(".modal-message h4").html("Events loaded successfully.")
          }
          else{
            $(".modal-message h4").css("color","red");
            $('.modal-message h4').html("ERROR <br> setTracks: Invalid event information obtained from server.")
          }          
        },
        error:  function () {
          $(".modal-message h4").css("color","red");
          $(".modal-message h4").html("ERROR in loading file ID" + tag_event_ID);
          },
      });
    }
  };
  this.clickedShowAllUsers = function () {
    if ($("#showAllUsers").prop('checked')){
      this.showAll = "True";
    }
    else{
      this.showAll = "false";
    }
    this.updateDialog(this.dataType);
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

}

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
    this.setMessage("");
    this.setBody("");
  }

  this.openDialog = function(){
    $("#from-server-dialog").modal("show");
  }

  this.closeDialog = function () {
    $("#from-server-dialog").modal("hide");
  };

  this.openRecentLoadingDialog = function(data_type){
    // videoManager.currentVideoID = 9371; // ONLY FOR DEV PURPOSES! COMMENT WHEN DEPLOYING TO LIVE SERVICE
    this.data_type = data_type;
    this.resetAllHTML();
    this.setTitle("Most recent " + data_type + " file for " + videoinfo.videoPath + '/' + videoinfo.name);
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
      url: url_for("rest/v2/videodata"),
      method: 'get',
      data: {video_id : videoManager.currentVideoID, data_type: data_type}, 
      dataType: 'json',
      error: typesetAjaxError(
        "ERROR in FromServerDialog.openRecentLoadingDialog",
        function (html) {
          this.setMessage("red", html)
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
    this.setTitle("Advanced " + this.data_type + " loading menu for " + videoinfo.videoPath + '/' + videoinfo.name);
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
      url: url_for("rest/v2/videodata"),
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
        div.find("#TagOrEventFileListFromServer").DataTable({
          data: json["data"],
          columns:[
            {data:"id", render: function(id){
              return "<button onclick='eventsFromServerDialog.loadEvents("+id+")'>Load</button>";
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
  // this.updateDialog = function (dataType) {
    
  //   // Loading video tag/event data
  //   // GET request that sends a video ID and data_type to receive a json
  //   // json includes information about all event files related to the current video 
  //   // videoID obtained from URL as GET parameter, dataType entered as argument when called in labelbee_page.html
  //   $.ajax({
  //     url: url_for("rest/v2/videodata"),
  //     method: 'get',
  //     data: {video_id : this.videoID, data_type: dataType}, 
  //     dataType: 'json',
  //     error: typesetAjaxError(
  //       "ERROR in EventsFromServer dialog",
  //       function (html) {
  //         div.find(".modal-message h4").css("color","red");
  //         div.find(".modal-message h4").html(html);
  //       }
  //     ),
  //     success: function(json){
  //       try {
  //         console.log("recentTagOrEventFromServerDialog: (ajax) Load most recent "+ dataType +"file from server: Success", json);

  //         theDialog.json = json["data"];
  //         // Building table HTML
  //         let html = "";
  //         html +=
  //         "<table id='RecentFromServerTable' style='width:100%'><thead>" +
  //         "<th>File Name</th>" +
  //         "<th>Created on</th>" +
  //         "<th>Owner</th>";
  //         // if (showNotes) {
  //           // html += "<th>Notes</th>";
  //         // }
  //         // if (showMetadata) {
  //           // html += "<th>Info</th>";

  //           // html += "<th>Based on</th>";
  //         // }
  //         html += "</thead><tbody>";
  //         fileData = json["data"][0];
  //         // console.log(fileData);
  //         html +=
  //           '<tr data-row="' +
  //           0 +
  //           '">' +
  //           "<td>" +
  //           fileData["file_name"] +
  //           "</td>" +
  //           "<td>" +
  //           fileData["timestamp"].split("T").join(' ') +
  //           "</td>" +
  //           "<td>" +
  //           '['+fileData["created_by_id"]+'] ' + fileData["created_by"] +
  //           "</td>";
  //         html += "</tr>";
  //           // if (showNotes) {
  //           //   let notes = "";
  //           //   let metadata = item["metadata"];
  //           //   if (metadata && metadata["notes"]) {
  //           //     notes = metadata["notes"];
  //           //   }
  //           //   html += '<td class="metadata-notes">' + notes + "</td>";
  //           // }
  //           // if (showMetadata) {
  //           //   let info = "";
  //           //   let basedon = "";
  //           //   let metadata = item["metadata"];
  //           //   if (metadata) {
  //           //     info +=
  //           //       '<button class="btn btn-xs" onclick="eventsFromServerDialog.showMetadata(' +
  //           //       k +
  //           //       ')">Show</button>';
  //           //     var history = metadata["history"];
  //           //     if (history) {
  //           //       for (let h of history) {
  //           //         if (h["filename"]) {
  //           //           let kk = json.find(
  //           //             (el) => el["filename"] == h["filename"]
  //           //           );
  //           //           if (kk != null)
  //           //             basedon +=
  //           //               '<div class="basedon" data-basedon="' +
  //           //               kk.k +
  //           //               '">' +
  //           //               kk.k +
  //           //               "</div>";
  //           //         }
  //           //       }
  //           //     }
  //           //   }
  //           //   html += "<td>" + info + "</td>";
  //           //   html += "<td>" + item["filename"] + "</td>";
  //           //   html += "<td>" + basedon + "</td>";
  //           // }
  //         html += "</tbody></table><br>";
  //         html += "<h4>Do you wish to load this " + dataType + " file?</h4>";
  //         html += '<button onclick="recentTagOrEventFromServerDialog.loadEvents(\'0\')" class="btn btn-success btn-lg">Yes</button> '
  //         html += '<button type="button" class="btn btn-danger btn-lg" data-dismiss="modal">No</button>';
  //         html += "<br><br><h4>WARNING: If another " + dataType + " file is currently loaded, unsaved changes may be lost.<h4>";
  //         // console.log("HTML produced from database response:\n", html);
          
  //         // Filling html with ajax result
  //         div.find(".modal-body").html(html);
  //         div.find(".modal-message h4").html("");
  //       }
  //       catch{
  //         div.find(".modal-body").html("<h3 style='color:red;'>Current user has not recently worked with "+dataType+"s.<br>\
  //         Please use the advanced " + dataType + " loading menu.</h3>")
  //         div.find(".modal-message h4").html("")
  //       }
  //     }
  //   });
    

  //     // $.ajax({
  //     //   url: url_for("/rest/events/"),
  //     //   type: "GET",
  //     //   contentType: "application/json",
  //     //   //data:{format:'json'}, // Without 'video', list all videos
  //     //   data: data,
  //     //   success: function (json) {
  //     //     // Get the file list in JSON format

  //     //     console.log("EventsFromServerDialog: ajax SUCCESS\ntracksList=", json);
  //     //     theDialog.json = json;

  //     //     let html = "";
  //     //     if (false) {
  //     //       for (let item of json) {
  //     //         html +=
  //     //           '<button onclick="eventsFromServer(' +
  //     //           "'" +
  //     //           item["uri"] +
  //     //           "'" +
  //     //           ')">' +
  //     //           item["filename"] +
  //     //           "</button> <br>";
  //     //       }
  //     //     } else {
  //     //       html +=
  //     //         "<table class='eventFiles'><thead>" +
  //     //         "<th></th>" +
  //     //         "<th>Video</th>" +
  //     //         "<th>Created on</th>" +
  //     //         "<th>Owner</th>";
  //     //       if (showNotes) {
  //     //         html += "<th>Notes</th>";
  //     //       }
  //     //       if (showMetadata) {
  //     //         html += "<th>Info</th>";
  //     //         html += "<th>Filename</th>";
  //     //         html += "<th>Based on</th>";
  //     //       }
  //     //       html += "</thead><tbody>";
  //     //       function boldize(text, flag) {
  //     //         if (flag) {
  //     //           return "<b>" + text + "</b>";
  //     //         } else return text;
  //     //       }
  //     //       function formattimestamp(timestamp) {
  //     //         if (timestamp.length == 12) {
  //     //           return (
  //     //             "20" +
  //     //             timestamp.slice(0, 2) +
  //     //             "-" +
  //     //             timestamp.slice(2, 4) +
  //     //             "-" +
  //     //             timestamp.slice(4, 6) +
  //     //             " " +
  //     //             timestamp.slice(6, 8) +
  //     //             ":" +
  //     //             timestamp.slice(8, 10) +
  //     //             ":" +
  //     //             timestamp.slice(10, 12)
  //     //           );
  //     //         } else return timestamp;
  //     //       }
  //     //       for (let k in json) {
  //     //         json[k].k = k;
  //     //       }
  //     //       for (let k in json) {
  //     //         var item = json[k];
  //     //         html +=
  //     //           '<tr data-row="' +
  //     //           k +
  //     //           '">' +
  //     //           '<td id="' +
  //     //           item["filename"] +
  //     //           '"><button onclick="eventsFromServerDialog.loadEvents(' +
  //     //           k +
  //     //           ')">' +
  //     //           k +
  //     //           " Load</button></td>" +
  //     //           "<td>" +
  //     //           boldize(item["video"], item["video"] == videoinfo.videoName) +
  //     //           "</td>" +
  //     //           "<td>" +
  //     //           formattimestamp(item["timestamp"]) +
  //     //           "</td>" +
  //     //           "<td>U" +
  //     //           item["user_id"] +
  //     //           " " +
  //     //           item["user_name"] +
  //     //           " </td>";
  //     //         if (showNotes) {
  //     //           let notes = "";
  //     //           let metadata = item["metadata"];
  //     //           if (metadata && metadata["notes"]) {
  //     //             notes = metadata["notes"];
  //     //           }
  //     //           html += '<td class="metadata-notes">' + notes + "</td>";
  //     //         }
  //     //         if (showMetadata) {
  //     //           let info = "";
  //     //           let basedon = "";
  //     //           let metadata = item["metadata"];
  //     //           if (metadata) {
  //     //             info +=
  //     //               '<button class="btn btn-xs" onclick="eventsFromServerDialog.showMetadata(' +
  //     //               k +
  //     //               ')">Show</button>';
  //     //             var history = metadata["history"];
  //     //             if (history) {
  //     //               for (let h of history) {
  //     //                 if (h["filename"]) {
  //     //                   let kk = json.find(
  //     //                     (el) => el["filename"] == h["filename"]
  //     //                   );
  //     //                   if (kk != null)
  //     //                     basedon +=
  //     //                       '<div class="basedon" data-basedon="' +
  //     //                       kk.k +
  //     //                       '">' +
  //     //                       kk.k +
  //     //                       "</div>";
  //     //                 }
  //     //               }
  //     //             }
  //     //           }
  //     //           html += "<td>" + info + "</td>";
  //     //           html += "<td>" + item["filename"] + "</td>";
  //     //           html += "<td>" + basedon + "</td>";
  //     //         }
  //     //         html += "</tr>";
  //     //       }
  //     //       html += "</tbody></table>";
  //     //     }
  //     //     div.find(".modal-body").html(html);
  //     //     div.find(".modal-message").html("");

  //     //     div
  //     //       .find(".modal-body div.basedon")
  //     //       .mouseover(function () {
  //     //         var k = $(this).attr("data-basedon");
  //     //         div
  //     //           .find('.modal-body tr[data-row="' + k + '"]')
  //     //           .toggleClass("active", true);
  //     //       })
  //     //       .mouseout(function () {
  //     //         div.find(".modal-body tr").toggleClass("active", false);
  //     //       });

  //         // Nothing else to do here:
  //         // The modal #loadTracksFromServerDialog is supposed to be open
  //         // and filled with links to each Track file
  //         // Clicking on one of the link will trigger eventsFromServer()
  //       // },
  //     //   error: typesetAjaxError(
  //     //     "ERROR in EventsFromServer dialog",
  //     //     function (html) {
  //     //       div.find(".modal-message").html(html);
  //     //     }
  //     //   ),
  //     // });
  //   };
  // this.openDialog = function (dataType) {
  //   console.log("RecentTagOrEventFromServerDialog.openDialog('"+dataType+"')");
  //   this.dataType = dataType;
  //   this.videoID = videoManager.currentVideoID
  //   if (!this.videoID){
  //     console.log("Error obtaining GET parameter \"video\"");
  //   }
  //   else{
  //     console.log("RecentTagOrEventFromServerDialog: Video ID obtained from URL:", this.videoID);
  //   }

  //   // Loading video file name for dialog window title
  //   // WILL BE REPLACED ONCE NEW VIDEOLIST IMPLEMENTATION IS WORKING
  //   $.ajax({
  //     url: url_for("/rest/v2/get_video/" + this.videoID),
  //     method: 'get',
  //     data: "", 
  //     dataType: 'json',
  //     error: function (){
  //         div.find(".modal-message h4").css("color","red");
  //         div.find(".modal-message h4").html("ERROR: Invalid Video ID.");
  //       },
  //     success: function(json){
  //       div
  //         .find(".modal-title")
  //         .html("Most Recent " + dataType.charAt(0).toUpperCase() + dataType.slice(1) + " File for " + json["data"]["file_name"]);
  //     }
  //   });
    
  //   div.find(".modal-body").html("[...]");
    
  //   div.find(".modal-message h4").css("color","black");
  //   div.find(".modal-message h4")
  //     .html("<div>Loading Tracks file list from server. Please wait...</div>"); //MODIFY DEPENDING ON TYPE OF FILE BEING LOADED

  //   this.updateDialog(dataType);

  //   div.modal("show");
  // };
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
    var tag_event_ID = theDialog.json[k]["id"];

    //MODIFY CONSOLE MESSAGE DEPENDING ON FILE
    console.log("RecentTagOrEventFromServerDialog: importing " + this.dataType + "s from database for file ID '" + tag_event_ID + "'...");
    
    div.find(".modal-message h4").css("color","black");
    div.find(".modal-message h4").html("Loading " + this.dataType + "s from database for file ID " + tag_event_ID + "...");
    // Load tag or event file
    if(this.data_type== "tag"){      // Case: tag file
      success = tagsFromServer(tag_event_ID, this.div);
      if(success){
        fromServerDialog.basedOn = tag_event_ID;
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
        url: url_for("rest/v2/get_video_data/" + tag_event_ID), // url to tag/event file
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

          // Close dialogue window
          if(success){
            fromServerDialog.basedOn = tag_event_ID;
            div.find(".modal-message h4").css("color","black");
            div.find(".modal-message h4").html("Events loaded.");
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
    data: { format: "json", video: videoinfo.videoName },
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
            boldize(item["video"], item["video"] == videoinfo.videoName) +
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

function eventsFromServer(url) {
  console.log("eventsFromServer: importing Tracks from URL '" + url + "'...");

  $.ajax({
    url: url, //server url
    type: "GET", //passing data as post method
    contentType: "application/json", // returning data as json
    data: "",
    success: function (json) {
      //alert("success");  //response from the server given as alert message

      console.log("eventsFromServer: SUCCESS\njson=", json);
      let obj = JSON.parse(json);

      setTracks(obj);

      videoControl.onFrameChanged();

      refreshChronogram();

      $("#loadTracksFromServerDialog").modal("hide");
    },
    error: showAjaxError("ERROR in eventsFromServer"),
  });
}

function mainAlert(text) {
  $("#mainAlertDialog .modal-body").html(text);
  $("#mainAlertDialog").modal("show");
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
function showAjaxError(title, prehook) {
  var callback = function (jqXHR, textStatus, errorThrown) {
    console.log(
      "AJAX ERROR: " + title,
      jqXHR,
      textStatus,
      errorThrown,
      jqXHR.responseText
    );
    if (prehook) {
      prehook(jqXHR, textStatus, errorThrown);
    }
    mainAlert(
      title +
        "<br>Status: " +
        textStatus +
        "<br>Error: " +
        errorThrown +
        "<br>" +
        jqXHR.responseText
    );
  };
  return callback;
}

function eventsToServer(format) {
  var route = "/rest/v2/add_video_data";

  console.log("eventsToServer");

  if (!format) {
    format = "v1";
  }

  let data;
  // if (format == "v2") {
  //   data = convertTracksToV2();
  // } 
  // else {
  //   data = convertTracksToV1();
  // }
  data = {
      video_id: videoManager.currentVideoID,
      created_by_id: "1",
      data_type:"tag",
      path:"testPath",
      file_name:"testFileName",
      created_from: fromServerDialog.basedOn,
      data: "test"
    }
  $.ajax({
    url: url_for(route), //server url
    type: "POST", //passing data as post method
    contentType: "application/json", // returning data as json
    data: JSON.stringify(data) , //form values OLD : JSON.stringify({ video: videoinfo.videoName, data: data })
    success: function (json) {
      alert("Save Events JSON (" + format + ") to server: Success " + json['data']['data']['created_by_id']); //response from the server given as alert message
      console.log(json)
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

  $.getJSON(url_for("rest/v2/get_video_data/" + tagFileID), function () {
    console.log('tagsFromServer: loaded tag file with ID "' + tagFileID + '"');
    statusWidget.statusUpdate("tagsLoad", true, "");
  })
    .fail(function () {
      console.log('tagsFromServer: ERROR loading tag file with ID "' + tagFileID + '"');
      statusWidget.statusUpdate("tagsLoad", false, "");
      return setTags([], div);
    })
    .done(function (data) {
      tags = data["data"]["data"];
      console.log("Loaded tag data:", tags)
      if (tags == null){
        fromServerDialog.setMessage("red", "ERROR: Tag data stored in server is null.");
        return
      }
      return setTags(tags, div);
    });
}

// function tagsFromServer(videoID){
//   tagLoadDialog = new FilePickerFromServerDialog();
//   tagLoadDialog.openDialog();

// }


/* METADATA EDITION */

function onChanged_events_notes(event) {
  if (TracksInfo) {
    TracksInfo["notes"] = $("#events-notes").val();
  }
}
function updateEventsNotes() {
  if (TracksInfo) {
    $("#events-notes").val(TracksInfo["notes"]);
  }
}

