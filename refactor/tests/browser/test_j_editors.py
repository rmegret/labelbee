"""Step 0 of slice 5 (refactor/design/0008-field-ownership.md): the edit paths of the editor, pinned as they are today, before the
working copy goes. Each test drives the real page (clicks, drags, typing) and reads the stored events back; every one runs under the strict
dirty-write detector. A few assertions pin behavior that ADR 0008 changes on purpose (marked KNOWN: they are flipped, with the diff shown,
by the step that changes them), the others must stay true through the whole slice.

Coverage: creation (shift-click far from anything, shift-click near an observation of a neighboring frame, ctrl-drag), label text, notes,
the wrong-id edits, move, resize, rotate, the dot mode (`showRect` off), and the parts of the zoom view."""
import pytest

APPROX = pytest.approx


def frame_obs(ui, frame):
    return ui.tracks().get(str(frame), {})


def acts(ui, obs):
    """The four flags [fanning, pollen, entering, leaving]: derived from the labels, not stored (ADR 0008 step 4)."""
    assert "bool_acts" not in obs
    return ui.page.evaluate("(o) => Labels.bool_acts(o)", obs)


def shift_click_at(ui, vx, vy):
    p = ui.video_to_client(vx, vy)
    ui.settle()
    ui.page.keyboard.down("Shift")
    ui.page.mouse.click(p["x"], p["y"])
    ui.page.keyboard.up("Shift")


# ---- creation
def test_j1_shift_click_far_from_anything_creates_a_default_box_with_a_free_id(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.goto_frame(3)                                                    # no observation at frame 3
    shift_click_at(ui, 400, 220)
    ui.page.wait_for_function("Object.keys(events.getFrame(3)).length === 1")
    (new_id, obs), = frame_obs(ui, 3).items()
    assert str(obs["ID"]) == new_id == "0"                              # the first free integer (its type is a number here, a string elsewhere)
    assert (obs["width"], obs["height"]) == (100, 100)                  # the default size
    assert (obs["cx"], obs["cy"]) == (APPROX(400, abs=1.5), APPROX(220, abs=1.5))   # centered on the click
    assert (obs["x"], obs["y"]) == (APPROX(obs["cx"] - 50, abs=0.01), APPROX(obs["cy"] - 50, abs=0.01))
    assert obs["angle"] == 0 and obs["labels"] == "" and obs["notes"] == ""
    assert acts(ui, obs) == [False, False, False, False]
    assert obs["frame"] == 3
    assert str(ui.selected_id()) == "0"                                 # the new observation is the selected one


def test_j2_shift_click_near_an_observation_of_a_neighboring_frame_predicts_its_id_and_size(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.goto_frame(12)                                                   # id 2 'fanning' at frames 10 and 15, around (324, 174)
    shift_click_at(ui, 330, 180)
    ui.page.wait_for_function("Object.keys(events.getFrame(12)).length === 1")
    (new_id, obs), = frame_obs(ui, 12).items()
    assert new_id == "2"                                                # the id of the nearby observation
    assert (obs["width"], obs["height"]) == (48, 48)                    # its size ...
    assert (obs["cx"], obs["cy"]) == (APPROX(330, abs=1.5), APPROX(180, abs=1.5))   # ... centered on the click, not at its position
    # ADR 0008 R6: creation copies the whole `labels` of the source (the flags were lost at the first save until step 4)
    assert obs["labels"] == "fanning"
    assert acts(ui, obs) == [True, False, False, False]
    assert obs["notes"] == ""                                           # notes, span, fix, newid, visit, parts, tag are not copied (the source has notes "fans")
    assert all(k not in obs for k in ("span", "fix", "newid", "visit", "parts", "tag"))


def test_j3_ctrl_drag_creates_the_box_that_was_dragged(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.goto_frame(7)
    a, b = ui.video_to_client(300, 60), ui.video_to_client(360, 110)
    ui.settle()
    ui.page.keyboard.down("Control")
    ui.drag(a, b)
    ui.page.keyboard.up("Control")
    ui.page.wait_for_function("Object.keys(events.getFrame(7)).length === 1")
    (new_id, obs), = frame_obs(ui, 7).items()
    assert new_id == "0"
    assert (obs["x"], obs["y"]) == (APPROX(300, abs=2), APPROX(60, abs=2))
    assert (obs["width"], obs["height"]) == (APPROX(60, abs=2), APPROX(50, abs=2))
    assert obs["labels"] == "" and acts(ui, obs) == [False, False, False, False]


def test_j4_a_ctrl_drag_that_is_too_small_creates_nothing(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.goto_frame(7)
    a = ui.video_to_client(300, 60)
    ui.settle()
    ui.page.keyboard.down("Control")
    ui.page.mouse.click(a["x"], a["y"])                                 # no drag: not validated
    ui.page.keyboard.up("Control")
    ui.page.wait_for_timeout(400)
    assert frame_obs(ui, 7) == {}


# ---- labels, notes, wrong id
def open_editor_panels(ui):
    ui.open_panel("Annotations")
    ui.open_subpanel("Labels")
    ui.open_subpanel("BeeID")


def test_j5_label_text_is_normalized_and_the_flags_follow(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    open_editor_panels(ui)
    ui.click_box("1")
    ui.page.fill("#labels", "Pollen, f")
    ui.page.press("#labels", "Enter")
    obs = ui.tracks()["0"]["1"]
    assert obs["labels"] == "pollen,fanning"                            # lower case, aliases (`f` is fanning), comma separated
    assert acts(ui, obs) == [True, True, False, False]                  # fanning, pollen, entering, leaving
    ui.page.fill("#labels", "")
    ui.page.press("#labels", "Enter")
    obs = ui.tracks()["0"]["1"]
    assert obs["labels"] == "" and acts(ui, obs) == [False, False, False, False]


def test_j5b_a_label_button_writes_the_labels_only(ui, sample_dir):
    """ADR 0008 step 5: the label editor stores `labels` alone; notes typed but not validated used to ride along."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    open_editor_panels(ui)
    before = ui.tracks()["0"]["1"]
    ui.click_box("1")
    ui.page.fill("#notes", "typed, not validated")                      # no Enter, no change event
    ui.page.click("button.labeltoggle[thelabel=pollen]:visible")
    after = ui.tracks()["0"]["1"]
    assert "pollen" in after["labels"].split(",")
    assert {k: v for k, v in after.items() if k != "labels"} == {k: v for k, v in before.items() if k != "labels"}


def test_j6_notes_are_stored_and_the_rest_is_untouched(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    open_editor_panels(ui)
    before = ui.tracks()["0"]["1"]
    ui.click_box("1")
    ui.page.fill("#notes", "seen by the browser test")
    ui.page.press("#notes", "Enter")
    after = ui.tracks()["0"]["1"]
    assert after["notes"] == "seen by the browser test"
    assert {k: v for k, v in after.items() if k != "notes"} == {k: v for k, v in before.items() if k != "notes"}


def test_j7_the_wrong_id_edits(ui, sample_dir):
    """Three writers of `newid`/`fix` today (ADR 0008 step 5 makes them one): the label toggle creates `fix`, the newid box sets both."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    open_editor_panels(ui)
    ui.click_box("1")
    ui.page.click("button.labeltoggle[thelabel=wrongid]:visible")
    obs = ui.tracks()["0"]["1"]
    assert "wrongid" in obs["labels"].split(",")
    assert obs["fix"] == {}                                             # created empty by the toggle
    assert "newid" not in obs
    ui.page.fill("#newid", "9")
    ui.page.press("#newid", "Enter")
    obs = ui.tracks()["0"]["1"]
    assert obs["newid"] == "9" and obs["fix"] == {"newid": "9"}
    assert "wrongid" in obs["labels"].split(",")


def test_j7b_the_tag_rotation_and_the_alternate_tag_click(ui, sample_dir):
    """The two other writers of `newid`/`fix`, now one module (`WrongId`): only labels, newid and fix change."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    open_editor_panels(ui)
    before = ui.tracks()["0"]["1"]
    ui.click_box("1")
    ui.js("zoomOverlay.rotateTag(90)")
    after = ui.tracks()["0"]["1"]
    assert after["fix"] == {"tagangle": 90} and "newid" not in after and "wrongid" in after["labels"].split(",")
    ui.js("zoomOverlay.rotateTag(90)")
    assert ui.tracks()["0"]["1"]["fix"] == {"tagangle": 180}
    ui.js("zoomOverlay.rotateTag(90)")
    assert ui.tracks()["0"]["1"]["fix"] == {"tagangle": -90}              # kept in (-180, 180]
    ui.js("zoomOverlay.onClickAlternateTag('7')")
    obs = ui.tracks()["0"]["1"]
    assert obs["newid"] == "7" and obs["fix"] == {"newid": "7", "tagangle": -90}
    ui.js("zoomOverlay.onClickAlternateTag('1')")                           # the id of the observation itself: cancels
    obs = ui.tracks()["0"]["1"]
    assert "newid" not in obs and obs["fix"] == {} and "wrongid" not in obs["labels"].split(",")
    assert obs["span"] == {"f1": 0, "f2": 0}                               # `spreadTagFix` -> `getCoveredTags` gives the observation a span, as before
    own = ("newid", "fix", "labels", "span")
    assert {k: v for k, v in obs.items() if k not in own} == {k: v for k, v in before.items() if k not in own}


def test_j7c_rotating_the_tag_after_the_toggle_starts_from_a_zero_angle(ui, sample_dir):
    """DEBT-740: the toggle makes a `fix` without `tagangle`; the rotation used to store NaN (null in JSON)."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    open_editor_panels(ui)
    ui.click_box("1")
    ui.page.click("button.labeltoggle[thelabel=wrongid]:visible")
    ui.js("zoomOverlay.rotateTag(90)")
    assert ui.tracks()["0"]["1"]["fix"] == {"tagangle": 90}


# ---- geometry gestures: fabric rectangle -> the stored geometry
def select_at(ui, frame, obs_id):
    ui.goto_frame(frame)
    ui.settle()
    ui.click_box(obs_id)
    return ui.tracks()[str(frame)][obs_id]


def test_j8_move_changes_the_center_and_nothing_else(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = select_at(ui, 5, "1")
    c = ui.box_center("1")
    ui.drag(c, {"x": c["x"] + 30, "y": c["y"] + 15})
    after = ui.tracks()["5"]["1"]
    k = ui.video_scale()
    assert after["cx"] == APPROX(before["cx"] + 30 * k, abs=1.5) and after["cy"] == APPROX(before["cy"] + 15 * k, abs=1.5)
    assert after["x"] == APPROX(after["cx"] - after["width"] / 2, abs=0.01)
    assert (after["width"], after["height"], after["angle"]) == (before["width"], before["height"], before["angle"])
    assert after["labels"] == before["labels"] and after["notes"] == before["notes"]


def test_j8b_the_store_is_written_on_release_not_during_the_drag(ui, sample_dir):
    """ADR 0008 P3: fabric moves the rectangle, the store gets the geometry when the gesture ends."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = select_at(ui, 5, "1")
    c = ui.box_center("1")
    ui.page.mouse.move(c["x"], c["y"])
    ui.page.mouse.down()
    ui.page.mouse.move(c["x"] + 30, c["y"] + 15, steps=6)
    assert ui.tracks()["5"]["1"]["cx"] == before["cx"]                  # mid-drag: the store has not moved
    ui.page.mouse.up()
    assert ui.tracks()["5"]["1"]["cx"] != before["cx"]                  # released: it has


def test_j8c_the_form_shows_the_geometry_of_the_selected_box(ui, sample_dir):
    """`updateForm` reads the fabric rectangle, whose left/top are its center (originX/Y = center): X, Y, Width, Height,
    Center X, Center Y show the stored box."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    obs = select_at(ui, 5, "1")
    shown = {k: ui.js(f"$('#{k}').text()") for k in ("X", "Y", "W", "H", "CX", "CY")}
    for key, label, value in (("X", "X: ", obs["x"]), ("Y", "Y: ", obs["y"]), ("W", "Width: ", obs["width"]),
                              ("H", "Height: ", obs["height"]), ("CX", "Center X: ", obs["x"] + obs["width"] / 2),
                              ("CY", "Center Y: ", obs["y"] + obs["height"] / 2)):
        assert shown[key].startswith(label)
        assert float(shown[key][len(label):]) == APPROX(value, abs=1.0), (key, shown[key], value)


def test_j9_resize_with_a_corner_changes_the_size_and_the_opposite_corner_stays(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = select_at(ui, 5, "1")
    assert ui.js("overlay.opts.resizeAroundCenter") is False
    br = ui.control("1", "br")
    ui.drag(br, {"x": br["x"] + 20, "y": br["y"] + 12})
    after = ui.tracks()["5"]["1"]
    k = ui.video_scale()
    # the resize starts a pixel or two off the exact corner: a few video units of tolerance
    assert after["width"] == APPROX(before["width"] + 20 * k, abs=3) and after["height"] == APPROX(before["height"] + 12 * k, abs=3)
    assert (after["x"], after["y"]) == (APPROX(before["x"], abs=1.0), APPROX(before["y"], abs=1.0))      # the top-left corner stays (fabric rounds a little)
    assert after["cx"] == APPROX(after["x"] + after["width"] / 2, abs=0.01)                               # so the center moved
    assert after["angle"] == 0


def test_j10_rotate_with_the_handle_changes_the_angle_around_the_center(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = select_at(ui, 5, "1")
    handle, c = ui.control("1", "mtr"), ui.box_center("1")
    ui.drag(handle, {"x": c["x"] + 80, "y": c["y"]})                    # from above the box to its right: a quarter turn
    after = ui.tracks()["5"]["1"]
    assert after["angle"] == APPROX(90, abs=3)
    assert (after["cx"], after["cy"]) == (APPROX(before["cx"], abs=1.0), APPROX(before["cy"], abs=1.0))    # the center does not move
    assert (after["width"], after["height"]) == (before["width"], before["height"])


def test_j10b_reset_angle_writes_the_angle_alone(ui, sample_dir):
    """ADR 0008 R3: the button stores `{angle: 0}` with `events.update`, nothing else changes."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    select_at(ui, 5, "1")
    handle, c = ui.control("1", "mtr"), ui.box_center("1")
    ui.drag(handle, {"x": c["x"] + 80, "y": c["y"]})
    rotated = ui.tracks()["5"]["1"]
    assert rotated["angle"] != 0
    ui.js("overlay.onClickResetAngle()")
    after = ui.tracks()["5"]["1"]
    assert after["angle"] == 0
    assert {k: v for k, v in after.items() if k != "angle"} == {k: v for k, v in rotated.items() if k != "angle"}


def test_j11_dot_mode_moves_the_center_and_keeps_the_size_and_the_angle(ui, sample_dir):
    """`showRect` off draws a dot instead of the box: a drag moves the center only (`updateRectObsGeometry`)."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    before = select_at(ui, 5, "1")
    ui.open_panel("Options")
    ui.open_subpanel("Annotation overlay")
    ui.page.locator(".overlayOpts-showRect:visible").first.click()
    assert ui.js("overlay.opts.showRect") is False
    c = ui.box_center("1")
    ui.drag(c, {"x": c["x"] - 25, "y": c["y"] - 10})
    after = ui.tracks()["5"]["1"]
    k = ui.video_scale()
    assert after["cx"] == APPROX(before["cx"] - 25 * k, abs=1.5) and after["cy"] == APPROX(before["cy"] - 10 * k, abs=1.5)
    assert (after["width"], after["height"], after["angle"]) == (before["width"], before["height"], before["angle"])


# ---- parts (zoom view)
def test_j12_dragging_a_part_in_the_zoom_view_updates_the_parts_of_the_observation(ui):
    """`ZoomOverlay.syncToTracks` rebuilds `obs.parts` from the zoom canvas at every change; the rest of the observation is untouched."""
    ui.open()
    ui.open_subpanel("Server storage")
    ui.prompt_answers.append("/data/sample/tracks.csv")
    ui.page.click("a[onclick*='clickLoadTracksCSVFromServer']")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    ui.open_panel("Annotations")
    before = ui.tracks()["0"]["1"]
    ui.settle()
    ui.js("selection.select(getCurrentFrame(), '1'); selectBeeByID('1')")                                          # the two boxes of this file overlap: select through the page
    ui.open_panel("Zoom")
    ui.open_subpanel("Parts labeling")
    ui.page.locator("#zoom").scroll_into_view_if_needed()                # the zoom canvas is partly below the viewport
    pos = ui.js("""() => { const o = zoomOverlay.canvas1.getObjects()[0]; o.setCoords(); const r = zoomOverlay.canvas1.upperCanvasEl.getBoundingClientRect();
        return {x: r.x + o.left + 3, y: r.y + o.top + 3}; }""")          # the marker is a 6 px box: its center
    assert ui.js("selection.getKey()") == {"frame": 0, "id": "1"}            # ADR 0008 R4: the target of the editors
    ui.drag(pos, {"x": pos["x"] + 20, "y": pos["y"] + 12})
    after = ui.tracks()["0"]["1"]
    assert [p["label"] for p in after["parts"]] == ["head", "neck", "thorax", "tail"]
    assert after["parts"][0]["posFrame"] != before["parts"][0]["posFrame"]              # the dragged part moved
    assert after["parts"][1:] == before["parts"][1:]                                      # the others did not
    assert {k: v for k, v in after.items() if k != "parts"} == {k: v for k, v in before.items() if k != "parts"}
