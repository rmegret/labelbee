// ES module (refactor slice 8 step 12b, ADR 0015): `initChronoLayout` is called once by labelbeeBridge.js (it was a classic script).
// ChronoLayout: button #layout-toggle in the navbar switches the left pane between
//  - vertical (default): the chronogram is below the video and its controls;
//  - horizontal: video and controls on the left, chronogram on the right (#pane-chrono),
//    with a draggable splitter (#splitter2).
// #chronoTab is moved in the DOM (not cloned), so the core code keeps working on the same
// elements. Layout only.
import { refreshChronoLayout } from "../chrono/ChronoRender.js"
export function initChronoLayout() {
  var MIN_LEFT = 300;   // px, video pane
  var MIN_CHRONO = 200; // px
  // Panels that move above the chronogram in horizontal mode (others can be dragged there)
  var DEFAULT_PANELS = ["focusIntervalTab", "selectedTab", "eventsTab"];
  var KEY = "labelbee.chronoLayout";
  var KEY_WIDTH = "labelbee.chronoWidth";

  function load(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { window.localStorage.setItem(key, v); } catch (e) { } }

  var paneMain = document.getElementById("pane-main");
  var paneChrono = document.getElementById("pane-chrono");
  var splitter = document.getElementById("splitter2");
  var toggle = document.getElementById("layout-toggle");
  var chronoTab = document.getElementById("chronoTab");
  if (!paneMain || !paneChrono || !splitter || !toggle || !chronoTab) return;
  var anchor = document.createComment("chronoTab"); // marks the place of #chronoTab
  chronoTab.parentNode.insertBefore(anchor, chronoTab);

  var horizontal = false;
  var width = parseInt(load(KEY_WIDTH), 10) || 0; // 0: half of the pane

  function clamp(w) {
    var max = paneMain.clientWidth - splitter.offsetWidth - MIN_LEFT;
    return Math.max(MIN_CHRONO, Math.min(w || paneMain.clientWidth / 2, max));
  }
  function refit() {
    $(window).trigger("resize"); // canvases recompute their size
    if (typeof refreshChronoLayout === "function") refreshChronoLayout();
  }
  function applyWidth() {
    paneMain.style.setProperty("--chrono-width", clamp(width) + "px");
  }
  // Default panels that sit above the chronogram in horizontal mode. A comment node marks
  // their place in the vertical layout. (Their row break is the data-newrow of the panel.)
  var panels = DEFAULT_PANELS.map(function (id) {
    var e = document.getElementById(id);
    if (!e) return null;
    var mark = document.createComment(id);
    e.parentNode.insertBefore(mark, e);
    return { group: [e], mark: mark };
  }).filter(function (p) { return p; });

  function setHorizontal(h) {
    horizontal = h;
    if (h) {
      paneChrono.appendChild(chronoTab);
      panels.forEach(function (p) {
        p.group.forEach(function (e) { paneChrono.insertBefore(e, chronoTab); });
      });
    } else {
      // Panels dropped by the user in the chrono pane go above the chronogram,
      // the default panels go back to their place
      Array.prototype.slice.call(paneChrono.children).forEach(function (e) {
        if (e !== chronoTab) anchor.parentNode.insertBefore(e, anchor);
      });
      panels.forEach(function (p) {
        p.group.forEach(function (e) { p.mark.parentNode.insertBefore(e, p.mark); });
      });
      anchor.parentNode.insertBefore(chronoTab, anchor.nextSibling);
    }
    paneMain.classList.toggle("horizontal", h);
    toggle.classList.toggle("horizontal", h);
    toggle.setAttribute("aria-pressed", h ? "true" : "false");
    toggle.title = h ? "Chronogram beside the video (click: put it below the video)"
      : "Chronogram below the video (click: put it beside the video)";
    if (h) applyWidth();
    save(KEY, h ? "horizontal" : "vertical");
    refit();
  }

  splitter.addEventListener("pointerdown", function (e) {
    splitter.setPointerCapture(e.pointerId);
    paneMain.classList.add("dragging");
    var onMove = function (ev) {
      var r = paneMain.getBoundingClientRect();
      width = r.right - ev.clientX - splitter.offsetWidth / 2;
      applyWidth();
    };
    var onUp = function () {
      splitter.removeEventListener("pointermove", onMove);
      splitter.removeEventListener("pointerup", onUp);
      splitter.removeEventListener("pointercancel", onUp);
      paneMain.classList.remove("dragging");
      width = clamp(width); save(KEY_WIDTH, width);
      applyWidth(); refit();
    };
    splitter.addEventListener("pointermove", onMove);
    splitter.addEventListener("pointerup", onUp);
    splitter.addEventListener("pointercancel", onUp);
  });
  splitter.addEventListener("dblclick", function () {
    width = 0; save(KEY_WIDTH, 0); applyWidth(); refit();
  });
  splitter.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { width = clamp(width) + 20; }
    else if (e.key === "ArrowRight") { width = clamp(width) - 20; }
    else return;
    e.preventDefault(); width = clamp(width); save(KEY_WIDTH, width); applyWidth(); refit();
  });
  toggle.addEventListener("click", function () { setHorizontal(!horizontal); });
  $(window).on("resize.chronolayout", function () { if (horizontal) applyWidth(); });

  if (load(KEY) === "horizontal") setHorizontal(true);
}
