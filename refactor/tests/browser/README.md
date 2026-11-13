# Browser tests

Automated version of [../CHECKLIST.md](../CHECKLIST.md): the real page in headless Chromium (Playwright, pytest), served by
the dev webapp `tests/webapp/serve.py`. Decision record: [ADR 0006](../../design/0006-browser-tests.md).

    conda activate labelbeedev                  # see ../devenv/README.md
    pytest refactor/tests/browser               # ~1 minute, 55 tests, all passing
    pytest refactor/tests/browser -k c9 -x      # one item, stop at the first failure
    pytest refactor/tests/browser --headed      # watch the browser (pytest-playwright option)

| File | Checklist items |
|---|---|
| `test_a_smoke.py` | A1-A9: open, play, seek, select, create, edit, undo (a delete), swap id, delete |
| `test_a_features.py` | A10-A12: zoom view, tags (Tags mode), parts, notes |
| `test_b_store.py` | B1-B4: store and legacy globals, erase with confirmation, DM controls |
| `test_c_loading.py` | C1-C7: local events and tags files, bad files |
| `test_c_server.py` | C8-C13: "Load Events from DB", `#video_data=` hash, tracks CSV, bad URL, gurabo4 |
| `test_d_saving.py` | D1-D6: save v2 and reload, history, CSV and BBox export, tags, save to the server and its lineage |
| `test_e_console.py` | E1: the console watcher itself. Every test also runs it at teardown |
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

## Findings of the first run
Not caused by the refactor unless noted. Each is a candidate `DEBT` entry; none is recorded in `intent/debt.md` yet.

| ID | Finding | Where | Test |
|---|---|---|---|
| F1 | **Fixed.** A `frame=<n>` in a URL opened while the video was still loading never seeked: `onVideoLoaded2` set `delayedSeekFrame = undefined` and then the timer read it, so `seekFrame(undefined)` ran. It worked when the video was already loaded (hash changed on an open page). Now the frame is read before it is cleared | `labelbee/static/labelbee/js/VideoControl.js:1313-1317` (bug from commit `01ee8e27`) | `test_c9_opening_a_url_with_a_frame_seeks` |
| F2 | **Fixed (wording).** `onhashchange` never rewrites the hash: that code is commented out. Only `frame=` is removed, when the frame changes. The slice 3 code comment and BEH-731 said "hash cleanup": corrected | `labelBee.js:271`, `intent/behaviors/cap-700-annotation-model-io.md` BEH-731 | `test_c9_hash_change_on_an_open_page...` |
| F3 | **Fixed.** An alert opened while the previous one was still fading out was lost: the modal state said shown, nothing appeared and the backdrop stayed (Bootstrap 3.3.6: the pending hide ran after the new show). Needed two failures within ~300 ms. `mainAlert` now waits for `hidden.bs.modal` when a hide is in progress | `mainAlert` (`AnnotationIO.js`) | `test_alerts.py` (fails without the fix) |
| F4 | `tagMode` is hard-coded to `'Tracks'` and nothing changes it: Tags loaded from a tags file or the server are stored but not indexed (`ttags` stays empty) nor drawn; the chronogram says "0 tags". The Tags display is reachable only from the console | `OverlayControl.js:5` | `test_a10_tags_reach_the_chronogram_in_the_tags_mode` |
| F5 | The backend tests cannot be collected: `tests/conftest.py` imports `labelbee.init_app`, which no longer exists, and `pytest-flask` (the `client` fixture) is not in `requirements.txt` | `tests/conftest.py:10` | not covered here (PLAN Phase 2) |
| F6 | Playwright's Chromium cannot decode H.264 (`tests/webapp/make_sample_video.sh` encodes H.264); the tests use VP9 inside `.mp4`, which the page accepts | `conftest.py` | all |

Undo only knows deletions (`undoPush('delete')` is the only caller): checklist item A7 was reworded.

## Not automated
Visual quality of the drawing, H.264 playback in your usual browser, the real backend (database, login, uploads), the
tag display in the real Tags mode (F4). Keep those in the manual checklist.
