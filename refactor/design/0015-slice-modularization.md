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
     stay available as globals. Inline handlers and the console keep calling `overlay.foo()`: no template rewrite.
     This is a practicality only: inside a module the name is an import (`import { overlay } from './Overlay.js'`),
     a different, strictly scoped binding to the same object, so module code never reads the global and the global
     can be dropped later without touching module code. A `labelbee.overlay` view of them is deferred to the final
     cleanup of the globals (maintainer, 2026-11-20).
   - **Everything else** that is global today (loose functions, constants, state variables) does not stay global:
     it moves to the owning module, and when a classic script or a handler still needs it, it stays a
     global (temporary, listed in the commit, removed with its last reader); the `labelbee.<name>` form is decided
     at the final cleanup.
   Modules need not hide all their members: public by use, not forcibly private.
4. **End state**: `labelbeeBridge.js` shrinks to what the page really needs: the entry points that inline
   handlers or the console use (in a `labelbee` namespace or not, decided at the cleanup). Existing bridges (`NotifierBridge`, `AnnotationStoreBridge`,
   `RefreshBridge`, ...) are folded into it, one per step, at the point where their last classic reader moves.

## Rules for a step (one file or one coherent family, one commit series)

1. **Inventory** its globals (state, function, constant, DOM handle) and who reads or writes each, from the generator
   of step 1; the list is kept in the commit message.
2. **Encapsulate**: state moves behind the owner's accessors; free functions become exports or methods.
3. **Convert** the file to a module. Singletons are exported, imported by name where used, and registered in
   `labelbeeBridge.js` as globals; any other name still read by a classic script or handler stays global,
   listed in the commit and removed with its last reader.
4. **Reduce coupling**: a cross-file call becomes an import, a `refresh.*` call or an `events`/`selection`
   subscription; a cycle that stays is recorded as `DEBT`, with the edge named.
5. **Check**: the feature's browser tests plus at-risk ones (targeted, full suite only at the end), golden tests
   for any pure code touched, the refresh baseline (`test_l_refresh.py`) unchanged. Behavior-preserving only:
   bugs found are recorded as `DEBT`, fixed afterwards in their own commit with the maintainer's approval.

## Steps

- (0) ADR and question [x] (this document, [Q38](../QUESTIONS.md#q38) answered 2026-11-20)
- (1) Inventory generator [x] (`refactor/tools/globals_inventory.js`, built on the facts of `modularity_scan.js`; summary in section Inventory)
- (2) Load order made explicit [x]: `labelbeeBridge.js` skeleton, the ten module tags replaced
  by one. Five trivial bridges (`NotifierBridge`, `LabelsBridge`, `WrongIdBridge`, `CsvSchemasBridge`, `EventTreeBridge`)
  are folded into it. Five stay as imported files until their last classic reader moves: `AnnotationStoreBridge`
  (imported by the golden tests and the harness), `RefreshInstrumentBridge` (named by the stack filter of
  `core/Notifier.js`), `RefreshBridge`, `SelectionModelBridge`, `AnnotationCodecBridge`. No `window.labelbee`
  namespace for now (maintainer, 2026-11-20): the singletons stay plain globals; page and refresh baseline unchanged.
- (3)-(13) one step per row below, lowest level first. Reference counts are from a regex pass, `~`, step 1 replaces
  them: `in` = uses of the file's top-level names by other classic files, `out` = the reverse.

| Step | Layer | Content (split by concern, not always by file) | Why here |
|---|---|---|---|
| 3 | Pure helpers | `Model.js` (14 names: `Observation`, `deepcopy`, `hasParts`, `getValidIDs*`, `obsDoesExist`, `getObsHandle`, `changeObservationID`, `getFrames*`, `obs_swapID`) to `annotation/` next to `Events.js`; `pathJoin`, `url_for`, `htmlCheckmark` from `labelBee.js` to `core/Utils.js`; `cacheTags`/`getTags` | in ~47, out ~4: no GUI, no state of its own; everything above uses it |
| 4 | Store writes of the selection | `deleteEvent`, `storeUnit`, `submitDraft` into `annotation/EditActions.js`, `getIdsInFocus` into `annotation/Model.js`. The singletons `refresh` and `selection` are exported by their wiring bridges (`export const`), so modules import them (decided 2026-11-20). Stay classic until step 9: the undo stack (dead until its own slice, and its button is DOM), `swapID_findAll` (dead), `deleteSelected` and `modifyCurrentObsSpan` (read `overlay` and `flatTracksAll`) | state and store writes, no DOM; unblocks the GUI files |
| 5 | Video data | `VideoCache` class out of `VideoControl.js` and `HoverControl.js` to `video/`; the `videoinfo` state to `video/VideoInfo.js`. The data half of `VideoManager` (`VideoList.js`) is not split out: its constructor and methods mix DOM and data, so it moves whole with the forms (step 9) | `videoinfo` (in ~95) has no global: the state lives in `video/VideoInfo.js`; modules import `getVideoInfo`, the bridge installs `getVideoInfo` and `setVideoInfoObject` on `window` for the classic scripts (no namespace, decision 1). Whole-object writes call the setter (`VideoManager`), field writes update the object the getter returns, in place (`VideoControl.js`, `VideoList.js`). Done in two commits: 5 (accessor) and 5b (accessor replaced by the calls) |
| 6 | Annotation IO | split in two. 6a: the saves and exports to file (`saveEventsToFile`, `saveEventsToCSV`, `saveEventsToBBoxes`, `saveTagsToFile` and their helpers) to `annotation/FileExport.js`; what they save is picked by the new `annotation/Export.js` (`exportTracks(format)`, `exportTracksCSV`, `exportBBoxes`, `exportTags(version)`: state to representation, an unknown format throws), replacing the zero-argument `convertTracksToV1/V2` wrappers (they leave `AnnotationCodecBridge.js`). Naming rule: `convertX(args)` is the pure codec, `exportX(...)` reads the page state. 6b: the loaders (`setTracks`, `setTags`, the file, server and CSV loaders, the load errors) to `annotation/Load.js`, and `mainAlert`, the AJAX error handlers and `eventsToServer` to `annotation/ServerIO.js`; the slice 3 goldens extract the functions by name, so `io-env.js` reads the two modules. They keep `ttags` and the views as call-time globals (listed in the module headers). `updateEventsNotes` and `onChanged_events_notes` stay in `AnnotationIO.js` (a form update, instrumented by its global name by `RefreshInstrumentBridge.js`: step 9). The bridge installs only the names a classic script, a template handler or a browser test still calls (explicit lists, a misspelled name throws); the other exports stay module-private. `setEventsProp` (a copy of `events.setInfo` with a log, no caller) is deleted with its two goldens. 6c (decided 2026-11-21, after 6b): layering by role, no sibling imports at the same level. `Export.js` (state to representation) and `Load.js` (representation to state) are the leaves and know the formats; the transports sit above them and know the formats only by schema name. `Load.js` keeps only what takes a payload into the store: `setTracks`, `setTags`, `loadTracksFromText`, `loadTagsFromText`, `loadCSVFromRows(rows, schema, url)` (the converters, `centerPolicy`, info headers and tracks-then-tags order of each CSV schema live in it; it throws on invalid input) and `loadTracksCSVFromDB`. New `annotation/FileImport.js` (mirror of `FileExport.js`): `loadEventsFromFile`, `loadTagsFromFile` and the `FileReader` helpers. `annotation/ServerIO.js` holds all the AJAX in both directions: `ajaxGetJSON`, `getJSONPromise`, `d3.csv`, the AJAX error handlers, `eventsToServer`, `loadEventsFromServerByID`, `eventsFromServer`, `tagsFromServer`, `loadEventsFromFile0` and `loadCSVFromServer(url, schema)` (it separates the envelope (`json.data.data`, `created_by_id`...) from the payload and hands the payload to `Load.js`; `schema` is optional and autodetected from the file name by `CsvSchemas.classifyFilename`, default `tracks`). The four per-schema CSV loaders and `csvLoaderFor` are replaced by `loadCSVFromServer`. New `core/Alerts.js`: `mainAlert`, `reportLoadError` (the load-error display shared by the file and server loaders). `eraseEvents`, `eraseTags` and the two `clickLoad...CSVFromServer` prompts return to `AnnotationIO.js` until step 9. DEBT until step 9: `fromServerDialog.basedOn`, `statusWidget` and the dialog message are written by `ServerIO.js` / `Alerts.js` through globals. 6d: `decodeTags` guarantees a well-formed result and rejects the rest (what `setTags` rolled back by try/catch, and frames without a `tags` array that it let through), so `setTags` and `setTracks` become `loadTags` and `loadTracks` (decode, `replaceTags`/`replaceTracks`, `refresh.chrono()`, `refresh.frame()`, a boolean) without rollback or the `ttags = getTTags()` write (`refreshChronogram` recomputes it); `replaceTags` computes `tagsHaveDM` itself; the DM option panel follows `tagsHaveDM` (`updateTagsPanel()`, run by `refreshChronogram`); a load now refreshes the chronogram before the frame (the order of the baseline `load`, `load_csv`); the stale `setEventsProp` comment of `Events.js` is reworded. Recorded as DEBT: `updateEventsNotes()` stays a direct call, `cacheTags` read `ttags[key]` where `tagCache[key]` was meant (fixed; it is dead code, only `computeMotionDirection` calls it and nobody calls that), `eventsToServer(format)` ignores `format`. `AnnotationIO.js`: the dialogs (`FilePickerFromServerDialog` in `labelBee.js`, `FromServerDialog`, `LabelListDialog`) wait for step 9 | out ~36 (mostly `labelBee.js` and `ChronoControl.js` calls to refresh and print): after 3 to 5 these are imports |
| 7 | Chrono data and axes | split. 7a: `ChronoAxes.js` to `chrono/ChronoAxes.js` first, because it is self-contained (reads only `d3`, `$` and `logging`; `ChronoControl.js` is its only caller, once, in `initChrono`); the four names it assigned without declaring (`plotArea`, `center`, `originalCallback`, `rank`: a module is strict and would throw) become local variables, `plotArea` a variable of the constructor; `injectEventFilter` has one call, so a local `originalCallback` is the same behavior as the implicit global. `ChronoAxes` is installed as a global by the bridge for `initChrono`. 7b (maintainer, 2026-11-21): `ChronoControlActivitiesLegacy.js` is deleted, not moved: it draws nothing by default (the activity drawing runs only when `chrono.config.legacyActivities` is set from the console, the tag drawing renders an empty list once at init, `createIntervalList_legacy`, `initActivities` and `removeActivities` are never called; the visible intervals are drawn by `ChronoIntervals` in `ChronoControl.js` and the CSS of `.interval`). With it go the toggle `legacyActivities` and its console hint, `initTagIntervals()`, the branch of `renderActivities`, and what only it read: `crosses`, `rectIntervals`, `circlesIntervals`, `partsIntervals`, `acts`, `svgTag` (an empty `tagLayer` group) and their computation. Recorded as DEBT: the options `flag_showIndividualEvents` and `flag_showPartsOnChrono` (buttons and checkboxes of the page) have no reader left, as before for the default. 7c: the shared chrono state becomes one `chronoState` object, declared (the implicit globals of `ChronoControl.js` end), a mechanical rename in `ChronoControl.js` and `ChronoControlInteraction.js` (maintainer, 2026-11-21). 7d: `ChronoControlInteraction.js` as a module | `ChronoControl` in ~27 and ~20 from these: they depend on `ChronoControl.js`, so first break that cycle (shared state moved to a `ChronoState`) |
| 8 | Chrono view | `ChronoControl.js` (100 names, in ~80); the three `import()` modules of `chrono/` become static imports | needs 3 to 7; the most-used controller after `videoinfo` |
| 9 | Forms and dialogs | GUI half of `SelectionControl.js` (`updateForm`, label toggles, event tree, `updateSelectionPanels`) as `Form`; `VisitControl.js`; the dialogs; the video list view of `VideoList.js` | read the model of 4 and 5, drawn by 10 and 11 |
| 10 | Video player and zoom | `VideoControl.js` (82 out, 59 into `VideoList`), `ZoomView.js` (out ~34) | GUI classes over the model; `ZoomView` reads the overlay, so after 11a |
| 11 | Overlay | 11a analysis table (display vs not, in this ADR, maintainer review); 11b non-display concerns out (ID prediction `[3085-3302]`, pick-frame timeline, parameters and ROI UI, activity helpers); 11c `overlay/Overlay.js` + `overlay/*.js` (rects <-> observations, drawing of IDs, tags, tracks, mouse events, fabric events) | 105 names, out ~83, 4000 lines: depends on everything; last big GUI class |
| 12 | Entry | `labelBee.js` as module entry (`init`, `onKeyDown*`, `StatusWidget`, `printMessage`); remove aliases; list what `labelbeeBridge.js` still defines | wires the rest |
| 13 | Record | PLAN, `intent/modules.md` state table, DEBT | |

Step 2 (bridge skeleton) comes before 3. Steps 8 to 11 may each be cut into several PLAN lines. Cycles found
(for example `ChronoControl` <-> `ChronoControlInteraction`, `VideoControl` <-> `VideoList`, `VisitControl` <->
`OverlayControl`) are broken by moving the shared state down a layer, not by a late import.

## Step 7c: chrono state, options and view handles (maintainer, 2026-11-21)

`ChronoControl.js` and `ChronoControlInteraction.js` share about 35 names that are mostly implicit globals (assigned in `initChrono` and the refresh functions, never declared). They cannot become modules while they share bare globals. A first design put all of them in one `chronoState` object; the maintainer rejected it: only the derived data is state. The rest goes to where it belongs, as a mechanical, traceable move (names kept, including the `flag_` prefix; renaming is a later cleanup).

| Kind | Where | Names |
|---|---|---|
| derived data | `chronoState` (`chrono/ChronoState.js`, installed as `window.chronoState`) | `chronogramData`, `tagsChronogramData`, `allIntervals`, `flatTracks`, `flatTracksAll`, `flatTracksValid`, `flatTracksAllGroupById`, `flatTracksValidGroupById`, `tagIntervals`, `allTagsID`, `flatTags`, `ttags` |
| filter options | `chrono.config.filter` | `restrictID`, `restrictIDArray`, `flag_restrictID`, `excludeID`, `excludeIDArray`, `flag_excludeID`, `flag_hideInvalid`, `flag_hideFlowers`, `frameFilter` (was `config.frameFilter`) |
| navigation options | `chrono.config.seek` | `flag_autoEventMode`, `eventSeekMode` |
| display options | `chrono.config.chronoDisplay` | `chronoItemHeight`, `flag_showSpans`, `flag_showPartsOnChrono`, `flag_showIndividualEvents`, `showObsChrono`, `showTagsChrono` (both moved from `OverlayControl.js`), `showDanglingTracks`, `hide_non_dangling` |
| id to row mapping | `chrono.config.idMap` | `idAxisMapMode`, `idAxisMapString`, `idAxisMap` |
| d3 view handles | the `Chronogram` instance | `chrono.axes`, `chrono.layers.svgSpanRects`, `.svgInterval`, `.svgTop`, `chrono.chronoIntervals` |

- `chrono.config` stays the one holder; its sub-objects are plain objects created by the `Chronogram` constructor with the defaults `initChrono` gives (which still resets the same ones). `excludeID` and `excludeIDArray` start as `null` and `[]` instead of undefined, and `chronoIntervals` is now created by the constructor instead of at script load. The names `filter`, `seek`, `chronoDisplay`, `idMap` were chosen by the maintainer: `ChronoConfig` was rejected as misleading, because the options also cover navigation.
- `showObsChrono`, `showTagsChrono`, `onChronoParametersChanged` (and the checkbox sync, `updateChronoCheckboxes`) moved from `OverlayControl.js` to `ChronoControl.js`; the HTML `onclick` keeps calling the same global.
- The rename is done by a scope-aware script with a name-to-target map (only free references to the global are rewritten; locals of the same name, property names and DOM ids are not touched). Outside the two chrono files it touches `ZoomView.js`, `SelectionControl.js`, `OverlayControl.js`, `AnnotationIO.js` and the browser tests that read these names through `ui.js(...)`.
- Not moved: the singletons `chrono`, `chronoDragControl`, `videoKeyframes`, `videoCacheStatus` (declared, many readers outside), and the leaked locals (`options`, `videoSpan`, `trackWindowSpan`, `obs_for_id`, `showObsTable`), left for the module conversion of the file.
- Later, separate commits: drop the `flag_` prefixes, rename `layers.svgX` to `layers.X`, flatten or re-home the config groups.

## Step 7d: `ChronoControlInteraction.js` as a module (2026-11-21)

The file (512 lines, 42 functions, no top-level statement, no implicit global, no `this`) is the navigation and seek side of the chronogram: `gotoEvent`, the `find*Event` searches, the comparison functions, the axes callbacks (`onAxesClick`, ...), the seek-mode buttons.

- It moves to `chrono/ChronoControlInteraction.js` (same name, so the diff of the move stays readable) and becomes an ES module. Only the 14 functions other files use are exported: `gotoEvent` (`VisitControl.js`, `OverlayControl.js`, `ChronoControl.js`), `onAxesClick`, `onAxesDblClick`, `onAxesChanged`, `onAxesMoved`, `updateEventSeekMode` (`ChronoControl.js`), and the eight inline handlers of the page (`gotoFirstEvent`, `gotoLastEvent`, `gotoNextEvent`, `gotoPreviousEvent`, `onClickNextID`, `onClickPrevID`, `eventSeekModeClicked`, `onAutoEventButtonClick`). The other 28 become module-private.
- `labelbeeBridge.js` imports it and installs the 14 names on `window` (`explicit `window.X = X` lines). The classic scripts call them at run time only (the load-time scan finds 0 hit), after the deferred bridge has run.
- What the module still reads as page globals, resolved at call time: `chrono`, `chronoState`, `selection`, `videoControl`, `overlay`, `refresh`, `logging`, `getCurrentFrame`, `getObsHandle`, `autoCentering`, `focusTrackWindow`, and from `ChronoControl.js` `refreshChronogram`, `updateChrono`, `setRestrictID`, `validVisibleTagIdsDomain`. They become imports when their owners become modules (steps 8 to 12); the cycle `ChronoControl` <-> `ChronoControlInteraction` is broken at step 8 by importing in one direction only.

## Step 8: `ChronoControl.js` as a module (2026-11-21)

Split in three, each a review gate. Facts (static scan, `[read]`): 2174 lines, `Chronogram` class plus ~100 functions; it reads about 35 page globals (`videoControl`, `overlay`, `events`, `AnnotationStore`, `selection`, `getVideoInfo`, `hasLabel`, `containsLabel`, `Labels`, `ROI`, ...) which resolve at call time and stay globals; it assigns five names without declaring them; 44 of its top-level names are used by other files (the page's inline handlers, `ChronoControlInteraction.js`, `OverlayControl.js`, `VideoList.js`, `VideoControl.js`, `SelectionControl.js`, `Model.js`, `labelBee.js`, `ChronoLayout.js`, `FitControls.js`, the bridges and the tests).

| Step | Content |
|---|---|
| 8a | While still a classic script: `options`, `videoSpan`, `trackWindowSpan`, `obs_for_id`, `showObsTable` declared where used (each is used only in the function that assigns it). |
| 8b | The move to `chrono/ChronoControl.js` as a module, with the three decisions below. |
| 8c | The three `import()` of `ChronoDragControl`, `VideoCacheStatus`, `VideoKeyframes` become static imports (a timing change, so alone). |

Decisions for 8b:

1. **Exports are explicit.** The 44 names used elsewhere are exported and installed one by one as `window.X = X` in `labelbeeBridge.js`, as in 7d; the rest becomes module-private. `Chronogram` is a class, so it is installed on `window` too (a classic `class` is not a window property, a module one is not visible at all).
2. **The refresh instrumentation moves into the module.** `core/RefreshInstrumentBridge.js` replaces `window.X` by a timing wrapper for 11 chrono functions (`refreshChronogram`, `updateChronoData`, `drawChrono`, `updateChrono`, `renderObsTable`, `updateTimeMark`, `updatePreviewTimeMark`, `updateTrackWindowSpan`, `updateChronoSelection`, `updateChronoXDomainFromVideo`, `updateTagIntervals`). Inside a module the calls between these functions would bypass that replacement, and `refreshLog` (nesting, `test_l_refresh`) would lose them. So `RefreshInstrumentBridge.js` exports `instrument(phase, name, fn)` (the same wrapper, also recorded in `refreshInstrumented.wrapped`), the 11 names leave its `GLOBALS` list, and `ChronoControl.js` rebinds each at load: `refreshChronogram = instrument("chrono", "refreshChronogram", refreshChronogram)`. Callers inside the module, the handlers bound by reference in `initChrono` and the exports then all see the wrapped function, as before. Removed with the instrumentation (ADR 0009 step 7). `refreshInstrumented.missing` stays `[]`.
3. **The four singletons stay globals.** `chrono`, `chronoDragControl`, `videoKeyframes`, `videoCacheStatus` are assigned from this file and read or assigned elsewhere (`labelBee.js:49` does `chrono = new Chronogram()`). A module-level `var` would become a private copy, so the module writes `window.chrono = this` etc. and reads the bare name; no module-level declaration.

As built in 8b: 38 names exported (the 44 minus the 4 singletons, minus `initChrono` and `updateFlatTracks`, which only comments name); the singletons are created at the top of the module as `window.chrono = undefined` etc., after which the existing `chrono = this` assignments are legal in strict mode and `labelBee.js` still assigns `chrono`; the 11 `instrument(...)` rebindings sit at the end of the file; `ChronoControlInteraction.js` keeps reading the ChronoControl names from `window` at call time, so there is no import cycle to break (the plain imports can replace those reads in a later cleanup).

As built in 8c: the three `import()` become static imports of `ChronoControl.js`; the bodies of the `.then` callbacks run synchronously in `initChrono` (their dependencies, `videoControl`, `videoCache` and the static DOM, exist when `new Chronogram()` runs). `window.ChronoDragControl` (the namespace, read by `test_o1`) is installed by the bridge; `window.VideoCacheStatus` and `window.VideoKeyframes`, which nothing read, are dropped.

Install helper (after 8b, maintainer request 2026-11-21): `labelbeeBridge.js` installs the names of 7d and 8b with `installGlobals({ a, b, ... })`, a loop over the keys of the object it receives. The names stay written out at each call site, grouped by role (read by other files, inline handlers of the page); the helper never installs a module's exports wholesale, which `Object.assign(window, Module)` does. The three older `Object.assign(window, Module)` calls (`Model`, `EditActions`, `VideoInfo`) are converted the same way at the maintainer's request: each module's exports are imported by name and listed in an `installGlobals` call (same names, so no behavior change).

Regrouping step (maintainer decision 2026-11-21, after 8c): the chrono functions are regrouped by topic, instead of staying in one 2000-line file plus the interaction file. Candidates: the filter (restrict and exclude ID, hide invalid and flowers) next to `chrono.config.filter`, the navigation and seek (`ChronoControlInteraction.js`), the display toggles and the axes scale. It needs its own survey and ADR section before any move.

Other risks: a module is strict (the scan finds no other undeclared assignment; the file parses as a module); the dynamic `import("./chrono/X.js")` paths become `./X.js` (relative to the module); `ChronoIntervals`, defined after `Chronogram`, is used only at run time.

## Step 8d: chrono functions regrouped by topic (2026-11-21)

`chrono/ChronoControl.js` is one module of 2174 lines, 15 sections. A static call graph between the sections (`[ran]`, throwaway script) shows the dependencies go one way, from the handlers down to the data, with no cycle apart from the root (`Chronogram`/`initChrono` call into everything). To keep the number of files small (maintainer decision 2026-11-21: "typical utils, data, controls, render, overall") the sections are grouped in five modules, each importing only from the ones above it in this table:

| Module (`chrono/`) | Content | Imports |
|---|---|---|
| `ChronoUtils.js` (~50 lines) | `format_HMS`, `flash`, `debouncer` | nothing |
| `ChronoData.js` (~800) | tracks, tags, intervals, `updateChronoData`, `updateTagIntervals`, `interpolateTags`, `computeMotionDirection`, `augmentTrackWithTag`, `cleanObsoleteEvents*` | nothing |
| `ChronoRender.js` (~700) | what draws: activities and `ChronoIntervals`, time marks, `videoSpan`/`trackWindowSpan`, `getWindow`, the obs table, the axes (domains, resizing, layout), and the refresh (`refreshChronogram`, `drawChrono`, `updateChrono`) | utils, data |
| `ChronoControls.js` (~250) | what the user operates: the filter (restrict and exclude ID, hide invalid and flowers), the toolbar toggles, mousewheel, `onChronoParametersChanged`, and the axes buttons (`chronoAdjust`, `scaleTimeDomain`, `shiftTimeDomain`) | utils, render |
| `Chrono.js` (~350) | overall: `Chronogram`, `initChrono` | all of the above |

The names other files use keep their `window` names; the bridge imports each from its new module and the `installGlobals` lists are split accordingly. The 11 `instrument(...)` rebindings move with their functions (the module that defines a function rebinds it, so handlers bound by reference keep seeing the wrapped one; `refreshLog` in `test_l_refresh` is the check). The one variable shared across sections, `previewBar` (time marks and `initChrono`), is exported by the render module.

Sub-steps, each a review gate and behavior-preserving, tests as for step 8: 8d1 utils and data (the two modules that call nothing), 8d2 render, 8d3 controls (what is left is the overall part, renamed `chrono/Chrono.js` by maintainer decision 2026-11-21, in 8d1 already, so the later sub-steps do not move a file twice). The split is by whole top-level statements, with the comments that precede them, moved by script; the only text change is `export` on the names another module needs.

As built in 8d1: `ChronoUtils.js` (49 lines) and `ChronoData.js` (783 lines) cut out by script (`ChronoControl.js` 2174 to 1369 lines, then `git mv` to `Chrono.js`); `Chrono.js` imports 6 names from them; the bridge imports the 6 data names (`updateChronoData`, `updateTagIntervals`, `augmentTrackWithTag`, `computeMotionDirection`, `cleanObsoleteEvents`, `cleanObsoleteEventsCB`) from `ChronoData.js`. The two `instrument(...)` rebindings of the data functions moved with them. `ChronoControlInteraction.js` keeps its name (it is the interaction part, not the overall class).

As built in 8d2: `ChronoRender.js` (713 lines) holds the axes (layout, resizing, domains), the time marks, the video span and track window, the refresh, `ChronoIntervals` and the obs table, with the 9 `instrument(...)` rebindings; `Chrono.js` goes from 1369 to 664 lines. The static check found no reference from the render part back to what stays in `Chrono.js`, so the import order holds. `chronoAdjust`, `scaleTimeDomain` and `shiftTimeDomain` stay in `Chrono.js` until 8d3 (they are controls). `previewBar` is exported by the render module and only mutated through its properties. `Chrono.js` imports 11 names from it (the ones `initChrono` and the handlers call); the bridge imports 14 exported names from `ChronoRender.js` and 18 from `Chrono.js`, all keeping their `window` names.

As built in 8d3: `ChronoControls.js` (272 lines) holds the toolbar toggles, the mousewheel mode, `onChronoParametersChanged`, the filter (restrict and exclude ID, hide invalid and flowers) and the axes buttons (`chronoAdjust`, `scaleTimeDomain`, `shiftTimeDomain`); `Chrono.js` (395 lines) keeps `Chronogram`, `initChrono` and the window singletons. `Chrono.js` imports 5 names from it (the `update*` helpers `initChrono` calls); the bridge imports 17 names from it and only `Chronogram` from `Chrono.js`. The static check found no reference from the controls back to `Chrono.js`. Import order of the whole regrouping: `ChronoUtils`, `ChronoData`, `ChronoRender`, `ChronoControls`, `Chrono`.

## Step 9: forms and dialogs, in three sub-steps (2026-11-22)

Facts (static scan, `[read]`): `VideoList.js` 849 lines, one class `VideoManager` (all methods on the prototype); `VisitControl.js` 566 lines, `VisitWidget` plus `OverlayControl.prototype.drawImagePickFlowerMode`; `SelectionControl.js` 802 lines, ~45 functions (init, label panel and `LabelListDialog`, form, event tree, selection, undo, label toggles, span edits).

| Sub-step | Content | Notes |
|---|---|---|
| 9a | `VideoList.js` becomes the module `video/VideoList.js` (`export function VideoManager`) | whole file moved, no split: the ADR already decided (step 5) that its constructor and methods mix DOM and data. Only `labelBee.js` and the inline handler `videoManager.receiveVideoSelection()` use it |
| 9b | `VisitControl.js` as a module | `VisitWidget` and the `OverlayControl.prototype` extension; the latter reads the overlay, so decide at 9b whether it moves with 11 |
| 9c | `SelectionControl.js` as a module, GUI half (`updateForm`, label toggles, event tree, panels) separated from selection, undo and span edits | the leaked globals `labelButtonsArray` (read and written by `AnnotationIO.js`) and `labelListDialog` (inline handler) need an owner |

As built in 9a: `video/VideoList.js` is the old file moved with `git mv`. Strict mode makes five implicit globals illegal: `videoListTable`, `videoListCurrentID` and `theManager` become module-level `let` (same sharing between instances; none is read from another file or the page), `out` and `html` become locals. The bridge installs `window.VideoManager` (read by `labelBee.js` at `init()`); the `<script>` tag leaves `labelbee_page.html`. The `.gitignore` line naming the old path `js/VideoList.js` is removed (the file was tracked, so it never hid anything; the check found no other ignored `.js` outside `extern/fabric/dist/`).

As built in 9b: `VisitControl.js` becomes a module (committed in place; moved to `form/VisitControl.js` with 9c, a path change only; its `drawImagePickFlowerMode` part is overlay and leaves for `overlay/` in 11b). `VisitWidget` is `export const` and installed by the bridge (`OverlayControl.js` builds it); the extension `OverlayControl.prototype.drawImagePickFlowerMode` stays in the file and runs when the module is evaluated, after the classic scripts, so it needs no move now. `default_id`, an implicit global only written there, becomes a module-level `let`. The `<script>` tag leaves `labelbee_page.html`.

As built in 9c: `SelectionControl.js` (802 lines) is cut in two modules by whole top-level statements. `form/Form.js` (573 lines, in its own folder `form/`: whatever edits event attributes through a control; `VisitControl.js` moves there too in this step, a path change only) takes the GUI half: `initSelectionControl`, the label panel and `LabelListDialog`, the ID field, `updateForm`, the event tree, the delete button, the label toggles and the annotation statistics; `SelectionControl.js` (252 lines) keeps selecting, activating and deselecting a bee, swap ID, delete, the undo stack and `modifyCurrentObsSpan`. The only edge between them is `updateSelectionPanels`, imported by `SelectionControl.js` from `Form.js` (static check; `updateDeleteButton` goes with the form so that nothing goes back). Two implicit globals that other code reads stay page globals, declared at the top of `Form.js`: `labelButtonsArray` (written by `AnnotationIO.js`) and `labelListDialog` (the inline handler). Six implicit locals (`json`, `obj`, `w`, `h`, `frames`, `rect`) become `let`. The six refresh entry points of the file (`updateForm`, `updateEventTree`, `updateSelectID`, `updateFormButtons`, `updateDeleteButton`, `updateUndoButton`) leave the `GLOBALS` list of `core/RefreshInstrumentBridge.js` and are wrapped by `instrument` at the end of their module, so calls inside the modules are logged too. The bridge installs the 20 names used by the classic scripts, the inline handlers and the tests, and `window.undoStack` (the same array, never reassigned); the other top-level names are used only inside the two files.

DEBT (maintainer, 2026-11-22): `SelectionControl.js` stays where it is until it is cleaned up. Long term: the undo stack and pop (core, nothing pushes on it since ADR 0008 step 1) go to `annotation/`, with the button and `undoAction` (GUI) staying in `form/`; `deleteSelected` and the delete button are GUI over the core `deleteEvent` (`annotation/EditActions.js:17`) and belong in `form/`; `selectBeeByIDandFrame`, `deselectBee` and `activateSelection` are controller and view over `annotation/SelectionModel.js` and the overlay, and follow the overlay in step 11; `getCurrentTag` is a data read that follows `getTag` (`OverlayControl.js:2137`).

## Step 10: video player and zoom, in two sub-steps (2026-11-22)

| Sub-step | Content | Why here |
|---|---|---|
| 10a | `VideoControl.js` (976 lines) to `video/VideoControl.js` as a module | its state and readers are already in `video/` (`VideoCache`, `HoverControl`, `VideoInfo`, `VideoList`) |
| 10b | `ZoomView.js` (2276 lines) | it reads the overlay, so it waits for 11a (analysis of `OverlayControl.js`) |

As built in 10a: the file is moved with `git mv` into `video/` and becomes a module (`export function VideoControl`); no statement is cut. Globals are cut instead of declared (maintainer: the fewer the better): `VideoControl.js` imports `VideoCache`, `HoverControl` and `getVideoInfo` (no cycle: they receive the `VideoControl` as an argument), `videojsoninfo` becomes a local, and the `videoCache` alias is removed (the 6 reads in `OverlayControl.js` and 1 in `chrono/Chrono.js` use `videoControl.videoCache`), so the bridge no longer installs `VideoCache` or `HoverControl`. `videoCache` stays as a console-only debug global, registered by the bridge with `registerDebugGlobal` (`annotation/DebugGlobals.js`) and installed by `installDebugGlobals()` or `?debug_globals`; `test_f_writers` and `test_q` adapted. The line `X.prototype = {}` of `VideoCache.js` and `VideoControl.js` is removed: it replaced the default prototype and its `constructor` link, so `videoCache.constructor` was `Object` and the statics (`isCanceled`) were unreachable from an instance (the methods are assigned on the default prototype just as well). DEBT: the same line remains in `HoverControl.js`, `VideoList.js`, `OverlayControl.js:165`, `ZoomView.js:155`, to remove when each file is handled. `lasthash` stays a page global (shared with `labelBee.js:onhashchange`, step 12). The two refresh entry points (`VideoControl.refresh`, `VideoControl.onFrameChanged`) are wrapped at the end of the module by `instrument`, and leave the `METHODS` list of `core/RefreshInstrumentBridge.js`; the other three methods of that list stay there until their files are modules. The bridge installs `window.VideoControl` (built by `init()`); the file-local `timeout` helper is no longer a page global (no other user). The `<script>` tag leaves the page.

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
