# Debt (DEBT)

Conventions: [README.md](README.md). Edit this file; read the generated view [docs/view_debt.md](docs/view_debt.md).
Known hacks, accidents and bugs found by reading the code (`[read]`, nothing run). Each states the intended
replacement when known. All items are `status: draft`, `confidence: inferred`. Grouped by the capability
group of the drafter (ID block `DEBT-G01..`).

## Contents

<!-- toc -->

## DEBT-101: Annotation lineage `created_from_id` is never stored

`AnnotationsAPI.post` reads the key `created_from` from the schema-loaded dict, but `VideoDataSchema` only produces `created_from_id`, so `add_video_data(created_from=None)` always stores `NULL`. The client sends `created_from_id` (`fromServerDialog.basedOn`) and shows it back in the save alert. The documented single-writer snapshot lineage (DEC-002, CAP-703) does not exist in the database. [read]
Intended replacement: read `created_from_id` (validate that the parent record exists).

- **Code:**
  - `blueprints/api/resources/annotations.py`: `AnnotationsAPI`
  - `database/annotation/schema.py`: `VideoDataSchema`
  - `AnnotationIO.js`: `eventsToServer`
- **Links:** BEH-144, DEC-002, INV-001, OQ-101

## DEBT-102: Saving a snapshot not based on a loaded record probably fails

The client sends `created_from_id=` (empty text: jQuery serializes `undefined` as empty) when nothing was loaded; `fields.Integer` rejects `""`, `schema.loads` raises `ValidationError`, nothing handles it (HTTP 500). `fromServerDialog.basedOn` is only assigned after a load. [read] for the code path, outcome [inferred] (needs a run).

- **Code:**
  - `blueprints/api/resources/annotations.py`: `AnnotationsAPI`
  - `AnnotationIO.js`: `eventsToServer`
- **Links:** BEH-144, OQ-101

## DEBT-103: `created_by_id` trusted from the client

`POST /annotations` takes `created_by_id` from the form instead of `current_user`: any logged-in user can create records attributed to another user; (what `add_video_data` stores for an unknown id was not re-read [inferred]). The resource reads `created_by_id` and looks the user up with `get_user_by_id` (`annotations.py`) [read].
Intended replacement: ignore the field and use `current_user.id`.

- **Code:**
  - `blueprints/api/resources/annotations.py`: `AnnotationsAPI`
- **Links:** BEH-144

## DEBT-104: `allusers` flag is a string, "own records" filter breaks

`AnnotationsAPI.get` treats any non-empty `allusers` text as a user id (`created_by_id == "false"` / `"true"`). The advanced load dialog always sends `allusers=true|false`, so it likely lists nothing in both modes. No role check exists for seeing other users' records. [read] code; outcome [inferred].
Intended: parse a boolean; decide who may list all users (OQ-103).

- **Code:**
  - `blueprints/api/resources/annotations.py`: `AnnotationsAPI`
  - `AnnotationIO.js`: `showAdvancedLoadingDialog`
- **Links:** BEH-143, OQ-103

## DEBT-105: Authorization gaps in the API

Pages for dataset/video editing are admin only, but the API is looser: any authenticated user can PUT/DELETE datasets, PUT videos, POST videos, DELETE any annotation record, read any annotation record, and list datasets with creators' emails. Only PUT annotation and DELETE video check the admin role. [read]

- **Code:**
  - `blueprints/api/resources/dataset.py`: `DatasetAPI`, `DatasetListAPI`
  - `blueprints/api/resources/video.py`: `VideoAPI`, `VideoListAPI`
  - `blueprints/api/resources/annotations.py`: `AnnotationAPI`
- **Links:** BEH-105, BEH-136, BEH-138, BEH-141, BEH-142, BEH-147, OQ-102

## DEBT-106: Inconsistent envelopes and failures returned with HTTP 200

Error bodies with `status_code` 400/500 are sent with HTTP 200 (videos GET, video GET, annotation GET); `rawdata` swallows every exception into `{"status":"error",...}` with HTTP 200; envelopes differ (`success/status_code/data`, bare list, `status: SUCCESS|FAIL`); `Login.get` performs a logout. Auth is a manual `if not current_user.is_authenticated` in every method. [read]
Intended: one envelope and real HTTP statuses plus a decorator.

- **Code:**
  - `blueprints/api/resources/video.py`: `VideoListAPI`, `VideoAPI`
  - `blueprints/api/resources/rawdata.py`: `RawDataAPI`
  - `blueprints/api/resources/auth.py`: `Login`
- **Links:** BEH-129, BEH-131, BEH-148

## DEBT-107: Security hygiene: CSRF exemption, secrets in log, committed credential

The whole API blueprint is CSRF exempt while using cookie sessions (`csrf.exempt(api.bp)`), including login/logout and deletions. `create_app` logs the whole `app.config` (SECRET_KEY, DB URI with password) to `flask_errors.log`. `labelbee/settings/local_settings_example.py` contains a hard-coded mail account and password (value not copied here). [read]

- **Code:**
  - `labelbee/app.py`: `create_app`
  - `settings/local_settings_example.py`: `MAIL_PASSWORD`
- **Links:** BEH-101, BEH-104

## DEBT-108: `/admin/version` public, shell-based and escaped

No role check on the route (the handler has only `@bp.route`); runs `git` subprocesses (`FileNotFoundError` when `git` is missing, `CalledProcessError` when the folder is not a repository: both HTTP 500); the HTML built by string concatenation is auto-escaped by Jinja so the markup shows as text. [read]

- **Code:**
  - `blueprints/admin/admin.py`: `version_page`
  - `blueprints/admin/templates/version_page.html`: `~webapp_version`
- **Links:** BEH-127

## DEBT-109: Manage users: role wipe and no rollback

`populateFormFields` does not preselect the user's roles, and `edit_user` replaces roles wholesale, so saving a user without re-selecting roles removes all roles (an admin editing themselves loses admin). A failed `commit` is swallowed without `rollback`, so the following `user_list()` query in the same request probably raises `PendingRollbackError` (HTTP 500) instead of the "Could not edit user" alert [inferred]. A failed validation shows no alert (the `editing` flag is set only after a valid POST); whether field errors are shown depends on the Flask-User `render_field` macro [inferred, library]. `edit_user` with an unknown id raises `AttributeError` (HTTP 500). The table body loops over an undefined `videos` [inferred, template part not re-read]. There is no way in the UI to create users or roles; if self-registration is dropped (OQ-104), a create-user form in Manage Users would be the replacement. [read] except where marked

- **Code:**
  - `blueprints/admin/templates/manage_users_page.html`: `populateFormFields`
  - `database/user/api.py`: `edit_user`
- **Links:** BEH-124, BEH-125, BEH-126, OQ-104

## DEBT-110: Broken and orphan templates

`video_data_details_page.html` uses unqualified endpoint names (`video_data_page`, `edit_video_data_page`, `get_video_data_raw_v2`, `labelbee_user_page`), while all gallery endpoints are blueprint-qualified (`gallery.video_data_page`, `labelbee.labelbee_user_page`): the page raises `BuildError` at the first `url_for` in the table row for any record, although it is linked from the video data table. `add_video.html` has no route in `gallery.py` and uses the unqualified `url_for('video_data_page')`; `edit_video_data.html` has no route and uses the unqualified `url_for('edit_video_data_page')`; `video_registry.html` is an empty block with an invalid `{% end block}` tag [read].

- **Code:**
  - `blueprints/gallery/templates/video_data_details_page.html`: `#video_info`
  - `blueprints/gallery/templates/add_video.html`: `#videos_table`
  - `blueprints/gallery/templates/edit_video_data.html`: `~video_data form`
  - `blueprints/admin/templates/video_registry.html`: `~empty template`
- **Links:** BEH-116, BEH-146

## DEBT-111: Dataset deletion cannot be done from the UI

`/delete_dataset` GET renders a template named after a URL (500) and no page links to it; the "Delete Dataset" button of the edit page POSTs to the create-dataset API (`/api/v1/datasets?id=`), which fails for the missing name (or would create a dataset). The "Add Video to Dataset" button opens the JSON video list. [read]

- **Code:**
  - `blueprints/gallery/gallery.py`: `delete_dataset`
  - `blueprints/gallery/templates/edit_dataset.html`: `~delete form`
- **Links:** BEH-111, BEH-118

## DEBT-112: Edit video page defects

Prefilled timestamp format (`YYYY-MM-DD HH:MM:SS`) does not match the parsed format (`%Y-%m-%dT%H:%M:%S`), so an unchanged submit raises `ValueError`; `video` undefined without the `video` parameter; heading uses `video.name`; blank fields cannot clear values; the `UserProfileForm` boilerplate copied in every gallery handler is DEBT-123. [read] for the handler, [inferred] for `edit_video` and the heading.

- **Code:**
  - `blueprints/gallery/gallery.py`: `edit_video_page`
  - `database/video/api.py`: `edit_video`
- **Links:** BEH-117

## DEBT-113: Video upload and delete are unsafe

`POST /videos` writes `$ROOT_PATH/<video_name>.mp4` with no name sanitation (path traversal), overwrites existing files, and on DB failure (including the duplicate `file_name`+`path` constraint) deletes the file, which may belong to the existing record. `location` is ignored (constant 10), `path` constant `/videos`, `timestamp` stored from an unparsed string, `frames` is a float. `DELETE` removes `$ROOT_PATH/<file_name>` (differs from the upload layout, ignores `path`) and its rollback path rebuilds a `Video` from the serialized dict. No UI uses either. [read]

- **Code:**
  - `blueprints/api/resources/video.py`: `VideoListAPI`, `VideoAPI`
- **Links:** BEH-134, BEH-137, OQ-106

## DEBT-114: Annotator route ignores its parameters and has dead code

`labelbee_user_page` ignores `video_url` / `tag_file` (constants for `gurabo10avi`), calls an undefined `upload_dir` inside a bare `except`, has an anonymous branch that is unreachable because the route is `login_required` and passes template variables the template never renders (`userid`, `video_url`, `tag_file`). The home page promises "limited functionality" without login. [read]

- **Code:**
  - `blueprints/labelbee/labelbee.py`: `labelbee_user_page`
- **Links:** BEH-107, BEH-119

## DEBT-115: Dead, duplicated or inconsistent backend code

`CustomUserManager` / `MyRegisterForm` unused (so the register template references missing fields); `USER_ENABLE_REGISTRATION` is not a Flask-User key; `database/*/model.py` duplicates models (`annotation/model.py` redefines `VideoData`); helpers `create_user` (`role_id=2` default), `change_user_role` (sets `user.role`, which the `User` model does not define: it has `roles`), `delete_user`, `search_video` have no caller in active code; the only references are in `labelbee/legacy/views.py`, which imports `create_user, edit_user` from `labelbee.user_management`, which does not exist (no `user_management.py` nor package), so that import can never succeed; `DataSetSchema.timestamp` has no column; `UsersRoles` as a model; ~10 `hasframe*` adhoc columns; `app.py`/`models.py` circular import; `tests/` target an old layout [inferred, not re-read]. [read] for the rest except `delete_user`/`search_video` internals.

- **Code:**
  - `labelbee/models.py`: `CustomUserManager`, `MyRegisterForm`, `UsersRoles`
  - `database/user/api.py`: `create_user`, `change_user_role`
  - `database/dataset/schema.py`: `DataSetSchema`
  - `database/annotation/model.py`: `VideoData`
- **Links:** BEH-121, BEH-138, BEH-151

## DEBT-116: Download and range handling defects

`/data/<path>` has no authentication and serves `os.path.join(bp.root_path, "../static/data")`, i.e. `labelbee/blueprints/static/data` (the `labelbee/blueprints/static/` directory does not exist in this checkout), not the `labelbee/static/data` that the home and gallery links assume (OQ-105); suffix range `bytes=-N` fails with HTTP 500 (regex result not checked), a multi-range header is answered with its first range only; `mimetypes.guess_type(path)[0]` concatenated as a string raises when the type is unknown (HTTP 500 for a Range request); `dir_listing` calls `abort`, which `flask_range_requests.py` does not import (NameError on a missing directory) [read]; unsafe paths give 500; response is always 206 for any Range, with no `Accept-Ranges`; `pages/files.html` is a bare `<ul>` fragment; verbose `print` debugging. [read]

- **Code:**
  - `blueprints/download/flask_range_requests.py`: `send_from_directory_partial`, `dir_listing`
  - `blueprints/download/download.py`: `send_data`
- **Links:** BEH-148, BEH-149, OQ-105

## DEBT-117: Gallery page cosmetics and external dependencies

Datasets and dataset header show empty "Date and Time" and the creator as a bare user id; headings print an undefined `uri`; videos table sorted by Colony (index 2) while the intent looks like date; the `database_menu` highlight keys do not match the datasets page; `DataTables` JS/CSS loaded from `cdn.datatables.net` (external dependency, page breaks offline); `video_data_page.html` loads jQuery itself (`jquery.js` under `extern`, probably a second copy next to the layout's [inferred]) and has a `<link src=...>` typo for the jquery-ui css [read]; the CSRF/ajaxSetup block is copy-pasted into each page; the annotation table "JSON" link lists the whole video rather than the record; File Name column is empty because save never sets `file_name`/`path`. [read]

- **Code:**
  - `blueprints/gallery/templates/datasets_page.html`: `#datasets_table`
  - `blueprints/gallery/templates/videos_page.html`: `#videos_table`
  - `blueprints/gallery/templates/video_data_page.html`: `#video_data_table`
- **Links:** BEH-106, BEH-109, BEH-113, BEH-115

## DEBT-118: Tag-file load uses a nonexistent route

`tagsFromServer` requests `rest/v2/annotation/<id>`, a route of a former API version not served by this backend (only `/api/v1/annotation/<id>` exists), so loading a `tag` record from the server fails (`setTags([])`). [read] route absent; outcome [inferred]. Cross-group with CAP-704.

- **Code:**
  - `AnnotationIO.js`: `tagsFromServer`
  - `blueprints/api/__init__.py`: `api`
- **Decision:** DEC-006 (the separate tag file is obsolescent: removal may replace repair).
- **Links:** BEH-145, OQ-107

## DEBT-121: API login reports SUCCESS for inactive users

`Login.post` ignores the boolean result of `login_user(user)` (Flask-Login refuses inactive users) and always answers SUCCESS after a correct password. [inferred from library behavior]

- **Code:**
  - `blueprints/api/resources/auth.py`: `Login`
- **Links:** BEH-130

## DEBT-122: Two `Marshmallow` objects, the one used by the schemas is never initialised

`labelbee/app.py` defines a module-level `ma = Marshmallow()`; `create_app` creates a local `ma = Marshmallow(app)` and calls `ma.init_app(app)` on it, so the local shadows the global. The schemas import the module-level object (`from labelbee.app import ma` in `database/video/schema.py`, `database/annotation/schema.py`, `database/user/schemas.py`), which is never bound to the app. Consequences were not run [inferred]. [read]
Intended replacement: initialise the module-level extension object in `create_app`.

- **Code:**
  - `labelbee/app.py`: `create_app`, `ma`
  - `database/video/schema.py`: `VideoSchema`
- **Links:** BEH-153, SEAM-103

## DEBT-123: Gallery POST handlers copy the profile form onto the current user

`/add_dataset`, `/delete_dataset`, `/videos`, `/videodata`, `/video_data_details`, `/edit_video` and `/edit_dataset` each build a `UserProfileForm`, and on a valid POST run `populate_obj(current_user)` and `db.session.commit()` before their own action (only `/datasets` has the copy commented out). The side effect is meaningless there; a user without first and last name cannot create a dataset or edit a video; an invalid form re-renders without a message; the redirects drop the query parameters. Whether it is deliberate is OQ-108. [read]
Intended replacement: drop the form from these handlers.

- **Code:**
  - `blueprints/gallery/gallery.py`: `add_dataset_page`, `videos_page`, `edit_video_page`, `video_data_page`, `video_data_details_page`, `edit_dataset_page`
- **Links:** BEH-154, DEBT-112, OQ-108

## DEBT-124: Posted `timestamp` of an annotation record is loaded as a datetime

`VideoDataSchema.timestamp` is `fields.DateTime()`, so `schema.loads` yields a `datetime`, which `AnnotationsAPI.post` passes unchanged to `add_video_data(timestamp: str = None)`. `add_video_data` then calls `datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S")` on it, which raises `TypeError` with no handler (HTTP 500) for a posted timestamp; only an omitted or empty timestamp works (then UTC now). The annotator never sends it. [read] Intended: decide the contract (OQ-110).

- **Code:**
  - `blueprints/api/resources/annotations.py`: `AnnotationsAPI`
  - `database/annotation/schema.py`: `VideoDataSchema`
  - `database/annotation/api.py`: `add_video_data`
- **Links:** BEH-144, OQ-110

Numbers 212, 218 and 222 of this block are unused (never assigned, not reused). Tags: [read] = code text seen in the evidence of round 2; [inferred] = from code order or DOM semantics, not run; [round 1] = kept from the first reading, not re-checked in round 2.

## DEBT-125: The backend tests of `tests/` cannot be collected and test another app

[ran] `pytest tests` fails at collection: `tests/conftest.py:10-11` imports `labelbee.init_app` and `labelbee.manage_commands`, deleted in earlier cleanups (the app factory is `create_app()` in `labelbee/app.py`; `labelbee/legacy/views.py:34` imports the same missing module and is not registered). `tests/test_page_urls.py` is the SolidBuilds Flask-User starter test (routes `home_page`, `user.login`, users `user@example.com` / `admin@example.com`), unrelated to the current blueprints, and uses a `client` fixture that only `pytest-flask` provides (not in `requirements.txt`). `create_app()` has no test configuration: it needs `LABELBEE_LOGDIR` and the tracked `labelbee/settings/local_settings.py` (a MySQL URL built from environment variables). Deferred (maintainer 2026-11-13): left as is, to be replaced by tests under `refactor/tests/` when the refactor stabilizes. Idea for then: a conftest that points `local_settings` at SQLite and a temporary `LABELBEE_LOGDIR` before `create_app()`, with no production change.

- **Code:**
  - `tests/conftest.py`: module imports
  - `tests/test_page_urls.py`: `test_page_urls`
  - `labelbee/app.py`: `create_app`
- **Links:** DEBT-115, finding F5 of `refactor/tests/browser/README.md`

## DEBT-201: Ctrl+Right and Ctrl+Shift+Right fall through to a second move

`onKeyDown` ArrowRight branch is `if (ctrl&&shift) forward4(); else if (ctrl) forward3();` followed by an independent `if (shift) forward2(); else forward();`: the second `if` is not chained with an `else` to the first [read]. Ctrl+Right = +10 s then +1 frame; Ctrl+Shift+Right = +60 s then +1 s. The Left branch is a proper if/else chain [read]. Intended: Ctrl = 10 s, Ctrl+Shift = 60 s only (to be confirmed, OQ-207). Replacement: one table-driven step function shared by both directions.
- **Code:**
  - `labelBee.js`: `onKeyDown`
- **Links:** BEH-251, OQ-207

## DEBT-202: delayedSeekFrame is cleared before it is used

[ran] FIXED 2026-11-13 (commit `6e1ea944`, `VideoControl.js` `onVideoLoaded2`: the frame is read into a local before `delayedSeekFrame` is cleared). Verified in a real browser by `refactor/tests/browser/test_c_server.py::test_c9_opening_a_url_with_a_frame_seeks`: a page opened cold with `#video_id=1&video_data=4&frame=10` lands on frame 10 and keeps `frame=10` in the hash until the frame changes. The other concerns below (placeholder `nframes`, `flagLoadingVideo` set late) did not prevent the seek in that test (dev webapp, 40-frame video, fast server); a slow real server is not checked. Was: `onVideoLoaded2` does `this.delayedSeekFrame = undefined` and then, in the 500 ms `setTimeout`, calls `videoControl.seekFrame(this.delayedSeekFrame)` which reads `undefined` [read]. `seekFrame(undefined)` passes the bounds test and in `video` mode calls `seekTo({frame: NaN})` (no effective seek) [read]. Also `flagLoadingVideo` is set only in `loadVideo2` (after the video-record ajax returns), so a `frame=` hash processed by the router earlier takes the immediate branch [read]; on a cold page `videoinfo.nframes` is still the placeholder 1, so `seekFrame` rejects every frame `>= 1` [read: placeholder and bounds test]; with a video already loaded the seek applies to the previous video. Net: `#video_id=..&frame=..` links probably do not land on the requested frame (not run). Replacement: keep the value in a local, make the seek part of the load promise.
- **Code:**
  - `VideoControl.js`: `VideoControl.onVideoLoaded2`, `VideoControl.delayedSeek`, `VideoControl.seekFrame`
- **Links:** BEH-208, BEH-209, BEH-234, OQ-202

## DEBT-203: Router and hash-listener bugs

(1) `onhashchange` is assigned as `window.onhashchange` (event-handler property) by `onhashchange = async function...`; the preceding `addEventListener("hashchange", onhashchange)` at script start evaluates the property before that assignment, so it receives its default value `null` (not `undefined`) and registers nothing [read: statement order]. `onFrameChanged` later calls `removeEventListener(.., onhashchange)` (finds nothing) then `addEventListener(.., onhashchange)` with the function, so after the first hash cleanup the router is registered twice (property and listener) and likely runs twice per hashchange [inferred, DOM semantics]. (2) `if (newhash == lasthash)` only logs "ABORT" and continues (no `return`) [read]; the test could not match anyway: `location.hash` includes `#` while `lasthash = String(parsedHash)` (set in `onFrameChanged`) does not [read]. (3) `parsedHash.get("frame","0")` was meant to be `set` (default frame 0 is never applied) [read]. (4) `need_push`, the `history` calls and the listener remove/add pair in the router are commented out dead code [read]. (5) The remove/add pair in `onFrameChanged` runs synchronously before the asynchronous `hashchange` event fires, so the re-added listener does receive the event; the intended "avoid feedback loop" is not achieved [inferred]. The same-id skip (`id == currentVideoID`) is what stops the loop in practice [inferred]. (6) [ran] Consequence of (4): the `video_data` part of the hash is never removed; only `frame=` is, by `onFrameChanged`, when the frame later changes (`refactor/tests/browser/test_c_server.py::test_c9_hash_change_on_an_open_page_loads_the_events_and_seeks`). The slice 3 comment in `labelBee.js` and BEH-731 said "hash cleanup" by mistake (corrected in `4fa76e20`).
- **Code:**
  - `labelBee.js`: `onhashchange`, `lasthash`
  - `VideoControl.js`: `VideoControl.onFrameChanged`
- **Links:** BEH-208, BEH-217

## DEBT-204: Async video selection does not await what it starts

`selectVideoBy_video_id` calls `this.videoSelected(id)` / `this.loadVideoManual(uri)` without `await`/`return`, so the router's `await` resolves before the video is loaded and then runs `video_data` loading and the delayed seek early [read]. `clickLoadTracksTaggedCSVFromServer` also starts `loadVideoManual` without awaiting it before requesting the tracks (BEH-232) [read]. `loadVideoManual` calls `this.setVideoInfo(info)` without `await`/`return`, so it resolves before the media loads [read]; it mixes a callback ajax with a Promise whose `reject` is commented out [read].
- **Code:**
  - `VideoList.js`: `VideoManager.selectVideoBy_video_id`, `VideoManager.loadVideoManual`, `VideoManager.videoSelected`
  - `AnnotationIO.js`: `clickLoadTracksTaggedCSVFromServer`
- **Links:** BEH-204, BEH-207, BEH-208, BEH-232

## DEBT-205: Load errors throw inside callbacks; promises never settle

`videoSelected` throws `Error` inside the `$.ajax` error callback and rethrows inside the `.catch` of `setVideoInfo`; its `reject` calls are commented out, so the promise it returns never settles after a failure and `await` hangs [read]. The rethrow in `.catch` is an unhandled rejection. User feedback is a red dialog message for the DB record failure only [read]; a media load failure shows the `onVideoError` message (BEH-206). `videoSelected` sets `currentVideoID` before the request succeeds, so after a failure the manager and the links name an unloaded video (BEH-233) [read]. `loadVideoManual` throws in its `.stream.json` error callback with the same effect (the dialog message there is commented out, nothing is shown to the user) [read]. [round 1, not re-read]: `loadVideo2` times out after 10 s with a `TimeoutError` (the `timeout` helper body was not read).
- **Code:**
  - `VideoList.js`: `VideoManager.videoSelected`, `VideoManager.loadVideoManual`
  - `VideoControl.js`: `VideoControl.loadVideo2`
- **Links:** BEH-204, BEH-205, BEH-207, BEH-233

## DEBT-206: Shortcut `p` does nothing

`$("#P").prop("checked", !$().prop("checked"))`: `$()` is an empty set (prop returns undefined, so the toggle value is always `true`) and the key is consumed (`return false`) [read]. No element with a double-quoted `id="P"` was found in `labelbee_page.html` (single-quoted ids not searched) [read]. [round 1]: Quick Help still advertises "P: mark/unmark pollen". DEC-005 says `p` is kept for now. Intended replacement: a label shortcut for `pollen` through the label list `accesskey` mechanism.
- **Code:**
  - `labelBee.js`: `onKeyDown`
  - `labelbee_page.html`: `#quickhelp`
- **Links:** BEH-254, DEBT-217, DEC-005, OQ-209

## DEBT-207: Dead and misplaced key handling around the ID field

In `onKeyDown` the `e.target == #I` Escape branch comes after a first test that already returns for any `type === "text"` target, and `#I` is `<input type="text">` [read], so that branch is unreachable; the Escape/Enter branches that toggle focus back from `#I` are dead for the same reason. ID commit is bound by an inline attribute in the HTML instead (`onkeypress="onKeyDown_IDEdit(event)"` on `#I` [read]; `onKeyDown_NewIDEdit` tests `keyCode == 13` (`which || keyCode`) while `onKeyDown_IDEdit` tests `event.key == 'Enter'` [read]). Replacement: one key map, one listener.
- **Code:**
  - `labelBee.js`: `onKeyDown`, `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
  - `labelbee_page.html`: `#I`, `#newid`
- **Links:** BEH-250, BEH-253, BEH-255, DEC-005

## DEBT-208: Obsolete video/preview code still shipped

[round 1, not re-checked in round 2] Unreachable or never-called: `currentMode == "preview"` (never assigned; branches in `seekFrame`, `getCurrentVideoFrame`, `onPreviewFrameChanged`, `updateVideoControlForm`, `OverlayControl.js` redraw); `VideoControl.onVideoLoaded` (marked OBSOLETE, not bound), hence `loadVideoInfo(<url>.info.json)` and `loadPreviewVideo()` are never run after a load; `VideoControl.loadVideo` (deprecated, only the hidden list uses it); `VideoCache.onVideoLoaded`, `VideoCache.loadVideo`, `VideoCache.seekToFrame`; `VideoControl.getCurrentVideoFrame` preview branch; `VideoList.js` list/CSV/JSON machinery, `addDefaultVideo`, `videoListFromServer`, `defaultVideoList`. `#previewVideoStatus` always shows `?` after a load. The `preview` branches of `seekFrame`, `getCurrentVideoFrame` and `updateVideoControlForm`, and the commented-out `loadPreviewVideo` call in `onVideoLoaded2`, are visible in the code read in round 2 [read]. Replacement: delete once OQ-203/OQ-206 are answered.
- **Code:**
  - `VideoControl.js`: `VideoControl.onVideoLoaded`, `VideoControl.loadVideo`, `VideoControl.loadPreviewVideo`, `VideoControl.loadVideoInfo`, `VideoControl.onPreviewFrameChanged`, `VideoCache.seekToFrame`
  - `VideoList.js`: `VideoManager.setVideoList`, `VideoManager.videoListFromServer`
- **Links:** BEH-214, BEH-227, OQ-203, OQ-206

## DEBT-209: Cache seeks have no staleness check

`seekFrame` in `cache` mode stores `cacheRequestedFrame` but nobody compares it; the `.then` of `getFrameImageAsync` always applies its own image and frame (`onFrameChangedCache` does not compare either), so out-of-order completions show an older frame [read]. A rejection is logged by `.catch` and then `.then` runs with `img === undefined`, which shows "not in cache" for that frame [read for the control flow]. The frame-sync design (README 9.1) wants a token, latest wins.
- **Code:**
  - `VideoControl.js`: `VideoControl.seekFrame`, `VideoControl.onFrameChangedCache`
- **Links:** BEH-235, INV-002

## DEBT-210: VideoCache queue defects

(a) `sleep(20)` in `processQueue` is not awaited (the `await` is commented out), so there is no pause between frames [read]. (b) `cancelQueue` loops with an undeclared variable (`for (query of ...)`, implicit global) and never settles the removed deferreds (`query.deferred.reject()` is commented out), so awaiting seeks hang (BEH-231) [read]. (c) `processQueue` has `try/finally` without `catch`: a rejection from `getImageForce` (for example from `seekWithCallback` on an unusable duration) ends the loop, resets the guard, leaves the failing item at the head of the queue and leaves its deferred unsettled; the next `processQueue` call retries the same item [read for the control flow; the rejection path through `getImageForce` is inferred]. (d) `getFrameDataURLForce` re-encodes every decoded frame to JPEG (default quality, `toDataURL('image/jpeg')`) and `getImageForce` decodes it back into an `Image`, so cached frames are lossy and the cost is paid per frame [read]. (e) `preloadFrames` has console logging per frame (very verbose) [round 1]. (f) `seekWithCallback` registers a new `requestVideoFrameCallback` per call and, when the position is already the target (`|currentTime - target| < 0.00005`), resolves without cancelling it, so the callback fires later on an unrelated frame [read]. (g) `cancelQueue` sets `processingQueue = false` while the loop of `processQueue` may be awaiting `getImageForce`; a later `processQueue()` then starts a second loop sharing the hidden video and canvas, and the first loop's `this.queryQueue.shift()` after its await removes the head of the new queue instead of its own item [inferred from code order; not run]. (h) `seekWithCallback` can be called concurrently with a different frame while a previous seek awaits `seekResolve`, because the single `this.video` is shared [inferred].
- **Code:**
  - `VideoControl.js`: `VideoCache.processQueue`, `VideoCache.cancelQueue`, `VideoCache.seekWithCallback`, `VideoCache.getFrameDataURLForce`, `VideoCache.preloadFrames`
- **Links:** BEH-229, BEH-230, BEH-231, INV-002

## DEBT-211: Play button state display

`updateNavigationView` assigns `$("#play").value = ...` on a jQuery object (no effect on the button text) and derives the `playing` class from `video2.playingState()` [read]. In cache modes `video2.playingState()` stays `paused` (the rAF loop uses `VideoControl.playingState`), so the buttons never show the playing state when the cache is used [inferred]. `VideoControl.playingState` (own copy, read by `playPauseVideo`) and `video2.playingState()` can disagree [read: both are read in different functions].
- **Code:**
  - `VideoControl.js`: `VideoControl.updateNavigationView`, `VideoControl.playPauseVideo`
- **Links:** BEH-223

## DEBT-213: Mode switch does not resynchronize the displayed frame

`overlay.optsClick('useImageCache')` assigns `videoControl.currentMode` from another module and calls `hardRefresh()` without seeking [read]: switching to cache shows "not in cache" (stale or missing `currentImage`) until the next seek; switching back shows the `#video` element at the position it had when cache mode began while `currentFrame` says otherwise [inferred from code order, not run]. `currentMode`, `currentImage`, `currentFrame` are public fields written/read by `OverlayControl.js` and `ZoomView.js` [round 1].
- **Code:**
  - `VideoControl.js`: `VideoControl`
  - `OverlayControl.js`: `OverlayControl.optsClick`
- **Links:** BEH-222, SEAM-201, SEAM-202, SEAM-203

## DEBT-214: Global variables and implicit globals

Globals created by assignment without declaration [read unless noted]: `videoListTable`, `videoListCurrentID` (`VideoManager` constructor), `theManager` (`receiveVideoSelection`), `html` (`makeVideoListTable`), `query` (loop variable of `cancelQueue`), `buttonid_property` (loop variable in `init`), `lasthash`, `onhashchange`; [round 1]: `videoCache` (created in the `VideoControl` constructor and then read by `onVideoCacheParamsChanged` and `OverlayControl.js`), `videoManager`, `videoControl`, `overlay`, `chrono`, `statusWidget`, `fromServerDialog`, `loginDialog`, `videojsoninfo`, `out` (in `videoListToCSV`), `defaultSelectedBee`, `change_id_force`, `http_script_name`, `getCurrentFrame`. `VideoControl` methods refer to `videoControl` (the global) instead of `this` in `onVideoLoaded2` [read] and `preloadCache` [round 1]. Init order matters (`videoManager` is created before `videoControl` but its constructor calls `updateVideoInfoForm`, DEBT-227).
- **Code:**
  - `labelBee.js`: `init`
  - `VideoControl.js`: `VideoControl`, `VideoControl.preloadCache`
  - `VideoList.js`: `VideoManager`
- **Links:** BEH-201, DEBT-227, SEAM-201

## DEBT-215: eval and hard-coded sample record in loadVideoManual

`loadVideoManual` starts from a hard-coded sample record (file `bf-cn_2025-01-30_01.cfr.mp4`, `starttime 2025-01-30T12:00:00`, `duration`, `nframes`, 3840x2160, fps `211/12`) [read]; `setVideoInfo` copies only `file_name`, `path`, `videofps`, `realfps`, `starttime`, `duration`, `nframes` [read], so `location`, `colony`, `notes`, `thumb` never reach `videoinfo`; `loadVideoManual` overwrites `nframes`, `width`, `height`, `videofps`, `realfps` and `duration` from `.stream.json`, but not `starttime`, so the sample `starttime` is the only value that leaks [read]. The default URL in the "From URI" prompt is the same sample path [read]. The `.stream.json` step evaluates `r_frame_rate` (a string like `"211/12"`) with `eval` [read]. When the URL does not match `^(.*?data)(\/.*\/)([^\/]+)$` (for example no second slash after `data`), the fallback builds `path = url.substring(0, lastIndexOf('/'))`, which keeps scheme and host [read]; `info.path = path` is then given to `setVideoInfo`, so `videoPath = url_for("/data") + path + "/" + file_name` is not a valid URL for an absolute URL [read].
- **Code:**
  - `VideoList.js`: `VideoManager.loadVideoManual`, `VideoManager.clickLoadVideoManual`, `VideoManager.setVideoInfo`
- **Links:** BEH-207, OQ-201

## DEBT-216: Frame offset and fps edits recompute inconsistently

`changeFrameOffset` calls `onVideoInfoChanged`, which recomputes `nframes = floor(duration * videofps)` ignoring the offset and overwriting the server's `nframes` [read]; `#frameoffset` is never refilled when `videoinfo` is replaced (new video has `frameoffset 0`, field keeps old text) [read]. `changeVideoFPS` calls `onVideoInfoChanged` too [read]; `rewind2/forward2..4` pass `videofps`, `videofps*10`, `videofps*60` frames, non-integers for fractional `videofps` (211/12) [read]. [round 1, not re-read]: the +/- step buttons use fixed 20/200 frames regardless of `videofps`. Behavior of `VideoFrame.__seek` with fractional frames is not verified.
- **Code:**
  - `VideoList.js`: `VideoManager.changeFrameOffset`, `VideoManager.changeVideoFPS`, `VideoManager.updateVideoInfoForm`
  - `VideoControl.js`: `VideoControl.onVideoInfoChanged`, `VideoControl.forward2`
- **Links:** BEH-211, BEH-220, OQ-205

## DEBT-217: Quick Help contradicts the code

[round 1, the Quick Help text was not re-read in round 2] Discrepancies recorded: modifier distances (Quick Help: Shift 1 s, Ctrl 1 min, Ctrl+Shift 10 min; code 1 s, 10 s, 60 s plus the fall-through of DEBT-201); arrow keys (Quick Help says Left/Right/Up/Down move the annotation box; code: Left/Right navigate frames, Up/Down are left to the browser [read]); Return (Quick Help says validate and save; code focuses `#I` [read], OQ-212); image zoom (Quick Help says Shift+wheel; in the code read earlier it is Alt+Ctrl+wheel for the image and Shift+wheel is the chronogram zoom when its option is on); `P` (mark/unmark pollen) does nothing (DEBT-206). Replacement: generate the help text from the single key map (DEC-005).
- **Code:**
  - `labelbee_page.html`: `#quickhelp`
- **Links:** BEH-250, BEH-251, BEH-253, DEC-004, DEC-005, DEBT-206, OQ-207, OQ-212

## DEBT-219: Frame bounds test lets NaN/undefined through

`seekFrame` and `forward` test `(frame<0)|(frame>=videoinfo.nframes)` with a bitwise `|`; `NaN` and `undefined` (empty or non-numeric `#currentFrame`, unset delayed seek) evaluate to false and are not rejected [read]. `rewind` in `video` mode has no bound test at all [read].
- **Code:**
  - `VideoControl.js`: `VideoControl.seekFrame`, `VideoControl.forward`, `VideoControl.rewind`
- **Links:** BEH-218, BEH-219, BEH-220

## DEBT-220: Cache-mode playback never stops at the end

At the last/first frame `seekFrame` rejects the request but `playTick` has already incremented `playFrame`, so `currentFrame != playFrame` stays true and `playTick` re-arms `requestAnimationFrame` forever with `playingState` still `playingForwards`/`playingBackwards` [read]. [round 1, not re-read]: in `video` mode the native `ended` event stops the listener, but `playingState` is not reset to `paused` (Space then pauses; the first press looks like it does nothing).
- **Code:**
  - `VideoControl.js`: `VideoControl.playTick`, `VideoControl.playPauseVideo`
- **Links:** BEH-223, BEH-225

## DEBT-221: Time conversions disagree on frameoffset; local ISO formatting

`getCurrentRealDate` (shown as "Real Time") is `starttime + toMilliseconds() * videofps / realfps` on the media time, which includes `frameoffset` (`seekFrame` requests media frame `f + frameoffset`), while `frameToTime(f)` subtracts it: `(f - frameoffset) / realfps` [read]. Which one is correct when `frameoffset != 0` is not known (OQ-206). `getCurrentVideoTime` is `video2.toMilliseconds() / 1000` [read]; how `toMilliseconds` rounds (VideoFrame library) is not verified. The local ISO formatter (`toLocaleISOString` in `updateVideoControlForm`) drops the timezone and appends milliseconds without zero padding (`.5` for 5 ms) [read].
- **Code:**
  - `VideoControl.js`: `VideoControl.getCurrentRealDate`, `VideoControl.frameToTime`, `VideoControl.getCurrentVideoTime`, `VideoControl.updateVideoControlForm`
- **Links:** BEH-210, BEH-211, BEH-228, OQ-206

## DEBT-223: Fixed 20 fps assumptions

[round 1, not re-read] Button steps `rewind(200)`, `forward(20)` etc., `trackWindow` presets (`setTrackWindow(20/200/1200)`), and several cache calls (`getFrameCropDataURL(..., 20, ...)` in `OverlayControl.js`) hard-code 20 fps while the app supports other rates (211/12 for beefeeder videos).
- **Code:**
  - `labelbee_page.html`: `#videocontrol`
  - `VideoControl.js`: `VideoControl.rewind2`
- **Links:** BEH-220, DEBT-216, OQ-205

## DEBT-224: Fullscreen call is WebKit-only and has dead code

`toggleFullScreen` computes an unused `main` and calls `document.body.webkitRequestFullscreen()` only (unprefixed API missing) [read].
- **Code:**
  - `labelBee.js`: `toggleFullScreen`
- **Links:** BEH-257

## DEBT-225: Template markup defects in the video block

[round 1, not re-checked in round 2] `onchange="videoControl.playRateInputChanged()""` and `onkeypress="onKeyDown_NewIDEdit(event)""` carry a doubled quote; a stray `</p>` in `#beeInfo`; `Show Rect/ID/Labels/Notes` buttons are duplicated in two Options sub-panels (same class, so both update together); two elements share `id="tagsFromServer"`; `checked="false"` attributes on checkboxes mean checked (attribute presence), the real defaults are set elsewhere; the `Use Cache` button exists twice (Video block and Options > Display) sharing one option. Also `<link rel="icon" href="images/...">` and the script `src` attributes are relative paths [read]. Replacement: clean the template when it moves to components.
- **Code:**
  - `labelbee_page.html`: `#videocontrol`, `#tagsFromServer`
- **Links:** BEH-259

## DEBT-226: Dead collapse-event code and debug output in init

`init` binds `collapsibleexpand` / `collapsiblecollapse` handlers on `.inline-collapsible` blocks and defines `refreshCollapsible`, but the calls that would trigger these events in the header click handler are commented out [read]; only the handlers inside `labelBee.js` were read, so a trigger from another file is not excluded [inferred: never triggered]. The click handler also logs `'DONE\n\n'` to the console at every click [read]. Replacement: delete the dead handlers and the log.
- **Code:**
  - `labelBee.js`: `init`
- **Links:** BEH-216

## DEBT-227: `.video_id` shows `#video_id=undefined` before any video

The `VideoManager` constructor calls `this.updateVideoInfoForm()` (line 60 of `VideoList.js`) before it assigns `this.currentVideoID = 0` (line 87) [read: statement order; lines 1-95 of the constructor contain no earlier assignment]. `updateVideoInfoForm` renders `.video_id` as a link `#video_id=<encodeURIComponent(currentVideoID)>` with text `#video_id=<currentVideoID>`, so before any video is chosen the page shows `#video_id=undefined` instead of the markup placeholder `ID=??` [inferred from the order]. Replacement: initialise the field before the first form refresh.
- **Code:**
  - `VideoList.js`: `VideoManager`, `VideoManager.updateVideoInfoForm`
- **Links:** BEH-210, DEBT-214

## DEBT-228: videoLoad status row: request logged at completion, error before any request

`onVideoLoaded2` calls `statusWidget.statusRequest("videoLoad")` and immediately `statusUpdate("videoLoad", true)`, so the I/O Status row always reports about 0 s for the load [read]. `StatusWidget.statusUpdate` writes `this.statusInfo[type].done` and reads `.request`, which exist only after `statusRequest(type)`; `onVideoError` calls `statusUpdate("videoLoad", false)` and the only `statusRequest("videoLoad")` calls in the code are in `onVideoLoaded2` and the obsolete `onVideoLoaded` [read: grep], so on the first load error of a page `statusInfo["videoLoad"]` is undefined and the call throws before `isValidVideo` is cleared, the canvas size reset and the refresh applied [read]. Replacement: record the request when the load starts (`loadVideo2`), update on both outcomes.
- **Code:**
  - `VideoControl.js`: `VideoControl.onVideoLoaded2`, `VideoControl.onVideoError`
  - `labelBee.js`: `StatusWidget`
- **Links:** BEH-206, BEH-234, BEH-258

## DEBT-229: Features init uses a block id that does not match the checkbox handler

`init` syncs the Features checkboxes with the list `[["showTimeline","timelineTab"], ["showFocusInterval","focusIntervalTab"], ...]`, while the `onchange` handler of `#showTimeline` toggles `timeline` and `timelineBR` and the markup block is `id="timeline"` [read]; no `timelineTab` element appears in the markup read, so the init call for Timeline has no effect [inferred]. `init` also toggles only the block, never the `...BR` spacer that the `onchange` handlers toggle [read]. `toggleHidden` is defined in an inline script of `labelbee_page.html`, not in `labelBee.js` [read]. Replacement: one binding table used by both init and the handlers.
- **Code:**
  - `labelBee.js`: `init`
  - `labelbee_page.html`: `#showTimeline`, `#features`
- **Links:** BEH-215

## DEBT-230: Hard-coded gurabo4 video+tracks loader

`clickLoadTracksTaggedCSVFromServer` (button "gurabo4 video+tracks_tagged") loads a video from the dataset `gurabo4` (path `/datasets/gurabo4/mp4/<col_videoname>`) and its `.tracks_tagged.csv` with hard-coded dataset names, calls `videoManager.loadVideoManual` without awaiting it and requests the tracks right after, and its cancel branch logs the name of another function [read]. It is a sixth, undocumented entry point of video loading, living in the annotation IO file. Replacement: remove with the dev-only code paths or generalise (OQ-201).
- **Code:**
  - `AnnotationIO.js`: `clickLoadTracksTaggedCSVFromServer`
- **Links:** BEH-202, BEH-232, DEBT-204, OQ-201

## DEBT-301: Default renderer omits tag intervals, crosses, parts and individual events

`renderActivities` draws only intervals, entering/leaving/pollen/fanning classes, dangling marks and selection when `chrono.config.legacyActivities` is false (default, no UI). Tag rects (`renderTagIntervals`), `crossLeft` crosses for falsealarm/wrongid, `partsAvailable` squares, `obsspan`/`alertcircle` (individual events) and `circle.obs` live only in `ChronoControlActivitiesLegacy.js` and run only through `updateActivities`. The page options "Show Tags", "Show Individual Events", "Highlight events with parts", "Show on Chrono" therefore do not change what is drawn. [read] `labelbee/static/labelbee/js/ChronoControl.js:36` (console hint for the legacy flag), `labelbee/static/labelbee/js/ChronoControl.js:918` (`updateChrono` calls `renderActivities` and `updateTagIntervals`, never `renderTagIntervals`); the legacy-file claims were read in the first pass and not re-checked. Intended replacement: unknown (OQ-301); either port these layers to `ChronoIntervals` or drop the options.
- **Code:**
  - `ChronoControl.js`: `renderActivities`, `updateChrono`
  - `ChronoControlActivitiesLegacy.js`: `updateActivities`, `renderTagIntervals`, `renderChrono_Parts`
- **Links:** BEH-326, BEH-327, BEH-329, BEH-344, BEH-345, CAP-303, CAP-304, OQ-301

## DEBT-302: Chronogram is a god object over free globals

`Chronogram` assigns itself to the global `chrono` (`chrono = this`, TODO in code) and the module defines/uses undeclared globals: `axes`, `chronogramData`, `tagsChronogramData`, `restrictID`, `restrictIDArray`, `excludeID(Array)` (set only by `onExcludeIDChanged`, not by `initChrono`), `flag_*`, `eventSeekMode`, `chronoItemHeight`, `svgSpanRects`, `svgTag`, `svgInterval`, `svgTop`, `videoSpan`, `trackWindowSpan`, `tagSel`, `chronoIntervals`, `flatTracksAll/Valid/GroupById`, `rectIntervals`, `circlesIntervals`, `acts`, `obs` (leaked loop variable in `updateFlatTracks`), `rank`, `center`, `plotArea` (in `ChronoAxes`), and `options` (assigned without declaration in `initChrono`). Hard-coded selectors `#chronoTab`, `#chronoDiv`, `#svgVisualize`, `#canvasresize`, `#labelingTab`. [read] `labelbee/static/labelbee/js/ChronoControl.js:161-206`, `labelbee/static/labelbee/js/ChronoControl.js:1041` (`obs = Tracks[F][id]` without declaration). Intended: a self-contained module owning its state, receiving the DOM container and a data provider.
- **Code:**
  - `ChronoControl.js`: `Chronogram`, `initChrono`
  - `ChronoAxes.js`: `ChronoAxes`
- **Links:** BEH-301, BEH-342, SEAM-301

## DEBT-303: Wrong comment/behavior for the pan clamp

`onZoom` comment says "Make videoSpan always take at least 10% of the view" but `pleft` and `pright` are both the view center (`range0 + 0.5*width` and `range1 - 0.5*width`), so the video can only be dragged until its first frame reaches the center (or last frame leaves it). [read] `labelbee/static/labelbee/js/ChronoAxes.js:708-731`. Intended: either fix the comment or implement the 10% rule.
- **Code:**
  - `ChronoAxes.js`: `onZoom`
- **Links:** BEH-305

## DEBT-304: xdomainFocus uses a zoom API that D3 no longer has (TypeError)

`xdomainFocus` calls `zoom.translate()`, `zoom.scale()` and `zoom.translate([..])`/`zoom.scale(..)` (the D3 v3 zoom API, removed in D3 v4). The page code uses the D3 v6 API (`d3.zoom().on`, `d3.pointer(event)`, `zoom.translateBy`, `zoom.scaleTo` in `labelbee/static/labelbee/js/ChronoAxes.js:687-705`), and the zoom behaviour only exposes `transform`, `scaleBy`, `scaleTo`, `translateBy`, `translateTo`, `extent`, `scaleExtent`... The first statements of `xdomainFocus` (`let oldT = zoom.translate()`, `labelbee/static/labelbee/js/ChronoAxes.js:125`) are expected to throw an uncaught `TypeError` ("zoom.translate is not a function"); no try/catch appears around it in the code seen and nothing reports the failure in the UI. Everything that goes through it is affected: Z+/Z- (`scaleTimeDomain`), shift buttons (`shiftTimeDomain`), `xdomainScale`, the Follow button and per-frame follow (`focusTrackWindow`), `onAxesDblClick`. `xdomainCenter` also reads an undeclared `center`. The loaded build (v6.2.0 per the page script tag) was not part of the re-check; not run: needs verification in a browser (Phase 1d). Proposed replacement (pending OQ-302): `zoom.transform` with a computed `d3.zoomIdentity`.
- **Code:**
  - `ChronoAxes.js`: `xdomainFocus`, `xdomainScale`, `xdomainCenter`
  - `OverlayControl.js`: `focusTrackWindow`
- **Links:** BEH-310, BEH-312, BEH-334, OQ-302

## DEBT-305: Redraw and layout are expensive and loop-prone

Each pan/zoom/resize event runs `updateChrono` (full render of visible intervals plus `updateTagIntervals` rebuild of all tag intervals, DEBT-311). `updateChrono` must avoid anything that emits `axes:changed` (comment). A wheel notch calls `zoom.translateBy` then `zoom.scaleTo` (`labelbee/static/labelbee/js/ChronoAxes.js:699-705`); each changes the transform and is expected to run `onZoom` -> `refreshAxes` -> `axes:changed` -> `updateChrono`, so two full redraws per notch [inferred, to verify by counting `updateChrono` calls]. `chronoAdjust` creates a new `debouncer` per call and `refreshChronoLayout` does `debouncer(doRefresh)()` with a fresh debouncer each time; `debouncer` keeps `timeoutID` in a per-instance closure (default 100 ms, `labelbee/static/labelbee/js/ChronoControl.js:1849-1860`), so calls are delayed but never coalesced; `debouncer(refreshChronoLayout, 300)` at the end of `initChrono` creates a function that is never called (first reading); `getChronoItemHeight` contains a stray `console.trace` (`labelbee/static/labelbee/js/ChronoControl.js:488`); `ChronoIntervals.render` is invoked twice per redraw (`updateAndRender` then `render`, first reading). [read] `labelbee/static/labelbee/js/ChronoControl.js:273-287`, `labelbee/static/labelbee/js/ChronoControl.js:492-548`, `labelbee/static/labelbee/js/ChronoControl.js:902-937`.
- **Code:**
  - `ChronoControl.js`: `updateChrono`, `chronoAdjust`, `getChronoItemHeight`, `renderActivities`, `refreshChronoLayout`
  - `ChronoAxes.js`: `onZoom`
- **Links:** BEH-305, BEH-311, BEH-313, BEH-347, INV-002

## DEBT-306: ID axis ordering and remap fall-through

`updateChronoYDomain` always takes the `idAxisMap` branch (the map is always defined, identity by default), so the `sortIds` order is replaced by a numeric sort `(a,b) => -Number(b)+Number(a)`; for non-numeric IDs (`F12`, tag-like strings) the comparator returns NaN. The `else` branch is dead. Modulo remap prompt has no validation; the `idAxisMap` text input path is commented out in the page and the code references an invalid selector `$('#')`. `updateChronogramData` computes an unused `id_eff = Number(id)%50`. The remap is also applied inside the data pipeline: `updateTagIntervals` sets `y = chrono.config.idAxisMap(id)` on each tag interval (and the interval builder does the same for events), so the view depends on the remap being applied upstream (SEAM-302). [read] `labelbee/static/labelbee/js/ChronoControl.js:692-707`, `labelbee/static/labelbee/js/ChronoControl.js:1093`, `labelbee/static/labelbee/js/ChronoControl.js:1448`, `labelbee/static/labelbee/js/ChronoControl.js:1462`.
- **Code:**
  - `ChronoControl.js`: `updateChronoYDomain`, `click_setIdAxisMap`, `idAxisMap_inputChanged`, `update_idAxisMap_input`, `updateTagIntervals`, `updateChronogramData`
- **Links:** BEH-315, BEH-318, SEAM-302

## DEBT-307: Four label colors hard-coded in CSS and JS

Interval colors and classes `entering`, `leaving`, `pollen`, `fanning` are hard-coded in `renderEnterLeavePollen` and `.interval.*` in `labelbee/static/labelbee/css/custom.css:871-892`; wrongid/falsealarm have no color in the default renderer. Legacy colors differ (`activityColor`, `setGeomActivity`). DEC-003 (open label vocabulary) does not say how colors should be defined; whether a label registry should provide colors is open (OQ-305).
- **Code:**
  - `ChronoControl.js`: `renderEnterLeavePollen`
  - `ChronoControlActivitiesLegacy.js`: `activityColor`, `activityHeight`
- **Links:** BEH-321, DEC-003, OQ-305

## DEBT-308: Hard-coded ROI and dangling-mark colors

Dangling marks use the global `ROI = {left:175, top:250, right:2305, bottom:1240}` ("Gurabo 5MP") even when `flag_useROI` is off; the commented `//if (flag_useROI)` in `updateChronogramData`. With `hide_non_dangling` true (lazy default, `labelbee/static/labelbee/js/ChronoControl.js:1711`) the green case is unreachable; with false, start and end marks are colored independently (green when the corresponding end is outside the ROI). [read] `labelbee/static/labelbee/js/ChronoControl.js:1702-1741`, `OverlayControl.js:47` (first reading).
- **Code:**
  - `ChronoControl.js`: `renderChrono_danglingTracks`
  - `OverlayControl.js`: `ROI`
- **Links:** BEH-324, OQ-308

## DEBT-309: Show Events off leaves stale intervals

`updateChronoData` clears `chronogramData` but only reassigns `allIntervals` inside `createIntervalList`, which is skipped when `showObsChrono` is false. The old `allIntervals` remain drawn, with `y` values possibly missing from the new y domain (first reading, `updateChronoData` not re-checked). Intended: clear `allIntervals` (and crosses, rect/circle/parts subsets).
- **Code:**
  - `ChronoControl.js`: `updateChronoData`, `createIntervalList`
- **Links:** BEH-325, CAP-802

## DEBT-310: Legacy file contains live and dead code, and is always loaded

`ChronoControlActivitiesLegacy.js` (808 lines) is loaded by the page and mixes: dead code (`createIntervalList_legacy`, `initActivities`, `removeActivities` unused outside console hint, activity helper functions), legacy renderers reachable only via a console flag, and live functions (`initTagIntervals`/`renderTagIntervals` called at init with empty data). It creates/removes `.tooltip` elements (detaches `chrono.tooltip`) and uses globals set elsewhere. [read] `labelbee_page.html` script tags, `labelbee/static/labelbee/js/ChronoControl.js:36` (first reading for the legacy-file content). Proposed, pending OQ-301: remove after DEBT-301 is resolved.
- **Code:**
  - `ChronoControlActivitiesLegacy.js`: `createIntervalList_legacy`, `initActivities`, `removeActivities`, `initTagIntervals`
- **Links:** BEH-327, BEH-329, DEBT-301, OQ-301

## DEBT-311: Redraw overwrites labeled/virtual tag intervals

`updateChrono` calls `updateTagIntervals()` (a data function) on every redraw. It resets `tagIntervals` to the raw list with `labeling = {}` (object literals at `labelbee/static/labelbee/js/ChronoControl.js:1450-1458` and `labelbee/static/labelbee/js/ChronoControl.js:1464-1472`), losing: labels from `updateTagsLabels` (`labeled`, `entering`, `falsealarm`, `wrongid`), virtual `wrongid` intervals, the hide-invalid filter (applied in `updateChronoData`, `labelbee/static/labelbee/js/ChronoControl.js:1001-1005`) and the `showTagsChrono` switch. Consequently `isNotLabeled` (`!element.labeling.labeled`) is true for every interval and the `freetag` seek mode behaves as `tag` mode; "Hide FA/WrongID" does not affect `tag` navigation. Likely a half-finished edit (a render call was replaced by the data function). [read] `labelbee/static/labelbee/js/ChronoControl.js:918`, `labelbee/static/labelbee/js/ChronoControlInteraction.js:118-120`. Needs confirmation by running (OQ-303).
- **Code:**
  - `ChronoControl.js`: `updateChrono`, `updateTagIntervals`, `updateTagsLabels`, `updateChronoData`
  - `ChronoControlInteraction.js`: `isNotLabeled`, `findNextFreeTagEvent`
- **Links:** BEH-328, BEH-330, BEH-336, BEH-348, OQ-303

## DEBT-312: Dead interaction code

Dead or inactive: `axes.onClick`/`onAxesChanged` callbacks (replaced by jQuery events, commented out in `initChrono`), `onZoom0`, `triggerEvent`, `domainy*` (commented), `nextSeekFocusWindow` (no caller found), `eventSeekMode`-related `gotoEvent_seekCB`; the custom `onAxesDblClick` is possibly shadowed by d3's `dblclick.zoom` (unverified, see BEH-334). [read] `labelbee/static/labelbee/js/ChronoAxes.js:913-960`, `labelbee/static/labelbee/js/ChronoControl.js:194-195`.
- **Code:**
  - `ChronoAxes.js`: `onZoom0`, `triggerEvent`
  - `ChronoControlInteraction.js`: `nextSeekFocusWindow`, `onAxesDblClick`
- **Links:** BEH-334, BEH-340

## DEBT-313: Navigation sorts shared arrays in place and mixes id types

`findNext*/findPrevious*` call `.sort` on the list they search: `tagIntervals` itself (`tag` mode, AutoSeek on), `flatTracksAll`/`flatTracksValid` (`event` mode AutoSeek on, and every `eventframe` search), `flatTracksAllGroupById[id]`/`flatTracksValidGroupById[id]` (`event` mode, AutoSeek off); `freetag` and non-auto `tag` sort a filtered copy. This mutates shared derived data, each call re-sorting with different comparators. `frame` fields are strings (from `for F in Tracks`) compared via `Number()`; IDs are compared with loose `==`; `getIdCoord` returns undefined for IDs without a row, the comparators then return NaN, which sort treats as a tie (order unspecified) and the "greater than" tests are false (such events are skipped). `flag_hideFlowers` is not applied in `updateFlatTracks` (`labelbee/static/labelbee/js/ChronoControl.js:1029-1078`), so `eventframe` navigation can stop on hidden flower IDs. [read] `labelbee/static/labelbee/js/ChronoControlInteraction.js:103-125`, `labelbee/static/labelbee/js/ChronoControlInteraction.js:295-412`.
- **Code:**
  - `ChronoControlInteraction.js`: `findNextObsEvent`, `findPreviousObsEvent`, `findNextEventFrame`, `findNextTagEvent`, `getIdCoord`
- **Links:** BEH-336, BEH-337, BEH-348, CAP-802

## DEBT-314: Next/Prev ID blocked by RestrictID; side effects

`onClickNextID`/`onClickPrevID` take the visible rows (`validVisibleTagIdsDomain`, from `axes.ydomain()`) as cycle; when RestrictID is active that is only the restricted IDs, so the buttons stay on the same ID. They also call `setRestrictID(newID)` (overwrites the RestrictID text field/array even when the restriction is off; it refreshes the chronogram when `flag_restrictID` is on, `labelbee/static/labelbee/js/ChronoControl.js:356-371`) and end with `refreshChronogram()`, so there are two refreshes when the restriction is on. `onClickPrevID(gotoLast)` parameter is never passed by the page. [read] `labelbee/static/labelbee/js/ChronoControlInteraction.js:436-457` (`onClickNextID`).
- **Code:**
  - `ChronoControlInteraction.js`: `onClickNextID`, `onClickPrevID`
  - `ChronoControl.js`: `setRestrictID`
- **Links:** BEH-339

## DEBT-315: "Show on Chrono" button is outside the synchronisation class

The button "Show on Chrono" has class `buttonShowPartsOnChrono` (`labelbee/blueprints/labelbee/templates/labelbee_page.html:1152`) while `updateButtons("button_showPartsOnChrono", flag)` selects `button.button_showPartsOnChrono` and `input.button_showPartsOnChrono` (`labelbee/static/labelbee/js/ChronoControl.js:312-326`); only the checkbox "Highlight events with parts" (page:1266) matches. The button's `active` class is flipped by `toggledNewState` on its own clicks only, so it can disagree with `flag_showPartsOnChrono` (checkbox toggled, or init reset). Also the checkboxes at page:1262 and :1266 have the HTML attribute `checked="false"`, which means checked; the unchecked default only holds because `initChrono` resets them (`labelbee/static/labelbee/js/ChronoControl.js:177-178`). Intended: one class per synchronised control group, no `checked` attribute for a default-off option.
- **Code:**
  - `ChronoControl.js`: `onToggleButton_showPartsOnChrono`, `updateButtons_showPartsOnChrono`, `toggledNewState`, `updateButtons`
- **Links:** BEH-344, BEH-345, SEAM-303

## DEBT-316: Chronogram file writes annotations

Two functions of the display file modify `Tracks`: `augmentTrackWithTag` sets `Tracks[F][id].tag = Tags[F].tags[i]` for each (frame, id) present in both (`labelbee/static/labelbee/js/ChronoControl.js:1015-1026`), and `cleanObsoleteEvents` deletes `Tracks[F][id]` for flagged observations after a `confirm`, then calls `refreshChronogram()` (`labelbee/static/labelbee/js/ChronoControl.js:1983-2021`, button `#cleanObsoleteEventsButton`). The first adds a derived field to the live annotation objects (which can end up in a save, to check in group 7); the second is a destructive edit that bypasses the annotation model and conflicts with INV-001. Intended: derived links computed outside `Tracks`, destructive cleaning owned by the annotation/filter area (pending OQ-310).
- **Code:**
  - `ChronoControl.js`: `augmentTrackWithTag`, `cleanObsoleteEvents`, `cleanObsoleteEventsCB`
- **Links:** BEH-342, BEH-343, INV-001, SEAM-302, OQ-310

## DEBT-317: Selected-ID outline for an ID without a row

`refreshIdSelection` appends the `rect.selection` whenever `axes.selectedID != null`, with `y = axes.yScale(axes.selectedID)`. For an ID not in the y domain (absent from the data, filtered out, or an unmapped ID in modulo remap mode) `yScale` returns undefined; by d3 `attr` semantics (`null`/`undefined` removes the attribute) the rect is then expected to have no `y` and appear at the top of the plot [inferred, to verify in a browser]. [read] `labelbee/static/labelbee/js/ChronoAxes.js:613-626`. Intended: draw no outline for an ID without a row.
- **Code:**
  - `ChronoAxes.js`: `refreshIdSelection`, `selectId`
- **Links:** BEH-317, BEH-318, OQ-306

## DEBT-318: Tag branch of validTagIdsDomain reads a field tag intervals do not have

`validTagIdsDomain` filters hidden tag IDs with `containsLabel(d.labels, "wrongid")` / `"falsealarm"` (`labelbee/static/labelbee/js/ChronoControl.js:597-613`), but tag intervals built by `updateTagIntervals` have `labeling` (an object) and no `labels` (`labelbee/static/labelbee/js/ChronoControl.js:1450-1458`). With `d.labels` undefined the filter excludes nothing: `containsLabel` (defined in `SelectionControl.js`, `labelbee/static/labelbee/js/SelectionControl.js:861-869`) returns false for null/undefined labels; no code seen sets `labels` on tag intervals. The effective hide-invalid filter is in `updateChronoData` on `interval.labeling` (`labelbee/static/labelbee/js/ChronoControl.js:1001-1005`) and runs before the y domain is built. The branch is only reached when `tagMode != 'Tracks'`. Intended: one hide-invalid rule on the field that exists.
- **Code:**
  - `ChronoControl.js`: `validTagIdsDomain`, `updateChronoData`, `updateTagIntervals`
- **Links:** BEH-315, DEBT-311

## DEBT-401: plotTag leaves the canvas state unbalanced

In `plotTag`, the selected-tag branch for the current frame ends with `ctx.restore()` for which the critic review found no matching `ctx.save()` (restores a state saved by a caller, or nothing). The branch for the selected ID in another frame calls `ctx.save()` with no `restore()`, and its second path `ctx.arc(radius+2)` in yellow, width 3, is never stroked. [read] `labelbee/static/labelbee/js/OverlayControl.js` (`plotTag`: restore at the end of the first branch, save at the start of the second, no stroke after the second arc). Intended: balanced save/restore per call; decide whether the yellow ring is wanted.

- **Code:**
  - `OverlayControl.js`: `plotTag`
- **Links:** BEH-438, BEH-437

## DEBT-402: Dead `Tags` branch of `getTag` and global `tagMode`

`tagMode` is a global assigned only once at the top of `OverlayControl.js`, read in `getTag` and in `ChronoControl.js`, and never assigned elsewhere, so the `Tags[frame].tags` lookup branch of `getTag` is unreachable. [read] Intended: remove, or make an explicit parameter of the data source.

- **Code:**
  - `OverlayControl.js`: `getTag`, `tagMode`
  - `ChronoControl.js`: `augmentTrackWithTag`
- **Links:** BEH-436

## DEBT-403: Dead code in the overlay file

Functions with no caller found: `predictId` (only a comment refers to it), `identify`, `redrawVideoFromCache`, `drawImageToCanvas`, `openVideoNewTab` (its button is commented out in the page, not re-read), and `doSwap2` in the pick-frame panel of `hardRefresh` (defined, attached to no button). The non-copy branch of `redrawVideoFrame` (`flagCopyVideoToCanvas` false) is unreachable: `VideoControl.js` sets the flag to true in its constructor and never assigns it elsewhere (so are the `if (true)` / `else` halving branch of `canvasSetVideoSize`). [read] Intended: delete after confirming no external use.

- **Code:**
  - `OverlayControl.js`: `predictId`, `identify`, `redrawVideoFromCache`, `drawImageToCanvas`, `openVideoNewTab`, `hardRefresh`
- **Links:** BEH-423, BEH-412, BEH-450

## DEBT-404: ID prediction conflict path and string ID arithmetic

(a) `defaultIfIDExists(predictStruct)` returns `predicted_obs: obs` on a conflict although `obs` is neither a parameter nor declared in the function [read]: it reads a leaked global `obs` (assigned as an implicit global elsewhere, so a stale object) or throws a `ReferenceError` on every conflict [which one depends on load state, inferred]; (b) on a conflict it returns no `obs` for the geometry (`predicted_obs` is not read by the caller), so `onMouseDown_predict` falls into the "no prediction" branch and the geometry of the matched observation is not reused [read]; (c) in that branch `while (exists) id = id + 1` concatenates when `id` is a string (`"1"` becomes `"11"`), latent because `computeDefaultNewID` already returns a free ID [read]; (d) `computeDefaultNewID` returns the number `0` for an empty frame and strings otherwise [read]. Intended: ID normalisation in one place (IDs are strings, ENT-001), conflict handling returns the predicted geometry.

- **Code:**
  - `OverlayControl.js`: `defaultIfIDExists`, `onMouseDown_predict`, `computeDefaultNewID`
  - `SelectionControl.js`: `deleteEvent`
- **Links:** BEH-422, BEH-423, ENT-001

## DEBT-405: submit_bee failures are silent or misreported

(a) `submit_bee` for a `db` box whose observation is missing from `Tracks` logs "Writing anyway" but prints "Internal issue", returns true before writing; the edit is silently lost. (b) `onKeyDown_IDEdit` calls `submit_bee(activeObject)` for a `new` box and ignores the result: when the ID already exists (red "Conflict of ID" message, nothing stored) it still sets `defaultSelectedBee` to the new ID and prints the green "ID changed + submitted", leaving the box with the attempted ID but unsaved. (c) `submit_bee` ignores the argument passed by `labelBee.js` (two call sites). [read] `labelbee/static/labelbee/js/SelectionControl.js` (`submit_bee`), `labelbee/static/labelbee/js/labelBee.js` (`onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`). Intended: decide to write or fail loudly (INV-001); a refused commit must not report success (OQ-408).

- **Code:**
  - `SelectionControl.js`: `submit_bee`
  - `labelBee.js`: `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
- **Links:** BEH-433, BEH-434, BEH-453, INV-001, OQ-408

## DEBT-406: Two parallel encodings of labels in overlay drawing and creation

Box text uses `obs.labels` (BEH-456) while track dots use `activityString(obs)` from `bool_acts` (BEH-442); `updateObsActivityFromForm` and `setLabels` rewrite `bool_acts[0..3]` from labels; Shift+click copies only `bool_acts[0]` and `bool_acts[1]` from the predicted observation and not the `labels` string, so the new observation has diverging `bool_acts` and `labels`. `activityString` hard-codes the letters F, P, E, L. [read] `OverlayControl.js` (`onMouseDown_predict` lines copying `bool_acts[0]`, `bool_acts[1]`; `plotTracks`, `setLabels` as first read). Intended: one label source, `bool_acts` derived by a shim (DEC-003, OQ-006).

- **Code:**
  - `OverlayControl.js`: `activityString`, `updateObsActivityFromForm`, `setLabels`, `onMouseDown_predict`, `plotTracks`
- **Links:** DEC-003, BEH-422, BEH-442, BEH-448, BEH-456

## DEBT-407: Module state held in implicit globals

`canvasTransform`, `transformFactor`, `canvasTransformReference`, `extraScale`, `default_width/height`, `lockFocusTrackWindow`, `flag_useROI`, `ROI`, `flag_useExcludeRects`, `excludeRects`, `excludeRectSelection`, `showObs`, `showObsTracks`, `showObsChrono`, `showTags`, `showTagsTracks`, `showSelectedTagsTracks`, `showTagsOrientation`, `showTagsChrono`, and the filter functions `tagsSampleFilter`, `tagsHammingSampleFilter`, ... are assigned without `var/let/const` (or at module level) inside the constructor and handlers, and read by `ChronoControl.js` and others. Painting helpers also leak `color`, `radius`, `font`, `setColor`, `cx`, `cy`, `rect`; loop variables leak too (`i` in `drawTimelineCurrentObject`, `delta` in `TimelineWidget`). The global `overlay` is used inside prototype methods and free functions. [read] (constructor assignments of the display flags; first reading for the rest). Intended: owned by explicit objects (view transform, display flags, filter state), see SEAM-401..406.

- **Code:**
  - `OverlayControl.js`: `OverlayControl`, `plotTracks`, `refreshTagsParameters`, `drawTimelineCurrentObject`, `TimelineWidget`
- **Links:** BEH-407, BEH-410, BEH-446, SEAM-403

## DEBT-408: Canvas sizing issues

(a) The initial `overlay.videoSize` is `{x: 600, y: 400}` while all code reads `.w`, `.h` [read: the constructor sets `overlay.videoSize = { x: 600, y: 400 }`]; any resize before the first video yields NaN. (b) `refreshCanvasSize` with `logging.canvasEvents` on dereferences `event.target` although `canvasSetVideoSize` calls it with no event (TypeError) [read]. (c) `canvasSetVideoSize` writes `#canvasresize` as `(canvas+16+2) x (canvas+2)` and `refreshCanvasSize` reads it minus 4 and writes `+2` back, so after each video load the canvas is a fixed 2 px smaller than computed; this is not cumulative per load (`canvasSetVideoSize` overwrites the style first); whether the user resize (`resizestop`) accumulates the loss was not shown by the evidence [read, arithmetic]. (d) With `flagCopyVideoToCanvas` false the `<video>` element underneath would not be transformed by the zoom; moot while the flag is always true (DEBT-403). (e) `selectboxSetOptions` tests a local `name` that is always undefined, and its `names` argument is never used [read]. Intended: a single sizing function with a defined contract.

- **Code:**
  - `OverlayControl.js`: `canvasSetVideoSize`, `refreshCanvasSize`, `selectboxSetOptions`, `redrawVideoFrame`
- **Links:** BEH-404, BEH-406

## DEBT-409: Box clone omits span, predicted and tag; drawing re-reads Tracks; transparent prediction crashes (severity H)

`cloneObs`/`copyObs` do not copy `span`, `predicted` or `tag`, so `identifyBeeRect` re-reads them with `getObsHandle(frame, ID)`. For a pending (`new`) box with no stored observation that lookup returns undefined and, with `showPredictedStatus` on, `obs.predicted` throws a TypeError inside `_render` (after `ctx.save()`, never restored) on every redraw while such a box exists. [read] `OverlayControl.js` (`identifyBeeRect`), `Model.js` (`getObsHandle` returns undefined for a missing entry; `cloneObs` calls `copyObs`, which copies no `span`, `predicted` or `tag`, and copies `parts` and `visit` by reference). Intended: the view reads from an explicit view model; guard the lookup.

- **Code:**
  - `OverlayControl.js`: `identifyBeeRect`
  - `Model.js`: `cloneObs`, `copyObs`, `getObsHandle`
- **Links:** BEH-417, BEH-418, OQ-411

## DEBT-410: Interactive creation details

(a) `fixRectSizeAfterScaling` for a negative width (or height) sets `width = -width` then `left = left - width`; the Fabric box has center origin (`left`, `top` are the center, as the comment in `onMouseDown_interactiveRect` states), so the center moves by the width: a box dragged to the left or up is displaced instead of kept [read, arithmetic]. (b) Any single mouse move validates the new box (`rect.validated = true`; "need dragging a bit" is only a comment). (c) `onMouseDown_interactiveRect` logs `startX, startY` before they are assigned. (d) `fixRectSizeAfterScaling` also mutates the global default box size as a side effect of every move and scaling. [read] Intended: validate by a minimum drag distance (to decide).

- **Code:**
  - `OverlayControl.js`: `fixRectSizeAfterScaling`, `onMouseDown_interactiveRect`
- **Links:** BEH-424, BEH-425

## DEBT-411: User-typed JavaScript executed with Function(); odd color coefficient

`refreshTagsParameters` compiles the text of `#tagsSampleFilter` and `#tagsIDFilter` with `Function(...)` on every parameter change, with no error handling: a syntax error throws in the handler, aborting the rebuild (the sample filter is compiled first) and the refresh. The text of `#tagsIntervalFilter` is compiled inside the filter closure at each call instead, so its errors surface in the chronogram. The RGB filter uses the luma coefficient 0.1114 for blue (standard 0.114). [read] Intended: a declarative filter set (CAP-801).

- **Code:**
  - `OverlayControl.js`: `refreshTagsParameters`
- **Links:** BEH-445, BEH-455, CAP-801

## DEBT-412: hardRefresh does too much

`hardRefresh` redraws, rebuilds all boxes, runs the selection logic, builds the pick-frame panel DOM with jQuery (buttons and closures capturing `obs`), writes `span` into `Tracks` as a side effect of redrawing, and uses the global `overlay` instead of `this`; every edit and every frame change takes this full path (INV-002). The HTML also has a duplicated id `pickflowerdiv` (first reading, page not re-read), and the same `overlayOpts-*` buttons are duplicated in two panels. [read] `OverlayControl.js` (`hardRefresh`: `overlay.canvas1.clear()`, the `span` write, the panel construction). Intended: separate render from interaction-mode UI; pure redraw.

- **Code:**
  - `OverlayControl.js`: `hardRefresh`, `setInteractionMode`
  - `labelbee_page.html`: `#pickflowerdiv`
- **Links:** BEH-402, BEH-440, BEH-450, INV-002, SEAM-404

## DEBT-413: TimelineWidget zoom and size buttons are broken

In `TimelineWidget.prototype.onClick`, the zoom case multiplies `this.zoom`, a property that is never set (the field is `zoomScale`), giving NaN, and `redraw` does not use it anyway; `update()` replaces the content of `#timelineblockdiv` with an empty "TIMELINE: " plus a new empty list, dropping the images and buttons built by `create()`, then resizes the detached images. `timelineMaxDelta` is "Not implemented" and its buttons are commented out. [read] `labelbee/static/labelbee/js/OverlayControl.js` (`TimelineWidget`). Whether the widget is instantiated and shown is group 6 (CAP-602, OQ-410).

- **Code:**
  - `OverlayControl.js`: `TimelineWidget`
- **Links:** BEH-451, OQ-410

## DEBT-414: Experimental timeline preloads the wrong frames

`drawTimelineCurrentObject` passes the offsets `[-16, -8, ..., 16]` to `videoCache.preloadFrames` as if they were frame numbers (absolute frames -16..16), while the crops are then requested at `obs.frame + offset`; the preload thus warms frames near the start of the video instead of those around the event, and requests negative frames. The "select an annotation" check also runs only after the pause and preload, once per offset (11 times). [read] `OverlayControl.js` (`drawTimelineCurrentObject`, `getFrameCropCurrentObject`). Intended: preload `currentFrame + offset` clamped at 0, check the selection first.

- **Code:**
  - `OverlayControl.js`: `drawTimelineCurrentObject`, `getFrameCropCurrentObject`
- **Links:** BEH-441, OQ-410

## DEBT-415: Pick Flower reads flowers from frame 0 and edits Tracks directly

`drawImagePickFlowerMode` builds the candidate flowers with `Object.values(Tracks[0]).filter(ID starts with 'F')`: flowers annotated only in frame 0 are found, and `Tracks[0]` undefined throws. It creates `visit = {}` on the stored event observation even if nothing is picked and writes `visit.flowerid` straight into `Tracks`, bypassing the commit path and the undo stack. `drawFlowersMainCanvas` calls `identifyBeeRect(ctx, rect, radius, isSelected)` with a plain canvas rectangle (no `obs`) and a `radius` that is not defined in that scope, which is likely to fail [inferred, depends on `hasLabel` and the global `radius`]. `drawTimelinePickFrameMode` sets the image size before testing the image. [read] `labelbee/static/labelbee/js/OverlayControl.js` (`drawImagePickFlowerMode`, `drawTimelinePickFrameMode`).

- **Code:**
  - `OverlayControl.js`: `drawImagePickFlowerMode`, `drawTimelinePickFrameMode`
- **Links:** BEH-451, BEH-452, OQ-410

## DEBT-501: Tag-view checkbox default contradicts HTML; initial button states target wrong ids

`labelbee_page.html` has `#checkboxZoomShowTagView checked="true"` and `#checkboxShowZoom checked="false"` (the attribute presence means checked), but the constructor forces the states by JS. It also toggles `#buttonZoomShowGrid`, `#buttonZoomShowBB` and `#buttonZoomShowParts`, ids that are not in the served template blocks (the real ones are `#checkboxZoomToggleGrid`, `#checkboxZoomShowBB`, `#buttonShowParts`; a whole-template grep was not served), and `initZoomView` does `$("zoomExtractedTagCanvas")` (missing `#`, empty selection). [read]
Replacement: one source of truth for defaults (state object, UI rendered from it).

- **Code:**
  - `ZoomView.js`: `ZoomOverlay`, `initZoomView`
  - `labelbee_page.html`: `#checkboxShowZoom`, `#checkboxZoomShowTagView`
- **Links:** BEH-501

## DEBT-502: Selection change refreshes the zoom twice and re-syncs on every drag event

`refreshFromSelection` (was `selectionChanged`, step 6f) calls `syncFromTracks` (which ends with `refreshZoom` when an overlay rect is active) and then `refreshZoom` again; it is also bound to `object:moving`, so dragging a bee box rebuilds all part markers and redraws the zoom (including tag warp and Hamming search) per mouse move, and with Auto-label on restarts the label sequence at each move (BEH-526, OQ-510). `syncFromTracks` places markers with the geometry of the previous refresh (stale), fixed only by the later `redraw`. [read]
Replacement: single refresh per change, debounced; markers positioned after geometry update.

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.refreshFromSelection`, `ZoomOverlay.syncFromTracks`
- **Links:** BEH-503

## DEBT-503: Dead branch in overlay drawing and unbalanced canvas state

In the no-tag branch of `refreshZoom` the condition `typeof tag !== "undefined"` can only be true for `null`; `getTag` returns `undefined` or `obs.tag`, never `null`, so the yellow centre square is practically unreachable. The tag branch reads `tag.p[0][0]` with no check, so a tag without corners throws (BEH-544). The Box drawing calls `zoom_ctx.restore()` without a matching `save()`. The tag outline starts a path with `moveTo` without `beginPath()`. `angle` is assigned without declaration (implicit global). [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.refreshZoom`
- **Links:** BEH-508, BEH-509, BEH-544

## DEBT-504: exportZoomImage has no guard for no selection and mixes responsibilities

With no selected rect: `frame` becomes `""` (`obs?.frame ?? ""`), `x` and `y` are `NaN` in the file name (`Math.round(...) ?? ""` never yields `""`), `labels` is `undefined`. The output HTML does not escape the labels or JSON. It exports from the canvas `#zoom` only, not the fabric markers. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.exportZoomImage`
- **Links:** BEH-511

## DEBT-505: Pixel-level tag processing in the UI object, with undeclared globals

`updateTagView` (~220 lines) does video crop, perspective warp (manual bilinear loop, TODO in code to use a GL library), grid drawing, bit extraction and reference drawing inline; `src_pts`, `idata` (in `extractTagBin`, `drawPixelated`) are undeclared globals; `drawPixelated` and `drawTagBin` also read `zoom` (`if (!zoom) zoom = 4`), which is never declared (the only other assignment is the function-local `var zoom` of `ChronoAxes.js:687`): in the page it probably resolves to the `#zoom` canvas through named access to element ids, so the default 4 is dead [inferred, unranked]. The warp runs even when the Tag view is hidden: `updateTagView` is gated by `this.showTagView`, a different property from `flagShowTagView`, set to true in the constructor and never changed. Bilinear sampling reads one pixel beyond the crop at borders. Unused helpers: `findBestHamming`, `rotateTagBin`, `drawTagBin`, `deleteDistractors`, `canvasExtract`, `ZoomOverlay.showTagView` (always true). [read]
Replacement: separate tag-image module (warp, decode, Hamming search) with pure functions; UI renders results.

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.updateTagView`, `drawPixelated`, `drawTagBin`, `findBestHamming`, `rotateTagBin`, `extractTagBin`
- **Links:** BEH-512

## DEBT-506: Alternate list is computed from the previous refresh's tag bits

`updateTagView` calls `updateDistractors` first, then recomputes `currentTagBin`; alternates shown correspond to the previously extracted bits (lag of one refresh, e.g. after changing frame or bee). `currentTagBin` is also not cleared when the new current tag has no `p`. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.updateTagView`, `ZoomOverlay.updateDistractors`
- **Links:** BEH-513, BEH-534

## DEBT-508: Keypoint vocabulary is a hard-coded global map

`labelList` default (head, thorax, abdomen, antL/R, pollenL/R, legL/R) is hard-coded in the `ZoomOverlay` constructor; mutated from four places (buttons, JSON dialog, preset loader, `OverlayControl` reads). Not persisted, not tied to a video or project. Maintainer: hacked version, templates wanted. [read, OQ-007]
Replacement: keypoint templates (named sets, with skeleton edges), loaded and stored with the project.

- **Code:**
  - `ZoomView.js`: `ZoomOverlay`
  - `OverlayControl.js`: `fabric.BeeRect._colormapping`
- **Links:** BEH-517, OQ-007

## DEBT-509: Renaming a marker is not synced to the observation

`onPartLabelTextChanged` sets `rect.label` and redraws but does not call `syncToTracks`; `rect.label` also differs from `this.selected` afterwards. The renamed label only reaches `obs.parts` at the next add/move/delete. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.onPartLabelTextChanged`
- **Links:** BEH-519

## DEBT-510: Marker offset of 3 px and mixed origin conventions

Markers are created with `top: y-3, left: x-3` (corner convention) and then `originX/originY = "center"`; all conversions subtract/add 3 consistently, so the marker appears 3 px up-left of the stored point. `strokewidth` (lowercase) is not a Fabric option. Uses deprecated Fabric 1.x API (`setLeft`, `deactivateAllWithDispatch`, `object:selected`, `hasRotatingPoint`). [inferred]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.newPointInFrame`, `ZoomOverlay.updatePointToFabric`, `ZoomOverlay.updatePointFromFabric`
- **Links:** BEH-521

## DEBT-511: Parts display toggle spread over three modules

`flagShowParts` is owned by `ZoomOverlay` but read by `OverlayControl` (`BeeRect._render`); `onToggleButtonShowOnVideo` calls `videoControl.refresh()`; the chronogram has its own flag. The init code toggles a non-existent `#buttonZoomShowParts`. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.onToggleButtonShowOnVideo`
  - `OverlayControl.js`: `fabric.BeeRect._drawParts`
- **Links:** BEH-527, SEAM-501

## DEBT-512: Label list editing leftovers

`+` resets the colour of an existing label to black and accepts an empty label; action `'c'` (colour prompt) has no button; the button title says "Toggle Label" while a second click does nothing; handlers use the global `zoomOverlay` instead of `this`; label strings are injected into HTML/attributes unescaped (`refreshButtonListParts`, preset dialog `onclick` strings); the coloured dot `<span>` of a label button has no `data-label`, so clicking it deselects instead of selecting (BEH-542). [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.onButtonClickAddRemovePartLabel`, `ZoomOverlay.refreshButtonListParts`
- **Links:** BEH-518, BEH-528, BEH-542

## DEBT-513: Preset dialog reports success on a malformed file; route only in legacy

`keypointLabelsFromServer` returns `false` from its jQuery success callback when `labelList` is missing, but the caller's `.then` still shows "Labels loaded. Closing." and closes. The directory `static/data/config/keypointlabels/` served by `labelbee/legacy/views.py` was not found in `labelbee/static`; no equivalent route exists in `labelbee/blueprints`. File URIs are put in inline `onclick="..."` strings with single quotes. [read]

- **Code:**
  - `ZoomView.js`: `KeypointLabelsFromServerDialog`, `ZoomOverlay.keypointLabelsFromServer`
- **Links:** BEH-530, OQ-503

## DEBT-514: rotateTag marks the bee as wrongid even for a pure rotation and clears obs.newid

`rotateTag` always adds `wrongid`, and sets `obs.newid = undefined`, discarding a `newid` set earlier by an alternate-tag click (while `obs.fix.newid` is kept, so the two diverge). The commented block shows an older design that modified `tag.p` directly. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.rotateTag`
- **Links:** BEH-531, BEH-532

## DEBT-515: Tag fix helpers have undeclared globals and heavy side effects

`spreadTagFix` and `bakeTagFix` loop with `for (k in tags)` (implicit global `k`), `spreadTagFix` logs an undefined `tag`, `rotatep` is an implicit global, `getCoveredTags` writes `obs.span` as a side effect and throws if `Tracks[obs.frame][obs.ID]` is missing, scans all of `Tags` for each call (O(frames) per click), and reaches only `Tags` entries with `id == obs.ID`. The data model hides a shared reference: `augmentTrackWithTag` aliases `Tracks[F][id].tag` to the same object as `Tags[F].tags[i]`, which is why the fix is visible through `obs.tag` (BEH-533). [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.spreadTagFix`, `ZoomOverlay.bakeTagFix`, `getCoveredTags`, `rotatep`
- **Links:** BEH-533, SEAM-502

## DEBT-516: Hamming-matrix alternate source is dead code; inline onclick ids

`flagShowAlternateHamming` is false and no UI toggles it, so the `hammingMatrix` source (`/data/tags/tag25h5inv/tag25h5_hamming_matrix_5-6.json`, loaded at start for nothing) is never displayed. Candidates are rendered as HTML strings with `onclick="zoomOverlay.onClickAlternateTag(<id>)"` (unquoted id; breaks for non-numeric ids). `for (let H in Object.keys(...))` iterates indices. `getIdsInFocus` assigns an undeclared global `ids` (SelectionControl.js). [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.loadTagHammingMatrix`, `ZoomOverlay.updateDistractors`
  - `SelectionControl.js`: `getIdsInFocus`
- **Links:** BEH-534

## DEBT-517: bakeTagFix defects

(a) When called without argument, `let obs = activeObject.obs` shadows the parameter, so `obs` stays undefined and `hasLabel(obs, ...)` throws. (b) For a rotation-only fix (`obs.fix.newid` undefined) `tag.id` becomes `undefined`. (c) Tags changed by baking no longer match `obs.ID`, so spreading again finds nothing. (d) `falsealarm` is stored as a magic id in `tag.id`. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.bakeTagFix`
- **Links:** BEH-535

## DEBT-518: onClickAlternateTag leftovers

Logs the global `event` (not the id); empty `if (obs.fix) {}`; when the clicked id equals the obs id and a fix exists only `fix.newid` and `fix.tagangle` keys are deleted (the `fix` object stays, and `spreadTagFix` treats it as no fix); loose `==` between a number and the string `obs.ID`; `tagangle` of an earlier rotation is retained when a new id is chosen. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.onClickAlternateTag`
- **Links:** BEH-536

## DEBT-519: Undo of tag fixes is partial

`undoAllTagFixes` only reverts baked tags (those with `fix.oldid`), does not clear `tag.fix` and does not touch `obs.fix` (nor does removing the `wrongid` label, BEH-543); `undoTagFix` uses a `falsealarm` branch that duplicates the else branch minus the corners. Per-tag undo exists but no UI calls it. [read]

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.undoAllTagFixes`, `ZoomOverlay.undoTagFix`
- **Links:** BEH-538

## DEBT-520: deleteFalsealarmTags changes the container type of Tags[F].tags

`deleteFalsealarmTags` replaces each `Tags[F].tags` array by an object (`Object.keys(...).reduce`) keyed by the original indices. `augmentTrackWithTag` loops with `Tags[F].tags.length`, which is `undefined` for an object, so after a clean-up the frames of `Tags` no longer feed the `Tracks[F][id].tag` alias; `getCoveredTags` uses `for ... in` and still works. [read]
Replacement: keep arrays (filter) or iterate both uniformly.

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.deleteFalsealarmTags`
  - `ChronoControl.js`: `augmentTrackWithTag`
- **Links:** BEH-539, BEH-533, SEAM-502

## DEBT-601: Predefined labels hard-coded in several places

The 11 default labels are in `labelButtonsArray` in the JS, 8 static buttons are also written in the page (replaced at startup), and the `wrongid` button is additionally duplicated statically in the BeeID panel. [read] Hard-wired label names also appear in `updateObsActivityFromForm` (four), the `wrongid` branch of `labelToggle`, `onKeyDown_NewIDEdit` (`wrongid`), and `falsealarm`/`wrongid` in `updateFlatTracks`, `updateChronogramData` and `updateChronoData` (hide-invalid filters). The `$(".labeltoggle").change(onLabelToggled)` binding made at init in `initSelectionControl` is dead: it binds only the buttons existing at that moment and buttons do not fire `change`; the inline `onclick` does the work. Intended replacement: one label vocabulary (plugin or per-task config), DEC-003.

- **Code:**
  - `SelectionControl.js`: `labelButtonsArray`, `hardRefreshLabelTogglePanel`, `labelToggle`, `initSelectionControl`
  - `ChronoControl.js`: `updateFlatTracks`, `updateChronogramData`, `updateChronoData`
  - `labelBee.js`: `onKeyDown_NewIDEdit`
  - `labelbee_page.html`: `#labeltoggle-panel`, `#beeidpanel`
- **Links:** DEC-003, BEH-601, BEH-602

## DEBT-602: Label normalization hijacks single letters and does not deduplicate

`labelMap` rewrites `f`, `p`, `e`, `d`, `l`, `departing` (legacy shortcuts/aliases) on every read of a label string, so those cannot be custom labels; `pollen` is a duplicated key; `toLabelString` does not deduplicate, and `updateObsLabel` removes only the first occurrence. [read] Intended: normalize once at load (CAP-707), then plain string-set semantics.

- **Code:**
  - `SelectionControl.js`: `labelMap`, `toLabelString`, `updateObsLabel`
- **Links:** BEH-604, OQ-601

## DEBT-603: `bool_acts` shim and its dead helpers

`bool_acts` is derived from `labels` in two places (`updateObsActivityFromForm`, which also runs at rectangle creation for `new` observations, and `setLabels`) and `copyObs` copies the four flags (or sets `[false x4]`); `updateLabelsFromBool` calls an undefined function `updateLabel` and has no caller; `addLabel`, `removeLabel`, `updateLabelArray` have no callers. [read] Intended: remove `bool_acts` (DEC-003), serve the remaining readers (chronogram colours, CSV export) from `labels`.

- **Code:**
  - `SelectionControl.js`: `updateLabelsFromBool`, `addLabel`, `removeLabel`, `updateLabelArray`
  - `OverlayControl.js`: `updateObsActivityFromForm`, `setLabels`
  - `Model.js`: `copyObs`
- **Links:** DEC-003, BEH-610

## DEBT-604: `submit_bee` return values and ignored argument

`submit_bee` returns false on errors, true after "Internal issue" without storing (log says "Writing anyway"), undefined on success; callers pass an argument that is ignored (`submit_bee(activeObject)`, as in `onKeyDown_NewIDEdit`). `automatic_sub` has no null check. [read]

- **Code:**
  - `SelectionControl.js`: `submit_bee`, `automatic_sub`
  - `labelBee.js`: `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
- **Links:** BEH-611, BEH-612

## DEBT-605: Visits as events with ad-hoc subfields, two incompatible forms

Visits are observations with ID `V-<P>-<F>`, `visit = {pollinator, flower}` and `span`, relying on ID prefixes `P`/`F`; a legacy form `visit.flowerid` (Pick Flower, flowers read only from `Tracks[0]`) coexists. No schema, no separation of visits from boxes (they get a fake box of default size). [read] Intended: proper visit structure (CAP-602 text says so). Defects of the legacy picker: DEBT-618.

- **Code:**
  - `OverlayControl.js`: `VisitWidget`, `OverlayControl.prototype.drawImagePickFlowerMode`
- **Links:** BEH-613, BEH-625, DEBT-618, OQ-603

## DEBT-606: VisitWidget code defects

`setFlower` is defined twice (identical); `selectVisit` and `newVisit` assign an undeclared global `default_id` (no effect: `computeDefaultNewID` has a local one); `update()` dereferences `this.visit.visit.pollinator` without a guard (it throws when the adopted visit has no `visit` field, for example an observation named like `V-P1-F2` by hand); `update()` has the side effect of looking up and assigning `this.visit`; rejected picks give no user message; `pickMode` background click is a silent no-op; `VisitWidget.prototype.open` is dead code with no caller and would throw if called (it reads `this.interaction` and `this.getActiveObject`, which VisitWidget does not define). [read]

- **Code:**
  - `OverlayControl.js`: `VisitWidget.prototype.setFlower`, `VisitWidget.prototype.selectVisit`, `VisitWidget.prototype.update`, `VisitWidget.prototype.open`
- **Links:** BEH-614, BEH-615, BEH-620

## DEBT-607: `copyObs` omits `span`, so new visits and undeleted events lose it

`copyObs` copies a fixed field list without `span`; `newVisit` builds `span` that `storeObs` then drops (the `Observation` constructor defines no `span`); `cloneObs` (rectangles, undo entries) drops `span`, so Undo loses the span. [read] Intended: copy all persistent fields (or clone by structure) once the data model is defined.

- **Code:**
  - `Model.js`: `copyObs`, `cloneObs`, `storeObs`
  - `OverlayControl.js`: `VisitWidget.prototype.newVisit`
- **Links:** BEH-616, BEH-637, BEH-639

## DEBT-608: TimelineWidget is unfinished and broken

No caller of `setCenterFrame`/`setCrop`; `onClick('timelineZoom')` uses nonexistent `this.zoom` (NaN); `update()` destroys the buttons; `create`/`update` leak the loop variable `delta`. A second, working timeline lives in the pick-frame code. [read]

- **Code:**
  - `OverlayControl.js`: `TimelineWidget`, `TimelineWidget.prototype.update`, `TimelineWidget.prototype.onClick`
- **Links:** BEH-621, OQ-605

## DEBT-609: Pick-frame panel built inside `OverlayControl.hardRefresh`

The pick-frame UI (`#pickframediv`) is created in the middle of `hardRefresh` with closures, side effects on `Tracks` (it adds a `span` while refreshing), and a copy of the swap-ID helper `doSwap2` that is unused there. Mode state is in `overlay.interaction` while mode-switch logic lives in `SelectionControl.modifyCurrentObsSpan`. The panel is cleared only by CLOSE (leaving the mode otherwise keeps stale buttons whose closures target the old observation and whose callbacks read `overlay.interaction.opts`), and the rebuild restores the `active` class of Show Timeline but not of Pick Flower. [read]

- **Code:**
  - `OverlayControl.js`: `OverlayControl.prototype.hardRefresh`, `OverlayControl.prototype.setInteractionMode`
  - `SelectionControl.js`: `modifyCurrentObsSpan`
- **Links:** BEH-622, BEH-645

## DEBT-610: Events-info and statistics defects

`updateForm(null)` writes "Center X: -" into `#CY`; `updateForm` leaks globals `w`, `h`; `updateAnnotationStatistics` leaks `i`, `T`, `j` and logs to the console as well; statistics are computed with ad-hoc one-liners (no reuse of `flatTracks`) and are not refreshed automatically. [read]

- **Code:**
  - `SelectionControl.js`: `updateForm`, `updateAnnotationStatistics`
- **Links:** BEH-626, BEH-627

## DEBT-611: Observation table rebuilt on every refresh, gated by an accordion CSS class

`renderObsTable` rebuilds the full DOM table from `flatTracks` at each `refreshChronogram` and decides whether to render by testing jQuery UI class `ui-accordion-header-collapsed` on `#labelingTab`; the flat-track filtering is duplicated with the chronogram (TODO in the code) and diverges (`flag_hideFlowers` applies to the chronogram only); `updateFlatTracks` assigns an undeclared global `obs`; `updateObsTable` has no caller. [read]

- **Code:**
  - `ChronoControl.js`: `renderObsTable`, `updateObsTable`, `updateFlatTracks`
- **Links:** BEH-628

## DEBT-612: Selection state split across globals and the Fabric canvas

Current ID in `defaultSelectedBee` (read directly by ChronoControl, ChronoControlInteraction, OverlayControl, labelBee.js and written by several of them), active rectangle in Fabric; `tagSelection` is set and never read; `selectionControl` is an event bus object assigned without declaration; `getSelectedID` returns undefined when nothing is selected while the canvas getter `getActiveObject` returns null. [read] Intended: one selection model with explicit events (see SEAM-601).

- **Code:**
  - `SelectionControl.js`: `defaultSelectedBee`, `tagSelection`, `selectionControl`, `selectBeeByID`, `getSelectedID`
  - `ChronoControlInteraction.js`: `gotoEvent`
- **Links:** BEH-630, SEAM-601

## DEBT-613: Undelete loses `span`; may overwrite a new observation

`undoAction` stores the cloned observation (without `span`, DEBT-607) and silently overwrites any observation that now has the same frame and ID; it does not select the restored observation when it is in another frame, and it assigns an undeclared global `rect`. [read]

- **Code:**
  - `SelectionControl.js`: `undoAction`, `deleteEvent`
- **Links:** BEH-637, BEH-639, DEBT-607

## DEBT-614: Undo covers only deletion; dead branches

`undoPush` handles `new` and `move` with no callers; `undoPop` rejects them with "not implemented" after popping; global stack not reset when another video or annotation file is loaded. [read] Intended: general command-based undo (OQ-009 asks for undo).

- **Code:**
  - `SelectionControl.js`: `undoPush`, `undoPop`, `undoStack`
- **Links:** BEH-638, OQ-009

## DEBT-615: Undo button label uses `.val()` on a `<button>`

`updateUndoButton` sets `.val("Undo")` / `.val("Undo?")` where `.html()` is needed (a `<button>` shows its content), so the caption "Undelete ..." persists after the stack empties. [read]

- **Code:**
  - `SelectionControl.js`: `updateUndoButton`
- **Links:** BEH-640

## DEBT-616: Dead `p` shortcut

`onKeyDown` toggles a nonexistent `#P` checkbox (leftover of the old pollen checkbox) and swallows the key. Per DEC-005 `p` is kept for now; it currently does nothing. [read]

- **Code:**
  - `labelBee.js`: `onKeyDown`
- **Links:** BEH-643, DEC-005

## DEBT-617: Other dead or leaky code in SelectionControl.js

`swapID_findAll` (assigns a leaked global `frames`, no caller); `deleteSelected` reads `getActiveGroup` and does not use it; `deleteEvent` assigns an undeclared global `obs`; `hardRefreshLabelTogglePanel` leaks the loop variable `i`; `getIdsInFocus` leaks `ids` and computes unused `frange`; `LabelListDialog` assigns undeclared `json`, `obj`; `drawTimelineCurrentObject` (OverlayControl.js) leaks `i`; many commented-out blocks. [read]

- **Code:**
  - `SelectionControl.js`: `swapID_findAll`, `deleteSelected`, `deleteEvent`, `hardRefreshLabelTogglePanel`, `getIdsInFocus`, `LabelListDialog`
  - `OverlayControl.js`: `OverlayControl.prototype.drawTimelineCurrentObject`
- **Links:** BEH-634, BEH-636, BEH-609

## DEBT-618: Legacy Pick Flower has side effects and failure paths

`drawImagePickFlowerMode` creates `visit = {}` on the stored observation each time the panel opens (it then counts as a visit when selected, and the visit panel's Delete acts on it); it reads `Object.values(Tracks[0])`, which throws a TypeError when frame 0 has no annotation, after the panel title, "No visit" button and plain crop were appended; `drawFlowersMainCanvas` passes an out-of-scope `radius` to `identifyBeeRect` (ReferenceError at each click when at least one flower exists, unless a global `radius` exists; an undeclared assignment `radius = 3` elsewhere in OverlayControl.js is the only way one could be created); the toggle state `showPickFlower` is kept in mode-scoped `interaction.opts` and lost when the mode changes. [read; the consequence chain of the first item is inferred] Intended: drop the legacy form for the V-P-F visit (OQ-603).

- **Code:**
  - `OverlayControl.js`: `OverlayControl.prototype.drawImagePickFlowerMode`, `OverlayControl.prototype.pickFlowerButtonCallback`, `onObjectSelected`
  - `Model.js`: `copyObs`
- **Links:** BEH-625, BEH-644, DEBT-605, OQ-603, OQ-612

## DEBT-619: Unvalidated or silently dropped input in label and ID editors

SwapID takes the new ID from `#swapNewIDInput` as is (empty creates ID `""`; equal to the old ID is a no-op with a misleading frame count); the label list dialog's "Ok" reads the grid only, so unvalidated JSON typed in the JSON tab is dropped; two incompatible JSON keys exist for the label list (`labelListArray` in the Edit dialog, `labelButtonsArray` in the "Preset..." loader), whose loader aborts without a user message. [read]

- **Code:**
  - `SelectionControl.js`: `swapID_callback`, `LabelListDialog`
  - `Model.js`: `obs_swapID`, `changeObservationID`
  - `AnnotationIO.js`: `LabelListFromServerDialog`
- **Links:** BEH-609, BEH-647, BEH-648, OQ-610, OQ-611

## DEBT-620: Dead branches and shadowed keys in `onKeyDown`

The branch testing `e.target == #I` and the following `e.target.type == "text"` return cannot be reached, because the first test already handles every input of type text (`#I` is one); inside Enter and Escape handling, the "already focused, so blur" sub-branches are unreachable for the same reason. `labelsProcessKey` is called last, so label accesskeys bound to keys handled earlier (`Delete`, `Backspace`, `d`, `p`, Ctrl+`r`, arrows, `,`, `.`, space, `Escape`, `Enter`) never fire. [read]

- **Code:**
  - `labelBee.js`: `onKeyDown`
  - `SelectionControl.js`: `labelsProcessKey`
- **Links:** BEH-608, BEH-641, DEBT-616, OQ-614

## DEBT-701: Observation carries bool_acts next to labels

_FIXED in slice 5 step 4 (ADR 0008): the field is not stored any more. `Labels.bool_acts(obs)` (`annotation/Labels.js`) computes it from `labels`; the three readers (`activityString`, the chronogram data, the CSV/BBox exports) call it, the writers and the prediction copy are gone, `Observation`, `copyObs` and `Events.commit` do not carry it, the loaders drop it from the files, the v1 export writes the derived value because it is a field of the v1 format. No cache: not measured to be needed._ _Maintainer decision 2026-11-14 ([Q31](../QUESTIONS.md#q31)): `bool_acts` becomes a derived value computed from `labels` (cached only if measured to be needed); ADR 0008 step 3._ `Observation` and `copyObs` keep `bool_acts` (4 flags) redundant with `labels`; it is recomputed from labels at v2 load and dropped at v2 save, but v1 files and the CSV/BBox exports rely on it. [read] `labelbee/static/labelbee/js/Model.js` Observation, copyObs; `labelbee/static/labelbee/js/AnnotationIO.js` sanitizeEvents, convertTracksToV2; exports [inferred, not re-read]. Proposed: `labels` canonical, exports derive the flags (DEC-003 shim); see OQ-715 for the OQ-003 conflict.

- **Code:**
  - `Model.js`: `Observation`, `copyObs`
  - `annotation/AnnotationCodec.js`: `tracksToCSV`, `sanitizeEvents`
- **Links:** BEH-701, BEH-717, BEH-738, DEC-003, OQ-715

## DEBT-702: copyObs copies a hand-maintained field list

_FIXED in slice 5 steps 5 to 7 (ADR 0008): `cloneObs`, `copyObs` and `storeObs` are gone with the working copy. An editor writes its unit with `events.update`, creation and the draft use `events.commit` (which keeps unknown fields), a rectangle holds the stored object, so `span`, `tag`, `parts` and `visit` are neither dropped nor shared with a copy; the visit module writes `span` and `visit` through `events.update`. Undo is off until its own slice (the stack code stays)._ [read] PARTLY FIXED in slice 4 step 7a: `Events.commit` (what `storeObs` calls) keeps the fields of the working copy outside the 17 (the `span` of `newVisit` now survives); `cloneObs`/`copyObs` still copy the hand-maintained list, so undo of a delete still loses `span`, `tag`, and `parts`/`visit` are still shared by reference with the working copy (the dirty-write detector flags the writers; [ADR 0008](../design/0008-field-ownership.md) steps 3-4, [Q30](../QUESTIONS.md#q30), [Q33](../QUESTIONS.md#q33)). Before: `labelbee/static/labelbee/js/Model.js` copyObs lists fields; `span`, `tag` and unknown fields are dropped by storeObs/cloneObs (so undo snapshots from `deleteEvent` lose `span`; the visit-creation `tmpObs` in `labelbee/static/labelbee/js/OverlayControl.js` carries a `span` that `storeObs` drops); `visit` is never cleared; `parts` is shared by reference. Proposed: copy all own fields minus runtime ones, with explicit deep copy of nested objects; whether `span` must survive is OQ-701.

- **Code:**
  - `Model.js`: `copyObs`, `cloneObs`, `storeObs` (removed in slice 5 step 6)
- **Links:** BEH-704, OQ-701

## DEBT-703: cacheTags tests the wrong variable

[read] `labelbee/static/labelbee/js/Model.js` cacheTags: `typeof ttags[key]` (ttags is the id-to-frame index) instead of `tagCache[key]`, so each (frame,id) holds only the last tag; `tagCache` is assigned without a declaration in `cacheTags`; `getTags` throws if `cacheTags` never ran. Proposed: test `tagCache[key]`, keep all tags.

- **Code:**
  - `Model.js`: `cacheTags`, `getTags`
- **Links:** BEH-707

## DEBT-704: Runtime fields (tag, span) are written into saved files

[maintainer 2026-11-13] `tag` and `span` are part of the event data, not runtime attachments: `Events` keeps and saves them like any field (OQ-702 answered); the premise of this entry is withdrawn, what stays is the question of where a tag that comes from the legacy `Tags` file is merged (below, DEC-006) and that the merge happens at every refresh. [read] `labelbee/static/labelbee/js/ChronoControl.js` augmentTrackWithTag assigns `obs.tag` (the tag object) on stored observations; `labelbee/static/labelbee/js/AnnotationIO.js` convertTracksToV2 copies every own field, so `tag` (the full tag record) and `span` are saved, contradicting ENT-001. Proposed: explicit save whitelist, or runtime fields kept outside `Tracks`; decision in OQ-702.

- **Code:**
  - `annotation/AnnotationCodec.js`: `convertTracksToV2`
  - `Model.js`: `copyObs`
  - `ChronoControl.js`: `augmentTrackWithTag`
- **Links:** BEH-708, ENT-001, OQ-702

## DEBT-705: No dirty flag; beforeunload always prompts

[read] `labelbee/static/labelbee/js/labelBee.js:218` `window.onbeforeunload` always returns its message (also at `setTracks([], true)` init, `labelBee.js:228`); there is no dirty tracking and no autosave. Whether the silent replacement by loads and erase is intended is OQ-710. Proposed: dirty tracking shared by IO and prompts.

- **Code:**
  - `AnnotationIO.js`: `initAnnotationIO`, `setTracks`, `loadEventsFromFile`
  - `labelBee.js`: `~window.onbeforeunload handler and setTracks([], true) in init`
- **Links:** BEH-709, BEH-714, INV-001, OQ-710

## DEBT-706: v2 save mutates TracksInfo and crashes when history is a string

[read] FIXED in slice 2 step 4 (`annotation/AnnotationCodec.js` `convertTracksToV2`: `info` and `videoinfo` are deep copies, `history` is always an array, the whole `videoinfo` stays embedded per OQ-712). Was: `info: TracksInfo` by reference, formatnote set, history pushed, a `videoinfo` reference stored; CSV/DB imports set `history` to a string, so `.push` threw and the save aborted (file and server, before the request). Still open: `history` stays a string in memory after an import (converted at save only).

- **Code:**
  - `AnnotationIO.js`: `eventsToServer`
  - `annotation/AnnotationCodec.js`: `convertTracksToV2`, `tracks_csv_to_json`, `tracks_tagged_csv_to_json`
- **Links:** BEH-711, BEH-735, INV-001, OQ-712

## DEBT-707: C1, convertTracksToV1 mutates live Tracks

[read] FIXED in slice 2 step 4 (`Object.assign({}, evt)`). Was: `Object.assign(evt)` with one argument aliased the observation; it deleted marked/permanent and rewrote cx, cy, x, y, width, height in place. Latent (v1 not exposed in the page).

- **Code:**
  - `annotation/AnnotationCodec.js`: `convertTracksToV1`
- **Links:** BEH-712, INV-001

## DEBT-708: saveEventsToFile with an unknown format downloads "null"

[read] after logging "Aborted" it does not return, and calls `saveObjToJsonFile(null, ...)`. Proposed: return.

- **Code:**
  - `AnnotationIO.js`: `saveEventsToFile`
- **Links:** BEH-713

## DEBT-709: Silent failures when loading local files

[read] FIXED in slice 3 step 5 (Q23, `AnnotationIO.js` `showLoadError` / `reportLoadError`): invalid JSON, a rejected format (the result of `setTracks` / `setTags` is now checked and turned into an `Error`) and a failing `FileReader` are told to the user, HTML-escaped, in the from-server dialog when it is visible, else in the main alert; they are also logged with `console.error` and the rejection reaches the caller. Was: invalid JSON threw uncaught in `onReaderLoad`; `sanitizeEvents` failures only reached the console (`setTracks` returned false); the `setTags` return value was ignored; the user saw nothing.

- **Code:**
  - `AnnotationIO.js`: `onReaderLoad`, `onTagsReaderLoad`, `eventsFromText`, `tagsFromText`, `readFileAsText`, `showLoadError`, `reportLoadError`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** BEH-714, BEH-719, BEH-722

## DEBT-710: Dead "array" branch, unreachable non-object branch, misleading v1 source string

[read] FIXED in slice 1 step 4 (`Array.isArray`, `labelbee/static/labelbee/js/annotation/AnnotationCodec.js` sanitizeEvents): arrays used to go to the object branch because `typeof obj == "array"` is never true, so `info.source` was always "Converted from Tracks v1 object". The rest FIXED in slice 3 step 5 (`annotation/AnnotationCodec.js`: `sanitizeEvents` and `decodeTags` test `obj === null || typeof obj != "object"` before the `in` test, so `null`, `undefined` and primitives reach the "unsupported file format" message instead of a caught `TypeError`; the branches that had become unreachable were removed). Was: `"info" in obj` threw for them first (same in `setTags`).

- **Code:**
  - `annotation/AnnotationCodec.js`: `decodeTags`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** BEH-718, BEH-721

## DEBT-711: v1 validation and normalization are weak

[read] the key check is `!every(regex) & !every(Number.isInteger)` (bitwise & of booleans; the second operand is always true for string keys, so only the regex decides); v1 events keep the file's `ID` / `bool_acts` and the parsed object is used directly as `Tracks`. Proposed: same normalization as v2 for both versions; decision in OQ-703.

- **Code:**
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** BEH-718, INV-003, OQ-703

## DEBT-712: Implicit globals and double refresh in the IO code

_Slice 4 step 4c removed the implicit globals `obs` (`ChronoControl.js` `updateFlatTracks`) and `i`, `T`, `j` (`SelectionControl.js` `updateAnnotationStatistics`): a run of the browser tests with `window.obs` instrumented showed that nothing read them without assigning them first. The ones listed below (IO code) and the double refresh remain._

[read] undeclared assignments in `labelbee/static/labelbee/js/AnnotationIO.js`: `data0`, `hasDuplicateEntries` (sanitizeEvents), `evts`, `src` (tracks_csv_to_json), `dataToSend`, `alertMSG` (eventsToServer), `fileData` (openRecentLoadingDialog), `html`, `idx`, `buttonHTML` (showAdvancedLoadingDialog), `success` (loadEvents, loadEventsFromServerByID), `tags` (tagsFromServer), `obj` (saveTagsToFile), `user_data` (whoami), and `ttags` implicit (`TracksInfo`, `TagsInfo` and `tagsHaveDM` are, since slice 3, accessors of `annotation/AnnotationStoreBridge.js` over `AnnotationStore`); [inferred, not re-read] `result`, `data` (db_to_json), `tagCache` (`Model.js`). setTracks already refreshes, then callers refresh again (loadEvents, loadEventsFromServerByID, loadTracksCSVFromDB). Proposed: declared module state, one refresh.

_Slice 6 status (step 7): the loaders are still the custom `videoControl.onFrameChanged()` + `refreshChronogram()` pair (`labelbee/static/labelbee/js/AnnotationIO.js:362-363`, `:522-524`; baseline scenarios `load`, `load_csv`), not on `refresh.*` ([Q36](../QUESTIONS.md#q36)). The double refresh after `setTracks` was removed in step 5; the repeated selection and zoom steps inside one rebuild are DEBT-832._

- **Code:**
  - `AnnotationIO.js`: `setTracks`, `eventsToServer`, `showAdvancedLoadingDialog`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`, `db_to_json`
- **Links:** BEH-720

## DEBT-713: setTags v1 validation inspects the previous Tags global

[read] FIXED in slice 3 step 5 (`annotation/AnnotationCodec.js` `decodeTags` validates `Object.keys(obj)`). Was: `Object.keys(Tags)`, the previously loaded global: the check never validated the loaded file, so a file with a bad key was accepted when the old Tags were empty, and a good file was rejected when the old Tags had a bad key.

- **Code:**
  - `annotation/AnnotationCodec.js`: `decodeTags`
- **Links:** BEH-721

## DEBT-714: saveTagsToFile v2 writes an undeclared global obj

[read] `obj = {...}` without declaration.

- **Code:**
  - `AnnotationIO.js`: `saveTagsToFile`
- **Links:** BEH-723

## DEBT-715: setTags DM detection and discarded file info

[read] `tagsHaveDM` is decided by the first tag of the first key only, and a first key without `.tags` throws; `TagsInfo` is always replaced by the dummy info (the v2 info is dropped). Slice 3: the DM rule moved unchanged to `AnnotationStore.updateTagsHaveDM()` and the dummy info to `decodeTags`; since DEBT-733 a throwing first key no longer leaves the Tags half-replaced (`setTags` rolls back and returns `0`).

- **Code:**
  - `AnnotationIO.js`: `setTags`
- **Links:** BEH-724, BEH-721

## DEBT-716: Recent-file dialog assumptions

[read] only `data[0]` is used, relying on the server sort order; [inferred] two page elements share `id="tagsFromServer"`.

- **Code:**
  - `AnnotationIO.js`: `openRecentLoadingDialog`
  - `labelbee_page.html`: `#tagsFromServer`
- **Links:** BEH-725, OQ-705

## DEBT-717: Advanced-file dialog bugs

[read] the error handler calls `setMessage(html)` while `setMessage(color, html)` takes the colour first (html lands in the colour slot and the content is `undefined`, so no error text is shown); the DataTable render counter `idx` assumes one render per cell; the type dropdown resets allusers to false; `allusers` is a boolean serialized by jQuery as the string "false"/"true" (server effect to check in group 1); no "No video loaded" guard unlike the recent mode.

- **Code:**
  - `AnnotationIO.js`: `showAdvancedLoadingDialog`
- **Links:** BEH-726, OQ-705

## DEBT-718: Invisible error messages in FromServerDialog.loadEvents

[read] `labelbee/static/labelbee/js/AnnotationIO.js` loadEvents writes to `.modal-message h4`, but all messages go through `setMessage`, which sets the content of `.modal-message` itself, and `resetAllHTML` clears it on open, so no `h4` exists and the selector matches nothing; loadEvents reads `this.dataType` while the dialog assigns `this.data_type` (`openRecentLoadingDialog`); no assignment of `dataType` was seen in the excerpts. Slice 3: `loadEventsFromServerByID` no longer uses this selector (DEBT-722); `loadEvents` still does.

- **Code:**
  - `AnnotationIO.js`: `loadEvents`
  - `labelbee_page.html`: `#from-server-dialog`
- **Links:** BEH-727

## DEBT-719: Server tag loading: unrouted URL, undefined return, empties Tags on failure

[read] tagsFromServer requests `rest/v2/annotation/<id>`, returns undefined so `loadEvents` always reports an error, and its failure path calls `setTags([], div)`, which wipes the loaded Tags; [read, grep of `rest/v2`] no route `rest/v2/annotation` exists in `labelbee/legacy/views.py` or `labelbee/blueprints/api/` (the listed `rest/v2` routes are video, dataset and video-data ones). Proposed: use `api/v1/annotation/<id>`, parse like events, do not wipe on failure; decision in OQ-706. Slice 3: `tagsFromServer` is a promise pipeline (`getJSONPromise`, `.then(onSuccess, onFailure)`) but still returns `undefined` on purpose, because the dialog reads the return value as success, and its failure path still empties the Tags (`setTags([], div)`).

- **Code:**
  - `AnnotationIO.js`: `tagsFromServer`, `loadEvents`
- **Decision:** DEC-006 (the separate tag file is obsolescent: removal may replace the proposed repair).
- **Links:** BEH-728, OQ-706

## DEBT-720: eventsToServer: ignored argument, undefined fields, CSS-only gating

[read] `format` is used only in the message; undefined `basedOn` / `user_id` are serialized by jQuery as empty strings; [inferred] `.require-server` only toggles a CSS class (`whoami` toggles `disabled`).

- **Code:**
  - `AnnotationIO.js`: `eventsToServer`, `whoami`
- **Links:** BEH-729, BEH-733

## DEBT-721: Stale lineage basedOn

[read] `fromServerDialog.basedOn` is set by `loadEvents` (and, since slice 3 step 5, by `loadEventsFromServerByID`), not reset by `setTracks`, and not updated by `eventsToServer`; [inferred] it also survives erase, local loads and video change.

- **Code:**
  - `AnnotationIO.js`: `loadEvents`, `eventsToServer`
- **Links:** BEH-730, OQ-707

## DEBT-722: loadEventsFromServerByID uses undefined variables and does not await

[read] FIXED in slice 3 step 5 (`AnnotationIO.js`). It was copied from `FromServerDialog.loadEvents` and referenced `tag_event_ID`, `theDialog`, `div`, which do not exist in its scope, so every path ended in a `ReferenceError` (after `setTracks` on success, so `basedOn` was never set and no message shown); it also returned before the request completed. Now: the id is `video_data_id`, the lineage is `fromServerDialog.basedOn`, the failures throw an `Error` reported by `showLoadError` (Q23), the function returns its request promise (resolves after the events are loaded, rejects on a request error or invalid data) and `onhashchange` in `labelBee.js` catches the rejection so the delayed seek still runs. Open: `success` is still an implicit global (DEBT-712); a double refresh remains (`setTracks` then the loader).

- **Code:**
  - `AnnotationIO.js`: `loadEventsFromServerByID`
- **Links:** BEH-731

## DEBT-723: Deprecated server list loaders

[inferred, not re-read] tracksListFromServer / eventsFromServer target `#loadTracksFromServerDialog` (absent from the page) and `/rest/events/`; no callers. Proposed: delete.

- **Code:**
  - `AnnotationIO.js`: `tracksListFromServer`, `eventsFromServer`
- **Links:** BEH-732

## DEBT-724: Auth code lives in AnnotationIO.js

[read] `labelbee/static/labelbee/js/AnnotationIO.js` whoami writes the globals `user_id` / `user_data`; `labelbee/static/labelbee/js/VideoList.js:531` and `:634` read `user_data.is_authenticated`; [inferred] ajaxlogin ignores the callback argument passed by LoginDialog. Proposed: login belongs to a session module (group 1 / app shell) that exposes the state.

- **Code:**
  - `AnnotationIO.js`: `ajaxlogin`, `whoami`, `LoginDialog`
- **Links:** BEH-733

## DEBT-725: CSV loaders: no error handling, hard-coded paths, unsequenced video and CSV

[read for `loadTracksCSVFromServer`] `d3.csv(...).then` without catch; [inferred for the click handlers] default URLs under `datasets/bee_feeder` and `datasets/gurabo4`; the gurabo4 link starts the video load and the CSV fetch independently. Slice 3 step 5: the three CSV loaders now return their promise and report a request failure, a parse failure or a rejected `setTracks`/`setTags` with `showLoadError`; the default URLs and the unsequenced video/CSV remain.

- **Code:**
  - `AnnotationIO.js`: `loadTracksCSVFromServer`, `clickLoadTracksCSVFromServer`, `clickLoadTracksTaggedCSVFromServer`
- **Links:** BEH-735, BEH-736

## DEBT-726: Near-identical CSV converters; tags CSV loader unreachable

[read] tracks_csv_to_json, tags_csv_to_json, tracks_tagged_csv_to_json repeat the same geometry / parts code (300x600, angle + 90); [inferred] loadTagsCSVFromServer has no caller. Proposed: one table-driven converter (constants per OQ-708).

- **Code:**
  - `AnnotationIO.js`: `loadTagsCSVFromServer`
  - `annotation/AnnotationCodec.js`: `tracks_csv_to_json`, `tags_csv_to_json`, `tracks_tagged_csv_to_json`
- **Links:** BEH-735, BEH-737, OQ-708

## DEBT-727: Exports ignore labels and notes and crash on missing bool_acts

_PARTLY FIXED in slice 5 step 4: the exports derive the flags from `labels`, so an observation without `bool_acts` no longer throws (a `null` observation still does); labels and notes are still not exported._ [read] `tracksToCSV` and `tracksToBBoxes2` export only the bool_acts flags (CSV) or geometry plus flags (BBox), no escaping; an observation that is `null` or lacks `bool_acts` throws `TypeError`.

- **Code:**
  - `annotation/AnnotationCodec.js`: `tracksToCSV`, `tracksToBBoxes2`
- **Links:** BEH-738, BEH-739, DEBT-701

## DEBT-728: tracksToBBoxes unused and log message stale

[inferred, `saveEventsToBBoxes` not re-read] saveEventsToBBoxes calls tracksToBBoxes2 but logs the format of tracksToBBoxes.

- **Code:**
  - `AnnotationIO.js`: `saveEventsToBBoxes`
  - `annotation/AnnotationCodec.js`: `tracksToBBoxes`
- **Links:** BEH-739

## DEBT-729: Experimental DB path is unreachable and half-built

[read] `loadTracksCSVFromDB` in `labelbee/static/labelbee/js/AnnotationIO.js` calls `db_to_json(db, ...)` with the hard-coded typo "Imported form DB" and a string `history`; `db_to_json` runs a fixed SQL query on table `data` with hard-coded 300x600 box and `angle + 90`, supporting only the sql.js `db.exec` API; [inferred, not re-read] the script tags for SQLiteDB.js / DuckDB.js and the SQLite console panel are commented out in `labelbee/blueprints/labelbee/templates/labelbee_page.html`, loadTracksCSVFromDB has no caller. [read] `labelbee/static/labelbee/js/DuckDB.js:11` imports `apache-arrow@latest` (unpinned) while duckdb-wasm is pinned to 1.12.0.

- **Code:**
  - `AnnotationIO.js`: `loadTracksCSVFromDB`
  - `annotation/AnnotationCodec.js`: `db_to_json`
  - `DuckDB.js`: `loadCSVFromURL`
- **Links:** BEH-740, BEH-742, OQ-004, OQ-709

## DEBT-730: SQLiteDB.js upload replaces only the module-local db

[read] `labelbee/static/labelbee/js/SQLiteDB.js:14-19` the `#upload` change handler assigns the module-local `db` without updating `window.db`, while loadTracksCSVFromDB reads the global; it has no try/catch and throws if no file is selected. By contrast `loadDatabaseFromUrl` (`:21-34`) assigns both. Proposed: one setter updating both, or a single owner.

- **Code:**
  - `SQLiteDB.js`: `loadDatabaseFromUrl`, `run_click`
- **Links:** BEH-741, OQ-709

## DEBT-731: Dead loaders and debug helpers

[read] `labelbee/static/labelbee/js/AnnotationIO.js` `loadEventsFromFile0` (only a commented-out call at `labelbee/static/labelbee/js/labelBee.js:198`), `FromServerDialog.clickedShowMetadata` / `showMetadata` (read `theDialog.json[k]["metadata"]`; no caller in the excerpts read), `labelbee/static/labelbee/js/Model.js` `printTracks` (debug print; callers not searched). Decision for the loaders (Q20, maintainer 2026-11-12): nothing is deleted; `loadEventsFromFile0` and the other loaders stay in `AnnotationIO.js`, restructured with the rest, because loading functions are meant to be callable by hand (debugging, manual loading). `printTracks`: caller search still pending.

- **Code:**
  - `AnnotationIO.js`: `loadEventsFromFile0`, `FromServerDialog`
  - `Model.js`: `printTracks`
- **Links:** BEH-714, BEH-732

## DEBT-732: FilePickerFromServerDialog error handler never reports

[read] `labelbee/static/labelbee/js/labelBee.js` FilePickerFromServerDialog.updateDialog: `error: function (data) { typesetAjaxError(...) }` builds the error callback but never calls it, so a failed listing request is silent and the dialog stays on "Loading file list from server. Please wait...". Proposed: `error: typesetAjaxError(...)` as in the other dialogs.

- **Code:**
  - `labelBee.js`: `FilePickerFromServerDialog`
- **Links:** BEH-748, BEH-744

## DEBT-733: setTags replaces Tags before unguarded steps

[read] FIXED in slice 3 step 5. `decodeTags` rejects a v2 file whose `data` is missing, `null` or not an object (it used to set `Tags = undefined`), and `setTags` applies as a whole: it saves the previous Tags, info, `tagsHaveDM` and `ttags`, and if `tagsAddFrames`, `getTTags` or `AnnotationStore.updateTagsHaveDM()` throws (a `null` frame entry, a first frame without `.tags`) it puts them back, logs `console.error` and "ABORTED, malformed tag data. The previous Tags are kept." and returns `0`. Was: the Tags and info were replaced first and a throw left them half-replaced with no refresh. Open: `allTagsID` (reset inside `getTTags`) may stay partial until the next refresh (DEBT-736); a file whose first frame has no `tags` is still rejected (DEBT-715).

- **Code:**
  - `AnnotationIO.js`: `setTags`
  - `annotation/AnnotationCodec.js`: `tagsAddFrames`
- **Links:** BEH-724, BEH-721

## DEBT-734: v2 file without data replaces the model with an empty one silently

[read] `labelbee/static/labelbee/js/AnnotationIO.js` sanitizeEvents: `data0 = obj["data"]` undefined / null / `[]` iterates nothing and returns `{info, data: {}}`; setTracks then replaces `Tracks` (INV-001 data loss on a truncated file). Proposed: reject or warn; decision in OQ-714.

- **Code:**
  - `AnnotationIO.js`: `setTracks`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** BEH-746, INV-001, OQ-714

## DEBT-735: labelListFromServer reports success when nothing was loaded, no error path in the dialog

[read] `labelbee/static/labelbee/js/AnnotationIO.js` labelListFromServer: `return false` inside the success callback does nothing, the promise resolves and `onClickFile` shows "Labels loaded. Closing." and closes the dialog even if `labelButtonsArray` was not assigned; on a request error the promise is rejected and `.then` has no failure handler, so the dialog stays on "Loading labels from ...". Proposed: reject on invalid payload, handle failure in `onClickFile`.

- **Code:**
  - `AnnotationIO.js`: `labelListFromServer`, `LabelListFromServerDialog`
- **Links:** BEH-734, BEH-747

## DEBT-736: setTags builds ttags from stale chronogram data

[read] `setTags` calls `getTTags()`, which in `tagMode == 'Tracks'` iterates the global `flatTags` assigned by `updateChronoData` (`labelbee/static/labelbee/js/ChronoControl.js:982`), so `ttags` is computed from the previous refresh; `getTTags` also resets `allTagsID` as a side effect. [read] the following `refreshChronogram()` runs `updateChronoData`, which recomputes `flatTags` and `ttags` (`ChronoControl.js:982-984`), so the staleness is transient. Proposed: a single derived-data update after the store changes. Slice 3 step 5: when a step of `setTags` throws, `ttags` is restored but `allTagsID` may stay partial until the next refresh.

- **Code:**
  - `AnnotationIO.js`: `setTags`
  - `ChronoControl.js`: `getTTags`
- **Links:** BEH-724

## DEBT-737: tagsAddFrames silently skips non-object tag entries

[ran] `tagsAddFrames` does `tag.frame = Number(f)` for every non-null entry; in the old sloppy script a primitive entry (number, string) makes this a silent no-op, in a strict ES module it would throw. The move to `labelbee/static/labelbee/js/annotation/AnnotationCodec.js` keeps the old behavior with an explicit skip; golden `tagsAddFrames primitive tag` pins it. Whether a primitive tag should be an error or dropped is undecided.

- **Code:**
  - `annotation/AnnotationCodec.js`: `tagsAddFrames`
- **Links:** BEH-724

## DEBT-738: mainAlert loses an alert opened while the previous one is fading out

[ran] FIXED 2026-11-13 (commit `747fd33b`, `AnnotationIO.js` `mainAlert`). With Bootstrap 3.3.6, `hide()` sets `isShown = false` at once but finishes later (transition, `hideModal()`, backdrop fade, `hidden.bs.modal`); a `show()` in that window was accepted, then the pending `hideModal` hid the new modal and left its backdrop, so the message never appeared. Needed two failures within about 300 ms. Now `mainAlert` waits for `hidden.bs.modal` when a hide is in progress. Tests: `refactor/tests/browser/test_alerts.py` (fails without the fix); `refactor/tests/golden/slice3` gained the recorded `data("bs.modal")` call. Unchanged: a second alert while one is open replaces its text (one modal).

- **Code:**
  - `AnnotationIO.js`: `mainAlert`
- **Links:** BEH-714, BEH-731, DEBT-709

## DEBT-739: cx/cy are stored next to x, y, width, height and written by several paths with different conventions

_Maintainer decision 2026-11-14 ([Q31](../QUESTIONS.md#q31), [ADR 0008](../design/0008-field-ownership.md)): the geometry editor writes `cx`, `cy` with the box and the chronogram stops writing them; `sanitizeEvents` takes a policy (which of `x`, `y` or `cx`, `cy` is the truth; `cx`, `cy` for the CSV formats, `x`, `y` for v1 and v2), warns when they disagree and fixes the other set; the long-term vision is that only `cx`, `cy`, `width`, `height`, `angle` are used inside LabelBee and `x`, `y` are computed for saving (the angle is around the center, which the top-left corner represents badly), each codec converting with its own conventions._

_Slice 5 status: `sanitizeEvents` takes a `centerPolicy` (step 3); the geometry editor stores the box and the center together on release through `rectToGeometry` (`OverlayControl.js`, step 5), and a new observation gets `cx`, `cy` at creation (step 6). `updateChronogramData` no longer recomputes `cx`, `cy` at each refresh (it only checks them, `events.checkValid`, see DEBT-804). Not done: both pairs are still stored (the reorganization around `cx`, `cy` is a later slice)._ [read] `Observation` stores both the box (`x`, `y`, `width`, `height`, `angle`) and its center (`cx`, `cy`): redundant. Writers: `OverlayControl.js:2043-2044` (rect update: `x`, `y` and size from the rectangle, then `cx = left + width/2`, so `x`, `y` are primary); `OverlayControl.js:2053-2056` (virtual rectangle: `cx`, `cy` from the rectangle, then `x = cx - width/2`, so the center is primary); `ChronoControl.js:1112-1113` (recomputes `cx`, `cy` of every kept observation at each refresh from `x + width/2`, DEBT-804); the CSV importers (`annotation/AnnotationCodec.js` `tracks_csv_to_json`: `x = cx - 150`, `y = cy - 300` for a fixed 300x600 box, BEH-735). Nothing states which pair is canonical, nor whether `x`, `y` are the unrotated corner when `angle != 0` (comment at `OverlayControl.js:2047`). Decision (maintainer 2026-11-13): to be resolved on its own later; until then the automatic recompute stays where it is, and the future `Events` API must not fix it silently: a clone, a put or a patch keeps both pairs as given (DEC-007).

_Slice 6 status (step 7): the refresh pipeline does not write `cx`, `cy`: the baseline scenarios `label` and `rotate_tag` show one store event each and no write from `refresh.update()` (`refactor/tests/browser/refresh_baseline.json`); `refresh.chrono()` only checks the pair. Nothing else changed for this entry._

- **Code:**
  - `OverlayControl.js`: `updateRectObsGeometry` (lines 2038-2056)
  - `ChronoControl.js`: `updateChronogramData`
  - `annotation/AnnotationCodec.js`: `tracks_csv_to_json`
- **Links:** ENT-001, DEBT-701, DEBT-804, BEH-735, DEC-007

## DEBT-740: rotating the tag after switching `wrongid` on stored a NaN angle (fixed)

_Fixed in slice 5 step 5, approved by the maintainer 2026-11-15: `tagRotated` starts from a zero angle when `fix` has none; `refactor/tests/golden/slice5/wrongid.test.js` and `test_j7c` show it._

[read] The label toggle creates `fix = {newid: undefined}` (no `tagangle`); `rotateTag` then did `fix.tagangle += 90`, i.e. `undefined + 90 = NaN`, saved as `null` in JSON. Kept as it was when the four wrong-id writers became `annotation/WrongId.js` (mechanical move), then fixed in its own commit.

- **Code:**
  - `annotation/WrongId.js`: `tagRotated`
- **Links:** ADR 0008, DEBT-739

## DEBT-801: Stale intervals when "Show Events" is off

`updateChronoData` only rebuilds `allIntervals`, `crosses`, `rectIntervals`, `circlesIntervals`, `partsIntervals` inside `if (showObsChrono)`; `chronogramData` is emptied unconditionally. Unchecking `#showObsChrono` therefore leaves the intervals of the previous refresh in those globals [read]; the renderer that reads `allIntervals` (`ChronoIntervals`) was not in the evidence served, so whether the stale intervals are still drawn is [inferred]. Replacement: the pure stage returns empty lists when events are hidden.

- **Code:**
  - `ChronoControl.js`: `updateChronoData`, `createIntervalList`
- **Links:** BEH-801, BEH-829

## DEBT-802: Read path mutates Tracks (obs.tag never cleared)

`augmentTrackWithTag` writes `obs.tag` into `Tracks` on every refresh and never removes a tag that vanished [read]. The tag is lost on `copyObs`/`cloneObs` (analysis/06 C9). Replacement: a pure join `tagFor(frame,id)` (or a derived map) owned by the derived-data module; consumers (`getTag`, `getFlatTags`, `cleanObsoleteEvents`) use it.

- **Code:**
  - `ChronoControl.js`: `augmentTrackWithTag`
  - `OverlayControl.js`: `getTag`
- **Links:** BEH-802, SEAM-802

## DEBT-803: Implicit globals and shared mutable products

`updateFlatTracks` assigns `flatTracksAll`, `flatTracksValid`, `flatTracksAllGroupById`, `flatTracksValidGroupById` without declaration; the loop variable `obs` and `obs_for_id` (in `updateTagsLabels`), `acts`, `crosses`, `rectIntervals`, `circlesIntervals` are also implicit globals [read]. `flatTracks` aliases `flatTracksAll`/`flatTracksValid` [read]. Consumers in `ChronoControlInteraction.js` call `.sort` in place on shared arrays [read]: `findNextObsEvent` (`flatTracksAll`, `flatTracksValid` or the `...GroupById[id]` lists, by id/frame), `findNextEventFrame` (`flatTracksAll`/`flatTracksValid`, by frame), and, in auto event mode, `findNextTagEvent` and `findPreviousTagEvent`, where `tagList = tagIntervals` is the global itself (no copy); `findNextFreeTagEvent`, `findPreviousFreeTagEvent` and the non-auto tag paths sort a `.filter` copy and are harmless. The in-place sorts reorder arrays that `flatTracks` and the table also see, until the next refresh. `chronogramData` is emptied in place (`length = 0`) rather than replaced, so holders of the old reference see the new content. Replacement: return a frozen result object from the pipeline; consumers copy before sorting.

- **Code:**
  - `ChronoControl.js`: `updateFlatTracks`, `updateTagsLabels`
  - `ChronoControlInteraction.js`: `findNextObsEvent`, `findNextEventFrame`, `findNextTagEvent`, `findPreviousTagEvent`
- **Links:** BEH-801, BEH-803, BEH-817, SEAM-801, SEAM-803

## DEBT-804: obs.cx/cy written by the read path, bool_acts used for activity

_The `cx`/`cy` part is FIXED in slice 5 (maintainer change 2026-11-16): `updateChronogramData` no longer writes them, it calls `events.checkValid(F, id)`, which only logs a warning when `x + width/2` and `cx` disagree (`logging.storeCheckValid`). `bool_acts` is derived (DEBT-701)._ `updateChronogramData` overwrote `obs.cx`/`obs.cy` of every kept observation at each refresh [read] (Observation already stores them, ENT-001) and reads `obs.bool_acts` instead of `labels` [read] (DEC-003: shim derived from `labels`). Also dead locals `id_eff` (`String(Number(id)%50)`, unused) and `labelArray` [read]. Replacement: compute the center in the pure stage without writing; derive the four activities from `labels`.

- **Code:**
  - `ChronoControl.js`: `updateChronogramData`
- **Links:** BEH-805, DEC-003

## DEBT-805: Same-frame rows split intervals (overlap)

One observation with several activities yields several rows with the same `x`; `createIntervalList` requires `x[i]-x[i-1] == 1`, so a duplicate frame closes the interval and opens an overlapping one [read]. The intended behavior is the header comment "only one interval by sequential track". Replacement: dedupe frames per ID before merging.

- **Code:**
  - `ChronoControl.js`: `createIntervalList`, `updateChronogramData`
- **Links:** BEH-805, BEH-807

## DEBT-806: Aggregated labels only on the last interval of each ID

`tempInterval.labels = Object.keys(haslabel).join(',')` is placed after the inner loop, so only the last interval of an ID gets it; earlier intervals keep their first row's raw labels, and `crosses`, `wrongid`/`newid` flags depend on that [read]. Also `|=` turns booleans into numbers. Replacement: finalize labels when each interval is pushed.

- **Code:**
  - `ChronoControl.js`: `createIntervalList`
- **Links:** BEH-807, BEH-808, BEH-809

## DEBT-807: tagMode dead branches and stale flatTags in getTTags

`tagMode` is always `'Tracks'`, so the `'Tags'` ("Legacy") branches of `getFlatTags`, `getTTags`, `validIdsChrono`, `getTag` are dead [read]. `getTTags` called from `setTags` reads the previous `flatTags` global [read]; the stale `ttags`/`allTagsID` are replaced a few statements later by the `refreshChronogram` that ends `setTags` [read], so the hazard is the hidden dependency, not a lasting wrong state. In the dead `'Tags'` mode `validTagIdsDomain` tests `d.labels` on tag intervals, which carry `labeling`, not `labels` [read]. Free tags (no observation) are consequently never displayed. Replacement: remove the mode or make it an explicit option; pass inputs as parameters.

- **Code:**
  - `ChronoControl.js`: `getFlatTags`, `getTTags`
  - `AnnotationIO.js`: `setTags`
  - `OverlayControl.js`: `tagMode`
- **Links:** BEH-810, BEH-811, OQ-801

## DEBT-808: Frame/ID filtering duplicated across stages

Frame filter, restrict ID and exclude ID are re-implemented in `updateFlatTracks`, `updateChronogramData`, `getFlatTags`, `getTTags` (see the `TODO: filter in only one place` comment) [read]. `hideFlowers` and `hideInvalid` are applied in only some of them (BEH-820). Replacement: one `applyFilters(flat, filters)` stage feeding the others.

- **Code:**
  - `ChronoControl.js`: `updateFlatTracks`, `updateChronogramData`, `getFlatTags`
- **Links:** BEH-803, BEH-820, SEAM-804

## DEBT-809: Hamming/DM average diluted by sentinel frames

`hammingavg`/`dmavg` divide by the whole interval length although `hamming >= 1000` frames add nothing; the first sample is added unconditionally; missing `dm` gives NaN [read]. Intent unknown (OQ-806). Replacement: define explicitly (average over real detections) and handle missing fields.

- **Code:**
  - `ChronoControl.js`: `updateTagIntervals`
- **Links:** BEH-813, OQ-806

## DEBT-810: labeling.leaving never produced

The tag renderer tests `interval.labeling.leaving` but `updateTagsLabels` only sets `labeled, entering, falsealarm, wrongid` [read]. `labeling` is also overwritten by the last matching annotation (order dependent). Replacement: generic label set on the interval (DEC-003).

- **Code:**
  - `ChronoControl.js`: `updateTagsLabels`
  - `ChronoControlActivitiesLegacy.js`: `setTagGeom`
- **Links:** BEH-815, DEC-003

## DEBT-811: Quadratic tag labelling, magic margin 20

`updateTagsLabels` loops every interval over every observation and uses a hard-coded 20-frame margin (`f > begin-20 && f < end+20`) [read]. Replacement: index observations by ID, name the constant (configurable).

- **Code:**
  - `ChronoControl.js`: `updateTagsLabels`
- **Links:** BEH-815

## DEBT-812: Virtual interval keeps the old row

The virtual interval is `Object.assign({}, interval)` with only `id` (and `oldid`, `wrongid`, `virtual`) changed, so `y`, which the renderer uses to place it, stays `idAxisMap(oldid)`, and `labeling` is shared by reference [read]. Whether the old row is intended is OQ-807. Replacement: recompute `y`, deep-copy `labeling`.

- **Code:**
  - `ChronoControl.js`: `updateTagsLabels`
  - `ChronoControlActivitiesLegacy.js`: `setTagGeom`
- **Links:** BEH-816, OQ-807

## DEBT-813: hideFlowers only partial

Applied only in `updateChronogramData`; flowers remain in the obs table, event navigation and tag intervals [read]. The "ID starts with F" rule is hard-coded. Replacement: part of the single filter stage, rule configurable.

- **Code:**
  - `ChronoControl.js`: `click_hideFlowers`, `updateChronogramData`
- **Links:** BEH-820, DEBT-808, OQ-802

## DEBT-814: Inconsistent ID list parsing, uninitialised excludeIDArray

`onRestrictIDChanged` and `onExcludeIDChanged` split without trim/empty filter while `setRestrictID` trims; `excludeID`/`excludeIDArray` are never initialised and are implicit globals; toggling Restrict never re-reads the text [read]. Replacement: one `parseIdList` used by every entry point.

- **Code:**
  - `ChronoControl.js`: `onRestrictIDChanged`, `onExcludeIDChanged`, `setRestrictID`, `click_restrictID`
- **Links:** BEH-821, BEH-822

## DEBT-815: Frame filter default max -1 excludes everything

`config.frameFilter.frameMax = -1` is only normalised when the user edits the max box; activating the filter with defaults hides all frames [read]. `auto` is not clamped to [0, nframes). Box values are stored with `Number()` and no check: empty text gives 0, non-numeric text gives `NaN`, which makes that bound exclude nothing [read] (BEH-843, DEBT-824). Replacement: normalise and validate at use.

- **Code:**
  - `ChronoControl.js`: `setFrameFilter`
- **Links:** BEH-823, BEH-843, OQ-813

## DEBT-816: Dead ID remap text input

`idAxisMap_inputChanged` and `update_idAxisMap_input` use the selector `'#'` and `.val` as a property (no call), and the input is commented out in the page [read]. Replacement: delete.

- **Code:**
  - `ChronoControl.js`: `idAxisMap_inputChanged`, `update_idAxisMap_input`
- **Links:** BEH-824

## DEBT-817: Dead RGB contrast button, RGB coefficient

`#tagsUseRgbFilterContrast` calls `chronoFilter('RGB_contrast')`, which has no branch; the RGB luma uses 0.1114 for blue [read]. Hamming buttons are not toggles and show no state. Replacement: implement or remove; show the active Hamming mode.

- **Code:**
  - `OverlayControl.js`: `chronoFilter`, `refreshTagsParameters`
  - `labelbee_page.html`: `#tagsUseRgbFilterContrast`
- **Links:** BEH-825, BEH-826

## DEBT-818: ROI filter state split between page and globals

`ROI`, `flag_useROI`, `excludeRects`, `flag_useExcludeRects` and the predicates `tagsSampleFilterROI`/`tagsSampleFilterExcludeRects` live in `OverlayControl.js`, are read by `ChronoControl.js` (`updateChronogramData`, `createIntervalList`, `cleanObsoleteEvents`), and each change callback calls `refreshChronogram` and `videoControl.refresh` directly [read]; `ROIChanged` and `excludeRectsChanged` first call `onTagsParametersChanged` (which already does both) and then call both again, so each ROI or exclude-region edit refreshes the chronogram and the video twice [read]. Replacement: a `Filters` config object passed to the pure stages.

- **Code:**
  - `OverlayControl.js`: `ROIChanged`, `excludeRectsChanged`, `onTagsParametersChanged`
  - `ChronoControl.js`: `updateChronogramData`
- **Links:** BEH-827, BEH-839, SEAM-805

## DEBT-819: User JavaScript filters via Function(), dead tagsIDFilter

`tagsSampleFilterCustom` (compiled in `refreshTagsParameters`), `tagsIntervalFilter` (recompiled inside the predicate at every call, so its syntax errors surface late, in `updateTagIntervals`) and `tagsIDFilter` (compiled in `refreshTagsParameters`, never called in the code read) compile arbitrary text from the page [read]. Replacement: remove the dead ID filter and its `#tagsIDFilter` box; typed filter config for the rest, keeping scripting as an explicit advanced option or dropping it (OQ-804).

- **Code:**
  - `OverlayControl.js`: `refreshTagsParameters`, `tagsIDFilter`, `tagsIntervalFilter`
- **Links:** BEH-828, BEH-844, OQ-804

## DEBT-820: Domain order discards sortIds; sortIds mutates input; Set passed

`updateChronoYDomain` always applies the numeric comparator `-Number(b)+Number(a)` (non-numeric IDs give NaN, order undefined), overriding `sortIds` [read]. `sortIds` sorts the caller's array in place [read]. `validAllTagIdsDomain` passes `allTagsID`, which is a Set between `getTTags` and the conversion in `updateChronoData` (a Set has no `sort`), but the function has no active caller (its only reference is commented out in `onClickNextID`), so this hazard is latent dead code [read]. Replacement: one pure ordering function returning a new array.

- **Code:**
  - `ChronoControl.js`: `updateChronoYDomain`, `sortIds`, `validAllTagIdsDomain`
- **Links:** BEH-830, BEH-831

## DEBT-821: cleanObsoleteEvents hard-coded rules, destructive, no undo

Threshold `dm < 20` is a literal, not the `#tagsMinDM` value; deletes in place, leaves empty frames, no dirty flag or history; two independent `if`s instead of `else if` [read]. Replacement: pure `findObsolete(...)` returning a list, applied through a store command with undo (OQ-009).

- **Code:**
  - `ChronoControl.js`: `cleanObsoleteEvents`
- **Links:** BEH-833, INV-001, OQ-805

## DEBT-822: interpolateTags is console-only, mutates Tags

Never called from the page, clears `tagIntervals`, writes new tags with sentinel `hamming: 1000`, may create duplicates, dead `end++` [read]. Replacement: pure function returning added tags, or remove (OQ-806).

- **Code:**
  - `ChronoControl.js`: `interpolateTags`
- **Links:** BEH-834, OQ-806

## DEBT-823: computeMotionDirection discards its result; cacheTags wrong key

`dir` is set on `tagIntervals` and then `updateTagIntervals()` rebuilds the array; `cacheTags` tests `ttags[key]` (id-keyed) instead of `tagCache[key]`, so tags with the same frame and ID overwrite each other [read].

- **Code:**
  - `ChronoControl.js`: `computeMotionDirection`
  - `Model.js`: `cacheTags`
- **Links:** BEH-835

## DEBT-824: Unvalidated filter inputs

The ROI text checks only the number of comma-separated parts and stores `Number()` of each (`NaN` for text, 0 for empty), so one bad value makes every tag fail the ROI test while it is on [read]. The exclude-region JSON dialog assigns `JSON.parse(text)` with no try/catch and no shape check, so invalid JSON throws and a wrong shape gives `NaN` tests [read]. The frame-filter boxes store `Number(text)` without a check (DEBT-815). "Reinit" writes the full video size into the `#ROI` text but not into `ROI`, leaving text and active ROI inconsistent [read]. Replacement: parse and validate each input in one place (`parseRoi`, `parseRects`, `parseFrameRange`), show an error, keep the previous value.

- **Code:**
  - `OverlayControl.js`: `onROITextChanged`, `updateROIFromVideo`, `initExcludeRectsDialog`
  - `ChronoControl.js`: `setFrameFilter`
- **Links:** BEH-827, BEH-841, BEH-843, DEBT-815, OQ-808

## DEBT-825: `overlay.hardRefresh` writes the store (pick-frame default span)

[read] FIXED in slice 6 step 4b: the default span is written in `setInteractionMode`; `hardRefresh` writes nothing (`test_f2b`). Was: in pick-frame mode, `hardRefresh` gives the observation a default `span` with `events.update` when it has none (`labelbee/static/labelbee/js/OverlayControl.js:970-972`). A view writes the model, inside a refresh: it breaks the rule that a refresh never writes the store (ADR 0009 section 0) and can notify during a refresh. The default belongs to the entry of the mode (`setInteractionMode('pick-frame')`, `OverlayControl.js:183-200`), which already has the observation and the frame.

- **Code:**
  - `OverlayControl.js`: `hardRefresh`, `setInteractionMode`
- **Links:** ADR 0009, DEBT-712

## DEBT-826: Tag editing works on the tag store, not on the events (legacy)

[read] Since the tags are expected inside the events at load time (ADR 0009 [Q34](QUESTIONS.md#q34)), a tag fix is a field of the event (`obs.fix`), and nothing else needs to change. The tag-fix helpers still treat `AnnotationStore.getTags()` as a second model and mutate it directly: `spreadTagFix` copies `obs.fix` onto every covered tag (`tag.fix`, `tag.p` rotated from `tag.fix.oldp`), `bakeTagFix` / `bakeAllTagFixes` rewrite `tag.id` and `tag.p` of the tags (and `obs.fix` for `falsealarm`), `undoTagFix` / `undoAllTagFixes` revert them, `deleteFalsealarmTags` rewrites the container. These writes bypass `events`, so the refresh audit ([ADR 0009](../design/0009-slice-refresh-logic.md) section 0) cannot see them; they are correct today only because a `refresh.*` call follows them by convention. `getCoveredTags` is a read helper that writes `span` in the store and throws for a draft (`events.get` returns `undefined`). `rotatep` is an implicit global. [read]
Replacement: the displays (zoom, chronogram) derive the rotated tag from `obs.fix`; the helpers and `tag.fix` go away; `bakeAllTagFixes` becomes one `events.batch`; the callers `rotateTag` and `onClickAlternateTag` only write the unit and call `refresh.update()`. Needs the tag-in-event decision first (Q34), then a view that reads `obs.fix`. Until then the helpers are marked LEGACY in the code and left as they are.

- **Code:**
  - `ZoomView.js`: `ZoomOverlay.spreadTagFix`, `ZoomOverlay.bakeTagFix`, `ZoomOverlay.bakeAllTagFixes`, `ZoomOverlay.undoTagFix`, `ZoomOverlay.undoAllTagFixes`, `ZoomOverlay.deleteFalsealarmTags`, `getCoveredTags`, `rotatep`
  - `ChronoControl.js`: `augmentTrackWithTag` (already a console one-shot)
- **Links:** ADR 0009, Q34, DEBT-515, DEBT-517, DEBT-518, DEBT-519, DEBT-520

## DEBT-827: `modifyCurrentObsSpan` no longer calls `updateTagsLabels` / `drawChrono`: check nothing was lost

[read] Slice 6 step 4e-2 replaced the tail of `modifyCurrentObsSpan` (`updateTagsLabels(); drawChrono()`) by `refresh.chrono()` (`labelbee/static/labelbee/js/SelectionControl.js:944`); the old call is dropped on purpose (maintainer, 2026-11-17: cleaner in the derived-data pipeline). `refresh.chrono()` is the full `refreshChronogram`: `updateChronoData` calls `updateTagsLabels` itself (`labelbee/static/labelbee/js/ChronoControl.js:1009`), then `drawChrono`, then `renderObsTable`, so the span display should be the same or fresher, and `test_f1` / `test_l17` pass. Not verified: whether `updateTagsLabels` (it sets `ann.span` and `b1/b2` on `flatTracksAll` from `obs.span`) has other consumers that relied on running without the rest of `updateChronoData`, and whether the `flatTracksAll` rebuild changes the selection or the time marks. To check later (maintainer, 2026-11-17).

- **Code:**
  - `SelectionControl.js`: `modifyCurrentObsSpan`
  - `ChronoControl.js`: `updateTagsLabels`, `updateChronoData`
- **Links:** ADR 0009, DEBT-826

## DEBT-828: `refresh.form` reads the overlay's active rect instead of the store

[read] The `form` step of `refresh` is `updateForm(overlay.getActiveRect())` (`labelbee/static/labelbee/js/annotation/RefreshBridge.js:12`), so the form is filled from fabric's state (the rectangle being edited), and so are the other callers of `updateForm` (`labelbee/static/labelbee/js/labelBee.js`, `updateSelectionPanels` in `SelectionControl.js`). The form shows the observation, which is the model's: it should read the observation of the current selection in the store (`events.get(selection.getKey())`, with the draft case aside) and not go through the overlay. Fabric's active rect and the selection can disagree during a drag or on a draft, which this hides. To do later (maintainer, 2026-11-18), after the active/selected vocabulary steps (ADR 0009 section 0b, 6d-6i).

- **Code:**
  - `annotation/RefreshBridge.js`: `form`
  - `SelectionControl.js`: `updateForm`, `updateSelectionPanels`
  - `labelBee.js`: `updateForm` callers
- **Links:** ADR 0009, DEBT-712

## DEBT-829: `VisitWidget.open` is dead and broken

[read] `VisitWidget.prototype.open` (`labelbee/static/labelbee/js/VisitControl.js:289-299`) calls `this.getActiveRect()` and `this.interaction`, neither of which a `VisitWidget` has (it was `this.getActiveObject()` before step 6d, so already broken), and nothing calls `open`. Found while renaming the accessors (step 6d), left as it was.

- **Code:**
  - `VisitControl.js`: `VisitWidget.prototype.open`
- **Links:** ADR 0009, DEBT-828

## DEBT-830: `onObjectDeselected` re-enters a running rebuild and leaves `lastActiveRect` stale

[read] `onObjectDeselected` (`labelbee/static/labelbee/js/OverlayControl.js:3953-3970`) is the fabric handler of `object:deselected`. For a draft rectangle it removes the rect and calls `videoControl.refresh()` itself; for any other rectangle it only calls `updateDeleteButton()` and leaves `overlay.lastActiveRect` pointing at the deselected rect. `hardRefresh` calls `canvas1.clear()`, and fabric's `clear()` discards the active object, so [inferred, from the fabric source, not run] the handler can run inside a rebuild: with a draft active, a rebuild starts a second one, which the nesting guard of `refresh.*` cannot see (it only knows its own calls). `updateDeleteButton()` also runs outside any refresh. Not changed in slice 6 (behavior-preserving). To do: the draft rect is retired with `newRectForCurrentTag` (ADR 0009, 1e); until then, decide whether a deselect of a draft is a controller action (the click that causes it) and remove the call from the handler.

- **Code:**
  - `OverlayControl.js`: `onObjectDeselected`, `OverlayControl.prototype.hardRefresh`
- **Links:** ADR 0009, DEBT-502

## DEBT-831: A write to `selection` nobody refreshes is silent

[read] `refresh.audit(events)` (`labelbee/static/labelbee/js/annotation/Refresh.js:67`) subscribes to the events store only. `SelectionModel` (`select`, `changeFrame`, `clear`) calls no `refresh.*` (ADR 0009 section 0b) and is not audited, so a writer that changes the selection and forgets `refresh.selection()` shows nothing and is reported nowhere. The same blindness as the tag store (DEBT-826). Proposed: `SelectionModel` takes an observer like `events.subscribe`, and the audit lists a selection change with no `refresh.selection()` / `refresh.rebuild()` after it.

- **Code:**
  - `annotation/Refresh.js`: `audit`
  - `annotation/SelectionModel.js`
- **Links:** ADR 0009, DEBT-826

## DEBT-832: Selection shown twice when a box is created; `refreshZoom` runs up to three times

[ran] Baseline scenario `create` (`refactor/tests/browser/refresh_baseline.json`): the new rectangle is activated by fabric (`onObjectSelected` finds no echo and calls `refresh.selection()`), then `submitDraft` calls `refresh.rebuild()`, and `hardRefresh` shows the selection again: two selection chains (`updateForm`, `updateChronoSelection`, `refreshZoom` x2 each). [ran] `refreshFromSelection` calls `refreshZoom` twice itself (DEBT-502), so a rebuild with a selection runs it three times (two in the panels, one for the rebuild's zoom step); the `delete` and `swap` scenarios show `updateDeleteButton` x3 inside `hardRefresh`. Harmless today (the steps are idempotent), pinned by the baseline so that a change shows. After step 7: `syncFromTracks(true)` no longer zooms itself when `refreshFromSelection` does (`refreshZoom` x3 became x2), and `drawChrono` no longer calls `updateChrono()` after `axes.ydomain()`, which triggers it (`updateChrono` x2 became x1 per chrono refresh). Still open: the debounced layout redraw after a height change, `updateTagIntervals` in both `updateChronoData` and `updateChrono`, `updateDeleteButton` x3 (DEBT-830), the closing `refresh.zoom()` of `rebuild()`. To do: make `onObjectSelected` of a draft not refresh (the rebuild follows), drop the extra `refreshZoom` calls.

- **Code:**
  - `OverlayControl.js`: `onObjectSelected`, `OverlayControl.prototype.hardRefresh`
  - `SelectionControl.js`: `submitDraft`, `updateSelectionPanels`
  - `ZoomView.js`: `ZoomOverlay.refreshFromSelection`
- **Links:** ADR 0009, DEBT-502, DEBT-712

## DEBT-833: Store writes with no refresh after them

[read] Two writers change the store and refresh nothing: `storeVisitedFlower` (`labelbee/static/labelbee/js/VisitControl.js:409-411`) does `events.update(frame0, id, {visit: ...})`, so the visit widget and the form show the old flower until something else refreshes; `modifyCurrentObsSpan` in mode `copy` (`labelbee/static/labelbee/js/SelectionControl.js:835-838`) writes a derived span (`events.update`) and returns before its `refresh.chrono()` at the end. `refresh.audit` lists both (they are store writes with no `refresh.*` after them). Left as it was (step 4e kept the behavior); the fix is one call each (`refresh.form()` for the flower, `refresh.chrono()` for the span).

- **Code:**
  - `VisitControl.js`: `storeVisitedFlower`
  - `SelectionControl.js`: `modifyCurrentObsSpan`
- **Links:** ADR 0009, DEBT-827

## DEBT-834: Background click and select-by-frame still rebuild by hand

[read] The live path of `onMouseDown_selectMultiframe` (`labelbee/static/labelbee/js/OverlayControl.js:3684`) ends with `deselectBee(); videoControl.refresh();` and `selectBeeByIDandFrame` (`labelbee/static/labelbee/js/SelectionControl.js:540`) with `selection.select(...); videoControl.refresh();` when the frame does not change. The `refresh.selection()` version of the background click is in the branch `!clickMultiframe` (`OverlayControl.js:3637`), dead since `clickMultiframe` is a constant `true`. A full overlay rebuild for a selection change; `refresh.selection()` is enough, as for a click on a rectangle. Behavior kept in step 6c to keep the golden/baseline stable.

- **Code:**
  - `OverlayControl.js`: `onMouseDown_selectMultiframe`
  - `SelectionControl.js`: `selectBeeByIDandFrame`, `deselectBee`
- **Links:** ADR 0009, DEBT-832

## DEBT-835: `#selectID` keeps its text after an explicit deselect

[read] `updateSelectionPanels` skips `updateSelectID` when the selection id is null (`labelbee/static/labelbee/js/SelectionControl.js:562`, comment "the field keeps its text after an explicit deselect"), so after a click on the background the ID field still shows the old id, and Enter in it selects it again. It was so before slice 6 (`selectBee`/`deselectBee` events) and was kept by step 6c; whether it is wanted (a quick re-select) or an oversight is the maintainer's call.

- **Code:**
  - `SelectionControl.js`: `updateSelectionPanels`, `updateSelectID`, `onSelectIDChanged`
- **Links:** ADR 0009

## DEBT-836: Pan and zoom rebuild every rectangle on every mouse event (fixed: drag, wheel; `canvasTransformReset` and `Center` still rebuild)

[read] `onMouseDown_panning` and `onMouseWheel_Zooming` call `videoControl.refresh()` (`labelbee/static/labelbee/js/OverlayControl.js:3716`, `:3723`, `:3850`, `:3862`) per mouse move and wheel tick: `hardRefresh` recreates all rectangles and shows the selection, for a change of the canvas transform only. An update (`refresh.overlayUpdate()`) or a plain re-render would do. Fixed after step 7: `canvasTransformSet`, `Scale` and `Pan` call `refreshOverlay()` (the rects follow their obs), the four `videoControl.refresh()` of the mouse handlers were a second rebuild after the setters' own `hardRefresh()` and are gone; `onTrackWindowChanged` calls `refresh.overlayUpdate()`. A draft rect (no obs) no longer disappears on a pan: it stays at its old canvas position until the next rebuild. `refreshOverlay()` now redraws the video frame itself (`refreshOverlay(true)` skips it, used by `hardRefresh`), which also fixed the tracks piling up after every label edit and drag tick (commit 784cfb2d, test l24); with no valid video an update clears the rects until the next rebuild.

- **Code:**
  - `OverlayControl.js`: `onMouseDown_panning`, `onMouseWheel_Zooming`
- **Links:** ADR 0009

## DEBT-837: Direct refresh calls left in custom code (census after slice 6 step 6i)

[read] Counted by grep, comments excluded: `refresh.*` 42 call sites; still direct: `videoControl.refresh()` ~16 (show tags and track window `OverlayControl.js:2567`, `:2572`, `:2606`; ROI, exclusion and tag parameters `:2703`, `:2799`, `:3027`; background click `:3684`; pan and zoom; `SelectionControl.js:540`; undo `:646`), `refreshChronogram()` ~30 (chronogram toggles in `ChronoControl.js` ~16, `ChronoControlInteraction.js:453`, `:478`, `:504`; tag fixes `ZoomView.js:1914`, `:1932`, `:1978`; loaders `AnnotationIO.js:363`, `:522`; `OverlayControl.js:2702`, `:2798`, `:3026`, `:3068`), `.hardRefresh(` ~19 (mode switches and the frame change in `VideoControl.js:880`). Each can drift from the sequence of `refresh.rebuild()` / `refresh.update()`. The picture is `design/0009-refresh-mvc.pdf` (pages 5 to 7).

- **Code:**
  - `OverlayControl.js`, `ChronoControl.js`, `ChronoControlInteraction.js`, `ZoomView.js`, `AnnotationIO.js`, `VideoControl.js`
- **Links:** ADR 0009, DEBT-712, DEBT-826

## DEBT-838: 10 loader golden tests fail when all `golden/` directories run together

[ran] `node --test refactor/tests/golden/` after slice 6 (301 pass, 10 fail): `eventsFromServer`, `loadEventsFromServerByID` (2), `loadTracksCSVFromServer` (2), `loadTrackTaggedCSVFromServer`, `loadTagsCSVFromServer`, `loadTracksCSVFromDB`, `clickLoadTracksCSVFromServer`, `clickLoadTracksTaggedCSVFromServer`. The same tests pass run alone (`refactor/tests/golden/csvloaders/`: 9 pass) and the failures are identical with the committed `core/Notifier.js` of before the log-order change, so they do not come from it; most likely state shared between the test directories in one process (not investigated). Slice 6 steps were checked per directory (`slice6/`, `csvloaders/`).

- **Code:**
  - `refactor/tests/golden/csvloaders/csv-loaders.test.js`, `refactor/tests/golden/harness/io-env.js`
- **Links:** ADR 0009

## DEBT-839: Documents describing the state before slice 6 (diagram, views, behaviors)

[read] (1) `refactor/design/0009-refresh-mvc.pdf` (source `refactor/tools/refresh_mvc_pdf.py`) was drawn at step 7 and not regenerated after the fixes since: it shows `refreshZoom` x3 and `updateChrono` x2 per rebuild (DEBT-832 now x2 and x1) and pan and zoom as rebuilds (DEBT-836); regenerate it when the remaining duplicates are done. (2) `refactor/intent/docs/view_debt.md`, `view_modules.md`, `view_seams.md` were already out of date before slice 6 (`spec_view.py` prints symbol warnings for names that no longer exist: `selectBeeByID`, `selectId`, `storeObs`...); the sources `debt.md`, `modules.md`, `seams.md` were updated, the views only regenerated. (3) `intent/behaviors/` and `capabilities.md` keep the pre-refactor names on purpose (ADR 0009 section 8).

- **Code:**
  - `refactor/tools/refresh_mvc_pdf.py`, `refactor/intent/tools/spec_view.py`
- **Links:** ADR 0009, DEBT-832, DEBT-836
