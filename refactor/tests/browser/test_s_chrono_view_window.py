"""Chronogram view window (OQ-302, DEBT-304): Z+, Z-, the shift buttons and `chrono.axes.xdomainFocus` work with the D3 v6 zoom.
Z+ / Z- scale the visible span by 2 around the current frame, shift moves it by half the span, a focus keeps the
requested range (plus the 10% margin) inside the zoom limits."""

DOM = "() => chrono.axes.xdomain()"


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.js("() => chrono.axes.xdomainFocus([0, 39], 1.0)")                  # start from a known view


def _span(d):
    return d[1] - d[0]


def test_s1_xdomainfocus_shows_the_requested_range_with_the_margin(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("() => chrono.axes.xdomainFocus([10, 20])")
    d = ui.js(DOM)
    assert abs(_span(d) - 11) < 0.01 and abs((d[0] + d[1]) / 2 - 15) < 0.01     # 10 frames + 10% margin, same center
    ui.js("() => chrono.axes.xdomainFocus([10, 20], 1.0)")
    d = ui.js(DOM)
    assert abs(d[0] - 10) < 0.01 and abs(d[1] - 20) < 0.01


def test_s2_zoom_in_and_out_buttons_scale_the_span_by_two_around_the_current_frame(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("() => videoControl.seekFrame(20)")
    ui.page.wait_for_function("videoControl.currentFrame === 20")
    ui.js("() => chrono.axes.xdomainFocus([0, 39], 1.0)")
    before = ui.js(DOM)
    ui.page.locator('input[value="Z+"][onclick^="scaleTimeDomain"]').click()
    d = ui.js(DOM)
    assert 20 > d[0] and 20 < d[1]
    assert abs(_span(d) - _span(before) / 2) < 0.01                             # x2
    assert abs((20 - d[0]) / _span(d) - (20 - before[0]) / _span(before)) < 0.05  # frame 20 stays where it was
    ui.page.locator('input[value="Z-"][onclick^="scaleTimeDomain"]').click()
    assert abs(_span(ui.js(DOM)) - _span(before)) < 0.01                        # and back


def test_s3_zoom_in_stops_at_the_zoom_limit(ui, sample_dir):
    _start(ui, sample_dir)
    for _ in range(12):
        ui.js("() => scaleTimeDomain(2)")
    assert _span(ui.js(DOM)) >= 10 - 0.01                                      # scaleExtent: at most (frames / 10)x zoom


def test_s4_shift_buttons_move_the_view_by_half_its_span(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("() => chrono.axes.xdomainFocus([10, 20], 1.0)")
    before = ui.js(DOM)
    ui.js("() => shiftTimeDomain(0.5)")
    d = ui.js(DOM)
    assert abs(_span(d) - _span(before)) < 0.01 and abs(d[0] - (before[0] + 5)) < 1.01
    ui.js("() => shiftTimeDomain(-0.5)")
    d = ui.js(DOM)
    assert abs(d[0] - before[0]) < 1.01


def _limits(ui):
    """View after panning far left / far right (onZoom clamp: half the video span stays in view)."""
    ui.js("() => chrono.axes.xdomainShift(-1000)")
    left = ui.js(DOM)
    ui.js("() => chrono.axes.xdomainShift(1000)")
    return left, ui.js(DOM)


def test_s5_pan_limits_are_the_same_after_zoom_buttons_as_from_a_fresh_view(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("() => videoControl.seekFrame(25)")
    ui.page.wait_for_function("videoControl.currentFrame === 25")
    for ops in (["scaleTimeDomain(2)"], ["scaleTimeDomain(2)", "scaleTimeDomain(1/2)"], ["scaleTimeDomain(1/2)"],
                ["scaleTimeDomain(2)", "shiftTimeDomain(0.5)", "scaleTimeDomain(1/2)"]):
        ui.js("() => chrono.axes.xdomainFocus([0, 39], 1.0)")
        for op in ops:
            ui.js("() => " + op)
        span = _span(ui.js(DOM))
        left, right = _limits(ui)
        # at least half of the video span (0..39) stays visible, at any scale
        assert abs(left[1] - span / 2) < 0.05, (ops, left)
        assert abs(right[0] - (39 - span / 2)) < 0.05, (ops, right)


def test_s6_chrono_svg_has_touch_action_none_in_pan_mode(ui, sample_dir):
    """Android: the browser must not take a pan for a scroll nor a pinch for a page zoom (not only in Preview mode)."""
    _start(ui, sample_dir)
    assert ui.js("() => chrono.axes.chronoGroup.node().ownerSVGElement.style.touchAction") == "none"


def test_s7_selected_id_row_does_not_capture_pointer_events(ui, sample_dir):
    """Empty chronogram: a click highlights the "-" row with a white rect over the whole plot area; it must not
    become the target of the next gestures (Android pan stopped working there)."""
    ui.open()
    r = ui.js("() => { const b = document.querySelector('.plotAreaBackground').getBoundingClientRect(); return [b.x + b.width * 0.4, b.y + b.height / 2]; }")
    ui.page.mouse.click(r[0], r[1])
    ui.page.wait_for_function("document.querySelector('.plotBackground > .selection') !== null")
    assert ui.js("() => getComputedStyle(document.querySelector('.plotBackground > .selection')).pointerEvents") == "none"
    assert ui.js("() => document.elementFromPoint(%s, %s).getAttribute('class')" % (r[0], r[1])) != "selection"


def test_s8_video_span_and_track_window_bars_cover_whole_frames(ui, sample_dir):
    """Frame f is drawn as [f, f+1): the video bar ends at nframes, the track window bar at last frame + 1."""
    _start(ui, sample_dir)
    r = ui.js("""async () => { const n = (await import(new URL('js/video/VideoInfo.js', document.baseURI).href)).getVideoInfo().nframes, xs = chrono.axes.xScale;
      const v = document.querySelector('#videoSpan .interval');
      const f = videoControl.currentFrame, w = chrono.config.trackWindow, t = document.querySelector('#trackWindowSpan .interval');
      return {vx: +v.getAttribute('x'), vw: +v.getAttribute('width'), x0: xs(0), xn: xs(n),
              tx: +t.getAttribute('x'), tw: +t.getAttribute('width'), t0: xs(f - w.trackWindowBackward), t1: xs(f + w.trackWindowForward + 1)}; }""")
    assert abs(r["vx"] + r["vw"] - r["xn"]) < 0.01 and abs(r["vx"] - r["x0"]) < 0.01
    assert abs(r["tx"] - r["t0"]) < 0.01 and abs(r["tx"] + r["tw"] - r["t1"]) < 0.01
