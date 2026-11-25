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
import { canvasMethods } from "./Transform.js"
import {
  onMouseDown, onMouseDown2, onMouseUp, onMouseWheel, onObjectDeselected, onObjectModified, onObjectMoving, onObjectSelected,
} from "./Mouse.js"
import { plotROI, plotExcludeRects, plotTags, plotTagsTracks, plotTracks, rotatedRectGeometry, tagAngle } from "./Drawing.js"
import { getObsHandle, getValidIDsForFrame } from "../annotation/Model.js"
import { updateUndoButton } from "../SelectionControl.js"
import { updateSelectionPanels } from "../form/Form.js"
import { refreshTagsParameters } from "../chrono/ChronoData.js"
import { getVideoInfo } from "../video/VideoInfo.js"
import { VisitWidget } from "../form/VisitControl.js"
import { OverlayOptions } from "./OverlayOptions.js"
import { TimelinePicker } from "./TimelinePicker.js"
import { logging } from "../core/Notifier.js"
import { refresh } from "../annotation/RefreshBridge.js"
import { selection } from "../annotation/SelectionModelBridge.js"
import { AnnotationStore } from "../annotation/AnnotationStore.js"

// ## Video + canvas

// Canvas transform of the overlay (zoom and pan): the array is `overlay.canvasTransform`, the scale and the reference size are module state
let extraScale = 1 // extra zoom of the video frame (constant: its updates in onMouseWheel are commented out)

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

  overlay.transformFactor = 1.0;
  overlay.canvasTransform = [1, 0, 0, 1, 0, 0]; // canvas->video affine [sx, 0, 0, sy, tx, ty], updated in place
  overlay.canvasTransformReference = { w: 100, h: 100 }; // Keep previous canvas size
  overlay.videoSize = { x: 600, y: 400 };

  refreshTagsParameters();
}



// Canvas size and transform methods (overlay/Transform.js)
Object.assign(OverlayControl.prototype, canvasMethods)

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
            overlay.canvasTransform[4], overlay.canvasTransform[5],
            overlay.canvasTransform[0]*w, overlay.canvasTransform[3]*h,
            0, 0, w, h);
    if (img2)
        overlay.ctx2.drawImage(img2, 
            overlay.canvasTransform[4], overlay.canvasTransform[5],
            overlay.canvasTransform[0]*w, overlay.canvasTransform[3]*h,
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
          overlay.canvasTransform[4], overlay.canvasTransform[5],
          overlay.canvasTransform[0]*w, overlay.canvasTransform[3]*h,
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
                overlay.canvasTransform[4], overlay.canvasTransform[5],
                overlay.canvasTransform[0]*w, overlay.canvasTransform[3]*h,
                0, 0,w,h);
        });
        img.setAttribute("src", strDataURI);
    }

    if($.type(img) === "string") {
        drawDataURIOnCanvas(img)
    } else
        overlay.ctx.drawImage(img, 
            overlay.canvasTransform[4], overlay.canvasTransform[5],
            overlay.canvasTransform[0]*w, overlay.canvasTransform[3]*h,
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
        overlay.canvasTransform[4], overlay.canvasTransform[5],
        overlay.canvasTransform[0] * w, overlay.canvasTransform[3] * h,
        0, 0, w, h);
    } else {
      // Rely on video under canvas. More efficient (one copy less), but
      // may have some time discrepency between video and overlay
      overlay.ctx.clearRect(
        0, 0,
        (video.videoWidth * extraScale) / overlay.transformFactor,
        (video.videoHeight * extraScale) / overlay.transformFactor
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
      overlay.canvasTransform[4] / previewScaleX,
      overlay.canvasTransform[5] / previewScaleY,
      (overlay.canvasTransform[0] * w) / previewScaleX,
      (overlay.canvasTransform[3] * h) / previewScaleY,
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
      overlay.canvasTransform[4], overlay.canvasTransform[5],
      overlay.canvasTransform[0] * w, overlay.canvasTransform[3] * h,
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
  let frame = videoControl.getCurrentFrame();
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

// The refresh instrumentation (core/RefreshInstrumentBridge.js, ADR 0009) wraps the entry points of the overlay
OverlayControl.prototype.hardRefresh = instrument("overlay", "OverlayControl.hardRefresh", OverlayControl.prototype.hardRefresh)
OverlayControl.prototype.refreshOverlay = instrument("overlay", "OverlayControl.refreshOverlay", OverlayControl.prototype.refreshOverlay)
