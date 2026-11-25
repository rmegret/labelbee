/*jshint esversion: 6, asi: true */
// The mouse and fabric events of the overlay: creation of rectangles by click and drag, selection, pan and zoom of the canvas, fabric
// events (selected, moving, modified). ES module (refactor slice 8 step 11c5, ADR 0015), cut from overlay/Overlay.js as it was.
// Page globals (`overlay`, `chrono`, `selection`, `videoControl`...) are read at call time.

import { addDraftRect, createRect, rectToGeometry, updateRectObsGeometry } from "./BeeRect.js"
import { tagAngle } from "./Drawing.js"
import { getObsHandle } from "../annotation/Model.js"

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
    //let prediction = predictId(videoControl.getCurrentFrame(), videoXY, "pointinside");
    let f = videoControl.getCurrentFrame()
    let interval = [f-chrono.config.trackWindow.trackWindowBackward, f+chrono.config.trackWindow.trackWindowForward]
    if (interval[0]<0) interval[0]=0
    if (interval[1]>=getVideoInfo().nframes) interval[1]=getVideoInfo().nframes-1
    let prediction = overlay.idPredictor.predictIdFromObsMultiframe(interval,videoXY, "distance")
    prediction = overlay.idPredictor.defaultIfIDExists(prediction)
  let predictionTag = overlay.idPredictor.predictIdFromTags(videoControl.getCurrentFrame(), videoXY, "distance");
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
      getObsHandle(videoControl.getCurrentFrame(), id, false) !== undefined
    ) {
      id = prediction.id;
    }
    while (getObsHandle(videoControl.getCurrentFrame(), id, false) !== undefined) {
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
  overlay.defaultRectSize.width = rect.width * overlay.canvasTransform[0];
  overlay.defaultRectSize.height = rect.height * overlay.canvasTransform[3];
  if (overlay.defaultRectSize.width<1) overlay.defaultRectSize.width=1
  if (overlay.defaultRectSize.height<1) overlay.defaultRectSize.height=1
}
function getDefaultRectSizeCanvas() {
  return {w: overlay.defaultRectSize.width / overlay.canvasTransform[0], h: overlay.defaultRectSize.height / overlay.canvasTransform[3]};
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
  //let prediction = predictId(videoControl.getCurrentFrame(), videoXY, "distance_topleft");

  let f = videoControl.getCurrentFrame()
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
    tmp = overlay.idPredictor.predictIdFromTags(videoControl.getCurrentFrame(), pt);

    if (tmp.id != null) {
      console.log("onMouseDown_selectMultiframe: found id=", tmp.id);
      selection.select(videoControl.getCurrentFrame(), tmp.id);
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
          videoControl.getCurrentFrame() - chrono.config.trackWindow.trackWindowBackward,
          videoControl.getCurrentFrame() + chrono.config.trackWindow.trackWindowForward,
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
          videoControl.getCurrentFrame() - chrono.config.trackWindow.trackWindowBackward,
          videoControl.getCurrentFrame() + chrono.config.trackWindow.trackWindowForward,
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
  panning.canvasTransform0 = [...overlay.canvasTransform];
  panning.canvasTransform = [...overlay.canvasTransform];
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

export function onMouseWheel(option) {
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
    console.log("onMouseWheel: canvasTransform=", overlay.canvasTransform);
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

export function onMouseDown2(ev) {
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

export function onMouseUp(option) {
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
    let frame = option.target.obs ? option.target.obs.frame : videoControl.getCurrentFrame()
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

export function onObjectMoving(option) {
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

export function onObjectModified(option) {
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
