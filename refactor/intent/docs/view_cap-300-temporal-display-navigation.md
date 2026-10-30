<!-- GENERATED from ../behaviors/cap-300-temporal-display-navigation.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Temporal display and navigation ([CAP-300](view_capabilities.md#cap-300-temporal-display-and-navigation "Temporal display and navigation"))

Conventions: see [../README.md](../README.md).

All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.

Scope: display and interaction of the chronogram (`ChronoControl.js`, `ChronoAxes.js`,
`ChronoControlInteraction.js`, `ChronoControlActivitiesLegacy.js`) and its DOM controls in
`labelbee_page.html`. The data pipelines that build `chronogramData`, `allIntervals`, `flatTracks`,
`tagIntervals` ([CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")) and the filter buttons ([CAP-801](view_capabilities.md#cap-801-filters "Filters")) are only described through what the
chronogram does with their results. Observed headline: with the default configuration
(`chrono.config.legacyActivities = false`) the chronogram draws only plain event intervals,
dangling marks and the selection highlight; tag intervals, crosses, parts, individual events are
drawn only by the legacy renderer ([BEH-326](#beh-326-show-individual-events-option-no-visible-effect-in-the-default-renderer "Show Individual Events option (no visible effect in the default renderer)"), [BEH-327](#beh-327-legacy-activity-renderer-not-active-by-default "Legacy activity renderer (not active by default)"), [BEH-344](#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer "Highlight events with parts option (no visible effect in the default renderer)"), [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events")).
Revised after critic review round 1: statements backed by quoted code evidence are stated as fact; wording such as
"not re-checked" or "first reading" marks claims that were not re-verified in that round; claims about d3 runtime
behavior (double click, wheel, `attr` with undefined) are inferred and need a browser (Phase 1d).

## Contents

| ID | Name |
|---|---|
| BEH-301 | [Chronogram construction and default state](#beh-301-chronogram-construction-and-default-state) |
| BEH-302 | [Chronogram layout and layers](#beh-302-chronogram-layout-and-layers) |
| BEH-303 | [Frame axis and time axis](#beh-303-frame-axis-and-time-axis) |
| BEH-304 | [X domain initialised from the video](#beh-304-x-domain-initialised-from-the-video) |
| BEH-305 | [Pan and zoom with mouse drag and wheel](#beh-305-pan-and-zoom-with-mouse-drag-and-wheel) |
| BEH-306 | [Mousewheel mode option](#beh-306-mousewheel-mode-option) |
| BEH-307 | [Current-frame time mark](#beh-307-current-frame-time-mark) |
| BEH-308 | [Video span bar](#beh-308-video-span-bar) |
| BEH-309 | [Track-window span bar and focus window](#beh-309-track-window-span-bar-and-focus-window) |
| BEH-310 | [Follow-window toggle and Video button (view recentring)](#beh-310-follow-window-toggle-and-video-button-view-recentring) |
| BEH-311 | [Axes changes trigger a lightweight redraw](#beh-311-axes-changes-trigger-a-lightweight-redraw) |
| BEH-312 | [Z+, Z-, shift buttons and the time-domain operations](#beh-312-z-z--shift-buttons-and-the-time-domain-operations) |
| BEH-313 | [Chronogram size buttons](#beh-313-chronogram-size-buttons) |
| BEH-314 | [Status bar and slow-display warning](#beh-314-status-bar-and-slow-display-warning) |
| BEH-315 | [ID axis domain and row order](#beh-315-id-axis-domain-and-row-order) |
| BEH-316 | [ID axis rendering and row grid](#beh-316-id-axis-rendering-and-row-grid) |
| BEH-317 | [Selected ID highlight on the axes](#beh-317-selected-id-highlight-on-the-axes) |
| BEH-318 | [ID remap buttons (ID, Modulo)](#beh-318-id-remap-buttons-id-modulo) |
| BEH-319 | [Filter and restriction effects on the display](#beh-319-filter-and-restriction-effects-on-the-display) |
| BEH-320 | [Event interval rectangles](#beh-320-event-interval-rectangles) |
| BEH-321 | [Event interval colors by label](#beh-321-event-interval-colors-by-label) |
| BEH-322 | [Selected-ID outline on intervals](#beh-322-selected-id-outline-on-intervals) |
| BEH-323 | [Interval hover tooltip](#beh-323-interval-hover-tooltip) |
| BEH-324 | [Dangling track start/end marks](#beh-324-dangling-track-startend-marks) |
| BEH-325 | ["Show Events" option](#beh-325-show-events-option) |
| BEH-326 | [Show Individual Events option (no visible effect in the default renderer)](#beh-326-show-individual-events-option-no-visible-effect-in-the-default-renderer) |
| BEH-327 | [Legacy activity renderer (not active by default)](#beh-327-legacy-activity-renderer-not-active-by-default) |
| BEH-328 | [Tag intervals refreshed at every redraw](#beh-328-tag-intervals-refreshed-at-every-redraw) |
| BEH-329 | [Tag interval rendering (legacy file, not invoked)](#beh-329-tag-interval-rendering-legacy-file-not-invoked) |
| BEH-330 | ["Show Tags" option](#beh-330-show-tags-option) |
| BEH-331 | [Click on the chronogram seeks a frame and selects an ID](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id) |
| BEH-332 | [Click on an event interval](#beh-332-click-on-an-event-interval) |
| BEH-333 | [gotoEvent(frame, id)](#beh-333-gotoeventframe-id) |
| BEH-334 | [Double click on the chronogram](#beh-334-double-click-on-the-chronogram) |
| BEH-335 | [Event-seek mode buttons](#beh-335-event-seek-mode-buttons) |
| BEH-336 | [Next / Previous event](#beh-336-next--previous-event) |
| BEH-337 | [Ordering of events across IDs](#beh-337-ordering-of-events-across-ids) |
| BEH-338 | [First / Last event and AutoSeek](#beh-338-first--last-event-and-autoseek) |
| BEH-339 | [Next ID / Previous ID](#beh-339-next-id--previous-id) |
| BEH-340 | [No keyboard shortcut for chronogram navigation](#beh-340-no-keyboard-shortcut-for-chronogram-navigation) |
| BEH-341 | [Observation table rows go to the event](#beh-341-observation-table-rows-go-to-the-event) |
| BEH-342 | [Refresh entry point](#beh-342-refresh-entry-point) |
| BEH-343 | [Clean obsolete events deletes flagged observations](#beh-343-clean-obsolete-events-deletes-flagged-observations) |
| BEH-344 | [Highlight events with parts option (no visible effect in the default renderer)](#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer) |
| BEH-345 | ["Show on Chrono" button in the parts panel](#beh-345-show-on-chrono-button-in-the-parts-panel) |
| BEH-346 | [User resize of the chronogram div](#beh-346-user-resize-of-the-chronogram-div) |
| BEH-347 | [Layout refresh and collapsed chronogram](#beh-347-layout-refresh-and-collapsed-chronogram) |
| BEH-348 | [Candidate lists of event navigation](#beh-348-candidate-lists-of-event-navigation) |

## BEH-301: Chronogram construction and default state

`labelBee.js` creates `chrono = new Chronogram()`. The constructor sets
`config.frameFilter = {active:false, frameMin:0, frameMax:-1}`, `config.idAxisMapMode='id'`,
`config.idAxisMapString='return id'`, `config.idAxisMap = Function("id", config.idAxisMapString)` (identity map),
`config.legacyActivities=false` (and prints a console hint on how to enable the legacy renderer),
`config.showDanglingTracks=true`, creates `chrono.perf = {}`, calls `initChrono()` and then `initTooltip()`
(tooltip `div.tooltip` appended to `body`, hidden, z-index 10).
`initChrono()` sets the globals `axes` (first `undefined`, then rebuilt), `chronogramData`,
`tagsChronogramData`, `restrictID=null`, `restrictIDArray=[]`, `flag_restrictID=false`,
`flag_excludeID=false`, `flag_autoEventMode=false`, `flag_hideInvalid=false`,
`flag_hideFlowers=false`, `flag_showPartsOnChrono=false`, `flag_showIndividualEvents=false`
(comment: too expensive for full video tracks), `eventSeekMode="eventframe"`,
`chronoItemHeight=12`, `axes.mousewheelMode=false`, and resets the matching buttons
(`updateButtons_showPartsOnChrono`, `updateButtons_showIndividualEvents`, `updateEventSeekMode`,
`updateMousewheelModeButton`). It does not set `excludeID`/`excludeIDArray` (they are set by
`onExcludeIDChanged`). It builds `axes = new ChronoAxes(svg #svgVisualize,
videoinfo, {useOrdinalScale:true})`, adds four layer groups inside `axes.plotArea` in this order
(bottom to top): `spanRectLayer` (`svgSpanRects`), `tagLayer` (`svgTag`), `intervalLayer`
(`svgInterval`), `topLayer` (`svgTop`), creates the video-span and track-window-span bars
([BEH-308](#beh-308-video-span-bar "Video span bar"), [BEH-309](#beh-309-track-window-span-bar-and-focus-window "Track-window span bar and focus window")) and subscribes: `videoControl` `frame:changed` to `updateTimeMark` and
`previewframe:changed` to `updatePreviewTimeMark`; both of these videoControl events also trigger
`trackWindow:change` on `overlay`; the axes events `axes:clicked`, `axes:dblclick`, `axes:changed`
([BEH-311](#beh-311-axes-changes-trigger-a-lightweight-redraw "Axes changes trigger a lightweight redraw"), [BEH-331](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id "Click on the chronogram seeks a frame and selects an ID"), [BEH-334](#beh-334-double-click-on-the-chronogram "Double click on the chronogram")). The subscription to the selection events is commented out in `initChrono`
([BEH-317](#beh-317-selected-id-highlight-on-the-axes "Selected ID highlight on the axes")). In the code seen only the constructor calls `initChrono()`; a second call would build a second
`ChronoAxes` and register the `videoControl` handlers again.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `Chronogram`, `initChrono`, `initTooltip`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `chrono`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#svgVisualize`, `#chronoDiv`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [DEBT-302](view_debt.md#debt-302-chronogram-is-a-god-object-over-free-globals "Chronogram is a god object over free globals"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners")

## BEH-302: Chronogram layout and layers

The SVG `#svgVisualize` (width/height 100% of `#chronoDiv`) holds `g#chronoGroup`
translated by the margins `{left:60, top:15, right:20, bottom:50}`. Inside: a background rect
(`.plotAreaBackground`, fill `#f0fcff`, crosshair cursor), the three axes ([BEH-303](#beh-303-frame-axis-and-time-axis "Frame axis and time axis"), [BEH-315](#beh-315-id-axis-domain-and-row-order "ID axis domain and row order")), a
clip path restricting the plot area, the time mark layer ([BEH-307](#beh-307-current-frame-time-mark "Current-frame time mark")) and `g.plotArea` that receives
the content layers ([BEH-301](#beh-301-chronogram-construction-and-default-state "Chronogram construction and default state")). The plot area is `width = svgWidth - 80`, `height = svgHeight - 65`.
`refreshLayout()` recomputes sizes from the SVG element, resizes axes, background and clip rect,
re-registers the x range (keeping the visible x domain) and emits `axes:changed` (type `resize`).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `ChronoAxes`, `refreshLayout`, `recomputeSizes`
- **Links:** [BEH-311](#beh-311-axes-changes-trigger-a-lightweight-redraw "Axes changes trigger a lightweight redraw"), [BEH-313](#beh-313-chronogram-size-buttons "Chronogram size buttons")

## BEH-303: Frame axis and time axis

Two stacked bottom axes below the plot area. The "Frame" axis (`.x.axis`, background `#fff0f0`,
about 1 tick per 50 px) shows frame numbers of the current x domain. The "Time" axis (`.t.axis`, background
`#f0f0f0`, about 1 tick per 150 px, tick lines extended up through the plot area as grid) shows
wall-clock time: `tScale` is a UTC time scale whose domain is
`starttime + frame/fps*1000 ms` for the two ends of the x domain, with `starttime = videoinfo.starttime`
and `fps = videoinfo.realfps` (copied by `axes.updateVideoinfo`). Tick labels use a multi-level
`d3.timeFormat` (ms, `:SS`, `HH:MM`, `HH:00`, weekday/day, month...) and a CSS class
(`ms_tick`, `s_tick`, `m_tick`, `h_tick`) for the font size. Both axes are refreshed in
`refreshAxes` after every domain or size change.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `xAxisInit`, `tAxisInit`, `updateTDomain`, `customTimeFormat`, `refreshAxes`, `updateVideoinfo`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video")

## BEH-304: X domain initialised from the video

`updateChronoXDomainFromVideo()` copies `videoinfo` start time and real fps into the axes and sets
the x domain to `[0, videoinfo.nframes-1]` (or `[0,1]` if `videoinfo.duration` is NaN). Setting the
domain through `axes.xdomain()` also resets the "original" scale used as zoom reference, resets the zoom
transform to identity and emits `axes:changed`. It is called when a video is loaded or its
parameters change (VideoControl, VideoList, OverlayControl). The "Video" button
(`onclick=onClickFocusVideo()`, title "Reinit view") switches off the track-window follow mode
([BEH-310](#beh-310-follow-window-toggle-and-video-button-view-recentring "Follow-window toggle and Video button (view recentring)")) and calls it, i.e. shows the whole video.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoXDomainFromVideo`, `domainxFromVideo`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `xdomain`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onClickFocusVideo`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video")

## BEH-305: Pan and zoom with mouse drag and wheel

The x scale is driven by a `d3.zoom` on `g#chronoGroup`.
- Dragging with the primary button pans horizontally (d3 default; a drag suppresses the click that follows).
- Wheel event (the default `wheel.zoom` listener is replaced): the handler calls `preventDefault`, then
  `zoom.translateBy(-deltaX/k, -deltaY/k)` (k = current zoom), then `zoom.scaleTo(k * 2^(-deltaY*mousewheelSpeed))`
  anchored at the pointer, with `mousewheelSpeed = 0.01` (e.g. one 100-unit wheel notch halves or doubles the
  visible span; down zooms out, up zooms in). The y part of the translation only changes the `y` of the stored
  transform; the x scale is derived with `rescaleX`, so it has no visible effect. Each of the two calls changes
  the transform, so each is expected to run `onZoom` (and thus a redraw) once: two redraws per wheel event
  ([DEBT-305](view_debt.md#debt-305-redraw-and-layout-are-expensive-and-loop-prone "Redraw and layout are expensive and loop-prone"), not counted by running).
- Zoom extent: scale `k` between `1/1.2` (can show 1.2 times the video) and `(frames in original domain)/10`
  (at least about 10 frames visible), relative to the domain set by `xdomain()`.
- `onZoom` clamps the translation so that the first frame of the original domain cannot move right of the view
  center and the last frame cannot move left of it (the code comment claims "10% of the view"; `pleft` and
  `pright` are both the view center, see [DEBT-303](view_debt.md#debt-303-wrong-commentbehavior-for-the-pan-clamp "Wrong comment/behavior for the pan clamp")), stores the clamped transform, then sets the x domain and
  emits `axes:changed` (type `zoom_x`) through `refreshAxes`.
- Quick Help states "Drag: pan, Shift+Mousewheel: zoom"; the code is the reference ([DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior")): see [BEH-306](#beh-306-mousewheel-mode-option "Mousewheel mode option").

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `onZoom`, `reinitZoom`, `injectEventFilter`
- **Links:** [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [DEBT-303](view_debt.md#debt-303-wrong-commentbehavior-for-the-pan-clamp "Wrong comment/behavior for the pan clamp"), [DEBT-305](view_debt.md#debt-305-redraw-and-layout-are-expensive-and-loop-prone "Redraw and layout are expensive and loop-prone"), [BEH-306](#beh-306-mousewheel-mode-option "Mousewheel mode option")

## BEH-306: Mousewheel mode option

Checkbox `#mousewheelMode` (label "Zoom in Chrono needs shift+mousewheel", in the Options panel).
`onMousewheelModeToggled` copies its state into `axes.mousewheelMode`. A filter wrapped around the
wheel handler enables wheel pan/zoom only if `mousewheelMode` is false, or Shift is held when it is
true. When the filter rejects the event the handler does not run: no `preventDefault`, so the page scrolls
normally. Default after `initChrono` is `false` (checkbox unchecked, set by `updateMousewheelModeButton`), i.e.
the wheel always pans/zooms when over the chronogram, without Shift (differs from Quick Help). The
`ChronoAxes` internal default is `true`, overridden at init.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `onMousewheelModeToggled`, `updateMousewheelModeButton`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `injectEventFilter`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#mousewheelMode`
- **Links:** [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior"), [OQ-304](../../QUESTIONS.md#oq-304 "Wheel with or without Shift")

## BEH-307: Current-frame time mark

A red rect (`.timeMark`, fill-opacity 0.1, stroke red) shows the current frame across the full plot
height, in the clipped time-mark layer below the content. `updateTimeMark()` reads
`getCurrentFrame()` (0 if undefined) and calls `axes.setTimeMark(frame)`; it is bound to the `videoControl` event
`frame:changed`, and `updatePreviewTimeMark` to `previewframe:changed` (it just calls `updateTimeMark`; the preview frame
is not drawn separately). `updateTimeMark` is
also called at every `updateChrono`. Geometry: x = `xScale(frame)-1`, width = pixel width
of one frame + 2 (class `timeMark thin`, width 3, when one frame is thinner than 1 px). If the frame is
outside the visible domain (`frame <= domain0-1` or `frame >= domain1`), the mark is pinned to the nearest
edge, width 2, class `timeMark out` (dashed, no fill).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateTimeMark`, `updatePreviewTimeMark`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `setTimeMark`, `refreshTimeMark`, `insertTimeMark`
- **Links:** [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners")

## BEH-308: Video span bar

A bar above the plot area (y from -15 to 0, group `#videoSpan`, clipped) shows the extent of the loaded
video: a pale green background (`#f0fff0`) over the plot width, a sky-blue rect with blue stroke from
`xScale(0)` to `xScale(nframes+1)`, and the video file name (last segment of `videoinfo.name`) as text at
`xScale(0)+2`. `updateVideoSpan()` is called at each `updateChrono`. The bar and its label have pointer events
and a crosshair cursor; a click on it is handled as a click above the plot ([BEH-331](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id "Click on the chronogram seeks a frame and selects an ID"): seek to that
frame, keep the selected ID).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `initVideoSpan`, `updateVideoSpan`
- **Links:** [ENT-003](view_entities.md#ent-003-video "Video"), [BEH-331](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id "Click on the chronogram seeks a frame and selects an ID")

## BEH-309: Track-window span bar and focus window

A translucent pink bar (`#trackWindowSpan`, opacity 0.4, above the plot area) shows
`[currentFrame - overlay.trackWindow.backward, currentFrame + overlay.trackWindow.forward]`, i.e. the
window of the track trail shown in the overlay. It is not clamped to the video bounds. It is updated on
`videoControl` `frame:changed` and `previewframe:changed`, on axes event `previewframe:trackend`, on overlay event
`trackWindow:change`, and at each `updateChrono`. Each `frame:changed`/`previewframe:changed` also triggers
`trackWindow:change` on `overlay`. `getWindow()` returns the same window clamped to `[0, videoControl.maxframe()]`
and is used by "R:Focus" (restrict to IDs seen in the window) and `getIdsInFocus`.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `initTrackWindowSpan`, `updateTrackWindowSpan`, `getWindow`
- **Links:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners")

## BEH-310: Follow-window toggle and Video button (view recentring)

Button `#focusTrackWindow` ("Follow", in the Focus Interval tab; `onClickFocusTrackWindow`) toggles
`lockFocusTrackWindow` and, when turning on, immediately recentres the chronogram on the track window with
`focusTrackWindow()`: `axes.xdomainFocus([f - backward, f + forward])`. While on, each overlay
`trackWindow:change` event (frame change, window change) repeats the recentring; the button has class `active`.
The same recentring is available once through `nextSeekFocusWindow()` (arms a one-shot `frame:changed`
handler, no caller found). The track-window buttons (`shiftTrackWindow`, `scaleTrackWindow`)
belong to the overlay ([CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes")) but result in this view change. `xdomainFocus` currently throws ([DEBT-304](view_debt.md#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror "xdomainFocus uses a zoom API that D3 no longer has (TypeError)")).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onClickFocusTrackWindow`, `focusTrackWindow`, `setFocusTrackWindow`, `updateFocusTrackWindowButton`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `nextSeekFocusWindow`, `gotoEvent_seekCB`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#focusTrackWindow`
- **Links:** [CAP-401](view_capabilities.md#cap-401-bee-track-boxes "Bee track boxes"), [DEBT-304](view_debt.md#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror "xdomainFocus uses a zoom API that D3 no longer has (TypeError)"), [BEH-304](#beh-304-x-domain-initialised-from-the-video "X domain initialised from the video")

## BEH-311: Axes changes trigger a lightweight redraw

Every change of the x or y domain, of the zoom or of the layout makes `refreshAxes` redraw ticks, time mark and ID
selection, and emit the jQuery event `axes:changed` on the `axes` object for event types `xDomainChanged`,
`yDomainChanged`, `zoom_x`, `resize`. `onAxesChanged` handles it with `updateChrono()` only (render, no data
recomputation). `updateChrono` must never call functions that emit `axes:changed` (comment: infinite loop); the
ydomain update is therefore in `updateChronoYDomain`, called by `drawChrono`, not in `updateChrono`. `updateChrono` never calls
`refreshChronogram`. Redraw order in `updateChrono`: `renderActivities`, `updateTagIntervals`
([BEH-328](#beh-328-tag-intervals-refreshed-at-every-redraw "Tag intervals refreshed at every redraw")), `updateTimeMark`, `updateVideoSpan`, `updateTrackWindowSpan`, then the status bar ([BEH-314](#beh-314-status-bar-and-slow-display-warning "Status bar and slow-display warning")).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `refreshAxes`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onAxesChanged`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChrono`, `drawChrono`, `refreshChronogram`
- **Links:** [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [DEBT-305](view_debt.md#debt-305-redraw-and-layout-are-expensive-and-loop-prone "Redraw and layout are expensive and loop-prone")

## BEH-312: Z+, Z-, shift buttons and the time-domain operations

Chronogram tab "View:" buttons: step-backward/step-forward (`shiftTimeDomain(-0.5)` / `shiftTimeDomain(0.5)`),
`Z+` (`scaleTimeDomain(2)`), `Z-` (`scaleTimeDomain(1/2)`). Intended behavior: `shiftTimeDomain(f)` shifts the
visible domain by `round(f * span)` frames; `scaleTimeDomain(s)` scales the visible span by `1/s` around the current frame
if it is visible, else around the center of the view. Both go through `axes.xdomainFocus`, which adds a 10% margin
(`marginFactor` 1.1 around the new center), limits the scale to the zoom extent and re-applies the transform.
In the shipped D3 6.2 the zoom object has no `translate()`/`scale()`, so `xdomainFocus` throws a TypeError on
its first line and these buttons currently have no effect ([DEBT-304](view_debt.md#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror "xdomainFocus uses a zoom API that D3 no longer has (TypeError)")).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `scaleTimeDomain`, `shiftTimeDomain`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `xdomainFocus`, `xdomainScale`, `xdomainCenter`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#chronoTab`
- **Links:** [DEBT-304](view_debt.md#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror "xdomainFocus uses a zoom API that D3 no longer has (TypeError)"), [OQ-302](../../QUESTIONS.md#oq-302 "What should the view-window controls do?")

## BEH-313: Chronogram size buttons

Buttons "Size:" `h-`, `h=`, `h+`, `w-`, `w=`, `w+` call `chronoAdjust(mode)` (`"H-"`, `"H="`, `"H+"`, `"W-"`, `"W="`, `"W+"`) with factor 1.2.
Height is expressed per ID row: `chronoItemHeight` (default 12 px). `adjustChronogramHeight(h)` (null becomes 12) stores
`chronoItemHeight = h`, sets the height of `#chronoDiv` to `N_ids * h + marginTop + marginBottom` (N = `axes.ydomain().length`;
margins 15 + 50 px), then calls `refreshChronoLayout` ([BEH-347](#beh-347-layout-refresh-and-collapsed-chronogram "Layout refresh and collapsed chronogram")). `h-` divides `chronoItemHeight` by 1.2, `h+` multiplies,
`h=` resets to 12 px; there is no lower bound. `w-` sets the total width of `#chronoDiv` to `(width - 80)/1.2 + 80`
(80 = left + right margins) and clamps the total width (margins included) to at least 200 px. The behavior of `w=`
(uses the width of `#canvasresize`; at-least-200 clamp) and `w+` (no upper bound) was read earlier and not re-checked.
`updateChronoYDomain` (called by `drawChrono`) ends with `adjustChronogramHeight(chronoItemHeight)`, so after every
data refresh the div height fits the number of rows. `getChronoItemHeight` computes `(height - margins)/N` and calls `console.trace`.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `chronoAdjust`, `adjustChronogramHeight`, `getChronoItemHeight`, `updateChronoYDomain`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#chronoDiv`
- **Links:** [BEH-347](#beh-347-layout-refresh-and-collapsed-chronogram "Layout refresh and collapsed chronogram"), [BEH-346](#beh-346-user-resize-of-the-chronogram-div "User resize of the chronogram div"), [DEBT-305](view_debt.md#debt-305-redraw-and-layout-are-expensive-and-loop-prone "Redraw and layout are expensive and loop-prone"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-314: Status bar and slow-display warning

`#chronoStatusBar` shows "Preparing chrono data..." while `updateChronoData` runs, then at the end of every
`updateChrono`: "Chrono update X ms, redraw Y ms; data: N items, M intervals, K tags" (N = `chronogramData.length`, M =
`allIntervals.length`, K = `flatTags.length`; X, Y from `chrono.perf.chronoUpdate` / `chronoRedraw`, rounded). If either
exceeds 50 ms it appends "Slow display, consider closing the chronogram or filtering the data". Before the first data
update `chronoUpdate` is undefined and X shows NaN.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChrono`, `updateChronoData`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#chronoStatusBar`
- **Links:** [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")

## BEH-315: ID axis domain and row order

The y axis is an ordinal band scale, one row per ID; empty domain becomes the single dummy row `"-"`.
`updateChronoYDomain` (called by `drawChrono`) picks the IDs: if `flag_restrictID`, exactly the entries of
`restrictIDArray` (as typed, even IDs absent from the data); else `validIdsChrono()`: the IDs of `chronogramData` (`validIdsDomain`; without those
whose comma-separated `labels` contain `wrongid`/`falsealarm` when `flag_hideInvalid`), plus, unless `tagMode == 'Tracks'` (the shipped
default, no code changes it), the IDs of `tagIntervals` (`validTagIdsDomain`), ordered by `sortIds` (applied in `validIdsChrono`, to the non-restricted case only) (letters part by locale compare,
then numeric part). The domain is then passed through `chrono.config.idAxisMap` (always set, identity by default),
de-duplicated and sorted numerically ascending by `Number(id)`. For non-numeric IDs (`NaN`) this second sort
makes the order unreliable and can undo `sortIds` ([DEBT-306](view_debt.md#debt-306-id-axis-ordering-and-remap-fall-through "ID axis ordering and remap fall-through")). Row order defines navigation order ([BEH-337](#beh-337-ordering-of-events-across-ids "Ordering of events across IDs")).
Hide-invalid for tag IDs: the tag branch of `validTagIdsDomain` tests `d.labels` (with `containsLabel`), but tag intervals built
by `updateTagIntervals` carry `labeling` and no `labels`, and `containsLabel(undefined, ...)` returns false, so that test excludes nothing
([DEBT-318](view_debt.md#debt-318-tag-branch-of-validtagidsdomain-reads-a-field-tag-intervals-do-not-have "Tag branch of validTagIdsDomain reads a field tag intervals do not have")); the effective hide-invalid filter on tag intervals is in `updateChronoData`, which tests `interval.labeling.falsealarm || interval.labeling.wrongid`
before the y domain is computed. This only matters when `tagMode != 'Tracks'`.

- **Group:** [CAP-302](view_capabilities.md#cap-302-id-axis-and-layout "ID axis and layout")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoYDomain`, `validIdsChrono`, `validIdsDomain`, `validTagIdsDomain`, `sortIds`, `updateChronoData`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `ydomain`
- **Links:** [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [DEBT-306](view_debt.md#debt-306-id-axis-ordering-and-remap-fall-through "ID axis ordering and remap fall-through"), [DEBT-318](view_debt.md#debt-318-tag-branch-of-validtagidsdomain-reads-a-field-tag-intervals-do-not-have "Tag branch of validTagIdsDomain reads a field tag intervals do not have"), [OQ-307](../../QUESTIONS.md#oq-307 "ID order for mixed IDs")

## BEH-316: ID axis rendering and row grid

Left axis (`.y.axis`, 40 px wide pale yellow background, label "ID") with one tick label per domain value, no tick
marks; a horizontal gridline (`line.gridline`, gray 1px) is drawn at the top of each band across the plot width (no
line under the last row). Row height is `plotHeight/N` (D3 band scale, default padding 0); intervals use half of the band.

- **Group:** [CAP-302](view_capabilities.md#cap-302-id-axis-and-layout "ID axis and layout")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `yAxisInit`, `yAxisResized`, `yAxis`
- **Links:** [BEH-313](#beh-313-chronogram-size-buttons "Chronogram size buttons")

## BEH-317: Selected ID highlight on the axes

`updateChronoSelection()` calls `axes.selectId(defaultSelectedBee)`; `selectId` stores `axes.selectedID` and calls
`refreshIdSelection`. It is meant to run on `selectionControl` events `tagselection:created` / `tagselection:cleared`, but the
subscription lines in `initChrono` are commented out ("Events declared in selectionControl"); where it is actually bound was
not seen. `refreshIdSelection` removes class `selectedid` from all y tick labels, adds it (green, bold) to the tick whose datum equals
`selectedID` (loose `==`), removes the previous `.selection` rect, and, if `selectedID != null`, appends a `rect.selection` to
`.plotBackground` (behind the intervals): x = 0, width = plot width, `y = yScale(selectedID)`, height = band width, white fill, 2px `#008000` stroke.
`refreshAxes` re-applies it after every axes change. For a selected ID that has no row (not in the y domain; also an unmapped ID
in modulo mode, [BEH-318](#beh-318-id-remap-buttons-id-modulo "ID remap buttons (ID, Modulo)")) `yScale(id)` is undefined: no tick is highlighted and, by d3 `attr` semantics (inferred, not run), the rect
has no `y` attribute and sits at the top of the plot ([DEBT-317](view_debt.md#debt-317-selected-id-outline-for-an-id-without-a-row "Selected-ID outline for an ID without a row")). Selecting a bee in the overlay without a selection event
(or an ID only set as `defaultSelectedBee`) updates the row only at the next `axes` refresh. The green outline on
intervals is separate ([BEH-322](#beh-322-selected-id-outline-on-intervals "Selected-ID outline on intervals")).

- **Group:** [CAP-302](view_capabilities.md#cap-302-id-axis-and-layout "ID axis and layout")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoSelection`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `selectId`, `refreshIdSelection`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByID`
- **Links:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners"), [DEBT-317](view_debt.md#debt-317-selected-id-outline-for-an-id-without-a-row "Selected-ID outline for an ID without a row")

## BEH-318: ID remap buttons (ID, Modulo)

Filter tab, "ID Remap:" buttons (class `btn btn-xs`): `chrono.click_setIdAxisMap('id')` sets `idAxisMapMode='id'` and restores the identity map;
`chrono.click_setIdAxisMap('modulo')` asks `prompt("Set ID axis remap with modulo:", 20)` and (unless canceled)
sets `idAxisMapMode='modulo'` and maps each row to `String(Number(id) % Number(mod))`, so several bees share one row (y), each interval/observation
using `y = idAxisMap(id)` for its row and `id` for identity. Both call `update_idAxisMap`, which calls `refreshChronogram()`. In `modulo` mode a click on the plot background
([BEH-331](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id "Click on the chronogram seeks a frame and selects an ID")) only seeks the frame (`onAxesClick` does not call `gotoEvent`); a click on an interval still calls `gotoEvent(frame, d.id)` with the
original (unmapped) ID and so still selects it ([BEH-332](#beh-332-click-on-an-event-interval "Click on an event interval")). A non-numeric or empty input gives NaN rows. The text-input variant (`idAxisMap_inputChanged`, `idAxisMapString`) is commented out in the page
and incomplete in the code (`$('#')`).

- **Group:** [CAP-302](view_capabilities.md#cap-302-id-axis-and-layout "ID axis and layout")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `click_setIdAxisMap`, `update_idAxisMap`, `idAxisMap_inputChanged`
- **Links:** [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [DEBT-306](view_debt.md#debt-306-id-axis-ordering-and-remap-fall-through "ID axis ordering and remap fall-through"), [OQ-306](../../QUESTIONS.md#oq-306 "ID Remap purpose and selection in modulo mode"), [BEH-331](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id "Click on the chronogram seeks a frame and selects an ID"), [BEH-332](#beh-332-click-on-an-event-interval "Click on an event interval")

## BEH-319: Filter and restriction effects on the display

Chronogram contents and rows depend on the filters of [CAP-801](view_capabilities.md#cap-801-filters "Filters") (RestrictID `#restrictID`/`#restrictIDButton`/R:Selection/R:Focus;
ExcludeID `#excludeID`/`#excludeIDButton`; `#hideInvalidButton`; `#hideFlowersButton`; frame filter
`#filterFrameButton`, `#chronoFrameFilterFrameMin/Max`, Refresh, Auto, All). The chronogram displays whatever `chronogramData`,
`allIntervals`, `flatTracks`, `tagIntervals` contain after `refreshChronogram`; rows follow [BEH-315](#beh-315-id-axis-domain-and-row-order "ID axis domain and row order"). `setFrameFilter` and the button handlers
of this file are specified in [CAP-801](view_capabilities.md#cap-801-filters "Filters") (referenced here only as the source of the filters). Each of them ends with `refreshChronogram()`,
except the frame-filter min/max fields which only flash the "Filter" or "Refresh" button to tell the user to apply (`flash`).

- **Group:** [CAP-302](view_capabilities.md#cap-302-id-axis-and-layout "ID axis and layout")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `setRestrictID`, `click_restrictID`, `click_excludeID`, `click_hideInvalid`, `click_hideFlowers`, `Chronogram`, `flash`
- **Links:** [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## BEH-320: Event interval rectangles

Each element of `allIntervals` (one per run of consecutive frames of one ID, see [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")) is a `rect.interval` in `intervalLayer`:
x = `xScale(x1)`, width = `xScale(x2+1)-xScale(x1)` (inclusive of last frame), y = `yScale(d.y)` (top of the row), height =
half the band. Only intervals intersecting the visible x domain are bound (`x2+2 >= xmin && x1-1 <= xmax`). Data are joined by position, not
by key. A single-frame interval is a one-frame wide rect; at low zoom it may be sub-pixel. Rendering runs at each `updateChrono`
(`renderActivities` -> `ChronoIntervals.updateAndRender`, then `render` again, redundantly).

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderActivities`, `ChronoIntervals`, `Chronogram`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## BEH-321: Event interval colors by label

CSS (`custom.css`): `.interval` fill gray, stroke black 0.5px. `renderEnterLeavePollen` sets CSS classes
`entering`, `leaving`, `pollen`, `fanning` on an interval when `d.haslabel[...]` has that label (the set of labels of any observation in
the merged run). Fill: entering magenta, leaving green `rgb(44,161,44)`, pollen yellow, fanning purple. Rules have equal
specificity; the later one wins, so precedence is fanning > pollen > leaving > entering > gray. No other label (wrongid,
falsealarm) changes the fill. Labels are open vocabulary ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")); these four are hard-coded.

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderEnterLeavePollen`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-307](view_debt.md#debt-307-four-label-colors-hard-coded-in-css-and-js "Four label colors hard-coded in CSS and JS"), [OQ-305](../../QUESTIONS.md#oq-305 "Label colors and precedence on intervals"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## BEH-322: Selected-ID outline on intervals

`ChronoIntervals.renderSelection` adds class `selected` (stroke `#00FF00` 2px) to all intervals whose `id == defaultSelectedBee` (loose
equality). It runs at each `renderActivities` and after an interval click; it is not triggered by selection events alone, so it can lag
behind the row highlight ([BEH-317](#beh-317-selected-id-highlight-on-the-axes "Selected ID highlight on the axes")) until the next redraw (pan, zoom, refresh).

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderSelection`, `renderActivities`
- **Links:** [BEH-317](#beh-317-selected-id-highlight-on-the-axes "Selected ID highlight on the axes")

## BEH-323: Interval hover tooltip

Mouse over an interval shows the shared `chrono.tooltip` (`div.tooltip`, absolute) at pointer + (20, 20) px with
`ID=<id>`, `Frames=<x1>-<x2> +` (the literal " +" is in the message), `Time=<HH:MM:SS of videoControl.frameToTime(x1)>`, "Annotation:",
`Labels=<d.labels>`; hidden again on mouse out. (Tag Hamming/DM lines and `newid` are commented out.) `format_HMS(date)` pads
`HH:MM:SS` (local time).

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `intervalMouseOver`, `intervalMouseOut`, `format_HMS`, `initTooltip`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-324: Dangling track start/end marks

Option `chrono.config.showDanglingTracks` (default true, no UI; when false, existing marks are removed and none are drawn). For intervals whose first (or last) observation center lies inside the
global `ROI` rectangle (hard-coded `{left:175, top:250, right:2305, bottom:1240}` for "Gurabo 5MP" videos, `startInsideROI`/`endInsideROI`
computed during interval building), a half-frame-wide rect of half the band height is drawn in `topLayer` at the start
(from `x1-0.5` to `x1`) and at the end (from `x2+1` to `x2+1.5`), stroke 2px. `chrono.config.hide_non_dangling` is lazily initialised to
true. With true, start marks are drawn only for intervals with `startInsideROI` and end marks only for intervals with `endInsideROI`, so all marks are red. With false, start and end marks
are drawn for all intervals, each colored independently: start mark red when `startInsideROI`, else green; end mark red when `endInsideROI`, else green.
The default marks tracks that begin or end inside the arena (they should have entered/left through the border).

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderChrono_danglingTracks`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `ROI`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [DEBT-308](view_debt.md#debt-308-hard-coded-roi-and-dangling-mark-colors "Hard-coded ROI and dangling-mark colors"), [OQ-308](../../QUESTIONS.md#oq-308 "Dangling marks and the ROI")

## BEH-325: "Show Events" option

Checkbox `#showObsChrono` (Options > Chronogram > "Show Events", default checked; global `showObsChrono`) calls
`onChronoParametersChanged`, which copies it and `#showTagsChrono` into globals and calls `refreshChronogram()`. When unchecked,
`updateChronoData` empties `chronogramData` and skips `updateChronogramData`/`createIntervalList`, so no row is created from events; but
`allIntervals` is not cleared, so the previously computed intervals stay on screen ([DEBT-309](view_debt.md#debt-309-show-events-off-leaves-stale-intervals "Show Events off leaves stale intervals")).

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onChronoParametersChanged`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoData`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#showObsChrono`
- **Links:** [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [DEBT-309](view_debt.md#debt-309-show-events-off-leaves-stale-intervals "Show Events off leaves stale intervals")

## BEH-326: Show Individual Events option (no visible effect in the default renderer)

Options > Chronogram > "Show Individual Events" (checkbox class `button_showIndividualEvents`, flag `flag_showIndividualEvents`, default off).
Clicking calls `onToggleButton_showIndividualEvents`: the flag takes the checkbox state, `updateButtons_showIndividualEvents` synchronises all buttons/checkboxes of that class,
and `refreshChronogram()` is called. The flag is only read by the legacy renderer ([BEH-327](#beh-327-legacy-activity-renderer-not-active-by-default "Legacy activity renderer (not active by default)")): `updateActivities` draws per-observation span
rects and redundancy circles. With `legacyActivities=false` (default) the option changes nothing visible. The page checkbox carries the HTML attribute `checked="false"`, which
HTML reads as checked; it is shown unchecked only because `initChrono` resets it through `updateButtons_showIndividualEvents`.

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `onToggleButton_showIndividualEvents`, `toggledNewState`, `updateButtons`
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `updateActivities`
- **Links:** [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram"), [SEAM-303](view_seams.md#seam-303-chronogram-view-and-its-dom-page "Chronogram view and its DOM page")

## BEH-327: Legacy activity renderer (not active by default)

`ChronoControlActivitiesLegacy.js` is loaded by `labelbee_page.html` (after `ChronoControl.js`) and defines global functions. Its event renderer
`updateActivities` is used only if `chrono.config.legacyActivities` is true, which has no UI: the console hint printed by `Chronogram` says to run
`chrono.config.legacyActivities = true; removeActivities(); renderActivities()`. Legacy rendering, per `allIntervals`: gray `rect.activity` per
interval (click: `gotoEvent(x1,id)`, native `<title>` tooltip), `rect.pollen` yellow, `rect.fanning` purple (lower half), `rect.entering`/`rect.leaving` 4px markers,
`circle.obs` r=5 at `x1` (fill by Activity, thick stroke when `pollen`, tooltip with labels, newid and tag Hamming/DM), red/blue `path.crossLeft` crosses for `falsealarm`/`wrongid`
intervals (no pointer events), `rect.partsAvailable` squares for events with parts, and, with "Show Individual Events", red-outlined per-observation `rect.obsspan` (click: `gotoEvent(frame,id)`) plus cyan
`circle.alertcircle` on redundant observations (`isredundant`). It replaces `.tooltip` elements (leaving `chrono.tooltip` detached). `createIntervalList_legacy`
(splits by activity) has no caller. The file also owns the tag renderer in use at init ([BEH-329](#beh-329-tag-interval-rendering-legacy-file-not-invoked "Tag interval rendering (legacy file, not invoked)")).

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `updateActivities`, `removeActivities`, `initActivities`, `setGeomActivity`, `updateObsSpan`, `updateAlertCircle`, `createIntervalList_legacy`, `renderChrono_Parts`, `onActivityClick`, `onObsSpanClick`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderActivities`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#chronoTab`
- **Links:** [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [DEBT-310](view_debt.md#debt-310-legacy-file-contains-live-and-dead-code-and-is-always-loaded "Legacy file contains live and dead code, and is always loaded"), [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram"), [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")

## BEH-328: Tag intervals refreshed at every redraw

`updateChrono` calls `updateTagIntervals()` each time the chronogram is redrawn (also on every pan, zoom and resize). This function rebuilds
`tagIntervals` from `ttags` (ID, frame to tag index), merging consecutive frames, applying `tagsSampleFilter`/`tagsIntervalFilter`; each interval
`{id, y, begin, end, hammingavg, dmavg, labeling:{}}`. This runs regardless of `showTagsChrono`. It overwrites the result of the data pass
(`updateChronoData`: `updateTagsLabels` fills `labeling`, adds virtual intervals for `wrongid`, applies "Hide FA/WrongID"). After any redraw,
`tagIntervals` is therefore the raw list with an empty `labeling` and no virtual intervals ([DEBT-311](view_debt.md#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals")). Nothing in this function draws.

- **Group:** [CAP-304](view_capabilities.md#cap-304-tag-display "Tag display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChrono`, `updateTagIntervals`, `updateTagsLabels`, `updateChronoData`
- **Links:** [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [DEBT-311](view_debt.md#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals"), [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [OQ-303](../../QUESTIONS.md#oq-303 "Tag-interval labels after a redraw")

## BEH-329: Tag interval rendering (legacy file, not invoked)

`renderTagIntervals` (legacy file) draws `rect.tag` per tag interval in `tagLayer`: x from `begin` to `end+1`, bottom-aligned in the row, height by mean Hamming distance
(`hammingavg<=0`: full band, 1: 3/4, 2: 1/2, above 2: 1/4), blue translucent (fill-opacity 0.2) by default, magenta `#ff00c0` if `labeling.entering`, white 0.1 if `virtual`; the
"leaving" green branch tests `labeling.leaving`, which is never set. Click: `gotoEvent(begin,id)`; tooltip `div.tooltip2` (BeeID, frame, time, HammingAvg, DM). The only caller is
`initTagIntervals` at chronogram init with an empty list; the redraw path never calls it, so tag intervals are not shown in the chronogram in the default build
([DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events")).

- **Group:** [CAP-304](view_capabilities.md#cap-304-tag-display "Tag display")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `renderTagIntervals`, `insertTag`, `setTagGeom`, `onTagClick`, `initTagIntervals`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `initChrono`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram")

## BEH-330: "Show Tags" option

Checkbox `#showTagsChrono` (Options > Chronogram > "Show Tags", default checked, global `showTagsChrono`) triggers `onChronoParametersChanged` -> `refreshChronogram`. In
`updateChronoData` unchecking it skips the first `updateTagIntervals()` and starts `tagIntervals = []`; because `updateChrono` rebuilds `tagIntervals` unconditionally ([BEH-328](#beh-328-tag-intervals-refreshed-at-every-redraw "Tag intervals refreshed at every redraw")), the option has no lasting effect on
the list used for the display or the tag/freetag navigation modes.

- **Group:** [CAP-304](view_capabilities.md#cap-304-tag-display "Tag display")
- **Code:**
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `onChronoParametersChanged`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateChronoData`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#showTagsChrono`
- **Links:** [DEBT-311](view_debt.md#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals"), [BEH-328](#beh-328-tag-intervals-refreshed-at-every-redraw "Tag intervals refreshed at every redraw")

## BEH-331: Click on the chronogram seeks a frame and selects an ID

A click anywhere in `g#chronoGroup` (ignored if `defaultPrevented`, e.g. after a drag) computes `frame` and `id` and emits jQuery event `axes:clicked`:
- `frame = round(xScale.invert(x))`; if the click is left of the plot (ID tick column, x < 0) the current frame is used.
- `id`: the row under the pointer; if the pointer is above the plot (y < 0: video span, track-window span) the currently selected ID (`axes.selectedID`); below the last row
  `id` is `undefined`.
`onAxesClick` then calls `gotoEvent(frame, id)` when `idAxisMapMode == 'id'`; in `modulo` mode only `videoControl.seekFrame(Number(frame))` ("avoid losing current selection").
Clicking below the last row in `id` mode therefore clears the selection ([BEH-333](#beh-333-gotoeventframe-id "gotoEvent(frame, id)")). Clicks on intervals do not reach this handler ([BEH-332](#beh-332-click-on-an-event-interval "Click on an event interval")).

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `onAxesClick`, `invertYScale`, `getFrameFromEvent`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onAxesClick`
- **Links:** [OQ-306](../../QUESTIONS.md#oq-306 "ID Remap purpose and selection in modulo mode"), [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video"), [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling"), [BEH-318](#beh-318-id-remap-buttons-id-modulo "ID remap buttons (ID, Modulo)"), [BEH-332](#beh-332-click-on-an-event-interval "Click on an event interval")

## BEH-332: Click on an event interval

Clicking a `rect.interval` stops propagation (no background click) and calls `gotoEvent(frame, d.id)`, where `frame` is the frame under the pointer (via
`axes.getFrameFromEvent`, no longer the interval start) and `d.id` the original ID (not the remapped row), then redraws the selection outline ([BEH-322](#beh-322-selected-id-outline-on-intervals "Selected-ID outline on intervals")). Intervals therefore select the ID and seek to the clicked frame inside
the interval, in both `id` and `modulo` remap modes ([BEH-318](#beh-318-id-remap-buttons-id-modulo "ID remap buttons (ID, Modulo)")).

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `intervalClicked`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `getFrameFromEvent`
- **Links:** [BEH-334](#beh-334-double-click-on-the-chronogram "Double click on the chronogram"), [BEH-318](#beh-318-id-remap-buttons-id-modulo "ID remap buttons (ID, Modulo)"), [BEH-331](#beh-331-click-on-the-chronogram-seeks-a-frame-and-selects-an-id "Click on the chronogram seeks a frame and selects an ID"), [OQ-306](../../QUESTIONS.md#oq-306 "ID Remap purpose and selection in modulo mode")

## BEH-333: gotoEvent(frame, id)

Common entry to "go to frame and select ID": pauses the video (`videoControl.pause()`), sets `defaultSelectedBee = id`; if `frame` is the current frame it calls `selectBeeByID(id)` (selects the box in the
overlay, or, if none, just stores the default and emits `tagselection:created`/`cleared` according to `id == null`); otherwise it seeks (`videoControl.seekFrame(frame)`) with the ID as default selection, so
the selection is applied when the new frame loads. If `overlay.opts.clickModeAutoCentering` is on, the "AutoCentering" button flashes yellow and `autoCentering(obs)` centres the overlay canvas on the observation `Tracks[frame][id]`
(skipped with a log if it does not exist). Also called from the observation table ([BEH-341](#beh-341-observation-table-rows-go-to-the-event "Observation table rows go to the event")). `id == undefined` clears the selection.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoEvent`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `selectBeeByID`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `autoCentering`
- **Links:** [CAP-201](view_capabilities.md#cap-201-load-video-metadata-and-video "Load video metadata and video"), [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners")

## BEH-334: Double click on the chronogram

Handlers: `onAxesDblClick` (event `axes:dblclick` from `chronoGroup` `dblclick`, unless `defaultPrevented`) is meant to zoom on `[frame - backward*1.05, frame + forward*1.05]` (the track window around the clicked frame)
through `axes.xdomainFocus`. In practice (a) `xdomainFocus` throws ([DEBT-304](view_debt.md#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror "xdomainFocus uses a zoom API that D3 no longer has (TypeError)")); (b) `d3.zoom` is attached to the same element (`chronoGroup.call(zoom)`) and only its `wheel.zoom` listener is replaced, so
d3's own `dblclick.zoom` (zoom in by 2, 0.5 with Shift, with a transition) is still installed next to the custom `dblclick` listener (different namespace; no other `dblclick.zoom` removal exists in `ChronoAxes.js`). Whether the custom handler also runs, and which of the two wins, depends on d3 runtime behavior and was not verified (needs a browser, Phase 1d). Each double click also fires
two single clicks first (two `gotoEvent` calls).

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onAxesDblClick`
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `onAxesDblClick`
- **Links:** [DEBT-304](view_debt.md#debt-304-xdomainfocus-uses-a-zoom-api-that-d3-no-longer-has-typeerror "xdomainFocus uses a zoom API that D3 no longer has (TypeError)"), [DEBT-312](view_debt.md#debt-312-dead-interaction-code "Dead interaction code"), [OQ-302](../../QUESTIONS.md#oq-302 "What should the view-window controls do?")

## BEH-335: Event-seek mode buttons

Events tab buttons `Tag`, `UnlabeledTag`, `Event`, `Frame` (class `eventSeekMode eventSeekMode-<mode>`; modes `tag`, `freetag`, `event`, `eventframe`) call
`eventSeekModeClicked(mode)`, which sets global `eventSeekMode` and highlights the clicked button (`active`) via `updateEventSeekMode`. Default `eventframe`, highlighted at init. Tooltips: "Events mode: next/prev event with same ID",
"Frame mode: next/prev frame with at least one event". Setting the mode does not move anything.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `eventSeekModeClicked`, `updateEventSeekMode`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#eventsTab`
- **Links:** [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")

## BEH-336: Next / Previous event

Buttons `Next` / `Prev` (`gotoNextEvent()` / `gotoPreviousEvent()`) start from the current frame (`videoControl.getCurrentFrame()`) and the selected ID (`defaultSelectedBee`), unless a
start `{frame, id}` is passed (used by First/Last, [BEH-338](#beh-338-first--last-event-and-autoseek "First / Last event and AutoSeek")). According to `eventSeekMode` (candidate lists: [BEH-348](#beh-348-candidate-lists-of-event-navigation "Candidate lists of event navigation")):
- `tag` / `freetag`: seek to `interval.begin` of the found tag interval and select `interval.id`.
- `event`: seek to the frame of the found observation and select its ID.
- `eventframe`: seek to the found frame and select the ID that was passed in (the selected ID, or the one given by First/Last).
Not found: console log only, nothing moves. Moving uses `gotoFrameId` (sets `defaultSelectedBee`, `videoControl.seekFrame(Number(frame))`; does not pause and
does not call `selectBeeByID`).

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoNextEvent`, `gotoPreviousEvent`, `gotoFrameId`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#eventsTab`
- **Links:** [BEH-348](#beh-348-candidate-lists-of-event-navigation "Candidate lists of event navigation"), [BEH-337](#beh-337-ordering-of-events-across-ids "Ordering of events across IDs"), [BEH-338](#beh-338-first--last-event-and-autoseek "First / Last event and AutoSeek"), [BEH-335](#beh-335-event-seek-mode-buttons "Event-seek mode buttons")

## BEH-337: Ordering of events across IDs

For `tag` and `event` modes in auto mode, events are ordered by (row position of the ID in `axes.yScale`, then frame/`begin`): `getIdCoord(id) = axes.yScale(id)`, which is
`undefined` for IDs without a row. The comparators then return `NaN`, which JavaScript's sort treats as a tie, and the "greater than" tests are false for such IDs, so the position of events of IDs without a row
in the order is unspecified and they are skipped as "next" targets. Hence "next" visits all events of an ID before the first event of the next row, and the order of rows is that of [BEH-315](#beh-315-id-axis-domain-and-row-order "ID axis domain and row order"). In `event`
mode non-auto only the same ID is considered. `eventframe` mode ignores IDs and orders by frame number.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `getIdCoord`, `compareIncreasingIdFrame`, `funGreaterThanIdFrame`, `compareIncreasingIdBegin`, `funGreaterThanIdBegin`
- **Links:** [BEH-315](#beh-315-id-axis-domain-and-row-order "ID axis domain and row order"), [BEH-336](#beh-336-next--previous-event "Next / Previous event"), [DEBT-313](view_debt.md#debt-313-navigation-sorts-shared-arrays-in-place-and-mixes-id-types "Navigation sorts shared arrays in place and mixes id types")

## BEH-338: First / Last event and AutoSeek

`First` / `Last` buttons (`gotoFirstEvent` / `gotoLastEvent`) call next (previous) from the virtual position `frame=-1` (`maxframe()+1`) with the selected ID; in AutoSeek mode (`flag_autoEventMode`) the ID is the first
(last) row of `axes.yScale.domain()`, so that the very first (last) event of the whole chronogram is reached. Button `#autoEventButton` ("AutoSeek", class `btn-green-toggle`) toggles
`flag_autoEventMode` (class `active`) and calls `refreshChronogram()` (no evident reason). Default off. In `eventframe` mode the search ignores the ID, but the ID passed
on is still the selection target: with AutoSeek on, First selects the first row's ID even in `eventframe` mode ([OQ-312](../../QUESTIONS.md#oq-312 "First/Last in AutoSeek with `eventframe` mode")).

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `gotoFirstEvent`, `gotoLastEvent`, `onAutoEventButtonClick`, `update_autoEventMode`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#autoEventButton`
- **Links:** [BEH-336](#beh-336-next--previous-event "Next / Previous event"), [OQ-312](../../QUESTIONS.md#oq-312 "First/Last in AutoSeek with `eventframe` mode")

## BEH-339: Next ID / Previous ID

Buttons `#nextIDButton` / `#prevIDButton` (Selected tab): take the visible rows (`validVisibleTagIdsDomain` = `sortIds(axes.ydomain())`, as strings), find the position of the selected ID (`getCurrentID`) and cycle to the next
(previous) one with wrap-around; if the current ID is not in the list, the first (last) is taken. The new ID is selected (`selectBeeByID`), written to the RestrictID field/array (`setRestrictID`, which refreshes the chronogram only if
the restriction is active) and, in AutoSeek mode, the view goes to its first event (`gotoFirstEvent`; `onClickPrevID(true)` would go to the last, but the button passes no argument). Finally `refreshChronogram()`.
When RestrictID is active, the visible rows are only the restricted IDs, so Next/Prev cannot leave the restricted ID ([DEBT-314](view_debt.md#debt-314-nextprev-id-blocked-by-restrictid-side-effects "Next/Prev ID blocked by RestrictID; side effects")). `onClickNextIDStart` is a variant that always goes to the first event, with no caller.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onClickNextID`, `onClickPrevID`, `onClickNextIDStart`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `validVisibleTagIdsDomain`, `setRestrictID`, `restrictIDFromSelection`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#nextIDButton`, `#prevIDButton`
- **Links:** [CAP-501](view_capabilities.md#cap-501-skeleton-labelling "Skeleton labelling"), [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [DEBT-314](view_debt.md#debt-314-nextprev-id-blocked-by-restrictid-side-effects "Next/Prev ID blocked by RestrictID; side effects")

## BEH-340: No keyboard shortcut for chronogram navigation

No key binding in `labelBee.js` calls the chronogram navigation functions (first/previous/next/last event, next/previous ID, zoom). The chronogram is mouse/button only. Ctrl+hover "track frame" preview in the chronogram
(`injectTrackFrame`: Ctrl + mouse move triggers `previewframe:trackmove` -> `onAxesMoved` -> `videoControl.seekFrame(frame, "preview")`, release returns to the original frame via `endPreview`) is implemented but its
installation call (`injectTrackFrame(chronoGroup)`) is commented out, so it is inactive, together with its `keydown.trackFrame`/`keyup.trackFrame` handlers on `body`.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/ChronoAxes.js](../../../labelbee/static/labelbee/js/ChronoAxes.js): `injectTrackFrame`
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `onAxesMoved`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `initChrono`
- **Links:** [DEC-005](view_decisions.md#dec-005-keyboard-shortcuts-belong-in-one-place "Keyboard shortcuts belong in one place"), [OQ-309](../../QUESTIONS.md#oq-309 "Chronogram keyboard shortcuts and Ctrl-hover preview"), [DEBT-312](view_debt.md#debt-312-dead-interaction-code "Dead interaction code")

## BEH-341: Observation table rows go to the event

The observation table `#obsTable` (Labeling tab) is rebuilt by `refreshChronogram` -> `renderObsTable` from `flatTracks` (columns ID, Frame, Labels; one row per observation in frame, id order of the filtered
list) only if the Labeling accordion is not collapsed. Clicking a row calls `gotoEvent(Number(frame), id)`. `updateObsTable` rebuilds `flatTracks` first and re-renders.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `renderObsTable`, `updateObsTable`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#obsTable`
- **Links:** [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [BEH-333](#beh-333-gotoeventframe-id "gotoEvent(frame, id)")

## BEH-342: Refresh entry point

`refreshChronogram()` is the single entry used by other modules (annotation load, edits, filters, label changes, ROI...). It runs, in this order: `updateChronoData()` (data, [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines")),
`drawChrono()` (`updateChronoYDomain` then `updateChrono`), `renderObsTable()`. Observable rule: after any action that calls it, the chronogram rows, intervals and observation table reflect the
current annotations and filters ([INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness")). This file writes annotations in two places: `augmentTrackWithTag` sets `Tracks[F][id].tag` when a tag with the same frame and ID exists
(called first thing in `updateChronoData`), and `cleanObsoleteEvents` deletes observations ([BEH-343](#beh-343-clean-obsolete-events-deletes-flagged-observations "Clean obsolete events deletes flagged observations")). All other chronogram interactions end in a seek, a selection, a view or an option change.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `refreshChronogram`, `drawChrono`, `updateChronoData`, `augmentTrackWithTag`
- **Links:** [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [INV-002](view_invariants.md#inv-002-interactive-responsiveness "Interactive responsiveness"), [BEH-343](#beh-343-clean-obsolete-events-deletes-flagged-observations "Clean obsolete events deletes flagged observations"), [SEAM-301](view_seams.md#seam-301-chronogram-and-the-frameselection-owners "Chronogram and the frame/selection owners"), [DEBT-302](view_debt.md#debt-302-chronogram-is-a-god-object-over-free-globals "Chronogram is a god object over free globals"), [DEBT-316](view_debt.md#debt-316-chronogram-file-writes-annotations "Chronogram file writes annotations")

## BEH-343: Clean obsolete events deletes flagged observations

Button `#cleanObsoleteEventsButton` ("Clean obsolete Events", `onclick="cleanObsoleteEventsCB()"`, title "Delete obsolete events: no associated tag or low DM or inside excludeRects")
asks `confirm("CAUTION !!!! Operation cannot be undone. Please confirm: Delete all obsolete events, i.e. no associated tag or low DM or inside excludeRects. ")`; on cancel nothing happens.
On confirm `cleanObsoleteEvents` loops over all `Tracks[F][id]` and deletes (`delete Tracks[F][id]`) each observation that is labeled `falsealarm` or `wrongid` AND meets at least one of: it has no `tag`;
`tag.dm < 20`; `!tagsSampleFilterExcludeRects(tag)`. The two tag tests are independent conditions (not else-chained), so both can fire on the same entry. Observations without these labels are never deleted
(the confirm text does not mention this precondition). It then calls `refreshChronogram()`. The deletion is on the live `Tracks` and cannot be undone from here, which conflicts with [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss") ([OQ-310](../../QUESTIONS.md#oq-310 "Clean obsolete events: rule and ownership")).

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `cleanObsoleteEventsCB`, `cleanObsoleteEvents`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#cleanObsoleteEventsButton`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [OQ-310](../../QUESTIONS.md#oq-310 "Clean obsolete events: rule and ownership"), [DEBT-316](view_debt.md#debt-316-chronogram-file-writes-annotations "Chronogram file writes annotations")

## BEH-344: Highlight events with parts option (no visible effect in the default renderer)

Options > Chronogram > "Highlight events with parts" (checkbox class `button_showPartsOnChrono`, flag `flag_showPartsOnChrono`, default off).
Clicking calls `onToggleButton_showPartsOnChrono`: the flag takes the checkbox state, `updateButtons_showPartsOnChrono` sets all `input.button_showPartsOnChrono` checkboxes and
`button.button_showPartsOnChrono` buttons to the flag, and `refreshChronogram()` is called. The flag is only read by the legacy renderer ([BEH-327](#beh-327-legacy-activity-renderer-not-active-by-default "Legacy activity renderer (not active by default)")), which draws the `partsAvailable` squares (`renderChrono_Parts`);
with `legacyActivities=false` (default) nothing changes visibly. The checkbox carries the HTML attribute `checked="false"` (read as checked by HTML) and is unchecked only through the reset in `initChrono`.

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `onToggleButton_showPartsOnChrono`, `updateButtons_showPartsOnChrono`, `toggledNewState`, `updateButtons`
  - [labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js](../../../labelbee/static/labelbee/js/ChronoControlActivitiesLegacy.js): `renderChrono_Parts`
- **Links:** [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits"), [OQ-301](../../QUESTIONS.md#oq-301 "Tags, parts and individual events on the chronogram"), [BEH-345](#beh-345-show-on-chrono-button-in-the-parts-panel "'Show on Chrono' button in the parts panel")

## BEH-345: "Show on Chrono" button in the parts panel

The button "Show on Chrono" (`class="buttonShowPartsOnChrono btn btn-green-toggle btn-xs"`, parts panel, `onclick="onToggleButton_showPartsOnChrono(event)"`) calls the same handler as [BEH-344](#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer "Highlight events with parts option (no visible effect in the default renderer)"). For a button,
`toggledNewState` flips its own class `active` and returns the new state, which becomes `flag_showPartsOnChrono`; `updateButtons` then updates the checkboxes. The synchronisation selector is `button.button_showPartsOnChrono`
(with underscore) which does not match the button's class `buttonShowPartsOnChrono`, so the button is never updated by the other control nor by the init reset: its `active` state can disagree with the flag
([DEBT-315](view_debt.md#debt-315-show-on-chrono-button-is-outside-the-synchronisation-class "'Show on Chrono' button is outside the synchronisation class")). Like [BEH-344](#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer "Highlight events with parts option (no visible effect in the default renderer)"), the flag has no visible effect with the default renderer.

- **Group:** [CAP-303](view_capabilities.md#cap-303-event-display "Event display")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `onToggleButton_showPartsOnChrono`, `toggledNewState`, `updateButtons`
- **Links:** [DEBT-315](view_debt.md#debt-315-show-on-chrono-button-is-outside-the-synchronisation-class "'Show on Chrono' button is outside the synchronisation class"), [DEBT-301](view_debt.md#debt-301-default-renderer-omits-tag-intervals-crosses-parts-and-individual-events "Default renderer omits tag intervals, crosses, parts and individual events"), [BEH-344](#beh-344-highlight-events-with-parts-option-no-visible-effect-in-the-default-renderer "Highlight events with parts option (no visible effect in the default renderer)"), [SEAM-303](view_seams.md#seam-303-chronogram-view-and-its-dom-page "Chronogram view and its DOM page")

## BEH-346: User resize of the chronogram div

`#chronoDiv` is also resizable by the user (jQuery UI, handles n, s, e, w); on stop, `chronoItemHeight` is recomputed as `(height-margins)/N` (through `getChronoItemHeight`, which calls `console.trace`) and the layout refreshed
([BEH-347](#beh-347-layout-refresh-and-collapsed-chronogram "Layout refresh and collapsed chronogram")). The resize-stop handler was not found in `ChronoControl.js` (no `resizestop` there); where it is bound is open, so this item stays unverified.

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getChronoItemHeight`, `refreshChronoLayout`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#chronoDiv`
- **Links:** [BEH-313](#beh-313-chronogram-size-buttons "Chronogram size buttons"), [BEH-347](#beh-347-layout-refresh-and-collapsed-chronogram "Layout refresh and collapsed chronogram")

## BEH-347: Layout refresh and collapsed chronogram

`refreshChronoLayout()` runs, through `debouncer`, a function that resets `#chronoDiv` `top`/`left` to 0 (to flush the div after a resize from the top/left handles) and calls `axes.refreshLayout()` unless `#chronoTab` has class
`collapsed`. `debouncer` (default delay 100 ms) keeps its timer in a per-instance closure and a new one is created on every call, so calls are delayed by 100 ms but never coalesced ([DEBT-305](view_debt.md#debt-305-redraw-and-layout-are-expensive-and-loop-prone "Redraw and layout are expensive and loop-prone")). It is called by `adjustChronogramHeight` and is bound (in `initChrono`) to `collapsibleexpand` of `#chronoTab`, so a collapsed chronogram is laid out on expansion.
`axes.refreshLayout()` emits `axes:changed` (type `resize`), hence a redraw ([BEH-311](#beh-311-axes-changes-trigger-a-lightweight-redraw "Axes changes trigger a lightweight redraw")).

- **Group:** [CAP-301](view_capabilities.md#cap-301-time-axis-and-view-window "Time axis and view window")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `refreshChronoLayout`, `debouncer`, `adjustChronogramHeight`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#chronoTab`
- **Links:** [BEH-302](#beh-302-chronogram-layout-and-layers "Chronogram layout and layers"), [BEH-311](#beh-311-axes-changes-trigger-a-lightweight-redraw "Axes changes trigger a lightweight redraw"), [DEBT-305](view_debt.md#debt-305-redraw-and-layout-are-expensive-and-loop-prone "Redraw and layout are expensive and loop-prone")

## BEH-348: Candidate lists of event navigation

Per `eventSeekMode`, in non-auto mode / AutoSeek mode (`flag_autoEventMode`); lists are sorted by (row of the ID, frame) before searching "strictly after" (Next) or "strictly before" (Prev) the start position:
- `tag`: non-auto: `tagIntervals` of the start ID; auto: all `tagIntervals`; ordered by `begin`.
- `freetag`: as `tag` but only intervals with `!labeling.labeled` (`isNotLabeled`); after a redraw every interval qualifies ([DEBT-311](view_debt.md#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals")).
- `event`: non-auto: observations of the start ID (`flatTracksValidGroupById[id]` if `flag_hideInvalid`, else `flatTracksAllGroupById[id]`); auto: all observations (`flatTracksValid` or `flatTracksAll`). Nothing found when the ID has no list (no ID selected, or no event).
- `eventframe`: all observations (`flatTracksValid` or `flatTracksAll`), any ID, ordered by frame; the result is a frame number only.
Filters per list: the `flatTracks*` lists are built by `updateFlatTracks`, which skips frames outside the frame filter when it is active (`config.frameFilter` min/max) and applies `restrictID` and `excludeID`; the Valid/All choice
follows `flag_hideInvalid` ("Valid" = neither `falsealarm` nor `wrongid` label; `flag_hideFlowers` is not applied to these lists, so `eventframe` navigation can stop on hidden flower IDs). The tag list comes from `ttags` (`getTTags`, built from `flatTags = getFlatTags(false)`, commented "noFilter"): in the legacy branch (`tagMode != 'Tracks'`) restrict and exclude are applied and the frame filter is not;
in the `Tracks` branch (`flatTags`) the comment in `getTTags` says restrict/exclude are already applied upstream; the body of `getFlatTags` was not seen, so whether the frame filter reaches the tag list is open ([OQ-311](../../QUESTIONS.md#oq-311 "Tag navigation and the frame filter")); `updateTagIntervals` adds `tagsSampleFilter` and
`tagsIntervalFilter` and no frame filter. Sorting is in place on the arrays used ([DEBT-313](view_debt.md#debt-313-navigation-sorts-shared-arrays-in-place-and-mixes-id-types "Navigation sorts shared arrays in place and mixes id types")): `tagIntervals` itself only for `tag` in AutoSeek mode.

- **Group:** [CAP-305](view_capabilities.md#cap-305-event-navigation "Event navigation")
- **Code:**
  - [labelbee/static/labelbee/js/ChronoControlInteraction.js](../../../labelbee/static/labelbee/js/ChronoControlInteraction.js): `findNextTagEvent`, `findNextFreeTagEvent`, `findNextObsEvent`, `findNextEventFrame`, `findPreviousTagEvent`, `findPreviousFreeTagEvent`, `findPreviousObsEvent`, `findPreviousEventFrame`, `isNotLabeled`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `updateFlatTracks`, `getTTags`, `updateTagIntervals`
- **Links:** [CAP-801](view_capabilities.md#cap-801-filters "Filters"), [CAP-802](view_capabilities.md#cap-802-derived-structure-pipelines "Derived-structure pipelines"), [DEBT-311](view_debt.md#debt-311-redraw-overwrites-labeledvirtual-tag-intervals "Redraw overwrites labeled/virtual tag intervals"), [DEBT-313](view_debt.md#debt-313-navigation-sorts-shared-arrays-in-place-and-mixes-id-types "Navigation sorts shared arrays in place and mixes id types"), [OQ-311](../../QUESTIONS.md#oq-311 "Tag navigation and the frame filter"), [BEH-336](#beh-336-next--previous-event "Next / Previous event"), [BEH-337](#beh-337-ordering-of-events-across-ids "Ordering of events across IDs")
