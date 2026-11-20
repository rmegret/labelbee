# ADR 0015: Slice 8, modularization of the remaining classic scripts

Status: proposed (maintainer request 2026-11-20; follows [ADR 0001](0001-strangler-migration.md))

## Context

`labelbee/blueprints/labelbee/templates/labelbee_page.html:50-69` still loads 17 classic scripts, ~17000 lines, in a
fixed order, sharing one global scope (~450 top-level `var`/`function`/`class`, counted per file with `grep`; exact
list from step 1). Each finished slice added ES modules, plus one `*Bridge.js` per module that copies the module onto
`window` for those scripts (`labelbee_page.html:74-83`, ten `<script type="module">` tags whose order matters).
Inline `onclick=` handlers in the template (~180) also call globals.

| Classic script | Lines | Notes |
|---|---|---|
| `OverlayControl.js` | 4027 | fabric overlay, plus things that are not display (decisions below) |
| `ZoomView.js` | 2276 | |
| `ChronoControl.js` (+ `ChronoAxes.js`, `ChronoControlInteraction.js`, `ChronoControlActivitiesLegacy.js`) | 2161 (+967, 512, 808) | one module family sharing state |
| `AnnotationIO.js` | 1560 | loaders, save and export |
| `VideoControl.js` | 1390 | |
| `labelBee.js` | 1016 | page entry |
| `SelectionControl.js` | 881 | |
| `VideoList.js` | 849 | |
| `VisitControl.js` | 566 | |
| `Model.js`, `HoverControl.js` | 160, 85 | small, first |

## Decisions (maintainer, 2026-11-20)

1. **Native ES modules** (`import`/`export`), same libraries (extern scripts stay classic).
2. **`OverlayControl.js` becomes one module** `overlay/Overlay.js`, which imports sub-modules from `overlay/*.js`
   to separate concerns. What in it is not the display layer (e.g. the form, the selection glue, Pick Flower,
   id prediction, the activity/label helpers) gets its own module outside `overlay/`.
3. **One bridge, `labelbeeBridge.js`**, replaces the per-module bridges: the only place importing the modules and the
   only `<script type="module">` of the page (besides layout scripts until they move). Two kinds of name:
   - **Singleton controllers** (`overlay`, `zoomOverlay`, `videoControl`, `events`, `selection`, `refresh`, the form, ...)
     stay available as globals *and* as `labelbee.overlay`, ... (same object). Inline handlers and the console keep
     calling `overlay.foo()`: no template rewrite. This is a practicality only: inside a module the name is an
     import (`import { overlay } from './Overlay.js'`), a different, strictly scoped binding to the same object,
     so module code never reads the global and the global can be dropped later without touching module code.
   - **Everything else** that is global today (loose functions, constants, state variables) does not stay global:
     it moves to the owning module, and when a classic script or a handler still needs it, it is exposed as
     `labelbee.<name>` (temporary, listed in the commit, removed with its last reader).
   Modules need not hide all their members: public by use, not forcibly private.
4. **End state**: `labelbeeBridge.js` shrinks to what the page really needs: the `labelbee` namespace and the
   entry points that inline handlers or the console use. Existing bridges (`NotifierBridge`, `AnnotationStoreBridge`,
   `RefreshBridge`, ...) are folded into it, one per step, at the point where their last classic reader moves.

## Rules for a step (one file or one coherent family, one commit series)

1. **Inventory** its globals (state, function, constant, DOM handle) and who reads or writes each, from the generator
   of step 1; the list is kept in the commit message.
2. **Encapsulate**: state moves behind the owner's accessors; free functions become exports or methods.
3. **Convert** the file to a module. Singletons are exported, imported by name where used, and registered in
   `labelbeeBridge.js` as global and `labelbee.X`; any other name still read by a classic script or handler is
   exposed as `labelbee.<name>`, listed in the commit and removed with its last reader.
4. **Reduce coupling**: a cross-file call becomes an import, a `refresh.*` call or an `events`/`selection`
   subscription; a cycle that stays is recorded as `DEBT`, with the edge named.
5. **Check**: the feature's browser tests plus at-risk ones (targeted, full suite only at the end), golden tests
   for any pure code touched, the refresh baseline (`test_l_refresh.py`) unchanged. Behavior-preserving only:
   bugs found are recorded as `DEBT`, fixed afterwards in their own commit with the maintainer's approval.

## Steps

- (0) ADR and question [x] (this document, [Q38](../QUESTIONS.md#q38) answered 2026-11-20)
- (1) Inventory generator [x] (`refactor/tools/globals_inventory.js`, built on the facts of `modularity_scan.js`; summary in section Inventory)
- (2) Load order made explicit: `labelbeeBridge.js` skeleton with `window.labelbee`, the existing bridges folded in,
  the ten module tags replaced by one; page and refresh baseline unchanged.
- (3)-(13) one step per row below, lowest level first. Reference counts are from a regex pass, `~`, step 1 replaces
  them: `in` = uses of the file's top-level names by other classic files, `out` = the reverse.

| Step | Layer | Content (split by concern, not always by file) | Why here |
|---|---|---|---|
| 3 | Pure helpers | `Model.js` (14 names: `Observation`, `deepcopy`, `hasParts`, `getValidIDs*`, `obsDoesExist`, `getObsHandle`, `changeObservationID`, `getFrames*`, `obs_swapID`) to `annotation/` next to `Events.js`; `pathJoin`, `url_for`, `htmlCheckmark` from `labelBee.js` to `core/Utils.js`; `cacheTags`/`getTags` | in ~47, out ~4: no GUI, no state of its own; everything above uses it |
| 4 | Undo and selection logic | non-GUI of `SelectionControl.js`: undo stack (`undoPush/Pop`, `undoStack`), `swapID_findAll`, `deleteSelected`, `deleteEvent`, `storeUnit`, `modifyCurrentObsSpan`, `getIdsInFocus` into `annotation/` (with `SelectionModel.js`) | state and store writes, no DOM; unblocks the GUI files |
| 5 | Video data | `videoinfo` + the data half of `VideoManager` (`VideoList.js`): fetch, current video, `video:loaded`; `VideoCache` class out of `VideoControl.js`; `HoverControl.js` | in ~95 (a hub, most-used global): moves early with accessors, the `videoinfo` global becomes `labelbee.videoinfo` until its readers move |
| 6 | Annotation IO | `AnnotationIO.js`: loaders, savers, exports (non-GUI); the dialogs (`FilePickerFromServerDialog` in `labelBee.js`, `FromServerDialog`, `LabelListDialog`) wait for step 9 | out ~36 (mostly `labelBee.js` and `ChronoControl.js` calls to refresh and print): after 3 to 5 these are imports |
| 7 | Chrono data and axes | `ChronoControlActivitiesLegacy.js` (derived activity data), `ChronoAxes.js`, then `ChronoControlInteraction.js` | `ChronoControl` in ~27 and ~20 from these: they depend on `ChronoControl.js`, so first break that cycle (shared state moved to a `ChronoState`) |
| 8 | Chrono view | `ChronoControl.js` (100 names, in ~80); the three `import()` modules of `chrono/` become static imports | needs 3 to 7; the most-used controller after `videoinfo` |
| 9 | Forms and dialogs | GUI half of `SelectionControl.js` (`updateForm`, label toggles, event tree, `updateSelectionPanels`) as `Form`; `VisitControl.js`; the dialogs; the video list view of `VideoList.js` | read the model of 4 and 5, drawn by 10 and 11 |
| 10 | Video player and zoom | `VideoControl.js` (82 out, 59 into `VideoList`), `ZoomView.js` (out ~34) | GUI classes over the model; `ZoomView` reads the overlay, so after 11a |
| 11 | Overlay | 11a analysis table (display vs not, in this ADR, maintainer review); 11b non-display concerns out (ID prediction `[3085-3302]`, pick-frame timeline, parameters and ROI UI, activity helpers); 11c `overlay/Overlay.js` + `overlay/*.js` (rects <-> observations, drawing of IDs, tags, tracks, mouse events, fabric events) | 105 names, out ~83, 4000 lines: depends on everything; last big GUI class |
| 12 | Entry | `labelBee.js` as module entry (`init`, `onKeyDown*`, `StatusWidget`, `printMessage`); remove aliases; list what `labelbeeBridge.js` still defines | wires the rest |
| 13 | Record | PLAN, `intent/modules.md` state table, DEBT | |

Step 2 (bridge skeleton) comes before 3. Steps 8 to 11 may each be cut into several PLAN lines. Cycles found
(for example `ChronoControl` <-> `ChronoControlInteraction`, `VideoControl` <-> `VideoList`, `VisitControl` <->
`OverlayControl`) are broken by moving the shared state down a layer, not by a late import.

## Inventory (step 1, 2026-11-20)

Regenerate: `node refactor/tools/modularity_scan.js $TMPDIR/parser $TMPDIR/facts.json`, then
`node refactor/tools/globals_inventory.js $TMPDIR/facts.json` -> `refactor/scratch/globals-inventory.{md,json}` (git-ignored; per
file table, every global with its readers and writers, handler roots, bridges, implicit globals). Static, no code run: `[read]`.

| Fact | Value | Consequence |
|---|---|---|
| Declared globals of the 20 classic scripts (incl. `layout/`) | 438 | |
| Used by no other file | 335 (76%) | become module-private by the conversion alone, no alias |
| Used by another file | 103 | the real interface to design; the per-file table lists them |
| Declared state written from another file | 12: `videoinfo` (`VideoList.js`); `allIntervals`, `tagIntervals`, `ttags`, `crosses`, `partsIntervals`, `chrono` (`ChronoControl.js`); `radius`, `cx`, `cy`, `user_id`, `lasthash` (`labelBee.js`) | need an owner with a setter before their file moves (steps 5, 8, 12) |
| Implicit globals (written, declared nowhere) | 105: 67 `shared`, 38 `leak` | they throw in a module; `shared` = the page's real state, declared in its owner; `leak` = a forgotten `var`, declared where used (behavior-preserving) |
| `shared` implicit by writer file | `ChronoControl.js` 26 (the `flag_*`, `restrictID*`, `flatTracks*`, `svg*`), `OverlayControl.js` 17 (options, `excludeRects`, `canvasTransform*`), `labelBee.js` 8 (the singletons `overlay`, `videoControl`, `videoManager`, `statusWidget`, `getCurrentFrame`, `loginDialog`), 16 in the other files | the singletons are the ones kept global by decision 3 |
| Most-touched singletons (functions using them) | `overlay` 82, `videoControl` 65, `axes` 38, `getCurrentFrame` 35, `canvasTransform` 20, `fromServerDialog` 14 | confirms the order: they are created in `labelBee.js:init`, used everywhere |
| Inline handler calls | 223; 65 roots are loose globals, the other 12 are singletons, DOM or `if` (`overlay`, `videoControl`, `videoManager`, `zoomOverlay`, `fromServerDialog`, ...) | [Q38](../QUESTIONS.md#q38): only the 65 loose ones are rewritten, to `labelbee.<name>` |
| Names put on `window` by modules (the bridges) | 19 (`logging`, `refresh`, `selection`, `Labels`, `WrongId`, `CsvSchemas`, `EventTree`, `db`, ...) | folded into `labelbeeBridge.js` at step 2 |
| Names declared twice | none | no ambiguity to settle |

Per file, `in` and `out` references (not regex, from the scan): `OverlayControl.js` 24 in / 85 out, `ChronoControl.js` 82 / 33,
`VideoList.js` 91 / 22, `labelBee.js` 66 / 24, `Model.js` 47 / 4, `SelectionControl.js` 43 / 17, `VideoControl.js` 2 / 67,
`ZoomView.js` 1 / 27. The order of the table above stands: `Model.js`, `VideoList.js` and `labelBee.js` are depended on (low
level, move first or get accessors), `OverlayControl.js`, `VideoControl.js` and `ZoomView.js` mostly depend on others
(high level, move last). The three ES modules loaded by `import()` in `ChronoControl.js:264-286` write the implicit globals
`ChronoDragControl`, `VideoCacheStatus`, `VideoKeyframes`.

## Risks

- **Timing**: classic scripts run during parsing, modules are deferred (after parsing, before `load`). Code
  at top level that touches the DOM or `window.onload` (`labelBee.js`) must be checked at each conversion.
- **Inline handlers** keep working for singleton calls; handlers calling loose functions are the only ones to rewrite ([Q38](../QUESTIONS.md#q38)).
- **Strict mode**: modules are strict; implicit globals (`success`, `tags`, DEBT-712) throw instead of leaking and
  are found by step 1.
- `OverlayControl.js` is 25% of the code; its step is the longest and may be cut into several PLAN lines.
