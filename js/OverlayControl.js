/*jshint esversion: 6, asi: true */

// ## Video + canvas

function OverlayControl(canvasTagId) {
    if (this === window) { 
        console.log('ERROR: OverlayControl should be created with "new OverlayControl()"')
        return new OverlayControl(); 
    }
    
    // Events:
    // overlay.on('trackWindow:change',...)

    if (typeof canvasTagId === 'undefined')
        canvasTagId = 'canvas'; // Default HTML5 canvas tag to attach to
    canvas = document.getElementById(canvasTagId);
    ctx = canvas.getContext('2d');

    /* Obs and Tags plotting params */
    trackWindow = 200 // 10s
    plotTrack_range_backward = trackWindow;
    plotTrack_range_forward = trackWindow;
    $('#trackWindow').val(trackWindow)

    flag_useROI=false
    ROI = {left:175,top:30,right:2305,bottom:1240} // For Gurabo videos 5MP
    $('#ROI').val([ROI.left,ROI.top,ROI.right,ROI.bottom].join(','))
    //$(videoControl).on('video:loaded', updateROIFromVideo)

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

    /* Overlay and selection */

    canvas1 = new fabric.Canvas('canvas1');
    ctx1 = $('#canvas1')[0].getContext('2d');
    
    this.canvas1 = canvas1;

    canvas1.selectionColor = "red";
    canvas1.selectionBorderColor = "red";
    canvas1.selection = false; // REMI: disable the blue selection (allow to select several rectangles at once, which poses problem)
    canvas1.uniScaleTransform = true; // REMI: allow free rescaling of observations without constrained aspect ratio
    //canvas1.centeredScaling = true; // REMI: rescale around center
    
    canvas1.on('mouse:down', onMouseDown);
    canvas1.on('mouse:up', onMouseUp);
    canvas1.on('object:moving', onObjectMoving); // During translation
    canvas1.on('object:scaling', onObjectMoving); // During scaling
    canvas1.on('object:modified', onObjectModified); // After modification
    canvas1.on('object:selected', onObjectSelected); // After mousedown
    canvas1.on('selection:cleared', onObjectDeselected); // After mousedown out of existing rectangles

    //$('#video').on('mouseDown', onMouseDown);    
    $('.upper-canvas').bind('contextmenu', onMouseDown2);
    $('.upper-canvas').bind('wheel', onMouseWheel);

    /* Canvas transform */

    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#canvasresize").on( "resizestop", refreshCanvasSize );
    //$("#canvasresize").on( "resize", refreshCanvasSize ); // Continuous (not working)
    
    transformFactor = 1.0;
    canvasTransform = [1,0, 0,1, 0,0]  // Global
    canvasTransformReference = {w:100, h:100} // Keep previous canvas size
}


function canvasSetVideoSize(w,h) {
    // Resize canvas to have same aspect-ratio as video

    var wd=w,hd=h
    if (true) {
      // Keep same canvas width as before, simply adjust aspect-ratio
      wd = canvas.width
      hd = h*canvas.width/w
    } else {
        // Automatic scaling to be smaller than 800pix
        while (wd>800) {
            wd/=2.0
            hd/=2.0
        }
    }

    $("#canvasresize")[0].style.width = (wd+16).toString() + 'px'
    $("#canvasresize")[0].style.height = hd.toString() + 'px'
    $("#canvasresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: w / h
    });

    refreshCanvasSize()
    canvasTransformReset()
}
function refreshCanvasSize(event, ui) {
    // Refresh based on new video size or new canvas size
    if (logging.canvasEvents) {
        console.log('refreshCanvasSize: event=',event)
        console.log('refreshCanvasSize: event.target.clientWidth=',event.target.clientWidth)
    }
        
    // Internal canvas size adjusting utility
    // Ensures all canvas elements have same size
    function resizeCanvas(w,h) {    
        if (logging.canvasEvents)
            console.log('refreshCanvasSize.resizeCanvas: w=',w," h=",h)
    
        canvas.width = w
        canvas.height = h
        canvas1.setWidth(w)
        canvas1.setHeight(h)
    
        $("#video").width(w)
        $("#video").height(h)
    
        var wrap = $('.canvaswrapper')[0]
        wrap.style.width = w.toString() + 'px'
        wrap.style.height = h.toString() + 'px'
    }
        
    let video = $('#video')[0]
    // Assume width is in px to parse #canvasresize size
    let wd = parseInt($("#canvasresize")[0].style.width)-16
    let hd = video.videoHeight/video.videoWidth*wd
        
    resizeCanvas(wd,hd)
    
    $("#videoSize")[0].innerHTML = 'videoSize: '+video.videoWidth.toString() + 'x' + video.videoHeight.toString();
    $("#canvasSize")[0].innerHTML = 'canvasSize: '+wd.toString() + 'x' + hd.toString();


    // Change transform to keep same image content, just scaled    
    var scaling = canvasTransformReference.w/canvas.width
    var center = [canvasTransformReference.w/2, canvasTransformReference.h/2] 
    var center2 = [canvas.width/2, canvas.height/2]
    canvasTransformReference.w = canvas.width
    canvasTransformReference.h = canvas.height
    
    canvasTransformScale(scaling, center, center2)
    
    // Don't use ctx.transform, as it also reduces the drawings overlays
    // Instead, we scale everything manually
    //var ctx=canvas.getContext("2d");
    //ctx.transform(...canvasTransform);
    //var ctx1=canvas1.getContext("2d");
    //ctx1.transform(...canvasTransform);
        
    videoControl.refresh() // Already done in canvasTransformScale()
}

function canvasTransformInternalReset() {
    let video = $('#video')[0]
    transformFactor = video.videoWidth / canvas.width;
    canvasTransformSet([transformFactor,0, 0,transformFactor, 0,0])
    canvasTransformReference.w = canvas.width
    canvasTransformReference.h = canvas.height
}
function canvasTransformReset() {
    canvasTransformInternalReset()
    canvasTransform_Fix()    
    videoControl.refresh()
}
function canvasTransformSet(array) {
    for (let i=0; i<6; i++) {
        canvasTransform[i]=array[i]
    }
    canvasTransform_Fix()
    videoControl.refresh()
}
function canvasTransform_Fix() {
    let video = $('#video')[0]
    let w1 = canvas.width
    let h1 = canvas.height
    let w2 = video.videoWidth
    let h2 = video.videoHeight
    
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
        canvasTransformInternalReset()
    }
}
function canvasTransformScale(scaling, center, center2) {
    // center is scaling center in current canvas coordinates
    // center2 (optional) is scaling center in new canvas coordinates
    /*
    if (canvasTransform[0]*scaling > transformFactor) 
        scaling = transformFactor/canvasTransform[0] 
        // Can not zoom out more than initial
    */
    
    //center[1]+=2
    //center[0]+=2
    
    if (typeof center2 === 'undefined')
        center2 = center;
        
    //console.log('canvasTransformScale: center=',center)
    canvasTransform[4]+=canvasTransform[0]*(center[0]-scaling*center2[0])
    canvasTransform[5]+=canvasTransform[3]*(center[1]-scaling*center2[1])
    canvasTransform[0]=canvasTransform[0]*scaling
    canvasTransform[3]=canvasTransform[3]*scaling
    
    canvasTransform_Fix()
    
    videoControl.refresh()
}
function canvasTransformPan(dx, dy) {
    canvasTransform[4] -= dx * canvasTransform[0]
    canvasTransform[5] -= dy * canvasTransform[3]
    
    canvasTransform_Fix()
    
    videoControl.refresh()
}

function obsToCanvasRect(obs) {
    let R = {left:obs.x, top:obs.y, width:obs.width, height: obs.height}
    let R2 = videoToCanvasRect(R)
    return R2
}
function canvasToVideoPoint(pt) {
    return {
      x: canvasTransform[0]*pt.x+canvasTransform[4],
      y: canvasTransform[3]*pt.y+canvasTransform[5]
      }
}
function videoToCanvasPoint(pt) {
    return {
      x: (pt.x-canvasTransform[4])/canvasTransform[0],
      y: (pt.y-canvasTransform[5])/canvasTransform[3]
      }
}
function canvasToVideoRect(rect) {
    return {
      left: canvasTransform[0]*rect.left+canvasTransform[4],
      top: canvasTransform[3]*rect.top+canvasTransform[5],
      width: canvasTransform[0]*rect.width,
      height: canvasTransform[3]*rect.height,      
      }
}
function videoToCanvasRect(rect) {
    return {
      left: (rect.left-canvasTransform[4])/canvasTransform[0],
      top: (rect.top-canvasTransform[5])/canvasTransform[3],
      width: rect.width/canvasTransform[0],
      height: rect.height/canvasTransform[3]   
      }
}

// ## Fabric.js rects vs observations

function refreshOverlay() {
    if (canvas1) {
        refreshRectFromObs()
        canvas1.renderAll(); // Clear and render all rectangles
        
        if (showObsTracks) {
            plotTracks(ctx);
        }
        plotROI()
        
        //plotBees(ctx1); // Not needed, identification done directly in BeeRect
        
        if (showTagsTracks || showSelectedTagsTracks)
            plotTagsTracks(ctx)
        else if (showTags)
            plotTags(ctx)
    }
}

function refreshRectFromObs() {
    let rectList = canvas1.getObjects()
    //if (logging.overlay)
    //    console.log("refreshRectFromObs: updating ",rectList.length," rect(s)")
    for (let rect of rectList) {
        if (typeof rect.obs !== 'undefined')
            updateRectFromObsGeometry(rect)
    }
    //refreshOverlay() // Avoid infinite cycle
}
function updateRectFromObsGeometry(rect) {
    if (logging.overlay)
        console.log('updateRectFromObsGeometry: rect=',rect)
    let obs = rect.obs
    if (typeof obs === 'undefined') {
        console.log('updateRectFromObsGeometry: activeObject.obs undefined')
        return
    }

    let canvasRect = obsToCanvasRect(obs)
    
    let cx = (canvasRect.left + canvasRect.width / 2);
    let cy = (canvasRect.top + canvasRect.height / 2);
    //let cx = canvasRect.left;
    //let cy = canvasRect.top;
    
    // CAUTION: rect.left/top are misnamed. When originX/originY='center', they
    // Correspond to rectangle center
    rect.setLeft(cx)     // unrotated left (rotation around center)
    rect.setTop(cy)      // unrotated top
    rect.setWidth(canvasRect.width)
    rect.setHeight(canvasRect.height)
    rect.setAngle(obs.angle)
    rect.setCoords()
}
function createRectsFromTracks(F) {
    if (typeof F === 'undefined')
        F = getCurrentFrame()
    let ids = getValidIDsForFrame(F)
    if (logging.overlay)
        console.log("createRectsFromTracks: ",{frame:F,ids:ids})
    for (let id of ids) { // For each valid bee ID, create a rect for it
        let obs = getObsHandle(F, id, false)
        addRectFromObs(obs)
    }
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
        //hasRotatingPoint: true,
        //lockRotation: false
    });
    rect.originX = 'center'
    rect.originY = 'center'

    //rect.setAngle(obs.angle); // Done in update
    updateRectFromObsGeometry(rect)
    
    //rect.setControlVisible('mtr', false)  // Remove rotation handle
    canvas1.add(rect);
    
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
    console.log(rect)
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
        
        identifyBeeRect(ctx, this, 5);
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
        let videoRect = canvasToVideoRect(canvasRect)
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

    var rects = canvas1.getObjects();
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

function updateRectObsGeometry(activeObject) {
    if (logging.overlay)
        console.log('updateRectObsGeometry: activeObject=',activeObject)

    let geom = rotatedRectGeometry(activeObject);
    let videoRect = canvasToVideoRect(geom.unrotated)
    
    // Update Observation attached to rectangle from current Rect size
    let obs = activeObject.obs
    obs.x = videoRect.left    // unrotated left (rotation around center)
    obs.y = videoRect.top     // unrotated top
    obs.width = videoRect.width
    obs.height = videoRect.height
    obs.angle = activeObject.angle    
    obs.cx = (videoRect.left + videoRect.width / 2);
    obs.cy = (videoRect.top + videoRect.height / 2);
}
function updateRectObsActivity(activeObject) {
    // Update Observation attached to rectangle from Form information
    let obs = activeObject.obs
    updateObsActivityFromForm(obs)
}
function updateObsActivityFromForm(obs) {
    // Update Observation attached to rectangle from Form information
    obs.bool_acts[0] = $('#F').prop('checked');
    obs.bool_acts[1] = $('#P').prop('checked');
    obs.bool_acts[2] = $('#E').prop('checked');
    obs.bool_acts[3] = $('#L').prop('checked');
    obs.notes = $('#notes').prop('value')
    
    if (logging.guiEvents)
        console.log("updateObsActivityFromForm: obs=", obs)
}

// ## Direct canvas drawing

// # Bee ID and their tracks

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
    ctx.fillText(String(rect.id), x, y - radius - 3);

    let acti = activityString(rect.obs)

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(acti, x, y + radius + 3);
    ctx.textBaseline = 'alphabetic';
}
function identifyBeeRect(ctx, rect, radius) {

    var color
    if (rect.status === "new")
        color = "green"
    else if (rect.status === "db")
        color = "yellow"
    else
        color = "red" //problem

    // Local coordinates ?
    let x = 0
    let y = 0
    
    //console.log('identifyBeeRect ctx=',ctx, x,y)

    ctx.save()
    
    // Compensate rotation to have upright labels
    ctx.rotate(-rect.angle/180*Math.PI)

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.closePath();
    ctx.fill();

    ctx.font = "20px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(String(rect.id), x, y - radius - 3);

    let acti = activityString(rect.obs)

    ctx.font = "10px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(acti, x, y + radius + 3);
    ctx.textBaseline = 'alphabetic';
    
    if (typeof rect.obs.notes !== 'undefined') {
        ctx.font = "10px Arial";
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        wrapText(ctx, rect.obs.notes, x, y + radius + 3 + 12, 80, 10)
    }
    
    ctx.restore()
}



/* Obs tracks */
function plotTracks(ctx) {
    let F = getCurrentFrame()

    let frange = Math.max(plotTrack_range_backward,plotTrack_range_forward)*1.2;
    let fmin = F-plotTrack_range_backward;
    let fmax = F+plotTrack_range_forward;
    if (fmin<0) fmin=0;
    //if (fmax>maxframe) fmax=maxframe;
    
    //let ids = getValidIDsForFrame(F)
    let ids = getValidIDsForFrames([fmin,fmax])

    setColor = function(f) {
        if (f<=F) {
            color = "rgba(255,0,0,"+(1-Math.abs((f-F)/frange))+")"
            //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
        } else {
            color = "rgba(0,128,0,"+(1-Math.abs((f-F)/frange))+")"
        }
        return color;
    }

    for (let id of ids) { // For each valid bee ID, create a track for it
        let obs = getObsHandle(fmin, id, false)
        let x=undefined, y=undefined, z=0;
        if (!!obs) {
            let rect = obsToCanvasRect(obs)
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
            let rect = obsToCanvasRect(obs)            
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
            ctx.strokeStyle = setColor(f);
            ctx.stroke();
            ctx.strokeStyle = "none"
            ctx.setLineDash([])
            
            x=x2; y=y2; z=z2;
        }
        for (let f=fmin; f<=fmax; f++) {
            if (f==F) continue;
        
            let obs = getObsHandle(f, id, false)
            if (!obs) continue;
            let rect = obsToCanvasRect(obs)
            
            //let geom = rotatedRectGeometry(rect)
            x = rect.left+rect.width/2
            y = rect.top+rect.height/2
    
//             if (f-F<0)
//                 color = "red"
//             else
//                 color = "green"
            color = setColor(f);
                
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
    showObsTracks = $("#showObsTrack")[0].checked
    videoControl.refresh()
}


// # Tags and their tracks

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
          ppt[i] = videoToCanvasPoint({"x":tag.p[i][0], "y":tag.p[i][1]})
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

    let pt = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
    
    if (isCurrentSelection(tag.id)) {
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
      
        if (tag.frame == getCurrentFrame()) {
            if (showTagsOrientation) {
                plotTagOrientation(ctx, tag, '#00ff00')
            } else {
                ctx.beginPath();
                ctx.moveTo(pt.x-20,pt.y)
                ctx.lineTo(pt.x+20,pt.y)
                ctx.moveTo(pt.x,pt.y-20)
                ctx.lineTo(pt.x,pt.y+20)
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 3;
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore()
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
      let pt = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
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


function plotTrackArrow(p0, p1, L) {
    let u = {x:p1.x-p0.x, y:p1.y-p0.y}
    let n = Math.sqrt(u.x*u.x+u.y*u.y)
    u.x=u.x/n
    u.y=u.y/n
    ctx.beginPath();
    ctx.moveTo(p1.x+L*(-u.x-0.6*u.y) ,p1.y+L*(-u.y+0.6*u.x))
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p1.x+L*(-u.x+0.6*u.y) ,p1.y+L*(-u.y-0.6*u.x))
    ctx.stroke()
}

/* Tag tracks */
function plotTagsTracks(ctx) {
    let F = getCurrentFrame()
    let frange = Math.max(plotTrack_range_backward,plotTrack_range_forward)*1;
    let fmin = F-plotTrack_range_backward;
    let fmax = F+plotTrack_range_forward;
    if (fmin<0) fmin=0;
    //if (fmax>maxframe) fmax=maxframe;

    let tProx = function(f) {
        return (1-Math.abs((f-F)/frange))
    }
    let tProxSigned = function(f) {
        return ((f-F)/frange)
    }
    let setColor = function(f) {
        if (false) {
            let T = tProx(f)
            if (f<=F) {
                color = "rgba(255,0,0,"+T+")"
                //ctx.strokeStyle = "rgba(255,0,0, 0.5)"
            } else {
                color = "rgba(0,0,255,"+T+")"
            }
        } else {
            let T = tProx(f)
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
    let p0 = []
    for (let f=fmin; f<=fmax; f++) {
        let tagsFrame = Tags[f]
        if (typeof(tagsFrame) === "undefined") continue;
        let tags = tagsFrame.tags
        let color = setColor(f)
        for (let i in tags) {
            let tag = tags[i]
            
            if (!tagsSampleFilter(tag)) {
                    continue
                }
            
            //console.log(tag)
            let p1 = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
            
            if (typeof p0[tag.id] !== 'undefined') {
                ctx.save()
                ctx.beginPath();
                ctx.moveTo(p0[tag.id].x,p0[tag.id].y)
                ctx.lineTo(p1.x,p1.y)
                ctx.strokeStyle = color;
                if (tag.hamming<1000)
                    ctx.setLineDash([])
                else
                    ctx.setLineDash([2,2])
                ctx.stroke();
                ctx.setLineDash([])
                plotTrackArrow(p0[tag.id], p1, 6*tProx(f)+1)
                ctx.restore()
            }
            p0[tag.id] = {x:p1.x, y:p1.y}
            
            if (tag.hamming<1000)
              plotTag(ctx, tag, color, {"id":false, "radius": 2*tProx(f)+1})            
            else
              plotTag(ctx, tag, color, {"id":false, "radius": 2*tProx(f)+1})            
        }    
    }
    }
    
    if (showSelectedTagsTracks) {
    // Plot track of selected bee
    if (typeof defaultSelectedBee !== 'undefined') {
        //console.log('defaultSelectedBee=',defaultSelectedBee)
        let p0 = []
        for (let f=fmin; f<=fmax; f++) {
            let tagsFrame = Tags[f]
            if (typeof(tagsFrame) === "undefined") continue;
            let tags = tagsFrame.tags
            let color = setColor(f)
            
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
            
                //console.log(tag)
                let p1 = videoToCanvasPoint({"x":tag.c[0], "y":tag.c[1]})
                

                let T = tProx(f)
                let S = tProxSigned(f)
                let color2
                if (S>0)
                    color2 = "rgba(255,255,0,"+T+")";
                else
                    color2 = "rgba(128,255,128,"+T+")";
            
                if (typeof p0[tag.id] !== 'undefined') {
                    ctx.save()
                    ctx.beginPath();
                    ctx.moveTo(p0[tag.id].x,p0[tag.id].y)
                    ctx.lineTo(p1.x,p1.y)
                    ctx.strokeStyle = color2
                    ctx.lineWidth = T*2
                    if (tag.hamming<1000)
                        ctx.setLineDash([])
                    else
                        ctx.setLineDash([2,2])
                    ctx.stroke();
                    ctx.setLineDash([])
                    plotTrackArrow(p0[tag.id], p1, 6*tProx(f)+1)
                    ctx.restore()
                }
                p0[tag.id] = {x:p1.x, y:p1.y}
                
                plotTag(ctx, tag, color2, {"id":false, "radius": 2*tProx(f)+1})            
            }    
        }
    }
    }
    
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

/* Options */
function onShowTagsChanged() {
    // Callback when display parameters have changed
    showTags = $('#showTags')[0].checked
    showTagsOrientation = $('#showTagsOrientation')[0].checked
    videoControl.onFrameChanged()
}
function onShowTagsTracksChanged() {
    showTagsTracks = $('#showTagsTracks')[0].checked
    showSelectedTagsTracks = $('#showSelectedTagsTracks')[0].checked
    onFrameChanged.onFrameChanged()
}
function onTrackWindowChanged() {
    let range = Number($('#trackWindow')[0].value)
    console.log("onTrackWindowChanged range=",range)
    trackWindow = range
    plotTrack_range_forward = range
    plotTrack_range_backward = range
    
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
function focusTrackWindow() {
    // Actually a Chronogram method
    let f = getCurrentFrame()
    axes.xdomainFocus([f-trackWindow, f+trackWindow])
}

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
function onClickROI() {
    flag_useROI = !flag_useROI;
    if (flag_useROI) {
        $('#useROI').addClass('active')
    } else {
        $('#useROI').removeClass('active')
    }
    ROIChanged()
}

/* Filters */
tagsHammingSampleFilter = function(tag) {return true}
tagsSampleFilter = function(tag) {return true}
tagsIntervalFilter = function(interval) {return true}
tagsIDFilter = function(idinfo) {return true}
tagsSampleFilterROI = function(tag) {return true}
function onTagsParametersChanged() {
    console.log('onTagsParametersChanged')
    // Callback when tags chronogram computation parameters have changed
    tagsSampleFilterCustom = Function("tag",$('#tagsSampleFilter')[0].value)
    
    tagsSampleFilter = function(tag){
          return tagsHammingSampleFilter(tag)
                 &&tagsSampleFilterCustom(tag)
                 &&tagsSampleFilterROI(tag)}
    
    let minLength = Number($('#tagsIntervalFilterMinLength').val())
    
    tagsIntervalFilter = function(interval) {
      let fun = Function("interval",$('#tagsIntervalFilter')[0].value)
      return (interval.end-interval.begin>=minLength) && fun(interval)
    }
    tagsIDFilter = Function("idinfo",$('#tagsIDFilter')[0].value)
    console.log('onTagsParametersChanged:\ntagsSampleFilter=',tagsSampleFilter,
                'tagsIntervalFilter=',tagsIntervalFilter,
                '\ntagsIDFilter=',tagsIDFilter)
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
}
function onChronoParametersChanged() {
    // Callback when chronogram computation parameters have changed
    showTagsChrono = $('#showTagsChrono')[0].checked
    showObsChrono = $('#showObsChrono')[0].checked
    console.log('onChronoParametersChanged:showTagsChrono\n=',showTagsChrono)
    refreshChronogram()
}
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
function plotROI() {

    let R = {left:ROI.left, top:ROI.top, 
             width:ROI.right-ROI.left, 
             height: ROI.bottom-ROI.top}
    let R2 = videoToCanvasRect(R)

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
    ctx.fillRect(0,0,canvas.width,R2.top);
    ctx.fillRect(0,R2.top,R2.left,R2.height);
    ctx.fillRect(R2.left+R2.width,R2.top,
                 canvas.width-R2.left-R2.width,R2.height);
    ctx.fillRect(0,R2.top+R2.height,
                 canvas.width,canvas.height-R2.top-R2.height);
    ctx.restore()
}



/* ### ID prediction */

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
            if (d < predictIdClickRadius && d < out.d) {
                out = {id: id, obs: obs, reason:'distance', d:d, frame:frame};
            }
        }
    }
    return out;
}

predictIdClickRadius = 40
function predictIdFromTags(frame, pt, mode) {
    var tmp = Tags[frame];
    if (tmp == null) return {id: undefined, tag: undefined, reason:'notFound'};
    var frame_tags = tmp.tags;
    if (frame_tags != null) {
        for (let k in frame_tags) {
            let tag = frame_tags[k];
            let d = dist(pt.x, pt.y, tag.c[0], tag.c[1]);
            if (d < predictIdClickRadius) {
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
                if (d < predictIdClickRadius && d < out.d) {
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
    return default_id
}


// ######## Mouse control #######

var default_width = 40;
var default_height = 40;

/* Create new rect from prediction */
function onMouseDown_predict(option) {
    var startX = option.e.offsetX, startY = option.e.offsetY;
    let canvasXY = {x: startX, y: startY}
    let videoXY = canvasToVideoPoint(canvasXY)
    var rect;
    
    if (logging.mouseEvents)
        console.log('onMouseDown: no object selected', option)

    // predictId takes video/obs coordinates units
    let prediction = predictId(getCurrentFrame(), videoXY, "pointinside");
    let predictionTag = predictIdFromTags(getCurrentFrame(), videoXY, "distance");
    //$("#I").val(prediction.id)
  
    if (logging.mouseEvents) {
        console.log('onMouseDown: predictId         --> prediction=',prediction)
        console.log('onMouseDown: predictIdFromTags --> predictionTag=',predictionTag)
    }

    if (predictionTag.id !== undefined) {
        // If found a tag on this frame
        if (logging.mouseEvents)
            console.log("onMouseDown: predictionTag=", predictionTag)
        let tag = predictionTag.tag;
        let pt = videoToCanvasPoint({x:tag.c[0], y:tag.c[1]});
      
        if (prediction.obs && prediction.id==tag.id) {
            // If found a rect with same id as tag on adjacent frame
            let obs = prediction.obs;
            
            if (logging.mouseEvents)
                console.log("onMouseDown: copying rect from tag ", tag, " and obs ",obs)
            
            // Copy rectangle from source of prediction
            // addRect takes canvas coordinates units
            let r = obsToCanvasRect(obs)
            rect = addRect(prediction.id, r.left, r.top, r.width, r.height, "new");
            rect.obs.bool_acts[0] = obs.bool_acts[0]; // Copy fanning flag
            rect.obs.bool_acts[1] = obs.bool_acts[1]; // Copy pollen flag
        } else {
            // Only found tag
            if (logging.mouseEvents)
                console.log("onMouseDown: copying rect from tag ", tag)
          
            let angle = tagAngle(tag)
            if (typeof angle !== 'undefined') {
                console.log("MouseDown: found angle=",angle)
                rect = addRect(predictionTag.id, 
                       pt.x - default_width / 2, 
                       pt.y - default_height / 2,
                       default_width, default_height, "new", undefined, angle);
            } else {
                console.log("MouseDown: angle not found")
                rect = addRect(predictionTag.id, 
                       pt.x - default_width / 2, 
                       pt.y - default_height / 2,
                       default_width, default_height, "new");
            }
        }

    } else if (prediction.obs) {
        // Only found rect
        let obs = prediction.obs;
        
        if (logging.mouseEvents)
            console.log("onMouseDown: prediction obs=", obs)
        
        // Copy rectangle from source of prediction
        // addRect takes canvas coordinates units
        let r = obsToCanvasRect(obs)
        let width = r.width,
            height = r.height
        rect = addRect(prediction.id, startX - width / 2, startY - height / 2, width, height, "new");
        rect.obs.bool_acts[0] = obs.bool_acts[0]; // Copy fanning flag
        rect.obs.bool_acts[1] = obs.bool_acts[1]; // Copy pollen flag
        if (logging.mouseEvents)
            console.log("onMouseDown: copied rect from ", obs)
    } else {
        // Did not find any tag nor rect
        rect = addRect(prediction.id, startX - default_width / 2, startY - default_height / 2,
            default_width, default_height, "new");
        if (logging.mouseEvents)
            console.log("onMouseDown: did not find tag or event, created new rect with default size ", rect)
    }
    rect.setCoords();
    canvas1.setActiveObject(rect);
    canvas1.renderAll();

    //automatic_sub();
    submit_bee();
    // Fire mouse:down again, this time with the created target
    canvas1.fire("mouse:down", {
        target: rect,
        e: option.e
    })
}

/* Create new rectangle interactively (dragging) */
function onMouseDown_interactiveRect(option) {
    if (logging.mouseEvents)
        console.log("onMouseDown_interactiveRect: new rect at ", startX, startY)

    var startX = option.e.offsetX, startY = option.e.offsetY;

    let canvasXY = {x: startX, y: startX}
    let clientXY = {x: option.e.clientX, y: option.e.clientY}
    let videoXY = canvasToVideoPoint(canvasXY)
    let prediction = predictId(getCurrentFrame(), videoXY, "distance_topleft");
    $("#I").val(prediction.id)

    let id = prediction.id;
        
    var rect = addRect(id, startX, startY, 1, 1, "new");
    var topleft = { x: startX, y: startY }

    var center = rect.getCenterPoint()
    rect.hasControls = false; // Do not show controls when creating
    canvas1.setActiveObject(rect);
    //canvas1.renderAll();

    var onMouseMove_interactiveRect = function(option) {
        if (logging.mouseMoveEvents)
            console.log("onMouseMove_interactiveRect: option=", option);
        var e = option.e;

        rect.validated = true; // Need dragging a bit to validate the rectangle

        let delta = {x: e.clientX - clientXY.x, y: e.clientY - clientXY.y}

        if (e.ctrlKey) {
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
        canvas1.renderAll(); // Refresh rectangles drawing

        updateForm(rect);
    }
    var onMouseUp_interactiveRect = function(e) {
        if (logging.mouseEvents)
            console.log("onMouseUp_interactiveRect: e=", e);
        canvas1.off('mouse:move', onMouseMove_interactiveRect);
        canvas1.off('mouse:up', onMouseUp_interactiveRect);

        var activeObject = rect;
        if (logging.mouseEvents)
            console.log('onMouseUp_interactiveRect: rect=', rect, 'active=', canvas1.getActiveObject())
        if (activeObject.validated) {
            fixRectSizeAfterScaling(activeObject) // Fix negative width or height
            updateRectObsGeometry(activeObject) // Copy geometry to obs
                //canvas1.deactivateAll()
            rect.hasControls = true; // Reactivate controls when created
            canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
            canvas1.renderAll();

            // Update default size to latest rectangle created
            default_width = activeObject.width;
            default_height = activeObject.height;

            updateForm(activeObject)
            $('#I')[0].focus() // Set focus to allow easy ID typing
            $('#I')[0].select()
            
            printMessage("Press enter to validate ID", "green")
        } else {
            // Not enough drag to define a new rectangle
            canvas1.deactivateAll()
            canvas1.remove(activeObject);
            //canvas1.renderAll();
            //$("#I").val("no selection")
            if (logging.mouseEvents)
                console.log('onMouseUp: removing non validated activeObject=', activeObject)
            deselectBee()
        }
        videoControl.refresh();
    }

    canvas1.on('mouse:up', onMouseUp_interactiveRect);
    canvas1.on('mouse:move', onMouseMove_interactiveRect);
    return rect;
}

/* Find close trajectory tag, go to frame and select tag */
function onMouseDown_selectMultiframe(option) {
    console.log('onMouseDown_selectMultiframe: option=',option)
    
    let ptCanvas = {x: option.e.offsetX, y: option.e.offsetY}
    let pt = canvasToVideoPoint(ptCanvas)

    var tmp

    let clickMultiframe = true
    if (!clickMultiframe) {
      tmp = predictIdFromTags(getCurrentFrame(), pt)
    
      if (tmp.id != null) {
          console.log('onMouseDown_selectMultiframe: found id=',tmp.id)
          selectBeeByID(tmp.id)
          videoControl.refresh()
      }

    } else {
      if (showObsTracks) {
          tmp = predictIdFromObsMultiframe([getCurrentFrame()-plotTrack_range_forward, getCurrentFrame()+plotTrack_range_forward], pt)
    
          if (tmp.id != null) {
            console.log('onMouseDown_selectMultiframe: found Obs id=',tmp.id, 'frame=', tmp.frame)
            selectBeeByIDandFrame(tmp.id,tmp.frame)
          }
      }
    
      if (showTagsTracks || showSelectedTagsTracks) {
          tmp = predictIdFromTagsMultiframe([getCurrentFrame()-plotTrack_range_forward, getCurrentFrame()+plotTrack_range_forward], pt)
    
          if (tmp.id != null) {
            console.log('onMouseDown_selectMultiframe: found Tag id=',tmp.id, 'frame=', tmp.frame)
            selectBeeByIDandFrame(tmp.id,tmp.frame)
          }
      }
    }
    
}

/* Canvas zoom and pan */
function onMouseDown_panning(option) {
    var panning={}
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
        canvasTransformSet(panning.canvasTransform)
        
        //canvasTransform_Fix()

        videoControl.refresh()
    }
    var onMouseUp_panning = function(e) {
        if (logging.mouseEvents)
            console.log("onMouseUp_panning: e=", e);
        canvas1.off('mouse:move', onMouseMove_panning);
        canvas1.off('mouse:up', onMouseUp_panning);

        videoControl.refresh();
    }

    canvas1.on('mouse:up', onMouseUp_panning);
    canvas1.on('mouse:move', onMouseMove_panning);
}

function onMouseDown(option) {
    if (logging.mouseEvents)
        console.log('onMouseDown: option=', option)
    
    printMessage("")

    if (typeof option.target != "undefined") {
        if (option.e.altKey) {
            onMouseDown_panning(option)
        } else {
            // Clicked on an existing object
            if (logging.mouseEvents)
                console.log("onMouseDown: Clicked on object ", option.target)
            // This is now handled by event onObjectSelected()
            return false;
        }
    } else {
        // Clicked on the background
        if (logging.mouseEvents)
            console.log('onMouseDown: no object selected', option)

        // Deselect current bee
        //canvas1.deactivateAllWithDispatch()
        deselectBee()

        if (option.e.shiftKey) {
            // If SHIFT down, try to copy prediction
            // or create box centered on click if none
            onMouseDown_predict(option)
        } else if (option.e.ctrlKey) {
            // If CTRL key, draw the box directly. Try to predict ID using TopLeft corner
            onMouseDown_interactiveRect(option)
        } else if (option.e.altKey) {
            // If ALT key, do panning
            onMouseDown_panning(option)
        } else {
            // If no key, background click: try to select trajectory
            onMouseDown_selectMultiframe(option)
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
    
    canvasTransformScale(scaling, center)
    
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
    
    canvasTransformPan(deltaX, deltaY)
    
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





lastSelected = null
function onObjectSelected(option) {
    if (logging.selectionEvents)
        console.log("onObjectSelected:", option)
    //var activeObject = canvas1.getActiveObject();
    if (typeof option.target.id != "undefined") {
        if (option.target.id != canvas1.getActiveObject().id) {
            console.log('ERROR in onObjectSelected: option.target.id != canvas1.getActiveObject().id', option.target.id, canvas1.getActiveObject().id)
        }
        selectBee(option.target)
        lastSelected = option.target
        updateDeleteButton()
    }
}

function onObjectDeselected(option) {
    if (logging.selectionEvents)
        console.log("onObjectDeselected: ", option);
       
    if (lastSelected !== null) {
        if (lastSelected.status=="new") {
            if (logging.mouseEvents)
                console.log('onObjectDeselected: removing non submitted lastSelected=', lastSelected)

            // Remove tmp rect as soon as it becomes inactive
            canvas1.remove(lastSelected);
            lastSelected = null
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
    refreshOverlay()
    
    updateForm(activeObject);
    //automatic_sub();
    
    if (flagShowZoom) {
        showZoom(activeObject)
    }
}

function onObjectModified(option) {
    // Called after translation or scaling
    var activeObject = option.target; //canvas1.getActiveObject();
    fixRectSizeAfterScaling(activeObject)
    if (logging.mouseEvents)
      console.log("onObjectModified: activeObject=", activeObject);
    
    updateRectObsGeometry(activeObject)

    //canvas1.renderAll(); // Refresh rectangles drawing
    refreshOverlay()
    updateForm(activeObject);
    //showZoom(activeObject)
    automatic_sub();
    
    if (flagShowZoom) {
        showZoom(activeObject)
    }
}

function onActivityChanged(event) {
    if (logging.guiEvents)
        console.log("onActivityChanged: event=", event)
    var activeObject = canvas1.getActiveObject()
    if (activeObject !== null) {
        updateRectObsActivity(activeObject)
        automatic_sub()
    }
}

