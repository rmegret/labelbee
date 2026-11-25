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
    ui.mod("chrono/ChronoData.js", "M.augmentTrackWithTag()"); ui.js("refreshChronogram()")
    assert ui.tracks()["0"]["1"]["tag"]["dm"] == 60
    assert ui.mod("chrono/ChronoState.js", "M.chronoState.tagMode") == "Tracks"
    ui.page.wait_for_function("/\\b1 tags/.test(document.body.innerText)")
    assert ui.mod("chrono/ChronoState.js", "Object.keys(M.chronoState.ttags)") == ["1"]


def test_a10_current_tag_reads_the_tag_of_the_observation_or_the_raw_tags_by_tag_mode(ui, sample_dir):
    """`getCurrentTag()` (SelectionControl.js, through `getTag(frame, id)`): the tag stored in the observation in the 'Tracks'
    mode, the raw tag of the video in the 'Tags' mode."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    tag = {"id": 1, "dm": 60, "c": [84, 104], "hamming": 0, "goodness": 45.5, "p": [[70, 90], [98, 90], [98, 118], [70, 118]]}
    ui.load_tags(ui.write("tags_get_tag.json", {"0": {"tags": [tag]}}))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.mod("chrono/ChronoData.js", "M.augmentTrackWithTag()")
    ui.js("selection.select(0, 1)")
    assert ui.mod("SelectionControl.js", "M.getCurrentTag().dm") == 60
    ui.js("selection.select(0, 99)")
    assert ui.mod("SelectionControl.js", "M.getCurrentTag()") is None
    ui.js("selection.select(0, 1)")
    ui.mod("chrono/ChronoState.js", "M.chronoState.tagMode = 'Tags'")
    assert ui.mod("SelectionControl.js", "M.getCurrentTag().c") == [84, 104]
    ui.js("selection.select(0, 99)")
    assert ui.mod("SelectionControl.js", "M.getCurrentTag()") is None


def test_a10_a_tag_with_no_matching_observation_is_stored_but_attaches_to_nothing(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.load_tags(sample_dir / "tags_v2.json")                           # tag ids 5 and 6: no observation has them
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.page.wait_for_timeout(300)
    assert list(ui.tags()) == ["0", "4"]
    assert all("tag" not in o for frame in ui.tracks().values() for o in frame.values())
    assert ui.mod("chrono/ChronoState.js", "Object.keys(M.chronoState.ttags).length") == 0


def test_a10_the_standalone_tags_display_is_only_reachable_from_the_console(ui, sample_dir):
    """`tagMode` is 'Tracks' in chrono/ChronoData.js and nothing in the page changes it: the display of the Tags structure
    itself (tagMode == 'Tags', legacy) is reachable only by switching the mode in the console, which is what this does."""
    ui.open()
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    assert ui.mod("chrono/ChronoState.js", "M.chronoState.tagMode") == "Tracks"
    ui.mod("chrono/ChronoState.js", "M.chronoState.tagMode = 'Tags'")
    ui.js("refreshChronogram()")
    ui.wait_mod("chrono/ChronoState.js", "Object.keys(M.chronoState.ttags).sort().join() === '5,6'")
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
    """The track window (`chrono.config.trackWindow`, chrono/ChronoControlInteraction.js): the inputs set the range and the direction,
    `scaleTrackWindow` rescales it, each change triggers `trackWindow:change` on `$(chrono)`, and "Follow" focuses the chronogram."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    assert ui.js("({...chrono.config.trackWindow})") == {"trackWindowRange": 10, "trackWindowDirection": "Backward", "trackWindowForward": 0, "trackWindowBackward": 10}
    ui.js("window.nChange = 0; $(chrono).on('trackWindow:change', () => window.nChange++)")
    ui.js("$('#selectboxTrackDir').val('Bidirectional'); $('#trackWindow').val(20); onTrackWindowChanged()")
    assert ui.js("({...chrono.config.trackWindow})") == {"trackWindowRange": 20, "trackWindowDirection": "Bidirectional", "trackWindowForward": 20, "trackWindowBackward": 20}
    assert ui.js("nChange") >= 1
    ui.js("scaleTrackWindow(0.5)")
    assert ui.js("[chrono.config.trackWindow.trackWindowRange, $('#trackWindow').val()]") == [10, "10"]
    ui.js("onClickFocusTrackWindow()")
    assert ui.js("$('#focusTrackWindow').hasClass('active')") is True
    f = ui.js("videoControl.currentFrame")
    lo, hi = ui.js("chrono.axes.xScale.domain()")                          # the window plus a margin
    assert f - 12 <= lo <= f - 10 and f + 10 <= hi <= f + 12
    ui.js("onClickFocusVideo()")
    assert ui.js("$('#focusTrackWindow').hasClass('active')") is False


def test_a10_roi_and_exclude_rects_switch_the_tag_filters_and_the_exclude_rects_are_edited_by_the_buttons(ui, sample_dir):
    """The region filters (`chrono.config.region`, buttons in chrono/ChronoControlInteraction.js, filters
    in chrono/ChronoData.js): "Apply" of the ROI switches `chrono.filters.roi`, the text input sets the ROI, and the exclude-rect
    buttons select and delete rects that `chrono.filters.excludeRects` rejects."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.js("window.tIn = {c: [50, 50]}; window.tOut = {c: [500, 500]}")
    assert ui.js("$('#ROI').val()") == "175,250,2305,1240"
    assert ui.js("chrono.filters.roi(tOut)") is True                      # off: everything passes
    ui.js("$('#ROI').val('0,0,100,100'); onROITextChanged()")
    ui.js("$('#useROI').click()")
    assert ui.js("chrono.config.region.useROI") is True
    assert ui.js("[chrono.filters.roi(tIn), chrono.filters.roi(tOut)]") == [True, False]
    ui.js("$('#useROI').click()")
    assert ui.js("chrono.filters.roi(tOut)") is True
    ui.js("chrono.config.region.excludeRects = [{cx: 500, cy: 500, w: 20, h: 20}]")
    ui.js("$('#useExcludeRects').click()")
    assert ui.js("[chrono.filters.excludeRects(tIn), chrono.filters.excludeRects(tOut)]") == [True, False]
    ui.js("onClickExcludeRectNext()")
    assert ui.js("chrono.config.region.excludeRectSelection") == 0
    ui.js("$('#excludeRectDeleteButton').click()")
    assert ui.js("[chrono.config.region.excludeRects.length, chrono.config.region.excludeRectSelection]") == [0, -1]


def test_a10_overlay_options_toggle_and_sync_their_buttons_and_the_display_flags(ui, sample_dir):
    """`overlay.opts` is an `OverlayOptions` (overlay/OverlayOptions.js): the buttons flip the option and its `active` class, the
    angle switch and the show checkboxes are fields (no page global), the tag marker select follows `opts.tagMarker`."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    assert ui.js("overlay.opts.constructor.name") == "OverlayOptions"
    assert ui.js("[typeof onShowObsChanged, typeof onOverlayParamsChanged, typeof overlay.optsClick]") == ["undefined"] * 3
    assert ui.js("[overlay.opts.showSpan, $('.overlayOpts-showSpan').hasClass('active')]") == [False, False]
    ui.js("overlay.opts.toggle('showSpan')")
    assert ui.js("[overlay.opts.showSpan, $('.overlayOpts-showSpan').hasClass('active')]") == [True, True]
    ui.js("""$('#overlayOpts-ID_dotRadius').val('7'); $('#overlayOpts-ID_fontSize').val('33'); $('#overlayOpts-ID_color').val('red')
             $('#overlayOpts-ID_offsetType').val('top'); $('#overlayOpts-label_offsetType').val('center'); overlay.opts.onParamsChanged()""")
    assert ui.js("[7, 33, 'red', 'top', 'center'].join() == [overlay.opts.ID_dotRadius, overlay.opts.ID_fontSize, overlay.opts.ID_color, overlay.opts.ID_offsetType, overlay.opts.label_offsetType].join()") is True
    assert ui.js("$('#showSelectedTagsTracks').prop('checked') === overlay.opts.showSelectedTagsTracks") is True
    ui.js("overlay.opts.onClickDisableAngle()")
    assert ui.js("[overlay.opts.angleEnabled, $('.guiAngle-disableAngle').hasClass('active')]") == [False, True]
    ui.js("$('#showTags').prop('checked', false); overlay.opts.onShowTagsChanged()")
    assert ui.js("overlay.opts.showTags") is False
    ui.js("$('#showObsTracks').prop('checked', false); overlay.opts.onShowObsChanged()")
    assert ui.js("[overlay.opts.showObs, overlay.opts.showObsTracks]") == [True, False]
    ui.js("$('#selectboxTagMarker').val('cross'); overlay.opts.selectboxTagMarkerChanged()")
    assert ui.js("overlay.opts.tagMarker") == "cross"
    assert ui.js("$('#selectboxTagMarker option').length") == 3


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
