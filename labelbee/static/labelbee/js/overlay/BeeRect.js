/*jshint esversion: 6, asi: true */
// The fabric rectangles of the overlay: the class `fabric.BeeRect`, their creation from observations and tracks, their update from
// the observation and back, their lookup. ES module (refactor slice 8 step 11c3, ADR 0015), cut from overlay/Overlay.js as it was.
// Page globals (`overlay`, `selection`, `fabric`...) are read at call time.

import { identifyBeeRect, rotatedRectGeometry } from "./Drawing.js"
import { getObsHandle, getValidIDsForFrame } from "../annotation/Model.js"
import { logging } from "../core/Notifier.js"
import { events } from "../annotation/AnnotationStore.js"

// #MARK # FABRICJS RECTS MANAGEMENT

export function refreshRectFromObs() {
  let rectList = overlay.canvas1.getObjects();
  //if (logging.overlay)
  //    console.log("refreshRectFromObs: updating ",rectList.length," rect(s)")
  for (let rect of rectList) {
    if (typeof rect.obs !== "undefined" && !rect.dragging) { // a rectangle being dragged is ahead of the store
      updateRectFromObsGeometry(rect);
    }
    refreshRectStyle(rect);
  }
  //refreshOverlay() // Avoid infinite cycle
};
function refreshRectStyle(rect) {
  let lockRotation = true
  if (overlay.opts.showRect) {
    lockRotation = false
    if (!overlay.opts.angleEnabled) {
      lockRotation = true;
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
  if (logging.overlay) console.log("updateRectFromObsGeometry: rect=", rect);
  let obs = rect.obs;
  if (typeof obs === "undefined") {
    console.log("updateRectFromObsGeometry: activeObject.obs undefined");
    return;
  }

  let canvasRect = overlay.obsToCanvasRect(obs);

  let cx = canvasRect.left + canvasRect.width / 2;
  let cy = canvasRect.top + canvasRect.height / 2;
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
    rect.setWidth(overlay.opts.ID_dotRadius * 2)
    rect.setHeight(overlay.opts.ID_dotRadius * 2)
    rect.setLeft(cx)     // unrotated left (rotation around center)
    rect.setTop(cy)      // unrotated top
    rect.setAngle(0)
    rect.setCoords()
    // Rely on refreshRectStyle
  }
}

// Fabric BeeRect to geometry fields (the adapter of ADR 0008 P3): what the rectangle says, in video coordinates.
// Returns the fields only, it writes nothing; the caller stores them (storeUnit on release, the working copy while dragging).
export function rectToGeometry(rect) {
    let obs = rect.obs
    let geom = rotatedRectGeometry(rect);
    let videoRect = overlay.canvasToVideoRect(geom.unrotated)
    let cx = (videoRect.left + videoRect.width / 2);
    let cy = (videoRect.top + videoRect.height / 2);

    if (overlay.opts.showRect) {
        return {
            x: videoRect.left,    // unrotated left (rotation around center)
            y: videoRect.top,     // unrotated top
            width: videoRect.width,
            height: videoRect.height,
            angle: rect.angle,
            cx: cx,
            cy: cy,
        };
    }
    // Virtual rect (dot): just the center, keep width, height, angle
    return { cx: cx, cy: cy, x: cx - obs.width/2, y: cy - obs.height/2 };
}

// Fabric BeeRect to the working copy of the observation
export function updateRectObsGeometry(activeObject) {
    if (logging.overlay)
        console.log('updateRectObsGeometry: activeObject=',activeObject)
    if (typeof activeObject.obs === 'undefined') {
        console.log('updateRectObsGeometry: activeObject.obs undefined')
        return
    }
    Object.assign(activeObject.obs, rectToGeometry(activeObject))
}

export function createRectsFromTracks(F) {
  if (typeof F === "undefined") F = videoControl.getCurrentFrame();
  let ids = getValidIDsForFrame(F);
  if (logging.overlay) {
    console.log("createRectsFromTracks: ", { frame: F, ids: ids });
  }
  overlay.canvas1.renderOnAddRemove = false  // Do not render all for each change
  for (let id of ids) { // For each valid bee ID, create a rect for it
    let obs = getObsHandle(F, id, false)
    addRectFromObs(obs)
  }
  overlay.canvas1.renderAll(); // Render only once at the end
  overlay.canvas1.renderOnAddRemove = true
}
export function addRectFromObs(inputObs, draft) {
  if (typeof inputObs === "undefined") {
    console.log("ERROR in addRectFromObs: input obs undefined");
    return undefined;
  }

  // A stored observation is not copied: the rectangle holds the stored object, the store is the only holder (ADR 0008 P2)
  var obs = inputObs;
  if (typeof obs.angle === "undefined") {
    console.log("WARNING in addRectFromObs: obs.angle undefined, default to 0");
    obs.angle = 0;
  }

  var rect = new fabric.BeeRect({
    id: obs.ID,
    draft: !!draft,
    obs: obs,
    top: undefined,
    left: undefined,
    width: undefined,
    height: undefined,
    fill: "transparent",
    stroke: "blue",
    strokewidth: 6,
    cornerColor: "red",
    cornerSize: 6,
    rotatingPointOffset: 20,
    centeredRotation: true,
    //hasRotatingPoint: hasRotatingPoint,
    //lockRotation: lockRotation
  });
  rect.originX = "center";
  rect.originY = "center";

  //rect.setAngle(obs.angle); // Done in update
  updateRectFromObsGeometry(rect);

  refreshRectStyle(rect);

  overlay.canvas1.add(rect);

  if (logging.addRect) console.log("addRectFromObs: added rect=", rect);

  //var rect = addRect(obs.ID, r.left, r.top, r.width, r.height, "db", obs)
  return rect;
}
fabric.BeeRect = fabric.util.createClass(fabric.Rect, {
  type: "beerect",

  initialize: function (element, options) {
    options = options || {};

    this.callSuper("initialize", element, options);
  },

  _render: function (ctx) {
    this.callSuper("_render", ctx);

    if (zoomOverlay.flagShowParts) {
      this._drawParts(ctx);
    }

        identifyBeeRect(ctx, this, overlay.opts.ID_dotRadius, this.active);
  },

  _colormapping: function (label) {
    var color = zoomOverlay.labelList.get(label);
    if (!color) color = zoomOverlay.labelList.get("__default");
    if (!color) color = "black";
    return color;
  },

  _frame2local: function (posFrame) {
    let angle = (this.angle / 180) * Math.PI;
    var posLocal = {
      x:
        (posFrame.x - this.cx) * Math.cos(angle) +
        (posFrame.y - this.cy) * Math.sin(angle),
      y:
        -(posFrame.x - this.cx) * Math.sin(angle) +
        (posFrame.y - this.cy) * Math.cos(angle),
    };
    return posLocal;
  },

  _drawParts: function (ctx) {
    //console.log('BeeRect._drawParts')
    var parts = this.obs.parts;
    if (!parts) return;

    let geom = rotatedRectGeometry(this);
    this.cx = geom.center.x;
    this.cy = geom.center.y;

    var radius = 4;
    var x = 0,
      y = 0; // Local coordinates

    //console.log(label)

    ctx.save();

    // Compensate local coordinates to go to canvas coordinates
    ctx.rotate((-this.angle / 180) * Math.PI);
    ctx.translate(-this.cx, -this.cy);

    //console.log(parts)

    for (var part of parts) {
      var canvasPos = overlay.videoToCanvasPoint(part.posFrame);

      var x = canvasPos.x;
      var y = canvasPos.y;

      var label = part.label;
      var color = this._colormapping(label);
      ctx.strokeStyle = color;

      ctx.beginPath();
      ctx.rect(x - 3, y - 3, 7, 7);
      ctx.stroke();

      if (true) {
        ctx.beginPath();
        ctx.moveTo(this.cx, this.cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  },
});
// A fresh observation on the current frame (ADR 0008 R6): the defaults, the geometry (video coordinates, unrotated
// box) and, from the source observation of a prediction if any, its whole `labels` and nothing else.
function newObservation(id, videoRect, angle, source) {
  return {
    ID: id,
    time: videoControl.getCurrentVideoTime(),
    frame: videoControl.getCurrentFrame(),
    x: videoRect.left,
    y: videoRect.top,
    cx: videoRect.left + videoRect.width / 2,
    cy: videoRect.top + videoRect.height / 2,
    width: videoRect.width,
    height: videoRect.height,
    angle: angle == null ? 0 : angle,
    notes: "",
    labels: source && source.labels ? source.labels : "",
  };
}
// Create an observation in the store at a specific place (all units in canvas coordinates), and its fabric rectangle.
// Creation is immediate (ADR 0008 P4): `source` is the observation of a prediction, if any; an id that already exists
// on the frame is replaced by the next free integer.
export function createRect(id, startX, startY, width, height, angle, source) {
  let frame = videoControl.getCurrentFrame();
  if (events.has(frame, id)) {
    let free = Number(id);
    if (isNaN(free)) free = 0;
    while (events.has(frame, free) || events.has(frame, String(free))) free++;
    printMessage("Bee " + id + " already exists in this frame: created with id " + free, "red");
    id = free;
  }
  let canvasRect = { left: startX, top: startY, width: width, height: height };
  let videoRect = overlay.canvasToVideoRect(canvasRect);
  let obs = events.commit(newObservation(id, videoRect, angle, source));
  return addRectFromObs(obs);
}
// The rectangle drawn while ctrl-dragging: not in the store until the drag is validated (submitDraft)
// LEGACY candidate (ADR 0009, refresh-triggers 1e): the draft rect only serves the ctrl-drag creation gesture.
export function addDraftRect(id, startX, startY) {
  let canvasRect = { left: startX, top: startY, width: 1, height: 1 };
  let videoRect = overlay.canvasToVideoRect(canvasRect);
  return addRectFromObs(newObservation(id, videoRect), true);
}
// Try to find a fabric rectangle with a given id
export function findRect(id) {
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
  return undefined;
}
