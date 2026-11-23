/*
 * ChronoControlInteraction: navigation and seek of the chronogram (refactor slice 8 step 7d, ADR 0015). Moved as is from
 * js/ChronoControlInteraction.js; a module now, so only the exported functions are visible to the other files. The
 * bridge (labelbeeBridge.js) installs them on `window` for the classic scripts and the inline handlers of the page.
 * The track window (state `chrono.config.trackWindow`, handlers, Follow lock) joined it in step 11b3b2.
 * The region filters (ROI, exclude rects: buttons and dialog) joined it in step 11b3c.
 * Still read as page globals: chrono, chronoState, selection, videoControl, overlay, refresh, refreshChronogram, ...
 */

import { ROIChanged, excludeRectsChanged } from "./ChronoData.js"

export function gotoEvent(frame, id) {
  videoControl.pause();

  frame = Number(frame);

  let obs = getObsHandle(frame, id)

  selection.select(frame, id)
  if (frame==videoControl.getCurrentFrame()) {
    // Try to select the bee in current frame
    refresh.selection();
  } else {
    videoControl.seekFrame(frame);
    // external controller logic is supposed to call back updateTimeMark
    // to update the view, and select the rect
  }
    
  if (overlay.opts.clickModeAutoCentering) {
      // Animate the AutoCentering button to remind the user of current mode
      $('.overlayOpts-clickModeAutoCentering').effect({'effect':"highlight","duration":200,"color":"#ffff00"})
      //$('.overlayOpts-clickModeAutoCentering').effect({'effect':"pulsate","duration":100,"times":2})
      console.log("gotoEvent: clickModeAutoCentering, obs", obs)
      autoCentering(obs)
  }
}

/* Callbacks to react to changes in chronogram axes */
export function onAxesClick(event) {
  // User clicked in chronogram axes
  var frame = event.frame;
  var id = event.id;
  if (logging.axesEvents)
    console.log("onAxesClick: seeking to frame=", frame, "...");

  if (chrono.config.idMap.idAxisMapMode == 'id') {
    gotoEvent(frame, id);
  } else {
    videoControl.seekFrame(Number(frame)); // Avoid loosing current selection
  }
}
export function onAxesDblClick(event) {
  // User double clicked in chronogram axes
  var frame = event.frame;
  var id = event.id;
  if (logging.axesEvents)
    console.log("onAxesDblClick: zooming chrono around frame=", frame, "...");

  chrono.axes.xdomainFocus([
    frame - chrono.config.trackWindow.trackWindowBackward * 1.05,
    frame + chrono.config.trackWindow.trackWindowForward * 1.05,
  ]);
}
export function onAxesMoved(event) {
  // User moved in chronogram axes with Shift
  var frame = event.frame;
  var id = event.id;
  if (logging.axesEvents)
    console.log("onAxesMove: seeking to frame=", frame, "...");

  //selection.select(frame, id) // Do not change, keep same ID
  // if (videoControl.currentMode != "preview") {
  //   videoControl.savedNonPreviewFrame = videoControl.currentFrame
  // }
  videoControl.seekFrame(frame, "preview");
}
export function onAxesChanged(event) {
  // User zoomed, scrolled or changed chronogram range or size */
  if (logging.axesEvents) console.log("onAxesChanged: event=", event);

  updateChrono();
}

// ### SEEK MODE

export function updateEventSeekMode() {
  if (chrono.config.seek.eventSeekMode == "tag") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-tag").addClass("active");
  }
  if (chrono.config.seek.eventSeekMode == "freetag") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-freetag").addClass("active");
  }
  if (chrono.config.seek.eventSeekMode == "event") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-event").addClass("active");
  }
  if (chrono.config.seek.eventSeekMode == "eventframe") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-eventframe").addClass("active");
  }
}
export function eventSeekModeClicked(mode) {
  chrono.config.seek.eventSeekMode = mode;
  updateEventSeekMode();
}

function getIdCoord(id) {
  return chrono.axes.yScale(id);
}

// Sort/compare Tag intervals
function compareIncreasingIdBegin(a, b) {
  let d = getIdCoord(a.id) - getIdCoord(b.id);
  if (d == 0) return Number(a.begin) - Number(b.begin);
  else return d;
}
function compareDecreasingIdBegin(a, b) {
  let d = getIdCoord(a.id) - getIdCoord(b.id);
  if (d == 0) return -(Number(a.begin) - Number(b.begin));
  else return -d;
}
function isNotLabeled(element) {
  return !element.labeling.labeled;
}
function funGreaterThanIdBegin(id, frame) {
  return function (element) {
    return (
      (element.id == id && Number(element.begin) > frame) ||
      getIdCoord(element.id) > getIdCoord(id)
    );
  };
}
function funLessThanIdBegin(id, frame) {
  return function (element) {
    return (
      (element.id == id && Number(element.begin) < frame) ||
      getIdCoord(element.id) < getIdCoord(id)
    );
  };
}
// Sort/compare Events
function compareIncreasingFrame(a, b) {
  return Number(a.frame) - Number(b.frame);
}
function compareDecreasingFrame(a, b) {
  return -(Number(a.frame) - Number(b.frame));
}
function funGreaterThanFrame(frame) {
  return element => (Number(element.frame) > frame)
}
function funLessThanFrame(frame) {
  return element => (Number(element.frame) < frame)
}
function compareIncreasingIdFrame(a, b) {
  let d = getIdCoord(a.id) - getIdCoord(b.id);
  if (d == 0) return Number(a.frame) - Number(b.frame);
  else return d;
}
function compareDecreasingIdFrame(a, b) {
  let d = getIdCoord(a.id) - getIdCoord(b.id);
  if (d == 0) return -(Number(a.frame) - Number(b.frame));
  else return -d;
}
function funGreaterThanIdFrame(id, frame) {
  return function (element) {
    return (
      (element.id == id && Number(element.frame) > frame) ||
      getIdCoord(element.id) > getIdCoord(id)
    );
  };
}
function funLessThanIdFrame(id, frame) {
  return function (element) {
    return (
      (element.id == id && Number(element.frame) < frame) ||
      getIdCoord(element.id) < getIdCoord(id)
    );
  };
}
function funEqualId(id) {
  return function (element) {
    return element.id == id;
  };
}

// ### SEEK MODE GOTO API

function gotoFrameId(frame, id) {
  console.log("gotoFrameId frame=", frame, "id=", id);
  selection.select(Number(frame), id);
  videoControl.seekFrame(Number(frame));
}

export function gotoFirstEvent() {
  let from = { frame: -1, id: selection.getId() };
  if (chrono.config.seek.flag_autoEventMode) {
    let ids = chrono.axes.yScale.domain();
    if (!ids) return;
    from.id = ids[0];
  }
  gotoNextEvent(from);
}
export function gotoLastEvent() {
  let from = { frame: videoControl.maxframe() + 1, id: selection.getId() };
  if (chrono.config.seek.flag_autoEventMode) {
    let ids = chrono.axes.yScale.domain();
    if (!ids) return;
    from.id = ids[ids.length - 1];
  }
  gotoPreviousEvent(from);
}
export function gotoNextEvent(from) {
  let frame = Number(videoControl.getCurrentFrame());
  let id = selection.getId();
  if (from) {
    frame = from.frame;
    id = from.id;
  }
  console.log("gotoNextEvent from frame=", frame, "id=", id);

  if (chrono.config.seek.eventSeekMode == "tag") {
    let interval = findNextTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find next Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (chrono.config.seek.eventSeekMode == "freetag") {
    let interval = findNextFreeTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find next Unlabeled Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (chrono.config.seek.eventSeekMode == "event") {
    let obs = findNextObsEvent(frame, id);

    if (!obs) {
      console.log("Did not find next Event");
      return;
    }
    gotoFrameId(obs.frame, obs.id);
  } else if (chrono.config.seek.eventSeekMode == "eventframe") {
    let newframe = findNextEventFrame(frame);

    if (newframe == undefined) {
      console.log("Did not find next Event Frame");
      return;
    }
    gotoFrameId(newframe, id);
  } 
}
export function gotoPreviousEvent(from) {
  let frame = Number(videoControl.getCurrentFrame());
  let id = selection.getId();
  if (from) {
    frame = from.frame;
    id = from.id;
  }
  console.log("gotoPreviousEvent from frame=", frame, "id=", id);

  if (chrono.config.seek.eventSeekMode == "tag") {
    let interval = findPreviousTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find previous Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (chrono.config.seek.eventSeekMode == "freetag") {
    let interval = findPreviousFreeTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find previous Unlabeled Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (chrono.config.seek.eventSeekMode == "event") {
    let obs = findPreviousObsEvent(frame, id);

    if (!obs) {
      console.log("Did not find previous Event");
      return;
    }
    gotoFrameId(obs.frame, obs.id);
  } else if (chrono.config.seek.eventSeekMode == "eventframe") {
    let newframe = findPreviousEventFrame(frame);

    if (newframe == undefined) {
      console.log("Did not find previous Event Frame");
      return;
    }
    gotoFrameId(newframe, id);
  } 
}

function findNextTagEvent(frame, id) {
  let tagList = [];
  if (chrono.config.seek.flag_autoEventMode) {
    tagList = chronoState.tagIntervals;
  } else {
    tagList = chronoState.tagIntervals.filter(funEqualId(id));
  }
  if (!tagList) return undefined;

  let tag = tagList
    .sort(compareIncreasingIdBegin)
    .find(funGreaterThanIdBegin(id, frame));
  //console.log(tag)
  return tag;
}
function findNextFreeTagEvent(frame, id) {
  let tagList = [];
  if (chrono.config.seek.flag_autoEventMode) {
    tagList = chronoState.tagIntervals.filter(isNotLabeled);
  } else {
    tagList = chronoState.tagIntervals.filter(funEqualId(id)).filter(isNotLabeled);
  }
  if (!tagList) return undefined;

  let tag = tagList
    .sort(compareIncreasingIdBegin)
    .find(funGreaterThanIdBegin(id, frame));
  //console.log(tag)
  return tag;
}
function findNextObsEvent(frame, id) {
  let obsList = [];
  if (chrono.config.seek.flag_autoEventMode) {
    if (chrono.config.filter.flag_hideInvalid) {
      obsList = chronoState.flatTracksValid;
    } else {
      obsList = chronoState.flatTracksAll;
    }
  } else {
    if (chrono.config.filter.flag_hideInvalid) {
      obsList = chronoState.flatTracksValidGroupById[id];
    } else {
      obsList = chronoState.flatTracksAllGroupById[id];
    }
  }
  if (!obsList) return undefined;
  let obs = obsList
    .sort(compareIncreasingIdFrame)
    .find(funGreaterThanIdFrame(id, frame));
  //console.log(obs)
  return obs;
}
function findNextEventFrame(frame) {
  let obsList = [];
  if (chrono.config.filter.flag_hideInvalid) {
    obsList = chronoState.flatTracksValid;
  } else {
    obsList = chronoState.flatTracksAll;
  }
  if (!obsList) return undefined;
  let obs = obsList
    .sort(compareIncreasingFrame)
    .find(funGreaterThanFrame(frame));
  //console.log(obs)
  return obs?.frame;
}
function findPreviousTagEvent(frame, id) {
  let tagList = [];
  if (chrono.config.seek.flag_autoEventMode) {
    tagList = chronoState.tagIntervals;
  } else {
    tagList = chronoState.tagIntervals.filter(funEqualId(id));
  }
  if (!tagList) return undefined;

  let tag = tagList
    .sort(compareDecreasingIdBegin)
    .find(funLessThanIdBegin(id, frame));
  //console.log(tag)
  return tag;
}
function findPreviousFreeTagEvent(frame, id) {
  let tagList = [];
  if (chrono.config.seek.flag_autoEventMode) {
    tagList = chronoState.tagIntervals.filter(isNotLabeled);
  } else {
    tagList = chronoState.tagIntervals.filter(funEqualId(id)).filter(isNotLabeled);
  }
  if (!tagList) return undefined;

  let tag = tagList
    .sort(compareDecreasingIdBegin)
    .find(funLessThanIdBegin(id, frame));
  //console.log(tag)
  return tag;
}
function findPreviousObsEvent(frame, id) {
  let obsList = [];
  if (chrono.config.seek.flag_autoEventMode) {
    if (chrono.config.filter.flag_hideInvalid) {
      obsList = chronoState.flatTracksValid;
    } else {
      obsList = chronoState.flatTracksAll;
    }
  } else {
    if (chrono.config.filter.flag_hideInvalid) {
      obsList = chronoState.flatTracksValidGroupById[id];
    } else {
      obsList = chronoState.flatTracksAllGroupById[id];
    }
  }
  if (!obsList) return undefined;
  let obs = obsList
    .sort(compareDecreasingIdFrame)
    .find(funLessThanIdFrame(id, frame));
  //console.log(obs)
  return obs;
}
function findPreviousEventFrame(frame) {
  let obsList = [];
  if (chrono.config.filter.flag_hideInvalid) {
    obsList = chronoState.flatTracksValid;
  } else {
    obsList = chronoState.flatTracksAll;
  }
  if (!obsList) return undefined;
  let obs = obsList
    .sort(compareDecreasingFrame)
    .find(funLessThanFrame(frame));
  //console.log(obs)
  return obs?.frame;
}

function nextSeekFocusWindow() {
  $(videoControl).on("frame:changed", gotoEvent_seekCB);
}
function gotoEvent_seekCB() {
  $(videoControl).off("frame:changed", gotoEvent_seekCB);
  focusTrackWindow();
}

export function onClickNextID() {
  //let domain = validAllTagIdsDomain()
  //              .map(function(d){return String(d);})
  let domain = validVisibleTagIdsDomain().map(function (d) {
    return String(d);
  });
  let N = domain.length;
  if (N == 0) return;

  let id = String(selection.getId());
  let pos = $.inArray(id, domain);
  let newID = pos == -1 ? domain[0] : domain[(pos + 1) % N];
  selection.select(videoControl.getCurrentFrame(), newID);
  refresh.selection();

  setRestrictID(newID);

  if (chrono.config.seek.flag_autoEventMode) {
    gotoFirstEvent();
  }

  refreshChronogram();
}
export function onClickPrevID(gotoLast) {
  let domain = validVisibleTagIdsDomain().map(function (d) {
    return String(d);
  });
  let N = domain.length;
  if (N == 0) return;

  let id = String(selection.getId());
  let pos = $.inArray(id, domain);
  let newID = pos == -1 ? domain[N - 1] : domain[(pos + N - 1) % N];
  selection.select(videoControl.getCurrentFrame(), newID);
  refresh.selection();

  setRestrictID(newID);

  if (chrono.config.seek.flag_autoEventMode) {
    if (gotoLast) {
      gotoLastEvent();
    } else {
      gotoFirstEvent();
    }
  }

  refreshChronogram();
}
function onClickNextIDStart() {
  let domain = validVisibleTagIdsDomain().map(function (d) {
    return String(d);
  });
  let N = domain.length;
  if (N == 0) return;

  let id = String(selection.getId());
  let pos = $.inArray(id, domain);
  let newID = pos == -1 ? domain[0] : domain[(pos + 1) % N];
  selection.select(videoControl.getCurrentFrame(), newID);
  refresh.selection();

  setRestrictID(newID);

  gotoFirstEvent();

  //refreshChronogram()
}
export function onAutoEventButtonClick() {
  chrono.config.seek.flag_autoEventMode = !chrono.config.seek.flag_autoEventMode;

  update_autoEventMode();

  refreshChronogram();
}
function update_autoEventMode() {
  if (chrono.config.seek.flag_autoEventMode) {
    $("#autoEventButton").addClass("active");
  } else {
    $("#autoEventButton").removeClass("active");
  }
}

/* Track window: the interval of frames around the current one that the overlay plots (tracks, tags) and the chronogram highlights.
   State: `chrono.config.trackWindow` ({trackWindowRange, trackWindowDirection, trackWindowForward, trackWindowBackward}, built by the Chronogram constructor); the inputs are
   #trackWindow and #selectboxTrackDir. Each change triggers `trackWindow:change` on `$(chrono)`; ChronoRender.js (span) and the
   "Follow" lock below listen to it. Moved from OverlayControl.js (step 11b3b2, ADR 0015). */
export function onTrackWindowChanged(event, skipRefresh) {
  let range = Number($("#trackWindow")[0].value);
  chrono.config.trackWindow.trackWindowRange = range;

  let trackDir = $("#selectboxTrackDir").val();
  chrono.config.trackWindow.trackWindowDirection = trackDir;

  if (trackDir == "Bidirectional") {
    chrono.config.trackWindow.trackWindowForward = range;
    chrono.config.trackWindow.trackWindowBackward = range;
  } else if (trackDir == "Forward") {
    chrono.config.trackWindow.trackWindowForward = range;
    chrono.config.trackWindow.trackWindowBackward = 0;
  } else if (trackDir == "Backward") {
    chrono.config.trackWindow.trackWindowForward = 0;
    chrono.config.trackWindow.trackWindowBackward = range;
  } else {
    console.log(
      "onTrackWindowChanged: ERROR, trackDir unknown trackDir=",
      trackDir
    );
  }

  if (logging.overlay) {
    console.log("onTrackWindowChanged:", chrono.config.trackWindow);
  }

  $(chrono).trigger("trackWindow:change"); // listeners: the chronogram span, the Follow lock

  if (!skipRefresh)
    refresh.overlayUpdate();
}
export function setTrackWindow(L) {
  $("#trackWindow").val(L);
  onTrackWindowChanged();
}
export function scaleTrackWindow(factor) {
  let L = Number($("#trackWindow").val());
  console.log("scaleTrackWindow: factor=", factor, "with L=", L);
  L = Math.ceil(L * Number(factor));
  if (L < 0) L = 0;
  if (isNaN(L)) L = 1;
  setTrackWindow(L);
}
export function shiftTrackWindow(factor) {
  let L = Number($("#trackWindow").val());
  let frame = videoControl.getCurrentFrame();
  console.log(
    "shiftTrackWindow: factor=",
    factor,
    "with frame=",
    frame,
    "L=",
    L
  );
  let newF = Math.round(frame + factor * L);
  videoControl.seekFrame(newF);
  // changeFrame generates trackWindow:change
}

/* FocusTrackWindow */
let lockFocusTrackWindow = false;  // "Follow": the chronogram view follows the track window
// UI
export function onClickFocusVideo() {
  console.log("onClickFocusVideo");
  setFocusTrackWindow(false);

  updateChronoXDomainFromVideo();
}
export function onClickFocusTrackWindow() {
  console.log("onClickFocusTrackWindow");

  setFocusTrackWindow(!lockFocusTrackWindow);

  if (lockFocusTrackWindow) {
    focusTrackWindow();
  }
}
function updateFocusTrackWindowButton() {
  if (lockFocusTrackWindow) {
    $("#focusTrackWindow").addClass("active");
  } else {
    $("#focusTrackWindow").removeClass("active");
  }
}
// Control
function focusTrackWindow() {
  // Actually a Chronogram method
  let f = videoControl.getCurrentFrame();
  chrono.axes.xdomainFocus([
    f - chrono.config.trackWindow.trackWindowBackward,
    f + chrono.config.trackWindow.trackWindowForward,
  ]);
}
function setFocusTrackWindow(flag) {
  lockFocusTrackWindow = flag;
  if (lockFocusTrackWindow)
    $(chrono).on("trackWindow:change", focusTrackWindow);
  else $(chrono).off("trackWindow:change", focusTrackWindow);

  updateFocusTrackWindowButton();
}

/* Region filters: the buttons, the ROI text input and the exclude-rects dialog. State `chrono.config.region` ({useROI, ROI, useExcludeRects, excludeRects,
   excludeRectSelection}), built by the Chronogram constructor; the filters `ROIChanged` and
   `excludeRectsChanged` are in ChronoData.js, the drawing (`plotROI`, `plotExcludeRects`) in OverlayControl.js.
   Moved from OverlayControl.js (step 11b3c, ADR 0015). `initRegionFilters` sets the inputs, called by `init` after the chronogram is built. */
export function initRegionFilters() {
  const roi = chrono.config.region.ROI
  $("#ROI").val([roi.left, roi.top, roi.right, roi.bottom].join(","));
  $("#useROI").toggleClass("active", chrono.config.region.useROI);
  initExcludeRectsDialog();
  $("#useExcludeRects").toggleClass("active", chrono.config.region.useExcludeRects);
}
/* ROI GUI */
// On/Off
export function onClickROI() {
  $("#useROI").toggleClass("active");
  chrono.config.region.useROI = $("#useROI").hasClass("active");
  ROIChanged();
}
// Edit
export function updateROIFromVideo() {
  let R = videoControl.videoSize();
  $("#ROI").val([R.left, R.top, R.right, R.bottom].join(","));
  ROIChanged();
}
export function onROITextChanged() {
  let roitext = $("#ROI").val();
  let roi = roitext.split(",");
  if (roi.length != 4) {
    console.log(
      "onROIChanged: ERROR, ROI should have 4 coordinates, left,top,right,bottom"
    );
    return;
  }
  chrono.config.region.ROI = {
    left: Number(roi[0]),
    top: Number(roi[1]),
    right: Number(roi[2]),
    bottom: Number(roi[3]),
  };
  ROIChanged();
}
/* Exclude Rects GUI */
// On/Off
export function onClickExcludeRects() {
  $("#useExcludeRects").toggleClass("active");
  chrono.config.region.useExcludeRects = $("#useExcludeRects").hasClass("active");
  excludeRectsChanged();
}
// Direct edition
export function onClickExcludeRectAdd() {
  let R = overlay.getActiveRect();
  if (!R) return;

  let obs = R.obs;
  chrono.config.region.excludeRects.push({
    cx: obs.x + obs.width / 2,
    cy: obs.y + obs.height / 2,
    w: obs.width,
    h: obs.height,
  });
  deleteSelected();
  excludeRectsChanged();
}
export function onClickExcludeRectDelete() {
  let i = chrono.config.region.excludeRectSelection;
  if (!(i >= 0)) return;

  chrono.config.region.excludeRects.splice(i, 1);
  chrono.config.region.excludeRectSelection = -1;
  excludeRectsChanged();
}
export function onClickExcludeRectNext() {
  let n = chrono.config.region.excludeRects.length;
  if (n == 0) {
    chrono.config.region.excludeRectSelection = -1;
    return;
  }

  chrono.config.region.excludeRectSelection = chrono.config.region.excludeRectSelection + 1;
  if (chrono.config.region.excludeRectSelection >= n) chrono.config.region.excludeRectSelection = -1;
  excludeRectsChanged();
}
// Advanced Dialog
export function onClickExcludeRectParams() {
  openExcludeRectsDialog();
}
function openExcludeRectsDialog() {
  var jsontext = JSON.stringify(chrono.config.region.excludeRects, null, 4);

  $("#excludeRects-json").val(jsontext);

  $("#dialog-form-excludeRects").dialog("open");
}
function initExcludeRectsDialog() {
  $("#dialog-form-excludeRects").dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      Ok: function () {
        var jsontext = $("#excludeRects-json").val();

        if (logging.zoomOverlay)
          console.log("excludeRects dialog. jsontext = ", jsontext);

        chrono.config.region.excludeRects = JSON.parse(jsontext);

        if (logging.zoomOverlay) console.log("excludeRects = ", chrono.config.region.excludeRects);

        $(this).dialog("close");

        excludeRectsChanged();
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
}
