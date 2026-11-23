/*jshint esversion: 6, asi: true */
// What the chronogram draws (ES module, refactor slice 8 step 8d): the axes (layout, resizing, domains), the time marks, the
// video span and the track window, the refresh (`refreshChronogram`, `drawChrono`, `updateChrono`), the intervals and the
// obs table. Part of the former ChronoControl.js. It reads `chrono`, `chronoState` and the page globals at call time.

import { instrument } from "../core/RefreshInstrumentBridge.js"
import { debouncer, format_HMS } from "./ChronoUtils.js"
import { updateChronoData, updateFlatTracks, updateTagIntervals } from "./ChronoData.js"

export function refreshChronoLayout() {
  const doRefresh = function () {
    if (logging.axesEvents) {
      console.log("refreshChronoLayout");
    }
    // Make sure chrono is flushed top/left even after resize
    // from top/left handles
    $("#chronoDiv").css({ top: 0, left: 0 });
    if (!$("#chronoTab").hasClass("collapsed")) {
      chrono.axes.refreshLayout();
    }
  };
  debouncer(doRefresh)();
  //doRefresh()
}


// ### AXES MANAGEMENT
var __section__chronogram_axes_management


// ### CHRONO RESIZING
var __subsection__chronogram_axes_resizing

export function getChronoItemHeight() {
  //return chronoItemHeight;

  let H = $("#chronoDiv").height();

  let mh = chrono.axes.margin.top + chrono.axes.margin.bottom;
  let N = chrono.axes.ydomain().length;
  let itemHeight = (H - mh) / N;

  console.trace(itemHeight);

  return itemHeight;
}
export function adjustChronogramHeight(itemHeight) {
  if (itemHeight == null) {
    itemHeight = 12;
  }
  chrono.config.chronoDisplay.chronoItemHeight = itemHeight;

  let mh = chrono.axes.margin.top + chrono.axes.margin.bottom;
  let domain = chrono.axes.ydomain();
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
  if (isNaN(getVideoInfo().duration)) domain = [0, 1];
  else domain = [0, getVideoInfo().nframes-1];
  if (logging.chrono) console.log("domainxFromVideo: domain=", domain);
  return domain;
}
function domainxFromChronogramData() {
  if (chronoState.chronogramData.length === 0) return [0, 1];
  var range = d3.extent(chronoState.chronogramData, function (d) {
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
  if (chronoState.chronogramData.length === 0) return [];
  let ids = new Set();
  if (chrono.config.filter.flag_hideInvalid) {
    chronoState.chronogramData.forEach(function (d) {
      let labs = d.labels.split(",");
      if (labs.indexOf("wrongid") == -1 && labs.indexOf("falsealarm") == -1)
        ids.add(d.id);
    });
  } else {
    chronoState.chronogramData.forEach(function (d) {
      ids.add(d.id);
    });
  }
  return [...ids]; // Convert to array
}
function validTagIdsDomain() {
  if (chronoState.tagIntervals.length === 0) return [];
  let ids = new Set();
  if (chrono.config.filter.flag_hideInvalid) {
    chronoState.tagIntervals.forEach(function (d) {
      if (
        !containsLabel(d.labels, "wrongid") &&
        !containsLabel(d.labels, "falsealarm")
      )
        ids.add(d.id);
    });
  } else {
    chronoState.tagIntervals.forEach(function (d) {
      ids.add(d.id);
    });
  }
  return [...ids]; // Convert to array
}
export function validAllTagIdsDomain() {
  return sortIds(chronoState.allTagsID);
}
export function validVisibleTagIdsDomain() {
  return sortIds(chrono.axes.ydomain());
}

/* Update chronogram axes properties */
export function updateChronoXDomainFromVideo() {
  chrono.axes.updateVideoinfo(getVideoInfo()) // Update starttime and realfps
  chrono.axes.xdomain(domainxFromVideo());
}

export function sortIds(IDarray) {
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
  let domainset
  if (tagMode == 'Tracks')
    domainset = new Set([...validIdsDomain()]);
  else
    domainset = new Set([...validIdsDomain(), ...validTagIdsDomain()]);
  let domain = sortIds([...domainset]); // convert back to sorted array
  return domain;
}
function updateChronoYDomain() {
  //var a = domainyFromChronogramData()
  //var b = domainyFromTagData()
  //axes.ydomain([Math.min(a[0],b[0]),Math.max(a[1],b[1])]) // Linear scale

  var domain = [];

  if (chrono.config.filter.flag_restrictID) {
    domain = chrono.config.filter.restrictIDArray;
  } else {
    domain = validIdsChrono();
  }
  if (logging.axesEvents) console.log("updateChronoYDomain: domain=", domain);

  //let oldN=axes.ydomain().length
  //let N=domain.length

  //let itemHeight = getChronoItemHeight()

  if (chrono.config.idMap.idAxisMap) {
    // let trackLength={}
    // let yEnd={}; 
    // chrono.trackY={}; 
    // console.log('allIntervals',allIntervals)
    // allIntervals.forEach( (item) => {item.frames = item.x2-item.x1+1; trackLength[item.id]=item.frames} )
    // allIntervals.forEach( (item) => { let L=trackLength[item.id]; let curY=(L>1)+(L>2)+(L>4)+(L>8)+(L>16)+(L>32)+(L>64)+(L>128)+(L>256); for (let y=curY; ; y++) {
    //     if (yEnd[y]==null || item.x1>yEnd[y]) { yEnd[y]=item.x2; chrono.trackY[item.id]=y; break; }
    // }  } )
    //chrono.config.idMap.idAxisMap = (id) => chrono.trackY[id]
    // Apply an id mapping if exists
    const mappedDomain = [...new Set( domain.map(chrono.config.idMap.idAxisMap) )].sort( (a,b) => -Number(b)+Number(a))
    chrono.axes.ydomain(mappedDomain);
  } else {
    chrono.axes.ydomain(domain);
  }

  adjustChronogramHeight(chrono.config.chronoDisplay.chronoItemHeight);

  //axes.ydomain(['0','1','2','3','10','12']) // Testing
}




// ### CHRONO MAIN VIEW
var __section__chronogram_main_view

// ### CHRONO DYNAMIC ELEMENTS (TIMEMARK, SELECTION)
var __section__chronogram_dynamic_elements

export var previewBar = { active: false, shown: false }; // a preview is going on / has shown a frame since it began
export function updateTimeMark() {
  var frame = videoControl.getCurrentFrame();
  if (previewBar.active) {
    previewBar.shown = true;
    chrono.axes.setTimeMarkState("preview");
  }
  if (logging.frameEvents) console.log("updateTimeMark: frame=", frame);
  if (typeof frame == "undefined") {
    frame = 0;
  }
  chrono.axes.setTimeMark(frame);
}
export function updatePreviewTimeMark() {
  updateTimeMark();
  //     if (videoControl.previewFrame != null)
  //         axes.setTimeMark(videoControl.previewFrame);
}

export function updateChronoSelection() {
  let id = selection.getId();
  chrono.axes.highlightId(id);
}


// ### CHRONO TIMESPANS
var __section__chronogram_timespans

//put first and last frame in vid
export function initVideoSpan() {
  var chronoGroup = chrono.axes.chronoGroup;
  var videoSpan = chronoGroup
    .append("g")
    .attr("id", "videoSpan")
    .attr("clip-path", "url(#videoSpanClipPath)");
  videoSpan
    .append("clipPath")
    .attr("id", "videoSpanClipPath") // give the clipPath an ID
    .append("rect")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", chrono.axes.width())
    .attr("height", 15);
  videoSpan
    .append("rect")
    .attr("class", "background")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", chrono.axes.width())
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
  var videoSpan = chrono.axes.chronoGroup.select("#videoSpan");
  //videoSpan.attr("transform",
  //               "translate("+(axes.margin.left)+","+(axes.margin.top)+")")
  videoSpan
    .selectAll("#videoSpanClipPath > rect")
    .attr("width", chrono.axes.width())
    .attr("y", -15);
  videoSpan
    .selectAll(".background")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", chrono.axes.width())
    .attr("height", 15);
  videoSpan
    .selectAll(".interval")
    .attr("x", chrono.axes.xScale(0))
    .attr("y", -13)
    .attr("width", chrono.axes.xScale(getVideoInfo().nframes) - chrono.axes.xScale(0)) // frames 0..nframes-1, frame f is [f, f+1)
    .attr("height", 11);
  videoSpan
    .selectAll(".label")
    .attr("x", chrono.axes.xScale(0) + 2)
    .attr("y", -4)
    .text(getVideoInfo().name.split("/").pop());
}

export function initTrackWindowSpan() {
  var chronoGroup = chrono.axes.chronoGroup;
  var trackWindowSpan = chronoGroup
    .append("g")
    .attr("id", "trackWindowSpan")
    .attr("clip-path", "url(#trackWindowSpanClipPath)");
  trackWindowSpan
    .append("clipPath")
    .attr("id", "trackWindowSpanClipPath") // give the clipPath an ID
    .append("rect")
    .attr("x", 0)
    .attr("y", -15)
    .attr("width", chrono.axes.width())
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
  $(chrono.axes).on("previewframe:trackend", updateTrackWindowSpan);
  $(chrono).on("trackWindow:change", updateTrackWindowSpan);
}
export function updateTrackWindowSpan() {
  var trackWindowSpan = chrono.axes.chronoGroup.select("#trackWindowSpan");
  trackWindowSpan
    .selectAll("#trackWindowSpanClipPath > rect")
    .attr("width", chrono.axes.width())
    .attr("y", -15);
  let f = videoControl.getCurrentFrame();
  let fmin = f - chrono.config.trackWindow.trackWindowBackward;
  let fmax = f + chrono.config.trackWindow.trackWindowForward;
  trackWindowSpan
    .selectAll(".interval")
    .attr("x", chrono.axes.xScale(fmin))
    .attr("y", -13)
    .attr("width", chrono.axes.xScale(fmax + 1) - chrono.axes.xScale(fmin)) // frame fmax is the interval [fmax, fmax+1)
    .attr("height", 11);
}
export function getWindow() {
  let f = videoControl.getCurrentFrame();
  let fmin = f - chrono.config.trackWindow.trackWindowBackward;
  let fmax = f + chrono.config.trackWindow.trackWindowForward;

  if (fmin < 0) fmin = 0;
  if (fmax > videoControl.maxframe()) fmax = videoControl.maxframe();

  return [fmin, fmax];
}




// ### CHRONO UPDATING
var __section__chronogram_update

/* Hard refresh: prepare data then redraw */
export function refreshChronogram() {
  if (logging.chrono) console.log('refreshChronogram')

  updateTagsPanel()

  updateChronoData()

  drawChrono();

  renderObsTable();
}

/* Disable the fields that need the DM of the tags when the loaded Tags do not have it */
function updateTagsPanel() {
  const haveDM = AnnotationStore.getTagsHaveDM();
  $(".requireDM").prop("disabled", !haveDM);
  $(".requireDM").toggleClass("disabled", !haveDM);
}

/* Soft refresh: update ydomain and render */
export function drawChrono() {
  // Strong update:
  // Redraw chronogram after change in chronogramData content
  // Need to adjust range

  if (logging.chrono) console.log("drawChrono");

  updateChronoYDomain(); // axes.ydomain() triggers axes:changed, which runs updateChrono()
  //axes.ydomain([0,20]) // Uncomment for testing
}

/* Render chrono */
export function updateChrono() {
  // Weak update:
  // Update chronogram without adjusting range

  // IMPORTANT: do not call axes.refreshAxes() or any
  // function that triggers is such as axes.here,
  // as it would generate an infinite loop
  // Put that is the stronger update function drawChrono

  if (logging.chrono) console.log("drawChrono");

  const start = performance.now()

  // Redraw activities
  renderActivities()
  updateTagIntervals();

  // Redraw dynamic markers
  updateTimeMark(); // Normally already updated by frameChanged
  updateVideoSpan();
  updateTrackWindowSpan();

  const end = performance.now()
  chrono.perf.chronoRedraw = end-start

  let statusMsg = `Chrono update ${Math.round(chrono.perf.chronoUpdate)} ms, redraw ${Math.round(chrono.perf.chronoRedraw)} ms;
data: ${chronoState.chronogramData.length} items, ${chronoState.allIntervals.length} intervals, ${chronoState.flatTags.length} tags`

  if ( chrono.perf.chronoUpdate > 50 || chrono.perf.chronoRedraw > 50 ) {
    statusMsg += '<br><b>Slow display, consider closing the chronogram or filtering the data</b>'
  }

  $('#chronoStatusBar').html(statusMsg)

}





// ### CHRONO D3 ACTIVITY INTERVALS
var __section__chronogram_d3_render_activities

function renderActivities(onlyScaling) {
  chrono.chronoIntervals.updateAndRender()
  chrono.chronoIntervals.render()

  chrono.chronoIntervals.renderEnterLeavePollen()

  renderChrono_spans()

  renderChrono_danglingTracks(onlyScaling)

  chrono.chronoIntervals.renderSelection()
}

export class ChronoIntervals {
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

    const [ xmin, xmax ] = chrono.axes.xScale.domain()

    // Keep only intervals within axes domain (with extra 1 frame)
    that.visibleIntervals = chronoState.allIntervals.filter( d => (d.x2+2 >= xmin)&&(d.x1-1 <= xmax) )
  }
  render() {
    const that = this

    const intervalRects = chrono.layers.svgInterval.selectAll(".interval")
      .data(that.visibleIntervals)
      .join(
        (enter) => enter.append('rect')
              .attr("class", "interval")
              .on("click", that.intervalClicked) // bound to chronointervals
              .on('mouseover', that.intervalMouseOver)
              .on('mouseout', that.intervalMouseOut)
              //.call( sel => sel.append('title') ) // Insert title child without breaking the chain
      )
      .attr("x", d => chrono.axes.xScale(d.x1) )
      .attr("y", d => chrono.axes.yScale(d.y) )
      .attr("width", d => chrono.axes.xScale(d.x2 + 1) - chrono.axes.xScale(d.x1) )
      .attr("height", d => chrono.axes.yScale.bandwidth()*0.5 )
      //.style("fill", "gray")  // Use CSS
      // .call( sel => sel.select('title')
      //     .text( d => `ID: ${d.id}, Frames: ${d.x1}-${d.x2}, Labels: ${d.labels}` )
      // ) // Update title child without breaking the chain
  }
  renderSelection() {
    const intervalRects = chrono.layers.svgInterval.selectAll(".interval")
       .classed("selected", d => d.id == selection.getId())
  }
  renderEnterLeavePollen() {
    const intervalRects = chrono.layers.svgInterval.selectAll(".interval")
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
    let frame = chrono.axes.getFrameFromEvent(event)
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


/* obs.span {f1, f2} drawn as a thin bar on the row of the id, behind the intervals (option "Show spans").
   Observations sharing the same id and span (start and end event of a track) give one bar. */
function renderChrono_spans() {
  if (!chrono.config.chronoDisplay.flag_showSpans) {
    chrono.layers.svgSpanRects.selectAll(".spanbar").remove()
    return;
  }
  const [ xmin, xmax ] = chrono.axes.xScale.domain()
  const seen = new Set()
  const spans = []
  for (const ann of chronoState.flatTracksAll) {
    const sp = ann.obs.span
    if (sp == null) continue
    const f1 = Number(sp.f1), f2 = Number(sp.f2)
    if (!(f2 + 2 >= xmin && f1 - 1 <= xmax)) continue
    const key = ann.id + "|" + f1 + "|" + f2
    if (seen.has(key)) continue
    seen.add(key)
    spans.push({ id: ann.id, y: ann.y, f1: f1, f2: f2 })
  }
  chrono.layers.svgSpanRects.selectAll(".spanbar")
    .data(spans)
    .join("rect")
      .attr("class", "spanbar")
      .attr("x", d => chrono.axes.xScale(d.f1))
      .attr("width", d => chrono.axes.xScale(d.f2 + 1) - chrono.axes.xScale(d.f1))
      .attr("y", d => chrono.axes.yScale(d.y) + chrono.axes.yScale.bandwidth() * 0.15)
      .attr("height", chrono.axes.yScale.bandwidth() * 0.2)
      .append("title").text(d => `ID: ${d.id}, span: ${d.f1}-${d.f2}`)
}

function renderChrono_danglingTracks(onlyScaling) {
  const chart = chrono.layers.svgTop;

  if (!chrono.config.chronoDisplay.showDanglingTracks) { 
    chart.selectAll(".dangling_start").remove()
    chart.selectAll(".dangling_end").remove()
    return;
  }

  if (chrono.config.chronoDisplay.hide_non_dangling == null) chrono.config.chronoDisplay.hide_non_dangling = true

  const danglingStartIntervals = chrono.config.chronoDisplay.hide_non_dangling? chronoState.allIntervals.filter(d=>d.startInsideROI) : chronoState.allIntervals
  const danglingEndIntervals = chrono.config.chronoDisplay.hide_non_dangling? chronoState.allIntervals.filter(d=>d.endInsideROI) : chronoState.allIntervals

  const dangling_start = chart.selectAll(".dangling_start")
    .data(danglingStartIntervals)
    .join('rect')
      .attr("class", "dangling_start")
      .attr("x", d => chrono.axes.xScale(Number(d.x1)-0.5) )
      .attr("width", d => chrono.axes.xScale(Number(d.x1))-chrono.axes.xScale(Number(d.x1)-0.5) )
      .attr("y", d => chrono.axes.yScale(d.y))
      .attr('height', chrono.axes.yScale.bandwidth()*0.5)
      //.attr("r", d=>d.startInsideROI?axes.yScale.bandwidth()/4:axes.yScale.bandwidth()/8)
      .style("fill", d=>d.startInsideROI?"red":"green")
      .style("stroke", d=>d.startInsideROI?"red":"green")
      .style("stroke-width", 2)
  
  const dangling_end = chart.selectAll(".dangling_end")
    .data(danglingEndIntervals)
    .join('rect')
      .attr("class", "dangling_end")
      .attr("x", d => chrono.axes.xScale(Number(d.x2)+1) )
      .attr("width", d => chrono.axes.xScale(Number(d.x2)+1.5)-chrono.axes.xScale(Number(d.x2)+1) )
      .attr("y", d => chrono.axes.yScale(d.y))
      .attr('height', chrono.axes.yScale.bandwidth()*0.5)
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
export function renderObsTable() {
  const showObsTable = !$("#labelingTab > .ui-accordion-header").hasClass(
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
      .data(chronoState.flatTracks)
      .enter()
      .append("tr")
      .classed("obsTableRow", true)
      .on("click", onObsTableRowClick)
      .selectAll("td")
      .data(function (row, i) {
        // evaluate column objects against the current row
        return columns.map(function (c) {
          var cell = {};
          Object.keys(c).forEach(function (k) {
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
};

// The refresh instrumentation (core/RefreshInstrumentBridge.js, ADR 0009) wraps the entry points of the chronogram
// refresh so that `refreshLog` records them. A module-private call does not go through `window.X`, so each is rebound
// here: calls inside the module, handlers bound by reference and the exports all see the wrapped function.
refreshChronogram = instrument("chrono", "refreshChronogram", refreshChronogram)
drawChrono = instrument("chrono", "drawChrono", drawChrono)
updateChrono = instrument("chrono", "updateChrono", updateChrono)
renderObsTable = instrument("table", "renderObsTable", renderObsTable)
updateTimeMark = instrument("chrono", "updateTimeMark", updateTimeMark)
updatePreviewTimeMark = instrument("chrono", "updatePreviewTimeMark", updatePreviewTimeMark)
updateTrackWindowSpan = instrument("chrono", "updateTrackWindowSpan", updateTrackWindowSpan)
updateChronoSelection = instrument("chrono", "updateChronoSelection", updateChronoSelection)
updateChronoXDomainFromVideo = instrument("chrono", "updateChronoXDomainFromVideo", updateChronoXDomainFromVideo)
