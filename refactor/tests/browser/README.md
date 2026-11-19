# Browser tests

Automated version of [../CHECKLIST.md](../CHECKLIST.md): the real page in headless Chromium (Playwright, pytest), served by
the dev webapp `tests/webapp/serve.py`. Decision record: [ADR 0006](../../design/0006-browser-tests.md).

    conda activate labelbeedev                  # see ../devenv/README.md
    pytest refactor/tests/browser               # ~3 minutes, 139 tests, all passing
    pytest refactor/tests/browser -k c9 -x      # one item, stop at the first failure
    pytest refactor/tests/browser --headed      # watch the browser (pytest-playwright option)

| File | Checklist items |
|---|---|
| `test_a_smoke.py` | A1-A9: open, play, seek, select, create, edit, undo (off since slice 5 step 1), swap id, delete |
| `test_a_features.py` | A10-A12: zoom view, tags (tags file merged by id, standalone Tags mode), parts, notes |
| `test_b_store.py` | B1-B4: store and legacy globals, erase with confirmation, DM controls |
| `test_c_loading.py` | C1-C7: local events and tags files, bad files |
| `test_c_server.py` | C8-C13: "Load Events from DB", `#video_data=` hash, tracks CSV, bad URL, gurabo4 (C13 skipped by default, needs the dataset: `RUN_C13=1 pytest ...`) |
| `test_d_saving.py` | D1-D6: save v2 and reload, history, CSV and BBox export, tags, save to the server and its lineage |
| `test_e_console.py` | E1: the console watcher itself. Every test also runs it at teardown |
| `test_f_writers.py` | The writers of the stored events that no other test reaches (span, the zoom deletes, clean obsolete events), for the dirty-write detector: [ADR 0007](../../design/0007-slice-events-api.md) step 0 |
| `test_g_readers.py` | Readers of the stored events that no other test reaches, added as their loops move to `events` (slice 4 step 4): "Update Statistics", "Delete FA Tags..." (the tags structure of the store) |
| `test_h_debug_globals.py` | The console-only debug globals `Tracks`, `TracksInfo` (and the `Tags` ones): off by default, `?debug_globals` or `installDebugGlobals()`, the console reads them, a script served from a URL gets an error |
| `test_i_detector.py` | The dirty-write detector itself: direct and indirect mutations are seen (`dirty_writes_expected` tests) |
| `test_j_editors.py` | The edit paths of the editor, pinned before the working copy goes (slice 5 step 0, [ADR 0008](../../design/0008-field-ownership.md)): creation by shift-click and ctrl-drag, label text, notes, the wrong-id edits, move, resize, rotate, dot mode, parts in the zoom view |
| `test_l_refresh.py` | The refresh log (`refreshLog`, `core/Notifier.js`; entry points wrapped by `core/RefreshInstrumentBridge.js`) of 13 user actions: which refresh functions run, nested, and in which order, pinned in `refresh_baseline.json` as the baseline of slice 6 ([ADR 0009](../../design/0009-slice-refresh-logic.md) section 4; `UPDATE_REFRESH_BASELINE=1` records the current code); also writes the durations to `refactor/scratch/refresh-baseline.json` |
| `test_o_chrono_drag_control.py` | `ChronoDragControl` ([ADR 0011](../../design/0011-chrono-drag-control.md)): the instance and `axes.dragTarget`; Pan View pans, Preview Frame (mouse drag, touch drag, Ctrl+hover, pinch, click swallowed after a drag) previews without panning, Ignore does nothing but a click still seeks, mode switch during a preview, the Drag button menu |
| `test_n_hover_control.py` | `HoverControl` ([ADR 0010](../../design/0010-hover-control.md)), with the decode of `VideoCache` replaced by a gated stub: an uncached hovered frame is shown when it arrives, an answer for a frame left or after the hover ended is dropped, a frame hovered again while pending is shown once, a cached frame at once |
| `test_alerts.py` | The main alert modal: alerts in quick succession (F3) |

## How it works
- `conftest.py` builds a temporary copy of the dev webapp (the real `serve.py`, the sample files, a VP9 `sample.mp4`
  made by ffmpeg, a symlink to the `labelbee/` under test). Nothing in `tests/webapp` is modified. One server per run;
  the saved-annotations folder is emptied after each test.
- The `ui` fixture (`helpers.App`) wraps the Playwright page: model readers (`tracks()`, `tags()`, ...), real file
  inputs, panel opening (`open_panel`, `open_subpanel`), box clicks computed from the Fabric objects, downloads, alerts.
  It is not called `app`: `pytest-flask` treats a fixture of that name as a Flask application.
- **Teardown check (E1):** a console error, an uncaught exception, an unhandled rejection or a 404 fails the test,
  unless the test declared it with `ui.allow(regex)`. Two 404s of the dev webapp are known (tag family files).
- Native `alert`/`confirm`/`prompt` are answered automatically and recorded in `ui.dialogs`
  (`ui.dialog_accepts = False` answers Cancel, `ui.prompt_answers` feeds prompts).

## Dirty-write detector
**On in every browser test, by default** (strict mode, below): no test is "designed for it", every one of them runs under the detector and fails if
the stored events are mutated from a site that is not allow-listed. `--no-dirty-writes-strict` turns it off.

    pytest refactor/tests/browser --dirty-writes=refactor/scratch/dirty-writes.json     # also write the report
Injects `dirty_writes.js` in every page. What `events` hands out (`toObject()`, `get`, `getFrame`, ...) is then a recursive `Proxy` of the stored events and
every write, delete or define through it (or through any handle the code kept) is counted by operation, depth (0 frames,
1 one frame, 2 one observation, 3+ nested), field and the source `file:line` that made it. The report lists them per source line.
Working copies (`rect.obs`, made by `cloneObs`) are separate objects and are deliberately not recorded, **except where they share a
nested value with the stored observation** (below). About 10% slower. Purpose: the exact list of writers that the `Events` API of
[ADR 0007](../../design/0007-slice-events-api.md) must replace, and later a guard that nothing writes around it.
A site never shown is a site no test exercises: add a test, run it again.

    pytest refactor/tests/browser                      # strict is the default; --no-dirty-writes-strict to disable
Strict mode: each test fails when a write to the stored events comes from a site (`file`, `function`, `operation`, `depth`) that is not in
[`dirty_writes_allowed.json`](dirty_writes_allowed.json); the summary lists the entries not seen in the run (on a full run, those are to delete).
The list started at 21 writers and loses entries as the steps of ADR 0007 move them behind `Events` (14 after step 2, 2 after step 3a, empty after step 3b, then 5 entries again: reading the code for step 4b found the Pick Flower writers of `visit` (`test_f9`) and the `VisitWidget` span writers (`test_f10`); they wait for step 7; then 7: the detector learned to follow shared references and found `bakeTagFix` and `undoTagFix` writing on tag objects shared with `obs.tag`, `test_f12`, they wait for the tag merge; 6 after step 7a, which keeps the `span` of a new visit; 2 after slice 5 step 7, where the visit module `VisitControl.js` writes through `events.update`); the end state is empty.
**Through the API.** Since step 2 the detector wraps what `get`, `getOrCreate`, `commit`, `update`, `getFrame`, `toObject`, `forEach` and `observations` hand out (`events.tracks` and `AnnotationStore.getTracks()` were removed in step 6), and subscribes to the observer of `Events`: the summary lists each operation of `Events` called by the page code with its call site outside `Events.js` (report key `api`; `dirty` holds the writes), and the operations no test called from the page (a coverage gap: today `setInfo`, until its caller moves).

**Indirect references.** A write through a handle that comes from `events` is seen. Two kinds of second door to the stored data are tracked as well,
both found by probing (`test_i_detector.py` keeps them from regressing): (1) after `storeObs`, a nested value that the stored observation and the working
copy hold as the same object (`parts`, `visit`): both get the proxy, so `rect.obs.parts.push(x)` is reported as a write to the stored data; (2) an object given
to `events.update` (the tag object shared by `obs.tag` and the Tags structure): `AnnotationStore.getTags()` hands out a proxy that records writes to
the objects shared with the events. What stays invisible: a path no test runs, an object that was never stored in or read from `events`, and the live
references that `toObject()` and `get` hand out to code that was not wrapped (the detector wraps them all while it runs).

**By hand, in a real session.** The detector is a test asset, not part of the page. Paste `dirty_writes.js` in the DevTools console (or run it as a snippet)
on a page that is already open: it patches the running store in place. Use the page, then `console.table(Object.values(__dirtyWrites))` and
`console.table(Object.values(__dirtyApi))`; clear with `for (const k in __dirtyWrites) delete __dirtyWrites[k]`. A test that mutates on purpose
carries `@pytest.mark.dirty_writes_expected` (it skips the strict check of its own teardown and does not feed the report).

Not reachable from the page, so not in the list: the `span` creation in `OverlayControl.js` `hardRefresh` (`:1537`). A write from there would fail the strict run.

`ui.settle()` (used by `click_box` and `shift_click_background`) waits for the `hardRefresh` that the page schedules 500 ms after a
video loads (`VideoControl.js` `onVideoLoaded2`); it rebuilds the fabric objects and made the drag test fail about 1 run in 8.

## Findings of the first run
Not caused by the refactor unless noted. Recorded in the intent spec: F1 in `DEBT-202`, F2 in `DEBT-203` (6), F3 as `DEBT-738`, F4 as `DEC-006`, F5 as `DEBT-125`.

| ID | Finding | Where | Test |
|---|---|---|---|
| F1 | **Fixed.** A `frame=<n>` in a URL opened while the video was still loading never seeked: `onVideoLoaded2` set `delayedSeekFrame = undefined` and then the timer read it, so `seekFrame(undefined)` ran. It worked when the video was already loaded (hash changed on an open page). Now the frame is read before it is cleared | `labelbee/static/labelbee/js/VideoControl.js:1313-1317` (bug from commit `01ee8e27`) | `test_c9_opening_a_url_with_a_frame_seeks` |
| F2 | **Fixed (wording).** `onhashchange` never rewrites the hash: that code is commented out. Only `frame=` is removed, when the frame changes. The slice 3 code comment and BEH-731 said "hash cleanup": corrected | `labelBee.js:271`, `intent/behaviors/cap-700-annotation-model-io.md` BEH-731 | `test_c9_hash_change_on_an_open_page...` |
| F3 | **Fixed.** An alert opened while the previous one was still fading out was lost: the modal state said shown, nothing appeared and the backdrop stayed (Bootstrap 3.3.6: the pending hide ran after the new show). Needed two failures within ~300 ms. `mainAlert` now waits for `hidden.bs.modal` when a hide is in progress | `mainAlert` (`AnnotationIO.js`) | `test_alerts.py` (fails without the fix) |
| F4 | **By design, not a defect** (maintainer, 2026-11-13). `tagMode` is hard-coded to `'Tracks'`: the separate tag file is marked for obsolescence and the current pipeline adds the tag information to the Tracks (`obs.tag`) before it reaches LabelBee. A legacy tags file still works in that mode: `augmentTrackWithTag` copies each of its tags onto the observation with the same id and frame (the chronogram counts it); a tag whose id matches no observation attaches to nothing. Only the standalone display of the Tags structure (`tagMode == 'Tags'`) is unreachable. **Correction (2026-11-13):** the first version of this row said a tags file "shows nothing"; that came from a sample whose tag ids matched no observation | `OverlayControl.js:5`, `ChronoControl.js:1015` | `test_c13_...` (embedded tag), `test_a10_a_tags_file_attaches...`, `test_a10_a_tag_with_no_matching...`, `test_a10_the_standalone_tags_display...` |
| F5 | The backend tests cannot be collected: `tests/conftest.py` imports `labelbee.init_app`, which no longer exists, and `pytest-flask` (the `client` fixture) is not in `requirements.txt` | `tests/conftest.py:10` | not covered here (PLAN Phase 2) **Deferred** (maintainer 2026-11-13): left as is, to be replaced by tests under `refactor/tests/` when the refactor stabilizes |
| F6 | Playwright's Chromium cannot decode H.264 (`tests/webapp/make_sample_video.sh` encodes H.264); the tests use VP9 inside `.mp4`, which the page accepts | `conftest.py` | all |
| F7 | An observation with an embedded `tag` that is not in the `Tags` structure makes the tag-track overlay throw (`Cannot read properties of undefined (reading 'c')`) at every redraw. Found while testing `cleanObsoleteEvents` with tags in an events file; the test declares it with `ui.allow`. Not fixed (outside slice 4) | `labelbee/static/labelbee/js/OverlayControl.js:2972` `plotTagsTracks` | `test_f6_...` |
| F8 | In headless Chromium with the VP9 sample the page's `VideoCache` never answers: `videoCache.getFrameCropDataURL` stalls after `seekWithCallback: duration workaround`, so the features that need frame crops (the pick-frame timeline, Pick Flower) cannot run unstubbed. The default display mode is `"video"`, the raw video tag (`VideoControl.js:32`): the cache is not used for playback or seeking; only the crop features call it directly, whatever the mode. `test_f9` stubs that call with a 1x1 image. Cause not investigated (the same stall with H.264 in a real browser is not known) | `labelbee/static/labelbee/js/VideoControl.js` (`VideoCache`), `OverlayControl.js:1185` | `test_f9_...` |
| F9 | Every click of the Pick Flower tool throws `Cannot read properties of undefined (reading 'labels')` after it has written `visit.flowerid`: `drawFlowersMainCanvas` passes `identifyBeeRect` a rect from `obsToCanvasRect` that has no `obs`. The pick itself works. A flower is an observation of frame 0 whose id starts with `F` (a pollinator: `P`), the convention of `ChronoControl.js:1108` and `OverlayControl.js:499,535,1387`. The test declares the error with `ui.allow`. Not fixed (outside slice 4) | `labelbee/static/labelbee/js/OverlayControl.js:1496,2482` | `test_f9_...` |

Undo only knew deletions (`undoPush('delete')` was the only caller): checklist item A7 was reworded; since slice 5 step 1 undo is deactivated and A7 checks that it is off.

## Not automated
Visual quality of the drawing, H.264 playback in your usual browser, the real backend (database, login, uploads), the
the standalone Tags display (`tagMode == 'Tags'`, F4). Keep those in the manual checklist.
