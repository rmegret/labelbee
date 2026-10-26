# Stage 6: Findings, smells and risks

Severity: **H** = fix soon / data or security impact, **M** = real defect or large
maintenance cost, **L** = hygiene. All are from reading; none reproduced
(nothing was run). "Behaviour-preserving" refactor rules mean bugs below are
**listed, not fixed**; see Stage 7 for how to treat them.

## 6.1 Security and data integrity

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| S1 | H | A real-looking mail account + password is committed in `local_settings_example.py` (value intentionally not repeated here). Needs rotation and removal from history decision | `labelbee/settings/local_settings_example.py` |
| S2 | H | `local_settings.py` is tracked (env-driven, but contains an admin email and the pattern invites committing secrets); `.gitignore` says `labelbee/private/app.sqlite` and `VideoList.js` (the latter is tracked anyway, so the ignore rule is ineffective) | settings, `.gitignore` |
| S3 | H | `create_app` logs the full `app.config` (SECRET_KEY, DB URI with password) at INFO into `flask_errors.log` | `app.py` end |
| S4 | H | `POST /api/v1/annotations` trusts `created_by_id` from the client form (any logged-in user can write as another) | `resources/annotations.py` |
| S5 | M | `GET/DELETE /annotation/<id>` have no ownership/role check (any logged-in user can read or delete any annotation); `GET /annotations?allusers=` passes the raw query value as a user id | `resources/annotations.py` |
| S6 | M | API blueprint is CSRF-exempt while using cookie session login | `app.py` |
| S7 | M | `/data/<path>` (download blueprint) has no auth decorator; two data roots (`static/data` vs `$DATA_DIR`), the second behind login | `download.py`, `rawdata.py` |
| S8 | M | `SECRET_KEY` and `DEBUG=True` defaults in the example config are insecure if copied verbatim | example settings |
| S9 | M | Video upload writes to `$ROOT_PATH/<video_name>.mp4` with `video_name` from the form, no `secure_filename`/normalisation seen (path traversal possible if `video_name` contains `../`) | `resources/video.py` |
| S10 | L | `RawDataAPI` returns HTTP 200 with an error dict on exceptions; `logger.error` used for debug output | `rawdata.py` |

## 6.2 Defects visible by reading (client)

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| C1 | H | Saving mutates live data: `Object.assign(evt)` (1 arg) aliases `Tracks[f][id]`, then deletes fields and rounds geometry in place | `AnnotationIO.js` `convertTracksToV1` |
| C2 | M | `loadEventsFromServerByID` (hash route `#video_data=`) uses undefined `tag_event_ID`, `theDialog`, `div`; returns before ajax completes | `AnnotationIO.js:1505` |
| C3 | M | `onVideoLoaded2` resets `delayedSeekFrame` before using it, so `#frame=` after load seeks to `undefined` | `VideoControl.js:1315` |
| C4 | M | `selectVideoBy_video_id` does not await/return `videoSelected`; router continues too early. ajax `error` handler `throw`s in a callback | `VideoList.js:653` |
| C5 | M | `ZoomOverlay.bakeTagFix()` shadows `obs` in the no-arg path; leaks global `k` | `ZoomView.js:1911` |
| C6 | L | `setTags` v1 validation checks the old global `Tags` instead of `obj`; bitwise `&` instead of `&&`; `typeof obj == "array"` never true | `AnnotationIO.js` |
| C7 | L | `cacheTags` tests `ttags[key]` instead of `tagCache[key]` | `Model.js:271` |
| C8 | L | `selectBeeByID` uses undeclared global `axes` (set in `initChrono`) | `SelectionControl.js` |
| C9 | M | Read path mutates data: `augmentTrackWithTag` writes `obs.tag` on every chrono refresh. `copyObs` copies a fixed field list (not `tag`, `span`... ) so clones (`cloneObs`, undo copies) silently drop them; `storeObs` only keeps them because it copies *into* the existing object | `ChronoControl.js`, `Model.js` |
| C10 | M | `labelbee_user_page` hardcodes `datasets/gurabo10avi/...` (the `video_url`/`tag_file` params are overridden) and references undefined `upload_dir` (NameError swallowed by bare `except`) | `blueprints/labelbee/labelbee.py` |

## 6.3 Architecture smells (client)

- **Arch1** Implicit globals everywhere (see 3.3). No strict mode possible; name
   collisions are silent; load order is the dependency graph.
- **Arch2** God files: `OverlayControl.js` mixes 8+ concerns (5.2). Three "classes"
   (`OverlayControl`, `Chronogram`, `ZoomOverlay`) are shells around free
   functions that use singletons by name, so none can be instantiated twice or
   tested alone.
- **Arch3** No model layer / change notification (4.3): each writer hand-calls the
   right refreshers.
- **Arch4** State in the DOM: toggles are read from button classes / `checked`;
   many `$('#id')` strings embedded in constructors.
- **Arch5** UI built from HTML strings inside logic (pick-frame panel in
   `overlay.hardRefresh`, 80+ lines); inline `onclick` in a 1.6k-line template.
- **Arch6** Format/I-O mixed with UI: parsers call dialogs (`alert`, `fromServerDialog.setMessage`).
- **Arch7** Cycles VideoControl <-> Overlay, Overlay <-> Selection <-> Zoom (5.1).
- **Arch8** Performance: full recompute of all derived chrono data on every edit
   (`refreshChronogram`), `for..in` over sparse objects, `JSON` deep copies
   (`deepcopy` in `copyObs` for `fix`).
- **Arch9** Configuration constants in code: ROI, exclude rects (Gurabo 5MP),
   tag image root `/data/tags/tag25h5inv/png`, hamming matrix URL, label
   vocabulary, `tagsfamily: "tag25h5"`, hard-coded `300x600` bee box.
- **Arch10** Logging: `console.log` throughout, only partially guarded by `logging.*`.

## 6.4 Dead / legacy candidates (verify with a "usage" grep before deleting)

- **Leg1** `labelbee/legacy/views.py` (only in a comment); `labelbee/models.py`
  `CustomUserManager`, `MyRegisterForm` (not used by `UserManager(app, db, User)`).
- **Leg2** `labelbee/database/*/model.py` duplicates of `models.py` classes.
- **Leg3** `ChronoControlActivitiesLegacy.js` (808 lines, behind a flag; shares
  globals with the live code, so removing means checking `allIntervals` users).
- **Leg4** `DuckDB.js`, `SQLiteDB.js` (not loaded), and `loadTracksCSVFromDB` callers.
- **Leg5** `VideoControl.loadVideo` (marked DEPRECATED), `interpolateTags` (defined,
  never called), `rest/v2/*` strings, `defaultVideoList` (unused after
  commenting), `fabric.canvasex.js`, `require.js`, `main.js`, `bootstrap.min.js` in `extern/`.
- **Leg6** Static duplicates: `static/{css,fonts,images}` vs `static/labelbee/{css,fonts,images}`
  (two near-identical `bootstrap.css`, 6768 lines each, differ).
- **Leg7** Docs/ops: `Procfile` (`manage:app`), `tox.ini`, `tests/*`, root README
  (`manage.py`, `runtests.sh`), `Dockerfile` (MySQL image with `data.sql` absent
  from the repo), `labelbee/README.md`.

## 6.5 Backend smells

- **Back1** `models.py` is a bucket (models, forms, user manager). `database/*/api.py`
  is a decent query layer but `video_data_list` is an 8-way copy-paste of one
  query (dynamic `filter` would be 10 lines).
- **Back2** N+1 queries in `AnnotationsAPI.get` (`get_user_by_id` per row).
- **Back3** Inconsistent response envelopes and error handling (see 2.5).
- **Back4** Auth checks hand-rolled per method.
- **Back5** Mixed `print`/`logger`; `exit()` inside `create_app` on missing settings.
- **Back6** Heavy dependencies (`opencv-python`, `numpy`) for video metadata only.
- **Back7** `app.py` circular import with `models.py`.

## 6.6 Documentation drift

- **Doc1** Root `README.md` contains three generations of instructions
  (`manage.py runserver`, `flask run`, `gunicorn`).
- **Doc2** `tox.ini` is stale (already noted in `refactor/README.md`).
- **Doc3** Sphinx sources exist (`docs/source`) but `docs/build` is committed.
