/*jshint esversion: 6, asi: true */

////////////////////////////////////////////////////////////////////////////////
// Global variables
var canvas,
  canvas1,
  ctx,
  ctx2,
  vid,
  radius = 5,
  dragging = false,
  final_id = 0;
var x, y, cx, cy, width, height;
var user_id;

//var vis;

/** Debugging levels */
var logging = {
  rects: false,
  frameEvents: false,
  guiEvents: false,
  submitEvents: false,
  mouseEvents: false,
  mouseMoveEvents: false,
  keyEvents: false,
  overlay: false,
  selectionEvents: false,
  chrono: false,
  videoEvents: false,
  canvasEvents: false,
  idPrediction: false,
  axesEvents: false,
  zoomTag: false,
  zoomOverlay: false,
  videoList: false,
  io: false,
};

// ######################################################################
// INITITALIZATION

/** Global init */
function init(videoID, tagID) {
  // Parameter passed through HTML Jinja template
  if (http_script_name_0) {
    http_script_name = http_script_name_0;
  } else {
    http_script_name = "/";
  }

  statusWidget = new StatusWidget();

  // import * from "VideoList.js";
  videoManager = new VideoManager();

  // import * from "VideoNavigation";
  videoControl = new VideoControl("video"); // Attach control to #video
  // Polyfill to get a global getCurrentFrame
  getCurrentFrame = videoControl.getCurrentFrame.bind(videoControl);

  // import * from "OverlayControl.js";
  overlay = new OverlayControl("canvas");

  // import * from "ChronoControl.js";
  initChrono();

  // import * from "AnnotationIO.js"
  initAnnotationIO();

  // ## Control panel
  // import * from "SelectionControl.js"
  initSelectionControl();

  // Need collapsible before ZoomView
  $(".collapsible").accordion({
    collapsible: true,
    active: false,
    heightStyle: "content",
    animate: false,
    //         activate: function( event, ui ) {
    //           // Disable focus on tab header
    //           var header = $("label.ui-accordion-header",event.target)
    //           console.log("header=",header);
    //           header.removeAttr("tabindex");
    //         }
  });
  $(".collapsible.default-active").accordion({
    active: 0,
  });
  //$('.collapsible>.ui-accordion-header').removeAttr("tabindex");

  // Make button rows collapsible
  $(".inline-collapsible > .block-header").prepend(
    "<span class='glyphicon collapse-arrow'></span> "
  );
  $(".inline-collapsible > .block-header").on("click", function (e) {
    //console.log(e)
    let header = $(e.currentTarget); //$(".block-header", $(e.currentTarget).parent())
    let content = $("> .block-content", header.parent());
    content.toggle();
    header.toggleClass("collapsed", content.is(":hidden"));
    header.parent().toggleClass("collapsed", content.is(":hidden"));
    if (header.hasClass("collapsed")) {
      header.parent().trigger("collapsiblecollapse", e);
    } else {
      header.parent().trigger("collapsibleexpand", e);
    }
    console.log("DONE\n\n");
  });

  $(".sortable").sortable({
    connectWith: ".sortable",
    handle: "> label, > .block-header",
  });
  //$( ".sortable" ).disableSelection();

  // import * from "ZoomView.js";
  initZoomView();

  // Note: zoomOverlay.selectionChanged is already bound
  $(selectionControl).on({
    "tagselection:created": zoomOverlay.selectionChanged,
    "selection:created": zoomOverlay.selectionChanged,
    "tagselection:cleared": zoomOverlay.selectionChanged,
    "selection:cleared": zoomOverlay.selectionChanged,
  });
  $(overlay).on({
    "object:moving": zoomOverlay.selectionChanged,
    "object:modified": zoomOverlay.selectionChanged,
  });
  //$(selectionControl).on({
  //    'selection:created':    ()=>{videoControl.refresh()},
  //    'selection:cleared':    ()=>{videoControl.refresh()}
  //  })

  // ## Keyboard control

  // REMI: use keyboard
  //$(window).on("keydown", onKeyDown);
  $("#left-side").attr("tabindex", "0");
  $("#left-side").on("keydown", onKeyDown);

  // ## Misc init

  // Do not trigger first refresh: onloadeddata will call it
  // refresh();
  updateForm(null);
  defaultSelectedBee = undefined;

  //loadEventsFromFile0('data/Tracks-demo.json')

  // // Loading video tag data
  // $.ajax({
  //   url: "rest/v2/videodata",
  //   method: 'get',
  //   data: {video_id : videoID},
  //   dataType: 'json',
  //   success: function(response){
  //   console.log("Load tag data from server: Success");
  //     var videoData = response;
  //   }
  // });



  /* Set defaults */


  // ASK REMI IF WE SHOULD BE LOADING ANY DEFAULT VIDEOS
  // if (video_data !== "None" && tag_file !== "None") {
  // videoManager.addDefaultVideo(video_data, tag_file); 
  // }
  // videoManager.selectVideoByID(0);

  //Will trigger videoControl.onVideoLoaded
  onTrackWindowChanged(); // to compute track window params

  whoami(); // Refresh user status

  window.onbeforeunload = function (e) {
    console.log("Leaving...");
    var confirmationMessage =
      "If you leave this page, all unsaved annotations will be lost. Are you sure?";

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
  };

  // Done
  setTracks([]);

  loginDialog = new LoginDialog();
}

function printMessage(html, color) {
  if (typeof color === "undefined") color = "black";

  $("#alerttext").html(html);
  $("#alerttext").css("color", color);

  if (html !== "") console.log("MESSAGE: %c" + html, "color:" + color);
}

function htmlCheckmark(flag) {
  let checkStr = "<span class='gray'>?</span>";
  if (typeof flag != "undefined") {
    if (flag == "requested") checkStr = "<span>&#x231a;</span>";
    else if (flag) checkStr = "<span class='green'>&#x2713;</span>";
    else checkStr = "<span class='red'>&times;</span>";
  }
  return checkStr;
}

function StatusWidget() {
  this.statusInfo = {};

  this.statusRequest = function (type, info) {
    var time = new Date();
    function pad(n, k) {
      var s = String(n);
      while (s.length < (k || 2)) {
        s = "0" + s;
      }
      return s;
    }
    var _hours = time.getHours();
    var _minutes = time.getMinutes();
    var _seconds = time.getSeconds();
    var HMS = pad(_hours) + ":" + pad(_minutes) + ":" + pad(_seconds);
    this.statusInfo[type] = { request: time, info: info };

    //$(".status."+type).html(type+": Requested ["+HMS+"]")
    $(".status." + type).html(
      "<td>" +
        type +
        "</td><td class='tdspacing'>" +
        htmlCheckmark("requested") +
        "</td><td class='col_elapsed'>[@ " +
        HMS +
        "]</td>"
    );
  };
  this.statusUpdate = function (type, success, info) {
    var time = new Date();
    this.statusInfo[type].done = time;
    this.statusInfo[type].info2 = info;
    var elapsed = (time - this.statusInfo[type].request) / 1000;

    if (success) {
      //$(".status."+type).html(type+": Success [elapsed "+elapsed+"s]")
      $(".status." + type).html(
        "<td>" +
          type +
          "</td><td class='tdspacing'>" +
          htmlCheckmark(true) +
          "</td><td class='col_elapsed' >[took  " +
          elapsed +
          "s]</td>"
      );
    } else {
      //$(".status."+type).html(type+": FAILED [elapsed "+elapsed+"s]")
      $(".status." + type).html(
        "<td>" +
          type +
          "</td><td class='tdspacing'>" +
          htmlCheckmark(false) +
          "</td><td class='col_elapsed'></td>"
      );
    }
  };
}

function toggleFullScreen() {
  var main = $(".container.main")[0];
  if (!document.fullscreenElement) {
    main.webkitRequestFullscreen();
  } else {
    if (main.exitFullscreen) {
      main.exitFullscreen();
    }
  }
}

var pathJoin = function (pathArr) {
  return pathArr
    .map(function (path) {
      if (path[0] === "/") {
        path = path.slice(1);
      }
      if (path[path.length - 1] === "/") {
        path = path.slice(0, path.length - 1);
      }
      return path;
    })
    .join("/");
};

function url_for(path) {
  if (path[0] == "/") path = path.slice(1);
  let route = http_script_name + path;
  return route;
}

function FilePickerFromServerDialog() {
  this.dialogName = "FilePickerFromServerDialog";
  this.divId = "#dialog-filepicker-from-server";
  this.route = null;
  this.hideOnSuccess = true;

  var theDialog = this;
  this.div = $(this.divId);
  var div = this.div;
  if (!div.length) {
    console.log(
      "FilePickerFromServerDialog: ERROR, could not find div " + this.divId
    );
  }

  this.updateDialog = function (uri) {
    console.log(
      'FilePickerFromServerDialog: importing file list from URL "' +
        this.route +
        "'..."
    );

    let route = this.route;
    if (!!uri) {
      route = uri;
    }

    var data = { format: "json" };
    $.ajax({
      url: url_for(route),
      type: "GET",
      contentType: "application/json",
      dataType: "json",
      data: data,
      success: function (json) {
        // Get the file list in JSON format

        console.log("FilePickerFromServerDialog: ajax SUCCESS\njson=", json);
        theDialog.json = json;

        if (
          typeof json != "object" ||
          !("files" in json) ||
          !("dirs" in json)
        ) {
          div.find(".modal-body").html("No valid JSON");
          div.find(".modal-message").html("Format error in server response");
          return;
        }

        let listdiv = div.find(".modal-body").html("");

        //let html = ""
        for (let item of json.files) {
          let button = $("<button>" + item["filename"] + "</button>");
          button.attr("data-uri", item["uri"]);
          button.on("click", theDialog.onClickFile);

          listdiv.append(button);
          listdiv.append($("<br>"));

          //html += '<button onclick="filePickerFromServerDialog.onClickFile(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button> <br>'
        }

        for (let item of json.dirs) {
          let button = $("<button>" + item["filename"] + "</button>");
          button.attr("data-uri", item["uri"]);
          button.on("click", theDialog.onClickDir);

          listdiv.append(button);
          listdiv.append($("<br>"));

          //html += '<button onclick="filePickerFromServerDialog.onClickDir(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button> <br>'
        }

        div.find(".dir-uri-text").val(route);

        div.find(".modal-message").html("");

        // Nothing else to do here:
        // The modal #loadTracksFromServerDialog is supposed to be open
        // and filled with links to each Track file
        // Clicking on one of the link will trigger eventsFromServer()
      },
      error: typesetAjaxError(
        "FilePickerFromServerDialog: ERROR",
        function (html) {
          div.find(".modal-message").html(html);
        }
      ),
    });
  };
  this.openDialog = function () {
    console.log(
      "FilePickerFromServerDialog: openDialog, dialogName=",
      theDialog.dialogName
    );

    if (!div.length) {
      console.log(
        "FilePickerFromServerDialog: ERROR, could not find div " + this.divId
      );
      return;
    }
    if (!theDialog.route) {
      console.log("FilePickerFromServerDialog: no route defined. abort");
      return;
    }

    // Reset it each time we open it
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

    div.find(".dir-uri-btn").off("click").on("click", theDialog.onClickLoad);

    div
      .find(".dir-uri-btn-preview")
      .off("click")
      .on("click", theDialog.onClickPreview);

    div.find(".modal-body").html("[...]");
    div
      .find(".modal-message")
      .html("<div>Loading file list from server. Please wait...</div>");

    div.modal("show");

    this.updateDialog();
  };
  this.initDialog = function (params) {
    // Only internal settings. Nothing stored to DOM dialog
    theDialog.route = params.base_uri;
    theDialog.fileLoadedCallback = params.fileLoadedCallback;

    theDialog.dialogName = params.dialogName
      ? params.dialogName
      : "Pick File from Server";

    if ("hideOnSuccess" in params)
      theDialog.hideOnSuccess = params.hideOnSuccess;
    else theDialog.hideOnSuccess = true;
  };
  this.closeDialog = function () {
    div.find(".dir-uri-btn").off("click");
    div.modal("hide");
    //this.route = null
  };

  this.onClickLoad = function (evt) {
    console.log("FilePickerFromServerDialog: onClickLoad ", evt);
    const uri = div.find(".dir-uri-text").val();

    theDialog.loadFile(uri);
  };
  this.onClickPreview = function (evt) {
    console.log("FilePickerFromServerDialog: onClickPreview ", evt);
    const uri = div.find(".dir-uri-text").val();

    theDialog.previewFile(uri);
  };
  this.onClickFile = function (evt) {
    console.log("FilePickerFromServerDialog: onClickFile ", evt);
    console.log(evt.target);
    const uri = $(evt.target).attr("data-uri");

    div.find(".dir-uri-text").val(uri);
    theDialog.previewFile(null);
    //theDialog.loadFile(uri)
  };
  this.loadFile = function (uri) {
    console.log(
      "FilePickerFromServerDialog: importing file from URL '" + uri + "'..."
    );

    div.find(".modal-message").html("Loading file from " + uri + "...");

    $.ajax({
      url: uri,
      type: "GET", //passing data as post method
      contentType: "plain/text",
      error: showAjaxError(
        "FilePickerFromServerDialog.onClickFile: Ajax ERROR"
      ),
      success: function (content) {
        console.log("FilePickerFromServerDialog: GET " + uri + " ajax SUCCESS");
        console.log("content=", content);

        try {
          theDialog.fileLoadedCallback(uri, content);
        } catch (e) {
          console.log(
            "FilePickerFromServerDialog: error parsing file content. See error:",
            e
          );
          return;
        }

        console.log("FilePickerFromServerDialog: file loaded");
        div.find(".modal-message").html("File loaded.");

        if (theDialog.hideOnSuccess) {
          div
            .find(".modal-message")
            .html("FilePickerFromServerDialog: File loaded. Closing.");
          theDialog.closeDialog();
        }
      },
    });
  };
  this.previewFile = function (uri) {
    console.log(
      "FilePickerFromServerDialog: preview file from URL '" + uri + "'..."
    );
    if (uri == null) {
      div.find(".modal-message").html("");
      return;
    }

    div.find(".modal-message").html("Loading file from " + uri + "...");

    $.ajax({
      url: uri,
      type: "GET", //passing data as post method
      contentType: "plain/text",
      error: showAjaxError(
        "FilePickerFromServerDialog.previewFile: Ajax ERROR"
      ),
      success: function (content) {
        console.log("FilePickerFromServerDialog: GET " + uri + " ajax SUCCESS");
        console.log("content=", content);

        console.log("FilePickerFromServerDialog: file loaded");
        div.find(".modal-message").append($("<pre>").text(content));
      },
    });
  };
  this.onClickDir = function (evt) {
    console.log("FilePickerFromServerDialog: onClickDir " + evt);
    console.log(evt.target);
    const uri = $(evt.target).attr("data-uri");

    console.log("FilePickerFromServerDialog: change directory uri=" + uri);

    theDialog.updateDialog(uri);
  };

  //this.initDialog(params)
}

// ######################################################################
// CONTROLLERS

// ## Keyboard

function onKeyDown_IDEdit(event) {
  if (logging.keyEvents) console.log("onKeyDown_IDEdit: event=", event);
  var key = event.which || event.keyCode;
  if (key == 13) {
    // Enter
    let frame = getCurrentFrame();
    let fieldID = document.getElementById("I");
    let new_id = fieldID.value;

    let activeObject = overlay.getActiveObject();
    if (!activeObject) return;

    if (activeObject.status === "new") {
      activeObject.id = new_id;
      printMessage("ID changed + submitted", "green");
      submit_bee(activeObject);
    } /* status=="db"*/ else {
      let old_id = activeObject.id;
      if (changeObservationID(frame, old_id, new_id)) {
        // Successfull
        activeObject.id = new_id;
        printMessage("ID changed succesfully!", "green");
      } else {
        console.log("onKeyDown_IDEdit: unsuccessfull ID change", {
          object: activeObject,
          old_id: old_id,
          new_id: new_id,
        });
        printMessage("ID not changed", "orange");
      }
      videoControl.refresh();
      refreshChronogram();
    }
  }
}

function onKeyDown_NewIDEdit(event) {
  if (logging.keyEvents) console.log("onKeyDown_NewIDEdit: event=", event);
  var key = event.which || event.keyCode;
  if (key == 13) {
    // Enter
    let frame = getCurrentFrame();
    let fieldID = document.getElementById("newid");
    let new_id = fieldID.value;

    if (new_id == "") {
      new_id = undefined;
    }

    let activeObject = overlay.getActiveObject();

    if (!activeObject) return;

    let obs = activeObject.obs;
    obs.newid = new_id;
    if (new_id != null) {
      if (!obs.fix) {
        obs.fix = {
          newid: undefined,
        };
      }
      obs.fix.newid = new_id;
    }

    if (new_id != null && !hasLabel(obs, "wrongid")) {
      updateObsLabel(obs, "wrongid", true);
    }

    if (activeObject.status === "new") {
      submit_bee(activeObject);
    } /* status=="db"*/ else {
      storeObs(obs);
    }
    overlay.hardRefresh();
    refreshChronogram();
    updateForm(activeObject);
  }
}

function onKeyDown(e) {
  if (logging.keyEvents) console.log("onKeyDown: e=", e);

  if (/textarea|select/i.test(e.target.nodeName) || e.target.type === "text") {
    if (logging.keyEvents)
      console.log("onKeyDown: coming from text field. stopped event");
    e.stopPropagation();
    return;
  }

  if (e.target == document.getElementById("I")) {
    if (e.keyCode == 32 || e.keyCode == 188 || e.keyCode == 190) {
      console.log(
        "onKeyDown: detected keydown happened in textfield #I with keyCode for navigation shortcuts. Canceling it and showing a message."
      );
      printMessage("Editing ID. Press ESC to exit...", "green");
      return false;
    }
  }
  if (e.target.type == "text") {
    if (logging.keyEvents) console.log("keyDown goes to text field");
    return true;
  }
  if (e.key == "Delete" || e.key == "d" || e.key == "Backspace") {
    deleteSelected();
    return false;
  }
  if (e.key == "p") {
    $("#P").prop("checked", !$("#P").prop("checked"));
    $("#P").trigger("change");
    //automatic_sub();
    return false;
  }
  if (e.key == "r" && e.ctrlKey) {
    videoControl.refresh();
    return false;
  }
  switch (e.keyCode) {
    /*        case 32: // Space
            var id_field = document.getElementById("I");
            id_field.focus(); // Facilitate changing the id
            id_field.select();
            return false; // Prevent the event to be used as input to the field
            break;
            */
    case 32: // Space
      if (e.ctrlKey) {
        if (e.shiftKey) videoControl.playPauseVideoBackward(2);
        else videoControl.playPauseVideo(2);
      } else {
        if (e.shiftKey) videoControl.playPauseVideoBackward();
        else videoControl.playPauseVideo();
      }
      return false;
    case 27: // Escape
      //return true;
      var id_field = document.getElementById("I");
      if ($(id_field).is(":focus")) {
        id_field.selectionStart = id_field.selectionEnd;
        id_field.blur();
        return false;
      } else {
        id_field.focus(); // Facilitate changing the id
        id_field.select();
        return false;
      }
      break;
    //case 83: // key S
    //    submit_bee();
    //    if (logging.keyEvents)
    //        console.log("onKeyDown: 'S' bound to submit_bee. Prevented key 'S' to propagate to textfield.")
    //    return false; // Prevent using S in textfield
    case 13: // Enter
      if ($(document.activeElement)[0] == document.body) {
        // No specific focus, process the key
        submit_bee();
      }
      //onKeyDown_IDEdit(e) // Forward to IDedit keydown handler
      //return false;
      return true;
    case 16: // Shift
    case 17: // Ctrl
    case 18: // Alt
    case 19: // Pause/Break
    case 20: // Caps Lock
    case 35: // End
    case 36: // Home
      break;
    case 188: // <
      if (e.ctrlKey && e.shiftKey) videoControl.rewind4();
      else if (e.ctrlKey) videoControl.rewind3();
      else if (e.shiftKey) videoControl.rewind2();
      else videoControl.rewind();
      return false;
    case 190: // >
      if (e.ctrlKey && e.shiftKey) videoControl.forward4();
      else if (e.ctrlKey) videoControl.forward3();
      if (e.shiftKey) videoControl.forward2();
      else videoControl.forward();
      return false;
    // Mac CMD Key
    case 91: // Safari, Chrome
    case 93: // Safari, Chrome
    case 224: // Firefox
      break;
  }
  /*
    let obj = canvas1.getActiveObject();
    if (obj) {
        switch (e.keyCode) {
            case 37: // Left
                if (e.shiftKey && obj.width > 10) {
                    obj.width -= 10;
                    obj.left += 5;
                } else
                    obj.left -= 10;
                obj.setCoords();
                videoControl.refresh();
                return false;
            case 39: // Right
                if (e.ctrlKey) {
                    obj.set("width", parseFloat(obj.get("width")) + 10)
                    obj.set("left", parseFloat(obj.get("left")) - 5)
                } else
                    obj.set("left", parseFloat(obj.get("left")) + 10)
                obj.setCoords();
                videoControl.refresh();
                return false;
            case 38: // Up
                if (e.ctrlKey) {
                    obj.set("height", parseFloat(obj.get("width")) + 10)
                    obj.set("top", parseFloat(obj.get("top")) - 5)
                } else
                    obj.set("top", parseFloat(obj.get("top")) - 10)
                obj.setCoords();
                videoControl.refresh();
                return false;
            case 40: // Down
                obj.set("top", parseFloat(obj.get("top")) + 10)
                obj.setCoords();
                videoControl.refresh();
                return false;
        }
    }
    */
  /*
    if (e.keyCode >= 48 && e.keyCode <= 57) { // Numbers from 0 to 9
        if (!$("#I").is(':focus')) { // If ID not focused, focus it
            $("#I")[0].focus()
            $("#I")[0].select()
                //$("#I").val(e.keyCode-48); // Type in the numerical character
            return true; // Let keycode be transfered to field
        }
    }
    */
}
