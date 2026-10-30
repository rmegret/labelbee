<!-- GENERATED from ../behaviors/cap-400-overlay-display-annotations.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Overlay display and annotations ([CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations"))

Conventions: see [../README.md](../README.md).

All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated. After the critic review, statements about `OverlayControl.js`, `SelectionControl.js` and `labelBee.js` were re-checked against served code excerpts; a second pass re-checked `Model.js` (`copyObs`, `changeObservationID`), `VideoControl.js` defaults, the page wiring of the overlay inputs, the constructor and the pick-frame/pick-flower bodies. Only the remaining statements flagged "not re-read" in the items below (Fabric event wiring, `identifyBeeRect` and tag-drawing details outside the excerpts, `deleteEvent`, `storeObs`) are carried over from the first reading and stay `inferred`.

Scope: `OverlayControl.js` (canvas layers, Fabric boxes, click modes, tags, track window, interaction modes, coordinate transforms, options) plus the box commit/select/delete helpers it depends on in `SelectionControl.js` and the ID-edit key handler in `labelBee.js`. The visit and timeline widgets and the pick-frame span panel are only referenced (group 6, [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")); skeleton placement is group 5 ([CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")). Items for the view-level machinery (canvas, transform, options) use `CAP-400` as group because no leaf covers them (see [OQ-403](../../QUESTIONS.md#oq-403 "Missing leaf capability for the canvas view")).

## Contents

| ID | Name |
|---|---|
| BEH-401 | [Three stacked layers and overlay construction](#beh-401-three-stacked-layers-and-overlay-construction) |
| BEH-402 | [Hard refresh rebuilds all boxes for the current frame](#beh-402-hard-refresh-rebuilds-all-boxes-for-the-current-frame) |
| BEH-403 | [Soft refresh draws layers in a fixed order](#beh-403-soft-refresh-draws-layers-in-a-fixed-order) |
| BEH-404 | [Video frame painting depends on the video mode](#beh-404-video-frame-painting-depends-on-the-video-mode) |
| BEH-405 | [Image difference display](#beh-405-image-difference-display) |
| BEH-406 | [Canvas size follows the video size and the user resize](#beh-406-canvas-size-follows-the-video-size-and-the-user-resize) |
| BEH-407 | [Canvas to video coordinate transform and its clamping](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping) |
| BEH-408 | [Zoom and pan gestures](#beh-408-zoom-and-pan-gestures) |
| BEH-409 | [Overlay option toggles](#beh-409-overlay-option-toggles) |
| BEH-410 | [Display checkboxes and their initial state](#beh-410-display-checkboxes-and-their-initial-state) |
| BEH-411 | [ID appearance parameters](#beh-411-id-appearance-parameters) |
| BEH-412 | [Export frame](#beh-412-export-frame) |
| BEH-413 | [Box rendering style and handles](#beh-413-box-rendering-style-and-handles) |
| BEH-414 | [Dot-only mode (Show Rect off)](#beh-414-dot-only-mode-show-rect-off) |
| BEH-415 | [ID dot, ID text and span text on a box](#beh-415-id-dot-id-text-and-span-text-on-a-box) |
| BEH-416 | [Wrong-ID display](#beh-416-wrong-id-display) |
| BEH-417 | [Predicted annotations drawn transparent](#beh-417-predicted-annotations-drawn-transparent) |
| BEH-418 | [Box and observation geometry stay in sync](#beh-418-box-and-observation-geometry-stay-in-sync) |
| BEH-419 | [One box per valid ID of the current frame](#beh-419-one-box-per-valid-id-of-the-current-frame) |
| BEH-420 | [Clicking a box selects it](#beh-420-clicking-a-box-selects-it) |
| BEH-421 | [Background click and deselection](#beh-421-background-click-and-deselection) |
| BEH-422 | [Shift+click creates a box from the best prediction](#beh-422-shiftclick-creates-a-box-from-the-best-prediction) |
| BEH-423 | [ID prediction rules](#beh-423-id-prediction-rules) |
| BEH-424 | [Ctrl+drag creates a box interactively](#beh-424-ctrldrag-creates-a-box-interactively) |
| BEH-425 | [Default box size](#beh-425-default-box-size) |
| BEH-426 | [Click mode "New annotation"](#beh-426-click-mode-new-annotation) |
| BEH-427 | [Click mode "Select diff. time"](#beh-427-click-mode-select-diff-time) |
| BEH-428 | [Click mode "Auto centering"](#beh-428-click-mode-auto-centering) |
| BEH-429 | [Moving, scaling and rotating a box](#beh-429-moving-scaling-and-rotating-a-box) |
| BEH-430 | [Resize around center option](#beh-430-resize-around-center-option) |
| BEH-431 | [Box angle control](#beh-431-box-angle-control) |
| BEH-432 | [Annotate from the current tag](#beh-432-annotate-from-the-current-tag) |
| BEH-433 | [Committing a box (`submit_bee`)](#beh-433-committing-a-box-submit_bee) |
| BEH-434 | [Editing the bee ID](#beh-434-editing-the-bee-id) |
| BEH-435 | [Delete a box and undo the deletion](#beh-435-delete-a-box-and-undo-the-deletion) |
| BEH-436 | [Tag lookup for a bee](#beh-436-tag-lookup-for-a-bee) |
| BEH-437 | [Tags of the current frame](#beh-437-tags-of-the-current-frame) |
| BEH-438 | [Selected tag marker](#beh-438-selected-tag-marker) |
| BEH-439 | [Tag orientation arrow](#beh-439-tag-orientation-arrow) |
| BEH-440 | [Interaction modes main, pick-frame and edit-visit](#beh-440-interaction-modes-main-pick-frame-and-edit-visit) |
| BEH-441 | [Experimental timeline around the selected event](#beh-441-experimental-timeline-around-the-selected-event) |
| BEH-442 | [Observation tracks (trajectory of boxes)](#beh-442-observation-tracks-trajectory-of-boxes) |
| BEH-443 | [Track window (focus interval)](#beh-443-track-window-focus-interval) |
| BEH-444 | [Tag tracks (trajectory of tags)](#beh-444-tag-tracks-trajectory-of-tags) |
| BEH-445 | [Tag sample filter composition](#beh-445-tag-sample-filter-composition) |
| BEH-455 | [Interval and ID filters, filter presets](#beh-455-interval-and-id-filters-filter-presets) |
| BEH-446 | [Region of interest and exclusion rectangles](#beh-446-region-of-interest-and-exclusion-rectangles) |
| BEH-447 | [Chronogram display toggles handled by the overlay module](#beh-447-chronogram-display-toggles-handled-by-the-overlay-module) |
| BEH-448 | [Labels and activity flags kept in sync by form helpers](#beh-448-labels-and-activity-flags-kept-in-sync-by-form-helpers) |
| BEH-449 | [Skeleton drawn on the boxes](#beh-449-skeleton-drawn-on-the-boxes) |
| BEH-450 | [Pick-frame span panel](#beh-450-pick-frame-span-panel) |
| BEH-451 | [Pick-frame timeline buttons and options](#beh-451-pick-frame-timeline-buttons-and-options) |
| BEH-452 | [Pick Flower](#beh-452-pick-flower) |
| BEH-453 | [New-ID field of the active box](#beh-453-new-id-field-of-the-active-box) |
| BEH-454 | [Keyboard handling on the left panel (text fields, ID focus, delete)](#beh-454-keyboard-handling-on-the-left-panel-text-fields-id-focus-delete) |
| BEH-456 | [Labels and notes text on a box](#beh-456-labels-and-notes-text-on-a-box) |
| BEH-457 | [Mouse-down dispatch order](#beh-457-mouse-down-dispatch-order) |

## BEH-401: Three stacked layers and overlay construction

The overlay is made of three stacked elements inside `.canvaswrapper` (inside `#canvasresize`): the `<video id="video">` element (z-index -1), the 2D canvas `#canvas` (z-index 2; the video frame, tags, tracks, ROI are painted here through `overlay.ctx`) and the Fabric canvas `#canvas1` (z-index 3; one `fabric.BeeRect` per bee box). `new OverlayControl("canvas")` is created once by `init` in `labelBee.js`, after `videoControl`. The Fabric canvas is created with `selection = false` (no rubber-band multi-selection), `uniScaleTransform = true` (free, non-proportional scaling), selection colors red. Fabric events bound: `mouse:down`, `mouse:up`, `object:moving`, `object:scaling`, `object:rotating` (all three to `onObjectMoving`), `object:modified`, `object:selected`, `selection:cleared`. On `.upper-canvas`, `contextmenu` is bound to `onMouseDown2` and `wheel` to `onMouseWheel`. The overlay listens to the jQuery event `videosize:changed` on `videoControl` (args w, h) and calls `canvasSetVideoSize`.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl`, `canvasSetVideoSize`, `onMouseDown2`, `onMouseWheel`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#canvasresize`, `#canvas`, `#canvas1`, `#video`
- **Links:** [SEAM-401](view_seams.md#seam-401-overlay---videocontrol-frame-refresh-and-frame-source "Overlay <-> VideoControl (frame refresh and frame source)"), [SEAM-402](view_seams.md#seam-402-overlay-boxes---selectioncontrol-selection-and-commit "Overlay boxes <-> SelectionControl (selection and commit)"), [DEBT-408](view_debt.md#debt-408-canvas-sizing-issues "Canvas sizing issues")

## BEH-402: Hard refresh rebuilds all boxes for the current frame

`overlay.hardRefresh()` is the redraw entry point; `videoControl.refresh()` calls it on every frame change and after every edit. It (1) redraws the video frame ([BEH-404](#beh-404-video-frame-painting-depends-on-the-video-mode "Video frame painting depends on the video mode")), (2) clears the Fabric canvas, (3) creates one box per valid bee ID of the current frame from `Tracks` ([BEH-419](#beh-419-one-box-per-valid-id-of-the-current-frame "One box per valid ID of the current frame")), (4) according to the interaction mode ([BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit")) selects a box: in `main` and `edit-visit` it calls `selectBeeByID(defaultSelectedBee)` (the selection is carried across frames by ID; `selectBeeByID` first sets `tagSelection = id`; if the ID has no box in this frame it deactivates the Fabric objects, clears the form, sets `defaultSelectedBee = id`, triggers `tagselection:created` (or `tagselection:cleared` for a null id), calls `axes.selectId(id)` and returns false, without triggering `selection:cleared`), (5) calls `refreshOverlay` ([BEH-403](#beh-403-soft-refresh-draws-layers-in-a-fixed-order "Soft refresh draws layers in a fixed order")), (6) updates `#deleteButton` and `#undoButton` states. All non-committed ("new") boxes disappear on a hard refresh because boxes are rebuilt only from `Tracks`.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `hardRefresh`, `createRectsFromTracks`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl.prototype.refresh`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByID`, `updateDeleteButton`, `updateUndoButton`
- **Links:** [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [BEH-419](#beh-419-one-box-per-valid-id-of-the-current-frame "One box per valid ID of the current frame"), [BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit"), [SEAM-401](view_seams.md#seam-401-overlay---videocontrol-frame-refresh-and-frame-source "Overlay <-> VideoControl (frame refresh and frame source)")

## BEH-403: Soft refresh draws layers in a fixed order

`overlay.refreshOverlay()` draws, on top of what is already on `#canvas`, in this order: tag tracks (`plotTagsTracks`, if `showTagsTracks` or `showSelectedTagsTracks`), current-frame tags (`plotTags`, if `showTags`), observation tracks (`plotTracks`, if `showObsTracks`), then the boxes: if `showObs` it re-syncs every Fabric box from its `obs` (`refreshRectFromObs`: geometry plus handles style) and renders the Fabric canvas, otherwise it clears the Fabric canvas (all boxes removed from the view, not from `Tracks`); finally the ROI mask (`plotROI`) and exclusion rectangles (`plotExcludeRects`). It does not repaint the video frame, so during box dragging ([BEH-429](#beh-429-moving-scaling-and-rotating-a-box "Moving, scaling and rotating a box")) tag and track drawings are overpainted without being erased first.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `refreshOverlay`, `refreshRectFromObs`, `plotTagsTracks`, `plotTags`, `plotTracks`, `plotROI`, `plotExcludeRects`
- **Links:** [BEH-402](#beh-402-hard-refresh-rebuilds-all-boxes-for-the-current-frame "Hard refresh rebuilds all boxes for the current frame"), [BEH-412](#beh-412-export-frame "Export frame"), [BEH-445](#beh-445-tag-sample-filter-composition "Tag sample filter composition"), [BEH-446](#beh-446-region-of-interest-and-exclusion-rectangles "Region of interest and exclusion rectangles")

## BEH-404: Video frame painting depends on the video mode

`redrawVideoFrame` paints the frame into `#canvas` through the current canvas transform ([BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping")): the source rectangle is `(tx, ty, sx*W, sy*H)` of the video, scaled to the whole canvas of size `W x H`. By `videoControl.currentMode`: `video` with `flagCopyVideoToCanvas` (set to true in the `VideoControl` constructor and not assigned elsewhere in `VideoControl.js`, so the other branch is unreachable today) draws the `<video>` element; `video` without the flag would clear only the rectangle `(0, 0, videoWidth*extraScale/transformFactor, videoHeight*extraScale/transformFactor)` (the video at the current zoom, not the whole canvas) and relies on the `<video>` element beneath; `preview` draws `videoControl.previewVideo` with the source rectangle divided by the preview/full scale ratio; `cache` and `cache-preview` draw `videoControl.currentImage`. If `videoControl.isValidVideo` is false: grey fill `#DDD`, blue text "Could not load video" and the video `src` centered, and the Fabric canvas is cleared. If in cache mode there is no image for the frame: a grey (`#DDD`) banner 300 px wide and one text line high, with the blue 12px Verdana text "Frame N not in cache", is painted at the top left (identity transform), the Fabric canvas is cleared, and the function returns (no boxes are drawn).

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `redrawVideoFrame`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `flagCopyVideoToCanvas`, `currentMode`
- **Links:** [BEH-405](#beh-405-image-difference-display "Image difference display"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping"), [DEBT-408](view_debt.md#debt-408-canvas-sizing-issues "Canvas sizing issues"), [OQ-402](../../QUESTIONS.md#oq-402 "Which video display modes are in routine use")

## BEH-405: Image difference display

Option `showImageDiff` (button class `overlayOpts-showImageDiff`, "Image Diff", default off) replaces the video painting by the difference between the current frame and the previous one, both taken synchronously from `videoCache` (frame and frame-1). Per pixel and channel, the result is `0.2*current + 0.8*(current_minus_previous*gain + 128)` with gain 3.0. Where nothing changed this is `0.2*v + 102.4` (range 102..153): a dimmed copy of the frame, not flat grey. The diff uses a second canvas `overlay.canvas2`, whose size is reset (so it is blank) at every call. A preload of frames `[frame-1, frame]` is started when the current frame is not in the cache or (only if `frame-1 >= 0`) the previous one is not; it is asynchronous, prints "Preload done" and does not trigger a redraw. The diff is computed immediately with what is available: a missing current frame leaves the main canvas as it was; a missing previous frame leaves `canvas2` blank. In this mode `currentMode` is not consulted.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `redrawVideoFrameDiff`, `diffImage`
- **Links:** [BEH-404](#beh-404-video-frame-painting-depends-on-the-video-mode "Video frame painting depends on the video mode"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles")

## BEH-406: Canvas size follows the video size and the user resize

On `videosize:changed` (w, h), `canvasSetVideoSize` stores `overlay.videoSize = {w, h}`, keeps the current canvas width, sets the canvas height to `round(h * width / w)`, resizes `#canvasresize` to `(width+16+2) x (height+2)` px, re-inits the jQuery UI `resizable` with aspect ratio `w/h`, calls `refreshCanvasSize`, then `canvasTransformReset`. The user can resize the view by dragging the `#canvasresize` handle (jQuery UI `resizestop` calls `refreshCanvasSize`). `refreshCanvasSize` reads the `#canvasresize` style size minus 4 px: with option `fixedAspect` (default true) the height is taken and the width recomputed as `round(height / videoH * videoW)`; without it both width and height are taken. It then sets the same size on `#canvas`, the Fabric canvas, `#video` and `.canvaswrapper`, updates the texts `#videoSize` ("videoSize: WxH") and `#canvasSize` ("canvasSize: WxH"), and rescales the transform so that the displayed content stays the same (`canvasTransformScale` with ratio old/new width, old and new centers). Toggling `fixedAspect` on calls `canvasSetVideoSize(videoSize.w, videoSize.h)` again (the canvas size is recomputed and the zoom is reset by `canvasTransformReset`) and sets the resizable aspect ratio; toggling it off sets the resizable aspect ratio to false; both then call `overlay.hardRefresh()` ([BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles")). The size arithmetic is asymmetric: `canvasSetVideoSize` writes `#canvasresize` as `(canvas+16+2) x (canvas+2)`, `refreshCanvasSize` reads it back minus 4 and writes `+2` again, so after a video load the canvas is 2 px smaller than the size `canvasSetVideoSize` computed ([DEBT-408](view_debt.md#debt-408-canvas-sizing-issues "Canvas sizing issues")). `canvasSetVideoSize` first stores `videoSize.w/.h`; its alternative that halves the size until it is below 800 px sits behind `if (true)` and never runs. The constructor initialises `videoSize` as `{x: 600, y: 400}` while all code reads `.w`/`.h` ([DEBT-408](view_debt.md#debt-408-canvas-sizing-issues "Canvas sizing issues")), and binds `resizestop` of `#canvasresize` to `refreshCanvasSize`.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `canvasSetVideoSize`, `refreshCanvasSize`, `optsClick`
  - [labelbee/static/labelbee/js/VideoControl.js](../../../labelbee/static/labelbee/js/VideoControl.js): `VideoControl`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#canvasresize`, `#videoSize`, `#canvasSize`
- **Links:** [BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [DEBT-408](view_debt.md#debt-408-canvas-sizing-issues "Canvas sizing issues")

## BEH-407: Canvas to video coordinate transform and its clamping

The view is a pan/zoom window on the video, stored in the global six-array `canvasTransform = [sx, 0, 0, sy, tx, ty]` mapping canvas pixels to video pixels: `video = s * canvas + t` (`canvasToVideoPoint/Rect`, and the inverse `videoToCanvasPoint/Rect`; `obsToCanvasRect(obs)` maps `obs.x, y, width, height`). Reset (`canvasTransformReset`, on each new video size) sets `sx = sy = videoW / canvasWidth` and `t = 0`, i.e. whole video visible. Every change goes through `canvasTransform_Fix`: if `sx*canvasW > videoW` or `sy*canvasH > videoH` both scales become `min(videoW/canvasW, videoH/canvasH)` (cannot zoom out beyond the full video); `tx, ty` are clamped to `[0, video size - s*canvas size]`; a NaN or non-positive scale reinitialises the transform. `canvasTransformScale(scaling, center, center2)` multiplies the scales and moves the translation so that the point under `center` stays fixed. `canvasTransformCenter(cx, cy)` puts the video point at the canvas center, then clamps. `canvasTransformPan(dx, dy)` shifts by `-d * s`. All of them end with `hardRefresh`. Box coordinates in `Tracks` are always in full-resolution video pixels ([ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")); canvas coordinates exist only on screen.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `canvasTransform_Fix`, `canvasTransformReset`, `canvasTransformSet`, `canvasTransformScale`, `canvasTransformPan`, `canvasTransformCenter`, `canvasToVideoPoint`, `videoToCanvasPoint`, `canvasToVideoRect`, `videoToCanvasRect`, `obsToCanvasRect`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [SEAM-403](view_seams.md#seam-403-view-transform-canvas---video-coordinates "View transform (canvas <-> video coordinates)"), [DEBT-407](view_debt.md#debt-407-module-state-held-in-implicit-globals "Module state held in implicit globals")

## BEH-408: Zoom and pan gestures

Alt+Ctrl+mouse wheel over the canvas zooms around the cursor: `scaling = 2^(wheelDelta/512)` (wheel up zooms in), centered at the event `offsetX, offsetY`. Alt+wheel (no Ctrl) pans by `wheelDeltaX, wheelDeltaY` (canvas pixels, via `canvasTransformPan`). Wheel without Alt is ignored (page scrolls). Alt + mouse drag on the canvas pans (any button: only `altKey` is tested, there is no button check): the translation follows the pointer in client coordinates (`t = t0 - delta * s0`, applied with `canvasTransformSet`), `videoControl.refresh()` is called on every mouse move and once more on release. Alt is tested first in `onMouseDown`, after pausing the video and clearing the message and before any other mode ([BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order")). Clamping of [BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping") applies. Zoom needs Alt+Ctrl, not Shift as in Quick Help ([DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior")). Ctrl+right click (context menu) on the canvas is suppressed.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseWheel`, `onMouseWheel_Zooming`, `onMouseWheel_Panning`, `onMouseDown_panning`, `onMouseDown2`
- **Links:** [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping"), [BEH-426](#beh-426-click-mode-new-annotation "Click mode 'New annotation'"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-409: Overlay option toggles

`overlay.opts` holds the display options; each is a toggle button with the class `overlayOpts overlayOpts-<name>` (several buttons share a class: the Display panel and the Annotations panel duplicate `showRect/showID/showLabels/showNotes`, and `useImageCache`, `fixedAspect` also appear near the video controls). `overlay.optsClick(name)` flips the boolean, re-syncs the `active` class of all buttons with that class, and then calls `overlay.hardRefresh()`, except where `useImageCache` calls `videoControl.hardRefresh()` instead (below). Defaults: `showRect` true, `showID` true, `showLabels` true, `showNotes` true, `showSpan` false, `resizeAroundCenter` false, `clickModeSelectMultiframe` false, `clickModeNewAnnotation` false, `clickModeAutoCentering` false, `showImageDiff` false, `useImageCache` false, `showPredictedStatus` false, `fixedAspect` true. Options without a button (set in the constructor, read by the drawing code): `labelFormatter` (default `obs => obs.labels`), `label_offsetType` `bottom`, `wrapLabels` true, `wrapLabelsWidth` 80, `predictIdClickRadius` 120, `timelineZoom` 4.0, `timelineMaxDelta` 3, `timelineDisplaySize` 300 (see [BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box"), [BEH-456](#beh-456-labels-and-notes-text-on-a-box "Labels and notes text on a box"), [BEH-423](#beh-423-id-prediction-rules "ID prediction rules"), [BEH-451](#beh-451-pick-frame-timeline-buttons-and-options "Pick-frame timeline buttons and options")). `useImageCache` switched on sets `videoControl.currentMode = "cache"` and calls `videoControl.hardRefresh()` only if the mode was not already `cache` (otherwise `overlay.hardRefresh()`); switched off it sets `"video"` and calls `videoControl.hardRefresh()` only if the mode was `cache` (otherwise `overlay.hardRefresh()`). `fixedAspect` is not a special case for the refresh: it additionally re-applies the aspect ratio ([BEH-406](#beh-406-canvas-size-follows-the-video-size-and-the-user-resize "Canvas size follows the video size and the user resize")) and then calls `overlay.hardRefresh()`. Options are not persisted (reset on page load).

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `optsClick`, `updateOptsButtons`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Display and Click Mode panels (overlayOpts buttons)`
- **Links:** [BEH-406](#beh-406-canvas-size-follows-the-video-size-and-the-user-resize "Canvas size follows the video size and the user resize"), [BEH-413](#beh-413-box-rendering-style-and-handles "Box rendering style and handles"), [BEH-426](#beh-426-click-mode-new-annotation "Click mode 'New annotation'"), [BEH-427](#beh-427-click-mode-select-diff-time "Click mode 'Select diff. time'"), [BEH-428](#beh-428-click-mode-auto-centering "Click mode 'Auto centering'"), [BEH-430](#beh-430-resize-around-center-option "Resize around center option"), [BEH-451](#beh-451-pick-frame-timeline-buttons-and-options "Pick-frame timeline buttons and options"), [BEH-456](#beh-456-labels-and-notes-text-on-a-box "Labels and notes text on a box"), [SEAM-402](view_seams.md#seam-402-overlay-boxes---selectioncontrol-selection-and-commit "Overlay boxes <-> SelectionControl (selection and commit)")

## BEH-410: Display checkboxes and their initial state

The constructor sets the module-level flags and the checkboxes to: `showObs` (`#showObs`, "In current frame") true, `showObsTracks` (`#showObsTracks`) true, `showTags` (`#showTags`) true, `showTagsTracks` (`#showTagsTracks`, "All tag tracks") true, `showSelectedTagsTracks` (`#showSelectedTagsTracks`, "Selected track") true (the flag is set to literal true; only its checkbox is set from `showTagsTracks`, the same value today), `showTagsOrientation` (`#showTagsOrientation`) false, `showTagsChrono` and `showObsChrono` true. Changing `#showObs` or `#showObsTracks` calls `onShowObsChanged` (reads both checkboxes, then `overlay.hardRefresh`). Changing `#showTags` or `#showTagsOrientation` calls `onShowTagsChanged` (reads both, `videoControl.refresh`). Changing `#showTagsTracks` or `#showSelectedTagsTracks` calls `onShowTagsTracksChanged` (reads both, `videoControl.refresh`). The HTML `checked` attributes are overridden by the constructor. The chronogram checkboxes are described by [CAP-300](view_capabilities.md#cap-300-temporal-display-and-navigation "Temporal display and navigation") ([BEH-447](#beh-447-chronogram-display-toggles-handled-by-the-overlay-module "Chronogram display toggles handled by the overlay module") notes the callback).

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `OverlayControl`, `onShowObsChanged`, `onShowTagsChanged`, `onShowTagsTracksChanged`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#showObs`, `#showObsTracks`, `#showTags`, `#showTagsOrientation`, `#showTagsTracks`, `#showSelectedTagsTracks`
- **Links:** [BEH-403](#beh-403-soft-refresh-draws-layers-in-a-fixed-order "Soft refresh draws layers in a fixed order"), [BEH-444](#beh-444-tag-tracks-trajectory-of-tags "Tag tracks (trajectory of tags)"), [DEBT-407](view_debt.md#debt-407-module-state-held-in-implicit-globals "Module state held in implicit globals")

## BEH-411: ID appearance parameters

Five text inputs set how a box is annotated on the overlay: `#overlayOpts-ID_dotRadius` (default 4), `#overlayOpts-ID_fontSize` (20), `#overlayOpts-ID_color` (`yellow`, any CSS color), `#overlayOpts-ID_offsetType` (`center`; any other value than `top` behaves as `center`), `#overlayOpts-label_offsetType` (`bottom`; any value other than `bottom` behaves as `center`). On `change`, `onOverlayParamsChanged` reads all five (numbers via `Number`, no validation) and calls `refreshOverlay`. The page declares `onchange="onOverlayParamsChanged(event)"` on each input, with initial HTML values 5, 5, 7, 7, 7 (dot radius, font size, color, ID offset, label offset); the inputs are filled from `overlay.opts` by `updateOptsButtons` at construction (that function was not re-read; the HTML values are meant to be overwritten).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onOverlayParamsChanged`, `updateOptsButtons`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#overlayOpts-ID_dotRadius`, `#overlayOpts-ID_fontSize`, `#overlayOpts-ID_color`, `#overlayOpts-ID_offsetType`, `#overlayOpts-label_offsetType`
- **Links:** [BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles")

## BEH-412: Export frame

The button "Export frame" (`overlay.exportFrame()`) extracts the current frame image of the current video from `videoCache` (`getFrameImageAsync(videoUrl, currentFrame, videoinfo.videofps)`) and opens a new browser tab whose body shows "Extracted Frame N from <link to the video URL>" and the image (max width 100%), with the tab title "Frame N, video <url>". There is no download file; `openVideoNewTab` exists in code but its button is commented out in the page.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `exportFrame`, `openVideoNewTab`
- **Links:** [SEAM-401](view_seams.md#seam-401-overlay---videocontrol-frame-refresh-and-frame-source "Overlay <-> VideoControl (frame refresh and frame source)")

## BEH-413: Box rendering style and handles

Each bee box is a `fabric.BeeRect` (subclass of `fabric.Rect`, type `beerect`) with transparent fill, blue stroke, red corner handles of size 6, rotation handle offset 20, origin at the center (`left/top` of the object are its center) and rotation around the center. With `showRect` on: only the four corner handles `tl, tr, bl, br` are visible (side-middle handles hidden), the rotation handle `mtr` is visible only if the angle control is enabled ([BEH-431](#beh-431-box-angle-control "Box angle control")), flipping while scaling is locked, borders shown, and `centeredScaling` follows option `resizeAroundCenter` ([BEH-430](#beh-430-resize-around-center-option "Resize around center option")). With `showRect` off: the box degenerates to a dot ([BEH-414](#beh-414-dot-only-mode-show-rect-off "Dot-only mode (Show Rect off)")). Style is re-applied at every `refreshOverlay`. Each `BeeRect` carries `id` (bee ID), `status` (`"db"` committed or `"new"` pending) and `obs` (a clone of the observation, see [BEH-418](#beh-418-box-and-observation-geometry-stay-in-sync "Box and observation geometry stay in sync")).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect`, `refreshRectStyle`, `addRectFromObs`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [BEH-414](#beh-414-dot-only-mode-show-rect-off "Dot-only mode (Show Rect off)"), [BEH-430](#beh-430-resize-around-center-option "Resize around center option"), [BEH-431](#beh-431-box-angle-control "Box angle control")

## BEH-414: Dot-only mode (Show Rect off)

When `showRect` is off, every box is drawn as a dot of diameter `2*ID_dotRadius` at the box center, angle 0, without handles or borders; the selected one is circled with a red stroke (width 3). Dragging a dot moves only the center: `updateRectObsGeometry` then keeps the stored `width`, `height`, `angle` and updates `cx, cy, x, y`. This allows relocating bees without changing their annotated box size.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateRectFromObsGeometry`, `updateRectObsGeometry`, `identifyBeeRect`
- **Links:** [BEH-413](#beh-413-box-rendering-style-and-handles "Box rendering style and handles"), [BEH-418](#beh-418-box-and-observation-geometry-stay-in-sync "Box and observation geometry stay in sync"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles")

## BEH-415: ID dot, ID text and span text on a box

`fabric.BeeRect._render` paints the Fabric rectangle, then (if `zoomOverlay.flagShowParts`) the skeleton ([BEH-449](#beh-449-skeleton-drawn-on-the-boxes "Skeleton drawn on the boxes")), then `identifyBeeRect(ctx, rect, radius, isActive)` with `radius = ID_dotRadius`. In the box local frame (rotation undone so that text is upright): a filled dot of radius `ID_dotRadius` in `ID_color` at the center; with `showRect` off and the box active, the dot is also stroked in red, width 3 ([BEH-414](#beh-414-dot-only-mode-show-rect-off "Dot-only mode (Show Rect off)")). If `showID`, the bee ID (`rect.id`; for a `wrongid` observation see [BEH-416](#beh-416-wrong-id-display "Wrong-ID display")) is drawn centered in font `ID_fontSize`px Arial at vertical offset `-(radius+3)` (the default, also for any value other than `top`) or `-(rect.height/2+3)` when `ID_offsetType` is `top`. If `showSpan`, the observation is re-read from `Tracks` (`getObsHandle(frame, ID)`); if it exists and has a `span`, the text `[f1-f2]` is drawn below the box in `ID_fontSize/2`px font, but only when `f1 != f2` (the text is empty otherwise). Whenever the observation has a `span`, the vertical offset for the following texts advances by `ID_fontSize/2`, even when `f1 == f2` and nothing is visible. Labels and notes are in [BEH-456](#beh-456-labels-and-notes-text-on-a-box "Labels and notes text on a box"). All text uses `ID_color` except the `wrongid` case.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `identifyBeeRect`, `fabric.BeeRect`
- **Links:** [BEH-411](#beh-411-id-appearance-parameters "ID appearance parameters"), [BEH-414](#beh-414-dot-only-mode-show-rect-off "Dot-only mode (Show Rect off)"), [BEH-416](#beh-416-wrong-id-display "Wrong-ID display"), [BEH-417](#beh-417-predicted-annotations-drawn-transparent "Predicted annotations drawn transparent"), [BEH-456](#beh-456-labels-and-notes-text-on-a-box "Labels and notes text on a box"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")

## BEH-416: Wrong-ID display

If the observation has the label `wrongid` (`hasLabel(obs, "wrongid")`), the ID text is cyan instead of `ID_color`. If additionally `obs.newid` is set (not null), the old ID is drawn in cyan 14px and the proposed new ID in 10px `ID_color`, 13 px above it.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `identifyBeeRect`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `hasLabel`
- **Links:** [BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics")

## BEH-417: Predicted annotations drawn transparent

With option `showPredictedStatus` ("Transparent prediction", default off), each box whose observation in `Tracks` has `predicted` true is painted with global alpha 0.25 (others 1.0). The flag is read from `Tracks` via `getObsHandle(frame, ID)`, not from the cloned `rect.obs`; for a box without a stored observation (a pending `new` box) the lookup returns undefined and `obs.predicted` throws a TypeError inside `_render` (after `ctx.save()`, with no `restore()`), so redrawing the Fabric canvas fails while such a box exists and the option is on ([DEBT-409](view_debt.md#debt-409-box-clone-omits-span-predicted-and-tag-drawing-re-reads-tracks-transparent-prediction-crashes-severity-h "Box clone omits span, predicted and tag; drawing re-reads Tracks; transparent prediction crashes (severity H)")).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `identifyBeeRect`
- **Links:** [BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box"), [OQ-411](../../QUESTIONS.md#oq-411 "Characterizing known crashes"), [DEBT-409](view_debt.md#debt-409-box-clone-omits-span-predicted-and-tag-drawing-re-reads-tracks-transparent-prediction-crashes-severity-h "Box clone omits span, predicted and tag; drawing re-reads Tracks; transparent prediction crashes (severity H)")

## BEH-418: Box and observation geometry stay in sync

A box holds a clone of its observation (`cloneObs` = `copyObs` into an empty object: ID, time, frame, x, y, cx, cy, width, height, a new `bool_acts` array of four, angle, notes, labels, parts, newid, a deep copy of `fix`, and `visit` if present, but NOT `span`, `predicted` or `tag`; `parts` and `visit` are copied by reference, so the clone and the stored observation share them). `updateRectFromObsGeometry` sets the Fabric box from the observation: center = canvas position of the box center, canvas width/height, `angle = obs.angle`. `updateRectObsGeometry` does the reverse after an interaction: video box `(x, y, width, height)` from the unrotated rectangle around the box center, `angle = rect.angle` (degrees, Fabric convention: clockwise from upright; 0 = unrotated), and `cx, cy` as the center. The angle is stored in degrees and the box is the unrotated rectangle rotated around its center. Because the clone is edited, `Tracks` is modified by an explicit commit ([BEH-429](#beh-429-moving-scaling-and-rotating-a-box "Moving, scaling and rotating a box"), [BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)")), except through the shared `parts` and `visit` objects, and through `span`, `visit.flowerid` which some panels write directly into `Tracks` ([BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel"), [BEH-452](#beh-452-pick-flower "Pick Flower")).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateRectFromObsGeometry`, `updateRectObsGeometry`, `rotatedRectGeometry`, `addRectFromObs`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `cloneObs`, `copyObs`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping"), [BEH-429](#beh-429-moving-scaling-and-rotating-a-box "Moving, scaling and rotating a box"), [DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation")

## BEH-419: One box per valid ID of the current frame

`createRectsFromTracks(F)` (F defaults to the current frame) loops over `getValidIDsForFrame(F)` (IDs of `Tracks[F]` with a non-null value) and adds a `status: "db"` box for each, with rendering suspended during the loop (`renderOnAddRemove` false) and a single `renderAll` at the end. If an observation lacks `angle`, 0 is assumed (console warning). IDs are strings (object keys).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `createRectsFromTracks`, `addRectFromObs`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `getValidIDsForFrame`, `getObsHandle`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [BEH-402](#beh-402-hard-refresh-rebuilds-all-boxes-for-the-current-frame "Hard refresh rebuilds all boxes for the current frame")

## BEH-420: Clicking a box selects it

Clicking an existing box lets Fabric select it (`object:selected` -> `onObjectSelected`): the module remembers `overlay.previouslySelected` and `overlay.lastSelected`, calls `selectBee(rect)` (sets `defaultSelectedBee` to the box ID, calls `updateForm(rect)`, triggers `tagselection:created` and `selection:created` on `selectionControl`, which refresh the zoom view), updates `#deleteButton`, and, if the observation re-read from `Tracks` (`getObsHandle`) has a `visit`, also selects that visit in the visit widget ([CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")). A consistency error is logged (console only) if the clicked object's ID differs from the active object's. In `onMouseDown`, a click on a box otherwise returns without action unless `edit-visit` mode applies ([BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order")).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onObjectSelected`, `onMouseDown`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBee`, `updateDeleteButton`
- **Links:** [BEH-421](#beh-421-background-click-and-deselection "Background click and deselection"), [BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit"), [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [SEAM-402](view_seams.md#seam-402-overlay-boxes---selectioncontrol-selection-and-commit "Overlay boxes <-> SelectionControl (selection and commit)")

## BEH-421: Background click and deselection

A click on the empty canvas with no modifier, with no click mode active, does nothing in `onMouseDown`; Fabric clears the active object (`selection:cleared` -> `onObjectDeselected`), which removes the pending box if the last selected box still had status `new` (and refreshes the video), and updates `#deleteButton`. `defaultSelectedBee` is not cleared by this path (only by the explicit `deselectBee()`), so the previous ID is re-selected at the next hard refresh if a box with that ID exists. `deselectBee()` itself deactivates the Fabric objects, calls `updateForm(null)`, sets `defaultSelectedBee` to undefined, updates `#deleteButton` and triggers `tagselection:cleared` and `selection:cleared`. Every `onMouseDown` first pauses the video and clears the message area ([BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order")). `onObjectDeselected` was not re-read.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseDown`, `onObjectDeselected`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deselectBee`
- **Links:** [BEH-420](#beh-420-clicking-a-box-selects-it "Clicking a box selects it"), [BEH-402](#beh-402-hard-refresh-rebuilds-all-boxes-for-the-current-frame "Hard refresh rebuilds all boxes for the current frame"), [OQ-405](../../QUESTIONS.md#oq-405 "Clicking the background: deselect or keep the selected ID")

## BEH-422: Shift+click creates a box from the best prediction

Shift+click on the empty canvas (`onMouseDown_predict`) creates and immediately commits a new box. Steps: (1) click point in video coordinates; (2) interval = `[F - trackWindow.backward, F + trackWindow.forward]` clamped to `[0, nframes-1]`; (3) `predictIdFromObsMultiframe` finds the closest observation center in the interval within `predictIdClickRadius` (120 video px) over all IDs and frames ([BEH-423](#beh-423-id-prediction-rules "ID prediction rules")); if its ID already has a box in the current frame, `defaultIfIDExists` replaces the ID by the default new ID ([BEH-423](#beh-423-id-prediction-rules "ID prediction rules")); (4) `predictIdFromTags` finds the first tag of the current frame within 120 px of the click. Cases: (a) a tag found and the predicted observation has the same ID as the tag (loose `==`): the new box copies the position and size of the predicted observation (previous/next detection of the same bee, placed where that observation is, not at the click) and copies `bool_acts[0]` and `bool_acts[1]` (fanning, pollen); (b) a tag found otherwise: `newRectForTag(tag)` (box centered on the tag center, size = default size, angle from the tag orientation, ID = tag ID); (c) no tag but a predicted observation: box with the predicted size and the predicted ID, centered at the click, copying the same two flags; (d) neither: ID = the currently selected ID (`getCurrentID()`) if there is one and it is not yet used in this frame, else the default new ID; box of default size ([BEH-425](#beh-425-default-box-size "Default box size")) centered at the click. In (a) and (c) the angle of the predicted observation is not copied (`addRect` is called without angle and defaults to 0); in (b) it comes from the tag, in (d) it is 0. Labels and notes are not copied ([DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation")). The box is made active and `submit_bee()` stores it in `Tracks` ([BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)")); a conflicting ID prints "Conflict of ID" and nothing is stored.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseDown_predict`, `newRectForTag`, `addRect`, `predictIdFromObsMultiframe`, `predictIdFromTags`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`
- **Links:** [BEH-423](#beh-423-id-prediction-rules "ID prediction rules"), [BEH-424](#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively"), [BEH-425](#beh-425-default-box-size "Default box size"), [BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [OQ-401](../../QUESTIONS.md#oq-401 "Intended rules of Shift+click box prediction"), [OQ-409](../../QUESTIONS.md#oq-409 "What Shift+click prediction should copy"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts"), [DEBT-404](view_debt.md#debt-404-id-prediction-conflict-path-and-string-id-arithmetic "ID prediction conflict path and string ID arithmetic"), [DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation")

## BEH-423: ID prediction rules

`predictIdFromObsMultiframe(interval, pt)`: over all frames of the interval and all valid IDs, the observation whose box center is closest to `pt` (video coordinates) with distance < `overlay.opts.predictIdClickRadius` (120, not editable in the UI); result `{id, obs, reason: "distance", d, frame}` or `{id: undefined, reason: "notFound"}`. `defaultIfIDExists`: if the id is null returns a new default ID with reason `notFound`; if a box with that ID exists in the current frame returns `{id: default new ID, predicted_id, reason: "conflict"}` (no `obs`, so the predicted geometry is not reused); else the prediction unchanged. `computeDefaultNewID()`: the smallest non-negative integer not equal (loose `==`) to any ID of the current frame, returned as a string (`0` number if the frame has no ID). `predictIdFromTags`: first tag of the frame in object order with distance < 120. `predictIdFromTagsMultiframe`: closest tag over an interval.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `predictIdFromObsMultiframe`, `defaultIfIDExists`, `computeDefaultNewID`, `predictIdFromTags`, `predictIdFromTagsMultiframe`, `dist`
- **Links:** [BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [BEH-424](#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively"), [DEBT-403](view_debt.md#debt-403-dead-code-in-the-overlay-file "Dead code in the overlay file"), [DEBT-404](view_debt.md#debt-404-id-prediction-conflict-path-and-string-id-arithmetic "ID prediction conflict path and string ID arithmetic"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts")

## BEH-424: Ctrl+drag creates a box interactively

Ctrl+press on the empty canvas starts `onMouseDown_interactiveRect`: a new `status: "new"` box of size 1x1 is created at the press point, the ID is predicted like [BEH-423](#beh-423-id-prediction-rules "ID prediction rules") (closest observation in the track window, default new ID on conflict) and put in the ID field `#I`. While the mouse moves, width/height follow the pointer offset (client coordinates): the press point is the top-left corner, or the center if `resizeAroundCenter` is on (size = twice the offset). Any mouse move marks the box as validated. On release: if validated, negative sizes are fixed, geometry copied to the observation, the default size is updated to this size ([BEH-425](#beh-425-default-box-size "Default box size")), the box gets handles back, the form is updated and the box is committed via `submit_bee()`; if not validated (no movement) the box is removed, `deselectBee()` is called. Then `videoControl.refresh()`. The press point is read from `offsetX/Y` and the drag offsets from `clientX/Y` of the mouse events. During the drag width and height can be negative; they are fixed by `fixRectSizeAfterScaling` ([DEBT-410](view_debt.md#debt-410-interactive-creation-details "Interactive creation details")). The release handler was only partly re-read. The context menu with Ctrl is suppressed so Ctrl+click on macOS works.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseDown_interactiveRect`, `fixRectSizeAfterScaling`, `onMouseDown2`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`, `deselectBee`
- **Links:** [BEH-423](#beh-423-id-prediction-rules "ID prediction rules"), [BEH-425](#beh-425-default-box-size "Default box size"), [BEH-430](#beh-430-resize-around-center-option "Resize around center option"), [BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)"), [DEBT-410](view_debt.md#debt-410-interactive-creation-details "Interactive creation details"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-425: Default box size

New boxes without a source size use a default size stored as two module globals `default_width`, `default_height` (video pixels, initially 100 x 100) and converted to canvas pixels with the current zoom (`getDefaultRectSizeCanvas`). The default is updated (`updateDefaultSizeFromRect`, minimum 1) whenever a box is interactively created, moved, scaled or modified, because `fixRectSizeAfterScaling` calls it on every such event: the size of the last manipulated box becomes the default for the next created box. Not reset when changing video.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateDefaultSizeFromRect`, `getDefaultRectSizeCanvas`, `fixRectSizeAfterScaling`, `default_width`
- **Links:** [BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [BEH-424](#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively"), [BEH-429](#beh-429-moving-scaling-and-rotating-a-box "Moving, scaling and rotating a box")

## BEH-426: Click mode "New annotation"

Button "New annotation" (`overlayOpts-clickModeNewAnnotation`, default off). While on, a click on the empty canvas (any modifier except Alt; Alt still pans) calls `onMouseDown_predict` exactly like Shift+click ([BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction")) and then flashes the button yellow for 200 ms. A click on an existing box returns without creating (Fabric selects or drags it). Takes precedence over Shift+click and Ctrl+drag (Ctrl+drag is not available in this mode) and over "Select diff. time"; `edit-visit` mode is tested before it ([BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order")).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseDown`, `onMouseDown_predict`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `.overlayOpts-clickModeNewAnnotation`
- **Links:** [BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit"), [BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order")

## BEH-427: Click mode "Select diff. time"

Button "Select diff. time" (`overlayOpts-clickModeSelectMultiframe`, default off). While on, a no-modifier click on the empty canvas looks for a trajectory point near the click, over the track window `[F - backward, F + forward]` (not clamped): first among observations, only if `showObsTracks` is on (closest center within 120 px), else among tags (closest within 120 px), only if `showTagsTracks` or `showSelectedTagsTracks` is on. A hit calls `selectBeeByIDandFrame(id, frame)`: other frame -> `deselectBee()`, `defaultSelectedBee = id`, `seekFrame(frame)`; same frame -> `deselectBee()`, `selectBeeByID(id)`, `videoControl.refresh()`. No hit -> `deselectBee()` (clears `defaultSelectedBee`) and `videoControl.refresh()`.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseDown_selectMultiframe`, `predictIdFromObsMultiframe`, `predictIdFromTagsMultiframe`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByIDandFrame`, `deselectBee`
- **Links:** [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [BEH-444](#beh-444-tag-tracks-trajectory-of-tags "Tag tracks (trajectory of tags)"), [BEH-434](#beh-434-editing-the-bee-id "Editing the bee ID")

## BEH-428: Click mode "Auto centering"

Button "Auto centering" (`overlayOpts-clickModeAutoCentering`, default off). When on, every `gotoEvent(frame, id)` (chronogram click, event navigation: group [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation"); also the Goto buttons of the pick-frame panel, [BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel")) flashes the button for 200 ms and then calls `autoCentering(obs)`, with `obs` read by `getObsHandle(frame, id)` before the seek; `autoCentering` re-centers the zoomed view on the center of that observation (`canvasTransformCenter`, clamped to the video). If the observation does not exist nothing happens (console message). The option itself has no effect on box clicks.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `autoCentering`, `canvasTransformCenter`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
- **Links:** [BEH-407](#beh-407-canvas-to-video-coordinate-transform-and-its-clamping "Canvas to video coordinate transform and its clamping"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")

## BEH-429: Moving, scaling and rotating a box

Dragging a box moves it, dragging a corner handle resizes it (free aspect ratio; around the box center if `resizeAroundCenter`), dragging the top rotation handle rotates it ([BEH-431](#beh-431-box-angle-control "Box angle control")). During the gesture (`object:moving/scaling/rotating`) `onObjectMoving` turns the Fabric scale into width/height (`fixRectSizeAfterScaling`), copies the geometry into the box's own observation clone, redraws overlays and updates the form fields (X, Y, Width, Height, Center X/Y), and triggers the jQuery event `object:moving` on `overlay` (`zoomOverlay.selectionChanged` is bound to it in `init`, so the zoom view follows). `Tracks` is not touched during the gesture. At the end (`object:modified`) `onObjectModified` does the same (`fixRectSizeAfterScaling`, `updateRectObsGeometry`, `refreshOverlay`, `updateForm`), calls `automatic_sub()` and triggers `object:modified` on `overlay` (also bound to `zoomOverlay.selectionChanged`). `automatic_sub()`: if the box is committed (`db`) it calls `submit_bee()` (overwrite the observation in `Tracks`, `videoControl.refresh`, `refreshChronogram`); if pending (`new`) it only refreshes. There is no undo of moves (`undoPush("move")` is never called).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onObjectMoving`, `onObjectModified`, `fixRectSizeAfterScaling`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `automatic_sub`, `submit_bee`, `updateForm`
- **Links:** [BEH-418](#beh-418-box-and-observation-geometry-stay-in-sync "Box and observation geometry stay in sync"), [BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)"), [BEH-425](#beh-425-default-box-size "Default box size"), [SEAM-402](view_seams.md#seam-402-overlay-boxes---selectioncontrol-selection-and-commit "Overlay boxes <-> SelectionControl (selection and commit)"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")

## BEH-430: Resize around center option

Button "Resize around center" (`overlayOpts-resizeAroundCenter`, default off). On: box handle scaling in Fabric uses `centeredScaling` (the center stays fixed) and the Ctrl+drag creation uses the press point as center with size twice the pointer offset. Off: the opposite corner stays fixed.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `refreshRectStyle`, `onMouseDown_interactiveRect`
- **Links:** [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [BEH-424](#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively"), [BEH-413](#beh-413-box-rendering-style-and-handles "Box rendering style and handles")

## BEH-431: Box angle control

The "Bounding Box Angle" panel has three controls. "Disable Angle Control" (`guiAngle-disableAngle`, `overlay.guiAngle.angleEnabled` default true; the button is `active` when angles are disabled): when disabled, the rotation handle is hidden on all boxes (existing angles are kept and still drawn) and boxes created from a tag ([BEH-432](#beh-432-annotate-from-the-current-tag "Annotate from the current tag"), BEH-422b) get angle 0. "Reset angle to 0" sets `obs.angle = 0` of the selected box and commits it with `submit_bee()`. "Angle from tag" sets the selected box angle to `tagAngle` of the tag of the selected ID in the current frame (the tag attached to the observation, see [BEH-436](#beh-436-tag-lookup-for-a-bee "Tag lookup for a bee")) and commits; does nothing if there is no selection or no tag. The angle convention: `tagAngle = atan2(upx, -upy)` in degrees, with `up` the unit vector from tag corner 2 to tag corner 1 in canvas coordinates, i.e. 0 = tag top pointing up in the image, positive clockwise.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onClickDisableAngle`, `updateDisableAngleButton`, `onClickResetAngle`, `onClickAngleFromTag`, `tagAngle`, `tagUp`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `.guiAngle-disableAngle`
- **Links:** [BEH-413](#beh-413-box-rendering-style-and-handles "Box rendering style and handles"), [BEH-432](#beh-432-annotate-from-the-current-tag "Annotate from the current tag"), [BEH-436](#beh-436-tag-lookup-for-a-bee "Tag lookup for a bee"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

## BEH-432: Annotate from the current tag

Button "Annotate" (`#newRectForCurrentTag`) or `newRectForCurrentTag()`: creates a box for the tag of the currently selected ID (`defaultSelectedBee`) in the current frame: box centered on the tag center, default size ([BEH-425](#beh-425-default-box-size "Default box size")), angle from the tag orientation (0 if angle control disabled or no corners), ID = tag ID. It refuses with red messages: "No current tag selected" (no selected ID), "Current tag not visible in this frame. Try Next or Prev event" (no tag for that ID in this frame, looked up in `Tracks[F][id].tag`), "Current tag already annotated" (a box is active). The button is disabled (class `disabled`) when no ID is selected or a box is already active. The box is made active and committed with `submit_bee()`.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `newRectForCurrentTag`, `newRectForTag`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `getCurrentTag`, `getCurrentID`, `updateFormButtons`, `submit_bee`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#newRectForCurrentTag`
- **Links:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [BEH-431](#beh-431-box-angle-control "Box angle control"), [BEH-436](#beh-436-tag-lookup-for-a-bee "Tag lookup for a bee"), [BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)")

## BEH-433: Committing a box (`submit_bee`)

`submit_bee()` takes no argument (callers that pass the box are ignored) and works on the Fabric active object. Refusals: no active box -> "No bee selected" (red), returns false; a `new` box whose ID already has an observation in the current frame -> "Conflict of ID: bee X already exists in this frame." (red), returns false, nothing written; a `db` box with no stored observation -> logs "Writing anyway" but shows "Internal issue. See console.log" (red) and returns true without writing. Otherwise it sets `obs.ID` of the clone to the box ID and writes the clone to `Tracks[frame][ID]` (`storeObs`/`copyObs` into the existing or a created observation), sets the box status to `db`, then `videoControl.refresh()` and `refreshChronogram()` (`storeObs(tmpObs)`, whose body was not re-read, then `status = "db"`, `videoControl.refresh()`, `refreshChronogram()`); on success the function returns undefined, on refusal false, in the "Internal issue" case true. `copyObs` does not copy `span`, `predicted` or `tag`, so those stay as stored. A new box's observation (created by `addRect` with status `new` from `new Observation(id)`, whose defaults are `notes` "", `labels` "", `angle` 0, `bool_acts` four false) gets `frame` and `time` from the current video position, its geometry from the canvas rectangle converted to video pixels, `angle` from the argument (0 if absent), and `updateObsActivityFromForm(obs)` is applied ([BEH-448](#beh-448-labels-and-activity-flags-kept-in-sync-by-form-helpers "Labels and activity flags kept in sync by form helpers"), [OQ-407](../../QUESTIONS.md#oq-407 "Notes inheritance when creating a box")).

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`, `automatic_sub`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `storeObs`, `copyObs`, `Observation`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `addRect`, `updateObsActivityFromForm`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [BEH-429](#beh-429-moving-scaling-and-rotating-a-box "Moving, scaling and rotating a box"), [DEBT-405](view_debt.md#debt-405-submit_bee-failures-are-silent-or-misreported "submit_bee failures are silent or misreported"), [DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation"), [OQ-407](../../QUESTIONS.md#oq-407 "Notes inheritance when creating a box")

## BEH-434: Editing the bee ID

The handler `onKeyDown_IDEdit` reacts to the Enter key in the field `#I` (declared in the page as `onkeypress="onKeyDown_IDEdit(event)"`, type text) and applies the typed ID to the active box (nothing happens without an active box). For a `new` box: `activeObject.id` is set to the typed ID, `submit_bee(activeObject)` is called with its return value ignored, `defaultSelectedBee` is set to the new ID and the green message "ID changed + submitted" is shown. If `submit_bee` refused because the ID already exists in the frame (red "Conflict of ID" message), the box keeps the attempted ID but is not stored, the green message replaces the red one and `defaultSelectedBee` is still set: the user is told it succeeded ([DEBT-405](view_debt.md#debt-405-submit_bee-failures-are-silent-or-misreported "submit_bee failures are silent or misreported"), [OQ-408](../../QUESTIONS.md#oq-408 "ID edit on a new box that conflicts with an existing ID")). For a committed (`db`) box: `changeObservationID(frame, old, new, change_id_force)` is called, with `change_id_force = 'swap'` set in `init` (the stored observation is moved to the new ID in the current frame only and its `ID` field updated; with force `'swap'` an observation already at the new ID takes the old ID, otherwise it would be overwritten; it returns false, with no change, when the old and new IDs are equal, the frame has no observations or the old ID does not exist); on success `activeObject.id` and `defaultSelectedBee` become the new ID and "ID changed succesfully!" is shown (green), on failure "ID not changed" (orange); in both cases `videoControl.refresh()` and `refreshChronogram()` follow. The global keys that focus and leave the field are in [BEH-454](#beh-454-keyboard-handling-on-the-left-panel-text-fields-id-focus-delete "Keyboard handling on the left panel (text fields, ID focus, delete)"), the separate `newid` field in [BEH-453](#beh-453-new-id-field-of-the-active-box "New-ID field of the active box").

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_IDEdit`, `init`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `changeObservationID`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `submit_bee`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#I`
- **Links:** [BEH-433](#beh-433-committing-a-box-submit_bee "Committing a box (`submit_bee`)"), [BEH-453](#beh-453-new-id-field-of-the-active-box "New-ID field of the active box"), [BEH-454](#beh-454-keyboard-handling-on-the-left-panel-text-fields-id-focus-delete "Keyboard handling on the left panel (text fields, ID focus, delete)"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts"), [OQ-408](../../QUESTIONS.md#oq-408 "ID edit on a new box that conflicts with an existing ID"), [DEBT-405](view_debt.md#debt-405-submit_bee-failures-are-silent-or-misreported "submit_bee failures are silent or misreported")

## BEH-435: Delete a box and undo the deletion

The button `#deleteButton` ("Delete", class `disabled` when nothing is active) and the keys Delete, Backspace and `d` (outside text fields, [BEH-454](#beh-454-keyboard-handling-on-the-left-panel-text-fields-id-focus-delete "Keyboard handling on the left panel (text fields, ID focus, delete)")) call `deleteSelected()`: the active box is removed from the Fabric canvas and the observation is deleted from `Tracks[currentFrame][id]` (`deleteEvent`), a copy is pushed on the undo stack, and views refresh. The button `#undoButton` ("Undo", relabelled "Undelete <ID>" or "Undelete <ID> in frame <F>") restores the last deleted observation (re-stores it, seeks its frame if different, re-creates and selects the box). Only deletions are undoable; moves, creations and ID changes are not (`undoPop` pops the entry and logs "Undo <action>: not implemented" for any other action, and logs an error on an empty stack). `deleteSelected` itself does nothing when there is no active box. The stack is in memory and is not cleared on video change. Deletion of a box with no `Tracks` entry (pending `new` box) only removes the box.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteSelected`, `deleteEvent`, `undoAction`, `undoPush`, `undoPop`, `updateUndoButton`, `updateDeleteButton`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#deleteButton`, `#undoButton`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts")

## BEH-436: Tag lookup for a bee

`getTag(frame, id)` returns the tag attached to the observation `Tracks[frame][id].tag` (the `tag` runtime field attached by the processing code, [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")). The branch reading `Tags[frame].tags` by id exists but is only reached if the global `tagMode` is not `'Tracks'`; `tagMode` is initialised to `'Tracks'` at the top of `OverlayControl.js` and never reassigned. `getCurrentTag()` is the tag of the selected ID in the current frame.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `getTag`, `tagMode`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `getCurrentTag`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-402](view_debt.md#debt-402-dead-tags-branch-of-gettag-and-global-tagmode "Dead `Tags` branch of `getTag` and global `tagMode`"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## BEH-437: Tags of the current frame

With `showTags` on, `plotTags` draws every tag of `Tags[currentFrame]` that passes the sample filter ([BEH-444](#beh-444-tag-tracks-trajectory-of-tags "Tag tracks (trajectory of tags)")), via `plotTag`. A tag is a circle of radius 5 stroked in a color by Hamming distance: `0` -> `#ff0000`, `2` -> `#ff6000`, any other value (including 1 and >=3) -> `#ffb000`; under it the tag ID and `H<hamming>` in 10px Arial. If `showTagsOrientation` is on, the current-frame tag also gets an orientation segment ([BEH-439](#beh-439-tag-orientation-arrow "Tag orientation arrow")). It also writes into `#tagDetails` the full unfiltered list of tags for the frame, one per line `"<id> H<hamming> (<cx>,<cy>)"`; when the frame has no entry in `Tags` the text is left unchanged. Tags positions come from `tag.c` (center) in video pixels.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTags`, `plotTag`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#tagDetails`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-438](#beh-438-selected-tag-marker "Selected tag marker"), [BEH-439](#beh-439-tag-orientation-arrow "Tag orientation arrow"), [BEH-444](#beh-444-tag-tracks-trajectory-of-tags "Tag tracks (trajectory of tags)")

## BEH-438: Selected tag marker

If the tag ID equals the selected ID (`defaultSelectedBee`) and the tag belongs to the current frame, it is drawn by marker style `overlay.tagMarker`, chosen in `#selectboxTagMarker` ("Tag style"; options `quad`, `cross`, `circle`; default `quad`): `quad` strokes the four tag corners `tag.p` in green `#00FF00` width 2 (the case of a tag without corners was not re-read); `cross` draws a 40 px cross; `circle` a green radius-10 circle, width 2; any other marker value draws a green circle of the tag radius, width 4. Changing the selector triggers `hardRefresh`. With `showTagsOrientation` the orientation arrow (green) replaces the marker. A tag of the selected ID in another frame (part of a track) is drawn as a circle of the tag radius stroked in the track color, width 3; a second path (radius + 2, yellow, width 3) is built but never stroked ([DEBT-401](view_debt.md#debt-401-plottag-leaves-the-canvas-state-unbalanced "plotTag leaves the canvas state unbalanced")).

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTag`, `selectboxTagMarkerInit`, `selectboxTagMarkerUpdate`, `selectboxTagMarkerChanged`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#selectboxTagMarker`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-437](#beh-437-tags-of-the-current-frame "Tags of the current frame"), [DEBT-401](view_debt.md#debt-401-plottag-leaves-the-canvas-state-unbalanced "plotTag leaves the canvas state unbalanced")

## BEH-439: Tag orientation arrow

With `showTagsOrientation`, `plotTagOrientation` draws, for each current-frame tag (magenta; green for the selected one), a line through the tag center of half-length 40 px along the tag "up" direction (from corner 2 to corner 1), with one arrowhead barb at 35 px, dashed `[4,4]` if Hamming > 2. Skipped if the tag has no corners `p`.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTagOrientation`, `tagUp`, `tagCorners`
- **Links:** [BEH-431](#beh-431-box-angle-control "Box angle control"), [BEH-437](#beh-437-tags-of-the-current-frame "Tags of the current frame"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

## BEH-440: Interaction modes main, pick-frame and edit-visit

`overlay.interaction = {mode, opts}` with `mode` one of `main` (default), `pick-frame`, `edit-visit`. `setInteractionMode(mode, opts)`: `main` stores the mode and `opts`; `pick-frame` (entered by the "Set Span" button through `modifyCurrentObsSpan('setspan')`, [BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel")) needs an active box with an `obs`, otherwise it is cancelled with a console message and returns without refreshing; else it stores the mode, `opts.obs` (the box clone), `opts.id`, `opts.frame` (current frame) and `opts.showTimeline = false`; `edit-visit` stores the mode and `opts` (`{}` if absent); any other mode logs "MODE NOT IMPLEMENTED". It then calls `refreshInteraction` (marks the `.setspan` / `.edit-visit` buttons `active`) and `hardRefresh`. In `hardRefresh`, mode `pick-frame` selects the box of the picked ID (`selectBeeByID(opts.id)`) instead of `defaultSelectedBee`, builds the span panel ([BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel")) and, if the observation `Tracks[frame][id]` no longer exists, falls back to `main`; modes `edit-visit` and `main` select `defaultSelectedBee`. In `edit-visit`, `onMouseDown` hands a clicked box to the visit widget when a pick mode (`pollinator` or `flower`) is active, and any click when no pick mode is active returns to `main` ([BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order")). Mode `pick-frame` has no special case in `onMouseDown`. The visit widget semantics are in [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits").

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `setInteractionMode`, `refreshInteraction`, `hardRefresh`, `onMouseDown`, `VisitWidget`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `modifyCurrentObsSpan`
- **Links:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel"), [BEH-457](#beh-457-mouse-down-dispatch-order "Mouse-down dispatch order"), [SEAM-404](view_seams.md#seam-404-interaction-modes-and-widgets-group-6-boundary "Interaction modes and widgets (group 6 boundary)"), [OQ-404](../../QUESTIONS.md#oq-404 "Owner of the pick-frame (Set Span) mode"), [OQ-412](../../QUESTIONS.md#oq-412 "Leaving the visit edit mode by clicking")

## BEH-441: Experimental timeline around the selected event

Button "Draw timeline (Experimental)" (`overlay.drawTimelineCurrentObject()`): pauses the video, prints "Paused, need to preload video frames", preloads the frames `-16, -8, -4, -2, -1, 0, 1, 2, 4, 8, 16` through `videoCache.preloadFrames` (these offsets are passed as absolute frame numbers, [DEBT-414](view_debt.md#debt-414-experimental-timeline-preloads-the-wrong-frames "Experimental timeline preloads the wrong frames")), then prints "Preload done", calls `overlay.hardRefresh()`, prints "Timeline:<br>" and, for each of the 11 offsets in turn, calls `getFrameCropCurrentObject(offset, undefined, 200)`. The selection is checked only inside that function: with no active box it prints "Timeline: please select an annotation" and returns, once per offset (11 times), after the pause and preload have happened; a box without `obs` prints "Timeline: annotation missing obs internal data. Try changing frame". With a box, each call appends to `#alerttext` a div "Frame N" (N = box frame + offset) with a square crop of the video centered on the box center, of side 4 x max(width, height), displayed at 200 px; for N < 0 the image is empty.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `drawTimelineCurrentObject`, `getFrameCropCurrentObject`
- **Links:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [SEAM-404](view_seams.md#seam-404-interaction-modes-and-widgets-group-6-boundary "Interaction modes and widgets (group 6 boundary)"), [DEBT-414](view_debt.md#debt-414-experimental-timeline-preloads-the-wrong-frames "Experimental timeline preloads the wrong frames"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")

## BEH-442: Observation tracks (trajectory of boxes)

With `showObsTracks` (default on), `plotTracks` draws, for every bee ID that has a box anywhere in the track window (`getWindow()`: `[F - backward, F + forward]` clamped to `[0, maxframe]`), a polyline through the box centers of consecutive frames of the window. Segments after a missing frame are dashed `[10,10]`, other segments solid width 1. Colors fade linearly with the distance to the current frame F: past (`f <= F`) alpha `1 - (F-f)/(F - fmin + 1)`, future alpha `1 - (f-F)/(fmax - F + 1)` (the farthest frame of the window keeps alpha `1/(span+1)`, never 0); for the selected ID past red `rgba(255,0,0,a)` and future green `rgba(0,128,0,a)`; for the others past `rgba(255,0,128,a)` and future `rgba(0,128,128,a)` (the selected-ID future color was not re-read). A dot of radius 3 with the ID (10px) is drawn at every observation of the window except the current frame when `showObs` is on (the box itself marks it); the current frame dot is yellow; under each dot the activity letters (F, P, E, L from `bool_acts`: fanning, pollen, entering, leaving) at 8px. The window contents are reread from `Tracks` at each refresh, so a box being dragged does not move its track until committed.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTracks`, `paintDot`, `activityString`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getWindow`
- **Links:** [BEH-443](#beh-443-track-window-focus-interval "Track window (focus interval)"), [BEH-410](#beh-410-display-checkboxes-and-their-initial-state "Display checkboxes and their initial state"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-443: Track window (focus interval)

The track window is the interval of frames around the current frame used to draw tracks, to look for clicks in "Select diff. time", to predict IDs, and (shared with [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")) to draw the track-window span in the chronogram. State `overlay.trackWindow = {range, direction, forward, backward}`, initial `{range: 10, direction: "Backward", forward: 0, backward: 10}`. Inputs: `#trackWindow` (frames, text; `onTrackWindowChanged` on change) and `#selectboxTrackDir` (`Bidirectional` forward=backward=range; `Forward` forward=range, backward=0; `Backward` forward=0, backward=range). `onTrackWindowChanged` also triggers the jQuery event `trackWindow:change` on `overlay` and refreshes the video (skipped when called with `skipRefresh`, as during `init`). Buttons: `1s`/`10s`/`1m` = `setTrackWindow(20/200/1200)` frames; `win-` / `win+` = `scaleTrackWindow(0.5/2)` (`ceil(L*factor)`, minimum 0, NaN -> 1); the step buttons `shiftTrackWindow(-0.75/+0.75)` seek to `round(frame + factor*L)`. The number is not validated (a non-number stays NaN). The "Follow" toggle (`#focusTrackWindow`, `onClickFocusTrackWindow`) binds the chronogram X domain to `[F - backward, F + forward]` on every `trackWindow:change`; "Video" (`onClickFocusVideo`) unbinds and resets the chronogram domain to the video.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onTrackWindowChanged`, `setTrackWindow`, `scaleTrackWindow`, `shiftTrackWindow`, `onClickFocusTrackWindow`, `onClickFocusVideo`, `setFocusTrackWindow`, `focusTrackWindow`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `init`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#trackWindow`, `#selectboxTrackDir`, `#focusTrackWindow`
- **Links:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window"), [BEH-442](#beh-442-observation-tracks-trajectory-of-boxes "Observation tracks (trajectory of boxes)"), [BEH-427](#beh-427-click-mode-select-diff-time "Click mode 'Select diff. time'"), [BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [SEAM-405](view_seams.md#seam-405-track-window-shared-with-the-chronogram "Track window shared with the chronogram")

## BEH-444: Tag tracks (trajectory of tags)

With `showTagsTracks` ("All tag tracks") the tracks of all tags are drawn from `ttags` (index `ttags[tagId][frame]`, built by the chronogram code) over the track window: consecutive detections less than or equal to 40 frames apart are joined by a line with an arrowhead at the later point; the line is solid width 2 when the gap is 1 frame and Hamming < 1000, otherwise width 1 at half alpha. Color depends on the signed time distance to the current frame F: `rgba(round(255*(1-S)), 0, round(255*S), T)` with `S = (f-F)/(2*frange) + 0.5` (not clamped; `S = 0.5` at the current frame, which is therefore purple; red at `f = F - frange`, blue at `f = F + frange`) and `T = max(0, 1 - |f-F|/frange) * alpha`, where `frange` is the larger of `F - fmin` and `fmax - F`. With a one-sided window (default Backward) only half of the S range is used. A window of 0 frames makes `frange` 0 and the color NaN. With `showSelectedTagsTracks` ("Selected track") the same is drawn from `Tags[f]` for the tag with id = `defaultSelectedBee`, in a yellow-green palette. Each point is drawn with `plotTag` (no ID text) with radius `alpha + 1`. Only tags that pass the sample filter ([BEH-445](#beh-445-tag-sample-filter-composition "Tag sample filter composition")) appear. When both options are on the selected tag track is drawn twice.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `plotTagsTracks`, `plotTrackArrow`, `plotTag`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getTTags`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-443](#beh-443-track-window-focus-interval "Track window (focus interval)"), [BEH-445](#beh-445-tag-sample-filter-composition "Tag sample filter composition"), [CAP-801](view_capabilities.md#cap-801-filters "Filters")

## BEH-445: Tag sample filter composition

All tag displays ([BEH-437](#beh-437-tags-of-the-current-frame "Tags of the current frame"), [BEH-444](#beh-444-tag-tracks-trajectory-of-tags "Tag tracks (trajectory of tags)")) and the chronogram use `tagsSampleFilter(tag)`, rebuilt by `refreshTagsParameters` as the AND, in this order, of: Hamming filter (`chronoFilter('H0'|'H1'|'H2'|'Hall')` -> `hamming == 0`, `<= 1`, `<= 2`, all), ROI ([BEH-446](#beh-446-region-of-interest-and-exclusion-rectangles "Region of interest and exclusion rectangles")), exclusion rectangles ([BEH-446](#beh-446-region-of-interest-and-exclusion-rectangles "Region of interest and exclusion rectangles")), minimum DM (`#tagsMinDM`, if > 0: `!tagsHaveDM || tag.dm >= min`), the RGB filter (active only when `#tagsUseRgbFilter` has the class `active`: a tag without `rgb_mean` is kept, otherwise it is kept when `(B - Y)/Y - (R - Y)/Y < 0.35` with `Y = 0.299R + 0.587G + 0.1114B`), and a user JavaScript body typed in `#tagsSampleFilter` (default `return true`) compiled with `Function("tag", text)`. Any parameter change calls `onTagsParametersChanged`: `refreshTagsParameters`, `refreshChronogram`, `videoControl.refresh`. The semantics of these filters belong to [CAP-801](view_capabilities.md#cap-801-filters "Filters"); this behavior records that the overlay reads the same filter and executes user-typed code. The interval and ID filters are in [BEH-455](#beh-455-interval-and-id-filters-filter-presets "Interval and ID filters, filter presets").

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `refreshTagsParameters`, `onTagsParametersChanged`, `chronoFilter`, `tagsSampleFilter`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#tagsSampleFilter`, `#tagsMinDM`, `#tagsUseRgbFilter`
- **Links:** [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [BEH-455](#beh-455-interval-and-id-filters-filter-presets "Interval and ID filters, filter presets"), [SEAM-406](view_seams.md#seam-406-tag-filters-and-display-flags-shared-with-the-chronogram "Tag filters and display flags shared with the chronogram"), [DEBT-411](view_debt.md#debt-411-user-typed-javascript-executed-with-function-odd-color-coefficient "User-typed JavaScript executed with Function(); odd color coefficient")

## BEH-455: Interval and ID filters, filter presets

`refreshTagsParameters` also builds `tagsIDFilter = Function("idinfo", text of #tagsIDFilter)` (compiled at each rebuild) and `tagsIntervalFilter(interval)`, a closure that compiles `Function("interval", text of #tagsIntervalFilter)` on every call and returns `interval.end - interval.begin >= minLength && fun(interval)`, where `minLength = Number(#tagsIntervalFilterMinLength)` was read at the last rebuild. The chronogram pipeline uses these two. The select `#tagsIntervalFilterSelect` offers presets: `onTagsParametersSelectChanged` copies its value into `#tagsIntervalFilter` and calls `onTagsParametersChanged`. The sample filter text is compiled first, so a syntax error there aborts the rebuild before the other filters are updated and before the refresh; a syntax error in the interval text only surfaces when the chronogram calls the filter. The chronogram display checkboxes are [BEH-447](#beh-447-chronogram-display-toggles-handled-by-the-overlay-module "Chronogram display toggles handled by the overlay module").

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `refreshTagsParameters`, `onTagsParametersSelectChanged`, `tagsIntervalFilter`, `tagsIDFilter`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#tagsIntervalFilter`, `#tagsIntervalFilterMinLength`, `#tagsIDFilter`
- **Links:** [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [BEH-445](#beh-445-tag-sample-filter-composition "Tag sample filter composition"), [BEH-447](#beh-447-chronogram-display-toggles-handled-by-the-overlay-module "Chronogram display toggles handled by the overlay module"), [SEAM-406](view_seams.md#seam-406-tag-filters-and-display-flags-shared-with-the-chronogram "Tag filters and display flags shared with the chronogram"), [DEBT-411](view_debt.md#debt-411-user-typed-javascript-executed-with-function-odd-color-coefficient "User-typed JavaScript executed with Function(); odd color coefficient")

## BEH-446: Region of interest and exclusion rectangles

ROI: text field `#ROI` (`"left,top,right,bottom"` in video pixels, default `175,250,2305,1240`, the Gurabo 5 MP setup), button `#useROI` ("Apply", off at start) toggles it, "Reinit" (`updateROIFromVideo`) resets it to the full video size. A malformed value (not 4 comma-separated numbers) is ignored with a console error. When on, tags outside the ROI are filtered ([BEH-445](#beh-445-tag-sample-filter-composition "Tag sample filter composition")) and `plotROI` draws a white outline plus a 50 % white mask outside it. Exclusion rectangles: list of `{cx, cy, w, h}` (video pixels, 4 defaults at the corners of the Gurabo videos), toggle `#useExcludeRects` (off at start); when on, tags whose center lies strictly inside a rectangle (half-size test `<`) are filtered, and rectangles are drawn yellow `#fd0` with a 50 % orange fill. Buttons: "Add" (`onClickExcludeRectAdd`) takes the box of the selected annotation as a new exclusion rectangle `{cx: x + w/2, cy: y + h/2, w, h}` from the unrotated `x, y, width, height` (the angle is ignored) and then deletes that annotation (`deleteSelected`, undoable once), "Next" cycles the highlighted rectangle (`-1`, `0..n-1`, `-1`; highlighted with a white 2 px outline), `#excludeRectDeleteButton` removes the highlighted one (disabled when none), "Params" opens a modal JSON editor of the list (OK parses with `JSON.parse`, no error handling). Each exclusion-rectangle change calls `excludeRectsChanged`, which updates `#excludeRectDeleteButton`, calls `onTagsParametersChanged` (which already refreshes chronogram and overlay) and then `refreshChronogram` and `videoControl.refresh` again (double refresh).

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onClickROI`, `ROIChanged`, `updateROIFromVideo`, `onROITextChanged`, `plotROI`, `onClickExcludeRects`, `excludeRectsChanged`, `onClickExcludeRectAdd`, `onClickExcludeRectDelete`, `onClickExcludeRectNext`, `openExcludeRectsDialog`, `initExcludeRectsDialog`, `plotExcludeRects`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#ROI`, `#useROI`, `#useExcludeRects`, `#excludeRectDeleteButton`
- **Links:** [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [BEH-445](#beh-445-tag-sample-filter-composition "Tag sample filter composition"), [BEH-435](#beh-435-delete-a-box-and-undo-the-deletion "Delete a box and undo the deletion"), [OQ-406](../../QUESTIONS.md#oq-406 "Hard-coded ROI and exclusion rectangles"), [OQ-413](../../QUESTIONS.md#oq-413 "Exclusion rectangle created from an annotation"), [DEBT-407](view_debt.md#debt-407-module-state-held-in-implicit-globals "Module state held in implicit globals")

## BEH-447: Chronogram display toggles handled by the overlay module

`onChronoParametersChanged` (checkboxes `#showTagsChrono` "Show Tags" and `#showObsChrono` "Show Events") copies the two checkboxes into the globals `showTagsChrono`, `showObsChrono` and calls `refreshChronogram`. The globals are read by the chronogram code ([CAP-300](view_capabilities.md#cap-300-temporal-display-and-navigation "Temporal display and navigation")); the function only lives in the overlay file.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onChronoParametersChanged`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#showTagsChrono`, `#showObsChrono`
- **Links:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [CAP-304](view_capabilities.md#cap-304-tag-display "Tag display"), [SEAM-406](view_seams.md#seam-406-tag-filters-and-display-flags-shared-with-the-chronogram "Tag filters and display flags shared with the chronogram")

## BEH-448: Labels and activity flags kept in sync by form helpers

The form-to-observation helpers shared with the label buttons: `updateObsActivityFromForm(obs)` copies `hasLabel(obs, "fanning"|"pollen"|"entering"|"leaving")` into `obs.bool_acts[0..3]` and the `#notes` text into `obs.notes`; `setLabels(rect, labels)` normalises a label string (`toLabelArray`/`toLabelString`), writes `obs.labels`, refreshes `bool_acts` the same way and the form. Used by the label buttons and by new box creation; the box text ([BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box")) reads `obs.labels` while track dots ([BEH-442](#beh-442-observation-tracks-trajectory-of-boxes "Observation tracks (trajectory of boxes)")) read `bool_acts`.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `updateObsActivityFromForm`, `setLabels`, `updateRectObsActivity`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `toLabelArray`, `hasLabel`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-006](../../QUESTIONS.md#oq-006 "Label semantics"), [DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")

## BEH-449: Skeleton drawn on the boxes

When `zoomOverlay.flagShowParts` is true (toggle in the zoom panel, default false), each rendered box draws the keypoints of its observation `obs.parts` (list of `{label, posFrame}` with `posFrame` in video pixels): a 7x7 px square outline (`rect(x-3, y-3, 7, 7)`, spanning x-3..x+4) at the keypoint, colored by `zoomOverlay.labelList.get(label)` (fallback entry `__default`, then black), and a line from the box center to the keypoint. Positions are absolute in the frame: moving or rotating the box does not move the keypoints. Nothing is drawn for observations without `parts`, or when `showObs` is off (the boxes are not rendered then). The drawing also writes the box center into `this.cx`, `this.cy` of the Fabric object.

- **Group:** [CAP-403](view_capabilities.md#cap-403-skeleton-overlay "Skeleton overlay")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect`, `_drawParts`, `_colormapping`
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `flagShowParts`, `labelList`
- **Links:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling"), [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [SEAM-407](view_seams.md#seam-407-skeleton-drawing-on-boxes-group-5-boundary "Skeleton drawing on boxes (group 5 boundary)")

## BEH-450: Pick-frame span panel

Entering `pick-frame` ([BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit")) is done by `modifyCurrentObsSpan('setspan')` from the "Set Span" button: it needs a selected box (else a console message) and an observation found in `flatTracksAll` (else it returns silently); if the stored observation has no `span` it first writes `span = {f1, f2}` copied from that track, then switches mode. While in `pick-frame`, every `hardRefresh` writes `span = {f1: frame, f2: frame}` into the stored observation in `Tracks` if it has none, and fills `#pickframediv` with "PICK FRAME: setting timespan for ID=<id> at frame=<frame>: " and buttons: "Set Start" and "Set End" (set `span.f1` / `span.f2` to the current video frame, no ordering check, then `overlay.hardRefresh()` and `refreshChronogram()`), "CLOSE" (writes "Pick frame CLOSED" in the panel and returns to `main`), "Goto Start", "Goto Event", "Goto End" (`gotoEvent` with `span.f1`, the observation frame, `span.f2`), then the timeline buttons ([BEH-451](#beh-451-pick-frame-timeline-buttons-and-options "Pick-frame timeline buttons and options")) and "Pick Flower" ([BEH-452](#beh-452-pick-flower "Pick Flower")). The panel is rebuilt at every hard refresh. A function `doSwap2` is defined in the same scope but attached to no button.

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `hardRefresh`, `setInteractionMode`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `modifyCurrentObsSpan`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#pickframediv`
- **Links:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [BEH-428](#beh-428-click-mode-auto-centering "Click mode 'Auto centering'"), [BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit"), [BEH-451](#beh-451-pick-frame-timeline-buttons-and-options "Pick-frame timeline buttons and options"), [BEH-452](#beh-452-pick-flower "Pick Flower"), [DEBT-412](view_debt.md#debt-412-hardrefresh-does-too-much "hardRefresh does too much"), [OQ-404](../../QUESTIONS.md#oq-404 "Owner of the pick-frame (Set Span) mode")

## BEH-451: Pick-frame timeline buttons and options

In the pick-frame panel, "Show Timeline" toggles `interaction.opts.showTimeline` (initially false, reset on each entry), marks the button `active`, and draws the timeline with `drawTimelinePickFrameMode()` into `#pick-frame-timeline` or empties that div. The buttons act on `overlay.opts` and redraw the timeline if it is shown: "Zoom+" / "Zoom-" multiply `timelineZoom` (default 4.0) by `1/1.5` / `1.5`; "Size+" / "Size-" multiply `timelineDisplaySize` (default 300) by `1.5` / `1/1.5`, rounded and clamped to 50..1000; "Frames+" / "Frames-" add 1 / -1 to `timelineMaxDelta` (default 3), clamped to 1..10. `drawTimelinePickFrameMode` pauses the video, aborts unless the mode is `pick-frame` and the observation `Tracks[opts.frame][opts.id]` exists (message "Timeline: didn't find annotation to pick frame for"), and shows for each delta in `-timelineMaxDelta..+timelineMaxDelta` around the current video frame (not the event frame) a crop of the video centered on the event box, of side `max(width, height) * timelineZoom` and displayed at `timelineDisplaySize` px, labelled "Frame N" with "Current ", " Event", " Start", " End" when it is the current frame, the event frame, `span.f1` or `span.f2`; clicking a crop calls `gotoEvent(frame, id)`. The separate `TimelineWidget` class (`#timelineblockdiv`, deltas -3..+3, display size 200, buttons Zoom+/-, Size+/-) is [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"); its Zoom buttons act on an undefined `this.zoom` and its `update()` empties the container ([DEBT-413](view_debt.md#debt-413-timelinewidget-zoom-and-size-buttons-are-broken "TimelineWidget zoom and size buttons are broken")).

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `drawTimelinePickFrameMode`, `hardRefresh`, `TimelineWidget`
- **Links:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [BEH-428](#beh-428-click-mode-auto-centering "Click mode 'Auto centering'"), [BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel"), [SEAM-404](view_seams.md#seam-404-interaction-modes-and-widgets-group-6-boundary "Interaction modes and widgets (group 6 boundary)"), [DEBT-413](view_debt.md#debt-413-timelinewidget-zoom-and-size-buttons-are-broken "TimelineWidget zoom and size buttons are broken"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")

## BEH-452: Pick Flower

The pick-frame panel button "Pick Flower" calls `pickFlowerButtonCallback`: it toggles `interaction.opts.showPickFlower`, marks `.button-showPickFlower` active, and either calls `drawImagePickFlowerMode()` or empties `#pickflowerdiv`. The drawing pauses the video, aborts unless the mode is `pick-frame` and the event observation exists, creates `visit = {}` on the stored observation if absent, and appends to `#pickflowerdiv` a canvas showing the crop of the event frame centered on the event box (side `max(width, height) * timelineZoom`, displayed at `timelineDisplaySize` px) with a "No visit" button. The candidate flowers are the observations of `Tracks[0]` whose ID starts with `F`, drawn as dots with their ID (green if it is the current `visit.flowerid`). Moving the mouse over the crop highlights the closest flower center within 200 video pixels; clicking sets `visit.flowerid` of the stored event observation to that flower ID (nothing if none within 200 px) and redraws the crop and the flower boxes on the main canvas; "No visit" sets `visit.flowerid` to undefined and redraws the crop; leaving the crop redraws it. The edits go directly into the stored observation in `Tracks` ([DEBT-415](view_debt.md#debt-415-pick-flower-reads-flowers-from-frame-0-and-edits-tracks-directly "Pick Flower reads flowers from frame 0 and edits Tracks directly")).

- **Group:** [CAP-400](view_capabilities.md#cap-400-overlay-display-and-annotations "Overlay display and annotations")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `pickFlowerButtonCallback`, `drawImagePickFlowerMode`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#pickflowerdiv`
- **Links:** [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [BEH-450](#beh-450-pick-frame-span-panel "Pick-frame span panel"), [DEBT-415](view_debt.md#debt-415-pick-flower-reads-flowers-from-frame-0-and-edits-tracks-directly "Pick Flower reads flowers from frame 0 and edits Tracks directly"), [OQ-410](../../QUESTIONS.md#oq-410 "Status of the timeline and Pick Flower features")

## BEH-453: New-ID field of the active box

In the field `#newid`, Enter (`onKeyDown_NewIDEdit`, keyCode 13) acts on the active box (nothing without one). An empty text becomes `undefined`. The clone's `obs.newid` is set to it; if it is not null, `obs.fix.newid` is set too (`obs.fix` created as `{newid: undefined}` if missing) and, if the observation lacks the label `wrongid`, `updateObsLabel(obs, "wrongid", true)` adds it. Clearing the field sets `obs.newid` to undefined but does not remove the `wrongid` label or `obs.fix.newid`. Then a `new` box is committed with `submit_bee(activeObject)`, a `db` box with `storeObs(obs)`; `overlay.hardRefresh()`, `refreshChronogram()` and `updateForm(activeObject)` follow. The display of the result is [BEH-416](#beh-416-wrong-id-display "Wrong-ID display").

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown_NewIDEdit`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `storeObs`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#newid`
- **Links:** [BEH-416](#beh-416-wrong-id-display "Wrong-ID display"), [BEH-434](#beh-434-editing-the-bee-id "Editing the bee ID"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-405](view_debt.md#debt-405-submit_bee-failures-are-silent-or-misreported "submit_bee failures are silent or misreported")

## BEH-454: Keyboard handling on the left panel (text fields, ID focus, delete)

`onKeyDown` is bound by `init` to keydown on `#left-side` (made focusable with `tabindex` 0). Rules, in order: if the target is a `textarea`, a `select` or an input of type text, Escape moves focus to `#left-side` and calls `updateForm(activeObject)` (restoring the form from the active box), and every other key is only stopped from propagating (no global shortcut runs while typing). Otherwise: Delete, Backspace and `d` call `deleteSelected()` ([BEH-435](#beh-435-delete-a-box-and-undo-the-deletion "Delete a box and undo the deletion")); `p` sets `#P` checked and triggers its `change` (the toggle expression reads an empty jQuery set, so it always checks, never unchecks); Ctrl+`r` calls `videoControl.refresh()`; the frame stepping and play keys belong to CAP-2xx; Escape focuses and selects `#I`, or if `#I` already has focus blurs it back to `#left-side`; Enter does the same toggle; other keys go to `labelsProcessKey` (label shortcuts, [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes")). Because `#I` is a text input (`type="text"`), keys typed in it take the text-field rule above: Enter reaches `onKeyDown_IDEdit` ([BEH-434](#beh-434-editing-the-bee-id "Editing the bee ID")) rather than the toggle, and the later `#I`-specific Escape branch and the "blur `#I`" half of the Escape/Enter toggles cannot be reached through this handler.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`, `init`
- **Links:** [BEH-434](#beh-434-editing-the-bee-id "Editing the bee ID"), [BEH-435](#beh-435-delete-a-box-and-undo-the-deletion "Delete a box and undo the deletion"), [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [OQ-005](../../QUESTIONS.md#oq-005 "Core tracking workflow and shortcuts")

## BEH-456: Labels and notes text on a box

Continuing `identifyBeeRect` after the ID and span text ([BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box")), all in font `ID_fontSize/2`px Arial, `ID_color`, centered, text baseline top, starting at the vertical offset `labelOffset` (`rect.height/2 + 3` below the box if `label_offsetType` is `bottom`, else `radius + 3`): if `showLabels` and `overlay.opts.labelFormatter(obs)` (default `obs.labels`, a comma-separated string) is not the empty string: with `wrapLabels` (default true) it is drawn by `wrapText(ctx, text, 0, y, wrapLabelsWidth (80), 10, ",")`, which splits on commas, joins the words with a space, wraps when the line exceeds the width and returns the height used (10 px per line, at least 10), added to `labelOffset`; with `wrapLabels` false the whole string is drawn on one line and `labelOffset` advances by `ID_fontSize/2`. If `showNotes` and `obs.notes` is not `undefined`, the notes are wrapped at width 80 (split on spaces, 10 px line step) below the labels; empty notes draw an empty line. A `null` notes (or `undefined` labels) would reach `wrapText` and throw on `text.split`.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `identifyBeeRect`, `wrapText`
- **Links:** [BEH-409](#beh-409-overlay-option-toggles "Overlay option toggles"), [BEH-415](#beh-415-id-dot-id-text-and-span-text-on-a-box "ID dot, ID text and span text on a box"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-411](../../QUESTIONS.md#oq-411 "Characterizing known crashes"), [DEBT-406](view_debt.md#debt-406-two-parallel-encodings-of-labels-in-overlay-drawing-and-creation "Two parallel encodings of labels in overlay drawing and creation")

## BEH-457: Mouse-down dispatch order

`onMouseDown(option)` (Fabric `mouse:down` on the box canvas) handles, in this order: (1) `videoControl.pause()`; (2) `printMessage("")`; (3) Alt held -> pan ([BEH-408](#beh-408-zoom-and-pan-gestures "Zoom and pan gestures")) and stop; (4) interaction mode `edit-visit`: with pick mode `pollinator` or `flower`, a click on a box calls `visitWidget.setPollinator(target.obs)` / `setFlower(target.obs)`, a click on the background does nothing; with no pick mode, any click (box or background) calls `setInteractionMode('main')`; stop in all cases; (5) option "New annotation" on: a click on a box returns, a click on the background calls `onMouseDown_predict` and flashes the button ([BEH-426](#beh-426-click-mode-new-annotation "Click mode 'New annotation'")), stop; (6) a click on a box returns (selection is handled by `onObjectSelected`, [BEH-420](#beh-420-clicking-a-box-selects-it "Clicking a box selects it")); (7) background click: Shift -> `onMouseDown_predict` ([BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction")); else Ctrl -> `onMouseDown_interactiveRect` ([BEH-424](#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively")); else, if "Select diff. time" is on, `onMouseDown_selectMultiframe` ([BEH-427](#beh-427-click-mode-select-diff-time "Click mode 'Select diff. time'")); else nothing ([BEH-421](#beh-421-background-click-and-deselection "Background click and deselection")). Shift has priority over Ctrl.

- **Group:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onMouseDown`, `onMouseDown_panning`, `onMouseDown_predict`, `onMouseDown_interactiveRect`, `onMouseDown_selectMultiframe`
- **Links:** [BEH-408](#beh-408-zoom-and-pan-gestures "Zoom and pan gestures"), [BEH-420](#beh-420-clicking-a-box-selects-it "Clicking a box selects it"), [BEH-421](#beh-421-background-click-and-deselection "Background click and deselection"), [BEH-422](#beh-422-shiftclick-creates-a-box-from-the-best-prediction "Shift+click creates a box from the best prediction"), [BEH-424](#beh-424-ctrldrag-creates-a-box-interactively "Ctrl+drag creates a box interactively"), [BEH-426](#beh-426-click-mode-new-annotation "Click mode 'New annotation'"), [BEH-427](#beh-427-click-mode-select-diff-time "Click mode 'Select diff. time'"), [BEH-440](#beh-440-interaction-modes-main-pick-frame-and-edit-visit "Interaction modes main, pick-frame and edit-visit")
