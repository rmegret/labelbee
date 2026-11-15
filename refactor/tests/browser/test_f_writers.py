"""Step 0 of slice 4 (refactor/design/0007-slice-events-api.md): exercise the writers of the stored events that the
other tests never reach, so the dirty-write detector (--dirty-writes, dirty_writes.js) sees every one:

    span      modifyCurrentObsSpan (SelectionControl.js), the pick-frame buttons (OverlayControl.js hardRefresh),
              getCoveredTags (ZoomView.js, reached through bakeAllTagFixes)
    delete    deleteFalsealarmEvents, deleteWrongIdEvents (ZoomView.js): they prune the emptied frame
    delete    cleanObsoleteEvents (ChronoControl.js): it leaves the emptied frame as {}

The assertions describe today's behavior; the model is read through the store, as the other tests do.
Since step 3b every delete prunes the emptied frame (`events.delete`); before, `deleteEvent` and `cleanObsoleteEvents`
left `{}` (`test_f6` and `test_f8` show the change)."""


def event(frame, id, labels="", x=60, **extra):
    return {"id": str(id), "time": frame, "frame": frame, "x": x, "y": 80, "cx": x + 24, "cy": 104, "width": 48, "height": 48,
            "angle": 0, "notes": "", "labels": labels, **extra}


def write_events(ui, name, observations):
    data = {}
    for e in observations:
        data.setdefault(str(e["frame"]), []).append(e)
    return ui.write(name, {"info": {"type": "events-multiframe", "source": "browser test"}, "data": data})


def load(ui, path):
    ui.open()
    ui.load_events(path)
    ui.wait_tracks()


def show_tabs(ui, *checkboxes):
    """The "Selected" and "Pick-Frame Mode" blocks are hidden until "Features > Show menu tabs" ticks them."""
    # not ui.open_panel("Features"): its text match finds "Clean up features" first
    header = ui.page.locator("#features > .ui-accordion-header")
    if header.get_attribute("aria-expanded") != "true":
        header.click()
    for c in checkboxes:
        ui.page.check(c)


def frames_of(ui):
    return {f: sorted(obs) for f, obs in ui.tracks().items()}


# ---- span: modifyCurrentObsSpan, the buttons "extend annotation left / right" of the Selected tab
def test_f1_extend_the_span_of_the_selected_observation(ui, sample_dir):
    load(ui, sample_dir / "events_v2.json")
    show_tabs(ui, "#showSelected")
    ui.click_box("1")
    start = ui.js("flatTracksAll.find(t => t.obs.frame === 0 && String(t.obs.ID) === '1').span")
    assert "span" not in ui.tracks()["0"]["1"]                       # nothing stored until the first edit
    ui.page.click("button[onclick=\"modifyCurrentObsSpan('extendright')\"]")
    assert ui.tracks()["0"]["1"]["span"] == {"f1": start["f1"], "f2": start["f2"] + 10}
    ui.page.click("button[onclick=\"modifyCurrentObsSpan('extendleft')\"]")     # clamped at frame 0
    assert ui.tracks()["0"]["1"]["span"] == {"f1": 0, "f2": start["f2"] + 10}
    ui.page.click("button[onclick=\"modifyCurrentObsSpan('restrictright')\"]")
    assert ui.tracks()["0"]["1"]["span"]["f2"] == start["f2"]


# ---- span: the pick-frame mode, "Set Start" / "Set End" (OverlayControl.js hardRefresh)
def test_f2_pick_frame_sets_the_span_start_and_end(ui, sample_dir):
    load(ui, sample_dir / "events_v2.json")
    show_tabs(ui, "#showSelected", "#showPickFrame")
    ui.click_box("1")
    ui.page.click("button[onclick=\"modifyCurrentObsSpan('setspan')\"]")
    ui.page.wait_for_selector("#pickframediv button:has-text('Set End')")
    assert ui.js("overlay.interaction.mode") == "pick-frame"
    ui.goto_frame(7)
    ui.page.click("#pickframediv button:has-text('Set End')")
    assert ui.tracks()["0"]["1"]["span"]["f2"] == 7
    ui.goto_frame(3)
    ui.page.click("#pickframediv button:has-text('Set Start')")
    assert ui.tracks()["0"]["1"]["span"] == {"f1": 3, "f2": 7}
    ui.page.click("#pickframediv button:has-text('CLOSE')")
    assert ui.js("overlay.interaction.mode") == "main"


# ---- span: getCoveredTags, reached through "Apply All Tag Fixes..." (bakeAllTagFixes -> bakeTagFix)
def test_f3_apply_all_tag_fixes_stores_a_span_and_a_fix(ui):
    """Id 3 is on the chronogram: its span is copied from the chronogram interval (ZoomView.js:1846). Id 7 is excluded from
    the chronogram (Filter tab, ExcludeID): no interval, so the span falls back to the observation's own frame (:1851)."""
    path = write_events(ui, "fa.json", [event(0, 1), event(0, 3, "falsealarm"), event(5, 3, "falsealarm"), event(10, 7, "falsealarm")])
    load(ui, path)
    assert all("span" not in o and "fix" not in o for f in ui.tracks().values() for o in f.values())
    show_tabs(ui, "#showFilter")
    ui.page.fill("#excludeID", "7")
    ui.page.press("#excludeID", "Tab")                                 # fires the change event
    ui.page.click("#excludeIDButton")
    assert ui.js("flag_excludeID") is True
    ui.open_panel("Zoom")
    ui.open_subpanel("Alternate Tags")
    ui.page.click("input[value^='Apply All Tag Fixes']")
    tracks = ui.tracks()
    for f, i in (("0", "3"), ("5", "3"), ("10", "7")):                # bakeTagFix gives a falsealarm a fix, getCoveredTags a span
        assert tracks[f][i]["fix"] == {"newid": "falsealarm"}
        assert set(tracks[f][i]["span"]) == {"f1", "f2"}
    assert tracks["10"]["7"]["span"] == {"f1": 10, "f2": 10}
    assert "fix" not in tracks["0"]["1"]                              # a normal observation has no fix, so no span either
    assert "span" not in tracks["0"]["1"]


# ---- tag fix on a tag object shared with obs.tag: a tags file whose tag matches an observation shares the tag object between the Tags
# structure and the observation (augmentTrackWithTag); bakeTagFix then writes `fix` and `id` on that shared object, an indirect
# mutation of the stored events (found by the detector's tracking of shared references).
def test_f12_apply_tag_fixes_writes_on_the_tag_shared_with_the_observation(ui):
    path = write_events(ui, "fa_tag.json", [event(0, 1, "falsealarm"), event(0, 2)])
    load(ui, path)
    tag = {"id": 1, "dm": 60, "c": [84, 104], "hamming": 0, "goodness": 45.5, "p": [[70, 90], [98, 90], [98, 118], [70, 118]]}
    ui.load_tags(ui.write("t.json", {"0": {"tags": [tag]}}))
    ui.page.wait_for_function("!!(events.get(0, 1) || {}).tag")
    ui.open_panel("Zoom")
    ui.open_subpanel("Alternate Tags")
    ui.page.click("input[value^='Apply All Tag Fixes']")
    stored = ui.tracks()["0"]["1"]["tag"]                               # the tag as the observation holds it
    assert stored["id"] == "falsealarm"                                # bakeTagFix changed the shared tag object
    assert stored["fix"]["newid"] == "falsealarm"
    assert ui.tags()["0"]["tags"][0]["id"] == "falsealarm"             # ... which is the same object as in the Tags structure
    ui.page.click("input[value^='Undo All Tag Fixes']")                # undoTagFix writes on the same shared object
    assert str(ui.tracks()["0"]["1"]["tag"]["id"]) == "1"
    assert str(ui.tags()["0"]["tags"][0]["id"]) == "1"


# ---- delete: "Delete FA Events..." and "Delete WId Events..." (ZoomView.js): they prune the emptied frame
def test_f4_delete_falsealarm_events_prunes_the_emptied_frame(ui):
    path = write_events(ui, "fa.json", [event(0, 1), event(0, 3, "falsealarm"), event(5, 3, "falsealarm"), event(10, 4, "wrongid")])
    load(ui, path)
    ui.open_panel("Labeling")
    ui.open_subpanel("Clean up features")
    ui.page.click("input[value^='Delete FA Events']")
    assert frames_of(ui) == {"0": ["1"], "10": ["4"]}                  # frame 5 is gone, not left as {}


def test_f5_delete_wrong_id_events_prunes_the_emptied_frame(ui):
    path = write_events(ui, "wid.json", [event(0, 1), event(0, 4, "wrongid"), event(5, 4, "wrongid"), event(10, 3, "falsealarm")])
    load(ui, path)
    ui.open_panel("Labeling")
    ui.open_subpanel("Clean up features")
    ui.page.click("input[value^='Delete WId Events']")
    assert frames_of(ui) == {"0": ["1"], "10": ["3"]}


# ---- delete: cleanObsoleteEvents ("Clean obsolete Events", confirmed): it prunes the emptied frame since step 3b (it left {})
def test_f6_clean_obsolete_events_leaves_the_emptied_frame(ui):
    def tag(dm, cx=84):
        return {"id": 9, "dm": dm, "c": [cx, 104], "hamming": 0, "goodness": 45.5, "p": [[60, 80], [108, 80], [108, 128], [60, 128]]}
    path = write_events(ui, "obsolete.json", [
        event(0, 1),                                                    # normal: kept
        event(5, 3, "falsealarm"),                                      # no tag: deleted, frame 5 stays as {}
        event(10, 4, "falsealarm", tag=tag(10, 300)),                   # low DM: deleted
        event(10, 5, "wrongid", x=200, tag=tag(50, 300)),               # DM high enough, outside the exclude rect: kept
        event(15, 6, "wrongid"),                                        # no tag: deleted, frame 15 stays as {}
        event(20, 8, "wrongid", tag=tag(50, 84)),                       # DM high enough but inside the exclude rect: deleted
    ])
    # finding F7 (browser README): an observation with an embedded tag that is not in the Tags structure makes the
    # tag-track overlay throw at every redraw (OverlayControl.js:2972 plotTagsTracks). Declared, not fixed here.
    ui.allow(r"Cannot read properties of undefined \(reading 'c'\)")
    load(ui, path)
    ui.open_panel("Options")
    ui.open_subpanel("Tag filtering")
    ui.js("excludeRects.push({cx: 84, cy: 104, w: 100, h: 100})")
    ui.page.click("#useExcludeRects")                                  # switches tagsSampleFilterExcludeRects to the rect test
    assert ui.js("flag_useExcludeRects") is True
    ui.page.click("#cleanObsoleteEventsButton")
    assert ui.dialogs[-1][0] == "confirm"                              # the confirmation was asked (and accepted)
    assert frames_of(ui) == {"0": ["1"], "10": ["5"]}                  # emptied frames are pruned (step 3b; they stayed as {} before)


# ---- rename: the ID field (labelBee.js onKeyDown_IDEdit -> changeObservationID -> events.rename); not a writer the detector
# missed (it showed through swapID), but an operation of Events that no other test called from the page (step 2 of the ADR)
def test_f7_change_the_id_in_the_id_field(ui, sample_dir):
    load(ui, sample_dir / "events_v2.json")
    ui.open_panel("Annotations")
    ui.open_subpanel("BeeID")
    ui.goto_frame(10)                                                  # ids 1 and 2
    ui.click_box("1")
    ui.page.fill("#I", "2")                                            # taken: refused, nothing changes
    ui.page.press("#I", "Enter")
    assert sorted(ui.tracks()["10"]) == ["1", "2"]
    ui.click_box("1")
    ui.page.fill("#I", "9")
    ui.page.press("#I", "Enter")
    ui.page.wait_for_function("!!events.toObject()[10][9]")
    assert sorted(ui.tracks()["10"]) == ["2", "9"]
    assert str(ui.tracks()["10"]["9"]["ID"]) == "9"
    assert sorted(ui.tracks()["5"]) == ["1"]                           # only the current frame is renamed


# ---- delete: deleteEvent (the Delete button) prunes the emptied frame, and the saved file no longer carries [] for it
def test_f8_delete_prunes_the_emptied_frame_and_the_saved_file_has_no_empty_frame(ui):
    path = write_events(ui, "two.json", [event(0, 1), event(5, 1), event(5, 2, x=250)])
    load(ui, path)
    ui.open_panel("Annotations")
    ui.click_box("1")
    ui.page.click("#deleteButton")                                      # frame 0 holds only id 1
    ui.page.wait_for_function("!(events.toObject()[0] || {})[1]")
    assert frames_of(ui) == {"5": ["1", "2"]}                          # before step 3b: {"0": [], "5": [...]}
    saved = ui.save_events_v2()
    assert sorted(saved["data"]) == ["5"]                              # before step 3b the file carried "0": []
    ui.goto_frame(5)
    ui.click_box("1")
    ui.page.click("#deleteButton")
    ui.page.wait_for_function("!(events.toObject()[5] || {})[1]")
    assert frames_of(ui) == {"5": ["2"]}                               # a frame that still holds an observation stays


# ---- visit: the Pick Flower tool of the pick-frame mode (OverlayControl.js drawImagePickFlowerMode) writes `visit` and
# `visit.flowerid` on the stored observation, and reads the flowers (observations whose id starts with "F") of frame 0.
# Not in the first inventory of the ADR: found by step 4b.
def test_f9_pick_flower_sets_the_visit_of_the_observation(ui):
    path = write_events(ui, "flowers.json", [event(0, 1, x=100), event(0, "F1", x=150), event(0, "F2", x=300)])
    # finding F9 (browser README): every click throws after writing the visit (identifyBeeRect gets a rect without `obs`). Declared, not fixed here.
    ui.allow(r"Cannot read properties of undefined \(reading 'labels'\)")
    load(ui, path)
    show_tabs(ui, "#showSelected", "#showPickFrame", "#showPickFlower")
    # finding F8 (browser README): the page's VideoCache never answers here, so the frame crop is stubbed with a 1x1 image
    ui.js("videoCache.getFrameCropDataURL = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='")
    ui.click_box("1")
    ui.page.click("button[onclick=\"modifyCurrentObsSpan('setspan')\"]")
    ui.page.wait_for_selector("#pickframediv button:has-text('Pick Flower')")
    ui.page.click("#pickframediv button:has-text('Pick Flower')")
    ui.page.wait_for_selector("#pickflowerdiv canvas")
    box = ui.page.locator("#pickflowerdiv canvas").bounding_box()
    ui.page.mouse.click(box["x"] + box["width"] * 0.6, box["y"] + box["height"] * 0.5)     # the nearest flower is picked
    ui.page.wait_for_function("(events.toObject()[0][1].visit || {}).flowerid !== undefined")
    assert ui.tracks()["0"]["1"]["visit"] == {"flowerid": "F1"}
    ui.page.click("#pickflowerdiv button:has-text('No visit')")                        # removeVisit
    assert "flowerid" not in ui.tracks()["0"]["1"]["visit"]


# ---- visit: the VisitWidget (Annotations > Visits, edit-visit mode). Pollinator ids start with "P", flower ids with "F".
# `setSpanFrame` writes `span`, `span.f1` and `span.f2` on the stored visit observation through the handle the widget keeps
# (OverlayControl.js). `newVisit` goes through storeObs with a `span`: until step 7a the 17-field commit dropped it, so the first
# Set had to create it (`VisitWidget.setSpanFrame` set@2); since 7a the new visit has its span {f1: frame, f2: frame}.
def test_f10_visit_widget_creates_a_visit_and_sets_its_span(ui):
    path = write_events(ui, "visit.json", [event(0, "P1", x=100), event(0, "F1", x=300)])
    load(ui, path)
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
    ui.page.click("#visitblockdiv .new-visit")
    ui.page.wait_for_function("!!(events.toObject()[0] || {})['V-P1-F1']")
    assert ui.tracks()["0"]["V-P1-F1"]["span"] == {"f1": 0, "f2": 0}   # kept by the commit since step 7a (it used to be dropped)
    assert ui.tracks()["0"]["V-P1-F1"]["visit"] == {"pollinator": "P1", "flower": "F1"}
    ui.goto_frame(3)
    ui.page.click("#visitblockdiv .set-end-frame")                    # f2
    assert ui.tracks()["0"]["V-P1-F1"]["span"] == {"f1": 0, "f2": 3}
    ui.goto_frame(0)
    ui.page.click("#visitblockdiv .set-start-frame")
    assert ui.tracks()["0"]["V-P1-F1"]["span"] == {"f1": 0, "f2": 3}
    ui.goto_frame(3)
    ui.page.click("#visitblockdiv .set-start-frame")                  # refused: the current frame is after the visit frame
    assert ui.tracks()["0"]["V-P1-F1"]["span"] == {"f1": 0, "f2": 3}
