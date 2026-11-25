/*jshint esversion: 6, asi: true */

////////////////////////////////////////////////////////////////////////////////
// ES module (refactor slice 8 step 12, ADR 0015): the page globals `canvas`, `canvas1`, `ctx`, `ctx2`, `vid`, `radius`, `dragging`,
// `final_id`, `x`, `y`, `cx`, `cy`, `width`, `height` declared here had no reader (the `radius` of TimelinePicker.js is now its own).
// Page globals (`overlay`, `videoControl`, `events`, `refresh`...) are read at call time; the ones this file builds are assigned on `window`.
// Installed by labelbeeBridge.js (`init`, `printMessage`, `toggleFullScreen`, `onKeyDown_*`).

import { initEventsNotes } from "./form/EventsNotes.js"
import { initFileImport } from "./commands/LoadFromFile.js"
import { initLogin } from "./session/Login.js"
import { initFromServerDialog } from "./dialogs/FromServerDialog.js"
import { initLabelListFromServerDialog } from "./dialogs/LabelListFromServerDialog.js"
import { initEventsCSVManualFilePicker } from "./dialogs/EventsCSVManualFilePicker.js"
import { Chronogram } from "./chrono/Chrono.js";
import { changeObservationID } from "./annotation/Model.js";
import { htmlCheckmark } from "./core/Utils.js";
import { storeUnit, submitDraft } from "./commands/EditActions.js";
import { initRegionFilters } from "./chrono/ChronoControlInteraction.js";
import { initSelectionControl, labelsProcessKey, updateForm } from "./form/Form.js";

//var vis;

const change_id_force = 'swap'  // What to do if conflict when changing id

// Debugging levels: `logging` now lives in core/Notifier.js (exposed on window by labelbeeBridge.js)

// ######################################################################
// INITIALIZATION

/** Global init */
export function init(videoID, tagID) {
  console.log("init()", videoID, tagID)

  // Parameter passed through HTML Jinja template
  if (http_script_name_0) {
    window.http_script_name = http_script_name_0;
  } else {
    window.http_script_name = "/";
  }

  window.statusWidget = new StatusWidget();

  // import * from "VideoList.js";
  window.videoManager = new VideoManager();

  // import * from "VideoNavigation";
  window.videoControl = new VideoControl("video"); // Attach control to #video

  // import * from "OverlayControl.js";
  window.overlay = new OverlayControl("canvas");

  // import * from "ChronoControl.js";
  //initChrono();
  window.chrono = new Chronogram(); // TODO: fix direct access to #chronoTab, #chronoDiv, #svgVisualize
  initRegionFilters(); // ROI and exclude rects inputs (chrono/ChronoControlInteraction.js)

  initFileImport();
  initLabelListFromServerDialog();
  initFromServerDialog();
  initEventsCSVManualFilePicker();
  initEventsNotes();

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
    let header = $(e.currentTarget) //$(".block-header", $(e.currentTarget).parent())
    let block = header.parent()
    //let content = $("> .block-content", header.parent())
    //content.toggle()
    //header.toggleClass("collapsed",content.is(":hidden"))
    //header.parent().toggleClass("collapsed",content.is(":hidden"))
    //if (header.hasClass("collapsed")) {
    block.toggleClass("collapsed")
    if (!block.hasClass("collapsed")) {
      //block.trigger("collapsiblecollapse",e)
    } else {
      //block.trigger("collapsibleexpand",e)
    }
    console.log('DONE\n\n')
  })
  function refreshCollapsible(block) {
    let collapsed = block.hasClass("collapsed")
    let content = $("> .block-content", block)
    let header = $("> .block-header", block)
    content.toggle(!collapsed)
    header.toggleClass("collapsed", collapsed)
  }
  $(".inline-collapsible").on("collapsibleexpand", function (e) {
    console.log('collapsible', e)
    let block = $(e.currentTarget)
    refreshCollapsible(block)
  })
  $(".inline-collapsible").on("collapsiblecollapse", function (e) {
    console.log('collapsible', e)
    let block = $(e.currentTarget)
    refreshCollapsible(block)
  })

  $(".sortable").sortable({
    connectWith: ".sortable",
    handle: "> label, > .block-header",
    forcePlaceholderSize: true, // shows where the panel will land (see layout/PanelRows.js)
  });
  //$( ".sortable" ).disableSelection();

  // TODO: Clean up  variable<->buttons binding mechanism
  // Missing a model to store all these properties
  // For the moment, just call toggleHidden at least once to sync with 
  // the existing 'checked' attribute from the GUI button
  for (let buttonid_property of [["showTimeline", "timelineTab"],
    ["showFocusInterval", "focusIntervalTab"],
    ["showSelected", "selectedTab"],
    ["showEvents", "eventsTab"],
    ["showFilter", "filterTab"],
    ["showChrono", "chronoTab"]]) {
    let id = buttonid_property[0]
    let prop = buttonid_property[1]
    let but = document.getElementById(id)
    toggleHidden(prop, but.checked)
  }

  // import * from "ZoomView.js";
  initZoomView();

  // Note: zoomOverlay.refreshFromSelection is already bound
  // $(selectionControl).on({
  //   "tagselection:created": zoomOverlay.refreshFromSelection,
  //   "selection:created": zoomOverlay.refreshFromSelection,
  //   "tagselection:cleared": zoomOverlay.refreshFromSelection,
  //   "selection:cleared": zoomOverlay.refreshFromSelection,
  // });
  $(overlay).on({
    "object:moving": zoomOverlay.refreshFromSelection,
    "object:modified": zoomOverlay.refreshFromSelection,
  });

  // ## Keyboard control

  // REMI: use keyboard
  //$(window).on("keydown", onWindowKeyDown);
  $('#left-side').attr("tabindex", "0")
  $('#left-side').on("keydown", onKeyDown);
  //$('#video').on("keydown", onKeyDown);
  // Enable keyboard events from video wrapper
  //let videocanvaswrapper = $('.canvaswrapper')[0]
  //$(videocanvaswrapper).on('keydown',function(){console.log('KKEY')})
  //$(videocanvaswrapper).attr('tabindex','0')

  // ## Misc init

  // Do not trigger first refresh: onloadeddata will call it
  // refresh();
  updateForm(null);
  selection.clear();

  $('#alerttextblock').resizable()

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

  initLogin(); // Login dialog, buttons of #whoami, user status

  window.onbeforeunload = function (e) {
    console.log("Leaving...");
    var confirmationMessage =
      "If you leave this page, all unsaved annotations will be lost. Are you sure?";

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
  };

  // Done
  loadTracks([], true); // skipRefresh

  // Preload video list
  videoManager.receiveVideoSelection();
  // Any default video should be handled after receiving the video list

  //Will trigger refresh, which should fail if no default video
  onTrackWindowChanged({}, true); // to compute track window params. Skip refresh

  onhashchange()
}



/* ROUTER */

window.lasthash = ""

addEventListener("hashchange", onhashchange);
window.onhashchange = async function(event) {
  let newhash = location.hash
  console.log('onhashchange: current hash=',newhash)
  if (!newhash) return
  if (newhash == lasthash) {
    console.log('onhashchange: ABORT, newhash same as last registered hash', lasthash)
  }
  const parsedHash0 = new URLSearchParams(
    location.hash.substring(1) // foo=bar&baz=qux&val=val+has+spaces
  );
  const parsedHash = new URLSearchParams(
    location.hash.substring(1) // foo=bar&baz=qux&val=val+has+spaces
  );
  //console.log('onhashchange: parsedHash=',String(parsedHash))

  let need_push = false

  // First load video if present
  if (parsedHash.has("video_id")) {
    let id = parsedHash.get("video_id")
    if (id == videoManager.currentVideoID) {
      console.log('onhashchange: TRYING to load same video_id, ABORT',id)
    } else {
      console.log('onhashchange: processing hash, selecting video_id ',id)
      //await videoManager.videoSelected(id)
      await videoManager.selectVideoBy_video_id(id)  // More generic version, can handle uri
      console.log("onhashchange: videoSelected SUCCESS, video_id=", id)
      if (!parsedHash.has("frame")) {
        // Add default 
        parsedHash.get("frame","0")
      }
      need_push = true
    }
  }
  // Then, load data if present
  if (parsedHash.has("video_data")) {
    let video_data_id = parsedHash.get("video_data")
    console.log("onhashchange: loading video_data="+video_data_id)
    try {
      await loadEventsFromServerByID(video_data_id)
      console.log("onhashchange: loadEventsFromServerByID SUCCESS")
    } catch (error) {
      // A failed load must not cancel the delayed seek below
      console.log("onhashchange: loadEventsFromServerByID FAILED", error)
    }
    parsedHash.delete("video_data")
    need_push = true
  }

  if (parsedHash.has("frame")) {
    let frame = parseInt(parsedHash.get("frame"),10)
    console.log("onhashchange: delayed seek frame="+frame)
    videoControl.removeHashOnFrameChange = true
    videoControl.removeHashOnFrameChangeFrame = frame
    videoControl.delayedSeek( frame )
    parsedHash.delete("frame")
    need_push = true
  }

  //location.hash = parsedHash
  
  // removeEventListener("hashchange", onhashchange);
  // if (need_push) {
  //   console.log('onhashchange: PUSH old hash to history',String(parsedHash0))
  //   history.replaceState(undefined,undefined,'#'+parsedHash0);
  //   window.document.title="Labelbee #"+parsedHash0
  //   //history.pushState(undefined,undefined,'#'+parsedHash);
  //   location.hash = parsedHash
  // } else {
  //   console.log('onhashchange: REPLACE hash in history',String(parsedHash))
  //   history.replaceState(undefined,undefined,'#'+parsedHash);
  // }
  // addEventListener("hashchange", onhashchange);
}

/* MISC */

export function printMessage(html, color) {
  if (typeof color === "undefined") color = "black";

  $("#alerttext").html(html);
  $("#alerttext").css("color", color);

  if (html !== "") console.log("MESSAGE: %c" + html, "color:" + color);
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

export function toggleFullScreen() {
  var main = $(".container.main")[0];
  if (!document.fullscreenElement) {
    document.body.webkitRequestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// ######################################################################
// CONTROLLERS

// ## Keyboard

export function onKeyDown_IDEdit(event) {
  if (logging.keyEvents) console.log("onKeyDown_IDEdit: event=", event)
  //var key = event.which || event.keyCode;
  if (event.key == 'Enter') { // Enter
    let frame = videoControl.getCurrentFrame()
    let fieldID = document.getElementById("I");
    let new_id = fieldID.value;

    let activeObject = overlay.getActiveRect();

    if (!activeObject) return;

    if (activeObject.draft) {
      activeObject.id = new_id
      submitDraft(activeObject)
      selection.select(frame, new_id)
      printMessage("ID changed + submitted", "green")
    } else { /* status=="db"*/
      let old_id = activeObject.id
      if (logging.keyEvents)
        console.log("onKeyDown_IDEdit: trying to change ID",
          { object: activeObject, old_id: old_id, new_id: new_id })
      if (changeObservationID(frame, old_id, new_id, change_id_force)) {
        // Successfull
        activeObject.id = new_id
        selection.select(frame, new_id)
        printMessage("ID changed succesfully!", "green")
      } else {
        console.log("onKeyDown_IDEdit: unsuccessfull ID change", {
          object: activeObject,
          old_id: old_id,
          new_id: new_id,
        });
        printMessage("ID not changed", "orange");
      }

      //console.log(selection.getId())
      refresh.rebuild();
    }
  }
}

export function onKeyDown_NewIDEdit(event) {
  if (logging.keyEvents) console.log("onKeyDown_NewIDEdit: event=", event);
  var key = event.which || event.keyCode;
  if (key == 13) {
    // Enter
    let frame = videoControl.getCurrentFrame();
    let fieldID = document.getElementById("newid");
    let new_id = fieldID.value;

    if (new_id == "") {
      new_id = undefined;
    }

    let activeObject = overlay.getActiveRect();

    if (!activeObject) return;

    // a draft is submitted (and rebuilt) by submitDraft inside storeUnit
    if (storeUnit(activeObject, WrongId.newidTyped(activeObject.obs, new_id), true)) refresh.rebuild();
  }
}

function onKeyDown(e) {
  if (logging.keyEvents) console.log("onKeyDown: e=", e);

  if (/textarea|select/i.test(e.target.nodeName) || e.target.type === "text") {
    if (e.key == "Escape") {
      if (logging.keyEvents)
        console.log("onKeyDown: Escape in text field. focus back to canvas/left-side")
      $('#left-side')[0].focus({ preventScroll: true }) // Use HTML5 API to prevent scroll
      updateForm(overlay.getActiveRect())
      e.stopPropagation();
      return;
    }
    if (logging.keyEvents)
      console.log("onKeyDown: coming from text field. stopped event");
    e.stopPropagation();
    return;
  }

  var id_field = document.getElementById("I");
  if (e.target == id_field) {
    if (e.key == "Escape") { //(e.keyCode==27) {
      console.log("onKeyDown: detected keydown ESC happened in textfield #I. Canceling edit.")
      id_field.blur();
      $('#left-side')[0].focus({ preventScroll: true })
      updateForm(overlay.getActiveRect())
      return false
    }
    //if (e.keyCode==32 || e.keyCode==188 || e.keyCode==190) {
    //  console.log("onKeyDown: detected keydown happened in textfield #I with keyCode for navigation shortcuts. Canceling it and showing a message.")
    //  printMessage("Editing ID. Press ESC to exit...", "green")
    //  return false
    //}
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
    $("#P").prop("checked", !$().prop("checked"));
    $("#P").trigger("change");
    //automatic_sub();
    return false;
  }
  if (e.key == "r" && e.ctrlKey) {
    refresh.overlayRebuild();
    return false;
  }
  // Prev Frame: <, arrow
  if ((e.key == "ArrowLeft") || (e.keyCode == 188)) {
    if (e.ctrlKey && e.shiftKey)
      videoControl.rewind4();
    else if (e.ctrlKey)
      videoControl.rewind3();
    else if (e.shiftKey)
      videoControl.rewind2();
    else
      videoControl.rewind();
    return false;
  }
  // Next Frame: >, arrow
  if ((e.key == "ArrowRight") || (e.keyCode == 190)) {
    if (e.ctrlKey && e.shiftKey)
      videoControl.forward4();
    else if (e.ctrlKey)
      videoControl.forward3();
    if (e.shiftKey)
      videoControl.forward2();
    else
      videoControl.forward();
    return false;
  }
  // Play/Pause: Space (32)
  if ((e.key == " ")) {
    if (e.ctrlKey) {
      if (e.shiftKey) videoControl.playPauseVideoBackward(2);
      else videoControl.playPauseVideo(2);
    } else {
      if (e.shiftKey) videoControl.playPauseVideoBackward();
      else videoControl.playPauseVideo();
    }
    return false;
  }
  // Escape: Focus on ID field vs video control (27)
  if ((e.key == "Escape")) {
    var id_field = document.getElementById("I");
    if ($(id_field).is(":focus")) {
      id_field.selectionStart = id_field.selectionEnd;
      id_field.blur();
      $('#left-side')[0].focus({ preventScroll: true })
      return false;
    } else {
      id_field.focus(); // Facilitate changing the id
      id_field.select();
      return false;
    }
    return false;
  }
  // Enter: Focus on ID field vs video control (27)
  if ((e.key == "Enter")) {
    var id_field = document.getElementById("I");
    if ($(id_field).is(':focus')) {
      id_field.selectionStart = id_field.selectionEnd
      id_field.blur();
      $('#left-side')[0].focus({ preventScroll: true })
      return false;
    } else {
      id_field.focus(); // Facilitate changing the id
      id_field.select();
      return false;
    }
    return false;
  }

  // Labeling shortcuts
  //if ((e.key in ["1","2","3","4","5","6","7","8","9","0"])) {
  if (labelsProcessKey(e.key)) return false;  // labelsProcessKey returns true if processed the key
  //}
}
