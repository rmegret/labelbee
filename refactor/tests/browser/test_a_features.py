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


def test_a10_tags_of_the_obsolescent_tag_file_reach_the_chronogram_in_the_tags_mode(ui, sample_dir):
    """By design (maintainer, 2026-11-13): `tagMode` is 'Tracks' in OverlayControl.js and nothing changes it, because the
    separate tag file is obsolescent: the current pipeline adds the tag information to the Tracks before it reaches
    LabelBee (tracks_tagged CSV, see test_c13). A tags file is still read and stored, so the legacy Tags display is only
    reachable by switching the mode in the console, which is what this test does."""
    ui.open()
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.page.wait_for_timeout(300)
    assert ui.js("tagMode") == "Tracks"
    assert ui.js("Object.keys(ttags).length") == 0                     # default mode: loaded Tags are not indexed
    ui.js("tagMode = 'Tags'; refreshChronogram()")
    ui.page.wait_for_function("Object.keys(ttags).sort().join() === '5,6'")
    ui.page.wait_for_function("/\\b3 tags/.test(document.body.innerText)")   # 3 tag detections in the file


def test_a11_parts_of_a_tracks_csv_and_the_show_on_video_toggle(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append("/data/sample/tracks.csv")
    ui.page.click("a[onclick*='clickLoadTracksCSVFromServer']")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTracks()).length > 0")
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
