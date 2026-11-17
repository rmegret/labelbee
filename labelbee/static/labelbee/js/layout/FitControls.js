// FitControls: "fit to the available width" buttons. Layout only.
//  - #video-fit-button (top-right of the video): resizes the video to the width of its
//    pane, keeping the aspect ratio ("Expand to Fit");
//  - #chrono-fit-button ("Fit" in the chronogram Size panel): resizes the chronogram to the
//    width of its pane, so that no horizontal scrollbar is needed.
(function () {
  function contentWidth(pane) {
    var cs = window.getComputedStyle(pane);
    return pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function expandVideoToFit() {
    var cr = $("#canvasresize");
    var pane = document.getElementById("left-side");
    var margins = cr.outerWidth(true) - cr.outerWidth();
    // #canvasresize = canvas + 16px grip padding + 2px border (see OverlayControl.js)
    var wd = Math.floor(contentWidth(pane) - margins) - 18;
    if (wd < 50) return;
    var vs = overlay.videoSize;
    var aspect = (overlay.opts.fixedAspect && vs && vs.w && vs.h)
      ? vs.h / vs.w : overlay.canvas.height / overlay.canvas.width;
    var hd = Math.round(wd * aspect);
    // refreshCanvasSize reads the size of #canvasresize minus a 4px border
    cr[0].style.width = (wd + 4) + "px";
    cr[0].style.height = (hd + 4) + "px";
    overlay.refreshCanvasSize({ target: cr[0] });
  }

  function fitChronogram() {
    var div = $("#chronoDiv"), tab = $("#chronoTab");
    var pane = document.getElementById("pane-chrono").contains(tab[0])
      ? document.getElementById("pane-chrono") : document.getElementById("left-side");
    // what surrounds the chronogram content inside the pane: margin, border and padding of
    // #chronoTab and of #chronoDiv (the wrappers in between have none; the tab may be wider
    // than #chronoDiv because of its controls, so its own width is not used)
    var overhead = (tab.outerWidth(true) - tab.width()) + (div.outerWidth() - div.width());
    var w = Math.floor(contentWidth(pane) - overhead);
    $("#chronoDiv").width(Math.max(w, 200));
    refreshChronoLayout();
  }

  $(function () {
    var v = document.getElementById("video-fit-button");
    var c = document.getElementById("chrono-fit-button");
    if (v) v.addEventListener("click", expandVideoToFit);
    if (c) c.addEventListener("click", fitChronogram);
  });
})();
