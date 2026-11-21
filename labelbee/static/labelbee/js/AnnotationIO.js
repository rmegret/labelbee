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

// ## Annotations control (confirm and prompt dialogs, called by the template buttons; they wait for step 9 of slice 8)

function eraseEvents() {
  var r = confirm(
    "Are you sure you want to ERASE all manual annotations (Tracks)?"
  );
  if (r == true) {
    console.log("ERASING all Tracks...");
    loadTracks([]);
  } else {
    console.log("User CANCELED Erase Tracks ...");
  }
}
function eraseTags() {
  var r = confirm("Are you sure you want to ERASE all Tags?");
  if (r == true) {
    console.log("ERASING all Tags...");
    loadTags({});
  } else {
    console.log("User CANCELED Erase Tags ...");
  }
}

async function clickLoadTracksCSVFromServer() {
  console.log("clickLoadTracksCSVFromServer: loading .tracks.csv from URL");
  const url = prompt("Enter tracks URL", url_for("/data")+"/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv");
  if (url == null || url == "") {
    console.log("clickLoadTracksCSVFromServer: no URL entered");
    return;
  }
  return loadCSVFromServer(url, "tracks");
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
  return loadCSVFromServer(tracksURL, "tracks_tagged")
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
    const picker = this;
    this.filePicker = new FilePickerFromServerDialog();
    this.filePicker.initDialog({
      base_uri: url_for("/api/v1/rawdata/"),
      loadFileFunction: function (uri) {
        return picker.loadCSV(uri);
      },
      schemaProvider: {
        categories: () => CsvSchemas.categories(),
        classify: (uri) => {
          const schema = CsvSchemas.classifyFilename(uri);
          return schema ? { key: schema.key, label: schema.label, loadable: schema.loader != null } : null;
        },
        inspect: (uri) => CsvSchemas.inspectUri(uri),
      },
      dialogName: "Load tracks CSV Manually",
    });
  }
  // Detect the schema from the suffix and the header, validate, then run the loader of that schema
  async loadCSV(uri) {
    const dialog = this.filePicker;
    let res;
    try {
      res = await dialog.validateFile(uri);
    } catch (e) {
      return; // validateFile showed the error
    }
    if (!res.canLoad) {
      printMessage($("<div>").text("Cannot load " + res.filename + ": " + res.message).html(), "red");
      return;
    }
    if (res.status !== "ok" &&
        !confirm(res.message + "\n\nLoad it as \"" + res.chosen.label + "\"?")) {
      return;
    }
    console.log("EventsCSVManualFilePicker: loading", uri, "as", res.chosen.key);
    try {
      await loadCSVFromServer(uri, res.chosen.loader);
    } catch (e) {
      return; // reportLoadError already showed it
    }
    dialog.div.find(".modal-message").append($("<div>").text("Loaded as " + res.chosen.label + "."));
  }
  open() {
    this.filePicker.openDialog();
  }
  close() {
    this.filePicker.closeDialog();
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
    this.setTitle("Most recent " + data_type + " file for " + getVideoInfo().videoPath);
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
    this.setTitle("Advanced " + this.data_type + " loading menu for " + getVideoInfo().videoPath);
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
      success = tagsFromServer(tag_event_ID);
      if(success){
        theDialog.basedOn = tag_event_ID;
        div.find(".modal-message h4").css("color","black");
        div.find('.modal-message h4').html("Tags loaded successfully.")        
      }
      else{
        div.find(".modal-message h4").css("color","red");
        div.find('.modal-message h4').html("ERROR <br> loadTags: Invalid tag information obtained from server.")
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
          success = loadTracks(obj);
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

          if(success){
            console.log("Loaded event. ID:", tag_event_ID)
            theDialog.basedOn = tag_event_ID;
            fromServerDialog.setMessage("black","Events loaded.");
          }
          else{
            div.find(".modal-message h4").css("color","red");
            div.find('.modal-message h4').html("ERROR <br> loadTracks: Invalid event information obtained from server.");
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

// The loaders, loadTracks/loadTags, mainAlert, the AJAX errors and eventsToServer are in annotation/Load.js and
// annotation/ServerIO.js (slice 8 step 6b)
