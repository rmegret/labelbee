"""Section C of tests/CHECKLIST.md, local files: events and tags loaded through the real file inputs.
Bad files are expected to show an alert to the user (Q23) and to leave the loaded data alone; the console errors that
come with them are declared with `ui.allow(...)`."""
import json


def test_c1_load_events_v2_fills_the_model_and_the_notes(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    assert ui.n_observations() == 13
    assert ui.tracks_info()["source"] == "tests/webapp synthetic sample"
    ui.open_panel("I/O")
    ui.open_subpanel("Events info")
    assert ui.page.input_value("#events-notes") == "two synthetic bees"
    assert ui.boxes() == ["1"]                          # frame 0 shows its box


def test_c2_load_events_v1_object_and_v1_array(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v1.json")
    ui.wait_tracks()
    assert ui.tracks_info()["source"] == "Converted from Tracks v1 object"
    ui.load_events(sample_dir / "events_v1_array.json")
    ui.page.wait_for_function("events.info.source === 'Converted from Tracks v1 array'")
    assert ui.n_observations() > 0


def test_c3_duplicate_ids_warn_and_the_events_load(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2_duplicates.json")
    ui.wait_tracks()
    assert any("duplicate entries" in m for t, m in ui.dialogs if t == "alert")
    for frame in ui.tracks().values():                  # at most one observation per id in a frame
        assert len(frame) == len(set(frame))


def test_c4_invalid_json_is_reported_and_the_events_are_kept(ui, sample_dir):
    ui.allow(r"loading events from file bad\.json", r"JSON")
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = ui.tracks()
    ui.load_events(ui.write("bad.json", "{not json"))
    text = ui.wait_main_alert("ERROR loading events from file bad.json")
    assert "JSON" in text
    assert ui.tracks() == before
    ui.close_main_alert()


def test_c4_wrong_format_is_reported_and_the_events_are_kept(ui, sample_dir):
    ui.allow(r"loading events from file wrong\.json", r"Invalid events format")
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = ui.tracks()
    ui.load_events(ui.write("wrong.json", {"a": 1}))
    ui.wait_main_alert("Invalid events format")
    assert ui.tracks() == before
    ui.close_main_alert()


def test_c4_markup_in_a_file_name_is_not_interpreted(ui):
    ui.allow(r"loading events from file", r"JSON")
    ui.open()
    ui.load_events(ui.write("<img src=x onerror=alert(1)>.json", "{not json"))     # a legal file name on Linux
    ui.wait_main_alert("ERROR loading events from file")
    assert ui.page.locator("#mainAlertDialog .modal-body img").count() == 0       # shown as text, not as a tag
    assert "<img src=x" in ui.main_alert()
    ui.close_main_alert()


def test_c5_the_same_file_can_be_loaded_twice(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.mod("commands/Load.js", "M.loadTracks([])")                              # empty the model without the confirmation dialog
    assert ui.n_observations() == 0
    ui.load_events(sample_dir / "events_v2.json")       # same file, same input: the input value was reset
    ui.wait_tracks()
    assert ui.n_observations() == 13


def test_c6_load_tags_v2_and_v1(ui, sample_dir):
    ui.open()
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    assert list(ui.tags()) == ["0", "4"]
    assert ui.tags()["0"]["tags"][0]["frame"] == 0     # loadTags adds the frame to every tag
    v1 = {"3": {"tags": [{"id": 9, "dm": 50, "c": [5, 5], "p": [[1, 1], [2, 1], [2, 2], [1, 2]]}]}}
    ui.load_tags(ui.write("tags_v1.json", v1))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).join() === '3'")
    assert ui.js("AnnotationStore.getTagsInfo().source") == "Converted from Tags v1"


def test_c7_bad_tags_files_are_reported_and_the_tags_are_kept(ui, sample_dir):
    ui.allow(r"loading tags from file", r"unsupported|Invalid tags format")
    ui.open()
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    before = ui.tags()
    ui.load_tags(ui.write("tags_no_data.json", {"info": {"type": "tags-multiframe"}}))      # v2 without `data`
    ui.wait_main_alert("ERROR loading tags from file tags_no_data.json")
    assert ui.tags() == before
    ui.close_main_alert()
    ui.load_tags(sample_dir / "events_v2.json")                                               # events as tags
    ui.wait_main_alert("ERROR loading tags from file events_v2.json")
    assert ui.tags() == before
    ui.close_main_alert()
    ui.load_tags(ui.write("tags_null_frame.json", {"info": {"type": "tags-multiframe"}, "data": {"0": None}}))
    ui.wait_main_alert("ERROR loading tags from file tags_null_frame.json")
    assert ui.tags() == before                                                                # rolled back
    ui.close_main_alert()
