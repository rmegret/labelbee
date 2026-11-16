"""The "from /data" loader dialog with CSV schema detection (annotation/CsvSchemas.js: category badge, filter by type, header validation
before loading) and the collapsible tree of the selected event in the "Events info" tab (annotation/EventTree.js)."""


def open_picker_in_sample(ui, folder="sample"):
    ui.open_subpanel("Server storage")
    ui.page.click("a[onclick*='pickEventsCSVDialog']")
    ui.page.wait_for_selector(".modal.in")
    ui.page.click(".modal.in button:has-text('%s/')" % folder)
    ui.page.wait_for_selector(".modal.in .file-row")


def test_k1_dialog_shows_the_schema_of_each_csv(ui):
    ui.open()
    open_picker_in_sample(ui)
    badge = lambda name: ui.page.locator(".modal.in .file-row", has_text=name).locator(".file-schema-badge").inner_text()
    assert badge("tracks.csv [data]") == "Tracks"
    assert badge("tags.csv [data]") == "Tags (LabelBee)"


def test_k2_filter_by_type(ui):
    ui.open()
    open_picker_in_sample(ui)
    rows = lambda: ui.page.locator(".modal.in .file-row:visible").count()
    total = rows()
    ui.page.select_option(".modal.in .file-filter-type", "tracks")
    assert rows() == 1
    ui.page.select_option(".modal.in .file-filter-type", "*loadable")
    assert 1 < rows() < total          # the csv files with a loader, not the json files
    ui.page.select_option(".modal.in .file-filter-type", "")
    assert rows() == total


def test_k3_clicking_a_file_validates_its_header(ui):
    ui.open()
    open_picker_in_sample(ui)
    ui.page.click(".modal.in button:has-text('tracks.csv [data]')")
    ui.page.wait_for_selector(".modal.in .file-schema-validation .ok")
    text = ui.page.inner_text(".modal.in .modal-message")
    assert "Valid." in text and "Schema: Tracks (tracks)" in text


def test_k4_load_goes_through_the_detected_loader(ui):
    ui.open()
    open_picker_in_sample(ui)
    ui.page.click(".modal.in button:has-text('tags.csv [data]')")
    ui.page.wait_for_selector(".modal.in .file-schema-validation .ok")
    ui.page.click(".modal.in .modal-footer button:has-text('Load')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.tracks_info()["source"].startswith('Converted from CSV')
    assert len(ui.tags()) > 0          # the tags loader also fills the Tags


def test_k4b_mapping_table_and_loading_of_events_and_detections(ui):
    ui.open()
    open_picker_in_sample(ui, "sample_gurabo")
    for suffix, field_cell, expected in [(".events.csv", "position", "track_startx/y"), (".detections.csv", "id", "detection_id")]:
        ui.page.click(".modal.in button:has-text('%s [data]')" % suffix)
        ui.page.wait_for_selector(".modal.in .file-schema-mapping")
        rows = ui.page.locator(".modal.in .file-schema-mapping tr", has_text=field_cell)
        assert expected in rows.first.inner_text()
        assert ui.page.locator(".modal.in .file-schema-mapping tr.map-ignored").count() == 1
        ui.page.click(".modal.in .modal-footer button:has-text('Load')")
        ui.page.wait_for_function("Object.keys(events.toObject()).length > 0 && /%s/.test(events.info.source)" % suffix.replace(".", "\\."))
        assert "Loaded as" in ui.page.inner_text(".modal.in .modal-message")


def test_k5_event_tree_of_the_selected_event(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    ui.open_subpanel("Events info")
    assert ui.page.inner_text("#event-tree") == "No event selected"
    ui.click_box("1")
    assert ui.page.locator("#event-tree > details > summary").inner_text().startswith("event (frame 0, id 1)")
    assert "cx: 84" in ui.page.inner_text("#event-tree")


def test_k6_event_tree_nesting_and_remembered_state(ui):
    ui.open()
    ui.open_panel("Annotations")
    ui.open_subpanel("Events info")
    obs = "{id: '1', frame: 0, parts: [{label: 'head', posFrame: {x: 1, y: 2}}], tag: {id: 7, p: [[0, 1], [2, 3]]}}"
    ui.page.evaluate("updateEventTree(%s)" % obs)
    parts = ui.page.locator("#event-tree details details > summary", has_text="parts [")
    assert parts.count() == 1
    assert not parts.evaluate("s => s.parentElement.open")             # nested levels start closed
    parts.click()
    assert parts.evaluate("s => s.parentElement.open")
    assert "0 {2}" in ui.page.inner_text("#event-tree")                # its first item is shown, closed
    ui.page.evaluate("updateEventTree(%s)" % obs)                      # re-render (new selection or edit): the state is kept
    assert ui.page.locator("#event-tree details details > summary", has_text="parts [").evaluate("s => s.parentElement.open")
    assert not ui.page.locator("#event-tree details details > summary", has_text="tag {").evaluate("s => s.parentElement.open")
    ui.page.evaluate("updateEventTree(null)")
    assert ui.page.inner_text("#event-tree") == "No event selected"


def test_k7_event_tree_is_not_rendered_while_the_tab_is_closed(ui):
    ui.open()
    ui.page.evaluate("updateEventTree({id: '1', frame: 3, parts: []})")
    assert ui.page.evaluate("document.getElementById('event-tree').textContent") == "No event selected"   # hidden: untouched
    ui.open_panel("Annotations")
    ui.open_subpanel("Events info")
    ui.page.wait_for_function("document.getElementById('event-tree').textContent.includes('frame 3')")


def test_k8_show_spans_in_the_chronogram(ui):
    ui.open()
    open_picker_in_sample(ui, "sample_gurabo")
    ui.page.click(".modal.in button:has-text('.events.csv [data]')")
    ui.page.wait_for_selector(".modal.in .file-schema-mapping")
    ui.page.click(".modal.in .modal-footer button:has-text('Load')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    bars = lambda: ui.page.locator("#svgVisualize .spanbar").count()
    assert bars() == 0                                                  # off by default
    ui.page.evaluate("flag_showSpans = true; refreshChronogram()")
    assert bars() > 0
    n_tracks = ui.page.evaluate("new Set(flatTracksAll.map(a => a.id)).size")
    assert bars() <= n_tracks                                           # start and end event of a track give one bar
    ui.page.evaluate("flag_showSpans = false; refreshChronogram()")
    assert bars() == 0
