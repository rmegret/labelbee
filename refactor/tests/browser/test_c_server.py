"""Section C of tests/CHECKLIST.md, server and CSV loading: the "Load Events from DB" dialog, the #video_data=<id> hash,
the tracks CSV entries of "Server storage". The dev webapp seeds five annotations (tests/webapp/serve.py SEEDS):
id 4 is events_v2.json, the most recent event file."""
import json


def test_c8_load_events_from_db_dialog(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.page.click("input[value='Load Events from DB']")
    ui.page.wait_for_selector("#from-server-dialog", state="visible")
    assert "events_v2.json" in ui.page.inner_text("#from-server-dialog")      # the most recent event file is proposed
    ui.page.click("#from-server-dialog button:has-text('Yes')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.n_observations() == 13
    assert ui.js("fromServerDialog.basedOn") == "4" or ui.js("fromServerDialog.basedOn") == 4     # lineage of the next save
    assert "Events loaded." in ui.page.inner_text("#from-server-dialog .modal-message")


HASH = "#video_id=1&video_data=4&frame=10"


def test_c9_hash_change_on_an_open_page_loads_the_events_and_seeks(ui):
    """The bookmark flow: the video is already loaded, the hash changes."""
    ui.open()
    ui.js("location.hash = '%s'" % HASH)
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.n_observations() == 13
    ui.page.wait_for_function("videoControl.getCurrentFrame() === 10")
    assert ui.js("fromServerDialog.basedOn") in ("4", 4)
    ui.goto_frame(11)                                                       # moving away removes `frame=` from the hash
    ui.page.wait_for_function("!location.hash.includes('frame=')")


def test_c9_opening_a_url_with_video_data_loads_the_events(ui):
    ui.open("#video_id=1&video_data=4")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.n_observations() == 13


def test_c9_opening_a_url_with_a_frame_seeks(ui):
    """F1 (README.md), fixed: the delayed seek of a URL opened while the video is still loading used to read an
    already cleared frame number and never happened."""
    ui.open(HASH)
    ui.page.wait_for_function("videoControl.getCurrentFrame() === 10")
    assert "frame=10" in ui.js("location.hash")                              # kept until the user moves to another frame
    ui.goto_frame(11)
    ui.page.wait_for_function("!location.hash.includes('frame=')")


def test_c10_wrong_video_data_id_alerts_and_the_seek_still_happens(ui):
    ui.allow(r"video_data id=999", r"loading events with ID 999", r"404: .*/api/v1/annotation/999")
    ui.open()
    ui.js("location.hash = '#video_id=1&video_data=999&frame=10'")
    text = ui.wait_main_alert("ERROR loading events with ID 999")
    assert "Could not load video_data id=999" in text
    ui.page.wait_for_function("videoControl.getCurrentFrame() === 10")                           # the seek still happens
    assert ui.n_observations() == 0
    ui.close_main_alert()


def test_c10_opening_a_url_with_a_wrong_id_alerts(ui):
    ui.allow(r"video_data id=999", r"loading events with ID 999", r"404: .*/api/v1/annotation/999")
    ui.open("#video_id=1&video_data=999")
    ui.wait_main_alert("ERROR loading events with ID 999")
    ui.close_main_alert()


def _tracks_csv_from_uri(ui, url):
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append(url)
    ui.page.click("a[onclick*='clickLoadTracksCSVFromServer']")            # "from URI" of the tracks CSV (not the video's)


def test_c11_tracks_csv_from_a_uri(ui):
    ui.open()
    _tracks_csv_from_uri(ui, "/data/sample/tracks.csv")
    ui.page.wait_for_function("events.info && events.info.source.includes('CSV')")
    assert ui.tracks_info()["source"] == 'Converted from CSV "/data/sample/tracks.csv"'
    assert ui.n_observations() == 20
    obs = ui.tracks()["0"]["1"]
    assert (obs["width"], obs["height"], obs["angle"]) == (300, 600, 100)         # fixed 300x600 box, angle + 90 (BEH-735)
    assert [p["label"] for p in obs["parts"]] == ["head", "neck", "thorax", "tail"]  # waist is not visible


def test_c11_tracks_csv_from_the_data_picker(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.page.click("a[onclick*='pickEventsCSVDialog']")
    ui.page.wait_for_selector(".modal.in")
    ui.page.click(".modal.in button:has-text('sample/')")
    ui.page.click(".modal.in button:has-text('tracks.csv [data]')")
    ui.page.click(".modal.in .modal-footer button:has-text('Load')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.n_observations() == 20


def test_c12_a_bad_csv_url_alerts(ui):
    ui.allow(r"loading tracks CSV from /data/sample/nope\.csv", r"nope\.csv", r"404 Not Found")
    ui.open()
    _tracks_csv_from_uri(ui, "/data/sample/nope.csv")
    text = ui.wait_main_alert("ERROR loading tracks CSV from /data/sample/nope.csv")
    assert ui.n_observations() == 0
    ui.close_main_alert()


def test_c13_gurabo4_video_and_tracks_tagged(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append("test/v.mp4")
    ui.page.click("a[onclick*='clickLoadTracksTaggedCSVFromServer']")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.js("videoControl.video.currentSrc").endswith("/datasets/gurabo4/mp4/test/v.mp4")
    ids = sorted(ui.tracks()["0"])
    assert ids == ["42", "T2"]                      # track_tagid when there is one, else "T" + track_id (BEH-736)
    # The current pipeline puts the tag information into the Tracks (obs.tag): the separate tag file is obsolescent
    tag = ui.tracks()["0"]["42"]["tag"]
    assert (tag["id"], tag["dm"]) == (42, 60)
    assert "tag" not in ui.tracks()["0"]["T2"]      # a track without tag id has none
    ui.page.wait_for_function("/\\b[1-9]\\d* tags/.test(document.body.innerText)")     # the chronogram counts them
    assert len(ui.tags()) == 0                      # the separate Tags structure is not used by this pipeline
