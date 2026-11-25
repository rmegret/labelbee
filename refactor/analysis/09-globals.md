# 09 Globals of the page (slice 8 step 16a)

Question it answers: which names does the running page still hold on `window`, who needs each one, and which could be imported instead.
Per-name table (one row and one ID each, `G001`...): [09-globals-table.md](09-globals-table.md), generated, do not edit.

## Method

| Part | Evidence | How |
|---|---|---|
| The names | [ran] | `refactor/tools/globals_probe_test.py` (copied into `refactor/tests/browser/` to run): opens the labelbee page with a video and events loaded, lists the own properties of `window` minus those of a blank iframe. Result: 233 |
| Owner module | [read] | `labelbeeBridge.js` `install(Module, [...])`, `installGlobals({...})`, `window.X =`, the loops of `annotation/AnnotationCodecBridge.js`, `annotation/AnnotationStoreBridge.js`, the scan facts |
| Handlers | [read] | `refactor/tools/modularity_scan.js` facts: 223 `on*=` calls of the template and of generated HTML, by first identifier (`overlay.foo()` counts for `overlay`) |
| Page script | [read] | names inside the inline `<script>` blocks of `labelbee_page.html`, `layout.html`, `common/macros.html`, comments excluded |
| Module readers | [read] | files that use the name without importing or declaring it (scan facts) |
| Tests | [read] | name found in `refactor/tests/` (browser and golden) |
| Generator | [ran] | `node refactor/tools/globals_table.js <facts.json> <windump.json>` (IDs frozen in `refactor/tools/globals_ids.json`) |

## Criterion (maintainer, 2026-11-25): "can it be imported?"

| Verdict | Meaning | Count |
|---|---|---|
| N library | third-party or jQuery globals | 15 |
| N handler | named by an inline handler of the page or of generated HTML: a template cannot import | 72 |
| N page script | read by an inline script of the page | 7 |
| N tests, console | read by no module and no handler, only by tests: the console and the browser tests cannot import | 33 |
| S importable | read only by modules that could import it from its owner | 87 |
| S no reader | nothing reads it | 19 |
| Total | | 233 |

Necessary (N) 127, spurious (S) 106. Types of the spurious: 91 functions, 11 objects (among them `AnnotationStore`, `events`, `refresh`, `selection`, `statusWidget`), 3 strings, 1 getter.

## Findings

| ID | Finding | Evidence |
|---|---|---|
| Glob1 | 87 names are installed on `window` and read only by modules: each reader could import the exporting module. Biggest groups by owner: `annotation/Model.js` 11, `chrono/ChronoRender.js` 9, `chrono/ChronoControlInteraction.js` 7, `form/Form.js` 6, `SelectionControl.js` 5, `annotation/Labels.js` 3, `commands/EditActions.js` 3, `overlay/Drawing.js` 3, `labelBee.js` 3, `commands/LoadFromServer.js` 3; 28 more owners (38 in all) with 1 or 2 | [ran] table, `Why` = "read by modules, importable" |
| Glob2 | 19 names have no reader at all: `change_id_force`, `cleanLabels`, `computeMotionDirection`, `hasParts`, `onKeyDown_NewIDEdit`, `onMouseDown`, `onObjectDeselected`, `onObjectSelected`, `onTagsParametersSelectChanged`, `plotExcludeRects`, `plotROI`, `printTracks`, `renderObsTable`, `toLabelArray`, `toLabelString`, `updatePreviewTimeMark`, `updateSelectID`, `validAllTagIdsDomain`, `videoToolbar` | [ran] table, `Why` = "no reader" |
| Glob3 | The 10 singleton objects are all handler-named, so necessary: `overlay` (33 handler calls), `zoomOverlay` (27), `videoControl` (15), `videoManager` (13), `chrono`, `fromServerDialog`, `labelListDialog`, `labelListFromServerDialog`, `pickEventsCSVDialog`, `videoCacheStatus`. Eight globals are implicit: written without declaration by `init()` of `labelBee.js` or by an `init*` function (`videoControl`, `overlay`, `videoManager`, `statusWidget`, `zoomOverlay`, `fromServerDialog`, `labelListFromServerDialog`, `pickEventsCSVDialog`) | [read] `refactor/tools/globals_table.js` implicit-write scan |
| Glob4 | Commands read page singletons that are not exported: `videoManager` (`commands/SaveToServer.js`, `commands/LoadFromServer.js`), `statusWidget` and `fromServerDialog` (`commands/LoadFromServer.js`, DEBT of step 14h) | [read] |
| Glob5 | 4 handler functions are also called by modules without import: `deleteSelected`, `newRectForCurrentTag`, `onTrackWindowChanged`, `toggleHidden` (they stay global for the template, the modules could still import) | [ran] table |
| Glob6 | The inline script of `labelbee_page.html` leaks `p`, `i`, `temp` (`var` at the top level of a classic script): 3 of the 7 page-script names | [read] `labelbee_page.html:67-70` |
| Glob7 | The 33 test-only names are mostly the codec functions (12: `sanitizeEvents`, `db_to_json`, `*_csv_to_json`...), the chronogram internals the tests probe (`updateChronoData`, `augmentTrackWithTag`, `cleanObsoleteEvents`, `updateTagIntervals`...), `loadTags`, `eventsFromServer`, `mainAlert`, `Observation`, `obsDoesExist`, `refreshInstrumented`, `refreshLog`, `undoStack`, `installDebugGlobals` | [ran] table, `Why` = "tests, console" |
| Glob8 | `AnnotationStore` and `events` are handler-free; modules read them without import (6 and 10 files), so they are spurious today although 14 and 33 test files use them: the largest single reduction (16 module readers) | [ran] table |

## Not in the count

The test harness `refactor/tests/browser/dirty_writes.js` also defines `AnnotationStore` on every frame; the probe re-adds it to the list. `window.onbeforeunload`, `onhashchange`, `onload` are event slots of the browser, not globals of ours.

## Limits

- A name used only through a dynamic key (`window[name]`) is invisible to the scan; none seen in the sources (`grep 'window\['` finds only the install loops).
- The browser tests read names as strings in `ui.js(...)`: a word match is counted, not a call analysis, so "tests, console" may include a name a test only mentions in a comment.
- A name that a user types in the console is invisible; the maintainer's rule (2026-11-23) is that console helpers are installed by an explicit `debug_xxx()` (see [Q45](../QUESTIONS.md#q45)).
- Questions: [Q45](../QUESTIONS.md#q45). Reduction plan: [ADR 0017](../design/0017-globals-reduction.md).
