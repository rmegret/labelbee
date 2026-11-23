/*jshint esversion: 6, asi: true */
// What the user operates on the chronogram (ES module, refactor slice 8 step 8d): the toolbar toggles, the mousewheel mode,
// the parameters, the filter (restrict and exclude ID, hide invalid and flowers) and the axes buttons (`chronoAdjust`,
// `scaleTimeDomain`, `shiftTimeDomain`). Part of the former ChronoControl.js. It reads `chrono` and the page globals at call time.

import { adjustChronogramHeight, getWindow, refreshChronogram, sortIds } from "./ChronoRender.js"
import { debouncer } from "./ChronoUtils.js"

var __section__chronogram_controls

// ### TOGGLEBABLE BUTTONS AND INPUTS
var __subsection__chronogram_buttons

// Simplify handling of input and button behaviors in one function
function toggledNewState(event) {
  let target = $(event.target);
  var flag;
  if (target[0].type == "checkbox") {
    console.log("Toggled checkbox ", target);
    flag = target.prop("checked"); // Set flag
    // checkbox toggle automatically before triggering event
  } else {
    // Assume button or passive element
    console.log("Toggled button ", target);
    flag = !target.hasClass("active"); // Toggle
    target.toggleClass("active", flag); // Manually toggle the button
  }
  return flag;
}
function updateButtons(classname, flag) {
  $("button." + classname).toggleClass("active", flag);
  $("input." + classname).prop("checked", flag);
}

// Need simpler binding framework over here !
export function onToggleButton_showPartsOnChrono(event) {
  chrono.config.chronoDisplay.flag_showPartsOnChrono = toggledNewState(event);
  updateButtons_showPartsOnChrono();

  refreshChronogram();
}
export function updateButtons_showPartsOnChrono(event) {
  updateButtons("button_showPartsOnChrono", chrono.config.chronoDisplay.flag_showPartsOnChrono);
}

export function onToggleButton_showIndividualEvents(event) {
  chrono.config.chronoDisplay.flag_showIndividualEvents = toggledNewState(event);
  updateButtons_showIndividualEvents();

  refreshChronogram();
}
export function updateButtons_showIndividualEvents(event) {
  updateButtons("button_showIndividualEvents", chrono.config.chronoDisplay.flag_showIndividualEvents);
}

export function onToggleButton_showSpans(event) {
  chrono.config.chronoDisplay.flag_showSpans = toggledNewState(event);
  updateButtons_showSpans();

  refreshChronogram();
}
export function updateButtons_showSpans(event) {
  updateButtons("button_showSpans", chrono.config.chronoDisplay.flag_showSpans);
}

export function updateChronoCheckboxes() {
  $('#showTagsChrono').prop('checked', chrono.config.chronoDisplay.showTagsChrono)
  $('#showObsChrono').prop('checked', chrono.config.chronoDisplay.showObsChrono)
}
export function onChronoParametersChanged() {
  // Callback when chronogram computation parameters have changed
  chrono.config.chronoDisplay.showTagsChrono = $("#showTagsChrono")[0].checked;
  chrono.config.chronoDisplay.showObsChrono = $("#showObsChrono")[0].checked;
  console.log("onChronoParametersChanged:showTagsChrono\n=", chrono.config.chronoDisplay.showTagsChrono);
  refreshChronogram();
}

// TODO unify all buttons and checkmarks click handling
export function onMousewheelModeToggled() {
  chrono.axes.mousewheelMode = $("#mousewheelMode").prop("checked"); 
  if (logging.mouseMouseEvents) {
    console.log(
      "onMousewheelModeToggled: toggled mousewheelMode=",
      chrono.axes.mousewheelMode
    );
  }
}
export function updateMousewheelModeButton() {
  $("#mousewheelMode").prop("checked", chrono.axes.mousewheelMode); 
}


// ### RESTRICT ID
var __subsection__chronogram_restrict_id

export function setRestrictID(ids) {
  console.log("setRestrictID");
  chrono.config.filter.restrictID = String(ids);
  chrono.config.filter.restrictIDArray = chrono.config.filter.restrictID
    .split(",")
    .map(function (d) {
      return d.trim();
    })
    .filter(function (d) {
      return d != "";
    });

  update_restrictID_GUI();

  if (chrono.config.filter.flag_restrictID) refreshChronogram();
}
export function restrictIDFromSelection() {
  console.log("restrictIDFromSelection");

  chrono.config.filter.flag_restrictID = true;
  setRestrictID(selection.getId());
}
export function restrictIDFromWindow() {
  console.log("restrictIDFromWindow");
  chrono.config.filter.restrictID = [];
  let win = getWindow();
  let f1 = win[0],
    f2 = win[1];
  // restrictIDArray = flatTags
  //   .filter(function (tag) {
  //     return tag.frame >= f1 && tag.frame <= f2;
  //   })
  //   .map(function (tag) {
  //     return String(tag.id);
  //   });
  chrono.config.filter.restrictIDArray = chronoState.chronogramData
    .filter(function (item) {
      return item.x >= f1 && item.x <= f2;
    })
    .map(function (item) {
      return String(item.id);
    });
  chrono.config.filter.restrictIDArray = sortIds([...new Set(chrono.config.filter.restrictIDArray)]);
  chrono.config.filter.restrictID = chrono.config.filter.restrictIDArray.join(",");

  chrono.config.filter.flag_restrictID = true;
  update_restrictID_GUI();

  if (chrono.config.filter.flag_restrictID) refreshChronogram();
}
function update_restrictID_GUI() {
  if (chrono.config.filter.flag_restrictID) {
    $("#restrictIDButton").addClass("active");
  } else {
    $("#restrictIDButton").removeClass("active");
  }
  $("#restrictID").val(chrono.config.filter.restrictID);
}
export function click_restrictID() {
  chrono.config.filter.flag_restrictID = !chrono.config.filter.flag_restrictID;

  update_restrictID_GUI();

  refreshChronogram();
}
export function onRestrictIDChanged() {
  chrono.config.filter.restrictID = $("#restrictID").val();
  chrono.config.filter.restrictIDArray = chrono.config.filter.restrictID.split(",");

  //selectBeeByID(restrictID)
  if (chrono.config.filter.flag_restrictID) refreshChronogram();
}

// ### EXCLUDE ID, INVALID AND FLOWERS
var __subsection__chronogram_exclude_id

export function click_excludeID() {
  if ($("#excludeIDButton").hasClass("active")) {
    $("#excludeIDButton").removeClass("active");
    //$("#excludeIDButton").addClass("btn-default")
    //$("#excludeIDButton").removeClass("btn-warning")
    chrono.config.filter.flag_excludeID = false;
  } else {
    $("#excludeIDButton").addClass("active");
    //$("#excludeIDButton").removeClass("btn-default")
    //$("#excludeIDButton").addClass("btn-warning")
    chrono.config.filter.flag_excludeID = true;
  }
  refreshChronogram();
}
export function onExcludeIDChanged() {
  chrono.config.filter.excludeID = $("#excludeID").val();
  chrono.config.filter.excludeIDArray = chrono.config.filter.excludeID.split(",");

  refreshChronogram();
}

export function click_hideInvalid() {
  if ($("#hideInvalidButton").hasClass("active")) {
    $("#hideInvalidButton").removeClass("active");
    chrono.config.filter.flag_hideInvalid = false;
  } else {
    $("#hideInvalidButton").addClass("active");
    chrono.config.filter.flag_hideInvalid = true;
  }
  refreshChronogram();
}

export function click_hideFlowers() {
    let button = $("#hideFlowersButton")
    chrono.config.filter.flag_hideFlowers = !button.hasClass("active");
    button.toggleClass( "active", chrono.config.filter.flag_hideFlowers )
    refreshChronogram()
}
export function chronoAdjust(mode) {
  let debouncedRefresh = debouncer(function (event) {
    chrono.axes.refreshLayout();
  });

  let factor = 1.2;
  let mh = chrono.axes.margin.top + chrono.axes.margin.bottom;
  let mw = chrono.axes.margin.left + chrono.axes.margin.right;
  if (mode == "H-") {
    //         let h = ($('#chronoDiv').height()-mh)/factor+mh
    //         if (h<100) h=100;
    //         $('#chronoDiv').height(h)
    adjustChronogramHeight(chrono.config.chronoDisplay.chronoItemHeight / factor);
    debouncedRefresh();
  }
  if (mode == "H=") {
    adjustChronogramHeight(12);
    debouncedRefresh();
  }
  if (mode == "H+") {
    //         let h = ($('#chronoDiv').height()-mh)*factor+mh
    //         $('#chronoDiv').height(h)
    adjustChronogramHeight(chrono.config.chronoDisplay.chronoItemHeight * factor);
    debouncedRefresh();
  }

  if (mode == "W-") {
    let w = ($("#chronoDiv").width() - mw) / factor + mw;
    if (w < 200) w = 200;
    $("#chronoDiv").width(w);
    debouncedRefresh();
  }
  if (mode == "W=") {
    let w = $("#canvasresize").width();
    if (w < 200) w = 200;
    $("#chronoDiv").width(w);
    debouncedRefresh();
  }
  if (mode == "W+") {
    let w = ($("#chronoDiv").width() - mw) * factor + mw;
    $("#chronoDiv").width(w);
    debouncedRefresh();
  }
}
export function scaleTimeDomain(scale) {
  let domain = chrono.axes.xdomain();
  let f = videoControl.getCurrentFrame();
  if (f >= domain[0] && f <= domain[1]) {
    // If timemark visible
    chrono.axes.xdomainScale(scale, f); // Zoom in the timemark
  } else {
    chrono.axes.xdomainScale(scale); // Zoom in center
  }
}
export function shiftTimeDomain(factor) {
  let domain = chrono.axes.xdomain();
  let f = videoControl.getCurrentFrame();
  let shift = Math.round(factor * (domain[1] - domain[0]));
  chrono.axes.xdomainShift(shift);
  //     if (f>=domain[0] && f<=domain[1]) { // If timemark visible
  //         videoControl.seekFrame(f+shift);
  //     }
}
