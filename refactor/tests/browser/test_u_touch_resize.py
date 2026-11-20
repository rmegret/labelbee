"""Touch resize of the video, zoom and chronogram divs (js/layout/TouchResize.js): jQuery UI resizable only listens to mouse events,
so a touch drag on a handle is replayed as mouse events. The touch events are built in the page (`Touch`/`TouchEvent` exist in
headless Chromium), which exercises the shim itself rather than the browser's touch-to-mouse emulation (a tap only)."""

DRAG = """async ([sel, dx, dy]) => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  const h = document.querySelector(sel), r = h.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const mk = (type, tx, ty, target) => new TouchEvent(type, {
    bubbles: true, cancelable: true,
    touches: type === 'touchend' ? [] : [new Touch({identifier: 7, target, clientX: tx, clientY: ty})],
    changedTouches: [new Touch({identifier: 7, target, clientX: tx, clientY: ty})]
  });
  h.dispatchEvent(mk('touchstart', x, y, h)); await frame();
  for (let i = 1; i <= 5; i++) { h.dispatchEvent(mk('touchmove', x + dx * i / 5, y + dy * i / 5, h)); await frame(); }
  h.dispatchEvent(mk('touchend', x + dx, y + dy, h));
}"""


def _size(ui, sel):
    return ui.js("(s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }", sel)


def test_u1_video_div_resizes_by_touch_on_the_bottom_right_handle(ui):
    ui.open()
    w, h = _size(ui, "#canvasresize")
    ui.js(DRAG, ["#canvasresize > .ui-resizable-se", -60, -60])
    ui.page.wait_for_function("([s, w]) => document.querySelector(s).getBoundingClientRect().width < w - 20", arg=["#canvasresize", w])
    w2, h2 = _size(ui, "#canvasresize")
    assert w2 < w and h2 < h


def test_u2_zoom_div_resizes_by_touch_on_the_bottom_right_handle(ui):
    ui.open()
    ui.open_panel("Zoom")
    ui.page.wait_for_function("$('#zoomresize').is(':visible')")
    w, h = _size(ui, "#zoomresize")
    ui.js(DRAG, ["#zoomresize > .ui-resizable-se", 50, 50])
    ui.page.wait_for_function("([s, w]) => document.querySelector(s).getBoundingClientRect().width > w + 20", arg=["#zoomresize", w])


def test_u3_chronogram_div_resizes_by_touch_on_its_bottom_handle(ui):
    ui.open()
    w, h = _size(ui, "#chronoDiv")
    ui.js(DRAG, ["#chronoDiv > .ui-resizable-s", 0, 60])
    ui.page.wait_for_function("([s, h]) => document.querySelector(s).getBoundingClientRect().height > h + 20", arg=["#chronoDiv", h])


def test_u4_a_touch_outside_the_handles_does_not_resize(ui):
    ui.open()
    before = _size(ui, "#canvasresize")
    ui.js(DRAG, ["#canvasresize", 40, 40])                                              # on the div itself, not on a handle
    ui.page.wait_for_timeout(200)
    assert _size(ui, "#canvasresize") == before
