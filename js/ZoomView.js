
// ## Auxiliary display

function initZoomView() {

    zoomOverlay = new ZoomOverlay($("#zoom")[0],$("#zoomOverlay")[0])
    zoomScale = 1
    
    $("#zoomresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#zoomresize").on( "resizestop", refreshZoomSize );
    
    $("#tagImage").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    zoomShowOverlay = false;
    $('#checkboxZoomShowOverlay').prop('checked', zoomShowOverlay);
    flagShowZoom = true;
    $('#checkboxShowZoom').prop('checked', flagShowZoom);
    
    tagImageRoot='data/tags/tag25h5inv/png'
    
    
    //refreshZoomSize()
    zoomOverlay.setCanvasSize(200,200)
}

function refreshZoomSize(event, ui) {
    // Refresh based on new video size or new canvas size
    if (logging.canvasEvents) {
        console.log('refreshZoomSize: event=',event)
    }
        
    let wd = parseInt($("#zoomresize")[0].style.width) - 16
    let hd = wd
        
    zoomOverlay.setCanvasSize(wd,hd)
        
    refreshZoom()
}


function ZoomOverlay(canvas, canvasOverlay) {
    if (this === window) { 
        console.log('ERROR: ZoomOverlay should be created with "new ZoomOverlay()"')
        return new ZoomOverlay(canvas); 
    }
    this.selected = undefined
    this.insertMode = false
    this.autoLabel = false
    //this.points = []
    this.canvas = canvas
    this.canvasOverlay = canvasOverlay
    this.centerFrame = {x:0,y:0}
    this.centerCanvas = {x:200,y:200}
    this.angle = 0  // radians
    this.scale = 1
    
    this.canvas1 = undefined
    this.attach()
}

ZoomOverlay.prototype = {}

// # FABRIC.JS EVENT HANDLING

ZoomOverlay.prototype.attach = function() {
    this.canvas1 = new fabric.Canvas(this.canvasOverlay);
    
    // Caution: for this to work, the canvases must be enclosed in a 
    // div with class ".canvaswrapper" to force alignment of all canvases
    
    this.canvas1.setWidth(this.canvas.width)
    this.canvas1.setHeight(this.canvas.height)
    
    this.canvas1.selectionColor = "red";
    this.canvas1.selectionBorderColor = "red";
    this.canvas1.selection = false; // REMI: disable the blue selection
        
    this.canvas1.on('mouse:down', this.onMouseDown.bind(this));
    //this.canvas1.on('mouse:up', onMouseUp);
    //this.canvas1.on('object:moving', onObjectMoving); // During translation
    //this.canvas1.on('object:scaling', onObjectMoving); // During scaling
    //this.canvas1.on('object:rotating', onObjectMoving); // During rotation
    this.canvas1.on('object:modified', this.onObjectModified.bind(this)); // After modification
    this.canvas1.on('object:selected', this.onObjectSelected.bind(this)); // After mousedown
    this.canvas1.on('selection:cleared', this.onObjectDeselected.bind(this)); // After mousedown out
    //$(this.canvas).on('mousedown',  this.onMouseDown.bind(this))
    
    $( selectionControl ).on('selection:created', this.syncFromTracks.bind(this))
}
ZoomOverlay.prototype.detach = function() {
    this.canvas1.dispose()
    this.canvas1 = undefined
    //$(this.canvas).off('mousedown',  this.onMouseDown.bind(this))
}

ZoomOverlay.prototype.onMouseDown = function(option) {
    console.log('ZoomOverlay.onMouseDown',option)
    if (option.target) {
        // Clicked on an existing object
        //if (logging.mouseEvents)
            console.log("onMouseDown: Clicked on object ", option.target)
        // This is handled by event onObjectSelected()
        return false;
    } else {
        // Clicked on the background
        //if (logging.mouseEvents)
            console.log('onMouseDown: no object selected', option)

        let x = option.e.offsetX, y = option.e.offsetY;
        
        if (this.insertMode) {
            this.newPoint(x,y, this.selected)
            this.syncToTracks()
        } else {
            if (this.autoLabel && this.lastSelection) {
                var rect = this.findRectByLabel(this.lastSelection)
                if (rect) {
                    this.updatePoint(x,y, rect)
                    this.syncToTracks()
                } else {
                    this.newPoint(x,y, this.lastSelection)
                    this.syncToTracks()
                }
            } else {
                console.log('insertMode==false: skipping mousedown')
            }
        }
        
        if (this.autoLabel) {
            var labels = ['head','torso','abdomen']
            var i = labels.findIndex((L)=>L==this.selected)
            let label
            if (i>=0) 
                label = labels[(i+1)%labels.length]
            else
                label = labels[0]
            console.log('previous=',this.selected,' current=',label)
            
            this.selectLabel(label)
        }
    }
    this.redraw()
}

// # GEOMETRY 

ZoomOverlay.prototype.setCanvasSize = function(w, h) {
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
    this.canvas1.setWidth(w)
    this.canvas1.setHeight(h)
    $("#zoomresize")[0].style.width = (w+16).toString() + 'px'
    $("#zoomresize")[0].style.height = h.toString() + 'px'
}
ZoomOverlay.prototype.setGeometry = function(cx, cy, angle, zx, zy, scale) {
    this.centerFrame = {x:cx,y:cy}
    this.centerCanvas = {x:zx,y:zy}
    this.angle = angle
    this.scale = scale
}
ZoomOverlay.prototype.canvas2frame = function(posCanvas) {
    var posFrame = {
            x: (   (posCanvas.x-this.centerCanvas.x) * Math.cos(this.angle) 
                 - (posCanvas.y-this.centerCanvas.y) * Math.sin(this.angle) )
                / this.scale 
               + this.centerFrame.x,
            y: (   (posCanvas.x-this.centerCanvas.x) * Math.sin(this.angle) 
                 + (posCanvas.y-this.centerCanvas.y) * Math.cos(this.angle) )
                / this.scale
               + this.centerFrame.y}
    return posFrame
}
ZoomOverlay.prototype.frame2canvas = function(posFrame) {
    var posCanvas = {
            x: (   (posFrame.x-this.centerFrame.x) * Math.cos(this.angle) 
                 + (posFrame.y-this.centerFrame.y) * Math.sin(this.angle) )
                * this.scale
               + this.centerCanvas.x,
            y: ( - (posFrame.x-this.centerFrame.x) * Math.sin(this.angle) 
                 + (posFrame.y-this.centerFrame.y) * Math.cos(this.angle) )
                * this.scale
               + this.centerCanvas.y}
    return posCanvas
}

// # SELECTION
ZoomOverlay.prototype.onObjectSelected = function(option) {
    console.log('ZoomOverlay.onObjectSelected',option)
    var target = option.target
    this.selected = target.label
    this.insertMode = false
    this.selectLabel(target.label)
}
ZoomOverlay.prototype.onObjectDeselected = function(option) {
    console.log('ZoomOverlay.onObjectDeselected',option)
    this.lastSelection = this.selected
    this.selected = undefined
    this.insertMode = false
    this.selectLabel(undefined)
}
ZoomOverlay.prototype.selectLabel = function(label) {
    if (label == this.selected) return;
    if (!label) {
        this.canvas1.deactivateAllWithDispatch()
        this.selected = undefined
        this.insertMode = false
        $('.zoomlabel').toggleClass('active', false)
    } else {
        var rect = this.findRectByLabel(label)
        if (!rect) {
            this.canvas1.deactivateAllWithDispatch()
            this.selected = label
            this.insertMode = true
        } else {
            this.canvas1.setActiveObject(rect);
            this.selected = label
            this.insertMode = false
        }
        $('.zoomlabel').toggleClass('active', false)
        $('.zoomlabel[data-label='+label+']').toggleClass('active', true)
    }
    this.redraw()
}
ZoomOverlay.prototype.findRectByLabel = function(label) {
    var rects = this.canvas1.getObjects()
    var id = rects.findIndex((rect)=>rect.label==label)
    if (id>=0) {
        return rects[id]
    } else {
        return undefined
    }
}

// # INSERTION DELETION MODIFICATION

ZoomOverlay.prototype.newPointInFrame = function(posFrame,label) {
    console.log('ZoomOverlay.newPointInFrame(',posFrame,label,')')
    
    var posCanvas = this.frame2canvas(posFrame)
    var x = posCanvas.x
    var y = posCanvas.y
    
    var rect = new fabric.PartRect({
        label: label,
        top: y-3,
        left: x-3,
        width: 7,
        height: 7,
        fill: 'transparent',
        stroke: 'blue',
        strokewidth: 3,
        hasRotatingPoint: false,
        lockRotation: true,
        hasControls: false,
        hasBorder: false,
        posFrame: {x:posFrame.x,y:posFrame.y}
    });
    rect.originX = 'center'
    rect.originY = 'center'
    this.canvas1.add(rect);
    
    //var posFrameCopy = {x:posFrame.x,y:posFrame.y}
    //this.points.push({posFrame:posFrameCopy, label:label, rect:rect})
                      
    this.canvas1.setActiveObject(rect);
    this.selected = label
    this.insertMode = false
    
    //this.syncToTracks()
    //this.redraw()
}
ZoomOverlay.prototype.newPoint = function(x,y,label) {
    console.log('ZoomOverlay.newPoint(',x,y,label,')')
    
    var posFrame = this.canvas2frame({x:x,y:y})
    
    this.newPointInFrame(posFrame, label)
}
ZoomOverlay.prototype.updatePoint = function(x,y,rect) {
    console.log('ZoomOverlay.updatePoint(',x,y,rect,')')
    
    if (!rect) {
        console.log('ZoomOverlay.updatePoint: invalid rect = ',rect)
        return
    }

    var posFrame = this.canvas2frame({x:x,y:y})
    rect.posFrame.x = posFrame.x
    rect.posFrame.y = posFrame.y
    this.updatePointToFabric(rect)
    //this.canvas1.setActiveObject(pt.rect);
    
    //this.syncToTracks()
    //this.redraw()
}
ZoomOverlay.prototype.updatePointFromFabric = function(rect) {
    console.log('ZoomOverlay.updatePointFromFabric(',rect,')')
    
    var x = rect.left + 3
    var y = rect.top + 3
    var posFrame = this.canvas2frame({x:x,y:y})
    rect.posFrame.x = posFrame.x
    rect.posFrame.y = posFrame.y
    
    //this.syncToTracks()
    //this.redraw() // No need, as Fabric is supposed to have updated display
}
ZoomOverlay.prototype.updatePointToFabric = function(rect) {
    console.log('ZoomOverlay.updatePointToFabric(',rect,')')
    
    let posCanvas = this.frame2canvas(rect.posFrame)
    rect.setLeft( posCanvas.x - 3 )
    rect.setTop( posCanvas.y - 3 )
    rect.setCoords()
    
    //this.syncToTracks() // No need, if posFrame was modified, 
                          // it should have been synced already
    //this.redraw() // No, to avoid circular calls
}
ZoomOverlay.prototype.deletePoint = function(rect) {
    console.log('ZoomOverlay.deletePoint(',rect,')')
    
//     var index = this.points.findIndex((P)=>P.rect===rect)
//     if (index > -1) {
//         this.points.splice(index, 1);
//     }
    
    this.canvas1.remove(rect);
    this.selected = undefined
    this.insertMode = false
    
    this.syncToTracks()
    this.redraw()
}
ZoomOverlay.prototype.deleteCurrentPoint = function() {
    var rect = this.canvas1.getActiveObject();
    this.deletePoint(rect)
}

ZoomOverlay.prototype.onObjectModified = function(evt) {
    console.log('ZoomOverlay.onObjectModified',evt)
    var rect = evt.target
    this.updatePointFromFabric(rect)
    this.syncToTracks()
}

ZoomOverlay.prototype.syncToTracks = function() {
    console.log('ZoomOverlay.syncToTracks')
    var activeObject = canvas1.getActiveObject() // Object of video frame
    var obs = activeObject.obs
    obs.parts = []
    var rects = this.canvas1.getObjects()
    for (let i in rects) {
        let rect = rects[i]
        let part = {
            posFrame: Object.assign({}, rect.posFrame),
            label: rect.label
        }
        obs.parts.push(part)
    }
    automatic_sub()
}
ZoomOverlay.prototype.syncFromTracks = function() {
    console.log('ZoomOverlay.syncFromTracks')
    var activeObject = canvas1.getActiveObject() // Object of video frame
    var obs = activeObject.obs
    this.canvas1.clear()
    for (let i in obs.parts) {
        let part = obs.parts[i]
        this.newPointInFrame(part.posFrame, part.label);
    }
    this.redraw()
}

// # DRAWING

fabric.PartRect = fabric.util.createClass(fabric.Rect, {
    type: 'partrect',
    
    initialize: function (element, options) {
        options = options || {};

        this.callSuper('initialize', element, options);
    },
    
    colors : {'head':'red', 'torso':'limegreen', 'abdomen':'blue'},
    
    _render: function (ctx) {
            
        var label = this.label
        var color = this.colors[label];
        if (!color) color='black'
        this.stroke = color
    
        this.callSuper('_render', ctx);
        
        var radius = 4
        //var x = this.left, y = this.top
        var x = 0, y = 0 // Local coordinates
        
        //console.log(label)
        
        ctx.save()
        
        ctx.font = "12px Arial";
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - radius - 3);

//         ctx.font = "12px Arial";
//         ctx.fillStyle = color;
//         ctx.textAlign = 'center';
//         ctx.textBaseline = 'top';
//         ctx.fillText('x', x, y + radius + 3);
        
        ctx.restore()

    }
});
ZoomOverlay.prototype.redraw = function() {
    //this.canvas1.backgroundColor = null;
    //refreshZoom()
    
    console.log('ZoomOverlay.redraw:')
//     for (var p of this.points) {
//         //console.log('POINT: p=', p)
//         let posCanvas = this.frame2canvas(p.posFrame)
//         p.rect.setLeft( posCanvas.x - 3 )
//         p.rect.setTop( posCanvas.y - 3 )
//         p.rect.setCoords()
//         
//         console.log('  ',p)
//     }
    for (let r of this.canvas1.getObjects()) {
        this.updatePointToFabric(r)
    }
    
    this.canvas1.getContext('2d').clearRect(0,0,this.canvas1.width, this.canvas1.height)
    this.canvas1.renderAll();
}

// # GUI CALLBACKS
ZoomOverlay.prototype.onClickButtonPart = function(event) {
    var target = event.target
    
    var label = undefined
    
    label = $(target).data('label')
    this.selectLabel(label)
}
ZoomOverlay.prototype.onClickButtonDeletePart = function(event) {
    this.deleteCurrentPoint()
}
ZoomOverlay.prototype.onToggleButtonAutoLabel = function(event) {
    this.autoLabel = !this.autoLabel
    console.log(event)
    $(event.target).toggleClass('active', this.autoLabel)
}





function clickZoomShowOverlay() {
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if ($('#zoom').is(':visible')) {
        showZoom(lastSelected)
    }
}
function clickShowZoom() {
    flagShowZoom = $('#checkboxShowZoom').is(':checked')
    updateShowZoom()
}
function updateShowZoom() {
    if (flagShowZoom) {
        $('#zoomDiv').show()
        showZoom(lastSelected)
    } else {
        $('#zoomDiv').hide()
    }
}
function showZoom(rect) {
    refreshZoom(defaultSelectedBee)
    return

    let zw=zoomOverlay.width
    let zh=zoomOverlay.height

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    //zoom_canvas.width=zw
    //zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    
    let video = $('#video')[0]
    zoom_ctx.drawImage(video, 
       (rect.obs.cx - mw), (rect.obs.cy - mh), w, h,
        0,0,zh,zw);
    
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if (zoomShowOverlay) {
      let activeObject = canvas1.getActiveObject()
      let obs = activeObject.obs
    
      zoom_ctx.beginPath();
      zoom_ctx.moveTo(mw,0)
      zoom_ctx.lineTo(mw,zh)
      zoom_ctx.moveTo(0,mh)
      zoom_ctx.lineTo(zw,mh)
      zoom_ctx.rect(mw+obs.x-obs.cx,mh+obs.y-obs.cy, obs.width,obs.height)
      zoom_ctx.strokeStyle = 'blue'
      zoom_ctx.stroke()        
    }
}
function zoomApplyScale(factor) {
    zoomScale *= factor;
    if (isNaN(zoomScale)) zoomScale=1
    updateShowZoom()
}
function zoomSetScale(scale) {
    zoomScale = scale
    updateShowZoom()
}


function plotArrow(ctx, p0, p1, L) {
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

var oldCX, oldCY, oldAngle;
var zoomMode = 'RT'
function refreshZoom() {
    let zw=zoomOverlay.width
    let zh=zoomOverlay.height

    if (logging.zoomTag)
        console.log('showZoomTag')
  
    let cx=0
    let cy=0
    let tag=getCurrentTag()
    if (typeof tag === 'undefined') {
        let rect=getSelectedRect()
        if (rect != null) {
            let geom=rotatedRectGeometry(rect)
            let pt = canvasToVideoPoint(geom.center)
            cx = pt.x
            cy = pt.y
            angle = geom.angle/180*Math.PI
        } else {
            cx = oldCX
            cy = oldCY
            angle = oldAngle
        }
    } else {
        cx = tag.c[0]
        cy = tag.c[1]
        angle = tagAngle(tag)/180*Math.PI
    }
    
    oldCX = cx
    oldCY = cy
    oldAngle = angle

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    //zoom_canvas.width=zw
    //zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    
    zoomOverlay.setGeometry(cx, cy, angle, mw, mh, zoomScale)
    
    let video = $('#video')[0]
    
    zoom_ctx.save()
//     zoom_ctx.translate(mw,mh)
//     zoom_ctx.rotate(-angle)
//     zoom_ctx.scale(zoomScale,zoomScale)
//     zoom_ctx.translate(-mw,-mh)
//     zoom_ctx.drawImage(video, 
//        (cx - mw), (cy - mh), w, h,
//         0,0,zh,zw);
    if (zoomMode=='RT') {
      zoom_ctx.translate(+mw,+mh)
      zoom_ctx.scale(zoomScale,zoomScale)
      zoom_ctx.rotate(-angle)
      zoom_ctx.translate(-cx,-cy)
    } else {
      zoom_ctx.scale(zoomScale,zoomScale)
      zoom_ctx.setTransform(1,0, 0,1, -cx,-cy)
    }
    zoom_ctx.drawImage(video,0,0) // Possible out of sync when playing
    //zoom_ctx.drawImage(videoCanvas,0,0)
    zoom_ctx.restore()
    
    zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if (zoomShowOverlay) {
      if (tag != null) {
          zoom_ctx.save()
          // Same transform as the image
          zoom_ctx.translate(+mw,+mh)
          zoom_ctx.scale(zoomScale,zoomScale)
          zoom_ctx.rotate(-angle)
          zoom_ctx.translate(-cx,-cy)
          let p = tag.p;
          
          // U shape of the tag (opening on the top)
          zoom_ctx.moveTo(p[0][0],p[0][1])
          zoom_ctx.lineTo(p[3][0],p[3][1])
          zoom_ctx.lineTo(p[2][0],p[2][1])
          zoom_ctx.lineTo(p[1][0],p[1][1])
          zoom_ctx.strokeStyle = 'blue'
          zoom_ctx.stroke()   
          
          let xa = (p[0][0]+p[1][0])/2
          let ya = (p[0][1]+p[1][1])/2
          let xb = (p[2][0]+p[3][0])/2
          let yb = (p[2][1]+p[3][1])/2
          let a0 = {x:xa+(xa-xb)*0.05,y:ya+(ya-yb)*0.05}
          let a1 = {x:xa+(xa-xb)*0.8,y:ya+(ya-yb)*0.8}
          plotArrow(zoom_ctx,a0, a1, 10)
          zoom_ctx.beginPath();
          zoom_ctx.moveTo(a0.x,a0.y)
          zoom_ctx.lineTo(a1.x,a1.y)
          zoom_ctx.stroke()
          
          let hh=2;
          zoom_ctx.fillStyle = 'red'
          zoom_ctx.fillRect(p[0][0]-hh,p[0][1]-hh,2*hh+1,2*hh+1)
          zoom_ctx.fillStyle = 'green'
          zoom_ctx.fillRect(p[1][0]-hh,p[1][1]-hh,2*hh+1,2*hh+1)
          zoom_ctx.fillStyle = 'blue'
          zoom_ctx.fillRect(p[2][0]-hh,p[2][1]-hh,2*hh+1,2*hh+1)
          zoom_ctx.fillStyle = 'yellow'
          zoom_ctx.fillRect(p[3][0]-hh,p[3][1]-hh,2*hh+1,2*hh+1)
          
          zoom_ctx.restore()
      } else {
      zoom_ctx.save()
      zoom_ctx.beginPath();
      zoom_ctx.moveTo(mw,0)
      zoom_ctx.lineTo(mw,zh)
      zoom_ctx.moveTo(0,mh)
      zoom_ctx.lineTo(zw,mh)
      zoom_ctx.strokeStyle = 'blue'
      zoom_ctx.stroke()   
      
      if (typeof tag !== 'undefined') {
          zoom_ctx.beginPath();
          zoom_ctx.rect(mw-3,mh-3,6,6)
          zoom_ctx.fillStyle = 'yellow'
          zoom_ctx.fill()   
      }     
      zoom_ctx.restore()
      }
    }
    
    zoomOverlay.redraw()
}

function refreshTagImage() {
    if (logging.zoomTag)
        console.log('refreshTagImage')
  
    let id=getCurrentID()
    if (typeof id === 'undefined') {
        return
    }
  
    let padding = 4
  
    let paddedID = String(id);
    let N=paddedID.length
    for (var i=0; i<padding-N; i++)
        paddedID='0'+paddedID;

    $('#tagImage').attr('src',tagImageRoot+'/keyed'+paddedID+'.png')
    
}

