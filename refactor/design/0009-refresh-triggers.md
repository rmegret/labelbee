# ADR 0009: who triggers a refresh, by user story and by scope

Companion to [0009-slice-refresh-logic.md](0009-slice-refresh-logic.md) section 5. Source: the call inventory (`design/0009-refresh-coupling-inventory.js`, `[read]`) plus a reading of each function. The inventory only sees **direct** calls: a refresh inside `storeUnit` is not counted for its callers, so the counts of section 5 undercount the edits. The measured sequences (`refreshLog`, `refresh_baseline.json`) are the reliable counts.

## Scopes (what a refresh can run, and the call that does it)

| scope | call (the `Refresher` uses this one) | what it does | cost |
|---|---|---|---|
| **Chrono** | `refreshChronogram` | `updateChronoData` (derived data), `drawChrono`, `renderObsTable` | scales with the video (60 ms at 18000 obs) |
| **Rebuild** | `videoControl.refresh` = `updateVideoControlForm` (date, time, frame widgets) + `overlay.hardRefresh` (`OverlayControl.js:943`) | redraw the video frame, `canvas1.clear()`, **recreate every rect** (`createRectsFromTracks`), **re-select a bee, which runs `updateForm`** (`[ran]`, `refresh_baseline.json`: `hardRefresh(updateForm(updateEventTree), updateChronoSelection, ...)`), then an update | scales with the boxes of the frame, creates objects, resets the selection |
| **Update** | `overlay.refreshOverlay` (`OverlayControl.js:1339`) | the fabric rects exist: copy the obs into them (`refreshRectFromObs`), redraw tracks, tags, ROI. Does **not** run `updateForm` | scales with the boxes of the frame, no object created |
| **Form** | `updateForm` | the selection form and the event tree. Part of a Rebuild; needed on its own only after an Update | small |
| **Zoom** | `refreshZoom` | the zoom view | small |
| **Frame** | `onFrameChanged` | the video moved to another frame; it calls `overlay.hardRefresh` | one frame |

A rebuild is needed when a rect appears, disappears or changes identity (create, delete, rename, swap, span, load, frame, a tag id that could become an event id); an update is enough when only what a rect shows changes (labels, angle, geometry).

**What the chronogram reads of an observation** (`[read]`): the labels, the id, the span, `tag`, `fix`, and `cx`, `cy` for the ROI filter (`ChronoControl.js:1121-1124`). It does not read the angle, the notes, or the rect size. A change needs **Chrono** only if it touches one of these; a drag matters only through `cx`, `cy` (and only for the ROI filter). `Events` update notifications carry the names of the changed fields (`Events.js:251`), so the `Refresher` can decide this itself.

A direct `overlay.hardRefresh` call is a rebuild without the widget update of `videoControl.refresh`; it is named in the table where used. Where the code rebuilds a part by hand (`addRectFromObs`, `setActiveObject`) the row says so.

## 1. The user changes the data: fate = notification

"Needed" uses the scope names above (my reading of what each change shows, `[inferred]`; Rebuild implies Form). "Now" lists the calls the code makes, in order, then the verdict: **complete**, **incomplete** (a view that shows the change is not refreshed), **multiple** (the same call twice, or a rebuild where an update is enough). The browser baseline measures the "now" column.

### 1a. Edit one observation

`storeUnit` (`SelectionControl.js:513-514`) = `events.update`, `videoControl.refresh`, `refreshChronogram`.

| user story | function (file:line) | needed | now |
|---|---|---|---|
| Click a label button or toggle a label key (incl. wrong-id) | `labelToggle` `SelectionControl.js:858-874` | Chrono (labels), Update, Form | `storeUnit`; `updateForm` `:873`; `refreshChronogram` `:874`. **multiple**: `refreshChronogram` x2, `videoControl.refresh` where `refreshOverlay` suffices, form again inside it |
| Edit the notes | `onActivityChanged` `:883` | Form only (the chronogram does not read notes) | `storeUnit`. **multiple**: a rebuild and a chronogram for nothing |
| Type in the labels field | `onLabelsChanged` `:892` | Chrono (labels), Update, Form | `storeUnit`; `updateForm`. **multiple** (form), rebuild more than needed |
| Drag or resize a box, release | `onObjectModified` `OverlayControl.js:3958` | Chrono only if the ROI filter is active (`cx`, `cy`), Form; the rect already shows the geometry | `storeUnit`; `overlay.refreshOverlay` `:3963`; `updateForm` `:3964`. **multiple**: `videoControl.refresh` then `refreshOverlay`, form twice, chronogram for nothing |
| Reset the angle, angle from the tag | `onClickResetAngle` `OverlayControl.js:486`, `onClickAngleFromTag` `:506` | Update, Form (no Chrono: the chronogram does not read the angle) | `storeUnit`. **multiple**: a rebuild and a chronogram for nothing |
| Choose an alternate tag (zoom view) | `onClickAlternateTag` `ZoomView.js:1727` | Chrono (`tag`, `fix`), Update, Form, Zoom | `storeUnit`; `updateForm` `:1731`; `refreshChronogram` `:1732`. **multiple**: `refreshChronogram` x2 |
| Rotate the tag (zoom view) | `rotateTag` `ZoomView.js:1763` | same | `storeUnit`; `updateForm` `:1765`; `refreshChronogram` `:1769`; `refreshZoom` `:1787`. **multiple**: `refreshChronogram` x2 |
| Edit the parts (zoom view) | `syncToTracks` `ZoomView.js:416` | Form, Zoom | `storeUnit`. **multiple**: a rebuild and a chronogram for nothing |
| Type a new id on the selected box | `onKeyDown_IDEdit` `labelBee.js:871-872` | Chrono, Rebuild (the id changes the rect's key) | `videoControl.refresh`; `refreshChronogram`. complete |
| Set the pick-frame span start / end | `doSetSpanStart` `OverlayControl.js:987-988`, `doSetSpanEnd` `:1004-1005` | Chrono, Rebuild | `overlay.hardRefresh`; `refreshChronogram`. complete (and `hardRefresh` itself writes `span` at `OverlayControl.js:~960`, a store write inside a refresh) |
| Set the span of a visit | `setSpanFrame` `VisitControl.js:228` | Chrono, Rebuild | `refreshChronogram` only (`this.update()` redraws the visit widget). **incomplete**: the overlay is not rebuilt (a span decides which boxes show: `[inferred]`, to check) |

### 1b. Create, delete, swap

| user story | function (file:line) | needed | now |
|---|---|---|---|
| Create a box with ctrl-drag (draft rect, see 1e) | `onMouseUp_interactiveRect` `OverlayControl.js:3556-3571` | Chrono, Rebuild | `updateForm` `:3556`; `submitDraft` (`videoControl.refresh`, `refreshChronogram`, `SelectionControl.js:484-485`); `videoControl.refresh` `:3571`. **multiple**: `videoControl.refresh` x2 |
| Type an id for the new box (Enter) | `onKeyDown_NewIDEdit` `labelBee.js:894-897` | Chrono, Rebuild | `storeUnit(…, true)` → `submitDraft` (`videoControl.refresh`, `refreshChronogram`); `overlay.hardRefresh` `:895`; `refreshChronogram` `:896`; `updateForm` `:897`. **multiple**: `refreshChronogram` x2, rebuild x2 |
| Click a label or tag with nothing selected, or the "new rect for current tag" button (**legacy, obsolete**, see 1e) | `newRectForCurrentTag` `OverlayControl.js:3285-3313` | (to be removed) | **by hand**: `newRectForTag` → `createRect` (`events.commit`, `addRectFromObs`), `setActiveObject`, then `videoControl.refresh`, `refreshChronogram` `:3312-3313`; the caller's `storeUnit` then does both again. **multiple** |
| Delete the selected observation | `deleteEvent` `SelectionControl.js:707-708` | Chrono, Rebuild | `videoControl.refresh`; `refreshChronogram`. complete |
| Swap two ids over an interval | `doSwap2` `SelectionControl.js:543-544`, `OverlayControl.js:979-980` | Chrono, Rebuild | `videoControl.refresh`; `refreshChronogram`. complete |
| New visit | `newVisit` `VisitControl.js:94-95` | Chrono, Rebuild | `events.commit`; `overlay.hardRefresh`; `refreshChronogram`. complete |
| Undo | `undoAction` `SelectionControl.js:711-734` | **unreachable**: undo is off (Q33, `test_a7`): the button is disabled and `undoPush` has no caller, so the stack is empty. It comes back with its own slice, on the undo stack (not by hand); the manual re-add of the rect and the missing `refreshChronogram` of its other-frame branch (`:718-722`) go with it | not run |

### 1c. Bulk change

| user story | function (file:line) | needed | now |
|---|---|---|---|
| Delete all false-alarm / wrong-id events | `deleteFalsealarmEvents` `ZoomView.js:1937`, `deleteWrongIdEvents` `:1946` | Chrono, Rebuild, once (`events.batch`) | `refreshChronogram` only. **incomplete**: a box of the current frame stays on the overlay until the next refresh (`[read]`, not run) |
| Clean obsolete events (low DM, excluded tags) | `cleanObsoleteEvents` `ChronoControl.js:2053` | same | `refreshChronogram` only. **incomplete**: same |
| Apply all tag fixes | `bakeAllTagFixes` `ZoomView.js:1911` | Chrono, Rebuild (a tag id could become an event id later) | `refreshChronogram` only. **incomplete**. Today **not a store command**: it edits the tag objects shared with `obs.tag` in place (`test_f12`), so no notification fires. Once the tag is a field of the event it is an `events.update` and an ordinary row |

### 1d. Load (step 5)

| user story | function (file:line) | needed | now |
|---|---|---|---|
| Open a file, load from the server or from CSV | `setTracks`, `loadEvents`, `loadEventsFromServerByID`, `eventsFromServer`, `loadTracksCSVFromDB`, `loadTracksCSVFromServer`, `loadTrackTaggedCSVFromServer`, `loadConvertedCSVFromServer` (`AnnotationIO.js`) | Chrono, Frame (rebuild), notes, once | `refreshChronogram`; `onFrameChanged` (→ `overlay.hardRefresh`). The server and CSV loaders do both a second time after `setTracks` ([Q36](../QUESTIONS.md#q36)): **multiple** |

### 1e. Draft rect and `newRectForCurrentTag`: every use, for the decision to retire them

**Draft rect** (a fabric rect with `draft = true`, not in the store until validated; `createRect`/`addRectFromObs` `OverlayControl.js:1509-1524`, green `:1782`):

| use | where |
|---|---|
| created | `addDraftRect` `OverlayControl.js:1707`, called only at the start of a ctrl-drag, `onMouseDown_interactiveRect` `:3479` |
| committed | `submitDraft` `SelectionControl.js:472`, from (a) the end of the ctrl-drag, `onMouseUp_interactiveRect` `OverlayControl.js:3557`; (b) Enter in the id field `#I` with a draft selected, `labelBee.js:846-848`; (c) Enter in the `#newid` field, `storeUnit(…, true)` `SelectionControl.js:517` via `labelBee.js:894` |
| dropped | a ctrl-drag too short, `OverlayControl.js` after `:3557`; deselected before validation, `onObjectDeselected` `:3911` |
| special-cased | `selectedKey()` returns null for a draft (`SelectionControl.js:496`), so `storeUnit` writes the fields on the rect's own `obs`, not in the store (`:505`); `labelBee.js` id-field handler |

So the draft exists for one gesture, ctrl-drag, and the two id fields that validate it. Maintainer's lean: create the rect at once with default values (the id of the prediction, the default size) in the store, then edit its properties as any observation; this removes `addDraftRect`, `submitDraft`, the `draft` flag, the by-hand `storeUnit` branch, and makes ctrl-drag creation an ordinary `events.create` + `update`. To decide in a later step (it changes what a cancelled ctrl-drag leaves behind: today nothing).

**`newRectForCurrentTag`** (`OverlayControl.js:3285`, **legacy, obsolete**): used by the toolbar button `#newRectForCurrentTag` (`labelbee_page.html:705`), by `labelToggle` with nothing selected (`SelectionControl.js:842`), `onClickAlternateTag` (`ZoomView.js:1719`), `rotateTag` (`ZoomView.js:1754`). It creates the box of the current tag and does its own refresh, so those three actions refresh twice. `newRectForTag` (`:3255`) is also used by `onMouseDown_predict` (`:3379`) and stays.

## 2. Not a data change: fate = explicit, not in this slice

| user story | functions | calls now |
|---|---|---|
| Change a chronogram filter or toggle (hide flowers / invalid, exclude / restrict ids, frame filter, show events / parts / spans, next / previous id, auto-event mode) | 14 in `ChronoControl.js`, 3 in `ChronoControlInteraction.js` | `refreshChronogram` |
| Change the ROI, the exclusion boxes, the chrono or tag parameters | `ROIChanged`, `excludeRectsChanged`, `onChronoParametersChanged`, `onTagsParametersChanged`, `onMouseDown_predict` (`OverlayControl.js`) | `refreshChronogram`, and `videoControl.refresh` for four of them (`refreshOverlay` would do) |
| Load or edit the separate tags | `setTags`, `loadTagsCSVFromServer`, `deleteFalsealarmTags`, `undoAllTagFixes` | `refreshChronogram` |
| Pan, zoom the video; show or hide tracks, tags; change the track window | `onMouseMove_panning`, `onMouseWheel_*`, `onShowTags*`, `onTrackWindowChanged`, `onToggleButtonShowOnVideo` (`OverlayControl.js`, `ZoomView.js`) | `videoControl.refresh` (several would do with `refreshOverlay`) |
| Select a box, deselect, ctrl+r | `onMouseDown_selectMultiframe`, `onObjectDeselected`, `selectBeeByIDandFrame`, `onKeyDown` | `videoControl.refresh` (selection: step 6) |
| Move to another frame, change the video info | `onFrameChangedCache*`, `onFrameChangedVideo2`, `onPreviewFrameChanged` (`VideoControl.js`), `changeFPS`, `changeStartTime`, `setVideoInfo` (`VideoList.js`) | `onFrameChanged`; the video info also `drawChrono` (axes) |

The view chain (71 calls: `updateForm` 17, `refreshZoom` 14 all inside `ZoomView`, `overlay.hardRefresh`, `refreshOverlay`, `drawChrono`) is what the refreshes call; it is in section 5 of the ADR.

## 3. What this changes for step 4

- **Complete and once** today: delete, swap, new visit, set span, change id, load. A notification replaces them one for one.
- **Multiple**, or a rebuild / chronogram where none is needed (about 10 rows): one notification is one refresh, so these only get cheaper. Label click, drag release, angle, notes and parts need less than today.
- **Incomplete** today (bulk deletes, obsolete events, visit span, tag fixes): the `Refresher` fixes them, but runs more than today (a `videoControl.refresh`), which the budget "no scenario with more refreshes" counts as an increase. List them as bug fixes in the commit.
- **Unreachable or to retire**: `undoAction` (undo is off), `newRectForCurrentTag` (legacy), the draft rect (decision in 1e). Their duplicated refreshes disappear with them, not by migration.
- **Not a store command yet**: `bakeAllTagFixes` and the `Tags` edits stay explicit until the tag is an event field.
- **The sequence**: a rebuild already runs `updateForm`, so the explicit `updateForm(overlay.getActiveObject())` after `videoControl.refresh` in `RefresherBridge.js` is a second form update; it belongs only after an Update.
- **Scope from the notification**: `create`, `delete`, `rename`, `swap`, `replace`, `commit` → Chrono + Rebuild. `update` → by its `fields`: Chrono only if a field the chronogram reads changed (labels, id, span, tag, fix, `cx`, `cy`), Update + Form for what a rect shows (labels, angle, geometry), Form alone otherwise (notes, parts). The bulk and the `batch` event take the union of their events.
