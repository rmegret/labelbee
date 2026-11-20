/* Touch support for the jQuery UI resizable handles (video, zoom and chronogram divs).
 * jQuery UI 1.12 `$.ui.mouse` only listens to mousedown/mousemove/mouseup, and a touch drag sends no mousemove.
 * A touch that starts on a `.ui-resizable-handle` is replayed as mouse events; the handle's own widget does the rest
 * (helper outline, aspect ratio, `stop` callbacks). Only resizable is patched: other jQuery UI widgets are untouched.
 * Load right after jquery-ui.js, before any `.resizable()` call. */
(function ($) {
  if (!$.ui || !$.ui.resizable) return;

  var base = $.ui.resizable.prototype._mouseInit;

  function replay(type, touch, target) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window, button: 0, buttons: type === "mouseup" ? 0 : 1,
      screenX: touch.screenX, screenY: touch.screenY, clientX: touch.clientX, clientY: touch.clientY
    }));
  }

  $.ui.resizable.prototype._mouseInit = function () {
    base.call(this);
    var el = this.element[0], active = null;

    function find(touches, id) {
      for (var i = 0; i < touches.length; i++) if (touches[i].identifier === id) return touches[i];
      return null;
    }
    function onMove(e) {
      var t = find(e.changedTouches, active.id);
      if (!t) return;
      e.preventDefault();
      replay("mousemove", t, active.target);
    }
    function onEnd(e) {
      var t = find(e.changedTouches, active.id);
      if (!t) return;
      replay("mouseup", t, active.target);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      active = null;
    }

    el.addEventListener("touchstart", function (e) {
      if (active || e.touches.length > 1) return;
      var t = e.changedTouches[0], h = t.target.closest && t.target.closest(".ui-resizable-handle");
      if (!h || !el.contains(h)) return;
      e.preventDefault();                                   // no compatibility mouse events after touchend
      active = { id: t.identifier, target: h };
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      document.addEventListener("touchcancel", onEnd);
      replay("mouseover", t, h);                            // resizable takes its axis (n, s, se...) from the hovered handle
      replay("mousedown", t, h);
    }, { passive: false });
  };
})(jQuery);
