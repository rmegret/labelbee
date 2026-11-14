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
