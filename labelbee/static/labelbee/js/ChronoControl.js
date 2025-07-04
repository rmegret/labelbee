/*jshint esversion: 6, asi: true */
//displays
//filling data

// ###########################################################
// CHRONOGRAM

// TODO: move global vars inside Chrono or some shared data store
var allIntervals = [];
var flatTracks = [];

var tagIntervals = [];
var allTagsID = []
var flatTags = []
var ttags = {}

var crosses = []
var partsIntervals = []

var chrono
class Chronogram {
  constructor() {
    //const chrono = this
    chrono = this // TODO: fix back to normal local variable once all encapsulation is done properly
    const config = {}
    chrono.config = config
    config.frameFilter = { active: false,
                           frameMin: 0,
                           frameMax: -1
                          }
    config.idAxisMapMode = 'id'
    config.idAxisMapString = 'return id'
    config.idAxisMap = Function("id",config.idAxisMapString)

    chrono.config.legacyActivities = false
    console.log('TO ACTIVATE LEGACY D3 CODE OF ACTIVITIES for wrongid, falsealarm, etc... run:\nchrono.config.legacyActivities = true; removeActivities(); renderActivities()')

    config.showDanglingTracks = true

    chrono.perf = {}

    initChrono()  // '#svgVisualize'
    // TODO: move all functionalities inside Chronogram

    this.initTooltip()
  };

  // ### ID REMAP

  idAxisMap_inputChanged(event) {
    const config = this.config
    config.idAxisMapString = $('#').val
    this.update_idAxisMap()
  }
  click_setIdAxisMap(mode) {
    const config = this.config
    if (mode == 'id') {
      //config.idAxisMapString = 'id'
      config.idAxisMapMode = 'id'
      config.idAxisMap = (id)=>id
      this.update_idAxisMap()
    }
    if (mode == 'modulo') {
      const mod = prompt("Set ID axis remap with modulo:", 20)
      if (mod == null) return
      //config.idAxisMapString = `String( Number(id) % mod )`
      config.idAxisMapMode = 'modulo'
      config.idAxisMap = (id) => String( Number(id) % Number(mod) )
      this.update_idAxisMap()
    }
  }
  update_idAxisMap() {
    const config = this.config
    //config.idAxisMap = Function("id",config.idAxisMapString)
    //this.update_idAxisMap_input()
    refreshChronogram()
  }
  update_idAxisMap_input() {
    const config = this.config
    $('#').val = config.idAxisMapString
  }

  // ### FRAMEFILTER

  setFrameFilter(how, event) {
    const chrono = this
    const frameFilter = chrono.config.frameFilter

    console.log('chrono.setFrameFilter',how,event)

    if (how == 'toggle_active') {
      chrono.config.frameFilter.active = !chrono.config.frameFilter.active
      chrono.refreshFrameFilterGUI()
      refreshChronogram()
    }
    if (how == 'all') {
      frameFilter.frameMin = 0
      frameFilter.frameMax = videoinfo.nframes-1
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
        frameFilter.frameMax = videoinfo.nframes + frameFilter.frameMax
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
      $('#filterFrameButton').toggleClass("active", chrono.config.frameFilter.active );
      $('#chronoFrameFilterFrameMin').val( chrono.config.frameFilter.frameMin )
      $('#chronoFrameFilterFrameMax').val( chrono.config.frameFilter.frameMax )
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
  axes = undefined;
  chronogramData = [];
  tagsChronogramData = [];

  restrictID = null;
  restrictIDArray = [];
  flag_restrictID = false;
  flag_excludeID = false;
  flag_autoEventMode = false;
  flag_hideInvalid = false;
  flag_hideFlowers = false

  flag_showPartsOnChrono = false;
  flag_showIndividualEvents = false; // false by default as it is way to expensive for full video tracks
  updateButtons_showPartsOnChrono();
  updateButtons_showIndividualEvents();

  eventSeekMode = "eventframe";
  updateEventSeekMode();

  chronoItemHeight = 12;

  // SVG adjust to its parent #chronoDiv
  var svg = d3.select("#svgVisualize");
  //var svg = d2.select(svg_selector)  // TODO: make it modular and self contained, no global CSS selectors
  svg.attr("width", "100%").attr("height", "100%");

  /* ## Build the axes (resizable) ## */

  options = { useOrdinalScale: true };
  axes = new ChronoAxes(svg, videoinfo, options);
  //axes.onClick = onAxesClick         // Callback when the user clicks in axes
  //axes.onAxesChanged = onAxesChanged // Callback when zooming or resizing axes
  
  axes.mousewheelMode = false;
  updateMousewheelModeButton();

  //     svgInterval = axes.chronoGroup.append("g").attr('class', 'intervalLayer');
  //     svgMiddle = axes.chronoGroup.append("g").attr('class', 'middleLayer');
  //     svgTop = axes.chronoGroup.append("g").attr('class', 'topLayer');
  svgSpanRects = axes.plotArea.append("g").attr("class", "spanRectLayer");
  svgTag = axes.plotArea.append("g").attr("class", "tagLayer");
  svgInterval = axes.plotArea.append("g").attr("class", "intervalLayer");
  svgTop = axes.plotArea.append("g").attr("class", "topLayer");

  $(videoControl).on("frame:changed", updateTimeMark);
  $(videoControl).on("previewframe:changed", updatePreviewTimeMark);

  $(videoControl).on("frame:changed", function () {
    $(overlay).trigger("trackWindow:change");
  });
  $(videoControl).on("previewframe:changed", function () {
    $(overlay).trigger("trackWindow:change");
  });

  $(axes).on("axes:clicked", onAxesClick);
  $(axes).on("axes:dblclick", onAxesDblClick);
  $(axes).on("axes:changed", onAxesChanged);

  // Events declared in selectionControl
  //$( selectionControl ).on('tagselection:created', updateChronoSelection)
  //$( selectionControl ).on('tagselection:cleared', updateChronoSelection)

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
  $(axes).on("previewframe:trackmove", (evt)=>onAxesMoved(evt));
  $(axes).on("previewframe:trackend", ()=>endPreview());

  /* Resize events */

  $("#chronoTab").on("collapsibleexpand", refreshChronoLayout); // TODO: make it more modular, no global selectors

  // Make it resizable using jQuery-UI
  $("#chronoDiv").resizable({
    handles: "n, s, e, w",
    helper: "ui-resizable-helper",
    stop: function () {
      chronoItemHeight = getChronoItemHeight();
      refreshChronoLayout();
    },
  });

  /* ## Init chronogram content ## */

  //initActivities(); // wait for refresh
  initTagIntervals();

  initVideoSpan();
  initTrackWindowSpan();

  debouncer(refreshChronoLayout, 300); // Avoid refreshing the chronogram too often
}

function refreshChronoLayout() {
  const doRefresh = function () {
    if (logging.axesEvents) {
      console.log("refreshChronoLayout");
    }
    // Make sure chrono is flushed top/left even after resize
    // from top/left handles
    $("#chronoDiv").css({ top: 0, left: 0 });
    if (!$("#chronoTab").hasClass("collapsed")) {
      axes.refreshLayout();
    }
  };
  debouncer(doRefresh)();
  //doRefresh()
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
function onToggleButton_showPartsOnChrono(event) {
  flag_showPartsOnChrono = toggledNewState(event);
  updateButtons_showPartsOnChrono();

  refreshChronogram();
}
function updateButtons_showPartsOnChrono(event) {
  updateButtons("button_showPartsOnChrono", flag_showPartsOnChrono);
}

function onToggleButton_showIndividualEvents(event) {
  flag_showIndividualEvents = toggledNewState(event);
  updateButtons_showIndividualEvents();

  refreshChronogram();
}
function updateButtons_showIndividualEvents(event) {
  updateButtons("button_showIndividualEvents", flag_showIndividualEvents);
}

// TODO unify all buttons and checkmarks click handling
function onMousewheelModeToggled() {
  axes.mousewheelMode = $("#mousewheelMode").prop("checked"); 
  if (logging.mouseMouseEvents) {
    console.log(
      "onMousewheelModeToggled: toggled mousewheelMode=",
      axes.mousewheelMode
    );
  }
}
function updateMousewheelModeButton() {
  $("#mousewheelMode").prop("checked", axes.mousewheelMode); 
}


// ### RESTRICT ID
var __subsection__chronogram_restrict_id

function setRestrictID(ids) {
  console.log("setRestrictID");
  restrictID = String(ids);
  restrictIDArray = restrictID
    .split(",")
    .map(function (d) {
      return d.trim();
    })
    .filter(function (d) {
      return d != "";
    });

  update_restrictID_GUI();

  if (flag_restrictID) refreshChronogram();
}
function restrictIDFromSelection() {
  console.log("restrictIDFromSelection");

  flag_restrictID = true;
  setRestrictID(defaultSelectedBee);
}
function restrictIDFromWindow() {
  console.log("restrictIDFromWindow");
  restrictID = [];
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
  restrictIDArray = chronogramData
    .filter(function (item) {
      return item.x >= f1 && item.x <= f2;
    })
    .map(function (item) {
      return String(item.id);
    });
  restrictIDArray = sortIds([...new Set(restrictIDArray)]);
  restrictID = restrictIDArray.join(",");

  flag_restrictID = true;
  update_restrictID_GUI();

  if (flag_restrictID) refreshChronogram();
}
function update_restrictID_GUI() {
  if (flag_restrictID) {
    $("#restrictIDButton").addClass("active");
  } else {
    $("#restrictIDButton").removeClass("active");
  }
  $("#restrictID").val(restrictID);
}
function click_restrictID() {
  flag_restrictID = !flag_restrictID;

  update_restrictID_GUI();

  refreshChronogram();
}
function onRestrictIDChanged() {
  restrictID = $("#restrictID").val();
  restrictIDArray = restrictID.split(",");

  //selectBeeByID(restrictID)
  if (flag_restrictID) refreshChronogram();
}

// ### EXCLUDE ID, INVALID AND FLOWERS
var __subsection__chronogram_exclude_id

function click_excludeID() {
  if ($("#excludeIDButton").hasClass("active")) {
    $("#excludeIDButton").removeClass("active");
    //$("#excludeIDButton").addClass("btn-default")
    //$("#excludeIDButton").removeClass("btn-warning")
    flag_excludeID = false;
  } else {
    $("#excludeIDButton").addClass("active");
    //$("#excludeIDButton").removeClass("btn-default")
    //$("#excludeIDButton").addClass("btn-warning")
    flag_excludeID = true;
  }
  refreshChronogram();
}
function onExcludeIDChanged() {
  excludeID = $("#excludeID").val();
  excludeIDArray = excludeID.split(",");

  refreshChronogram();
}

function click_hideInvalid() {
  if ($("#hideInvalidButton").hasClass("active")) {
    $("#hideInvalidButton").removeClass("active");
    flag_hideInvalid = false;
  } else {
    $("#hideInvalidButton").addClass("active");
    flag_hideInvalid = true;
  }
  refreshChronogram();
}

function click_hideFlowers() {
    let button = $("#hideFlowersButton")
    flag_hideFlowers = !button.hasClass("active");
    button.toggleClass( "active", flag_hideFlowers )
    refreshChronogram()
}


// ### AXES MANAGEMENT
var __section__chronogram_axes_management


// ### CHRONO RESIZING
var __subsection__chronogram_axes_resizing

function getChronoItemHeight() {
  //return chronoItemHeight;

  let H = $("#chronoDiv").height();

  let mh = axes.margin.top + axes.margin.bottom;
  let N = axes.ydomain().length;
  let itemHeight = (H - mh) / N;

  console.trace(itemHeight);

  return itemHeight;
}
function chronoAdjust(mode) {
  let debouncedRefresh = debouncer(function (event) {
    axes.refreshLayout();
  });

  let factor = 1.2;
  let mh = axes.margin.top + axes.margin.bottom;
  let mw = axes.margin.left + axes.margin.right;
  if (mode == "H-") {
    //         let h = ($('#chronoDiv').height()-mh)/factor+mh
    //         if (h<100) h=100;
    //         $('#chronoDiv').height(h)
    adjustChronogramHeight(chronoItemHeight / factor);
    debouncedRefresh();
  }
  if (mode == "H=") {
    adjustChronogramHeight(12);
    debouncedRefresh();
  }
  if (mode == "H+") {
    //         let h = ($('#chronoDiv').height()-mh)*factor+mh
    //         $('#chronoDiv').height(h)
    adjustChronogramHeight(chronoItemHeight * factor);
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
function adjustChronogramHeight(itemHeight) {
  if (itemHeight == null) {
    itemHeight = 12;
  }
  chronoItemHeight = itemHeight;

  let mh = axes.margin.top + axes.margin.bottom;
  let domain = axes.ydomain();
  //console.trace(domain)
  let minheight = domain.length * itemHeight + mh;
  $("#chronoDiv").height(minheight);
  refreshChronoLayout();
}

// ### CHRONO DOMAINS AND AXES
var __subsection__chronogram_axes_domains


/* Synchronization between chronogram, video and chronogramData */
function domainxFromVideo() {
  var domain;
  if (isNaN(videoinfo.duration)) domain = [0, 1];
  else domain = [0, videoinfo.nframes-1];
  if (logging.chrono) console.log("domainxFromVideo: domain=", domain);
  return domain;
}
function domainxFromChronogramData() {
  if (chronogramData.length === 0) return [0, 1];
  var range = d3.extent(chronogramData, function (d) {
    return Number(d.x);
  });
  return [range[0] - 0.5, range[1] + 0.5]; // add some margin
}
// Obsolete: replaced by categorical domain
// function domainyFromChronogramData() {
//     if (chronogramData.length === 0) return [0,1]
//     var range = d3.extent(chronogramData, function(d) {return Number(d.y); })
//     return [range[0], range[1]+1.0] // Add 1.0 for the height of the interval
// }
// function domainyFromTagData() {
//     if (tagIntervals.length === 0) return [0,1]
//     var range = d3.extent(tagIntervals, function(d) {return Number(d.id); })
//     visibleTagsID = range
//     return [range[0], range[1]+1.0] // Add 1.0 for the height of the interval
// }
function validIdsDomain() {
  if (chronogramData.length === 0) return [];
  let ids = new Set();
  if (flag_hideInvalid) {
    chronogramData.forEach(function (d) {
      let labs = d.labels.split(",");
      if (labs.indexOf("wrongid") == -1 && labs.indexOf("falsealarm") == -1)
        ids.add(d.id);
    });
  } else {
    chronogramData.forEach(function (d) {
      ids.add(d.id);
    });
  }
  return [...ids]; // Convert to array
}
function validTagIdsDomain() {
  if (tagIntervals.length === 0) return [];
  let ids = new Set();
  if (flag_hideInvalid) {
    tagIntervals.forEach(function (d) {
      if (
        !containsLabel(d.labels, "wrongid") &&
        !containsLabel(d.labels, "falsealarm")
      )
        ids.add(d.id);
    });
  } else {
    tagIntervals.forEach(function (d) {
      ids.add(d.id);
    });
  }
  return [...ids]; // Convert to array
}
function validAllTagIdsDomain() {
  return sortIds(allTagsID);
}
function validVisibleTagIdsDomain() {
  return sortIds(axes.ydomain());
}

/* Update chronogram axes properties */
function updateChronoXDomainFromVideo() {
  axes.updateVideoinfo(videoinfo) // Update starttime and realfps
  axes.xdomain(domainxFromVideo());
}
function scaleTimeDomain(scale) {
  let domain = axes.xdomain();
  let f = getCurrentFrame();
  if (f >= domain[0] && f <= domain[1]) {
    // If timemark visible
    axes.xdomainScale(scale, f); // Zoom in the timemark
  } else {
    axes.xdomainScale(scale); // Zoom in center
  }
}
function shiftTimeDomain(factor) {
  let domain = axes.xdomain();
  let f = getCurrentFrame();
  let shift = Math.round(factor * (domain[1] - domain[0]));
  axes.xdomainFocus([domain[0] + shift, domain[1] + shift]);
  //     if (f>=domain[0] && f<=domain[1]) { // If timemark visible
  //         videoControl.seekFrame(f+shift);
  //     }
}

function sortIds(IDarray) {
  // Utility function to sort mixed numbers/alpha+number
  // Source: http://stackoverflow.com/a/4340448
  function parseItem(item) {
    const [, stringPart = "", numberPart = 0] =
      /(^[a-zA-Z]*)(\d*)$/.exec(item) || [];
    return [stringPart, numberPart];
  }
  function mixedCompare(a, b) {
    const [stringA, numberA] = parseItem(a);
    const [stringB, numberB] = parseItem(b);
    const comparison = stringA.localeCompare(stringB);
    return comparison === 0 ? Number(numberA) - Number(numberB) : comparison;
  }

  return IDarray.sort(mixedCompare);
}
function validIdsChrono() {
  let domainset = new Set([...validIdsDomain(), ...validTagIdsDomain()]);
  let domain = sortIds([...domainset]); // convert back to sorted array
  return domain;
}
function updateChronoYDomain() {
  //var a = domainyFromChronogramData()
  //var b = domainyFromTagData()
  //axes.ydomain([Math.min(a[0],b[0]),Math.max(a[1],b[1])]) // Linear scale

  var domain = [];

  if (flag_restrictID) {
    domain = restrictIDArray;
  } else {
    domain = validIdsChrono();
  }
  if (logging.axesEvents) console.log("updateChronoYDomain: domain=", domain);

  //let oldN=axes.ydomain().length
  //let N=domain.length

  //let itemHeight = getChronoItemHeight()

  if (chrono.config.idAxisMap) {
    // let trackLength={}
    // let yEnd={}; 
    // chrono.trackY={}; 
    // console.log('allIntervals',allIntervals)
    // allIntervals.forEach( (item) => {item.frames = item.x2-item.x1+1; trackLength[item.id]=item.frames} )
    // allIntervals.forEach( (item) => { let L=trackLength[item.id]; let curY=(L>1)+(L>2)+(L>4)+(L>8)+(L>16)+(L>32)+(L>64)+(L>128)+(L>256); for (let y=curY; ; y++) {
    //     if (yEnd[y]==null || item.x1>yEnd[y]) { yEnd[y]=item.x2; chrono.trackY[item.id]=y; break; }
    // }  } )
    //chrono.config.idAxisMap = (id) => chrono.trackY[id]
    // Apply an id mapping if exists
    const mappedDomain = [...new Set( domain.map(chrono.config.idAxisMap) )].sort( (a,b) => -Number(b)+Number(a))
    axes.ydomain(mappedDomain);
  } else {
    axes.ydomain(domain);
  }

  adjustChronogramHeight(chronoItemHeight);

  //axes.ydomain(['0','1','2','3','10','12']) // Testing
}




// ### CHRONO MAIN VIEW
var __section__chronogram_main_view

// ### CHRONO DYNAMIC ELEMENTS (TIMEMARK, SELECTION)
var __section__chronogram_dynamic_elements

function updateTimeMark() {
  var frame = getCurrentFrame();
  if (logging.frameEvents) console.log("updateTimeMark: frame=", frame);
  if (typeof frame == "undefined") {
    frame = 0;
  }
  axes.setTimeMark(frame);
}
function updatePreviewTimeMark() {
  updateTimeMark();
  //     if (videoControl.previewFrame != null)
  //         axes.setTimeMark(videoControl.previewFrame);
}

function updateChronoSelection() {
  let id = defaultSelectedBee;
  axes.selectId(id);
}


// ### CHRONO TIMESPANS
var __section__chronogram_timespans

//put first and last frame in vid
function initVideoSpan() {
  var chronoGroup = axes.chronoGroup;
  videoSpan = chronoGroup
    .append("g")
    .attr("id", "videoSpan")
    .attr("clip-path", "url(#videoSpanClipPath)");
  videoSpan
    .append("clipPath")
    .attr("id", "videoSpanClipPath") // give the clipPath an ID
    .append("rect")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", axes.width())
    .attr("height", 15);
  videoSpan
    .append("rect")
    .attr("class", "background")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", axes.width())
    .attr("height", 15)
    .style("stroke-width", "1px")
    .style("fill", "#f0fff0");
  videoSpan
    .append("rect")
    .attr("class", "interval")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", 1)
    .attr("height", 15) // Just init
    .style("stroke", "blue")
    .style("fill", "skyblue");
  videoSpan
    .append("text")
    .attr("class", "label")
    .style("text-anchor", "start")
    .text("video name ?");
}
function updateVideoSpan() {
  var videoSpan = axes.chronoGroup.select("#videoSpan");
  //videoSpan.attr("transform",
  //               "translate("+(axes.margin.left)+","+(axes.margin.top)+")")
  videoSpan
    .selectAll("#videoSpanClipPath > rect")
    .attr("width", axes.width())
    .attr("y", -15);
  videoSpan
    .selectAll(".background")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", axes.width())
    .attr("height", 15);
  videoSpan
    .selectAll(".interval")
    .attr("x", axes.xScale(0))
    .attr("y", -13)
    .attr("width", axes.xScale(videoinfo.nframes + 1) - axes.xScale(0))
    .attr("height", 11);
  videoSpan
    .selectAll(".label")
    .attr("x", axes.xScale(0) + 2)
    .attr("y", -4)
    .text(videoinfo.name.split("/").pop());
}

function initTrackWindowSpan() {
  var chronoGroup = axes.chronoGroup;
  trackWindowSpan = chronoGroup
    .append("g")
    .attr("id", "trackWindowSpan")
    .attr("clip-path", "url(#trackWindowSpanClipPath)");
  trackWindowSpan
    .append("clipPath")
    .attr("id", "trackWindowSpanClipPath") // give the clipPath an ID
    .append("rect")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", axes.width())
    .attr("height", 15);
  trackWindowSpan
    .append("rect")
    .attr("class", "interval")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", 1)
    .attr("height", 15) // Just init
    .style("stroke-width", "1px")
    .style("stroke", "pink")
    .style("fill", "pink")
    .style("fill-opacity", "0.4");

  $(videoControl).on("frame:changed", updateTrackWindowSpan);
  $(videoControl).on("previewframe:changed", updateTrackWindowSpan);
  $(axes).on("previewframe:trackend", updateTrackWindowSpan);
  $(overlay).on("trackWindow:change", updateTrackWindowSpan);
}
function updateTrackWindowSpan() {
  var trackWindowSpan = axes.chronoGroup.select("#trackWindowSpan");
  trackWindowSpan
    .selectAll("#trackWindowSpanClipPath > rect")
    .attr("width", axes.width())
    .attr("y", -15);
  let f = getCurrentFrame();
  let fmin = f - overlay.trackWindow.backward;
  let fmax = f + overlay.trackWindow.forward;
  trackWindowSpan
    .selectAll(".interval")
    .attr("x", axes.xScale(fmin))
    .attr("y", -13)
    .attr("width", axes.xScale(fmax) - axes.xScale(fmin))
    .attr("height", 11);
}
function getWindow() {
  let f = getCurrentFrame();
  let fmin = f - overlay.trackWindow.backward;
  let fmax = f + overlay.trackWindow.forward;

  if (fmin < 0) fmin = 0;
  if (fmax > videoControl.maxframe()) fmax = videoControl.maxframe();

  return [fmin, fmax];
}




// ### CHRONO UPDATING
var __section__chronogram_update

/* Hard refresh: prepare data then redraw */
function refreshChronogram() {
  if (logging.chrono) console.log('refreshChronogram')

  updateChronoData()

  drawChrono();

  renderObsTable();
}

/* Soft refresh: update ydomain and render */
function drawChrono() {
  // Strong update:
  // Redraw chronogram after change in chronogramData content
  // Need to adjust range

  if (logging.chrono) console.log("drawChrono");

  updateChronoYDomain();
  //axes.ydomain([0,20]) // Uncomment for testing

  updateChrono();
}

/* Render chrono */
function updateChrono() {
  // Weak update:
  // Update chronogram without adjusting range

  // IMPORTANT: do not call axes.refreshAxes() or any
  // function that triggers is such as axes.here,
  // as it would generate an infinite loop
  // Put that is the stronger update function drawChrono

  if (logging.chrono) console.log("drawChrono");

  const start = performance.now()

  // Redraw activities
  //updateActivities(); // Legacy
  renderActivities()
  updateTagIntervals();

  // Redraw dynamic markers
  updateTimeMark(); // Normally already updated by frameChanged
  updateVideoSpan();
  updateTrackWindowSpan();

  const end = performance.now()
  chrono.perf.chronoRedraw = end-start

  let statusMsg = `Chrono update ${Math.round(chrono.perf.chronoUpdate)} ms, redraw ${Math.round(chrono.perf.chronoRedraw)} ms;
data: ${chronogramData.length} items, ${allIntervals.length} intervals, ${flatTags.length} tags`

  if ( chrono.perf.chronoUpdate > 50 || chrono.perf.chronoRedraw > 50 ) {
    statusMsg += '<br><b>Slow display, consider closing the chronogram or filtering the data</b>'
  }

  $('#chronoStatusBar').html(statusMsg)

}



// ### CHRONO DATA PREPARATION TRACKS
var __section__chronogram_data_preparation_tracks

// Top-level
// updateChronoData   : top-level, do all updates
// Calling:
// augmentTrackWithTag: Tracks, Tags    => mutated Tracks
// updateFlatTracks   : Tracks          => flatTracks and its variants
// createIntervalList : chronogramData  => allIntervals
// getFlatTags        : Tags            => flatTags    (used in refreshChronogram)
// getTTags           : flatTags        => ttags       (used in refreshChronogram)
// updateTagIntervals : ttags           => tagIntervals, allTagsID

/* Top-level update all chrono data. Do not render */
function updateChronoData() {

  console.log('updateChronoData')

  const start = performance.now();
  //console.time('refreshChronogram');
  $('#chronoStatusBar').html('Preparing chrono data...')

  // PREPARE TRACKS DATA
  
  augmentTrackWithTag()
  
  chronogramData.length = 0;
  if (showObsChrono) {
    // Tracks => chronogramData
    // chronogramData[flatk].x, .y, .Activity, .labels, .pollen, .tag, .obs
    updateChronogramData()

    // chronogramData => allIntervals, crosses, rectIntervals, ...
    createIntervalList()
  }

  // Tracks => flatTracks...
  updateFlatTracks();

  // PREPARE TAGS DATA

  flatTags = getFlatTags(false); // noFilter

  ttags = getTTags(); // reverse index ttags[id][frame]

  allTagsID = [...allTagsID];

  if (logging.chrono)
    console.log("updateChronoData: convert tags to intervals...");
  
  tagIntervals = [];
  if (showTagsChrono) {
    updateTagIntervals()
  }

  // Augment tags with tracks labels
  // Also generate virtual tag intervals for wrongid annotations
  updateTagsLabels();

  // Filter tagIntervals
  if (flag_hideInvalid) {
    tagIntervals = tagIntervals.filter(
      (interval) => !(interval.labeling.falsealarm || interval.labeling.wrongid)
    );
  }

  //console.timeEnd('refreshChronogram');
  const end = performance.now();
  chrono.perf.chronoUpdate = end-start

  //$('chronoStatusBar').html(`Chrono updateChronoData took ${chrono.perf.chronoUpdate} ms`)
}

/* Augment Tracks with tag id if same (frame,id) exist for both */
function augmentTrackWithTag() {
  for (let F in Tracks) {
    if (Tags[F] != undefined) {
      for (var i = 0; i < Tags[F].tags.length; i++) {
        let id = String(Tags[F].tags[i].id);
        if (Tracks[F] && Tracks[F][id]) {
          Tracks[F][id].tag = Tags[F].tags[i];
        }
      }
    }
  }
}

/* Tracks => flatTracks, flatTracksAll, flatTracksValid, flatTracksAllGroupById, flatTracksValidGroupById */
function updateFlatTracks() {
  // All obs sorted by frame,id
  flatTracksAll = [];
  for (let F in Tracks) {

    // TODO: filter in only one place instead of both updateObsTable and refreshChronogram
    if (chrono.config.frameFilter.active) {
      if ((F < chrono.config.frameFilter.frameMin) || (F > chrono.config.frameFilter.frameMax)) continue // Just skip out of active zone
    }

    for (let id in Tracks[F]) {
      // var obs = Tracks[F][id]
      obs = Tracks[F][id];

      if (flag_restrictID) {
        if ($.inArray(String(id), restrictIDArray) < 0) continue;
      }
      if (flag_excludeID) {
        if ($.inArray(String(id), excludeIDArray) >= 0) continue;
      }

      // XX Define y
      let y = chrono.config.idAxisMap(id)
      let chronoObs = { frame: F, id: id, y: y, labels: obs.labels, obs: obs };

      flatTracksAll.push(chronoObs);
    }
  }
  flatTracksValid = flatTracksAll.filter(function (d) {
    return (
      !containsLabel(d.labels, "falsealarm") &&
      !containsLabel(d.labels, "wrongid")
    );
  });
  var groupBy = function (array, key) {
    return array.reduce(function (groups, x) {
      // Appends x to groups[x[key]]
      (groups[x[key]] = groups[x[key]] || []).push(x);
      return groups;
    }, {});
  }; // Keep order of frames
  flatTracksAllGroupById = groupBy(flatTracksAll, "id");
  flatTracksValidGroupById = groupBy(flatTracksValid, "id");

  if (flag_hideInvalid) {
    flatTracks = flatTracksValid;
  } else {
    flatTracks = flatTracksAll;
  }
}


/* Tracks => chronogramData */
function updateChronogramData() {
  chronogramData.length = 0;

  for (let F in Tracks) {

      if (chrono.config.frameFilter.active) {
        if ((F < chrono.config.frameFilter.frameMin) || (F > chrono.config.frameFilter.frameMax)) continue // Just skip out of active zone
      }

      for (let id in Tracks[F]) {

        const id_eff = String(Number(id)%50)

        let obs=Tracks[F][id]
        let labelArray = (obs.labels || '').split(",")

        if (flag_restrictID) {
          if ($.inArray(String(id), restrictIDArray) < 0) continue;
        }
        if (flag_excludeID) {
          if ($.inArray(String(id), excludeIDArray) >= 0) continue;
        }
        if (flag_hideInvalid) {
          if (hasLabel(obs, "falsealarm") || hasLabel(obs, "wrongid")) continue;
        }
        if (flag_hideFlowers) {
            if (String(id).startsWith('F')) continue;
        }
        let inROI = true

        obs.cx = obs.x + obs.width/2
        obs.cy = obs.y + obs.height/2

        //if (flag_useROI) {  // TODO; Check x vs cx
            inROI = (obs.cx >= ROI.left &&
              obs.cx <= ROI.right &&
              obs.cy >= ROI.top &&
              obs.cy <= ROI.bottom
            );
        //};

        let b = obs.bool_acts;
        let b0 = b[0];
        let b1 = b[1];
        let b2 = b[2];
        let b3 = b[3];
        //                 let b0 = hasLabel(obs,'fanning')
        //                 let b1 = hasLabel(obs,'pollen')
        //                 let b2 = hasLabel(obs,'entering')
        //                 let b3 = hasLabel(obs,'leaving')

        // XXX Define y
        let y = chrono.config.idAxisMap(id)
        if (!b0 && !b2 && !b3) {
          chronogramData.push({
            x: F,
            y: y, 
            id: id,
            Activity: "",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
        if (b2) {
          chronogramData.push({
            x: F,
            y: y,
            id: id,
            Activity: "entering",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
        if (b3) {
          chronogramData.push({
            x: F,
            y: y,
            id: id,
            Activity: "leaving",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
        if (b0) {
          chronogramData.push({
            x: F,
            y: y,
            id: id,
            Activity: "fanning",
            labels: obs.labels,
            pollen: b1,
            tag: obs.tag,
            obs: obs,
            inROI: inROI
          });
        }
      }
    }
}

// chronogramData => allIntervals  
// // New version is simplified: has only one interval by sequential track. not separated by activity type
function createIntervalList() {
  //initiliaze allIntervals to update data
  let tempCoordinates = {};

  for (var i = 0; i < chronogramData.length; i++) {
    if (chronogramData[i].id in tempCoordinates) {
      //Make sure y coordinate is not in tempCoordiantes
      tempCoordinates[chronogramData[i].id].push(i);
    } else {
      //Create new beeId key with it's x coordiantes as value
      tempCoordinates[chronogramData[i].id] = [];
      tempCoordinates[chronogramData[i].id].push(i);
    }
  }
  //initiliaze allIntervals to update data
  allIntervals = [];
  acts = ["", "pollen", "entering", "leaving", "fanning"];
  for (var id in tempCoordinates) {
    let xValues = [];

    let iArray = tempCoordinates[id];

    // iArray = iArray.filter(function (i) {
    //   return chronogramData[i].Activity == a;
    // });

    if (iArray.length == 0) {
      continue;
    }

    let passThroughROI=false
    for (let j = 0; j < iArray.length; j++) {
      xValues[j] = Number(chronogramData[iArray[j]].x);
    }

    let iData = chronogramData[iArray[0]];
    let tempInterval = {
      x1: xValues[0],
      x2: xValues[0],
      y: iData.y,  // XXX Reuse y
      id: id,
      Activity: "",
      labels: iData.labels,
      haslabel: {},
      pollen: iData.pollen,
      tag: iData.tag,
      obs: iData.obs,
      passThroughROI: iData.inROI,
      startInsideROI: iData.inROI,
      endInsideROI: iData.inROI
    };
    if (iData.labels != "")
      for (let label of iData.labels.split(",")) {
        tempInterval.haslabel[label] = true
      }

    // let tempInterval = { x1: xValues[0], x2: xValues[0], y: y,
    //     Activity: iData.Activity, pollen: iData.pollen, issue: "" };

    for (var i = 1; i < xValues.length; i++) {
      let iData = chronogramData[iArray[i]];
      // console.log("Act temp interval IN: ", tempInterval[i].Activity);
      if (xValues[i] - xValues[i - 1] == 1) {
        tempInterval.x2 = xValues[i]; //Extend the existing interval
        tempInterval.pollen |= iData.pollen;
        tempInterval.passThroughROI |= iData.inROI
        tempInterval.endInsideROI = iData.inROI
        
        if (iData.labels != "")
          for (let label of iData.labels.split(",")) {
            tempInterval.haslabel[label] = true
        }
      } else {
        allIntervals.push(tempInterval);
        tempInterval = {
          x1: xValues[i],
          x2: xValues[i],
          y: iData.y,  // XXX Reuse y
          id: id,
          Activity: iData.Activity,
          labels: iData.labels,
          haslabel: {},
          pollen: iData.pollen,
          tag: iData.tag,
          obs: iData.obs,
          passThroughROI: iData.inROI,
          startInsideROI: iData.inROI,
          endInsideROI: iData.inROI
        }; // New interval
        
        if (iData.labels != "")
          for (let label of iData.labels.split(",")) {
            tempInterval.haslabel[label] = true
        }
      }
    }
    tempInterval.labels = Object.keys(tempInterval.haslabel).join(',')
    allIntervals.push(tempInterval);
  }

  // Filter out
  if (flag_useROI)
    allIntervals = allIntervals.filter( interval => interval.passThroughROI )

  // Pass extra data from chronogramData to allInterval
  for (let interval of allIntervals) {
    var tempArray = interval.labels.split(",");
    if (tempArray.includes("wrongid")) {
      interval.wrongid = true;
      interval.newid = interval.obs.newid;
    }
  }

  // Subsets of allIntervals
  crosses = allIntervals.filter(function (d) {
    var tempArray = d.labels.split(",");
    if (tempArray.includes("falsealarm") || tempArray.includes("wrongid")) {
      return true;
    }
  });
  rectIntervals = allIntervals.filter(function (d) {
    return d.x1 != d.x2;
  });
  circlesIntervals = allIntervals.filter(function (d) {
    return d.x1 == d.x2;
  });
  partsIntervals = allIntervals.filter(function (d) {
    return hasParts(d.obs);
  });
}




/* Tags => flatTags */
/* flatTags[k] is tag, with fields id, ... */
function getFlatTags(useFilter) {
  let flatTags = [];
  for (let F in Tags) {
    let tags = Tags[F].tags;
    for (let i in tags) {
      let id = tags[i].id;

      if (useFilter) {
        if (flag_restrictID) {
          if ($.inArray(String(id), restrictIDArray) < 0) continue;
        }
        if (flag_excludeID) {
          if ($.inArray(String(id), excludeIDArray) >= 0) continue;
        }
      }

      flatTags.push(tags[i]);
    }
  }
  return flatTags;
}

/* Tags => allTagsID, ttags */
/* ttags[id][frame] is tag */
function getTTags() {
  allTagsID = new Set();

  /* Transpose Tags data structure */
  let ttags = {};
  for (let F in Tags) {
    let tags = Tags[F].tags;
    for (let i in tags) {
      let id = String(tags[i].id);

      allTagsID.add(id);

      if (flag_restrictID) {
        if ($.inArray(String(id), restrictIDArray) < 0) continue;
      }
      if (flag_excludeID) {
        if ($.inArray(String(id), excludeIDArray) >= 0) continue;
      }

      if (typeof ttags[id] === "undefined") ttags[id] = {};
      ttags[id][String(F)] = tags[i];
    }
  }

  return ttags;
}


/* ttags => tagIntervals */
function updateTagIntervals() {
  // ttags => tagIntervals
  tagIntervals = [];

  /* Convert to intervals */
  for (let id in ttags) {
    let obsarray = ttags[id];
    let activeInterval = [];
    let isActive = false;
    for (let frame in obsarray) {
      let tags = obsarray[frame];
      let f = Number(frame);

      if (!tagsSampleFilter(tags)) {
        continue;
      }

      if (isActive) {
        let doPush = false;
        if (activeInterval.end == f - 1) {
          // Extend active interval
          activeInterval["end"] = f;

          if (tags.hamming < 1000) {
            activeInterval.hammingavg =
              activeInterval.hammingavg + tags.hamming;
            activeInterval.dmavg = activeInterval.dmavg + tags.dm;
          } else {
            activeInterval.hammingavg = activeInterval.hammingavg + 0;
          }
        } else {
          // Do not extend active interval
          doPush = true;
        }
        if (doPush) {
          // Close previous
          //activeInterval['end']++
          if (tagsIntervalFilter(activeInterval)) {
            let len = activeInterval["end"] - activeInterval["begin"] + 1;
            activeInterval.hammingavg = activeInterval.hammingavg / len;
            activeInterval.dmavg = activeInterval.dmavg / len;
            tagIntervals.push(activeInterval);
          }
          // XXX Define y
          let y = chrono.config.idAxisMap(id)
          // Open new one
          activeInterval = {
            id: id,
            y: y,
            begin: f,
            end: f,
            hammingavg: tags.hamming,
            dmavg: tags.dm,
            labeling: {},
          };
        }
      } else {
        // XXX Define y
        let y = chrono.config.idAxisMap(id)
        // Open new one
        activeInterval = {
          id: id,
          y: y,
          begin: f,
          end: f,
          hammingavg: tags.hamming,
          dmavg: tags.dm,
          labeling: {},
        };
        isActive = true;
      }
    }
    // Close if active
    if (isActive)
      if (tagsIntervalFilter(activeInterval)) {
        //activeInterval['end']++
        let len = activeInterval["end"] - activeInterval["begin"] + 1;
        activeInterval.hammingavg = activeInterval.hammingavg / len;
        activeInterval.dmavg = activeInterval.dmavg / len;
        tagIntervals.push(activeInterval);
      }
  }
}

/* augment tagIntervals with labels from Tracks with same (frame,id) */
/* flatTracksAll, tagIntervals => tagIntervals
   also mark track obs on overlapping span as redundant */
function updateTagsLabels() {
  for (let ann of flatTracksAll) {
    if ("span" in ann.obs) {
      ann.span = { f1: Number(ann.obs.span.f1), f2: Number(ann.obs.span.f2) };
      ann.span.b1 = "manual";
      ann.span.b2 = "manual";
    } else {
      let f = Number(ann.frame);
      ann.span = { f1: f, f2: f };
      ann.span.b1 = "obs";
      ann.span.b2 = "obs";
    }
  }
  let tagIntervalsVirtual = [];
  for (let interval of tagIntervals) {
    interval.labeling = {
      labeled: false,
      entering: false,
      falsealarm: false,
      wrongid: false,
    };

    for (let ann of flatTracksAll) {
      if (ann.id != interval.id) continue;

      let f = Number(ann.frame);
      let f1 = Number(interval["begin"]);
      let f2 = Number(interval["end"]);

      if (ann.span.b1 != "manual") {
        if (f > f1 - 20 && f < f2 + 20) {
          interval.labeling.labeled = true;
          interval.labeling.entering = hasLabel(ann, "entering");
          interval.labeling.falsealarm = hasLabel(ann, "falsealarm");
          interval.labeling.wrongid = hasLabel(ann, "wrongid");

          if (hasLabel(ann, "wrongid") && ann.obs.newid != null) {
            interval.newid = ann.obs.newid;
            //console.log('ann=',ann,'=>',interval)
          }

          if (f1 < ann.span.f1) {
            ann.span.f1 = f1;
            ann.span.b1 = "tag";
          }
          if (f2 > ann.span.f2) {
            ann.span.f2 = f2;
            ann.span.b2 = "tag";
          }
        }
      } else {
        if (ann.span.f2 >= f1 && ann.span.f1 <= f2) {
          interval.labeling.labeled = true;
          interval.labeling.entering = hasLabel(ann, "entering");
          interval.labeling.falsealarm = hasLabel(ann, "falsealarm");
          interval.labeling.wrongid = hasLabel(ann, "wrongid");

          if (hasLabel(ann, "wrongid") && ann.obs.newid != null) {
            interval.newid = ann.obs.newid;
            //console.log('ann=',ann,'=>',interval)
          }
        }
      }
    }
    if (interval.labeling.wrongid && interval.newid != null) {
      let intervalV = Object.assign({}, interval);
      intervalV.oldid = intervalV.id;
      intervalV.id = intervalV.newid;
      intervalV.wrongid = false;
      intervalV.virtual = true;
      //console.log(interval,'=>',intervalV)
      tagIntervalsVirtual.push(intervalV);
    }
  }
  tagIntervals = tagIntervals.concat(tagIntervalsVirtual);

  // Find redundant Tracks
  for (let id in flatTracksValidGroupById) {
    obs_for_id = flatTracksValidGroupById[id];
    for (let j in obs_for_id) {
      if (j == 0) continue;
      let i = j - 1;

      let obs1 = obs_for_id[i];
      let obs2 = obs_for_id[j];

      if (obs1.span.f2 >= obs2.span.f1) {
        obs2.isredundant = true;
      }
    }
  }
}





// ### CHRONO D3 ACTIVITY INTERVALS
var __section__chronogram_d3_render_activities

function renderActivities(onlyScaling) {
  if (chrono.config.legacyActivities) {
    updateActivities(onlyScaling) // legacy
  } else {
    chronoIntervals.updateAndRender()
    chronoIntervals.render()

    chronoIntervals.renderEnterLeavePollen()

    renderChrono_danglingTracks(onlyScaling)

    chronoIntervals.renderSelection()
  }
}

class ChronoIntervals {
  constructor() {
    //this.intervalRects = d3.selectAll(".nothing");

    this.intervalClicked = this.intervalClicked.bind(this)
  }
  updateAndRender() {
    this.update()
    this.render()
  }
  update() {
    const that = this

    const [ xmin, xmax ] = axes.xScale.domain()

    // Keep only intervals within axes domain (with extra 1 frame)
    that.visibleIntervals = allIntervals.filter( d => (d.x2+2 >= xmin)&&(d.x1-1 <= xmax) )
  }
  render() {
    const that = this

    const intervalRects = svgInterval.selectAll(".interval")
      .data(that.visibleIntervals)
      .join(
        (enter) => enter.append('rect')
              .attr("class", "interval")
              .on("click", that.intervalClicked) // bound to chronointervals
              .on('mouseover', that.intervalMouseOver)
              .on('mouseout', that.intervalMouseOut)
              //.call( sel => sel.append('title') ) // Insert title child without breaking the chain
      )
      .attr("x", d => axes.xScale(d.x1) )
      .attr("y", d => axes.yScale(d.y) )
      .attr("width", d => axes.xScale(d.x2 + 1) - axes.xScale(d.x1) )
      .attr("height", d => axes.yScale.bandwidth()*0.5 )
      //.style("fill", "gray")  // Use CSS
      // .call( sel => sel.select('title')
      //     .text( d => `ID: ${d.id}, Frames: ${d.x1}-${d.x2}, Labels: ${d.labels}` )
      // ) // Update title child without breaking the chain
  }
  renderSelection() {
    const intervalRects = svgInterval.selectAll(".interval")
       .classed("selected", d => d.id == defaultSelectedBee)
  }
  renderEnterLeavePollen() {
    const intervalRects = svgInterval.selectAll(".interval")
       .classed("entering", d => d.haslabel['entering'])
       .classed("leaving", d => d.haslabel['leaving'])
       .classed("pollen", d => d.haslabel['pollen'])
       .classed("fanning", d => d.haslabel['fanning'])
  }
  intervalClicked(event, d) {
    console.log("CLICK interval d=", d);
    // Prevent default chronogram click to go to the correct frame
    event.stopPropagation();

    //gotoEvent(d.x1, d.id); // Legacy: jump to start of interval
    let frame = axes.getFrameFromEvent(event)
    gotoEvent(frame, d.id)

    this.renderSelection() // function need to be bound correctly
  }
      
  intervalMouseOver(event, d) {
      let message = `ID=${d.id}
        <br>Frames=${d.x1}-${d.x2} +
        <br>Time=${format_HMS(videoControl.frameToTime(d.x1))}
        <br><u>Annotation:</u>
        <br>Labels=${d.labels}`.trim();

      // if (d.wrongid) {
      //   message += `\n<br>newid=${d.newid}`;
      // }
      // if (d.tag != undefined) {
      //   message +=
      //     "<br><u>Tag:</u>" +
      //     "<br>Hamming=" +
      //     d.tag.hamming +
      //     "<br>DM=" +
      //     d.tag.dm;
      // } else {
      //   message += "<br><u>Tag:</u><br><i>None</i>";
      // }
      chrono.tooltip
        .style("left", event.pageX+20 + "px")
        .style("top", event.pageY+20 + "px")
        .style("visibility", "visible")
        .html(message);
    }
    intervalMouseOut(event, d) {
      chrono.tooltip.style("visibility", "hidden");
    }
}
chronoIntervals = new ChronoIntervals()


function renderChrono_danglingTracks(onlyScaling) {
  const chart = svgTop;

  if (!chrono.config.showDanglingTracks) { 
    chart.selectAll(".dangling_start").remove()
    chart.selectAll(".dangling_end").remove()
    return;
  }

  if (chrono.config.hide_non_dangling == null) chrono.config.hide_non_dangling = true

  const danglingStartIntervals = chrono.config.hide_non_dangling? allIntervals.filter(d=>d.startInsideROI) : allIntervals
  const danglingEndIntervals = chrono.config.hide_non_dangling? allIntervals.filter(d=>d.endInsideROI) : allIntervals

  const dangling_start = chart.selectAll(".dangling_start")
    .data(danglingStartIntervals)
    .join('rect')
      .attr("class", "dangling_start")
      .attr("x", d => axes.xScale(Number(d.x1)-0.5) )
      .attr("width", d => axes.xScale(Number(d.x1))-axes.xScale(Number(d.x1)-0.5) )
      .attr("y", d => axes.yScale(d.y))
      .attr('height', axes.yScale.bandwidth()*0.5)
      //.attr("r", d=>d.startInsideROI?axes.yScale.bandwidth()/4:axes.yScale.bandwidth()/8)
      .style("fill", d=>d.startInsideROI?"red":"green")
      .style("stroke", d=>d.startInsideROI?"red":"green")
      .style("stroke-width", 2)
  
  const dangling_end = chart.selectAll(".dangling_end")
    .data(danglingEndIntervals)
    .join('rect')
      .attr("class", "dangling_end")
      .attr("x", d => axes.xScale(Number(d.x2)+1) )
      .attr("width", d => axes.xScale(Number(d.x2)+1.5)-axes.xScale(Number(d.x2)+1) )
      .attr("y", d => axes.yScale(d.y))
      .attr('height', axes.yScale.bandwidth()*0.5)
      //.attr("r", d=>d.endInsideROI?axes.yScale.bandwidth()/4:axes.yScale.bandwidth()/8)
      .style("fill", d=>d.endInsideROI?"red":"green")
      .style("stroke", d=>d.endInsideROI?"red":"green")
      .style("stroke-width", 2)
}


// ### OBS TABLE IN LABELING TAB
var __section__obs_table

function updateObsTable() {
  updateFlatTracks()
  renderObsTable()
}
function renderObsTable() {
  showObsTable = !$("#labelingTab > .ui-accordion-header").hasClass(
    "ui-accordion-header-collapsed"
  );
  if (showObsTable) {
    d3.select("#obsTable").html("");
    var table = d3.select("#obsTable").append("table");

    function ƒ(name) {
      return function (d) {
        return d[name];
      };
    }

    var columns = [
      { head: "ID", cl: "id", html: ƒ("id") },
      { head: "Frame", cl: "frame", html: ƒ("frame") },
      { head: "Labels", cl: "labels", html: ƒ("labels") },
    ];

    function onObsTableRowClick(event, d) {
      console.log("onObsTableRowClick: d=", d);
      gotoEvent(Number(d.frame), d.id);
    }

    table
      .append("thead")
      .append("tr")
      .selectAll("th")
      .data(columns)
      .enter()
      .append("th")
      .attr("class", function (d) {
        return d.cl;
      })
      .text(function (d) {
        return d.head;
      });

    table
      .append("tbody")
      .selectAll("tr")
      .data(flatTracks)
      .enter()
      .append("tr")
      .classed("obsTableRow", true)
      .on("click", onObsTableRowClick)
      .selectAll("td")
      .data(function (row, i) {
        // evaluate column objects against the current row
        return columns.map(function (c) {
          var cell = {};
          d3.keys(c).forEach(function (k) {
            cell[k] = typeof c[k] == "function" ? c[k](row, i) : c[k];
          });
          return cell;
        });
      })
      .enter()
      .append("td")
      .html(ƒ("html"))
      .attr("class", ƒ("cl"));
  }
}

// ### CHRONO EXTRA FUNCTION
var __section__chronogram_utils



function format_HMS(date, format) {
  function pad(n) {
    return ("0" + n).substr(-2);
  }

  var time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(pad)
    .join(":");

  if (format === "HMS.") {
    time += "." + date.getMilliseconds();
  }

  return time;
}

// Util function for flashing a button to attrach user's attention
function flash(elements) {
    $(elements).toggleClass("focus",true)
    var repeat = 0
    var interval = setInterval(function() {if (repeat>4) {$(elements).toggleClass("focus",false); clearInterval(interval); return;}
                                           repeat+=1;
    $(elements).toggleClass("focus")
  }, 100)
};



function debouncer(func, timeout) {
  var timeoutID,
    timeout = timeout || 100;
  return function () {
    var scope = this,
      args = arguments;
    clearTimeout(timeoutID);
    timeoutID = setTimeout(function () {
      func.apply(scope, Array.prototype.slice.call(args));
    }, timeout);
  };
}


function interpolateTags(maxgap) {
  tagIntervals = [];

  function getAllTTags() {
    /* Transpose Tags data structure */
    let ttags = {};
    for (let F in Tags) {
      let tags = Tags[F].tags;
      for (let i in tags) {
        let id = String(tags[i].id);

        if (typeof ttags[id] === "undefined") ttags[id] = {};
        ttags[id][String(F)] = tags[i];
      }
    }
    return ttags;
  }

  let ttags = getAllTTags();

  function pushInterpolate(id, f1, f2) {
    let T1 = ttags[id][f1];
    let T2 = ttags[id][f2];
    let P1 = T1.p;

    for (let j = f1 + 1; j < f2; j++) {
      let a = (j - f1) / (f2 - f1);
      let cx = (1 - a) * T1.c[0] + a * T2.c[0];
      let cy = (1 - a) * T1.c[1] + a * T2.c[1];
      let dx = cx - T1.c[0];
      let dy = cy - T1.c[1];
      //cx = T1.c[0]
      //cy = T1.c[1]
      //dx = 0
      //dy = 0
      let pts = [
        [P1[0][0] + dx, P1[0][1] + dy],
        [P1[1][0] + dx, P1[1][1] + dy],
        [P1[2][0] + dx, P1[2][1] + dy],
        [P1[3][0] + dx, P1[3][1] + dy],
      ];
      if (Tags[j] == null) {
        Tags[j] = { tags: [] };
      }
      // XXX Define y
      let y = chrono.config.idAxisMap(id)
      Tags[j].tags.push({
        id: id,
        y: y,
        c: [cx, cy],
        hamming: 1000,
        p: pts,
        frame: j,
      });
      console.log("interpolate id=" + id + " f=" + j);
    }
  }

  /* Convert to intervals */
  for (let id in ttags) {
    let obsarray = ttags[id];
    let activeInterval = [];
    let isActive = false;
    for (let f0 in obsarray) {
      let f = Number(f0);
      let tags = obsarray[f];

      if (!tagsSampleFilter(tags)) {
        continue;
      }

      if (isActive) {
        let doPush = false;
        if (activeInterval.end == f - 1) {
          activeInterval.end = f;
        } else if (f - activeInterval.end < maxgap) {
          // Try to interpolate

          pushInterpolate(id, activeInterval.end, f);

          activeInterval.end = f;
        } else {
          doPush = true;
        }
        if (doPush) {
          // Close previous
          //activeInterval['end']++
          //tagIntervals.push(activeInterval)
          // Open new one
          activeInterval = { id: id, begin: f, end: f };
        }
      } else {
        // Open new one
        activeInterval = { id: id, begin: f, end: f };
        isActive = true;
      }
    }
    // Close if active
    if (isActive) activeInterval["end"]++;
    //tagIntervals.push(activeInterval)
  }
}

function computeMotionDirection() {
  cacheTags();
  for (var activeInterval of tagIntervals) {
    let tags1 = getTags(activeInterval.begin, activeInterval.id);
    let tags2 = getTags(activeInterval.end, activeInterval.id);
    activeInterval.dir = undefined;
    if (tags1 == null || tags2 == null) continue;
    if (tags1.length == 1 && tags2.length == 1) {
      let tag1 = tags1[0];
      let tag2 = tags2[0];
      if (tag2.c[1] < tag1.c[1]) activeInterval.dir = "entering";
      else if (tag2.c[1] > tag1.c[1]) activeInterval.dir = "leaving";
    }
  }
  updateTagIntervals();
}

function cleanObsoleteEventsCB() {
  var r = confirm(
    "CAUTION !!!! Operation cannot be undone. Please confirm: Delete all obsolete events, i.e. no associated tag or low DM or inside excludeRects. "
  );
  if (r == true) {
    console.log("cleanObsoleteEvents");
    cleanObsoleteEvents();
  } else {
    console.log("cleanObsoleteEvents canceled");
  }
}

function cleanObsoleteEvents() {
  for (let F in Tracks) {
    for (let id in Tracks[F]) {
      let obs = Tracks[F][id];

      if (hasLabel(obs, "falsealarm") || hasLabel(obs, "wrongid")) {
        if (!obs.tag) {
          console.log("No tag: Delete Tracks[" + F + "][" + id + "] = ", obs);
          delete Tracks[F][id];
        } else {
          if (obs.tag.dm < 20) {
            console.log("low DM: Delete Tracks[" + F + "][" + id + "] = ", obs);
            delete Tracks[F][id];
          }
          if (!tagsSampleFilterExcludeRects(obs.tag)) {
            console.log(
              "excludeRect: Delete Tracks[" + F + "][" + id + "] = ",
              obs
            );
            delete Tracks[F][id];
          }
        }
      }
    }
  }
  refreshChronogram();
}
