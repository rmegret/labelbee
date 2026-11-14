"""Section A of tests/CHECKLIST.md: the page as it always worked (load, play, seek, select, create, edit, undo, swap id,
delete). Every test also checks the console at teardown (item E1, see conftest.py)."""
import json


def test_a1_page_opens_and_shows_the_video(ui):
    ui.open()
    assert ui.js("[videoControl.video.videoWidth, videoControl.video.videoHeight]") == [480, 270]
    assert ui.frame() == 0
    assert ui.js("videoinfo.nframes") == 40


def test_a2_play_and_pause(ui):
    ui.open()
    ui.page.click("#play")
    ui.page.wait_for_function("videoControl.getCurrentFrame() > 2")
    ui.page.click("#play")                       # same button: pause
    stopped_at = ui.frame()
    ui.page.wait_for_timeout(400)
    assert ui.frame() == stopped_at


def test_a3_seek_by_frame_box_and_by_chronogram(ui, sample_dir):
    ui.open()
    ui.goto_frame(25)
    assert ui.frame() == 25
    ui.load_events(sample_dir / "events_v2.json")      # the chronogram needs something to draw
    ui.wait_tracks()
    x = ui.js("""() => { const t = [...document.querySelectorAll('#svgVisualize text')].find(t => t.textContent.trim() === '20');
                         const r = t.getBoundingClientRect(); return r.x + r.width / 2; }""")
    y = ui.js("(() => { const r = document.querySelector('#svgVisualize rect.plotAreaBackground').getBoundingClientRect(); return r.y + r.height / 2; })()")
    ui.page.mouse.click(x, y)
    ui.page.wait_for_function("Math.abs(videoControl.getCurrentFrame() - 20) <= 1")


def test_a4_click_a_box_selects_it(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    assert ui.js("$('#deleteButton').hasClass('disabled')") is True     # nothing selected yet
    ui.click_box("1")
    assert ui.selected_id() == "1"
    assert ui.js("$('#deleteButton').hasClass('disabled')") is False


def test_a5_shift_click_creates_an_observation(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = ui.n_observations()
    ui.shift_click_background()
    ui.page.wait_for_function("(n) => Object.values(AnnotationStore.getTracks()).reduce((a, f) => a + Object.keys(f || {}).length, 0) === n + 1", arg=before)
    assert len(ui.boxes()) == 2                   # frame 0 had one box, now two
    new_id = ui.selected_id()
    assert new_id in ui.tracks()["0"]


def test_a6_edit_a_box_and_its_label_and_keep_it(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    ui.click_box("1")
    x0 = ui.tracks()["0"]["1"]["x"]
    p = ui.box_center("1")                        # drag the box 30 px to the right
    ui.page.mouse.move(p["x"], p["y"])
    ui.page.mouse.down()
    ui.page.mouse.move(p["x"] + 15, p["y"], steps=5)
    ui.page.mouse.move(p["x"] + 30, p["y"], steps=5)
    ui.page.mouse.up()
    ui.page.wait_for_function("(x0) => AnnotationStore.getTracks()['0']['1'].x > x0 + 10", arg=x0)
    ui.open_subpanel("Labels")
    ui.page.click("button.labeltoggle[thelabel=pollen]:visible")
    ui.goto_frame(10)                             # leave the frame and come back: the edit must be kept
    ui.goto_frame(0)
    obs = ui.tracks()["0"]["1"]
    assert obs["x"] > x0 + 10
    assert "pollen" in obs["labels"]
    assert obs["bool_acts"][1] is True            # pollen is the second flag (BEH-701)


def test_a7_undo_restores_a_deleted_observation(ui, sample_dir):
    """Undo only knows about deletions (SelectionControl.js: undoPush('delete', ...) is the only caller)."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    n = ui.n_observations()
    ui.click_box("1")
    ui.page.click("#deleteButton")
    ui.page.wait_for_function("(n) => !(AnnotationStore.getTracks()['0'] || {})['1']", arg=n)     # the emptied frame is pruned
    assert ui.n_observations() == n - 1
    ui.page.click("#undoButton")
    ui.page.wait_for_function("!!(AnnotationStore.getTracks()['0'] || {})['1']")
    assert ui.n_observations() == n


def test_a8_swap_id_from_the_current_frame_to_the_end(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    ui.goto_frame(10)
    ui.click_box("1")
    ui.page.click("#swapID")
    ui.page.fill("#swapNewIDInput", "7")
    ui.page.click("#alerttext button:has-text('SWAP')")
    ui.page.click("#alerttext button:has-text('CONFIRM')")
    ui.page.wait_for_function("Object.values(AnnotationStore.getTracks()[10] || {}).some(o => String(o.ID) === '7')")
    original = json.loads((sample_dir / "events_v2.json").read_text())["data"]
    expected = {f: sorted(("7" if str(e["id"]) == "1" and int(f) >= 10 else str(e["id"])) for e in evs) for f, evs in original.items()}
    tracks = ui.tracks()
    assert {f: sorted(obs.keys()) for f, obs in tracks.items()} == expected
    assert tracks["10"]["7"]["ID"] == "7"


def test_a9_delete_removes_the_box_and_the_chronogram_interval(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    items = ui.js("document.body.innerText.match(/data: (\\d+) items/)[1]")
    ui.click_box("1")
    ui.page.click("#deleteButton")
    ui.page.wait_for_function("!(AnnotationStore.getTracks()['0'] || {})['1']")     # the emptied frame is pruned
    assert ui.boxes() == []
    ui.page.wait_for_function("(n) => document.body.innerText.includes('data: ' + (Number(n) - 1) + ' items')", arg=items)
