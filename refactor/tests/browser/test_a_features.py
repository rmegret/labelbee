"""Items A10 to A12 of tests/CHECKLIST.md: zoom view, tags, parts and the notes box."""

ZOOM_SIGNATURE = """() => { const c = document.getElementById('zoom'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0; for (let i = 0; i < d.length; i += 4 * 13) h = (h * 31 + d[i] + 7 * d[i + 1] + 13 * d[i + 2]) % 1000003;
  const s = new Set(); for (let i = 0; i < d.length; i += 4 * 97) s.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
  return {hash: h, colours: s.size}; }"""


def test_a10_zoom_view_shows_the_video_and_follows_the_selection(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Zoom")
    assert ui.page.is_checked("#checkboxShowZoom")
    first = ui.js(ZOOM_SIGNATURE)
    assert first["colours"] > 5                                       # not blank
    ui.open_panel("Annotations")
    ui.click_box("1")                                                 # the zoom view centres on the selected observation
    ui.page.wait_for_function("(h) => { const c = document.getElementById('zoom'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; "
                              "let x = 0; for (let i = 0; i < d.length; i += 4 * 13) x = (x * 31 + d[i] + 7 * d[i + 1] + 13 * d[i + 2]) % 1000003; return x !== h; }",
                              arg=first["hash"])


def test_a10_a_tags_file_attaches_its_tags_to_the_observations_with_the_same_id(ui, sample_dir):
    """The separate tag file is obsolescent (DEC-006) but still works in the default 'Tracks' mode: at every refresh
    `augmentTrackWithTag` (ChronoControl.js) copies each tag of the file onto the observation with the same id and
    frame, and the chronogram counts it. Since ADR 0009 (Q34) the refresh no longer calls it: loading the file attaches
    nothing by itself, the function is a console one-shot. A tag whose id matches no observation attaches to nothing."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")                       # observation ids 1 and 2, id 1 at frame 0
    ui.wait_tracks()
    tag = {"id": 1, "dm": 60, "c": [84, 104], "hamming": 0, "goodness": 45.5, "p": [[70, 90], [98, 90], [98, 118], [70, 118]]}
    ui.load_tags(ui.write("tags_same_id.json", {"0": {"tags": [tag]}}))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.page.wait_for_timeout(300)
    assert "tag" not in ui.tracks()["0"]["1"]                          # the refresh does not write the store
    ui.js("augmentTrackWithTag(); refreshChronogram()")
    assert ui.tracks()["0"]["1"]["tag"]["dm"] == 60
    assert ui.js("tagMode") == "Tracks"
    ui.page.wait_for_function("/\\b1 tags/.test(document.body.innerText)")
    assert ui.js("Object.keys(chronoState.ttags)") == ["1"]


def test_a10_current_tag_reads_the_tag_of_the_observation_or_the_raw_tags_by_tag_mode(ui, sample_dir):
    """`getCurrentTag()` (SelectionControl.js, through `getTag(frame, id)`): the tag stored in the observation in the 'Tracks'
    mode, the raw tag of the video in the 'Tags' mode."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    tag = {"id": 1, "dm": 60, "c": [84, 104], "hamming": 0, "goodness": 45.5, "p": [[70, 90], [98, 90], [98, 118], [70, 118]]}
    ui.load_tags(ui.write("tags_get_tag.json", {"0": {"tags": [tag]}}))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.js("augmentTrackWithTag()")
    ui.js("selection.select(0, 1)")
    assert ui.js("getCurrentTag().dm") == 60
    ui.js("selection.select(0, 99)")
    assert ui.js("getCurrentTag()") is None
    ui.js("selection.select(0, 1); tagMode = 'Tags'")
    assert ui.js("getCurrentTag().c") == [84, 104]
    ui.js("selection.select(0, 99)")
    assert ui.js("getCurrentTag()") is None


def test_a10_a_tag_with_no_matching_observation_is_stored_but_attaches_to_nothing(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.load_tags(sample_dir / "tags_v2.json")                           # tag ids 5 and 6: no observation has them
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.page.wait_for_timeout(300)
    assert list(ui.tags()) == ["0", "4"]
    assert all("tag" not in o for frame in ui.tracks().values() for o in frame.values())
    assert ui.js("Object.keys(chronoState.ttags).length") == 0


def test_a10_the_standalone_tags_display_is_only_reachable_from_the_console(ui, sample_dir):
    """`tagMode` is 'Tracks' in chrono/ChronoData.js and nothing in the page changes it: the display of the Tags structure
    itself (tagMode == 'Tags', legacy) is reachable only by switching the mode in the console, which is what this does."""
    ui.open()
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    assert ui.js("tagMode") == "Tracks"
    ui.js("tagMode = 'Tags'; refreshChronogram()")
    ui.page.wait_for_function("Object.keys(chronoState.ttags).sort().join() === '5,6'")
    ui.page.wait_for_function("/\\b3 tags/.test(document.body.innerText)")   # the 3 tag detections of the file


def test_a10_tag_filters_are_rebuilt_from_the_buttons_and_the_inputs_of_the_tags_panel(ui, sample_dir):
    """`chronoFilter` (Hamming buttons) and `refreshTagsParameters` (interval length) rebuild the filters
    `chrono.filters.sample` and `chrono.filters.interval` that the chronogram data and the overlay call (chrono/ChronoData.js)."""
    ui.open()
    ui.js("window.t0 = {c: [1, 1], hamming: 0, dm: 60}; window.t2 = {c: [1, 1], hamming: 2, dm: 30}")
    assert ui.js("chrono.filters.sample(t0) && chrono.filters.sample(t2)") is True
    ui.js("chronoFilter('H0')")
    assert ui.js("[chrono.filters.sample(t0), chrono.filters.sample(t2)]") == [True, False]
    ui.js("chronoFilter('H2')")
    assert ui.js("[chrono.filters.sample(t0), chrono.filters.sample(t2)]") == [True, True]
    ui.js("chronoFilter('Hall'); $('#tagsIntervalFilterMinLength').val(5); onTagsParametersChanged()")
    assert ui.js("[chrono.filters.interval({begin: 0, end: 3}), chrono.filters.interval({begin: 0, end: 9})]") == [False, True]


def test_a10_track_window_follows_its_inputs_triggers_its_event_and_the_follow_lock(ui, sample_dir):
    """The track window (`chrono.config.trackWindow`, chrono/ChronoControlInteraction.js): the inputs set range and direction,
    `scaleTrackWindow` rescales it, each change triggers `trackWindow:change` on `$(chrono)`, and "Follow" focuses the chronogram."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    assert ui.js("({...chrono.config.trackWindow})") == {"range": 10, "direction": "Backward", "forward": 0, "backward": 10}
    ui.js("window.nChange = 0; $(chrono).on('trackWindow:change', () => window.nChange++)")
    ui.js("$('#selectboxTrackDir').val('Bidirectional'); $('#trackWindow').val(20); onTrackWindowChanged()")
    assert ui.js("({...chrono.config.trackWindow})") == {"range": 20, "direction": "Bidirectional", "forward": 20, "backward": 20}
    assert ui.js("nChange") >= 1
    ui.js("scaleTrackWindow(0.5)")
    assert ui.js("[chrono.config.trackWindow.range, $('#trackWindow').val()]") == [10, "10"]
    ui.js("onClickFocusTrackWindow()")
    assert ui.js("$('#focusTrackWindow').hasClass('active')") is True
    f = ui.js("videoControl.currentFrame")
    lo, hi = ui.js("chrono.axes.xScale.domain()")                          # the window plus a margin
    assert f - 12 <= lo <= f - 10 and f + 10 <= hi <= f + 12
    ui.js("onClickFocusVideo()")
    assert ui.js("$('#focusTrackWindow').hasClass('active')") is False


def test_a11_parts_of_a_tracks_csv_and_the_show_on_video_toggle(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append("/data/sample/tracks.csv")
    ui.page.click("a[onclick*='clickLoadTracksCSVFromServer']")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert [p["label"] for p in ui.tracks()["0"]["1"]["parts"]] == ["head", "neck", "thorax", "tail"]
    ui.open_subpanel("Parts labeling")
    before = ui.js("zoomOverlay.flagShowParts")
    ui.page.click("#buttonShowParts")
    assert ui.js("zoomOverlay.flagShowParts") is (not before)
    ui.page.click("#buttonShowParts")
    assert ui.js("zoomOverlay.flagShowParts") is before


def test_a12_notes_typed_in_the_page_are_saved_in_the_file(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("I/O")
    ui.open_subpanel("Events info")
    ui.page.fill("#events-notes", "checked by the browser tests")
    assert ui.tracks_info()["notes"] == "checked by the browser tests"
    assert ui.save_events_v2()["info"]["notes"] == "checked by the browser tests"
