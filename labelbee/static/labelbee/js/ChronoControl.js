/*jshint esversion: 6, asi: true */
//displays
//filling data


// ###########################################################
// CHRONOGRAM

function initChrono() {
    // global variables
    axes = undefined
    chronogramData = []
    tagsChronogramData = []
    
    restrictID = null
    restrictIDArray = []
    flag_restrictID = false
    flag_excludeID = false
    flag_autoEventMode = false
    flag_hideInvalid = false
    
    flag_showPartsOnChrono = false
    flag_showIndividualEvents = true
    updateButtons_showPartsOnChrono()
    updateButtons_showIndividualEvents()
    
    mousewheelMode = false
    onMousewheelModeToggled()
    
    eventSeekMode = 'tag'
    updateEventSeekMode()

    // SVG adjust to its parent #chronoDiv
    var svg = d3.select("#svgVisualize")    
    svg.attr("width", "100%").attr("height", "100%")

    /* ## Build the axes (resizable) ## */

    options = {useOrdinalScale: true}
    axes = new ChronoAxes(svg, videoinfo, options);
    //axes.onClick = onAxesClick         // Callback when the user clicks in axes
    //axes.onAxesChanged = onAxesChanged // Callback when zooming or resizing axes
    
//     svgInterval = axes.chronoGroup.append("g").attr('class', 'intervalLayer');
//     svgMiddle = axes.chronoGroup.append("g").attr('class', 'middleLayer');
//     svgTop = axes.chronoGroup.append("g").attr('class', 'topLayer');
    svgSpanRects = axes.plotArea.append("g").attr('class', 'spanRectLayer');
    svgTag = axes.plotArea.append("g").attr('class', 'tagLayer');
    svgInterval = axes.plotArea.append("g").attr('class', 'intervalLayer');
    svgTop = axes.plotArea.append("g").attr('class', 'topLayer');
    
    $( videoControl ).on('frame:changed', updateTimeMark)
    $( videoControl ).on('previewframe:changed', updatePreviewTimeMark)
    
    $( videoControl ).on('frame:changed',
        function(){$(overlay).trigger('trackWindow:change')})
    $( videoControl ).on('previewframe:changed',
        function(){$(overlay).trigger('trackWindow:change')})
        
    
    $(axes).on("axes:clicked", onAxesClick)
    $(axes).on("axes:dblclick", onAxesDblClick)
    $(axes).on("axes:changed", onAxesChanged)
    
    // Events declared in selectionControl
    //$( selectionControl ).on('tagselection:created', updateChronoSelection)
    //$( selectionControl ).on('tagselection:cleared', updateChronoSelection)
    
    function endPreview() {
        //updateTimeMark();
        //updateTrackWindowSpan()
        
        let stayHere = false
        if (stayHere) {
            // Stay at preview frame
            videoControl.seekFrame(getCurrentFrame());
            // Update should be called by callbacks
        } else {
            // Come back to initial frame before preview
            //videoControl.currentMode = 'video';
            videoControl.onFrameChanged()
            //updateTimeMark();
            //updateTrackWindowSpan()
            //videoControl.hardRefresh();
        }
    }
    $( axes ).on('previewframe:trackmove', onAxesMoved)    
    $( axes ).on('previewframe:trackend', endPreview)
    
    /* Resize events */
    
    // Make it resizable using jQuery-UI
    $("#chronoDiv").resizable({
      helper: "ui-resizable-helper",
    });
    // Detect #chronoDiv resize using ResizeSensor.js
    // Note: cannot detect resize of SVG directly
    new ResizeSensor($("#chronoDiv")[0], function() {
        if (logging.guiEvents) {
            console.log('#chronoDiv resized');
        }
        axes.refreshLayout()
    });
    // Equivalent pure jQuery seems to have trouble 
    // the size of chronoDiv seems to be defined after the callback is called
    //     $("#chronoDiv").on("resize", function(event) {
    //         console.log('#chronoDiv.onresize',event)
    //         axes.refreshLayout()
    //         return false
    //       })
    
    // For some reason, svg does not have the correct size at the beginning,
    // trigger an asynchronous refresh
    setTimeout(axes.refreshLayout, 50)

    /* ## Init chronogram content ## */
    
    initActivities()     
    initTagIntervals()
    
    initVideoSpan()
    initTrackWindowSpan()
}

function onMousewheelModeToggled() {
    mousewheelMode = $('#mousewheelMode').prop( "checked")
    if (logging.mouseMouseEvents) {
        console.log('onMousewheelModeToggled: toggled mousewheelMode=',mousewheelMode)
    }
}

// Simplify handling of input and button behaviors in one function
function toggledNewState(event) {
    let target = $(event.target)
    var flag
    if (target[0].type=='checkbox'){
        console.log('Toggled checkbox ',target)
        flag = target.prop('checked') // Set flag
        // checkbox toggle automatically before triggering event
    } else { // Assume button or passive element
        console.log('Toggled button ',target)
        flag = !target.hasClass('active') // Toggle
        target.toggleClass('active', flag) // Manually toggle the button
    }
    return flag;
}
function updateButtons(classname, flag) {
    $("button."+classname).toggleClass('active', flag)
    $("input."+classname).prop('checked',flag)
}

// Need simpler binding framework over here !
function onToggleButton_showPartsOnChrono(event) {
    flag_showPartsOnChrono = toggledNewState(event)
    updateButtons_showPartsOnChrono()

    refreshChronogram()
}
function updateButtons_showPartsOnChrono(event) {
    updateButtons('button_showPartsOnChrono', flag_showPartsOnChrono)
}

function onToggleButton_showIndividualEvents(event) {
    flag_showIndividualEvents = toggledNewState(event)
    updateButtons_showIndividualEvents();
    
    refreshChronogram()
}
function updateButtons_showIndividualEvents(event) {
    updateButtons('button_showIndividualEvents', flag_showIndividualEvents)
}

function getChronoItemHeight() {
    let H = $('#chronoDiv').height()

    let mh = axes.margin.top+axes.margin.bottom
    let N = axes.ydomain().length
    let itemHeight = (H-mh)/N
    
    return itemHeight
}
function chronoAdjust(mode) {
    let factor = 1.2
    let mh = axes.margin.top+axes.margin.bottom
    let mw = axes.margin.left+axes.margin.right
    if (mode == 'H-') {
//         let h = ($('#chronoDiv').height()-mh)/factor+mh
//         if (h<100) h=100;
//         $('#chronoDiv').height(h)
        adjustChronogramHeight(getChronoItemHeight()/factor)
    }
    if (mode == 'H=') {
        adjustChronogramHeight(12)
    }
    if (mode == 'H+') {
//         let h = ($('#chronoDiv').height()-mh)*factor+mh
//         $('#chronoDiv').height(h)
        adjustChronogramHeight(getChronoItemHeight()*factor)
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
        itemHeight = 12
    }

    let mh = axes.margin.top+axes.margin.bottom
    let domain = axes.ydomain()
    let minheight = domain.length*itemHeight + mh
    //if (minheight < 100) minheight = 100;
    //if ($('#chronoDiv').height() < minheight) {
        $('#chronoDiv').height(minheight)
    //}
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
    if (chronogramData.length === 0) return []
    let ids = new Set()
    if (flag_hideInvalid) {
        chronogramData.forEach(function(d) {
            let labs=d.labels.split(',')
            if (labs.indexOf('wrongid')==-1
                && labs.indexOf('falsealarm')==-1) 
                ids.add(d.y)
          })
    } else {
        chronogramData.forEach(function(d) {ids.add(d.y)})
    }
    return [...ids] // Convert to array
}
function validTagIdsDomain() {
    if (tagIntervals.length === 0) return []
    let ids = new Set()
    if (flag_hideInvalid) {
        tagIntervals.forEach(function(d) {
            if (!containsLabel(d.labels,'wrongid') &&
               !containsLabel(d.labels,'falsealarm')) 
                ids.add(d.id)
            })
    } else {
        tagIntervals.forEach(function(d) {ids.add(d.id)})
    }
    return [...ids] // Convert to array
}
function validAllTagIdsDomain() {
    return sortIds(allTagsID)
}
function validVisibleTagIdsDomain() {
    return sortIds(axes.ydomain())
}


/* Update chronogram axes properties */
function updateChronoXDomainFromVideo() {
    axes.xdomain(domainxFromVideo())
}
function scaleTimeDomain(scale) {
    let domain = axes.xdomain();
    let f = getCurrentFrame();
    if (f>=domain[0] && f<=domain[1]) { // If timemark visible
        axes.xdomainScale(scale, f)  // Zoom in the timemark
    } else {
        axes.xdomainScale(scale) // Zoom in center
    }
}
function shiftTimeDomain(factor) {
    let domain = axes.xdomain();
    let f = getCurrentFrame();
    let shift = Math.round(factor*(domain[1]-domain[0]))
    axes.xdomainFocus([domain[0]+shift,domain[1]+shift])
//     if (f>=domain[0] && f<=domain[1]) { // If timemark visible
//         videoControl.seekFrame(f+shift);
//     }
}


function sortIds(IDarray) {
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
    
    return IDarray.sort(mixedCompare)
}
function validIdsChrono() {
    let domainset = new Set([...validIdsDomain(), ...validTagIdsDomain()])
    let domain = sortIds([...domainset]) // convert back to sorted array
    return domain
}
function updateChronoYDomain() {
    //var a = domainyFromChronogramData()
    //var b = domainyFromTagData()
    //axes.ydomain([Math.min(a[0],b[0]),Math.max(a[1],b[1])]) // Linear scale
    
    var domain=[]
    
    if (flag_restrictID) {
        domain = restrictIDArray;
    } else {
        domain = validIdsChrono()
    }
    if (logging.axesEvents)
        console.log('updateChronoYDomain: domain=',domain)
    
    //let oldN=axes.ydomain().length
    //let N=domain.length
    
    let itemHeight = getChronoItemHeight()
    
    axes.ydomain(domain)
    
    adjustChronogramHeight(itemHeight)
    
    //axes.ydomain(['0','1','2','3','10','12']) // Testing
    
}
function updateTimeMark() {
    var frame = getCurrentFrame();
    if (logging.frameEvents)
        console.log('updateTimeMark: frame=',frame)
    if (typeof frame == "undefined") {
      frame = 0;
    }
    axes.setTimeMark(frame);
}
function updatePreviewTimeMark() {
    updateTimeMark()
//     if (videoControl.previewFrame != null)
//         axes.setTimeMark(videoControl.previewFrame);
}

function updateChronoSelection() {
    let id = defaultSelectedBee;
    axes.selectId(id)
}

function gotoEvent(frame, id) {
    videoControl.pause()
    
    frame = Number(frame)
 
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

/* Callbacks to react to changes in chronogram axes */
function onAxesClick(event) {
    // User clicked in chronogram axes
    var frame = event.frame
    var id = event.id
    if (logging.axesEvents)
        console.log("onAxesClick: seeking to frame=",frame,"...");

    gotoEvent(frame, id)        
}
function onAxesDblClick(event) {
    // User double clicked in chronogram axes
    var frame = event.frame
    var id = event.id
    if (logging.axesEvents)
        console.log("onAxesDblClick: zooming chrono around frame=",frame,"...");
 
    axes.xdomainFocus([frame-overlay.trackWindow.backward*1.05,
                       frame+overlay.trackWindow.forward*1.05])
}
function onAxesMoved(event) {
    // User clicked in chronogram axes
    var frame = event.frame
    var id = event.id
    if (logging.axesEvents)
        console.log("onAxesMove: seeking to frame=",frame,"...");
 
    //defaultSelectedBee = id // Do not change, keep same ID
    videoControl.seekFrame(frame, true)
}
function onAxesChanged(event) {
    // User zoomed, scrolled or changed chronogram range or size */
    if (logging.axesEvents)
        console.log('onAxesChanged: event=',event)
    
    updateChrono()
}

function updateEventSeekMode() {
    if (eventSeekMode=='tag') {
        $(".eventSeekMode").removeClass('active')
        $(".eventSeekMode-tag").addClass('active')   
    }
    if (eventSeekMode=='freetag') {
        $(".eventSeekMode").removeClass('active')
        $(".eventSeekMode-freetag").addClass('active')        
    }
    if (eventSeekMode=='obs') {
        $(".eventSeekMode").removeClass('active')
        $(".eventSeekMode-obs").addClass('active')        
    }
}
function eventSeekModeClicked(mode) {
    eventSeekMode=mode
    updateEventSeekMode()
}

function getIdCoord(id) {
    return axes.yScale(id)
}

// Sort/compare Tag intervals
function compareIncreasingIdBegin(a,b) {
    let d=getIdCoord(a.id)-getIdCoord(b.id)
    if (d==0) return (Number(a.begin)-Number(b.begin))
    else return d
}
function compareDecreasingIdBegin(a,b) {
    let d=getIdCoord(a.id)-getIdCoord(b.id)
    if (d==0) return -(Number(a.begin)-Number(b.begin))
    else return -d
}
function isNotLabeled(element) {
    return !element.labeling.labeled
}
function funGreaterThanIdBegin(id, frame) {
    return function(element) {
        return (element.id==id && Number(element.begin)>frame)
           || (getIdCoord(element.id)>getIdCoord(id))
    }
}
function funLessThanIdBegin(id, frame) {
    return function(element) {
        return (element.id==id && Number(element.begin)<frame)
           || (getIdCoord(element.id)<getIdCoord(id))
    }
}
// Sort/compare Events
function compareIncreasingIdFrame(a,b) {
    let d=getIdCoord(a.id)-getIdCoord(b.id)
    if (d==0) return (Number(a.frame)-Number(b.frame))
    else return d
}
function compareDecreasingIdFrame(a,b) {
    let d=getIdCoord(a.id)-getIdCoord(b.id)
    if (d==0) return -(Number(a.frame)-Number(b.frame))
    else return -d
}
function funGreaterThanIdFrame(id, frame) {
    return function(element) {
        return (element.id==id && Number(element.frame)>frame)
           || (getIdCoord(element.id)>getIdCoord(id))
    }
}
function funLessThanIdFrame(id, frame) {
    return function(element) {
        return (element.id==id && Number(element.frame)<frame)
           || (getIdCoord(element.id)<getIdCoord(id))
    }
}
function funEqualId(id) {
    return function(element) {
        return (element.id==id)
    }
}

function gotoFrameId(frame, id) {
    console.log("gotoFrameId frame=",frame,"id=",id)
    defaultSelectedBee = id
    videoControl.seekFrame(Number(frame))
}

function gotoFirstEvent() {
    let from={frame:-1,id:defaultSelectedBee}
    if (flag_autoEventMode) {
        let ids = axes.yScale.domain()
        if (!ids) return;
        from.id = ids[0]
    }
    gotoNextEvent(from)
}
function gotoLastEvent() {
    let from={frame:videoControl.maxframe()+1,id:defaultSelectedBee}
    if (flag_autoEventMode) {
        let ids = axes.yScale.domain()
        if (!ids) return;
        from.id=ids[ids.length-1]
    }
    gotoPreviousEvent(from)
}
function gotoNextEvent(from) {
    let frame = Number(videoControl.getCurrentFrame())
    let id = defaultSelectedBee
    if (from) {
        frame = from.frame
        id = from.id
    }
    console.log("gotoNextEvent from frame=",frame,"id=",id)
    
    if (eventSeekMode == 'tag') {
        let interval = findNextTagEvent(frame, id)
    
        if (!interval) {
            console.log('Did not find next Tag')
            return
        }
        gotoFrameId(interval.begin, interval.id)
    } else if (eventSeekMode == 'freetag') {
        let interval = findNextFreeTagEvent(frame, id)

        if (!interval) {
            console.log('Did not find next Unlabeled Tag')
            return
        }
        gotoFrameId(interval.begin, interval.id)
    } else if (eventSeekMode == 'obs') {
        let obs = findNextObsEvent(frame, id)
    
        if (!obs) {
            console.log('Did not find next Event')
            return
        }
        gotoFrameId(obs.frame, obs.id)
    }
}
function gotoPreviousEvent(from) {
    let frame = Number(videoControl.getCurrentFrame())
    let id = defaultSelectedBee
    if (from) {
        frame = from.frame
        id = from.id
    }
    console.log("gotoPreviousEvent from frame=",frame,"id=",id)
    
    if (eventSeekMode == 'tag') {
        let interval = findPreviousTagEvent(frame, id)
    
        if (!interval) {
            console.log('Did not find previous Tag')
            return
        }
        gotoFrameId(interval.begin, interval.id)
    } else if (eventSeekMode == 'freetag') {
        let interval = findPreviousFreeTagEvent(frame, id)

        if (!interval) {
            console.log('Did not find previous Unlabeled Tag')
            return
        }
        gotoFrameId(interval.begin, interval.id)
    } else if (eventSeekMode == 'obs') {
        let obs = findPreviousObsEvent(frame, id)
    
        if (!obs) {
            console.log('Did not find previous Event')
            return
        }
        gotoFrameId(obs.frame, obs.id)
    }
}

function findNextTagEvent(frame, id) {
    let tagList = []
    if (flag_autoEventMode) {
        tagList = tagIntervals
    } else {
        tagList = tagIntervals.filter(funEqualId(id))
    }
    if (!tagList) return undefined
    
    let tag = tagList
        .sort(compareIncreasingIdBegin)
        .find(funGreaterThanIdBegin(id,frame))
    //console.log(tag)
    return tag
}
function findNextFreeTagEvent(frame, id) {
    let tagList = []
    if (flag_autoEventMode) {
        tagList = tagIntervals.filter(isNotLabeled)
    } else {
        tagList = tagIntervals
              .filter(funEqualId(id))
              .filter(isNotLabeled)
    }
    if (!tagList) return undefined

    let tag = tagList
          .sort(compareIncreasingIdBegin)
          .find(funGreaterThanIdBegin(id,frame))
    //console.log(tag)
    return tag
}
function findNextObsEvent(frame, id) {
    let obsList = []
    if (flag_autoEventMode) {
        if (flag_hideInvalid) {
            obsList = flatTracksValid
        } else {
            obsList = flatTracksAll
        }
    } else {
        if (flag_hideInvalid) {
            obsList = flatTracksValidGroupById[id]
        } else {
            obsList = flatTracksAllGroupById[id]
        }
    }
    if (!obsList) return undefined
    let obs = obsList.sort(compareIncreasingIdFrame)
              .find(funGreaterThanIdFrame(id,frame))
    //console.log(obs)
    return obs
}
function findPreviousTagEvent(frame, id) {
    let tagList = []
    if (flag_autoEventMode) {
        tagList = tagIntervals
    } else {
        tagList = tagIntervals.filter(funEqualId(id))
    }
    if (!tagList) return undefined
    
    let tag = tagList
        .sort(compareDecreasingIdBegin)
        .find(funLessThanIdBegin(id,frame))
    //console.log(tag)
    return tag
}
function findPreviousFreeTagEvent(frame, id) {
    let tagList = []
    if (flag_autoEventMode) {
        tagList = tagIntervals.filter(isNotLabeled)
    } else {
        tagList = tagIntervals
              .filter(funEqualId(id))
              .filter(isNotLabeled)
    }
    if (!tagList) return undefined

    let tag = tagList
        .sort(compareDecreasingIdBegin)
        .find(funLessThanIdBegin(id,frame))
    //console.log(tag)
    return tag
}
function findPreviousObsEvent(frame, id) {
    let obsList = []
    if (flag_autoEventMode) {
        if (flag_hideInvalid) {
            obsList = flatTracksValid
        } else {
            obsList = flatTracksAll
        }
    } else {
        if (flag_hideInvalid) {
            obsList = flatTracksValidGroupById[id]
        } else {
            obsList = flatTracksAllGroupById[id]
        }
    }
    if (!obsList) return undefined
    let obs = obsList.sort(compareDecreasingIdFrame)
              .find(funLessThanIdFrame(id,frame))
    //console.log(obs)
    return obs
}

function nextSeekFocusWindow() {
    $( videoControl ).on('frame:changed',gotoEvent_seekCB)
}
function gotoEvent_seekCB() {
    $( videoControl ).off('frame:changed',gotoEvent_seekCB)
    focusTrackWindow()
}

function onClickNextID() {
    //let domain = validAllTagIdsDomain()
    //              .map(function(d){return String(d);})
    let domain = validVisibleTagIdsDomain()
                  .map(function(d){return String(d);})
    let N=domain.length
    if (N==0) return;
    
    let id = String(getCurrentID())
    let pos = $.inArray(id,domain)
    let newID = (pos==-1) ? domain[0] : domain[(pos+1)%N];
    selectBeeByID(newID)
                        
    setRestrictID(newID)
    
    if (flag_autoEventMode) {
        gotoFirstEvent()
    }

    refreshChronogram()
}
function onClickPrevID(gotoLast) {
    let domain = validVisibleTagIdsDomain()
                  .map(function(d){return String(d);})
    let N=domain.length
    if (N==0) return;
    
    let id = String(getCurrentID())
    let pos = $.inArray(id,domain)
    let newID = (pos==-1) ? domain[N-1] : domain[(pos+N-1)%N];
    selectBeeByID(newID)
            
    setRestrictID(newID)
    
    if (flag_autoEventMode) {
        if (gotoLast) {
            gotoLastEvent()
        } else {
            gotoFirstEvent()
        }
    }

    refreshChronogram()
}
function onClickNextIDStart() {
    let domain = validVisibleTagIdsDomain()
                  .map(function(d){return String(d);})
    let N=domain.length
    if (N==0) return;
    
    let id = String(getCurrentID())
    let pos = $.inArray(id,domain)
    let newID = (pos==-1) ? domain[0] : domain[(pos+1)%N];
    selectBeeByID(newID)
                        
    setRestrictID(newID)

    gotoFirstEvent()

    //refreshChronogram()
}
function onAutoEventButtonClick() {
    flag_autoEventMode = !flag_autoEventMode;
    
    update_autoEventMode()
    
    refreshChronogram()
}
function update_autoEventMode() {
    if ( flag_autoEventMode ) {
        $("#autoEventButton").addClass("active")
    } else {
        $("#autoEventButton").removeClass("active")      
    }
}

function setRestrictID(ids) {
    console.log('setRestrictID')
    restrictID = String(ids);
    restrictIDArray=restrictID.split(',')
                              .map(function(d){return d.trim()})
                              .filter(function(d){return d!="";})
    
    update_restrictID_GUI()
    
    if (flag_restrictID)
        refreshChronogram()
}
function restrictIDFromSelection() {
    console.log('restrictIDFromSelection')
    
    flag_restrictID = true
    setRestrictID(defaultSelectedBee)    
}
function restrictIDFromWindow() {
    console.log('restrictIDFromWindow')
    restrictID = [];
    let win = getWindow()
    let f1=win[0], f2=win[1];
    restrictIDArray=flatTags
            .filter(function(tag){return (tag.frame>=f1 && tag.frame<=f2)})
            .map(function(tag){return String(tag.id)})
    restrictIDArray = sortIds([...new Set(restrictIDArray)])
    restrictID=restrictIDArray.join(',');
    
    flag_restrictID = true
    update_restrictID_GUI()
    
    if (flag_restrictID)
        refreshChronogram()
}
function update_restrictID_GUI() {
    if ( flag_restrictID ) {
        $("#restrictIDButton").addClass("active")
    } else {
        $("#restrictIDButton").removeClass("active")      
    }
    $("#restrictID").val(restrictID)
}
function click_restrictID() {
    flag_restrictID = !flag_restrictID;
    
    update_restrictID_GUI()
    
    refreshChronogram()
}
function onRestrictIDChanged() {
    restrictID = $("#restrictID").val()
    restrictIDArray = restrictID.split(',')
    
    //selectBeeByID(restrictID)
    if (flag_restrictID)
        refreshChronogram()
}
function click_excludeID() {
    if ( $("#excludeIDButton").hasClass( "active" ) ) {
        $("#excludeIDButton").removeClass("active")
        //$("#excludeIDButton").addClass("btn-default")
        //$("#excludeIDButton").removeClass("btn-warning")
        flag_excludeID = false;
    } else {
        $("#excludeIDButton").addClass("active")      
        //$("#excludeIDButton").removeClass("btn-default")
        //$("#excludeIDButton").addClass("btn-warning")
        flag_excludeID = true;
    }    
    refreshChronogram()
}
function onExcludeIDChanged() {
    excludeID = $("#excludeID").val()
    excludeIDArray = excludeID.split(',')
    
    refreshChronogram()
}

function click_hideInvalid() {
    if ( $("#hideInvalidButton").hasClass( "active" ) ) {
        $("#hideInvalidButton").removeClass("active")
        flag_hideInvalid= false;
    } else {
        $("#hideInvalidButton").addClass("active")      
        flag_hideInvalid = true;
    }    
    refreshChronogram()
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


//put first and last frame in vid
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
        
    $( videoControl ).on('frame:changed', updateTrackWindowSpan)
    $( videoControl ).on('previewframe:changed', updateTrackWindowSpan)
    $( axes ).on('previewframe:trackend', updateTrackWindowSpan)
    $( overlay ).on('trackWindow:change', updateTrackWindowSpan)
}
function updateTrackWindowSpan() {
    var trackWindowSpan = axes.chronoGroup.select('#trackWindowSpan')
    trackWindowSpan.selectAll('#trackWindowSpanClipPath > rect')
             .attr("width", axes.width()).attr("y", -15)
    let f = getCurrentFrame()
    let fmin = f-overlay.trackWindow.backward
    let fmax = f+overlay.trackWindow.forward
    trackWindowSpan.selectAll('.interval')
             .attr("x", axes.xScale(fmin)).attr("y", -13)
             .attr("width", axes.xScale(fmax)-axes.xScale(fmin))
             .attr("height", 11);
}
function getWindow() {
    let f = getCurrentFrame()
    let fmin = f-overlay.trackWindow.backward
    let fmax = f+overlay.trackWindow.forward
    
    if (fmin<0) fmin=0;
    if (fmax>videoControl.maxframe()) fmax=videoControl.maxframe();
    
    return [fmin, fmax]
}


//temporary object for beeID's(y) and it's x values
var tempCoordinates = {};
//Final intervals and its BeeID
allIntervals = [];

var isWrongId = false;
var isFalseAlarm = false;

//Get data from chronogramData and output allIntervals,
function createIntervalList() {
    //initiliaze allIntervals to update data
    tempCoordinates = {};

    for (var i = 0; i < chronogramData.length; i++) {
        if (chronogramData[i].y in tempCoordinates) {
            //Make sure y coordinate is not in tempCoordiantes
            tempCoordinates[chronogramData[i].y].push(i);
        } else {
            //Create new beeId key with it's x coordiantes as value
            tempCoordinates[chronogramData[i].y] = [];
            tempCoordinates[chronogramData[i].y].push(i);
        }
    }
    //initiliaze allIntervals to update data
    allIntervals = [];
    acts = ['','pollen','entering','leaving','fanning']
    for (var a of acts) {
        for (var y in tempCoordinates) {
            
            let xValues = [];

            let iArray = tempCoordinates[y];

            iArray = iArray.filter(function(i){
                    return chronogramData[i].Activity==a})

            if (iArray.length == 0){
                continue;
            }

            for (let j=0; j<iArray.length; j++) {
                xValues[j]=Number(chronogramData[iArray[j]].x);
            }

            var iData = chronogramData[iArray[0]]; 
            let tempInterval = { x1: xValues[0], x2: xValues[0], y: y, 
                Activity: iData.Activity, labels:iData.labels, pollen: iData.pollen, tag:iData.tag, obs:iData.obs };

            // let tempInterval = { x1: xValues[0], x2: xValues[0], y: y, 
            //     Activity: iData.Activity, pollen: iData.pollen, issue: "" };

            for (var i = 1; i < xValues.length; i++) {
                iData = chronogramData[iArray[i]]; 
                // console.log("Act temp interval IN: ", tempInterval[i].Activity);
                if (xValues[i] - xValues[i - 1] == 1) {
                    tempInterval.x2 = xValues[i]; //Extend the existing interval
                    tempInterval.pollen |= iData.pollen;
                } else {
                    allIntervals.push(tempInterval);
                    tempInterval = { x1: xValues[i], x2: xValues[i], y: y, 
                    Activity: iData.Activity,labels:iData
                    .labels, pollen: iData.pollen, tag:iData.tag, obs:iData.obs}; // New interval
                }
            }
            allIntervals.push(tempInterval);
        }
    }
        
    // Pass extra data from chronogramData to allInterval
    for (let interval of allIntervals) {
        var tempArray = interval.labels.split(",");
        if (tempArray.includes('wrongid')) {
            interval.wrongid=true
            interval.newid=interval.obs.newid
        }
    }

    // Subsets of allIntervals
    crosses = allIntervals.filter(function(d){
        var tempArray = d.labels.split(",");
        if (tempArray.includes('falsealarm')||tempArray.includes('wrongid')){
            return true;
        }
        });
    rectIntervals = allIntervals.filter(function(d){
      return d.x1 != d.x2;
    });
    circlesIntervals = allIntervals.filter(function(d){
      return d.x1 == d.x2;
    });
    partsIntervals = allIntervals.filter(function(d){
      return hasParts(d.obs);
    });
}


function onActivityClick(d) {
    console.log("CLICK Activity d=",d);
    // Prevent default chronogram click to go to the correct frame
    d3.event.stopPropagation(); 
    
    gotoEvent(d.x1, d.y)   
}
function onObsSpanClick(obsspan) {
    console.log("CLICK ObsSpan obsspan=",obsspan);
    // Prevent default chronogram click to go to the correct frame
    d3.event.stopPropagation(); 
    
    gotoEvent(obsspan.frame, obsspan.id)   
}

//black orb rectangles are made here
function insertActivities(selection) {
    //console.log('selection=',selection)
    selection.insert("rect")
        .attr("class","activity")
        .style("stroke-width", "1px")
        .on('click',onActivityClick)
        .call(setGeomActivity)
}

//v2 of intervals 
//Unlike the circles coordinates, the rectangles are being created here because if they're added 
//at the updateActivity function, there will be a uncought typeError
function setGeomActivity(selection) {
    selection
        .attr("x", function(d) {
            return axes.xScale(d.x1);
        })
        .attr("y", function(d) {
            return axes.yScale(d.y); // ordinal
        })
        .attr("width", function(d) {
            return axes.xScale(d.x2+1) - axes.xScale(d.x1);
        })
        .attr("height", function(d) {
            return axes.yScale.rangeBand()/2;
        })
        .style("fill", "gray");
        //.style("stroke", activityColor);
            //Add text to display annotation info 
    selection.select("rect").selectAll("title").remove()
    selection.select("rect").append("title").text(function(d) {
      return (
        "Bee ID: " +
        d.y +
        " Start Frame: " +
        (d.x1) +
        " End Frame: " +
        (d.x2 + 1) +
        " Activity: " +
        d.Activity
      );
    });

}

function initEntering(input){
    input.insert("rect")
    .attr("width", "1px")
    .attr("class","entering")
    .on('click',onActivityClick)
            // .call(updateEnteringAct)
}
//create rectangles for entering exiting activites
function updateEntering(input) {
        input.attr("x", function(d) {
            return axes.xScale(d.x1);
        })
        .attr("y", function(d) {
            return axes.yScale(d.y);
        })
        .attr("width", "4px")
        .attr("height", function(d) {
            return axes.yScale.rangeBand()/2;
        })
        .style("fill", "green");
}

//create exit visuals
function initLeaving(input){
    input.insert("rect")
         .attr("width", "1px")
         .attr("class", "leaving")
         .on('click',onActivityClick)
}

function updateLeaving(input) {
        input.attr("x", function(d) {
            return axes.xScale(d.x2);
        })
        .attr("y", function(d) {
            return axes.yScale(d.y); // ordinal
        })
        .attr("width", "4px")
        .attr("height", function(d) {
            return axes.yScale.rangeBand()/2;
        })
        .style("fill", "red");
}

//Create Pollen visuals
function initPollen(input){
    input.insert("rect")
         .attr("width", "1px")
         .attr("class", "pollen")
         .on('click',onActivityClick)
}

function updatePollen(input){
        input.attr("x", function(d) {
            return axes.xScale(d.x1);
        })
        .attr("y", function(d) {
          return axes.yScale(d.y); // ordinal
        })
        .attr("width", function(d) {
           return axes.xScale(d.x2+1) - axes.xScale(d.x1);  
        })
        .attr("height", function(d) {
            return axes.yScale.rangeBand()/2;
        })
        .style("fill", "yellow")
}

//Create Fanning visuals
function initFanning(input){
    input.insert("rect")
         .attr("width", "1px")
         .attr("class", "fanning")
         .on('click',onActivityClick)
}

function updateFanning(input){
        input.attr("x", function(d) {
            return axes.xScale(d.x1);
        })
        .attr("y", function(d) {
          return axes.yScale(d.y) + axes.yScale.rangeBand()/2;
        })
        .attr("width", function(d) {
           return axes.xScale(d.x2+1) - axes.xScale(d.x1); 
        })
        .attr("height", function(d) {
            return axes.yScale.rangeBand()/2;
        })
        .style("fill", "purple");
}

function activityColor(d) {
        var color = "gray";
        if (d.Activity == "pollen")
            color = "#CFCF00";
        else if (d.Activity == "entering")
            color = "#FF0000";
        else if (d.Activity == "leaving")
            color = "#0000FF";
        else if (d.Activity == "fanning")
            color = "#20FF20";
        return color;
    }
function activityHeight(d) {
        var h = 2
        if (d.Activity == "entering")
            h=4
        else if (d.Activity == "leaving")
            h=4
        else if (d.Activity == "pollen")
            h=6
        else if (d.Activity == "fanning")
            h=6;
        return h;
    }

    allIntervals.x1 =  0;
    allIntervals.x2 = 0;
    
    
function initObsSpan(selection) {
    //console.log('selection=',selection)
    selection.insert("rect")
        .attr("class","obsspan")
        .style("stroke-width", "1px")
        //.on('click',onObsSpanClick)
        .call(updateObsSpan)
}

function updateObsSpan(selection) {
    selection
        .attr("x", function(d) {
            return axes.xScale(d.span.f1);
        })
        .attr("y", function(d) {
            return axes.yScale(d.id); // ordinal
            //axes.yScale(d.id)+axes.yScale.rangeBand()/2; // ordinal
        })
        .attr("width", function(d) {
            return axes.xScale(d.span.f2+1) - axes.xScale(d.span.f1);
        })
        .attr("height", function(d) {
            return axes.yScale.rangeBand();//axes.yScale.rangeBand()/2;
        })
        .style("fill", "none")
        .style("stroke", "red")
        .style("pointer-events", "all")
        // Display tooltip message
        .on('click',onObsSpanClick)
        /*
        .on("mouseover", function(obsspan){
            var d = obsspan.obs;
            
            var message = "";
            message += "BeeID=" + d.ID + " Frame=" + d.frame
                    + "<br>Time=" + format_HMS(videoControl.frameToTime(d.frame))
                    + "<br><u>Annotation:</u>"+
                     "<br>Labels=" + d.labels;
            if (d.wrongid) {
                message += '<br>newid='+d.newid
            }
            if (d.tag != undefined){
                message += 
                    "<br><u>Tag:</u>"+
                    "<br>Hamming=" + d.tag.hamming + 
                    "<br>DM=" + d.tag.dm;
            } else {
                message += "<br><u>Tag:</u><br><i>None</i>"
            }
            
            var tooltip = d3.select("body").selectAll(".tooltip")
            tooltip.style("left",d3.event.pageX + "px")
                   .style("top",d3.event.pageY + "px")
                   .style("visibility", "visible")
                   .html(message);
        })
        .on("mouseout", function(d){ 
            var tooltip = d3.select("body").selectAll(".tooltip")
            tooltip.style("visibility", "hidden");
          });
          */

}

function updateAlertCircle(selection) {
    selection.exit().remove()
    selection.enter().insert("circle")
        .attr("class","alertcircle")
        .style("fill", "none")
        .style("stroke-width", "2px")
        //.on('click',onActivityClick)
        .call(updateObsSpan)
    selection
        .attr("cx", function(d) {
            return axes.xScale(d.frame);
        })
        .attr("cy", function(d) {
            return axes.yScale(d.id)+axes.yScale.rangeBand()/2; // ordinal
        })
        .attr("r", 7)
        .style("stroke", "cyan");
}

    //put circles and rects here
function updateActivities(onlyScaling) {
    // Redraw activities
    if (onlyScaling) {
      // Lightweight update (reuse previous activityRects)
      let activityRects = svgInterval.selectAll(".activity").data(allIntervals);
      activityRects.call(setGeomActivity)
    } else {
      createIntervalList();
      
      // Full update
      let activityRects = svgInterval.selectAll(".activity")
                                     .data(allIntervals)
      
      activityRects.call(setGeomActivity)
      activityRects.enter().call(insertActivities);
      activityRects.exit().remove();

      if (flag_showIndividualEvents) {
          let spanRects = svgSpanRects.selectAll(".obsspan")
                       .data(flatTracks);
          spanRects.enter().call(initObsSpan)
          spanRects.exit().remove()
          spanRects.call(updateObsSpan)

          let alertCircle = svgTop.selectAll(".alertcircle")
                        .data(flatTracks.filter(d=>!!d.isredundant));
          alertCircle.call(updateAlertCircle)
      } else {
          let spanRects = svgSpanRects.selectAll(".obsspan")
                           .data([]);
          spanRects.exit().remove()
          
          let alertCircle = svgTop.selectAll(".alertcircle")
                        .data([]);
          alertCircle.call(updateAlertCircle)
      }


      //Object for pollen visuals
      let insertPollen = svgTop.selectAll(".pollen")
      .data(allIntervals.filter(function (d){return (d.Activity=="pollen")}));

        insertPollen.enter().call(initPollen);
        insertPollen.exit().remove(); 
        insertPollen.call(updatePollen);


    //Object for fanning visuals
      let insertFanning = svgTop.selectAll(".fanning")
      .data(allIntervals.filter(function (d){return (d.Activity=="fanning")}));

        insertFanning.enter().call(initFanning);
        insertFanning.exit().remove();
        insertFanning.call(updateFanning);


      //Object to create enter visuals
      let insertEnter = svgTop.selectAll(".entering")
      .data(allIntervals.filter(function (d){return (d.Activity=="entering")}));

        insertEnter.enter().call(initEntering);
        insertEnter.exit().remove();
        insertEnter.call(updateEntering);


    //Object for exit visuals
      let insertLeaving = svgTop.selectAll(".leaving")
      .data(allIntervals.filter(function (d){return (d.Activity=="leaving")}));

        insertLeaving.enter().call(initLeaving);
        insertLeaving.exit().remove();
        insertLeaving.call(updateLeaving);

        }

    var chart = svgTop;
    
    //Circles for solo bee iD
    let circles =  chart.selectAll("circle.obs")
                        .data(allIntervals);

    d3.select("body").selectAll(".tooltip").remove();

    var tooltip = d3.select("body")
                       .append("div")
                       .style("z-index","10")
                       .style("visibility", "hidden")
                       .style("opacity", "1")
                       .attr("class","tooltip");

    circles.enter()
        .append("circle")
        .attr('class','obs')
        .on('click',onActivityClick)
        .append('title'); //Add circle chronoGroup
    circles.exit().remove();
    //Update circles
    circles
        .attr("cx", function(d) {
            return axes.xScale(Number(d.x1));
        })
        .attr("cy", function(d) {
            return axes.yScale(d.y) + axes.yScale.rangeBand() / 2;
        })
        .attr("r", 5) //change radius
        .style("stroke",  function(d){
            var color = "black";
            if (d.pollen){
                color = "ffbb00";
            }
            return color;
        })
        .style("stroke-width",  function(d){
            var width = 1;
            if (d.pollen){
                width = 3;
            }
            return width ;
        })
        .style("fill", function(d) {
            var color = "black";
            if (d.Activity == "fanning") color = "#99CCFF";
            else if (d.Activity == "pollen") color = "#FFFF00";
            else if (d.Activity == "entering") color = "#FFC0C0";
            else if (d.Activity == "leaving") color = "#C0FFC0";
            return color;
        })
        // Display tooltip message
        .on("mouseover", function(d){
            var message = "";
            message += "BeeID=" + d.y + " Frame=" + d.x1
                    + "<br>Time=" + format_HMS(videoControl.frameToTime(d.x1))
                    + "<br><u>Annotation:</u>"+
                     "<br>Labels=" + d.labels;
            if (d.wrongid) {
                message += '<br>newid='+d.newid
            }
            if (d.tag != undefined){
                message += 
                    "<br><u>Tag:</u>"+
                    "<br>Hamming=" + d.tag.hamming + 
                    "<br>DM=" + d.tag.dm;
            } else {
                message += "<br><u>Tag:</u><br><i>None</i>"
            }
            tooltip.style("left",d3.event.pageX+ "px")
                   .style("top",d3.event.pageY + "px")
                   .style("visibility", "visible")
                   .html(message);
        })
        .on("mouseout", function(d){ tooltip.style("visibility", "hidden");});


var lineFunction = d3.svg.line()
              .x(function(d) {return d.x;})
              .y(function(d) {return d.y;})
              .interpolate("linear");

function crossFunction(x,y, r){
    x = Number(x);
    y = Number(y);
    if (!r) { r=10 }

    return "M"+(x-r)+","+(y-r)+"L"+(x+r)+","+(y+r)+"M"+(x+r)+","
    +(y-r)+"L"+(x-r)+","+(y+r);
}

//Append line to chronogram
let path = chart.selectAll(".crossLeft")
                .data(crosses);
//filter for labels, split it refreshChronogram so no need 


path.enter()
    .append("path")
    .attr('class','crossLeft');
    // Caution: check CSS property pointer-events:
    // crossLeft does not receive mouse events

path.attr("d",function(d){
          var X=axes.xScale(Number(d.x1)), Y=axes.yScale(d.y) + axes.yScale.rangeBand()/2;
          //if((d.labels == "wrongid") && (d.newid != null))
          //    return crossFunction(X,Y,5);
          return crossFunction(X,Y, 5)})
    .attr("stroke", function(d){
        var color = "black";
        if(d.labels == "falsealarm")
            color = "red";
        else if(d.labels == "wrongid")
            color = "#009fff";
        return color;
    })
    .attr("stroke-width", function(d){
        var width = 3;
        if((d.labels == "wrongid") && (d.newid != null))
            width = 1.5;
        return width;
    })
    .attr("fill", "none");
path.exit().remove();



function squareFunction(x,y){
    x = Number(x);
    y = Number(y);

    return "M"+(x-10)+","+(y-10)+"L"+(x+10)+","+(y+10)+"M"+(x+10)+","
    +(y-10)+"L"+(x-10)+","+(y+10);
}



if (flag_showPartsOnChrono) {
//Append line to chronogram
let parts = chart.selectAll(".partsAvailable")
                .data(partsIntervals);
//filter for labels, split it refreshChronogram so no need 
parts.enter()
    .append("rect")
    .attr('class','partsAvailable');
    // Caution: check CSS property pointer-events:
    // partsAvailable does not receive mouse events

parts.attr("x", function(d) {
            return axes.xScale(Number(d.x1)) - axes.yScale.rangeBand()/2;
        })
        .attr("y", function(d) {
            return axes.yScale(d.y);
        })
        .attr("width", axes.yScale.rangeBand())
        .attr("height", axes.yScale.rangeBand())
    .attr("stroke", function(d){
        var color = "black";
        return color;
    })
    .attr("stroke-width", 1)
    .attr("fill", "none");
parts.exit().remove();
} else {
    chart.selectAll(".partsAvailable").remove();
}



}

function format_HMS(date, format) {
    function pad(n) { return ("0"+n).substr(-2); }

    var time = [date.getHours(), date.getMinutes(), date.getSeconds()]
          .map(pad).join(":")
          
    if (format==="HMS.") {
        time += "."+date.getMilliseconds();
    }
    
    return time
}


function initActivities() {
    //chronogramData = []
    chronogramData.length = 0
    updateActivities()
}

function onTagClick(tagInterval) {
    console.log("CLICK Tag tagInterval=",tagInterval);
    // Prevent default chronogram click to go to the correct frame
    d3.event.stopPropagation();
    
    gotoEvent(Number(tagInterval.begin), tagInterval.id)   
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
        .on('click',onTagClick)
        .call(setTagGeom)
}
function setTagGeom(selection) {
    // Tag interval
    let H=axes.yScale.rangeBand();
    function tagHeight(d) {
        return H*(3-d.hammingavg)/3;
    }
    selection
        .attr("x", function(d) {
            //return xScale(Number(d.frame) - 0.5);
            return axes.xScale(Number(d.begin));
        })
        .attr("y", function(d) {
            return axes.yScale(d.id)+H-tagHeight(d);
        })
        .attr("width", function(d) {
            return axes.xScale(Number(d.end)+1)-axes.xScale(Number(d.begin));
        })
        .attr("height", function(d) {
            return tagHeight(d); // Ordinal scale
        })
        .style("fill", function(interval) {
            if (interval.virtual)
                return "white"
            if (interval.labeling.entering) {
                //console.log('setTagGeom: found entering, d=',d)
                return '#ff00c0'
            } else if (interval.labeling.leaving) {
                //console.log('setTagGeom: found entering, d=',d)
                return '#00ef00'
            } else {
                return 'blue'
            }
        })
        .style("stroke", function(interval) {
            if (interval.labeling.entering)
                return '#ff00c0'
            else if (interval.labeling.leaving)
                return '#00e000'
            else
                return 'blue'
        })
        .style("fill-opacity", function(interval) {
            if (interval.virtual)
                return "0.1"
            else
                return "0.2"
        })
        if (true) {

    d3.select("body").selectAll(".tooltip2").remove();

    var tooltip2 = d3.select("body")
                       .append("div")
                       .style("z-index","10")
                       .style("visibility", "hidden")
                       .style("opacity", "1")
                       .attr("class","tooltip2");
        
        selection.style("z-index","1000")
        .style("pointer-events", "all")
        //.on("wheel", function(){console.log('got wheeled')})
        .on("mouseover", function(taginterval){
            //console.log('mouseover: ',taginterval)
            var message = "";
            if (taginterval){
                message += "BeeID=" + taginterval.id 
                    + " Frame=" + taginterval.begin
                    + "<br>Time=" + format_HMS(videoControl.frameToTime(taginterval.begin))
                    + "<br><u>Tag:</u>"
                    + "<br>HammingAvg=" + taginterval.hammingavg
                    + "<br>DM=" + taginterval.dmavg;
            } else {
                message += "<u>Tag:</u><br><i>None</i>"
            }
            tooltip2.style("left",d3.event.pageX+ "px")
                   .style("top",d3.event.pageY + "px")
                   .style("visibility", "visible")
                   .html(message);
//             // Highlight source tag for wrongid annotations
//             if (taginterval && typeof taginterval.oldid != 'undefined') {
//                 message += '<br>virtualtag: oldid='+taginterval.oldid
//                     selection
//                     .filter(d=>(d.id==taginterval.oldid) && (d.begin==taginterval.begin))
//                     .style("fill","green")
//                     .style("stroke","green")
//             }
        })
        .on("mouseout", function(taginterval){ 
            tooltip2.style("visibility", "hidden");
//             setTagGeom(selection
//                     .filter(d=>(d.id==taginterval.oldid) && (d.begin==taginterval.begin))
//             )
          });
        }
        //.attr("hidden", function(d) {return (typeof axes.yScale(d.id));})
}
function updateTagIntervals(onlyScaling) {
    // Redraw tag intervals
    if (onlyScaling) {
      setTagGeom(tagSel)
    } else {
      tagSel = svgTag.selectAll(".tag").data(tagIntervals);
      tagSel.enter().call(insertTag)
      tagSel.exit().remove();
      tagSel.call(setTagGeom)
    }
}
function initTagIntervals() {
    //tagsData = []
    tagIntervals = []
    updateTagIntervals()
}


function getFlatTags(useFilter) {
    let flatTags=[]
    for (let F in Tags) {
        let tags = Tags[F].tags
        for (let i in tags) {
            let id = tags[i].id
            
            if (useFilter) {
                if (flag_restrictID) {
                    if ($.inArray(String(id), restrictIDArray)<0) continue;
                }
                if (flag_excludeID) {
                    if ($.inArray(String(id), excludeIDArray)>=0) continue;
                }
            }
            
            flatTags.push(tags[i])
        }
    }
    return flatTags;
}

function getTTags() {
    allTagsID = new Set()

    /* Transpose Tags data structure */
    let ttags = {}
    for (let F in Tags) {
        let tags = Tags[F].tags
        for (let i in tags) {
            let id = String(tags[i].id)
            
            allTagsID.add(id)
            
            if (flag_restrictID) {
                if ($.inArray(String(id), restrictIDArray)<0) continue;
            }
            if (flag_excludeID) {
                if ($.inArray(String(id), excludeIDArray)>=0) continue;
            }
            
            if (typeof ttags[id] === 'undefined')
                ttags[id]={}
            ttags[id][String(F)]=tags[i];
        }
    }
    
    return ttags;
}

var flatTracks = []
function updateObsTable() {
    // All obs sorted by frame,id
    flatTracksAll = []
    for (let F in Tracks) {
        for (let id in Tracks[F]) {
                // var obs = Tracks[F][id]
                obs = Tracks[F][id]

                if (flag_restrictID) {
                    if ($.inArray(String(id), restrictIDArray)<0) continue;
                }
                if (flag_excludeID) {
                    if ($.inArray(String(id), excludeIDArray)>=0) continue;
                }
            
                let chronoObs = {'frame':F, 'id':id, 'labels':obs.labels, 'obs':obs};

                flatTracksAll.push(chronoObs)
        }
    }
    flatTracksValid = flatTracksAll.filter(function(d){
                return (!containsLabel(d.labels,'falsealarm') &&
                        !containsLabel(d.labels,'wrongid')    )
            })
    var groupBy = function(array, key) {
      return array.reduce(function(groups, x) {
        // Appends x to groups[x[key]]
        (groups[x[key]] =  groups[x[key]] || []).push(x);
        return groups;
      }, {});
    }; // Keep order of frames
    flatTracksAllGroupById = groupBy(flatTracksAll, 'id') 
    flatTracksValidGroupById = groupBy(flatTracksValid, 'id') 
    
    if (flag_hideInvalid) {
        flatTracks = flatTracksValid;
    } else {
        flatTracks = flatTracksAll;
    }
    
    showObsTable = !$("#labelingTab > .ui-accordion-header").hasClass("ui-accordion-header-collapsed")
    if (showObsTable) {
        d3.select('#obsTable').html("");
        var table = d3.select('#obsTable').append('table');

        function ƒ(name){ return function(d){return d[name]};}
    
        var columns = [
              { head: 'ID', cl: 'id', html: ƒ('id') },
              { head: 'Frame', cl: 'frame', html: ƒ('frame') },
              { head: 'Labels', cl: 'labels', html: ƒ('labels') }
          ];
      
        function onObsTableRowClick(d) {
            console.log('onObsTableRowClick: d=',d)
            gotoEvent(Number(d.frame), d.id)
        }
    
        table.append('thead').append('tr')
           .selectAll('th')
           .data(columns).enter()
           .append('th')
           .attr('class', function(d){return d.cl})
           .text(function(d){return d.head});
       
        table.append('tbody')
           .selectAll('tr')
           .data(flatTracks).enter()
           .append('tr')
           .classed('obsTableRow', true)
           .on('click',onObsTableRowClick)
           .selectAll('td')
             .data(function(row, i) {
                 // evaluate column objects against the current row
                 return columns.map(function(c) {
                     var cell = {};
                     d3.keys(c).forEach(function(k) {
                         cell[k] = typeof c[k] == 'function' ? c[k](row,i) : c[k];
                     });
                     return cell;
                 });
             }).enter()
               .append('td')
               .html(ƒ('html'))
               .attr('class', ƒ('cl'));
    }
}

function modifyCurrentObsSpan(mode) {
    let r = getSelectedRect()
    if (!r) return;
    
    let frame = r.obs.frame
    let id = r.obs.ID
    
    let obs=Tracks[frame][id]
    
    let tracks = flatTracksAll.filter(
              function(element) {return element.obs == obs}
              //{return (element.obs.frame==obs.frame && element.obs.ID==obs.ID)}
          )
    if (tracks.length==0) return
    
    let track=tracks[0]
    
    if (! ('span' in obs)) {
        obs.span = {'f1':track.span.f1, 'f2':track.span.f2}
    }
    if (mode=='copy') {
        return
    }
    if (mode=='extendleft') {
        obs.span.f1 = obs.span.f1-10
        if (obs.span.f1<0) obs.span.f1=0
    }
    if (mode=='extendright') {
        obs.span.f2 = obs.span.f2+10
    }
    if (mode=='restrictleft') {
        obs.span.f1 = obs.span.f1+10
        if (obs.span.f1>obs.frame) obs.span.f1=obs.frame
    }
    if (mode=='restrictright') {
        obs.span.f2 = obs.span.f2-10
        if (obs.span.f2<obs.frame) obs.span.f2=obs.frame
    }
    updateTagsLabels()
    drawChrono()
}


/* Augment tags with labels */

function updateTagsLabels() {
    for (let ann of flatTracksAll) {
        if ('span' in ann.obs) {
          ann.span = {f1:Number(ann.obs.span.f1), f2:Number(ann.obs.span.f2)}
          ann.span.b1='manual'
          ann.span.b2='manual'
        } else {
          let f = Number(ann.frame)
          ann.span = {f1:f, f2:f}
          ann.span.b1='obs'
          ann.span.b2='obs'
        }
    }
    let tagIntervalsVirtual=[]
    for (let interval of tagIntervals) {
        interval.labeling={
            labeled:false,
            entering:false,
            falsealarm:false,
            wrongid:false
        }

        for (let ann of flatTracksAll) {
            if (ann.id != interval.id) continue;
        
            let f = Number(ann.frame)
            let f1 = Number(interval['begin'])
            let f2 = Number(interval['end'])
            
            if (ann.span.b1!='manual') {
                if (f>f1-20 && f<f2+20) {
                    interval.labeling.labeled = true
                    interval.labeling.entering = hasLabel(ann,'entering')
                    interval.labeling.falsealarm = hasLabel(ann,'falsealarm')
                    interval.labeling.wrongid = hasLabel(ann,'wrongid')
                
                    if (hasLabel(ann,'wrongid') && (ann.obs.newid != null)) {
                        interval.newid=ann.obs.newid;
                        //console.log('ann=',ann,'=>',interval)
                    }
                
                    if (f1<ann.span.f1) {
                        ann.span.f1 = f1
                        ann.span.b1='tag'
                    }
                    if (f2>ann.span.f2) {
                        ann.span.f2 = f2
                        ann.span.b2='tag'
                    }
                }
            } else {
                if (ann.span.f2>=f1 && ann.span.f1<=f2) {
                    interval.labeling.labeled = true
                    interval.labeling.entering = hasLabel(ann,'entering')
                    interval.labeling.falsealarm = hasLabel(ann,'falsealarm')
                    interval.labeling.wrongid = hasLabel(ann,'wrongid')   
                    
                    if (hasLabel(ann,'wrongid') && (ann.obs.newid != null)) {
                        interval.newid=ann.obs.newid;
                        //console.log('ann=',ann,'=>',interval)
                    }          
                }
            }
        }
        if (interval.labeling.wrongid && (interval.newid != null)) {
            let intervalV = Object.assign({},interval)
            intervalV.oldid=intervalV.id
            intervalV.id=intervalV.newid
            intervalV.wrongid=false
            intervalV.virtual=true
            //console.log(interval,'=>',intervalV)
            tagIntervalsVirtual.push(intervalV)
        }
    }
    tagIntervals = tagIntervals.concat(tagIntervalsVirtual)

    // Find redundant Tracks   
    for (let id in flatTracksValidGroupById) { 
        obs_for_id = flatTracksValidGroupById[id]
        for (let j in obs_for_id) {
            if (j==0) continue;
            let i=j-1;
        
            let obs1=obs_for_id[i]
            let obs2=obs_for_id[j]
        
            if (obs1.span.f2>=obs2.span.f1) {
                obs2.isredundant = true
            }
        }
    }
}


function refreshChronogram() {

    //check if id and frame are in tag object
  
    // Augment Tracks with tag id if same (frame,id) exist for both
    for (let F in Tracks) {
        if (Tags[F] != undefined){
            for (var i = 0; i < Tags[F].tags.length;i++){
                let id = String(Tags[F].tags[i].id);
                if (Tracks[F] && Tracks[F][id]) {
                    Tracks[F][id].tag = Tags[F].tags[i]
                }
            }
        }
    }

    // Tracks => chronogramData
    // chronogramData[flatID].x, .y, .Activity, .labels, .pollen
    // .tag, .obs 
    chronogramData.length = 0
    if (showObsChrono) {
        for (let F in Tracks) {
            for (let id in Tracks[F]) {
                let obs=Tracks[F][id]
                let labelArray = obs.labels.split(",")
            
                if (flag_restrictID) {
                    if ($.inArray(String(id), restrictIDArray)<0) continue;
                } 
                if (flag_excludeID) {
                    if ($.inArray(String(id), excludeIDArray)>=0) continue;
                }
                if (flag_hideInvalid) {
                    if (hasLabel(obs,'falsealarm') ||
                        hasLabel(obs,'wrongid')    ) continue;
                }

                let b=obs.bool_acts
                let b0 = b[0]
                let b1 = b[1]
                let b2 = b[2]
                let b3 = b[3]
//                 let b0 = hasLabel(obs,'fanning')
//                 let b1 = hasLabel(obs,'pollen')
//                 let b2 = hasLabel(obs,'entering')
//                 let b3 = hasLabel(obs,'leaving')
                
                if (!b0 && !b2 && !b3) {
                    chronogramData.push({'x':F, 'y':id, 'Activity':"", labels:obs.labels, pollen:b1, tag: obs.tag, obs: obs});
                }
                if (b2) {
                    chronogramData.push({'x':F, 'y':id, 'Activity':"entering", labels:obs.labels, pollen:b1, tag: obs.tag, obs: obs});
                }
                if (b3) {
                    chronogramData.push({'x':F, 'y':id, 'Activity':"leaving", labels:obs.labels, pollen:b1, tag: obs.tag, obs: obs});
                }
                if (b0) {
                    chronogramData.push({'x':F, 'y':id, 'Activity':"fanning", labels:obs.labels, pollen:b1, tag: obs.tag, obs: obs});
                }
            }
        }
    }
    
    updateObsTable()
  
    
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

    flatTags = getFlatTags(false) // noFilter

    //allTagsID = []

    ttags = getTTags()
    
    allTagsID = [...allTagsID]

    // ttags => tagIntervals
    tagIntervals = []
    if (showTagsChrono) {
    
        /* Convert to intervals */
        for (let id in ttags) {
          let obsarray = ttags[id]
          let activeInterval = []
          let isActive = false
          for (let frame in obsarray) {
            let tags = obsarray[frame]
            let f = Number(frame)
        
            if (!tagsSampleFilter(tags)) {
                continue
            }
        
            if (isActive) {
              let doPush = false
              if (activeInterval.end == f-1) {
                // Extend active interval
                activeInterval['end']  = f
                
                if (tags.hamming<1000) {
                      activeInterval.hammingavg=
                           activeInterval.hammingavg+tags.hamming;
                      activeInterval.dmavg=
                           activeInterval.dmavg+tags.dm;
                } else {
                      activeInterval.hammingavg=activeInterval.hammingavg+0
                }
              } else {
                // Do not extend active interval
                doPush = true
              }
              if (doPush) {
                // Close previous 
                //activeInterval['end']++
                if (tagsIntervalFilter(activeInterval)) {
                    let len = (activeInterval['end'] -activeInterval['begin']+1)
                    activeInterval.hammingavg=activeInterval.hammingavg/len
                    activeInterval.dmavg=activeInterval.dmavg/len
                    tagIntervals.push(activeInterval)
                }
                // Open new one
                activeInterval={'id':id,'begin':f,'end':f,
                  'hammingavg':tags.hamming, 'dmavg':tags.dm, labeling:{}}
              }
            } else {
              // Open new one
              activeInterval={'id':id,'begin':f,'end':f,
                  'hammingavg':tags.hamming, 'dmavg':tags.dm, labeling:{}}
              isActive=true;
            }
          }
          // Close if active
          if (isActive)
            //activeInterval['end']++
            if (tagsIntervalFilter(activeInterval)) {
                let len = (activeInterval['end'] -activeInterval['begin']+1)
                activeInterval.hammingavg=activeInterval.hammingavg/len
                activeInterval.dmavg=activeInterval.dmavg/len
                tagIntervals.push(activeInterval)
            }
        }
    }
    
    // Augment tags with tracks labels
    // Also generate virtual tag intervals for wrongid annotations
    updateTagsLabels()
    
    // Filter tagIntervals
    if (flag_hideInvalid) {
        tagIntervals = tagIntervals.filter(
              interval=>!(interval.labeling.falsealarm ||
                    interval.labeling.wrongid)
            )
    }
//     if (flag_hideInvalid) {
//     
//         let tagIntervals0 = tagIntervals;
//         tagIntervals=[]
//         
//         for (let interval of tagIntervals0) {
//             if (interval.labeling.falsealarm ||
//                 interval.labeling.wrongid)   continue;
//             tagIntervals.push(interval)
//         }
//     }
//     tagIntervals0=[];
    
    if (logging.chrono)
        console.log("refreshChronogram: drawChrono()...")

    //d3.selectAll("svg > *").remove();
    drawChrono();
}


function interpolateTags(maxgap) {
    tagIntervals = []

    function getAllTTags() {
        /* Transpose Tags data structure */
        let ttags = {}
        for (let F in Tags) {
            let tags = Tags[F].tags
            for (let i in tags) {
                let id = String(tags[i].id)
            
                if (typeof ttags[id] === 'undefined')
                    ttags[id]={}
                ttags[id][String(F)]=tags[i];
            }
        }
        return ttags;
    }

    let ttags = getAllTTags()
    
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
                activeInterval.dir = 'leaving'
        }
    }
    updateTagIntervals()
}

function cleanObsoleteEventsCB() {
  var r = confirm("CAUTION !!!! Operation cannot be undone. Please confirm: Delete all obsolete events, i.e. no associated tag or low DM or inside excludeRects. ");
  if (r == true) {
      console.log('cleanObsoleteEvents')
      cleanObsoleteEvents();
  } else {
      console.log('cleanObsoleteEvents canceled')
  }
}

function cleanObsoleteEvents() {

  for (let F in Tracks) {
    for (let id in Tracks[F]) {
      let obs=Tracks[F][id]
      
      if ((hasLabel(obs,'falsealarm') ||
           hasLabel(obs,'wrongid'))) {
        if (!obs.tag) {
          console.log('No tag: Delete Tracks['+F+']['+id+'] = ',obs)
          delete Tracks[F][id]
        } else {
          if (obs.tag.dm<20) {
            console.log('low DM: Delete Tracks['+F+']['+id+'] = ',obs)
            delete Tracks[F][id]
          }
          if (!tagsSampleFilterExcludeRects(obs.tag)) {
            console.log('excludeRect: Delete Tracks['+F+']['+id+'] = ',obs)
            delete Tracks[F][id]
          }
        }
      }
    }
  }
  refreshChronogram()
  
}