"""Option "Ctrl+hover preview" of Options/Chronogram: the Ctrl+mousemove preview of the chronogram is bound only while
the box is checked (ChronoAxes.setTrackFrame); disabled, no listener exists, so no callback can fire."""

LISTENERS = """() => {
  const n = axes.chronoGroup.node(); const b = document.body;
  return {chrono: (n.__on || []).filter(o => o.name === 'trackFrame').map(o => o.type).sort(),
          body: (b.__on || []).filter(o => o.name === 'trackFrame').map(o => o.type).sort()}; }"""

COUNT = """() => { window.__pv = {move: 0, end: 0};
  $(axes).on('previewframe:trackmove', () => window.__pv.move++); $(axes).on('previewframe:trackend', () => window.__pv.end++); }"""


def _inside_chrono(ui):
    """Page coordinates of a point inside the plot area (frame range middle, first id row)."""
    return ui.js("""() => { const g = axes.chronoGroup.node(); const m = g.getScreenCTM();
      const r = axes.xScale.range(); const p = new DOMPoint((r[0] + r[1]) / 2, axes.yScale.range()[1] / 2).matrixTransform(m);
      return [p.x, p.y]; }""")


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.js(COUNT)
    ui.open_panel("Options")
    ui.open_subpanel("Chronogram")


def test_m1_off_by_default_and_nothing_is_bound(ui, sample_dir):
    _start(ui, sample_dir)
    assert not ui.page.is_checked("#chronoPreviewHover")
    assert ui.js(LISTENERS) == {"chrono": [], "body": []}
    x, y = _inside_chrono(ui)
    ui.page.keyboard.down("Control")
    ui.page.mouse.move(x, y)
    ui.page.mouse.move(x + 20, y)
    ui.page.keyboard.up("Control")
    assert ui.js("window.__pv") == {"move": 0, "end": 0}


def test_m2_enable_binds_and_disable_unbinds_everything(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.check("#chronoPreviewHover")
    assert ui.js(LISTENERS) == {"chrono": ["mouseenter", "mouseleave"], "body": []}
    ui.js("axes.setTrackFrame(true)")                                    # idempotent
    assert ui.js(LISTENERS) == {"chrono": ["mouseenter", "mouseleave"], "body": []}
    x, y = _inside_chrono(ui)
    ui.page.mouse.move(x, y)                                             # entering binds the key and move listeners
    assert ui.js(LISTENERS) == {"chrono": ["mouseenter", "mouseleave", "mousemove"], "body": ["keydown"]}
    ui.page.uncheck("#chronoPreviewHover")
    assert ui.js(LISTENERS) == {"chrono": [], "body": []}
    assert ui.js("axes.isTrackFrameOn()") is False


def test_m3_ctrl_move_previews_and_release_ends_it(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.check("#chronoPreviewHover")
    x, y = _inside_chrono(ui)
    ui.page.mouse.move(x, y)
    ui.page.mouse.move(x + 10, y)                                        # no Ctrl: nothing
    assert ui.js("window.__pv") == {"move": 0, "end": 0}
    ui.page.keyboard.down("Control")
    ui.page.mouse.move(x + 20, y)
    assert ui.js("window.__pv.move") >= 1
    ui.page.keyboard.up("Control")
    assert ui.js("window.__pv.end") == 1


def test_m4_disabling_during_a_preview_ends_it_and_silences_the_chronogram(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.check("#chronoPreviewHover")
    x, y = _inside_chrono(ui)
    ui.page.mouse.move(x, y)
    ui.page.keyboard.down("Control")
    ui.page.mouse.move(x + 20, y)
    assert ui.js("window.__pv.move") >= 1
    ui.page.uncheck("#chronoPreviewHover")                               # while Ctrl is held and the preview is on
    assert ui.js("window.__pv.end") == 1
    moves = ui.js("window.__pv.move")
    ui.page.mouse.move(x + 40, y)
    ui.page.keyboard.up("Control")
    assert ui.js("window.__pv") == {"move": moves, "end": 1}
