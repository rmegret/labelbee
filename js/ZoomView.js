
// ## Auxiliary display

function initZoomView() {

    zoomOverlay = new ZoomOverlay($("#zoom")[0],$("#zoomOverlay")[0])
    zoomOverlay.canvasExtract = $("zoomExtractedTagCanvas")
    
    zoomOverlay.tagImageRoot='data/tags/tag25h5inv/png'
        
    zoomOverlay.setCanvasSize(200,200)
    
    zoomOverlay.initLabelListDialog()
    zoomOverlay.refreshButtonListParts()
}

/**
 * Class to handle the zoom widget
 * @class
 * @constructor
 */
function ZoomOverlay(canvas, canvasOverlay) {
    if (this === window) { 
        console.log('ERROR: ZoomOverlay should be created with "new ZoomOverlay()"')
        return new ZoomOverlay(canvas); 
    }
    
    // Manually bind all methods used as callbacks
    // https://www.smashingmagazine.com/2014/01/understanding-javascript-function-prototype-bind/
    this.refreshZoomSize = this.refreshZoomSize.bind(this)
    this.selectionChanged = this.selectionChanged.bind(this)
    this.onPartLabelTextChanged = this.onPartLabelTextChanged.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    
    this.tagImageRoot='data/tags/tag25h5inv/png'
    this.canvasExtract=undefined
    
    this.selected = undefined
    this.lastRect = undefined
    this.insertMode = false
    this.autoLabel = false
    this.autoLabelDone = false
    //this.points = []
    this.canvas = canvas
    this.canvasOverlay = canvasOverlay
    this.centerFrame = {x:0,y:0}
    this.centerCanvas = {x:200,y:200}
    this.angle = 0  // radians
    this.scale = 1
    
    this.canvas1 = undefined
    this.attachFabric()
    this.labelList = new Map([['head','red'], 
                      ['thorax','limegreen'], 
                      ['abdomen','blue'],
                      ['pollenL','rgb(255,224,0)'], // Left, port side
                      ['pollenR','rgb(224,255,0)'], // Right, starboard side
                      ['legL','rgb(255,0,128)'], // Left, port side
                      ['legR','rgb(0,255,128)'], // Right, starboard side
                      ['__default', 'black']])
                          
    $("#zoomresize").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1   // Need to put a value even to update it later
    });
    $("#zoomresize").on( "resizestop", this.refreshZoomSize ); // bind ok
    
    $("#tagImageDiv").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1,   // Need to put a value even to update it later
    });
    $("#extractedTagImageDiv").resizable({
      helper: "ui-resizable-helper",
      aspectRatio: 1,   // Need to put a value even to update it later
    });
                          
    this.zoomShowOverlay = false;
    $('#checkboxZoomShowOverlay').prop('checked', this.zoomShowOverlay);
    this.flagShowZoom = true;
    $('#checkboxShowZoom').prop('checked', this.flagShowZoom);
    this.flagShowParts = false
    $('#buttonShowParts').toggleClass('active', this.flagShowParts)
    
    $('#partLabel').change(this.onPartLabelTextChanged); // bind ok
    
    $('#videozoom').attr("tabindex","0")
    $('#videozoom').on("keydown", this.onKeyDown);
    
    //this.flagShowZoom = $('#checkboxShowZoom').is(':checked')
    //this.zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')                  
}

ZoomOverlay.prototype = {}

// # EXTERNAL EVENTS AND SYNC

/**
 * @memberof ZoomOverlay
 */
ZoomOverlay.prototype.selectionChanged = function() {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.selectionChanged')
        
    if (!this.flagShowZoom) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectionChanged: flagShowZoom==false. Candeled')
        return
    }
        
    let id=getCurrentID()
    if (typeof id === 'undefined') {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectionChanged: no current ID. Canceled.')
        this.canvas1.clear()
        return
    }
    
    this.id = id;
    
    this.syncFromTracks()
    
    this.refreshTagImage()
    this.refreshZoom()
}
/**
 * @memberof ZoomOverlay
 */
ZoomOverlay.prototype.syncFromTracks = function() {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.syncFromTracks')
    var activeObject = canvas1.getActiveObject() // Object of video frame
    
    if (!activeObject) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.syncFromTracks: abort. activeObject=',activeObject)
        this.canvas1.clear()
        return;
    }
    
    var obs = activeObject.obs
    
    this.canvas1.clear()
    if (obs.parts) {
        for (let i in obs.parts) {
            let part = obs.parts[i]
            this.newPointInFrame(part.posFrame, part.label);
        }
    }
    
    if (this.autoLabel) {
        this.startAutoLabel()
    }
    
    this.refreshZoom()
}
/**
 * @memberof ZoomOverlay
 */
ZoomOverlay.prototype.syncToTracks = function() {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.syncToTracks')
    var activeObject = canvas1.getActiveObject() // Object of video frame
    
    if (!activeObject) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.syncToTracks: abort. activeObject=',activeObject)
        this.canvas1.clear() // Clean up, we missed something
        return;
    }
    
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
// See also ZoomOverlay.prototype.onToggleButtonShowOnVideo

// # FABRIC.JS EVENT HANDLING

/**
 * @memberof ZoomOverlay
 */
ZoomOverlay.prototype.attachFabric = function() {
    this.canvas1 = new fabric.Canvas(this.canvasOverlay);
    
    // Caution: for this to work, the canvases must be enclosed in a 
    // div with class ".canvaswrapper" to force alignment of all canvases
    
    this.canvas1.setWidth(this.canvas.width)
    this.canvas1.setHeight(this.canvas.height)
    
    this.canvas1.selectionColor = "red";
    this.canvas1.selectionBorderColor = "red";
    this.canvas1.selection = false; // REMI: disable the blue selection
        
    this.canvas1.on('mouse:down', this.onMouseDown.bind(this));
    this.canvas1.on('object:modified', this.onObjectModified.bind(this)); // After modification
    this.canvas1.on('object:selected', this.onObjectSelected.bind(this)); // After mousedown
    this.canvas1.on('selection:cleared', this.onObjectDeselected.bind(this)); // After mousedown out
}
/**
 * @memberof ZoomOverlay
 * @category 
 */
ZoomOverlay.prototype.detachFabric = function() {
    this.canvas1.dispose()
    this.canvas1 = undefined
    //$(this.canvas).off('mousedown',  this.onMouseDown.bind(this))
}

/**
 * @memberof ZoomOverlay
 * @param option {jQuery.Event} MouseDown event
 */
ZoomOverlay.prototype.onMouseDown = function(option) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.onMouseDown',option)
    if (option.target) {
        // Clicked on an existing object
        if (logging.mouseEvents)
            console.log("onMouseDown: Clicked on object ", option.target)
        // This is handled by event onObjectSelected()
        return false;
    } else {
        // Clicked on the background
        if (logging.mouseEvents)
            console.log('onMouseDown: no object selected', option)

        let x = option.e.offsetX, y = option.e.offsetY;
        
        if (this.insertMode) {
            this.newPoint(x,y, this.selected)
            this.syncToTracks()
        } else {
            if (this.autoLabel && !this.autoLabelDone) {
                if (this.lastRect) {
                    this.updatePoint(x,y, this.lastRect)
                    this.syncToTracks()
                }
            } else {
                if (logging.mouseEvents)
                    console.log('insertMode==false: skipping mousedown')
            }
        }
        
        if (this.autoLabel && !this.autoLabelDone) {
            this.selectNextLabel(this.selected)
        }
    }
    this.lastRect = this.canvas1.getActiveObject()
    this.redraw()
}
ZoomOverlay.prototype.onObjectModified = function(evt) {
    console.log('ZoomOverlay.onObjectModified',evt)
    var rect = evt.target
    this.updatePointFromFabric(rect)
    this.syncToTracks()
}

// # GUI CALLBACKS

ZoomOverlay.prototype.onKeyDown = function(e) {
    if (logging.keyEvents)
        console.log("ZoomOverlay.onKeyDown: e=",e)
        
    if (/textarea|select/i.test( e.target.nodeName ) || e.target.type === "text") {
      if (logging.keyEvents)
        console.log("onKeyDown: coming from text field. stopped event")
      e.stopPropagation();
      return;
    }

    if (e.key == "Delete" || e.key == 'd' || e.key == 'Backspace') {
        this.deleteCurrentPoint();
        e.preventDefault();
        return
    }
    if (e.key == "r" && e.ctrlKey) {
        this.redraw()
        e.preventDefault();
        return
    }
    if (e.key == "+") {
        this.zoomApplyScale(Math.sqrt(2))
        e.preventDefault();
        return
    }
    if (e.key == "-") {
        this.zoomApplyScale(Math.sqrt(1/2))
        e.preventDefault();
        return
    }
}
ZoomOverlay.prototype.onPartLabelTextChanged = function(evt) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.onPartLabelTextChanged',evt)
    var label = $(evt.target).val() // Same as #partLabel
    if (label == this.selected) return;
    var rect = this.canvas1.getActiveObject();
    if (!rect) {
        this.selectLabel(label)
    } else {
        rect.label = label
    }
    $('.zoomlabel').toggleClass('active', false)
    $('.zoomlabel[data-label="'+label+'"]').toggleClass('active', true)
    
    this.redraw()
}
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
    if (logging.zoomOverlay)
        console.log(event)
    $(event.target).toggleClass('active', this.autoLabel)
    
    if (this.autoLabel) {
        this.startAutoLabel()
    }
}
ZoomOverlay.prototype.onToggleButtonShowOnVideo = function(event) {
    this.flagShowParts=!this.flagShowParts

    $("#buttonShowParts").toggleClass('active', this.flagShowParts)
    
    videoControl.refresh()
}
ZoomOverlay.prototype.clickZoomShowOverlay = function() {
    this.zoomShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    if ($('#zoom').is(':visible')) {
        this.refreshZoom()
    }
}
ZoomOverlay.prototype.clickShowZoom = function() {
    this.flagShowZoom = $('#checkboxShowZoom').is(':checked')
    if (this.flagShowZoom) {
      this.syncFromTracks()
    }
}
ZoomOverlay.prototype.zoomApplyScale = function(factor) {
    this.scale *= factor;
    if (isNaN(this.scale)) this.scale=1
    this.refreshZoom()
}
ZoomOverlay.prototype.zoomSetScale = function(scale) {
    this.scale = scale
    this.refreshZoom()
}

// # GEOMETRY 

ZoomOverlay.prototype.refreshZoomSize = function(event, ui) {
    // Refresh based on new video size or new canvas size
    if (logging.canvasEvents) {
        console.log('refreshZoomSize: event=',event)
    }
        
    var borderThickness = 2
    let wd = parseInt($("#zoomresize")[0].style.width) - 16 - borderThickness
    let hd = wd - borderThickness
        
    this.setCanvasSize(wd,hd)
        
    this.refreshZoom()
}
ZoomOverlay.prototype.setCanvasSize = function(w, h) {
    var borderThickness = 2

    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
    this.canvas1.setWidth(w)
    this.canvas1.setHeight(h)
    $("#zoomresize")[0].style.width = (w+16+borderThickness).toString() + 'px'
    $("#zoomresize")[0].style.height = (h+borderThickness).toString() + 'px'
}
ZoomOverlay.prototype.setFrameGeometry = function(cx, cy, angle) {
    this.centerFrame = {x:cx,y:cy}
    this.angle = angle
}
ZoomOverlay.prototype.setCanvasGeometry = function(zx, zy) {
    this.centerCanvas = {x:zx,y:zy}
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

// # PART SELECTION

ZoomOverlay.prototype.onObjectSelected = function(option) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.onObjectSelected',option)
    var target = option.target
    this.selected = target.label
    this.insertMode = false
    //this.selectLabel(target.label)
    this.labelSelected(target.label)
    
    // Workaround since onObjectDeselected gets called before onMouseDown
    this.lastRect = this.canvas1.getActiveObject()
}
ZoomOverlay.prototype.onObjectDeselected = function(option) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.onObjectDeselected',option)
    this.selected = undefined
    this.insertMode = false

    // Workaround since onObjectDeselected gets called before onMouseDown
    this.lastRect = this.canvas1.getActiveObject()

    this.labelSelected(undefined)
}
ZoomOverlay.prototype.selectLabel = function(label) {
    if (label == this.selected) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectLabel: unchanged label=',label)
        return;
    }
    if (!label) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectLabel: deselect')
        this.canvas1.deactivateAllWithDispatch()
        this.selected = undefined
        this.insertMode = false
    } else {
        var rect = this.findRectByLabel(label)
        if (!rect) {
            if (logging.zoomOverlay)
                console.log('ZoomOverlay.selectLabel: select for insertion label=',label)
            this.canvas1.deactivateAllWithDispatch()
            this.selected = label
            this.insertMode = true
        } else {
            if (logging.zoomOverlay)
                console.log('ZoomOverlay.selectLabel: select for update label=',label)
            this.canvas1.setActiveObject(rect);
            this.selected = label
            this.insertMode = false
        }
    }
    this.labelSelected(label) 
    this.redraw()
}
ZoomOverlay.prototype.labelSelected = function(label) {
    $('.zoomlabel').toggleClass('active', false)
    if (label) {
        $('.zoomlabel[data-label="'+label+'"]').toggleClass('active', true)
    }
    $('#partLabel').val(label)
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
ZoomOverlay.prototype.selectNextLabel = function(currentLabel) {
    if (this.autoLabelDone) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectNextLabel: autoLabelDone=true. Canceling.')
        return;
    }

    /* Select next label without a rect */
    var labels = [...this.labelList.keys()].filter((L)=>L!='__default')
    if (labels.length==0) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectNextLabel: empty label list. Canceled.')
    }
    var i = labels.indexOf(currentLabel)
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.selectNextLabel: i=',i)
    var j
    if (i<0) {
        j = 0
    } else {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.selectNextLabel: labels.length=',labels.length)
        j=(i+1)%labels.length
        if (j==0) {
            if (logging.zoomOverlay)
                console.log('ZoomOverlay.selectNextLabel: no more label to choose from. Canceled.')
            this.autoLabelDone = true
            this.selectLabel(undefined)
            return
        }
    }
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.selectNextLabel: j=',j)
    let label = labels[j]
    this.selectLabel(label)
}
ZoomOverlay.prototype.startAutoLabel = function() {
    this.autoLabelDone = false
    this.selectNextLabel(undefined)
}

// # PART INSERTION DELETION MODIFICATION

ZoomOverlay.prototype.newPointInFrame = function(posFrame,label) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.newPointInFrame(',posFrame,label,')')
    
    var posCanvas = this.frame2canvas(posFrame)
    var x = posCanvas.x
    var y = posCanvas.y
    
    var rect = new this.FabricPartRect({
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
        //hasBorder: false,
        borderColor: 'yellow',
        padding: 1,
        posFrame: {x:posFrame.x,y:posFrame.y},
        zoomOverlay: this
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
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.newPoint(',x,y,label,')')
    
    var posFrame = this.canvas2frame({x:x,y:y})
    
    this.newPointInFrame(posFrame, label)
}
ZoomOverlay.prototype.updatePoint = function(x,y,rect) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.updatePoint(',x,y,rect,')')
    
    if (!rect) {
        console.log('ERROR: ZoomOverlay.updatePoint: invalid rect = ',rect)
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
    if (logging.zoomOverlay)
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
    if (logging.zoomOverlay)
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
    if (logging.zoomOverlay)
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

// # LABEL LIST / BUTTONS

ZoomOverlay.prototype.onButtonClickAddRemovePartLabel = function(evt, action) {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.onButtonClickAddRemoveLabel',evt,action)
    var label = $("#partLabel").val()
    if (action==='+') {
        var c = 'black'
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.onButtonClickAddRemoveLabel: new label '+label+' with default color '+c)
        zoomOverlay.labelList.set(label,c)
        zoomOverlay.refreshButtonListParts()
        zoomOverlay.redraw()
    }
    if (action==='-') {
        if (window.confirm("Are you sure you want to delete label '"+label+"' from the quick access list?")) {
            zoomOverlay.labelList.delete(label)
            zoomOverlay.refreshButtonListParts()
        }
    }
    if (action==='c') {
        var currentColor = zoomOverlay.labelList.get(label)
        if (!currentColor || currentColor=='') currentColor='black'

        c = window.prompt("New color for label '"+label+"' (format 'red' or 'rgb(255,0,0)'",currentColor);
        if (c == null || c == "") {
            console.log('ZoomOverlay.onButtonClickAddRemoveLabel: color not changed')
            return
        } else {
            //col = JSON.parse(c);
            if (logging.zoomOverlay)
                console.log('ZoomOverlay.onButtonClickAddRemoveLabel: label '+label+' has new color '+c)
            zoomOverlay.labelList.set(label,c)
            zoomOverlay.refreshButtonListParts()
            zoomOverlay.redraw()
        } 
    }
    if (action==='C') {
        //var J = JSON.stringify(zoomOverlay.labelList,null, 4)
        var jsontext = '['; var first=true;
        for (var label of zoomOverlay.labelList.keys()) {
            if (first) {jsontext+='\n    '; first=false}
            else {jsontext+=',\n    '}
            jsontext+=JSON.stringify([label,zoomOverlay.labelList.get(label)])
        }
        jsontext+='\n]'
        
        $("#labellist-json").val(jsontext)
        
        $("#dialog-form-labelList").dialog("open");
    }
}
ZoomOverlay.prototype.initLabelListDialog = function() {
    $("#dialog-form-labelList").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Ok": function() {
                var jsontext = $("#labellist-json").val();
                
                if (logging.zoomOverlay)
                    console.log('labelList dialog. jsontext = ',jsontext)

                var newContent = JSON.parse( jsontext )
                zoomOverlay.labelList = new Map(newContent)
                
                if (logging.zoomOverlay)
                    console.log('zoomOverlay.labelList = ',zoomOverlay.labelList)
                
                $(this).dialog("close");
                
                zoomOverlay.refreshButtonListParts()
                zoomOverlay.redraw()
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
ZoomOverlay.prototype.refreshButtonListParts = function() {
    var that = this
    var topDiv = $('div.zoomLabel.labelButtons')
    
    topDiv.empty()
    for (var label of this.labelList.keys()) {
        if (label=='__default') continue;
        
        var colorBlob = ""
        var color = this.labelList.get(label)
        if (color) {
            colorBlob="<span style='color:"+color+";'>&#9673;</span>"
        }
        
        $('<button/>', {
        type: 'button',
        "data-label": label,
        class: "zoomlabel btn btn-default btn-xs",
        title: "Toggle Label "+label,
        click: function (event) { that.onClickButtonPart(event); },
        html: colorBlob+' '+label
        }).appendTo(topDiv);
    }
}

// # DRAWING

ZoomOverlay.prototype.FabricPartRect = fabric.util.createClass(fabric.Rect, {
    type: 'partrect',
    
    initialize: function (element, options) {
        options = options || {};

        this.callSuper('initialize', element, options);
    },
    
    _colormapping: function(label) {
        var color = this.zoomOverlay.labelList.get(label);
        if (!color) color=this.zoomOverlay.labelList.get('__default')
        if (!color) color='black'
        return color
    },
    
    _render: function (ctx) {
        var label = this.label
        var color = this._colormapping(label);
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
    
    if (logging.zoomOverlay)
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

ZoomOverlay.prototype.updateTagView = function(tag) {
    if (!tag) return
    if (!tag.p) return
    
    var cx = tag.c[0]
    var cy = tag.c[1]
    
    // Need some trickery: first copy part of video in tmp canvas 
    // before transforming
            
    var S2=90
    var zoomScale = 1
    var mw=S2/2, mh=S2/2
    
    var tmpCanvas2 = $('#zoomExtractedTagCanvas2')[0];
    var ctx2 = tmpCanvas2.getContext('2d');
    tmpCanvas2.width = S2
    tmpCanvas2.height = S2
    
    let video = $('#video')[0]
    
    ctx2.save()
    
        ctx2.setTransform(1,0, 0,1, 0,0)
        ctx2.clearRect(0, 0, S2,S2)

        ctx2.translate(+mw,+mh)
        //ctx2.scale(zoomScale,zoomScale)
        ctx2.translate(-cx,-cy)

        ctx2.drawImage(video,0,0) // Possibly out of sync when playing
        
    ctx2.restore()
    
    var dx = mw-cx, dy = mh-cy
    
    src_pts = [tag.p[0][0]+dx,tag.p[0][1]+dy, tag.p[1][0]+dx,tag.p[1][1]+dy,
                   tag.p[2][0]+dx,tag.p[2][1]+dy, tag.p[3][0]+dx,tag.p[3][1]+dy]
    
    /* Now, let's warp it to the final canvas */
    
    let S = 9*3
    
    var tmpCanvas = $('#zoomExtractedTagCanvas')[0];
    var ctx = tmpCanvas.getContext('2d');
    tmpCanvas.width = S
    tmpCanvas.height = S

    var data2 = ctx2.getImageData(0, 0, S2, S2).data;
    var imageData = ctx.getImageData(0, 0, S, S)
    var data=imageData.data
    
    let dst_pts = [0,0, S,0, S,S, 0,S]
    var perspT = PerspT(src_pts, dst_pts);
        
    // TODO: Should probably use some GL library such as
    // https://github.com/evanw/glfx.js instead of doing it manually
    var nearest = false
    if (nearest) {
        for (var y=0; y<S; y++) {
            for (var x=0; x<S; x++) {
                var dstPt = perspT.transformInverse(x,y);
                let x2=Math.round(dstPt[0]), y2=Math.round(dstPt[1])
                data[(x+y*S)*4] = data2[(x2+y2*S2)*4]
                data[(x+y*S)*4+1] = data2[(x2+y2*S2)*4+1]
                data[(x+y*S)*4+2] = data2[(x2+y2*S2)*4+2]
                data[(x+y*S)*4+3] = 255
            }
        }
    } else {
        for (var y=0; y<S; y++) {
            for (var x=0; x<S; x++) {
                var dstPt = perspT.transformInverse(x,y);
                let x2=Math.round(dstPt[0]), y2=Math.round(dstPt[1])
                let a=dstPt[0]-x2, b=dstPt[1]-y2
                data[(x+y*S)*4] =   (1-a)*((1-b)*data2[(x2+y2*S2)*4]
                                            + b *data2[(x2+(y2+1)*S2)*4])
                                    +  a *((1-b)*data2[((x2+1)+y2*S2)*4]
                                            + b *data2[((x2+1)+(y2+1)*S2)*4])
                data[(x+y*S)*4+1] = (1-a)*((1-b)*data2[(x2+y2*S2)*4+1]
                                            + b *data2[(x2+(y2+1)*S2)*4+1])
                                    +  a *((1-b)*data2[((x2+1)+y2*S2)*4+1]
                                            + b *data2[((x2+1)+(y2+1)*S2)*4+1])
                data[(x+y*S)*4+2] = (1-a)*((1-b)*data2[(x2+y2*S2)*4+2]
                                            + b *data2[(x2+(y2+1)*S2)*4+2])
                                    +  a *((1-b)*data2[((x2+1)+y2*S2)*4+2]
                                            + b *data2[((x2+1)+(y2+1)*S2)*4+2])
                data[(x+y*S)*4+3] = 255
            }
        }
    }
    ctx.putImageData(imageData, 0, 0)
    
    /* Add overlay of tag position */
    ctx2.setTransform(1,0, 0,1, 0,0)
    ctx2.beginPath()
    ctx2.moveTo(src_pts[0],src_pts[1])
    ctx2.lineTo(src_pts[6],src_pts[7])
    ctx2.lineTo(src_pts[4],src_pts[5])
    ctx2.lineTo(src_pts[2],src_pts[3])
    ctx2.strokeStyle='red'
    ctx2.stroke()
}

ZoomOverlay.prototype.updateDistractors = function(tag) {
    
}

ZoomOverlay.prototype.refreshZoom = function() {

    if (!this.flagShowZoom) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.refreshZoom: flagShowZoom==false. refresh canceled.')
        return;
    }

    if (logging.zoomOverlay)
        console.log('ZoomOverlay.refreshZoom')
  
    // Update Geometry Parameters
  
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
            cx = this.centerFrame.x
            cy = this.centerFrame.y
            angle = this.angle
        }
    } else {
        cx = tag.c[0]
        cy = tag.c[1]
        angle = tagAngle(tag)/180*Math.PI
    }
    
    this.setFrameGeometry(cx, cy, angle)

    this.updateTagView(tag)

    let zw=zoomOverlay.width
    let zh=zoomOverlay.height

    let w = zw, h = zh
    let mw = w * 0.5,  mh = h * 0.5
    
    this.setCanvasGeometry(mw, mh)
    
    // Do drawing

    var zoom_canvas = $('#zoom')[0];
    var zoom_ctx = zoom_canvas.getContext('2d');
    
    let video = $('#video')[0]
    
    let zoomScale = this.scale
    
    zoom_ctx.save()
    
        zoom_ctx.setTransform(1,0, 0,1, 0,0)
        zoom_ctx.clearRect(0, 0, zw,zh)

        zoom_ctx.translate(+mw,+mh)
        zoom_ctx.scale(zoomScale,zoomScale)
        zoom_ctx.rotate(-angle)
        zoom_ctx.translate(-cx,-cy)

        zoom_ctx.drawImage(video,0,0) // Possibly out of sync when playing
        
    zoom_ctx.restore()
    
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
    
    if (this.zoomShowOverlay) {
      if (tag != null) {
          zoom_ctx.save()
          
              // Same transform as the image
              zoom_ctx.setTransform(1,0, 0,1, 0,0)
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
              plotArrow(zoom_ctx, a0, a1, 10)
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
    
    this.redraw()
}
ZoomOverlay.prototype.refreshTagImage = function() {
    if (logging.zoomTag)
        console.log('ZoomOverlay.refreshTagImage')
  
    let id = this.id;
  
    let padding = 4
    let paddedID = String(id);
    let N=paddedID.length
    for (var i=0; i<padding-N; i++)
        paddedID='0'+paddedID;

    $('#tagImage').attr('src',this.tagImageRoot+'/keyed'+paddedID+'.png')
    
}


