# Modules and global state (draft)

Conventions: [README.md](README.md). Per-group raw material: global variables/functions that cross files, and
the natural modules into which each area groups. Boundary contracts are the `SEAM` items in [seams.md](seams.md).

## Group 1: Manage data and users

### (a) Global state table

Python (server process)

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `db` (SQLAlchemy) | `labelbee/app.py` | `labelbee/models.py`, every `database/*/api.py`, `gallery.py`, `auth.py`, `resources/video.py`, `resources/annotations.py` | `create_app` (`init_app`) |
| `ma` (Marshmallow), module level | `labelbee/app.py` | `database/*/schema.py` (`from labelbee.app import ma`) | nobody: never bound to the app (DEBT-122) |
| `ma` (local variable of `create_app`) | `create_app`: `Marshmallow(app)` | only `create_app` (`ma.init_app(app)`) | `create_app` |
| `csrf` | `labelbee/app.py` | `blueprints/api/__init__.py`, `resources/auth.py` (imported, unused there) | `create_app` (`init_app`, `exempt(api.bp)`) |
| `log_dir` | `labelbee/app.py` (env `LABELBEE_LOGDIR`, read at import) | `create_app` | env |
| `app.config` | Flask | all modules via `current_app` / templates (`config.APP_NAME`) | `settings.py`, `local_settings.py`, `create_app` (`WTF_CSRF_ENABLED` when testing) |
| `current_app.user_manager` | Flask-User `UserManager(app, db, User)` in `create_app` | `resources/auth.py` (`verify_password`), `database/user/api.py` (`hash_password`) | `create_app` |
| `current_user` | Flask-Login proxy | every guarded page, every API method, `layout.html` | `login_user` / `logout_user` in `resources/auth.py`; Flask-User pages; gallery handlers mutate it via `populate_obj` (BEH-154) |
| `data_root_dir` | `blueprints/api/resources/rawdata.py` (env `DATA_DIR`, read at import) | `RawDataAPI.get` | env |
| env `ROOT_PATH` | read in `resources/video.py` at request time | `VideoListAPI.post`, `VideoAPI.delete` | env |
| `parser` (RequestParser) | `resources/dataset.py`, `resources/rawdata.py` (two different objects, same name) | resources | none |
| `bp` blueprints | each blueprint package `__init__` | `create_app` | none |

Browser globals produced or consumed by the server-rendered pages / API client (defined in the annotator, listed because they cross the server boundary)

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `user_id` | `labelBee.js` | `eventsToServer` (sent as `created_by_id`) | `whoami` |
| `user_data` | `AnnotationIO.js` | `VideoList.js` (`receiveVideoSelection` error message) | `whoami` |
| `http_script_name_0` / `http_script_name` | `labelbee_page.html` (Jinja) / `labelBee.js` | `url_for` (JS helper) | `init` |
| `fromServerDialog.basedOn` | `AnnotationIO.js` | `eventsToServer` (`created_from_id`) | `loadEvents`, `loadEventsFromServer*` |
| `videoManager.currentVideoID` | `VideoList.js` | `FromServerDialog`, `eventsToServer`, `VideoControl.js` (Info link rewrite) | `videoSelected` |
| `csrftoken`, `$.ajaxSetup` | each server page (`<script>` block) | jQuery AJAX | page load |
| `users`, `editing`, `success` | `manage_users_page.html` (set from Jinja) | `populateFormFields`, DataTable | page load |
| `show_thumb` | `videos_page.html` | `refresh_table` | `refresh_table` |

### (b) Proposed modules

| Module | Responsibility | Current code |
|---|---|---|
| `core` | app factory, config layering, logging, proxy, CSRF policy, extensions (`db`, `ma`, `csrf`) | `labelbee/app.py`, `settings/*`, `middlewares/reverse_proxy.py` |
| `persistence` | models, repositories (one query-helper module per entity), schemas | `labelbee/models.py` (models), `database/*/api.py`, `database/*/schema.py`, `database/utils.py` |
| `identity` | users, roles, sessions, login/registration/profile, access decorators (one place for role checks, page and API) | `models.py` (forms), `blueprints/auth`, `blueprints/admin` (users part), `resources/auth.py`, Flask-User glue |
| `catalog-pages` | server-rendered browsing of datasets, videos, video data; deep links into the annotator (`blueprints/labelbee` is the bridge to CAP-700, see SEAM-102) | `blueprints/gallery`, `blueprints/home`, `blueprints/labelbee`, shared templates |
| `rest-api` | `/api/v1` resources, one envelope, one auth/error convention | `blueprints/api` |
| `annotation-store` | save/load/list of annotation snapshots with lineage (CAP-703 server side) | `resources/annotations.py`, `database/annotation/*` |
| `file-serving` | range requests, directory listing, raw data browsing, video upload (if kept) | `blueprints/download`, `resources/rawdata.py`, upload part of `resources/video.py` |
| `ops` | version/diagnostics page, seed script | `admin.version_page`, `seed.py` |

## Group 2: Load and play video

### (a) Global state table

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `videoinfo` (object: name, videoPath, videofps, realfps, starttime, duration, nframes, frameoffset, preview{previewURL, previewInfoURL, previewTimescale}, tagsfamily, place, comments, videoURL, videoName, tags{videoTagURL}) | `VideoList.js` (`var videoinfo`, built in `VideoManager` ctor and `setVideoInfo`) | `VideoControl.js` (everywhere), `ChronoAxes.js` (`starttime`, `realfps`), `ChronoControl.js` (`nframes`, `duration`, `name`), `Model.js` (`nframes`), `AnnotationIO.js` (`name`, `videoPath`, `videoName`), `OverlayControl.js` (`videofps`) | `VideoList.js` (`setVideoInfo`, `changeStartTime`, `changeVideoFPS`, `changeFPS`, `changeFrameOffset`), `VideoControl.js` (`loadVideo`, `onVideoInfoChanged`, `loadVideoInfo`, `loadPreviewVideo*`, `changePreviewVideoInfo`) |
| `videoManager` (`VideoManager`) | `labelBee.js` `init` | `VideoControl.js` (`currentVideoID`, `updateVideoInfoForm`), `AnnotationIO.js` (live call `loadVideoManual` in `clickLoadTracksTaggedCSVFromServer`; a read of `currentVideoID` there is [unverified]), `labelBee.js` router (`currentVideoID`, `selectVideoBy_video_id`) | `VideoList.js` (`currentVideoID`, `videoListJSON`, `loadingVideoId`, `filePicker`) ; `AnnotationIO.js` (only a commented dev override of `currentVideoID`) |
| `videoControl` (`VideoControl`) | `labelBee.js` `init` | `SelectionControl.js`, `ChronoControl*.js`, `AnnotationIO.js`, `OverlayControl.js`, `ZoomView.js`, `VideoList.js` | itself; `OverlayControl.js` writes `currentMode`; `labelBee.js` router writes `removeHashOnFrameChange*` |
| `videoControl.currentFrame` | `VideoControl.js` | all views via `getCurrentFrame()` or directly (`ChronoControl.js`, `OverlayControl.js`) | `onFrameChangedVideo2`, `onPreviewFrameChanged`, `onFrameChangedCache`, `onFrameChangedCachePreview` |
| `videoControl.currentMode` (`video`, `cache`, `cache-preview`, `preview` dead) | `VideoControl.js` | `OverlayControl.js` (redraw, optsClick), `ZoomView.js` | `VideoControl.seekFrame`; `OverlayControl.optsClick` |
| `videoControl.currentImage` / `cacheImage` / `cacheFrame` | `VideoControl.js` | `OverlayControl.js` redraw, `ZoomView.js` | `onFrameChangedCache*`, `seekFrame` |
| `videoControl.video`, `.video2`, `.previewVideo` | `VideoControl.js` | `OverlayControl.js` (draw), `ZoomView.js` (`video.src`), `OverlayControl.js` (`video.src` for cache keys) | `VideoControl.js` |
| `videoControl.playingState`, `.playbackRate` | `VideoControl.js` | itself | `playForwards/Backwards/pause`, `playRateInputChanged` |
| `videoControl.isValidVideo`, `.flagLoadingVideo`, `.delayedSeekFrame`, `.removeHashOnFrameChange(Frame)` | `VideoControl.js` | `VideoControl.js`, `labelBee.js` | `VideoControl.js`, `labelBee.js` (router) |
| `videoCache` / `videoControl.videoCache` (`VideoCache`) | `VideoControl.js` (assigned global in ctor) | `OverlayControl.js` (`getFrameImageAsync`, `getFrameState`, `getFrameImageSync`, `preloadFrames`, `getFrameCropDataURL`), `ZoomView.js`, page buttons | `VideoControl.js` |
| `getCurrentFrame` (global function) | `labelBee.js` `init` | `ChronoControl.js`, `ChronoControlInteraction.js`, `SelectionControl.js`, `labelBee.js` | `labelBee.js` |
| `logging` (debug flags) | `labelBee.js` | every JS file | nobody at runtime |
| `videoListTable`, `videoListCurrentID` | `VideoList.js` | `VideoList.js` | `VideoList.js` |
| `videojsoninfo` | `VideoControl.js` (implicit global) | `VideoControl.js` | `loadVideoInfo`, `loadPreviewVideoInfo` |
| `statusWidget`, `fromServerDialog`, `loginDialog`, `overlay`, `chrono` | `labelBee.js` / `AnnotationIO.js` (`fromServerDialog` is one modal shared by the video-list loader and the annotation loaders) | `VideoControl.js` (`statusWidget`, `fromServerDialog`, `overlay`), `VideoList.js` (`fromServerDialog`: `videoListFromDB`, `receiveVideoSelection`, `makeVideoListTable`, `videoSelected`) | `labelBee.js`; `fromServerDialog` content written by `VideoList.js`, `VideoControl.js` and `AnnotationIO.js` |
| `overlay.videoSize` ({w, h}) and `videoControl.videoSize()` | `OverlayControl.js` (`canvasSetVideoSize`); `VideoControl.js` (`videoSize`) | `OverlayControl.js` (`optsClick('fixedAspect')`, `updateROIFromVideo` which calls `videoControl.videoSize()` for the ROI "Reinit" button) | `VideoControl.onVideoSizeChanged` -> `overlay.canvasSetVideoSize` |
| `defaultSelectedBee`, `change_id_force` | `labelBee.js` | `ChronoControlInteraction.js`, `SelectionControl.js`, `onKeyDown_IDEdit` | `labelBee.js`, `ChronoControlInteraction.js`, `SelectionControl.js` |
| `http_script_name`, `url_for(path)` | `labelBee.js` / page template (`http_script_name_0`) | every module that issues ajax | `labelBee.js` |
| `lasthash`, `onhashchange` | `labelBee.js` | `VideoControl.js` `onFrameChanged` | `labelBee.js`, `VideoControl.js` |
| `labelButtonsArray` | `SelectionControl.js` | `labelBee.js` via `labelsProcessKey` | `SelectionControl.js` |
| `printMessage`, `htmlCheckmark`, `StatusWidget`, `FilePickerFromServerDialog`, `toggleFullScreen`, `pathJoin` | `labelBee.js` | most modules | none |
| `toggleHidden` | inline script of `labelbee_page.html` (not in `labelBee.js`) | `labelBee.js` `init`, `onchange` attributes of `#features` checkboxes | none |
| DOM ids written by VideoControl / VideoList | page | `#currentFrame`, `.currentFrameDiv`, `#vidTime`, `#realTime`, `#videoName`, `.video_id`, `.videoinfo_nframes`, `#videofps`, `#realfps`, `#startTime`, `#videoTagsFamily`, `#videoPlace`, `#videoComments`, `#cache-status`, `#previewVideoName`, `#previewVideoTimeScale`, `#previewVideoStatus`, `#play`, `#playbackward`, `#alerttext` | |

### (b) Proposed modules

| Module | Responsibility | Takes from today's code |
|---|---|---|
| `VideoSource` / `VideoCatalog` | choose a video (DB list, URI, /data, hash), turn a server record or `.stream.json` into a `VideoInfo` | `VideoList.js` (`VideoManager`, `setVideoInfo`, `loadVideoManual`, `videoSelected`, `receiveVideoSelection`), router part of `labelBee.js`, the video-loading link `clickLoadTracksTaggedCSVFromServer` of `AnnotationIO.js` (to remove or fold in, OQ-201) |
| `VideoInfo` (entity + calibration form) | the `videoinfo` object, derived values (`nframes`, `maxframe`, fps conversions, `frameToTime`), calibration inputs | `videoinfo`, `changeStartTime/FPS/VideoFPS/FrameOffset`, `onVideoInfoChanged`, `getCurrentRealDate`, `frameToTime` |
| `FrameBackend` (video element) | exact frame display and seek on the `<video>` tag via `VideoFrame`; frame-changed events | `VideoControl` mode `video`, `onFrameChangedVideo2`, `seekFrame` video branch |
| `FrameBackend` (image cache) | LRU of decoded frames, queue, preload, cancel; mode `cache` and `cache-preview` | `VideoCache`, `seekFrame` cache branches, `preloadCache`, cache buttons |
| `PlaybackController` | play/pause/direction/rate, tick loop for cache mode | `playPauseVideo*`, `playForwards/Backwards`, `pause`, `playStart/playTick`, `playRateInputChanged`, `updateNavigationView` |
| `FrameSync` (single authority) | `currentFrame`, seek requests with tokens, `frame:changed` / presentation event, hash cleanup | `VideoControl.currentFrame`, `seekFrame`, `onFrameChanged`, `hardRefresh`, `delayedSeek` |
| `KeyMap` (shortcut manager) | all key bindings in one table: frame stepping, play, delete, labels, ID field focus; per-scope enable | `onKeyDown` (`labelBee.js`), `ZoomOverlay.onKeyDown`, label `accesskey`, inline `onkeypress` handlers |
| `PageShell` | layout, accordions, sortable blocks, Features toggles, messages, I/O status, fullscreen, leave prompt | `init` (collapsible/sortable parts), `printMessage`, `StatusWidget`, `toggleFullScreen`, `toggleHidden`, template |

## Group 3: Temporal display and navigation

### (a) Global state table

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `chrono` (Chronogram, `.config`, `.perf`, `.tooltip`) | `ChronoControl.js` (`Chronogram` ctor, `chrono = this`), `labelBee.js` (`chrono: false` logging key is a different object) | `ChronoControl*.js`, `ChronoControlInteraction.js` (`idAxisMapMode`), page `onclick="chrono.setFrameFilter..."` | `ChronoControl.js` |
| `axes` (ChronoAxes instance) | `ChronoControl.js` `initChrono` (undeclared global) | `ChronoControl*.js`, `OverlayControl.js` (`focusTrackWindow`), `SelectionControl.js` (`axes.selectId`), `VideoControl` via `updateChronoXDomainFromVideo` | `initChrono`, `ChronoAxes` internals |
| `chronogramData` | `ChronoControl.js` `initChrono` | `validIdsDomain`, `restrictIDFromWindow`, stats | `updateChronoData`, `updateChronogramData` (CAP-802) |
| `allIntervals`, `crosses`, `rectIntervals`, `circlesIntervals`, `partsIntervals` | `ChronoControl.js` top / `createIntervalList` | `ChronoIntervals`, `renderChrono_danglingTracks`, legacy renderer | `createIntervalList` (CAP-802) |
| `flatTracks`, `flatTracksAll`, `flatTracksValid`, `flatTracksAllGroupById`, `flatTracksValidGroupById` | `ChronoControl.js` | `ChronoControlInteraction.js` (find*), `renderObsTable`, `OverlayControl.js` | `updateFlatTracks` (CAP-802); sorted in place by find* (BEH-348, DEBT-313) |
| `tagIntervals`, `allTagsID`, `flatTags`, `ttags` | `ChronoControl.js` | `ChronoControlInteraction.js`, `validTagIdsDomain`, `OverlayControl.js` | `updateTagIntervals` (also from `updateChrono`, DEBT-311), `updateTagsLabels`, `getTTags`, `interpolateTags`; `tagIntervals` sorted in place by `findNextTagEvent` in AutoSeek mode |
| `svgSpanRects`, `svgTag`, `svgInterval`, `svgTop`, `videoSpan`, `trackWindowSpan`, `tagSel` | `initChrono`, `initVideoSpan`, `initTrackWindowSpan`, legacy file | `ChronoControl.js`, legacy file | same |
| `chronoIntervals` (ChronoIntervals) | `ChronoControl.js` | `renderActivities` | itself |
| `restrictID`, `restrictIDArray`, `flag_restrictID`, `flag_excludeID`, `flag_hideInvalid`, `flag_hideFlowers` | `initChrono` (sets initial values) | `updateChronoYDomain`, `updateFlatTracks`, `updateChronogramData`, `getTTags`, `findNext*` | button handlers (CAP-801), `setRestrictID` |
| `excludeID`, `excludeIDArray` | not initialised by `initChrono`; first assigned by `onExcludeIDChanged` | `updateFlatTracks`, `getTTags` | `onExcludeIDChanged` (CAP-801) |
| `flag_autoEventMode`, `eventSeekMode` | `initChrono` | `ChronoControlInteraction.js` | `onAutoEventButtonClick`, `eventSeekModeClicked` |
| `flag_showPartsOnChrono`, `flag_showIndividualEvents` | `initChrono` | legacy renderer | toggle handlers (`onToggleButton_showPartsOnChrono`, `onToggleButton_showIndividualEvents`) |
| `showObsChrono`, `showTagsChrono` | `OverlayControl.js` (init) | `updateChronoData` | `onChronoParametersChanged` |
| `chronoItemHeight` | `initChrono` | `adjustChronogramHeight`, `chronoAdjust` | `adjustChronogramHeight` (also from `chronoAdjust`, `updateChronoYDomain`), resizable stop |
| `defaultSelectedBee`, `tagSelection` | `SelectionControl.js` / `OverlayControl.js` | chronogram (`gotoEvent`, `renderSelection`, `updateChronoSelection`, next/prev ID) | `gotoEvent`, `gotoFrameId`, `selectBeeByID` |
| `axes.selectedID` | `ChronoAxes.js` | `refreshIdSelection`, `onAxesClick` (ID for clicks above the plot) | `selectId` (from `updateChronoSelection`, `SelectionControl.js`) |
| `lockFocusTrackWindow` | `OverlayControl.js` | `onClickFocusTrackWindow` | `setFocusTrackWindow` |
| `overlay.trackWindow {backward, forward}` | `OverlayControl.js` | `updateTrackWindowSpan`, `getWindow`, `onAxesDblClick`, `focusTrackWindow` | `onTrackWindowChanged` |
| `Tracks`, `Tags` | `Model.js` | chronogram (`updateFlatTracks`, `getTTags`, `cleanObsoleteEvents`) | other modules; also `ChronoControl.js`: `augmentTrackWithTag` (sets `Tracks[F][id].tag`), `cleanObsoleteEvents` (deletes `Tracks[F][id]`), DEBT-316 |
| `videoinfo`, `ROI`, `flag_useROI`, `tagMode` | `VideoList.js`, `OverlayControl.js` | chronogram | other modules |
| `logging` flags (`axesEvents`, `chrono`, `frameEvents`, `mouseMoveEvents`...) | `labelBee.js` | all | dev console |
| jQuery events | `axes:clicked`, `axes:dblclick`, `axes:changed`, `previewframe:trackmove`, `previewframe:trackend` (axes; `previewframe:*` only from the dormant `injectTrackFrame`); `frame:changed`, `previewframe:changed` (videoControl); `trackWindow:change` (overlay); `tagselection:created/cleared` (selectionControl; the subscription in `initChrono` is commented out, where `updateChronoSelection` is bound was not seen) | | |

### (b) Proposed modules

| Module | Responsibility | Content |
|---|---|---|
| `ChronoAxesView` | Pure view: scales, axes, zoom/pan, time mark, row highlight, emits click/zoom events | `ChronoAxes.js` |
| `ChronoLayers` | Draws events (and later tags, parts, individual events) from provided interval lists; tooltip; dangling marks | `ChronoIntervals`, `renderActivities`, legacy renderers (to retire) |
| `ChronoWindowBars` | Video span and track-window span bars | `initVideoSpan`, `initTrackWindowSpan`... |
| `ChronoNavigation` | Event/ID seek logic over derived lists | `ChronoControlInteraction.js` |
| `ChronoPanel` | DOM controls: buttons, options, layout sizing | handlers in `ChronoControl.js`, DOM ids in `labelbee_page.html` |
| `ChronoData` (CAP-802, group 8) | Derived structures; today also hosts `augmentTrackWithTag` and `cleanObsoleteEvents`, which write annotations (DEBT-316) | `updateChronoData` and pipelines |

## Group 4: Overlay display and annotations

Source: `labelbee/static/labelbee/js/OverlayControl.js` (4564 lines, 5 widget/visit classes, ~130 free functions), read in full in the first pass; the critic pass re-checked the excerpts cited by the behaviors. Line numbers are approximate (`~`).

### (a) Global state table

Defined in `OverlayControl.js` unless stated. "R" = reads, "W" = writes.

| Name | Kind | Read by | Written by |
|---|---|---|---|
| `overlay` (instance of `OverlayControl`) | global var, created in `labelBee.js` `init` | `VideoControl.js` (`overlay.hardRefresh`, `canvasSetVideoSize`), `SelectionControl.js` (`overlay.getActiveObject`, `canvas1`, `setActiveObject`, `canvasToVideoRect`, `setInteractionMode`), `ZoomView.js` (`getActiveObject`, `canvasToVideoPoint`), `ChronoControl*.js` (`overlay.trackWindow`, `opts.clickModeAutoCentering`), `labelBee.js`; also all free functions of the file | `labelBee.js` `init` (assignment) |
| `overlay.canvas`, `ctx`, `canvas2`, `ctx2` | 2D canvas `#canvas`, scratch canvas | `OverlayControl.js` only | constructor |
| `overlay.canvas1` | Fabric canvas `#canvas1` | `SelectionControl.js` (`remove`, `deactivateAll*`, `getActiveGroup`), `OverlayControl.js` | constructor, box create/delete everywhere |
| `overlay.opts` | options object (BEH-409, BEH-411) | `OverlayControl.js` (draw, mouse), `ChronoControlInteraction.js` (`clickModeAutoCentering`) | `optsClick`, `onOverlayParamsChanged`, pick-frame timeline buttons (`timelineZoom`, `timelineDisplaySize`, `timelineMaxDelta`, BEH-451) |
| `overlay.interaction` `{mode, opts}` (`opts`: `obs`, `id`, `frame`, `showTimeline`, `showPickFlower`, `pickMode`, `type`) | interaction state (BEH-440, BEH-450) | `OverlayControl.js` (`onMouseDown`, `hardRefresh`), `VisitWidget` | `setInteractionMode`, pick-frame button callbacks (`showTimeline`, `showPickFlower`); `VisitWidget` writes `opts.pickMode` |
| `overlay.trackWindow` `{range, direction, forward, backward}` | window state (BEH-443) | `ChronoControl.js` (`getWindow`, `updateTrackWindowSpan`), `ChronoControlInteraction.js`, `plotTracks`, prediction | `onTrackWindowChanged` (also called by `labelBee.js` `init`) |
| `overlay.guiAngle.angleEnabled` | flag | `refreshRectStyle`, `newRectForTag` | `onClickDisableAngle` |
| `overlay.videoSize` `{w,h}` | video pixel size | transform and sizing code | `canvasSetVideoSize` (event `videosize:changed`) |
| `overlay.tagMarker`, `tagMarkerOptions` | tag marker style | `plotTag` | `selectboxTagMarkerUpdate/Changed` |
| `overlay.lastSelected`, `previouslySelected` | last Fabric boxes | `onObjectDeselected`, `onObjectSelected` | `onObjectSelected`, `onObjectDeselected` |
| `overlay.timeline`, `overlay.visitWidget` | widgets (group 6) | `onObjectSelected`, `onMouseDown`, `OverlayControl.js` | constructor |
| `canvasTransform` `[sx,0,0,sy,tx,ty]`, `transformFactor`, `canvasTransformReference` | implicit globals (view transform) | all `*To*` conversions, `redrawVideoFrame*`, `plotTag*`, `SelectionControl.js` indirectly via `overlay.canvasToVideoRect` | `canvasTransform*` methods, `onMouseDown_panning` |
| `extraScale` | implicit global, used only in the non-copy video painting | `redrawVideoFrame` | not found assigned outside its definition (not re-verified) |
| `default_width`, `default_height` | globals (video px, 100) | `getDefaultRectSizeCanvas` | `updateDefaultSizeFromRect` (via `fixRectSizeAfterScaling`) |
| `tagMode` | global `'Tracks'` | `getTag`, `ChronoControl.js` | nothing |
| `showObs`, `showObsTracks`, `showObsChrono`, `showTags`, `showTagsTracks`, `showSelectedTagsTracks`, `showTagsOrientation`, `showTagsChrono` | implicit globals | `refreshOverlay`, `plotTag*`, `onMouseDown_selectMultiframe`, `ChronoControl.js` (the two `*Chrono` flags) | constructor, `onShowObsChanged`, `onShowTagsChanged`, `onShowTagsTracksChanged`, `onChronoParametersChanged` |
| `flag_useROI`, `ROI` | implicit globals | `plotROI`, `ChronoControl.js`, `ChronoControlActivitiesLegacy.js` | constructor, `onClickROI`, `onROITextChanged`, `updateROIFromVideo` |
| `flag_useExcludeRects`, `excludeRects`, `excludeRectSelection` | implicit globals | `plotExcludeRects`, filter | constructor, exclude-rect handlers and dialog |
| `tagsSampleFilter`, `tagsHammingSampleFilter`, `tagsDMSampleFilter`, `tagsRGBSampleFilter`, `tagsSampleFilterROI`, `tagsSampleFilterExcludeRects`, `tagsSampleFilterCustom`, `tagsIntervalFilter`, `tagsIDFilter` | implicit global functions | `plotTag`, `plotTagsTracks`, `ChronoControl.js` (filter calls) | `refreshTagsParameters`, `chronoFilter`, `ROIChanged`, `excludeRectsChanged` |
| `lockFocusTrackWindow` | implicit global | `focusTrackWindow` UI | `setFocusTrackWindow` |
| `Tracks`, `Tags` | data (Model.js) | `createRectsFromTracks`, `plot*`, prediction | `submit_bee`/`storeObs` (also `onKeyDown_NewIDEdit`), `deleteEvent`, `hardRefresh` (writes `obs.span` in pick-frame), pick-frame Set Start/End (`span.f1/f2`), `modifyCurrentObsSpan` |
| `ttags` | global (ChronoControl.js) | `plotTagsTracks` | chronogram refresh |
| `defaultSelectedBee`, `tagSelection` | globals (SelectionControl.js) | `hardRefresh`, `plotTag`, `plotTagsTracks`, `isCurrentSelection`, `getCurrentTag` | `selectBee`, `deselectBee`, `selectBeeByID`, `selectBeeByIDandFrame`, `onKeyDown_IDEdit` (`labelBee.js`), `gotoEvent` (`ChronoControlInteraction.js`) |
| `change_id_force` | global, `'swap'` | `onKeyDown_IDEdit` (`labelBee.js`) | `labelBee.js` `init` |
| `flatTracksAll` | global (ChronoControl.js) | `modifyCurrentObsSpan` (`SelectionControl.js`, to enter pick-frame) | chronogram refresh |
| `videoControl` (consumed) | `currentMode`, `currentImage`, `currentFrame`, `video`, `previewVideo`, `flagCopyVideoToCanvas`, `isValidVideo`, `videoCache`, `refresh`, `seekFrame`, `pause` | `OverlayControl.js` | `optsClick` writes `videoControl.currentMode` |
| `zoomOverlay` (consumed) | `flagShowParts`, `labelList` | `fabric.BeeRect` | zoom view |
| `logging` (consumed) | debug flags | everywhere | `labelBee.js` |

Functions of the file called from other modules: `getTag`, `tagAngle`, `findRect`, `addRectFromObs`, `updateRectObsGeometry`, `setLabels`, `updateRectObsActivity`, `autoCentering`, `onTrackWindowChanged` (from `labelBee.js`), `shiftTrackWindow`/`scaleTrackWindow`/`setTrackWindow`/`onClickFocusVideo` (HTML), `refreshTagsParameters` and the `tags*Filter` functions (HTML and `ChronoControl.js`), `newRectForCurrentTag` (HTML).

### (b) Proposed modules

The file mixes ~10 responsibilities. Proposed split (names by responsibility, approximate current lines):

| Module | Content | ~Lines now |
|---|---|---|
| `ViewTransform` | `canvasTransform*`, `*To*Point/Rect`, clamping (pure math + one state object), wheel/drag gesture decoding | 1010-1182, 4248-4287, 4379-4423 |
| `CanvasLayout` | `canvasSetVideoSize`, `refreshCanvasSize`, resizable, `#videoSize/#canvasSize` | 897-1009 |
| `FrameRenderer` | `redrawVideoFrame` for each mode, image diff, no-video / not-in-cache messages, `exportFrame` | 1670-1901, 1655-1669 |
| `OverlayOptions` | `overlay.opts`, display flags, `optsClick`, `updateOptsButtons`, ID appearance inputs, tag marker selector | 80-108, 731-832, 2677-2685, 3116-3127 |
| `BoxLayer` | `BeeRect`, `createRectsFromTracks`, `addRectFromObs`, rect/obs geometry sync, `identifyBeeRect`, `wrapText`, skeleton drawing (consumes `parts`) | 1926-2326, 2330-2560 |
| `BoxEditing` (mouse) | `onMouseDown*` (dispatch order BEH-457), Fabric event handlers, default size, `newRectForTag`, angle buttons, `fixRectSizeAfterScaling`, ID-edit key handlers of `labelBee.js` (BEH-434, BEH-453, BEH-454) | 3843-4564, 842-895 |
| `IdPrediction` | `predictIdFromObsMultiframe`, `predictIdFromTags*`, `defaultIfIDExists`, `computeDefaultNewID` (pure functions of `Tracks`, `Tags`, window) | 3625-3841 |
| `TagLayer` | tag geometry (`tagCorners`, `tagUp`, `tagAngle`, `tagSize`), `plotTag`, `plotTagOrientation`, `plotTags`, `plotTagsTracks`, `getTag` | 2686-3112 |
| `TrackLayer` + `TrackWindow` | `plotTracks`, window state and its UI (`onTrackWindowChanged`, scale/shift, Follow) | 2562-2675, 3129-3230 |
| `TagFilter` (belongs to group 8, CAP-801) | ROI, exclusion rectangles, `refreshTagsParameters`, `chronoFilter`, composition of the sample filter | 3232-3623 |
| `InteractionModes` (group 6, CAP-602) | `setInteractionMode`, `TimelineWidget`, `VisitWidget`, pick-frame panel and its timeline/Pick Flower buttons, `drawTimeline*`, `drawImagePickFlowerMode`, `pickFlowerButtonCallback` | 173-730, 1185-1505, 1527-1625, 1643-1652 |

## Group 5: Zoom view and details editing

### (a) Global state table

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `zoomOverlay` (ZoomOverlay instance) | `ZoomView.js` `initZoomView` | `labelBee.js` (event binding), `OverlayControl.js` (`flagShowParts`, `labelList`), inline `onclick` of `labelbee_page.html` panels | `initZoomView` |
| `zoomOverlay.labelList` (Map label -> colour, `__default`) | `ZoomView.js` constructor | `OverlayControl.js` `BeeRect._colormapping`, `FabricPartRect._colormapping`, `refreshButtonListParts` | label +/-, Edit dialog, preset loader |
| `zoomOverlay.flagShowParts` | `ZoomView.js` | `OverlayControl.js` `BeeRect._render` | `onToggleButtonShowOnVideo` |
| `zoomOverlay.scale, angle, centerFrame, centerCanvas, width, height` | `ZoomView.js` | `ZoomView.js` only | `refreshZoom`, `setGeometry`, `zoomApplyScale`, `setCanvasSize` |
| `zoomOverlay.flagShow*` (Zoom, Overlay, Grid, BB, TagView, Distractors, AlternateHamming/2/Focus) | `ZoomView.js` | `ZoomView.js` | checkbox/button/accordion handlers |
| `zoomOverlay.showTagView` (gate of `updateTagView`, distinct from `flagShowTagView`; always true) | `ZoomView.js` constructor | `ZoomView.js` `updateTagView` | none |
| `zoomOverlay.canvas1` (fabric canvas of part markers) | `ZoomView.js` `attachFabric` | `ZoomView.js` | `syncFromTracks`, `syncToTracks`, mouse handlers |
| `zoomOverlay.selected, insertMode, autoLabel, autoLabelDone, lastRect, id` | `ZoomView.js` | `ZoomView.js` | handlers |
| `zoomOverlay.tagbin` (tag25h5 code table), `hammingMatrix`, `currentTagBin` | `ZoomView.js` | `updateDistractors` | `loadTagCodesFromServer`, `loadTagHammingMatrix`, `updateTagView` |
| `obs.parts`, `obs.fix`, `obs.newid`, `obs.span`, `obs.labels` (wrongid) | `Model.js` / `SelectionControl.js` | `OverlayControl.js` (parts), `ChronoControl.js` (newid, wrongid), `AnnotationIO.js` | `ZoomView.js` `syncToTracks`, `onClickAlternateTag`, `rotateTag`, `getCoveredTags` (span) |
| `Tags[F].tags[i].fix / .p / .id` | `AnnotationIO.js`, `Model.js` | `OverlayControl.js` (tag draw), `ChronoControl.js`, `getTag`, `refreshInfo` | `ZoomView.js` `spreadTagFix`, `bakeTagFix`, `undoTagFix` |
| `Tags[F]` entries and container type (array -> object) | `AnnotationIO.js`, `Model.js` | `ChronoControl.js` `augmentTrackWithTag` (uses `.length`) | `ZoomView.js` `deleteFalsealarmTags` (removes entries, rebuilds `tags` as an object, deletes empty frames) |
| `Tracks[F][id].tag` (alias of the `Tags[F].tags[i]` object) | `ChronoControl.js` `augmentTrackWithTag` (from `updateChronoData`) | `OverlayControl.js` `getTag` (mode `Tracks`), `ChronoControl.js` `getFlatTags` | `augmentTrackWithTag` |
| `tagMode` (`'Tracks'`, never reassigned) | `OverlayControl.js:5` | `OverlayControl.js` `getTag`, `ChronoControl.js` | none |
| `Tracks` | `Model.js` | everything | `ZoomView.js` `deleteFalsealarmEvents`, `deleteWrongIdEvents` |
| `rotatep`, `k` (implicit globals), `angle` (implicit, `refreshZoom`), `src_pts`, `idata` | `ZoomView.js` | `ZoomView.js` | `ZoomView.js` |
| `zoom` (read by `drawPixelated`, `drawTagBin`; not declared in the served blocks, probably resolves to the `#zoom` canvas by named window access [inferred]) | none | `ZoomView.js` | none |
| global functions `hamming`, `findAllHamming`, `findBestHamming`, `rotateTagBin`, `extractTagBin`, `drawTagBin`, `drawPixelated`, `getCoveredTags` | `ZoomView.js` | `ZoomView.js` | n/a |
| externals read: `overlay`, `videoControl`, `selectionControl`, `Tags`, `Tracks`, `flatTracksAll`, `logging`, `url_for`, `PerspT`, `deepcopy`, `getCurrentTag`, `getCurrentID`, `getSelectedRect`, `getIdsInFocus`, `getWindow`, `tagAngle`, `rotatedRectGeometry`, `automatic_sub`, `updateObsLabel`, `hasLabel`, `updateForm`, `updateRectObsActivity`, `refreshChronogram`, `newRectForCurrentTag`, `showAjaxError`, `typesetAjaxError` | various | `ZoomView.js` | n/a |
| DOM ids owned: `#videozoom`, `#zoom`, `#zoomOverlay`, `#zoomresize`, `#zoomInfo`, `#zoomTagView`, `#zoomTagCanvas`, `#zoomExtractedTagCanvas`, `#zoomExtractedTagCanvas2`, `#tagImage`, `#zoomDistractors`, `#videozoom_distractors`, `#videozoom_parts`, `#partLabel`, `#buttonShowParts`, `#dialog-form-labelList`, `#labellist-json`, `#dialog-keypointLabelsFromServer` | `labelbee_page.html` | `ZoomView.js` | `ZoomView.js` |

### (b) Proposed modules

| Module | Responsibility | Takes from ZoomView.js |
|---|---|---|
| `zoom-view` | zoom canvas, geometry (centre, angle, scale), coordinate transforms, overlays (tag outline, box), info line, export | `ZoomOverlay` geometry/refresh/export, `canvas2frame`, `frame2canvas`, `refreshZoomSize` |
| `keypoints` | part markers editing (fabric canvas), label list/templates, auto-label, preset loading, sync to `obs.parts` | `FabricPartRect`, `syncTo/FromTracks`, label list functions, `KeypointLabelsFromServerDialog` |
| `tag-image` | pure functions on tag pixels: warp, bit extraction, Hamming search, tag reference URL | `updateTagView` pixel part, `extractTagBin`, `hamming`, `findAllHamming`, `tagImgURL`, `loadTagCodesFromServer` |
| `tag-fix` | tag correction model: covered tags, spread, bake, undo, clean-up deletions (shared with CAP-803) | `getCoveredTags`, `spreadTagFix`, `bakeTagFix`, `undoTagFix`, `rotateTag` logic, `onClickAlternateTag` logic, `delete*` |
| `alternate-tags-panel` | UI list of candidates (image/focus) calling `tag-fix` | `updateDistractors`, `onToggleButtonShowAlternate` |

## Group 6: Labels, dashboards and specialized annotations

### (a) Global state table

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `defaultSelectedBee` (current ID) | `SelectionControl.js` (declared), `labelBee.js` init sets undefined | `SelectionControl.js` (`getCurrentID`, `getCurrentTag`, `updateSelectID`), `ChronoControl.js` (`updateChronoSelection`, `setRestrictID`, d3 `selected` class, line ~738), `ChronoControlInteraction.js` (next/prev event, first/last), `OverlayControl.js` (`hardRefresh`, `isCurrentSelection`, tag drawing) | `SelectionControl.js` (`selectBee`, `deselectBee`, `selectBeeByID`, `selectBeeByIDandFrame`), `ChronoControlInteraction.js` (`gotoEvent`, `gotoFrameId`), `labelBee.js` (`onKeyDown_IDEdit`) |
| `tagSelection` | `SelectionControl.js` | nobody | `selectBeeByID` |
| `selectionControl` (event bus: `tagselection:*`, `selection:*`, `before:selection:cleared`) | `initSelectionControl` | listeners registered in `initSelectionControl` | `selectBee`, `deselectBee`, `selectBeeByID` |
| `undo` (`new Observation(0)`) | `SelectionControl.js` | nobody | nobody |
| `undoStack` | `SelectionControl.js` | `updateUndoButton`, `undoPop` | `undoPush` (only from `deleteEvent`) |
| `labelButtonsArray` | `SelectionControl.js` (`initSelectionControl`) | `hardRefreshLabelTogglePanel`, `updateForm`, `labelsProcessKey`, `LabelListDialog` | `LabelListDialog` Ok (from key `labelListArray` of its grid), `AnnotationIO.js` (`LabelListFromServerDialog`, from key `labelButtonsArray`) |
| `labelListDialog` | `SelectionControl.js` | page `onclick` | `initSelectionControl` |
| `labelMap` | `SelectionControl.js` | `normalizeLabel` | nobody |
| `Tracks`, `Tags` | `Model.js` | all | `storeObs` (via `submit_bee`, `undoAction`, `VisitWidget.newVisit`, `onKeyDown_NewIDEdit`), `deleteEvent`, `obs_swapID` / `changeObservationID` (SwapID), `modifyCurrentObsSpan` (`obs.span`), `VisitWidget.setSpanFrame`, `hardRefresh` pick-frame branch (`obs.span`, Set Start/End), `drawImagePickFlowerMode` (`obs.visit`, `visit.flowerid`) |
| `flatTracks`, `flatTracksAll`, `flatTracksValid` | `ChronoControl.js` (`updateFlatTracks`) | `renderObsTable`, `modifyCurrentObsSpan` | `updateFlatTracks` |
| `overlay.interaction` (`mode`, `opts`) | `OverlayControl.js` | `VisitWidget.update`, `onMouseDown`, `hardRefresh` | `setInteractionMode` |
| `overlay.interaction.opts.showTimeline`, `.showPickFlower` (mode-scoped, lost when the mode changes) | `setInteractionMode` (`showTimeline` false at entry) | `hardRefresh` pick-frame panel, `pickFlowerButtonCallback` | pick-frame panel callbacks (Show Timeline, Pick Flower) |
| `overlay.opts.timelineZoom`, `.timelineDisplaySize`, `.timelineMaxDelta` | `OverlayControl.js` (overlay options) | `drawTimelinePickFrameMode`, `drawImagePickFlowerMode` | `timelineButtonCallback` in the pick-frame panel (Zoom, Size, Frames buttons) |
| `overlay.visitWidget`, `overlay.timeline` | `OverlayControl.js` | `onMouseDown`, `onObjectSelected` | constructors |
| `default_width`, `default_height` | `OverlayControl.js` | `VisitWidget.newVisit`, rectangle creation | `updateDefaultSizeFromRect` |
| `default_id` (implicit global from `VisitWidget`) | none (leak) | nobody | `selectVisit`, `newVisit` |
| other implicit globals (leaks) | none | nobody | `obs` (`deleteEvent`, `updateFlatTracks`), `rect` (`undoAction`), `i` (`hardRefreshLabelTogglePanel`, `drawTimelineCurrentObject`), `delta` (`TimelineWidget.update`), `ids` (`getIdsInFocus`), `radius` (assignment in OverlayControl.js, possibly creating the global read by `drawFlowersMainCanvas`), `json`, `obj` (`LabelListDialog.updateFromJSON`) |
| `logging` flags (`selectionEvents`, `guiEvents`, `form`) | `labelBee.js` | `SelectionControl.js` | config |
| functions called as globals from page HTML | `SelectionControl.js` / `OverlayControl.js` / `AnnotationIO.js` | `labelbee_page.html` (`onSelectIDChanged`, `modifyCurrentObsSpan`, `deleteSelected`, `undoAction`, `swapID_callback`, `onLabelToggled`, `newRectForCurrentTag`, `updateAnnotationStatistics`, `labelListDialog.openDialog`, `labelListFromServerDialog.openDialog`) | n/a |

### (b) Proposed modules

| Module | Responsibility | Takes from current code |
|---|---|---|
| SelectionModel | Current ID, active observation, events `selection:created/cleared`, `selectByID`, `selectByIDAndFrame`, `getCurrentID/Tag` | `SelectionControl.js` selection part, `defaultSelectedBee` |
| UndoStack | Command stack with `push(command)`, `undo()`, `canUndo`, caption | `undoStack`, `undoPush/Pop`, `undoAction`, `updateUndoButton` |
| LabelModel | Label vocabulary (list, aliases), string/array conversion, has/toggle on an observation, one JSON format for the list | `labelButtonsArray`, `labelMap`, `toLabelArray`, `updateObsLabel`, `hasLabel` (and the `bool_acts` shim) |
| LabelPanel (view) | Button panel, `#labels`, `#notes`, label list dialogs (Edit, Preset), accesskeys | `hardRefreshLabelTogglePanel`, `labelToggle`, `LabelListDialog`, `LabelListFromServerDialog`, `labelsProcessKey` |
| ObservationForm (view) | `#I`, bbox info, newID, delete/annotate/undo button states | `updateForm`, `updateFormButtons`, `updateDeleteButton` |
| VisitEditor | Visit data (create/delete/span) and its panel and picking mode | `VisitWidget`, `onMouseDown` edit-visit branch |
| SpanEditor | Span edits and pick-frame mode with its panel and timeline (and the legacy Pick Flower, until dropped) | `modifyCurrentObsSpan`, pick-frame code of `hardRefresh`, `drawTimelinePickFrameMode`, `timelineButtonCallback` |
| AnnotationStats / ObsTable (views) | Statistics text and observation table | `updateAnnotationStatistics`, `renderObsTable` |

## Group 7: Annotation model and IO

### (a) Global state table

Defined/written/read, [read] from `labelbee/static/labelbee/js/` (read-by lists are the ones seen in the code excerpts, not exhaustive for DOM handlers; rows marked [inferred] come from an earlier read that was not repeated).

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `Tracks` | `Model.js` | everywhere (Overlay, Chrono, Zoom, Selection, labelBee, IO) | `setTracks` (replace), `storeObs`, `getObsHandle(create)`, `changeObservationID`, `deleteEvent` (`SelectionControl.js:663`), `ChronoControl.js` clean-up (`delete Tracks[F][id]`) [inferred], `ZoomView.js` clean-up [inferred], `augmentTrackWithTag` (adds `obs.tag`; called only from `updateChronoData`), `modifyCurrentObsSpan` in `SelectionControl.js` (adds `obs.span` on the stored observation), `convertTracksToV1` (C1) |
| `Tags` | `Model.js` | `ChronoControl.js` (`getTTags` legacy mode, `getFlatTags`, `augmentTrackWithTag`), `OverlayControl.js` [inferred], `saveTagsToFile` | `setTags` only (+ `tagsAddFrames` adds `tag.frame`) |
| `TracksInfo` | implicit global, first created by `setTracks` (`AnnotationIO.js`) | `convertTracksToV2`, `onChanged_events_notes`, `updateEventsNotes` | `setTracks`, `setEventsProp`, `convertTracksToV2` (mutates), notes textarea |
| `TagsInfo` | implicit global (`setTags`) | none found | `setTags` |
| `tagCache` | implicit global, `Model.js` `cacheTags` | `getTags` (called from `ChronoControl.js` `computeMotionDirection`) [inferred] | `cacheTags` |
| `ttags` | `ChronoControl.js` (`var ttags = {}`) [inferred], also reset in `initAnnotationIO` | `OverlayControl.js` (draw tag lines) [inferred], `Model.js` `cacheTags` (bug, reads `ttags[key]`) | `setTags`, `updateChronoData` in `ChronoControl.js:984`, `initAnnotationIO` |
| `flatTags`, `allTagsID` | `ChronoControl.js` | `getTTags` (tagMode `Tracks` reads `flatTags`; resets `allTagsID`) | `updateChronoData` (`flatTags` at `:982`; `allTagsID` converted to an array at `:986`), `getTTags` (`allTagsID`) |
| `tagsHaveDM` | implicit global (`setTags`) | UI classes `.requireDM` (set in `setTags`) | `setTags` |
| `videoinfo` | `VideoList.js` [inferred] | `convertTracksToV2` (embedded in info by reference), `getTimestampedVideoname`, dialogs (`videoinfo.videoPath`), `getFramesWithID` (`nframes`) | `VideoList.js`, `VideoControl.js` [inferred] |
| `user_id` | `labelBee.js` | `eventsToServer` | `whoami` (authenticated branch only) |
| `user_data` | implicit global, assigned in `whoami` (`AnnotationIO.js`) | `VideoList.js:531` and `:634` (`user_data.is_authenticated`) | `whoami` |
| `loginDialog` | implicit, created in `labelBee.js` init | `ajaxlogin`, `ajaxlogout`/`try_login` [inferred] | init |
| `fromServerDialog` (`.basedOn`, `.json`, `.data_type`) | `AnnotationIO.js` (`initAnnotationIO`) | `eventsToServer`, page buttons, `VideoControl.js` (`closeDialog`) [inferred], `tagsFromServer` (`setMessage`), `VideoList.js` (`setBody`, `setMessage`) | `FromServerDialog` methods |
| `labelListFromServerDialog`, `pickEventsCSVDialog` | `AnnotationIO.js` | page buttons | `initAnnotationIO` |
| `labelButtonsArray` | label panel code (`SelectionControl.js` / `labelBee.js`) [inferred] | label panel code | `labelListFromServer` |
| `videoManager.currentVideoID` | `VideoList.js` [inferred] | `FromServerDialog`, `eventsToServer` | `VideoList.js` |
| `db` / `window.db` / `window.duck` | `SQLiteDB.js` / `DuckDB.js` (disabled, `DuckDB.js` sets `window.duck`) | `loadTracksCSVFromDB`, `db_to_json` | module code (`loadDatabaseFromUrl` sets `db` and `window.db`) |
| `undo` | `SelectionControl.js:6` (`new Observation(0)`) | undo code (group 6) [inferred] | `SelectionControl.js` |
| `undoStack` | `SelectionControl.js` (group 6) [inferred] | `deleteEvent` pushes (`undoPush`) | `SelectionControl.js`; `setTracks` does NOT clear it |
| `statusWidget` | `labelBee.js` [inferred] | `tagsFromServer` | `tagsFromServer` |
| `logging.io`, `logging.submitEvents` | `labelBee.js` [inferred] | `Model.js`, `AnnotationIO.js` | dev console |
| `url_for`, `http_script_name` | `labelBee.js` [inferred] | all server calls | page init |
| Implicit globals of the IO code | `AnnotationIO.js` | same function only | `data0`, `hasDuplicateEntries`, `evts`, `src`, `dataToSend`, `alertMSG`, `fileData`, `html`, `idx`, `buttonHTML`, `success`, `tags`, `obj` (DEBT-712) |

Functions of `AnnotationIO.js` called from other modules: `setTracks` (labelBee init), `loadEventsFromServerByID` (`onhashchange` in `labelBee.js`) [inferred], `tagsFromServer` (`VideoControl.js` obsolete `onVideoLoaded`) [inferred], `showAjaxError`/`mainAlert`/`typesetAjaxError` (general helpers used by `VideoList.js` and `labelBee.js`) [inferred], `whoami` (labelBee init `labelBee.js:216`, page buttons). `Model.js` functions used elsewhere: `getObsHandle`, `storeObs`, `obsDoesExist`, `getValidIDsForFrame(s)`, `changeObservationID`, `cloneObs` (`SelectionControl.js` `deleteEvent`, `OverlayControl.js` `addRect` / `addRectFromObs`), `copyObs`, `obs_swapID`, `getFramesWithID`. `Observation` constructor callers: `getObsHandle`, `OverlayControl.js` `addRect`, `SelectionControl.js:6`.

### (b) Proposed modules

| Module | Responsibility | Contents today |
|---|---|---|
| `AnnotationStore` | owns `Tracks`, `Tags`, infos; read/write API by (frame,id); change notification | `Model.js` + `setTracks`/`setTags` data part, `setEventsProp`, `printTracks` (debug, to delete) |
| `ObservationSchema` | field list, defaults, copy/clone, runtime-field policy | `Observation`, `copyObs`, `cloneObs`, whitelist for save |
| `AnnotationCodec` | pure format conversion: events v1/v2 <-> store, tags v1/v2, sanitizing, CSV/`tracks_tagged`/DB converters, CSV/BBox export text; receives the label normaliser (owned by the group-6 labels module, `SelectionControl.js` `hasLabel`/`normalizeLabel`) as a dependency | `convertTracksTo*`, `sanitizeEvents`, `*_csv_to_json`, `tracksTo*`, `db_to_json` |
| `LocalFileIO` | file picker/reader and Blob download for events and tags | `loadEventsFromFile`, `loadTagsFromFile`, `saveEventsToFile`, `saveTagsToFile`, `saveBlobToFile`, `getTimestampedVideoname`, CSV/BBox download |
| `ServerAnnotationClient` | requests only: `api/v1/annotations` list and POST, `annotation/<id>`, `rawdata`, `rest/config/labellist`, tag fetch (`tagsFromServer`), the three CSV fetchers (`loadTracksCSVFromServer`, `loadTagsCSVFromServer`, `loadTrackTaggedCSVFromServer`, with `d3.csv`), `labelListFromServer`; owns the lineage id (`basedOn`) | `eventsToServer`, request parts of `FromServerDialog`, `loadEventsFromServerByID`, `tagsFromServer`, `labelListFromServer`, CSV fetchers |
| `LoadSaveDialogs` | UI for the I/O panel and the server dialogs: rendering, messages, buttons, confirms | rendering parts of `FromServerDialog` and `LabelListFromServerDialog`, panel buttons, `eraseEvents` / `eraseTags` confirms, the generic `FilePickerFromServerDialog` (`labelBee.js`) with `EventsCSVManualFilePicker` |
| `AjaxErrorReporting` | shared error display for all callers (IO, `VideoList.js`, `labelBee.js`) | `showAjaxError`, `typesetAjaxError`, `mainAlert` |
| `SessionAuth` | login state and `user_id` / authenticated flag, read by IO and `VideoList.js` | `ajaxlogin`, `whoami`, `LoginDialog`, `user_data` |
| `DevDbSources` | experimental SQL sources | `SQLiteDB.js`, `DuckDB.js`, `loadTracksCSVFromDB` |

## Group 8: Data filtering and processing

### (a) Global state table

Files: CC = `ChronoControl.js`, CCI = `ChronoControlInteraction.js`, CCL = `ChronoControlActivitiesLegacy.js`, OC = `OverlayControl.js`, AIO = `AnnotationIO.js`, SC = `SelectionControl.js`, M = `Model.js`, ZV = `ZoomView.js`.

| Name | Defined in | Read by | Written by |
|---|---|---|---|
| `Tracks` (array of `{id: obs}`) | M | CC (all stages), CCI, SC, ZV, OC, AIO | AIO (load), OC/ZV/SC (edits), CC `augmentTrackWithTag` (`obs.tag`), `updateChronogramData` (`obs.cx/cy`), `cleanObsoleteEvents` (delete), `hasLabel` (`obs.labels=""`) |
| `Tags` (array of `{tags: []}`) | M | CC `augmentTrackWithTag`, `interpolateTags`, M `cacheTags`, OC `getTag` (unreachable mode) | AIO `setTags`, CC `interpolateTags` |
| `tagCache` | M (`cacheTags`, implicit) | M `getTags`, CC `computeMotionDirection` | M `cacheTags` |
| `chronogramData` | CC `initChrono` (implicit) | CC (`createIntervalList`, `restrictIDFromWindow`, domain fns, `drawChrono` status), CCL | CC `updateChronogramData` (in place), CCL |
| `allIntervals`, `crosses`, `rectIntervals`, `circlesIntervals`, `partsIntervals` | CC top of file (`var`) for `allIntervals`, `crosses`, `partsIntervals`; `rectIntervals` and `circlesIntervals` are not declared there and are created by assignment in `createIntervalList` | CC `ChronoIntervals`, `renderChrono_danglingTracks`; CCL (`crosses`, `partsIntervals`) | CC `createIntervalList` (CCL has `createIntervalList_legacy` writing the same names) |
| `flatTracksAll`, `flatTracksValid`, `flatTracksAllGroupById`, `flatTracksValidGroupById` | CC `updateFlatTracks` (implicit assignment) | CCI (event navigation, sorts in place), SC (line ~987), ZV (line ~1840), CC `getFlatTags`, `updateTagsLabels` | CC `updateFlatTracks`; CCI `.sort` in place |
| `flatTracks` | CC top of file (`var`) | CC `renderObsTable`; CCL | CC `updateFlatTracks` |
| `flatTags`, `ttags`, `allTagsID` | CC (`ttags` also AIO init) | CC; OC (`ttags` tag tracks); M `cacheTags` (wrong use of `ttags`) | CC `updateChronoData`, AIO `setTags` (`ttags = getTTags()`) |
| `tagIntervals` | CC top of file (`var`) | CCI (tag event navigation; sorts the global in place in auto event mode), CCL (`renderTagIntervals`), CC domain fns | CC `updateTagIntervals`, `updateTagsLabels`, `updateChronoData`, `interpolateTags`, `computeMotionDirection`; CCL `initTagIntervals`; CCI `.sort` in place |
| `flag_restrictID`, `restrictID`, `restrictIDArray` | CC `initChrono` | CC; CCI (via `setRestrictID`) | CC; CCI (`setRestrictID`) |
| `flag_excludeID`, `excludeID`, `excludeIDArray` | CC `initChrono` (array not initialised) | CC | CC |
| `flag_hideInvalid` | CC `initChrono` | CC; CCI (event navigation) | CC `click_hideInvalid` |
| `flag_hideFlowers` | CC `initChrono` | CC | CC `click_hideFlowers` |
| `chrono.config.frameFilter`, `idAxisMap`, `idAxisMapMode` | CC `Chronogram` | CC; CCI (`onAxesClick`) | CC `setFrameFilter`, `click_setIdAxisMap` |
| `showObsChrono`, `showTagsChrono` | OC init | CC `updateChronoData` | OC `onChronoParametersChanged` |
| `tagMode` | OC (constant) | CC, OC `getTag` | nobody |
| `ROI`, `flag_useROI` | OC (constructor: ROI `{175,250,2305,1240}`, flag false) | CC `updateChronogramData`, `createIntervalList`; OC `plotROI` | OC `onROITextChanged` (ROI), `onClickROI` (flag); `updateROIFromVideo` writes only the `#ROI` text |
| `excludeRects`, `flag_useExcludeRects` | OC | OC filters; CC via `tagsSampleFilterExcludeRects` | OC dialog, `onClickExcludeRectAdd`, `onClickExcludeRectDelete`, `onClickExcludeRects` |
| `tagsHammingSampleFilter`, `tagsDMSampleFilter`, `tagsRGBSampleFilter`, `tagsSampleFilterROI`, `tagsSampleFilterExcludeRects`, `tagsSampleFilterCustom`, `tagsSampleFilter`, `tagsIntervalFilter`, `tagsIDFilter` | OC (end of file) | CC (`updateTagIntervals`, `interpolateTags`, `cleanObsoleteEvents`), OC (tag tracks drawing) | OC `refreshTagsParameters`, `chronoFilter`, `ROIChanged`, `excludeRectsChanged` |
| `tagsHaveDM` | AIO `setTags` (implicit) | OC `refreshTagsParameters` | AIO |
| `defaultSelectedBee` | CCI (definition site not verified) | CC `restrictIDFromSelection`, `renderSelection` | CCI, SC, `labelBee.js` (init to `undefined`; set after an ID edit in `onKeyDown_IDEdit`) |
| `flag_autoEventMode` | CC `initChrono` | CC, CCI | CCI |
| `obs`, `obs_for_id`, `acts` | CC (implicit leaks) | CC | CC (`obs` also assigned in `SelectionControl.js` `deleteEvent`) |
| `chrono.perf.chronoUpdate` | CC | CC `updateChrono` status line | CC `updateChronoData` |

### (b) Proposed modules

| Module | Responsibility | Takes from this area | Purity |
|---|---|---|---|
| `derive/filters.js` | Filter configuration as plain data: `{restrictIds, excludeIds, hideInvalid, hideFlowers, frameRange, idAxisMap, roi, tag: {hamming, minDM, rgb, excludeRects, sampleExpr, intervalExpr, minLength}}`; `parseIdList`, `compileTagFilters(config) -> {sample, interval}`, `inRoi`, `inExcludeRects` | the flags and predicates scattered over CC and OC (DEBT-808, DEBT-814, DEBT-818) | pure |
| `derive/ids.js` | `sortIds` (non-mutating), `idDomain(rows, filters)` | `sortIds`, `validIdsDomain`, `validIdsChrono`, `updateChronoYDomain` order logic (BEH-830, BEH-831) | pure |
| `derive/flatten.js` | `flattenTracks(tracks, filters) -> {all, valid, groupAll, groupValid}`; `attachTags(tracks, tags) -> tagFor(frame,id)` | `updateFlatTracks`, `augmentTrackWithTag`, `getFlatTags` (BEH-802, BEH-803, BEH-810) | pure (no write to Tracks) |
| `derive/events.js` | `eventRows(flat, filters, roi, tagFor) -> rows`; `buildIntervals(rows, filters) -> {intervals, crosses, parts}` | `updateChronogramData`, `createIntervalList` (BEH-805 to BEH-809) | pure |
| `derive/tagintervals.js` | `tagSeries(flatTags) -> {ttags, ids}`; `tagIntervals(ttags, sample, interval, idAxisMap)`; `labelTagIntervals(intervals, flat) -> {intervals, spans, redundant}` | `getTTags`, `updateTagIntervals`, `updateTagsLabels` (BEH-811 to BEH-818) | pure |
| `derive/pipeline.js` | `computeDerived(tracks, tags, filters, options) -> DerivedData` calling the stages in the BEH-801 order; the only entry the views use; result immutable | `updateChronoData` | pure |
| `derive/tools.js` | `findObsolete(tracks, tagFor, rules) -> [{frame,id}]`; `interpolateTags(tags, maxgap, sample) -> newTags[]`; `motionDirection(intervals, series) -> dirs` | `cleanObsoleteEvents`, `interpolateTags`, `computeMotionDirection` (BEH-833 to BEH-835) | pure (writes done by a store command) |
| Stays in the chronogram view (CAP-300) | button handlers `click_*`, `setFrameFilter` GUI sync, `refreshChronogram` orchestration, rendering | the DOM and d3 parts | impure |
| Stays in the filter panel controller | `refreshTagsParameters`, `chronoFilter`, `onROITextChanged`, etc. reduced to "read DOM -> build `Filters` -> notify" | OC tag filter code | impure |

Rule: the `derive/` modules import nothing from the DOM, jQuery, d3, `videoControl` or any global. Everything they need arrives as arguments; they return new values and never write `Tracks`/`Tags`.
