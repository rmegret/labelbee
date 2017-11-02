
// ## Auxiliary display

function initZoomView() {

    zoomOverlay = new ZoomOverlay($("#zoomcanvas1"))
    zoomOverlay.attach()
    
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
    
    zoomScale = 1
    
    refreshZoomSize()
}

function refreshZoomSize(event, ui) {
    // Refresh based on new video size or new canvas size
    if (logging.canvasEvents) {
        console.log('refreshZoomSize: event=',event)
    }
        
    let wd = parseInt($("#zoomresize")[0].style.width)
    let hd = wd
        
    wd=400
    hd=400
    
    $("#zoomresize")[0].style.width = (wd+16).toString() + 'px'
    $("#zoomresize")[0].style.height = hd.toString() + 'px'

        
    $("#zoom").width = wd
    $("#zoom").height = hd
    zoomOverlay.canvas1.setWidth(wd)
    zoomOverlay.canvas1.setHeight(hd)
        
    zoomOverlay.redraw()
}


function ZoomOverlay(canvasElement) {
    if (this === window) { 
        console.log('ERROR: ZoomOverlay should be created with "new ZoomOverlay()"')
        return new ZoomOverlay(canvasElement); 
    }
    this.selected = undefined
    this.insertMode = false
    this.points = []
    this.canvasElement = canvasElement
}

ZoomOverlay.prototype = {}

ZoomOverlay.prototype.attach = function() {
    this.canvas1 = new fabric.Canvas(this.canvasElement[0]);
    
    // Caution: for this to work, the canvases must be enclosed in a 
    // div with class ".canvaswrapper" to force alignment of all canvases
    
    this.canvas1.setWidth(this.canvasElement[0].width)
    this.canvas1.setHeight(this.canvasElement[0].height)
    
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
    //this.canvasElement.on('mousedown',  this.onMouseDown.bind(this))
}
ZoomOverlay.prototype.detach = function() {
    this.canvas1.dispose()
    //this.canvasElement.off('mousedown',  this.onMouseDown.bind(this))
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
        
        let zw=400
        let zh=400
        
        //x += 200, y+= 200
        
        if (this.insertMode) {
            this.newPoint(x,y, this.selected)
        } else {
            console.log('insertMode==false: skipping mousedown')
        }
        
        var auto=true
        if (auto) {
            var labels = ['head','torso','abdomen']
            var i = labels.findIndex((L)=>L==this.selected)
            var nextLabel = labels[0]
            if (i>=0) nextLabel=labels[(i+1)%labels.length]
            console.log('current=',this.selected,' next=',nextLabel)
            this.selectLabel(nextLabel)
        }
    }

}
ZoomOverlay.prototype.onObjectModified = function(evt) {
    console.log('ZoomOverlay.onObjectModified',evt)
    this.redraw()
}
// SELECTION
ZoomOverlay.prototype.onObjectSelected = function(option) {
    console.log('ZoomOverlay.onObjectSelected',option)
    var target = option.target
    this.selected = target.label
    this.insertMode = false
    this.selectLabel(target.label)
}
ZoomOverlay.prototype.onObjectDeselected = function(option) {
    console.log('ZoomOverlay.onObjectDeselected',option)
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
        var i = this.points.findIndex((pt)=>pt.label==label)
        if (i<0) {
            this.canvas1.deactivateAllWithDispatch()
            this.selected = label
            this.insertMode = true
        } else {
            var pt = this.points[i]
            this.canvas1.setActiveObject(pt.rect);
            this.selected = label
            this.insertMode = false
        }
        $('.zoomlabel').toggleClass('active', false)
        $('.zoomlabel.'+label).toggleClass('active', true)
    }
    this.redraw()
}


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
        
        console.log(label)
        
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
ZoomOverlay.prototype.newPoint = function(x,y,label) {
    console.log('ZoomOverlay.newPoint(',x,y,label,')')
    
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
        hasBorder: false
    });
    rect.originX = 'center'
    rect.originY = 'center'
    this.canvas1.add(rect);
    this.points.push({x:x,y:y,label:label,rect:rect})
    
    this.canvas1.setActiveObject(rect);
    this.selected = label
    this.insertMode = false
    
    this.redraw()
}
ZoomOverlay.prototype.redraw = function() {
    //this.canvas1.backgroundColor = null;
    refreshZoom()
    this.canvas1.renderAll();
}

function onClickButtonPart(event) {
    var target = event.target
    
    var label = undefined
    
    if ($(target).hasClass('head')) {
        label = 'head'
    } else if ($(target).hasClass('torso')) {
        label = 'torso'
    } else if ($(target).hasClass('abdomen')) {
        label = 'abdomen'
    }
    zoomOverlay.selectLabel(label)
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

    let zw=400
    let zh=400

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    zoom_canvas.width=zw
    zoom_canvas.height=zh
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
    let zw=400
    let zh=400

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
    zoom_canvas.width=zw
    zoom_canvas.height=zh
    zoom_ctx.clearRect(0, 0, zw,zh)
    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    let w2 = w + 2 * mw, h2 = h + 2 * mh
    
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

