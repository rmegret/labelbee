// ES module (refactor slice 8 step 12b, ADR 0015): `initPanelRows` is called once by labelbeeBridge.js (it was a classic script).
// PanelRows: while a .block panel is dragged in a .sortable container, the placeholder takes
// data-newrow="true"/"false" (starts a new row / continues the row of the previous panel) and
// the dropped panel keeps the flag. The CSS (custom.css, ".sortable > .block[data-newrow]")
// does the actual row break, so the flag stays attached to its panel.
// Rule, with H the panel under the pointer (jQuery UI puts the placeholder before or after H):
//  - placeholder after H: pointer in the lower half of H -> new row (below H), else beside H;
//  - placeholder before H: the panel takes the place of H, so it starts a row if H did.
// The sortable widgets themselves are created in labelBee.js (also for the sidebar panels, which
// are not .block and are not affected). Layout only, nothing is stored.
export function initPanelRows() {
  function isPanel(e) {
    return e && e.classList.contains("block") && !e.classList.contains("ui-sortable-helper")
      && !e.classList.contains("ui-sortable-placeholder") && e.offsetParent !== null;
  }
  function hovered(container, x, y) {
    return Array.prototype.find.call(container.children, function (e) {
      if (!isPanel(e)) return false;
      var r = e.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }
  function sibling(e, next) {
    do { e = next ? e.nextElementSibling : e.previousElementSibling; } while (e && !isPanel(e));
    return e;
  }

  $(document).on("sort", ".sortable", function (event, ui) { // jQuery UI event "sort" of the sortable widget
    var ph = ui.placeholder && ui.placeholder[0];
    if (!ph || !ph.classList.contains("block")) return;
    var h = hovered(this, event.clientX, event.clientY);
    if (!h) return; // keep the flag until the pointer is over a panel
    var newrow;
    if (sibling(ph, false) === h) {
      var r = h.getBoundingClientRect();
      newrow = event.clientY > r.top + r.height / 2;
    } else if (sibling(ph, true) === h) {
      newrow = h.getAttribute("data-newrow") === "true";
    } else return;
    ph.setAttribute("data-newrow", newrow ? "true" : "false");
  });

  $(document).on("sortbeforestop", ".sortable", function (event, ui) {
    var ph = ui.placeholder && ui.placeholder[0];
    if (!ph || !ph.classList.contains("block")) return;
    ui.item[0].setAttribute("data-newrow", ph.getAttribute("data-newrow") || "false");
  });
}
