/*jshint esversion: 6, asi: true */

// ## Video + canvas

function OverlayControl(canvasTagId) {
    if (this === window) { 
        console.log('ERROR: OverlayControl should be created with "new OverlayControl()". Fixing that for you.')
        return new OverlayControl(); 
    }
    
    var overlay = this; // Standard name for simpler search in code
    
    // Events:
    // overlayControl.on('trackWindow:change',...)
    $( videoControl ).on('videosize:changed', (e,w,h)=>{overlay.canvasSetVideoSize(w,h)})
    //$( videoControl ).on('frame:changed', (e)=>{overlay.hardRefresh()})
    //$( videoControl ).on('previewframe:changed', (e)=>{overlay.hardRefresh()})

    if (typeof canvasTagId === 'undefined')
        canvasTagId = 'canvas'; // Default HTML5 canvas tag to attach to
    overlay.canvas = document.getElementById(canvasTagId);
    overlay.ctx = overlay.canvas.getContext('2d');

    overlay.canvas2 = $('<canvas/>')[0]
    overlay.ctx2 = overlay.canvas2.getContext('2d');

    overlay.trackWindow = {
        range: 200,
        direction: 'Bidirectional',
        forward: 200,
        backward: 200
    }
    /* Obs and Tags plotting params */
    $('#trackWindow').val(overlay.trackWindow.range)
    $('#selectboxTrackDir').val(overlay.trackWindow.direction)

    overlay.guiAngle = {
        angleEnabled: true
    }

    flag_useROI=false
    ROI = {left:175,top:30,right:2305,bottom:1240} // For Gurabo videos 5MP
    $('#ROI').val([ROI.left,ROI.top,ROI.right,ROI.bottom].join(','))
    //$(videoControl).on('video:loaded', updateROIFromVideo)
    $('#useROI').toggleClass('active', flag_useROI);

    flag_useExcludeRects=false
    excludeRects = [{"cx":335,"cy":75,"w":50,"h":50},{"cx":2165,"cy":80,"w":50,"h":50},{"cx":320,"cy":1034,"w":50,"h":50},{"cx":2130,"cy":1080,"w":50,"h":50}]
    initExcludeRectsDialog()
    $('#useExcludeRects').toggleClass('active', flag_useExcludeRects);
    excludeRectSelection=-1

    showObs = true
    showObsTracks = true
    showObsChrono = true
    showTags = true;
    showTagsTracks = true
    showSelectedTagsTracks = true
    showTagsOrientation = false
    showTagsChrono = true
    $('#showObs').prop('checked',showObs)
    $('#showObsTracks').prop('checked',showObsTracks)
    $('#showTags').prop('checked',showTags)
    $('#showTagsTracks').prop('checked',showTagsTracks)
    $('#showSelectedTagsTracks').prop('checked',showTagsTracks)
    $('#showTagsOrientation').prop('checked',showTagsOrientation)
    $('#showTagsChrono').prop('checked',showTagsChrono)
    $('#showObsChrono').prop('checked',showObsChrono)

    overlay.opts = {
        showRect: true,
        showID: true,
        showLabels: true,
        labelFormatter: function(obs) {return activityString(obs)},
        showNotes: true,
        showSpan: false,
        resizeAroundCenter: false,
        ID_dotRadius: 4, // Radius of dot center
        ID_fontSize: 20,
        ID_color: 'yellow',
        clickModeSelectMultiframe: false,
        clickModeNewAnnotation: false,
        predictIdClickRadius: 120,
        showImageDiff: false,
        showPredictedStatus : false,
        timelineZoom : 4.0,
        timelineMaxDelta : 3,
        timelineDisplaySize : 300,
    }
    overlay.updateOptsButtons()

    overlay.interaction = {
        mode: 'main', // 'pick-frame'
        opts: {}
    }
    
    overlay.tagMarkerOptions = ['quad','cross','circle']
    overlay.selectboxTagMarkerInit()
    overlay.tagMarker = 'quad'
    overlay.selectboxTagMarkerUpdate()

    /* Overlay and selection */

    let canvas1 = new fabric.Canvas('canvas1');
    
    overlay.canvas1 = canvas1;

    canvas1.selectionColor = "red";
    canvas1.selectionBorderColor = "red";
    canvas1.selection = false; // REMI: disable the blue selection (allow to select several rectangles at once, which poses problem)
    canvas1.uniScaleTransform = true; // REMI: allow free rescaling of observations without constrained aspect ratio
    //canvas1.centeredScaling = true; // REMI: rescale around center
    
    overlay.lastSelected = null; // Last selected rect (workaround for event selection:cleared not providing the last selection to onObjectDeselected)
    
    canvas1.on('mouse:down', onMouseDown);
    canvas1.on('mouse:up', onMouseUp);
    canvas1.on('object:moving', onObjectMoving); // During translation
    canvas1.on('object:scaling', onObjectMoving); // During scaling
    canvas1.on('object:rotating', onObjectMoving); // During rotation
    canvas1.on('object:modified', onObjectModified); // After modification
    canvas1.on('object:selected', onObjectSelected); // After mousedown
    canvas1.on('selection:cleared', onObjectDeselected); // After mousedown out of existing rectangles
    //canvas1.on('mouse:dblclick', onMouseDblClick);

    //$('#video').on('mouseDown', onMouseDown);    
    $('.upper-canvas').bind('contextmenu', onMouseDown2);
    $('.upper-canvas').bind('wheel', onMouseWheel);

    /* Canvas transform */

    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#canvasresize").on( "resizestop", overlay.refreshCanvasSize.bind(overlay) );
    //$("#canvasresize").on( "resize", refreshCanvasSize ); // Continuous (not working)
    
    transformFactor = 1.0;
    canvasTransform = [1,0, 0,1, 0,0]  // Global
    canvasTransformReference = {w:100, h:100} // Keep previous canvas size
    overlay.videoSize = {x:600,y:400}
    
    lockFocusTrackWindow = false
    
    refreshTagsParameters()
    overlay.updateDisableAngleButton()
}
OverlayControl.prototype = {}



OverlayControl.prototype.setInteractionMode = function(mode, opts) {
    console.log('overlay.setInteractionMode', mode, opts)
    
    if (mode=='main') {
        this.interaction.mode = 'main'
        this.interaction.opts = opts
    } else if (mode=='pick-frame') {
        // For the moment, does not check opts.type, since we have only setspan

        let activeObj = this.getActiveObject()
        if (!activeObj) {
            console.log('overlay.setInteractionMode: CANCELED, no active object')
            return;
        }
        let obs = activeObj.obs
        if (!obs) {
            console.log('overlay.setInteractionMode: CANCELED, no obs')
            return;
        }
        let frame = videoControl.getCurrentFrame()

        this.interaction.mode = 'pick-frame'
        this.interaction.opts = opts
        this.interaction.opts.obs = obs
        this.interaction.opts.id = obs.ID
        this.interaction.opts.frame = frame
        this.interaction.opts.showTimeline = false // Hide timeline by default
    } else {
        console.log('overlay.setInteractionMode')
    }
    this.refreshInteraction()
    this.hardRefresh()
}
OverlayControl.prototype.refreshInteraction = function() {
    console.log('overlay.refreshInteration',this.interaction)
    let mode = this.interaction.mode
    let opts = this.interaction.opts
    
    $('.setspan').removeClass("active")

    if (mode=='pick-frame') {
        if (opts.type=='setspan') {
            $('.setspan').addClass("active")
        }
    }
}

OverlayControl.prototype.optsClick = function(option) {
    console.log('overlay.onClickDisableAngle')
    
    this.opts[option] = !this.opts[option]
    this.updateOptsButtons()
    
    //this.refreshOverlay()
    this.hardRefresh()
}
OverlayControl.prototype.updateOptsButtons = function() {
    console.log('overlay.updateDisableAngleButton')
    for (option of ['showRect','showID','showLabels','showNotes','showSpan','resizeAroundCenter','clickModeSelectMultiframe','clickModeNewAnnotation','showImageDiff','showPredictedStatus']) {
        console.log(option)
        if ( this.opts[option] ) {
            $(".overlayOpts-"+option).addClass("active")
        } else {
            $(".overlayOpts-"+option).removeClass("active")      
        }
    }
    $('#overlayOpts-ID_dotRadius').val(String(this.opts.ID_dotRadius))
    $('#overlayOpts-ID_fontSize').val(String(this.opts.ID_fontSize))
    $('#overlayOpts-ID_color').val(String(this.opts.ID_color))
}
function onOverlayParamsChanged(event) {
    console.log('onOverlayParamsChanged')
    overlay.opts.ID_dotRadius = Number($('#overlayOpts-ID_dotRadius').val())
    overlay.opts.ID_fontSize = Number($('#overlayOpts-ID_fontSize').val())
    overlay.opts.ID_color = $('#overlayOpts-ID_color').val()
    overlay.refreshOverlay()
}

function selectboxSetOptions(selectbox, options, names) {
    selectbox.find('option').remove()
    $.each(options, function (i, el) {
        let name
        if (name == null) {
            name = el
        } else {
            name = names[i]
        }
        selectbox.append("<option value='"+el+"'>"+name+"</option>");
    });
}

OverlayControl.prototype.selectboxTagMarkerInit = function() {
    var selectbox = $("#selectboxTagMarker")
    
    selectboxSetOptions(selectbox, this.tagMarkerOptions);
}
OverlayControl.prototype.selectboxTagMarkerUpdate = function(value) {
    var selectbox = $("#selectboxTagMarker")
    
    if (value != null) {
        this.tagMarker = value
    }
    
    selectbox.val(this.tagMarker)
}
OverlayControl.prototype.selectboxTagMarkerChanged = function() {
    this.tagMarker = $('#selectboxTagMarker').val()
    this.hardRefresh()
}


OverlayControl.prototype.getActiveObject = function() {
    return this.canvas1.getActiveObject()
}
OverlayControl.prototype.setActiveObject = function(rect) {
    return this.canvas1.setActiveObject(rect)
}


// GUI for enabling/disabling angle in BB
OverlayControl.prototype.onClickDisableAngle = function() {
    console.log('overlay.onClickDisableAngle')
    
    this.guiAngle.angleEnabled = !this.guiAngle.angleEnabled
    this.updateDisableAngleButton()
    
    this.refreshOverlay()
}
OverlayControl.prototype.updateDisableAngleButton = function() {
    console.log('overlay.updateDisableAngleButton')
    if ( !this.guiAngle.angleEnabled ) {
        $(".guiAngle-disableAngle").addClass("active")
    } else {
        $(".guiAngle-disableAngle").removeClass("active")      
    }
}
OverlayControl.prototype.onClickResetAngle = function() {
    console.log('overlay.onClickResetAngle')
    
    var activeObject = overlay.getActiveObject()
    if (activeObject == null) {
        console.log('onClickResetAngle: aborted, could not get an activeObject')
        return
    }
    const obs = activeObject.obs
    
    obs.angle = 0

    submit_bee()
}
OverlayControl.prototype.onClickAngleFromTag = function() {
    console.log('overlay.onClickAngleFromTag')
    
    var activeObject = overlay.getActiveObject()
    if (activeObject == null) {
        console.log('onClickAngleFromTag: could not get an activeObject. abort.')
        return
    }
    const obs = activeObject.obs
    
    const tag = getCurrentTag()
    if (tag==null) {
        console.log('onClickAngleFromTag: tag not defined for current event. abort.')
        return;
    }
        
    obs.angle = tagAngle(tag)
    
    submit_bee()

//    this.refreshOverlay()
}
    
// #MARK # UTILS CANVAS SIZE

OverlayControl.prototype.canvasSetVideoSize = function(w,h) {
    // Resize canvas to have same aspect-ratio as video
    let overlay = this

    overlay.videoSize.w=w;
    overlay.videoSize.h=h;

    var wd=w,hd=h
    if (true) {
      // Keep same canvas width as before, simply adjust aspect-ratio
      wd = overlay.canvas.width
      hd = Math.round(h*overlay.canvas.width/w)
    } else {
        // Automatic scaling to be smaller than 800pix
        while (wd>800) {
            wd/=2.0
            hd/=2.0
        }
    }

    var borderThickness = 2

    $("#canvasresize")[0].style.width = (wd+16+borderThickness).toString() + 'px'
    $("#canvasresize")[0].style.height = (hd+borderThickness).toString() + 'px'
    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: w / h
    });

    overlay.refreshCanvasSize()
    overlay.canvasTransformReset()
}
OverlayControl.prototype.refreshCanvasSize = function(event, ui) {
    let overlay = this

    // Refresh based on new video size or new canvas size
    if (logging.canvasEvents) {
        console.log('refreshCanvasSize: event=',event)
        console.log('refreshCanvasSize: event.target.clientWidth=',event.target.clientWidth)
    }
        
    // Internal canvas size adjusting utility
    // Ensures all canvas elements have same size
    function resizeCanvas(wd,hd) {    
        if (logging.canvasEvents)
            console.log('refreshCanvasSize.resizeCanvas: wd=',wd," hd=",hd)
    
        overlay.canvas.width = wd
        overlay.canvas.height = hd
        overlay.canvas1.setWidth(wd)
        overlay.canvas1.setHeight(hd)
    
        $("#video").width(wd)
        $("#video").height(hd)
    
        var wrap = $('.canvaswrapper')[0]
        wrap.style.width = wd.toString() + 'px'
        wrap.style.height = hd.toString() + 'px'
        
        var borderThickness = 2
        $("#canvasresize")[0].style.width = (wd+16+borderThickness).toString() + 'px'
        $("#canvasresize")[0].style.height = (hd+borderThickness).toString() + 'px'

    }
        
    // TODO: remove jQuery reference
    let video = $('#video')[0]
    
    var borderThickness = 4
    
    // Assume width is in px to parse #canvasresize size
    let hd = Math.round(parseInt($("#canvasresize")[0].style.height)-borderThickness)
    let wd = Math.round(hd/overlay.videoSize.h*overlay.videoSize.w)
        
    resizeCanvas(wd,hd)
    
    $("#videoSize")[0].innerHTML = 'videoSize: '+overlay.videoSize.w.toString() + 'x' + overlay.videoSize.h.toString();
    $("#canvasSize")[0].innerHTML = 'canvasSize: '+wd.toString() + 'x' + hd.toString();


    // Change transform to keep same image content, just scaled    
    var scaling = canvasTransformReference.w/overlay.canvas.width
    var center = [canvasTransformReference.w/2, canvasTransformReference.h/2] 
    var center2 = [overlay.canvas.width/2, overlay.canvas.height/2]
    canvasTransformReference.w = overlay.canvas.width
    canvasTransformReference.h = overlay.canvas.height
    
    overlay.canvasTransformScale(scaling, center, center2)
    
    // Don't use ctx.transform, as it also reduces the drawings overlays
    // Instead, we scale everything manually
    //var ctx=canvas.getContext("2d");
    //ctx.transform(...canvasTransform);
        
    //overlay.hardRefresh() // Already done in canvasTransformScale()
}

/* Canvas Transform */
OverlayControl.prototype.canvasTransformInternalReset = function() {
    let overlay = this
    
    let video = $('#video')[0]
    transformFactor = overlay.videoSize.w / overlay.canvas.width;
    
    let array = [transformFactor,0, 0,transformFactor, 0,0]
    if (isNaN(transformFactor)) {
        array = [1, 0, 0, 1, 0, 0]
    }
    for (let i=0; i<6; i++) {
        canvasTransform[i]=array[i]
    }
    
    canvasTransformReference.w = overlay.canvas.width
    canvasTransformReference.h = overlay.canvas.height
}
OverlayControl.prototype.canvasTransformReset = function() {
    let overlay = this
    
    overlay.canvasTransformInternalReset()
    overlay.canvasTransform_Fix()    
    overlay.hardRefresh()
}
OverlayControl.prototype.canvasTransformSet = function(array) {
    let overlay = this
    
    for (let i=0; i<6; i++) {
        canvasTransform[i]=array[i]
    }
    overlay.canvasTransform_Fix()
    overlay.hardRefresh()
}
OverlayControl.prototype.canvasTransform_Fix = function() {
    let overlay = this
    
    //let video = $('#video')[0]
    let w1 = overlay.canvas.width
    let h1 = overlay.canvas.height
    let w2 = overlay.videoSize.w
    let h2 = overlay.videoSize.h
    
    if (canvasTransform[0]*w1>w2 && canvasTransform[3]*h1>h2) {
        let scaling = Math.max(w2/w1,h2/h1)
        canvasTransform[0]=scaling;
        canvasTransform[3]=scaling;
    }    
    //console.log(w1,h1,w2,h2)
    
    if (canvasTransform[4]<0) canvasTransform[4]=0
    if (canvasTransform[5]<0) canvasTransform[5]=0
    if (canvasTransform[4]+canvasTransform[0]*w1>w2)
        canvasTransform[4]=w2-canvasTransform[0]*w1
    if (canvasTransform[5]+canvasTransform[3]*h1>h2)
        canvasTransform[5]=h2-canvasTransform[3]*h1
        
    // Check degenerate
    var hasNan = false;
    for (let i=0; i<6; i++) hasNan |= isNaN(canvasTransform[i]);
    if (hasNan || canvasTransform[0]<=0 || canvasTransform[3]<=0) {
        console.log('ERROR in canvasTransform_Fix: degenerate canvasTransform. Reinit')
        overlay.canvasTransformInternalReset()
    }
}
OverlayControl.prototype.canvasTransformScale = function(scaling, center, center2) {
    // center is scaling center in current canvas coordinates
    // center2 (optional) is scaling center in new canvas coordinates
    /*
    if (canvasTransform[0]*scaling > transformFactor) 
        scaling = transformFactor/canvasTransform[0] 
        // Can not zoom out more than initial
    */
    
    //center[1]+=2
    //center[0]+=2
    let overlay = this
    
    if (typeof center2 === 'undefined')
        center2 = center;
        
    //console.log('canvasTransformScale: center=',center)
    canvasTransform[4]+=canvasTransform[0]*(center[0]-scaling*center2[0])
    canvasTransform[5]+=canvasTransform[3]*(center[1]-scaling*center2[1])
    canvasTransform[0]=canvasTransform[0]*scaling
    canvasTransform[3]=canvasTransform[3]*scaling
    
    overlay.canvasTransform_Fix()
    
    overlay.hardRefresh()
}
OverlayControl.prototype.canvasTransformPan = function(dx, dy) {
    let overlay = this
    
    canvasTransform[4] -= dx * canvasTransform[0]
    canvasTransform[5] -= dy * canvasTransform[3]
    
    overlay.canvasTransform_Fix()
    
    overlay.hardRefresh()
}

OverlayControl.prototype.obsToCanvasRect = function(obs) {
    let overlay = this
    
    let R = {left:obs.x, top:obs.y, width:obs.width, height: obs.height}
    let R2 = overlay.videoToCanvasRect(R)
    return R2
}
OverlayControl.prototype.canvasToVideoPoint = function(pt) {
    let overlay = this
    
    return {
      x: canvasTransform[0]*pt.x+canvasTransform[4],
      y: canvasTransform[3]*pt.y+canvasTransform[5]
      }
}
OverlayControl.prototype.videoToCanvasPoint = function(pt) {
    let overlay = this
    
    return {
      x: (pt.x-canvasTransform[4])/canvasTransform[0],
      y: (pt.y-canvasTransform[5])/canvasTransform[3]
      }
}
OverlayControl.prototype.canvasToVideoRect = function(rect) {
    let overlay = this
    
    return {
      left: canvasTransform[0]*rect.left+canvasTransform[4],
      top: canvasTransform[3]*rect.top+canvasTransform[5],
      width: canvasTransform[0]*rect.width,
      height: canvasTransform[3]*rect.height,      
      }
}
OverlayControl.prototype.videoToCanvasRect = function(rect) {
    let overlay = this
    
    return {
      left: (rect.left-canvasTransform[4])/canvasTransform[0],
      top: (rect.top-canvasTransform[5])/canvasTransform[3],
      width: rect.width/canvasTransform[0],
      height: rect.height/canvasTransform[3]   
      }
}

// #MARK # OVERLAY REFRESH
OverlayControl.prototype.getFrameCropImg = async function(frame, crop) {
    let data = undefined
    if (frame>=0) {
        data = await videoCache.getFrameCropDataURL(videoControl.video.src, frame, videoinfo.videofps, crop)
        //console.log(videoControl.video.src, frame)
        //console.log(crop)
        //console.log(data)
    }

    let img = $('<img/>')[0]
    if (data)
        img.src = data
    return img
}
OverlayControl.prototype.getFrameCropCurrentObject = async function(framedelta, size, displaySize) {
    let rect = this.getActiveObject()
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
OverlayControl.prototype.drawTimelineCurrentObject = async function() {
    let frames =  [-16,-8,-4,-2,-1,0,1,2,4,8,16]
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    await videoControl.videoCache.preloadFrames(videoControl.video.src, frames, videoinfo.videofps)
        .then(function() {
            printMessage("Preload done")
            overlay.hardRefresh()
        })
    console.log('Creating timeline...')
    printMessage("Timeline:<br>")
    for (i of frames) {
        //console.log(i); 
        await this.getFrameCropCurrentObject(i, undefined, 200)
    }
}
OverlayControl.prototype.drawTimelinePickFrameMode = async function(size, displaySize) {
    let overlay = this
    let centerframe = videoControl.currentFrame
    
    function intervalRange(start, end) {
        return Array.from({length: end-start+1}, (x, i) => start+i);
    }
    let deltas =  intervalRange(-overlay.opts.timelineMaxDelta, overlay.opts.timelineMaxDelta)  //[-3,-2,-1,0,1,2,3,4]
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    console.log('Creating timeline...')

    if (this.interaction.mode != 'pick-frame') {
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
OverlayControl.prototype.drawImagePickFlowerMode = async function(size, displaySize) {
    let overlay = this
    
    videoControl.pause()
    printMessage("Paused, need to preload video frames")
    console.log('Creating pick flower image ...')

    if (this.interaction.mode != 'pick-frame') {
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
    if (!currentObs.visit) currentObs.visit={}
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
        let flowers = Object.values(Tracks[0]).filter(isFlower)

        function drawCenter(obs, selected) {
            let x0 = crop.x
            let y0 = crop.y

            let x = obs.x+obs.width/2 - x0 // cx not reliable??
            let y = obs.y+obs.height/2 - y0

            let color = 'yellow'
            let radius = 2

            if (obs.ID == currentObs.visit.flowerid) {
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
                if (!currentObs.visit) currentObs.visit={}
                currentObs.visit.flowerid = pickedObs.ID
            }
            drawFlowers(flowers, currentObs.visit.flowerid)
            drawFlowersMainCanvas(flowers, currentObs.visit.flowerid)
        }
        function pickFlower_mouseLeave(option) {
            drawFlowers(flowers, currentObs.visit.flowerid)
        }
        function removeVisit() {
            currentObs.visit.flowerid = undefined
            drawFlowers(flowers, currentObs.visit.flowerid)
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
        drawFlowers(flowers, currentObs.visit.flowerid)
    }
}
OverlayControl.prototype.hardRefresh = function() {
    // Recreate overlay from Tracks

    // Refresh the overlay
    //this.canvasSetVideoSize()
    
    this.redrawVideoFrame()
    
    overlay.canvas1.clear();
    createRectsFromTracks()

    if (this.interaction.mode == 'pick-frame') {
        let overlay = this
        selectBeeByID(this.interaction.opts.id)
        let id = overlay.interaction.opts.id
        let frame = overlay.interaction.opts.frame
    
        // Poke directly in the main datastructure as the active object
        // does not copy this field. // TODO: cleanme
        let obs=getObsHandle(frame,id) //Tracks[frame][id]
        if (!obs) {
            console.log('overlay.hardRefresh: ERROR, in pick-frame without valid obs')
            overlay.setInteractionMode('main')
            selectBeeByID(defaultSelectedBee);
            this.refreshOverlay()
    
            updateDeleteButton()
            updateUndoButton()
            return
        }
        if (! ('span' in obs)) {
            obs.span = {'f1':frame, 'f2':frame}
        }

        function doSwap2(interval, old_id, new_id) {
            obs_swapID(interval, old_id, new_id)
            videoControl.refresh() // Just refresh
            refreshChronogram();
        }
        function doSetSpanStart() {
            let f = videoControl.getCurrentFrame()
            obs.span.f1 = f
            //$('#alerttext').html('Set Start DONE')
            //overlay.setInteractionMode('main')
            overlay.hardRefresh()
            refreshChronogram();
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
            obs.span.f2 = f
            //$('#alerttext').html('Set Start DONE')
            //overlay.setInteractionMode('main')
            overlay.hardRefresh()
            refreshChronogram();
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
                if (overlay.opts.timelineDisplaySize>1000) overlay.opts.timelineDisplaySize=1000
                if (overlay.opts.timelineDisplaySize<50) overlay.opts.timelineDisplaySize=50
            } else if (param == 'timelineMaxDelta') {
                overlay.opts.timelineMaxDelta = Math.round(overlay.opts.timelineMaxDelta + value)
                if (overlay.opts.timelineMaxDelta>10) overlay.opts.timelineMaxDelta=10
                if (overlay.opts.timelineMaxDelta<1) overlay.opts.timelineMaxDelta=1
            }
                
            if (overlay.interaction.opts.showTimeline) {
                overlay.drawTimelinePickFrameMode()
            }
        }

        //printMessage(
        $('#pickframediv').html("PICK FRAME: setting timespan for ID="+id+" at frame="+frame+": ")
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
                function() {
                    overlay.interaction.opts.showTimeline = !overlay.interaction.opts.showTimeline
                    $('.button-showtimeline').toggleClass('active', overlay.interaction.opts.showTimeline)
                    if (overlay.interaction.opts.showTimeline) {
                        overlay.drawTimelinePickFrameMode() // Create timeline
                    } else {
                        $('#pick-frame-timeline').html('') // Destroy timeline
                    }
                }
                ))
                .append($('<button class="btn btn-xs">Zoom+</button>').click( ()=>timelineButtonCallback('timelineZoom', 1/1.5) ))
                .append($('<button class="btn btn-xs">Zoom-</button>').click(  ()=>timelineButtonCallback('timelineZoom', 1.5)  ))
                .append($('<button class="btn btn-xs">Size+</button>').click( ()=>timelineButtonCallback('timelineDisplaySize', 1.5) ))
                .append($('<button class="btn btn-xs">Size-</button>').click(  ()=>timelineButtonCallback('timelineDisplaySize', 1/1.5)  ))
                .append($('<button class="btn btn-xs">Frames+</button>').click( ()=>timelineButtonCallback('timelineMaxDelta', 1) ))
                .append($('<button class="btn btn-xs">Frames-</button>').click(  ()=>timelineButtonCallback('timelineMaxDelta', -1)  ))
                .append($('<button class="btn btn-xs button-showPickFlower btn-blue-toggle">Pick Flower</button>').click(  ()=>overlay.pickFlowerButtonCallback()  ))
        .append($('<div id="pick-frame-timeline"></div>'))
        $('.button-showtimeline').toggleClass('active', overlay.interaction.opts.showTimeline)

        if (overlay.interaction.opts.showTimeline)
            overlay.drawTimelinePickFrameMode()
    } else {
        // Default behavior
        selectBeeByID(defaultSelectedBee);
    }
    // zoomOverlay supposed to be updated by event triggered by selectBeeByID
    
    this.refreshOverlay()
    
    updateDeleteButton()
    updateUndoButton()
    
    //zoomOverlay.refreshZoom()
}
OverlayControl.prototype.pickFlowerButtonCallback = function(param, value) {
    let overlay = this
    overlay.interaction.opts.showPickFlower = !overlay.interaction.opts.showPickFlower
    $('.button-showPickFlower').toggleClass('active', overlay.interaction.opts.showPickFlower)
    if (overlay.interaction.opts.showPickFlower) {
        overlay.drawImagePickFlowerMode() // Create image to pick
    } else {
        $('#pickflowerdiv').html('') // Destroy display
    }
}


OverlayControl.prototype.openVideoNewTab = async function() {
    console.log('overlay.openVideoNewTab')
    let videoUrl = videoControl.video.src
    var newTab = window.open(videoUrl);
}
OverlayControl.prototype.exportFrame = async function() {
    console.log('overlay.exportFrame')
    let videoUrl = videoControl.video.src
    let frame = videoControl.currentFrame
    console.log('overlay.exportFrame: ', videoUrl, frame)
    let img = await videoCache.getFrameImageAsync(videoUrl, frame, videoinfo.videofps)
    var newTab = window.open();
    newTab.document.body.innerHTML = 'Extracted Frame '+frame+' from <a href="+videoUrl+">'+videoUrl+'</a><br><div><img src="'+img.src+'" style="max-width:100%; max-height:95%;"></div>';
    newTab.document.title = 'Frame '+frame+', video '+videoUrl
}
OverlayControl.prototype.diffImage = function(canvas2, canvas1, gain) {
    if (!gain) gain=1.0

    let w = canvas1.width, h = canvas1.height
    let ctx1 = canvas1.getContext('2d');
    let ctx2 = canvas2.getContext('2d');

    let imgData1 = ctx1.getImageData(0,0,w,h);
    let imgData2 = ctx2.getImageData(0,0,w,h);

    let data1 = imgData1.data
    let data2 = imgData2.data

    for (var offset = 0; offset < data1.length; offset += 4) {
        let dr = data1[offset] - data2[offset]
        let dg = data1[offset+1] - data2[offset+1]
        let db = data1[offset+2] - data2[offset+2]
        //let D = (Math.abs(dr)+Math.abs(dg)+Math.abs(db))/3.0*gain
        data1[offset] = data1[offset]*0.2 + 0.8*(dr*gain+128)
        data1[offset+1] = data1[offset+1]*0.2 + 0.8*(dg*gain+128)
        data1[offset+2] = data1[offset+2]*0.2 + 0.8*(db*gain+128)
    }

    ctx1.putImageData(imgData1, 0, 0);
    //console.log('diffImage DONE')
} 

OverlayControl.prototype.redrawVideoFrameDiff = function() {
    var overlay = this;
    
    let w = overlay.canvas.width
    let h = overlay.canvas.height
    
    let video = videoControl.video

    function interval(start, end) {
        return Array.from({length: end-start+1}, (x, i) => start+i);
    }

    overlay.canvas2.width = w
    overlay.canvas2.height = h
    let ctx2 = overlay.canvas2.getContext('2d');

    let videoUrl = video.src
    let frame=videoControl.currentFrame

    // Load async if frames not found
    let state1 = videoCache.getFrameState(videoUrl, frame)
    let state2 = videoCache.getFrameState(videoUrl, frame-1)
    if ((!state1) || ((frame-1>=0)&&!state2)) {
        // CAUTION: risk of infinite async loop if test always fail!
        //videoControl.videoCache.preloadFrames(videoUrl, interval(frame-20, frame+20), videoinfo.videofps)
        videoControl.videoCache.preloadFrames(videoUrl, interval(frame-1,frame), videoinfo.videofps)
        .then(function() {
            printMessage("Preload done")
            //overlay.hardRefresh()
        })
        //videoControl.pause() // pause after to avoid infinite loop?
        printMessage("Paused, need to preload video frames")
    }

    let img1 = videoControl.videoCache.getFrameImageSync(videoUrl, frame)
    let img2 = videoControl.videoCache.getFrameImageSync(videoUrl, frame-1)
    if (img1)
        overlay.ctx.drawImage(img1, 
            canvasTransform[4], canvasTransform[5],
            canvasTransform[0]*w, canvasTransform[3]*h,
            0, 0, w, h);
    if (img2)
        overlay.ctx2.drawImage(img2, 
            canvasTransform[4], canvasTransform[5],
            canvasTransform[0]*w, canvasTransform[3]*h,
            0, 0, w, h);
    
    overlay.diffImage(overlay.canvas2,overlay.canvas, 3.0)
}

OverlayControl.prototype.drawImageToCanvas = function(img) {
    let overlay = this
    let w = overlay.canvas.width
    let h = overlay.canvas.height
    function drawDataURIOnCanvas(strDataURI, canvas) {
        "use strict";
        let img = new window.Image();
        img.addEventListener("load", function () {
            overlay.ctx.drawImage(img, 
                canvasTransform[4], canvasTransform[5],
                canvasTransform[0]*w, canvasTransform[3]*h,
                0, 0,w,h);
        });
        img.setAttribute("src", strDataURI);
    }

    if($.type(img) === "string") {
        drawDataURIOnCanvas(img)
    } else
        overlay.ctx.drawImage(img, 
            canvasTransform[4], canvasTransform[5],
            canvasTransform[0]*w, canvasTransform[3]*h,
            0, 0, w, h);
}
OverlayControl.prototype.redrawVideoFrame = function() {
    var overlay = this;
    
    let w = overlay.canvas.width
    let h = overlay.canvas.height
    
    let video = videoControl.video

    if (!videoControl.isValidVideo) {
        if (logging.frameEvents)
            console.log('refresh canceled, no valid video')
        overlay.ctx.save()
        overlay.ctx.setTransform(1,0, 0,1, 0,0)
        overlay.ctx.fillStyle = '#DDD'
        overlay.ctx.fillRect(0, 0, w, h);
        overlay.canvas1.clear();
        overlay.ctx.fillStyle = '#00F'
        overlay.ctx.font = "12px Verdana";
        overlay.ctx.textAlign = "center";
        overlay.ctx.textBaseline = "middle"; 
        var lineHeight = overlay.ctx.measureText("M").width * 1.2;
        overlay.ctx.fillText("Could not load video", w/2, h/2);
        overlay.ctx.fillText(video.src, w/2, h/2+lineHeight);
        overlay.ctx.restore()
        
        overlay.canvas1.clear();
        return
    }

    if (videoControl.currentMode == 'video') {
        let video = videoControl.video; // same as $('#video')[0]
        if (videoControl.flagCopyVideoToCanvas) {
            if (overlay.opts.showImageDiff) {
                overlay.redrawVideoFrameDiff() // Caution: async
            } else {
                // Copy video to canvas for fully synchronous display
                overlay.ctx.drawImage(video, 
                            canvasTransform[4], canvasTransform[5],
                            canvasTransform[0]*w, canvasTransform[3]*h,
                            0, 0, w, h);
            }
        } else {
            // Rely on video under canvas. More efficient (one copy less), but
            // may have some time discrepency between video and overlay
            overlay.ctx.clearRect(0,0,video.videoWidth * extraScale / transformFactor, video.videoHeight * extraScale / transformFactor)
        }
    } else if (videoControl.currentMode == 'preview') {
        let video = videoControl.video; // same as $('#video')[0]
        let previewVideo = videoControl.previewVideo; // same as $('#video')[0]
        //overlay.canvas1.clear();
        let previewScaleX = video.videoWidth/previewVideo.videoWidth;
        let previewScaleY = video.videoHeight/previewVideo.videoHeight;
        overlay.ctx.drawImage(previewVideo, 
                        canvasTransform[4]/previewScaleX, canvasTransform[5]/previewScaleY,
                        canvasTransform[0]*w/previewScaleX, canvasTransform[3]*h/previewScaleY,
                        0, 0, w, h);
                    
//         overlay.canvas1.clear();
//         createRectsFromTracks(this.previewFrame)
//         selectBeeByID(defaultSelectedBee);
//         overlay.refreshOverlay()
    }
}
OverlayControl.prototype.refreshOverlay = function() {
    // Refresh overlay from already existing overlay data
    let overlay = this
    
    if (overlay.canvas1) {
        if (showTagsTracks || showSelectedTagsTracks)
            plotTagsTracks(overlay.ctx)
        if (showTags)
            plotTags(overlay.ctx)
            
        if (showObsTracks) {
            plotTracks(overlay.ctx);
        }
    
        if (showObs) {
            refreshRectFromObs()
            overlay.canvas1.renderAll(); // Clear and render all rectangles
        } else {
            overlay.canvas1.clear(); // Remove all rects
        }
        
        plotROI(overlay.ctx)
        plotExcludeRects(overlay.ctx)
    }
}

// #MARK # FABRICJS RECTS MANAGEMENT

function refreshRectFromObs() {
    let rectList = overlay.canvas1.getObjects()
    //if (logging.overlay)
    //    console.log("refreshRectFromObs: updating ",rectList.length," rect(s)")
    for (let rect of rectList) {
        if (typeof rect.obs !== 'undefined') {
            updateRectFromObsGeometry(rect)
        }
        refreshRectStyle(rect)
    }
    //refreshOverlay() // Avoid infinite cycle
}
function refreshRectStyle(rect) {
    
    if (overlay.opts.showRect) {
        let lockRotation = false
        if (!overlay.guiAngle.angleEnabled) {
            lockRotation = true
        }
        
        //rect.setControlVisible('mtr', !lockRotation)  // Remove rotation handle
        rect.setControlsVisibility({
            mtr: !lockRotation,
            mt: false, // middle top disable
            mb: false, // midle bottom
            ml: false, // middle left
            mr: false, // middle right
            tl: true,
            bl: true, 
            tr: true,
            br: true,
        });
        rect.lockScalingFlip = true
        rect.lockScalingX = false
        rect.lockScalingY = false
        rect.hasControls = true
        rect.hasBorders = true

        if (overlay.opts.resizeAroundCenter) {
            rect.centeredScaling = true
        } else {
            rect.centeredScaling = false
        }
    } else {
        // rect.setControlsVisibility({
        //     mtr: false,
        //     mt: false, // middle top disable
        //     mb: false, // midle bottom
        //     ml: false, // middle left
        //     mr: false, // middle right
        // });
        //rect.lockScalingFlip = true
        //rect.lockScalingX = true
        //rect.lockScalingY = true
        rect.hasControls = false
        rect.hasBorders = false
    }
}

// OBS to Fabric BeeRect
function updateRectFromObsGeometry(rect) {
    if (logging.overlay)
        console.log('updateRectFromObsGeometry: rect=',rect)
    let obs = rect.obs
    if (typeof obs === 'undefined') {
        console.log('updateRectFromObsGeometry: activeObject.obs undefined')
        return
    }

    let canvasRect = overlay.obsToCanvasRect(obs)
    
    let cx = (canvasRect.left + canvasRect.width / 2);
    let cy = (canvasRect.top + canvasRect.height / 2);
    //let cx = canvasRect.left;
    //let cy = canvasRect.top;
    
    if (overlay.opts.showRect) {
        // CAUTION: rect.left/top are misnamed. When originX/originY='center', they
        // Correspond to rectangle center
        rect.setLeft(cx)     // unrotated left (rotation around center)
        rect.setTop(cy)      // unrotated top
        rect.setWidth(canvasRect.width)
        rect.setHeight(canvasRect.height)
        rect.setAngle(obs.angle)
        rect.setCoords()
    } else {
        rect.setWidth(overlay.opts.ID_dotRadius*2)
        rect.setHeight(overlay.opts.ID_dotRadius*2)
        rect.setLeft(cx)     // unrotated left (rotation around center)
        rect.setTop(cy)      // unrotated top
        rect.setAngle(0)
        rect.setCoords()
        // Rely on refreshRectStyle
    }
}

// Fabric BeeRect to obs
function updateRectObsGeometry(activeObject) {
    if (logging.overlay)
        console.log('updateRectObsGeometry: activeObject=',activeObject)
    let obs = activeObject.obs
        if (typeof obs === 'undefined') {
            console.log('updateRectObsGeometry: activeObject.obs undefined')
            return
    }

    let geom = rotatedRectGeometry(activeObject);
    let videoRect = overlay.canvasToVideoRect(geom.unrotated)
    
    if (overlay.opts.showRect) {
        // Update Observation attached to rectangle from current Rect size
        obs.x = videoRect.left    // unrotated left (rotation around center)
        obs.y = videoRect.top     // unrotated top
        obs.width = videoRect.width
        obs.height = videoRect.height
        obs.angle = activeObject.angle    
        obs.cx = (videoRect.left + videoRect.width / 2);
        obs.cy = (videoRect.top + videoRect.height / 2);
    } else {
        // `Virtual rect, just update center, keep width, height, angle
        // Update Observation attached to rectangle from current Rect size
        //obs.x = videoRect.left    // unrotated left (rotation around center)
        //obs.y = videoRect.top     // unrotated top
        //obs.width = videoRect.width
        //obs.height = videoRect.height
        //obs.angle = activeObject.angle    
        obs.cx = (videoRect.left + videoRect.width / 2);
        obs.cy = (videoRect.top + videoRect.height / 2);
        obs.x = obs.cx - obs.width/2;
        obs.y = obs.cy - obs.height/2;
    }
}

function createRectsFromTracks(F) {
    if (typeof F === 'undefined')
        F = getCurrentFrame()
    let ids = getValidIDsForFrame(F)
    if (logging.overlay) {
        console.log("createRectsFromTracks: ",{frame:F,ids:ids})
    }
    overlay.canvas1.renderOnAddRemove=false  // Do not render all for each change
    for (let id of ids) { // For each valid bee ID, create a rect for it
        let obs = getObsHandle(F, id, false)
        addRectFromObs(obs)
    }
    overlay.canvas1.renderAll(); // Render only once at the end
    overlay.canvas1.renderOnAddRemove=true
}
function addRectFromObs(inputObs, status) {
    if (typeof inputObs === 'undefined') {
        console.log('ERROR in addRectFromObs: input obs undefined')
        return undefined
    }
    
    if (typeof status == 'undefined')
        status = "db"
    if (status !== "new" && status !== "db") {
        console.log("ERROR in addRectFromObs: status=", status, " unknown")
        return undefined
    }
    
    var obs = cloneObs(inputObs)
    if (typeof obs.angle === 'undefined') {
        console.log('WARNING in addRectFromObs: obs.angle undefined, default to 0')
        obs.angle = 0;
    }
    
    var rect = new fabric.BeeRect({
        id: obs.ID,
        status: status,
        obs: obs,
        top: undefined,
        left: undefined,
        width: undefined,
        height: undefined,
        fill: 'transparent',
        stroke: 'blue',
        strokewidth: 6,
        cornerColor: 'red',
        cornerSize: 6,
        rotatingPointOffset: 20,
        centeredRotation: true,
        //hasRotatingPoint: hasRotatingPoint,
        //lockRotation: lockRotation
    });
    rect.originX = 'center'
    rect.originY = 'center'

    //rect.setAngle(obs.angle); // Done in update
    updateRectFromObsGeometry(rect)
    
    refreshRectStyle(rect)
    
    overlay.canvas1.add(rect);
    
    if (logging.addRect)
        console.log("addRectFromObs: added rect=",rect);
    
    //var rect = addRect(obs.ID, r.left, r.top, r.width, r.height, "db", obs)
    return rect
}
/* Rectangles */
function rotatedRectGeometry(rect) {
    // Compute various properties of Fabric.js rotated rect
    var geom = {}
    
    rect.setCoords() // Compute coordinates
    var coords = rect.oCoords
    //console.log(rect)
    geom.center={x: (coords.tl.x+coords.br.x)/2, y: (coords.tl.y+coords.br.y)/2}
    geom.tl={x: coords.tl.x, y: coords.tl.y}
    geom.br={x: coords.br.x, y: coords.br.y}
    let center = {x: (coords.tl.x+coords.br.x)/2, 
                  y: (coords.tl.y+coords.br.y)/2}
    geom.unrotated = {left: center.x-rect.width/2, top: center.y-rect.height/2,
                      width: rect.width, height: rect.height
                      }
    
    if (typeof rect.angle !== 'undefined')
        geom.angle = rect.angle
    else
        geom.angle = 0
    
    return geom
}
fabric.BeeRect = fabric.util.createClass(fabric.Rect, {
    type: 'beerect',
    
    initialize: function (element, options) {
        options = options || {};

        this.callSuper('initialize', element, options);
    },
    
    _render: function (ctx) {
        this.callSuper('_render', ctx);
        
        if (zoomOverlay.flagShowParts) {
            this._drawParts(ctx)
        }
        
        identifyBeeRect(ctx, this, overlay.opts.ID_dotRadius, this.active);
    },
    
    _colormapping: function(label) {
        var color = zoomOverlay.labelList.get(label);
        if (!color) color=zoomOverlay.labelList.get('__default')
        if (!color) color='black'
        return color
    },
    
    _frame2local: function(posFrame) {
        let angle = this.angle/180*Math.PI
        var posLocal = {
                x: (   (posFrame.x-this.cx) * Math.cos(angle) 
                     + (posFrame.y-this.cy) * Math.sin(angle) ),
                y: ( - (posFrame.x-this.cx) * Math.sin(angle) 
                     + (posFrame.y-this.cy) * Math.cos(angle) )}
        return posLocal
    },
    
    _drawParts: function (ctx) {
        //console.log('BeeRect._drawParts')
        var parts = this.obs.parts
        if (!parts) return
        
        let geom = rotatedRectGeometry(this)
        this.cx = geom.center.x
        this.cy = geom.center.y

        var radius = 4
        var x = 0, y = 0 // Local coordinates

        //console.log(label)

        ctx.save()
        
        // Compensate local coordinates to go to canvas coordinates
        ctx.rotate(-this.angle/180*Math.PI)
        ctx.translate(-this.cx,-this.cy)
        
        //console.log(parts)
        
        for (var part of parts) {
        
            var canvasPos = overlay.videoToCanvasPoint(part.posFrame)
            
            var x = canvasPos.x
            var y = canvasPos.y
            
            var label = part.label
            var color = this._colormapping(label);
            ctx.strokeStyle = color
        
            ctx.beginPath()
            ctx.rect(x-3,y-3,7,7);
            ctx.stroke()
            
            if (true) {
                ctx.beginPath()
                ctx.moveTo(this.cx,this.cy)
                ctx.lineTo(x,y)
                ctx.stroke()
            }
        }

        ctx.restore()
    }
});
// Create a fabric rectangle at specific place, all units in canvas coordinates
function addRect(id, startX, startY, width, height, status, inputObs, angle) {
    console.log('addRect: id=',id)

    var obs
    if (status === "new") {
        obs = new Observation(id)
        obs.ID = id
        obs.frame = videoControl.getCurrentFrame()
        obs.time = videoControl.getCurrentVideoTime()
        updateObsActivityFromForm(obs)
        
        let canvasRect = {left: startX, top: startY, 
                          width: width, height: height}
        let videoRect = overlay.canvasToVideoRect(canvasRect)
        obs.x = videoRect.left
        obs.y = videoRect.top
        obs.width = videoRect.width
        obs.height = videoRect.height
        if (angle == null) angle = 0;
        obs.angle = angle 
    } else if (status === "db") {
        obs = cloneObs(inputObs)
        if (typeof obs.angle === 'undefined') {
            obs.angle = 0
        }
    } else {
        console.log("addRect: error, status unknown. status=", status)
    }

    var rect = addRectFromObs(obs, status)
    
    return rect;
}
// Try to find a fabric rectangle with a given id
function findRect(id) {
    var rects = overlay.canvas1.getObjects();
    if (rects) {
        var r;
        for (var i = 0; i < rects.length; i++) {
            if (rects[i].id == id) {
                r = rects[i];
                return r;
            }
        }
    }
    return undefined
}

function updateRectObsActivity(activeObject) {
    // Update Observation attached to rectangle from Form information
    let obs = activeObject.obs
    updateObsActivityFromForm(obs)
}
function updateObsActivityFromForm(obs) {
    // Update form --> obs.labels --> bool_acts

    obs.bool_acts[0]=hasLabel(obs,'fanning');
    obs.bool_acts[1]=hasLabel(obs,'pollen');
    obs.bool_acts[2]=hasLabel(obs,'entering');
    obs.bool_acts[3]=hasLabel(obs,'leaving');
    
    obs.notes = $('#notes').val()
    
    if (logging.guiEvents)
        console.log("updateObsActivityFromForm: obs=", obs)
}
function setLabels(rect,labels) {
    let obs = rect.obs;
    
    // Update labelsString --> obs.labels --> bool_acts --> form
    
    let labelArray = toLabelArray(labels)
    labels = toLabelString(labelArray)
    obs.labels=labels;
    
    obs.bool_acts[0]=hasLabel(obs,'fanning');
    obs.bool_acts[1]=hasLabel(obs,'pollen');
    obs.bool_acts[2]=hasLabel(obs,'entering');
    obs.bool_acts[3]=hasLabel(obs,'leaving');
    
    updateForm(rect)
}

// #MARK # CANVAS DRAWING: TRACKS AND EVENTS

// #MARK ## Bee ID and event tracks

/* Basic drawing */
function paintDot(ctx, pt, radius, color, id) {
    let x=pt.x, y=pt.y;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(String(id), x, y - radius - 3);
}
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  // From http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
  var words = text.split(' ');
  var line = '';

  for(var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    }
    else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
}
function activityString(obs) {
    let acti = ''
    if (obs.bool_acts[0]) acti += 'F'
    if (obs.bool_acts[1]) acti += 'P'
    if (obs.bool_acts[2]) acti += 'E'
    if (obs.bool_acts[3]) acti += 'L'
    return acti;
}
function identify(ctx, rect, radius) { // old prototype: obs, x,y, color){

    var color
    if (rect.status === "new")
        color = "green"
    else if (rect.status === "db")
        color = "yellow"
    else
        color = "red" //problem

    //let x = rect.left + rect.width / 2;
    //let y = rect.top + rect.height / 2;
    let geom = rotatedRectGeometry(rect)
    let x = geom.center.x
    let y = geom.center.y
    
    console.log('identify ctx=',ctx, x,y)

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    ctx.font = "20px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    
    let obs=rect.obs
    if (hasLabel(obs,'wrongid')) {
        ctx.fillStyle = 'cyan';
        ctx.fillText(String(rect.id), x, y - radius - 3);
    } else {
        ctx.fillText(String(rect.id), x, y - radius - 3);
    }

    let acti = activityString(rect.obs)

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(acti, x, y + radius + 3);
    ctx.textBaseline = 'alphabetic';
}

// Main function to display annotation info
function identifyBeeRect(ctx, rect, radius, isActive) {

    var color = overlay.opts.ID_color
    // if (rect.status === "new")
    //     color = "green"
    // else if (rect.status === "db")
    //     color = "yellow"
    // else
    //     color = "red" //problem

    // Local coordinates ?
    let x = 0
    let y = 0
    
    //console.log('identifyBeeRect ctx=',ctx, x,y)

    ctx.save()

    let obs=rect.obs

    if (overlay.opts.showPredictedStatus) {
        let obs = getObsHandle(rect.obs.frame,rect.obs.ID)//rect.obs
        if (obs.predicted) {
            ctx.globalAlpha = 0.25
        } else {
            ctx.globalAlpha = 1.0
        }
    }
    
    // Compensate rotation to have upright labels
    ctx.rotate(-rect.angle/180*Math.PI)

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    if (!overlay.opts.showRect) {
        if (isActive) {
            // Compensate for the fact the selected rect will not have visible handles
            ctx.strokeStyle = 'red'
            ctx.lineWidth = 3
            ctx.stroke();
        }
    }

    if (overlay.opts.showID) {
        //ctx.font = "20px Arial";
        font = ''+overlay.opts.ID_fontSize+'px Arial' 
        ctx.font = font
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        if (hasLabel(obs,'wrongid')) {
            if (obs.newid == null) {
                ctx.fillStyle = 'cyan';
                ctx.fillText(String(obs.ID), x, y - radius - 3);
            } else {
                ctx.font = "14px Arial";
                ctx.fillStyle = 'cyan';
                ctx.fillText(String(obs.ID), x, y - radius - 3);
                ctx.font = "10px Arial";
                ctx.fillStyle = color;
                ctx.fillText(String(obs.newid), x, y - radius - 16);
            }
        } else {
            ctx.fillText(String(rect.id), x, y - radius - 3);
        }
    }

    let labelOffset = radius + 3
    if (overlay.opts.showSpan) {
        //ctx.font = "10px Arial";
        let obs = getObsHandle(rect.obs.frame,rect.obs.ID)//rect.obs
        if ((obs) && ('span' in obs)) {
            let spannotes = ''
            let f = obs.frame
            let f1 = Number(obs.span.f1)
            let f2 = Number(obs.span.f2)
            if (f2!=f1) {
                spannotes = '['+f1+'-'+f2+']'
            }
            font = ''+(overlay.opts.ID_fontSize/2)+'px Arial' 
            ctx.font = font
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            wrapText(ctx, spannotes, x, y + labelOffset, 80, 10)
            labelOffset += overlay.opts.ID_fontSize/2
        }
    }
    if (overlay.opts.showLabels) {
        let acti = overlay.opts.labelFormatter(rect.obs)
        //activityString(rect.obs)

        //ctx.font = "10px Arial";
        font = ''+(overlay.opts.ID_fontSize/2)+'px Arial' 
        ctx.font = font
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(acti, x, y + labelOffset);
        ctx.textBaseline = 'alphabetic';
        if (acti!='')
            labelOffset += overlay.opts.ID_fontSize/2
    }
    if (overlay.opts.showNotes) {
        if (typeof rect.obs.notes !== 'undefined') {
            //ctx.font = "10px Arial";
            let notes = rect.obs.notes
            font = ''+(overlay.opts.ID_fontSize/2)+'px Arial' 
            ctx.font = font
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            wrapText(ctx, notes, x, y + labelOffset, 80, 10)
        }
        labelOffset += overlay.opts.ID_fontSize/2
    }
    
    ctx.restore()
}

/* Obs tracks */
function plotTracks(ctx) {
    let F = getCurrentFrame()

    let win = getWindow()
    let fmin=win[0], fmax=win[1]
    let ids = getValidIDsForFrames(win)

    setColor = function(f) {
        if (f<=F) {
            color = "rgba(255,0,128,"+(1-Math.abs((f-F)/(fmin-F-1)))+")"
            //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
        } else {
            color = "rgba(0,128,128,"+(1-Math.abs((f-F)/(fmax-F+1)))+")"
        }
        return color;
    }
    setColorS = function(f) {
        if (f<=F) {
            color = "rgba(255,0,0,"+(1-Math.abs((f-F)/(fmin-F-1)))+")"
            //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
        } else {
            color = "rgba(0,128,0,"+(1-Math.abs((f-F)/(fmax-F+1)))+")"
        }
        return color;
    }

    for (let id of ids) { // For each valid bee ID, create a track for it
        let isSelected = isCurrentSelection(id)
        let obs = getObsHandle(fmin, id, false)
        let x=undefined, y=undefined, z=0;
        if (!!obs) {
            let rect = overlay.obsToCanvasRect(obs)
            //let geom = rotatedRectGeometry(rect)
            //x = geom.center.x
            //y = geom.center.y
            x = rect.left+rect.width/2
            y = rect.top+rect.height/2
            z = 1;
        }

        for (let f=fmin+1; f<=fmax; f++) {
            let obs = getObsHandle(f, id, false)
            if (!obs) { z=0; continue;}
            let rect = overlay.obsToCanvasRect(obs)            
            let x2 = rect.left+rect.width/2
            let y2 = rect.top+rect.height/2
//             let x2 = geom.center.x
//             let y2 = geom.center.y
            let z2 = 1;
            
            ctx.beginPath();
            ctx.moveTo(x,y);
            ctx.lineTo(x2,y2);
            
            ctx.lineWidth = 1
            if (z)
                ctx.setLineDash([])
            else
                ctx.setLineDash([10,10])
            if (isSelected) {
                ctx.strokeStyle = setColorS(f);
            } else {
                ctx.strokeStyle = setColor(f);
            }
            ctx.stroke();
            ctx.strokeStyle = "none"
            ctx.setLineDash([])
            
            x=x2; y=y2; z=z2;
        }
        for (let f=fmin; f<=fmax; f++) {
            if (showObs && (f==F)) continue;
        
            let obs = getObsHandle(f, id, false)
            if (!obs) continue;
            let rect = overlay.obsToCanvasRect(obs)
            
            //let geom = rotatedRectGeometry(rect)
            x = rect.left+rect.width/2
            y = rect.top+rect.height/2
    
            if (isSelected) {
                color = setColorS(f);
            } else {
                color = setColor(f);
            }
            if (f==F) {
                color = 'yellow'
            }
                
            radius = 3;
            paintDot(ctx, {'x':x, 'y':y}, radius, color, id)    
                
            let acti = activityString(obs)

            ctx.font = "8px Arial";
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(acti, x, y + radius + 3);
            ctx.textBaseline = 'alphabetic';    
        }
    }
}

/* Options */
var showObsTracks = false
function onShowObsChanged() {
    showObs = $('#showObs')[0].checked
    showObsTracks = $("#showObsTracks")[0].checked
    //videoControl.refresh()
    overlay.hardRefresh()
}

// #MARK ## Tag tracks

/* Access */
function getTag(f, id) {
    if (typeof Tags === 'undefined') return undefined
    let tagsFrame = Tags[f]
    if (typeof(tagsFrame) === "undefined") return undefined;
    let tags = tagsFrame.tags
    for (let i in tags) {
        if (tags[i].id == id) { return tags[i];}
    }
    return undefined
}
function isCurrentSelection(id) {
  return typeof defaultSelectedBee !== 'undefined' && id == defaultSelectedBee
}
function tagCorners(tag) {
    if (typeof tag.p === 'undefined') return undefined
    let ppt=[]
    for (let i of [0,1,2,3]) {
        ppt[i] = overlay.videoToCanvasPoint({"x":tag.p[i][0], "y":tag.p[i][1]})
    }
    return ppt
}
function tagUp(tag) {
    if (typeof tag.p === 'undefined') return undefined
    let p = tag.p;
    let ppt = tagCorners(tag);
    let dir = [ppt[1].x-ppt[2].x,ppt[1].y-ppt[2].y]
    let m = Math.sqrt(dir[0]*dir[0]+dir[1]*dir[1])
    dir = [dir[0]/m, dir[1]/m]
    return dir
}
function tagAngle(tag) {
    let up = tagUp(tag)
    if (typeof up === 'undefined') return undefined
    let angle = Math.atan2(up[0], -up[1])/Math.PI*180
    return angle
}
function tagSize(tag) {
    if (typeof tag.p === 'undefined') return undefined
    let p = tag.p;
    let d = {x: p[0][0]-p[1][0], y: p[0][1]-p[1][1]}
    let m = Math.sqrt(d.x*d.x+d.y*d.y)
    d = {x: p[2][0]-p[1][0], y: p[2][1]-p[1][1]}
    m += Math.sqrt(d.x*d.x+d.y*d.y)
    d = {x: p[2][0]-p[3][0], y: p[2][1]-p[3][1]}
    m += Math.sqrt(d.x*d.x+d.y*d.y)
    d = {x: p[3][0]-p[0][0], y: p[3][1]-p[0][1]}
    m += Math.sqrt(d.x*d.x+d.y*d.y)
    m /= 4
    return m
}

/* Basic drawing */
function plotTag(ctx, tag, color, flags) {
    if (!tagsSampleFilter(tag)) {
        return
    }
    if (color === undefined) {
        if (tag.hamming==0)
          color = '#ff0000'
        else if (tag.hamming==2)
          color = '#ff6000'
        else
          color = '#ffb000'
    }
    if (typeof flags === 'undefined') {
      flags = {
        "id":true,
        "radius":5,
        "simple":false
      }
    }
    let radius = flags.radius
    if (typeof radius === 'undefined') { radius = 5; }

    let pt = overlay.videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
    
    if (isCurrentSelection(tag.id)) {
        if (tag.frame == getCurrentFrame()) {
            if (showTagsOrientation) {
                plotTagOrientation(ctx, tag, '#00ff00')
            } else {
                ctx.beginPath();
                if (overlay.tagMarker == 'quad' && tag.p) {
                    let p = tag.p
                    let q = [
                          overlay.videoToCanvasPoint({x:p[0][0],y:p[0][1]}),
                          overlay.videoToCanvasPoint({x:p[1][0],y:p[1][1]}),
                          overlay.videoToCanvasPoint({x:p[2][0],y:p[2][1]}),
                          overlay.videoToCanvasPoint({x:p[3][0],y:p[3][1]})
                       ]
                    ctx.moveTo(q[0].x,q[0].y)
                    ctx.lineTo(q[1].x,q[1].y)
                    ctx.lineTo(q[2].x,q[2].y)
                    ctx.lineTo(q[3].x,q[3].y)
                    ctx.lineTo(q[0].x,q[0].y)
                    ctx.strokeStyle = '#00FF00';
                    ctx.lineWidth = 2;
                } else if (overlay.tagMarker == 'cross') {
                    ctx.moveTo(pt.x-20,pt.y)
                    ctx.lineTo(pt.x+20,pt.y)
                    ctx.moveTo(pt.x,pt.y-20)
                    ctx.lineTo(pt.x,pt.y+20)
                    ctx.strokeStyle = '#00FF00';
                    ctx.lineWidth = 2;
                } else if (overlay.tagMarker == 'circle') { // 'round'
                    ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2, true);
                    ctx.strokeStyle = '#00FF00';
                    ctx.lineWidth = 2;
                } else { //
                    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = '#00FF00';
                    ctx.lineWidth = 4;
                }
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore()
        } else {
            ctx.save()
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius+2, 0, Math.PI * 2);
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.closePath();
        }
    } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.closePath();
        ctx.stroke();
        if (tag.frame == getCurrentFrame() && showTagsOrientation) {
            plotTagOrientation(ctx, tag, 'magenta')
        }
    }

    if (flags.id===true) {
      ctx.font = "10px Arial";
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(String(tag.id), pt.x, pt.y + radius + 8);

      ctx.font = "10px Arial";
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText("H"+tag.hamming, pt.x, pt.y + radius + 16);
    }
}
function plotTagOrientation(ctx, tag, color) {
      let pt = overlay.videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
      let dir = tagUp(tag)
      if (typeof dir !== 'undefined') {
        ctx.save()
        let L=40, L1=35, W1=4
        ctx.beginPath();
        ctx.moveTo(pt.x-dir[0]*L, pt.y-dir[1]*L)
        ctx.lineTo(pt.x+dir[0]*L, pt.y+dir[1]*L)
        ctx.lineTo(pt.x+dir[0]*L1+dir[1]*W1, pt.y+dir[1]*L1-dir[0]*W1)
        ctx.strokeStyle = color
        if (tag.hamming>2)
            ctx.setLineDash([4,4])
        ctx.stroke();
        ctx.restore()
      }
}
function plotTags(ctx) {
    let F = getCurrentFrame()
    let tagsFrame = Tags[F]
    if (tagsFrame !== undefined) {
        let tags = tagsFrame.tags
        //console.log('Found tags',tags)
        for (let i in tags) {
            let tag = tags[i]
            //console.log(tag)
            plotTag(ctx, tag)            
        }
        
       let msg = ''
       for (let i in tags) {
           let tag = tags[i]
            msg = msg + tag.id + ' H'+tag.hamming+ ' ('+tag.c[0]+','+tag.c[1]+')<br>'
       }
       $("#tagDetails")[0].innerHTML = msg
       //console.log('plotTags: msg=',msg)
    }
}

function plotTrackArrow(ctx, p0, p1, L) {
    let u = {x:p1.x-p0.x, y:p1.y-p0.y}
    let n = Math.sqrt(u.x*u.x+u.y*u.y)
    u.x=u.x/n
    u.y=u.y/n
    ctx.beginPath();
    ctx.moveTo(p1.x+L*(-u.x-0.6*u.y), p1.y+L*(-u.y+0.6*u.x))
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p1.x+L*(-u.x+0.6*u.y), p1.y+L*(-u.y-0.6*u.x))
    ctx.stroke()
}

/* Tag tracks */
function plotTagsTracks(ctx) {
    let F = getCurrentFrame()

    let win = getWindow()
    let fmin=win[0], fmax=win[1]
    let frange=(F-fmin)>(fmax-F)?F-fmin:fmax-F;

    let tProx = function(f) {
        return Math.max(0, 1-Math.abs((f-F)/frange))
    }
    let tProxSigned = function(f) {
        return Math.max((f-F)/frange)
    }
    let setColor = function(f, alpha) {
        if (alpha==null) alpha=1.0;
        var color
        if (false) {
            let T = tProx(f)
            if (f<=F) {
                color = "rgba(255,0,0,"+T+")"
            } else {
                color = "rgba(0,0,255,"+T+")"
            }
        } else {
            let T = tProx(f)*alpha
            let S = tProxSigned(f)/2+0.5
            let r = Math.round(255*(1-S))
            let g = 0
            let b = Math.round(255*S)
            color = "rgba("+r+","+g+","+b+","+T+")"
        }
        return color;
    }

    if (showTagsTracks) {
    // Plot past and future tag positions
    
    for (var id in ttags) {
        let tagline = ttags[id]
        if (typeof(tagline) === "undefined") continue;
                
        let p0 = null
        for (let fs in tagline) {
            let f = Number(fs)
            let tag = tagline[f]
            
            if ((f<fmin) || (f>fmax)) continue
            if (!tagsSampleFilter(tag)) {
                    continue
                }
                
            let color=setColor(f)          
            
            //console.log(tag)
            let p1 = overlay.videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
            p1.frame = f
            
            if ((p0!=null) &&
                (Number(p1.frame)-Number(p0.frame) <= 40)) {
            
                ctx.save()
                ctx.beginPath();
                ctx.moveTo(p0.x,p0.y)
                ctx.lineTo(p1.x,p1.y)  
                if (tag.hamming<1000 && (Number(p1.frame)-Number(p0.frame)<=1)) {
                    ctx.setLineDash([])
                    ctx.lineWidth=2
                    color=setColor(f)          
                } else {
                    //ctx.setLineDash([3,3])
                    ctx.lineWidth=1
                    color=setColor(f,0.5)
                }
                ctx.strokeStyle = color;
                ctx.stroke();
                ctx.setLineDash([])
                plotTrackArrow(ctx, p0, p1, 6*tProx(f)+1)
                ctx.restore()
            }
            p0 = {x:p1.x, y:p1.y, frame:p1.frame}

            if (tag.hamming<1000)
              plotTag(ctx, tag, color, {"id":false, "radius": tProx(f)+1})            
            else
              plotTag(ctx, tag, color, {"id":false, "radius": tProx(f)+1})            
        }
    
    }
    }
    
    if (showSelectedTagsTracks) {
    
    // Plot track of selected bee
    if (typeof defaultSelectedBee !== 'undefined') {
    
        let setColor2 = function(f, alpha) {
            if (alpha==null) alpha=1.0;
            var color
            if (false) {
                let T = tProx(f)
                if (f<=F) {
                    color = "rgba(255,255,0,"+T+")"
                } else {
                    color = "rgba(128,255,128,"+T+")"
                }
            } else {
                let T = tProx(f)*alpha
                let S = tProxSigned(f)/2+0.5
                let r = Math.round(128+127*(1-S))
                let g = 255
                let b = Math.round(128*S)
                color = "rgba("+r+","+g+","+b+","+T+")"
            }
            return color;
        }
    
        //console.log('defaultSelectedBee=',defaultSelectedBee)
        let p0 = []
        for (let f=fmin; f<=fmax; f++) {
            let tagsFrame = Tags[f]
            if (typeof(tagsFrame) === "undefined") continue;
            let tags = tagsFrame.tags
            
            let ii = -1
            for (let i in tags) {
                if (tags[i].id == defaultSelectedBee) { ii=i; break;}
            }
            if (ii<0) continue;
            let tag = tags[ii]
            {
                //console.log('tag=',tag)
                if (!tag) continue;
            
                if (!tagsSampleFilter(tag)) {
                        continue
                    }
                    
                let color2=setColor2(f)          
            
                //console.log(tag)
                let p1 = overlay.videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
                p1.frame = f
            
                if ((p0!=null && p0[tag.id] != null) &&
                (Number(p1.frame)-Number(p0[tag.id].frame) <= 40)) {
//                if (typeof p0[tag.id] !== 'undefined') {
  
                
                    ctx.save()
                    ctx.beginPath();
                    ctx.moveTo(p0[tag.id].x,p0[tag.id].y)
                    ctx.lineTo(p1.x,p1.y)  
                    if (tag.hamming<1000 && (Number(p1.frame)-Number(p0[tag.id].frame)<=1)) {
                        ctx.setLineDash([])
                        ctx.lineWidth=2
                        color2=setColor2(f)          
                    } else {
                        //ctx.setLineDash([3,3])
                        ctx.lineWidth=1
                        color2=setColor2(f,0.5)
                    }
                    ctx.strokeStyle = color2;
                    ctx.stroke();
                    ctx.setLineDash([])
                    plotTrackArrow(ctx, p0[tag.id], p1, 6*tProx(f)+1)
                    ctx.restore()
                }
                p0[tag.id] = {x:p1.x, y:p1.y, frame:p1.frame}
                
// No need for tag with arrow plot, except if only ont point    
                plotTag(ctx, tag, color2, {"id":false, "radius": tProx(f)+1})            
            }    
        }
    }
    }
    
    if (false) // Done in plotTag
    {
        // Plot current tag position
        let f=F;
        let tagsFrame = Tags[f]
        if (typeof(tagsFrame) !== "undefined") {
        let tags = tagsFrame.tags
        let color = setColor(f)
        for (let i in tags) {
            let tag = tags[i]
            //console.log(tag)
            
            plotTag(ctx, tag, color, {"id":true})            
        }    
        }
    } 
}

// #MARK # OVERLAY PARAMETERS MANAGEMENT

/* Options */
function onShowTagsChanged() {
    // Callback when display parameters have changed
    showTags = $('#showTags')[0].checked
    showTagsOrientation = $('#showTagsOrientation')[0].checked
    videoControl.refresh()
}
function onShowTagsTracksChanged() {
    showTagsTracks = $('#showTagsTracks')[0].checked
    showSelectedTagsTracks = $('#showSelectedTagsTracks')[0].checked
    videoControl.refresh()
}

/* Track Window */
function onTrackWindowChanged(event) {
    let range = Number($('#trackWindow')[0].value)
    overlay.trackWindow.range = range
    
    let trackDir = $('#selectboxTrackDir').val()
    overlay.trackWindow.direction=trackDir
    
    if (trackDir=='Bidirectional') {
        overlay.trackWindow.forward = range
        overlay.trackWindow.backward = range
    } else if (trackDir=='Forward') {
        overlay.trackWindow.forward = range
        overlay.trackWindow.backward = 0
    } else if (trackDir=='Backward') {
        overlay.trackWindow.forward = 0
        overlay.trackWindow.backward = range
    } else {
      console.log('onTrackWindowChanged: ERROR, trackDir unknown trackDir=',trackDir)
    }
    
    if (logging.overlay) {
        console.log("onTrackWindowChanged:",overlay.trackWindow)
    }
    
    $(overlay).trigger('trackWindow:change')
    
    videoControl.refresh();
}
function setTrackWindow(L) {
    $('#trackWindow').val(L)
    onTrackWindowChanged()
}
function scaleTrackWindow(factor) {
    let L = Number($('#trackWindow').val())
    console.log("scaleTrackWindow: factor=",factor,"with L=",L)
    L = Math.ceil(L * Number(factor));
    if (L<0) L=0;
    if (isNaN(L)) L=1;
    setTrackWindow(L)
}
function shiftTrackWindow(factor) {
    let L = Number($('#trackWindow').val())
    let frame = getCurrentFrame()
    console.log("shiftTrackWindow: factor=",factor,"with frame=",frame, "L=",L)
    let newF = Math.round(frame+factor*L)
    videoControl.seekFrame(newF)
    // changeFrame generates trackWindow:change
}

/* FocusTrackWindow */
// UI
function onClickFocusVideo() {
    console.log('onClickFocusVideo')
    setFocusTrackWindow(false)
    
    updateChronoXDomainFromVideo()
}
function onClickFocusTrackWindow() {
    console.log('onClickFocusTrackWindow')
    
    setFocusTrackWindow(!lockFocusTrackWindow)
    
    if (lockFocusTrackWindow) {
        focusTrackWindow()
    }
}
function updateFocusTrackWindowButton() {
    if ( lockFocusTrackWindow ) {
        $("#focusTrackWindow").addClass("active")
    } else {
        $("#focusTrackWindow").removeClass("active")      
    }
}
// Control
function focusTrackWindow() {
    // Actually a Chronogram method
    let f = getCurrentFrame()
    axes.xdomainFocus([f-overlay.trackWindow.backward, 
                       f+overlay.trackWindow.forward])
}
function setFocusTrackWindow(flag) {
    lockFocusTrackWindow = flag
    if (lockFocusTrackWindow)
        $( overlay ).on('trackWindow:change', focusTrackWindow)
    else
        $( overlay ).off('trackWindow:change', focusTrackWindow)

    updateFocusTrackWindowButton()
}

/* ROI GUI */
// On/Off
function onClickROI() {
    $('#useROI').toggleClass('active')
    flag_useROI = $('#useROI').hasClass('active')
    ROIChanged()
}
// Change Callback
function ROIChanged() {
    if (flag_useROI) {
        tagsSampleFilterROI = function(tag) {
            return (tag.c[0]>=ROI.left 
                 && tag.c[0]<=ROI.right
                 && tag.c[1]>=ROI.top
                 && tag.c[1]<=ROI.bottom);
        }
    } else {
        tagsSampleFilterROI = function(tag) {return true}
    }
    onTagsParametersChanged()
    refreshChronogram()
    videoControl.refresh();
}
// Edit
function updateROIFromVideo() {
    let R = videoControl.videoSize()
    $('#ROI').val([R.left,R.top,R.right,R.bottom].join(','))
    ROIChanged()
}
function onROITextChanged() {
    let roitext = $('#ROI').val()
    let roi = roitext.split(',')
    if (roi.length!=4) {
        console.log('onROIChanged: ERROR, ROI should have 4 coordinates, left,top,right,bottom')
        return;
    }
    ROI = {left: Number(roi[0]),
           top: Number(roi[1]),
           right: Number(roi[2]),
           bottom: Number(roi[3])}
    ROIChanged()
}
// Plot
function plotROI(ctx) {
    if (!flag_useROI) return;

    let R = {left:ROI.left, top:ROI.top, 
             width:ROI.right-ROI.left, 
             height: ROI.bottom-ROI.top}
    let R2 = overlay.videoToCanvasRect(R)

    ctx.save()
    ctx.beginPath();
    ctx.rect(R2.left, R2.top, R2.width, R2.height);
    ctx.strokeStyle = '#fff';
    //ctx.setLineDash([4,4])
    ctx.lineWidth = 1
    ctx.stroke();
    ctx.restore()
    
    ctx.save()
    //ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0,0,overlay.canvas.width,R2.top);
    ctx.fillRect(0,R2.top,R2.left,R2.height);
    ctx.fillRect(R2.left+R2.width,R2.top,
                 overlay.canvas.width-R2.left-R2.width,R2.height);
    ctx.fillRect(0,R2.top+R2.height,
                 overlay.canvas.width,overlay.canvas.height-R2.top-R2.height);
    ctx.restore()
}

/* Exclude Rects GUI */
// On/Off
function onClickExcludeRects() {
    $('#useExcludeRects').toggleClass('active')
    flag_useExcludeRects = $('#useExcludeRects').hasClass('active');
    excludeRectsChanged()
}
// Change callback
function excludeRectsChanged() {
    if (flag_useExcludeRects) {
        tagsSampleFilterExcludeRects = function(tag) {
            for (let r of excludeRects) {
                //console.log(tag,r)
                let dx=Math.abs(tag.c[0]-r.cx)
                let dy=Math.abs(tag.c[1]-r.cy)
                if (( dx < r.w/2 ) && ( dy < r.h/2 )) return false
            }
            return true
        }
    } else {
        tagsSampleFilterExcludeRects = function(tag) {return true}
    }
    $('#excludeRectDeleteButton').toggleClass('disabled', !(excludeRectSelection>=0))
    onTagsParametersChanged()
    refreshChronogram()
    videoControl.refresh();
}
// Direct edition
function onClickExcludeRectAdd() {
    let R = getSelectedRect()
    if (!R) return
    
    let obs=R.obs
    excludeRects.push({cx:obs.x+obs.width/2,cy:obs.y+obs.height/2,
                       w:obs.width,h:obs.height})
    deleteSelected()
    excludeRectsChanged()
}
function onClickExcludeRectDelete() {
    let i = excludeRectSelection
    if (!(i>=0)) return
    
    excludeRects.splice(i,1)
    excludeRectSelection = -1
    excludeRectsChanged()
}
function onClickExcludeRectNext() {
    let n = excludeRects.length
    if (n==0) {
        excludeRectSelection=-1
        return
    }
    
    excludeRectSelection = excludeRectSelection+1
    if (excludeRectSelection>=n) excludeRectSelection=-1
    excludeRectsChanged()
}
// Advanced Dialog
function onClickExcludeRectParams() {
    openExcludeRectsDialog()
}
openExcludeRectsDialog = function() {
    var jsontext = JSON.stringify(excludeRects ,null, 4)
  
    $("#excludeRects-json").val(jsontext)
  
    $("#dialog-form-excludeRects").dialog("open");
}
initExcludeRectsDialog = function() {
    $("#dialog-form-excludeRects").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Ok": function() {
                var jsontext = $("#excludeRects-json").val();
                
                if (logging.zoomOverlay)
                    console.log('excludeRects dialog. jsontext = ',jsontext)

                excludeRects = JSON.parse( jsontext )
                
                if (logging.zoomOverlay)
                    console.log('excludeRects = ',excludeRects)
                
                $(this).dialog("close");
                
                excludeRectsChanged();
            },
            "Cancel": function() {
                $(this).dialog("close");
            }
        },
        open: function(){
            $("body").css("overflow", "hidden");
        },
        close: function(){
            $("body").css("overflow", "auto");
        }
    });

}
// Plot
function plotExcludeRects(ctx) {
    if (!flag_useExcludeRects) return;
    //console.log('plotExcludeRects')
    for (let r of excludeRects) {
      let R = {left:r.cx-r.w/2, top:r.cy-r.h/2, 
               width:r.w, 
               height:r.h}
      let R2 = overlay.videoToCanvasRect(R)

      //console.log("r=",r, " R=",R, " R2=",R2)

      ctx.save()
      ctx.beginPath();
      ctx.rect(R2.left, R2.top, R2.width, R2.height);
      ctx.strokeStyle = '#fd0';
      //ctx.setLineDash([4,4])
      ctx.lineWidth = 1
      ctx.stroke();
      ctx.restore()
    
      ctx.save()
      //ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillStyle = 'rgba(255,200,100,0.5)';
      ctx.fillRect(R2.left, R2.top, R2.width, R2.height);
      ctx.restore()
    }
    
    if (excludeRectSelection>=0) {
      r = excludeRects[excludeRectSelection]
      let R = {left:r.cx-r.w/2, top:r.cy-r.h/2, 
               width:r.w, 
               height:r.h}
      let R2 = overlay.videoToCanvasRect(R)
      
      ctx.save()
      ctx.beginPath();
      ctx.rect(R2.left, R2.top, R2.width, R2.height);
      ctx.strokeStyle = '#fff';
      //ctx.setLineDash([4,4])
      ctx.lineWidth = 2
      ctx.stroke();
      ctx.restore()
    }
}

/* Filters */
tagsRGBSampleFilter = function(tag) {return true}
tagsDMSampleFilter = function(tag) {return true}
tagsHammingSampleFilter = function(tag) {return true}
tagsSampleFilter = function(tag) {return true}
tagsIntervalFilter = function(interval) {return true}
tagsIDFilter = function(idinfo) {return true}
tagsSampleFilterROI = function(tag) {return true}
tagsSampleFilterExcludeRects = function(tag) {return true}
function refreshTagsParameters() {
    if (logging.overlay) {
        console.log('refreshTagsParameters')
    }
    // Reread tag parameters from GUI
    
    tagsSampleFilterCustom = Function("tag",$('#tagsSampleFilter')[0].value)
    
    let minDM = Number($('#tagsMinDM').val())
    if (minDM>0) {
        tagsDMSampleFilter = function(tag) {return (!tagsHaveDM)||tag.dm>=minDM}
    } else {
        tagsDMSampleFilter = function(tag) {return true}
    }
    
    let useRGBfilter = $('#tagsUseRgbFilter').hasClass('active')
    if (useRGBfilter) {
        tagsRGBSampleFilter = function(tag) {
              let rgb_mean = tag.rgb_mean
              if (!rgb_mean) return true
              let y=0.299*rgb_mean[0]+0.587*rgb_mean[1]+0.1114*rgb_mean[2]
              let CB=(rgb_mean[2]-y)/y
              let CR=(rgb_mean[0]-y)/y
              return CB-CR < 0.35
          }
          $('#tagsUseRgbFilter').addClass('active')
    } else {
        tagsRGBSampleFilter = function(tag) {return true}
        $('#tagsUseRgbFilter').removeClass('active')
    }
    
    tagsSampleFilter = function(tag){
          return tagsHammingSampleFilter(tag)
                 &&tagsSampleFilterROI(tag)
                 &&tagsSampleFilterExcludeRects(tag)
                 &&tagsDMSampleFilter(tag)
                 &&tagsRGBSampleFilter(tag)
                 &&tagsSampleFilterCustom(tag)}
    
    let minLength = Number($('#tagsIntervalFilterMinLength').val())
    
    tagsIntervalFilter = function(interval) {
      let fun = Function("interval",$('#tagsIntervalFilter')[0].value)
      return (interval.end-interval.begin>=minLength) && fun(interval)
    }
    tagsIDFilter = Function("idinfo",$('#tagsIDFilter')[0].value)
    
    if (logging.overlay) {
        console.log('refreshTagsParameters:',
                    '\ntagsSampleFilter=',tagsSampleFilter,
                    '\ntagsIntervalFilter=',tagsIntervalFilter,
                    '\ntagsIDFilter=',tagsIDFilter)
    }
}
function onTagsParametersChanged() {
    console.log('onTagsParametersChanged')
    // Callback when tags chronogram computation parameters have changed
    refreshTagsParameters()
    refreshChronogram()
    videoControl.refresh()
}
function onTagsParametersSelectChanged(event) {
  $('#tagsIntervalFilter').val($('#tagsIntervalFilterSelect').val())
  onTagsParametersChanged()
}
function chronoFilter(mode) {
  if (mode=='H0') {
      tagsHammingSampleFilter = function(tag) {return tag.hamming==0}
      onTagsParametersChanged()
  }
  if (mode=='H1') {
      tagsHammingSampleFilter = function(tag) {return tag.hamming<=1}
      onTagsParametersChanged()
  }
  if (mode=='H2') {
      tagsHammingSampleFilter = function(tag) {return tag.hamming<=2}
      onTagsParametersChanged()
  }
  if (mode=='Hall') {
      tagsHammingSampleFilter = function(tag) {return true}
      onTagsParametersChanged()
  }
  if (mode=='RGB') {
      $('#tagsUseRgbFilter').toggleClass('active')
      onTagsParametersChanged()
  }
}
function onChronoParametersChanged() {
    // Callback when chronogram computation parameters have changed
    showTagsChrono = $('#showTagsChrono')[0].checked
    showObsChrono = $('#showObsChrono')[0].checked
    console.log('onChronoParametersChanged:showTagsChrono\n=',showTagsChrono)
    refreshChronogram()
}



// #MARK # ID PREDICTION

// Auxiliary for Predict
function dist(x, y, x2, y2) {
    return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
}

// predictId:
// rect=={x:xx,y:yy} or rect={x:xx,y:yy,width:ww,height:hh}
// all units in video/obs coordinates
function predictId(frame, rect, mode) {
    //console.log('predictId(info), info=',info)
    // Auxiliary function: checks if two rectangles match using various modes
    var checkMatch = function(obs, rect, mode) {
        //console.log('obs=',obs,'rect=',rect)
        if (mode == "distance_topleft") {
            // Compare the distance from (x,y) to topleft corner of obs
            let d = dist(rect.x, rect.y, obs.x, obs.y);
            if (d < 40) {
                return true;
            }
        } else if (mode == "distance_center") {
            // Compare the distance from rect center to obs center
            let d = dist(rect.x + 0.5 * rect.width, rect.y + 0.5 * rect.height,
                         obs.x + 0.5 * obs.width, obs.y + 0.5 * obs.height);
            if (d < 40) {
                return true;
            }
        } else if (mode == "pointinside") {
            // Check if center of rect is inside obs
            if ((rect.x >= obs.x) && (rect.x <= obs.x + obs.width) &&
                (rect.y >= obs.y) && (rect.y <= obs.y + obs.height)) {
                return true
            }
        } else if (mode == "pointinside") {
            // Check if center of rect is inside obs
            var cx = rect.x + 0.5 * w,
                cy = rect.y + 0.5 * h;
            if ((cx >= obs.x) && (cx <= obs.x + obs.width) && 
                (cy >= obs.y) && (cy <= obs.y + obs.height)) {
                return true
            }
        } else {
            console.log("predictId.checkMatch: mode unsupported:", mode)
        }
        return false;
    }
    if (frame > 0) {
        let ids = getValidIDsForFrame(frame - 1);
        //console.log("ids=",ids)
        for (let id of ids) {
            var obs = getObsHandle(frame - 1, id, false);
            //console.log("id=",id,"obs=",obs)
            if (checkMatch(obs, rect, mode)) {
                if (findRect(id))
                    return {
                        id: computeDefaultNewID(),
                        predicted_id: id,
                        predicted_obs: obs,
                        reason: 'conflict'
                    };
                else
                    return {
                        id: id,
                        obs: obs
                    };
            }
        }
    }
    let ids = getValidIDsForFrame(frame + 1);
    //console.log("ids=",ids)
    for (let id of ids) {
        let obs = getObsHandle(frame + 1, id, false);
        //console.log("id=",id,"obs=",obs)
        if (checkMatch(obs, rect, mode)) {
            if (findRect(id))
                return {
                    id: computeDefaultNewID(),
                    predicted_id: id,
                    predicted_obs: obs,
                    reason: 'conflict'
                };
            else
                return {
                    id: id,
                    obs: obs
                };
        }
    }
    return {
        id: computeDefaultNewID(),
        reason: 'default'
    };
}
function defaultIfIDExists(predictStruct) {
    let id = predictStruct.id
    if (id==null) {
        return {
            id: computeDefaultNewID(),
            obs: undefined,
            d: Infinity,
            frame: undefined,
            reason: 'notFound'
        };
    } 
    if (findRect(id))
        return {
            id: computeDefaultNewID(),
            predicted_id: id,
            predicted_obs: obs,
            reason: 'conflict'
        };
    else
        return predictStruct;
}
function predictIdFromObsMultiframe(frameInterval, pt, mode) {
    let out = {id: undefined, obs: undefined, reason:'notFound', d:Infinity, frame: undefined};
    
    for (let frame = frameInterval[0]; frame<=frameInterval[1]; frame++) {
        let ids = getValidIDsForFrame(frame);
        for (let id of ids) {
            let obs = getObsHandle(frame, id, false);
            var cx = obs.x + obs.width/2,
                cy = obs.y + obs.height/2;
            //console.log("id=",id,"obs=",obs)
            let d = dist(pt.x, pt.y, cx, cy);
            if (d < overlay.opts.predictIdClickRadius && d < out.d) {
                out = {id: id, obs: obs, reason:'distance', d:d, frame:frame};
            }
        }
    }
    return out;
}

function predictIdFromTags(frame, pt, mode) {
    var tmp = Tags[frame];
    if (tmp == null) return {id: undefined, tag: undefined, reason:'notFound'};
    var frame_tags = tmp.tags;
    if (frame_tags != null) {
        for (let k in frame_tags) {
            let tag = frame_tags[k];
            let d = dist(pt.x, pt.y, tag.c[0], tag.c[1]);
            if (d < overlay.opts.predictIdClickRadius) {
                return {id: tag.id, tag: tag, reason:'distance'};
            }
        }
    }
    return {id: undefined, tag: undefined, reason:'notFound'};
}
function predictIdFromTagsMultiframe(frameInterval, pt, mode) {
    let out = {id: undefined, tag: undefined, reason:'notFound', d:Infinity, frame: undefined};
    
    for (let frame = frameInterval[0]; frame<=frameInterval[1]; frame++) {
        var tmp = Tags[frame];
        if (tmp == null) continue
        var frame_tags = tmp.tags;
        if (frame_tags != null) {
            for (let k in frame_tags) {
                let tag = frame_tags[k];
                let d = dist(pt.x, pt.y, tag.c[0], tag.c[1]);
                if (d < overlay.opts.predictIdClickRadius && d < out.d) {
                    out = {id: tag.id, tag: tag, reason:'distance', d:d, frame:frame};
                }
            }
        }
    }
    return out;
}
function computeDefaultNewID() {
    var default_id = 0
    let frame = getCurrentFrame()
    let ids = getValidIDsForFrame(frame)
    if (ids.length == 0) {
        return 0
    }
    function contains(A,id) {
        for (let i in A) {
            if (A[i] == id) return true // NOTE: 4=='4' is considered true
        }
        return false
    }
    while (contains(ids,default_id)) default_id++
    if (logging.idPrediction) {
        console.log("computeDefaultNewID: frame=",frame," default_id=",default_id)
        console.log("   ids=",ids)
    }
    return String(default_id)
}


// #MARK # LOW-LEVEL MOUSE EVENTS

var default_width = 40;
var default_height = 40;

function newRectForTag(tag) {
    let angle = tagAngle(tag)
    if (!overlay.guiAngle.angleEnabled) {
        angle = 0
    }
    let pt = overlay.videoToCanvasPoint({x:tag.c[0], y:tag.c[1]});
    if (typeof angle !== 'undefined') {
        console.log("newObsForTag: found angle=",angle)
        rect = addRect(tag.id, 
               pt.x - default_width / 2, 
               pt.y - default_height / 2,
               default_width, default_height, "new", undefined, angle);
    } else {
        console.log("newObsForTag: angle not found")
        rect = addRect(tag.id, 
               pt.x - default_width / 2, 
               pt.y - default_height / 2,
               default_width, default_height, "new");
    }
    return rect
}
function newRectForCurrentTag() {
    if ($('#newRectForCurrentTag').hasClass('disabled')) {
        return;
    }
    let id = getCurrentID()
    if (id==null) {
        printMessage('No current tag selected','red')
        return;
    }
    let tag = getCurrentTag()
    if (tag==null) {
        printMessage('Current tag not visible in this frame. Try Next or Prev event','red')
        return;
    }
    let r=getSelectedRect()
    if (r!=null) {
        printMessage('Current tag already annotated','red')
        return;
    }
    var rect = newRectForTag(tag)
    
    overlay.canvas1.setActiveObject(rect);
    overlay.canvas1.renderAll();
    
    submit_bee();
}

/* Create new rect from prediction */
function onMouseDown_predict(option) {
    var startX = option.e.offsetX, startY = option.e.offsetY;
    let canvasXY = {x: startX, y: startY}
    let videoXY = overlay.canvasToVideoPoint(canvasXY)
    var rect;
    
    if (logging.mouseEvents) {
        console.log('onMouseDown_predict: no object selected', option)
        console.log('onMouseDown_predict: currentID=', getCurrentID())
    }

    // predictId takes video/obs coordinates units
    //let prediction = predictId(getCurrentFrame(), videoXY, "pointinside");
    let f = getCurrentFrame()
    let interval = [f-overlay.trackWindow.backward, f+overlay.trackWindow.forward]
    if (interval[0]<0) interval[0]=0
    if (interval[1]>=videoinfo.nframes) interval[1]=videoinfo.nframes-1
    let prediction = predictIdFromObsMultiframe(interval,videoXY, "distance")
    prediction = defaultIfIDExists(prediction)
    let predictionTag = predictIdFromTags(getCurrentFrame(), videoXY, "distance");
    //$("#I").val(prediction.id)
  
    if (logging.mouseEvents) {
        console.log('onMouseDown_predict: predictId         --> prediction=',prediction)
        console.log('onMouseDown_predict: predictIdFromTags --> predictionTag=',predictionTag)
    }

    if (predictionTag.id !== undefined) {
        // If found a tag on this frame
        if (logging.mouseEvents)
            console.log("onMouseDown_predict: predictionTag=", predictionTag)
        let tag = predictionTag.tag;
        let pt = overlay.videoToCanvasPoint({x:tag.c[0], y:tag.c[1]});
      
        if (prediction.obs && prediction.id==tag.id) {
            // If found a rect with same id as tag on adjacent frame
            let obs = prediction.obs;
            
            if (logging.mouseEvents)
                console.log("onMouseDown_predict: copying rect from tag ", tag, " and obs ",obs)
            
            // Copy rectangle from source of prediction
            // addRect takes canvas coordinates units
            let r = overlay.obsToCanvasRect(obs)
            rect = addRect(prediction.id, r.left, r.top, r.width, r.height, "new");
            rect.obs.bool_acts[0] = obs.bool_acts[0]; // Copy fanning flag
            rect.obs.bool_acts[1] = obs.bool_acts[1]; // Copy pollen flag
        } else {
            // Only found tag
            if (logging.mouseEvents)
                console.log("onMouseDown_predict: copying rect from tag ", tag)
            
            rect = newRectForTag(tag)
        }

    } else if (prediction.obs) {
        // Only found rect
        let obs = prediction.obs;
        
        if (logging.mouseEvents)
            console.log("onMouseDown_predict: prediction obs=", obs)
        
        // Copy rectangle from source of prediction
        // addRect takes canvas coordinates units
        let r = overlay.obsToCanvasRect(obs)
        let width = r.width,
            height = r.height
        rect = addRect(prediction.id, startX - width / 2, startY - height / 2, width, height, "new");
        rect.obs.bool_acts[0] = obs.bool_acts[0]; // Copy fanning flag
        rect.obs.bool_acts[1] = obs.bool_acts[1]; // Copy pollen flag
        if (logging.mouseEvents)
            console.log("onMouseDown_predict: copied rect from ", obs)
    } else {
        let id = getCurrentID()
        if (id==null || getObsHandle(getCurrentFrame(), id, false) !== undefined) {
            id = prediction.id;
        }
        while (getObsHandle(getCurrentFrame(), id, false) !== undefined) {
            id = id+1
        }
        // Did not find any tag nor rect
        rect = addRect(id, startX - default_width / 2, startY - default_height / 2,
            default_width, default_height, "new");
        if (logging.mouseEvents)
            console.log("onMouseDown_predict: did not find tag or event, created new rect with default size ", rect)
    }
    rect.setCoords();
    overlay.canvas1.setActiveObject(rect);
    overlay.canvas1.renderAll();

    //automatic_sub();
    submit_bee();
    // Fire mouse:down again, this time with the created target
    // overlay.canvas1.fire("mouse:down", {
    //     target: rect,
    //     e: option.e
    // })
}

/* Create new rectangle interactively (dragging) */
function onMouseDown_interactiveRect(option) {
    if (logging.mouseEvents)
        console.log("onMouseDown_interactiveRect: new rect at ", startX, startY)

    var startX = option.e.offsetX, startY = option.e.offsetY;

    let canvasXY = {x: startX, y: startY}
    let clientXY = {x: option.e.clientX, y: option.e.clientY}
    let videoXY = overlay.canvasToVideoPoint(canvasXY)
    //let prediction = predictId(getCurrentFrame(), videoXY, "distance_topleft");

    let f = getCurrentFrame()
    let interval = [f-overlay.trackWindow.backward, f+overlay.trackWindow.forward]
    if (interval[0]<0) interval[0]=0
    if (interval[1]>=videoinfo.nframes) interval[1]=videoinfo.nframes-1
    let prediction = predictIdFromObsMultiframe(interval,videoXY, "distance")
    prediction = defaultIfIDExists(prediction)
    if (logging.mouseEvents)
        console.log("onMouseDown_interactiveRect: prediction", prediction,'from videoXY',videoXY)

    $("#I").val(prediction.id)

    let id = prediction.id;
        
    var rect = addRect(id, startX, startY, 1, 1, "new");
    var topleft = { x: startX, y: startY }

    var center = rect.getCenterPoint()
    rect.hasControls = false; // Do not show controls when creating
    overlay.canvas1.setActiveObject(rect);
    //canvas1.renderAll();

    var onMouseMove_interactiveRect = function(option) {
        if (logging.mouseMoveEvents)
            console.log("onMouseMove_interactiveRect: option=", option);
        var e = option.e;

        rect.validated = true; // Need dragging a bit to validate the rectangle

        let delta = {x: e.clientX - clientXY.x, y: e.clientY - clientXY.y}

        if (overlay.opts.resizeAroundCenter) {
            let w = delta.x * 2,
                h = delta.y * 2;
            rect.set({
                width: w,
                height: h,
                // Note: Fabric.js quirk with originX=originY='center':
                // left,top means centerX,centerY !!!
                left: center.x, 
                top: center.y
            });
        } else {
            let w = delta.x,
                h = delta.y;
            rect.set({
                width: w,
                height: h,
                // Note: Fabric.js quirk with originX=originY='center':
                // left,top means centerX,centerY !!!
                left: topleft.x+w/2,
                top: topleft.y+h/2
            });
        }
        rect.setCoords();

        //canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
        overlay.canvas1.renderAll(); // Refresh rectangles drawing

        updateForm(rect);
    }
    var onMouseUp_interactiveRect = function(e) {
        if (logging.mouseEvents)
            console.log("onMouseUp_interactiveRect: e=", e);
        overlay.canvas1.off('mouse:move', onMouseMove_interactiveRect);
        overlay.canvas1.off('mouse:up', onMouseUp_interactiveRect);

        var activeObject = rect;
        if (logging.mouseEvents)
            console.log('onMouseUp_interactiveRect: rect=', rect, 'active=', overlay.canvas1.getActiveObject())
        if (activeObject.validated) {        
            fixRectSizeAfterScaling(activeObject) // Fix negative width or height
            updateRectObsGeometry(activeObject) // Copy geometry to obs
                //canvas1.deactivateAll()
            rect.hasControls = true; // Reactivate controls when created
            overlay.canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
            overlay.canvas1.renderAll();

            // Update default size to latest rectangle created
            default_width = activeObject.width;
            default_height = activeObject.height;

            // updateForm(activeObject)
            // $('#I')[0].focus() // Set focus to allow easy ID typing
            // $('#I')[0].select()
            
            // printMessage("Press enter to validate ID", "green")

            updateForm(activeObject)
            submit_bee()
        } else {
            // Not enough drag to define a new rectangle
            overlay.canvas1.deactivateAll()
            overlay.canvas1.remove(activeObject);
            //canvas1.renderAll();
            //$("#I").val("no selection")
            if (logging.mouseEvents)
                console.log('onMouseUp: removing non validated activeObject=', activeObject)
            deselectBee()
        }
        videoControl.refresh();
    }

    overlay.canvas1.on('mouse:up', onMouseUp_interactiveRect);
    overlay.canvas1.on('mouse:move', onMouseMove_interactiveRect);
    return rect;
}

/* Find close trajectory tag, go to frame and select tag */
function onMouseDown_selectMultiframe(option) {
    console.log('onMouseDown_selectMultiframe: option=',option)
    
    let ptCanvas = {x: option.e.offsetX, y: option.e.offsetY}
    let pt = overlay.canvasToVideoPoint(ptCanvas)

    var tmp

    let clickMultiframe = true
    if (!clickMultiframe) {
      tmp = predictIdFromTags(getCurrentFrame(), pt)
    
      if (tmp.id != null) {
          console.log('onMouseDown_selectMultiframe: found id=',tmp.id)
          selectBeeByID(tmp.id)
          videoControl.refresh()
      } else {
          deselectBee()
      }

    } else {
        let done = false
        if (showObsTracks) {
            tmp = predictIdFromObsMultiframe(
                        [getCurrentFrame()-overlay.trackWindow.backward, 
                         getCurrentFrame()+overlay.trackWindow.forward], pt)
    
            if (tmp.id != null) {
              console.log('onMouseDown_selectMultiframe: found Obs id=',tmp.id, 'frame=', tmp.frame)
              selectBeeByIDandFrame(tmp.id,tmp.frame)
              done = true
            }
        }
        if (!done && (showTagsTracks || showSelectedTagsTracks)) {
            tmp = predictIdFromTagsMultiframe(
                        [getCurrentFrame()-overlay.trackWindow.backward, 
                         getCurrentFrame()+overlay.trackWindow.forward], pt)
    
            if (tmp.id != null) {
              console.log('onMouseDown_selectMultiframe: found Tag id=',tmp.id, 'frame=', tmp.frame)
              selectBeeByIDandFrame(tmp.id,tmp.frame)
              done = true
            }
        }
        if (!done) {
            console.log('onMouseDown_selectMultiframe: not found Obs nor Tag')
            deselectBee()
            videoControl.refresh()
        }
    }
    
}

/* Canvas zoom and pan */
function onMouseDown_panning(option) {
    let panning={}
    panning.p0 = {
        x:  option.e.clientX,
        y:  option.e.clientY
    }
    panning.canvasTransform0 = [...canvasTransform]
    panning.canvasTransform = [...canvasTransform]
    if (logging.mouseMoveEvents)
        console.log("onMouseDown_panning: option=", option);

    var onMouseMove_panning = function(option) {
        if (logging.mouseMoveEvents)
            console.log("onMouseMove_panning: option=", option);
        var e = option.e;
        let dx = e.clientX-panning.p0.x
        let dy = e.clientY-panning.p0.y
        
        panning.canvasTransform[4] = panning.canvasTransform0[4]-dx*panning.canvasTransform0[0]
        panning.canvasTransform[5] = panning.canvasTransform0[5]-dy*panning.canvasTransform0[3]
        overlay.canvasTransformSet(panning.canvasTransform)
        
        //canvasTransform_Fix()

        videoControl.refresh()
    }
    var onMouseUp_panning = function(e) {
        if (logging.mouseEvents)
            console.log("onMouseUp_panning: e=", e);
        overlay.canvas1.off('mouse:move', onMouseMove_panning);
        overlay.canvas1.off('mouse:up', onMouseUp_panning);

        videoControl.refresh();
    }

    overlay.canvas1.on('mouse:up', onMouseUp_panning);
    overlay.canvas1.on('mouse:move', onMouseMove_panning);
}

function onMouseDown(option) {
    if (logging.mouseEvents)
        console.log('onMouseDown: option=', option)
    
    videoControl.pause()
    
    printMessage("")

    if (option.e.altKey) {
        if (logging.mouseEvents)
             console.log('onMouseDown: panning', option)
        onMouseDown_panning(option)
        return
    }
    if (overlay.opts.clickModeNewAnnotation) {
        if ((typeof option.target != "undefined")
             //&& (overlay.previouslySelected.id == option.target.id)
             ) {
            // Allow to move currentlu selected annotation
            // Workaround: previouslySelected used because lastSelected is updated during mouseDown
            return false
        }
        if (logging.mouseEvents)
             console.log('onMouseDown: create object', option)
        // By default, create new annotation
        // Try to copy prediction
        // or create box centered on click if none
        onMouseDown_predict(option)        
        //printMessage('Note: Click creates new annotations. If you want to select instead, deselect option "Click Mode/New annotation"','blue')
        // Animate the New annotation button to remind the user of current mode
        $('.overlayOpts-clickModeNewAnnotation').effect({'effect':"highlight","duration":200,"color":"#ffff00"})
        //$('.overlayOpts-clickModeNewAnnotation').effect({'effect':"pulsate","duration":100,"times":2})
        return false
    }

    if (typeof option.target != "undefined") {
        // Clicked on an existing object
        if (logging.mouseEvents)
            console.log("onMouseDown: Clicked on object ", option.target)
        // This is now handled by event onObjectSelected()
        return false;
    } else {
        // Clicked on the background
        if (logging.mouseEvents)
            console.log('onMouseDown: no object selected', option)

        if (option.e.shiftKey) {
            // If SHIFT down, try to copy prediction
            // or create box centered on click if none
            onMouseDown_predict(option)
        } else if (option.e.ctrlKey) {
            // If CTRL key, draw the box directly. Try to predict ID using TopLeft corner        
            onMouseDown_interactiveRect(option)
        } else if (overlay.opts.clickModeSelectMultiframe) {
            // If no key, background click: try to select trajectory
            onMouseDown_selectMultiframe(option)
            //$('.overlayOpts-clickModeSelectMultiframe').effect({'effect':"highlight","duration":500,"color":"#ffff00"})
        } else {
            // Do nothing, just deselected
        }
    }
}


extraScale = 1
function onMouseWheel(option) {
    if (option.altKey && option.ctrlKey) onMouseWheel_Zooming(option);
    else if (option.altKey) onMouseWheel_Panning(option);
    // else, ignore
}
function onMouseWheel_Zooming(option) {
    //if (!option.shiftKey) return;
    if (logging.mouseEvents)
        console.log('onMouseWheel_Zooming: option=', option)
    let delta = option.originalEvent.wheelDelta;
    
    let scaling = Math.pow(2,delta/512)
    
    //var rect = canvas.getBoundingClientRect();
    //let cx = option.originalEvent.clientX - rect.left
    //let cy = option.originalEvent.clientY - rect.top
    cx = option.originalEvent.offsetX
    cy = option.originalEvent.offsetY

    let center = [cx, cy]
    
    overlay.canvasTransformScale(scaling, center)
    
//     extraScale *= scaling
//     if (extraScale<1) extraScale = 1
    if (logging.mouseEvents) {
        console.log('onMouseWheel: scaling=', scaling, ' center=', center)
        console.log('onMouseWheel: canvasTransform=', canvasTransform)
    }
    
    videoControl.refresh()
    option.preventDefault();
}
function onMouseWheel_Panning(option) {
    //if (!option.shiftKey) return;
    let deltaX = option.originalEvent.wheelDeltaX;
    let deltaY = option.originalEvent.wheelDeltaY;
    if (logging.mouseEvents)
        console.log('onMouseWheel_Panning: deltaX=', deltaX, ' deltaY=',deltaY)
    
    overlay.canvasTransformPan(deltaX, deltaY)
    
    videoControl.refresh()
    option.preventDefault();
}

function onMouseDown2(ev) {
   if (ev.ctrlKey) {
      console.log("onMouseDown2",ev);
      
      ev.preventDefault();
      return false;
   }
   console.log("onMouseDown2");
   return true;
}

// REMI: Scaling arectangle in Fabric.js does not change width,height: it changes only scaleX and scaleY
// fix this by converting scaleX,scaleY into width,height change
function fixRectSizeAfterScaling(rect) {
    if (logging.mouseMoveEvents)
        console.log('fixRectSizeAfterScaling: rect=',rect)

    rect.set('width', rect.get('width') * rect.get('scaleX'));
    rect.set('scaleX', 1);
    rect.set('height', rect.get('height') * rect.get('scaleY'));
    rect.set('scaleY', 1);

    // Fix also negative width and height
    if (rect.get('width') < 0) {
        rect.set('width', -rect.get('width'));
        rect.set('left', rect.get('left') - rect.get('width'));
    }
    if (rect.get('height') < 0) {
        rect.set('height', -rect.get('height'));
        rect.set('top', rect.get('top') - rect.get('height'));
    }
    rect.setCoords();

    // Update default size when rectangle is created by just clicking
    default_width = rect.get('width');
    default_height = rect.get('height');
}

function onMouseUp(option) {
    if (logging.mouseEvents)
        console.log('onMouseUp: option=', option)
    // All mouseUp stuff should be handled directly by ad-hoc callbacks
    // attached/detached in mouseDown code
}

// #MARK # FABRICJS EVENTS

function onObjectSelected(option) {
    if (logging.selectionEvents)
        console.log("onObjectSelected:", option)
    //var activeObject = canvas1.getActiveObject();
    if (typeof option.target.id != "undefined") {
        if (option.target.id != overlay.getActiveObject().id) {
            console.log('ERROR in onObjectSelected: option.target.id != canvas1.getActiveObject().id', option.target.id, overlay.getActiveObject().id)
        }
        overlay.previouslySelected = overlay.lastSelected
        selectBee(option.target)
        overlay.lastSelected = option.target
        updateDeleteButton()
    }
}

function onObjectDeselected(option) {
    if (logging.selectionEvents)
        console.log("onObjectDeselected: ", option);
       
    if (overlay.lastSelected !== null) {
        if (overlay.lastSelected.status=="new") {
            if (logging.mouseEvents)
                console.log('onObjectDeselected: removing non submitted lastSelected=', overlay.lastSelected)

            // Remove tmp rect as soon as it becomes inactive
            overlay.canvas1.remove(overlay.lastSelected);
            overlay.lastSelected = null
            videoControl.refresh()
        }
        updateDeleteButton()
    }
}

function onObjectMoving(option) {
    //return; // No real need for Moving, we can update everything once at the end in onObjectModified

    // Called during translation only
    var activeObject = option.target; //canvas1.getActiveObject();
    if (logging.mouseMoveEvents)
      console.log("onObjectMoving: activeObject=", activeObject);
    
    fixRectSizeAfterScaling(activeObject)
    updateRectObsGeometry(activeObject)

    //canvas1.renderAll(); // Refresh rectangles drawing
    overlay.refreshOverlay()
    
    updateForm(activeObject);
    //automatic_sub();
    
    $(overlay).trigger('object:moving')
    //zoomOverlay.selectionChanged()
}

function onObjectModified(option) {
    // Called after translation or scaling
    var activeObject = option.target; //canvas1.getActiveObject();
    fixRectSizeAfterScaling(activeObject)
    if (logging.mouseEvents)
      console.log("onObjectModified: activeObject=", activeObject);
    
    updateRectObsGeometry(activeObject)

    //canvas1.renderAll(); // Refresh rectangles drawing
    overlay.refreshOverlay()
    updateForm(activeObject);
    //showZoom(activeObject)
    automatic_sub();
    
    $(overlay).trigger('object:modified')
    //zoomOverlay.selectionChanged()
}


