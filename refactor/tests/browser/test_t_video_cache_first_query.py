"""VideoCache decodes with a real video: the first query on a fresh cache element answers (the one-shot
requestVideoFrameCallback used to be consumed by the first frame presented after the load, so the seek of the first
query waited for ever and blocked the queue), and so do the next ones."""

Q = """async (f) => { const vc = videoControl.videoCache; const url = videoControl.video.currentSrc; const t0 = performance.now();
  const r = await Promise.race([vc.getFrameImageAsync(url, f, getVideoInfo().videofps).then(() => 'ok', e => 'rejected'),
                                new Promise(r => setTimeout(() => r('TIMEOUT'), 5000))]);
  return r; }"""


def query(ui, frame):
    return ui.page.evaluate(Q, frame)


def test_t1_first_query_on_a_fresh_cache_answers(ui):
    ui.open()
    assert ui.js("() => videoControl.videoCache.video.readyState") == 0      # nothing loaded yet in the cache element
    assert query(ui, 5) == "ok"
    assert ui.js("() => videoControl.videoCache.processingQueue") is False


def test_t2_following_queries_answer_too(ui):
    ui.open()
    for f in (5, 7, 30, 31, 5, 2):
        assert query(ui, f) == "ok", f
    assert ui.js("() => videoControl.videoCache.queryQueue.length") == 0


def test_t3_queries_sent_together_before_the_video_is_loaded_all_answer(ui):
    ui.open()
    r = ui.page.evaluate("""async () => { const vc = videoControl.videoCache, url = videoControl.video.currentSrc;
      const ps = [3, 9, 12].map(f => vc.getFrameImageAsync(url, f, getVideoInfo().videofps).then(() => 'ok', () => 'rejected'));
      return await Promise.race([Promise.all(ps), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]); }""")
    assert r == ["ok", "ok", "ok"]
