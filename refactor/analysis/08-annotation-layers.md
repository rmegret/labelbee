# 08 - `annotation/`: data layer and GUI layer (slice 8 step 13e, static, 2026-11-23)

Method: reading and grep of `labelbee/static/labelbee/js/annotation/` (21 files, ~2.9k lines) at `1a2fb0a9`+13d. Nothing was run.
Scope: which file is data (store, codec, pure rules), which is I/O, which touches the GUI. Target architecture is not here: it is [ADR 0016](../design/0016-annotation-layers.md); questions in
[Q43](../QUESTIONS.md#q43).

## 1. Files by layer

Layer: **D** data (no DOM, no network, no user message), **R** orchestration (calls views, owns no data), **B** window bridge,
**IO** file/network adapter, **G** GUI (DOM, dialog, user message), **M** mixed (data/IO + GUI in the same function).

| File | Lines | Layer | Role |
|------|------:|:-----:|------|
| `Events.js` | 341 | D | the stored events (`window.events` target), Notifier only |
| `AnnotationStore.js` | 46 | D | replace/read the events and tags |
| `Model.js` | 195 | D | `Observation`, legacy accessors over `events` |
| `Labels.js` | 84 | D | label tokens |
| `WrongId.js` | 61 | D | `newid`/`fix` rules, pure |
| `SelectionModel.js` | 55 | D | current frame and id to follow |
| `AnnotationCodec.js` | 816 | D | JSON v1/v2, legacy conversions; alerts through Notifier |
| `Export.js` | 56 | D | state to export objects |
| `CsvSchemas.js` | 303 | D | CSV kinds from suffix and header |
| `Refresh.js` | 85 | R | explicit refresh calls, steps injected by the bridge |
| `AnnotationCodecBridge.js`, `AnnotationStoreBridge.js`, `RefreshBridge.js`, `SelectionModelBridge.js` | 8-26 | B | one `window` install each |
| `DebugGlobals.js` | 60 | B | console-only debug views of the stores |
| `FileImport.js` | 61 | IO | `#load`/`#loadtags` inputs, `FileReader`, errors by `core/Alerts.js` |
| `FileExport.js` | 99 | IO | download of a blob (`createElement("a")`) |
| `ServerIO.js` | 281 | M | requests, record metadata of a save, load/save flows, GUI calls (see 2) |
| `Load.js` | 161 | M | format dispatch (codec work) + store replace + view refresh + confirm (see 2) |
| `EditActions.js` | 69 | M | store writes + one user message |
| `EventTree.js` | 81 | G | pure DOM rendering of one event, no import |

Count: D 9, R 1, B 5, IO 2, M 3, G 1. The data layer is already most of the folder and it is clean: none of the D files reads the DOM or the
network [read: grep `\$\(|document\.|\.modal\(|alert\(|confirm\(` over D files, one hit in `AnnotationCodec.js:144`, which is Notifier's `alert`].

## 2. Where the layers mix [read]

| ID | Where | GUI part | Data part |
|----|-------|----------|-----------|
| Ann1 | `annotation/Load.js:70-88` `eraseEvents`, `eraseTags` | `confirm(...)` | `loadTracks([])`, `loadTags({})` |
| Ann2 | `annotation/Load.js:42` and `:64` `loadTracks`/`loadTags` | `updateEventsNotes()` (form widget), global `adjustChronogramHeight()` | `AnnotationStore.replaceTracks/Tags` |
| Ann3 | `annotation/Load.js:26-27` | `refresh.chrono()`, `refresh.frame()` (views) | same as Ann2 |
| Ann4 | `annotation/ServerIO.js:77` `showAjaxError` | `mainAlert` | error text from the response |
| Ann5 | `annotation/ServerIO.js:114-115`, `:225`, `:257` | `fromServerDialog.setMessage`, `.basedOn` (dialog state used as lineage of the next save) | `loadEventsFromServerByID`, `tagsFromServer`, `eventsToServer` |
| Ann6 | `annotation/ServerIO.js:138` `eventsFromServer` | `$("#loadTracksFromServerDialog").modal("hide")`: that modal is not in the page | fetch + `loadTracks` |
| Ann7 | `annotation/ServerIO.js:180` `clickLoadTracks*` | `videoManager.loadVideoManual(url)` (video widget) | URL building (hardcoded `gurabo4`, DEBT) |
| Ann8 | `annotation/ServerIO.js:253`, `:277` `eventsToServer` | `videoManager.currentVideoID` read, `alert(alertMSG)` | POST of `exportTracks("v2")` |
| Ann9 | `annotation/EditActions.js:39` `submitDraft` | `printMessage` (page global, DEBT in the header) | `events` writes |
| Ann10 | `annotation/Model.js:109-127,177` | none; reads `getVideoInfo()` and global `videoControl.getCurrentFrame()` (video owner, not annotation) | accessors |

Reading: every mix is the same shape, a data operation that ends by telling the user (alert, confirm, message) or by refreshing a view.
`Load.js` and `ServerIO.js` hold 8 of the 10 [read], each function being a small "operation" (erase, load, save) whose GUI feedback is
inline. This is exactly the user-feedback interface the 13f step aims at ([QUESTIONS Q44](../QUESTIONS.md#q44)).

## 3. Cross-layer imports [read]

| Edge | Direction | Comment |
|------|-----------|---------|
| `Load.js` -> `form/EventsNotes.js` | data -> GUI | the notes are a view of `events.info`: the view could subscribe |
| `ServerIO.js` -> `session/Login.js` | IO -> session | only `getUserId()`, legitimate (author of a save) |
| `ServerIO.js` -> `core/Alerts.js` | IO -> GUI | `mainAlert`, `reportLoadError` |
| `FileImport.js` -> `core/Alerts.js` | IO -> GUI | same |
| `dialogs/*` -> `annotation/ServerIO.js`, `Load.js` | GUI -> data/IO | right direction |
| `Model.js`, `Export.js` -> `video/VideoInfo.js` | data -> video | `getVideoInfo()` is the video's metadata (nframes, name) used by exports and ranges |

No import cycle was found inside the folder [read: the import lists of the 21 files].

## 4. What the page and the tests read of this layer

- The globals of this folder are the bridge installs (`install(Load, ...)`, `install(ServerIO, ...)`, the four `*Bridge.js`): see the globals list
  of step 14 for the inventory.
- Golden tests evaluate `Load.js`, `FileImport.js`, `ServerIO.js`, `core/Alerts.js`, `form/EventsNotes.js` in a `vm` with stubs
  (`refactor/tests/golden/harness/io-env.js`), so a function moved out of these files must keep a plain `function name(` declaration.
- Browser tests exercise erase, loads from file, from server and from the pickers (`test_b`, `test_c`, `test_d`, `test_v`).

## 5. Findings

| ID | Finding | Evidence |
|----|---------|----------|
| Ann11 | The data layer (9 files) is already independent of the GUI; the split to do is inside `Load.js`, `ServerIO.js`, `EditActions.js` (3 files, 10 mix points) | [read] |
| Ann12 | `EventTree.js` is GUI living in the data folder: its natural home is `form/` (it renders the selected event in a tab) | [read] |
| Ann13 | `FileImport.js`/`FileExport.js` are browser I/O adapters; neither touches the stores except through `Load.js`/`Export.js` | [read] |
| Ann14 | `*Bridge.js` and `DebugGlobals.js` are not annotation logic: they exist for the globals of step 14 and disappear with them | [read] |
| Ann15 | `eventsFromServer` hides a modal absent from the page (`#loadTracksFromServerDialog`, same dead target as the cut `tracksListFromServer`) | [read] `annotation/ServerIO.js:138` |
| Ann16 | `fromServerDialog.basedOn` is state of the data (the lineage of the next save) stored on a GUI object | [read] `annotation/ServerIO.js:114,257` |

Open: Ann15 and Ann16 are candidates for a fix; they are behavior-adjacent and go through [Q43](../QUESTIONS.md#q43) before any step.
