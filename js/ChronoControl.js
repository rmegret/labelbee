/*jshint esversion: 6, asi: true */

function chronoAdjust(mode) {
    let factor = 1.2
    let mh = axes.margin.top+axes.margin.bottom
    let mw = axes.margin.left+axes.margin.right
    if (mode == 'H-') {
        let h = ($('#chronoDiv').height()-mh)/factor+mh
        if (h<100) h=100;
        $('#chronoDiv').height(h)
    }
    if (mode == 'H=') {
        adjustChronogramHeight(10)
    }
    if (mode == 'H+') {
        let h = ($('#chronoDiv').height()-mh)*factor+mh
        $('#chronoDiv').height(h)
    }

    if (mode == 'W-') {
        let w = ($('#chronoDiv').width()-mw)/factor+mw
        if (w<200) w=200;
        $('#chronoDiv').width(w)
    }
    if (mode == 'W=') {
        let w = $('#canvasresize').width()
        if (w<200) w=200;
        $('#chronoDiv').width(w)
    }
    if (mode == 'W+') {
        let w = ($('#chronoDiv').width()-mw)*factor+mw
        $('#chronoDiv').width(w)
    }
}

function adjustChronogramHeight(itemHeight) {
    if (itemHeight == null) {
        itemHeight = 10
    }

    let mh = axes.margin.top+axes.margin.bottom
    let domain = axes.ydomain()
    let minheight = domain.length*itemHeight + mh
    if (minheight < 100) minheight = 100;
    //if ($('#chronoDiv').height() < minheight) {
        $('#chronoDiv').height(minheight)
    //}
}

// ###########################################################
// CHRONOGRAM

function initChrono() {
    // global variables
    axes = undefined
    chronogramData = []
    tagsChronogramData = []

    // SVG adjust to its parent #chronoDiv
    var svg = d3.select("#svgVisualize")    
    svg.attr("width", "100%").attr("height", "100%")

    /* ## Build the axes (resizable) ## */

    options = {useOrdinalScale: true}
    axes = new ChronoAxes(svg, videoinfo, options)
    axes.onClick = onAxesClick         // Callback when the user clicks in axes
    axes.onAxesChanged = onAxesChanged // Callback when zooming or resizing axes
    
    // For some reason, svg does not have the correct size at the beginning,
    // trigger an asynchronous refresh
    setTimeout(axes.refreshLayout, 50)
    
    // Make it resizable using jQuery-UI
    $("#chronoDiv").resizable({
      helper: "ui-resizable-helper",
    });
    // Detect #chronoDiv resize using ResizeSensor.js
    // Note: cannot detect resize of SVG directly
    new ResizeSensor($("#chronoDiv")[0], function() {
       console.log('#chronoDiv resized');
       axes.refreshLayout()
    });
    // Equivalent pure jQuery seems to have trouble 
    // the size of chronoDiv seems to be defined after the callback is called
    //     $("#chronoDiv").on("resize", function(event) {
    //         console.log('#chronoDiv.onresize',event)
    //         axes.refreshLayout()
    //         return false
    //       })

    $( videoControl ).on('frame:change', updateTimeMark)
    
    function updatePreviewTimeMark() {
        axes.setTimeMark(videoControl.previewFrame);
    }
    function endPreview() {
        updateTimeMark();
        videoControl.hardRefresh();
    }
    $( videoControl ).on('previewframe:change', updatePreviewTimeMark)
    $( axes ).on('previewframe:trackend', endPreview)

    /* ## Init chronogram content ## */
    
    initActivities()     
    initTagIntervals()
    
    initVideoSpan()
    initTrackWindowSpan()
}

/* Synchronization between chronogram, video and chronogramData */
function domainxFromVideo() {
    var domain
    if (isNaN(videoinfo.duration))
      domain = [0,1]
    else
      domain = [0, videoinfo.nframes]
    if (logging.chrono)
      console.log("domainxFromVideo: domain=",domain)
    return domain
}
function domainxFromChronogramData() {
    if (chronogramData.length === 0) return [0,1]
    var range = d3.extent(chronogramData, function(d) {return Number(d.x); })
    return [range[0]-0.5, range[1]+0.5] // add some margin
}
function domainyFromChronogramData() {
    if (chronogramData.length === 0) return [0,1]
    var range = d3.extent(chronogramData, function(d) {return Number(d.y); })
    return [range[0], range[1]+1.0] // Add 1.0 for the height of the interval
}
function domainyFromTagData() {
    if (tagIntervals.length === 0) return [0,1]
    var range = d3.extent(tagIntervals, function(d) {return Number(d.id); })
    return [range[0], range[1]+1.0] // Add 1.0 for the height of the interval
}
function validIdsDomain() {
    if (chronogramData.length === 0) return []
    let ids = new Set()
    chronogramData.forEach(function(d) {ids.add(d.y)})
    return [...ids] // Convert to array
}
function validTagIdsDomain() {
    if (tagIntervals.length === 0) return []
    let ids = new Set()
    tagIntervals.forEach(function(d) {ids.add(d.id)})
    return [...ids] // Convert to array
}


/* Update chronogram axes properties */
function updateChronoXDomainFromVideo() {
    axes.xdomain(domainxFromVideo())
}
function updateChronoYDomain() {
    //var a = domainyFromChronogramData()
    //var b = domainyFromTagData()
    //axes.ydomain([Math.min(a[0],b[0]),Math.max(a[1],b[1])]) // Linear scale
    
    // Utility function to sort mixed numbers/alpha+number
    // Source: http://stackoverflow.com/a/4340448
    function parseItem (item) {
      const [, stringPart = '', numberPart = 0] = /(^[a-zA-Z]*)(\d*)$/.exec(item) || [];
      return [stringPart, numberPart];
    }
    function mixedCompare(a,b) {
        const [stringA, numberA] = parseItem(a);
        const [stringB, numberB] = parseItem(b);
        const comparison = stringA.localeCompare(stringB);
        return comparison === 0 ? Number(numberA) - Number(numberB) : comparison;
    }
    
    let domain = validIdsDomain()
    let domainTags = validTagIdsDomain()
    domainset = new Set([...domain, ...domainTags]) // Merge the sets
    domain = [...domainset].sort(mixedCompare) // convert back to sorted array
    
    console.log('updateChronoYDomain: domain=',domain)
    
    axes.ydomain(domain)
    
    //axes.ydomain(['0','1','2','3','10','12']) // Testing
    
}
function updateTimeMark() {
    var frame = getCurrentFrame();
    if (typeof frame == "undefined") {
      frame = 0;
    }
    axes.setTimeMark(frame);
}

/* Callbacks to react to changes in chronogram axes */
function onAxesClick(event) {
    // User clicked in chronogram axes
    var frame = event.frame
    var id = event.id
    if (logging.axesEvents)
        console.log("onAxesClick: seeking to frame=",frame,"...");
 
    if (event.type==="move") {
        videoControl.seekFrame(frame, true)
        return;
    }
 
    defaultSelectedBee = id
    if (frame==getCurrentFrame()) {
        // Try to select the bee in current frame
         selectBeeByID(id)
    } else {
        if (obsDoesExist(frame,id)) {
            // Set the id as default selection before seeking the frame
            defaultSelectedBee = id
        }
        videoControl.seekFrame(frame)
        // external controller logic is supposed to call back updateTimeMark
        // to update the view
    }
}
function onAxesChanged(event) {
    // User zoomed, scrolled or changed chronogram range or size */
    if (logging.axesEvents)
        console.log('onAxesChanged: event=',event)
    
    updateChrono()
}

function gotoNextEvent() {
    let frame = videoControl.getCurrentFrame()
    let id = defaultSelectedBee
    console.log("id=",id)
    let interval = findNextTagEvent(Number(frame), id)
    console.log(interval)
    defaultSelectedBee = id
    videoControl.seekFrame(Number(interval.begin))
}
function findNextTagEvent(frame, id) {
    let list = tagIntervals.filter(
          function(element) {return element.id==id && Number(element.begin)>frame}
        ).sort(
          function(a,b) {return Number(a.begin)-Number(b.begin)}
        )
    console.log(list)
    if (list.length==0) return undefined
    return list[0]
}

function gotoPreviousEvent() {
    let frame = videoControl.getCurrentFrame()
    let id = defaultSelectedBee
    console.log("id=",id)
    let interval = findPreviousTagEvent(Number(frame), id)
    console.log(interval)
    defaultSelectedBee = id
    videoControl.seekFrame(Number(interval.end))
}
function findPreviousTagEvent(frame, id) {
    let list = tagIntervals.filter(
          function(element) {return element.id==id && Number(element.end)<frame}
        ).sort(
          function(a,b) {return Number(b.end)-Number(a.end)}
        )
    console.log(list)
    if (list.length==0) return undefined
    return list[0]
}

/* Callback to react to change in chronogramData */
function drawChrono() {
    // Strong update:
    // Redraw chronogram after change in chronogramData content
    // Need to adjust range
    
    updateChronoYDomain()
    //axes.ydomain([0,20]) // Uncomment for testing
    
    updateChrono()
}

/* Update chronogram content */
function updateChrono() {
    // Weak update:
    // Update chronogram without adjusting range
    
    // IMPORTANT: do not call axes.refreshAxes() or any
    // function that triggers is such as axes.here, 
    // as it would generate an infinite loop
    // Put that is the stronger update function drawChrono
    
    // Redraw activities
    updateActivities()
    
    // Redraw timeline
    updateTimeMark() // Normally already updated by frameChanged

    updateTagIntervals()
    
    updateVideoSpan()
    updateTrackWindowSpan()
}


/* see code for chronogram axes in ChronoAxes.js */



function initVideoSpan() {
    var chronoGroup = axes.chronoGroup
    videoSpan = chronoGroup
        .append("g").attr('id','videoSpan')
        .attr("clip-path", "url(#videoSpanClipPath)")
    videoSpan.append("clipPath")
        .attr("id", "videoSpanClipPath") // give the clipPath an ID
        .append("rect")
        .attr("x", 0).attr("y", -15)
        .attr("width", axes.width()).attr("height", 15)
    videoSpan.append("rect").attr('class','background')
        .attr("x", 0).attr("y", -15)
        .attr("width", axes.width()).attr("height", 15)
        .style("stroke-width", "1px")
        .style("fill", "#f0fff0")
    videoSpan.append("rect").attr('class','interval')
        .attr("x", 0).attr("y", -15)
        .attr("width", 1).attr("height", 15) // Just init
        .style("stroke", "blue")
        .style("fill", "skyblue")
    videoSpan.append("text").attr('class','label')
        .style("text-anchor", "start")
        .text("video name ?");
}
function updateVideoSpan() {
    var videoSpan = axes.chronoGroup.select('#videoSpan')
    //videoSpan.attr("transform",
    //               "translate("+(axes.margin.left)+","+(axes.margin.top)+")")
    videoSpan.selectAll('#videoSpanClipPath > rect')
             .attr("width", axes.width()).attr("y", -15)
    videoSpan.selectAll('.background')
             .attr("x", 0).attr("y", -15)
             .attr("width", axes.width()).attr("height", 15)
    videoSpan.selectAll('.interval')
             .attr("x", axes.xScale(0)).attr("y", -13)
             .attr("width", axes.xScale(videoinfo.nframes+1)-axes.xScale(0))
             .attr("height", 11);
    videoSpan.selectAll('.label')
             .attr("x", axes.xScale(0)+2).attr("y", -4)
             .text(videoinfo.name.split('/').pop())
}

function initTrackWindowSpan() {
    var chronoGroup = axes.chronoGroup
    trackWindowSpan = chronoGroup
        .append("g").attr('id','trackWindowSpan')
        .attr("clip-path", "url(#trackWindowSpanClipPath)")
    trackWindowSpan.append("clipPath")
        .attr("id", "trackWindowSpanClipPath") // give the clipPath an ID
        .append("rect")
        .attr("x", 0).attr("y", -15)
        .attr("width", axes.width()).attr("height", 15)
    trackWindowSpan.append("rect").attr('class','interval')
        .attr("x", 0).attr("y", -15)
        .attr("width", 1).attr("height", 15) // Just init
        .style("stroke-width", "1px")
        .style("stroke", "pink")
        .style("fill", "pink")
        .style("fill-opacity", "0.4")
        
    $( videoControl ).on('frame:change', updateTrackWindowSpan)
    $( overlay ).on('trackWindow:change', updateTrackWindowSpan)
}
function updateTrackWindowSpan() {
    var trackWindowSpan = axes.chronoGroup.select('#trackWindowSpan')
    trackWindowSpan.selectAll('#trackWindowSpanClipPath > rect')
             .attr("width", axes.width()).attr("y", -15)
    let f = getCurrentFrame()
    let fmin = f-trackWindow
    let fmax = f+trackWindow
    trackWindowSpan.selectAll('.interval')
             .attr("x", axes.xScale(fmin)).attr("y", -13)
             .attr("width", axes.xScale(fmax)-axes.xScale(fmin))
             .attr("height", 11);
}



function insertActivities(selection) {
    selection.insert("rect")
        .style("stroke-width", "1px")
        .attr("class", "activity")
        .call(setGeomActivity)
}
function setGeomActivity(selection) {
    selection
        .attr("x", function(d) {
            return axes.xScale(Number(d.x));
        })
        .attr("y", function(d) {
//             return axes.yScale(Number(d.y) + 0.1);  // for linear scale
            return axes.yScale(d.y) + 0.1*axes.yScale.rangeBand(); // ordinal
        })
        .attr("width", function(d) {
            return (Math.max( axes.xScale(Number(d.x) + 1) - axes.xScale(Number(d.x)), 3 )); // Min 10 pixels
            //return 8
        })
        .attr("height", function(d) {
            //return (yScale(Number(d.y) + 0.9) - yScale(Number(d.y) + 0.1));
            return activityHeight(d)
        })
        .style("fill", activityColor)
        .style("stroke", activityColor)
}
function activityColor(d) {
        var color = "black";
        if (d.Activity == "pollenating")
            color = "#CFCF00";
        else if (d.Activity == "entering")
            color = "#FF0000";
        else if (d.Activity == "exiting")
            color = "#0000FF";
        else if (d.Activity == "fanning")
            color = "#20FF20";
        return color;
    }
function activityHeight(d) {
        var h = 2
        if (d.Activity == "entering")
            h=4
        else if (d.Activity == "exiting")
            h=4
        else if (d.Activity == "pollenating")
            h=6
        else if (d.Activity == "fanning")
            h=6;
        return h;
    }
function updateActivities(onlyScaling) {
    // Redraw activities
    if (onlyScaling) {
      // Lightweight update (reuse previous activityRects)
      let activityRects = axes.plotArea.selectAll(".activity").data(chronogramData);
      activityRects.call(setGeomActivity)
    } else {
      // Full update
      //console.log('updateActivities')
      let activityRects = axes.plotArea.selectAll(".activity").data(chronogramData)
          .call(setGeomActivity)
      activityRects.enter().call(insertActivities)
      activityRects.exit().remove()
    }
}
function initActivities() {
    //chronogramData = []
    chronogramData.length = 0
    updateActivities()
}



function insertTag(selection) {
    selection
        .insert("rect")
        .style("fill", "blue")
        .style("fill-opacity", "0.2")
        .style("stroke", "blue")
        .style("stroke-width", "1px")
        //.attr("r",5)
        .attr("class","tag")
        .call(setTagGeom)
}
function setTagGeom(selection) {
    selection
        .attr("x", function(d) {
            //return xScale(Number(d.frame) - 0.5);
            return axes.xScale(Number(d.begin));
        })
        .attr("y", function(d) {
            return axes.yScale(Number(d.id));
        })
        .attr("width", function(d) {
            return axes.xScale(Number(d.end))-axes.xScale(Number(d.begin));
        })
        .attr("height", function(d) {
            return axes.yScale.rangeBand(); // Ordinal scale
        })
        .style("fill", function(d) {
            if (d.dir=="entering")
                return '#ffc0c0'
            else if (d.dir=="exiting")
                return '#c0c0ff'
            else
                return 'blue'
        })
        .style("stroke", function(d) {
            if (d.dir=="entering")
                return '#ffc0c0'
            else if (d.dir=="exiting")
                return '#c0c0ff'
            else
                return 'blue'
        })
}
function updateTagIntervals(onlyScaling) {
    // Redraw tag intervals
    if (onlyScaling) {
      setTagGeom(tagSel)
    } else {
      tagSel = axes.plotArea.selectAll(".tag").data(tagIntervals);
      tagSel.enter().call(insertTag)
      tagSel.exit().remove();
      setTagGeom(tagSel)
    }
}
function initTagIntervals() {
    //tagsData = []
    tagIntervals = []
    updateTagIntervals()
}






function refreshChronogram() {

    //Deleting everything on the svg so we can recreate the updated chart
    //d3.selectAll("svg > *").remove();
    //Emptying the array so we won't have duplicates
    //for (var i = 0; i < chronogramData.length; i++)
    //    chronogramData.pop();
    chronogramData.length = 0
    if (showObsChrono) {
        for (let F in Tracks) {
            for (let id in Tracks[F]) {
                let chronoObs = {'x':F, 'y':id, 'Activity':""};

                if (Tracks[F][id].bool_acts[1]) {
                    chronoObs.Activity = "pollenating";
                } else if (Tracks[F][id].bool_acts[2]) {
                    chronoObs.Activity = "entering";
                } else if (Tracks[F][id].bool_acts[3]) {
                    chronoObs.Activity = "exiting";
                } else if (Tracks[F][id].bool_acts[0]) {
                    chronoObs.Activity = "fanning";
                }

                chronogramData.push(chronoObs);
            }
        }
    }
  
    
//  tagsData.length=0
//     for (let F in Tags) {
//         let tags = Tags[F].tags
//         for (let i in tags) {
//             let id = Number(tags[i].id)
//             let hamming = Number(tags[i].hamming)
//             if (hamming==0) {
//               let tag = {
//                 "frame":F,
//                 "id":id
//               }
//               tagsData.push(tag)
//             }
//         }
//     }

    if (logging.chrono)
        console.log("refreshChronogram: convert tags to intervals...")


    tagIntervals = []
    if (showTagsChrono) {
        /* Transpose Tags data structure */
        ttags = []
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id]=[];
            }
        }
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id][F]=tags[i];
            }
        }
    
        /* Convert to intervals */
        for (let id in ttags) {
          let obsarray = ttags[id]
          let activeInterval = []
          let isActive = false
          for (let f in obsarray) {
            let tags = obsarray[f]
        
            if (!tagsSampleFilter(tags)) {
                continue
            }
        
            if (isActive) {
              let doPush = false
              if (activeInterval.end == f-1) {
                activeInterval.end = f
              } else {
                doPush = true
              }
              if (doPush) {
                // Close previous 
                activeInterval['end']++
                if (tagsIntervalFilter(activeInterval))
                    tagIntervals.push(activeInterval)
                // Open new one
                activeInterval={'id':id,'begin':f,'end':f}
              }
            } else {
              // Open new one
              activeInterval={'id':id,'begin':f,'end':f}
              isActive=true;
            }
          }
          // Close if active
          if (isActive)
            activeInterval['end']++
            if (tagsIntervalFilter(activeInterval))
                tagIntervals.push(activeInterval)
        }
    }
    
//     if (logging.chrono)
//         console.log("refreshChronogram: sorting()...")
//     tagsIntervalsSortedBegin = tagIntervals.slice();
//     tagsIntervalsSortedBegin.sort(function(a,b) {return a.begin-b.begin})
//     tagsIntervalsSortedEnd = tagIntervals.slice();
//     tagsIntervalsSortedEnd.sort(function(a,b) {return a.end-b.end})
    
    if (logging.chrono)
        console.log("refreshChronogram: drawChrono()...")

    //d3.selectAll("svg > *").remove();
    drawChrono();
}


function interpolateTags(maxgap) {
    tagIntervals = []

        /* Transpose Tags data structure */
        let ttags = []
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id]=[];
            }
        }
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = Number(tags[i].id)
                ttags[id][F]=tags[i];
            }
        }
        
        function pushInterpolate(id,f1,f2) {
            let T1 = ttags[id][f1]
            let T2 = ttags[id][f2]
            let P1 = T1.p
            
            for (let j=f1+1; j<f2; j++) {
                let a = (j-f1)/(f2-f1)
                let cx = (1-a)*T1.c[0] + a*T2.c[0]
                let cy = (1-a)*T1.c[1] + a*T2.c[1]
                let dx = cx - T1.c[0]
                let dy = cy - T1.c[1]
                //cx = T1.c[0]
                //cy = T1.c[1]
                //dx = 0
                //dy = 0
                let pts = [ 
                            [P1[0][0]+dx,P1[0][1]+dy],
                            [P1[1][0]+dx,P1[1][1]+dy],
                            [P1[2][0]+dx,P1[2][1]+dy],
                            [P1[3][0]+dx,P1[3][1]+dy]
                          ];
                if (Tags[j] == null) {
                    Tags[j] = {tags:[]}
                }
                Tags[j].tags.push({id: id, c: [cx,cy], hamming: 1000, p: pts, frame: j})
                console.log('interpolate id='+id+' f='+j)
            }
        }
    
        /* Convert to intervals */
        for (let id in ttags) {
          let obsarray = ttags[id]
          let activeInterval = []
          let isActive = false
          for (let f0 in obsarray) {
            let f = Number(f0)
            let tags = obsarray[f]
        
            if (!tagsSampleFilter(tags)) {
                continue
            }
        
            if (isActive) {
              let doPush = false
              if (activeInterval.end == f-1) {
                activeInterval.end = f
              } else if (f - activeInterval.end < maxgap) {
                  // Try to interpolate
                  
                  pushInterpolate(id,activeInterval.end,f)
                  
                  activeInterval.end = f
              } else {
                  doPush = true
              }
              if (doPush) {
                // Close previous 
                //activeInterval['end']++
                //tagIntervals.push(activeInterval)
                // Open new one
                activeInterval={'id':id,'begin':f,'end':f}
              }
            } else {
              // Open new one
              activeInterval={'id':id,'begin':f,'end':f}
              isActive=true;
            }
          }
          // Close if active
          if (isActive)
            activeInterval['end']++
            //tagIntervals.push(activeInterval)
        }
}

function computeMotionDirection() {
    cacheTags()
    for (var activeInterval of tagIntervals) {
        let tags1 = getTags(activeInterval.begin, activeInterval.id)
        let tags2 = getTags(activeInterval.end, activeInterval.id)
        activeInterval.dir = undefined
        if (tags1 == null || tags2 == null) continue;
        if (tags1.length == 1 && tags2.length == 1) {
            let tag1 = tags1[0]
            let tag2 = tags2[0]
            if (tag2.c[1] < tag1.c[1])
                activeInterval.dir = 'entering'
            else if (tag2.c[1] > tag1.c[1])
                activeInterval.dir = 'exiting'
        }
    }
    updateTagIntervals()
}