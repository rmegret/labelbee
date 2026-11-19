# Behaviors: Temporal display and navigation (CAP-300)

Conventions: see [../README.md](../README.md).

All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.

Scope: display and interaction of the chronogram (`ChronoControl.js`, `ChronoAxes.js`,
`ChronoControlInteraction.js`, `ChronoControlActivitiesLegacy.js`) and its DOM controls in
`labelbee_page.html`. The data pipelines that build `chronogramData`, `allIntervals`, `flatTracks`,
`tagIntervals` (CAP-802) and the filter buttons (CAP-801) are only described through what the
chronogram does with their results. Observed headline: with the default configuration
(`chrono.config.legacyActivities = false`) the chronogram draws only plain event intervals,
dangling marks and the selection highlight; tag intervals, crosses, parts, individual events are
drawn only by the legacy renderer (BEH-326, BEH-327, BEH-344, DEBT-301).
Revised after critic review round 1: statements backed by quoted code evidence are stated as fact; wording such as
"not re-checked" or "first reading" marks claims that were not re-verified in that round; claims about d3 runtime
behavior (double click, wheel, `attr` with undefined) are inferred and need a browser (Phase 1d).

## Contents

<!-- toc -->

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
(BEH-308, BEH-309) and subscribes: `videoControl` `frame:changed` to `updateTimeMark` and
`previewframe:changed` to `updatePreviewTimeMark`; both of these videoControl events also trigger
`trackWindow:change` on `overlay`; the axes events `axes:clicked`, `axes:dblclick`, `axes:changed`
(BEH-311, BEH-331, BEH-334). The subscription to the selection events is commented out in `initChrono`
(BEH-317). In the code seen only the constructor calls `initChrono()`; a second call would build a second
`ChronoAxes` and register the `videoControl` handlers again.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `Chronogram`, `initChrono`, `initTooltip`
  - `labelBee.js`: `chrono`
  - `labelbee_page.html`: `#svgVisualize`, `#chronoDiv`
- **Links:** ENT-003, DEBT-302, SEAM-301

## BEH-302: Chronogram layout and layers

The SVG `#svgVisualize` (width/height 100% of `#chronoDiv`) holds `g#chronoGroup`
translated by the margins `{left:60, top:15, right:20, bottom:50}`. Inside: a background rect
(`.plotAreaBackground`, fill `#f0fcff`, crosshair cursor), the three axes (BEH-303, BEH-315), a
clip path restricting the plot area, the time mark layer (BEH-307) and `g.plotArea` that receives
the content layers (BEH-301). The plot area is `width = svgWidth - 80`, `height = svgHeight - 65`.
`refreshLayout()` recomputes sizes from the SVG element, resizes axes, background and clip rect,
re-registers the x range (keeping the visible x domain) and emits `axes:changed` (type `resize`).

- **Group:** CAP-301
- **Code:**
  - `ChronoAxes.js`: `ChronoAxes`, `refreshLayout`, `recomputeSizes`
- **Links:** BEH-311, BEH-313

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

- **Group:** CAP-301
- **Code:**
  - `ChronoAxes.js`: `xAxisInit`, `tAxisInit`, `updateTDomain`, `customTimeFormat`, `refreshAxes`, `updateVideoinfo`
- **Links:** ENT-003

## BEH-304: X domain initialised from the video

`updateChronoXDomainFromVideo()` copies `videoinfo` start time and real fps into the axes and sets
the x domain to `[0, videoinfo.nframes-1]` (or `[0,1]` if `videoinfo.duration` is NaN). Setting the
domain through `axes.xdomain()` also resets the "original" scale used as zoom reference, resets the zoom
transform to identity and emits `axes:changed`. It is called when a video is loaded or its
parameters change (VideoControl, VideoList, OverlayControl). The "Video" button
(`onclick=onClickFocusVideo()`, title "Reinit view") switches off the track-window follow mode
(BEH-310) and calls it, i.e. shows the whole video.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `updateChronoXDomainFromVideo`, `domainxFromVideo`
  - `ChronoAxes.js`: `xdomain`
  - `OverlayControl.js`: `onClickFocusVideo`
- **Links:** ENT-003, CAP-201

## BEH-305: Pan and zoom with mouse drag and wheel

The x scale is driven by a `d3.zoom` on `g#chronoGroup`.
- Dragging with the primary button pans horizontally (d3 default; a drag suppresses the click that follows).
- Wheel event (the default `wheel.zoom` listener is replaced): the handler calls `preventDefault`, then
  `zoom.translateBy(-deltaX/k, -deltaY/k)` (k = current zoom), then `zoom.scaleTo(k * 2^(-deltaY*mousewheelSpeed))`
  anchored at the pointer, with `mousewheelSpeed = 0.01` (e.g. one 100-unit wheel notch halves or doubles the
  visible span; down zooms out, up zooms in). The y part of the translation only changes the `y` of the stored
  transform; the x scale is derived with `rescaleX`, so it has no visible effect. Each of the two calls changes
  the transform, so each is expected to run `onZoom` (and thus a redraw) once: two redraws per wheel event
  (DEBT-305, not counted by running).
- Zoom extent: scale `k` between `1/1.2` (can show 1.2 times the video) and `(frames in original domain)/10`
  (at least about 10 frames visible), relative to the domain set by `xdomain()`.
- `onZoom` clamps the translation so that the first frame of the original domain cannot move right of the view
  center and the last frame cannot move left of it (the code comment claims "10% of the view"; `pleft` and
  `pright` are both the view center, see DEBT-303), stores the clamped transform, then sets the x domain and
  emits `axes:changed` (type `zoom_x`) through `refreshAxes`.
- Quick Help states "Drag: pan, Shift+Mousewheel: zoom"; the code is the reference (DEC-004): see BEH-306.

- **Group:** CAP-301
- **Code:**
  - `ChronoAxes.js`: `onZoom`, `reinitZoom`, `injectEventFilter`
- **Links:** DEC-004, DEBT-303, DEBT-305, BEH-306

## BEH-306: Mousewheel mode option

Checkbox `#mousewheelMode` (label "Zoom in Chrono needs shift+mousewheel", in the Options panel).
`onMousewheelModeToggled` copies its state into `axes.mousewheelMode`. A filter wrapped around the
wheel handler enables wheel pan/zoom only if `mousewheelMode` is false, or Shift is held when it is
true. When the filter rejects the event the handler does not run: no `preventDefault`, so the page scrolls
normally. Default after `initChrono` is `false` (checkbox unchecked, set by `updateMousewheelModeButton`), i.e.
the wheel always pans/zooms when over the chronogram, without Shift (differs from Quick Help). The
`ChronoAxes` internal default is `true`, overridden at init.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `onMousewheelModeToggled`, `updateMousewheelModeButton`
  - `ChronoAxes.js`: `injectEventFilter`
  - `labelbee_page.html`: `#mousewheelMode`
- **Links:** DEC-004, OQ-304

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

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `updateTimeMark`, `updatePreviewTimeMark`
  - `ChronoAxes.js`: `setTimeMark`, `refreshTimeMark`, `insertTimeMark`
- **Links:** INV-002, CAP-201, SEAM-301

## BEH-308: Video span bar

A bar above the plot area (y from -15 to 0, group `#videoSpan`, clipped) shows the extent of the loaded
video: a pale green background (`#f0fff0`) over the plot width, a sky-blue rect with blue stroke from
`xScale(0)` to `xScale(nframes+1)`, and the video file name (last segment of `videoinfo.name`) as text at
`xScale(0)+2`. `updateVideoSpan()` is called at each `updateChrono`. The bar and its label have pointer events
and a crosshair cursor; a click on it is handled as a click above the plot (BEH-331: seek to that
frame, keep the selected ID).

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `initVideoSpan`, `updateVideoSpan`
- **Links:** ENT-003, BEH-331

## BEH-309: Track-window span bar and focus window

A translucent pink bar (`#trackWindowSpan`, opacity 0.4, above the plot area) shows
`[currentFrame - overlay.trackWindow.backward, currentFrame + overlay.trackWindow.forward]`, i.e. the
window of the track trail shown in the overlay. It is not clamped to the video bounds. It is updated on
`videoControl` `frame:changed` and `previewframe:changed`, on axes event `previewframe:trackend`, on overlay event
`trackWindow:change`, and at each `updateChrono`. Each `frame:changed`/`previewframe:changed` also triggers
`trackWindow:change` on `overlay`. `getWindow()` returns the same window clamped to `[0, videoControl.maxframe()]`
and is used by "R:Focus" (restrict to IDs seen in the window) and `getIdsInFocus`.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `initTrackWindowSpan`, `updateTrackWindowSpan`, `getWindow`
- **Links:** CAP-401, CAP-801, SEAM-301

## BEH-310: Follow-window toggle and Video button (view recentring)

Button `#focusTrackWindow` ("Follow", in the Focus Interval tab; `onClickFocusTrackWindow`) toggles
`lockFocusTrackWindow` and, when turning on, immediately recentres the chronogram on the track window with
`focusTrackWindow()`: `axes.xdomainFocus([f - backward, f + forward])`. While on, each overlay
`trackWindow:change` event (frame change, window change) repeats the recentring; the button has class `active`.
The same recentring is available once through `nextSeekFocusWindow()` (arms a one-shot `frame:changed`
handler, no caller found). The track-window buttons (`shiftTrackWindow`, `scaleTrackWindow`)
belong to the overlay (CAP-401) but result in this view change. `xdomainFocus` currently throws (DEBT-304).

- **Group:** CAP-301
- **Code:**
  - `OverlayControl.js`: `onClickFocusTrackWindow`, `focusTrackWindow`, `setFocusTrackWindow`, `updateFocusTrackWindowButton`
  - `ChronoControlInteraction.js`: `nextSeekFocusWindow`, `gotoEvent_seekCB`
  - `labelbee_page.html`: `#focusTrackWindow`
- **Links:** CAP-401, DEBT-304, BEH-304

## BEH-311: Axes changes trigger a lightweight redraw

Every change of the x or y domain, of the zoom or of the layout makes `refreshAxes` redraw ticks, time mark and ID
selection, and emit the jQuery event `axes:changed` on the `axes` object for event types `xDomainChanged`,
`yDomainChanged`, `zoom_x`, `resize`. `onAxesChanged` handles it with `updateChrono()` only (render, no data
recomputation). `updateChrono` must never call functions that emit `axes:changed` (comment: infinite loop); the
ydomain update is therefore in `updateChronoYDomain`, called by `drawChrono`, not in `updateChrono`. `updateChrono` never calls
`refreshChronogram`. Redraw order in `updateChrono`: `renderActivities`, `updateTagIntervals`
(BEH-328), `updateTimeMark`, `updateVideoSpan`, `updateTrackWindowSpan`, then the status bar (BEH-314).

- **Group:** CAP-301
- **Code:**
  - `ChronoAxes.js`: `refreshAxes`
  - `ChronoControlInteraction.js`: `onAxesChanged`
  - `ChronoControl.js`: `updateChrono`, `drawChrono`, `refreshChronogram`
- **Links:** INV-002, CAP-802, DEBT-305

## BEH-312: Z+, Z-, shift buttons and the time-domain operations

Chronogram tab "View:" buttons: step-backward/step-forward (`shiftTimeDomain(-0.5)` / `shiftTimeDomain(0.5)`),
`Z+` (`scaleTimeDomain(2)`), `Z-` (`scaleTimeDomain(1/2)`). Intended behavior: `shiftTimeDomain(f)` shifts the
visible domain by `round(f * span)` frames; `scaleTimeDomain(s)` scales the visible span by `1/s` around the current frame
if it is visible, else around the center of the view. Both go through `axes.xdomainFocus`, which adds a 10% margin
(`marginFactor` 1.1 around the new center), limits the scale to the zoom extent and re-applies the transform.
In the shipped D3 6.2 the zoom object has no `translate()`/`scale()`, so `xdomainFocus` throws a TypeError on
its first line and these buttons currently have no effect (DEBT-304).

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `scaleTimeDomain`, `shiftTimeDomain`
  - `ChronoAxes.js`: `xdomainFocus`, `xdomainScale`, `xdomainCenter`
  - `labelbee_page.html`: `#chronoTab`
- **Links:** DEBT-304, OQ-302

## BEH-313: Chronogram size buttons

Buttons "Size:" `h-`, `h=`, `h+`, `w-`, `w=`, `w+` call `chronoAdjust(mode)` (`"H-"`, `"H="`, `"H+"`, `"W-"`, `"W="`, `"W+"`) with factor 1.2.
Height is expressed per ID row: `chronoItemHeight` (default 12 px). `adjustChronogramHeight(h)` (null becomes 12) stores
`chronoItemHeight = h`, sets the height of `#chronoDiv` to `N_ids * h + marginTop + marginBottom` (N = `axes.ydomain().length`;
margins 15 + 50 px), then calls `refreshChronoLayout` (BEH-347). `h-` divides `chronoItemHeight` by 1.2, `h+` multiplies,
`h=` resets to 12 px; there is no lower bound. `w-` sets the total width of `#chronoDiv` to `(width - 80)/1.2 + 80`
(80 = left + right margins) and clamps the total width (margins included) to at least 200 px. The behavior of `w=`
(uses the width of `#canvasresize`; at-least-200 clamp) and `w+` (no upper bound) was read earlier and not re-checked.
`updateChronoYDomain` (called by `drawChrono`) ends with `adjustChronogramHeight(chronoItemHeight)`, so after every
data refresh the div height fits the number of rows. `getChronoItemHeight` computes `(height - margins)/N` and calls `console.trace`.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `chronoAdjust`, `adjustChronogramHeight`, `getChronoItemHeight`, `updateChronoYDomain`
  - `labelbee_page.html`: `#chronoDiv`
- **Links:** BEH-347, BEH-346, DEBT-305, INV-002

## BEH-314: Status bar and slow-display warning

`#chronoStatusBar` shows "Preparing chrono data..." while `updateChronoData` runs, then at the end of every
`updateChrono`: "Chrono update X ms, redraw Y ms; data: N items, M intervals, K tags" (N = `chronogramData.length`, M =
`allIntervals.length`, K = `flatTags.length`; X, Y from `chrono.perf.chronoUpdate` / `chronoRedraw`, rounded). If either
exceeds 50 ms it appends "Slow display, consider closing the chronogram or filtering the data". Before the first data
update `chronoUpdate` is undefined and X shows NaN.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `updateChrono`, `updateChronoData`
  - `labelbee_page.html`: `#chronoStatusBar`
- **Links:** INV-002

## BEH-315: ID axis domain and row order

The y axis is an ordinal band scale, one row per ID; empty domain becomes the single dummy row `"-"`.
`updateChronoYDomain` (called by `drawChrono`) picks the IDs: if `flag_restrictID`, exactly the entries of
`restrictIDArray` (as typed, even IDs absent from the data); else `validIdsChrono()`: the IDs of `chronogramData` (`validIdsDomain`; without those
whose comma-separated `labels` contain `wrongid`/`falsealarm` when `flag_hideInvalid`), plus, unless `tagMode == 'Tracks'` (the shipped
default, no code changes it), the IDs of `tagIntervals` (`validTagIdsDomain`), ordered by `sortIds` (applied in `validIdsChrono`, to the non-restricted case only) (letters part by locale compare,
then numeric part). The domain is then passed through `chrono.config.idAxisMap` (always set, identity by default),
de-duplicated and sorted numerically ascending by `Number(id)`. For non-numeric IDs (`NaN`) this second sort
makes the order unreliable and can undo `sortIds` (DEBT-306). Row order defines navigation order (BEH-337).
Hide-invalid for tag IDs: the tag branch of `validTagIdsDomain` tests `d.labels` (with `containsLabel`), but tag intervals built
by `updateTagIntervals` carry `labeling` and no `labels`, and `containsLabel(undefined, ...)` returns false, so that test excludes nothing
(DEBT-318); the effective hide-invalid filter on tag intervals is in `updateChronoData`, which tests `interval.labeling.falsealarm || interval.labeling.wrongid`
before the y domain is computed. This only matters when `tagMode != 'Tracks'`.

- **Group:** CAP-302
- **Code:**
  - `ChronoControl.js`: `updateChronoYDomain`, `validIdsChrono`, `validIdsDomain`, `validTagIdsDomain`, `sortIds`, `updateChronoData`
  - `ChronoAxes.js`: `ydomain`
- **Links:** CAP-801, CAP-802, DEBT-306, DEBT-318, OQ-307

## BEH-316: ID axis rendering and row grid

Left axis (`.y.axis`, 40 px wide pale yellow background, label "ID") with one tick label per domain value, no tick
marks; a horizontal gridline (`line.gridline`, gray 1px) is drawn at the top of each band across the plot width (no
line under the last row). Row height is `plotHeight/N` (D3 band scale, default padding 0); intervals use half of the band.

- **Group:** CAP-302
- **Code:**
  - `ChronoAxes.js`: `yAxisInit`, `yAxisResized`, `yAxis`
- **Links:** BEH-313

## BEH-317: Selected ID highlight on the axes

`updateChronoSelection()` calls `axes.selectId(defaultSelectedBee)`; `selectId` stores `axes.selectedID` and calls
`refreshIdSelection`. It is meant to run on `selectionControl` events `tagselection:created` / `tagselection:cleared`, but the
subscription lines in `initChrono` are commented out ("Events declared in selectionControl"); where it is actually bound was
not seen. `refreshIdSelection` removes class `selectedid` from all y tick labels, adds it (green, bold) to the tick whose datum equals
`selectedID` (loose `==`), removes the previous `.selection` rect, and, if `selectedID != null`, appends a `rect.selection` to
`.plotBackground` (behind the intervals): x = 0, width = plot width, `y = yScale(selectedID)`, height = band width, white fill, 2px `#008000` stroke.
`refreshAxes` re-applies it after every axes change. For a selected ID that has no row (not in the y domain; also an unmapped ID
in modulo mode, BEH-318) `yScale(id)` is undefined: no tick is highlighted and, by d3 `attr` semantics (inferred, not run), the rect
has no `y` attribute and sits at the top of the plot (DEBT-317). Selecting a bee in the overlay without a selection event
(or an ID only set as `defaultSelectedBee`) updates the row only at the next `axes` refresh. The green outline on
intervals is separate (BEH-322).

- **Group:** CAP-302
- **Code:**
  - `ChronoControl.js`: `updateChronoSelection`
  - `ChronoAxes.js`: `selectId`, `refreshIdSelection`
  - `SelectionControl.js`: `selectBeeByID`
- **Links:** CAP-501, SEAM-301, DEBT-317

## BEH-318: ID remap buttons (ID, Modulo)

Filter tab, "ID Remap:" buttons (class `btn btn-xs`): `chrono.click_setIdAxisMap('id')` sets `idAxisMapMode='id'` and restores the identity map;
`chrono.click_setIdAxisMap('modulo')` asks `prompt("Set ID axis remap with modulo:", 20)` and (unless canceled)
sets `idAxisMapMode='modulo'` and maps each row to `String(Number(id) % Number(mod))`, so several bees share one row (y), each interval/observation
using `y = idAxisMap(id)` for its row and `id` for identity. Both call `update_idAxisMap`, which calls `refreshChronogram()`. In `modulo` mode a click on the plot background
(BEH-331) only seeks the frame (`onAxesClick` does not call `gotoEvent`); a click on an interval still calls `gotoEvent(frame, d.id)` with the
original (unmapped) ID and so still selects it (BEH-332). A non-numeric or empty input gives NaN rows. The text-input variant (`idAxisMap_inputChanged`, `idAxisMapString`) is commented out in the page
and incomplete in the code (`$('#')`).

- **Group:** CAP-302
- **Code:**
  - `ChronoControl.js`: `click_setIdAxisMap`, `update_idAxisMap`, `idAxisMap_inputChanged`
- **Links:** CAP-802, DEBT-306, OQ-306, BEH-331, BEH-332

## BEH-319: Filter and restriction effects on the display

Chronogram contents and rows depend on the filters of CAP-801 (RestrictID `#restrictID`/`#restrictIDButton`/R:Selection/R:Focus;
ExcludeID `#excludeID`/`#excludeIDButton`; `#hideInvalidButton`; `#hideFlowersButton`; frame filter
`#filterFrameButton`, `#chronoFrameFilterFrameMin/Max`, Refresh, Auto, All). The chronogram displays whatever `chronogramData`,
`allIntervals`, `flatTracks`, `tagIntervals` contain after `refreshChronogram`; rows follow BEH-315. `setFrameFilter` and the button handlers
of this file are specified in CAP-801 (referenced here only as the source of the filters). Each of them ends with `refreshChronogram()`,
except the frame-filter min/max fields which only flash the "Filter" or "Refresh" button to tell the user to apply (`flash`).

- **Group:** CAP-302
- **Code:**
  - `ChronoControl.js`: `setRestrictID`, `click_restrictID`, `click_excludeID`, `click_hideInvalid`, `click_hideFlowers`, `Chronogram`, `flash`
- **Links:** CAP-801, CAP-802

## BEH-320: Event interval rectangles

Each element of `allIntervals` (one per run of consecutive frames of one ID, see CAP-802) is a `rect.interval` in `intervalLayer`:
x = `xScale(x1)`, width = `xScale(x2+1)-xScale(x1)` (inclusive of last frame), y = `yScale(d.y)` (top of the row), height =
half the band. Only intervals intersecting the visible x domain are bound (`x2+2 >= xmin && x1-1 <= xmax`). Data are joined by position, not
by key. A single-frame interval is a one-frame wide rect; at low zoom it may be sub-pixel. Rendering runs at each `updateChrono`
(`renderActivities` -> `ChronoIntervals.updateAndRender`, then `render` again, redundantly).

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `renderActivities`, `ChronoIntervals`, `Chronogram`
- **Links:** ENT-001, CAP-802

## BEH-321: Event interval colors by label

CSS (`custom.css`): `.interval` fill gray, stroke black 0.5px. `renderEnterLeavePollen` sets CSS classes
`entering`, `leaving`, `pollen`, `fanning` on an interval when `d.haslabel[...]` has that label (the set of labels of any observation in
the merged run). Fill: entering magenta, leaving green `rgb(44,161,44)`, pollen yellow, fanning purple. Rules have equal
specificity; the later one wins, so precedence is fanning > pollen > leaving > entering > gray. No other label (wrongid,
falsealarm) changes the fill. Labels are open vocabulary (DEC-003); these four are hard-coded.

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `renderEnterLeavePollen`
- **Links:** DEC-003, DEBT-307, OQ-305, CAP-802

## BEH-322: Selected-ID outline on intervals

`ChronoIntervals.renderSelection` adds class `selected` (stroke `#00FF00` 2px) to all intervals whose `id == defaultSelectedBee` (loose
equality). It runs at each `renderActivities` and after an interval click; it is not triggered by selection events alone, so it can lag
behind the row highlight (BEH-317) until the next redraw (pan, zoom, refresh).

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `renderSelection`, `renderActivities`
- **Links:** BEH-317

## BEH-323: Interval hover tooltip

Mouse over an interval shows the shared `chrono.tooltip` (`div.tooltip`, absolute) at pointer + (20, 20) px with
`ID=<id>`, `Frames=<x1>-<x2> +` (the literal " +" is in the message), `Time=<HH:MM:SS of videoControl.frameToTime(x1)>`, "Annotation:",
`Labels=<d.labels>`; hidden again on mouse out. (Tag Hamming/DM lines and `newid` are commented out.) `format_HMS(date)` pads
`HH:MM:SS` (local time).

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `intervalMouseOver`, `intervalMouseOut`, `format_HMS`, `initTooltip`
- **Links:** ENT-001

## BEH-324: Dangling track start/end marks

Option `chrono.config.showDanglingTracks` (default true, no UI; when false, existing marks are removed and none are drawn). For intervals whose first (or last) observation center lies inside the
global `ROI` rectangle (hard-coded `{left:175, top:250, right:2305, bottom:1240}` for "Gurabo 5MP" videos, `startInsideROI`/`endInsideROI`
computed during interval building), a half-frame-wide rect of half the band height is drawn in `topLayer` at the start
(from `x1-0.5` to `x1`) and at the end (from `x2+1` to `x2+1.5`), stroke 2px. `chrono.config.hide_non_dangling` is lazily initialised to
true. With true, start marks are drawn only for intervals with `startInsideROI` and end marks only for intervals with `endInsideROI`, so all marks are red. With false, start and end marks
are drawn for all intervals, each colored independently: start mark red when `startInsideROI`, else green; end mark red when `endInsideROI`, else green.
The default marks tracks that begin or end inside the arena (they should have entered/left through the border).

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `renderChrono_danglingTracks`
  - `OverlayControl.js`: `ROI`
- **Links:** ENT-001, CAP-802, DEBT-308, OQ-308

## BEH-325: "Show Events" option

Checkbox `#showObsChrono` (Options > Chronogram > "Show Events", default checked; global `showObsChrono`) calls
`onChronoParametersChanged`, which copies it and `#showTagsChrono` into globals and calls `refreshChronogram()`. When unchecked,
`updateChronoData` empties `chronogramData` and skips `updateChronogramData`/`createIntervalList`, so no row is created from events; but
`allIntervals` is not cleared, so the previously computed intervals stay on screen (DEBT-309).

- **Group:** CAP-303
- **Code:**
  - `OverlayControl.js`: `onChronoParametersChanged`
  - `ChronoControl.js`: `updateChronoData`
  - `labelbee_page.html`: `#showObsChrono`
- **Links:** CAP-802, DEBT-309

## BEH-326: Show Individual Events option (no visible effect in the default renderer)

Options > Chronogram > "Show Individual Events" (checkbox class `button_showIndividualEvents`, flag `flag_showIndividualEvents`, default off).
Clicking calls `onToggleButton_showIndividualEvents`: the flag takes the checkbox state, `updateButtons_showIndividualEvents` synchronises all buttons/checkboxes of that class,
and `refreshChronogram()` is called. The flag is only read by the legacy renderer (BEH-327): `updateActivities` draws per-observation span
rects and redundancy circles. With `legacyActivities=false` (default) the option changes nothing visible. The page checkbox carries the HTML attribute `checked="false"`, which
HTML reads as checked; it is shown unchecked only because `initChrono` resets it through `updateButtons_showIndividualEvents`.

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `onToggleButton_showIndividualEvents`, `toggledNewState`, `updateButtons`
  - `ChronoControlActivitiesLegacy.js`: `updateActivities`
- **Links:** DEBT-301, CAP-602, OQ-301, SEAM-303

## BEH-327: Legacy activity renderer (not active by default)

`ChronoControlActivitiesLegacy.js` is loaded by `labelbee_page.html` (after `ChronoControl.js`) and defines global functions. Its event renderer
`updateActivities` is used only if `chrono.config.legacyActivities` is true, which has no UI: the console hint printed by `Chronogram` says to run
`chrono.config.legacyActivities = true; removeActivities(); renderActivities()`. Legacy rendering, per `allIntervals`: gray `rect.activity` per
interval (click: `gotoEvent(x1,id)`, native `<title>` tooltip), `rect.pollen` yellow, `rect.fanning` purple (lower half), `rect.entering`/`rect.leaving` 4px markers,
`circle.obs` r=5 at `x1` (fill by Activity, thick stroke when `pollen`, tooltip with labels, newid and tag Hamming/DM), red/blue `path.crossLeft` crosses for `falsealarm`/`wrongid`
intervals (no pointer events), `rect.partsAvailable` squares for events with parts, and, with "Show Individual Events", red-outlined per-observation `rect.obsspan` (click: `gotoEvent(frame,id)`) plus cyan
`circle.alertcircle` on redundant observations (`isredundant`). It replaces `.tooltip` elements (leaving `chrono.tooltip` detached). `createIntervalList_legacy`
(splits by activity) has no caller. The file also owns the tag renderer in use at init (BEH-329).

- **Group:** CAP-303
- **Origin:** debt
- **Code:**
  - `ChronoControlActivitiesLegacy.js`: `updateActivities`, `removeActivities`, `initActivities`, `setGeomActivity`, `updateObsSpan`, `updateAlertCircle`, `createIntervalList_legacy`, `renderChrono_Parts`, `onActivityClick`, `onObsSpanClick`
  - `ChronoControl.js`: `renderActivities`
  - `labelbee_page.html`: `#chronoTab`
- **Links:** DEBT-301, DEBT-310, OQ-301, CAP-602

## BEH-328: Tag intervals refreshed at every redraw

`updateChrono` calls `updateTagIntervals()` each time the chronogram is redrawn (also on every pan, zoom and resize). This function rebuilds
`tagIntervals` from `ttags` (ID, frame to tag index), merging consecutive frames, applying `tagsSampleFilter`/`tagsIntervalFilter`; each interval
`{id, y, begin, end, hammingavg, dmavg, labeling:{}}`. This runs regardless of `showTagsChrono`. It overwrites the result of the data pass
(`updateChronoData`: `updateTagsLabels` fills `labeling`, adds virtual intervals for `wrongid`, applies "Hide FA/WrongID"). After any redraw,
`tagIntervals` is therefore the raw list with an empty `labeling` and no virtual intervals (DEBT-311). Nothing in this function draws.

- **Group:** CAP-304
- **Code:**
  - `ChronoControl.js`: `updateChrono`, `updateTagIntervals`, `updateTagsLabels`, `updateChronoData`
- **Links:** CAP-802, ENT-002, DEBT-311, DEBT-301, OQ-303

## BEH-329: Tag interval rendering (legacy file, not invoked)

`renderTagIntervals` (legacy file) draws `rect.tag` per tag interval in `tagLayer`: x from `begin` to `end+1`, bottom-aligned in the row, height by mean Hamming distance
(`hammingavg<=0`: full band, 1: 3/4, 2: 1/2, above 2: 1/4), blue translucent (fill-opacity 0.2) by default, magenta `#ff00c0` if `labeling.entering`, white 0.1 if `virtual`; the
"leaving" green branch tests `labeling.leaving`, which is never set. Click: `gotoEvent(begin,id)`; tooltip `div.tooltip2` (BeeID, frame, time, HammingAvg, DM). The only caller is
`initTagIntervals` at chronogram init with an empty list; the redraw path never calls it, so tag intervals are not shown in the chronogram in the default build
(DEBT-301).

- **Group:** CAP-304
- **Origin:** debt
- **Code:**
  - `ChronoControlActivitiesLegacy.js`: `renderTagIntervals`, `insertTag`, `setTagGeom`, `onTagClick`, `initTagIntervals`
  - `ChronoControl.js`: `initChrono`
- **Links:** ENT-002, DEBT-301, OQ-301

## BEH-330: "Show Tags" option

Checkbox `#showTagsChrono` (Options > Chronogram > "Show Tags", default checked, global `showTagsChrono`) triggers `onChronoParametersChanged` -> `refreshChronogram`. In
`updateChronoData` unchecking it skips the first `updateTagIntervals()` and starts `tagIntervals = []`; because `updateChrono` rebuilds `tagIntervals` unconditionally (BEH-328), the option has no lasting effect on
the list used for the display or the tag/freetag navigation modes.

- **Group:** CAP-304
- **Code:**
  - `OverlayControl.js`: `onChronoParametersChanged`
  - `ChronoControl.js`: `updateChronoData`
  - `labelbee_page.html`: `#showTagsChrono`
- **Links:** DEBT-311, BEH-328

## BEH-331: Click on the chronogram seeks a frame and selects an ID

A click anywhere in `g#chronoGroup` (ignored if `defaultPrevented`, e.g. after a drag) computes `frame` and `id` and emits jQuery event `axes:clicked`:
- `frame = round(xScale.invert(x))`; if the click is left of the plot (ID tick column, x < 0) the current frame is used.
- `id`: the row under the pointer; if the pointer is above the plot (y < 0: video span, track-window span) the currently selected ID (`axes.selectedID`); below the last row
  `id` is `undefined`.
`onAxesClick` then calls `gotoEvent(frame, id)` when `idAxisMapMode == 'id'`; in `modulo` mode only `videoControl.seekFrame(Number(frame))` ("avoid losing current selection").
Clicking below the last row in `id` mode therefore clears the selection (BEH-333). Clicks on intervals do not reach this handler (BEH-332).

- **Group:** CAP-305
- **Code:**
  - `ChronoAxes.js`: `onAxesClick`, `invertYScale`, `getFrameFromEvent`
  - `ChronoControlInteraction.js`: `onAxesClick`
- **Links:** OQ-306, CAP-201, CAP-501, BEH-318, BEH-332

## BEH-332: Click on an event interval

Clicking a `rect.interval` stops propagation (no background click) and calls `gotoEvent(frame, d.id)`, where `frame` is the frame under the pointer (via
`axes.getFrameFromEvent`, no longer the interval start) and `d.id` the original ID (not the remapped row), then redraws the selection outline (BEH-322). Intervals therefore select the ID and seek to the clicked frame inside
the interval, in both `id` and `modulo` remap modes (BEH-318).

- **Group:** CAP-305
- **Code:**
  - `ChronoControl.js`: `intervalClicked`
  - `ChronoAxes.js`: `getFrameFromEvent`
- **Links:** BEH-334, BEH-318, BEH-331, OQ-306

## BEH-333: gotoEvent(frame, id)

Common entry to "go to frame and select ID": pauses the video (`videoControl.pause()`), sets `defaultSelectedBee = id`; if `frame` is the current frame it calls `selectBeeByID(id)` (selects the box in the
overlay, or, if none, just stores the default and emits `tagselection:created`/`cleared` according to `id == null`); otherwise it seeks (`videoControl.seekFrame(frame)`) with the ID as default selection, so
the selection is applied when the new frame loads. If `overlay.opts.clickModeAutoCentering` is on, the "AutoCentering" button flashes yellow and `autoCentering(obs)` centres the overlay canvas on the observation `Tracks[frame][id]`
(skipped with a log if it does not exist). Also called from the observation table (BEH-341). `id == undefined` clears the selection.

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `gotoEvent`
  - `SelectionControl.js`: `selectBeeByID`
  - `OverlayControl.js`: `autoCentering`
- **Links:** CAP-201, CAP-501, INV-002, SEAM-301

## BEH-334: Double click on the chronogram

Handlers: `onAxesDblClick` (event `axes:dblclick` from `chronoGroup` `dblclick`, unless `defaultPrevented`) is meant to zoom on `[frame - backward*1.05, frame + forward*1.05]` (the track window around the clicked frame)
through `axes.xdomainFocus`. In practice (a) `xdomainFocus` throws (DEBT-304); (b) `d3.zoom` is attached to the same element (`chronoGroup.call(zoom)`) and only its `wheel.zoom` listener is replaced, so
d3's own `dblclick.zoom` (zoom in by 2, 0.5 with Shift, with a transition) is still installed next to the custom `dblclick` listener (different namespace; no other `dblclick.zoom` removal exists in `ChronoAxes.js`). Whether the custom handler also runs, and which of the two wins, depends on d3 runtime behavior and was not verified (needs a browser, Phase 1d). Each double click also fires
two single clicks first (two `gotoEvent` calls).

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `onAxesDblClick`
  - `ChronoAxes.js`: `onAxesDblClick`
- **Links:** DEBT-304, DEBT-312, OQ-302

## BEH-335: Event-seek mode buttons

Events tab buttons `Tag`, `UnlabeledTag`, `Event`, `Frame` (class `eventSeekMode eventSeekMode-<mode>`; modes `tag`, `freetag`, `event`, `eventframe`) call
`eventSeekModeClicked(mode)`, which sets global `eventSeekMode` and highlights the clicked button (`active`) via `updateEventSeekMode`. Default `eventframe`, highlighted at init. Tooltips: "Events mode: next/prev event with same ID",
"Frame mode: next/prev frame with at least one event". Setting the mode does not move anything.

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `eventSeekModeClicked`, `updateEventSeekMode`
  - `labelbee_page.html`: `#eventsTab`
- **Links:** CAP-802

## BEH-336: Next / Previous event

Buttons `Next` / `Prev` (`gotoNextEvent()` / `gotoPreviousEvent()`) start from the current frame (`videoControl.getCurrentFrame()`) and the selected ID (`defaultSelectedBee`), unless a
start `{frame, id}` is passed (used by First/Last, BEH-338). According to `eventSeekMode` (candidate lists: BEH-348):
- `tag` / `freetag`: seek to `interval.begin` of the found tag interval and select `interval.id`.
- `event`: seek to the frame of the found observation and select its ID.
- `eventframe`: seek to the found frame and select the ID that was passed in (the selected ID, or the one given by First/Last).
Not found: console log only, nothing moves. Moving uses `gotoFrameId` (sets `defaultSelectedBee`, `videoControl.seekFrame(Number(frame))`; does not pause and
does not call `selectBeeByID`).

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `gotoNextEvent`, `gotoPreviousEvent`, `gotoFrameId`
  - `labelbee_page.html`: `#eventsTab`
- **Links:** BEH-348, BEH-337, BEH-338, BEH-335

## BEH-337: Ordering of events across IDs

For `tag` and `event` modes in auto mode, events are ordered by (row position of the ID in `axes.yScale`, then frame/`begin`): `getIdCoord(id) = axes.yScale(id)`, which is
`undefined` for IDs without a row. The comparators then return `NaN`, which JavaScript's sort treats as a tie, and the "greater than" tests are false for such IDs, so the position of events of IDs without a row
in the order is unspecified and they are skipped as "next" targets. Hence "next" visits all events of an ID before the first event of the next row, and the order of rows is that of BEH-315. In `event`
mode non-auto only the same ID is considered. `eventframe` mode ignores IDs and orders by frame number.

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `getIdCoord`, `compareIncreasingIdFrame`, `funGreaterThanIdFrame`, `compareIncreasingIdBegin`, `funGreaterThanIdBegin`
- **Links:** BEH-315, BEH-336, DEBT-313

## BEH-338: First / Last event and AutoSeek

`First` / `Last` buttons (`gotoFirstEvent` / `gotoLastEvent`) call next (previous) from the virtual position `frame=-1` (`maxframe()+1`) with the selected ID; in AutoSeek mode (`flag_autoEventMode`) the ID is the first
(last) row of `axes.yScale.domain()`, so that the very first (last) event of the whole chronogram is reached. Button `#autoEventButton` ("AutoSeek", class `btn-green-toggle`) toggles
`flag_autoEventMode` (class `active`) and calls `refreshChronogram()` (no evident reason). Default off. In `eventframe` mode the search ignores the ID, but the ID passed
on is still the selection target: with AutoSeek on, First selects the first row's ID even in `eventframe` mode (OQ-312).

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `gotoFirstEvent`, `gotoLastEvent`, `onAutoEventButtonClick`, `update_autoEventMode`
  - `labelbee_page.html`: `#autoEventButton`
- **Links:** BEH-336, OQ-312

## BEH-339: Next ID / Previous ID

Buttons `#nextIDButton` / `#prevIDButton` (Selected tab): take the visible rows (`validVisibleTagIdsDomain` = `sortIds(axes.ydomain())`, as strings), find the position of the selected ID (`getCurrentID`) and cycle to the next
(previous) one with wrap-around; if the current ID is not in the list, the first (last) is taken. The new ID is selected (`selectBeeByID`), written to the RestrictID field/array (`setRestrictID`, which refreshes the chronogram only if
the restriction is active) and, in AutoSeek mode, the view goes to its first event (`gotoFirstEvent`; `onClickPrevID(true)` would go to the last, but the button passes no argument). Finally `refreshChronogram()`.
When RestrictID is active, the visible rows are only the restricted IDs, so Next/Prev cannot leave the restricted ID (DEBT-314). `onClickNextIDStart` is a variant that always goes to the first event, with no caller.

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `onClickNextID`, `onClickPrevID`, `onClickNextIDStart`
  - `ChronoControl.js`: `validVisibleTagIdsDomain`, `setRestrictID`, `restrictIDFromSelection`
  - `labelbee_page.html`: `#nextIDButton`, `#prevIDButton`
- **Links:** CAP-501, CAP-801, DEBT-314

## BEH-340: No keyboard shortcut for chronogram navigation

No key binding in `labelBee.js` calls the chronogram navigation functions (first/previous/next/last event, next/previous ID, zoom). The chronogram is mouse/button only. Ctrl+hover "track frame" preview in the chronogram
(`axes.setTrackFrame(enabled)`: Ctrl + mouse move triggers `previewframe:trackmove` -> `onAxesMoved` -> `videoControl.seekFrame(frame, "preview")`, release returns to the original frame via `endPreview`) is off by default;
the "Ctrl+hover preview" checkbox of Options/Chronogram (`#chronoPreviewHover`) binds it, unchecking removes every `.trackFrame` handler (chronogram and `body`) and ends a preview in progress.

- **Group:** CAP-305
- **Origin:** debt
- **Code:**
  - `ChronoAxes.js`: `setTrackFrame`
  - `ChronoControlInteraction.js`: `onAxesMoved`
  - `ChronoControl.js`: `initChrono`
- **Links:** DEC-005, OQ-309, DEBT-312

## BEH-341: Observation table rows go to the event

The observation table `#obsTable` (Labeling tab) is rebuilt by `refreshChronogram` -> `renderObsTable` from `flatTracks` (columns ID, Frame, Labels; one row per observation in frame, id order of the filtered
list) only if the Labeling accordion is not collapsed. Clicking a row calls `gotoEvent(Number(frame), id)`. `updateObsTable` rebuilds `flatTracks` first and re-renders.

- **Group:** CAP-305
- **Code:**
  - `ChronoControl.js`: `renderObsTable`, `updateObsTable`
  - `labelbee_page.html`: `#obsTable`
- **Links:** CAP-802, CAP-601, BEH-333

## BEH-342: Refresh entry point

`refreshChronogram()` is the single entry used by other modules (annotation load, edits, filters, label changes, ROI...). It runs, in this order: `updateChronoData()` (data, CAP-802),
`drawChrono()` (`updateChronoYDomain` then `updateChrono`), `renderObsTable()`. Observable rule: after any action that calls it, the chronogram rows, intervals and observation table reflect the
current annotations and filters (INV-002). This file writes annotations in two places: `augmentTrackWithTag` sets `Tracks[F][id].tag` when a tag with the same frame and ID exists
(called first thing in `updateChronoData`), and `cleanObsoleteEvents` deletes observations (BEH-343). All other chronogram interactions end in a seek, a selection, a view or an option change.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `refreshChronogram`, `drawChrono`, `updateChronoData`, `augmentTrackWithTag`
- **Links:** CAP-802, INV-002, BEH-343, SEAM-301, DEBT-302, DEBT-316

## BEH-343: Clean obsolete events deletes flagged observations

Button `#cleanObsoleteEventsButton` ("Clean obsolete Events", `onclick="cleanObsoleteEventsCB()"`, title "Delete obsolete events: no associated tag or low DM or inside excludeRects")
asks `confirm("CAUTION !!!! Operation cannot be undone. Please confirm: Delete all obsolete events, i.e. no associated tag or low DM or inside excludeRects. ")`; on cancel nothing happens.
On confirm `cleanObsoleteEvents` loops over all `Tracks[F][id]` and deletes (`delete Tracks[F][id]`) each observation that is labeled `falsealarm` or `wrongid` AND meets at least one of: it has no `tag`;
`tag.dm < 20`; `!tagsSampleFilterExcludeRects(tag)`. The two tag tests are independent conditions (not else-chained), so both can fire on the same entry. Observations without these labels are never deleted
(the confirm text does not mention this precondition). It then calls `refreshChronogram()`. The deletion is on the live `Tracks` and cannot be undone from here, which conflicts with INV-001 (OQ-310).

- **Group:** CAP-305
- **Code:**
  - `ChronoControl.js`: `cleanObsoleteEventsCB`, `cleanObsoleteEvents`
  - `labelbee_page.html`: `#cleanObsoleteEventsButton`
- **Links:** INV-001, CAP-601, CAP-801, OQ-310, DEBT-316

## BEH-344: Highlight events with parts option (no visible effect in the default renderer)

Options > Chronogram > "Highlight events with parts" (checkbox class `button_showPartsOnChrono`, flag `flag_showPartsOnChrono`, default off).
Clicking calls `onToggleButton_showPartsOnChrono`: the flag takes the checkbox state, `updateButtons_showPartsOnChrono` sets all `input.button_showPartsOnChrono` checkboxes and
`button.button_showPartsOnChrono` buttons to the flag, and `refreshChronogram()` is called. The flag is only read by the legacy renderer (BEH-327), which draws the `partsAvailable` squares (`renderChrono_Parts`);
with `legacyActivities=false` (default) nothing changes visibly. The checkbox carries the HTML attribute `checked="false"` (read as checked by HTML) and is unchecked only through the reset in `initChrono`.

- **Group:** CAP-303
- **Code:**
  - `ChronoControl.js`: `onToggleButton_showPartsOnChrono`, `updateButtons_showPartsOnChrono`, `toggledNewState`, `updateButtons`
  - `ChronoControlActivitiesLegacy.js`: `renderChrono_Parts`
- **Links:** DEBT-301, CAP-602, OQ-301, BEH-345

## BEH-345: "Show on Chrono" button in the parts panel

The button "Show on Chrono" (`class="buttonShowPartsOnChrono btn btn-green-toggle btn-xs"`, parts panel, `onclick="onToggleButton_showPartsOnChrono(event)"`) calls the same handler as BEH-344. For a button,
`toggledNewState` flips its own class `active` and returns the new state, which becomes `flag_showPartsOnChrono`; `updateButtons` then updates the checkboxes. The synchronisation selector is `button.button_showPartsOnChrono`
(with underscore) which does not match the button's class `buttonShowPartsOnChrono`, so the button is never updated by the other control nor by the init reset: its `active` state can disagree with the flag
(DEBT-315). Like BEH-344, the flag has no visible effect with the default renderer.

- **Group:** CAP-303
- **Origin:** accident
- **Code:**
  - `ChronoControl.js`: `onToggleButton_showPartsOnChrono`, `toggledNewState`, `updateButtons`
- **Links:** DEBT-315, DEBT-301, BEH-344, SEAM-303

## BEH-346: User resize of the chronogram div

`#chronoDiv` is also resizable by the user (jQuery UI, handles n, s, e, w); on stop, `chronoItemHeight` is recomputed as `(height-margins)/N` (through `getChronoItemHeight`, which calls `console.trace`) and the layout refreshed
(BEH-347). The resize-stop handler was not found in `ChronoControl.js` (no `resizestop` there); where it is bound is open, so this item stays unverified.

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `getChronoItemHeight`, `refreshChronoLayout`
  - `labelbee_page.html`: `#chronoDiv`
- **Links:** BEH-313, BEH-347

## BEH-347: Layout refresh and collapsed chronogram

`refreshChronoLayout()` runs, through `debouncer`, a function that resets `#chronoDiv` `top`/`left` to 0 (to flush the div after a resize from the top/left handles) and calls `axes.refreshLayout()` unless `#chronoTab` has class
`collapsed`. `debouncer` (default delay 100 ms) keeps its timer in a per-instance closure and a new one is created on every call, so calls are delayed by 100 ms but never coalesced (DEBT-305). It is called by `adjustChronogramHeight` and is bound (in `initChrono`) to `collapsibleexpand` of `#chronoTab`, so a collapsed chronogram is laid out on expansion.
`axes.refreshLayout()` emits `axes:changed` (type `resize`), hence a redraw (BEH-311).

- **Group:** CAP-301
- **Code:**
  - `ChronoControl.js`: `refreshChronoLayout`, `debouncer`, `adjustChronogramHeight`
  - `labelbee_page.html`: `#chronoTab`
- **Links:** BEH-302, BEH-311, DEBT-305

## BEH-348: Candidate lists of event navigation

Per `eventSeekMode`, in non-auto mode / AutoSeek mode (`flag_autoEventMode`); lists are sorted by (row of the ID, frame) before searching "strictly after" (Next) or "strictly before" (Prev) the start position:
- `tag`: non-auto: `tagIntervals` of the start ID; auto: all `tagIntervals`; ordered by `begin`.
- `freetag`: as `tag` but only intervals with `!labeling.labeled` (`isNotLabeled`); after a redraw every interval qualifies (DEBT-311).
- `event`: non-auto: observations of the start ID (`flatTracksValidGroupById[id]` if `flag_hideInvalid`, else `flatTracksAllGroupById[id]`); auto: all observations (`flatTracksValid` or `flatTracksAll`). Nothing found when the ID has no list (no ID selected, or no event).
- `eventframe`: all observations (`flatTracksValid` or `flatTracksAll`), any ID, ordered by frame; the result is a frame number only.
Filters per list: the `flatTracks*` lists are built by `updateFlatTracks`, which skips frames outside the frame filter when it is active (`config.frameFilter` min/max) and applies `restrictID` and `excludeID`; the Valid/All choice
follows `flag_hideInvalid` ("Valid" = neither `falsealarm` nor `wrongid` label; `flag_hideFlowers` is not applied to these lists, so `eventframe` navigation can stop on hidden flower IDs). The tag list comes from `ttags` (`getTTags`, built from `flatTags = getFlatTags(false)`, commented "noFilter"): in the legacy branch (`tagMode != 'Tracks'`) restrict and exclude are applied and the frame filter is not;
in the `Tracks` branch (`flatTags`) the comment in `getTTags` says restrict/exclude are already applied upstream; the body of `getFlatTags` was not seen, so whether the frame filter reaches the tag list is open (OQ-311); `updateTagIntervals` adds `tagsSampleFilter` and
`tagsIntervalFilter` and no frame filter. Sorting is in place on the arrays used (DEBT-313): `tagIntervals` itself only for `tag` in AutoSeek mode.

- **Group:** CAP-305
- **Code:**
  - `ChronoControlInteraction.js`: `findNextTagEvent`, `findNextFreeTagEvent`, `findNextObsEvent`, `findNextEventFrame`, `findPreviousTagEvent`, `findPreviousFreeTagEvent`, `findPreviousObsEvent`, `findPreviousEventFrame`, `isNotLabeled`
  - `ChronoControl.js`: `updateFlatTracks`, `getTTags`, `updateTagIntervals`
- **Links:** CAP-801, CAP-802, DEBT-311, DEBT-313, OQ-311, BEH-336, BEH-337
