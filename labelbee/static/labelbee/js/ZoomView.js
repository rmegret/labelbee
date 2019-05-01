
// ## Auxiliary display

function initZoomView() {

    zoomOverlay = new ZoomOverlay($("#zoom")[0],$("#zoomOverlay")[0])
    zoomOverlay.canvasExtract = $("zoomExtractedTagCanvas")
    
    zoomOverlay.tagImageRoot= '/data/tags/tag25h5inv/png'
    zoomOverlay.loadTagHammingMatrix()
        
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
    
    let zoomOverlay = this;
    
    // Manually bind all methods used as callbacks
    // https://www.smashingmagazine.com/2014/01/understanding-javascript-function-prototype-bind/
    this.refreshZoomSize = this.refreshZoomSize.bind(this)
    this.selectionChanged = this.selectionChanged.bind(this)
    this.onPartLabelTextChanged = this.onPartLabelTextChanged.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    
    this.tagImageRoot='/data/tags/tag25h5inv/png'
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
                      ['antL','rgb(255,0,128)'], // Left, port side
                      ['antR','rgb(0,255,128)'], // Right, starboard side
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
    
//     $(".tagdivresizable").resizable({
//         helper: "ui-resizable-helper"
//       })
//     $("#tagImageDiv").resizable({
//       helper: "ui-resizable-helper",
//       aspectRatio: 1,   // Need to put a value even to update it later
//     });
//     $("#zoomTagCanvas").resizable({
//       helper: "ui-resizable-helper",
//       aspectRatio: 1,   // Need to put a value even to update it later
//     });
    $(".tagresizable").resizable({
      //helper: "ui-resizable-helper",
      aspectRatio: 1,
      //alsoResize: ".alsotagresizable"
    });
//     $(".alsotagresizable").resizable(
//         {aspectRatio: 1}
//     );
    
//     $("#extractedTagImageDiv").resizable({
//       helper: "ui-resizable-helper",
//       aspectRatio: 1,   // Need to put a value even to update it later
//     });
    $('#tagImage').on('load',x=>this.refreshTagImage())
                          
    this.flagShowOverlay = true;
    $('#checkboxZoomShowOverlay').prop('checked', this.flagShowOverlay);
    this.flagShowGrid = true
    $('#buttonZoomShowGrid').toggleClass('active', this.flagShowGrid)
    this.flagShowZoom = true;
    $('#checkboxShowZoom').prop('checked', this.flagShowZoom);
    this.flagShowParts = false
    $('#buttonZoomShowParts').toggleClass('active', this.flagShowParts)
    this.flagShowDistractors = false
    //$('#checkboxZoomShowDistractors').toggleClass('active', this.flagShowDistractors)
    this.flagShowAlternateHamming = false
    this.flagShowAlternateHamming2 = true
    this.flagShowAlternateFocus = true
    
    this.currentTagBin = ''
    this.loadTagCodesFromServer()
    $('button.alternate-use-image').toggleClass('active', this.flagShowAlternateHamming2)
    $('button.alternate-use-focus').toggleClass('active', this.flagShowAlternateFocus)
    $('#videozoom_distractors').accordion('option','active',this.flagShowDistractors)
    
    $('#partLabel').change(this.onPartLabelTextChanged); // bind ok
    
    $('#videozoom').attr("tabindex","0")
    $('#videozoom').on("keydown", this.onKeyDown);   

    $( "#videozoom_distractors" ).on( "accordionactivate", 
        function( event, ui ) {
            //console.log(event,ui)
            zoomOverlay.flagShowDistractors = ($('#videozoom_distractors').accordion('option','active')!==false);
            zoomOverlay.updateDistractors()
        } );     
        
    $('#videozoom').accordion({
        activate: function( event, ui ) {
              console.log('Opening zoom overlay: refresh')
              zoomOverlay.refreshZoom()
          }
      });
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
    
    this.loadTagImage()
    this.refreshZoom()
    this.refreshInfo()
}
/**
 * @memberof ZoomOverlay
 */
ZoomOverlay.prototype.syncFromTracks = function() {
    if (logging.zoomOverlay)
        console.log('ZoomOverlay.syncFromTracks')
    var activeObject = overlay.getActiveObject() // Object of video frame
    
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
    var activeObject = overlay.getActiveObject() // Object of video frame
    
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

// #MARK # FABRIC.JS EVENT HANDLING

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

// #MARK # GUI CALLBACKS

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
ZoomOverlay.prototype.clickShowOverlay = function() {
    this.flagShowOverlay = $('#checkboxZoomShowOverlay').is(':checked')
    this.refreshZoom()
}
ZoomOverlay.prototype.clickToggleGrid = function() {
    this.flagShowGrid = $('#checkboxZoomToggleGrid').is(':checked')
    this.refreshZoom()
}
ZoomOverlay.prototype.clickShowZoom = function() {
    this.flagShowZoom = $('#checkboxShowZoom').is(':checked')
    if (this.flagShowZoom) {
      this.syncFromTracks()
    }
}
ZoomOverlay.prototype.onToggleButtonShowAlternate = function(event) {
    let button = $(event.currentTarget)
    if (button.hasClass('alternate-use-image')) {
        console.log('Toggle alternate-use-image/flagShowAlternateHamming2')
        let active = !button.hasClass('active')
        this.flagShowAlternateHamming2 = active
        button.toggleClass('active', active)
        this.refreshZoom()
    }
    if (button.hasClass('alternate-use-focus')) {
        console.log('Toggle alternate-use-focus/flagShowAlternateFocus')
        let active = !button.hasClass('active')
        this.flagShowAlternateFocus = active
        button.toggleClass('active', active)
        this.refreshZoom()
    }

}
// ZoomOverlay.prototype.clickShowDistractors = function() {
//     this.flagShowDistractors = $('#checkboxZoomShowDistractors').is(':checked')
//     if (this.flagShowDistractors) {
//       this.refreshZoom()
//     } else {
//       this.deleteDistractors()
//     }
// }
ZoomOverlay.prototype.zoomApplyScale = function(factor) {
    this.scale *= factor;
    if (isNaN(this.scale)) this.scale=1
    this.refreshZoom()
}
ZoomOverlay.prototype.zoomSetScale = function(scale) {
    this.scale = scale
    this.refreshZoom()
}

// #MARK # GEOMETRY 

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

// #MARK # PART SELECTION

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

// #MARK # PART INSERTION DELETION MODIFICATION

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

// #MARK # LABEL LIST / BUTTONS

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

// #MARK # DRAWING

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

function drawPixelated(img,context,x,y, sx,sy){
  if (!zoom) zoom=4; if (!x) x=0; if (!y) y=0;
  var ctx = drawPixelated.ctx
  if (!ctx){
    ctx = document.createElement('canvas').getContext('2d');
    drawPixelated.ctx=ctx
  }
  if (img.complete && img.width>0) {
      ctx.width  = img.width;
      ctx.height = img.height;
      ctx.drawImage(img,0,0);
      idata = ctx.getImageData(0,0,img.width,img.height).data;
      for (var x2=0;x2<img.width;++x2){
        for (var y2=0;y2<img.height;++y2){
          var i=(y2*img.width+x2)*4;
          var r=idata[i  ];
          var g=idata[i+1];
          var b=idata[i+2];
          var a=idata[i+3];
          context.fillStyle = "rgba("+r+","+g+","+b+","+(a/255)+")";
          context.fillRect(x+x2*sx, y+y2*sy, sx, sy);
        }
      }
  }
};

function drawTagBin(tagbin,n, context,x,y, sx,sy, margin, inv){
  if (!zoom) zoom=4; if (!x) x=0; if (!y) y=0;
  if (margin == undefined) margin=1;
  if (inv == undefined) inv=true;
  
  inv=Number(inv)

  if (inv) {
    context.fillStyle = "white";
  } else {
    context.fillStyle = "black";
  }
  context.fillRect(x, y, sx*(n+2*margin), sy*(n+2*margin));

  var x0=x+margin*sx;
  var y0=y+margin*sy;

  for (var x2=0;x2<n;++x2){
    for (var y2=0;y2<n;++y2){
      var i=(y2*n+x2);
      if (tagbin[i] ^ inv==0)
          context.fillStyle = "black";
      else
          context.fillStyle = "white";
      context.fillRect(x0+x2*sx, y0+y2*sy, sx, sy);
    }
  }
};

function extractTagBin(ctx, n, x,y,sx,sy, margin, inv) {
    var m=n+margin*2;
    
    var bin = '';
    var v
    
    var one, zero
    if (inv) {
      one='0'
      zero='1'
    } else {
      one='1'
      zero='0'
    }
    
    idata = ctx.getImageData(0,0,m*sx,m*sy).data;
    
    var min=255,max=0;
    for (var i=0;i<m*sy;++i){
        for (var j=0;j<m*sx;++j) {
          var t=j+i*m*sx;
          var r=idata[t*4  ];
          var g=idata[t*4+1];
          var b=idata[t*4+2];
          var a=idata[t*4+3];
          
          if (r<min) min=r;
          if (r>max) max=r;
        }
    }
    var threshold = (max+min)/2;
    
    for (var i=0;i<n;++i){
        for (var j=0;j<n;++j){
          var k=i+j*n;
          var t=x+(j+margin)*sx + m*sx*(y+(i+margin)*sy);
          var r=idata[t*4  ];
          var g=idata[t*4+1];
          var b=idata[t*4+2];
          var a=idata[t*4+3];
          v = (r>threshold)? one:zero;
          bin+=v;
          //console.log(i,j,r)
        }
      }
    return bin
}

function hamming(bin1, bin2) {
    if (bin1.length!=bin2.length) {
        console.log('hamming: unequal lengths',bin1,bin2)
        return -1;
    }
    var count=0;
    for (var k=0; k<bin1.length; k++) {
        if (bin1[k]!=bin2[k]) count++
    }
    return count;
}

function findBestHamming(bin, tagbin_list) {
    //var N = tagbin_list.keys().length;
    //N = 100;
    
    var bestH = 25, bestId=-1;
    for (var k in tagbin_list) {
        var bin2 = tagbin_list[k];
        var H = hamming(bin, bin2)
        if (H<bestH) {bestId=k; bestH=H;}
        //console.log(k,H,bin,bin2)
    }
    return {id:bestId, H:bestH}
}

function rotateTagBin(bin, n) {
    // Rotate CCW
    var out = ''

    for (var j=0;j<n;++j){
        for (var i=0;i<n;++i){
          var k=(n-1-j)+i*n;
          out += bin[k]
        }
    }
    return out
}

function findAllHamming(bin, tagbin_list, maxH) {
    var all = {}
    for (var h=0; h<=maxH; h++) {
        all[h]=[]
    }
    for (var k in tagbin_list) {
        var bin2 = tagbin_list[k];
        var H = Number(hamming(bin, bin2))
        if (H<=maxH) {
            all[H].push(k)
        }
        //console.log(k,H,bin,bin2)
    }
    return all
}
// function findAllHammingWithRot(bin, tagbin_list, maxH, n) {
//     if (n==undefined) n=5;
//     
//     var a = findAllHamming(bin, tagbin_list, maxH)
// }

ZoomOverlay.prototype.updateTagView = function(tag) {
    this.updateDistractors()

    if (!tag) return
    if (!tag.p) return
    
    var cx = tag.c[0]
    var cy = tag.c[1]
    
    // Need some trickery: first copy part of video in tmp canvas 
    // before transforming
            
    var S2=90
    var zoomScale = 1
    var mw=S2/2, mh=S2/2
    
    /* 1. Extracted Tag Region */
    
    var tmpCanvas2 = $('#zoomExtractedTagCanvas2')[0];
    var ctx2 = tmpCanvas2.getContext('2d');
    tmpCanvas2.width = S2
    tmpCanvas2.height = S2
    
    /* 1.2. Draw video into zoomed canvas */
    
    let video = $('#video')[0]
    
    ctx2.save()
    
        ctx2.setTransform(1,0, 0,1, 0,0)
        ctx2.clearRect(0, 0, S2,S2)

        ctx2.translate(+mw,+mh)
        //ctx2.scale(zoomScale,zoomScale)
        ctx2.translate(-cx,-cy)

        ctx2.drawImage(video,0,0) // Possibly out of sync when playing
        
    ctx2.restore()
        
    /* 1.2. Overlay tag edges */
    
    var dx = mw-cx, dy = mh-cy    
    src_pts = [tag.p[0][0]+dx,tag.p[0][1]+dy, tag.p[1][0]+dx,tag.p[1][1]+dy,
               tag.p[2][0]+dx,tag.p[2][1]+dy, tag.p[3][0]+dx,tag.p[3][1]+dy]
    
    // Drawing of overlay done after 2., since this canvas is used as source
    // for normalized tag extraction
    
    /* 2. Warped normalized tag */
    
    let npix = 7 // codepix+2 margin
    
    let pixsize=30
    let S = npix*pixsize
    
    var tmpCanvas = $('#zoomExtractedTagCanvas')[0];
    var ctx = tmpCanvas.getContext('2d');
    tmpCanvas.width = S
    tmpCanvas.height = S

    /* 2.1. Warp the image data */

    function unwarpTag(src_ctx, dst_ctx, perspT, src_R, dst_R) {
        let xmin=dst_R[0]
        let xmax=xmin+dst_R[2]
        let ymin=dst_R[1]
        let ymax=ymin+dst_R[3]
        
        let src_image = src_ctx.getImageData(...src_R);
        let dst_image = dst_ctx.getImageData(...dst_R);
        let src_data = src_image.data;
        let dst_data  = dst_image.data;
        
        // TODO: Should probably use some GL library such as
        // https://github.com/evanw/glfx.js instead of doing it manually
        var nearest = false
        if (nearest) {
            for (var y=ymin; y<ymax; y++) {
                for (var x=xmin; x<xmax; x++) {
                    var dstPt = perspT.transformInverse(x,y);
                    let x2=Math.round(dstPt[0]), y2=Math.round(dstPt[1])
                    dst_data[(x+y*S)*4] = src_data[(x2+y2*S2)*4]
                    dst_data[(x+y*S)*4+1] = src_data[(x2+y2*S2)*4+1]
                    dst_data[(x+y*S)*4+2] = src_data[(x2+y2*S2)*4+2]
                    dst_data[(x+y*S)*4+3] = 255
                }
            }
        } else {
            for (var y=ymin; y<ymax; y++) {
                for (var x=xmin; x<xmax; x++) {
                    var dstPt = perspT.transformInverse(x,y);
                    let x2=Math.round(dstPt[0]), y2=Math.round(dstPt[1])
                    let a=dstPt[0]-x2, b=dstPt[1]-y2
                    dst_data[(x+y*S)*4] = 
                        (1-a)*((1-b)*src_data[(x2+y2*S2)*4]
                               + b *src_data[(x2+(y2+1)*S2)*4])
                        + a *((1-b)*src_data[((x2+1)+y2*S2)*4]
                               + b *src_data[((x2+1)+(y2+1)*S2)*4])
                    dst_data[(x+y*S)*4+1] = 
                        (1-a)*((1-b)*src_data[(x2+y2*S2)*4+1]
                                + b *src_data[(x2+(y2+1)*S2)*4+1])
                        +  a *((1-b)*src_data[((x2+1)+y2*S2)*4+1]
                                + b *src_data[((x2+1)+(y2+1)*S2)*4+1])
                    dst_data[(x+y*S)*4+2] = 
                        (1-a)*((1-b)*src_data[(x2+y2*S2)*4+2]
                                + b *src_data[(x2+(y2+1)*S2)*4+2])
                        +  a *((1-b)*src_data[((x2+1)+y2*S2)*4+2]
                                + b *src_data[((x2+1)+(y2+1)*S2)*4+2])
                    dst_data[(x+y*S)*4+3] = 255
                }
            }
        }
        dst_ctx.putImageData(dst_image, xmin,ymin)
    }
    
    var dst_pts = [0,0, S,0, S,S, 0,S]
    var perspT = PerspT(src_pts, dst_pts);
    unwarpTag(ctx2, ctx, perspT, [0,0,S2,S2], [0,0,S,S])
    
    this.currentTagBin = extractTagBin(ctx, npix-2, pixsize/2, pixsize/2, pixsize,pixsize, 1, true);
    
    /* 2.2. Overlay normalized grid */
    
    function drawGrid(ctx, npix, S) {
        let step = S/npix;
        let N = npix+1;
    
        ctx.save()
        ctx.setTransform(1,0, 0,1, 0,0)
        ctx.beginPath()
        for (let i=0; i<N; i++) {
            ctx.moveTo(0, step*i)
            ctx.lineTo(S, step*i)
            ctx.moveTo(step*i,0)
            ctx.lineTo(step*i,S)
        }
        ctx.strokeStyle='red'
        ctx.stroke()
        ctx.beginPath()
        for (let i=0; i<N; i++) {
            for (let j=0; j<N; j++) {
                let x = step*(i+0.5), y=step*(j+0.5)
                ctx.moveTo(x-1,y)
                ctx.lineTo(x+1,y)
                ctx.moveTo(x,y-1)
                ctx.lineTo(x,y+1)
            }
        }
        ctx.strokeStyle='blue'
        ctx.stroke()
        ctx.restore()
    }
    
    if (this.flagShowGrid) {
        drawGrid(ctx, npix, S)
    }
    
    /* Drawing of 1.2, done after 2. */
    ctx2.setTransform(1,0, 0,1, 0,0)
    ctx2.beginPath()
    ctx2.moveTo(src_pts[0],src_pts[1])
    ctx2.lineTo(src_pts[6],src_pts[7])
    ctx2.lineTo(src_pts[4],src_pts[5])
    ctx2.lineTo(src_pts[2],src_pts[3])
    ctx2.strokeStyle='red'
    ctx2.stroke()

    /* 3. Drawing of tag reference */

    if ($('#tagImage')[0].complete) {
        var tmpCanvas = $('#zoomTagCanvas')[0];
        var ctx = tmpCanvas.getContext('2d');
        tmpCanvas.width = S
        tmpCanvas.height = S

        drawPixelated($('#tagImage')[0],ctx, 0,0,pixsize,pixsize);

        /* Add overlay of tag grid */
        if (this.flagShowGrid) {
            drawGrid(ctx, npix, S);
        }
    }
}

// #MARK # DISTRACTOR MANAGEMENT

ZoomOverlay.prototype.loadTagHammingMatrix = function() {
    let path = '/data/tags/tag25h5inv/tag25h5_hamming_matrix_5-6.json'
    let url = url_for(path)

    if (logging.zoomTag) {
        console.log('loadTagHammingMatrix: loading from URL "'+url+'"...')  
    }
    //statusRequest('hammingMatrix',true,'')
    
    this.hammingMatrix = undefined
    
    let zoomOverlay = this
      
     $.getJSON( url ,
        function(data) {
          console.log('loadTagHammingMatrix: loaded "'+path+'"')  
        }
      )
      .done(function(data) {
          if (logging.zoomTag) {
              console.log('loadTagHammingMatrix = ',data)
          }
          
          zoomOverlay.hammingMatrix = data
        }
      )
      .fail(function(data) {
          console.log('loadTagHammingMatrix: ERROR loading "'+path+'"')  
          //statusWidget.statusUpdate('videolistLoad',false,'')
        }
      )
}
ZoomOverlay.prototype.loadTagCodesFromServer = function(){
    let path = '/data/tags/tag25h5inv/tag25h5_bin.json'
    let url = url_for(path)

    console.log("tagCodesFromServer: importing tagbin from URL '"+url+"'...")

    let zoomOverlay = this
    $.ajax({
          url: url, //server url
          type: 'GET',    //passing data as post method
          contentType: 'application/json', // returning data as json
          data:'',
          success:function(obj)
          {
            console.log('tagCodesFromServer: SUCCESS')
            
            zoomOverlay.tagbin = obj
          },
          error: showAjaxError('tagCodesFromServer: ERROR')
        });
  }

ZoomOverlay.prototype.deleteDistractors = function() {
    
    $('#zoomDistractors').html('')

}
ZoomOverlay.prototype.updateDistractors = function() {
    
    $('#zoomDistractors').html('')
    
    //this.flagShowDistractors = 
    //   $('#videozoom_distractors').collapsible( "option", "collapsed" );
    
    if (!this.flagShowDistractors)
        return;
    
    let tag = getCurrentTag()
    if (!tag) return;
    
    let zoomOverlay = this
    let tagid = tag.id
    
    //console.log('tagid=',tagid)
    
    let S = ''
        
    // Alternate tags based on hamming similarity
    if (zoomOverlay.flagShowAlternateHamming && !!zoomOverlay.hammingMatrix) {
    
        let hammingLists = zoomOverlay.hammingMatrix[tag.id]
    
        for (let H in hammingLists) {
            let ids = hammingLists[H]
            if (!ids || ids.length==0) continue;
            S+='  H'+H+':  '
            for (let id of ids) {
                //console.log('Distractor ',id,' hamming=',H)
            
                let url = this.tagImgURL(String(id))
            
                S+='<div class="alternateTag">'+id+'<br><img class="alternateTag pixelated" src="'+url+'" onclick="zoomOverlay.onClickAlternateTag('+id+')"/></div>'
            }
        }
    
    }
    
    if (zoomOverlay.flagShowAlternateHamming2 && !!zoomOverlay.tagbin
          && zoomOverlay.currentTagBin) {
    
        //let hammingLists = zoomOverlay.hammingMatrix[tag.id]
    
        var hammingLists = findAllHamming(zoomOverlay.currentTagBin, zoomOverlay.tagbin, 5)
    
        for (let H in Object.keys(hammingLists)) {
            let ids = hammingLists[H]
            if (!ids || ids.length==0) continue;
            S+='  H'+H+':  '
            for (let id of ids) {
                //console.log('Distractor ',id,' hamming=',H)
            
                let url = this.tagImgURL(String(id))
            
                S+='<div class="alternateTag">'+id+'<br><img class="alternateTag pixelated" src="'+url+'" onclick="zoomOverlay.onClickAlternateTag('+id+')"/></div>'
            }
        }
    
    }
    
    // Alternate tags based on FocusView
    if (zoomOverlay.flagShowAlternateFocus) {
        let ids = getIdsInFocus()
        S+='  Focus:  '
        for (let id of ids) {
            //console.log('Distractor ',id)
        
            let url = this.tagImgURL(String(id))
        
            S+='<div class="alternateTag">'+id+'<br><img class="alternateTag pixelated" src="'+url+'" onclick="zoomOverlay.onClickAlternateTag('+id+')"/></div>'
        }
    }
    
    $('#zoomDistractors').html(S)
}
ZoomOverlay.prototype.onClickAlternateTag = function(id) {
    console.log('ZoomOverlay.onClickAlternateTag('+id+')')
    
    if (logging.guiEvents)
        console.log("ZoomOverlay.onClickAlternateTag(id): id=", event)
    
    var activeObject = overlay.getActiveObject()
    if (activeObject == null) {
        newRectForCurrentTag()
        activeObject = overlay.getActiveObject()
    }
    
    if (activeObject !== null) {
        let obs = activeObject.obs
        
        if (obs.fix) {
            
        }
        if (obs.ID == id) {
            if (!obs.fix) {
                // Just clicked on same tag
            } else {
                delete obs.fix['newid']
                delete obs.fix['tagangle']
            }
            delete obs['newid'] 
            updateObsLabel(obs, "wrongid", false)
        } else {  // different id
            updateObsLabel(obs, "wrongid", true)
            obs.newid = id
            if (!obs.fix) {
                obs.fix={
                    newid:undefined,
                    tagangle:0
                  }
            }
            obs.fix.newid = id
        }
        
        this.spreadTagFix()
        
        // Update the rest
        updateRectObsActivity(activeObject)
        automatic_sub()
        
        updateForm(activeObject)
        refreshChronogram()
    }
}

rotatep = (function() {
        var unshift = Array.prototype.unshift,
            splice = Array.prototype.splice;

        return function(array, count) {
            var len = array.length >>> 0,
                count = count >> 0;
            array = deepcopy(array)
            unshift.apply(array, splice.call(array, count % len, len));
            return array;
        };
    })();

ZoomOverlay.prototype.rotateTag = function(angle) {
    console.log('ZoomOverlay.rotateTag('+angle+')')
    
    var activeObject = overlay.getActiveObject()
    if (activeObject == null) {
        newRectForCurrentTag()
        activeObject = overlay.getActiveObject()
    }
    
    if (activeObject == null) {
        return;
    }
    let obs = activeObject.obs
    
    updateObsLabel(obs, "wrongid", true)
    obs.newid = undefined
    if (!obs.fix) {
        obs.fix={
            newid:undefined,
            tagangle:0
          }
    }
    
    if (angle==90) {
        obs.fix.tagangle+=angle;
        //rotate(tag.p, 1)
    } else if (angle==-90) {
        obs.fix.tagangle+=angle;
        //rotate(tag.p,-1)
    }
    // Normalize between (-180,180]
    if (obs.fix.tagangle>180) obs.fix.tagangle-=360
    if (obs.fix.tagangle<=-180) obs.fix.tagangle+=360
    
    // Update the rest
    updateRectObsActivity(activeObject)
    automatic_sub()
    
    updateForm(activeObject)
    
    
    this.spreadTagFix()
    
    
    refreshChronogram()
    
//     let tag = getCurrentTag()
//     
//     if (!tag) return;
//     //if (!obs.tagangle) obs.tagangle=0.0;
//     
//     if (!tag.fix) {
//         tag.fix={
//             newid:undefined,
//             tagangle:0,
//             oldp:deepcopy(tag.p)
//           }
//     }
//     
//     tag.fix.tagangle=obs.fix.tagangle;
//     tag.p = rotatep(tag.fix.oldp, tag.fix.tagangle/90)
    
    this.refreshZoom()
}

function getCoveredTags(obs) {
    obs = Tracks[obs.frame][obs.ID]
    
    let tracks = flatTracksAll.filter(
              function(element) {return element.obs == obs}
          )
    if (tracks.length>0) {
        let track=tracks[0]
        if (! ('span' in obs)) {
            obs.span = {'f1':track.span.f1, 'f2':track.span.f2}
        }
    }
    
    if (!obs.span) {
        obs.span = {f1:obs.frame, f2:obs.frame}
    }
    var f1 = obs.span.f1
    var f2 = obs.span.f2
    
    //console.log('f1 =',f1,'f2=',f2)

    let coveredTags = []
    for (let F in Tags) {
        let frame = Number(F)
        
        if ( (frame<f1) || (frame>f2) ) continue;
    
        let tags = Tags[F].tags
        for (let i in tags) {
            let tag = tags[i]
            
            if (tag.id == obs.ID) {
                coveredTags.push(tag)
            }
        }
    }
    return coveredTags
}

ZoomOverlay.prototype.spreadTagFix = function() {
    var activeObject = overlay.getActiveObject()
    if (activeObject == null) {
        return;
    }
    let obs = activeObject.obs
    
    let tags = getCoveredTags(obs)
    console.log(tag)
    for (k in tags) {
        var tag = tags[k]
        
        //console.log(tag)
        
        if (!obs.fix || (!obs.fix.tagangle && !obs.fix.newid)) { 
            if (tag.fix) {
                if (tag.fix.oldp) {
                    tag.p = deepcopy(tag.fix.oldp)
                }
                delete tag.fix    
            }            
        } else {        
            if (!tag.fix) {
                tag.fix={
                    newid:undefined,
                    tagangle:0,
                    oldp:deepcopy(tag.p)
                  }
            }
            tag.fix.newid = obs.fix.newid
            tag.fix.tagangle = obs.fix.tagangle
            tag.p = rotatep(tag.fix.oldp, tag.fix.tagangle/90)
        }
    }
}
ZoomOverlay.prototype.bakeTagFix = function(obs) {
    if (!obs) {
        var activeObject = overlay.getActiveObject()
        if (activeObject == null) {
            return;
        }
        let obs = activeObject.obs
    }
    if (hasLabel(obs,'falsealarm')) {
        if (!obs.fix) {
            obs.fix = {
                newid:'falsealarm'
              }
        }
    }
    if (!obs.fix) { return }
    
    let tags = getCoveredTags(obs)
    for (k in tags) {
        var tag = tags[k]
        
        if (!tag.fix) {
            tag.fix={
                newid:undefined,
                tagangle:0,
                oldp:deepcopy(tag.p)
              }
        }
        
        if (obs.fix.newid=='falsealarm') {
            tag.fix.newid = obs.fix.newid
            if (tag.fix.oldid==undefined)
              tag.fix.oldid = tag.id
            tag.id = tag.fix.newid
        } else {
            tag.fix.newid = obs.fix.newid
            tag.fix.tagangle = obs.fix.tagangle
            tag.p = rotatep(tag.fix.oldp, tag.fix.tagangle/90)
        
            if (tag.fix.oldid==undefined)
              tag.fix.oldid = tag.id
            tag.id = tag.fix.newid
        }
    }
}
ZoomOverlay.prototype.bakeAllTagFixes = function() {
    for (let F in Tracks) {
        for (let id in Tracks[F]) {
            let obs = Tracks[F][id]
            
            this.bakeTagFix(obs)
        }
    }
    refreshChronogram()
}
ZoomOverlay.prototype.deleteFalsealarmTags = function() {

    var filter = (obj, predicate) => 
        Object.keys(obj)
          .filter( key => predicate(obj[key]) )
          .reduce( (res, key) => Object.assign(res, { [key]: obj[key] }), {} );

    for (let F in Tags) {
        let tags = Tags[F].tags
        
        Tags[F].tags = filter(Tags[F].tags,
                              (tag) => tag.id!='falsealarm')
        if ($.isEmptyObject(Tags[F].tags)) {
            delete Tags[F]
        }
    }
    
    refreshChronogram()
}
ZoomOverlay.prototype.deleteFalsealarmEvents = function() {
    
    for (let F in Tracks) {
        for (let id in Tracks[F]) {
            let obs = Tracks[F][id]
            
            if (hasLabel(obs,'falsealarm')) {
                delete Tracks[F][id]
            }
        }
        if ($.isEmptyObject(Tracks[F])) {
            delete Tracks[F]
        }
    }
    
    refreshChronogram()
}
ZoomOverlay.prototype.deleteWrongIdEvents = function() {
    
    for (let F in Tracks) {
        for (let id in Tracks[F]) {
            let obs = Tracks[F][id]
            
            if (hasLabel(obs,'wrongid')) {
                delete Tracks[F][id]
            }
        }
        if ($.isEmptyObject(Tracks[F])) {
            delete Tracks[F]
        }
    }
    
    refreshChronogram()
}


ZoomOverlay.prototype.undoTagFix = function(tag) {
    if (!tag.fix) {
        return
    }
    if (tag.fix.oldid==undefined) {
        return
    }
    if (tag.id=='falsealarm') {
        tag.id = tag.fix.oldid
    } else {
        tag.id = tag.fix.oldid
        tag.p = deepcopy(tag.fix.oldp)
    }
}
ZoomOverlay.prototype.undoAllTagFixes = function() {
    for (let F in Tags) {
        let tags = Tags[F].tags
        for (let i in tags) {
            let tag = tags[i]
            
            this.undoTagFix(tag)
        }
    }
    refreshChronogram()
}

// #MARK # REFRESH

ZoomOverlay.prototype.refreshZoom = function() {

    if (!this.flagShowZoom || !$('#zoom').is(':visible')) {
        if (logging.zoomOverlay)
            console.log('ZoomOverlay.refreshZoom: zoom not visible or not activated. refresh canceled.')
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
            let pt = overlay.canvasToVideoPoint(geom.center)
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
    
    if (this.flagShowOverlay) {
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
    
    this.refreshInfo()
}
ZoomOverlay.prototype.refreshTagImage = function() {
    this.refreshZoom(); // Lazy
}
ZoomOverlay.prototype.loadTagImage = function() {
    if (logging.zoomTag)
        console.log('ZoomOverlay.loadTagImage')
  
    $('.tagImageID').html("ID="+String(this.id))
  
    let url = this.tagImgURL(this.id)

    $('#tagImage').attr('src',url) 
}
ZoomOverlay.prototype.tagImgURL = function(id) {

    let padding = 4
    let paddedID = String(id);
    let N=paddedID.length
    for (var i=0; i<padding-N; i++)
        paddedID='0'+paddedID;

    let url = url_for(this.tagImageRoot+'/keyed'+paddedID+'.png')

    return url
}
ZoomOverlay.prototype.refreshInfo = function() {
    let tag=getCurrentTag()
    
    if (tag) {
        let str = 'id='+tag.id
            +' H='+tag.hamming
            +' dm='+tag.dm
        if (tag.fix) {
            str += '<br>tagangle='+tag.fix.tagangle
            if (tag.fix.newid!=undefined) {
                str += ' newid='+tag.fix.newid
            }
            if (tag.fix.oldid!=undefined) {
                str += ' oldid='+tag.fix.oldid
            }
        }
        $('#zoomInfo').html(str)
    } else {
        $('#zoomInfo').html('')
    }
}
