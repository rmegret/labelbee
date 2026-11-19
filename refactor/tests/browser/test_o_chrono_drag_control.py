"""ChronoDragControl (ADR 0011, step 2): the chronogram builds `chronoDragControl` from the dynamically imported module,
with Ignore as the only mode, and exposes the narrow target `axes.dragTarget` the modes work through."""


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.page.wait_for_function("typeof chronoDragControl !== 'undefined' && chronoDragControl !== null")


def test_o1_instance_is_created_from_the_imported_namespace(ui, sample_dir):
    _start(ui, sample_dir)
    assert ui.js("typeof ChronoDragControl.DragControl") == "function"
    assert ui.js("chronoDragControl.mode") == "ignore"
    assert ui.js("Object.keys(chronoDragControl.modes)") == ["ignore"]
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
