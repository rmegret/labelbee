/*jshint esversion: 6, asi: true */
// Canvas size and canvas transform (zoom and pan) of the overlay: resize to the video aspect ratio, the affine
// `overlay.canvasTransform`, and the conversions between canvas and video coordinates. ES module (refactor slice 8
// step 11c6, ADR 0015), cut from overlay/Overlay.js as it was. The methods are installed on OverlayControl.prototype
// by Overlay.js (`Object.assign(OverlayControl.prototype, canvasMethods)`), so `overlay.canvasToVideoPoint(...)` etc. are unchanged.

import { logging } from "../core/Notifier.js"
export const canvasMethods = {}

canvasMethods.canvasSetVideoSize = function (w, h) {
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
canvasMethods.refreshCanvasSize = function (event, ui) {
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
  var scaling = overlay.canvasTransformReference.w / overlay.canvas.width;
  var center = [overlay.canvasTransformReference.w / 2, overlay.canvasTransformReference.h / 2];
  var center2 = [overlay.canvas.width / 2, overlay.canvas.height / 2];
  overlay.canvasTransformReference.w = overlay.canvas.width;
  overlay.canvasTransformReference.h = overlay.canvas.height;

  overlay.canvasTransformScale(scaling, center, center2);

  // Don't use ctx.transform, as it also reduces the drawings overlays
  // Instead, we scale everything manually
  //var ctx=canvas.getContext("2d");
  //ctx.transform(...canvasTransform);

  //overlay.refreshOverlay() // Already done in canvasTransformScale()
};

/* Canvas Transform */
canvasMethods.canvasTransformInternalReset = function () {
  let overlay = this;

  let video = $("#video")[0];
  overlay.transformFactor = overlay.videoSize.w / overlay.canvas.width;

  let array = [overlay.transformFactor, 0, 0, overlay.transformFactor, 0, 0];
  if (isNaN(overlay.transformFactor)) {
    array = [1, 0, 0, 1, 0, 0];
  }
  for (let i = 0; i < 6; i++) {
    overlay.canvasTransform[i] = array[i];
  }

  overlay.canvasTransformReference.w = overlay.canvas.width;
  overlay.canvasTransformReference.h = overlay.canvas.height;
};
canvasMethods.canvasTransformReset = function () {
  let overlay = this;

  overlay.canvasTransformInternalReset();
  overlay.canvasTransform_Fix();
  overlay.hardRefresh();
};
canvasMethods.canvasTransformSet = function (array) {
  let overlay = this;

  for (let i = 0; i < 6; i++) {
    overlay.canvasTransform[i] = array[i];
  }
  overlay.canvasTransform_Fix();
  overlay.refreshOverlay(); // only the transform changed: the rects follow their obs
};
canvasMethods.canvasTransform_Fix = function () {
  let overlay = this;

  //let video = $('#video')[0]
  let w1 = overlay.canvas.width;
  let h1 = overlay.canvas.height;
  let w2 = overlay.videoSize.w;
  let h2 = overlay.videoSize.h;

  if (overlay.canvasTransform[0] * w1 > w2 || overlay.canvasTransform[3] * h1 > h2) {
    let scaling = Math.min(w2 / w1, h2 / h1);
    overlay.canvasTransform[0] = scaling;
    overlay.canvasTransform[3] = scaling;
  }
  //console.log(w1,h1,w2,h2)

  if (overlay.canvasTransform[4] < 0) overlay.canvasTransform[4] = 0;
  if (overlay.canvasTransform[5] < 0) overlay.canvasTransform[5] = 0;
  if (overlay.canvasTransform[4] + overlay.canvasTransform[0] * w1 > w2)
    overlay.canvasTransform[4] = w2 - overlay.canvasTransform[0] * w1;
  if (overlay.canvasTransform[5] + overlay.canvasTransform[3] * h1 > h2)
    overlay.canvasTransform[5] = h2 - overlay.canvasTransform[3] * h1;

  // Check degenerate
  var hasNan = false;
  for (let i = 0; i < 6; i++) hasNan |= isNaN(overlay.canvasTransform[i]);
  if (hasNan || overlay.canvasTransform[0] <= 0 || overlay.canvasTransform[3] <= 0) {
    console.log(
      "ERROR in canvasTransform_Fix: degenerate canvasTransform. Reinit"
    );
    overlay.canvasTransformInternalReset();
  }
};
canvasMethods.canvasTransformScale = function (
  scaling,
  center,
  center2
) {
  // center is scaling center in current canvas coordinates
  // center2 (optional) is scaling center in new canvas coordinates
  /*
    if (overlay.canvasTransform[0]*scaling > overlay.transformFactor) 
        scaling = overlay.transformFactor/overlay.canvasTransform[0] 
        // Can not zoom out more than initial
    */

  //center[1]+=2
  //center[0]+=2
  let overlay = this;

  if (typeof center2 === "undefined") center2 = center;

  //console.log('canvasTransformScale: center=',center)
  overlay.canvasTransform[4] += overlay.canvasTransform[0] * (center[0] - scaling * center2[0]);
  overlay.canvasTransform[5] += overlay.canvasTransform[3] * (center[1] - scaling * center2[1]);
  overlay.canvasTransform[0] = overlay.canvasTransform[0] * scaling;
  overlay.canvasTransform[3] = overlay.canvasTransform[3] * scaling;

  overlay.canvasTransform_Fix();

  overlay.refreshOverlay(); // only the transform changed: the rects follow their obs
};
canvasMethods.canvasTransformPan = function (dx, dy) {
  let overlay = this;

  overlay.canvasTransform[4] -= dx * overlay.canvasTransform[0];
  overlay.canvasTransform[5] -= dy * overlay.canvasTransform[3];

  overlay.canvasTransform_Fix();

  overlay.refreshOverlay(); // only the transform changed: the rects follow their obs
};
canvasMethods.canvasTransformCenter = function (cx, cy) {
  // cx,cy: new center in video coordinates
  let overlay = this

  if ((cx === undefined) || (cy === undefined)) {
    console.log('canvasTransformCenter: ABORT, center undefined', cx, cy)
    return
  }

  let w1 = overlay.canvas.width
  let h1 = overlay.canvas.height

  let sx = overlay.canvasTransform[0]   // canvas->video
  let sy = overlay.canvasTransform[3]

  overlay.canvasTransform[4] = cx - sx * w1 / 2   // tx   canvas->video
  overlay.canvasTransform[5] = cy - sy * h1 / 2   // ty

  overlay.canvasTransform_Fix() // Avoid being outside of video

  overlay.hardRefresh()
}

canvasMethods.obsToCanvasRect = function (obs) {
  let overlay = this;

  let R = { left: obs.x, top: obs.y, width: obs.width, height: obs.height };
  let R2 = overlay.videoToCanvasRect(R);
  return R2;
};
canvasMethods.canvasToVideoPoint = function (pt) {
  let overlay = this;

  return {
    x: overlay.canvasTransform[0] * pt.x + overlay.canvasTransform[4],
    y: overlay.canvasTransform[3] * pt.y + overlay.canvasTransform[5],
  };
};
canvasMethods.videoToCanvasPoint = function (pt) {
  let overlay = this;

  return {
    x: (pt.x - overlay.canvasTransform[4]) / overlay.canvasTransform[0],
    y: (pt.y - overlay.canvasTransform[5]) / overlay.canvasTransform[3],
  };
};
canvasMethods.canvasToVideoRect = function (rect) {
  let overlay = this;

  return {
    left: overlay.canvasTransform[0] * rect.left + overlay.canvasTransform[4],
    top: overlay.canvasTransform[3] * rect.top + overlay.canvasTransform[5],
    width: overlay.canvasTransform[0] * rect.width,
    height: overlay.canvasTransform[3] * rect.height,
  };
};
canvasMethods.videoToCanvasRect = function (rect) {
  let overlay = this;

  return {
    left: (rect.left - overlay.canvasTransform[4]) / overlay.canvasTransform[0],
    top: (rect.top - overlay.canvasTransform[5]) / overlay.canvasTransform[3],
    width: rect.width / overlay.canvasTransform[0],
    height: rect.height / overlay.canvasTransform[3],
  };
};
