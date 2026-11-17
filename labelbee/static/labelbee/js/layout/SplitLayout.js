// SplitLayout: draggable splitter between the video+chronogram pane (#pane-main)
// and the sidebar (#pane-side), with a collapsible sidebar (button #sidebar-toggle in
// the navbar). On narrow screens (phones) the sidebar becomes an overlay, closed by
// default. Layout only: touches the CSS variable --sidebar-width and the classes
// "collapsed" and "narrow" on #main-split.
(function () {
  var DEFAULT_SIDEBAR = 360; // px, regular width of the sidebar
  var MIN_SIDEBAR = 220;     // px
  var MIN_MAIN = 300;        // px, below this the main pane scrolls instead of shrinking
  var KEY = "labelbee.sidebarWidth";
  var KEY_COLLAPSED = "labelbee.sidebarCollapsed";

  function load(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { window.localStorage.setItem(key, v); } catch (e) { } }

  $(function () {
    var split = document.getElementById("main-split");
    var splitter = document.getElementById("splitter");
    var toggle = document.getElementById("sidebar-toggle");
    var paneMain = document.getElementById("pane-main");
    if (!split || !splitter) return;

    var width = parseInt(load(KEY), 10) || DEFAULT_SIDEBAR;
    var desktopCollapsed = load(KEY_COLLAPSED) === "1"; // state kept for wide screens
    // Not enough room for both panes at their minimum: the sidebar becomes an overlay
    var NARROW = MIN_SIDEBAR + 8 + MIN_MAIN;
    var narrow = null;

    function isCollapsed() { return split.classList.contains("collapsed"); }

    // Sidebar width allowed by the window: keeps MIN_MAIN for the main pane when
    // possible, never goes below MIN_SIDEBAR (then #pane-main gets a scrollbar).
    function clamp(w) {
      var max = split.clientWidth - splitter.offsetWidth - MIN_MAIN;
      return Math.max(MIN_SIDEBAR, Math.min(w, max));
    }
    function apply() {
      var nowNarrow = split.clientWidth < NARROW;
      if (nowNarrow !== narrow) { // crossing the threshold: switch layout mode
        narrow = nowNarrow;
        split.classList.toggle("narrow", narrow);
        split.classList.toggle("collapsed", narrow ? true : desktopCollapsed);
      }
      split.style.setProperty("--sidebar-width", clamp(width) + "px");
      toggle.classList.toggle("off", isCollapsed());
      toggle.setAttribute("aria-pressed", isCollapsed() ? "false" : "true");
      splitter.title = isCollapsed() ? "Click to open the sidebar"
        : "Drag to resize the sidebar (double-click: default width)";
    }
    function refresh() {
      apply();
      $(window).trigger("resize"); // canvases and chronogram recompute their size
    }
    function setCollapsed(c) {
      split.classList.toggle("collapsed", c);
      if (!narrow) { desktopCollapsed = c; save(KEY_COLLAPSED, c ? "1" : "0"); }
      refresh();
    }

    // Content of the main pane keeps a minimum width: the pane scrolls beyond that.
    $("#pane-main > *").css("min-width", MIN_MAIN + "px");

    splitter.addEventListener("pointerdown", function (e) {
      if (isCollapsed()) return;
      splitter.setPointerCapture(e.pointerId);
      split.classList.add("dragging");
      var onMove = function (ev) {
        var r = split.getBoundingClientRect();
        width = r.right - ev.clientX - splitter.offsetWidth / 2;
        apply();
      };
      var onUp = function () {
        splitter.removeEventListener("pointermove", onMove);
        splitter.removeEventListener("pointerup", onUp);
        splitter.removeEventListener("pointercancel", onUp);
        split.classList.remove("dragging");
        width = clamp(width);
        save(KEY, width);
        refresh();
      };
      splitter.addEventListener("pointermove", onMove);
      splitter.addEventListener("pointerup", onUp);
      splitter.addEventListener("pointercancel", onUp);
    });
    splitter.addEventListener("dblclick", function () {
      width = DEFAULT_SIDEBAR; save(KEY, width); refresh();
    });
    // Closed sidebar: a click on the strip opens it
    splitter.addEventListener("click", function () {
      if (isCollapsed()) setCollapsed(false);
    });
    splitter.addEventListener("keydown", function (e) {
      if (isCollapsed() && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault(); setCollapsed(false); return;
      }
      if (e.key === "ArrowLeft") { width += 20; }
      else if (e.key === "ArrowRight") { width -= 20; }
      else return;
      e.preventDefault(); width = clamp(width); save(KEY, width); refresh();
    });
    toggle.addEventListener("click", function () { setCollapsed(!isCollapsed()); });
    // Overlay mode: tapping the main pane dismisses the sidebar
    paneMain.addEventListener("click", function () {
      if (narrow && !isCollapsed()) setCollapsed(true);
    });
    $(window).on("resize.splitlayout", apply);

    apply();
  });
})();
