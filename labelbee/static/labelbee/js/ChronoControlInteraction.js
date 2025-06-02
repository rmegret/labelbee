
function gotoEvent(frame, id) {
  videoControl.pause();

  frame = Number(frame);

  let obs = getObsHandle(frame, id)

  defaultSelectedBee = id
  if (frame==getCurrentFrame()) {
    // Try to select the bee in current frame
    selectBeeByID(id);
  } else {
    if (obsDoesExist(frame, id)) {
      // Set the id as default selection before seeking the frame
      defaultSelectedBee = id;
    }
    videoControl.seekFrame(frame);
    // external controller logic is supposed to call back updateTimeMark
    // to update the view
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
function onAxesClick(event) {
  // User clicked in chronogram axes
  var frame = event.frame;
  var id = event.id;
  if (logging.axesEvents)
    console.log("onAxesClick: seeking to frame=", frame, "...");

  gotoEvent(frame, id);
}
function onAxesDblClick(event) {
  // User double clicked in chronogram axes
  var frame = event.frame;
  var id = event.id;
  if (logging.axesEvents)
    console.log("onAxesDblClick: zooming chrono around frame=", frame, "...");

  axes.xdomainFocus([
    frame - overlay.trackWindow.backward * 1.05,
    frame + overlay.trackWindow.forward * 1.05,
  ]);
}
function onAxesMoved(event) {
  // User moved in chronogram axes with Shift
  var frame = event.frame;
  var id = event.id;
  if (logging.axesEvents)
    console.log("onAxesMove: seeking to frame=", frame, "...");

  //defaultSelectedBee = id // Do not change, keep same ID
  // if (videoControl.currentMode != "preview") {
  //   videoControl.savedNonPreviewFrame = videoControl.currentFrame
  // }
  videoControl.seekFrame(frame, "preview");
}
function onAxesChanged(event) {
  // User zoomed, scrolled or changed chronogram range or size */
  if (logging.axesEvents) console.log("onAxesChanged: event=", event);

  updateChrono();
}

// ### SEEK MODE

function updateEventSeekMode() {
  if (eventSeekMode == "tag") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-tag").addClass("active");
  }
  if (eventSeekMode == "freetag") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-freetag").addClass("active");
  }
  if (eventSeekMode == "event") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-event").addClass("active");
  }
  if (eventSeekMode == "eventframe") {
    $(".eventSeekMode").removeClass("active");
    $(".eventSeekMode-eventframe").addClass("active");
  }
}
function eventSeekModeClicked(mode) {
  eventSeekMode = mode;
  updateEventSeekMode();
}

function getIdCoord(id) {
  return axes.yScale(id);
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
  defaultSelectedBee = id;
  videoControl.seekFrame(Number(frame));
}

function gotoFirstEvent() {
  let from = { frame: -1, id: defaultSelectedBee };
  if (flag_autoEventMode) {
    let ids = axes.yScale.domain();
    if (!ids) return;
    from.id = ids[0];
  }
  gotoNextEvent(from);
}
function gotoLastEvent() {
  let from = { frame: videoControl.maxframe() + 1, id: defaultSelectedBee };
  if (flag_autoEventMode) {
    let ids = axes.yScale.domain();
    if (!ids) return;
    from.id = ids[ids.length - 1];
  }
  gotoPreviousEvent(from);
}
function gotoNextEvent(from) {
  let frame = Number(videoControl.getCurrentFrame());
  let id = defaultSelectedBee;
  if (from) {
    frame = from.frame;
    id = from.id;
  }
  console.log("gotoNextEvent from frame=", frame, "id=", id);

  if (eventSeekMode == "tag") {
    let interval = findNextTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find next Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (eventSeekMode == "freetag") {
    let interval = findNextFreeTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find next Unlabeled Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (eventSeekMode == "event") {
    let obs = findNextObsEvent(frame, id);

    if (!obs) {
      console.log("Did not find next Event");
      return;
    }
    gotoFrameId(obs.frame, obs.id);
  } else if (eventSeekMode == "eventframe") {
    let newframe = findNextEventFrame(frame);

    if (newframe == undefined) {
      console.log("Did not find next Event Frame");
      return;
    }
    gotoFrameId(newframe, id);
  } 
}
function gotoPreviousEvent(from) {
  let frame = Number(videoControl.getCurrentFrame());
  let id = defaultSelectedBee;
  if (from) {
    frame = from.frame;
    id = from.id;
  }
  console.log("gotoPreviousEvent from frame=", frame, "id=", id);

  if (eventSeekMode == "tag") {
    let interval = findPreviousTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find previous Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (eventSeekMode == "freetag") {
    let interval = findPreviousFreeTagEvent(frame, id);

    if (!interval) {
      console.log("Did not find previous Unlabeled Tag");
      return;
    }
    gotoFrameId(interval.begin, interval.id);
  } else if (eventSeekMode == "event") {
    let obs = findPreviousObsEvent(frame, id);

    if (!obs) {
      console.log("Did not find previous Event");
      return;
    }
    gotoFrameId(obs.frame, obs.id);
  } else if (eventSeekMode == "eventframe") {
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
  if (flag_autoEventMode) {
    tagList = tagIntervals;
  } else {
    tagList = tagIntervals.filter(funEqualId(id));
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
  if (flag_autoEventMode) {
    tagList = tagIntervals.filter(isNotLabeled);
  } else {
    tagList = tagIntervals.filter(funEqualId(id)).filter(isNotLabeled);
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
  if (flag_autoEventMode) {
    if (flag_hideInvalid) {
      obsList = flatTracksValid;
    } else {
      obsList = flatTracksAll;
    }
  } else {
    if (flag_hideInvalid) {
      obsList = flatTracksValidGroupById[id];
    } else {
      obsList = flatTracksAllGroupById[id];
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
  if (flag_hideInvalid) {
    obsList = flatTracksValid;
  } else {
    obsList = flatTracksAll;
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
  if (flag_autoEventMode) {
    tagList = tagIntervals;
  } else {
    tagList = tagIntervals.filter(funEqualId(id));
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
  if (flag_autoEventMode) {
    tagList = tagIntervals.filter(isNotLabeled);
  } else {
    tagList = tagIntervals.filter(funEqualId(id)).filter(isNotLabeled);
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
  if (flag_autoEventMode) {
    if (flag_hideInvalid) {
      obsList = flatTracksValid;
    } else {
      obsList = flatTracksAll;
    }
  } else {
    if (flag_hideInvalid) {
      obsList = flatTracksValidGroupById[id];
    } else {
      obsList = flatTracksAllGroupById[id];
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
  if (flag_hideInvalid) {
    obsList = flatTracksValid;
  } else {
    obsList = flatTracksAll;
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

function onClickNextID() {
  //let domain = validAllTagIdsDomain()
  //              .map(function(d){return String(d);})
  let domain = validVisibleTagIdsDomain().map(function (d) {
    return String(d);
  });
  let N = domain.length;
  if (N == 0) return;

  let id = String(getCurrentID());
  let pos = $.inArray(id, domain);
  let newID = pos == -1 ? domain[0] : domain[(pos + 1) % N];
  selectBeeByID(newID);

  setRestrictID(newID);

  if (flag_autoEventMode) {
    gotoFirstEvent();
  }

  refreshChronogram();
}
function onClickPrevID(gotoLast) {
  let domain = validVisibleTagIdsDomain().map(function (d) {
    return String(d);
  });
  let N = domain.length;
  if (N == 0) return;

  let id = String(getCurrentID());
  let pos = $.inArray(id, domain);
  let newID = pos == -1 ? domain[N - 1] : domain[(pos + N - 1) % N];
  selectBeeByID(newID);

  setRestrictID(newID);

  if (flag_autoEventMode) {
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

  let id = String(getCurrentID());
  let pos = $.inArray(id, domain);
  let newID = pos == -1 ? domain[0] : domain[(pos + 1) % N];
  selectBeeByID(newID);

  setRestrictID(newID);

  gotoFirstEvent();

  //refreshChronogram()
}
function onAutoEventButtonClick() {
  flag_autoEventMode = !flag_autoEventMode;

  update_autoEventMode();

  refreshChronogram();
}
function update_autoEventMode() {
  if (flag_autoEventMode) {
    $("#autoEventButton").addClass("active");
  } else {
    $("#autoEventButton").removeClass("active");
  }
}
