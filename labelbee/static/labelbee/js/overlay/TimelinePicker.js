/*jshint esversion: 6, asi: true */
// Timeline picking of the overlay: the interaction mode 'pick-frame' (set the span of an observation by picking frames in a
// timeline, Pick Flower tool) and the timeline displays. Moved as it is out of OverlayControl.js and form/VisitControl.js
// (ES module, refactor slice 8 step 11b2, ADR 0015). Half broken legacy, to deal with later. A `TimelinePicker` is built by
// the overlay and registered as `overlay.modes['pick-frame']`; the state of the mode stays in `overlay.interaction.opts`.
// `TimelinePicker` is installed on window by labelbeeBridge.js (OverlayControl.js builds it). Page globals are read at call time.

/** TIMELINE WIDGET */
const TimelineWidget = function(overlay) {
    this.overlay = overlay

    this.frame = undefined
    this.deltas = [-3,-2,-1,0,+1,+2,+3]
    this.displaySize = 200
    this.zoomScale = 4
    this.divs = undefined
    this.imgs = undefined
    this.counter = 0
    this.crop = {}

    this.create()
}
/* Model */
TimelineWidget.prototype.setCenterFrame = function (frame0) {
    this.frame0 = frame0
    this.redraw()
}
TimelineWidget.prototype.setCrop = function (crop) {
    this.crop = crop
    this.redraw()
}
TimelineWidget.prototype.setCropFromObs = function (obs, size) {    
    if (!size) {
        size = obs.width>obs.height ? obs.width : obs.height
        size *= this.zoomScale
    }

    let w = size
    let h = size

    let cx = obs.x + obs.width/2
    let cy = obs.y + obs.height/2
    let crop = {x: Math.round(cx-w/2), y: Math.round(cy-h/2), w: w, h: h}

    this.setCrop(crop)
}
TimelineWidget.prototype.setDisplaySize = function (displaySize) {
    this.displaySize = displaySize
    this.update()
}
/* View */
TimelineWidget.prototype.create = function () {
    let overlay = this.overlay
    let root = $('#timelineblockdiv')

    root.html("TIMELINE: ")

    let list = $('<div id="frames-list"></div>')
    this.divs={}
    this.imgs={}
    for (const delta of this.deltas) {
        let frame = "???"
        let div = $('<div frame-delta="'+delta+'" style="display: inline-block"><small>Frame '+frame+'</small><br></div>')
        let img = $('<img/>')[0]
        div.append(img)
        list.append(div)
        this.divs[delta]=div.get(0)
        this.imgs[delta]=img
    }

    root.append(list)
        .append($('<button class="btn btn-xs">Zoom+</button>').click( ()=>this.onClick('timelineZoom', 1/1.5) ))
        .append($('<button class="btn btn-xs">Zoom-</button>').click(  ()=>this.onClick('timelineZoom', 1.5)  ))
        .append($('<button class="btn btn-xs">Size+</button>').click( ()=>this.onClick('timelineDisplaySize', 1.5) ))
        .append($('<button class="btn btn-xs">Size-</button>').click(  ()=>this.onClick('timelineDisplaySize', 1/1.5)  ))
        //.append($('<button class="btn btn-xs">Frames+</button>').click( ()=>this.onClick('timelineMaxDelta', 1) ))
        //.append($('<button class="btn btn-xs">Frames-</button>').click(  ()=>this.onClick('timelineMaxDelta', -1)  ))
}
TimelineWidget.prototype.update = function () {
    let overlay = this.overlay
    let list = $('<div id="frames-list"></div>')
    $('#timelineblockdiv').html("TIMELINE: ")
        .append(list)
    this.divs={}
    for (const delta of this.deltas) {
        let img = this.imgs[delta]
        img.width = this.displaySize
        img.height = this.displaySize
    }
}
TimelineWidget.prototype.redraw = async function () {
    let overlay = this.overlay
    this.counter = (this.counter+1) % 9000000000  // Large enough to not have collision
    const c = this.counter
    for (const delta of this.deltas) {
        let frame = this.frame0 + delta
        //console.log(frame); 
        let data = undefined
        data = await videoControl.videoCache.getFrameCropDataURL(videoControl.video.src, frame, 20, this.crop)
        if (this.counter != c) {
            // Abort if not the latest update
            return
        }
        let img = this.imgs[delta]
        if (data && img)
            img.src = data
    }
}
/* Controller */
TimelineWidget.prototype.onClick = function (param, value) {
    if (param == 'timelineZoom') {
        this.zoom *= value
        this.redraw()
    } else if (param == 'timelineDisplaySize') {
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        this.displaySize = clamp( Math.round(this.displaySize * value), 50,1000)
        this.update()
    } else if (param == 'timelineMaxDelta') {
        // Not implemented
    }
}

export const TimelinePicker = function(overlay) {
    this.overlay = overlay
    this.timeline = new TimelineWidget(overlay)
}
// Mode hooks called by the overlay
TimelinePicker.prototype.enter = function(opts) {
    const overlay = this.overlay
    // For the moment, does not check opts.type, since we have only setspan

    let activeObj = overlay.getActiveRect()
    if (!activeObj) {
        console.log('overlay.setInteractionMode: CANCELED, no active object')
        return null
    }
    let obs = activeObj.obs
    if (!obs) {
        console.log('overlay.setInteractionMode: CANCELED, no obs')
        return null
    }
    let frame = videoControl.getCurrentFrame()

    overlay.interaction.mode = 'pick-frame'
    overlay.interaction.opts = opts
    overlay.interaction.opts.obs = obs
    overlay.interaction.opts.id = obs.ID
    overlay.interaction.opts.frame = frame
    overlay.interaction.opts.showTimeline = false // Hide timeline by default

    // Default span, written here and not in hardRefresh: a refresh never writes the store (DEBT-825)
    let handle = getObsHandle(frame, obs.ID)
    let wroteSpan = false
    if (handle && !('span' in handle)) {
        events.update(frame, obs.ID, { span: { 'f1': frame, 'f2': frame } })
        wroteSpan = true
    }
    return {wroteSpan: wroteSpan}
}
TimelinePicker.prototype.refreshInteraction = function(opts) {
    if (opts.type=='setspan') {
        $('.setspan').addClass("active")
    }
}
// Returns false when the mode ended (no valid obs): the overlay is then already refreshed
TimelinePicker.prototype.hardRefresh = function () {
  const picker = this
  const overlay = this.overlay
  overlay.setActiveRectID(overlay.interaction.opts.id)
  let id = overlay.interaction.opts.id
  let frame = overlay.interaction.opts.frame

  // Poke directly in the main datastructure as the active object
  // does not copy this field. // TODO: cleanme
  let obs = getObsHandle(frame, id) //Tracks[frame][id]
  if (!obs) {
    console.log('overlay.hardRefresh: ERROR, in pick-frame without valid obs')
    overlay.setInteractionMode('main')
    overlay.setActiveRectID(selection.getId());
    updateSelectionPanels();
    overlay.refreshOverlay(true)

    updateUndoButton()
    return false
  }
  function doSwap2(interval, old_id, new_id) {
    obs_swapID(interval, old_id, new_id)
    refresh.rebuild()
  }
  function doSetSpanStart() {
    let f = videoControl.getCurrentFrame()
    events.update(frame, id, { span: { f1: f, f2: obs.span.f2 } })
    //$('#alerttext').html('Set Start DONE')
    //overlay.setInteractionMode('main')
    refresh.rebuild()
  }
  function gotoStart() {
    gotoEvent(obs.span.f1, id)
  }
  function gotoAnnotation() {
    gotoEvent(obs.frame, id)
  }
  function gotoEnd() {
    gotoEvent(obs.span.f2, id)
  }
  function doSetSpanEnd() {
    let f = videoControl.getCurrentFrame()
    events.update(frame, id, { span: { f1: obs.span.f1, f2: f } })
    //$('#alerttext').html('Set Start DONE')
    //overlay.setInteractionMode('main')
    refresh.rebuild()
  }
  function cancelSetSpan() {
    $('#pickframediv').html('Pick frame CLOSED')
    overlay.setInteractionMode('main')
  }

  function timelineButtonCallback(param, value) {
    if (param == 'timelineZoom')
      overlay.opts.timelineZoom *= value
    else if (param == 'timelineDisplaySize') {
      overlay.opts.timelineDisplaySize = Math.round(overlay.opts.timelineDisplaySize * value)
      if (overlay.opts.timelineDisplaySize > 1000) overlay.opts.timelineDisplaySize = 1000
      if (overlay.opts.timelineDisplaySize < 50) overlay.opts.timelineDisplaySize = 50
    } else if (param == 'timelineMaxDelta') {
      overlay.opts.timelineMaxDelta = Math.round(overlay.opts.timelineMaxDelta + value)
      if (overlay.opts.timelineMaxDelta > 10) overlay.opts.timelineMaxDelta = 10
      if (overlay.opts.timelineMaxDelta < 1) overlay.opts.timelineMaxDelta = 1
    }

    if (overlay.interaction.opts.showTimeline) {
      picker.drawTimelinePickFrameMode()
    }
  }

  //printMessage(
  $('#pickframediv').html("PICK FRAME: setting timespan for ID=" + id + " at frame=" + frame + ": ")
    .append($('<button class="btn btn-obs-expand btn-sm">Set Start</button>').click(doSetSpanStart))
    .append($('<button class="btn btn-obs-expand btn-sm">Set End</button>').click(doSetSpanEnd))
    .append($(document.createTextNode(' ')))
    .append($('<button>CLOSE</button>').click(cancelSetSpan))
    .append($('<br>'))
    .append($('<button class="btn btn-default  btn-xs">Goto Start</button>').click(gotoStart))
    .append($('<button class="btn btn-default  btn-xs">Goto Event</button>').click(gotoAnnotation))
    .append($('<button class="btn btn-default  btn-xs">Goto End</button>').click(gotoEnd))
    .append($('<br>'))
    .append($('<button class="btn btn-xs button-showtimeline btn-blue-toggle">Show Timeline</button>').click(
      function () {
        overlay.interaction.opts.showTimeline = !overlay.interaction.opts.showTimeline
        $('.button-showtimeline').toggleClass('active', overlay.interaction.opts.showTimeline)
        if (overlay.interaction.opts.showTimeline) {
          picker.drawTimelinePickFrameMode() // Create timeline
        } else {
          $('#pick-frame-timeline').html('') // Destroy timeline
        }
      }
    ))
    .append($('<button class="btn btn-xs">Zoom+</button>').click(() => timelineButtonCallback('timelineZoom', 1 / 1.5)))
    .append($('<button class="btn btn-xs">Zoom-</button>').click(() => timelineButtonCallback('timelineZoom', 1.5)))
    .append($('<button class="btn btn-xs">Size+</button>').click(() => timelineButtonCallback('timelineDisplaySize', 1.5)))
    .append($('<button class="btn btn-xs">Size-</button>').click(() => timelineButtonCallback('timelineDisplaySize', 1 / 1.5)))
    .append($('<button class="btn btn-xs">Frames+</button>').click(() => timelineButtonCallback('timelineMaxDelta', 1)))
    .append($('<button class="btn btn-xs">Frames-</button>').click(() => timelineButtonCallback('timelineMaxDelta', -1)))
    .append($('<button class="btn btn-xs button-showPickFlower btn-blue-toggle">Pick Flower</button>').click(() => picker.pickFlowerButtonCallback()))
    .append($('<div id="pick-frame-timeline"></div>'))
  $('.button-showtimeline').toggleClass('active', overlay.interaction.opts.showTimeline)

  if (overlay.interaction.opts.showTimeline)
    picker.drawTimelinePickFrameMode()
  return true
}

TimelinePicker.prototype.pickFlowerButtonCallback = function (param, value) {
  let overlay = this.overlay
  overlay.interaction.opts.showPickFlower = !overlay.interaction.opts.showPickFlower
  $('.button-showPickFlower').toggleClass('active', overlay.interaction.opts.showPickFlower)
  if (overlay.interaction.opts.showPickFlower) {
    this.drawImagePickFlowerMode() // Create image to pick
  } else {
    $('#pickflowerdiv').html('') // Destroy display
  }
};

TimelinePicker.prototype.getFrameCropImg = async function(frame, crop) {
    let data = undefined
    if (frame>=0) {
        data = await videoControl.videoCache.getFrameCropDataURL(videoControl.video.src, frame, getVideoInfo().videofps, crop)
        //console.log(videoControl.video.src, frame)
        //console.log(crop)
        //console.log(data)
    }

    let img = $('<img/>')[0]
    if (data)
        img.src = data
    return img
}
TimelinePicker.prototype.getFrameCropCurrentObject = async function(framedelta, size, displaySize) {
    let rect = this.overlay.getActiveRect()
    if (!rect) {
        printMessage("Timeline: please select an annotation")
        return
    }
    let obs = rect.obs
    if (!obs) {
        printMessage("Timeline: annotation missing obs internal data. Try changing frame")
        return
    }
    if (!size) {
        size = obs.width>obs.height ? obs.width : obs.height
        size *= 4
    }
    if (!displaySize) {
        displaySize = 300
    }
    let w = size
    let h = size

    let cx = obs.x + obs.width/2
    let cy = obs.y + obs.height/2
    let crop = {x: Math.round(cx-w/2), y: Math.round(cy-h/2), w: w, h: h}
    let frame = Number(obs.frame)+Number(framedelta)
    let data = undefined
    if (frame>=0) {
        data = await videoControl.videoCache.getFrameCropDataURL(videoControl.video.src, frame, 20, crop)
        //console.log(videoControl.video.src, frame)
        //console.log(crop)
        //console.log(data)
    }

    let div = $('<div style="display: inline-block"><small>Frame '+frame+'</small><br></div>')
    let img = $('<img/>')[0]
    if (data)
        img.src = data
    div.append(img)
    $('#alerttext').append(div)
    img.width = displaySize
    img.height = displaySize
}
TimelinePicker.prototype.drawTimelineCurrentObject = async function() {
    let frames =  [-16,-8,-4,-2,-1,0,1,2,4,8,16]
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    await videoControl.videoCache.preloadFrames(videoControl.video.src, frames, getVideoInfo().videofps)
        .then(function() {
            printMessage("Preload done")
            overlay.hardRefresh()
        })
    console.log('Creating timeline...')
    printMessage("Timeline:<br>")
    for (const i of frames) {
        //console.log(i); 
        await this.getFrameCropCurrentObject(i, undefined, 200)
    }
}
TimelinePicker.prototype.drawTimelinePickFrameMode = async function(size, displaySize) {
    let overlay = this.overlay
    let centerframe = videoControl.currentFrame
    
    function intervalRange(start, end) {
        return Array.from({length: end-start+1}, (x, i) => start+i);
    }
    let deltas =  intervalRange(-overlay.opts.timelineMaxDelta, overlay.opts.timelineMaxDelta)  //[-3,-2,-1,0,1,2,3,4]
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    console.log('Creating timeline...')

    if (overlay.interaction.mode != 'pick-frame') {
        console.log('Not picking frame... ABORT')
        return
    }

    let id = overlay.interaction.opts.id
    let frame0 = overlay.interaction.opts.frame
    let obs=getObsHandle(frame0,id) 
    if (!obs) {
        printMessage("Timeline: didn't find annotation to pick frame for")
        return
    }
    if (!size) {
        size = obs.width>obs.height ? obs.width : obs.height
        size *= overlay.opts.timelineZoom
        size = Math.round(size)
    }
    if (!displaySize) {
        displaySize = overlay.opts.timelineDisplaySize
    }
    let w = size
    let h = size
    let cx = obs.x + obs.width/2
    let cy = obs.y + obs.height/2
    let crop = {x: Math.round(cx-w/2), y: Math.round(cy-h/2), w: w, h: h}
    
    $('#pick-frame-timeline').html("Timeline:<br>")
    for (var delta of deltas) {
        //console.log(i); 
        let frame = Number(centerframe)+Number(delta)
        let img = await this.getFrameCropImg(frame, crop)
        img.width = displaySize
        img.height = displaySize
        if (img) {
            let extra=''
            let pref=''
            let div = $('<div style="display: inline-block"></div>')
            div.addClass('timeline')
            $('#pick-frame-timeline').append(div)
            if (frame == frame0) {
                div.addClass('selected')
                extra+=' Event'
            }
            if (frame == obs.span.f1) {
                div.addClass('selected-f1')
                extra+=' Start'
            }
            if (frame == obs.span.f2) {
                div.addClass('selected-f2')
                extra+=' End'
            }
            if (frame == centerframe) {
                pref+='Current '
            }
            div.click(()=>gotoEvent(frame, id))
            div.html('<small>'+pref+'Frame '+frame+extra+'</small><br>')
            div.append(img)
        }
    }
}

TimelinePicker.prototype.drawImagePickFlowerMode = async function(size, displaySize) {
    let overlay = this.overlay
    
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    console.log('Creating pick flower image ...')

    if (overlay.interaction.mode != 'pick-frame') {
        console.log('Not picking frame... ABORT')
        return
    }

    let id = overlay.interaction.opts.id
    let frame0 = overlay.interaction.opts.frame
    let obs=getObsHandle(frame0,id) 
    let currentObs = obs
    if (!obs) {
        printMessage("Timeline: didn't find annotation to pick flower for")
        return
    }
    // The `visit` of the observation is the unit written here, always stored whole with events.update (nothing is
    // written by just opening the tool)
    function visitedFlower() {
        return currentObs.visit ? currentObs.visit.flowerid : undefined
    }
    function storeVisitedFlower(flowerid) {
        events.update(frame0, id, {visit: Object.assign({}, currentObs.visit, {flowerid: flowerid})})
    }
    if (!size) {
        size = obs.width>obs.height ? obs.width : obs.height
        size *= overlay.opts.timelineZoom
        size = Math.round(size)
    }
    if (!displaySize) {
        displaySize = overlay.opts.timelineDisplaySize
    }
    let w = size
    let h = size
    let cx = obs.x + obs.width/2
    let cy = obs.y + obs.height/2
    let crop = {x: Math.round(cx-w/2), y: Math.round(cy-h/2), w: w, h: h}
    
    //$('#pickflowerdiv').html("Pick Flower for id="+id+" in frame="+frame0+"<br>")

    let frame = frame0
    let img = await this.getFrameCropImg(frame, crop)
    //img.width = displaySize
    //img.height = displaySize
    if (img) {
        let canvas = document.createElement('canvas'); // Precreated canvas
        let ctx = canvas.getContext('2d');
        canvas.width = w; canvas.height = h // pixel size
        $(canvas).css({width: displaySize, height: displaySize}) // Display size
        ctx.drawImage(img, 0, 0)

        let div = $('<div style="display: inline-block"></div>')
        //div.addClass('timeline')
        $('#pickflowerdiv').append(div)
        let text = $("<small>Pick Flower for id="+id+" in frame="+frame+"<br>")
            .append($('<button class="btn btn-default btn-xs" style="inline">No visit</button>').click(removeVisit))
        div.append(text)//html("<small>Pick Flower for id="+id+" in frame="+frame+"<br>")
        //div.append(img)
        div.append(canvas)

        function isFlower(obs) {
            return String(obs.ID).startsWith('F')
        }
        let flowers = Object.values(events.getFrame(0)).filter(isFlower)

        function drawCenter(obs, selected) {
            let x0 = crop.x
            let y0 = crop.y

            let x = obs.x+obs.width/2 - x0 // cx not reliable??
            let y = obs.y+obs.height/2 - y0

            let color = 'yellow'
            let radius = 2

            if (obs.ID == visitedFlower()) {
                color = 'green'
            }
            if (selected) {
                color = 'green'
                radius = 4
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.closePath();
            ctx.fill();    

            ctx.font = "7px Arial";
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(String(obs.ID), x, y - radius - 1);
        }
        function closestFlower(flowers, pt, maxdist) {
            function euclid(pt1,pt2) {
                return Math.sqrt((pt1.x-pt2.x)**2+(pt1.y-pt2.y)**2)
            }
            let dist = maxdist
            let pickedObs = undefined
            for (let obs of flowers) {
                let ptf = {x:obs.x+obs.width/2, y: obs.y+obs.height/2}
                let d = euclid(pt,ptf)
                //console.log('d=',d,'pickedObs',pickedObs)
                if (d<dist) {
                    dist=d; pickedObs = obs
                }
            }
            return pickedObs
        }
        function drawFlowers(flowers, selectedID) {
            ctx.drawImage(img, 0, 0)
            for (let obs of flowers) {
                //console.log('Draw',obs)
                let selected = (obs.ID==selectedID)
                drawCenter(obs, selected)
            }
        }
        function canvasPtToVideoPt(ptGUI) {
            let pt = {x: ptGUI.x/displaySize*w+crop.x, y: ptGUI.y/displaySize*h+crop.y}
            return pt
        }
        function pickFlower_mouseMove(option) {
            console.log(option)
            let ptGUI = {x: option.offsetX, y: option.offsetY}
            let pt = canvasPtToVideoPt( ptGUI )
            console.log(ptGUI, pt)

            let pickedObs = closestFlower(flowers, pt, 200)
            drawFlowers(flowers, pickedObs?pickedObs.ID:undefined)

            // ctx.beginPath();
            // ctx.arc(pt.x-crop.x, pt.y-crop.y, radius, 0, Math.PI * 2);
            // ctx.fillStyle = 'red';
            // ctx.closePath();
            // ctx.fill();    

        }
        function pickFlower_mouseClick(option) {
            console.log(option)
            let ptGUI = {x: option.offsetX, y: option.offsetY}
            let pt = canvasPtToVideoPt( ptGUI )

            let pickedObs = closestFlower(flowers, pt, 200)

            if (pickedObs) {
                console.log('Change visited flower for ',currentObs, 'to flower', pickedObs)
                storeVisitedFlower(pickedObs.ID)
            }
            drawFlowers(flowers, visitedFlower())
            drawFlowersMainCanvas(flowers, visitedFlower())
        }
        function pickFlower_mouseLeave(option) {
            drawFlowers(flowers, visitedFlower())
        }
        function removeVisit() {
            storeVisitedFlower(undefined)
            drawFlowers(flowers, visitedFlower())
        }
        function drawFlowersMainCanvas(flowers, selectedID) {
            //overlay.ctx.drawImage(img, 0, 0)
            let ctx = overlay.ctx
            for (let obs of flowers) {
                //console.log('Draw',obs)
                let isSelected = (obs.ID==selectedID)
                //drawCenter(obs, selected)
                let rect = overlay.obsToCanvasRect(obs)
                let x = rect.left+rect.width/2
                let y = rect.top+rect.height/2
                identifyBeeRect(ctx, rect, radius, isSelected)
            }
        }

        $(canvas).click(pickFlower_mouseClick)
        $(canvas).mousemove(pickFlower_mouseMove)
        $(canvas).mouseleave(pickFlower_mouseLeave)
        drawFlowers(flowers, visitedFlower())
    }
}
