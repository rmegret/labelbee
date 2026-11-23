/*jshint esversion: 6, asi: true */
// The overlay: the canvas over the video, the fabric rectangles of the observations, the drawing of IDs, tags and tracks, the
// ID prediction, the mouse and fabric events. ES module (refactor slice 8 step 11c1, ADR 0015), moved as it is from
// js/OverlayControl.js (a classic script). `OverlayControl` and the 11 functions that other files still call are installed on
// window by labelbeeBridge.js; the other functions are module-local. Page globals (`overlay`, `chrono`, `videoControl`,
// `selection`, `events`, `fabric`...) are read at call time.

import { instrument } from "../core/RefreshInstrumentBridge.js"
import {
  addDraftRect, createRect, createRectsFromTracks, findRect, rectToGeometry, refreshRectFromObs, updateRectObsGeometry,
} from "./BeeRect.js"
import { plotROI, plotExcludeRects, plotTags, plotTagsTracks, plotTracks, rotatedRectGeometry, tagAngle } from "./Drawing.js"

// ## Video + canvas

// Canvas transform of the overlay (zoom and pan), shared by the methods below; implicit globals before the module
let transformFactor, canvasTransform, canvasTransformReference

export function OverlayControl(canvasTagId) {
  if (this === window) {
    console.log(
      'ERROR: OverlayControl should be created with "new OverlayControl()". Fixing that for you.'
    );
    return new OverlayControl();
  }

  var overlay = this; // Standard name for simpler search in code

  // Events:
  $(videoControl).on("videosize:changed", (e, w, h) => {
    overlay.canvasSetVideoSize(w, h);
  });
  //$( videoControl ).on('frame:changed', (e)=>{overlay.hardRefresh()})
  //$( videoControl ).on('previewframe:changed', (e)=>{overlay.hardRefresh()})

  if (typeof canvasTagId === "undefined") canvasTagId = "canvas"; // Default HTML5 canvas tag to attach to
  overlay.canvas = document.getElementById(canvasTagId);
  overlay.ctx = overlay.canvas.getContext("2d");

    overlay.canvas2 = $('<canvas/>')[0]
    overlay.ctx2 = overlay.canvas2.getContext('2d');

  overlay.opts = new OverlayOptions(overlay) // display options (overlay/OverlayOptions.js, step 11b3d)
  overlay.opts.init()
  overlay.idPredictor = new IdPredictor(overlay)
  overlay.defaultRectSize = { width: 100, height: 100 } // size of a new rectangle, canvas pixels (was `default_width`, `overlay.defaultRectSize.height`)

  overlay.interaction = {
      mode: 'main', // 'pick-frame'
      opts: {}
  }
  // Helpers of the interaction modes, by mode name (ADR 0015, step 11b2); 'main' has none
  overlay.modes = {'pick-frame': new TimelinePicker(overlay)}
  overlay.visitWidget = new VisitWidget(overlay)
  overlay.modes['edit-visit'] = overlay.visitWidget
  
  /* Overlay and selection */

  let canvas1 = new fabric.Canvas("canvas1");

  overlay.canvas1 = canvas1;

  canvas1.selectionColor = "red";
  canvas1.selectionBorderColor = "red";
  canvas1.selection = false; // REMI: disable the blue selection (allow to select several rectangles at once, which poses problem)
  canvas1.uniScaleTransform = true; // REMI: allow free rescaling of observations without constrained aspect ratio
  //canvas1.centeredScaling = true; // REMI: rescale around center

  overlay.lastActiveRect = null; // Last selected rect (workaround for event selection:cleared not providing the last selection to onObjectDeselected)

  canvas1.on("mouse:down", onMouseDown);
  canvas1.on("mouse:up", onMouseUp);
  canvas1.on("object:moving", onObjectMoving); // During translation
  canvas1.on("object:scaling", onObjectMoving); // During scaling
  canvas1.on("object:rotating", onObjectMoving); // During rotation
  canvas1.on("object:modified", onObjectModified); // After modification
  canvas1.on("object:selected", onObjectSelected); // After mousedown
  canvas1.on("selection:cleared", onObjectDeselected); // After mousedown out of existing rectangles
  //canvas1.on('mouse:dblclick', onMouseDblClick);

  //$('#video').on('mouseDown', onMouseDown);
  $(".upper-canvas").bind("contextmenu", onMouseDown2);
  $(".upper-canvas").bind("wheel", onMouseWheel);

  /* Canvas transform */

  $("#canvasresize").resizable({
    helper: "ui-resizable-helper",
    aspectRatio: 1, // Need to put a value even to update it later
  });
  $("#canvasresize").on("resizestop", overlay.refreshCanvasSize.bind(overlay));
  //$("#canvasresize").on( "resize", refreshCanvasSize ); // Continuous (not working)

  transformFactor = 1.0;
  canvasTransform = [1, 0, 0, 1, 0, 0]; // Global
  canvasTransformReference = { w: 100, h: 100 }; // Keep previous canvas size
  overlay.videoSize = { x: 600, y: 400 };

  refreshTagsParameters();
}



OverlayControl.prototype.setInteractionMode = function(mode, opts) {
    console.log('overlay.setInteractionMode', mode, opts)

    if (mode!=this.interaction.mode) {
        // Close previous mode
    }
    let wroteSpan = false

    if (mode=='main') {
        this.interaction.mode = 'main'
        this.interaction.opts = opts
    } else if (this.modes[mode]) {
        // The helper of the mode sets `this.interaction`, or returns null to cancel
        const entered = this.modes[mode].enter(opts)
        if (!entered) return
        wroteSpan = !!entered.wroteSpan
    } else {
        console.log('overlay.setInteractionMode', 'MODE NOT IMPLEMENTED')
    }
    this.refreshInteraction()
    this.hardRefresh()
    if (wroteSpan) refresh.chrono() // the chronogram can show the span ("Show spans")
}
OverlayControl.prototype.refreshInteraction = function() {
    console.log('overlay.refreshInteration',this.interaction)
    let mode = this.interaction.mode
    let opts = this.interaction.opts

    $('.setspan').removeClass("active")
    $('.edit-visit').removeClass("active")

    const handler = this.modes[mode]
    if (handler && handler.refreshInteraction) handler.refreshInteraction(opts)
}

// "Active" is fabric's own state (the rectangle being edited); "selected" is the model's (`selection`)
// getActiveRect: return null or a Fabric.js rect (truth on the active rectangle comes from the Fabric.js canvas)
OverlayControl.prototype.getActiveRect = function () {
  return this.canvas1.getActiveObject();
};
// getActiveRectID: return undefined or an id
OverlayControl.prototype.getActiveRectID = function () {
  var activeObject = this.canvas1.getActiveObject();
  if (activeObject === null) {
    return undefined;
  } else {
    return activeObject.id;
  }
};
OverlayControl.prototype.setActiveRect = function (rect) {
  return this.canvas1.setActiveObject(rect);
};
/**
 * VIEW: makes the fabric rectangle of `id` the active one (nothing to do when it already is), or deactivates the rectangles
 * when this frame has none of `id`. It never changes `selection` (ADR 0009 section 0b) and does not update the panels
 * (`activateSelection` does). The one write that can happen during the call is fabric's own `object:selected` echo of
 * `setActiveRect`, handled by `onObjectSelected`, which finds the selection already there and refreshes nothing.
 * Returns whether a rectangle was found.
 */
OverlayControl.prototype.setActiveRectID = function (id) {
  let rect = findRect(id);
  if (rect) {
    if (logging.selectionEvents)
      console.log("setActiveRectID: trying to activate id=", id);
    if (this.getActiveRect() !== rect) this.setActiveRect(rect);
    return true;
  } else {
    // The selection keeps the id when this frame has none (selection.getKey() is then null)
    this.canvas1.deactivateAll().renderAll(); // Deactivate rect if any
    if (logging.selectionEvents)
      console.log("setActiveRectID: No rect found for id=", id);
    return false;
  }
};

// #MARK # UTILS CANVAS SIZE

OverlayControl.prototype.canvasSetVideoSize = function (w, h) {
  // Resize canvas to have same aspect-ratio as video
  let overlay = this;

  overlay.videoSize.w = w;
  overlay.videoSize.h = h;

  var wd = w,
    hd = h;
  if (true) {
    // Keep same canvas width as before, simply adjust aspect-ratio
    wd = overlay.canvas.width;
    hd = Math.round((h * overlay.canvas.width) / w);
  } else {
    // Automatic scaling to be smaller than 800pix
    while (wd > 800) {
      wd /= 2.0;
      hd /= 2.0;
    }
  }

  var borderThickness = 2;

  $("#canvasresize")[0].style.width =
    (wd + 16 + borderThickness).toString() + "px";
  $("#canvasresize")[0].style.height = (hd + borderThickness).toString() + "px";
  $("#canvasresize").resizable({
    helper: "ui-resizable-helper",
    aspectRatio: w / h,
  });

  overlay.refreshCanvasSize();
  overlay.canvasTransformReset();
};
OverlayControl.prototype.refreshCanvasSize = function (event, ui) {
  let overlay = this;

  // Refresh based on new video size or new canvas size
  if (logging.canvasEvents) {
    console.log("refreshCanvasSize: event=", event);
    console.log(
      "refreshCanvasSize: event.target.clientWidth=",
      event.target.clientWidth
    );
  }

  // Internal canvas size adjusting utility
  // Ensures all canvas elements have same size
  function resizeCanvas(wd, hd) {
    if (logging.canvasEvents)
      console.log("refreshCanvasSize.resizeCanvas: wd=", wd, " hd=", hd);

    overlay.canvas.width = wd;
    overlay.canvas.height = hd;
    overlay.canvas1.setWidth(wd);
    overlay.canvas1.setHeight(hd);

    $("#video").width(wd);
    $("#video").height(hd);

    var wrap = $(".canvaswrapper")[0];
    wrap.style.width = wd.toString() + "px";
    wrap.style.height = hd.toString() + "px";

    var borderThickness = 2;
    $("#canvasresize")[0].style.width =
      (wd + 16 + borderThickness).toString() + "px";
    $("#canvasresize")[0].style.height =
      (hd + borderThickness).toString() + "px";
  }

  // TODO: remove jQuery reference
  let video = $("#video")[0];

  var borderThickness = 4;

  let hd = 100, wd = 100;
  if (overlay.opts.fixedAspect) {
    // Assume width is in px to parse #canvasresize size
    hd = Math.round( parseInt($("#canvasresize")[0].style.height) - borderThickness );
    wd = Math.round( (hd / overlay.videoSize.h) * overlay.videoSize.w );
  } else {
    hd = Math.round( parseInt($("#canvasresize")[0].style.height) - borderThickness );
    wd = Math.round( parseInt($("#canvasresize")[0].style.width) - borderThickness );
  }
  resizeCanvas(wd, hd);

  $("#videoSize")[0].innerHTML =
    "videoSize: " +
    overlay.videoSize.w.toString() +
    "x" +
    overlay.videoSize.h.toString();
  $("#canvasSize")[0].innerHTML =
    "canvasSize: " + wd.toString() + "x" + hd.toString();

  // Change transform to keep same image content, just scaled
  var scaling = canvasTransformReference.w / overlay.canvas.width;
  var center = [canvasTransformReference.w / 2, canvasTransformReference.h / 2];
  var center2 = [overlay.canvas.width / 2, overlay.canvas.height / 2];
  canvasTransformReference.w = overlay.canvas.width;
  canvasTransformReference.h = overlay.canvas.height;

  overlay.canvasTransformScale(scaling, center, center2);

  // Don't use ctx.transform, as it also reduces the drawings overlays
  // Instead, we scale everything manually
  //var ctx=canvas.getContext("2d");
  //ctx.transform(...canvasTransform);

  //overlay.refreshOverlay() // Already done in canvasTransformScale()
};

/* Canvas Transform */
OverlayControl.prototype.canvasTransformInternalReset = function () {
  let overlay = this;

  let video = $("#video")[0];
  transformFactor = overlay.videoSize.w / overlay.canvas.width;

  let array = [transformFactor, 0, 0, transformFactor, 0, 0];
  if (isNaN(transformFactor)) {
    array = [1, 0, 0, 1, 0, 0];
  }
  for (let i = 0; i < 6; i++) {
    canvasTransform[i] = array[i];
  }

  canvasTransformReference.w = overlay.canvas.width;
  canvasTransformReference.h = overlay.canvas.height;
};
OverlayControl.prototype.canvasTransformReset = function () {
  let overlay = this;

  overlay.canvasTransformInternalReset();
  overlay.canvasTransform_Fix();
  overlay.hardRefresh();
};
OverlayControl.prototype.canvasTransformSet = function (array) {
  let overlay = this;

  for (let i = 0; i < 6; i++) {
    canvasTransform[i] = array[i];
  }
  overlay.canvasTransform_Fix();
  overlay.refreshOverlay(); // only the transform changed: the rects follow their obs
};
OverlayControl.prototype.canvasTransform_Fix = function () {
  let overlay = this;

  //let video = $('#video')[0]
  let w1 = overlay.canvas.width;
  let h1 = overlay.canvas.height;
  let w2 = overlay.videoSize.w;
  let h2 = overlay.videoSize.h;

  if (canvasTransform[0] * w1 > w2 || canvasTransform[3] * h1 > h2) {
    let scaling = Math.min(w2 / w1, h2 / h1);
    canvasTransform[0] = scaling;
    canvasTransform[3] = scaling;
  }
  //console.log(w1,h1,w2,h2)

  if (canvasTransform[4] < 0) canvasTransform[4] = 0;
  if (canvasTransform[5] < 0) canvasTransform[5] = 0;
  if (canvasTransform[4] + canvasTransform[0] * w1 > w2)
    canvasTransform[4] = w2 - canvasTransform[0] * w1;
  if (canvasTransform[5] + canvasTransform[3] * h1 > h2)
    canvasTransform[5] = h2 - canvasTransform[3] * h1;

  // Check degenerate
  var hasNan = false;
  for (let i = 0; i < 6; i++) hasNan |= isNaN(canvasTransform[i]);
  if (hasNan || canvasTransform[0] <= 0 || canvasTransform[3] <= 0) {
    console.log(
      "ERROR in canvasTransform_Fix: degenerate canvasTransform. Reinit"
    );
    overlay.canvasTransformInternalReset();
  }
};
OverlayControl.prototype.canvasTransformScale = function (
  scaling,
  center,
  center2
) {
  // center is scaling center in current canvas coordinates
  // center2 (optional) is scaling center in new canvas coordinates
  /*
    if (canvasTransform[0]*scaling > transformFactor) 
        scaling = transformFactor/canvasTransform[0] 
        // Can not zoom out more than initial
    */

  //center[1]+=2
  //center[0]+=2
  let overlay = this;

  if (typeof center2 === "undefined") center2 = center;

  //console.log('canvasTransformScale: center=',center)
  canvasTransform[4] += canvasTransform[0] * (center[0] - scaling * center2[0]);
  canvasTransform[5] += canvasTransform[3] * (center[1] - scaling * center2[1]);
  canvasTransform[0] = canvasTransform[0] * scaling;
  canvasTransform[3] = canvasTransform[3] * scaling;

  overlay.canvasTransform_Fix();

  overlay.refreshOverlay(); // only the transform changed: the rects follow their obs
};
OverlayControl.prototype.canvasTransformPan = function (dx, dy) {
  let overlay = this;

  canvasTransform[4] -= dx * canvasTransform[0];
  canvasTransform[5] -= dy * canvasTransform[3];

  overlay.canvasTransform_Fix();

  overlay.refreshOverlay(); // only the transform changed: the rects follow their obs
};
OverlayControl.prototype.canvasTransformCenter = function (cx, cy) {
  // cx,cy: new center in video coordinates
  let overlay = this

  if ((cx === undefined) || (cy === undefined)) {
    console.log('canvasTransformCenter: ABORT, center undefined', cx, cy)
    return
  }

  let w1 = overlay.canvas.width
  let h1 = overlay.canvas.height

  let sx = canvasTransform[0]   // canvas->video
  let sy = canvasTransform[3]

  canvasTransform[4] = cx - sx * w1 / 2   // tx   canvas->video
  canvasTransform[5] = cy - sy * h1 / 2   // ty

  overlay.canvasTransform_Fix() // Avoid being outside of video

  overlay.hardRefresh()
}

OverlayControl.prototype.obsToCanvasRect = function (obs) {
  let overlay = this;

  let R = { left: obs.x, top: obs.y, width: obs.width, height: obs.height };
  let R2 = overlay.videoToCanvasRect(R);
  return R2;
};
OverlayControl.prototype.canvasToVideoPoint = function (pt) {
  let overlay = this;

  return {
    x: canvasTransform[0] * pt.x + canvasTransform[4],
    y: canvasTransform[3] * pt.y + canvasTransform[5],
  };
};
OverlayControl.prototype.videoToCanvasPoint = function (pt) {
  let overlay = this;

  return {
    x: (pt.x - canvasTransform[4]) / canvasTransform[0],
    y: (pt.y - canvasTransform[5]) / canvasTransform[3],
  };
};
OverlayControl.prototype.canvasToVideoRect = function (rect) {
  let overlay = this;

  return {
    left: canvasTransform[0] * rect.left + canvasTransform[4],
    top: canvasTransform[3] * rect.top + canvasTransform[5],
    width: canvasTransform[0] * rect.width,
    height: canvasTransform[3] * rect.height,
  };
};
OverlayControl.prototype.videoToCanvasRect = function (rect) {
  let overlay = this;

  return {
    left: (rect.left - canvasTransform[4]) / canvasTransform[0],
    top: (rect.top - canvasTransform[5]) / canvasTransform[3],
    width: rect.width / canvasTransform[0],
    height: rect.height / canvasTransform[3],
  };
};

// #MARK # OVERLAY REFRESH
OverlayControl.prototype.hardRefresh = function () {
  // Recreate overlay from Tracks

  // Refresh the overlay
  //this.canvasSetVideoSize()

  this.redrawVideoFrame();

  overlay.canvas1.clear();
  createRectsFromTracks();

  const handler = this.modes[this.interaction.mode]
  if (handler && handler.hardRefresh) {
    if (handler.hardRefresh() === false) return // the mode ended and refreshed the overlay itself
  } else {
    // Default behavior (main, edit-visit)
    console.log(`using selection id=${selection.getId()}`)
    overlay.setActiveRectID(selection.getId());
  }
  updateSelectionPanels();

  this.refreshOverlay(true);

  updateUndoButton();

  //zoomOverlay.refreshZoom()
};
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
    let img = await videoControl.videoCache.getFrameImageAsync(videoUrl, frame, getVideoInfo().videofps)
    var newTab = window.open();
    newTab.document.body.innerHTML = 'Extracted Frame '+frame+' from <a target="_blank" href="'+videoUrl+'">'+videoUrl+'</a><br><div><img src="'+img.src+'" style="max-width:100%; max-height:95%;"></div>';
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

// Redraw once the frames requested by a redraw have arrived, if `frame` is still the current one.
// Only when they are all in the cache: a frame that failed would otherwise request itself again forever.
OverlayControl.prototype.refreshIfLoaded = function(videoUrl, frame, frames) {
    if (videoControl.currentFrame !== frame || videoControl.video.src !== videoUrl) return
    for (let f of frames) {
        if (f >= 0 && videoControl.videoCache.getFrameState(videoUrl, f) !== 'incache') return
    }
    this.hardRefresh()
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
    let state1 = videoControl.videoCache.getFrameState(videoUrl, frame)
    let state2 = videoControl.videoCache.getFrameState(videoUrl, frame-1)
    if ((!state1) || ((frame-1>=0)&&!state2)) {
        // CAUTION: risk of infinite async loop if test always fail!
        //videoControl.videoCache.preloadFrames(videoUrl, interval(frame-20, frame+20), getVideoInfo().videofps)
        videoControl.videoCache.preloadFrames(videoUrl, interval(frame-1,frame), getVideoInfo().videofps)
        .then(function() {
            printMessage("Preload done")
            overlay.refreshIfLoaded(videoUrl, frame, [frame, frame-1])
        })
        //videoControl.pause() // pause after to avoid infinite loop?
        //printMessage("Paused, need to preload video frames")
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

OverlayControl.prototype.redrawVideoFromCache = function() {
  var overlay = this;
  
  let w = overlay.canvas.width
  let h = overlay.canvas.height
  
  let video = videoControl.video

  function interval(start, end) {
      return Array.from({length: end-start+1}, (x, i) => start+i);
  }

  let videoUrl = video.src
  let frame=videoControl.currentFrame

  // Load async if frames not found
  let state1 = videoControl.videoCache.getFrameState(videoUrl, frame)
  if (!state1) {
      // CAUTION: risk of infinite async loop if test always fail!
      //videoControl.videoCache.preloadFrames(videoUrl, interval(frame-20, frame+20), getVideoInfo().videofps)
      videoControl.videoCache.preloadFrames(videoUrl, interval(frame-1,frame), getVideoInfo().videofps)
      .then(function() {
          printMessage("Preload done")
          overlay.refreshIfLoaded(videoUrl, frame, [frame])
      })
      //videoControl.pause() // pause after to avoid infinite loop?
      //printMessage("Paused, need to preload video frames")
  }

  let img1 = videoControl.videoCache.getFrameImageSync(videoUrl, frame)
  if (img1)
      overlay.ctx.drawImage(img1, 
          canvasTransform[4], canvasTransform[5],
          canvasTransform[0]*w, canvasTransform[3]*h,
          0, 0, w, h);
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

  let w = overlay.canvas.width;
  let h = overlay.canvas.height;

  let video = videoControl.video;

  if (!videoControl.isValidVideo) {
    if (logging.frameEvents) console.log("refresh canceled, no valid video");
    overlay.ctx.save();
    overlay.ctx.setTransform(1, 0, 0, 1, 0, 0);
    overlay.ctx.fillStyle = "#DDD";
    overlay.ctx.fillRect(0, 0, w, h);
    overlay.canvas1.clear();
    overlay.ctx.fillStyle = "#00F";
    overlay.ctx.font = "12px Verdana";
    overlay.ctx.textAlign = "center";
    overlay.ctx.textBaseline = "middle";
    var lineHeight = overlay.ctx.measureText("M").width * 1.2;
    overlay.ctx.fillText("Could not load video", w / 2, h / 2);
    overlay.ctx.fillText(video.src, w / 2, h / 2 + lineHeight);
    overlay.ctx.restore();

    overlay.canvas1.clear();
    return;
  }

  if (overlay.opts.showImageDiff) {
    overlay.redrawVideoFrameDiff() // Caution: sync, with potential async preload that may arrive too late
    return
  } 

  if (videoControl.currentMode == "video") {
    let video = videoControl.video; // same as $('#video')[0]
    if (videoControl.flagCopyVideoToCanvas) {
      // Copy video to canvas for fully synchronous display
      overlay.ctx.drawImage(video,
        canvasTransform[4], canvasTransform[5],
        canvasTransform[0] * w, canvasTransform[3] * h,
        0, 0, w, h);
    } else {
      // Rely on video under canvas. More efficient (one copy less), but
      // may have some time discrepency between video and overlay
      overlay.ctx.clearRect(
        0, 0,
        (video.videoWidth * extraScale) / transformFactor,
        (video.videoHeight * extraScale) / transformFactor
      );
    }
  } else if (videoControl.currentMode == "preview") {
    let video = videoControl.video; // same as $('#video')[0]
    let previewVideo = videoControl.previewVideo; // same as $('#video')[0]
    //overlay.canvas1.clear();
    let previewScaleX = video.videoWidth / previewVideo.videoWidth;
    let previewScaleY = video.videoHeight / previewVideo.videoHeight;
    overlay.ctx.drawImage(
      previewVideo,
      canvasTransform[4] / previewScaleX,
      canvasTransform[5] / previewScaleY,
      (canvasTransform[0] * w) / previewScaleX,
      (canvasTransform[3] * h) / previewScaleY,
      0, 0,  w, h
    );

    //         overlay.canvas1.clear();
    //         createRectsFromTracks(this.previewFrame)
    //         selectBeeByID(selection.getId());
    //         overlay.refreshOverlay()
  } else if ((videoControl.currentMode == "cache")||(videoControl.currentMode == "cache-preview")) {
    let img = videoControl.currentImage
    if (!img) {
      console.log("overlay.redrawVideoFrame: cacheImage null. ABORT")
      overlay.ctx.save();
      overlay.ctx.setTransform(1, 0, 0, 1, 0, 0);
      var lineHeight = overlay.ctx.measureText("M").width * 1.2;
      overlay.ctx.fillStyle = "#DDD";
      overlay.ctx.fillRect(0, 0, 300, lineHeight);
      overlay.ctx.fillStyle = "#00F";
      overlay.ctx.font = "12px Verdana";
      overlay.ctx.textAlign = "center";
      overlay.ctx.textBaseline = "middle";
      overlay.ctx.fillText("Frame "+String(videoControl.currentFrame)+" not in cache", 10, lineHeight);
      overlay.ctx.restore();
      overlay.canvas1.clear();
      return;
    }
    overlay.ctx.drawImage(img,
      canvasTransform[4], canvasTransform[5],
      canvasTransform[0] * w, canvasTransform[3] * h,
      0, 0, w, h);
  }
};
OverlayControl.prototype.refreshOverlay = function (skipVideoFrame) {
  // Refresh overlay from already existing overlay data
  // The tracks, tags, ROI are plotted on overlay.ctx: redrawing the video frame is what erases the previous plot.
  // hardRefresh has just done it (skipVideoFrame)
  let overlay = this;

  if (!skipVideoFrame) overlay.redrawVideoFrame();

  if (overlay.canvas1) {
    if (overlay.opts.showTagsTracks || overlay.opts.showSelectedTagsTracks) plotTagsTracks(overlay.ctx);
    if (overlay.opts.showTags) plotTags(overlay.ctx);

    if (overlay.opts.showObsTracks) {
      plotTracks(overlay.ctx);
    }

    if (overlay.opts.showObs) {
      refreshRectFromObs();
      overlay.canvas1.renderAll(); // Clear and render all rectangles
    } else {
      overlay.canvas1.clear(); // Remove all rects
    }

    plotROI(overlay.ctx);
    plotExcludeRects(overlay.ctx);
  }
};

// #MARK # ID PREDICTION

// Auxiliary for Predict
function dist(x, y, x2, y2) {
  return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
}

// Predicts the ID of a new rectangle from the observations and tags of the neighboring frames (11c2, ADR 0015); built by the
// constructor of the overlay as `overlay.idPredictor`. Coordinates in video/obs units.
class IdPredictor {
  constructor(overlay) {
    this.overlay = overlay
  }

// predictId:
// rect=={x:xx,y:yy} or rect={x:xx,y:yy,width:ww,height:hh}
// all units in video/obs coordinates
  predictId(frame, rect, mode) {
  //console.log('predictId(info), info=',info)
  // Auxiliary function: checks if two rectangles match using various modes
  var checkMatch = function (obs, rect, mode) {
    //console.log('obs=',obs,'rect=',rect)
    if (mode == "distance_topleft") {
      // Compare the distance from (x,y) to topleft corner of obs
      let d = dist(rect.x, rect.y, obs.x, obs.y);
      if (d < 40) {
        return true;
      }
    } else if (mode == "distance_center") {
      // Compare the distance from rect center to obs center
      let d = dist(
        rect.x + 0.5 * rect.width,
        rect.y + 0.5 * rect.height,
        obs.x + 0.5 * obs.width,
        obs.y + 0.5 * obs.height
      );
      if (d < 40) {
        return true;
      }
    } else if (mode == "pointinside") {
      // Check if center of rect is inside obs
      if (
        rect.x >= obs.x &&
        rect.x <= obs.x + obs.width &&
        rect.y >= obs.y &&
        rect.y <= obs.y + obs.height
      ) {
        return true;
      }
    } else if (mode == "pointinside") {
      // Check if center of rect is inside obs
      var cx = rect.x + 0.5 * w,
        cy = rect.y + 0.5 * h;
      if (
        cx >= obs.x &&
        cx <= obs.x + obs.width &&
        cy >= obs.y &&
        cy <= obs.y + obs.height
      ) {
        return true;
      }
    } else {
      console.log("predictId.checkMatch: mode unsupported:", mode);
    }
    return false;
  };
  if (frame > 0) {
    let ids = getValidIDsForFrame(frame - 1);
    //console.log("ids=",ids)
    for (let id of ids) {
      var obs = getObsHandle(frame - 1, id, false);
      //console.log("id=",id,"obs=",obs)
      if (checkMatch(obs, rect, mode)) {
        if (findRect(id))
          return {
            id: this.computeDefaultNewID(),
            predicted_id: id,
            predicted_obs: obs,
            reason: "conflict",
          };
        else
          return {
            id: id,
            obs: obs,
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
          id: this.computeDefaultNewID(),
          predicted_id: id,
          predicted_obs: obs,
          reason: "conflict",
        };
      else
        return {
          id: id,
          obs: obs,
        };
    }
  }
  return {
    id: this.computeDefaultNewID(),
    reason: "default",
  };
}
  defaultIfIDExists(predictStruct) {
    let id = predictStruct.id
    if (id==null) {
        return {
            id: this.computeDefaultNewID(),
            obs: undefined,
            d: Infinity,
            frame: undefined,
            reason: 'notFound'
        };
    } 
    if (findRect(id))
        return {
            id: this.computeDefaultNewID(),
            predicted_id: id,
            predicted_obs: obs,
            reason: 'conflict'
        };
    else
        return predictStruct;
}
  predictIdFromObsMultiframe(frameInterval, pt, mode) {
  let out = {
    id: undefined,
    obs: undefined,
    reason: "notFound",
    d: Infinity,
    frame: undefined,
  };

  for (let frame = frameInterval[0]; frame <= frameInterval[1]; frame++) {
    let ids = getValidIDsForFrame(frame);
    for (let id of ids) {
      let obs = getObsHandle(frame, id, false);
      var cx = obs.x + obs.width / 2,
        cy = obs.y + obs.height / 2;
      //console.log("id=",id,"obs=",obs)
      let d = dist(pt.x, pt.y, cx, cy);
      if (d < this.overlay.opts.predictIdClickRadius && d < out.d) {
        out = { id: id, obs: obs, reason: "distance", d: d, frame: frame };
      }
    }
  }
  return out;
}

  predictIdFromTags(frame, pt, mode) {
  var tmp = AnnotationStore.getTags()[frame];
  if (tmp == null) return { id: undefined, tag: undefined, reason: "notFound" };
  var frame_tags = tmp.tags;
  if (frame_tags != null) {
    for (let k in frame_tags) {
      let tag = frame_tags[k];
      let d = dist(pt.x, pt.y, tag.c[0], tag.c[1]);
      if (d < this.overlay.opts.predictIdClickRadius) {
        return { id: tag.id, tag: tag, reason: 'distance' };
      }
    }
  }
  return { id: undefined, tag: undefined, reason: "notFound" };
}
  predictIdFromTagsMultiframe(frameInterval, pt, mode) {
  let out = {
    id: undefined,
    tag: undefined,
    reason: "notFound",
    d: Infinity,
    frame: undefined,
  };

  for (let frame = frameInterval[0]; frame <= frameInterval[1]; frame++) {
    var tmp = AnnotationStore.getTags()[frame];
    if (tmp == null) continue;
    var frame_tags = tmp.tags;
    if (frame_tags != null) {
      for (let k in frame_tags) {
        let tag = frame_tags[k];
        let d = dist(pt.x, pt.y, tag.c[0], tag.c[1]);
        if (d < this.overlay.opts.predictIdClickRadius && d < out.d) {
          out = { id: tag.id, tag: tag, reason: 'distance', d: d, frame: frame };
        }
      }
    }
  }
  return out;
}
  computeDefaultNewID() {
  var default_id = 0;
  let frame = getCurrentFrame();
  let ids = getValidIDsForFrame(frame);
  if (ids.length == 0) {
    return 0;
  }
  function contains(A, id) {
    for (let i in A) {
      if (A[i] == id) return true; // NOTE: 4=='4' is considered true
    }
    return false;
  }
  while (contains(ids, default_id)) default_id++;
  if (logging.idPrediction) {
    console.log(
      "computeDefaultNewID: frame=",
      frame,
      " default_id=",
      default_id
    );
    console.log("   ids=", ids);
  }
  return String(default_id)
}
}

// #MARK # LOW-LEVEL MOUSE EVENTS


function newRectForTag(tag) {
  let angle = tagAngle(tag);
  if (!overlay.opts.angleEnabled) {
    angle = 0;
  }
  let pt = overlay.videoToCanvasPoint({ x: tag.c[0], y: tag.c[1] });
  let rect
  if (typeof angle !== "undefined") {
    console.log("newObsForTag: found angle=", angle);
    let ds=getDefaultRectSizeCanvas()
    rect = createRect(
      tag.id,
      pt.x - ds.w / 2,
      pt.y - ds.h / 2,
      ds.w,
      ds.h,
      angle
    );
  } else {
    console.log("newObsForTag: angle not found");
    let ds=getDefaultRectSizeCanvas()
    rect = createRect(
      tag.id,
      pt.x - ds.w / 2,
      pt.y - ds.h / 2,
      ds.w,
      ds.h
    );
  }
  return rect;
}
// LEGACY, obsolete (ADR 0009, refactor/design/0009-refresh-triggers.md 1e): creates a rect by hand and refreshes
// on its own. To be replaced by a plain events.create with default values.
export function newRectForCurrentTag() {
  if ($("#newRectForCurrentTag").hasClass("disabled")) {
    return;
  }
  let id = selection.getId();
  if (id == null) {
    printMessage("No current tag selected", "red");
    return;
  }
  let tag = getCurrentTag();
  if (tag == null) {
    printMessage(
      "Current tag not visible in this frame. Try Next or Prev event",
      "red"
    );
    return;
  }
  let r = overlay.getActiveRect();
  if (r != null) {
    printMessage("Current tag already annotated", "red");
    return;
  }
  var rect = newRectForTag(tag);

  overlay.setActiveRect(rect);
  overlay.canvas1.renderAll();

  refresh.rebuild();
}

/* Create new rect from prediction */
function onMouseDown_predict(option) {
  var startX = option.e.offsetX,
    startY = option.e.offsetY;
  let canvasXY = { x: startX, y: startY };
  let videoXY = overlay.canvasToVideoPoint(canvasXY);
  var rect;

  if (logging.mouseEvents) {
    console.log("onMouseDown_predict: no object selected", option);
    console.log("onMouseDown_predict: currentID=", selection.getId());
  }

  // predictId takes video/obs coordinates units
    //let prediction = predictId(getCurrentFrame(), videoXY, "pointinside");
    let f = getCurrentFrame()
    let interval = [f-chrono.config.trackWindow.trackWindowBackward, f+chrono.config.trackWindow.trackWindowForward]
    if (interval[0]<0) interval[0]=0
    if (interval[1]>=getVideoInfo().nframes) interval[1]=getVideoInfo().nframes-1
    let prediction = overlay.idPredictor.predictIdFromObsMultiframe(interval,videoXY, "distance")
    prediction = overlay.idPredictor.defaultIfIDExists(prediction)
  let predictionTag = overlay.idPredictor.predictIdFromTags(getCurrentFrame(), videoXY, "distance");
  //$("#I").val(prediction.id)

  if (logging.mouseEvents) {
    console.log(
      "onMouseDown_predict: predictId         --> prediction=",
      prediction
    );
    console.log(
      "onMouseDown_predict: predictIdFromTags --> predictionTag=",
      predictionTag
    );
  }

  if (predictionTag.id !== undefined) {
    // If found a tag on this frame
    if (logging.mouseEvents)
      console.log("onMouseDown_predict: predictionTag=", predictionTag);
    let tag = predictionTag.tag;
    let pt = overlay.videoToCanvasPoint({ x: tag.c[0], y: tag.c[1] });

    if (prediction.obs && prediction.id == tag.id) {
      // If found a rect with same id as tag on adjacent frame
      let obs = prediction.obs;

      if (logging.mouseEvents)
        console.log(
          "onMouseDown_predict: copying rect from tag ",
          tag,
          " and obs ",
          obs
        );

      // Copy rectangle from source of prediction
      // addRect takes canvas coordinates units
      let r = overlay.obsToCanvasRect(obs);
      rect = createRect(prediction.id, r.left, r.top, r.width, r.height, undefined, obs);
    } else {
      // Only found tag
      if (logging.mouseEvents)
        console.log("onMouseDown_predict: copying rect from tag ", tag);

      rect = newRectForTag(tag);
    }
  } else if (prediction.obs) {
    // Only found rect
    let obs = prediction.obs;

    if (logging.mouseEvents)
      console.log("onMouseDown_predict: prediction obs=", obs);

    // Copy rectangle from source of prediction
    // addRect takes canvas coordinates units
    let r = overlay.obsToCanvasRect(obs);
    let width = r.width,
      height = r.height;
    rect = createRect(
      prediction.id,
      startX - width / 2,
      startY - height / 2,
      width,
      height,
      undefined,
      obs
    );
    if (logging.mouseEvents)
      console.log("onMouseDown_predict: copied rect from ", obs);
  } else {
    let id = selection.getId();
    if (
      id == null ||
      getObsHandle(getCurrentFrame(), id, false) !== undefined
    ) {
      id = prediction.id;
    }
    while (getObsHandle(getCurrentFrame(), id, false) !== undefined) {
      id = id + 1;
    }
    // Did not find any tag nor rect
    let ds=getDefaultRectSizeCanvas()
    rect = createRect(
      id,
      startX - ds.w / 2,
      startY - ds.h / 2,
      ds.w,
      ds.h
    );
    if (logging.mouseEvents)
      console.log(
        "onMouseDown_predict: did not find tag or event, created new rect with default size ",
        rect
      );
  }
  rect.setCoords();
  overlay.setActiveRect(rect);
  overlay.canvas1.renderAll();

  refresh.rebuild(); // the new box is in the store
  // Fire mouse:down again, this time with the created target
  // overlay.canvas1.fire("mouse:down", {
  //     target: rect,
  //     e: option.e
  // })
}

function updateDefaultSizeFromRect(rect) {
  overlay.defaultRectSize.width = rect.width * canvasTransform[0];
  overlay.defaultRectSize.height = rect.height * canvasTransform[3];
  if (overlay.defaultRectSize.width<1) overlay.defaultRectSize.width=1
  if (overlay.defaultRectSize.height<1) overlay.defaultRectSize.height=1
}
function getDefaultRectSizeCanvas() {
  return {w: overlay.defaultRectSize.width / canvasTransform[0], h: overlay.defaultRectSize.height / canvasTransform[3]};
}

/* Create new rectangle interactively (dragging) */
function onMouseDown_interactiveRect(option) {
  if (logging.mouseEvents)
    console.log("onMouseDown_interactiveRect: new rect at ", startX, startY);

  var startX = option.e.offsetX,
    startY = option.e.offsetY;

  let canvasXY = { x: startX, y: startY }
  let clientXY = { x: option.e.clientX, y: option.e.clientY }
  let videoXY = overlay.canvasToVideoPoint(canvasXY)
  //let prediction = predictId(getCurrentFrame(), videoXY, "distance_topleft");

  let f = getCurrentFrame()
  let interval = [f - chrono.config.trackWindow.trackWindowBackward, f + chrono.config.trackWindow.trackWindowForward]
  if (interval[0] < 0) interval[0] = 0
  if (interval[1] >= getVideoInfo().nframes) interval[1] = getVideoInfo().nframes - 1
  let prediction = overlay.idPredictor.predictIdFromObsMultiframe(interval, videoXY, "distance")
  prediction = overlay.idPredictor.defaultIfIDExists(prediction)
  if (logging.mouseEvents)
    console.log("onMouseDown_interactiveRect: prediction", prediction, 'from videoXY', videoXY)

  $("#I").val(prediction.id)

  let id = prediction.id;

  var rect = addDraftRect(id, startX, startY);
  var topleft = { x: startX, y: startY };

  var center = rect.getCenterPoint();
  rect.hasControls = false; // Do not show controls when creating
  overlay.setActiveRect(rect);
  //canvas1.renderAll();

  var onMouseMove_interactiveRect = function (option) {
    if (logging.mouseMoveEvents)
      console.log("onMouseMove_interactiveRect: option=", option);
    var e = option.e;

    rect.validated = true; // Need dragging a bit to validate the rectangle

    let delta = { x: e.clientX - clientXY.x, y: e.clientY - clientXY.y };

        if (overlay.opts.resizeAroundCenter) {
      let w = delta.x * 2,
        h = delta.y * 2;
      rect.set({
        width: w,
        height: h,
        // Note: Fabric.js quirk with originX=originY='center':
        // left,top means centerX,centerY !!!
        left: center.x,
        top: center.y,
      });
    } else {
      let w = delta.x,
        h = delta.y;
      rect.set({
        width: w,
        height: h,
        // Note: Fabric.js quirk with originX=originY='center':
        // left,top means centerX,centerY !!!
        left: topleft.x + w / 2,
        top: topleft.y + h / 2,
      });
    }
    rect.setCoords();

    //canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
    overlay.canvas1.renderAll(); // Refresh rectangles drawing

    updateForm(rect);
  };
  var onMouseUp_interactiveRect = function (e) {
    if (logging.mouseEvents) console.log("onMouseUp_interactiveRect: e=", e);
    overlay.canvas1.off("mouse:move", onMouseMove_interactiveRect);
    overlay.canvas1.off("mouse:up", onMouseUp_interactiveRect);

    var activeObject = rect;
    if (logging.mouseEvents)
      console.log(
        "onMouseUp_interactiveRect: rect=",
        rect,
        "active=",
        overlay.canvas1.getActiveObject()
      );
    if (activeObject.validated) {
      fixRectSizeAfterScaling(activeObject); // Fix negative width or height
      updateRectObsGeometry(activeObject); // Copy geometry to obs
      //canvas1.deactivateAll()
      rect.hasControls = true; // Reactivate controls when created
      overlay.canvas1.setActiveObject(rect); // WORKAROUND: activate again to avoid filled display bug
      overlay.canvas1.renderAll();

      // Update default size to latest rectangle created
      updateDefaultSizeFromRect(activeObject)

      // updateForm(activeObject)
      // $('#I')[0].focus() // Set focus to allow easy ID typing
      // $('#I')[0].select()

      // printMessage("Press enter to validate ID", "green")

      // submitDraft rebuilds (and refreshes the chronogram and the form) when it stores the box
      if (!submitDraft(activeObject)) refresh.overlayRebuild() // refused (id conflict): the rebuild drops the draft
    } else {
      // Not enough drag to define a new rectangle
      overlay.canvas1.deactivateAll();
      overlay.canvas1.remove(activeObject);
      //canvas1.renderAll();
      //$("#I").val("no selection")
      if (logging.mouseEvents)
        console.log(
          "onMouseUp: removing non validated activeObject=",
          activeObject
        );
      deselectBee();
      refresh.overlayRebuild(); // nothing was stored
    }
  };

  overlay.canvas1.on("mouse:up", onMouseUp_interactiveRect);
  overlay.canvas1.on("mouse:move", onMouseMove_interactiveRect);
  return rect;
}

/* Find close trajectory tag, go to frame and select tag */
function onMouseDown_selectMultiframe(option) {
  console.log("onMouseDown_selectMultiframe: option=", option);

  let ptCanvas = { x: option.e.offsetX, y: option.e.offsetY };
  let pt = overlay.canvasToVideoPoint(ptCanvas);

  var tmp;

  let clickMultiframe = true;
  if (!clickMultiframe) {
    tmp = overlay.idPredictor.predictIdFromTags(getCurrentFrame(), pt);

    if (tmp.id != null) {
      console.log("onMouseDown_selectMultiframe: found id=", tmp.id);
      selection.select(getCurrentFrame(), tmp.id);
      videoControl.refresh();
    } else {
      deselectBee();
      refresh.selection();
    }
  } else {
    let done = false;
    if (overlay.opts.showObsTracks) {
      tmp = overlay.idPredictor.predictIdFromObsMultiframe(
        [
          getCurrentFrame() - chrono.config.trackWindow.trackWindowBackward,
          getCurrentFrame() + chrono.config.trackWindow.trackWindowForward,
        ],
        pt
      );

      if (tmp.id != null) {
        console.log(
          "onMouseDown_selectMultiframe: found Obs id=",
          tmp.id,
          "frame=",
          tmp.frame
        );
        selectBeeByIDandFrame(tmp.id, tmp.frame);
        done = true;
      }
    }
    if (!done && (overlay.opts.showTagsTracks || overlay.opts.showSelectedTagsTracks)) {
      tmp = overlay.idPredictor.predictIdFromTagsMultiframe(
        [
          getCurrentFrame() - chrono.config.trackWindow.trackWindowBackward,
          getCurrentFrame() + chrono.config.trackWindow.trackWindowForward,
        ],
        pt
      );

      if (tmp.id != null) {
        console.log(
          "onMouseDown_selectMultiframe: found Tag id=",
          tmp.id,
          "frame=",
          tmp.frame
        );
        selectBeeByIDandFrame(tmp.id, tmp.frame);
        done = true;
      }
    }
    if (!done) {
      console.log("onMouseDown_selectMultiframe: not found Obs nor Tag");
      deselectBee();
      videoControl.refresh();
    }
  }
}

/* Canvas zoom and pan */
function onMouseDown_panning(option) {
  let panning = {};
  panning.p0 = {
    x: option.e.clientX,
    y: option.e.clientY,
  };
  panning.canvasTransform0 = [...canvasTransform];
  panning.canvasTransform = [...canvasTransform];
  if (logging.mouseMoveEvents)
    console.log("onMouseDown_panning: option=", option);

  var onMouseMove_panning = function (option) {
    if (logging.mouseMoveEvents)
      console.log("onMouseMove_panning: option=", option);
    var e = option.e;
    let dx = e.clientX - panning.p0.x;
    let dy = e.clientY - panning.p0.y;

    panning.canvasTransform[4] =
      panning.canvasTransform0[4] - dx * panning.canvasTransform0[0];
    panning.canvasTransform[5] =
      panning.canvasTransform0[5] - dy * panning.canvasTransform0[3];
    overlay.canvasTransformSet(panning.canvasTransform);

    //canvasTransform_Fix()
  };
  var onMouseUp_panning = function (e) {
    if (logging.mouseEvents) console.log("onMouseUp_panning: e=", e);
    overlay.canvas1.off("mouse:move", onMouseMove_panning);
    overlay.canvas1.off("mouse:up", onMouseUp_panning);
  };

  overlay.canvas1.on("mouse:up", onMouseUp_panning);
  overlay.canvas1.on("mouse:move", onMouseMove_panning);
}

export function onMouseDown(option) {
  if (logging.mouseEvents) console.log("onMouseDown: option=", option);

  videoControl.pause();

  printMessage("");

  if (option.e.altKey) {
    if (logging.mouseEvents)
      console.log('onMouseDown: panning', option)
    onMouseDown_panning(option)
    return
  }

  // VisitWidget Interaction Mode
  if (overlay.interaction.mode == 'edit-visit') {
    if (overlay.interaction.opts.pickMode == 'pollinator') {
      let target = option.target
      if (typeof target == "undefined") {
        return false
      }
      // Clicked on an existing object
      console.log('onMouseDown / edit-visit / pollinator: clicked', target)
      overlay.visitWidget.setPollinator(target.obs)
      return true
    }
    if (overlay.interaction.opts.pickMode == 'flower') {
      let target = option.target
      if (typeof target == "undefined") {
        return false
      }
      // Clicked on an existing object
      console.log('onMouseDown / edit-visit / flower: clicked', target)
      overlay.visitWidget.setFlower(target.obs)
      return true
    }
    // Cancel if clicked in the background
    overlay.setInteractionMode('main')
    return false
  }

  if (overlay.opts.clickModeNewAnnotation) {
    if ((typeof option.target != "undefined")
      //&& (overlay.previousActiveRect.id == option.target.id)
    ) {
      // Allow to move currentlu selected annotation
      // Workaround: previousActiveRect used because lastActiveRect is updated during mouseDown
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
    $('.overlayOpts-clickModeNewAnnotation').effect({ 'effect': "highlight", "duration": 200, "color": "#ffff00" })
    //$('.overlayOpts-clickModeNewAnnotation').effect({'effect':"pulsate","duration":100,"times":2})
    return false
  }

  if (typeof option.target != "undefined") {
    // Clicked on an existing object
    if (logging.mouseEvents)
      console.log("onMouseDown: Clicked on object ", option.target);
    // This is now handled by event onObjectSelected()
    return false;
  } else {
    // Clicked on the background
    if (logging.mouseEvents)
      console.log("onMouseDown: no object selected", option);

    if (option.e.shiftKey) {
      // If SHIFT down, try to copy prediction
      // or create box centered on click if none
      onMouseDown_predict(option);
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

let extraScale = 1;
function onMouseWheel(option) {
  if (option.altKey && option.ctrlKey) onMouseWheel_Zooming(option);
  else if (option.altKey) onMouseWheel_Panning(option);
  // else, ignore
}
function onMouseWheel_Zooming(option) {
  //if (!option.shiftKey) return;
  if (logging.mouseEvents) console.log("onMouseWheel_Zooming: option=", option);
  let delta = option.originalEvent.wheelDelta;

  let scaling = Math.pow(2, delta / 512);

  //var rect = canvas.getBoundingClientRect();
  //let cx = option.originalEvent.clientX - rect.left
  //let cy = option.originalEvent.clientY - rect.top
  let cx = option.originalEvent.offsetX;
  let cy = option.originalEvent.offsetY;

  let center = [cx, cy];

  overlay.canvasTransformScale(scaling, center);

  //     extraScale *= scaling
  //     if (extraScale<1) extraScale = 1
  if (logging.mouseEvents) {
    console.log("onMouseWheel: scaling=", scaling, " center=", center);
    console.log("onMouseWheel: canvasTransform=", canvasTransform);
  }

  option.preventDefault();
}
function onMouseWheel_Panning(option) {
  //if (!option.shiftKey) return;
  let deltaX = option.originalEvent.wheelDeltaX;
  let deltaY = option.originalEvent.wheelDeltaY;
  if (logging.mouseEvents)
    console.log("onMouseWheel_Panning: deltaX=", deltaX, " deltaY=", deltaY);

  overlay.canvasTransformPan(deltaX, deltaY);

  option.preventDefault();
}

function onMouseDown2(ev) {
  if (ev.ctrlKey) {
    console.log("onMouseDown2", ev);

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
    console.log("fixRectSizeAfterScaling: rect=", rect);

  rect.set("width", rect.get("width") * rect.get("scaleX"));
  rect.set("scaleX", 1);
  rect.set("height", rect.get("height") * rect.get("scaleY"));
  rect.set("scaleY", 1);

  // Fix also negative width and height
  if (rect.get("width") < 0) {
    rect.set("width", -rect.get("width"));
    rect.set("left", rect.get("left") - rect.get("width"));
  }
  if (rect.get("height") < 0) {
    rect.set("height", -rect.get("height"));
    rect.set("top", rect.get("top") - rect.get("height"));
  }
  rect.setCoords();

  // Update default size when rectangle is created by just clicking
  //default_width = rect.get("width");
  //default_height = rect.get("height");
  updateDefaultSizeFromRect(rect)
}

function onMouseUp(option) {
  if (logging.mouseEvents) console.log("onMouseUp: option=", option);
  // All mouseUp stuff should be handled directly by ad-hoc callbacks
  // attached/detached in mouseDown code
}

// #MARK # FABRICJS EVENTS

export function onObjectSelected(option) {
  if (logging.selectionEvents) console.log("onObjectSelected:", option);
  //var activeObject = canvas1.getActiveObject();
  if (typeof option.target.id != "undefined") {
    if (option.target.id != overlay.getActiveRect().id) {
      console.log(
        "ERROR in onObjectSelected: option.target.id != canvas1.getActiveObject().id",
        option.target.id,
        overlay.getActiveRect().id
      );
    }
    overlay.previousActiveRect = overlay.lastActiveRect
    let frame = option.target.obs ? option.target.obs.frame : getCurrentFrame()
    let draft = !!option.target.draft
    // A selection already there is the echo of a view activating the rectangle (setActiveRectID): the caller shows it
    let echo = selection.is(frame, option.target.id, draft)
    selection.select(frame, option.target.id, draft)
    overlay.lastActiveRect = option.target
    if (!echo) {
      refresh.selection()
    }

    // If selected a "visit" event, slect it also in the visitWidget
    let obs = getObsHandle(option.target.obs.frame, option.target.id)
    if (obs && obs.visit) {
      overlay.visitWidget.selectVisit(obs)
    }
  }
}

export function autoCentering(obs) {
  if (!obs) {
    console.log('autoCentering: ABORT, no suitable obs:', obs)
    return
  }
  console.log('autoCentering: obs=', obs)
  let cx = obs.x + obs.width / 2, cy = obs.y + obs.height / 2
  overlay.canvasTransformCenter(cx, cy)
}

export function onObjectDeselected(option) {
  if (logging.selectionEvents) console.log("onObjectDeselected: ", option);

  if (overlay.lastActiveRect !== null) {
    if (overlay.lastActiveRect.draft) {
      if (logging.mouseEvents)
        console.log(
          "onObjectDeselected: removing non submitted lastActiveRect=",
          overlay.lastActiveRect
        );

      // Remove tmp rect as soon as it becomes inactive
      overlay.canvas1.remove(overlay.lastActiveRect);
      overlay.lastActiveRect = null;
      videoControl.refresh();
    }
    updateDeleteButton();
  }
}

function onObjectMoving(option) {
  //return; // No real need for Moving, we can update everything once at the end in onObjectModified

  // Called during translation only
  var activeObject = option.target; //canvas1.getActiveObject();
  if (logging.mouseMoveEvents)
    console.log("onObjectMoving: activeObject=", activeObject);

  // The drag only moves the fabric rectangle; the geometry is stored on release (onObjectModified, ADR 0008 P3)
  activeObject.dragging = true;
  fixRectSizeAfterScaling(activeObject);

  //canvas1.renderAll(); // Refresh rectangles drawing
  overlay.refreshOverlay();

  updateForm(activeObject);
  //automatic_sub();

  $(overlay).trigger("object:moving");
  //zoomOverlay.refreshFromSelection()
}

function onObjectModified(option) {
  // Called after translation or scaling
  var activeObject = option.target; //canvas1.getActiveObject();
  fixRectSizeAfterScaling(activeObject);
  if (logging.mouseEvents)
    console.log("onObjectModified: activeObject=", activeObject);

  // Release: the geometry unit goes to the store (ADR 0008 P3); the drag only moved the fabric rectangle
  activeObject.dragging = false;
  storeUnit(activeObject, rectToGeometry(activeObject));

  refresh.overlayUpdate(); // the rectangle already shows the geometry
  refresh.form();
  if (chrono.config.region.useROI) refresh.chrono(); // the chronogram reads cx, cy only for the ROI filter
  //showZoom(activeObject)

  $(overlay).trigger("object:modified");
  //zoomOverlay.refreshFromSelection()
}


/* A partial tag (for instance only {id, frame} from an events CSV) has no center `c` */
// The refresh instrumentation (core/RefreshInstrumentBridge.js, ADR 0009) wraps the entry points of the overlay
OverlayControl.prototype.hardRefresh = instrument("overlay", "OverlayControl.hardRefresh", OverlayControl.prototype.hardRefresh)
OverlayControl.prototype.refreshOverlay = instrument("overlay", "OverlayControl.refreshOverlay", OverlayControl.prototype.refreshOverlay)
