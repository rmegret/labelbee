"""VideoCacheStatus (ADR 0012): the chronogram shows the VideoCache content as runs under the frame axis.
Cache entries are injected into the LRU (real decoding does not finish in headless Chromium)."""

FILL = """() => { const vc = videoControl.videoCache; const url = videoControl.video.src;
  const off = videoinfo.frameoffset;
  const put = (f, state) => vc.lrucache.set(url + ':' + (f + off), {state: state});
  [10, 11, 12].forEach(f => put(f, 'incache')); [13, 15].forEach(f => put(f, 'inqueue')); put(20, 'other');
  vc.updateStatus(); }"""


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.page.wait_for_function("typeof videoCacheStatus !== 'undefined' && videoCacheStatus !== null")


def _on(ui):
    ui.js("document.getElementById('showVideoCacheStatus').click()")  # panel is collapsed: click without visibility check


def test_p1_option_is_off_by_default_with_nothing_drawn_and_no_callback(ui, sample_dir):
    _start(ui, sample_dir)
    assert ui.js("document.getElementById('showVideoCacheStatus').checked") is False
    assert ui.js("videoCacheStatus.enabled") is False
    assert ui.js("videoControl.videoCache.onStatusChanged") is None          # guard: the cache does not call us
    ui.js(FILL)
    assert ui.js("videoCacheStatus.cachedFrames.length") == 0                # nothing computed while off
    assert ui.js("document.querySelectorAll('rect.cacheRun').length") == 0


def test_p2_on_builds_frames_runs_and_colored_rects(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js(FILL)
    _on(ui)
    assert ui.js("videoCacheStatus.cachedFrames.map(d => d.status)") == ["loaded"] * 3 + ["pending"] * 2
    assert ui.js("videoCacheStatus.cachedFramesRuns") == [
        {"startFrame": 10, "endFrame": 12, "status": "loaded"},
        {"startFrame": 13, "endFrame": 13, "status": "pending"},
        {"startFrame": 15, "endFrame": 15, "status": "pending"}]
    ui.js("axes.xScale.domain([0, 40]); axes.refreshAxes({type: 'xDomainChanged'})")
    r = ui.js("""() => [...document.querySelectorAll('rect.cacheRun')].map(e => [e.style.fill, e.style.stroke])""")
    assert len(r) == 3
    assert r[0][0] == r[0][1] and r[1][0] == r[1][1]                          # border and fill of the same color
    assert r[0][0] != r[1][0] and r[1][0] == r[2][0]                          # loaded vs pending


def test_p3_strip_is_below_the_frame_axis_without_overlap(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js(FILL)
    _on(ui)
    ui.js("axes.xScale.domain([0, 40]); axes.refreshAxes({type: 'xDomainChanged'})")
    r = ui.js("""() => { const a = document.querySelector('.x.axis .bgRect').getBoundingClientRect();
      const s = document.querySelector('rect.cacheRun').getBoundingClientRect();
      const p = document.querySelector('.plotAreaBackground').getBoundingClientRect();
      return {gap: s.top - a.bottom, inside: s.bottom - p.bottom <= axes.margin.bottom, h: s.height}; }""")
    assert r["gap"] >= -0.5 and r["inside"] and 4 <= r["h"] <= 16


def test_p4_cache_changes_update_while_on_and_clear_when_turned_off(ui, sample_dir):
    _start(ui, sample_dir)
    _on(ui)
    assert ui.js("videoCacheStatus.cachedFramesRuns.length") == 0
    ui.js(FILL)
    ui.page.wait_for_function("videoCacheStatus.cachedFramesRuns.length === 3")   # one update per animation frame
    _on(ui)  # toggles back off
    assert ui.js("videoControl.videoCache.onStatusChanged") is None
    assert ui.js("videoCacheStatus.cachedFrames.length") == 0
    assert ui.js("document.querySelectorAll('rect.cacheRun').length") == 0
    assert ui.js("getComputedStyle(document.querySelector('g.cacheStatus')).display") == "none"
