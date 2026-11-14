"""Section B of tests/CHECKLIST.md: the annotation store and its bridge (slice 3, refactor/design/0005-slice-annotation-loaders.md;
slice 4 step 5a: `Tracks` and `TracksInfo` are retired, the stored events are `events`)."""


def test_b1_store_and_legacy_globals_are_the_same_objects(ui):
    ui.open()
    assert ui.js("AnnotationStore.getTracks() === events.tracks && AnnotationStore.getTags() === Tags")
    assert ui.js("AnnotationStore.getTracksInfo() === events.info && AnnotationStore.getTagsInfo() === TagsInfo")
    assert ui.js("events === AnnotationStore.events")
    assert ui.js("typeof Tracks === 'undefined' && typeof TracksInfo === 'undefined'")      # retired in slice 4 step 5a
    assert ui.js("AnnotationStore.getTagsHaveDM() === tagsHaveDM")


def test_b2_edits_made_with_the_mouse_reach_the_store(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.shift_click_background()
    new_id = ui.js("getCurrentID()")
    ui.page.wait_for_function("(id) => !!AnnotationStore.getTracks()[0][id]", arg=new_id)
    assert ui.js("(id) => events.get(0, id) === AnnotationStore.getTracks()[0][id]", new_id)
    assert ui.js("events.frameIds(0).length") == 2


def test_b3_erase_events_asks_confirmation(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("I/O")
    ui.open_subpanel("Local storage")
    ui.dialog_accepts = False                          # "Cancel" on the confirmation
    ui.page.click("#erase")
    assert ui.n_observations() == 13
    assert ("confirm", "Are you sure you want to ERASE all manual annotations (Tracks)?") in ui.dialogs
    ui.dialog_accepts = True
    ui.page.click("#erase")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTracks()).length === 0")
    assert ui.boxes() == []
    assert ui.tracks() == {}


def test_b3_erase_tags_asks_confirmation(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.open_panel("I/O")
    ui.open_subpanel("Local storage")
    ui.dialog_accepts = False
    ui.page.click("#eraseTags")
    assert list(ui.tags()) == ["0", "4"]
    ui.dialog_accepts = True
    ui.page.click("#eraseTags")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length === 0")
    assert ui.n_observations() == 13                   # the events are not touched


def test_b4_dm_controls_follow_the_loaded_tags(ui, sample_dir):
    ui.open()
    assert ui.tags_have_dm() is False
    ui.load_tags(sample_dir / "tags_v2.json")           # tags with the `dm` field
    ui.page.wait_for_function("AnnotationStore.getTagsHaveDM() === true")
    assert ui.js("$('.requireDM').length > 0 && $('.requireDM').toArray().every(e => !e.disabled)")
    without_dm = {0: {"tags": [{"id": 7, "frame": 0, "c": [10, 10], "p": [[1, 1], [2, 1], [2, 2], [1, 2]]}]}}
    ui.load_tags(ui.write("tags_without_dm.json", without_dm))
    ui.page.wait_for_function("AnnotationStore.getTagsHaveDM() === false")
    assert ui.js("$('.requireDM').toArray().every(e => e.disabled)")
