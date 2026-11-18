# ADR 0009: Refresh by notification, one ordered `Refresher` (slice 6; explicit `refresh.*` first, see section 0)

Status: **proposed**. Direction from the maintainer, 2026-11-16 ([Q34](../QUESTIONS.md#q34)-[Q36](../QUESTIONS.md#q36), all answered the same day; Q34 differs from the first proposal: no automatic injection at load, a manual one-shot only). Numbers are those of `refactor` at `eb473985`.
Evidence tags as in `CLAUDE.md`: `[read]` seen in code, `[inferred]` from names or call shape, to be verified at step 1.
Follows slice 4 ([ADR 0007](0007-slice-events-api.md): `Events` is the only door) and slice 5 ([ADR 0008](0008-field-ownership.md): every editor writes the store).
What was missing: the other direction, store to views. SEAM-701 ([seams](../intent/seams.md)) and the end of PLAN slice 5 list it as the next slice.

## 0. Amendment (maintainer, 2026-11-17): explicit `refresh.*` first, notification later

Supersedes D1-D3 and D7 for the migration; D4-D6 and D8 stand. Reason: a hidden subscriber hides which writes forget their views (the "incomplete" rows of [0009-refresh-triggers.md](0009-refresh-triggers.md)); an explicit call sits where the change is requested, is greppable, and its list is the migration list for a later notification.

**API** (`window.refresh`, a module with a bridge; replaces the unattached `Refresher` of step 2). Order inside a call is fixed: derived data, overlay, form, zoom.

| call | runs | for |
|---|---|---|
| `refresh.update()` (soft) | `chrono()`, `overlayUpdate()`, `form()`, `zoom()` | a field of an observation changed |
| `refresh.rebuild()` (hard) | `chrono()`, `overlayRebuild()` (includes the form), `zoom()` | an observation appeared, disappeared or changed id; a bulk change |
| `refresh.chrono()` | `refreshChronogram` | filters and parameters (class B, C) |
| `refresh.overlayRebuild()` | `videoControl.refresh` (rebuild + form) | display only: pan, zoom, show tags, track window, deselect |
| `refresh.overlayUpdate()` | `overlay.refreshOverlay` | display only, no rect created |
| `refresh.form()` | `updateForm` | only after `overlayUpdate()`; a rebuild already runs it |
| `refresh.zoom()` | `refreshZoom` (already a no-op when the zoom view is closed) | explicit, and inside `update` and `rebuild` |
| `refresh.frame()` | `onFrameChanged` | the video moved (D6) |

- A site that does not need the chronogram (drag, angle, notes, parts: "needed" column of the triggers doc) calls the primitives (`overlayUpdate()`, `form()`), not `update()`: `chrono()` is the cost that scales (~60 ms at 18000 observations).
- **MVC rule**: only a controller or a writer calls `refresh.*`; a view never does, and a view never writes the store. So a refresh cannot trigger a refresh. `refresh` keeps a cheap `#running` guard that logs a violation and drops the call.
- **Audit** (dev only): `events.subscribe` logs "store written, no `refresh.*` call in this task", never triggers. A browser test asserts that no scenario logs it.
- `events.batch` stays, for the loops (D4); the notification channel and `Refresher` come back only after every site is migrated and the audit is clean.
- The refresh tests are written from the "needed" column of the triggers doc, not from the legacy sequences: counts may change either way, each change listed in the commit.
- Retired with this step, not migrated: `newRectForCurrentTag`, `undoAction` (undo is off).
- [DEBT-825](../intent/debt.md): `hardRefresh` writes `span` in pick-frame mode; fixed in its own commit by moving the default span to the entry of the mode.

## 0b. Amendment (maintainer, 2026-11-18): step 6, the selection owner without a channel

Option 1 of the step 6 choice, shaped by the maintainer's answer to [Q37](../QUESTIONS.md#q37). Amends [Q35](../QUESTIONS.md#q35) the same way section 0 amended D1-D3: the model owns the state and the selection logic, the writers call `refresh.*`, nothing subscribes.

**Today** (`[read]`): fabric's active object is the selection. `overlay.getActiveObject()` / `setActiveObject()` are used ~40 times in `OverlayControl.js` (12), `ZoomView.js` (13), `SelectionControl.js` (10), `labelBee.js` (4), `VisitControl.js` (1). `selectedKey()` (`labelbee/static/labelbee/js/SelectionControl.js:493`) is the one reader that turns it into `{frame, id}`; the store editors go through it (ADR 0008 R4). The writers are `selectBee`, `selectBeeByID`, `deselectBee` (`SelectionControl.js:566-631`) and fabric's own mouse events (`onObjectSelected`, `selection:cleared`, `OverlayControl.js:143`). `selectBee` / `deselectBee` also fire four jQuery events on `selectionControl` (`tagselection:*`, `selection:*`) whose only subscriber is `zoomOverlay.selectionChanged` (`labelbee/static/labelbee/js/labelBee.js:142-145`). `tagSelection` (`SelectionControl.js:565`) is written and never read; `defaultSelectedBee` (24 references, 5 files) is the id to select again after a frame change: each writer sets it and each frame change re-selects by id with its own ad-hoc logic, so "what is selected" is decided in many places.

**Cost** (`[ran]`, `refactor/tests/browser/refresh_baseline.json`, scenario `select`, a click with no store write): `updateDeleteButton` x2, `updateFormButtons` x2, `refreshZoom` x4, plus `updateForm`, `updateChronoSelection`, `updateSelectID` once. The `refreshZoom` and `updateFormButtons` pairs come from the four events above `[inferred]`: `selectionChanged` runs once per event; step 6c verifies it before deleting.

**Design.** The selection is the M and the C of its own MVC triple: the logic of what is selected lives in one place, has no view and calls no `refresh.*`; the views only ask it.
- `annotation/SelectionModel.js` (a module with a bridge, like `Events`) and its one instance `window.selection`. The class is not called `Selection`: that is a DOM interface of the browser (`window.Selection`) and a global definition would shadow it.
- State: the frame and the id to follow. Nothing else is stored.

| call | does | replaces |
|---|---|---|
| `selection.getId()` | the id to follow, `undefined` when none | `defaultSelectedBee` (24 references) |
| `selection.getKey()` | `{frame, id}` when that id has an observation in `events` on that frame, else `null`; derived from the state and the store at each call, so idempotent and never stale after a delete or a rename; a draft rectangle is not in the store, so `null` | `selectedKey()` |
| `selection.select(frame, id)` | a user choice (click, chronogram, ID field, `selectBeeByID`); the id is kept even when no observation matches (the `defaultSelectedBee = id` branch of `selectBeeByID`) | `selectBee`, `selectBeeByID` and the assignments of `defaultSelectedBee` |
| `selection.changeFrame(frame)` | the video moved: keeps the id, so `getKey()` is the observation of that id on the new frame, or `null` with the id still kept as the default | the ad-hoc re-selection of each frame change |
| `selection.clear()` | explicit deselect: forgets the id | `deselectBee` |

- It reads `events` (`has`), never writes it, emits nothing. A rename (`changeObservationID`) and a delete end with the calls that fit (`select(frame, new_id)`, `clear()` or nothing, since `getKey()` re-derives).
- `refresh.selection()` changes no model: it reads `selection.getKey()` / `getId()` and runs the view chain, `updateForm`, `updateChronoSelection`, `updateSelectID`, `updateFormButtons`, `updateDeleteButton`, `zoom()`. The overlay's `hardRefresh` selects the rectangle of `getKey()` when it rebuilds. The `refresh.*` call of a writer follows its `selection.*` call, never the other way.
- Fabric stays the source of the rectangle (geometry during a drag, the working copy, ADR 0008 P3); its mouse events call `selection.select` / `clear`. The four jQuery triggers and `tagSelection` (`[read]`, no reader) are deleted.
- The model and fabric must agree after every user action: a browser test compares `selection.getKey()` with the key of fabric's active object after each scenario of `test_l_refresh.py` and the selection tests, so a writer that forgets the model fails. Risk: an observation in the store that the overlay does not display (a filter) would make `getKey()` non-null with no active rectangle; the agreement test is what finds it.

**Steps** (a commit is a review unit: steps that only make sense together are one commit):
- 6a. This amendment, [Q37](../QUESTIONS.md#q37) answered, PLAN.
- 6b. `SelectionModel.js` + bridge + golden tests of its logic, and its users: `defaultSelectedBee` becomes `selection.getId()`, `selectedKey()` becomes `selection.getKey()`, `selectBee*`, `deselectBee`, fabric's mouse events and the frame change call `selection.*`; the agreement test. No refresh change (the model alone has no effect).
- 6c. `refresh.selection()`, called once by the selection writers, the four jQuery triggers deleted, `hardRefresh` and the store writers running the chain once per rebuild; the `select`, `frame`, `label`, `drag`, `delete` baselines checked (decreases listed in the commit).

**Not in this step**: `selection:changed` as a channel (comes back with the notification); `getActiveObject()` readers that need the rectangle (geometry), which stay on fabric; the selection in undo (undo is off).

## 1. Decisions (maintainer, 2026-11-16)

- **D1 Sync.** A subscriber runs inside the command that changed the store. No second layer (no `derived:changed`): the order is fixed in one place.
- **D2 Coarse.** The notification says that something changed (`{op, frame, id, fields}` is carried, as the observer already does, but every subscriber recomputes as it does today). Fine-grained reactivity is a later slice.
- **D3 One ordered entry point.** A module `Refresher` is the only subscriber of `events`. It runs a fixed sequence: derived data, then views. Registration order never matters.
- **D4 `events.batch(fn)`.** One notification at the end of `fn`, for the loops that write many observations (`cleanObsoleteEvents`, delete FA/wrongid tags, rename, loaders).
- **D5 Tags stay out of the channel.** `Tags` / `TagsInfo` keep their explicit refresh until the tag merge. The `tag` field of an observation is part of the events (see Q34).
- **D6 Frame and filters stay explicit.** A frame change belongs to the video (`VideoControl.onFrameChanged`); the chronogram filters and toggles belong to the derived data (later slice).
- **D7 Selection is in the slice** (it is part of the refresh path): `selection:changed` on the same ordered path ([Q35](../QUESTIONS.md#q35)).
- **D8 A refresh log** (`logging.refresh` in `core/Notifier.js`): one line per refresh phase with sequence number, trigger, phase, duration. A debugging tool for slow or inconsistent refreshes, and what the tests pin.

## 2. Where the code is (evidence)

**What a data change triggers today, by hand.** `[read]`
- `videoControl.refresh()` (`VideoControl.js:936`): `updateVideoControlForm` + `overlay.hardRefresh()`, which clears the canvas and rebuilds every rectangle of the frame (`OverlayControl.js:943-952`). 31 callers.
- `refreshChronogram()` (`ChronoControl.js:889`): `updateChronoData()` (full rebuild, O(all observations): `chronogramData`, intervals, `flatTracks*`, `flatTags`, `ttags`), `drawChrono()` (d3), `renderObsTable()` (the whole table HTML while the Labeling tab is open). About 63 call sites in 9 files.
- `updateForm(activeObject)`: 17 callers, 4 files.
- `storeUnit` is the model: `events.update(...)`, `videoControl.refresh()`, `refreshChronogram()` (`SelectionControl.js:510-515`).

**A frame change** calls `onFrameChanged` -> `hardRefresh` -> `refresh` (overlay only) and triggers `frame:changed`; the chronogram does not rebuild (`VideoControl.js:857-885`). `[read]`

**The observer** of `Events` is a single slot (`setObserver`, `annotation/Events.js:68-84`) with no caller outside tests. `[read]`

**A self-trigger trap.** `updateChronoData` starts with `augmentTrackWithTag()`, which writes `obs.tag` into the store with `events.update` for every observation that has a tag in `Tags`, at every refresh (`ChronoControl.js:977,1027-1036`). A refresh subscribed to the store would call itself. [Q34](../QUESTIONS.md#q34).

**Duplicate refreshes on load.** `setTracks` refreshes (`AnnotationIO.js:362-363`), then the loaders do it again after it (`:1075-1077`, `:1225-1227`, `:1254-1256`, `:1281-1282`, `:1305-1307`, `:1337-1339`, `:1361-1363`, `:1381-1383`). `[read]`, DEBT-712.

### Classification of the `refreshChronogram` / `onFrameChanged` call sites

By enclosing function, each one read at step 1 (`[read]`). Counts are of the static inventory run on `eb473985` (`design/0009-refresh-coupling-inventory.js`; calls only, comments and definitions excluded): 169 calls of the 13 entry points, of which 57 `refreshChronogram` and 27 `videoControl.refresh`. The first draft said ~63 `refreshChronogram` sites; the count is 57.

| Class | What | Sites (files) | Fate |
|---|---|---|---|
| A. Store write (39 sites: 29 `refreshChronogram`, 10 `videoControl.refresh`) | the function writes the store (`events.update/commit/delete`, `storeUnit`, `submitDraft`, `setTracks`) then refreshes | `AnnotationIO.js` 8 (`setTracks` + 7 loaders), `SelectionControl.js` 13 (`submitDraft`, `storeUnit` x2, `doSwap2`, `deleteEvent`, `labelToggle`, dead `undoAction`), `OverlayControl.js` 7 (`doSwap2`, `doSetSpanStart/End`, `newRectForCurrentTag`, `onMouseUp_interactiveRect`), `ZoomView.js` 5 (`onClickAlternateTag`, `rotateTag`, `bakeAllTagFixes`, `deleteFalsealarmEvents`, `deleteWrongIdEvents`), `VisitControl.js` 2, `labelBee.js` 3 (id edits), `ChronoControl.js` 1 (`cleanObsoleteEvents`) | removed, replaced by the notification (steps 4-5) |
| B. Derived config (24, all `refreshChronogram`) | filters, toggles, restrict / exclude id, parameters, auto-event mode | `ChronoControl.js` 16, `OverlayControl.js` 5 (`ROIChanged`, `excludeRectsChanged`, `onTagsParametersChanged`, `onChronoParametersChanged`, `onMouseDown_predict`'s chronogram refresh), `ChronoControlInteraction.js` 3 (next / prev id, `onAutoEventButtonClick`) | stay explicit (D6) |
| C. Tags (4, `refreshChronogram`) | `setTags`, `loadTagsCSVFromServer`, `deleteFalsealarmTags`, `undoAllTagFixes` (they edit `Tags`, not `events`) | `AnnotationIO.js` 2, `ZoomView.js` 2 | stay explicit (D5) |
| D. Frame / video (14 `onFrameChanged`) | after a seek, a load, `changeStartTime`, `changeFPS` | `AnnotationIO.js` 10 (the loaders), `VideoControl.js` 4 | stay |
| E. Display only (17, all `videoControl.refresh`) | overlay redraw with no data change: pan, zoom, show tags, track window, deselect, re-select, `ctrl+r`, `onMouseDown_predict` (the write comes later, in `submitDraft`) | `OverlayControl.js` 14, `SelectionControl.js` 1, `ZoomView.js` 1, `labelBee.js` 1 | stay |
| V. View chain (71 calls of `updateForm`, `hardRefresh`, `refreshOverlay`, `refreshZoom`, `updateChrono*`, `renderObsTable`, ...) | one view asks another | `OverlayControl.js` 25, `ZoomView.js` 16, `SelectionControl.js` 8, `VideoControl.js` 5, `VideoList.js` 5, `labelBee.js` 5, `ChronoControl.js` 4, other 3 | step 6 for the selection part; the rest stays |

Corrections to the draft classification: `onMouseDown_predict` and `onAutoEventButtonClick` do not write the store (E and B); `onMouseUp_interactiveRect`, `bakeAllTagFixes` (via `events.update`) and `labelToggle` (via `storeUnit`) do write (A); `deleteFalsealarmTags` and `undoAllTagFixes` only edit `Tags` (C); the draft's "D" sites in `AnnotationIO` were missing. Three A sites refresh again right after a call that already refreshes (`storeUnit`): `ZoomView.js:1732`, `ZoomView.js:1769`, `labelBee.js:896`; they are the "twice" of the baseline and go at step 4 with no replacement.

## 3. Design

**`events`.** `subscribe(fn)` (a list, replaces `setObserver`, which stays as an alias until its test callers move), `batch(fn)` (nested batches count; the notification fires when the outermost ends, once, with `op: "batch"` and the list of the inner events), and no notification for a command that did nothing (an `update` of a missing observation, an aborted `rename`, a `delete` of nothing): same rule as the observer today (`update` with equal fields does notify; no equality check is added). Step 2 details: `subscribe` returns its unsubscribe function; the single-slot observer stays as it is and still hears each command at once, also inside a batch (the dirty-write detector of the browser tests relies on it); only the subscribers get the batched notification, `{op: 'batch', events: [...]}`, and one `store` entry `batch N` is logged at the flush; a batch whose `fn` throws still flushes what it did, then rethrows; an empty batch notifies nobody. A notification raised while the Refresher runs is an error through `logError` (a view must not write the store; see Q34), the notification is dropped, not a loop. The Refresher is created by its bridge (`window.refresher`) with `attach(events)` / `detach()`, **not attached** at step 2 (attaching it before the explicit calls are removed would refresh twice); step 4 attaches it with its first writer.

**`Refresher`** (`annotation/Refresher.js`, a module with a bridge for the classic scripts), sequence per notification:

1. derived: `updateChronoData()` (as today, minus `augmentTrackWithTag`);
2. views: `drawChrono()`, `renderObsTable()`, `videoControl.refresh()` (overlay), `updateForm(selection)`.

The functions are called, not moved: the slice changes who calls them and when, not what they do. `refreshChronogram()` stays as the entry for classes B and C.

**`selection:changed`** ([Q35](../QUESTIONS.md#q35)): see the question.

**Logging.** `refreshLog` in `core/Notifier.js` (a ring buffer of 2000 entries, `window.refreshLog` for the console; `logging.refresh = true` echoes each entry and records its trigger, the caller read from the stack). One entry per call of an *entry point*: a command of `events` (`store`, written by `Events.#emit`) or a function that redraws a view from the state. The view entry points are wrapped in one place, `core/RefreshInstrumentBridge.js` (a list, no change in the classic scripts: `refreshChronogram`, `updateChronoData`, `drawChrono`, `updateChrono`, `renderObsTable`, `updateTimeMark`, `updatePreviewTimeMark`, `updateTrackWindowSpan`, `updateChronoSelection`, `updateChronoXDomainFromVideo`, `updateTagIntervals`, `updateForm`, `updateEventTree`, `updateSelectID`, `updateFormButtons`, `updateDeleteButton`, `updateUndoButton`, `updateEventsNotes`, `VideoControl.refresh`, `VideoControl.onFrameChanged`, `OverlayControl.hardRefresh`, `OverlayControl.refreshOverlay`, `ZoomOverlay.refreshZoom`). An entry has a nesting `depth` (a call made while another entry point runs is its child) and its duration; `refreshLog.tree()` prints it as `a,b(c,d)`. The list is the inventory of the entry points of step 1, and it goes away with the scattered calls (step 7).

## 4. Performance: measured before, a budget after

Step 0 (before any migration): the log, then a baseline on the largest sample file, scenarios: load, edit one observation, drag release, delete one, bulk delete (FA tags), rename, frame step, tab closed / open. Recorded per scenario: number of refreshes by phase, `updateChronoData` ms, total ms (`performance.now`, 5 runs, median). Budget after each step: no scenario has more refreshes or more milliseconds than its baseline (noise of 10% tolerated, anything above is explained or fixed). The counts are pinned by a browser test (`test_l_refresh.py`); the milliseconds are reported, not asserted.

Where it can get worse (and the guard): a loop of `events.delete` or `update` becoming one refresh per call (`batch`, D4); a refresh also run for a store write that did not need it, such as `tag` (Q34); `renderObsTable` rebuilt while the tab is closed (it already checks the tab; unchanged). Where it can get better: the loaders' second refresh, and the three refreshes of an edit that call `videoControl.refresh()` + `refreshChronogram()` + `updateForm` separately and sometimes twice (counted at step 1).

### Baseline (step 0, `[ran]`, `eb473985` + the refresh log)

`refactor/tests/browser/test_l_refresh.py` pins the nested sequence of each scenario in `refactor/tests/browser/refresh_baseline.json` (13 scenarios, 3 runs identical; headless Chromium, the sample files have 13 observations, the last row 18000 generated ones). Milliseconds are the median of 5 runs, top-level entries only, written to `refactor/scratch/refresh-baseline.json` (git-ignored) for later comparison. Calls per scenario (nested calls included):

| Scenario | `updateChronoData` | `videoControl.refresh` | `hardRefresh` | `updateForm` | `refreshZoom` | `updateDeleteButton` | ms |
|---|---|---|---|---|---|---|---|
| load (file "Load") | 1 | 1 | 1 | 1 | 0 | 1 | 40 |
| load tracks CSV from a URI | **2** | **2** | 2 | 2 | 0 | 2 | 40 |
| select a box | 0 | 0 | 0 | 1 | 4 | 2 | 6 |
| label button | **2** | 1 | 1 | 3 | 8 | 6 | 22 |
| notes (Enter) | 1 | 1 | 1 | 2 | 8 | 6 | 14 |
| rotate tag | **2** | 1 | 1 | 3 | 9 | 6 | 23 |
| create (shift-click) | 1 | 1 | 1 | 3 | 12 | 8 | 18 |
| delete one | 1 | 1 | 1 | 1 | 1 | 4 | 10 |
| swap id | 1 | 1 | 1 | 1 | 1 | 3 | 14 |
| frame step | 0 | 1 | 1 | 1 | 0 | 1 | 6 |
| drag a box (after the moves) | 1 | 1 | 1 | 3 | 10 | 6 | 27 |
| bulk delete (13 commands) | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| label button, **18000 observations** | **2** | 1 | 1 | 3 | 8 | 6 | **142**, of which `chrono` 124 |

What the baseline says:
- **`updateChronoData` is the cost that scales** (about 60 ms per call at 18000 observations against 1 ms at 13); the rest stays under 20 ms. The slice cannot make an edit cheaper than one `updateChronoData`; what it can do is run it once, not twice.
- **Whole refreshes run twice today** in the label button, the tag rotation and the server / CSV loaders (`updateChronoData` x2, and `videoControl.refresh` x2 for the loaders). The file "Load" refreshes once, so the Q36 duplicates are in the server and CSV loaders (`setTracks`, then their own refresh). Removing them is a decrease against the budget, never an increase.
- **`videoControl.refresh` is much more than one redraw**: its `hardRefresh` re-selects the active box (`selectBeeByID`), which runs the selection chain (`updateForm`, `updateChronoSelection`, `updateSelectID`, `updateFormButtons`, `updateDeleteButton`, `refreshZoom`) up to twice inside one refresh. After an edit `updateForm` runs 2 or 3 times, `refreshZoom` 8 to 12 times, `updateDeleteButton` 6 to 8 times. Those are the numbers step 6 (selection) has to bring down.
- **`refreshZoom` is called from outside the store paths**: a plain selection click costs 4 `refreshZoom` and no store write.
- A bulk loop is already one refresh for 13 commands: `events.batch` must keep it.
- **`drawChrono` redraws the chronogram twice**: `updateChronoYDomain` changes the axes domain, whose `onAxesChanged` handler calls `updateChrono()` (`labelbee/static/labelbee/js/ChronoControlInteraction.js:72-76`, `[read]`), then `drawChrono` calls `updateChrono()` itself (`[ran]`: `updateChronox2` under every `drawChrono` in the baseline). So every `refreshChronogram` pays two `updateTagIntervals`, `updateTimeMark` and `updateTrackWindowSpan`; this is the second duplicate behind the budget, independent of the callers.
- The wrappers are not measurable: the totals match the first, shallower instrumentation (load 41 -> 40 ms, label 24 -> 22 ms, 18000 observations 146 -> 142 ms).

## 5. Entanglement: before and after

**Before (step 1, `[read]`, `eb473985`).** Who calls into whom for a refresh: 169 calls of the 13 entry points, 102 across files, in 24 distinct (file, entry point) pairs. Rows: the calling file; columns: the module that defines the entry point (`design/0009-refresh-coupling.js`). Graph: [`0009-refresh-coupling.svg`](0009-refresh-coupling.svg) (panel 1: data and configuration changes, which only ask for the two global refreshes; panel 2: the view chain and the frame change).

| caller file | ChronoControl | VideoControl | OverlayControl | SelectionControl | same file | cross-file |
|---|---|---|---|---|---|---|
| OverlayControl | 10 | 17 | | 4 | 20 | 31 |
| AnnotationIO | 10 | 10 | | | 1 | 20 |
| SelectionControl | 8 | 7 | | | 7 | 15 |
| ZoomView | 7 | 1 | | 2 | 14 | 10 |
| labelBee | 2 | 2 | 1 | 4 | | 9 |
| VideoControl | 1 | | 4 | | 4 | 5 |
| VideoList | 5 | | | | | 5 |
| ChronoControlInteraction | 4 | | | | | 4 |
| VisitControl | 2 | | 1 | | | 3 |
| ChronoControl | | | | | 21 | 0 |

The expectation of the draft held: `AnnotationIO`, `SelectionControl`, `OverlayControl`, `labelBee` call both `ChronoControl` and `VideoControl`; `ZoomView` calls `VideoControl` once (display only) and `VisitControl` only `ChronoControl`. All 14 `refreshZoom` calls and the single `updateEventsNotes` call are within their own file (no column for `ZoomView` and `AnnotationIO`).

**After (target).** The 39 class A sites go (steps 4-5); remaining edges into `ChronoControl` are the B and C classes (`ChronoControl` own UI 16, `OverlayControl` 5, `ChronoControlInteraction` 3, tags 4), into `VideoControl` the E sites (display only, 17) and the frame change (D). `AnnotationIO`, `VisitControl` and `ZoomView` keep no edge for a data change (`ZoomView` and `AnnotationIO` keep the tag ones, class C). The writers get one new edge each: `events.batch` / the notification (they already import `events`). Rule: a file that ends with more refresh edges than above stops its migration.

## 6. Steps (one commit series each; the page works after each)

0. The refresh log (`logging.refresh`, `RefreshLog`), the baseline scenarios and `test_l_refresh.py` pinning today's counts; no behavior change.
1. Read every call site of the table, correct the classes, add the coupling table; [Q34](../QUESTIONS.md#q34) answered by then.
2. `events.subscribe`, `events.batch`, `Refresher` without any caller changed (the sequence is tested by golden tests on synthetic operations and one browser test that the Refresher is the subscriber).
3. `augmentTrackWithTag` out of the refresh path ([Q34](../QUESTIONS.md#q34)).
4. Writers one file per commit, deleting their explicit calls: `SelectionControl` (`storeUnit` first), `OverlayControl`, `ZoomView`, `VisitControl`, `labelBee`, `ChronoControl` clean-up; bulk ones inside `events.batch`. Each commit re-runs the count test; a count can only go down, and a decrease is listed in the commit message.
5. Load: `replace` notifies once, the loaders' own calls are deleted ([Q36](../QUESTIONS.md#q36)).
6. Selection: `selection:changed`, `updateForm` into the sequence ([Q35](../QUESTIONS.md#q35)).
7. Record: PLAN, SEAM-701, `modules.md` state table, DEBT-712 (double refresh) and DEBT-739 (end of the cx/cy recompute) updated.

## 7. Not in this slice

Fine-grained or incremental recompute of the derived data (`flatTracks`, `ttags`), the `Derived` module (DEBT-736), tags on the channel, frame and filter refresh, undo (a change log is easier on top of the notification), the tag merge.
