# ADR 0016: Layers of the annotation code (`annotation/`, `codecs/`, `io/`, `commands/`)

Status: proposed (slice 8 step 13e, 2026-11-24; maintainer review pending). Follows [ADR 0015](0015-slice-modularization.md);
analysis in [analysis/08](../analysis/08-annotation-layers.md), questions [Q43, Q44](../QUESTIONS.md#q43).

## Context

`labelbee/static/labelbee/js/annotation/` holds 21 files. Nine are pure data and already clean (store, codec, rules). The layers mix in
`Load.js`, `ServerIO.js` and `EditActions.js` (10 mix points, analysis/08 Ann1-Ann10): a data operation (decode, replace the store, POST)
ends with a `confirm`, an `alert`, a dialog message, a refresh, or reads a dialog or the video manager. Formats are spread over
`AnnotationCodec.js`, `CsvSchemas.js`, `Export.js` and the converter table inside `Load.js`. The lineage of the next save
(`fromServerDialog.basedOn`) is state kept on a dialog object. The request metadata of a save (`video_id`, `created_by_id`, `data_type`,
`created_from_id`) is provenance of the annotation, built inline in `ServerIO.js`.

## Decision

Group by what changes together, and keep the dependencies one-directional:

```
dialogs/, form/  ->  commands/  ->  io/         fetch, upload, file read and download
                                ->  codecs/     formats: decode, encode, audit, taxonomy
                                ->  annotation/ the stable store and SourceRef, Refresh.js
```

Rules (checked with the modularity scan at each step):
1. `io/` and `codecs/` import nothing from `commands/`, `dialogs/`, `form/`. No folder-level cycle.
2. Only `commands/` imports the write API of the store (`replaceTracks`, `replaceTags`, edits). Every mutation of the annotations goes through
   a command: the single place for confirmation, feedback and, later, an undo stack (intent plus snapshot or inverse).
3. Reads and listings (file lists of a dialog, previews, per-video filters) call `io/` directly; they mutate nothing. A source specific REST call
   is a plain function of `io/` named after its source (`ServerDb...`), not a generic transport feature.
4. A command takes a request, does the local work and returns `{ok, message, issues}`; it gives the feedback through `core/Alerts.js` (13f
   replaces that by one feedback interface). A dialog gathers its selectors, calls one command and shows the result. No registry or port: the
   dialogs sit on top of the commands and call them directly.
5. The format taxonomy (kinds, extensions, CSV schemas: `CsvSchemas.js`) is read by `io/` to negotiate file selection and by `codecs/`; `io/`
   never imports a codec implementation.
6. A codec sanitizes toward the internal structure and returns `issues`; it does not alert (today `AnnotationCodec.js:144` does, through Notifier).

`SourceRef` (new, `annotation/SourceRef.js`, small): the reference to where the loaded annotations come from: server database (id, name), server
file, local file, url, or none. The store holds the current one (`getSource`/`setSource`); every load sets it, erase resets it;
`created_from_id` of a save is derived from it. It replaces `fromServerDialog.basedOn`. `events.info` (`type`, `source`, `history` strings) stays the
file-level description. This is the only behavior-adjacent step: separate commit, maintainer approval, and the stale-`basedOn` case (load server
file, then a local file, then save: does the save still carry the server id? read, not run) checked in the browser first.

## File by file

Moves keep the content and fix the import paths; "split" is the only change of content.

| Current | Becomes | Change / issue |
|---|---|---|
| `Events`, `AnnotationStore`, `Model`, `Labels`, `WrongId`, `SelectionModel`, `Refresh`, `*Bridge`, `DebugGlobals` | same place | none; bridges and debug views go with step 14. `Model.js` reads global `videoControl.getCurrentFrame()` (Ann10), left as DEBT; `SelectionModel` is view state, may leave `annotation/` later |
| `AnnotationCodec.js`, `Export.js`, `CsvSchemas.js` | `codecs/` | move, not split now; the alert at `:144` becomes `issues` in its own commit |
| decode half of `Load.js` (`loadCSVFromRows` converter table and `centerPolicy`, info headers, `loadTracksCSVFromDB`) | new `codecs/Decode.js` | split; `db` is a page global (DEBT), becomes a parameter |
| apply half of `Load.js` (`loadTracks`, `loadTags`, `loadTracksFromText`, `eraseEvents`, `eraseTags`) | `commands/Load.js` | same names; notes update, `adjustChronogramHeight`, refresh and `confirm` stay in the command |
| requests of `ServerIO.js` (`ajaxGetJSON`, `getJSONPromise`, CSV fetch, the POST) | `io/ServerIO.js` | trimmed to requests; returns the payload and the record metadata |
| flows of `ServerIO.js` (`loadEventsFromServerByID`, `eventsFromServer`, `loadCSVFromServer`, `clickLoadTracks*`, `eventsToServer`) | `commands/LoadFromServer.js`, `commands/SaveToServer.js` | split; `fromServerDialog`, `videoManager`, `alert` and the dead `modal("hide")` (Ann15) leave: the caller or an argument gives the video id, the result gives the message; `clickLoadTracks*` hardcode datasets (DEBT); `tagsFromServer` is mostly commented code, verify before moving |
| `FileImport.js` | `commands/LoadFromFile.js` | the wiring of `#load`/`#loadtags`; the `FileReader` part goes to `io/` if it separates cleanly |
| `FileExport.js` | `io/FileDownload.js` (+ small `commands/SaveToFile.js` if it mixes) | content not read in depth: check at the step |
| `EditActions.js` | `commands/` | move; `printMessage` (global, DEBT) becomes the returned conflict in its own commit |
| `EventTree.js` | `form/` | move, pure DOM, no imports |
| `dialogs/*` | same place | call the commands and show `{ok, message}`; they stop being poked by `ServerIO` |

## Steps (each one reviewed commit; PLAN 13e2)

1. `EventTree.js` to `form/`.
2. `codecs/`: move `AnnotationCodec`, `Export`, `CsvSchemas` (import paths of their importers, bridges, golden harness `io-env.js`).
3. `io/`: move the file download; create `io/ServerIO.js` from the requests of `ServerIO.js`.
4. Split `Load.js`: `codecs/Decode.js` and `commands/Load.js`.
5. Split the flows of `ServerIO.js` into `commands/LoadFromServer.js` and `SaveToServer.js`, lifting the GUI calls; the three dialogs show the result.
6. `LoadFromFile` and `SaveToFile`.
7. `EditActions.js` to `commands/`.
8. `SourceRef` and the store field (behavior-adjacent, approval).
Tests per step: the golden harness (`refactor/tests/golden/harness/io-env.js` evaluates `Load.js`, `FileImport.js`, `ServerIO.js`, `form/EventsNotes.js` by the
regex of top level `function name(`: keep that form in the moved code and update `IO_SOURCES`), the browser tests of erase, loads, picker and
dialogs (`test_b`, `test_c`, `test_d`, `test_k`, `test_v`). Step 8 adds a browser test of the stale-source case.

## Alternatives considered

- **Horizontal layers only**: simple rules, but a feature spreads over four folders and a dialog specific REST call has to go in a "generic"
  transport. Kept as the base; rule 3 handles the specific calls.
- **Vertical slices per source** (`sources/server-db/` with its dialog, client and command): high cohesion, but the shared selectors and feedback get
  duplicated or cross-imported, and the dialog and command folders would import each other. Not retained; the dialogs already have one file each.
- **Source registry or port** (`list`, `fetch`, `save`): not needed with four known sources and dialogs calling commands directly; can be added when a
  source plugin appears.
- **Event/mediator**: harder to trace, more machinery than this code needs.

## Consequences and limits

- The undo stack is not built here. It needs the survey of every writer of `events` (overlay, chronogram, ID edit, `Model.js` mutators); until
  then rule 2 only covers loads, erase, saves and `EditActions`.
- 13f (one feedback GUI) builds on rule 4: commands return the result, one interface renders it.
- The plugin idea (more import/export formats) lands in `codecs/` plus the taxonomy of `CsvSchemas.js`; no registry until a second consumer exists.
