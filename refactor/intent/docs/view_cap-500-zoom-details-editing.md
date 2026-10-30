<!-- GENERATED from ../behaviors/cap-500-zoom-details-editing.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Zoom view and details editing ([CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing"))

Conventions: [../README.md](../README.md).

All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated. Revision 2 (after review): sentences tagged `[unverified: ...]` rely on code that was not in the review evidence and must be re-read before use as a test oracle.

## Contents

| ID | Name |
|---|---|
| BEH-501 | [Zoom view initialisation and defaults](#beh-501-zoom-view-initialisation-and-defaults) |
| BEH-502 | [Update checkbox gates all zoom refreshes](#beh-502-update-checkbox-gates-all-zoom-refreshes) |
| BEH-503 | [Zoom follows the selection and the overlay](#beh-503-zoom-follows-the-selection-and-the-overlay) |
| BEH-504 | [Zoom centre and orientation](#beh-504-zoom-centre-and-orientation) |
| BEH-505 | [Coordinate mapping between zoom canvas and video frame](#beh-505-coordinate-mapping-between-zoom-canvas-and-video-frame) |
| BEH-506 | [Zoom scale controls](#beh-506-zoom-scale-controls) |
| BEH-507 | [Zoom canvas resizing](#beh-507-zoom-canvas-resizing) |
| BEH-508 | [Overlay checkbox: tag outline or cross-hair on the zoom](#beh-508-overlay-checkbox-tag-outline-or-cross-hair-on-the-zoom) |
| BEH-509 | [Box checkbox: selected bee box on the zoom](#beh-509-box-checkbox-selected-bee-box-on-the-zoom) |
| BEH-510 | [Zoom info line](#beh-510-zoom-info-line) |
| BEH-511 | [Export Image button](#beh-511-export-image-button) |
| BEH-512 | [Tag view panel visibility](#beh-512-tag-view-panel-visibility) |
| BEH-513 | [Tag code re-extraction from the image](#beh-513-tag-code-re-extraction-from-the-image) |
| BEH-514 | [Tag reference image URL](#beh-514-tag-reference-image-url) |
| BEH-515 | [Key bindings inside the zoom view](#beh-515-key-bindings-inside-the-zoom-view) |
| BEH-516 | [Parts data format on the observation](#beh-516-parts-data-format-on-the-observation) |
| BEH-517 | [Default keypoint vocabulary and colours](#beh-517-default-keypoint-vocabulary-and-colours) |
| BEH-518 | [Label quick-access buttons](#beh-518-label-quick-access-buttons) |
| BEH-519 | [Part label textbox](#beh-519-part-label-textbox) |
| BEH-520 | [Selecting a label arms insertion or selects the existing marker](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker) |
| BEH-521 | [Placing a part by clicking on the zoom](#beh-521-placing-a-part-by-clicking-on-the-zoom) |
| BEH-522 | [Marker redraw follows geometry](#beh-522-marker-redraw-follows-geometry) |
| BEH-523 | [Renaming a marker and duplicate labels](#beh-523-renaming-a-marker-and-duplicate-labels) |
| BEH-524 | [Syncing markers to the observation](#beh-524-syncing-markers-to-the-observation) |
| BEH-525 | [Delete part](#beh-525-delete-part) |
| BEH-526 | [Auto-label mode](#beh-526-auto-label-mode) |
| BEH-527 | [Show parts on the main video overlay](#beh-527-show-parts-on-the-main-video-overlay) |
| BEH-528 | [Add or remove a label in the quick-access list](#beh-528-add-or-remove-a-label-in-the-quick-access-list) |
| BEH-529 | [Edit the label list as JSON](#beh-529-edit-the-label-list-as-json) |
| BEH-530 | [Load keypoint label presets from the server](#beh-530-load-keypoint-label-presets-from-the-server) |
| BEH-531 | [Rotate tag buttons](#beh-531-rotate-tag-buttons) |
| BEH-532 | [Tag fix data model](#beh-532-tag-fix-data-model) |
| BEH-533 | [Spreading a tag fix over the track](#beh-533-spreading-a-tag-fix-over-the-track) |
| BEH-534 | [Alternate tags panel](#beh-534-alternate-tags-panel) |
| BEH-535 | [Apply all tag fixes (bake)](#beh-535-apply-all-tag-fixes-bake) |
| BEH-536 | [Choosing an alternate tag (assign tag ID)](#beh-536-choosing-an-alternate-tag-assign-tag-id) |
| BEH-537 | [Tag actions auto-create the bee box](#beh-537-tag-actions-auto-create-the-bee-box) |
| BEH-538 | [Undo all tag fixes](#beh-538-undo-all-tag-fixes) |
| BEH-539 | [Clean-up actions defined in ZoomView.js](#beh-539-clean-up-actions-defined-in-zoomviewjs) |
| BEH-540 | [Tag view canvases: reference, warped and source crop](#beh-540-tag-view-canvases-reference-warped-and-source-crop) |
| BEH-541 | [Tag view grid](#beh-541-tag-view-grid) |
| BEH-542 | [Clicking the colour dot of a label button deselects](#beh-542-clicking-the-colour-dot-of-a-label-button-deselects) |
| BEH-543 | [Removing the wrongid label keeps the tag fix](#beh-543-removing-the-wrongid-label-keeps-the-tag-fix) |
| BEH-544 | [Current tag without corners](#beh-544-current-tag-without-corners) |
| BEH-545 | [Tag arrow and corner squares on the zoom](#beh-545-tag-arrow-and-corner-squares-on-the-zoom) |

## BEH-501: Zoom view initialisation and defaults

`initZoomView` (called from `init` in `labelBee.js`) creates the global `zoomOverlay = new ZoomOverlay(#zoom, #zoomOverlay)`, sets `tagImageRoot` to `/data/tags/tag25h5inv/png`, requests the Hamming matrix (`loadTagHammingMatrix`), sets the canvas size to 200 x 200, builds the part-label dialog (`initLabelListDialog`) and the part label buttons (`refreshButtonListParts`). It also assigns `canvasExtract` from the selector `"zoomExtractedTagCanvas"` (no `#`: empty selection, [DEBT-501](view_debt.md#debt-501-tag-view-checkbox-default-contradicts-html-initial-button-states-target-wrong-ids "Tag-view checkbox default contradicts HTML; initial button states target wrong ids")). The `ZoomOverlay` constructor requests the tag25h5 code table (`loadTagCodesFromServer`, [BEH-534](#beh-534-alternate-tags-panel "Alternate tags panel")) and sets the defaults: `flagShowZoom` true (checkbox `#checkboxShowZoom` "Update" checked), `flagShowOverlay` true (`#checkboxZoomShowOverlay` "Overlay"), `flagShowGrid` true (`#checkboxZoomToggleGrid` "Grid"), `flagShowBB` true (`#checkboxZoomShowBB` "Box"), `flagShowTagView` false (`#checkboxZoomShowTagView` "Tag" is forced unchecked and the `#zoomTagView` block hidden, although the HTML says `checked="true"`), `flagShowParts` false, `flagShowDistractors` false, `flagShowAlternateHamming` false, `flagShowAlternateHamming2` true, `flagShowAlternateFocus` true; the two alternate-source buttons (`alternate-use-image`, `alternate-use-focus`) get class `active` accordingly, and the `#videozoom_distractors` accordion is set to `active` false (collapsed, although the HTML carries `default-active`). `#zoomresize` is made jQuery-UI resizable (aspect ratio 1, `resizestop` calls `refreshZoomSize`) and the tag canvases (`.tagresizable`) are resizable with aspect ratio 1. The constructor also toggles the classes of `#buttonZoomShowGrid`, `#buttonZoomShowBB` and `#buttonZoomShowParts`, which are not in the served template blocks ([DEBT-501](view_debt.md#debt-501-tag-view-checkbox-default-contradicts-html-initial-button-states-target-wrong-ids "Tag-view checkbox default contradicts HTML; initial button states target wrong ids")). The constructor sets `scale` 1 and `angle` 0 and makes `#videozoom` an accordion whose `activate` callback calls `refreshZoom` (opening or closing the panel refreshes the zoom). [unverified: whether `#videozoom` starts collapsed and `#videozoom_parts` starts open: no `active` option is passed for them.]

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `initZoomView`, `ZoomOverlay`, `ZoomOverlay.refreshZoomSize`, `ZoomOverlay.loadTagHammingMatrix`, `ZoomOverlay.loadTagCodesFromServer`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom`, `#checkboxShowZoom`, `#checkboxZoomShowOverlay`, `#checkboxZoomShowBB`, `#checkboxZoomShowTagView`, `#checkboxZoomToggleGrid`, `#zoomresize`
- **Links:** [BEH-502](#beh-502-update-checkbox-gates-all-zoom-refreshes "Update checkbox gates all zoom refreshes"), [BEH-503](#beh-503-zoom-follows-the-selection-and-the-overlay "Zoom follows the selection and the overlay"), [BEH-507](#beh-507-zoom-canvas-resizing "Zoom canvas resizing"), [BEH-534](#beh-534-alternate-tags-panel "Alternate tags panel"), [DEBT-501](view_debt.md#debt-501-tag-view-checkbox-default-contradicts-html-initial-button-states-target-wrong-ids "Tag-view checkbox default contradicts HTML; initial button states target wrong ids"), [SEAM-503](view_seams.md#seam-503-tag-code-tables-and-tag-images-static-data "Tag code tables and tag images (static data)")

## BEH-502: Update checkbox gates all zoom refreshes

The checkbox `#checkboxShowZoom` ("Update") sets `flagShowZoom`. While false, `ZoomOverlay.selectionChanged` returns immediately and `refreshZoom` draws nothing. When it is checked again `clickShowZoom` calls `syncFromTracks` (reloads the parts of the active bee and refreshes the zoom). Unchecking only sets the flag: nothing clears `#zoom` or the marker canvas, so the last image, overlays and markers stay visible (stale) until the box is checked again. Independently of the flag, `refreshZoom` also does nothing when `#zoom` is not visible (for example the `#videozoom` accordion is collapsed), and so is not computed in the background.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.clickShowZoom`, `ZoomOverlay.selectionChanged`, `ZoomOverlay.refreshZoom`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#checkboxShowZoom`
- **Links:** [BEH-503](#beh-503-zoom-follows-the-selection-and-the-overlay "Zoom follows the selection and the overlay"), [CAP-200](view_capabilities.md#cap-200-load-and-play-video "Load and play video")

## BEH-503: Zoom follows the selection and the overlay

`ZoomOverlay.selectionChanged` is registered in `labelBee.js` on `selectionControl` events `tagselection:created`, `selection:created`, `tagselection:cleared`, `selection:cleared` and on `overlay` events `object:moving`, `object:modified`. Sequence when `flagShowZoom` is true: read `getCurrentID()`; if undefined, clear the zoom fabric canvas and stop (no redraw of the zoom image); otherwise store `this.id`, run `syncFromTracks` (rebuild the part markers from `obs.parts` of the active overlay rect, which itself ends with `refreshZoom`), `loadTagImage`, `refreshZoom`, `refreshInfo`. So one selection change causes two `refreshZoom` calls when an overlay rect is active (one from `syncFromTracks`, one from `selectionChanged`), and one when there is none. Since `object:moving` is also bound, dragging a bee box on the main overlay re-syncs the zoom (and rebuilds the part markers) at each move event. When there is no active overlay object `syncFromTracks` clears the zoom fabric canvas and returns without refreshing, and `selectionChanged` then continues with `loadTagImage`, `refreshZoom`, `refreshInfo`.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.selectionChanged`, `ZoomOverlay.syncFromTracks`, `ZoomOverlay.loadTagImage`, `ZoomOverlay.refreshInfo`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `selectionControl / overlay event binding after initZoomView`
- **Links:** [BEH-502](#beh-502-update-checkbox-gates-all-zoom-refreshes "Update checkbox gates all zoom refreshes"), [BEH-504](#beh-504-zoom-centre-and-orientation "Zoom centre and orientation"), [BEH-521](#beh-521-placing-a-part-by-clicking-on-the-zoom "Placing a part by clicking on the zoom"), [DEBT-502](view_debt.md#debt-502-selection-change-refreshes-the-zoom-twice-and-re-syncs-on-every-drag-event "Selection change refreshes the zoom twice and re-syncs on every drag event"), [SEAM-501](view_seams.md#seam-501-zoom-view-and-selectionoverlaykey-handling "Zoom view and selection/overlay/key handling")

## BEH-504: Zoom centre and orientation

On each `refreshZoom` the zoom window is centred on the canvas centre `(width/2, height/2)`; the point shown there and the rotation are chosen as follows. (1) If `getCurrentTag()` returns a tag (the tag of the selected bee ID in the current frame): the centre is the tag centre `tag.c` and the angle is `tagAngle(tag)` in degrees converted to radians, so the tag is shown upright (the image is drawn with `rotate(-angle)`). (2) Else if a rect is selected on the main overlay: centre is the rect centre converted to video coordinates, angle is the rect angle (`rotatedRectGeometry`), so the bee body axis is aligned. (3) Else the previous centre and angle are kept. The image is drawn from `videoControl.currentImage` when `videoControl.currentMode == "cache"` and an image exists, and from the `#video` element otherwise, scaled by `scale`, with no smoothing options set. The picture may be out of sync with the frame while playing (comment in code). The tag has priority over the rect when both exist.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoom`, `ZoomOverlay.setFrameGeometry`, `ZoomOverlay.setCanvasGeometry`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `getCurrentTag`, `getSelectedRect`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `tagAngle`, `rotatedRectGeometry`, `getTag`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-505](#beh-505-coordinate-mapping-between-zoom-canvas-and-video-frame "Coordinate mapping between zoom canvas and video frame")

## BEH-505: Coordinate mapping between zoom canvas and video frame

`ZoomOverlay.frame2canvas` and `ZoomOverlay.canvas2frame` convert between zoom canvas pixels and video pixel coordinates using centre in frame `centerFrame`, centre in canvas `centerCanvas`, `angle` (radians) and `scale`: `canvas = R(-angle) * (frame - centerFrame) * scale + centerCanvas` (x' = dx cos a + dy sin a, y' = -dx sin a + dy cos a), and the inverse for `canvas2frame`. Skeleton parts are stored in video (frame) coordinates and re-projected with these functions at each redraw, so they follow zoom, scale and rotation changes.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.frame2canvas`, `ZoomOverlay.canvas2frame`, `ZoomOverlay.setGeometry`
- **Links:** [BEH-504](#beh-504-zoom-centre-and-orientation "Zoom centre and orientation"), [BEH-522](#beh-522-marker-redraw-follows-geometry "Marker redraw follows geometry"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")

## BEH-506: Zoom scale controls

Buttons "Z+" (`zoomApplyScale(2)`), "Z=" (`zoomSetScale(1)`) and "Z-" (`zoomApplyScale(1/2)`) change `scale`; the keys `+` and `-` pressed while the focus is inside `#videozoom` multiply the scale by sqrt(2) and sqrt(1/2) (see [BEH-515](#beh-515-key-bindings-inside-the-zoom-view "Key bindings inside the zoom view")). `zoomApplyScale` resets the scale to 1 if the product is NaN. There is no lower or upper bound. Each change calls `refreshZoom`. The scale is not persisted and is not reset when the selection changes.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.zoomApplyScale`, `ZoomOverlay.zoomSetScale`, `ZoomOverlay.onKeyDown`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom`
- **Links:** [BEH-515](#beh-515-key-bindings-inside-the-zoom-view "Key bindings inside the zoom view"), [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior")

## BEH-507: Zoom canvas resizing

The zoom canvas starts at 200 x 200. Dragging the jQuery-UI resize handle of `#zoomresize` (aspect ratio 1) fires `resizestop` which calls `refreshZoomSize`: canvas width = container style width - 16 - 2, canvas height = width - 2; `setCanvasSize` then resizes both canvases (`#zoom` and the fabric `#zoomOverlay`) and rewrites the container to (w + 18) x (h + 2) px, then refreshes. The canvas is therefore not exactly square after a resize. The tag canvases (`#zoomTagCanvas`, `#zoomExtractedTagCanvas`, `#zoomExtractedTagCanvas2`) are separately resizable with aspect ratio 1 (display size only).

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoomSize`, `ZoomOverlay.setCanvasSize`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#zoomresize`, `#zoomDiv`
- **Links:** [BEH-501](#beh-501-zoom-view-initialisation-and-defaults "Zoom view initialisation and defaults")

## BEH-508: Overlay checkbox: tag outline or cross-hair on the zoom

When `#checkboxZoomShowOverlay` ("Overlay") is checked (default), `refreshZoom` draws on the zoom canvas, in the same transform as the image: if a current tag exists, the tag outline as a U shape (corner order p0 -> p3 -> p2 -> p1, blue, open between p1 and p0), plus the arrow and corner squares of [BEH-545](#beh-545-tag-arrow-and-corner-squares-on-the-zoom "Tag arrow and corner squares on the zoom"). If there is no current tag it draws a blue cross-hair through the canvas centre (vertical and horizontal lines at the canvas middle). A yellow 6 x 6 centre square is coded in that branch under `typeof tag !== "undefined"`; it can only be drawn for a `null` tag, and `getTag` returns `undefined` or `obs.tag`, never `null`, so it is practically unreachable (`getCurrentTag` itself was not in the review evidence). Unchecking only hides this overlay (`clickShowOverlay` then `refreshZoom`).

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoom`, `ZoomOverlay.clickShowOverlay`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#checkboxZoomShowOverlay`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-545](#beh-545-tag-arrow-and-corner-squares-on-the-zoom "Tag arrow and corner squares on the zoom"), [BEH-544](#beh-544-current-tag-without-corners "Current tag without corners"), [DEBT-503](view_debt.md#debt-503-dead-branch-in-overlay-drawing-and-unbalanced-canvas-state "Dead branch in overlay drawing and unbalanced canvas state")

## BEH-509: Box checkbox: selected bee box on the zoom

When `#checkboxZoomShowBB` ("Box") is checked (default) and a rect is selected on the main overlay, `refreshZoom` strokes in red the four corners of that rect (rotated rectangle geometry converted overlay canvas -> video -> zoom canvas) as a closed polygon, so the bee box appears with its rotation relative to the zoom view. Nothing is drawn when no rect is selected.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoom`, `ZoomOverlay.clickToggleShowBB`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#checkboxZoomShowBB`
- **Links:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [BEH-504](#beh-504-zoom-centre-and-orientation "Zoom centre and orientation")

## BEH-510: Zoom info line

`refreshInfo` writes into `#zoomInfo`: for the current tag `id=<id> H=<hamming> dm=<dm>`, and if `tag.fix` exists appends `<br>tagangle=<fix.tagangle>` plus ` newid=<fix.newid>` when defined and ` oldid=<fix.oldid>` when defined. Empty when there is no current tag. Called from `selectionChanged` and at the end of every `refreshZoom`.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshInfo`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#zoomInfo`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-532](#beh-532-tag-fix-data-model "Tag fix data model")

## BEH-511: Export Image button

The button "Export Image" (`exportZoomImage`) downloads an HTML file generated in the browser (a Blob link clicked programmatically). The file contains the PNG data URL of the `#zoom` canvas (image, tag overlay and box outline drawn on it, but not the fabric part markers of `#zoomOverlay`), the labels of the selected bee, the zoom scale, the video URL (`videoControl.video.src`) and the pretty-printed JSON of the selected observation. File name: `crop_f<frame>_cx<round(x+width/2)>_cy<round(y+height/2)>_<labels>.html`. With no selected rect there is no guard and the export still happens: `frame` becomes an empty string, `labels` is `undefined`, `x` and `y` are `NaN` (the `?? ""` after `Math.round` never applies), so the name is `crop_f_cxNaN_cyNaN_undefined.html` and the page shows `undefined` for labels and annotation. Labels and JSON are inserted without HTML escaping.

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.exportZoomImage`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-504](view_debt.md#debt-504-exportzoomimage-has-no-guard-for-no-selection-and-mixes-responsibilities "exportZoomImage has no guard for no selection and mixes responsibilities")

## BEH-512: Tag view panel visibility

The checkbox `#checkboxZoomShowTagView` ("Tag") sets `flagShowTagView` and shows or hides the block `#zoomTagView`. Checking it shows the block and calls `refreshZoom`; unchecking it only hides the block (no refresh, the canvases keep their last content). The block holds the tag id label (`.tagImageID`, "ID=<id>" set by `loadTagImage`), the rotate buttons ([BEH-531](#beh-531-rotate-tag-buttons "Rotate tag buttons")), the Grid checkbox ([BEH-541](#beh-541-tag-view-grid "Tag view grid")) and the three tag canvases ([BEH-540](#beh-540-tag-view-canvases-reference-warped-and-source-crop "Tag view canvases: reference, warped and source crop")). `#tagImage` is a hidden `<img>` of the reference tag whose load event calls `refreshTagImage`. `loadTagImage` aborts when `flagShowTagView` is false, so the reference image is only requested while the panel is shown. The warping and decoding (`updateTagView`, [BEH-540](#beh-540-tag-view-canvases-reference-warped-and-source-crop "Tag view canvases: reference, warped and source crop"), [BEH-513](#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image")) is not gated by `flagShowTagView` (it tests a different property, `showTagView`, which the constructor sets to true and nothing changes, see [DEBT-505](view_debt.md#debt-505-pixel-level-tag-processing-in-the-ui-object-with-undeclared-globals "Pixel-level tag processing in the UI object, with undeclared globals")) and runs on every `refreshZoom`, which the alternate-tag search needs.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.clickToggleShowTagView`, `ZoomOverlay.loadTagImage`, `ZoomOverlay.refreshTagImage`, `ZoomOverlay.updateTagView`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#zoomTagView`, `#checkboxZoomShowTagView`, `#tagImage`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-513](#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image"), [BEH-540](#beh-540-tag-view-canvases-reference-warped-and-source-crop "Tag view canvases: reference, warped and source crop"), [BEH-541](#beh-541-tag-view-grid "Tag view grid"), [DEBT-505](view_debt.md#debt-505-pixel-level-tag-processing-in-the-ui-object-with-undeclared-globals "Pixel-level tag processing in the UI object, with undeclared globals")

## BEH-513: Tag code re-extraction from the image

After warping, `updateTagView` stores in `currentTagBin` the 5 x 5 bit string read from the warped image by `extractTagBin` (inverted tag family, margin 1 cell, threshold = (min + max)/2 of the red channel, bit '1' where the pixel is darker than the threshold in the inverted convention). `currentTagBin` is a per-`ZoomOverlay` string used by the alternate tags search ([BEH-534](#beh-534-alternate-tags-panel "Alternate tags panel")); it is not saved. Because `updateTagView` calls `updateDistractors` before recomputing `currentTagBin`, the alternate list shown after a refresh is based on the bits of the previous refresh (the tag that was displayed before).

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.updateTagView`, `extractTagBin`, `findAllHamming`, `hamming`
- **Links:** [BEH-534](#beh-534-alternate-tags-panel "Alternate tags panel"), [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [DEBT-506](view_debt.md#debt-506-alternate-list-is-computed-from-the-previous-refreshs-tag-bits "Alternate list is computed from the previous refresh's tag bits")

## BEH-514: Tag reference image URL

`tagImgURL(id)` builds `url_for(tagImageRoot + "/keyed" + id zero-padded to 4 digits + ".png")` with `tagImageRoot = "/data/tags/tag25h5inv/png"`. Used for the reference tag and for the thumbnails of the alternate tags. Non-numeric ids (for example `falsealarm`) give a non-existing file name (no special case).

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.tagImgURL`
- **Links:** [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [BEH-512](#beh-512-tag-view-panel-visibility "Tag view panel visibility")

## BEH-515: Key bindings inside the zoom view

`#videozoom` gets `tabindex=0` and a `keydown` handler (`ZoomOverlay.onKeyDown`). Events whose target is a `textarea`, `select` or text input (for example `#partLabel`) are stopped (`stopPropagation`) and ignored. Otherwise: `Delete`, `Backspace` or lowercase `d` delete the currently selected part marker ([BEH-525](#beh-525-delete-part "Delete part")); `Ctrl+r` redraws the zoom fabric canvas (`redraw`, default browser reload prevented); `+` zooms in by sqrt(2); `-` zooms out by sqrt(1/2). Handled keys call `preventDefault` but not `stopPropagation`, so the event continues to any ancestor handler. The global handler `onKeyDown` of `labelBee.js` is bound only on `#left-side` (`$('#left-side').on("keydown", ...)`; the `window` binding is commented out) and handles Delete/`d`/Backspace (`deleteSelected()` on the selected bee), `p`, `Ctrl+r` (`videoControl.refresh()`), arrows and `<`/`>` (frame navigation), Space, Escape, Enter and the label keys. `#videozoom` is inside `#right-side` (opened at `labelbee_page.html:557`, closed at :1510), not inside `#left-side` (opened at :152), so zoom key events never reach the global handler: Delete/`d`/Backspace in the zoom delete only the marker (no double deletion), `Ctrl+r` only redraws the zoom, and while the focus is inside `#videozoom` the frame navigation keys (arrows, `<`, `>`, `p`, Space), the label keys and the global `Ctrl+r` are not handled by anything. The two key maps are disjoint by DOM scope ([DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place")).

- **Group:** [CAP-500](view_capabilities.md#cap-500-zoom-view-and-details-editing "Zoom view and details editing")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onKeyDown`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onKeyDown`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom`
- **Links:** [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [OQ-501](../../QUESTIONS.md#oq-501 "Keys inside the zoom view and the global key map"), [SEAM-501](view_seams.md#seam-501-zoom-view-and-selectionoverlaykey-handling "Zoom view and selection/overlay/key handling")

## BEH-516: Parts data format on the observation

The skeleton of a bee is the optional array `obs.parts` of the observation of the selected rect: `[{posFrame: {x, y}, label: <string>}, ...]`, positions in video (full-resolution) pixel coordinates, one entry per placed point in canvas object order. `label` is a free string (not restricted to the label list). The same label may appear several times if the user relabels ([BEH-523](#beh-523-renaming-a-marker-and-duplicate-labels "Renaming a marker and duplicate labels")). `hasParts(obs)` is true for a non-empty array. `parts` is copied by `storeObs` into the stored observation and serialised with the rest of the observation. Absent `parts` and `[]` are both "no skeleton".

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.syncToTracks`, `ZoomOverlay.syncFromTracks`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `hasParts`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [CAP-403](view_capabilities.md#cap-403-skeleton-overlay "Skeleton overlay"), [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import"), [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling"), [OQ-502](../../QUESTIONS.md#oq-502 "Keypoint vocabulary and skeleton shape")

## BEH-517: Default keypoint vocabulary and colours

`ZoomOverlay.labelList` is an ordered `Map(label -> CSS colour)`. Default content: head red, thorax limegreen, abdomen blue, antL rgb(255,0,128), antR rgb(0,255,128), pollenL rgb(255,224,0), pollenR rgb(224,255,0), legL rgb(255,0,128), legR rgb(0,255,128), and the special entry `__default` black (colour for labels not in the list; not shown as a button and skipped by auto-labelling). L is port side and R starboard side (comments). The map is shared: `OverlayControl.js` reads it to colour parts drawn on the main overlay. It is not persisted between sessions or saved with the annotations; it is reset on page load. ([CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling") text mentions head, neck, thorax, waist, tail: these do not appear in the code defaults.)

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect._colormapping`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling"), [OQ-502](../../QUESTIONS.md#oq-502 "Keypoint vocabulary and skeleton shape"), [DEBT-508](view_debt.md#debt-508-keypoint-vocabulary-is-a-hard-coded-global-map "Keypoint vocabulary is a hard-coded global map")

## BEH-518: Label quick-access buttons

`refreshButtonListParts` empties `div.zoomLabel.labelButtons` and creates one `button.zoomlabel` per label of `labelList` (except `__default`), with `data-label`, title "Toggle Label <label>", content a coloured dot (U+25C9 in the label colour) plus the label. A click reads `data-label` of the click target and calls `selectLabel` ([BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker")); a click on the coloured dot instead of the text does not carry the label ([BEH-542](#beh-542-clicking-the-colour-dot-of-a-label-button-deselects "Clicking the colour dot of a label button deselects")). The button of the current label gets class `active` (`labelSelected`). Called at init, after `+`, `-`, Edit dialog OK, and after loading a preset.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshButtonListParts`, `ZoomOverlay.onClickButtonPart`, `ZoomOverlay.labelSelected`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Parts labeling panel`
- **Links:** [BEH-517](#beh-517-default-keypoint-vocabulary-and-colours "Default keypoint vocabulary and colours"), [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker"), [BEH-542](#beh-542-clicking-the-colour-dot-of-a-label-button-deselects "Clicking the colour dot of a label button deselects")

## BEH-519: Part label textbox

The text field `#partLabel` shows the current label (set by `labelSelected`). On `change` (Enter or blur after edit) `onPartLabelTextChanged`: if the typed label equals the selected one, nothing; if no marker is active, behaves like selecting that label (`selectLabel`: select its existing marker, or arm insertion of a new marker with that label, [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker")); if a marker is active, renames that marker (`rect.label = label`) without calling `syncToTracks`, so the new label reaches `obs.parts` only at the next sync (next point add, move or delete). Then the matching button gets `active` and the zoom redraws. The typed label need not be in `labelList`; it is drawn with `__default` colour.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onPartLabelTextChanged`, `ZoomOverlay.selectLabel`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#partLabel`
- **Links:** [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker"), [BEH-523](#beh-523-renaming-a-marker-and-duplicate-labels "Renaming a marker and duplicate labels"), [DEBT-509](view_debt.md#debt-509-renaming-a-marker-is-not-synced-to-the-observation "Renaming a marker is not synced to the observation")

## BEH-520: Selecting a label arms insertion or selects the existing marker

`selectLabel(label)`: no-op when the label equals the current selection (so clicking the active label button does not deselect despite the "Toggle" title). With a falsy label: deactivate all markers (dispatching `selection:cleared`), clear selection and insert mode. Otherwise look for a marker with that label: if none, deactivate all markers, set `selected = label` and `insertMode = true` (the next click on the zoom canvas background creates it, [BEH-521](#beh-521-placing-a-part-by-clicking-on-the-zoom "Placing a part by clicking on the zoom")); if one exists, make it active, `insertMode = false`. Then updates the textbox and button highlight and redraws. Clicking an existing marker with the mouse selects it (`onObjectSelected`: `selected = label`, insert mode off). Any deselection of the active marker (clicking the background, `onObjectDeselected`) clears `selected`, switches insert mode off, un-highlights all label buttons and empties the `#partLabel` text box.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.selectLabel`, `ZoomOverlay.onObjectSelected`, `ZoomOverlay.onObjectDeselected`, `ZoomOverlay.findRectByLabel`
- **Links:** [BEH-521](#beh-521-placing-a-part-by-clicking-on-the-zoom "Placing a part by clicking on the zoom"), [BEH-518](#beh-518-label-quick-access-buttons "Label quick-access buttons")

## BEH-521: Placing a part by clicking on the zoom

In insert mode, a click on the empty zoom canvas (fabric `mouse:down` without target) at `(offsetX, offsetY)` calls `newPoint`: the canvas position is converted to video coordinates (`canvas2frame`), a marker is created with `selected` as label (7 x 7 px square, stroke colour from `labelList`, label text 12 px Arial above), made active, insert mode switches off, then `syncToTracks` rewrites `obs.parts` from all markers and calls `automatic_sub` ([BEH-524](#beh-524-syncing-markers-to-the-observation "Syncing markers to the observation")). Clicking the background when no insert mode is on does nothing (except that a previously active marker is deselected, `selected` cleared). A click on an existing marker returns early (selection only). Markers are not draggable with controls (`hasControls: false`, no rotation); dragging a marker moves it, and on `object:modified` the marker position is converted back to video coordinates and `syncToTracks` is called. The marker is drawn with its centre at (canvas position - 3, - 3) px (origin set to centre while left/top are computed for a corner origin), consistently applied in both directions.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onMouseDown`, `ZoomOverlay.newPoint`, `ZoomOverlay.newPointInFrame`, `ZoomOverlay.onObjectModified`, `ZoomOverlay.updatePointFromFabric`, `ZoomOverlay.updatePointToFabric`, `ZoomOverlay.FabricPartRect`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#zoomOverlay`
- **Links:** [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker"), [BEH-522](#beh-522-marker-redraw-follows-geometry "Marker redraw follows geometry"), [BEH-524](#beh-524-syncing-markers-to-the-observation "Syncing markers to the observation"), [DEBT-510](view_debt.md#debt-510-marker-offset-of-3-px-and-mixed-origin-conventions "Marker offset of 3 px and mixed origin conventions")

## BEH-522: Marker redraw follows geometry

`redraw` re-projects every marker from its `posFrame` to canvas coordinates (`updatePointToFabric`), clears the fabric 2d context and renders. It is called at the end of every `refreshZoom`, `Ctrl+r` in the zoom, label changes and list changes, so markers follow selection, scale and rotation changes ([BEH-505](#beh-505-coordinate-mapping-between-zoom-canvas-and-video-frame "Coordinate mapping between zoom canvas and video frame")). The marker colour is looked up at each render in `labelList`, falling back to `__default` then black.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.redraw`, `ZoomOverlay.updatePointToFabric`, `ZoomOverlay.FabricPartRect`
- **Links:** [BEH-505](#beh-505-coordinate-mapping-between-zoom-canvas-and-video-frame "Coordinate mapping between zoom canvas and video frame"), [BEH-517](#beh-517-default-keypoint-vocabulary-and-colours "Default keypoint vocabulary and colours")

## BEH-523: Renaming a marker and duplicate labels

Renaming through `#partLabel` ([BEH-519](#beh-519-part-label-textbox "Part label textbox")) can give two markers the same label; the code does not prevent it. Insertion mode, by contrast, is only entered for a label that has no marker, and `findRectByLabel` returns the first marker with that label, so with duplicates only the first is reachable through the label buttons.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.findRectByLabel`, `ZoomOverlay.onPartLabelTextChanged`
- **Links:** [BEH-519](#beh-519-part-label-textbox "Part label textbox"), [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker")

## BEH-524: Syncing markers to the observation

`syncToTracks` (after add, move or delete) requires an active rect on the main overlay: it sets `activeObject.obs.parts` to the array of all zoom markers (`posFrame` copy and `label`), then calls `automatic_sub()` which re-submits the bee if its status is `db` (stored in `Tracks` and chronogram refreshed) or only refreshes the video and chronogram if it is a temporary new rect. If there is no active overlay rect, `syncToTracks` clears all zoom markers (so a point placed without a selected bee disappears at once). `syncFromTracks` does the reverse: clears the markers and recreates one per `obs.parts` entry (each creation makes the new marker active, so the last part ends up selected), restarts auto-labelling if on, and refreshes. There is no undo for parts edits in this code path.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.syncToTracks`, `ZoomOverlay.syncFromTracks`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `automatic_sub`
- **Links:** [BEH-516](#beh-516-parts-data-format-on-the-observation "Parts data format on the observation"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [SEAM-501](view_seams.md#seam-501-zoom-view-and-selectionoverlaykey-handling "Zoom view and selection/overlay/key handling")

## BEH-525: Delete part

The button "Delete" (`onClickButtonDeletePart`) and the keys `Delete`, `Backspace`, `d` in the zoom view ([BEH-515](#beh-515-key-bindings-inside-the-zoom-view "Key bindings inside the zoom view")) call `deleteCurrentPoint`: remove the active marker from the zoom canvas, clear the selection, `syncToTracks`, redraw. With no active marker it still calls `syncToTracks` (so `obs.parts` is rewritten from the remaining markers) and redraws.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.deleteCurrentPoint`, `ZoomOverlay.deletePoint`, `ZoomOverlay.onClickButtonDeletePart`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Parts labeling panel`
- **Links:** [BEH-515](#beh-515-key-bindings-inside-the-zoom-view "Key bindings inside the zoom view"), [BEH-524](#beh-524-syncing-markers-to-the-observation "Syncing markers to the observation")

## BEH-526: Auto-label mode

The toggle button "Auto" (`onToggleButtonAutoLabel`) flips `autoLabel`. When turned on it calls `startAutoLabel` (`autoLabelDone = false`, select the first label of `labelList` other than `__default`, in map order). While `autoLabel && !autoLabelDone`, each click on the zoom background: in insert mode places the marker as usual; otherwise (insert mode is off: the selected label already has a marker, or no label is selected) moves the last active marker (only if there is one) to the click position (`updatePoint`); then `selectNextLabel(selected)` selects the next label in list order (which arms insertion or selects its existing marker). After the last label `autoLabelDone = true` and the selection is cleared. `syncFromTracks` restarts the sequence (`startAutoLabel`) when `autoLabel` is on. Because `selectionChanged` is also bound to the overlay events `object:moving` and `object:modified` ([BEH-503](#beh-503-zoom-follows-the-selection-and-the-overlay "Zoom follows the selection and the overlay")), each move event while dragging a bee box on the main overlay (with a current ID) also rebuilds the markers and restarts the sequence at the first label ([DEBT-502](view_debt.md#debt-502-selection-change-refreshes-the-zoom-twice-and-re-syncs-on-every-drag-event "Selection change refreshes the zoom twice and re-syncs on every drag event"), [OQ-510](../../QUESTIONS.md#oq-510 "Dragging a bee box while Auto-label is on")). With an empty label list, `selectNextLabel` logs but does not return, and ends selecting `undefined`.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onToggleButtonAutoLabel`, `ZoomOverlay.startAutoLabel`, `ZoomOverlay.selectNextLabel`, `ZoomOverlay.updatePoint`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Parts labeling panel`
- **Links:** [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker"), [BEH-521](#beh-521-placing-a-part-by-clicking-on-the-zoom "Placing a part by clicking on the zoom"), [BEH-517](#beh-517-default-keypoint-vocabulary-and-colours "Default keypoint vocabulary and colours"), [BEH-503](#beh-503-zoom-follows-the-selection-and-the-overlay "Zoom follows the selection and the overlay"), [DEBT-502](view_debt.md#debt-502-selection-change-refreshes-the-zoom-twice-and-re-syncs-on-every-drag-event "Selection change refreshes the zoom twice and re-syncs on every drag event"), [OQ-510](../../QUESTIONS.md#oq-510 "Dragging a bee box while Auto-label is on")

## BEH-527: Show parts on the main video overlay

The toggle "Show on Video" (`#buttonShowParts`, `onToggleButtonShowOnVideo`) flips `zoomOverlay.flagShowParts`, updates the button highlight and calls `videoControl.refresh()`. The main overlay `BeeRect._render` reads `zoomOverlay.flagShowParts` and `zoomOverlay.labelList` to draw the skeleton of every bee ([CAP-403](view_capabilities.md#cap-403-skeleton-overlay "Skeleton overlay")). The neighbouring "Show on Chrono" button belongs to the chronogram (`onToggleButton_showPartsOnChrono`, `flag_showPartsOnChrono`). The initial highlight code targets `#buttonZoomShowParts`, which does not exist, so the button state is only right because the default class is inactive.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onToggleButtonShowOnVideo`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `fabric.BeeRect._drawParts`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#buttonShowParts`
- **Links:** [CAP-403](view_capabilities.md#cap-403-skeleton-overlay "Skeleton overlay"), [CAP-303](view_capabilities.md#cap-303-event-display "Event display"), [DEBT-511](view_debt.md#debt-511-parts-display-toggle-spread-over-three-modules "Parts display toggle spread over three modules"), [SEAM-501](view_seams.md#seam-501-zoom-view-and-selectionoverlaykey-handling "Zoom view and selection/overlay/key handling")

## BEH-528: Add or remove a label in the quick-access list

In the Parts labeling panel, `+` (`onButtonClickAddRemovePartLabel(evt,'+')`) sets `labelList[<text of #partLabel>] = "black"` (also resets the colour of an existing label to black, accepts an empty text), refreshes the buttons and redraws. `-` asks `window.confirm("Are you sure you want to delete label '<label>' from the quick access list?")` and on OK removes the entry and refreshes the buttons (existing markers keep their label and fall back to the `__default` colour). A third action `'c'` (prompt for a new colour with the current one as default, empty/cancel leaves it unchanged) exists in the handler but no button calls it.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onButtonClickAddRemovePartLabel`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Parts labeling panel`
- **Links:** [BEH-517](#beh-517-default-keypoint-vocabulary-and-colours "Default keypoint vocabulary and colours"), [DEBT-512](view_debt.md#debt-512-label-list-editing-leftovers "Label list editing leftovers"), [OQ-502](../../QUESTIONS.md#oq-502 "Keypoint vocabulary and skeleton shape")

## BEH-529: Edit the label list as JSON

The "Edit..." button (action `'C'`) writes the label list into `#labellist-json` as a JSON array of `[label, colour]` pairs, one per line, and opens the modal jQuery-UI dialog `#dialog-form-labelList`. OK parses the textarea (`JSON.parse`), replaces `labelList` by `new Map(parsed)`, closes the dialog, refreshes buttons and redraws; invalid JSON throws, leaving the dialog open and the list unchanged. Cancel closes without change. Body scroll is hidden while the dialog is open. The edited list is not saved anywhere.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.initLabelListDialog`, `ZoomOverlay.onButtonClickAddRemovePartLabel`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#dialog-form-labelList`, `#labellist-json`
- **Links:** [BEH-517](#beh-517-default-keypoint-vocabulary-and-colours "Default keypoint vocabulary and colours"), [OQ-502](../../QUESTIONS.md#oq-502 "Keypoint vocabulary and skeleton shape")

## BEH-530: Load keypoint label presets from the server

The "Preset..." button (`'LoadPreset'`) opens the Bootstrap modal `#dialog-keypointLabelsFromServer` (`KeypointLabelsFromServerDialog`), shows "Loading label list from server. Please wait..." and requests `url_for("/rest/config/keypointlabels/")` with `?format=json` (or a sub-directory URI) expecting `{files: [{uri, filename}], dirs: [{uri, filename}]}`; each entry becomes a button, a file button calls `onClickFile(uri)` (message "Loading labels from <url>..." then `keypointLabelsFromServer(uri)`), a directory button lists that directory. The file itself is fetched with GET and must be a JSON object `{labelList: [[label, colour], ...]}`: the list replaces `zoomOverlay.labelList` and the buttons are rebuilt (`refreshButtonListParts`; markers are not redrawn). A response without `labelList` is only logged, but the dialog still reports "Labels loaded. Closing." and closes. Errors: a failed directory listing writes the error into the dialog (`.modal-message`, via `typesetAjaxError`); a failed file fetch calls `showAjaxError`, which opens the main alert (`mainAlert`), while the dialog keeps "Loading labels from <url>..." and stays open. The only route serving `/rest/config/keypointlabels` found is in `labelbee/legacy/views.py` (directory `static/data/config/keypointlabels/`) [unverified: not in the review evidence].

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `KeypointLabelsFromServerDialog`, `ZoomOverlay.keypointLabelsFromServer`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `showAjaxError`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#dialog-keypointLabelsFromServer`
- **Links:** [OQ-007](../../QUESTIONS.md#oq-007 "Skeleton labeling"), [OQ-503](../../QUESTIONS.md#oq-503 "Keypoint preset files on the server"), [DEBT-513](view_debt.md#debt-513-preset-dialog-reports-success-on-a-malformed-file-route-only-in-legacy "Preset dialog reports success on a malformed file; route only in legacy")

## BEH-531: Rotate tag buttons

The buttons `⤿` (title "Rotate CCW", `rotateTag(-90)`) and `⤾` ("Rotate CW", `rotateTag(+90)`) in `#zoomTagView` correct a tag read with the wrong orientation. `rotateTag`: if no overlay rect is active, `newRectForCurrentTag()` creates one for the current tag (see [BEH-537](#beh-537-tag-actions-auto-create-the-bee-box "Tag actions auto-create the bee box")); if still none, stop. Then on its `obs`: add label `wrongid`, set `obs.newid = undefined`, create `obs.fix = {newid: undefined, tagangle: 0}` if absent, add the angle to `obs.fix.tagangle` (only for exactly +90 or -90; other values leave it unchanged), normalise it into (-180, 180], mark the rect as modified (`updateRectObsActivity`), `automatic_sub()`, `updateForm`, `spreadTagFix` ([BEH-533](#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track")), `refreshChronogram`, `refreshZoom`. Visible effect: the tag corners `p` of the covered tags are cyclically permuted, so the tag "up" direction and the zoom orientation change by 90 degrees per click.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.rotateTag`, `rotatep`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#zoomTagView`
- **Links:** [BEH-533](#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track"), [BEH-536](#beh-536-choosing-an-alternate-tag-assign-tag-id "Choosing an alternate tag (assign tag ID)"), [BEH-537](#beh-537-tag-actions-auto-create-the-bee-box "Tag actions auto-create the bee box"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-514](view_debt.md#debt-514-rotatetag-marks-the-bee-as-wrongid-even-for-a-pure-rotation-and-clears-obsnewid "rotateTag marks the bee as wrongid even for a pure rotation and clears obs.newid")

## BEH-532: Tag fix data model

A tag correction lives in two places. On the observation (`obs`, the track box): the label `wrongid` in `obs.labels`, `obs.newid` (the replacement id, kept for chronogram virtual tags) and `obs.fix = {newid, tagangle}` where `tagangle` is a multiple of 90 in (-180, 180]; `Model.js` copies `fix` and `newid` into the stored observation. On each covered tag of `Tags`: `tag.fix = {newid, tagangle, oldp, oldid}` where `oldp` is a deep copy of the original corners (kept so the fix can be undone and re-computed) and `oldid` the original id (set only when baked, [BEH-535](#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)")). The label `falsealarm` (the detection is not a tag) has its own fix form: `obs.fix = {newid: "falsealarm"}` created by baking. The label toggle `wrongid` in the label panel also creates `obs.fix = {newid: undefined}` when switched on. The chronogram builds a "virtual" tag interval under `obs.newid` for observations labelled `wrongid` (`ChronoControl.js`).

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.spreadTagFix`, `ZoomOverlay.bakeTagFix`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `onLabelToggled`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [BEH-535](#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)"), [OQ-504](../../QUESTIONS.md#oq-504 "Meaning and lifecycle of tag fixes")

## BEH-533: Spreading a tag fix over the track

`getCoveredTags(obs)` returns the entries of `Tags` whose frame is within the span of the observation and whose `id` equals `obs.ID` (loose `==`). It first re-resolves `obs` as `Tracks[obs.frame][obs.ID]` (throws if missing). The span is `obs.span` (`{f1, f2}`); if `obs` has none, it is copied from the track found in `flatTracksAll` containing this obs (this writes `obs.span` onto the observation), else `{frame, frame}`. `spreadTagFix` (after rotate or alternate selection) applies the fix of the active rect's observation to every covered tag: when the obs has no fix or `fix.tagangle` and `fix.newid` are both falsy it restores each tag `p` from `fix.oldp` and deletes `tag.fix`; otherwise it creates `tag.fix` (with `oldp` = copy of the current corners) if missing, copies `newid` and `tagangle` and sets `tag.p = rotatep(oldp, tagangle/90)` (corners array rotated by that many positions). It does not change `tag.id`. Only `Tags` entries are reached directly. Since `augmentTrackWithTag` (run by `updateChronoData`) sets `Tracks[F][id].tag` to the same object as the matching `Tags[F].tags[i]`, the changes are also visible through `obs.tag`, which the zoom displays (`getTag` in mode `Tracks`). Tags with no `Tags` entry matching `obs.ID` in the span are not reached.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `getCoveredTags`, `ZoomOverlay.spreadTagFix`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `getTag`
- **Links:** [BEH-531](#beh-531-rotate-tag-buttons "Rotate tag buttons"), [BEH-536](#beh-536-choosing-an-alternate-tag-assign-tag-id "Choosing an alternate tag (assign tag ID)"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [DEBT-515](view_debt.md#debt-515-tag-fix-helpers-have-undeclared-globals-and-heavy-side-effects "Tag fix helpers have undeclared globals and heavy side effects"), [OQ-505](../../QUESTIONS.md#oq-505 "Tags-only tag mode"), [SEAM-502](view_seams.md#seam-502-tag-fix-pipeline-and-annotation-data "Tag fix pipeline and annotation data")

## BEH-534: Alternate tags panel

The sub-panel `#videozoom_distractors` ("Alternate Tags") fills `#zoomDistractors` with candidate ids for the current tag. The list is rebuilt from scratch at each call. It is empty when the sub-panel is collapsed (`flagShowDistractors` follows the accordion `accordionactivate` event: true when open) or when there is no current tag; `updateDistractors` is called at each `updateTagView` and when the accordion opens or closes. Two sources can be switched with toggle buttons: "From image" (`button.alternate-use-image`, `flagShowAlternateHamming2`, default on): all tag ids of the family `tag25h5` (table `/data/tags/tag25h5inv/tag25h5_bin.json`, loaded by the constructor) whose binary code is within Hamming distance 0..5 of the bits `currentTagBin` extracted from the image ([BEH-513](#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image")); the source adds nothing when the table is not loaded or `currentTagBin` is empty (initially, or after a tag without corners). The table load failure is only logged to the console (`showAjaxError(..., onlyConsole)`), so a failed load silently leaves "From image" empty, grouped under headers "  H<d>:  " in increasing distance; "From focus" (`button.alternate-use-focus`, `flagShowAlternateFocus`, default on): the header "  Focus:  " followed by every distinct tag id found in `Tags` within `getWindow()` (current frame minus `trackWindow.backward`, plus `trackWindow.forward`, clamped to the video), including the current id. A third source, the Hamming matrix (`flagShowAlternateHamming`, headers "  H<d>:  "), is coded first but its flag is false and no button sets it ([DEBT-516](view_debt.md#debt-516-hamming-matrix-alternate-source-is-dead-code-inline-onclick-ids "Hamming-matrix alternate source is dead code; inline onclick ids")). Each candidate is a `div.alternateTag` with the id and a pixelated thumbnail of its reference image; clicking calls `onClickAlternateTag(id)` ([BEH-536](#beh-536-choosing-an-alternate-tag-assign-tag-id "Choosing an alternate tag (assign tag ID)")). Toggling a source button flips the `active` class and refreshes the zoom.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.updateDistractors`, `ZoomOverlay.onToggleButtonShowAlternate`, `ZoomOverlay.loadTagCodesFromServer`, `findAllHamming`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `getIdsInFocus`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getWindow`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom_distractors`, `#zoomDistractors`
- **Links:** [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [BEH-513](#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image"), [BEH-535](#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)"), [DEBT-516](view_debt.md#debt-516-hamming-matrix-alternate-source-is-dead-code-inline-onclick-ids "Hamming-matrix alternate source is dead code; inline onclick ids")

## BEH-535: Apply all tag fixes (bake)

The button "Apply All Tag Fixes..." (`bakeAllTagFixes`) runs `bakeTagFix(obs)` over every observation of `Tracks`, then refreshes the chronogram. There is no confirmation despite the dots in the label. For one obs: if it has the label `falsealarm` and no fix, `obs.fix = {newid: "falsealarm"}`; with no fix nothing happens. For each covered tag ([BEH-533](#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track")): ensure `tag.fix` (with `oldp`), then, if `obs.fix.newid == "falsealarm"`, set `tag.fix.newid`, remember `tag.fix.oldid = tag.id` (first time) and set `tag.id = "falsealarm"`; otherwise copy `newid` and `tagangle`, set `tag.p` to the rotated `oldp`, remember `oldid` and set `tag.id = tag.fix.newid`. Consequence: the tag detections of the track now carry the corrected id and corners, so `Tags` can be saved with corrections. After baking, `tag.id` no longer equals `obs.ID`, so a second run does not find them again. For a rotation-only fix (`obs.fix.newid` undefined) the code sets `tag.id = undefined`.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.bakeAllTagFixes`, `ZoomOverlay.bakeTagFix`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom_distractors`
- **Links:** [BEH-532](#beh-532-tag-fix-data-model "Tag fix data model"), [BEH-533](#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track"), [BEH-538](#beh-538-undo-all-tag-fixes "Undo all tag fixes"), [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEBT-517](view_debt.md#debt-517-baketagfix-defects "bakeTagFix defects"), [OQ-504](../../QUESTIONS.md#oq-504 "Meaning and lifecycle of tag fixes")

## BEH-536: Choosing an alternate tag (assign tag ID)

Clicking an alternate tag thumbnail calls `onClickAlternateTag(id)`. If no overlay rect is active it first calls `newRectForCurrentTag()` ([BEH-537](#beh-537-tag-actions-auto-create-the-bee-box "Tag actions auto-create the bee box")) and takes the new active rect; if still none, nothing happens. With the active observation `obs`: if `obs.ID == id` (the clicked id is the one already used) the fix is cleared (`fix.newid` and `fix.tagangle` deleted when a fix exists, `obs.newid` deleted) and the label `wrongid` removed; otherwise the label `wrongid` is added, `obs.newid = id`, `obs.fix` is created if missing with `{newid: undefined, tagangle: 0}` (existing `tagangle` is kept) and `obs.fix.newid = id`. Then `spreadTagFix`, `updateRectObsActivity`, `automatic_sub()`, `updateForm`, `refreshChronogram`. The track box id (`obs.ID`) is not changed; the correction is expressed by `wrongid` + `newid` until baked.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onClickAlternateTag`
- **Links:** [BEH-532](#beh-532-tag-fix-data-model "Tag fix data model"), [BEH-533](#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track"), [BEH-534](#beh-534-alternate-tags-panel "Alternate tags panel"), [BEH-537](#beh-537-tag-actions-auto-create-the-bee-box "Tag actions auto-create the bee box"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [DEBT-518](view_debt.md#debt-518-onclickalternatetag-leftovers "onClickAlternateTag leftovers")

## BEH-537: Tag actions auto-create the bee box

When the user acts on a tag in the zoom (alternate click, rotate) or toggles a label (`labelToggle` in `SelectionControl.js`) with no bee box selected, `newRectForCurrentTag()` (overlay module) is used. It returns silently, with no message, if the button `#newRectForCurrentTag` has class `disabled`. Otherwise it shows a red message and does nothing if there is no current ID ("No current tag selected"), if the current tag is not visible in this frame ("Current tag not visible in this frame. Try Next or Prev event") or if a rect is already selected ("Current tag already annotated"); else it creates a rect from the tag (`newRectForTag`: centred on the tag centre, default rect size, angle from `tagAngle` unless the angle GUI is disabled), selects it and submits it (`submit_bee`).

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `newRectForCurrentTag`, `newRectForTag`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelToggle`
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.onClickAlternateTag`, `ZoomOverlay.rotateTag`
- **Links:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [BEH-531](#beh-531-rotate-tag-buttons "Rotate tag buttons"), [BEH-536](#beh-536-choosing-an-alternate-tag-assign-tag-id "Choosing an alternate tag (assign tag ID)")

## BEH-538: Undo all tag fixes

The button "Undo All Tag Fixes..." (`undoAllTagFixes`) walks all tags of `Tags` and, for each tag with `tag.fix.oldid` defined (that is, baked), restores `tag.id = fix.oldid` and (unless the id is `falsealarm`) `tag.p = copy of fix.oldp`, then refreshes the chronogram. No confirmation. It leaves `tag.fix` and the observation-level fix (`obs.fix`, `wrongid` label, `obs.newid`) in place, so the observation still describes the fix and baking again re-applies it. Tags with a fix that was spread but not baked (no `oldid`) are not reverted by this button.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.undoAllTagFixes`, `ZoomOverlay.undoTagFix`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#videozoom_distractors`
- **Links:** [BEH-535](#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)"), [DEBT-519](view_debt.md#debt-519-undo-of-tag-fixes-is-partial "Undo of tag fixes is partial")

## BEH-539: Clean-up actions defined in ZoomView.js

Three methods of `ZoomOverlay` are bound to the "Clean up features" panel of the page (`#labeling-delete`), outside the zoom panel: "Delete FA Tags..." (`deleteFalsealarmTags`: removes from every `Tags[F].tags` the tags whose `id` is `"falsealarm"`, deleting frames left empty; the tags container of each frame is rebuilt as an object keyed by the original indices, [DEBT-520](view_debt.md#debt-520-deletefalsealarmtags-changes-the-container-type-of-tagsftags "deleteFalsealarmTags changes the container type of Tags[F].tags")), "Delete FA Events..." (`deleteFalsealarmEvents`: deletes every observation having the label `falsealarm`) and "Delete WId Events..." (`deleteWrongIdEvents`: deletes every observation with the label `wrongid`). Each deletes frames of `Tracks` left empty, refreshes the chronogram and has no confirmation or undo (titles say "NO UNDO"). Typical use: first bake the fixes ([BEH-535](#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)")), then delete the false alarms. Behavior is specified in [CAP-803](view_capabilities.md#cap-803-annotation-clean-up "Annotation clean-up"); they are listed here because the code lives in the zoom module.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.deleteFalsealarmTags`, `ZoomOverlay.deleteFalsealarmEvents`, `ZoomOverlay.deleteWrongIdEvents`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#labeling-delete`
- **Links:** [CAP-803](view_capabilities.md#cap-803-annotation-clean-up "Annotation clean-up"), [OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics"), [BEH-535](#beh-535-apply-all-tag-fixes-bake "Apply all tag fixes (bake)"), [SEAM-502](view_seams.md#seam-502-tag-fix-pipeline-and-annotation-data "Tag fix pipeline and annotation data"), [DEBT-520](view_debt.md#debt-520-deletefalsealarmtags-changes-the-container-type-of-tagsftags "deleteFalsealarmTags changes the container type of Tags[F].tags")
## BEH-540: Tag view canvases: reference, warped and source crop

`updateTagView(tag)` (called by every `refreshZoom`) fills three canvases. It first calls `updateDistractors` ([BEH-534](#beh-534-alternate-tags-panel "Alternate tags panel")), then returns if there is no tag or the tag has no corners `p` (the canvases and `currentTagBin` keep their previous content). (1) `#zoomExtractedTagCanvas2`: set to 90 x 90 px, shows the video (or `videoControl.currentImage` in `cache` mode) centred on the tag centre `tag.c`, with the tag edges drawn in red on it afterwards. (2) `#zoomExtractedTagCanvas`: set to 210 x 210 px (7 x 7 cells of 30 px, 5 x 5 code cells plus a 1-cell margin); the 90 px crop is warped into it with the perspective transform `PerspT(src_pts, [0,0,S,0,S,S,0,S])` computed from the tag corners `tag.p`, by bilinear interpolation (the sampler reads one pixel beyond the crop near its borders). The 5 x 5 bits are then read from it ([BEH-513](#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image")). (3) `#zoomTagCanvas`: only when `#tagImage` has finished loading, it is set to 210 x 210 px and the reference image of the tag id of the selected bee (`tagImgURL`, [BEH-514](#beh-514-tag-reference-image-url "Tag reference image URL")) is drawn pixelated at 30 px per tag pixel (`drawPixelated`); otherwise it is left untouched. `refreshTagImage` (the `#tagImage` load handler) just calls `refreshZoom`. The HTML gives the three canvases `width="90px" height="90px"` initially.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.updateTagView`, `ZoomOverlay.refreshTagImage`, `drawPixelated`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#zoomTagCanvas`, `#zoomExtractedTagCanvas`, `#zoomExtractedTagCanvas2`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [BEH-512](#beh-512-tag-view-panel-visibility "Tag view panel visibility"), [BEH-513](#beh-513-tag-code-re-extraction-from-the-image "Tag code re-extraction from the image"), [BEH-514](#beh-514-tag-reference-image-url "Tag reference image URL"), [DEBT-505](view_debt.md#debt-505-pixel-level-tag-processing-in-the-ui-object-with-undeclared-globals "Pixel-level tag processing in the UI object, with undeclared globals")

## BEH-541: Tag view grid

The checkbox `#checkboxZoomToggleGrid` ("Grid", default checked) sets `flagShowGrid` and calls `refreshZoom`. While on, `updateTagView` draws on the warped canvas `#zoomExtractedTagCanvas` a red 7 x 7 grid (lines every S/7 px) with a small blue cross at each cell centre, after the warp and bit extraction (so the grid is not part of the decoded pixels). The same grid is drawn on the reference canvas `#zoomTagCanvas` after the reference image (only when that image is loaded).

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.clickToggleGrid`, `ZoomOverlay.updateTagView`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#checkboxZoomToggleGrid`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [BEH-540](#beh-540-tag-view-canvases-reference-warped-and-source-crop "Tag view canvases: reference, warped and source crop")

## BEH-542: Clicking the colour dot of a label button deselects

Each label button contains `<span style='color:..'>&#9673;</span> <label>`. `onClickButtonPart` reads `data-label` of the click target (`$(event.target).data("label")`). A click on the label text targets the button and selects the label ([BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker")). A click on the coloured dot targets the `<span>`, which has no `data-label`, so `selectLabel(undefined)` runs: it is a no-op if no label is selected, otherwise it deselects the current label (markers deactivated, insert mode off, `#partLabel` emptied). Not verified by running.

- **Group:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshButtonListParts`, `ZoomOverlay.onClickButtonPart`, `ZoomOverlay.selectLabel`, `ZoomOverlay.labelSelected`
- **Links:** [BEH-518](#beh-518-label-quick-access-buttons "Label quick-access buttons"), [BEH-520](#beh-520-selecting-a-label-arms-insertion-or-selects-the-existing-marker "Selecting a label arms insertion or selects the existing marker"), [DEBT-512](view_debt.md#debt-512-label-list-editing-leftovers "Label list editing leftovers"), [OQ-511](../../QUESTIONS.md#oq-511 "Clicking the colour dot of a label button")

## BEH-543: Removing the wrongid label keeps the tag fix

Switching the `wrongid` label off through the label toggle (`labelToggle`) runs `updateObsLabel` and `updateButtonsForLabel` only; in the served lines (up to the `wrongid`-on branch that creates `obs.fix`) nothing clears `obs.fix` or `obs.newid` and `spreadTagFix` is not called, so the spread tag corners and `tag.fix` remain. The rest of `labelToggle` is `updateRectObsActivity`, `automatic_sub`, `updateForm`, `refreshChronogram`.

- **Group:** [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `labelToggle`, `onLabelToggled`
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.spreadTagFix`
- **Links:** [BEH-532](#beh-532-tag-fix-data-model "Tag fix data model"), [BEH-533](#beh-533-spreading-a-tag-fix-over-the-track "Spreading a tag fix over the track"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [OQ-509](../../QUESTIONS.md#oq-509 "State after removing the wrongid label")

## BEH-544: Current tag without corners

If the current tag has no corners `p`: `tagAngle` returns `undefined`, so `refreshZoom` computes `angle = NaN` (the centre is still `tag.c`); `updateTagView` returns early ([BEH-540](#beh-540-tag-view-canvases-reference-warped-and-source-crop "Tag view canvases: reference, warped and source crop")); and in the Overlay branch the outline code reads `tag.p[0][0]` and throws a TypeError, so for such a tag, with "Overlay" checked, `refreshZoom` stops after drawing the image (no box, no marker redraw, no info line). With "Overlay" unchecked the geometry carries the `NaN` angle. Not verified by running.

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoom`, `ZoomOverlay.updateTagView`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `tagAngle`, `tagUp`
- **Links:** [BEH-504](#beh-504-zoom-centre-and-orientation "Zoom centre and orientation"), [BEH-508](#beh-508-overlay-checkbox-tag-outline-or-cross-hair-on-the-zoom "Overlay checkbox: tag outline or cross-hair on the zoom"), [BEH-540](#beh-540-tag-view-canvases-reference-warped-and-source-crop "Tag view canvases: reference, warped and source crop"), [DEBT-503](view_debt.md#debt-503-dead-branch-in-overlay-drawing-and-unbalanced-canvas-state "Dead branch in overlay drawing and unbalanced canvas state")

## BEH-545: Tag arrow and corner squares on the zoom

With "Overlay" checked and a current tag ([BEH-508](#beh-508-overlay-checkbox-tag-outline-or-cross-hair-on-the-zoom "Overlay checkbox: tag outline or cross-hair on the zoom")), `refreshZoom` also draws, in the same transform as the image, a blue arrow from the middle of edge p0-p1 pointing away from the opposite edge p2-p3 (starting at +0.05 of the edge-to-edge vector and ending at +0.8, arrow head length 10) and 5 x 5 px squares at the corners: p0 red, p1 green, p2 blue, p3 yellow. These show the tag orientation and the corner order that the rotate buttons permute ([BEH-531](#beh-531-rotate-tag-buttons "Rotate tag buttons")).

- **Group:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/ZoomView.js](../../../labelbee/static/labelbee/js/ZoomView.js): `ZoomOverlay.refreshZoom`
- **Links:** [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [BEH-508](#beh-508-overlay-checkbox-tag-outline-or-cross-hair-on-the-zoom "Overlay checkbox: tag outline or cross-hair on the zoom"), [BEH-531](#beh-531-rotate-tag-buttons "Rotate tag buttons")
