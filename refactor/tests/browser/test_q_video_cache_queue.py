"""VideoCache dynamic queue (ADR 0013): priority requests go to the front, regular ones to the back, the frame in
process is never reordered, cancelQueue throws the result of the frame in process away and rejects the promises
with VideoCache.CANCELED, a failed decode rejects, cleans the entry and lists the frame in failedDecodeFrames.
`getImageForce` is replaced by a stub whose decodes are finished by hand (`__dec[i].res()` / `.rej()`)."""

SETUP = """() => {
  const vc = videoControl.videoCache;
  window.__url = videoControl.video.src;
  window.__dec = []; window.__st = {};
  vc.getImageForce = (url, frame) => new Promise((res, rej) =>
    window.__dec.push({frame, res: () => res(new Image()), rej: () => rej(new Error('boom'))}));
  window.__req = (f, prio) => {
    const p = prio ? vc.enqueueFramePriority(__url, f, 25) : vc.enqueueFrame(__url, f, 25);
    window.__st[f] = 'waiting';
    p.then(() => window.__st[f] = 'ok', (e) => window.__st[f] = videoControl.videoCache.constructor.isCanceled(e) ? 'canceled' : 'error');
  };
}"""
QUEUE = "videoControl.videoCache.queryQueue.map(q => q.frame)"
STATE = "(f) => videoControl.videoCache.getFrameState(window.__url, f)"
DECODED = "window.__dec.map(d => d.frame)"


def _start(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.js(SETUP)


def _regular(ui, *frames):
    for f in frames:
        ui.js("(f) => __req(f, false)", f)


def _go_first(ui):
    """Start processing: the first queued frame becomes 'inprocess' (decode started, not finished)."""
    ui.js("() => { videoControl.videoCache.processQueue(); }")
    ui.page.wait_for_function("window.__dec.length >= 1")


def _finish(ui, i):
    ui.js("(i) => __dec[i].res()", i)


def test_q1_regular_requests_keep_their_order_and_a_known_frame_is_left_alone(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 101, 102, 103)
    _regular(ui, 102)                                               # already pending: nothing
    assert ui.js(QUEUE) == [101, 102, 103]


def test_q2_priority_new_frame_goes_to_the_front_after_the_frame_in_process(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 100, 101, 102)
    _go_first(ui)
    assert ui.js(STATE, 100) == "inprocess" and ui.js(QUEUE) == [101, 102]
    ui.js("__req(200, true)")
    ui.js("__req(201, true)")                                       # latest need first
    assert ui.js(QUEUE) == [201, 200, 101, 102]
    _finish(ui, 0)
    ui.page.wait_for_function("window.__dec.length === 2")
    assert ui.js(DECODED) == [100, 201]                             # stale needs wait, the latest is decoded next
    assert ui.js(STATE, 100) == "incache" and ui.js(STATE, 201) == "inprocess"


def test_q3_priority_moves_a_pending_frame_to_the_front_a_regular_one_does_not(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 100, 101, 102, 103)
    _go_first(ui)
    ui.js("__req(103, true)")
    assert ui.js(QUEUE) == [103, 101, 102]
    ui.js("__req(102, false)")
    assert ui.js(QUEUE) == [103, 101, 102]


def test_q4_frame_in_process_is_not_reordered_nor_duplicated(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 100, 101)
    _go_first(ui)
    ui.js("__req(100, true)")
    assert ui.js(QUEUE) == [101] and ui.js(DECODED) == [100]
    _finish(ui, 0)
    ui.page.wait_for_function("window.__st[100] === 'ok'")
    assert ui.js(STATE, 100) == "incache"


def test_q5_cancel_abandons_the_frame_in_process_the_queue_does_not_wait_for_it(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 100, 101, 102)
    _go_first(ui)
    ui.js("videoControl.videoCache.cancelQueue()")
    ui.page.wait_for_function("['100','101','102'].every(f => window.__st[f] === 'canceled')")
    assert ui.js(QUEUE) == [] and ui.js(STATE, 100) is None and ui.js(STATE, 101) is None
    ui.page.wait_for_function("!videoControl.videoCache.processingQueue")   # a hung decode cannot block the queue
    _finish(ui, 0)                                                          # it ends later: result thrown away
    ui.page.wait_for_timeout(100)
    assert ui.js(STATE, 100) is None and ui.js("videoControl.videoCache.lrucache.size") == 0
    assert ui.js(DECODED) == [100]                                          # the cancelled frames were never decoded


def test_q6_frame_requested_again_after_a_cancel_is_decoded_normally(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 100)
    _go_first(ui)
    ui.js("videoControl.videoCache.cancelQueue()")
    ui.js("() => { __req(100, true); videoControl.videoCache.processQueue(); }")   # while the old decode hangs
    ui.page.wait_for_function("window.__dec.length === 2")
    assert ui.js(STATE, 100) == "inprocess"
    _finish(ui, 0)                                                          # the old decode ends: must not touch the new entry
    ui.page.wait_for_timeout(100)
    assert ui.js(STATE, 100) == "inprocess"
    _finish(ui, 1)
    ui.page.wait_for_function("window.__st[100] === 'ok'")
    assert ui.js(STATE, 100) == "incache"


def test_q7_failed_decode_rejects_cleans_lists_the_frame_and_the_queue_goes_on(ui, sample_dir):
    _start(ui, sample_dir)
    ui.allow(r"VideoCache\.processQueue: decode failed")              # the error the test provokes
    _regular(ui, 100, 101)
    _go_first(ui)
    ui.js("__dec[0].rej()")
    ui.page.wait_for_function("window.__st[100] === 'error' && window.__dec.length === 2")
    assert ui.js(STATE, 100) is None
    assert ui.js("[...videoControl.videoCache.failedDecodeFrames]") == [ui.js("window.__url") + ":100"]
    _finish(ui, 1)
    ui.page.wait_for_function("window.__st[101] === 'ok'")
    ui.js("() => { __req(100, true); videoControl.videoCache.processQueue(); }")   # later retry succeeds: leaves the list
    ui.page.wait_for_function("window.__dec.length === 3")
    _finish(ui, 2)
    ui.page.wait_for_function("window.__st[100] === 'ok'")
    assert ui.js("videoControl.videoCache.failedDecodeFrames.size") == 0


def test_q8_cache_status_shows_the_frame_in_process_as_processing(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.wait_for_function("typeof videoCacheStatus !== 'undefined' && videoCacheStatus !== null")
    ui.js("document.getElementById('showVideoCacheStatus').click()")
    off = ui.js("getVideoInfo().frameoffset")
    _regular(ui, 100 + off, 101 + off)
    _go_first(ui)
    ui.js("videoCacheStatus.update()")
    assert ui.js("videoCacheStatus.cachedFramesRuns") == [
        {"startFrame": 100, "endFrame": 100, "status": "processing"},
        {"startFrame": 101, "endFrame": 101, "status": "pending"}]


def test_q9_decode_that_never_ends_times_out_as_a_failure_and_the_queue_goes_on(ui, sample_dir):
    _start(ui, sample_dir)
    ui.allow(r"VideoCache\.processQueue: decode failed")
    ui.js("videoControl.videoCache.opts.decodeTimeoutMs = 200")
    _regular(ui, 100, 101)
    _go_first(ui)                                                           # 100 hangs
    ui.page.wait_for_function("window.__st[100] === 'error' && window.__dec.length === 2")
    assert ui.js(STATE, 100) is None
    assert ui.js("[...videoControl.videoCache.failedDecodeFrames]") == [ui.js("window.__url") + ":100"]
    _finish(ui, 1)
    ui.page.wait_for_function("window.__st[101] === 'ok' && !videoControl.videoCache.processingQueue")


def test_q10_preload_resolves_when_its_frames_are_loaded_even_if_the_queue_was_already_running(ui, sample_dir):
    _start(ui, sample_dir)
    _regular(ui, 100)
    _go_first(ui)                                                           # a loop is running on 100
    ui.js("() => { window.__pre = 'waiting'; videoControl.videoCache.preloadFrames(__url, [101], 25).then(() => window.__pre = 'done'); }")
    ui.page.wait_for_timeout(200)
    assert ui.js("window.__pre") == "waiting"                               # not resolved by the busy-loop early return
    _finish(ui, 0)
    ui.page.wait_for_function("window.__dec.length === 2")
    assert ui.js("window.__pre") == "waiting"
    _finish(ui, 1)
    ui.page.wait_for_function("window.__pre === 'done'")
    assert ui.js(STATE, 101) == "incache"


def test_q11_seek_ignores_answers_for_frames_that_are_not_the_requested_one_any_more(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("""() => { window.__shown = []; videoControl.currentMode = 'cache';
      videoControl.onFrameChangedCache = function () { window.__shown.push(this.cacheFrame); };
      videoControl.seekFrame(10); videoControl.seekFrame(11); videoControl.seekFrame(12); }""")
    ui.page.wait_for_function("window.__dec.length === 1")                  # 10 in process, queue [12, 11]
    assert ui.js(QUEUE) == [12 + ui.js("getVideoInfo().frameoffset"), 11 + ui.js("getVideoInfo().frameoffset")]
    _finish(ui, 0)                                                          # stale answer for 10
    ui.page.wait_for_function("window.__dec.length === 2")
    assert ui.js("window.__shown") == []
    _finish(ui, 1)                                                          # 12, the requested one
    ui.page.wait_for_function("window.__dec.length === 3")
    _finish(ui, 2)                                                          # stale answer for 11
    ui.page.wait_for_function("!videoControl.videoCache.processingQueue")
    assert ui.js("window.__shown") == [12]


def test_q12_overlay_redraws_once_the_missing_frames_arrive_only_if_still_current(ui, sample_dir):
    _start(ui, sample_dir)
    ui.js("""() => { window.__refresh = 0; const h = overlay.hardRefresh.bind(overlay);
      overlay.hardRefresh = () => { window.__refresh++; }; overlay.opts.showImageDiff = true; }""")
    ui.js("() => { overlay.redrawVideoFrameDiff(); }")                      # current frame and the previous one not cached
    ui.page.wait_for_function("window.__dec.length >= 1")
    base = ui.js("window.__refresh")
    ui.page.wait_for_function("window.__dec.length >= 1")
    while ui.js("videoControl.videoCache.queryQueue.length + (videoControl.videoCache.currentQuery ? 1 : 0)") > 0:
        n = ui.js("window.__dec.length")
        ui.js("(i) => __dec[i].res()", n - 1)
        ui.page.wait_for_timeout(50)
    ui.page.wait_for_function("window.__refresh > %d" % base)
    # the user moved to another frame before the answer: no redraw
    ui.js("videoControl.currentFrame = videoControl.currentFrame + 5")
    before = ui.js("window.__refresh")
    ui.js("() => overlay.refreshIfLoaded(videoControl.video.src, videoControl.currentFrame - 5, [videoControl.currentFrame - 5])")
    assert ui.js("window.__refresh") == before


def test_q13_full_queue_drops_its_last_frame_for_a_priority_request_and_refuses_a_regular_one(ui, sample_dir):
    """ADR 0013 addendum: the queue holds at most `videoCacheSize` frames."""
    _start(ui, sample_dir)
    ui.js("() => { videoControl.videoCache.setCacheSize(3); window.__req = (f, prio) => { const vc = videoControl.videoCache;"
          " const p = prio ? vc.enqueueFramePriority(__url, f, 25) : vc.enqueueFrame(__url, f, 25); window.__st[f] = 'waiting';"
          " p.then(() => window.__st[f] = 'ok', (e) => window.__st[f] = videoControl.videoCache.constructor.isCanceled(e) ? 'canceled'"
          " : videoControl.videoCache.constructor.isQueueFull(e) ? 'full' : 'error'); }; }")
    _regular(ui, 100, 101, 102)
    _regular(ui, 103)                                               # no room: refused, nothing queued
    assert ui.js(QUEUE) == [100, 101, 102]
    ui.page.wait_for_function("window.__st[103] === 'full'")
    assert ui.js(STATE, 103) is None
    ui.js("__req(200, true)")                                       # priority: the last one (102) leaves
    assert ui.js(QUEUE) == [200, 100, 101]
    ui.page.wait_for_function("window.__st[102] === 'canceled'")
    assert ui.js(STATE, 102) is None
    _regular(ui, 100)                                               # known frame: needs no room
    ui.js("__req(101, true)")                                       # known frame, priority: moves, drops nothing
    assert ui.js(QUEUE) == [101, 200, 100]
    assert [ui.js("() => window.__st[%d]" % f) for f in (100, 101, 200)] == ["waiting"] * 3
