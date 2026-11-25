# ADR 0016: Layers of the annotation code (`annotation/`, `codecs/`, `io/`, `commands/`)

Status: accepted (proposed in slice 8 step 13e, 2026-11-24; revised and accepted by the maintainer the same day, implemented as PLAN step 14).
Follows [ADR 0015](0015-slice-modularization.md); analysis in [analysis/08](../analysis/08-annotation-layers.md), questions
[Q43, Q44](../QUESTIONS.md#q43), open points [OQ-706](../QUESTIONS.md#oq-706) (server tags), [OQ-707](../QUESTIONS.md#oq-707) (lineage), [OQ-709](../QUESTIONS.md#oq-709) (DB sources).

## Context

`labelbee/static/labelbee/js/annotation/` holds 21 files. Nine are pure data and already clean (store, codec, rules). The layers mix in
`Load.js`, `ServerIO.js` and `EditActions.js` (10 mix points, analysis/08 Ann1-Ann10): a data operation (decode, replace the store, POST)
ends with a `confirm`, an `alert`, a dialog message, a refresh, or reads a dialog or the video manager. Formats are spread over
`AnnotationCodec.js`, `CsvSchemas.js`, `Export.js` and the converter table inside `Load.js`.

Review of 2026-11-24 [read]:
- `dialogs/FromServerDialog.js:268-305` (`loadEvents`) is a second copy of `loadEventsFromServerByID` (`annotation/ServerIO.js:260-286`): same
  route, parse, `loadTracks`, lineage and message.
- The lineage of the next save (`created_from_id`) is `basedOn`, a property of the dialog object, written by the dialog itself
  (`FromServerDialog.js:257`, `:296`) and by `loadEventsFromServerByID` (the `#video_data=` route of `labelBee.js:265`), read by `eventsToServer`.
  `:257` would write a **tag** file id (never reached today: `tagsFromServer` returns `undefined`, DEBT-719). A local load or an erase leaves it
  unchanged, so a later save names a file it was not made from (DEBT-721).
- `typesetAjaxError` and `showAjaxError` (`ServerIO.js`) format errors for the user; `ZoomView.js`, the dialogs and `labelBee.js` use them.
- Dead or doubtful: `loadEventsFromFile0` (only caller commented, `labelBee.js:177`), the `modal("hide")` of an absent dialog (Ann15), the
  commented block of `tagsFromServer`; `loadTracksCSVFromDB` has no caller in the code (DEBT-729, [OQ-709](../QUESTIONS.md#oq-709)); `video/VideoControl.js:649`
  passes a URL as a database id to `tagsFromServer` (DEBT-719, [OQ-706](../QUESTIONS.md#oq-706)).
- The dialogs reach the loads through `window` globals (`labelbeeBridge.js:233-243`), invisible to the modularity scan.

## Decision

Group by what changes together, and keep the dependencies one-directional:

```
dialogs/, form/  ->  commands/  ->  io/         requests, file read and download
                                ->  codecs/     formats: decode, encode, audit, taxonomy
                                ->  annotation/ the store (with the events lineage), Refresh.js
```

Rules (checked with the modularity scan at each step):
1. `io/` and `codecs/` import nothing from `commands/`, `dialogs/`, `form/`, and nothing that shows a message. No folder-level cycle.
2. Only `commands/` calls `replaceTracks`/`replaceTags`. Every load, erase and save is a command: the single place for confirmation,
   feedback and, later, an undo stack. The other writers of `events` (overlay, chronogram, ID edit) are out of scope (see limits).
3. Reads and listings (file lists of a dialog, previews) may stay in the dialogs; moving the dialogs' own `$.ajax` lists to `io/` is not part of step 14.
4. Step 14 keeps the current contracts: `loadTracks`/`loadTags` return a boolean, the loads from a server or a file reject on failure, the
   messages stay what they are. The `{ok, message, issues}` result and one feedback interface are step 15.
5. A dialog or a page button calls a command by import (not through `window`) once the step that moves the command touches it.
6. The format taxonomy (`CsvSchemas.js`) is read by the file selection and by `codecs/`; `io/` imports no codec.
7. Error formatting for the user (`typesetAjaxError`, `showAjaxError`) lives with `mainAlert` and `reportLoadError` in `core/Alerts.js`.

Lineage (revised 2026-11-24 by the maintainer): the store keeps where the events were loaded from, `AnnotationStore.getBasedOn()`: `undefined`, or
`{source, id, retrievedOn}` with `source` one of `"server-db"` (`id`: the database id of the record), `"server-file"` (`id`: the URL or path of the
file) or `"local-file"` (`id`: the file name), and `retrievedOn` the ISO timestamp of the load. `loadTracks` takes `options.basedOn = {source, id}`,
stamps `retrievedOn` and passes it to `replaceTracks`; every replace of the events sets it, to `undefined` when not given (erase, init, CSV from the
database file of the page). `eventsToServer` sends `created_from_id` only when `source` is `"server-db"`: the server field is a database id.
This replaces `fromServerDialog.basedOn` in both writers (`FromServerDialog.loadEvents`, `loadEventsFromServerByID`); the tags have no lineage (the
write of the tag branch of the dialog was unreachable and goes). Whether a save also advances it to the new record stays
[OQ-707](../QUESTIONS.md#oq-707) (not done in 14g). The `SourceRef` module of the first draft is not built: this one record is its whole content.
Resetting on a load that is not from the database changes behavior (the stale case, DEBT-721): own commit, maintainer approval (given by this
definition), a browser test.

## File by file

Moves keep the content and fix the import paths; "split" is the only change of content.

| Current | Becomes | Change / issue |
|---|---|---|
| `Events`, `AnnotationStore`, `Model`, `Labels`, `WrongId`, `SelectionModel`, `Refresh`, `*Bridge`, `DebugGlobals` | same place | the store gets the events lineage; bridges and debug views go with step 16. `Model.js` reads global `videoControl.getCurrentFrame()` (Ann10), DEBT |
| `AnnotationCodec.js`, `Export.js`, `CsvSchemas.js` | `codecs/` | move, not split |
| decode half of `Load.js` (converter table, `centerPolicy`, info headers) | new `codecs/Decode.js` | split |
| apply half of `Load.js` (`loadTracks`, `loadTags`, `loadTracksFromText`, `loadTagsFromText`, `eraseEvents`, `eraseTags`, CSV apply) | `commands/Load.js` | same names; notes update, `adjustChronogramHeight`, refresh and `confirm` stay |
| requests of `ServerIO.js` (`ajaxGetJSON`, `getJSONPromise`, CSV fetch, the POST) | `io/ServerIO.js` | requests only; returns the payload and the record metadata |
| `typesetAjaxError`, `showAjaxError` | `core/Alerts.js` | move (rule 7) |
| flows of `ServerIO.js` | `commands/LoadFromServer.js`, `commands/SaveToServer.js` | split; `fromServerDialog` leaves; `clickLoadTracks*` hardcode datasets (DEBT) |
| `FromServerDialog.loadEvents` (events branch) | calls `loadEventsFromServerByID` | the duplicate request goes |
| `loadEventsFromFile0`, Ann15 `modal("hide")`, commented block of `tagsFromServer` | cut | dead code, own commit |
| `FileImport.js` (`readFileAsText`) and `FileExport.js` (`saveBlobToFile`, `saveObjToJsonFile`, `saveCSVToFile`) | `io/LocalFile.js` | the browser file read and download |
| rest of `FileImport.js`, `FileExport.js` | `commands/LoadFromFile.js`, `commands/SaveToFile.js` | input wiring, file names, export choice |
| `EditActions.js` | `commands/` | move; `printMessage` (global) stays DEBT until step 15 |
| `EventTree.js` | `form/` | move, pure DOM, no imports |

## Steps (each one reviewed commit; PLAN step 14)

- 14a. Cut the dead code (`loadEventsFromFile0` and its golden case, Ann15, the commented block of `tagsFromServer`).
- 14b. `EventTree.js` to `form/`.
- 14c. `typesetAjaxError`, `showAjaxError` to `core/Alerts.js`.
- 14d. `io/`: `io/ServerIO.js` (requests) and `io/LocalFile.js` (read, download).
- 14e. `codecs/`: move `AnnotationCodec`, `Export`, `CsvSchemas` (importers, bridges, golden harness).
- 14f. Split `Load.js`: `codecs/Decode.js` and `commands/Load.js`.
- 14g. Events lineage `getBasedOn()` in the store (behavior fix, approval, browser test of the stale case).
- 14h. Server commands, one family per commit, the dialogs import what they call: (h1) save; (h2) load by id, `FromServerDialog` loses its
  duplicate; (h3) tags, moved unchanged, then the repair or removal of [OQ-706](../QUESTIONS.md#oq-706) in its own commit if you decide one; (h4) CSV and URL loads, `clickLoadTracks*`.
- 14i. `commands/LoadFromFile.js`, `commands/SaveToFile.js`.
- 14j. `EditActions.js` to `commands/`.

Tests per step: the golden harness (`refactor/tests/golden/harness/io-env.js` evaluates the files of `IO_SOURCES` by the regex of top level
`function name(`: keep that form in moved code and update `IO_SOURCES`), the browser tests of erase, loads, picker and dialogs (`test_b`,
`test_c`, `test_d`, `test_k`, `test_v`), and the modularity scan for rules 1, 2 and 5.

## Alternatives considered

- **Horizontal layers only**: simple rules, but a feature spreads over four folders. Kept as the base.
- **Vertical slices per source** (`sources/server-db/` with its dialog, client and command): the shared selectors and feedback get duplicated
  or cross-imported. Not retained; the dialogs already have one file each.
- **Source registry or port** (`list`, `fetch`, `save`), **event/mediator**: not needed with four known sources; more machinery than this code needs.
- **`SourceRef` module** (server db, server file, local file, url, none): one reader only; the record `{source, id, retrievedOn}` in the store gives
  the same guarantee without a module. Can grow into it if a second reader appears.

## Consequences and limits

- The undo stack is not built here. It needs the survey of every writer of `events` (overlay, chronogram, ID edit, `Model.js` mutators); until
  then rule 2 covers loads, erase, saves and `EditActions`.
- Step 15 (one feedback interface) builds on the commands: they return the result, one interface renders it.
- More import/export formats land in `codecs/` plus the taxonomy of `CsvSchemas.js`; no registry until a second consumer exists.
