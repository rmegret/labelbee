"""HoverControl (ADR 0010): the hover preview shows a frame that was not in the cache once it is decoded, if the frame
is still the hovered one; the answer of a query that is not relevant any more is dropped without any refresh.
`VideoCache.getImageForce` is replaced by a gated stub that returns a 1x1 image when the test opens the gate: the
real decode waits for `requestVideoFrameCallback` on a detached video, which headless Chromium never fires."""

GATE = """() => {
  const vc = videoControl.videoCache;
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  window.__open = null;
  window.__gate = new Promise(r => window.__open = r);
  vc.getImageForce = async () => { await window.__gate; const i = new Image(); i.src = png; await i.decode(); return i; };
  window.__changed = [];
  $(videoControl).on('frame:changed', () => window.__changed.push(videoControl.currentFrame));
}"""

STATE = "() => ({frame: videoControl.currentFrame, mode: videoControl.currentMode, stats: videoControl.hover.stats, changed: window.__changed})"


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.js(GATE)
    ui.js("videoControl.seekFrame(0)")
    ui.page.wait_for_function("videoControl.currentFrame === 0")
    ui.js("window.__changed.length = 0")


def _release(ui):
    """Let the decodes run and wait for the cache queue to be empty."""
    ui.js("window.__open()")
    ui.page.wait_for_function("videoControl.videoCache.queryQueue.length === 0 && !videoControl.videoCache.processingQueue")
    ui.page.wait_for_timeout(100)


def test_n1_uncached_frame_is_shown_when_it_arrives_if_still_hovered(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("videoControl.seekFrame(5, 'preview')")
    s = ui.js(STATE)
    assert s["mode"] == "cache-preview" and s["frame"] == 0 and s["changed"] == []      # not decoded yet, nothing shown
    _release(ui)
    s = ui.js(STATE)
    assert s["frame"] == 5 and s["changed"] == [5] and s["stats"] == {"applied": 1, "stale": 0}


def test_n2_answer_for_a_frame_we_moved_away_from_is_dropped(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("videoControl.seekFrame(5, 'preview')")
    ui.js("videoControl.seekFrame(9, 'preview')")
    _release(ui)
    s = ui.js(STATE)
    assert s["frame"] == 9 and s["changed"] == [9]                                      # 5 was decoded but never shown
    assert s["stats"] == {"applied": 1, "stale": 1}


def test_n3_a_frame_hovered_again_before_its_answer_still_gets_its_refresh(ui, sample_dir):
    _start(ui, sample_dir)
    for f in (5, 9, 5):
        ui.js(f"videoControl.seekFrame({f}, 'preview')")
    _release(ui)
    s = ui.js(STATE)
    assert s["frame"] == 5 and s["changed"] == [5]
    assert s["stats"]["applied"] == 1 and s["stats"]["stale"] == 1                      # the answer of 9 is the stale one


def test_n4_no_refresh_after_the_hover_ended(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("videoControl.seekFrame(5, 'preview')")
    ui.js("videoControl.seekFrame(-1, 'end-preview')")
    ui.page.wait_for_function("videoControl.currentFrame === 0 && videoControl.currentMode !== 'cache-preview'")
    ui.js("window.__changed.length = 0")
    _release(ui)
    s = ui.js(STATE)
    assert s["frame"] == 0 and s["changed"] == []
    assert s["stats"] == {"applied": 0, "stale": 1}
    assert ui.js("videoControl.hover.active") is False


def test_n6_the_same_frame_queried_again_is_not_applied_again(ui, sample_dir):
    _start(ui, sample_dir)
    for _ in range(3):                                                                  # pointer moving over one frame
        ui.js("videoControl.seekFrame(5, 'preview')")
    _release(ui)
    ui.js("videoControl.seekFrame(5, 'preview')")                                       # shown already
    s = ui.js(STATE)
    assert s["changed"] == [5] and s["stats"] == {"applied": 1, "stale": 0}


def test_n5_a_cached_frame_is_shown_at_once(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("videoControl.seekFrame(5, 'preview')")
    _release(ui)
    ui.js("videoControl.seekFrame(-1, 'end-preview')")
    ui.page.wait_for_function("videoControl.currentFrame === 0")
    ui.js("window.__changed.length = 0")
    ui.js("videoControl.seekFrame(5, 'preview')")                                       # now in the cache: synchronous
    s = ui.js(STATE)
    assert s["frame"] == 5 and s["changed"] == [5]


BAR = "() => ({cls: axes.timeMark.attr('class'), frame: axes.timeMark.frame})"


def _trackmove(ui, frame):
    ui.js("(f) => $(axes).trigger($.extend({type: 'previewframe:trackmove'}, {frame: f, id: 0}))", frame)


def test_n5_time_bar_is_orange_dashed_until_a_frame_is_shown_then_green_then_normal(ui, sample_dir):
    """Preview in the chronogram: the bar sits at the pointer, orange dashed, while no frame is available; once a
    frame shows it is green and stays on the shown frames; the end of the preview gives the normal bar back."""
    _start(ui, sample_dir)
    _trackmove(ui, 5)
    b = ui.js(BAR)
    assert b["cls"] == "timeMark pending" and b["frame"] == 5
    _trackmove(ui, 7)                                                                   # still nothing loaded: follows
    b = ui.js(BAR)
    assert b["cls"] == "timeMark pending" and b["frame"] == 7
    _release(ui)                                                                        # frame 7 arrives
    b = ui.js(BAR)
    assert b["cls"] == "timeMark preview" and b["frame"] == 7
    ui.js("() => { videoControl.videoCache.getImageForce = () => new Promise(() => {}); }")      # nothing decodes any more
    _trackmove(ui, 12)                                                                  # pointer moves, frame not loaded
    b = ui.js(BAR)
    assert b["cls"] == "timeMark preview" and b["frame"] == 7                           # stays green on the shown frame
    ui.js("() => $(axes).trigger('previewframe:trackend')")
    ui.page.wait_for_function("axes.timeMark.attr('class') === 'timeMark'")
