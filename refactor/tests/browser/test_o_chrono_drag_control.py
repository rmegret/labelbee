"""ChronoDragControl (ADR 0011): the Drag button chooses what a drag on the chronogram does.
Pan View (default): d3.zoom pan. Preview Frame: click-drag or touch-drag previews the frame, no pan.
Ignore: a drag does nothing, a click still seeks. Ctrl+hover previews the frame in every mode. `axes.dragTarget` is the narrow interface the modes use."""

import pytest

COUNT = """() => { window.__pv = {move: 0, end: 0, click: 0};
  $(axes).on('previewframe:trackmove', () => window.__pv.move++); $(axes).on('previewframe:trackend', () => window.__pv.end++);
  $(axes).on('axes:clicked', () => window.__pv.click++); }"""
DOMAIN = "() => axes.xScale.domain().map(Math.round)"


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.page.wait_for_function("typeof chronoDragControl !== 'undefined' && chronoDragControl !== null")
    ui.js(COUNT)


def _pt(ui, dx=0):
    """Page coordinates of a point inside the plot (middle of the frame range, first rows), shifted by dx px."""
    x, y = ui.js("""() => { const m = axes.chronoGroup.node().getScreenCTM();
      const r = axes.xScale.range(); const p = new DOMPoint((r[0] + r[1]) / 2, axes.yScale.range()[1] / 2).matrixTransform(m);
      return [p.x, p.y]; }""")
    return x + dx, y


def _drag(ui, dx=60):
    x, y = _pt(ui)
    ui.page.mouse.move(x, y)
    ui.page.mouse.down()
    ui.page.mouse.move(x + dx / 2, y, steps=3)
    ui.page.mouse.move(x + dx, y, steps=3)
    ui.page.mouse.up()


def _ptr(ui, type_, pid, x, y, kind="touch"):
    ui.js("""([t, id, x, y, k]) => axes.chronoGroup.node().dispatchEvent(new PointerEvent(t,
      {pointerId: id, pointerType: k, clientX: x, clientY: y, button: 0, bubbles: true, isPrimary: id === 1}))""",
          [type_, pid, x, y, kind])


def test_o1_instance_is_created_from_the_imported_namespace(ui, sample_dir):
    _start(ui, sample_dir)
    assert ui.js("typeof ChronoDragControl.DragControl") == "function"
    assert ui.js("chronoDragControl.mode") == "pan"
    assert ui.js("Object.keys(chronoDragControl.modes).sort()") == ["ignore", "pan", "preview"]
    assert ui.js("chronoDragControl.target === axes.dragTarget") is True


def test_o2_target_hit_inside_and_outside_the_plot(ui, sample_dir):
    _start(ui, sample_dir)
    r = ui.js("""() => { const g = axes.chronoGroup.node(); const m = g.getScreenCTM();
      const xr = axes.xScale.range(), yr = axes.yScale.range();
      const at = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(m); return {clientX: p.x, clientY: p.y}; };
      const t = axes.dragTarget;
      return {inside: t.hit(at((xr[0] + xr[1]) / 2, yr[1] / 2)), outside: t.hit(at(xr[0] - 5, yr[1] / 2)),
              expected: Math.round(axes.xScale.invert((xr[0] + xr[1]) / 2))}; }""")
    assert r["outside"] is None
    assert r["inside"]["frame"] == r["expected"]


def test_o3_target_emit_triggers_the_previewframe_events(ui, sample_dir):
    _start(ui, sample_dir)
    r = ui.js("""() => { const got = [];
      $(axes).on('previewframe:trackmove', (e) => got.push(['move', e.frame, e.id]));
      $(axes).on('previewframe:trackend', () => got.push(['end']));
      axes.dragTarget.emit('trackmove', {frame: 7, id: 3}); axes.dragTarget.emit('trackend');
      return got; }""")
    assert r == [["move", 7, 3], ["end"]]


def test_o4_pan_mode_drag_pans_and_does_not_preview(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("axes.zoom.scaleBy(axes.chronoGroup, 4)")                 # zoomed in, so there is room to pan
    before = ui.js(DOMAIN)
    _drag(ui)
    assert ui.js(DOMAIN) != before
    assert ui.js("window.__pv") == {"move": 0, "end": 0, "click": 0}


def test_o5_preview_mode_drag_previews_and_does_not_pan_nor_click(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("chronoDragControl.setMode('preview')")
    ui.js("axes.zoom.scaleBy(axes.chronoGroup, 4)")
    before = ui.js(DOMAIN)
    _drag(ui)
    pv = ui.js("window.__pv")
    assert pv["move"] >= 1 and pv["end"] == 1
    assert pv["click"] == 0                                         # the click ending the drag is swallowed
    assert ui.js(DOMAIN) == before                                  # no pan


def test_o6_preview_mode_plain_click_seeks_without_preview(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("chronoDragControl.setMode('preview')")
    x, y = _pt(ui)
    ui.page.mouse.click(x, y)
    assert ui.js("window.__pv") == {"move": 0, "end": 0, "click": 1}


@pytest.mark.parametrize("mode", ["pan", "ignore", "preview"])
def test_o7_ctrl_hover_previews_in_every_mode_and_release_ends_it(ui, sample_dir, mode):
    _start(ui, sample_dir)
    ui.js(f"chronoDragControl.setMode('{mode}')")
    x, y = _pt(ui)
    ui.page.mouse.move(x, y)
    ui.page.mouse.move(x + 10, y)                                   # no Ctrl: nothing
    assert ui.js("window.__pv") == {"move": 0, "end": 0, "click": 0}
    ui.page.keyboard.down("Control")
    ui.page.mouse.move(x + 20, y)
    assert ui.js("window.__pv.move") >= 1
    ui.page.keyboard.up("Control")
    assert ui.js("window.__pv.end") == 1


def test_o8_touch_drag_previews_and_a_second_finger_ends_it(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("chronoDragControl.setMode('preview')")
    x, y = _pt(ui)
    _ptr(ui, "pointerdown", 1, x, y)
    _ptr(ui, "pointermove", 1, x + 20, y)
    assert ui.js("window.__pv.move") >= 1 and ui.js("window.__pv.end") == 0
    _ptr(ui, "pointerdown", 2, x + 50, y)                           # pinch: preview over
    assert ui.js("window.__pv.end") == 1
    moves = ui.js("window.__pv.move")
    _ptr(ui, "pointermove", 1, x + 40, y)
    assert ui.js("window.__pv.move") == moves                       # nothing more while two fingers are down
    _ptr(ui, "pointerup", 2, x + 50, y)
    _ptr(ui, "pointerup", 1, x + 40, y)
    assert ui.js("window.__pv.end") == 1


def test_o9_ignore_mode_drag_does_nothing_but_click_still_seeks(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("chronoDragControl.setMode('ignore')")
    ui.js("axes.zoom.scaleBy(axes.chronoGroup, 4)")
    before = ui.js(DOMAIN)
    _drag(ui)
    assert ui.js(DOMAIN) == before
    assert ui.js("window.__pv.move") == 0
    x, y = _pt(ui)
    ui.page.mouse.click(x, y)
    assert ui.js("window.__pv.click") >= 1


def test_o10_switching_mode_during_a_preview_ends_it_and_leaves_no_listener(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("chronoDragControl.setMode('preview')")
    x, y = _pt(ui)
    ui.page.mouse.move(x, y)
    ui.page.mouse.down()
    ui.page.mouse.move(x + 30, y, steps=3)
    assert ui.js("window.__pv.move") >= 1
    ui.js("chronoDragControl.setMode('pan')")                       # mid-drag
    assert ui.js("window.__pv.end") == 1
    assert ui.js("chronoDragControl.modes.preview.bag.size") == 0
    moves = ui.js("window.__pv.move")
    ui.page.mouse.move(x + 60, y)
    ui.page.mouse.up()
    assert ui.js("window.__pv") == {"move": moves, "end": 1, "click": ui.js("window.__pv.click")}


def test_o12_menu_is_a_fixed_layer_in_front_attached_to_the_button_and_inside_the_viewport(ui, sample_dir):
    _start(ui, sample_dir)
    assert ui.js("$('#chrono-drag-menu').parent()[0] === document.body")           # not inside the pane: not cropped
    assert ui.js("getComputedStyle(document.getElementById('chrono-drag-menu')).position") == "fixed"
    ui.page.click("#chrono-drag-button")
    b = ui.page.locator("#chrono-drag-button").bounding_box()
    m = ui.page.locator("#chrono-drag-menu").bounding_box()
    vw, vh = ui.js("[window.innerWidth, window.innerHeight]")
    assert m["x"] >= 0 and m["y"] >= 0 and m["x"] + m["width"] <= vw and m["y"] + m["height"] <= vh
    assert abs(m["x"] - b["x"]) < 2 and 0 <= m["y"] - (b["y"] + b["height"]) < 6    # right under the button
    top = ui.js("""() => { const r = document.getElementById('chrono-drag-menu').getBoundingClientRect();
      return document.elementFromPoint(r.left + 5, r.top + 5).closest('#chrono-drag-menu') !== null; }""")
    assert top is True                                                              # nothing in front of it


def test_o13_menu_stays_inside_the_viewport_when_the_button_is_near_the_bottom_edge(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("""() => { const b = document.getElementById('chrono-drag-button'); b.style.position = 'fixed';
      b.style.left = (window.innerWidth - 30) + 'px'; b.style.top = (window.innerHeight - 25) + 'px'; }""")
    ui.page.click("#chrono-drag-button")
    m = ui.page.locator("#chrono-drag-menu").bounding_box()
    vw, vh = ui.js("[window.innerWidth, window.innerHeight]")
    assert m["x"] >= 0 and m["y"] >= 0 and m["x"] + m["width"] <= vw and m["y"] + m["height"] <= vh


def test_o11_drag_button_menu_switches_mode(ui, sample_dir):
    _start(ui, sample_dir)
    assert ui.page.is_hidden("#chrono-drag-menu")
    ui.page.click("#chrono-drag-button")
    assert ui.page.is_visible("#chrono-drag-menu")
    assert ui.page.is_checked("#chrono-drag-menu input[value=pan]")
    ui.page.click("#chrono-drag-menu input[value=preview]")
    assert ui.js("chronoDragControl.mode") == "preview"
    assert ui.page.is_hidden("#chrono-drag-menu")
    ui.page.click("#chrono-drag-button")
    ui.page.mouse.click(5, 5)                                       # outside: closes
    assert ui.page.is_hidden("#chrono-drag-menu")
    assert ui.js("chronoDragControl.mode") == "preview"


def test_o14_preview_mode_takes_the_touch_from_the_browser_and_gives_it_back(ui, sample_dir):
    """Android: without touch-action none a still or slow touch becomes a scroll / long press (pointercancel)."""
    _start(ui, sample_dir)
    get = "() => axes.chronoGroup.node().ownerSVGElement.style.touchAction"
    before = ui.js(get)
    ui.js("chronoDragControl.setMode('preview')")
    assert ui.js(get) == "none"
    ui.js("chronoDragControl.setMode('pan')")
    assert ui.js(get) == before
