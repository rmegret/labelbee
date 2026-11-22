/*jshint esversion: 6, asi: true */
//displays
//filling data

// ###########################################################
// CHRONOGRAM

import * as ChronoDragControl from "./ChronoDragControl.js"
import { VideoCacheStatus } from "./VideoCacheStatus.js"
import { VideoKeyframes } from "./VideoKeyframes.js"
import { debouncer, flash } from "./ChronoUtils.js"
import { ChronoIntervals, adjustChronogramHeight, getChronoItemHeight, getWindow, initTrackWindowSpan, initVideoSpan, previewBar, refreshChronoLayout, refreshChronogram, sortIds, updatePreviewTimeMark, updateTimeMark } from "./ChronoRender.js"

// The derived data shared by the chrono files is `chronoState` (chrono/ChronoState.js), the options are `chrono.config`,
// the d3 elements `chrono.axes` and `chrono.layers`. TODO: move the remaining singletons inside Chrono

// Page globals: assigned here (and `chrono` by labelBee.js), read by the other files and the page. Created on window
// so that the bare names resolve inside this module.
window.chrono = undefined
window.chronoDragControl = undefined // instance of ChronoDragControl.DragControl (ADR 0011)
window.videoKeyframes = undefined // instance of VideoKeyframes.VideoKeyframes, keyframes of the video from its packets sidecar (ADR 0014)
window.videoCacheStatus = undefined // instance of VideoCacheStatus.VideoCacheStatus (ADR 0012)
export class Chronogram {
  constructor() {
    //const chrono = this
    chrono = this // TODO: fix back to normal local variable once all encapsulation is done properly
    const config = {}
    chrono.config = config
    // Options, grouped by role (ADR 0015 step 7c); the names inside the groups are the former globals
    config.filter = {                // which observations the chronogram, its table and the navigation consider
      frameFilter: { active: false,
                     frameMin: 0,
                     frameMax: -1
                   },
      restrictID: null,
      restrictIDArray: [],
      flag_restrictID: false,
      excludeID: null,
      excludeIDArray: [],
      flag_excludeID: false,
      flag_hideInvalid: false,
      flag_hideFlowers: false,
    }
    config.seek = {                  // navigation between events
      flag_autoEventMode: false,
      eventSeekMode: "eventframe",
    }
    config.chronoDisplay = {         // what the chronogram draws
      chronoItemHeight: 12,
      flag_showPartsOnChrono: false,
      flag_showIndividualEvents: false,
      flag_showSpans: false,
      showObsChrono: true,
      showTagsChrono: true,
      showDanglingTracks: true,
    }
    config.idMap = {                 // mapping of the track ids to the rows of the chronogram
      idAxisMapMode: 'id',
      idAxisMapString: 'return id',
    }
    config.idMap.idAxisMap = Function("id",config.idMap.idAxisMapString)

    chrono.layers = {}               // d3 layers, created by initChrono
    chrono.chronoIntervals = new ChronoIntervals()

    chrono.perf = {}

    initChrono()  // '#svgVisualize'
    // TODO: move all functionalities inside Chronogram

    this.initTooltip()
  };

  // ### ID REMAP

  idAxisMap_inputChanged(event) {
    const config = this.config
    config.idMap.idAxisMapString = $('#').val
    this.update_idAxisMap()
  }
  click_setIdAxisMap(mode) {
    const config = this.config
    if (mode == 'id') {
      //config.idMap.idAxisMapString = 'id'
      config.idMap.idAxisMapMode = 'id'
      config.idMap.idAxisMap = (id)=>id
      this.update_idAxisMap()
    }
    if (mode == 'modulo') {
      const mod = prompt("Set ID axis remap with modulo:", 20)
      if (mod == null) return
      //config.idMap.idAxisMapString = `String( Number(id) % mod )`
      config.idMap.idAxisMapMode = 'modulo'
      config.idMap.idAxisMap = (id) => String( Number(id) % Number(mod) )
      this.update_idAxisMap()
    }
  }
  update_idAxisMap() {
    const config = this.config
    //config.idMap.idAxisMap = Function("id",config.idMap.idAxisMapString)
    //this.update_idAxisMap_input()
    refreshChronogram()
  }
  update_idAxisMap_input() {
    const config = this.config
    $('#').val = config.idMap.idAxisMapString
  }

  // ### FRAMEFILTER

  setFrameFilter(how, event) {
    const chrono = this
    const frameFilter = chrono.config.filter.frameFilter

    console.log('chrono.setFrameFilter',how,event)

    if (how == 'toggle_active') {
      chrono.config.filter.frameFilter.active = !chrono.config.filter.frameFilter.active
      chrono.refreshFrameFilterGUI()
      refreshChronogram()
    }
    if (how == 'all') {
      frameFilter.frameMin = 0
      frameFilter.frameMax = getVideoInfo().nframes-1
      chrono.refreshFrameFilterGUI()
      refreshChronogram()
    }
    if (how == 'auto') {
      frameFilter.frameMin = videoControl.currentFrame - 500
      frameFilter.frameMax = videoControl.currentFrame + 500
      chrono.refreshFrameFilterGUI()
      refreshChronogram()
    }
    if (how == 'refresh') {
      chrono.refreshFrameFilterGUI()
      refreshChronogram()
    }
    if (how == 'frameMin') {
      frameFilter.frameMin = Number( $('#chronoFrameFilterFrameMin').val() )
      //if (frameFilter.frameMin>frameFilter.frameMax) frameFilter.frameMin=frameFilter.frameMax
      chrono.refreshFrameFilterGUI()
      if (!frameFilter.active) // Show user they need to activate or refresh
        flash($('#filterFrameButton'))
      else
        flash($('#chronoFrameFilterRefresh'))
      //refreshChronogram()
    }
    if (how == 'frameMax') {
      frameFilter.frameMax = Number( $('#chronoFrameFilterFrameMax').val() )
      if (frameFilter.frameMax < 0) 
        frameFilter.frameMax = getVideoInfo().nframes + frameFilter.frameMax
      //if (frameFilter.frameMin<0) frameFilter.frameMax=frameFilter.frameMin
      chrono.refreshFrameFilterGUI()
      if (!frameFilter.active) // Show user they need to activate or refresh
        flash($('#filterFrameButton'))
      else
        flash($('#chronoFrameFilterRefresh'))
      //refreshChronogram()
    }
  };

  refreshFrameFilterGUI() {
      $('#filterFrameButton').toggleClass("active", chrono.config.filter.frameFilter.active );
      $('#chronoFrameFilterFrameMin').val( chrono.config.filter.frameFilter.frameMin )
      $('#chronoFrameFilterFrameMax').val( chrono.config.filter.frameFilter.frameMax )
  };

  // TOOLTIP

  initTooltip() {
    d3.select("body").selectAll(".tooltip").remove();

    chrono.tooltip = d3
      .select("body")
      .append("div")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .style("opacity", "1")
      .attr("class", "tooltip");
  }

}


// ### INIT

function initChrono() {
  // global variables
  chrono.axes = undefined;
  chronoState.chronogramData = [];
  chronoState.tagsChronogramData = [];

  chrono.config.filter.restrictID = null;
  chrono.config.filter.restrictIDArray = [];
  chrono.config.filter.flag_restrictID = false;
  chrono.config.filter.flag_excludeID = false;
  chrono.config.seek.flag_autoEventMode = false;
  chrono.config.filter.flag_hideInvalid = false;
  chrono.config.filter.flag_hideFlowers = false

  chrono.config.chronoDisplay.flag_showPartsOnChrono = false;
  chrono.config.chronoDisplay.flag_showIndividualEvents = false; // false by default as it is way to expensive for full video tracks
  chrono.config.chronoDisplay.flag_showSpans = false; // draw obs.span (e.g. whole track of a *.events.csv) behind the intervals
  updateButtons_showPartsOnChrono();
  updateButtons_showIndividualEvents();
  updateButtons_showSpans();
  updateChronoCheckboxes();

  chrono.config.seek.eventSeekMode = "eventframe";
  updateEventSeekMode();

  chrono.config.chronoDisplay.chronoItemHeight = 12;

  // SVG adjust to its parent #chronoDiv
  var svg = d3.select("#svgVisualize");
  //var svg = d2.select(svg_selector)  // TODO: make it modular and self contained, no global CSS selectors
  svg.attr("width", "100%").attr("height", "100%");

  /* ## Build the axes (resizable) ## */

  const options = { useOrdinalScale: true };
  chrono.axes = new ChronoAxes(svg, getVideoInfo(), options);
  //axes.onClick = onAxesClick         // Callback when the user clicks in axes
  //axes.onAxesChanged = onAxesChanged // Callback when zooming or resizing axes
  
  chrono.axes.mousewheelMode = false;
  updateMousewheelModeButton();

  //     svgInterval = axes.chronoGroup.append("g").attr('class', 'intervalLayer');
  //     svgMiddle = axes.chronoGroup.append("g").attr('class', 'middleLayer');
  //     svgTop = axes.chronoGroup.append("g").attr('class', 'topLayer');
  chrono.layers.svgSpanRects = chrono.axes.plotArea.append("g").attr("class", "spanRectLayer");
  chrono.layers.svgInterval = chrono.axes.plotArea.append("g").attr("class", "intervalLayer");
  chrono.layers.svgTop = chrono.axes.plotArea.append("g").attr("class", "topLayer");

  $(videoControl).on("frame:changed", updateTimeMark);
  $(videoControl).on("previewframe:changed", updatePreviewTimeMark);

  $(videoControl).on("frame:changed", function () {
    $(overlay).trigger("trackWindow:change");
  });
  $(videoControl).on("previewframe:changed", function () {
    $(overlay).trigger("trackWindow:change");
  });

  $(chrono.axes).on("axes:clicked", onAxesClick);
  $(chrono.axes).on("axes:dblclick", onAxesDblClick);
  $(chrono.axes).on("axes:changed", onAxesChanged);

  function endPreview() {
    //updateTimeMark();
    //updateTrackWindowSpan()

    let stayHere = false;
    if (stayHere) {
      // Stay at preview frame
      videoControl.seekFrame(getCurrentFrame(),"end-preview");
      // Update should be called by callbacks
    } else {
      // Come back to initial frame before preview
      //videoControl.currentMode = 'video';
      videoControl.seekFrame(-1,"end-preview");
      //videoControl.onFrameChanged();
      //updateTimeMark();
      //updateTrackWindowSpan()
      //videoControl.hardRefresh();
    }
  }
  // Time bar during a preview: orange dashed at the pointer until a frame is shown, then green on the shown frames
  $(chrono.axes).on("previewframe:trackmove", function (evt) {
    previewBar.active = true;
    if (!previewBar.shown) {
      chrono.axes.setTimeMark(evt.frame);
      chrono.axes.setTimeMarkState("pending");
    }
    onAxesMoved(evt); // a frame already available shows (and turns the bar green) from in here
  });
  $(chrono.axes).on("previewframe:trackend", function () {
    previewBar.active = previewBar.shown = false;
    chrono.axes.setTimeMarkState(null);
    endPreview();
    updateTimeMark();
  });

  // Drag modes of the chronogram (ADR 0011)
  {
    if (chronoDragControl) chronoDragControl.destroy();
    chronoDragControl = new ChronoDragControl.DragControl(
      chrono.axes.dragTarget,
      [new ChronoDragControl.PanMode(), new ChronoDragControl.IgnoreMode(), new ChronoDragControl.PreviewMode()],
      { initial: "pan" }
    );
    initDragMenu();
  }

  // Video cache status strip under the frame axis (ADR 0012), toggled by Options/Chronogram. Off by default.
  {
    if (videoCacheStatus) videoCacheStatus.destroy();
    videoCacheStatus = new VideoCacheStatus(chrono.axes, videoCache, function () {
      return { url: videoControl.video.src, frameOffset: getVideoInfo().frameoffset };
    });
    videoCacheStatus.setEnabled($("#showVideoCacheStatus").prop("checked"));
  }

  // Keyframes of the video, from <video>.packets.csv when it exists (ADR 0014); "Preview Keyframes Only" in the Drag menu
  {
    videoKeyframes = new VideoKeyframes();
    function loadKeyframes() {
      var url = videoControl.video.src;
      if (!url) return;
      videoKeyframes.load(url).then(syncKeyframesOption);
      syncKeyframesOption(); // keyframes of the previous video are gone
    }
    $(videoControl).off("video:loaded.keyframes").on("video:loaded.keyframes", loadKeyframes);
    loadKeyframes();
  }
  // Checkbox enabled only when the video has keyframes; the hover snaps to them while it is checked
  function syncKeyframesOption() {
    var $box = $("#chrono-drag-keyframes");
    var available = !!videoKeyframes && videoKeyframes.available;
    $box.prop("disabled", !available);
    if (!available) $box.prop("checked", false);
    $("#chrono-drag-keyframes-label").attr("title", available
      ? "Preview shows the keyframe nearest to the pointer (decodes faster)"
      : "No <video>.packets.csv next to the video: keyframes unknown");
    videoControl.hover.snap = available && $box.prop("checked")
      ? function (frame) {
          return videoKeyframes.nearest(frame + getVideoInfo().frameoffset) - getVideoInfo().frameoffset;
        }
      : null;
  }
  $("#chrono-drag-keyframes").on("change", syncKeyframesOption);

  // Drag button (right of Fit): popup to choose what a drag on the chronogram does. Not saved: Pan on every load.
  function initDragMenu() {
    // Moved to <body> (fixed position): not cropped nor scrolled with the pane that contains the button
    var $menu = $("#chrono-drag-menu").appendTo("body");
    var $button = $("#chrono-drag-button");
    function placeMenu() {
      var r = $button[0].getBoundingClientRect();
      var w = $menu.outerWidth(), h = $menu.outerHeight(), m = 4;
      var left = Math.max(m, Math.min(r.left, window.innerWidth - w - m));
      var top = r.bottom + 2;
      if (top + h > window.innerHeight - m) top = Math.max(m, r.top - h - 2); // not enough room below: above
      $menu.css({ left: left, top: top });
    }
    function sync() {
      $menu.find("input[value=" + chronoDragControl.mode + "]").prop("checked", true);
      $button.attr("title", "Drag on the chronogram: " + chronoDragControl.current.label);
    }
    chronoDragControl.onChange(sync);
    sync();
    $menu.off("change.drag").on("change.drag", "input[name=chronoDrag]", function () {
      chronoDragControl.setMode(this.value);
      $menu.hide();
    });
    $button.off("click.drag").on("click.drag", function (e) {
      e.stopPropagation();
      $menu.toggle();
      if ($menu.is(":visible")) placeMenu();
    });
    // The menu is not inside the scrolled pane any more: close it rather than leave it detached from the button
    $(window).off("resize.dragMenu").on("resize.dragMenu", function () { $menu.hide(); });
    // (scroll does not bubble: capture phase; the previous handler is removed, initDragMenu can run again)
    if (initDragMenu.closeOnScroll) document.removeEventListener("scroll", initDragMenu.closeOnScroll, true);
    initDragMenu.closeOnScroll = function (e) { if (!$menu[0].contains(e.target)) $menu.hide(); };
    document.addEventListener("scroll", initDragMenu.closeOnScroll, true);
    $(document).off("click.dragMenu").on("click.dragMenu", function (e) {
      if (!$(e.target).closest("#chrono-drag-menu").length) $menu.hide();
    });
  }

  /* Resize events */

  $("#chronoTab").on("collapsibleexpand", refreshChronoLayout); // TODO: make it more modular, no global selectors

  // Make it resizable using jQuery-UI
  $("#chronoDiv").resizable({
    handles: "n, s, e, w",
    helper: "ui-resizable-helper",
    stop: function () {
      chrono.config.chronoDisplay.chronoItemHeight = getChronoItemHeight();
      refreshChronoLayout();
    },
  });

  /* ## Init chronogram content ## */


  initVideoSpan();
  initTrackWindowSpan();

  debouncer(refreshChronoLayout, 300); // Avoid refreshing the chronogram too often
}



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
function updateButtons_showPartsOnChrono(event) {
  updateButtons("button_showPartsOnChrono", chrono.config.chronoDisplay.flag_showPartsOnChrono);
}

export function onToggleButton_showIndividualEvents(event) {
  chrono.config.chronoDisplay.flag_showIndividualEvents = toggledNewState(event);
  updateButtons_showIndividualEvents();

  refreshChronogram();
}
function updateButtons_showIndividualEvents(event) {
  updateButtons("button_showIndividualEvents", chrono.config.chronoDisplay.flag_showIndividualEvents);
}

export function onToggleButton_showSpans(event) {
  chrono.config.chronoDisplay.flag_showSpans = toggledNewState(event);
  updateButtons_showSpans();

  refreshChronogram();
}
function updateButtons_showSpans(event) {
  updateButtons("button_showSpans", chrono.config.chronoDisplay.flag_showSpans);
}

function updateChronoCheckboxes() {
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
function updateMousewheelModeButton() {
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
  let f = getCurrentFrame();
  if (f >= domain[0] && f <= domain[1]) {
    // If timemark visible
    chrono.axes.xdomainScale(scale, f); // Zoom in the timemark
  } else {
    chrono.axes.xdomainScale(scale); // Zoom in center
  }
}
export function shiftTimeDomain(factor) {
  let domain = chrono.axes.xdomain();
  let f = getCurrentFrame();
  let shift = Math.round(factor * (domain[1] - domain[0]));
  chrono.axes.xdomainShift(shift);
  //     if (f>=domain[0] && f<=domain[1]) { // If timemark visible
  //         videoControl.seekFrame(f+shift);
  //     }
}
