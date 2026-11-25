"""VideoKeyframes (ADR 0014): `<video>.packets.csv` gives the keyframes; the Drag menu option "Preview Keyframes Only"
makes the hover preview show the keyframe nearest to the pointer. The sidecar is served by a route (the sample video
has 40 frames, every one a keyframe in reality: the route says keyframes are 0, 10, 20, 30)."""

PACKETS = "frame,key_frame,pts\n" + "".join(f"{f},{1 if f % 10 == 0 else 0},{f * 512}\n" for f in range(40))
BOX = "#chrono-drag-keyframes"


def _start(ui, sample_dir, packets=PACKETS):
    if packets is not None:
        ui.page.route("**/*.packets.csv", lambda r: r.fulfill(status=200, content_type="text/csv", body=packets))
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.page.wait_for_function("typeof chronoDragControl !== 'undefined' && chronoDragControl !== null"
                              " && typeof videoKeyframes !== 'undefined' && videoKeyframes !== null")


def test_r1_keyframes_are_read_from_the_sidecar_and_enable_the_option(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.wait_for_function("videoKeyframes.available")
    assert ui.js("videoKeyframes.keyframes") == [0, 10, 20, 30]
    assert ui.js(f"document.querySelector('{BOX}').disabled") is False
    assert ui.js("[videoKeyframes.nearest(4), videoKeyframes.nearest(5), videoKeyframes.nearest(26), videoKeyframes.isKeyframe(20)]") == [0, 0, 30, True]


def test_r2_no_sidecar_leaves_the_option_disabled_and_the_hover_untouched(ui, sample_dir):
    ui.page.route("**/*.packets.csv", lambda r: r.fulfill(status=404, body="nope"))
    _start(ui, sample_dir, packets=None)
    ui.page.wait_for_timeout(300)
    assert ui.js("videoKeyframes.available") is False
    assert ui.js(f"document.querySelector('{BOX}').disabled") is True
    assert ui.js("videoControl.hover.snap") is None


def test_r3_checking_the_option_snaps_the_hover_to_the_nearest_keyframe(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.wait_for_function("videoKeyframes.available")
    ui.js("document.querySelector('#chrono-drag-keyframes').click()")     # the menu is closed: toggle through the DOM
    assert ui.js("typeof videoControl.hover.snap") == "function"
    ui.js("() => { window.__snap = [3, 7, 15, 26, 39].map(f => videoControl.hover.snap(f)); }")
    assert ui.js("window.__snap") == [0, 10, 10, 30, 30]  # 15 is a tie between 10 and 20: the earlier
    ui.js("document.querySelector('#chrono-drag-keyframes').click()")     # unchecked again
    assert ui.js("videoControl.hover.snap") is None


def test_r4_checkbox_does_not_change_the_drag_mode(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.wait_for_function("videoKeyframes.available")
    ui.js("document.querySelector('#chrono-drag-keyframes').click()")
    assert ui.js("chronoDragControl.mode") == "pan"


def test_r5_hover_on_a_non_keyframe_asks_for_the_keyframe_and_the_next_hover_in_the_interval_is_the_same_query(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.wait_for_function("videoKeyframes.available")
    ui.js("document.querySelector('#chrono-drag-keyframes').click()")
    ui.js("""async () => { window.__asked = []; const vc = videoControl.videoCache;
      const orig = vc.enqueueFramePriority.bind(vc), __off = (await import(new URL('js/video/VideoInfo.js', document.baseURI).href)).getVideoInfo().frameoffset;
      vc.enqueueFramePriority = (url, f, fps) => { window.__asked.push(f - __off); return orig(url, f, fps); }; }""")
    ui.js("() => { videoControl.hover.query(12); videoControl.hover.query(13); videoControl.hover.query(14); videoControl.hover.query(17); }")
    assert ui.js("window.__asked") == [10, 20]   # 12,13,14 -> 10 (one query), 17 -> 20


def test_r6_menu_checkbox_clicked_with_the_mouse_keeps_the_menu_open_and_snaps(ui, sample_dir):
    _start(ui, sample_dir)
    ui.page.wait_for_function("videoKeyframes.available")
    ui.js("document.getElementById('chrono-drag-button').click()")
    ui.page.wait_for_selector("#chrono-drag-menu", state="visible")
    ui.page.click("#chrono-drag-keyframes")
    assert ui.js("document.getElementById('chrono-drag-keyframes').checked") is True
    assert ui.js("$('#chrono-drag-menu').is(':visible')") is True
    assert ui.js("typeof videoControl.hover.snap") == "function"
