"""Step 0 of slice 6 (refactor/design/0009-slice-refresh-logic.md): what refreshes, and in which order, for each user action, read from the
refresh log of the page (`refreshLog`, core/Notifier.js, filled by the entry points wrapped in core/RefreshInstrumentBridge.js and the store
commands of `events`). The nested sequences are pinned in `refresh_baseline.json` (the baseline of ADR 0009 section 4): a step that moves the
refresh calls into a Refresher changes them on purpose, a count can only go down, and the diff of that file shows it. To record the
sequences of the current code after such a step: `UPDATE_REFRESH_BASELINE=1 pytest refactor/tests/browser/test_l_refresh.py`, then review the diff.

A sequence reads `a,b(c,d),e`: `b` called `c` and `d`; `xN` is N identical consecutive siblings; `store:op` is a command of `events`.
The durations are not asserted; they are written to `refactor/scratch/refresh-baseline.json` (git-ignored) at each run, to compare two commits."""
import json
import os
import pathlib
import re

import pytest

SCRATCH = pathlib.Path(__file__).resolve().parents[2] / "scratch"
BASELINE = pathlib.Path(__file__).with_name("refresh_baseline.json")
RESULTS = {}
# key of fabric's active object, as the editors read it before slice 6 step 6b (`selectedKey()`)
AGREE = ("(() => { const a = overlay.getActiveRect(); return (!a || a.draft || !a.obs) ? null : {frame: a.obs.frame, id: a.obs.ID}; })()")


def run(ui, name, action, audited=False):
    """Clears the log, runs `action()`, waits for the page to be quiet, returns the compact sequence of phases. `audited`: the action goes
    through migrated writers (ADR 0009 step 4), so no store write may be left without a `refresh.*` call (`refresh.unrefreshed`)."""
    ui.settle(300)
    ui.js("refreshLog.clear(); refresh.unrefreshed.length = 0")
    action()
    last = None
    for _ in range(50):                                    # quiet = the log did not grow during a 300 ms wait (late events on a loaded machine)
        ui.settle(300)
        seq = ui.js("refreshLog.length ? refreshLog[refreshLog.length - 1].seq : 0")
        if seq == last:
            break
        last = seq
    if audited:
        assert ui.js("refresh.unrefreshed") == []
    assert ui.js(AGREE) == ui.js("selection.getKey()")     # ADR 0009 section 0b: the model and fabric's active object select the same key
    assert ui.js("refreshInstrumented.missing") == []      # every entry point of RefreshInstrumentBridge.js exists
    compact = ui.js("refreshLog.tree()")                   # nested: parent(children), consecutive identical siblings as xN
    log = ui.js("refreshLog.filter(e => e.depth === 0).map(e => ({phase: e.phase, ms: e.ms}))")
    ms = {}                                                # top-level entries only: a nested call is already in its parent's time
    for e in log:
        ms[e["phase"]] = round(ms.get(e["phase"], 0) + e["ms"], 1)
    RESULTS[name] = {"sequence": compact, "ms": ms}
    return compact


@pytest.fixture(scope="module", autouse=True)
def write_results():
    yield
    if os.environ.get("UPDATE_REFRESH_BASELINE") and len(RESULTS) == 13:
        BASELINE.write_text(json.dumps({k: normalize(k, v["sequence"]) for k, v in RESULTS.items()}, indent=1) + "\n")
    try:
        SCRATCH.mkdir(exist_ok=True)
        (SCRATCH / "refresh-baseline.json").write_text(json.dumps(RESULTS, indent=1))
    except OSError:
        pass


def loaded(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    ui.open_subpanel("Labels")
    ui.open_subpanel("BeeID")
    ui.settle()


# The mouse moves of a drag each refresh the overlay and the form: their number follows the moves, not the code
DRAG_MOVE = r"^(?:OverlayControl\.refreshOverlay,updateForm\(updateEventTree\),ZoomOverlay\.refreshZoom,?)+"


def normalize(name, got):
    return re.sub(DRAG_MOVE, "MOVE*,", got) if name == "drag" else got


def check(name, got):
    print(f"\n[refresh] {name}: {got}")
    got = normalize(name, got)
    if os.environ.get("UPDATE_REFRESH_BASELINE"):
        return
    assert got == json.loads(BASELINE.read_text())[name]


def test_l1_load_events(ui, sample_dir):
    ui.open()
    got = run(ui, "load", lambda: (ui.load_events(sample_dir / "events_v2.json"), ui.wait_tracks()))
    check("load", got)


def test_l2_select_a_box(ui, sample_dir):
    loaded(ui, sample_dir)
    check("select", run(ui, "select", lambda: ui.click_box("1")))


def test_l3_label_button(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.click_box("1")
    check("label", run(ui, "label", lambda: ui.page.click("button.labeltoggle[thelabel=pollen]:visible"), audited=True))


def test_l4_notes_enter(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.click_box("1")
    ui.page.fill("#notes", "x")

    def act():
        ui.page.press("#notes", "Enter")

    check("notes", run(ui, "notes", act, audited=True))


def test_l5_rotate_tag(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.click_box("1")
    check("rotate_tag", run(ui, "rotate_tag", lambda: ui.js("zoomOverlay.rotateTag(90)"), audited=True))


def test_l6_create_by_shift_click(ui, sample_dir):
    loaded(ui, sample_dir)
    check("create", run(ui, "create", lambda: ui.shift_click_background(), audited=True))


def test_l7_delete_one(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.click_box("1")
    check("delete", run(ui, "delete", lambda: ui.page.click("#deleteButton"), audited=True))


def test_l8_swap_id(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.goto_frame(10)
    ui.click_box("1")

    def act():
        ui.page.click("#swapID")
        ui.page.fill("#swapNewIDInput", "7")
        ui.page.click("#alerttext button:has-text('SWAP')")
        ui.page.click("#alerttext button:has-text('CONFIRM')")

    check("swap", run(ui, "swap", act, audited=True))


def test_l9_frame_step(ui, sample_dir):
    loaded(ui, sample_dir)
    check("frame", run(ui, "frame", lambda: ui.goto_frame(5)))


def test_l10_drag_a_box(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.click_box("1")
    c = ui.box_center("1")

    def act():
        ui.drag(c, {"x": c["x"] + 20, "y": c["y"] + 10})

    check("drag", run(ui, "drag", act, audited=True))


def test_l11_bulk_delete_of_false_alarms(ui, sample_dir):
    """The loop case of ADR 0009 D4: many store commands, which must not become many refreshes."""
    loaded(ui, sample_dir)
    ui.js("events.forEach((obs, F, id) => events.update(F, id, {labels: 'falsealarm'}))")
    check("bulk_delete", run(ui, "bulk_delete", lambda: ui.js("zoomOverlay.deleteFalsealarmEvents()"), audited=True))


def test_l12_tracks_csv_from_a_uri(ui):
    """The server and CSV loaders called `setTracks` (which refreshes) and then refreshed again themselves (ADR 0009 Q36); step 5 deletes
    their own refresh one loader at a time: this one (tracks CSV from a URI) refreshes once, like the file "Load"."""
    ui.open()
    ui.settle()
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append("/data/sample/tracks.csv")

    def act():
        ui.page.click("a[onclick*='clickLoadTracksCSVFromServer']")
        ui.page.wait_for_function("events.info && events.info.source.includes('CSV')")

    check("load_csv", run(ui, "load_csv", act))


BIG = """(() => {
  const data = {};
  for (let f = 0; f < 600; f++) {
    data[f] = [];
    for (let i = 0; i < 30; i++)
      data[f].push({id: String(i), frame: f, time: f / 20, x: 10 + 15 * i, y: 100, width: 12, height: 12, cx: 16 + 15 * i, cy: 106, angle: 0, notes: "", labels: ""});
  }
  setTracks({info: {type: "events-multiframe", source: "refresh test"}, data});
})()"""


def test_l13_edit_with_18000_observations(ui):
    """The cost of one edit grows with the number of observations (`updateChronoData` rebuilds everything): the scenario of the budget."""
    ui.open()
    ui.open_panel("Annotations")
    ui.open_subpanel("Labels")
    ui.open_subpanel("BeeID")
    ui.js(BIG)
    ui.wait_tracks("n >= 18000")
    ui.settle(1500)
    ui.click_box("1")
    got = run(ui, "label_18000", lambda: ui.page.click("button.labeltoggle[thelabel=pollen]:visible"), audited=True)
    check("label_18000", got)
    print("[refresh] ms label_18000:", RESULTS["label_18000"]["ms"])


def test_l14_show_tree_format(ui, sample_dir):
    """`refreshLog.showTree()`: one line per entry, 2 spaces per nesting level, `seq phase what ms [trigger] total_ms`."""
    loaded(ui, sample_dir)
    ui.click_box("1")
    ui.js("refreshLog.clear(); logging.refresh = true")
    ui.js("events.update(0, '1', {notes: 'x'}); refresh.rebuild()")
    ui.settle(500)
    out = ui.js("(() => { let s; const l = console.log; console.log = (x) => { s = x; }; refreshLog.showTree(); console.log = l; return s; })()")
    ui.js("logging.refresh = false")
    lines = out.split("\n")
    print("\n" + out)
    assert re.match(r"^\d+ store update \d+/\S+ 0 \[.+\] 0$", lines[0])                                  # top level: no indent, instant, with its trigger
    assert any(re.match(r"^\d+ refresh refresh\.rebuild [\d.]+ \[.+\] [\d.]+$", l) for l in lines)           # a refresh call is top level
    assert any(re.match(r"^  \d+ overlay VideoControl\.refresh [\d.]+ \[.+\] [\d.]+$", l) for l in lines)   # its step: 2 spaces
    assert any(re.match(r"^    \d+ overlay OverlayControl\.hardRefresh [\d.]+ \[.+\] [\d.]+$", l) for l in lines)   # child: 4 spaces
    assert any(l.startswith("      ") for l in lines)                                            # grandchildren: 6 spaces


def test_l15_refresh_calls_and_audit(ui, sample_dir):
    """ADR 0009 section 0: `window.refresh` has the explicit calls (nothing refreshes on a store write by itself) and its audit
    lists a store write that no `refresh.*` call followed."""
    loaded(ui, sample_dir)
    ui.js("refreshLog.clear(); refresh.unrefreshed.length = 0; events.update(0, '1', {notes: 'a'})")
    assert ui.js("refreshLog.tree()") == "store:update"                                       # nobody refreshes on a store write
    ui.page.wait_for_timeout(50)
    assert ui.js("refresh.unrefreshed.map(e => e.op)") == ["update"]                          # the audit saw the write alone
    ui.js("refresh.unrefreshed.length = 0; refreshLog.clear(); events.update(0, '1', {notes: 'b'}); refresh.update()")
    ui.page.wait_for_timeout(50)
    got = ui.js("refreshLog.tree()")
    print("\n[refresh] refresh.update:", got)
    assert got.startswith("store:update,refresh.update(")
    assert ui.js("refresh.unrefreshed.length") == 0
    names = ui.js("refreshLog.filter(e => e.depth === 1).map(e => e.what)")
    assert [n for n in names if n != "refresh.update"][0] == "refreshChronogram"
    ui.js("refreshLog.clear(); refresh.rebuild()")
    got = ui.js("refreshLog.tree()")
    print("[refresh] refresh.rebuild:", got)
    assert got.startswith("refresh.rebuild(") and "VideoControl.refresh" in got


def test_l16_overlay_writers_leave_no_store_write_unrefreshed(ui, sample_dir):
    """ADR 0009 step 4e, OverlayControl.js writers: ctrl-drag that stores a box, ctrl-drag too small (nothing stored), refused id
    conflict, pick-frame entry (default span) and its Set End / Set Start buttons. The audit lists no store write without a `refresh.*` call."""
    loaded(ui, sample_dir)
    for sel in ("#parameters > .ui-accordion-header", "#features > .ui-accordion-header"):  # "Features" is a subpanel of "Options"
        header = ui.page.locator(sel)
        if header.get_attribute("aria-expanded") != "true":
            header.click()
    ui.page.check("#showSelected")
    ui.page.check("#showPickFrame")
    ui.click_box("1")
    # not the button: its handler `modifyCurrentObsSpan` (SelectionControl.js) writes a span first, migrated in its own step
    run(ui, "pick_frame_enter", lambda: ui.js("overlay.setInteractionMode('pick-frame', {type: 'setspan'})"), audited=True)
    assert ui.tracks()["0"]["1"]["span"] == {"f1": 0, "f2": 0}
    assert "refreshChronogram" in ui.js("refreshLog.tree()")                                  # the default span is shown by the chronogram
    ui.goto_frame(7)
    run(ui, "set_end", lambda: ui.page.click("#pickframediv button:has-text('Set End')"), audited=True)
    run(ui, "set_start", lambda: ui.page.click("#pickframediv button:has-text('Set Start')"), audited=True)
    ui.page.click("#pickframediv button:has-text('CLOSE')")
    ui.goto_frame(9)
    a, b = ui.video_to_client(300, 60), ui.video_to_client(360, 110)

    def ctrl(action):
        ui.page.keyboard.down("Control")
        action()
        ui.page.keyboard.up("Control")

    run(ui, "ctrl_drag", lambda: ctrl(lambda: ui.drag(a, b)), audited=True)
    ui.page.wait_for_function("Object.keys(events.getFrame(9)).length === 1")
    assert ui.js("refreshLog.tree()").count("refresh.rebuild(") == 1                           # one rebuild, not the old two
    ui.goto_frame(11)
    run(ui, "ctrl_click_too_small", lambda: ctrl(lambda: ui.page.mouse.click(a["x"], a["y"])), audited=True)
    assert ui.js("Object.keys(events.getFrame(11) || {}).length") == 0
    for name in ("pick_frame_enter", "set_end", "set_start", "ctrl_drag", "ctrl_click_too_small"):
        RESULTS.pop(name)                                                                      # audited only, not pinned in the baseline


def test_l17_span_buttons_leave_no_store_write_unrefreshed(ui, sample_dir):
    """ADR 0009 step 4e, SelectionControl.js: the 'extend annotation' buttons of the Selected tab (modifyCurrentObsSpan) store a span
    and end with one chronogram refresh. The first click also stores the default span; the audit lists no write without a `refresh.*` call."""
    loaded(ui, sample_dir)
    for sel in ("#parameters > .ui-accordion-header", "#features > .ui-accordion-header"):  # "Features" is a subpanel of "Options"
        header = ui.page.locator(sel)
        if header.get_attribute("aria-expanded") != "true":
            header.click()
    ui.page.check("#showSelected")
    ui.click_box("1")
    start = ui.js("flatTracksAll.find(t => t.obs.frame === 0 && String(t.obs.ID) === '1').span")
    run(ui, "span_extend", lambda: ui.page.click("button[onclick=\"modifyCurrentObsSpan('extendright')\"]"), audited=True)
    assert ui.tracks()["0"]["1"]["span"] == {"f1": start["f1"], "f2": start["f2"] + 10}
    assert ui.js("refreshLog.tree()").count("refreshChronogram(") == 1
    RESULTS.pop("span_extend")                                                                 # audited only, not pinned in the baseline


def test_l18_visit_widget_leaves_no_store_write_unrefreshed(ui):
    """ADR 0009 step 4e, VisitControl.js: the Create button of the Visits panel (`newVisit`) and its Set End button (`setSpanFrame`)
    each end with one rebuild; the audit lists no store write without a `refresh.*` call."""
    def event(id, x):
        return {"id": id, "time": 0, "frame": 0, "x": x, "y": 80, "cx": x + 24, "cy": 104, "width": 48, "height": 48,
                "angle": 0, "notes": "", "labels": ""}
    path = ui.write("visit.json", {"info": {"type": "events-multiframe", "source": "browser test"},
                                   "data": {"0": [event("P1", 100), event("F1", 300)]}})
    ui.open()
    ui.load_events(path)
    ui.wait_tracks()
    ui.open_panel("Annotations")
    ui.open_subpanel("Visits")
    ui.click_box("P1")
    ui.page.click("#visitblockdiv .pick-pollinator")
    p = ui.box_center("P1")
    ui.page.mouse.click(p["x"], p["y"])
    ui.page.wait_for_function("document.querySelector('#visitblockdiv #pollinator_id').textContent === 'P1'")
    ui.page.click("#visitblockdiv .pick-flower")
    p = ui.box_center("F1")
    ui.page.mouse.click(p["x"], p["y"])
    ui.page.wait_for_function("document.querySelector('#visitblockdiv #flower_id').textContent === 'F1'")
    run(ui, "visit_new", lambda: ui.page.click("#visitblockdiv .new-visit"), audited=True)
    assert ui.js("!!events.get(0, 'V-P1-F1')")
    assert ui.js("refreshLog.tree()").count("refresh.rebuild(") == 1
    ui.goto_frame(3)
    run(ui, "visit_set_end", lambda: ui.page.click("#visitblockdiv .set-end-frame"), audited=True)
    assert ui.tracks()["0"]["V-P1-F1"]["span"] == {"f1": 0, "f2": 3}
    assert ui.js("refreshLog.tree()").count("refresh.rebuild(") == 1
    for name in ("visit_new", "visit_set_end"):
        RESULTS.pop(name)                                                                      # audited only, not pinned in the baseline


def test_l19_zoom_bulk_deletes_and_parts_toggle_leave_no_store_write_unrefreshed(ui, sample_dir):
    """ADR 0009 step 4e, ZoomView.js: 'Delete wrong-id events' (a loop of `events.delete`) ends with one rebuild, and the 'show parts on
    video' toggle (no store write) rebuilds the overlay only."""
    loaded(ui, sample_dir)
    ui.js("events.forEach((obs, F, id) => events.update(F, id, {labels: 'wrongid'}))")
    run(ui, "bulk_delete_wrongid", lambda: ui.js("zoomOverlay.deleteWrongIdEvents()"), audited=True)
    assert ui.js("refreshLog.tree()").count("refresh.rebuild(") == 1
    assert ui.js("Object.keys(events.toObject()).length") == 0
    loaded(ui, sample_dir)
    run(ui, "show_parts_toggle", lambda: ui.js("zoomOverlay.onToggleButtonShowOnVideo()"), audited=True)
    tree = ui.js("refreshLog.tree()")                                                          # a late event of the reload may come first
    assert tree.count("refresh.overlayRebuild(") == 1 and "refresh.rebuild(" not in tree
    for name in ("bulk_delete_wrongid", "show_parts_toggle"):
        RESULTS.pop(name)                                                                      # audited only, not pinned in the baseline


def test_l20_id_field_and_ctrl_r_leave_no_store_write_unrefreshed(ui, sample_dir):
    """ADR 0009 step 4e, labelBee.js: changing the id in the ID field ends with one rebuild (also when refused, as before); Ctrl+R rebuilds
    the overlay only."""
    loaded(ui, sample_dir)
    ui.open_panel("Annotations")
    ui.open_subpanel("BeeID")
    ui.goto_frame(10)
    ui.click_box("1")
    ui.page.fill("#I", "9")
    run(ui, "id_change", lambda: ui.page.press("#I", "Enter"), audited=True)
    assert ui.js("refreshLog.tree()").count("refresh.rebuild(") == 1
    assert sorted(ui.tracks()["10"]) == ["2", "9"]
    ui.js("document.getElementById('left-side').focus()")                                     # a text field would stop the key event
    run(ui, "ctrl_r", lambda: ui.page.keyboard.press("Control+r"), audited=True)
    tree = ui.js("refreshLog.tree()")
    assert tree.count("refresh.overlayRebuild(") == 1 and "refresh.rebuild(" not in tree
    for name in ("id_change", "ctrl_r"):
        RESULTS.pop(name)                                                                      # audited only, not pinned in the baseline


def test_l21_clean_obsolete_events_leaves_no_store_write_unrefreshed(ui, sample_dir):
    """ADR 0009 step 4e, ChronoControl.js: 'Clean obsolete events' (a loop of `events.delete`) ends with one rebuild."""
    loaded(ui, sample_dir)
    ui.js("events.forEach((obs, F, id) => events.update(F, id, {labels: 'falsealarm'}))")
    run(ui, "clean_obsolete", lambda: ui.js("cleanObsoleteEvents()"), audited=True)
    assert ui.js("refreshLog.tree()").count("refresh.rebuild(") == 1
    assert ui.js("Object.keys(events.toObject()).length") == 0                                 # sample events carry no tag: all deleted
    RESULTS.pop("clean_obsolete")                                                              # audited only, not pinned in the baseline


LOADERS = {   # each used to refresh again after `setTracks` / `setTags` (ADR 0009 Q36). Not covered: the loaders that need a database record
              # (server dialog `loadEvents`, `loadEventsFromServerByID`) or the DB (`loadTracksCSVFromDB`)
    "tracks_csv": "loadTracksCSVFromServer('/data/sample/tracks.csv')",
    "tracks_tagged_csv": "loadTrackTaggedCSVFromServer('/data/sample/tracks_tagged.csv')",
    "tags_csv": "loadTagsCSVFromServer('/data/sample/tracks_tagged.csv')",
    "converted_csv": "loadConvertedCSVFromServer('/data/sample_gurabo/sample_gurabo.cfr.mp4.events.csv', events_csv_to_json, 'cxcy', 'events')",
    "events_json_url": "eventsFromServer('/data/sample/events_v2.json')",
}


@pytest.mark.parametrize("name", list(LOADERS))
def test_l22_loaders_refresh_once(ui, name):
    """ADR 0009 step 5 (Q36): every loader refreshes once (`setTracks` or `setTags` does it), not a second time on its own."""
    ui.open()
    ui.settle()
    ui.js("refreshLog.clear()")
    ui.js(LOADERS[name])
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    ui.settle(1000)
    tree = ui.js("refreshLog.tree()")
    assert tree.count("refreshChronogram(") == 1 and tree.count("VideoControl.onFrameChanged(") == 1, tree


def test_l23_selection_model_follows_fabric(ui, sample_dir):
    """ADR 0009 section 0b (step 6b): `selection` and fabric's active object say the same after a click, a frame change, a select by
    id with no box of it on the frame and a deselect; the id is kept from frame to frame, forgotten by a deselect."""
    loaded(ui, sample_dir)

    def same():
        ui.settle(300)
        assert ui.js(AGREE) == ui.js("selection.getKey()")

    same()
    ui.click_box("1")
    same()
    assert ui.js("selection.getKey()") == {"frame": ui.frame(), "id": "1"} and ui.js("selection.getId()") == "1"
    ui.goto_frame(10)
    same()
    assert ui.js("selection.getId()") == "1"                        # the id follows the frame
    ui.js("selection.select(getCurrentFrame(), 'no-such-id'); refresh.selection()")
    same()
    assert ui.js("selection.getKey()") is None and ui.js("selection.getId()") == "no-such-id"
    ui.js("selection.select(getCurrentFrame(), '1'); refresh.selection()")
    same()
    ui.js("deselectBee()")
    same()
    assert ui.js("selection.getId()") is None                       # explicit deselect forgets the id


def test_l24_overlay_update_redraws_over_a_clean_frame(ui, sample_dir):
    """An overlay update (a label, a drag, the track window, a pan or a zoom) plots the tracks on `overlay.ctx` over a freshly drawn video
    frame: the pixels after N updates are those after one, and the control (plot without the frame redraw) shows that the test sees a pile-up.
    Pan, wheel zoom and the track window are updates: no `hardRefresh`."""
    loaded(ui, sample_dir)
    ui.goto_frame(10)
    ui.settle(500)
    pixels = "(() => { const c = overlay.canvas; const d = overlay.ctx.getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; })()"
    ui.js("showObsTracks = true; overlay.trackWindow.backward = 20; overlay.trackWindow.forward = 20; overlay.hardRefresh()")
    one = ui.js(pixels)
    ui.js("overlay.refreshOverlay(); overlay.refreshOverlay(); overlay.refreshOverlay()")
    assert ui.js(pixels) == one                                     # the update erases the previous plot
    ui.js("overlay.refreshOverlay(true); overlay.refreshOverlay(true); overlay.refreshOverlay(true)")
    assert ui.js(pixels) != one                                     # control: without the frame redraw the plots pile up
    ui.js("overlay.hardRefresh()")

    ui.js("refreshLog.clear()")
    ui.js("overlay.canvasTransformPan(5, 5)")
    ui.js("onTrackWindowChanged()")
    ui.js("overlay.canvasTransformScale(1.1, [100, 100])")
    ui.settle(300)
    assert ui.js("refreshInstrumented.missing") == []
    calls = ui.js("refreshLog.tree()")
    assert "hardRefresh" not in calls and "videoControl.refresh" not in calls, calls
