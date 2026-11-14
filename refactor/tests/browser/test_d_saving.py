"""Section D of tests/CHECKLIST.md: saving and exporting (slices 2 and 3). Files are caught from the real buttons."""
import csv
import json
import time


def _geometry(tracks):
    """{frame: {id: (x, y, width, height)}}: what must survive a save and a reload."""
    return {f: {i: tuple(round(o[k], 3) for k in ("x", "y", "width", "height")) for i, o in obs.items()} for f, obs in tracks.items() if obs}


def test_d1_save_v2_then_reload_gives_the_same_tracks(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = ui.tracks()
    saved = ui.save_events_v2()
    assert saved["info"]["type"] == "events-multiframe"
    assert saved["info"]["source"] == "tests/webapp synthetic sample"
    assert saved["info"]["notes"] == "two synthetic bees"
    assert len(saved["info"]["history"]) == 1 and saved["info"]["history"][0].startswith("Saved using labelbee")
    assert saved["info"]["videoinfo"]["name"] == "sample.mp4"
    assert sum(len(v) for v in saved["data"].values()) == 13
    ui.js("setTracks([])")
    ui.load_events(ui.write("saved.json", saved))
    ui.wait_tracks()
    assert _geometry(ui.tracks()) == _geometry(before)
    assert {f: sorted(o) for f, o in ui.tracks().items()} == {f: sorted(o) for f, o in before.items()}


def test_d1_the_saved_file_keeps_what_the_original_file_had(ui, sample_dir):
    """Compare with the file the page loaded: same ids per frame and same geometry, only history and videoinfo are new."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    saved = ui.save_events_v2()
    original = json.loads((sample_dir / "events_v2.json").read_text())
    for frame, events in original["data"].items():
        got = {str(e["id"]): e for e in saved["data"][frame]}
        assert sorted(got) == sorted(str(e["id"]) for e in events)
        for e in events:
            g = got[str(e["id"])]
            assert all(abs(g[k] - e[k]) < 1e-3 for k in ("x", "y", "width", "height"))
    assert set(saved["info"]) - set(original["info"]) == {"history", "videoinfo", "formatnote"}


def test_d2_save_after_a_csv_import_works_and_history_is_an_array(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append("/data/sample/tracks.csv")
    ui.page.click("a[onclick*='clickLoadTracksCSVFromServer']")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert isinstance(ui.tracks_info()["history"], str)                  # an import keeps its history as a string in memory
    saved = ui.save_events_v2()                                          # it used to fail here (DEBT-706)
    assert isinstance(saved["info"]["history"], list)
    assert saved["info"]["history"][0].startswith("Loaded in Labelbee on")
    assert saved["info"]["history"][-1].startswith("Saved using labelbee")
    assert sum(len(v) for v in saved["data"].values()) == 20


def test_d3_saving_twice_does_not_accumulate_history(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    first = ui.save_events_v2()
    second = ui.save_events_v2()
    assert len(first["info"]["history"]) == 1
    assert len(second["info"]["history"]) == 1                           # the save of the session is not in the live info
    assert "history" not in (ui.tracks_info() or {})


def test_d4_export_csv(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("I/O")
    ui.open_subpanel("Local storage")
    path = ui.download(click_selector="#saveCSV", name="export")
    rows = list(csv.reader(path.read_text().splitlines()))
    assert rows[0] == ["Date", "Time (frame)", "ID", "Action", "Cargo", "Shift"]
    assert len(rows) == 1 + 13                                           # header + one row per observation
    assert {r[2] for r in rows[1:]} == {"1", "2"}


def test_d4_export_bboxes(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("I/O")
    ui.open_subpanel("Local storage")
    path = ui.download(click_selector="#saveBBoxes", name="export")
    text = path.read_text()
    assert text.strip()
    assert len([l for l in text.splitlines() if l.strip()]) >= 13        # at least one line per observation


def test_d5_save_tags_then_erase_and_reload(ui, sample_dir):
    ui.open()
    ui.load_tags(sample_dir / "tags_v2.json")
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    before = ui.tags()
    ui.open_panel("I/O")
    ui.open_subpanel("Local storage")
    saved = json.loads(ui.download(click_selector="#savetags", name="tags").read_text())
    assert saved["info"]["type"] == "tags-multiframe"
    ui.js("setTags({}, '')")
    assert ui.tags() == {}
    ui.load_tags(ui.write("saved_tags.json", saved))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    assert ui.tags() == before


def _wait_saved(saved_dir, n=1, timeout=5.0):
    end = time.time() + timeout
    while time.time() < end:
        files = sorted(saved_dir.glob("*.json")) if saved_dir.is_dir() else []
        if len(files) >= n:
            return [json.loads(f.read_text()) for f in files]
        time.sleep(0.1)
    raise AssertionError(f"nothing saved to the server in {timeout}s")


def test_d6_save_to_the_server_and_reload_it(ui, sample_dir, saved_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v1.json")
    ui.wait_tracks()
    n = ui.n_observations()
    ui.open_subpanel("Server storage")
    ui.page.click("#eventsToServerV2")
    row = _wait_saved(saved_dir)[0]
    assert row["data_type"] == "event"
    assert row["created_from_id"] in (None, "", "undefined")           # nothing was loaded from the server before
    doc = json.loads(row["data"])
    assert doc["info"]["type"] == "events-multiframe"
    assert sum(len(v) for v in doc["data"].values()) == n
    # the saved file is now the most recent event file of the video: the dialog proposes it, and it loads back
    ui.js("setTracks([])")
    ui.page.click("input[value='Load Events from DB']")
    ui.page.wait_for_selector("#from-server-dialog", state="visible")
    assert row["file_name"] in ui.page.inner_text("#from-server-dialog")
    ui.page.click("#from-server-dialog button:has-text('Yes')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.n_observations() == n


def test_d6_the_lineage_of_a_server_load_is_sent_with_the_next_save(ui, saved_dir):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.page.click("input[value='Load Events from DB']")                # loads annotation 4 (events_v2.json)
    ui.page.wait_for_selector("#from-server-dialog", state="visible")
    ui.page.click("#from-server-dialog button:has-text('Yes')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    ui.page.keyboard.press("Escape")
    ui.page.click("#eventsToServerV2")
    row = _wait_saved(saved_dir)[0]
    assert str(row["created_from_id"]) == "4"


def test_d6_the_lineage_of_a_hash_load_is_sent_with_the_next_save(ui, saved_dir):
    ui.open()
    ui.js("location.hash = '#video_id=1&video_data=4'")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    ui.open_subpanel("Server storage")
    ui.page.click("#eventsToServerV2")
    row = _wait_saved(saved_dir)[0]
    assert str(row["created_from_id"]) == "4"                          # DEBT-722 fixed: the hash load sets the lineage
