# 09 Globals of the page (slice 8 step 16a, counts refreshed after 16c)

Question it answers: which names does the running page still hold on `window`, who needs each one, and which could be imported instead.
Per-name table (one row and one ID each, `G001`...): [09-globals-table.md](09-globals-table.md), generated, do not edit.

## Method

| Part | Evidence | How |
|---|---|---|
| The names | [ran] | `refactor/tools/globals_probe_test.py` (copied into `refactor/tests/browser/` to run): opens the labelbee page with a video and events loaded, lists the own properties of `window` minus those of a blank iframe. Result: 175 now (233 at 16a, before 16b-16c) |
| Owner module | [read] | `labelbeeBridge.js` `install(Module, [...])`, `installGlobals({...})`, `window.X =`, the loops of `annotation/AnnotationCodecBridge.js`, `annotation/AnnotationStoreBridge.js`, the scan facts |
| Handlers | [read] | `refactor/tools/modularity_scan.js` facts: the `on*=` calls of the templates and of generated HTML, by first identifier (`overlay.foo()` counts for `overlay`), plus every identifier inside an `on*="..."` attribute of the templates (`videoControl.rewind(videoToolbar.stepMinute)`, a malformed `onkeypress="f(event)""`) |
| Page script | [read] | names inside the inline `<script>` blocks of `labelbee_page.html`, `layout.html`, `common/macros.html`, comments excluded |
| Module readers | [read] | files that use the name without importing or declaring it (scan facts) |
| Tests | [read] | name found in `refactor/tests/` (browser and golden) |
| Generator | [ran] | `node refactor/tools/globals_table.js <facts.json> <windump.json>` (IDs frozen in `refactor/tools/globals_ids.json`) |

## Criterion (maintainer, 2026-11-25): "can it be imported?"

| Verdict | Meaning | Now | At 16a |
|---|---|---|---|
| N library | third-party or jQuery globals | 15 | 15 |
| N handler | named by an inline handler of the page or of generated HTML: a template cannot import | 76 | 72 |
| N page script | read by an inline script of the page | 7 | 7 |
| N tests, console | read by no module and no handler, only by tests: the console and the browser tests cannot import | 68 | 33 |
| S importable | read by modules that could import it from its owner | 9 | 87 |
| S no reader | nothing reads it | 0 | 19 |
| Total | | 175 | 233 |

Necessary (N) 166, spurious (S) 9. The 68 test-or-console names include the 33 of 16a plus the names that modules now import and that tests still read through `window` (step 16d, [Q45](../QUESTIONS.md#q45)). Two of the 16a "no reader" names were not: `onKeyDown_NewIDEdit` (`labelbee_page.html:752`, a malformed attribute) and `videoToolbar` (`labelbee_page.html:251-267`, an argument of a handler) are necessary; the generator now reads handler arguments.

## Findings

| ID | Finding | Evidence |
|---|---|---|
| Glob1 | 9 names are still read by modules without import. Four are readers that must not import the owner: the data layer or a command would import the chronogram or the form view (`getWindow` read by `annotation/Model.js`; `refreshChronogram` and `updateForm` read by `annotation/RefreshBridge.js`; `adjustChronogramHeight` read by `commands/Load.js`). Importing them pulls `window`-bound modules into Node, which the golden tests load (`window is not defined` in `core/RefreshInstrumentBridge.js`). They need the Refresh design (ADR 0009, step 15), not an import | [ran] table, golden run |
| Glob2 | `tagMode` (`chrono/ChronoData.js:15`, `window.tagMode = 'Tracks'`) is a mutable global that the browser tests write (`refactor/tests/browser/test_a_features.py:58`): it cannot be an import until a test hook exists | [read] |
| Glob3 | `printMessage`, `lasthash` and `statusWidget` have no exporting owner: defined or written in `labelBee.js` (the entry), read by 9, 1 and 3 modules. Importing from the entry creates a cycle; they need a home module first | [read] table |
| Glob4 | `getLabels` is defined in `labelbeeBridge.js` and read by `form/Form.js`: it needs a home module | [read] table |
| Glob5 | The 10 singleton objects are handler-named, so necessary: `overlay`, `zoomOverlay`, `videoControl`, `videoManager`, `chrono`, `fromServerDialog`, `labelListDialog`, `labelListFromServerDialog`, `pickEventsCSVDialog`, `videoCacheStatus`. Eight globals are implicit (written without declaration by `init()` of `labelBee.js` or an `init*` function). Commands read `videoManager`, `statusWidget`, `fromServerDialog` (DEBT of step 14h) | [read] table |
| Glob6 | The inline script of `labelbee_page.html` leaks `p`, `i`, `temp` (`var` at the top level of a classic script): 3 of the 7 page-script names | [read] `labelbee_page.html:67-70` |
| Glob7 | Of the 68 test-or-console names, those modules import (16c) are `logging`, `chronoState`, `refresh`, `selection`, `events`, `AnnotationStore`, the chronogram and form functions, the overlay and video classes, the server loads, `CsvSchemas`, `EventTree`, `WrongId`: only tests read them through `window` now. The codec functions (12), the chronogram internals and `loadTags`, `eventsFromServer`, `mainAlert`, `Observation`, `obsDoesExist`, `refreshInstrumented`, `refreshLog`, `undoStack`, `installDebugGlobals` were test-only from the start | [ran] table |
| Glob8 | The new `events` export of `annotation/AnnotationStore.js` (constant `AnnotationStore.events`) replaces `window.events` for modules; `annotation/RefreshBridge.js` and `annotation/SelectionModelBridge.js` use it | [read] |

## Not in the count

The test harness `refactor/tests/browser/dirty_writes.js` also defines `AnnotationStore` on every frame; the probe re-adds it to the list. `window.onbeforeunload`, `onhashchange`, `onload` are event slots of the browser, not globals of ours.

## Limits

- A name used only through a dynamic key (`window[name]`) is invisible to the scan; none seen in the sources (`grep 'window\['` finds only the install loops).
- The browser tests read names as strings in `ui.js(...)`: a word match is counted, not a call analysis, so "tests, console" may include a name a test only mentions in a comment.
- A name that a user types in the console is invisible; the maintainer's rule (2026-11-23) is that console helpers are installed by an explicit `debug_xxx()` (see [Q45](../QUESTIONS.md#q45)).
- Questions: [Q45](../QUESTIONS.md#q45). Reduction plan: [ADR 0017](../design/0017-globals-reduction.md).
