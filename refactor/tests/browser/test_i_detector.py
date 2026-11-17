"""The dirty-write detector itself (dirty_writes.js): it is on in every browser test (strict mode, the default), and it sees
mutations of the stored events through every kind of reference, including the indirect ones found by probing: a nested value shared
with the rectangle that holds the stored observation (`rect.obs`), and a tag object shared with the Tags structure. These tests mutate on purpose, so they carry
`dirty_writes_expected` (the strict check of their own teardown is skipped; what they find is still collected)."""
import pytest

NEW_TAG = {"id": 1, "dm": 60, "c": [84, 104], "hamming": 0, "goodness": 45.5, "p": [[70, 90], [98, 90], [98, 118], [70, 118]]}
CLEAR = "for (const k in window.__dirtyWrites) delete window.__dirtyWrites[k]"


def seen(ui):
    """The recorded writes as (operation, depth, field) tuples; clears the record."""
    rows = sorted({(e["op"], e["depth"], e["field"]) for e in ui.js("Object.values(window.__dirtyWrites)")})
    ui.js(CLEAR)
    return rows


def loaded(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    ui.js(CLEAR)


def test_i1_the_detector_is_on_in_a_plain_test(ui):
    ui.open()
    assert ui.js("window.__dirtyWritesInstalled === true")


@pytest.mark.dirty_writes_expected
def test_i2_a_field_of_a_stored_observation_through_any_handle(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.js("events.get(0, 1).x = 5")                                      # a handle from events.get
    assert seen(ui) == [("set", 2, "x")]
    ui.js("flatTracksAll[0].obs.cx = 7")                                 # a handle that the chronogram keeps
    assert seen(ui) == [("set", 2, "cx")]
    ui.js("events.getFrame(0)[1].y = 1")                                 # an observation of a frame copy
    assert seen(ui) == [("set", 2, "y")]
    ui.js("events.forEach((obs) => { obs.width = 3 })")                  # an observation handed to a callback
    assert ("set", 2, "width") in seen(ui)
    ui.js("delete events.toObject()[0][1]")                              # the structure itself
    assert seen(ui) == [("delete", 1, "#")]


@pytest.mark.dirty_writes_expected
def test_i3_a_nested_value_written_through_the_rectangle_that_holds_the_stored_observation(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.js("""(() => { const rect = overlay.canvas1.getObjects().find(o => o.obs && String(o.obs.ID) === '1');
                      rect.obs.parts = [{label: 'head'}]; events.commit(rect.obs); window.__rect = rect })()""")
    ui.js(CLEAR)
    ui.js("window.__rect.obs.parts.push({label: 'tail'})")               # a write through the RECTANGLE (rect.obs is the stored object)
    assert ui.js("events.get(0, 1).parts.length") == 2                   # ... which is a write to the stored observation
    assert seen(ui) == [("set", 3, "#"), ("set", 3, "length")]


@pytest.mark.dirty_writes_expected
def test_i4_a_tag_object_shared_with_the_tags_structure(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.load_tags(ui.write("t.json", {"0": {"tags": [NEW_TAG]}}))
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.js("augmentTrackWithTag()")                                       # the legacy one-shot (no longer part of the refresh, ADR 0009 Q34)
    ui.js(CLEAR)
    ui.js("AnnotationStore.getTags()[0].tags[0].dm = 5")                 # a write through the TAGS structure
    assert ui.js("events.get(0, 1).tag.dm") == 5                         # ... that changed obs.tag
    assert seen(ui) == [("set", 3, "dm")]
    ui.js("AnnotationStore.getTags()[0].tags[0].p[0][0] = 71")           # nested too
    assert seen(ui) == [("set", 3, "#")]


@pytest.mark.dirty_writes_expected
def test_i5_a_write_to_tags_that_are_not_shared_is_not_a_write_to_the_events(ui, sample_dir):
    loaded(ui, sample_dir)
    ui.load_tags(ui.write("t.json", {"0": {"tags": [dict(NEW_TAG, id=99)]}}))     # id 99: no observation: nothing shared
    ui.page.wait_for_function("Object.keys(AnnotationStore.getTags()).length > 0")
    ui.js(CLEAR)
    ui.js("AnnotationStore.getTags()[0].tags[0].dm = 5")
    assert seen(ui) == []


def test_i6_the_operations_of_events_are_not_dirty_writes(ui, sample_dir):
    """No marker: this test must pass the strict check, which is what a clean migration looks like."""
    loaded(ui, sample_dir)
    ui.js("events.update(0, 1, {note: 'x'}); events.setInfo('notes', 'y')")
    assert seen(ui) == []
    assert ui.js("events.get(0, 1).note") == "x"
