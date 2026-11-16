# ADR 0009: Refresh by notification, one ordered `Refresher` (slice 6)

Status: **proposed**. Direction from the maintainer, 2026-11-16 ([Q34](../QUESTIONS.md#q34)-[Q36](../QUESTIONS.md#q36), all answered the same day; Q34 differs from the first proposal: no automatic injection at load, a manual one-shot only). Numbers are those of `refactor` at `eb473985`.
Evidence tags as in `CLAUDE.md`: `[read]` seen in code, `[inferred]` from names or call shape, to be verified at step 1.
Follows slice 4 ([ADR 0007](0007-slice-events-api.md): `Events` is the only door) and slice 5 ([ADR 0008](0008-field-ownership.md): every editor writes the store).
What was missing: the other direction, store to views. SEAM-701 ([seams](../intent/seams.md)) and the end of PLAN slice 5 list it as the next slice.

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

By enclosing function; `[inferred]` until step 1 reads each one. Counts are of the inventory run on `eb473985` (refresh calls only, comments excluded).

| Class | What | Sites (files) | Fate |
|---|---|---|---|
| A. Store write | after `events.update/commit/delete/rename/swap` | loaders in `AnnotationIO.js` (~9), `SelectionControl.js` (`submitDraft`, `storeUnit` x2, `doSwap2`, `deleteEvent`, `labelToggle`, dead `undoAction`), `OverlayControl.js` (`doSwap2`, `doSetSpanStart/End`, `newRectForCurrentTag`, `onMouseDown_predict`), `ZoomView.js` (tag fixes, delete FA / wrongid, ~6), `VisitControl.js` (2), `labelBee.js` (id edit, 2), `ChronoControl.js` (`cleanObsoleteEvents`), `ChronoControlInteraction.js` (`onAutoEventButtonClick`?) | removed, replaced by the notification (steps 4-5) |
| B. Derived config | filters, toggles, restrict / exclude id, parameters | `ChronoControl.js` (~15), `OverlayControl.js` (`tagsSampleFilter*`, `onTagsParametersChanged`, `onChronoParametersChanged`), `ChronoControlInteraction.js` (next / prev id) | stay explicit (D6) |
| C. Tags | `setTags` and the tag loaders | `AnnotationIO.js:522-524`, `loadTagsCSVFromServer` | stay explicit (D5) |
| D. Frame / video | `onFrameChanged` after seek, `changeStartTime`, `changeFPS` | `VideoControl.js` (4), `VideoList.js` (2) | stay |
| E. Display only | `drawChrono` alone | `SelectionControl.js:954` | stay |

Whether each A site writes the store before calling is verified at step 1; a site that does not write (a pure view change) moves to B.

## 3. Design

**`events`.** `subscribe(fn)` (a list, replaces `setObserver`, which stays as an alias until its test callers move), `batch(fn)` (nested batches count; the notification fires when the outermost ends, once, with `op: "batch"` and the list of the inner events), and no notification for a command that changed nothing (`update` with equal fields): same rule as the observer today. A notification raised while the Refresher runs is an error logged by `logging.refresh` (a view must not write the store; see Q34), not a loop.

**`Refresher`** (`annotation/Refresher.js`, a module with a bridge for the classic scripts), sequence per notification:

1. derived: `updateChronoData()` (as today, minus `augmentTrackWithTag`);
2. views: `drawChrono()`, `renderObsTable()`, `videoControl.refresh()` (overlay), `updateForm(selection)`.

The functions are called, not moved: the slice changes who calls them and when, not what they do. `refreshChronogram()` stays as the entry for classes B and C.

**`selection:changed`** ([Q35](../QUESTIONS.md#q35)): see the question.

**Logging.** `logging.refresh` in `core/Notifier.js` (default off): `refresh#<n> <trigger> <phase> <ms>`, the trigger being the event op and `frame/id` or the caller label of an explicit refresh. A tiny `RefreshLog` array (last 200 entries, `window.refreshLog` for the console) is what the tests read.

## 4. Performance: measured before, a budget after

Step 0 (before any migration): the log, then a baseline on the largest sample file, scenarios: load, edit one observation, drag release, delete one, bulk delete (FA tags), rename, frame step, tab closed / open. Recorded per scenario: number of refreshes by phase, `updateChronoData` ms, total ms (`performance.now`, 5 runs, median). Budget after each step: no scenario has more refreshes or more milliseconds than its baseline (noise of 10% tolerated, anything above is explained or fixed). The counts are pinned by a browser test (`test_l_refresh.py`); the milliseconds are reported, not asserted.

Where it can get worse (and the guard): a loop of `events.delete` or `update` becoming one refresh per call (`batch`, D4); a refresh also run for a store write that did not need it, such as `tag` (Q34); `renderObsTable` rebuilt while the tab is closed (it already checks the tab; unchanged). Where it can get better: the loaders' second refresh, and the three refreshes of an edit that call `videoControl.refresh()` + `refreshChronogram()` + `updateForm` separately and sometimes twice (counted at step 1).

## 5. Entanglement: before and after

Step 1 produces the file-to-file table (who calls into whom for refresh) from the inventory, committed in this ADR. Expectation, `[inferred]`, to confirm: today the six writer files (`AnnotationIO`, `SelectionControl`, `OverlayControl`, `ZoomView`, `VisitControl`, `labelBee`) all call `ChronoControl` (`refreshChronogram`) and `VideoControl` (`refresh`); after the slice they call neither for a data change, and the remaining edges into `ChronoControl` are classes B-C (its own UI, `OverlayControl` parameter handlers) and `VideoControl` -> overlay (frame change). A result with more edges than before stops the migration of that file.

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
