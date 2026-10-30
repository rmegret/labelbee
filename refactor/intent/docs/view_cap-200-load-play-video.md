<!-- GENERATED from ../behaviors/cap-200-load-play-video.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Load and play video ([CAP-200](view_capabilities.md#cap-200-load-and-play-video "Load and play video"))

Conventions: [../README.md](../README.md). Item format in sections 3-6.
All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.
A claim tagged `[unverified]` was not re-checked against code text in the last revision (kept from the first reading, critic review pending).
Files: `VideoControl.js` (class `VideoControl` and `VideoCache`), `VideoList.js` (`VideoManager`),
`labelBee.js` (page init, router, keyboard), `labelbee_page.html` (the page). The code is the reference
for behavior ([DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior")); the on-page Quick Help is not.

## Contents

| ID | Name |
|---|---|
| BEH-201 | [Page start-up state](#beh-201-page-start-up-state) |
| BEH-202 | [Ways to choose a video](#beh-202-ways-to-choose-a-video) |
| BEH-203 | [Load video from the database (list dialog)](#beh-203-load-video-from-the-database-list-dialog) |
| BEH-204 | [Select a database video (video id to loaded video)](#beh-204-select-a-database-video-video-id-to-loaded-video) |
| BEH-205 | [Load the media element](#beh-205-load-the-media-element) |
| BEH-206 | [Video load error](#beh-206-video-load-error) |
| BEH-207 | [Load a video by URI or from /data (manual load)](#beh-207-load-a-video-by-uri-or-from-data-manual-load) |
| BEH-208 | [URL hash router (video_id, video_data, frame)](#beh-208-url-hash-router-video_id-video_data-frame) |
| BEH-209 | [Delayed seek (seek requested before the video is ready)](#beh-209-delayed-seek-seek-requested-before-the-video-is-ready) |
| BEH-210 | [Video Info panel content](#beh-210-video-info-panel-content) |
| BEH-211 | [Time and image calibration inputs](#beh-211-time-and-image-calibration-inputs) |
| BEH-212 | [Video size and canvas size](#beh-212-video-size-and-canvas-size) |
| BEH-213 | [Video and canvases stack](#beh-213-video-and-canvases-stack) |
| BEH-214 | [Legacy video list (hidden subpanel)](#beh-214-legacy-video-list-hidden-subpanel) |
| BEH-215 | [Show/hide menu tabs (Features panel)](#beh-215-showhide-menu-tabs-features-panel) |
| BEH-216 | [Collapsible and sortable panel behavior](#beh-216-collapsible-and-sortable-panel-behavior) |
| BEH-217 | [Frame hash removal on navigation](#beh-217-frame-hash-removal-on-navigation) |
| BEH-218 | [Seek to a frame number (core seek)](#beh-218-seek-to-a-frame-number-core-seek) |
| BEH-219 | [Frame textbox](#beh-219-frame-textbox) |
| BEH-220 | [Step buttons and relative moves](#beh-220-step-buttons-and-relative-moves) |
| BEH-221 | [Leaving the page](#beh-221-leaving-the-page) |
| BEH-222 | [Use Cache toggle and mode switch](#beh-222-use-cache-toggle-and-mode-switch) |
| BEH-223 | [Playback in video mode (Play, Play Backwards, speed, x4)](#beh-223-playback-in-video-mode-play-play-backwards-speed-x4) |
| BEH-224 | [Frame-changed pipeline (single refresh path)](#beh-224-frame-changed-pipeline-single-refresh-path) |
| BEH-225 | [Playback in cache mode](#beh-225-playback-in-cache-mode) |
| BEH-226 | [Preview while Ctrl+moving over the chronogram (cache-preview mode)](#beh-226-preview-while-ctrlmoving-over-the-chronogram-cache-preview-mode) |
| BEH-227 | [Preview video (scale4.mp4) legacy mode](#beh-227-preview-video-scale4mp4-legacy-mode) |
| BEH-228 | [Frame, time and real-time conversions](#beh-228-frame-time-and-real-time-conversions) |
| BEH-229 | [VideoCache: storage, queue and decoding](#beh-229-videocache-storage-queue-and-decoding) |
| BEH-230 | [Cache controls (Preload, Cancel, Reset, status, size)](#beh-230-cache-controls-preload-cancel-reset-status-size) |
| BEH-231 | [Cancel leaves waiting seeks unresolved](#beh-231-cancel-leaves-waiting-seeks-unresolved) |
| BEH-232 | [Load a video and its tracks from the gurabo4 dataset](#beh-232-load-a-video-and-its-tracks-from-the-gurabo4-dataset) |
| BEH-233 | [State after a failed video load](#beh-233-state-after-a-failed-video-load) |
| BEH-234 | [Effects of a completed video load](#beh-234-effects-of-a-completed-video-load) |
| BEH-235 | [Seek and display in cache mode](#beh-235-seek-and-display-in-cache-mode) |
| BEH-250 | [Global keyboard handler: scope and dispatch order](#beh-250-global-keyboard-handler-scope-and-dispatch-order) |
| BEH-251 | [Frame stepping keys (full table)](#beh-251-frame-stepping-keys-full-table) |
| BEH-252 | [Play / pause keys](#beh-252-play--pause-keys) |
| BEH-253 | [Escape and Enter move focus to the bee ID field](#beh-253-escape-and-enter-move-focus-to-the-bee-id-field) |
| BEH-254 | [Shortcut keys whose effect is in other modules](#beh-254-shortcut-keys-whose-effect-is-in-other-modules) |
| BEH-255 | [Bee ID entry with Enter (`#I` and `#newid`)](#beh-255-bee-id-entry-with-enter-i-and-newid) |
| BEH-256 | [Key map of the left column (summary)](#beh-256-key-map-of-the-left-column-summary) |
| BEH-257 | [Mouse gestures owned by labelBee.js (layout)](#beh-257-mouse-gestures-owned-by-labelbeejs-layout) |
| BEH-258 | [Messages area and I/O status rows](#beh-258-messages-area-and-io-status-rows) |
| BEH-259 | [Page layout (panels and their ids)](#beh-259-page-layout-panels-and-their-ids) |

## BEH-201: Page start-up state

When the page has loaded (`window.onload` calls `init(video, video_data)`), the application is armed but no video is loaded. Observable outcome:
- the globals `statusWidget`, `videoManager`, `videoControl`, `overlay`, `chrono` exist and `getCurrentFrame` returns `videoControl.currentFrame` for all views ([SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)"), [DEBT-214](view_debt.md#debt-214-global-variables-and-implicit-globals "Global variables and implicit globals"); creation order is an implementation detail, but `videoManager` is built before `videoControl`);
- `videoinfo` holds placeholder values ([BEH-211](#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs")), the canvas is 600x400 ([BEH-212](#beh-212-video-size-and-canvas-size "Video size and canvas size")) and the Video Info panel shows the placeholder texts ([BEH-210](#beh-210-video-info-panel-content "Video Info panel content"));
- every `.collapsible` panel is a closed accordion except `.default-active` ones, which start open (`active: 0`) ([BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior")); inline blocks get their collapse arrow and click handler; `.sortable` containers are sortable ([BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior")); the "Show menu tabs" checkboxes are synced with the blocks ([BEH-215](#beh-215-showhide-menu-tabs-features-panel "Show/hide menu tabs (Features panel)"));
- the zoom view is initialised, the keyboard handler is bound ([BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order")), the leave prompt is installed ([BEH-221](#beh-221-leaving-the-page "Leaving the page")), the annotation model is empty, `defaultSelectedBee` is `undefined` and `change_id_force` is `'swap'`;
- the video list is requested once from the server ([BEH-203](#beh-203-load-video-from-the-database-list-dialog "Load video from the database (list dialog)")) and the URL hash router runs once on the current hash ([BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)")).
`init` ignores its two parameters (query-string `video` and `video_data`); video selection comes from the URL hash [unverified: the `init` call site and the parameter use were not re-read].
No video is loaded by default.

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#left-side`
- **Links:** [BEH-203](#beh-203-load-video-from-the-database-list-dialog "Load video from the database (list dialog)"), [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-210](#beh-210-video-info-panel-content "Video Info panel content"), [BEH-211](#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs"), [BEH-212](#beh-212-video-size-and-canvas-size "Video size and canvas size"), [BEH-215](#beh-215-showhide-menu-tabs-features-panel "Show/hide menu tabs (Features panel)"), [BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior"), [BEH-221](#beh-221-leaving-the-page "Leaving the page"), [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)"), [DEBT-214](view_debt.md#debt-214-global-variables-and-implicit-globals "Global variables and implicit globals")

## BEH-202: Ways to choose a video

Six code paths start a video load:
1. "Load Video from DB" in the Video Info panel (`#videoinfo`): `videoManager.videoListFromDB()` ([BEH-203](#beh-203-load-video-from-the-database-list-dialog "Load video from the database (list dialog)"));
2. "From URI": `videoManager.clickLoadVideoManual()` ([BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), prompt for a URL);
3. "From /data": `videoManager.filePicker.openDialog()` ([BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), server file browser);
4. the URL hash `#video_id=...` ([BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"));
5. the link "gurabo4 video+tracks_tagged" next to "Load Events from DB" in the annotation Load buttons: `clickLoadTracksTaggedCSVFromServer()` in `AnnotationIO.js` ([BEH-232](#beh-232-load-a-video-and-its-tracks-from-the-gurabo4-dataset "Load a video and its tracks from the gurabo4 dataset")), hard-coded to dataset `gurabo4`;
6. the hidden legacy "Video List" subpanel ([BEH-214](#beh-214-legacy-video-list-hidden-subpanel "Legacy video list (hidden subpanel)")), which uses the deprecated `videoControl.loadVideo`.
Paths 1-5 end in a `VideoManager` method that fills the global `videoinfo` and calls `videoControl.loadVideo2(videoPath)` ([BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-205](#beh-205-load-the-media-element "Load the media element")); the hash path and path 5 do so without waiting for each other ([DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts")).
The sibling links "from URI" and "from /data" of the same area load annotation tracks, not a video ([CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.videoListFromDB`, `VideoManager.clickLoadVideoManual`, `VideoManager.setVideoInfo`, `VideoManager.loadVideoManual`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `clickLoadTracksTaggedCSVFromServer`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videoinfo`
- **Links:** [BEH-203](#beh-203-load-video-from-the-database-list-dialog "Load video from the database (list dialog)"), [BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-214](#beh-214-legacy-video-list-hidden-subpanel "Legacy video list (hidden subpanel)"), [BEH-232](#beh-232-load-a-video-and-its-tracks-from-the-gurabo4-dataset "Load a video and its tracks from the gurabo4 dataset"), [DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts"), [DEBT-230](view_debt.md#debt-230-hard-coded-gurabo4-videotracks-loader "Hard-coded gurabo4 video+tracks loader"), [OQ-201](../../QUESTIONS.md#oq-201 "Which video-loading paths are routine")

## BEH-203: Load video from the database (list dialog)

"Load Video from DB" opens the modal `fromServerDialog` (`#from-server-dialog`) titled "Load Video". That object is shared with the annotation loaders (`openRecentLoadingDialog` in `AnnotationIO.js`): each opener resets its title and body.
The list is fetched by `videoManager.receiveVideoSelection()`: ajax `GET url_for("/api/v1/videos")` (JSON). It is also called once at page start ([BEH-201](#beh-201-page-start-up-state "Page start-up state")).
On success the response is cached in `videoManager.videoListJSON` and the dialog body becomes a DataTable (`#VideoListFromServerTable`) built from `json.data`, with a "Refresh Video List" button above it
and the message "WARNING: If another video is currently loaded, unsaved event/tag changes may be lost.". Columns: Load button (`videoManager.videoSelected(id)`), `file_name`, `timestamp` (the `T` is replaced by a space), `id`, `colony`, `fps`, `width`, `height`;
every column but the first has a text filter input in the table footer (`keyup change clear` filters that column).
On error `videoListJSON` is set to the string `"Error"` and the dialog shows a "Refresh Video List" button and a red message: "VideoManager.receiveVideoSelection ERROR: User is not logged in. Log in and press the refresh button above to try again." when `user_data.is_authenticated` is falsy, otherwise "VideoManager.receiveVideoSelection ERROR: Unable to retrieve video list from server. Press the refresh button above to try again.".
Re-opening the dialog (`videoListFromDB`) never sends a request by itself:
- list cached: the table is rebuilt from `videoListJSON`;
- `videoListJSON` is `"Error"`: the Refresh button and the red message are shown;
- `videoListJSON` is `null` (the page-start request has not answered yet): the dialog shows "Loading video list from server. Please wait..." and is filled by that request's callback when it arrives (the callback writes into the dialog even if it is closed or used by another loader).
The Refresh button calls `receiveVideoSelection()` again, which resets the body to a placeholder and shows the loading message.

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.videoListFromDB`, `VideoManager.receiveVideoSelection`, `VideoManager.makeVideoListTable`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#from-server-dialog`
- **Links:** [BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-201](#beh-201-page-start-up-state "Page start-up state"), [DEBT-214](view_debt.md#debt-214-global-variables-and-implicit-globals "Global variables and implicit globals"), [OQ-211](../../QUESTIONS.md#oq-211 "Switching video with unsaved edits")

## BEH-204: Select a database video (video id to loaded video)

`videoManager.videoSelected(id)` sets `loadingVideoId = true` and `currentVideoID = id` (before anything has succeeded, [BEH-233](#beh-233-state-after-a-failed-video-load "State after a failed video load")), then ajax `GET url_for("/api/v1/video/<id>")` (JSON).
On success it shows "Loading Video." in the dialog and calls `setVideoInfo(response.data)`, which replaces the global `videoinfo` with:
`name = file_name`; `videoPath = url_for("/data") + path + "/" + file_name`; `videofps`, `realfps`, `starttime`, `duration`, `nframes` copied from the record (no other field of the record is copied);
`frameoffset = 0`; `preview = {previewURL: "", previewInfoURL: "", previewTimescale: 1.0}`; `tagsfamily = "tag25h5"` (hard-coded); `place = ""`; `comments = ""`.
It then refreshes the info form ([BEH-210](#beh-210-video-info-panel-content "Video Info panel content")), calls `updateChronoXDomainFromVideo()` and returns the promise of `videoControl.loadVideo2(videoPath)` ([BEH-205](#beh-205-load-the-media-element "Load the media element")).
`videoSelected` resolves its own promise only when that load promise resolves; `loadingVideoId` is reset to false in both outcomes.
`nframes` comes from the server record; it is not recomputed from the loaded media (only `onVideoInfoChanged` does that, [BEH-211](#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs")).
On ajax error it logs, shows the red dialog message "VideoManager.videoSelected ERROR: Unable to retrieve selected video's information from server." and throws inside the ajax callback; on a failed or timed-out load it rethrows inside `.catch`. In both failures the promise returned by `videoSelected` never settles ([DEBT-205](view_debt.md#debt-205-load-errors-throw-inside-callbacks-promises-never-settle "Load errors throw inside callbacks; promises never settle")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.videoSelected`, `VideoManager.setVideoInfo`
- **Links:** [BEH-205](#beh-205-load-the-media-element "Load the media element"), [BEH-210](#beh-210-video-info-panel-content "Video Info panel content"), [BEH-233](#beh-233-state-after-a-failed-video-load "State after a failed video load"), [ENT-003](view_entities.md#ent-003-video "Video"), [DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts"), [DEBT-205](view_debt.md#debt-205-load-errors-throw-inside-callbacks-promises-never-settle "Load errors throw inside callbacks; promises never settle")

## BEH-205: Load the media element

`videoControl.loadVideo2(url)` sets `flagLoadingVideo = true`, registers one-shot `loadeddata` and `error` listeners on `#video`, sets `video.src = url` and returns a promise that resolves on `loadeddata`, rejects on `error`, and is wrapped by the `timeout` helper with a 10 000 ms limit (`timeout` is a local arrow function `(promise, time, name) => ...`; its body, hence the error type on timeout, was not read [unverified]).
What happens when the load completes is [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"); when it fails, [BEH-206](#beh-206-video-load-error "Video load error").
The caller chain (`setVideoInfo`, `videoSelected`) returns this promise; a rejection or timeout is not reported to the user for the manual paths ([DEBT-205](view_debt.md#debt-205-load-errors-throw-inside-callbacks-promises-never-settle "Load errors throw inside callbacks; promises never settle")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.loadVideo2`, `timeout`
- **Links:** [BEH-206](#beh-206-video-load-error "Video load error"), [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [DEBT-205](view_debt.md#debt-205-load-errors-throw-inside-callbacks-promises-never-settle "Load errors throw inside callbacks; promises never settle")

## BEH-206: Video load error

`video.onerror` calls `onVideoError`. If the raw `src` attribute is the empty string (not yet initialised) it only sets `isValidVideo = false`.
Otherwise it shows a red message in `fromServerDialog` ("onVideoError: could not load <src>"), sets the I/O-status row `videoLoad` to failed (red cross), sets `isValidVideo = false`, calls `onVideoSizeChanged()` (canvas falls back to 600x400, [BEH-212](#beh-212-video-size-and-canvas-size "Video size and canvas size")) and `hardRefresh()`.
`statusUpdate` reads the `videoLoad` request entry that `statusRequest("videoLoad")` creates; the only `statusRequest("videoLoad")` call seen is in the success path ([BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load")), so on a first-ever load error the status update throws (`statusInfo["videoLoad"]` is undefined) before `isValidVideo` is cleared, the canvas size is reset and the refresh is applied ([DEBT-228](view_debt.md#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request "videoLoad status row: request logged at completion, error before any request")). The only two `statusRequest("videoLoad")` calls in the code are in `onVideoLoaded2` and in the obsolete `onVideoLoaded`.
While `isValidVideo` is false, `onFrameChangedVideo2` still sets `currentFrame` but aborts before `onFrameChanged` (no refresh).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoError`, `VideoControl.onFrameChangedVideo2`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `StatusWidget`
- **Links:** [BEH-205](#beh-205-load-the-media-element "Load the media element"), [BEH-212](#beh-212-video-size-and-canvas-size "Video size and canvas size"), [BEH-233](#beh-233-state-after-a-failed-video-load "State after a failed video load"), [BEH-258](#beh-258-messages-area-and-io-status-rows "Messages area and I/O status rows"), [DEBT-228](view_debt.md#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request "videoLoad status row: request logged at completion, error before any request")

## BEH-207: Load a video by URI or from /data (manual load)

"From URI" prompts "Enter video URL" with the default `url_for("/data")` + `/datasets/bee_feeder/videos/ciencias-naturales/2025-01-30/bf-cn_2025-01-30_01.cfr.mp4`; empty input or cancel does nothing; otherwise it awaits `loadVideoManual(url)`.
"From /data" opens the generic file picker (`FilePickerFromServerDialog`, built in the `VideoManager` constructor with base uri `url_for("/api/v1/rawdata/")`, title "Load Video Manually from Server", `loadFileFunction = videoManager.loadVideoManual(uri)`). The picker itself (file and directory listing, navigation, errors) is out of this item's scope ([OQ-213](../../QUESTIONS.md#oq-213 "Owner of the server file picker")).
`loadVideoManual(url)`: returns at once when `url` is null or empty; otherwise starts from a hard-coded sample record (file `bf-cn_2025-01-30_01.cfr.mp4`, `starttime 2025-01-30T12:00:00`, `duration 888.665581`, `nframes 15626`, 3840x2160, `videofps = realfps = 211/12`) and splits the URL with `^(.*?data)(\/.*\/)([^\/]+)$` into `before`, `path` (the directory after the first `data`, trailing slash removed; needs at least two slashes after `data`) and `filename`.
Fallback when the regex does not match (for example `.../data/file.mp4`, or a URL without a `data` segment): `before = ''`, `path = url.substring(0, lastIndexOf('/'))` (this still contains scheme and host for an absolute URL), `filename` = text after the last `/`; that `path` is then stored in `info.path`, so `setVideoInfo` builds `videoPath = url_for("/data") + path + "/" + file_name`, which is not a valid URL for an absolute `path`.
It then sets `info.path = path`, `info.file_name = filename`, `info.file_path = path + "/" + filename` and requests `<url>.stream.json` (ajax GET, awaited). If the request fails it logs a message (prefixed "VideoManager.videoSelected ERROR", copied from the DB path), resets `loadingVideoId` and throws inside the callback: the awaited promise never settles, nothing is loaded and `loadVideoManual` never returns ([DEBT-205](view_debt.md#debt-205-load-errors-throw-inside-callbacks-promises-never-settle "Load errors throw inside callbacks; promises never settle")). A null response returns silently. From `stream_info.video_info` it takes `nframes = Number(nb_frames)`, `width`, `height`, `duration = Number(duration)` and `videofps = realfps = eval(r_frame_rate)` (a string such as `"211/12"`). It then sets `currentVideoID = info.file_path` (string starting with `/`, later used in links and hash, [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)")) and calls `this.setVideoInfo(info)` ([BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)") mapping) without returning or awaiting it, so `loadVideoManual` resolves before the media is loaded ([DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts")); `width` and `height` are not used by `setVideoInfo`.
Consequence of the sample record: only its `starttime` reaches `videoinfo` (`setVideoInfo` copies just `file_name`, `path`, `videofps`, `realfps`, `starttime`, `duration`, `nframes`), so every manually loaded video gets the start time `2025-01-30T12:00:00` until the user edits `#startTime` ([BEH-211](#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs"), [DEBT-215](view_debt.md#debt-215-eval-and-hard-coded-sample-record-in-loadvideomanual "eval and hard-coded sample record in loadVideoManual")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.loadVideoManual`, `VideoManager.clickLoadVideoManual`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `FilePickerFromServerDialog`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#dialog-filepicker-from-server`
- **Links:** [BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts"), [DEBT-215](view_debt.md#debt-215-eval-and-hard-coded-sample-record-in-loadvideomanual "eval and hard-coded sample record in loadVideoManual"), [OQ-201](../../QUESTIONS.md#oq-201 "Which video-loading paths are routine"), [OQ-213](../../QUESTIONS.md#oq-213 "Owner of the server file picker")

## BEH-208: URL hash router (video_id, video_data, frame)

`onhashchange` (assigned to `window.onhashchange`, and called once at the end of `init`) reads `location.hash`; an empty hash does nothing. A hash equal to `lasthash` only logs "ABORT" and processing continues ([DEBT-203](view_debt.md#debt-203-router-and-hash-listener-bugs "Router and hash-listener bugs")). The hash is parsed as a query string. In order:
1. `video_id`: if it equals `videoManager.currentVideoID` (loose `==`) the router only logs and skips; otherwise `selectVideoBy_video_id(id)`: a value for which `Number(value) == value` is a database id (`videoSelected(id)`, [BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)")); any other value is a path appended to `url_for('/data')` and loaded with `loadVideoManual` ([BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)")). The router awaits `selectVideoBy_video_id`, which does not await the load it starts ([DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts")), so steps 2 and 3 run before the video is loaded.
   Edge case: an empty value (`#video_id=`) satisfies `Number("") == ""` and selects database id 0 (`videoSelected(0)`); the same-id skip does not cover it unless `currentVideoID` is 0 (before any video, `currentVideoID` is 0 so it is skipped).
2. `video_data`: `loadEventsFromServerByID(id)` (annotation load, [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")), then the key is deleted from the local copy of the hash only.
3. `frame`: integer (`parseInt`, base 10); sets `videoControl.removeHashOnFrameChange = true`, `removeHashOnFrameChangeFrame = frame`, then `videoControl.delayedSeek(frame)` ([BEH-209](#beh-209-delayed-seek-seek-requested-before-the-video-is-ready "Delayed seek (seek requested before the video is ready)")).
The intended default `frame=0` for a hash with `video_id` only is never applied (`parsedHash.get("frame","0")` is a no-op, [DEBT-203](view_debt.md#debt-203-router-and-hash-listener-bugs "Router and hash-listener bugs")). The router does not rewrite the hash. When the user later moves to a frame different from the requested one and no seek is pending, `onFrameChanged` removes `frame` from `location.hash` once ([BEH-217](#beh-217-frame-hash-removal-on-navigation "Frame hash removal on navigation")).
The "Frame: n" link in the Video Info panel and the `.video_id` link produce such hashes ([BEH-210](#beh-210-video-info-panel-content "Video Info panel content")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onhashchange`, `lasthash`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.selectVideoBy_video_id`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onFrameChanged`
- **Links:** [BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), [BEH-209](#beh-209-delayed-seek-seek-requested-before-the-video-is-ready "Delayed seek (seek requested before the video is ready)"), [BEH-217](#beh-217-frame-hash-removal-on-navigation "Frame hash removal on navigation"), [DEBT-202](view_debt.md#debt-202-delayedseekframe-is-cleared-before-it-is-used "delayedSeekFrame is cleared before it is used"), [DEBT-203](view_debt.md#debt-203-router-and-hash-listener-bugs "Router and hash-listener bugs"), [DEBT-204](view_debt.md#debt-204-async-video-selection-does-not-await-what-it-starts "Async video selection does not await what it starts"), [OQ-202](../../QUESTIONS.md#oq-202 "Deep links `#video_id=..&frame=..`")

## BEH-209: Delayed seek (seek requested before the video is ready)

`videoControl.delayedSeek(frame)`: if `flagLoadingVideo` is true it stores `delayedSeekFrame = frame` for the load-complete handler; otherwise it calls `seekFrame(frame)` immediately.
Intended result: after the video has loaded, the requested frame is shown. Current code: `onVideoLoaded2` clears `delayedSeekFrame` before the 500 ms timer reads it, so the timer calls `seekFrame(undefined)` (no effective seek, [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load")); see [DEBT-202](view_debt.md#debt-202-delayedseekframe-is-cleared-before-it-is-used "delayedSeekFrame is cleared before it is used").
`flagLoadingVideo` is set only inside `loadVideo2`, which runs after the video-record request has returned. A `frame=` hash processed by the router on a cold page therefore takes the immediate branch while `videoinfo.nframes` still holds the placeholder 1, and `seekFrame` rejects every frame `>= 1` ([BEH-218](#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)")). On a page where a video is already loaded, the immediate seek applies to the previous video.

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.delayedSeek`, `VideoControl.onVideoLoaded2`, `VideoControl.seekFrame`
- **Links:** [BEH-205](#beh-205-load-the-media-element "Load the media element"), [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-218](#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)"), [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [DEBT-202](view_debt.md#debt-202-delayedseekframe-is-cleared-before-it-is-used "delayedSeekFrame is cleared before it is used"), [OQ-202](../../QUESTIONS.md#oq-202 "Deep links `#video_id=..&frame=..`")

## BEH-210: Video Info panel content

The panel `#videoinfo` shows:
- refreshed with the video info (`updateVideoInfoForm`: at construction and at every video or calibration change, not on every frame): `.video_id`, a link `#video_id=<encodeURIComponent(currentVideoID)>` with text `#video_id=<id>`; `.videoinfo_nframes`, "Num frames: N [0-(N-1)]"; and the calibration and meta inputs ([BEH-211](#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs"));
- refreshed with each frame (`updateVideoControlForm`): `#currentFrame` (textbox in the Video block); `.currentFrameDiv`, a link `Frame: <currentFrame>` to `#video_id=<currentVideoID>&frame=<currentFrame>` (new tab; the id is not URI-encoded here, unlike `.video_id`), or the text `Frame: n [P]` without link in mode `preview` (unreachable, [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped")); `#vidTime`, "Video Time: " + `video2.toHMSm(currentVideoTime seconds)`; `#realTime`, "Real Time: " + local ISO date-time without timezone of `starttime + videoTime * videofps / realfps` (milliseconds, when non-zero, are appended without zero padding, [DEBT-221](view_debt.md#debt-221-time-conversions-disagree-on-frameoffset-local-iso-formatting "Time conversions disagree on frameoffset; local ISO formatting")); the message area is cleared (`printMessage("")`);
- set when a video has loaded ([BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load")): `#videoName` (`videoinfo.name`), `a.videolink` ("Link", opens `videoinfo.videoPath` in a new tab), `a.videoinfolink` ("Info", database page of the video; initial href: gallery videos page);
- "Export frame" button: `overlay.exportFrame()` opens a new tab with the current frame JPEG extracted through `VideoCache` (owner [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations") area, in the overlay; it uses `currentFrame` without `frameoffset`) [unverified].
Before any video is loaded the `VideoManager` constructor calls `updateVideoInfoForm()` (line order) before it assigns `currentVideoID = 0`, so `.video_id` is rendered as `#video_id=undefined` (the markup placeholder `ID=??` is replaced at construction) until a video is selected; it is a visible defect ([DEBT-227](view_debt.md#debt-227-video_id-shows-video_idundefined-before-any-video "`.video_id` shows `#video_id=undefined` before any video")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.updateVideoControlForm`, `VideoControl.getCurrentRealDate`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.updateVideoInfoForm`, `VideoManager`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videoName`, `#vidTime`, `#realTime`
- **Links:** [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [BEH-228](#beh-228-frame-time-and-real-time-conversions "Frame, time and real-time conversions"), [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped"), [DEBT-221](view_debt.md#debt-221-time-conversions-disagree-on-frameoffset-local-iso-formatting "Time conversions disagree on frameoffset; local ISO formatting"), [DEBT-227](view_debt.md#debt-227-video_id-shows-video_idundefined-before-any-video "`.video_id` shows `#video_id=undefined` before any video")

## BEH-211: Time and image calibration inputs

Inputs in the collapsible "Time/image calibration" of `#videoinfo`; each applies on `change`:
- `#startTime` (text, ISO string): `videoinfo.starttime = new Date(value).toISOString()` (so the stored value is UTC with `Z` while the placeholder default has no `Z`), then `updateChronoXDomainFromVideo()` and `drawChrono()`; an invalid date throws a `RangeError`;
- `#realfps`: `videoinfo.realfps = Number(value)`, `changeFPS` then calls `updateChronoXDomainFromVideo()` and `drawChrono()`;
- `#videofps`: `videoinfo.videofps = Number(value)` then `videoControl.onVideoInfoChanged()`, which sets `nframes = floor(duration * videofps)` and `video2.frameRate`, refreshes the form and the chronogram domain (`changeVideoFPS` only sets the value and calls `onVideoInfoChanged`);
- `#frameoffset`: `videoinfo.frameoffset = Number(value)` then `onVideoInfoChanged()` (so `nframes` is recomputed too). Offset in the code: the media frame requested for annotation frame `f` is `f + frameoffset` in `seekFrame` (modes `video`, `cache`, `cache-preview`) and `getCurrentVideoFrame` subtracts it back; `frameToTime(f)` uses `(f - frameoffset)/realfps` after `starttime`, which has the opposite sign ([DEBT-221](view_debt.md#debt-221-time-conversions-disagree-on-frameoffset-local-iso-formatting "Time conversions disagree on frameoffset; local ISO formatting"), [OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features")).
Defaults before any video: `name "No video loaded"`, `videoPath ""`, `videofps 20`, `realfps 20`, `starttime "2016-07-15T09:59:59.360"`, `duration 1/20`, `nframes 1`, `frameoffset 0`, `preview {previewURL: undefined, previewInfoURL: undefined, previewTimescale: 1.0}`.
`#frameoffset` is never refilled from `videoinfo` (`updateVideoInfoForm` does not touch it): it keeps the user's text after loading another video whose offset was reset to 0.
`#videoTagsFamily`, `#videoPlace`, `#videoComments` (Meta info) are filled from `videoinfo` by `updateVideoInfoForm`; for DB videos they show `tag25h5`, empty, empty; the `.info.json` metadata loader is not called after a load ([DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.changeStartTime`, `VideoManager.changeVideoFPS`, `VideoManager.changeFPS`, `VideoManager.changeFrameOffset`, `videoinfo`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoInfoChanged`, `VideoControl.frameToTime`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#startTime`, `#realfps`, `#videofps`, `#frameoffset`
- **Links:** [BEH-228](#beh-228-frame-time-and-real-time-conversions "Frame, time and real-time conversions"), [ENT-003](view_entities.md#ent-003-video "Video"), [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped"), [DEBT-216](view_debt.md#debt-216-frame-offset-and-fps-edits-recompute-inconsistently "Frame offset and fps edits recompute inconsistently"), [DEBT-221](view_debt.md#debt-221-time-conversions-disagree-on-frameoffset-local-iso-formatting "Time conversions disagree on frameoffset; local ISO formatting"), [OQ-205](../../QUESTIONS.md#oq-205 "Time units for steps (1 s, 10 s, 60 s) and fractional fps"), [OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features")

## BEH-212: Video size and canvas size

When a video has loaded or has failed to load, `onVideoSizeChanged` reads `video.videoWidth/videoHeight` if `isValidVideo`, else 600x400, and calls `overlay.canvasSetVideoSize(w, h)`: the overlay keeps the canvas width, sets the height to `round(h * canvasWidth / w)`, resizes `#canvasresize` (canvas width + 16 + 2 px border) and makes it resizable with aspect ratio `w/h` (in the code this lock is applied on every call, whatever the state of the "Fixed Aspect" option [inferred]).
The "Fixed Aspect" toggle button of the Video block (`overlay.optsClick('fixedAspect')`) re-applies `canvasSetVideoSize` with the stored size and sets the resizable aspect ratio to `w/h` when on, or to `false` when off (owner [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations") overlay).
`videoControl.videoSize()` returns `{left:0, top:0, right:videoWidth, bottom:videoHeight}` (or 600x400 when invalid). It is not called on load or error; it is used by the ROI "Reinit" button (`updateROIFromVideo`), which writes `left,top,right,bottom` into `#ROI` and applies it (owner [CAP-800](view_capabilities.md#cap-800-data-filtering-and-processing "Data filtering and processing") filtering).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoSizeChanged`, `VideoControl.videoSize`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.canvasSetVideoSize`, `OverlayControl.optsClick`, `updateROIFromVideo`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#canvasresize`
- **Links:** [BEH-206](#beh-206-video-load-error "Video load error"), [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [BEH-213](#beh-213-video-and-canvases-stack "Video and canvases stack"), [SEAM-202](view_seams.md#seam-202-frame-image-source-what-the-overlay-draws "Frame image source (what the overlay draws)")

## BEH-213: Video and canvases stack

The visual video view is a `.canvaswrapper` inside `#canvasresize` with three stacked elements: `#video` (z-index -1, the decoder element), `#canvas` (z-index 2, the main image canvas) and `#canvas1` (z-index 3, the fabric.js annotation layer).
With `flagCopyVideoToCanvas = true` (always, never changed) the overlay copies the video element (mode `video`) or the cache image (modes `cache`, `cache-preview`) to `#canvas` on each redraw, so the displayed frame and the annotations are drawn in the same pass; the video element itself is not visible through the transparent canvas in practice.
The element ids `video`, `canvas`, `canvas1` are looked up by `VideoFrame`, `OverlayControl` and `fabric`.
All claims of this item are [unverified] in the last revision (stacking order, z-indices, `flagCopyVideoToCanvas`).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl`, `VideoControl.refresh`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#video`, `#canvas`, `#canvas1`, `#canvasresize`
- **Links:** [SEAM-202](view_seams.md#seam-202-frame-image-source-what-the-overlay-draws "Frame image source (what the overlay draws)"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-214: Legacy video list (hidden subpanel)

The subpanel "Video List" in `#videoinfo` carries the class `hidden` and is not visible. Its code still works on the global `videoListTable` (rows `{video, preview, tags}`):
load list from a local JSON file (`#loadvideolistjson`, `{data: [...]}`) or CSV (`#loadvideolistcsv`, header `video,preview,tags`; the first non-header row with a preview sets `#previewVideoName` and `#previewVideoTimeScale="1"`), "Save as JSON/CSV" (`videolist-<timestamp>.json|csv`, schema `videolist-0-0-1`),
"Check" (HEAD request on each video and tag url, ticks or crosses in `#videoList`), "Load From Server" (opens the file picker, [BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)")), a `+` button that prompts for a file name and appends/selects it.
`setVideoList` selects entry 0 (or a given id) with `selectVideoByID`, which calls the deprecated `videoControl.loadVideo(url)` (sets `src`, `videoinfo.videoURL`, `videoName`, I/O-status `videoLoad`). That path never calls `onVideoInfoChanged`, so `nframes` stays at its placeholder (1) and seeks beyond frame 0 are rejected ([BEH-218](#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)")).
The hidden `#selectboxVideo` mirrors the list.
All claims of this item are [unverified] in the last revision (first reading only).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.setVideoList`, `VideoManager.setVideoListFromCSV`, `VideoManager.setVideoListFromJSON`, `VideoManager.saveVideoListToFile`, `VideoManager.checkVideoList`, `VideoManager.selectVideoByID`, `VideoManager.addVideoClick`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.loadVideo`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videoList`, `#selectboxVideo`
- **Links:** [BEH-202](#beh-202-ways-to-choose-a-video "Ways to choose a video"), [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped"), [OQ-203](../../QUESTIONS.md#oq-203 "Legacy 'Video List' subpanel")

## BEH-215: Show/hide menu tabs (Features panel)

The "Features" panel (`#features`) lists eight checkboxes that show or hide blocks of the left column. Each checkbox `onchange` calls `toggleHidden(id, this.checked)` on the block and on its spacer `...BR`:

| Checkbox | Block | Spacer | Default (`checked` attribute) |
|---|---|---|---|
| `#showTimeline` | `timeline` | `timelineBR` | off |
| `#showFocusInterval` | `focusIntervalTab` | `focusIntervalTabBR` | off |
| `#showSelected` | `selectedTab` | `selectedTabBR` | off |
| `#showEvents` | `eventsTab` | `eventsTabBR` | on |
| `#showFilter` | `filterTab` | `filterTabBR` | off |
| `#showChrono` | `chronoTab` | `chronoTabBR` | on |
| `#showPickFrame` | `pickframeblock` | `pickframetabBR` | off |
| `#showPickFlower` | `pickflowerblock` | `pickflowertabBR` | off |

At start-up `init` calls `toggleHidden(blockId, checkbox.checked)` for the first six checkboxes only (the two pick-modes rely on the markup), on the block id only, never on the spacer. The id list used by `init` differs from the `onchange` ids for the first entry: `init` uses `timelineTab`, whereas the markup block is `id="timeline"` (no `timelineTab` element appears in the markup read); the Timeline toggle at init is therefore a no-op and the visible state is right only because the block is `hidden` in the markup ([DEBT-229](view_debt.md#debt-229-features-init-uses-a-block-id-that-does-not-match-the-checkbox-handler "Features init uses a block id that does not match the checkbox handler")).
`toggleHidden(divID, show)` is defined in an inline script of `labelbee_page.html` (not in `labelBee.js`); its body was not read, so the exact effect on the class `hidden` is [unverified].
Nothing is persisted: the state is lost on reload.

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#features`, `#showTimeline`, `#showChrono`, `#showPickFrame`
- **Links:** [BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior"), [BEH-201](#beh-201-page-start-up-state "Page start-up state"), [DEBT-229](view_debt.md#debt-229-features-init-uses-a-block-id-that-does-not-match-the-checkbox-handler "Features init uses a block id that does not match the checkbox handler")

## BEH-216: Collapsible and sortable panel behavior

User-visible behavior:
- Right-column panels (`.collapsible`) are accordions that start closed; those with `.default-active` start open. Clicking a panel title opens or closes it. Panels can be nested.
- Left-column blocks (`.inline-collapsible`) get a collapse arrow in their `.block-header`; clicking the header toggles the CSS class `collapsed` on the block.
- `.sortable` containers are connected with each other: a block or panel can be reordered, also across containers, by dragging its title (`> label` or `> .block-header`).
- Order and open state are not persisted.
The list of panels in each column is [BEH-259](#beh-259-page-layout-panels-and-their-ids "Page layout (panels and their ids)"). Two `collapsibleexpand`/`collapsiblecollapse` handlers and `refreshCollapsible` are never triggered ([DEBT-226](view_debt.md#debt-226-dead-collapse-event-code-and-debug-output-in-init "Dead collapse-event code and debug output in init")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#beeInfo`, `#right-side`, `#videocontrol`
- **Links:** [BEH-201](#beh-201-page-start-up-state "Page start-up state"), [BEH-257](#beh-257-mouse-gestures-owned-by-labelbeejs-layout "Mouse gestures owned by labelBee.js (layout)"), [BEH-259](#beh-259-page-layout-panels-and-their-ids "Page layout (panels and their ids)"), [DEBT-226](view_debt.md#debt-226-dead-collapse-event-code-and-debug-output-in-init "Dead collapse-event code and debug output in init")

## BEH-217: Frame hash removal on navigation

When `removeHashOnFrameChange` is true (set by the router for a `frame=` hash, [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)")), `onFrameChanged` checks: `delayedSeekFrame` is `undefined` and `currentFrame != removeHashOnFrameChangeFrame` (the two conditions are combined with a bitwise `&`). If so and the hash still contains `frame`, it clears the flag, removes and re-adds the `hashchange` listener (see [DEBT-203](view_debt.md#debt-203-router-and-hash-listener-bugs "Router and hash-listener bugs")), stores the remaining hash (without `#`) in `lasthash` and sets `location.hash` to it without `frame`. Effect: the address bar no longer claims a frame the user has left.
When the flag is set and the user stays on the requested frame, nothing is removed.

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onFrameChanged`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `lasthash`, `onhashchange`
- **Links:** [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [DEBT-203](view_debt.md#debt-203-router-and-hash-listener-bugs "Router and hash-listener bugs")

## BEH-218: Seek to a frame number (core seek)

`videoControl.seekFrame(frame, useFastSeek)`: frames are annotation frame numbers (0-based). A normal call stores `savedFrame = currentFrame`.
Out-of-range request (`frame < 0` or `frame >= videoinfo.nframes`, tested with bitwise `|`) is ignored with a console message; `NaN` and `undefined` pass the test ([DEBT-219](view_debt.md#debt-219-frame-bounds-test-lets-nanundefined-through "Frame bounds test lets NaN/undefined through")).
Otherwise `startSeekTimer()` and, by `currentMode`:
- `video`: `video2.seekTo({frame: frame + frameoffset})`; the refresh is triggered later by the `timeupdate` event ([BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)")), not by `seekFrame`. `VideoFrame.seekTo({frame})` converts the frame to SMPTE then to milliseconds (floored to whole ms), sets `video.currentTime = ms/1000 + 0.001` and records `forceFrameChanged` so that the `timeupdate` callback fires for that frame;
- `cache`: [BEH-235](#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode"); `cache-preview`: [BEH-226](#beh-226-preview-while-ctrlmoving-over-the-chronogram-cache-preview-mode "Preview while Ctrl+moving over the chronogram (cache-preview mode)"); `preview`: [BEH-227](#beh-227-preview-video-scale4mp4-legacy-mode "Preview video (scale4.mp4) legacy mode") (unreachable).
`seekFrame` never changes `currentFrame` itself in `video` mode. Callers outside this group: chronogram click (`onAxesClick` through `gotoEvent`), event navigation, selection code, hash router [unverified].

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.seekFrame`, `VideoControl.startSeekTimer`
- **Links:** [BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)"), [BEH-226](#beh-226-preview-while-ctrlmoving-over-the-chronogram-cache-preview-mode "Preview while Ctrl+moving over the chronogram (cache-preview mode)"), [BEH-235](#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode"), [DEBT-219](view_debt.md#debt-219-frame-bounds-test-lets-nanundefined-through "Frame bounds test lets NaN/undefined through"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-219: Frame textbox

`#currentFrame` (text, size 7, title "Frame") shows `currentFrame` after each refresh ([BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)")). On `change` (blur or Enter) `onFrameTextChanged` calls `seekFrame(Number(value))`. An empty field becomes frame 0; a non-numeric text gives `NaN` ([DEBT-219](view_debt.md#debt-219-frame-bounds-test-lets-nanundefined-through "Frame bounds test lets NaN/undefined through")); a value out of range is ignored (the field keeps the typed text until the next refresh).
Keyboard focus in this field stops the global shortcuts ([BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onFrameTextChanged`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#currentFrame`
- **Links:** [BEH-218](#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)"), [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [DEBT-219](view_debt.md#debt-219-frame-bounds-test-lets-nanundefined-through "Frame bounds test lets NaN/undefined through")

## BEH-220: Step buttons and relative moves

Video block buttons (left column, `#videocontrol`), from left to right: "Play Backwards" (`#playbackward`), `#playRate` speed box, "Play" (`#play`), `-10s` `rewind(200)`, `-1s` `rewind(20)`, `-1 frame` `rewind(1)`, `#currentFrame`, `+1 frame` `forward(1)`, `+1s` `forward(20)`, `+10s` `forward(200)`.
The 20 and 200 are literal frame counts (assume 20 fps), not `videoinfo.videofps`; the keyboard variants use `videofps` ([BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)")) [unverified: the button markup was not read].
`forward(frames)` (default 1): ignored with a console message if `currentFrame + frames` is `< 0` or `>= nframes` (so `+10s` near the end does nothing instead of going to the last frame). In mode `video` it starts the seek timer and calls `video2.seekForward(frames)` (which pauses a playing video, then sets `currentTime = (get() + frames)/frameRate + 0.00001`); in other modes `seekFrame(currentFrame + frames)`.
`rewind(frames)` (default 1) has no bounds test in mode `video` (`video2.seekBackward(frames)`, same mechanism backwards); in other modes `seekFrame(currentFrame - frames)`, which ignores frames below 0 (so a rewind that would cross 0 does nothing there).
`rewind2/forward2` = 1 s = `videofps` frames; `rewind3/forward3` = `videofps * 10`; `rewind4/forward4` = `videofps * 60` (not integers if `videofps` is fractional, e.g. 211/12).
Relative moves in `video` mode pause a playing video; `seekFrame` (via `seekTo`) does not itself pause.

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.rewind`, `VideoControl.forward`, `VideoControl.rewind2`, `VideoControl.forward2`, `VideoControl.rewind3`, `VideoControl.forward3`, `VideoControl.rewind4`, `VideoControl.forward4`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videocontrol`, `#playbackward`, `#play`, `#playRate`
- **Links:** [BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)"), [BEH-223](#beh-223-playback-in-video-mode-play-play-backwards-speed-x4 "Playback in video mode (Play, Play Backwards, speed, x4)"), [DEBT-216](view_debt.md#debt-216-frame-offset-and-fps-edits-recompute-inconsistently "Frame offset and fps edits recompute inconsistently"), [DEBT-219](view_debt.md#debt-219-frame-bounds-test-lets-nanundefined-through "Frame bounds test lets NaN/undefined through"), [DEBT-223](view_debt.md#debt-223-fixed-20-fps-assumptions "Fixed 20 fps assumptions"), [OQ-205](../../QUESTIONS.md#oq-205 "Time units for steps (1 s, 10 s, 60 s) and fractional fps")

## BEH-221: Leaving the page

`window.onbeforeunload` is set during `init` to always return the message "If you leave this page, all unsaved annotations will be lost. Are you sure?" (and to set it as `returnValue`), so the browser shows its leave confirmation (reload, close, navigating away) regardless of whether there are unsaved changes.
Whether this unconditional prompt is intended is [OQ-210](../../QUESTIONS.md#oq-210 "Leave-page prompt only with unsaved changes?").

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-210](../../QUESTIONS.md#oq-210 "Leave-page prompt only with unsaved changes?")

## BEH-222: Use Cache toggle and mode switch

The toggle "Use Cache" (`overlay.optsClick('useImageCache')`; same option as "Image Cache" in Options > Display) switches the display mode between `video` and `cache`:
- switching on: if `videoControl.currentMode` is not `cache`, it is set to `cache` and `hardRefresh()` is called; otherwise only the overlay is refreshed;
- switching off: if the mode is `cache`, it is set to `video` and `hardRefresh()` is called; otherwise only the overlay is refreshed.
No seek is made when the mode changes: after switching on, the display shows what `currentImage` holds (nothing until the next seek, see [BEH-235](#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode") for the grey strip [unverified]); after switching off the `#video` element shows the position it had before cache mode ([DEBT-213](view_debt.md#debt-213-mode-switch-does-not-resynchronize-the-displayed-frame "Mode switch does not resynchronize the displayed frame")).
These are the writes of `currentMode` seen from outside `VideoControl` in the code read (a full search was not made).
Default of the option: off [unverified]. Image Diff (`showImageDiff`) uses the cache as well (owner overlay).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl.optsClick`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videocontrol`
- **Links:** [BEH-235](#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode"), [DEBT-213](view_debt.md#debt-213-mode-switch-does-not-resynchronize-the-displayed-frame "Mode switch does not resynchronize the displayed frame"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)"), [OQ-204](../../QUESTIONS.md#oq-204 "Cache mode semantics")

## BEH-223: Playback in video mode (Play, Play Backwards, speed, x4)

`#play` and Space call `playPauseVideo(option)`; `#playbackward` and Shift+Space call `playPauseVideoBackward(option)`. State `videoControl.playingState` is `paused`, `playingForwards` or `playingBackwards`:
`playPauseVideo` starts forward play if the state is `paused` or `playingBackwards`, otherwise pauses; `playPauseVideoBackward` starts backward play if `paused` or `playingForwards`, otherwise pauses (a click on the opposite button reverses direction directly).
`#playRate` (default `1.0`, on change): a plain number `x` or a fraction `a/b`; sets `videoControl.playbackRate` and `video2.setPlaybackRate`; any other format logs an error and keeps the old rate; a non-numeric text yields `NaN` [unverified].
`playForwards(option)` first calls `pause()`, sets `playingState = "playingForwards"`, then in `video` mode calls `video2.playForwards()` (option 2: `video2.playForwards(1000/20/4)`, i.e. 12.5 ms), in other modes `playStart()` ([BEH-225](#beh-225-playback-in-cache-mode "Playback in cache mode")), and refreshes the button look.
`pause()` sets state `paused`, pauses `video` and stops the VideoFrame timers; the native `video.play()` with frame callbacks, the "x4" stepping and the backward play steps are inside the `VideoFrame` library [unverified: not read].
The play buttons' look (`playing` class) is updated by `updateNavigationView` from `video2.playingState()`: `#play` is active when playing forwards, `#playbackward` when playing backwards; the intended `.value` text change does nothing (jQuery object, [DEBT-211](view_debt.md#debt-211-play-button-state-display "Play button state display")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.playPauseVideo`, `VideoControl.playPauseVideoBackward`, `VideoControl.playForwards`, `VideoControl.playBackwards`, `VideoControl.pause`, `VideoControl.playRateInputChanged`, `VideoControl.updateNavigationView`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#play`, `#playbackward`, `#playRate`
- **Links:** [BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)"), [BEH-225](#beh-225-playback-in-cache-mode "Playback in cache mode"), [BEH-252](#beh-252-play--pause-keys "Play / pause keys"), [DEBT-211](view_debt.md#debt-211-play-button-state-display "Play button state display"), [DEBT-220](view_debt.md#debt-220-cache-mode-playback-never-stops-at-the-end "Cache-mode playback never stops at the end")

## BEH-224: Frame-changed pipeline (single refresh path)

In mode `video` all frame changes (seek, play, step) end in the `timeupdate` event of `#video`, handled by `VideoFrame.frameChangedWrapper` (dedupes: no callback twice for the same frame, except the frame just requested by `seekTo`) which calls `onFrameChangedVideo2` [unverified: `frameChangedWrapper` not read].
`onFrameChangedVideo2` is dismissed unless `currentMode == "video"`; it sets `previewReady = true`, `currentFrame = getCurrentVideoFrame()` (= `video2.get() - frameoffset`), logs the seek duration if timing, aborts without refresh if `!isValidVideo` (after `currentFrame` was set), then calls `onFrameChanged`.
Other modes call `onFrameChanged` from their own callbacks with `currentFrame` set ([BEH-235](#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode"), [BEH-226](#beh-226-preview-while-ctrlmoving-over-the-chronogram-cache-preview-mode "Preview while Ctrl+moving over the chronogram (cache-preview mode)")). `onFrameChanged` then: optional hash cleanup ([BEH-217](#beh-217-frame-hash-removal-on-navigation "Frame hash removal on navigation")); `hardRefresh()` -> `refresh()`: `updateVideoControlForm()` ([BEH-210](#beh-210-video-info-panel-content "Video Info panel content")) and `overlay.hardRefresh()` (redraw image and annotations) [unverified for `refresh`]; finally triggers the jQuery event `frame:changed` on the VideoControl (the code comment lists the chronogram as listener and says the overlay redraw is also done directly by `hardRefresh`).
`getCurrentFrame()`/global `getCurrentFrame` returns `currentFrame` (last frame actually shown). External modules also call `videoControl.onFrameChanged()` directly after loading data (for example in `AnnotationIO.js`), and `videoControl.refresh()` after edits.

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onFrameChangedVideo2`, `VideoControl.onFrameChanged`, `VideoControl.hardRefresh`, `VideoControl.refresh`, `VideoControl.getCurrentFrame`, `VideoControl.getCurrentVideoFrame`
- **Links:** [BEH-210](#beh-210-video-info-panel-content "Video Info panel content"), [BEH-217](#beh-217-frame-hash-removal-on-navigation "Frame hash removal on navigation"), [BEH-218](#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)"), [SEAM-202](view_seams.md#seam-202-frame-image-source-what-the-overlay-draws "Frame image source (what the overlay draws)"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-225: Playback in cache mode

In modes other than `video`, play uses a `requestAnimationFrame` loop (`playStart`/`playTick`). `playStart` sets `playFrame = currentFrame` [unverified]; the first tick seeks `playFrame +/- 1` at once. Each later tick waits until `timestamp - playLastTime >= 1000 / videofps / playbackRate` ms and until `currentFrame == playFrame` (the requested frame has been displayed, which slows playback to the cache speed), then seeks the next frame (+1 forward, -1 backward). The `option` (Ctrl+Space x4) is ignored [unverified].
The loop ends when `playingState` becomes `paused` (the tick checks it). At the last frame, `seekFrame` rejects out-of-range requests, `currentFrame` never reaches `playFrame`, and the loop keeps polling every animation frame without pausing ([DEBT-220](view_debt.md#debt-220-cache-mode-playback-never-stops-at-the-end "Cache-mode playback never stops at the end")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.playStart`, `VideoControl.playTick`
- **Links:** [BEH-223](#beh-223-playback-in-video-mode-play-play-backwards-speed-x4 "Playback in video mode (Play, Play Backwards, speed, x4)"), [BEH-235](#beh-235-seek-and-display-in-cache-mode "Seek and display in cache mode"), [DEBT-220](view_debt.md#debt-220-cache-mode-playback-never-stops-at-the-end "Cache-mode playback never stops at the end")

## BEH-226: Preview while Ctrl+moving over the chronogram (cache-preview mode)

The chronogram (while Ctrl is held and the mouse moves over its plot, owner [CAP-300](view_capabilities.md#cap-300-temporal-display-and-navigation "Temporal display and navigation")) calls `videoControl.seekFrame(frame, "preview")`; at the end of the preview `endPreview` (ChronoControl) calls `seekFrame(-1, "end-preview")`.
`seekFrame(f, "preview")`: if not already in `cache-preview`, saves `savedMode` and `savedFrame = currentFrame` and sets `currentMode = "cache-preview"`. Then (range check as [BEH-218](#beh-218-seek-to-a-frame-number-core-seek "Seek to a frame number (core seek)")) it enqueues frame `f + frameoffset` in `VideoCache`, calls `processQueue()` and looks the frame up synchronously (`getFrameImageSync`): if it is already cached, `cacheImage`/`cacheFrame` are set and `onFrameChangedCachePreview` runs (it feeds the frame-changed pipeline, [BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)") [unverified]) so overlay and marks show the previewed frame; if not cached the display is unchanged until a later seek of the same frame hits the cache (the queue fill does not trigger a refresh).
`seekFrame(-1, "end-preview")`: ignored with a message if the mode is not `cache-preview`; otherwise restores `currentMode = savedMode` and `frame = savedFrame` (when `frame == -1`), then seeks that frame in the restored mode (in `video` mode this goes through `video2.seekTo` again).
While in `cache-preview`, `onFrameChangedVideo2` events are dismissed; selection/annotation edits made during preview apply to the previewed `currentFrame` [unverified].

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.seekFrame`, `VideoControl.onFrameChangedCachePreview`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `endPreview`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onAxesMoved`
- **Links:** [BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)"), [BEH-229](#beh-229-videocache-storage-queue-and-decoding "VideoCache: storage, queue and decoding"), [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window"), [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped"), [DEBT-213](view_debt.md#debt-213-mode-switch-does-not-resynchronize-the-displayed-frame "Mode switch does not resynchronize the displayed frame"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)")

## BEH-227: Preview video (scale4.mp4) legacy mode

A second `<video>` element (`previewVideo`, a low-resolution `<video>.scale4.mp4` with `previewTimescale`) can display frames in mode `preview` (`seekFrame` sets `previewVideo.currentTime = (f + frameoffset) / videofps / previewTimescale`; `onPreviewFrameChanged` fires on its `timeupdate`).
Nothing in the code read sets `currentMode = "preview"`, and `loadPreviewVideo()` is not called after a video load (only from the obsolete `onVideoLoaded`) [partly unverified], so this mode is unreachable in the current page. The only live parts are the Preview panel inputs (`#previewVideoName` onchange -> `loadPreviewVideo(url)` which loads the file and, on success, `<url>.info.json` for `timescale`; `#previewVideoTimeScale` onchange sets `videoinfo.preview.previewTimescale`; `#previewVideoStatus` icon `?`, `&mapstodown;`, tick, double tick, cross) and the I/O-status rows `videopreviewLoad`, `previewVideoInfoLoad` [unverified].

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.loadPreviewVideo`, `VideoControl.loadPreviewVideoInfo`, `VideoControl.setPreviewVideoStatus`, `VideoControl.onPreviewFrameChanged`, `VideoControl.changePreviewVideoName`, `VideoControl.changePreviewVideoInfo`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#panel_preview`, `#previewVideoName`, `#previewVideoTimeScale`, `#previewVideoStatus`
- **Links:** [BEH-226](#beh-226-preview-while-ctrlmoving-over-the-chronogram-cache-preview-mode "Preview while Ctrl+moving over the chronogram (cache-preview mode)"), [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped"), [OQ-206](../../QUESTIONS.md#oq-206 "Preview video and frame offset features")

## BEH-228: Frame, time and real-time conversions

`getCurrentVideoFrame()` = `video2.get() - frameoffset` (mode `preview`: `previewFrame - frameoffset`, unreachable). `getCurrentVideoTime()` = `video2.toMilliseconds() / 1000`. `getCurrentRealDate()` = `new Date(starttime)` + `toMilliseconds() * videofps / realfps` ms. `frameToTime(frame)` = `new Date(starttime)` + `(frame - frameoffset) / realfps` s (used by chronogram tooltips and time axis labels [unverified]). `maxframe()` = `floor(duration * videofps)`; `nframes` (placeholder 1, or from server) bounds seeks; `onVideoInfoChanged` recomputes `nframes = floor(duration * videofps)`, sets `video2.frameRate = videofps`, refreshes the form and updates the chronogram domain.
`videofps` is the nominal rate used to convert between media time and frame number; `realfps` is the real capture rate that links frames to wall-clock time; both come from the video record (or the user's calibration inputs).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.getCurrentVideoFrame`, `VideoControl.getCurrentVideoTime`, `VideoControl.getCurrentRealDate`, `VideoControl.frameToTime`, `VideoControl.maxframe`, `VideoControl.onVideoInfoChanged`
- **Links:** [BEH-211](#beh-211-time-and-image-calibration-inputs "Time and image calibration inputs"), [ENT-003](view_entities.md#ent-003-video "Video"), [DEBT-221](view_debt.md#debt-221-time-conversions-disagree-on-frameoffset-local-iso-formatting "Time conversions disagree on frameoffset; local ISO formatting")

## BEH-229: VideoCache: storage, queue and decoding

`VideoCache` (global `videoCache`, also `videoControl.videoCache`) returns the image of a requested frame of a video url, keeps decoded frames in a bounded LRU map and decodes missing ones one at a time in request order.
Observable contract:
- A request for a frame already requested (state `incache` or `inqueue`) returns the same promise; otherwise the frame is queued and the status text is updated. `getFrameImageAsync` = enqueue + `processQueue()`; `getFrameImageSync(url, frame)` returns the Image only if cached.
- `processQueue()` is a singleton loop (guard `processingQueue`). It decodes the head of the queue with `getImageForce`, stores it as `incache`, resolves its deferred, then shifts the queue. A 20 ms pause between frames is written but not awaited ([DEBT-210](view_debt.md#debt-210-videocache-queue-defects "VideoCache queue defects")). An `abortFlag` makes the loop return. If decoding throws, the loop ends (`finally` resets the guard) and the failing item stays at the head of the queue ([DEBT-210](view_debt.md#debt-210-videocache-queue-defects "VideoCache queue defects")).
- `getImageForce` seeks the hidden video to `frame / fps + 0.00001` with `requestVideoFrameCallback` (`seekWithCallback`), draws it on the canvas at the native video size, encodes it with `toDataURL('image/jpeg')` at default quality (`getFrameDataURLForce`) and decodes it into an `Image`. `seekWithCallback` replaces the hidden video `src` when `video.currentSrc != videoUrl`; if the video has no usable duration (`Infinity`/`NaN` and `readyState < 2`) it waits 1 s and seeks to a random time once, then rejects if still unusable.
- `getFrameCropDataURL(url, frame, fps, crop)` returns a JPEG data URL of the crop `{x,y,w,h}` of the cached frame (used by overlay and zoom for tag thumbnails). `preloadFrames(url, frames, fps)` ignores negative frames, aborts if `frames.length > videoCacheSize / 2`, enqueues all and processes the queue [unverified].
- The LRU has 1000 entries by default (`opts.videoCacheSize`); the hidden `<video>` (class `videoCache`) and a canvas are created once in the constructor. Key format `"<videoUrl>:<frame>"` and the fact that the cache is not cleared on a new video are [unverified].
Frame numbers passed in are media frames (`frame + frameoffset`) in `seekFrame`, but `exportFrame` and some overlay calls pass annotation frames (and `20` as fps) [unverified].

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoCache`, `VideoCache.enqueueFrame`, `VideoCache.processQueue`, `VideoCache.getImageForce`, `VideoCache.getFrameDataURLForce`, `VideoCache.seekWithCallback`, `VideoCache.getFrameImageSync`, `VideoCache.getFrameImageAsync`, `VideoCache.getFrameCropDataURL`, `VideoCache.preloadFrames`
- **Links:** [BEH-222](#beh-222-use-cache-toggle-and-mode-switch "Use Cache toggle and mode switch"), [BEH-230](#beh-230-cache-controls-preload-cancel-reset-status-size "Cache controls (Preload, Cancel, Reset, status, size)"), [BEH-231](#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved"), [DEBT-210](view_debt.md#debt-210-videocache-queue-defects "VideoCache queue defects"), [SEAM-203](view_seams.md#seam-203-videocache-interface "VideoCache interface")

## BEH-230: Cache controls (Preload, Cancel, Reset, status, size)

Buttons next to "Use Cache":
- `Preload` (`videoControl.preloadCache()`): centers on `currentFrame`, f1 = max(0, c - 50), f2 = min(nframes - 1, c + 100) (`preloadSpanBefore = 50`, `preloadSpanAfter = 100`), preloads `[c, f2]` first, then `[f1, c-1]`, each as one `preloadFrames` call (each call must stay within `videoCacheSize / 2`) [unverified].
- `Cancel` (`videoCache.cancelQueue()`): removes every still-queued entry from the LRU, empties `queryQueue`, sets `processingQueue = false` and refreshes the status; the deferreds of the removed entries are neither resolved nor rejected ([BEH-231](#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved")).
- `Reset` (`resetCache()`): cancel, then empty the LRU.
- `#cache-status` text: `<used>/<limit>,Q<queue length>`, refreshed on every queue change [unverified: format].
- `#videoCacheSize` (Options > Video caching, default 1000, on change): `parseInt`; `NaN` is rejected; otherwise sets `opts.videoCacheSize` and the LRU limit (excess entries are evicted); the text box is rewritten with the stored value. The page hint says to try 10 when Image Diff is slow [unverified].

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.preloadCache`, `VideoCache.cancelQueue`, `VideoCache.resetCache`, `VideoCache.updateStatus`, `VideoCache.setCacheSize`, `VideoCache.onVideoCacheParamsChanged`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#cache-status`, `#videoCacheSize`
- **Links:** [BEH-229](#beh-229-videocache-storage-queue-and-decoding "VideoCache: storage, queue and decoding"), [BEH-231](#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved"), [DEBT-210](view_debt.md#debt-210-videocache-queue-defects "VideoCache queue defects")

## BEH-231: Cancel leaves waiting seeks unresolved

In cache mode, a seek to an uncached frame waits for the whole queue ahead of it (strict FIFO); a long preload therefore delays interactive stepping until Cancel is pressed. `cancelQueue()` removes the queued entries without resolving or rejecting their promises (the `reject` call is commented out), so a seek waiting on a cancelled frame never refreshes: the display stays on the previous frame and `currentFrame` is unchanged.
If Cancel is pressed while the decode loop is awaiting an image, `processingQueue` is already false, so a later `processQueue()` call starts a second loop while the first is still running; both share the hidden video and canvas, and the first loop's final `shift()` then removes an entry of the new queue [inferred from code order, not run] ([DEBT-210](view_debt.md#debt-210-videocache-queue-defects "VideoCache queue defects")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoCache.cancelQueue`, `VideoCache.processQueue`
- **Links:** [BEH-229](#beh-229-videocache-storage-queue-and-decoding "VideoCache: storage, queue and decoding"), [BEH-230](#beh-230-cache-controls-preload-cancel-reset-status-size "Cache controls (Preload, Cancel, Reset, status, size)"), [DEBT-210](view_debt.md#debt-210-videocache-queue-defects "VideoCache queue defects"), [OQ-204](../../QUESTIONS.md#oq-204 "Cache mode semantics")

## BEH-232: Load a video and its tracks from the gurabo4 dataset

The link "gurabo4 video+tracks_tagged" next to "Load Events from DB" calls `clickLoadTracksTaggedCSVFromServer()`: it prompts "Enter gurabo4 col_videoname" with the default `col10/9_02_R_190809120000.cfr.mp4` (empty or cancel does nothing), then calls `videoManager.loadVideoManual(url_for("/data") + "/datasets/gurabo4/mp4/<col_videoname>")` without awaiting it, and immediately calls `loadTrackTaggedCSVFromServer(url_for("/data") + "/datasets/gurabo4/tracks/<col_videoname>.tracks_tagged.csv")`. The tracks request therefore starts before the video has loaded.
The dataset name is hard-coded. The log message of the cancel branch names `clickLoadTracksCSVFromServer` (copy-paste). This is a video entry point living in the annotation IO file ([CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save") owns the tracks side).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `clickLoadTracksTaggedCSVFromServer`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videoinfo`
- **Links:** [BEH-202](#beh-202-ways-to-choose-a-video "Ways to choose a video"), [BEH-207](#beh-207-load-a-video-by-uri-or-from-data-manual-load "Load a video by URI or from /data (manual load)"), [DEBT-230](view_debt.md#debt-230-hard-coded-gurabo4-videotracks-loader "Hard-coded gurabo4 video+tracks loader"), [OQ-201](../../QUESTIONS.md#oq-201 "Which video-loading paths are routine")

## BEH-233: State after a failed video load

`videoSelected(id)` assigns `currentVideoID = id` before the record request, so a failure leaves the manager naming a video that is not loaded:
- record request fails: `videoinfo` is unchanged (the previous video stays loaded), `currentVideoID` already names the requested video, so the hash router skips the same id again ([BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)")) and the `.video_id` link and the "Frame: n" link name the unloaded video;
- record found but media load fails or times out: `videoinfo` is already the new video's (set by `setVideoInfo`), the media element is on a broken source, `isValidVideo` is false ([BEH-206](#beh-206-video-load-error "Video load error")) and the canvas is 600x400.
No automatic recovery or message other than the red dialog messages of [BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)") and [BEH-206](#beh-206-video-load-error "Video load error").

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `VideoManager.videoSelected`, `VideoManager.setVideoInfo`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoError`
- **Links:** [BEH-204](#beh-204-select-a-database-video-video-id-to-loaded-video "Select a database video (video id to loaded video)"), [BEH-206](#beh-206-video-load-error "Video load error"), [BEH-208](#beh-208-url-hash-router-video_id-video_data-frame "URL hash router (video_id, video_data, frame)"), [DEBT-205](view_debt.md#debt-205-load-errors-throw-inside-callbacks-promises-never-settle "Load errors throw inside callbacks; promises never settle")

## BEH-234: Effects of a completed video load

When the media element fires `loadeddata`, `video.onloadeddata` (bound to `onVideoLoaded2`) does, in this order: close `fromServerDialog`; `setPreviewVideoStatus("undefined")` (the preview status icon shows `?`); I/O-status row `videoLoad` set to requested then to success (so its elapsed time is about 0 s, [DEBT-228](view_debt.md#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request "videoLoad status row: request logged at completion, error before any request")); `video2.frameRate = videoinfo.videofps`; `isValidVideo = true`; `onVideoSizeChanged()` ([BEH-212](#beh-212-video-size-and-canvas-size "Video size and canvas size")); `#videoName` = `videoinfo.name`; `a.videolink` -> `videoinfo.videoPath`; `a.videoinfolink` -> `url_for("/videodata?videoid=<currentVideoID>")`; `flagLoadingVideo = false`; then schedules a 500 ms timer that calls `hardRefresh()` (no pending seek) or `seekFrame(this.delayedSeekFrame)` after having cleared `delayedSeekFrame` (so it seeks `undefined`, [BEH-209](#beh-209-delayed-seek-seek-requested-before-the-video-is-ready "Delayed seek (seek requested before the video is ready)"), [DEBT-202](view_debt.md#debt-202-delayedseekframe-is-cleared-before-it-is-used "delayedSeekFrame is cleared before it is used")); finally triggers the jQuery event `video:loaded` on the VideoControl.
No frame is seeked on load. The displayed frame is whatever the media element shows (assumed time 0, [unverified]) and `currentFrame` keeps its previous value until the next frame-changed callback ([OQ-214](../../QUESTIONS.md#oq-214 "Frame shown right after a video has loaded")). The old `onVideoLoaded` (which loaded `.info.json`, the preview video and tags) is obsolete and not called ([DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped")).
Loading a new video does not clear `Tracks`/`Tags` (the warning in [BEH-203](#beh-203-load-video-from-the-database-list-dialog "Load video from the database (list dialog)") says unsaved changes may be lost, [OQ-211](../../QUESTIONS.md#oq-211 "Switching video with unsaved edits")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.onVideoLoaded2`, `VideoControl.hardRefresh`
- **Links:** [BEH-205](#beh-205-load-the-media-element "Load the media element"), [BEH-209](#beh-209-delayed-seek-seek-requested-before-the-video-is-ready "Delayed seek (seek requested before the video is ready)"), [BEH-210](#beh-210-video-info-panel-content "Video Info panel content"), [BEH-212](#beh-212-video-size-and-canvas-size "Video size and canvas size"), [DEBT-202](view_debt.md#debt-202-delayedseekframe-is-cleared-before-it-is-used "delayedSeekFrame is cleared before it is used"), [DEBT-208](view_debt.md#debt-208-obsolete-videopreview-code-still-shipped "Obsolete video/preview code still shipped"), [DEBT-228](view_debt.md#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request "videoLoad status row: request logged at completion, error before any request"), [OQ-211](../../QUESTIONS.md#oq-211 "Switching video with unsaved edits"), [OQ-214](../../QUESTIONS.md#oq-214 "Frame shown right after a video has loaded")

## BEH-235: Seek and display in cache mode

In `cache` mode `seekFrame(f)` sets `cacheRequestedFrame = f` and calls `videoCache.getFrameImageAsync(video.src, f + frameoffset, videofps)`; when that promise settles, whether it resolved or rejected (a rejection is logged first), it stores `cacheImage` (possibly `undefined`) and `cacheFrame = f` and calls `onFrameChangedCache`. If the mode is still `cache`, that sets `currentFrame = cacheFrame` and `currentImage = cacheImage` and runs the common frame-changed path ([BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)")); otherwise the event is dismissed.
Because `cacheRequestedFrame` is never compared, the last response to arrive wins, not the last request ([DEBT-209](view_debt.md#debt-209-cache-seeks-have-no-staleness-check "Cache seeks have no staleness check")).
When `currentImage` is missing, the overlay draws a grey strip "Frame N not in cache" and clears the annotation layer [unverified].
Frames are exact decoded images ([BEH-229](#beh-229-videocache-storage-queue-and-decoding "VideoCache: storage, queue and decoding")), so stepping in this mode is exact but waits for the queue ([BEH-231](#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.seekFrame`, `VideoControl.onFrameChangedCache`
- **Links:** [BEH-222](#beh-222-use-cache-toggle-and-mode-switch "Use Cache toggle and mode switch"), [BEH-224](#beh-224-frame-changed-pipeline-single-refresh-path "Frame-changed pipeline (single refresh path)"), [BEH-229](#beh-229-videocache-storage-queue-and-decoding "VideoCache: storage, queue and decoding"), [BEH-231](#beh-231-cancel-leaves-waiting-seeks-unresolved "Cancel leaves waiting seeks unresolved"), [DEBT-209](view_debt.md#debt-209-cache-seeks-have-no-staleness-check "Cache seeks have no staleness check"), [OQ-204](../../QUESTIONS.md#oq-204 "Cache mode semantics")

## BEH-250: Global keyboard handler: scope and dispatch order

A single `keydown` listener (`onKeyDown`, jQuery) is bound in `init` to `#left-side` (made focusable with `tabindex=0`); the right column (`#right-side`, including `#I`, label buttons, options) is a different table cell and does not feed it (the Zoom panel has its own handler, `ZoomOverlay.onKeyDown`, bound to `#videozoom`) [unverified]. Shortcuts therefore work only when focus is inside the left column (not verified which clicks give it focus; [OQ-208](../../QUESTIONS.md#oq-208 "Keyboard focus scope")).
Order of tests for each key press:
1. Target is a `textarea`, `select` or has `type === "text"` (for example `#currentFrame`, `#playRate`, `#selectID`, `#restrictID`, chronogram filter fields): the event propagation is stopped and the handler returns without `return false`; `Escape` there additionally moves focus to `#left-side` and calls `updateForm(overlay.getActiveObject())`.
2. Target is `#I` and `Escape`: blur, focus `#left-side`, `updateForm`, `return false`. Unreachable: `#I` is an `<input type="text">`, which the first test already catches ([DEBT-207](view_debt.md#debt-207-dead-and-misplaced-key-handling-around-the-id-field "Dead and misplaced key handling around the ID field")). Any other key with `type == "text"`: returns true.
3. `Delete`, `d`, `Backspace` (any modifiers) -> `deleteSelected()`; `p` -> pollen shortcut ([BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules")); `r` with Ctrl -> `videoControl.refresh()`; `ArrowLeft`/keyCode 188 and `ArrowRight`/keyCode 190 -> frame stepping ([BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)")); `Space` -> play ([BEH-252](#beh-252-play--pause-keys "Play / pause keys")); `Escape` / `Enter` -> toggle focus on `#I` ([BEH-253](#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field")); any other key -> `labelsProcessKey(e.key)` ([BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules")).
Handled keys `return false` (jQuery: preventDefault and stopPropagation), including `Ctrl+r` (the browser reload is suppressed there), `Space` (no page scroll), `Backspace` (no history back), `Enter`. Keys are matched on `e.key` (case-sensitive: `d`, `p`, `r` lower case; `Ctrl+Shift+R` produces `R` and is not handled, so the browser reload goes through and the leave prompt appears, [BEH-221](#beh-221-leaving-the-page "Leaving the page")), except `,` and `.` which are matched on `keyCode` 188/190 (any modifier combination, any keyboard layout where those codes exist).
Unhandled keys (ArrowUp, ArrowDown, letters without label shortcut, F-keys) are left to the browser (ArrowUp/Down scroll the page); they do not move the annotation box although Quick Help says so ([DEBT-217](view_debt.md#debt-217-quick-help-contradicts-the-code "Quick Help contradicts the code")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`, `init`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#left-side`
- **Links:** [BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)"), [BEH-252](#beh-252-play--pause-keys "Play / pause keys"), [BEH-253](#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field"), [BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules"), [BEH-255](#beh-255-bee-id-entry-with-enter-i-and-newid "Bee ID entry with Enter (`#I` and `#newid`)"), [BEH-256](#beh-256-key-map-of-the-left-column-summary "Key map of the left column (summary)"), [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [DEBT-206](view_debt.md#debt-206-shortcut-p-does-nothing "Shortcut `p` does nothing"), [DEBT-207](view_debt.md#debt-207-dead-and-misplaced-key-handling-around-the-id-field "Dead and misplaced key handling around the ID field"), [DEBT-217](view_debt.md#debt-217-quick-help-contradicts-the-code "Quick Help contradicts the code"), [OQ-208](../../QUESTIONS.md#oq-208 "Keyboard focus scope")

## BEH-251: Frame stepping keys (full table)

Keys `ArrowLeft` or `,` (the `<` key) move back; `ArrowRight` or `.` (the `>` key) move forward. Modifier effect in the code ([DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"): this, not Quick Help, is the behavior):

| Keys | Back (ArrowLeft, `,`) | Forward (ArrowRight, `.`) |
|---|---|---|
| (none) | `rewind()` : -1 frame | `forward()` : +1 frame |
| Shift | `rewind2()` : -1 s (`videofps` frames) | `forward2()` : +1 s |
| Ctrl | `rewind3()` : -10 s | `forward3()` **then** `forward()` : +10 s then +1 frame |
| Ctrl+Shift | `rewind4()` : -60 s | `forward4()` **then** `forward2()` : +60 s then +1 s |

The asymmetry is a missing `else`: in the forward branch the first `if / else if` handles Ctrl+Shift and Ctrl, and a second independent `if (shiftKey) forward2(); else forward();` follows, so Ctrl alone executes `forward3()` and `forward()`, and Ctrl+Shift executes `forward4()` and `forward2()` ([DEBT-201](view_debt.md#debt-201-ctrlright-and-ctrlshiftright-fall-through-to-a-second-move "Ctrl+Right and Ctrl+Shift+Right fall through to a second move")). Each call re-checks bounds separately (a `forward3()` rejected at the end of the video is still followed by `forward()`). The back branch is a proper if/else chain.
All variants return `false`. The same moves are available on the buttons ([BEH-220](#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves"), fixed 20 fps there). The Quick Help text differs from the code ([DEBT-217](view_debt.md#debt-217-quick-help-contradicts-the-code "Quick Help contradicts the code"), [OQ-207](../../QUESTIONS.md#oq-207 "Intended keyboard step distances")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.rewind`, `VideoControl.forward`, `VideoControl.rewind4`, `VideoControl.forward4`
- **Links:** [BEH-220](#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves"), [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [DEBT-201](view_debt.md#debt-201-ctrlright-and-ctrlshiftright-fall-through-to-a-second-move "Ctrl+Right and Ctrl+Shift+Right fall through to a second move"), [DEBT-217](view_debt.md#debt-217-quick-help-contradicts-the-code "Quick Help contradicts the code"), [OQ-207](../../QUESTIONS.md#oq-207 "Intended keyboard step distances")

## BEH-252: Play / pause keys

`Space` toggles forward play (`playPauseVideo()`); `Shift+Space` toggles backward play (`playPauseVideoBackward()`); `Ctrl+Space` starts forward play "x4" (`playPauseVideo(2)`), `Ctrl+Shift+Space` backward x4 (`playPauseVideoBackward(2)`); same semantics as the buttons ([BEH-223](#beh-223-playback-in-video-mode-play-play-backwards-speed-x4 "Playback in video mode (Play, Play Backwards, speed, x4)")). In cache modes the x4 option has no effect ([BEH-225](#beh-225-playback-in-cache-mode "Playback in cache mode")). Space does not scroll the page (the handler returns `false`).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.playPauseVideo`, `VideoControl.playPauseVideoBackward`
- **Links:** [BEH-223](#beh-223-playback-in-video-mode-play-play-backwards-speed-x4 "Playback in video mode (Play, Play Backwards, speed, x4)"), [BEH-225](#beh-225-playback-in-cache-mode "Playback in cache mode"), [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order")

## BEH-253: Escape and Enter move focus to the bee ID field

In the left column (non-text target): `Escape` and `Enter` both focus and select the text of `#I` ("currID" field, right column, in the Annotations > BeeID panel) so that the user can type a new ID; if `#I` already has focus the same keys collapse the selection, blur it and return focus to `#left-side` (this second branch cannot be reached: `#I` is a text input, caught by the first test of `onKeyDown`, see [DEBT-207](view_debt.md#debt-207-dead-and-misplaced-key-handling-around-the-id-field "Dead and misplaced key handling around the ID field")). `Escape` in another left-column text field returns focus to `#left-side` and re-syncs the form with the active object (`updateForm`).
Typing in `#I` is handled by [BEH-255](#beh-255-bee-id-entry-with-enter-i-and-newid "Bee ID entry with Enter (`#I` and `#newid`)"). The code does not validate or save the bee annotation on Enter here ([OQ-212](../../QUESTIONS.md#oq-212 "Enter key in the left column versus Quick Help")).

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#I`
- **Links:** [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [BEH-255](#beh-255-bee-id-entry-with-enter-i-and-newid "Bee ID entry with Enter (`#I` and `#newid`)"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [DEBT-207](view_debt.md#debt-207-dead-and-misplaced-key-handling-around-the-id-field "Dead and misplaced key handling around the ID field"), [OQ-212](../../QUESTIONS.md#oq-212 "Enter key in the left column versus Quick Help")

## BEH-254: Shortcut keys whose effect is in other modules

Dispatched from `onKeyDown` (this group owns the key binding and the dispatch order, not the effect):
- `Delete`, `d`, `Backspace` (any modifiers): `deleteSelected()` (`SelectionControl.js`), effect owned by [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes").
- `p`: the code runs `$("#P").prop("checked", !$().prop("checked"))` then triggers `change` on `#P`, and returns `false`. `$()` is an empty set (its `prop` is `undefined`, so the new value is always `true`); no element with `id="P"` (double-quoted) was found in the page template, single-quoted ids were not searched. The key is consumed whatever happens ([DEBT-206](view_debt.md#debt-206-shortcut-p-does-nothing "Shortcut `p` does nothing"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-209](../../QUESTIONS.md#oq-209 "Intended `p` (pollen) shortcut")).
- `Ctrl+r`: `videoControl.refresh()` (redraw form and overlay without reloading the page).
- any other single key: `labelsProcessKey(e.key)` (`SelectionControl.js`), consumed (`return false`) only if it returns true; semantics (accesskey match, toggling the label on the active observation) owned by [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes") [unverified here].

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteSelected`, `labelsProcessKey`
- **Links:** [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [DEBT-206](view_debt.md#debt-206-shortcut-p-does-nothing "Shortcut `p` does nothing"), [OQ-209](../../QUESTIONS.md#oq-209 "Intended `p` (pollen) shortcut")

## BEH-255: Bee ID entry with Enter (`#I` and `#newid`)

Two handlers are defined in `labelBee.js`. `#I` is bound by the inline attribute `onkeypress="onKeyDown_IDEdit(event)"`; the binding of `#newid` was not read [unverified]:
`#I` -> `onKeyDown_IDEdit`: on `event.key == 'Enter'`, takes the text of `#I` as the new ID of the active annotation box (`overlay.getActiveObject()`); nothing happens if no box is active.
- A box with `status === "new"` gets that `id`, is submitted (`submit_bee`), `defaultSelectedBee` becomes the new ID, message "ID changed + submitted" (green).
- A stored box (`status "db"`) calls `changeObservationID(frame, old_id, new_id, change_id_force)` (`change_id_force` is `'swap'` at init: on a conflict the two IDs are swapped): success sets the box id and `defaultSelectedBee` and shows "ID changed succesfully!" (green), failure shows "ID not changed" (orange); in both cases then `videoControl.refresh()` and `refreshChronogram()`.
`#newid` -> `onKeyDown_NewIDEdit` (tests `event.which || event.keyCode == 13`): sets `obs.newid` to the text (empty text becomes `undefined`); if non-empty it also sets `obs.fix.newid` (creating `fix` if absent) and adds the `wrongid` label if absent; an empty text does not clear `fix.newid` or the label. Then a `new` box is submitted, otherwise the observation is stored (`storeObs`); finally `overlay.hardRefresh()`, `refreshChronogram()` and `updateForm`. Nothing happens if no box is active.
Owner of the ID/wrongid semantics: [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes") / [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"); listed here because the binding lives in `labelBee.js`.

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_IDEdit`, `onKeyDown_NewIDEdit`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#I`, `#newid`
- **Links:** [BEH-253](#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [DEBT-207](view_debt.md#debt-207-dead-and-misplaced-key-handling-around-the-id-field "Dead and misplaced key handling around the ID field")

## BEH-256: Key map of the left column (summary)

Summary of the keys handled by `onKeyDown` ([BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order")), with the item that specifies each. Gestures bound by other modules (canvas, chronogram, zoom panel) are specified by their owner groups.

| Key (left column, focus not in a text field) | Effect | Item |
|---|---|---|
| `ArrowLeft`, `,` (+Shift, +Ctrl, +Ctrl+Shift) | step back 1 frame, 1 s, 10 s, 60 s | [BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)") |
| `ArrowRight`, `.` (+Shift, +Ctrl, +Ctrl+Shift) | step forward, with the Ctrl fall-through | [BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)"), [DEBT-201](view_debt.md#debt-201-ctrlright-and-ctrlshiftright-fall-through-to-a-second-move "Ctrl+Right and Ctrl+Shift+Right fall through to a second move") |
| `Space` (+Shift, +Ctrl, +Ctrl+Shift) | play / pause forward, backward, x4 | [BEH-252](#beh-252-play--pause-keys "Play / pause keys") |
| `Escape`, `Enter` | focus the ID field `#I` | [BEH-253](#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field") |
| `Delete`, `d`, `Backspace` | delete active box | [BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules") |
| `p` | nothing visible (consumed) | [BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules"), [DEBT-206](view_debt.md#debt-206-shortcut-p-does-nothing "Shortcut `p` does nothing") |
| `Ctrl+r` | redraw (`videoControl.refresh`) | [BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules") |
| other keys | label shortcut through `labelsProcessKey` | [BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules") |
| `Enter` in `#I`, in `#newid` | commit bee ID, wrong-id fix | [BEH-255](#beh-255-bee-id-entry-with-enter-i-and-newid "Bee ID entry with Enter (`#I` and `#newid`)") |

- **Group:** [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
- **Links:** [BEH-250](#beh-250-global-keyboard-handler-scope-and-dispatch-order "Global keyboard handler: scope and dispatch order"), [BEH-251](#beh-251-frame-stepping-keys-full-table "Frame stepping keys (full table)"), [BEH-252](#beh-252-play--pause-keys "Play / pause keys"), [BEH-253](#beh-253-escape-and-enter-move-focus-to-the-bee-id-field "Escape and Enter move focus to the bee ID field"), [BEH-254](#beh-254-shortcut-keys-whose-effect-is-in-other-modules "Shortcut keys whose effect is in other modules"), [BEH-255](#beh-255-bee-id-entry-with-enter-i-and-newid "Bee ID entry with Enter (`#I` and `#newid`)"), [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [SEAM-204](view_seams.md#seam-204-key-map "Key map"), [OQ-208](../../QUESTIONS.md#oq-208 "Keyboard focus scope")

## BEH-257: Mouse gestures owned by labelBee.js (layout)

`labelBee.js` itself binds only layout gestures: click on the header of an `.inline-collapsible` block toggles `collapsed` ([BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior")); drag of a header or panel label inside `.sortable` containers reorders it; `#alerttextblock` is made resizable in `init`. The canvas, chronogram and zoom gestures are bound by other modules. The Fullscreen button of the navbar calls `toggleFullScreen()`: `document.body.webkitRequestFullscreen()` if `document.fullscreenElement` is empty, else `document.exitFullscreen()` (prefixed call; browsers without it raise an error [inferred]).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`, `toggleFullScreen`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#alerttextblock`, `#fullscreen`
- **Links:** [BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior"), [BEH-256](#beh-256-key-map-of-the-left-column-summary "Key map of the left column (summary)"), [DEBT-224](view_debt.md#debt-224-fullscreen-call-is-webkit-only-and-has-dead-code "Fullscreen call is WebKit-only and has dead code")

## BEH-258: Messages area and I/O status rows

`printMessage(html, color)` writes HTML into `#alerttext` (collapsible "Messages" block above the video) and sets its color (default black); non-empty messages are also logged to the console. It is cleared by every frame refresh (`updateVideoControlForm` calls `printMessage("")`) and by a canvas mouse-down [unverified], so messages last until the next frame change.
`StatusWidget` keeps the I/O Status table (right column > I/O > I/O Status), one row per type (`tr.status.<type>`; rows `videolistLoad`, `videoLoad`, `videoinfoLoad`, `videopreviewLoad`, `tagsLoad` [unverified]): `statusRequest(type)` records the request time and shows a clock and `[@ HH:MM:SS]`; `statusUpdate(type, success)` shows a green tick with `[took <elapsed>s]` or a red cross with no time. `statusUpdate` needs a previous `statusRequest` of the same type ([DEBT-228](view_debt.md#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request "videoLoad status row: request logged at completion, error before any request")). Only `videoLoad` is driven by the current load path ([BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [BEH-206](#beh-206-video-load-error "Video load error")); `videoinfoLoad` and `videopreviewLoad` are set only by obsolete or preview code ([BEH-227](#beh-227-preview-video-scale4mp4-legacy-mode "Preview video (scale4.mp4) legacy mode")).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `printMessage`, `StatusWidget`, `htmlCheckmark`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#alerttext`, `tr.status`
- **Links:** [BEH-206](#beh-206-video-load-error "Video load error"), [BEH-227](#beh-227-preview-video-scale4mp4-legacy-mode "Preview video (scale4.mp4) legacy mode"), [BEH-234](#beh-234-effects-of-a-completed-video-load "Effects of a completed video load"), [DEBT-228](view_debt.md#debt-228-videoload-status-row-request-logged-at-completion-error-before-any-request "videoLoad status row: request logged at completion, error before any request")

## BEH-259: Page layout (panels and their ids)

The page (`labelbee_page.html`) is a two-cell table `main-table`.
Left cell `#left-side` (focusable, keyboard scope): `#beeInfo` with, in order: label-list dialogs (hidden until opened), `#alerttextblock` (Messages), `#canvasresize` (resizable video view: `#video`, `#canvas`, `#canvas1`), `#videocontrol` (Video: play/step/frame box/cache buttons, [BEH-220](#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves")/[BEH-230](#beh-230-cache-controls-preload-cancel-reset-status-size "Cache controls (Preload, Cancel, Reset, status, size)")), `#pickframeblock` and `#pickflowerblock` (hidden by default, [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")), then the sortable group `#timeline` (hidden, experimental), `#focusIntervalTab`, `#selectedTab`, `#eventsTab`, `#filterTab`, `#chronoTab` (chronogram `#chronoDiv`/`#svgVisualize`, `#chronoStatusBar`), and below the table `#tagDetails` [unverified: layout order not re-read].
Right cell `#right-side`: accordions `#videoinfo`, `#annotationpanel` (BeeID `#beeidpanel` open by default, `#labeltoggle`, `#visitblock`, `#boundingboxblock`, `#labeling-delete`, `#beeinfo`), `#I/O`, `#features`, `#videozoom`, `#parameters` (Options), `#quickhelp`, `#labelingTab` [unverified].
Navbar: logo "labelBee", "Fullscreen", user status `#whoami`, "Quit" (link to the home page). Dialogs at the end of the page: `#dialog-filepicker-from-server`, `#from-server-dialog`, `#dialog-login`, `#mainAlertDialog` [unverified].
The Options panel (`#parameters`) groups the toggles that belong to video and preview: the Display "Image Cache" button (same option as "Use Cache"), Video caching (`#videoCacheSize`); other option groups belong to their surfaces. The Preview panel is `#panel_preview` inside Video Info.
CSRF: the page template contains `<meta name="csrf-token">` and an inline script that reads it and sets the `X-CSRFToken` request header through `xhr.setRequestHeader` (the condition under which it applies, for example non-GET requests only, was not read).
Scripts: the page is built from plain `<script>` tags (no modules). Libraries loaded first: jQuery and jQuery UI, DataTables (+ Bootstrap integration), Bootstrap, jsGrid, `VideoFrame.js`, LRU cache, fabric.js, D3 v6, ResizeSensor, jquery.csv, perspective-transform; then, in this order, `Model.js`, `VideoList.js`, `VideoControl.js`, `OverlayControl.js`, `SelectionControl.js`, `AnnotationIO.js`, `ChronoAxes.js`, `ChronoControl.js`, `ChronoControlActivitiesLegacy.js`, `ChronoControlInteraction.js`, `ZoomView.js`, `labelBee.js` (last).

- **Group:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")
- **Origin:** essential
- **Code:**
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#left-side`, `#right-side`, `#videocontrol`, `#parameters`, `#panel_preview`, `#features`, `#quickhelp`
- **Links:** [BEH-215](#beh-215-showhide-menu-tabs-features-panel "Show/hide menu tabs (Features panel)"), [BEH-216](#beh-216-collapsible-and-sortable-panel-behavior "Collapsible and sortable panel behavior"), [BEH-220](#beh-220-step-buttons-and-relative-moves "Step buttons and relative moves"), [BEH-230](#beh-230-cache-controls-preload-cancel-reset-status-size "Cache controls (Preload, Cancel, Reset, status, size)"), [SEAM-201](view_seams.md#seam-201-framesync-api-seek-in-presentation-out "FrameSync API (seek in, presentation out)"), [DEBT-225](view_debt.md#debt-225-template-markup-defects-in-the-video-block "Template markup defects in the video block")
