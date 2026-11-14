"""Readers of the stored events that no other test reaches (slice 4 step 4c of refactor/design/0007-slice-events-api.md): a read
that moves from the `Tracks` global to `events` is checked by the page working, so each moved loop needs a test that runs it."""


def test_g1_update_statistics_counts_the_observations(ui, sample_dir):
    """`updateAnnotationStatistics` (SelectionControl.js) iterates over every observation: "Update Statistics" button."""
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.open_panel("Annotations")
    label = ui.js("document.querySelector(\"input[value='Update Statistics']\").closest('.subpanel.collapsible').querySelector(':scope > label').textContent.trim()")
    ui.open_subpanel(label)
    ui.page.click("input[value='Update Statistics']")
    text = ui.page.inner_text("#annotation-statistics")
    n = ui.n_observations()
    ids = sorted({o["ID"] for f in ui.tracks().values() for o in f.values()})
    frames = sorted({o["frame"] for f in ui.tracks().values() for o in f.values()})
    assert f"num_events={n}" in text
    assert f"unique_ids={len(ids)}" in text
    assert f"unique_frames={len(frames)}" in text
    assert "ids=" + ",".join(ids) in text


def test_g2_delete_fa_tags_edits_the_tags_structure(ui):
    """`deleteFalsealarmTags` (ZoomView.js) edits the Tags structure of the store directly (the tags are not in `events`; they go
    when the tags are merged into the events, DEC-006): the "Delete FA Tags..." button of Labeling > Clean up features."""
    def tag(i):
        return {"id": i, "frame": 0, "c": [150, 100], "hamming": 0, "goodness": 45.5, "dm": 60, "p": [[142, 92], [158, 92], [158, 108], [142, 108]]}
    ui.open()
    ui.load_tags(ui.write("fa_tags.json", {"info": {"type": "tags-multiframe"}, "data": {
        "0": {"tags": [tag("falsealarm"), tag("5")]}, "4": {"tags": [tag("falsealarm")]}}}))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length === 2")
    ui.open_panel("Labeling")
    ui.open_subpanel("Clean up features")
    ui.page.click("input[value^='Delete FA Tags']")
    tags = ui.tags()
    assert list(tags) == ["0"]                                           # frame 4 held only a falsealarm: removed
    # the helper filters Object.keys of the array: the surviving tags come back as an object keyed by their old index
    assert {k: str(t["id"]) for k, t in tags["0"]["tags"].items()} == {"1": "5"}
