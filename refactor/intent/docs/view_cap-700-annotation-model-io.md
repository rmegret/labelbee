<!-- GENERATED from ../behaviors/cap-700-annotation-model-io.md by refactor/intent/tools/spec_view.py. Do not edit. -->
# Behaviors: Annotation model and IO ([CAP-700](view_capabilities.md#cap-700-annotation-model-and-io "Annotation model and IO"))

Conventions: [../README.md](../README.md). IDs of this file: [BEH-701](#beh-701-observation-record-and-its-defaults "Observation record and its defaults")..., [DEBT-701](view_debt.md#debt-701-observation-carries-bool_acts-next-to-labels "Observation carries bool_acts next to labels")..., [OQ-701](../../QUESTIONS.md#oq-701 "Which observation fields must survive an edit")..., [SEAM-701](view_seams.md#seam-701-annotationstore-interface-model-vs-views "AnnotationStore interface (model vs views)")....
All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.
Items revised after the critic review cite the code excerpts read for that review; claims whose code was not
re-read there are marked `(inferred ...)` in the text and stay unverified.
Server-side endpoints are specified by group 1 ([CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")), selection and undo by group 6 ([CAP-600](view_capabilities.md#cap-600-labels-dashboards-and-specialized-annotations "Labels, dashboards and specialized annotations")): this
file only describes what the client sends and expects. Per [DEC-004](view_decisions.md#dec-004-the-code-is-the-reference-for-behavior "The code is the reference for behavior") the code is the reference; defects are
recorded as DEBT, not specified as intended behavior.

## Contents

| ID | Name |
|---|---|
| BEH-701 | [Observation record and its defaults](#beh-701-observation-record-and-its-defaults) |
| BEH-702 | [Tracks container: frame then bee ID](#beh-702-tracks-container-frame-then-bee-id) |
| BEH-703 | [Valid IDs of a frame or interval](#beh-703-valid-ids-of-a-frame-or-interval) |
| BEH-704 | [storeObs copies a fixed field list into the stored observation](#beh-704-storeobs-copies-a-fixed-field-list-into-the-stored-observation) |
| BEH-705 | [changeObservationID(frame, old_id, new_id, force)](#beh-705-changeobservationidframe-old_id-new_id-force) |
| BEH-706 | [Frames with an ID, with two IDs, and interval ID swap](#beh-706-frames-with-an-id-with-two-ids-and-interval-id-swap) |
| BEH-707 | [Tags container and the (frame,id) tag cache](#beh-707-tags-container-and-the-frameid-tag-cache) |
| BEH-708 | [Runtime-only fields of an observation, and what leaks into saves](#beh-708-runtime-only-fields-of-an-observation-and-what-leaks-into-saves) |
| BEH-709 | [Initial state of the model at page load](#beh-709-initial-state-of-the-model-at-page-load) |
| BEH-710 | [Events JSON v2 format (data contract, save side)](#beh-710-events-json-v2-format-data-contract-save-side) |
| BEH-711 | [Saving v2 mutates TracksInfo and fails after a CSV import](#beh-711-saving-v2-mutates-tracksinfo-and-fails-after-a-csv-import) |
| BEH-712 | [Events JSON v1 format and the save-mutates-Tracks defect (C1)](#beh-712-events-json-v1-format-and-the-save-mutates-tracks-defect-c1) |
| BEH-713 | [Save Events to a local file](#beh-713-save-events-to-a-local-file) |
| BEH-714 | [Load Events from a local file](#beh-714-load-events-from-a-local-file) |
| BEH-715 | [Erase Events and Erase Tags buttons](#beh-715-erase-events-and-erase-tags-buttons) |
| BEH-716 | [Notes for the current events](#beh-716-notes-for-the-current-events) |
| BEH-717 | [Events JSON v2 format (load side) via sanitizeEvents](#beh-717-events-json-v2-format-load-side-via-sanitizeevents) |
| BEH-718 | [Events JSON v1 format (load side) via sanitizeEvents](#beh-718-events-json-v1-format-load-side-via-sanitizeevents) |
| BEH-719 | [Load-time duplicate handling and error containment](#beh-719-load-time-duplicate-handling-and-error-containment) |
| BEH-720 | [setTracks: replace the model and refresh](#beh-720-settracks-replace-the-model-and-refresh) |
| BEH-721 | [Tags JSON v1 and v2 formats](#beh-721-tags-json-v1-and-v2-formats) |
| BEH-722 | [Load Tags from a local file](#beh-722-load-tags-from-a-local-file) |
| BEH-723 | [Save Tags to a local file](#beh-723-save-tags-to-a-local-file) |
| BEH-724 | [setTags: replace tags and refresh](#beh-724-settags-replace-tags-and-refresh) |
| BEH-725 | [Server annotation list dialog "recent" mode](#beh-725-server-annotation-list-dialog-recent-mode) |
| BEH-726 | [Server annotation list dialog "advanced" mode](#beh-726-server-annotation-list-dialog-advanced-mode) |
| BEH-727 | [Loading an event (Tracks) file from the server](#beh-727-loading-an-event-tracks-file-from-the-server) |
| BEH-728 | [Loading a tag file from the server](#beh-728-loading-a-tag-file-from-the-server) |
| BEH-729 | [Save Events to the server (snapshot)](#beh-729-save-events-to-the-server-snapshot) |
| BEH-730 | [Lineage: created_from_id comes from the last server load](#beh-730-lineage-created_from_id-comes-from-the-last-server-load) |
| BEH-731 | [Loading events from a URL fragment (#video_data=<id>)](#beh-731-loading-events-from-a-url-fragment-video_dataid) |
| BEH-732 | [Deprecated server list loaders](#beh-732-deprecated-server-list-loaders) |
| BEH-733 | [Login state gates the server buttons](#beh-733-login-state-gates-the-server-buttons) |
| BEH-734 | [Label list preset loader](#beh-734-label-list-preset-loader) |
| BEH-735 | [Import of a tracks CSV (tracks_csv_to_json)](#beh-735-import-of-a-tracks-csv-tracks_csv_to_json) |
| BEH-736 | [Import of a tracks_tagged CSV](#beh-736-import-of-a-tracks_tagged-csv) |
| BEH-737 | [Import of a tags CSV (Tracks and Tags together)](#beh-737-import-of-a-tags-csv-tracks-and-tags-together) |
| BEH-738 | [Export Events (CSV)](#beh-738-export-events-csv) |
| BEH-739 | [Export Events (BBox)](#beh-739-export-events-bbox) |
| BEH-740 | [Experimental DB source: load tracks from SQLite](#beh-740-experimental-db-source-load-tracks-from-sqlite) |
| BEH-741 | [SQLiteDB.js: SQL console and database sources](#beh-741-sqlitedbjs-sql-console-and-database-sources) |
| BEH-742 | [DuckDB.js: DuckDB-WASM console (not connected to Tracks)](#beh-742-duckdbjs-duckdb-wasm-console-not-connected-to-tracks) |
| BEH-743 | [Filename timestamps and Blob downloads](#beh-743-filename-timestamps-and-blob-downloads) |
| BEH-744 | [Ajax error reporting helpers](#beh-744-ajax-error-reporting-helpers) |
| BEH-745 | [Frame keys and ID types across the formats](#beh-745-frame-keys-and-id-types-across-the-formats) |
| BEH-746 | [A v2 file without `data` loads as an empty model](#beh-746-a-v2-file-without-data-loads-as-an-empty-model) |
| BEH-747 | [Label preset request failure leaves the dialog on its loading message](#beh-747-label-preset-request-failure-leaves-the-dialog-on-its-loading-message) |
| BEH-748 | [Server file picker used by the tracks CSV import](#beh-748-server-file-picker-used-by-the-tracks-csv-import) |

## BEH-701: Observation record and its defaults

`new Observation(ID)` creates a record with: `ID` (as given), `time` 0, `frame` 0, `x` 0, `y` 0, `cx` 0,
`cy` 0, `width` 0, `height` 0, `angle` 0, `bool_acts` `[false,false,false,false]` (order: fanning,
pollen, entering, leaving), `notes` `""`, `labels` `""`. No other field exists by default: `parts`,
`newid`, `fix`, `visit`, `span`, `tag` appear only when set by other code or loaded from a file. Observations
loaded from a file are plain objects, not `Observation` instances. Constructor callers: `getObsHandle(frame,id,true)`
(`Model.js`), the only path that stores a new `Observation` into `Tracks` (a freshly stored observation has the
defaults above before `copyObs` overwrites them in `storeObs`); `addRect(id,...,"new")` in `OverlayControl.js`, which
builds a transient observation for the overlay (whether it reaches `storeObs` is not shown by the code read); and
`SelectionControl.js`, which creates the global `undo = new Observation(0)` at load.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Observation`, `getObsHandle`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `addRect`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `undo`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-701](view_debt.md#debt-701-observation-carries-bool_acts-next-to-labels "Observation carries bool_acts next to labels")

## BEH-702: Tracks container: frame then bee ID

The global `Tracks` is indexed by frame (key = frame number, string or integer; iterated with `for..in`,
so keys are strings) then by bee ID (string). It starts as `[]` (`Model.js`) and is replaced as a whole by
`setTracks` ([BEH-720](#beh-720-settracks-replace-the-model-and-refresh "setTracks: replace the model and refresh")); an array and a plain object are both accepted as container. Absent frame or
absent ID reads as "no observation": `obsDoesExist(frame,id)` is false when `Tracks[frame]` is null/undefined or
`Tracks[frame][id]` is null/undefined. `getObsHandle(frame,id,createIfEmpty=false)` returns the live
object (not a copy) or `undefined`; with `createIfEmpty` it creates the missing frame object `{}` and a
`new Observation(id)`. Deleting an observation (`delete Tracks[f][id]`, done by other modules) leaves an
empty `{}` frame object; it is kept (and saved, [BEH-709](#beh-709-initial-state-of-the-model-at-page-load "Initial state of the model at page load"), [BEH-712](#beh-712-events-json-v1-format-and-the-save-mutates-tracks-defect-c1 "Events JSON v1 format and the save-mutates-Tracks defect (C1)")).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Tracks`, `obsDoesExist`, `getObsHandle`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss")

## BEH-703: Valid IDs of a frame or interval

`getValidIDsForFrame(frame)` returns the array of keys of `Tracks[frame]` whose value is not null
(`[]` if the frame is absent); key order is JS `for..in` order (integer-like keys ascending, other keys such as
`T12` in insertion order). `getValidIDsForFrames([fmin,fmax])` returns the union over `fmin..fmax`
inclusive, as an array of unique IDs in first-seen order (no `-1` special value here).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `getValidIDsForFrame`, `getValidIDsForFrames`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-704: storeObs copies a fixed field list into the stored observation

`storeObs(tmpObs)` gets or creates `Tracks[tmpObs.frame][tmpObs.ID]` and calls `copyObs(stored,tmpObs)`. `copyObs`
copies exactly: `ID, time, frame, x, y, cx, cy, width, height, angle, notes, labels, parts, newid`,
`bool_acts` (element by element into a fresh array; `[false,false,false,false]` if the source has none),
`fix` (through `deepcopy`: `JSON.parse(JSON.stringify(x))`, a falsy value such as `undefined` is returned as is), and `visit` only if truthy. Not copied:
`span`, `tag`, any unknown field (for instance the visit-creation code in `OverlayControl.js` builds a `tmpObs` with
`visit` and `span` and calls `storeObs`: the `span` is dropped). Consequences: copying over an existing observation never removes a
`visit` (the old value stays when the source has none), always overwrites `parts`/`newid`/`fix` (possibly
with `undefined`), and `parts` is shared by reference (shallow). `cloneObs(obs)` = `copyObs` into `{}`,
so a clone has the same field list. Callers include `deleteEvent` (`SelectionControl.js`, the snapshot pushed on the
undo stack, so `span` and `tag` are not in that snapshot) and the overlay (`addRectFromObs` and `addRect` in
`OverlayControl.js`, which clone the stored observation for the drawn rectangle).

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `storeObs`, `copyObs`, `cloneObs`, `deepcopy`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `deleteEvent`
  - [labelbee/static/labelbee/js/OverlayControl.js](../../../labelbee/static/labelbee/js/OverlayControl.js): `addRectFromObs`, `addRect`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-702](view_debt.md#debt-702-copyobs-copies-a-hand-maintained-field-list "copyObs copies a hand-maintained field list"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-701](../../QUESTIONS.md#oq-701 "Which observation fields must survive an edit")

## BEH-705: changeObservationID(frame, old_id, new_id, force)

Renames the observation `Tracks[frame][old_id]` to `new_id` and sets its `.ID`; returns `true` if a change was
performed, else `false` (never throws). Returns `false` without change when: `old_id == new_id`; the frame
has no entry (`Tracks[frame]` null); `new_id` already exists and `force` is falsy; `old_id` does not exist.
`force` values: falsy = abort on collision; `true` = overwrite the existing `new_id` observation (it is
lost); `'swap'` = the observation previously at `new_id` is moved to `old_id` (its `.ID` updated), i.e. a swap.
When `force` is truthy but `new_id` does not exist it simply renames. The observation `frame` field is not
touched. Logs to the console on each abort.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `changeObservationID`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)")

## BEH-706: Frames with an ID, with two IDs, and interval ID swap

`getFramesWithID([fmin,fmax],id)` returns the frames in the inclusive interval where `id` exists;
`getFramesWithSwapID([fmin,fmax],id,new_id)` the frames where both exist. `fmax == -1` means
`videoinfo.nframes-1`. `obs_swapID([fmin,fmax],old_id,new_id)` for each frame in the interval where `old_id`
exists: if `new_id` also exists it is parked under the temporary ID `SWAP_save_<new_id>`, `old_id` is renamed to
`new_id`, then the parked observation is renamed to `old_id`; net effect is a swap in frames where both exist
and a plain rename where only `old_id` exists. Frames where `old_id` does not exist are skipped (so an
observation of `new_id` alone is not moved). Uses `changeObservationID` with `force` undefined.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `getFramesWithID`, `getFramesWithSwapID`, `obs_swapID`
- **Links:** [BEH-705](#beh-705-changeobservationidframe-old_id-new_id-force "changeObservationID(frame, old_id, new_id, force)"), [CAP-602](view_capabilities.md#cap-602-pollination-visits "Pollination visits")

## BEH-707: Tags container and the (frame,id) tag cache

The global `Tags` is indexed by frame; each entry is `{tags:[tag,...]}` (a list per frame, several tags may
share an id). It starts as `[]` and is replaced by `setTags` ([BEH-724](#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh")). `cacheTags()` builds the global `tagCache`
(assigned without declaration) with keys `"<frame>,<id>"` (id as string) and `getTags(frame,id)` returns
`tagCache[key]` (list, or `undefined`). Intended: the list holds all tags of that frame and id. Actual: the
test `typeof ttags[key]` reads the wrong variable (`ttags`, keyed by bee id) so it is always
`"undefined"` and each tag overwrites the previous one: the list has exactly one element, the last tag
of that frame and id ([DEBT-703](view_debt.md#debt-703-cachetags-tests-the-wrong-variable "cacheTags tests the wrong variable")). `getTags` throws if `cacheTags` was never called (`tagCache`
undefined); the only caller (`computeMotionDirection`) calls `cacheTags` first.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Tags`, `cacheTags`, `getTags`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [DEBT-703](view_debt.md#debt-703-cachetags-tests-the-wrong-variable "cacheTags tests the wrong variable")

## BEH-708: Runtime-only fields of an observation, and what leaks into saves

Besides the edited fields, live observations carry fields added by other modules: `tag` (the tag object
of the same frame and id, assigned by reference (not copied) by `augmentTrackWithTag` in `ChronoControl.js` for each
`Tracks[F][id]` that has a tag with the same `String(id)`, or embedded by the `tracks_tagged` import, [BEH-736](#beh-736-import-of-a-tracks_tagged-csv "Import of a tracks_tagged CSV");
`augmentTrackWithTag` is called only at the start of `updateChronoData`, i.e. at every `refreshChronogram`; it never
removes a `tag`, so after the tags are replaced or erased the old `obs.tag` values stay), `span` (`{f1,f2}`, written by
`modifyCurrentObsSpan` in `SelectionControl.js` directly on the stored observation `Tracks[frame][id]`: initialised
from the matching flat track's span when `obs` has none, then moved by 10 frames per
`extendleft`/`extendright`/`restrictleft`/`restrictright`, with f1 kept >= 0 and f1 <= obs.frame <= f2), `fix` and `newid` (tag fix / wrong id), `visit`, `parts`. None of these is excluded by the v2 save
([BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")): `tag` is written as a nested copy of the whole tag record (with its `frame`, `c`, `p`, ...) whenever
it is present in memory (after tags were loaded and a chronogram refresh ran), and `span` is written. [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)") states that `tag`
is not saved: that is not true of the code.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `copyObs`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV2`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `augmentTrackWithTag`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `modifyCurrentObsSpan`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [DEBT-704](view_debt.md#debt-704-runtime-fields-tag-span-are-written-into-saved-files "Runtime fields (tag, span) are written into saved files"), [OQ-702](../../QUESTIONS.md#oq-702 "Should `tag` and `span` be in saved files")

## BEH-709: Initial state of the model at page load

`initAnnotationIO()` (called from `labelBee.js` init) registers `change` listeners on `#load` and `#loadtags`,
creates the global dialogs `labelListFromServerDialog`, `fromServerDialog`, `pickEventsCSVDialog`, resets
`ttags = []` and binds `input` on `#events-notes`. Later in init `setTracks([], true)` is called, which sets
`Tracks = []` and `TracksInfo = {type:"events-multiframe", source:"Converted from Tracks v1 object"}` (empty array
goes through the v1 branch, [BEH-718](#beh-718-events-json-v1-format-load-side-via-sanitizeevents "Events JSON v1 format (load side) via sanitizeEvents")) without refreshing views. `Tags` stays `[]` and `TagsInfo` is
undefined until the first `setTags`. A `beforeunload` handler (`window.onbeforeunload`, set in the `labelBee.js` init, right
after `whoami()` and just before `setTracks([], true)`) returns the message "If you leave this page, all unsaved
annotations will be lost. Are you sure?" on every page leave, whether or not there are unsaved changes (no dirty flag).
There is no autosave.

- **Group:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `initAnnotationIO`, `setTracks`
  - [labelbee/static/labelbee/js/Model.js](../../../labelbee/static/labelbee/js/Model.js): `Tracks`, `Tags`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `window.onbeforeunload handler and setTracks([], true) in init`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEBT-705](view_debt.md#debt-705-no-dirty-flag-beforeunload-always-prompts "No dirty flag; beforeunload always prompts"), [OQ-710](../../QUESTIONS.md#oq-710 "Silent replacement of unsaved work on load and erase")

## BEH-710: Events JSON v2 format (data contract, save side)

Produced by `convertTracksToV2()` for "Save Events (JSON v2)", for the server save and used by nothing else.
Shape:

```
{ "info": { ...TracksInfo..., "formatnote": "<fixed warning text>",
            "history": [ ...previous entries, "Saved using labelbee on <Date()>" ],
            "videoinfo": <current videoinfo object> },
  "data": { "<frame>": [ <event>, ... ], ... } }
```

`info` is the live `TracksInfo` object itself ([BEH-711](#beh-711-saving-v2-mutates-tracksinfo-and-fails-after-a-csv-import "Saving v2 mutates TracksInfo and fails after a CSV import")): all its fields round-trip (`type` must be
`"events-multiframe"`, `source`, `notes` from `#events-notes`, `basedon`, anything loaded from a previous
file). `data` is keyed by `String(frame)` for every key of `Tracks` whose value is not null, including frames
that became empty (written as `[]`); each value is an ARRAY of events (one per non-null observation, in
`for..in` order of IDs), not a dict. Each event is a shallow copy of the observation with: `id` =
`String(key in Tracks[f])` (placed first; NOT `evt.ID`), then all other own fields of the observation in
their order (`time, frame, x, y, cx, cy, width, height, angle, notes, labels`, then optionals `parts, newid,
fix, visit, span, tag`, plus any unknown field), with `ID`, `bool_acts`, `marked`, `permanent` removed.
Numeric normalization: `cx = x + width/2`, `cy = y + height/2` (computed from the unrounded values, so
any stored `cx,cy` is overwritten), then `x, y, width, height, cx, cy` are each rounded to 3 decimals
(`Math.round(v*1000)/1000`). Other numbers (`angle`, `time`, `frame`, `parts` coordinates) are written
as stored. A non-numeric `x` gives `NaN`, serialized as `null`. Serialized with `JSON.stringify` (no
indentation). Defaults: none are added for `time`, `frame`, `angle`, `notes`, `labels` (absent in memory stays absent), but `x, y,
width, height, cx, cy` are always written (a missing one gives `NaN`, serialized as `null`). The [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for") answer ("all
`Observation` fields are preserved on load and save") is not what the code does for the four removed fields:
`ID` and `bool_acts` are rebuilt at load ([BEH-717](#beh-717-events-json-v2-format-load-side-via-sanitizeevents "Events JSON v2 format (load side) via sanitizeEvents")) while `marked` and `permanent` are lost.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV2`, `saveObjToJsonFile`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for"), [OQ-712](../../QUESTIONS.md#oq-712 "Should the whole videoinfo be embedded in every saved events file"), [OQ-715](../../QUESTIONS.md#oq-715 "What does 'all Observation fields are preserved' cover"), [BEH-711](#beh-711-saving-v2-mutates-tracksinfo-and-fails-after-a-csv-import "Saving v2 mutates TracksInfo and fails after a CSV import"), [BEH-708](#beh-708-runtime-only-fields-of-an-observation-and-what-leaks-into-saves "Runtime-only fields of an observation, and what leaks into saves"), [BEH-712](#beh-712-events-json-v1-format-and-the-save-mutates-tracks-defect-c1 "Events JSON v1 format and the save-mutates-Tracks defect (C1)")

## BEH-711: Saving v2 mutates TracksInfo and fails after a CSV import

`convertTracksToV2` does not copy `TracksInfo` (`obj = {info: TracksInfo, ...}`) and then, in place:
sets `info.formatnote`, creates `info.history = []` if falsy, pushes `"Saved using labelbee on " + Date()`,
and sets `info.videoinfo = videoinfo` (a reference to the live global, which also contains the
`preview` sub-object and `tags`, `videoPath`, etc.). So each save (file or server) appends one entry
to the in-memory history, and all saved files contain the video info at the time of save. If `info.history` is a
non-empty string, as for every tracks CSV / `tracks_tagged` CSV / DB import ([BEH-735](#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)"), [BEH-736](#beh-736-import-of-a-tracks_tagged-csv "Import of a tracks_tagged CSV"), [BEH-737](#beh-737-import-of-a-tags-csv-tracks-and-tags-together "Import of a tags CSV (Tracks and Tags together)"), [BEH-740](#beh-740-experimental-db-source-load-tracks-from-sqlite "Experimental DB source: load tracks from SQLite")) which
set `history: "Loaded in Labelbee on <ISO date>"`, `.push` throws `TypeError` and the save aborts
(file: nothing downloaded; server: no request sent), after `formatnote` was already set. Also
`TracksInfo` undefined (no `setTracks` ever called) would throw `ReferenceError`; in practice init sets it ([BEH-709](#beh-709-initial-state-of-the-model-at-page-load "Initial state of the model at page load")).

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV2`, `eventsToServer`, `saveEventsToFile`
- **Links:** [DEBT-706](view_debt.md#debt-706-v2-save-mutates-tracksinfo-and-crashes-when-history-is-a-string "v2 save mutates TracksInfo and crashes when history is a string"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")

## BEH-712: Events JSON v1 format and the save-mutates-Tracks defect (C1)

`convertTracksToV1()` (reachable only through `saveEventsToFile('v1')`; the v1 button is commented
out in the page) returns a JS ARRAY indexed by `Number(frame)`: `obj[f] = { "<id>": evt, ... }`, so
JSON.stringify writes `null` for every frame index without observations (holes) and the output length
is `max frame + 1`. Frames with an empty dict are kept as `{}`. Event = the live observation object
itself: `Object.assign(evt)` with one argument returns `evt`, so the following edits are applied IN PLACE
on `Tracks` (analysis C1): fields `marked` and `permanent` are deleted; `cx = x + width/2`,
`cy = y + height/2`; `x, y, width, height, cx, cy` rounded to 3 decimals. `ID` and `bool_acts`
are kept in v1 (the deletes are commented out), and `time, frame, angle, notes, labels, parts, tag, span...` stay. Live
`Tracks` therefore changes at every v1 save (precision loss of the working coordinates, `cx,cy` re-derived).
The v2 conversion ([BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")) does not alias observations; the UI only ever exposes v2, so C1 is latent for
users but active for any caller of `convertTracksToV1`.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV1`, `saveEventsToFile`
- **Links:** [DEBT-707](view_debt.md#debt-707-c1-converttrackstov1-mutates-live-tracks "C1, convertTracksToV1 mutates live Tracks"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record")

## BEH-713: Save Events to a local file

Button `#save` ("Save Events (JSON v2)") calls `saveEventsToFile('v2')`; `format` defaults to `"v2"`
when omitted, accepted values `"v1"`, `"v2"` (any other value leaves the object `null`: the code logs
"error while preparing data, Aborted." but does NOT return, then calls `saveObjToJsonFile(null, ...)`,
which downloads the text `null`). Filename: `<videoinfo.name>-<YYYYMMDD_HHMMSS local time>_Tracks.json`
(`getTimestampedVideoname`). `videoinfo.name` is the video file name (or `"No video loaded"`, or the
full `video.src` URL if set by the obsolete `onVideoLoaded`, which would put slashes in the filename). The
blob has MIME `text/json`; the download is triggered by clicking a hidden `<a download>`; the object URL is never
revoked. There is no confirmation and no change of any dirty state.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `saveEventsToFile`, `saveObjToJsonFile`, `saveBlobToFile`, `getTimestampNow`, `getTimestampedVideoname`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#save`
- **Links:** [BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)"), [BEH-711](#beh-711-saving-v2-mutates-tracksinfo-and-fails-after-a-csv-import "Saving v2 mutates TracksInfo and fails after a CSV import"), [DEBT-708](view_debt.md#debt-708-saveeventstofile-with-an-unknown-format-downloads-null "saveEventsToFile with an unknown format downloads 'null'"), [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")

## BEH-714: Load Events from a local file

The `<label for="load">Load Events</label>` + hidden `<input type="file" id="load">` (no `accept` filter) fire
`loadEventsFromFile` on `change`: takes the first file, resets `input.value = ""` (so the same file can be
reloaded), returns silently if no file; reads it as text with `FileReader`; `onReaderLoad` does `JSON.parse`
(an exception on invalid JSON is uncaught: console only, no message to the user, Tracks unchanged) and
calls `setTracks(obj)` ([BEH-720](#beh-720-settracks-replace-the-model-and-refresh "setTracks: replace the model and refresh")). There is no confirmation: the current `Tracks` is silently replaced even
when it has unsaved work. A wrong-format file is rejected with console logs only ([BEH-718](#beh-718-events-json-v1-format-load-side-via-sanitizeevents "Events JSON v1 format (load side) via sanitizeEvents")/719), no user message.
Console logs the whole file content when `logging.io`. (`loadEventsFromFile0(path)`, a variant that loads via `$.get`,
has no caller except a commented-out line in `labelBee.js`, [DEBT-731](view_debt.md#debt-731-dead-loaders-and-debug-helpers "Dead loaders and debug helpers").)

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEventsFromFile`, `onReaderLoad`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#load`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [BEH-720](#beh-720-settracks-replace-the-model-and-refresh "setTracks: replace the model and refresh"), [DEBT-709](view_debt.md#debt-709-silent-failures-when-loading-local-files "Silent failures when loading local files"), [DEBT-731](view_debt.md#debt-731-dead-loaders-and-debug-helpers "Dead loaders and debug helpers"), [OQ-710](../../QUESTIONS.md#oq-710 "Silent replacement of unsaved work on load and erase")

## BEH-715: Erase Events and Erase Tags buttons

`#erase` ("Erase Events...") asks `confirm("Are you sure you want to ERASE all manual annotations
(Tracks)?")`; on OK calls `setTracks([])` (full refresh, `TracksInfo` reset to the v1 dummy info: notes,
history and source of the old file are lost, the notes textarea is cleared);
on cancel nothing. `#eraseTags` ("Erase Tags...") asks `confirm("Are you sure you want to ERASE all Tags?")`;
OK calls `setTags({},"")` which sets `Tags = {}` and refreshes. Neither is undoable ([OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics")).

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eraseEvents`, `eraseTags`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#erase`, `#eraseTags`
- **Links:** [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-009](../../QUESTIONS.md#oq-009 "Clean-up semantics"), [OQ-710](../../QUESTIONS.md#oq-710 "Silent replacement of unsaved work on load and erase")

## BEH-716: Notes for the current events

Textarea `#events-notes` ("Notes for current events"): every `input` event writes its value to
`TracksInfo["notes"]` (if `TracksInfo` is set). `updateEventsNotes()` copies `TracksInfo["notes"]` to the
textarea; it is called by `setTracks` only (so notes of a loaded file appear; a file without notes clears the
textarea, jQuery `.val(undefined)` setting an empty value).
The notes are saved in `info.notes` ([BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")) and are the only user-editable metadata.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `onChanged_events_notes`, `updateEventsNotes`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#events-notes`
- **Links:** [BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")

## BEH-717: Events JSON v2 format (load side) via sanitizeEvents

A loaded object that has the key `info` (`"info" in obj`) is read as v2: `info.type` must be exactly
`"events-multiframe"`, else console message "unsupported file format" and the function returns `undefined`
(load rejected). `data` (a dict keyed by frame, values iterated with `for..in`, so both v2 arrays and CSV-import
dicts work) is converted to a new dict of dicts: for each non-null frame and non-null event `evt0`:
`evt = Object.assign({ID: String(evt0.id)}, evt0)` (so a field `ID` already in the file overrides the
`id`-derived one, and the `id` field is then deleted; the frame dictionary key is always `String(evt0.id)`, so the key
and `evt.ID` can disagree when the file carries an `ID`, [OQ-713](../../QUESTIONS.md#oq-713 "Frame key versus ID divergence in v2 load")), and `evt.bool_acts` is recomputed as
`[hasLabel(evt,"fanning"), hasLabel(evt,"pollen"), hasLabel(evt,"entering"), hasLabel(evt,"leaving")]`
(any `bool_acts` in the file is ignored; `hasLabel` also sets `evt.labels = ""` when `labels` is null or
absent; labels are lower-cased, trimmed, comma-split and passed through the label alias map, see
`normalizeLabel`). All other fields pass through unchanged, including unknown ones, `tag`, `span`,
`visit`, `fix`, `parts`. No defaults are added: a missing `x`, `frame`, `time`, `angle`, `notes` stays missing. No type
coercion (a numeric `id` becomes the string `"12"`; frame keys stay strings). `info` is returned untouched.
Every frame key present in the file, even with an empty list, appears as an empty dict in the result. If `data` is
absent, `null` or `[]`, nothing is iterated and the result is `{info, data: {}}` ([BEH-746](#beh-746-a-v2-file-without-data-loads-as-an-empty-model "A v2 file without `data` loads as an empty model")). If `info` is `null` the
`info["type"]` read throws and is contained ([BEH-719](#beh-719-load-time-duplicate-handling-and-error-containment "Load-time duplicate handling and error containment")).

- **Group:** [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
  - [labelbee/static/labelbee/js/SelectionControl.js](../../../labelbee/static/labelbee/js/SelectionControl.js): `hasLabel`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [BEH-719](#beh-719-load-time-duplicate-handling-and-error-containment "Load-time duplicate handling and error containment"), [BEH-746](#beh-746-a-v2-file-without-data-loads-as-an-empty-model "A v2 file without `data` loads as an empty model"), [OQ-703](../../QUESTIONS.md#oq-703 "Are v1 events files and ID-less events still produced anywhere"), [OQ-713](../../QUESTIONS.md#oq-713 "Frame key versus ID divergence in v2 load")

## BEH-718: Events JSON v1 format (load side) via sanitizeEvents

An object WITHOUT an `info` key is read as v1: a JSON array (or object) indexed by frame, each entry a dict
`{id: event}` (null entries for holes are kept as `null`). A dummy `info = {type:"events-multiframe",
source:"Converted from Tracks v1 object"}` is created for an object; for a JSON array the source is
"Converted from Tracks v1 array" and `data` is a plain object keyed by array index (holes skipped, `null`
entries kept; fixed in slice 1 step 4, [DEBT-710](view_debt.md#debt-710-dead-array-branch-unreachable-non-object-branch-misleading-v1-source-string "Dead 'array' branch, unreachable non-object branch, misleading v1 source string")). For an object, `data = obj` is used directly (no copy, no
ID normalization, no recomputation of `bool_acts`, no `ID` created: the file's own `ID` and
`bool_acts` fields are the ones used, so a v1 file lacking `bool_acts` yields observations that later break
CSV/BBox export, [BEH-738](#beh-738-export-events-csv "Export Events (CSV)"), [BEH-739](#beh-739-export-events-bbox "Export Events (BBox)")). Validation: every key of `data` must match `/^(0|[1-9]\d*)$/`; otherwise the load
is rejected (console message). A JSON `null` and any primitive (number, string, boolean) throw a `TypeError` at the
initial `"info" in obj` test, inside the `try`: caught, logged with `console.error`, load rejected. So the later
branch for a non-object ("Should be either array of frames, or object...") is unreachable ([DEBT-710](view_debt.md#debt-710-dead-array-branch-unreachable-non-object-branch-misleading-v1-source-string "Dead 'array' branch, unreachable non-object branch, misleading v1 source string")).
Note `setTracks([])` (init, erase) takes this branch.

- **Group:** [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [DEBT-710](view_debt.md#debt-710-dead-array-branch-unreachable-non-object-branch-misleading-v1-source-string "Dead 'array' branch, unreachable non-object branch, misleading v1 source string"), [DEBT-711](view_debt.md#debt-711-v1-validation-and-normalization-are-weak "v1 validation and normalization are weak"), [OQ-703](../../QUESTIONS.md#oq-703 "Are v1 events files and ID-less events still produced anywhere")

## BEH-719: Load-time duplicate handling and error containment

In the v2 branch, if two events of one frame have the same `id`, the first is kept, the later ones are
dropped (console warning for each), and after the whole file `alert("WARNING: Events file was loaded, but it has
duplicate entries. Current version of software deleted redundant events.")` is shown once. Any exception
while reading (wrong structure) is caught: `console.error`, `sanitizeEvents` returns `undefined`, and
`setTracks` returns `false`: no change to the model and no visible message for local files. v2 events with
`id` missing become the ID `"undefined"` (and collide with each other, being treated as duplicates).

- **Group:** [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTracks`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [DEBT-709](view_debt.md#debt-709-silent-failures-when-loading-local-files "Silent failures when loading local files"), [BEH-717](#beh-717-events-json-v2-format-load-side-via-sanitizeevents "Events JSON v2 format (load side) via sanitizeEvents"), [OQ-711](../../QUESTIONS.md#oq-711 "Duplicate v2 entries: which one is kept and how it is reported")

## BEH-720: setTracks: replace the model and refresh

`setTracks(obj, skipRefresh)` runs `sanitizeEvents`; on failure logs "ABORTED, wrong format." and returns
`false` (model untouched). On success: `Tracks = evts.data`, `TracksInfo = evts.info` (both globals replaced,
previous content discarded), `updateEventsNotes()`, then unless `skipRefresh`: `videoControl.onFrameChanged()` and
`refreshChronogram()`; returns `true`. Callers (server load, CSV import, DB import) call
`videoControl.onFrameChanged()` and `refreshChronogram()` again after it (double refresh). It does
not clear the selection, the undo stack, nor `fromServerDialog.basedOn`.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTracks`, `setEventsProp`
- **Links:** [CAP-701](view_capabilities.md#cap-701-annotation-model-selection-and-undo "Annotation model, selection and undo"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [BEH-715](#beh-715-erase-events-and-erase-tags-buttons "Erase Events and Erase Tags buttons"), [BEH-746](#beh-746-a-v2-file-without-data-loads-as-an-empty-model "A v2 file without `data` loads as an empty model"), [DEBT-712](view_debt.md#debt-712-implicit-globals-and-double-refresh-in-the-io-code "Implicit globals and double refresh in the IO code"), [OQ-710](../../QUESTIONS.md#oq-710 "Silent replacement of unsaved work on load and erase")

## BEH-721: Tags JSON v1 and v2 formats

Tag files are dicts keyed by frame: `{ "<frame>": { "tags": [ {id, c:[x,y], p:[[x,y]*4], hamming,
goodness, dm?, frame?} ] } }`. v2 wraps this as `{info:{type:"tags-multiframe", "data-format":"root.data[frame].tags[id_in_frame]"},
data:<the dict>}`. Producer: `saveTagsToFile('v2')` writes exactly that with `data: Tags` (the live global; after load it includes
the `frame` field added by `tagsAddFrames`, a number). v1 (`saveTagsToFile('v1')`, no button) writes the bare dict.
Loading: an object with `info` must have `info.type == "tags-multiframe"` (else console message, returns 0)
and `obj = obj.data`; an object without `info` is v1 and is accepted if `typeof obj == "object"`. The v1 key check
reads the OLD global `Tags` instead of the loaded `obj` ([DEBT-713](view_debt.md#debt-713-settags-v1-validation-inspects-the-previous-tags-global "setTags v1 validation inspects the previous Tags global")), so it never validates the file. In both
cases the file's `info` is discarded and replaced by `TagsInfo = {type:"tags-multiframe", source:"Converted from Tags v1"}`
(even for v2). A `null` or primitive throws a `TypeError` at `"info" in obj`, inside the `try`, and is caught (returns 0), so the
`typeof obj != "object"` rejection branch is unreachable. Tag ids are ints in
native files; the tags CSV import produces string ids ([BEH-737](#beh-737-import-of-a-tags-csv-tracks-and-tags-together "Import of a tags CSV (Tracks and Tags together)")).

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTags`, `saveTagsToFile`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tagsAddFrames`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [DEBT-713](view_debt.md#debt-713-settags-v1-validation-inspects-the-previous-tags-global "setTags v1 validation inspects the previous Tags global"), [BEH-724](#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh")

## BEH-722: Load Tags from a local file

Hidden `<input type="file" id="loadtags">` (label "Load Tags") fires `loadTagsFromFile` on `change`: first
file, input value reset, silent return if none; `FileReader.readAsText`; `onTagsReaderLoad` does
`JSON.parse` (invalid JSON: uncaught exception, no message) and `setTags(obj)` ([BEH-724](#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh")). The success/fail
return of `setTags` is ignored; the console logs "importing from JSON file. DONE" regardless. No confirmation
before replacing the existing `Tags`.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTagsFromFile`, `onTagsReaderLoad`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#loadtags`
- **Links:** [BEH-724](#beh-724-settags-replace-tags-and-refresh "setTags: replace tags and refresh"), [BEH-721](#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats")

## BEH-723: Save Tags to a local file

Button `#savetags` ("Save Tags (v2)") calls `saveTagsToFile('v2')`. Filename `<videoinfo.name>-<timestamp>_Tags.json`
(same helper as [BEH-713](#beh-713-save-events-to-a-local-file "Save Events to a local file")). Unknown `version` only logs an error. The `obj` of the v2 branch is an
undeclared global (`obj = {...}`), which overwrites any global named `obj`. Tags are never saved to the
server by the client (there is no tag-save request).

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `saveTagsToFile`, `getTimestampedVideoname`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#savetags`
- **Links:** [BEH-721](#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats"), [DEBT-714](view_debt.md#debt-714-savetagstofile-v2-writes-an-undeclared-global-obj "saveTagsToFile v2 writes an undeclared global obj")

## BEH-724: setTags: replace tags and refresh

Parse stage (inside a `try`): returns `0` and leaves `Tags` unchanged when the object has `info` with `info.type !=
"tags-multiframe"`, or when the object is `null` or a primitive (`"info" in obj` throws, caught with `console.error`).
For an accepted v2 object `obj = obj.data` (so a v2 file without `data` sets `obj` to `undefined`, [DEBT-733](view_debt.md#debt-733-settags-replaces-tags-before-unguarded-steps "setTags replaces Tags before unguarded steps")). Then the
apply stage runs OUTSIDE the `try`, in this order: `Tags = obj`, `TagsInfo` = dummy info ([BEH-721](#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats")), `tagsAddFrames(Tags)`
(adds `tag.frame = Number(f)` to every tag of every frame, overwriting any `frame` in the file; a frame whose `.tags` is
`null` or a tag that is `null` is skipped, but a `null` frame entry throws because `Tags[f].tags` is read unguarded),
`ttags = getTTags()` (from `ChronoControl.js`; in `tagMode == 'Tracks'` it builds the id to frame index from the global
`flatTags` assigned by `updateChronoData`, so at that point it reflects the previous chronogram data, otherwise it
iterates `Tags`; it also resets the global `allTagsID` to a `Set`, which stays a Set until `updateChronoData` converts it
to an array). The following `refreshChronogram()` runs `updateChronoData`, which recomputes `flatTags = getFlatTags(false)`
then `ttags = getTTags()`, so `ttags` is correct again after the call; the DM check, then `refreshChronogram()`, `adjustChronogramHeight()`,
`videoControl.onFrameChanged()`; returns `1`.
DM check: if `Tags` is not empty (`jQuery.isEmptyObject`), takes `Tags[firstKey].tags` and, when it has at least one
element, `tagsHaveDM = "dm" in tags0[0]` (only the first tag of the first key decides; `tagsHaveDM` is set to false
before the check, so an empty first frame leaves it false). Elements with class `.requireDM` get the `disabled` property
and CSS class `disabled` = `!tagsHaveDM`. An exception in `tagsAddFrames` or in the DM check (for instance a first key
without `.tags`) propagates uncaught after `Tags` and `TagsInfo` were already replaced: no refresh, no return value. Only
the parse-stage failures return `0` with `Tags` unchanged.

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTags`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tagsAddFrames`
  - [labelbee/static/labelbee/js/ChronoControl.js](../../../labelbee/static/labelbee/js/ChronoControl.js): `getTTags`
- **Links:** [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [CAP-502](view_capabilities.md#cap-502-tag-id-assignment-and-fix "Tag ID assignment and fix"), [BEH-721](#beh-721-tags-json-v1-and-v2-formats "Tags JSON v1 and v2 formats"), [DEBT-715](view_debt.md#debt-715-settags-dm-detection-and-discarded-file-info "setTags DM detection and discarded file info"), [DEBT-733](view_debt.md#debt-733-settags-replaces-tags-before-unguarded-steps "setTags replaces Tags before unguarded steps"), [DEBT-736](view_debt.md#debt-736-settags-builds-ttags-from-stale-chronogram-data "setTags builds ttags from stale chronogram data")

## BEH-725: Server annotation list dialog "recent" mode

`Load Tags` (`#tagsFromServer`, first of two elements with this id) calls `fromServerDialog.openRecentLoadingDialog('tag')`
and `Load Events from DB` (second element, duplicate id) `openRecentLoadingDialog('event')`. The dialog `#from-server-dialog`
gets title "Most recent <type> file for <videoinfo.videoPath>", a checkbox area (checkbox "Show advanced loading
menu", unchecked; `<select id=DropdownElement>` with `tag` and `event`; changing it re-calls the function with
the new type) and body "[...]". If `videoManager.currentVideoID` is falsy: title "No video loaded!" and a red
message "No video has been selected...", dialog opened, no request. Else the dialog opens and `GET
api/v1/annotations` with query `video_id=<videoManager.currentVideoID>&data_type=<tag|event>` is sent. Success:
`theDialog.json = response.data`; only `data[0]` is used (the most recent, assuming the server sorts newest first;
not enforced by the client); a table row shows `file_name`, `timestamp` (`T` replaced by space), `[created_by_id] created_by`;
below, "Do you wish to load this <type> file?" with Yes (`fromServerDialog.loadEvents('0')`) and No (`data-dismiss`)
and a warning "If another <type> file is currently loaded, unsaved changes may be lost.". Empty list: red
message "Current user has not recently opened any <type> files for the current video. Use the advanced
loading menu to load a file." Request error: red message with title, status, error and response text.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `FromServerDialog`, `openRecentLoadingDialog`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#tagsFromServer`, `#from-server-dialog`
- **Links:** [OQ-010](../../QUESTIONS.md#oq-010 "Server versus local storage"), [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [DEBT-716](view_debt.md#debt-716-recent-file-dialog-assumptions "Recent-file dialog assumptions"), [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users"), [OQ-705](../../QUESTIONS.md#oq-705 "Order of the file list in the 'recent' dialog")

## BEH-726: Server annotation list dialog "advanced" mode

Ticking "Show advanced loading menu" calls `showAdvancedLoadingDialog(false)`: title "Advanced <type> loading menu
for <videoPath>", checkboxes "Show advanced loading menu" (checked; unticking returns to recent mode), "Show
files from all users" (`#showAllUsers`, toggles `allusers` true/false and refetches) and the type `<select>` (changing sets
`data_type` and refetches with `allusers=false`, even if the all-users box was ticked). Request: `GET api/v1/annotations` with
`video_id`, `data_type`, `allusers` (sent as the strings `"true"`/`"false"` by jQuery). The body is a DataTable
(`#TagOrEventFileListFromServer`; columns: button "Load #<id>" (calls `fromServerDialog.loadEvents('<row index>')`),
file name, created on (`T` replaced by space), `[created_by_id] created_by`). Request error: the handler passes the HTML as
the first parameter of `setMessage(color, html)` (the HTML is used as CSS colour and the content argument is
`undefined`, which jQuery `.html()` does not set, so no error text appears, [DEBT-717](view_debt.md#debt-717-advanced-file-dialog-bugs "Advanced-file dialog bugs")). Unlike the recent mode, there is no "No video loaded" guard: the request is sent with whatever `videoManager.currentVideoID`
holds. The row index passed to `loadEvents` is a counter incremented at each render call of the id
column, so it matches the row only if DataTables renders each cell exactly once in data order ([DEBT-717](view_debt.md#debt-717-advanced-file-dialog-bugs "Advanced-file dialog bugs")).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `showAdvancedLoadingDialog`
- **Links:** [DEBT-717](view_debt.md#debt-717-advanced-file-dialog-bugs "Advanced-file dialog bugs"), [OQ-705](../../QUESTIONS.md#oq-705 "Order of the file list in the 'recent' dialog"), [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")

## BEH-727: Loading an event (Tracks) file from the server

`fromServerDialog.loadEvents(k)` (event type) takes `id = theDialog.json[k].id`, sends `GET api/v1/annotation/<id>`
and on success parses `response.data.data` with `JSON.parse` (the saved text payload, v2 JSON, [BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)"); invalid JSON
throws uncaught in the callback and the message stays on "Loading ...") and calls `setTracks(obj)` (same sanitizing as
local, [BEH-717](#beh-717-events-json-v2-format-load-side-via-sanitizeevents "Events JSON v2 format (load side) via sanitizeEvents")), then `onFrameChanged` and `refreshChronogram` again, whether or not `setTracks` succeeded. On
success sets `fromServerDialog.basedOn = id` (used as `created_from_id` at the next save, [BEH-730](#beh-730-lineage-created_from_id-comes-from-the-last-server-load "Lineage: created_from_id comes from the last server load")) and the
message "Events loaded." (the dialog stays open). If `setTracks` returns false: the code selects `.modal-message h4`
to show a red error; that selector matches nothing: every dialog message is written with `setMessage(color, html)`, which sets
the content of `.modal-message` itself (and `resetAllHTML` clears it when the dialog opens), so no `h4` exists inside it
([DEBT-718](view_debt.md#debt-718-invisible-error-messages-in-fromserverdialogloadevents "Invisible error messages in FromServerDialog.loadEvents")). The messages also read `this.dataType`, while the dialog assigns `this.data_type`. Request error: same invisible handler. The payload `data.data` being a string is a
server-side contract (group 1). The "Loading ..." progress message has the same invisible selector.
Unsaved current Tracks are replaced without confirmation (only the dialog warning text).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEvents`
- **Links:** [OQ-010](../../QUESTIONS.md#oq-010 "Server versus local storage"), [DEBT-718](view_debt.md#debt-718-invisible-error-messages-in-fromserverdialogloadevents "Invisible error messages in FromServerDialog.loadEvents"), [BEH-730](#beh-730-lineage-created_from_id-comes-from-the-last-server-load "Lineage: created_from_id comes from the last server load"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")

## BEH-728: Loading a tag file from the server

`loadEvents(k)` in tag mode calls `tagsFromServer(id, dialogDiv)`, which sets `statusWidget` "tagsLoad" to
requesting and `GET rest/v2/annotation/<id>` as JSON. A search of `labelbee/` finds no route string `rest/v2/annotation` (the `rest/v2/` routes in
`labelbee/legacy/views.py` are `videolist`, `videodata`, `datasets`, `edit_video/<id>`, `get_video_data/<id>`,
`get_video_data_raw/<id>`, `edit_video_data/<id>`, `add_video_data`, `get_video/<videoid>`, `delete_video/<videoid>`,
`get_video_info/<videoid>`, `import_from_csv`, `update_paths`, `populate_datasets`, `fix_datasets`; the annotation routes are
under `/api/v1/`, [OQ-706](../../QUESTIONS.md#oq-706 "Is server loading of tags supposed to work")), so the call is expected to fail with 404: the fail handler sets the status to failed and calls `setTags([], div)`, which
replaces the current `Tags` by an empty one. On a (hypothetical) success it reads `response.data.data` as the tag
object (not parsed from a string) and `setTags` it; `null` gives a red message "Tag data stored in server is null." The
function returns `undefined` immediately (asynchronous call), so `loadEvents` always takes its "ERROR setTags: Invalid
tag information" branch (invisible, see [BEH-727](#beh-727-loading-an-event-tracks-file-from-the-server "Loading an event (Tracks) file from the server")) and never sets `basedOn` for tags. Net: server tag loading does not
work in the repo as read; tags are loaded from local files ([BEH-722](#beh-722-load-tags-from-a-local-file "Load Tags from a local file")) or from the CSV import ([BEH-737](#beh-737-import-of-a-tags-csv-tracks-and-tags-together "Import of a tags CSV (Tracks and Tags together)")). Also called with a URL from
the obsolete `VideoControl.onVideoLoaded`.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tagsFromServer`, `loadEvents`
- **Links:** [DEBT-719](view_debt.md#debt-719-server-tag-loading-unrouted-url-undefined-return-empties-tags-on-failure "Server tag loading: unrouted URL, undefined return, empties Tags on failure"), [OQ-706](../../QUESTIONS.md#oq-706 "Is server loading of tags supposed to work"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

## BEH-729: Save Events to the server (snapshot)

Button `#eventsToServerV2` ("Save Events (JSON v2)", class `require-server`, greyed when `whoami` says not
authenticated, [BEH-733](#beh-733-login-state-gates-the-server-buttons "Login state gates the server buttons")) calls `eventsToServer('v2')`. The argument is only used in the success message: the payload is
always `JSON.stringify(convertTracksToV2())` ([BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")). `POST /api/v1/annotations` (form-encoded by jQuery, JSON
response) with fields `video_id = videoManager.currentVideoID`, `created_by_id = user_id` (global set by `whoami`),
`data_type = "event"`, `data` (the JSON text), `created_from_id = fromServerDialog.basedOn`. Undefined values
(`basedOn` never set, not logged in) are sent as empty strings. Success: `alert()` with "Save Events JSON (v2) to
server: Success." and the fields `created_by_id, file_name, path, data_type, id, created_from_id, video_id,
timestamp` of `response.data`. Failure: `mainAlert` dialog with title, status, error and response text. A save always
creates a new record (snapshot, [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing")); the client does not update `basedOn` to the new record id, so successive
saves from one session share the same `created_from_id`. No video loaded: `video_id` is undefined and the server decides.
Tags and `TracksInfo.notes` travel inside the JSON.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `eventsToServer`, `showAjaxError`, `mainAlert`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#eventsToServerV2`
- **Links:** [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [OQ-010](../../QUESTIONS.md#oq-010 "Server versus local storage"), [DEBT-706](view_debt.md#debt-706-v2-save-mutates-tracksinfo-and-crashes-when-history-is-a-string "v2 save mutates TracksInfo and crashes when history is a string"), [DEBT-720](view_debt.md#debt-720-eventstoserver-ignored-argument-undefined-fields-css-only-gating "eventsToServer: ignored argument, undefined fields, CSS-only gating"), [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")

## BEH-730: Lineage: created_from_id comes from the last server load

`fromServerDialog.basedOn` is set to the id of the server file after a successful event load ([BEH-727](#beh-727-loading-an-event-tracks-file-from-the-server "Loading an event (Tracks) file from the server")) (and in the
tag branch, never reached). It is not reset by `setTracks`, erase, local-file load, CSV import, or video change, and is
sent as `created_from_id` at every server save. A local-file load followed by a server save therefore records the
lineage of an earlier unrelated server load. The `setEventsProp("basedon", ...)` approach (info.basedon) is
commented out.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEvents`, `eventsToServer`, `setEventsProp`
- **Links:** [DEC-002](view_decisions.md#dec-002-single-writer-snapshot-model-no-concurrent-editing "Single-writer snapshot model, no concurrent editing"), [DEBT-721](view_debt.md#debt-721-stale-lineage-basedon "Stale lineage basedOn"), [OQ-707](../../QUESTIONS.md#oq-707 "Lineage semantics of created_from_id")

## BEH-731: Loading events from a URL fragment (#video_data=<id>)

`loadEventsFromServerByID(video_data_id)` (async) is awaited by `onhashchange` in `labelBee.js` when the URL hash has `video_data`. It
sends `GET api/v1/annotation/<id>`, parses `response.data.data` and calls `setTracks`, `onFrameChanged`,
`refreshChronogram`. The function returns before the request completes (the promise does not wait for the AJAX
call) and its success and error callbacks reference variables that are not defined in scope (`tag_event_ID`,
`theDialog`, `div`): after `setTracks` succeeds a `ReferenceError` is thrown at the `console.log`
line, so `fromServerDialog.basedOn` is NOT set and no message is shown; the Tracks are nevertheless loaded. The failure
paths (`setTracks` false, request error) also reference undefined `div` and `tag_event_ID` before reaching their
`throw new Error(...)`, so they end in a `ReferenceError` instead. The
function comment says it replaces the deprecated `tracksListFromServer`.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadEventsFromServerByID`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `onhashchange handler`
- **Links:** [DEBT-722](view_debt.md#debt-722-loadeventsfromserverbyid-uses-undefined-variables-and-does-not-await "loadEventsFromServerByID uses undefined variables and does not await"), [CAP-202](view_capabilities.md#cap-202-play-and-seek "Play and seek")

## BEH-732: Deprecated server list loaders

`tracksListFromServer()` (comment "DEPRECATED") fills `#loadTracksFromServerDialog .modal-body` (no such element exists in
`labelbee_page.html`) with a table from `GET /rest/events/?format=json&video=<videoName>`; each row button calls
`eventsFromServer(uri)`, which does `GET <uri>`, `setTracks(response)` (the response already parsed JSON) and
hides `#loadTracksFromServerDialog`. Neither is reachable from the page (no caller found). `formattimestamp`
formats 12-digit timestamps `YYMMDDhhmmss` as `20YY-MM-DD hh:mm:ss`.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tracksListFromServer`, `eventsFromServer`, `formattimestamp`
- **Links:** [DEBT-723](view_debt.md#debt-723-deprecated-server-list-loaders "Deprecated server list loaders")

## BEH-733: Login state gates the server buttons

`whoami()` (called at init and from refresh/login/logout) does `GET api/v1/auth/whoami`; stores the reply in the global `user_data`;
if `is_authenticated`: shows "Logged as <first_name>" with refresh and "Log out" buttons, sets `user_id = data.id`, and
removes class `disabled` from `.require-server` elements; else shows a "Log in" button and adds `disabled`; on request failure shows
"No connection" and disables. The class is CSS only: the `#eventsToServerV2` button remains clickable (the handler still sends). Login
dialog (`#dialog-login`, Ok/Cancel): Ok posts email and password (form-encoded) to `api/v1/auth/login`; `status == "SUCCESS"` runs
`whoami()` and closes the dialog, else shows the message in the dialog. Logout asks `confirm("Confirm log out?")`
then `POST api/v1/auth/logout`. `user_id` is declared in `labelBee.js` and is only assigned in the authenticated branch (never cleared on logout or
failure). `user_data` is also read by `VideoList.js` (the video list loader and its error handler): when the video
list request fails, the red message says "Unable to retrieve video list" if `user_data.is_authenticated`, else "User is
not logged in"; `user_data` is only assigned by the `whoami` success callback.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `whoami`, `ajaxlogin`, `ajaxlogout`, `LoginDialog`, `try_login`, `try_logout`
  - [labelbee/static/labelbee/js/VideoList.js](../../../labelbee/static/labelbee/js/VideoList.js): `user_data.is_authenticated readers in the video list loader`
- **Links:** [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users"), [DEBT-724](view_debt.md#debt-724-auth-code-lives-in-annotationiojs "Auth code lives in AnnotationIO.js")

## BEH-734: Label list preset loader

`Preset...` button (next to the label buttons) calls `labelListFromServerDialog.openDialog()`: shows `#dialog-labellist-from-server`
(body "[...]", message "Loading labelList file list from server. Please wait..."), then `GET /rest/config/labellist/` (or a
directory URI) with `{format:"json"}`; expects `{files:[{uri,filename}], dirs:[{uri,filename}]}` and renders one button per
file and per directory (a directory click lists it). A payload lacking `files` or `dirs` makes the success callback throw
(`for..of` on `undefined`) and the dialog stays on its loading message. File click: `labelListFromServer(uri)` does `GET uri`
and returns the `$.ajax` promise; on success, if `obj.labelButtonsArray` is present it assigns the global
`labelButtonsArray` and calls `hardRefreshLabelTogglePanel()`; if it is absent the callback logs and returns `false` (the
return value is ignored) and nothing is assigned. In both cases the promise resolves, so `onClickFile` then writes "Labels
loaded. Closing." and closes the dialog. This is configuration, not annotation data; labels are generic ([DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic")).

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `LabelListFromServerDialog`, `labelListFromServer`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [CAP-601](view_capabilities.md#cap-601-behavior-labels-and-notes "Behavior labels and notes"), [BEH-747](#beh-747-label-preset-request-failure-leaves-the-dialog-on-its-loading-message "Label preset request failure leaves the dialog on its loading message"), [DEBT-735](view_debt.md#debt-735-labellistfromserver-reports-success-when-nothing-was-loaded-no-error-path-in-the-dialog "labelListFromServer reports success when nothing was loaded, no error path in the dialog")

## BEH-735: Import of a tracks CSV (tracks_csv_to_json)

Entry points: link "from URI" (`clickLoadTracksCSVFromServer`: `prompt("Enter tracks URL", <default
/data/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv>)`; empty/cancel: nothing) and link "from /data"
(`pickEventsCSVDialog.open()`: `EventsCSVManualFilePicker`, a `FilePickerFromServerDialog` defined in `labelBee.js`
over `/api/v1/rawdata/`, titled "Load tracks CSV Manually", [BEH-748](#beh-748-server-file-picker-used-by-the-tracks-csv-import "Server file picker used by the tracks CSV import"), which calls `loadTracksCSVFromServer(uri)`). `d3.csv(url)` parses it (no `.catch`: network or parse errors are silent, only unhandled
promise rejection) and `tracks_csv_to_json` converts each row (all CSV values are strings). Row to event: `id = track_id`
(string), `frame = +frame`, `cx = +cx`, `cy = +cy`, `angle = +angle + 90`, `width = 300`, `height = 600`,
`x = cx - 150`, `y = cy - 300`, `bool_acts = [false x4]`, `labels = ""`, `parts` = for each of head, neck, thorax, waist, tail with
`+<name>_visibility > 0`: `{posFrame:{x:+<name>_x, y:+<name>_y}, label:<name>}`. Not set: `time`, `notes`, `ID`. Structure
`{frame: {track_id: item}}` keyed by the row's raw `frame` string (a repeated `track_id` in a frame overwrites the earlier row).
`info = {type:"events-multiframe", source:'Converted from CSV "<url>"', history:"Loaded in Labelbee on <ISO date>"}`
(history is a STRING, [BEH-711](#beh-711-saving-v2-mutates-tracksinfo-and-fails-after-a-csv-import "Saving v2 mutates TracksInfo and fails after a CSV import")). Then `setTracks(obj)` (goes through the v2 branch of sanitizing), `onFrameChanged`,
`refreshChronogram`. The 300x600 box and +90 angle are fixed conventions of the external producer ([DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee")), not read from the file.

- **Group:** [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `clickLoadTracksCSVFromServer`, `loadTracksCSVFromServer`, `EventsCSVManualFilePicker`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tracks_csv_to_json`
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `FilePickerFromServerDialog`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Server storage panel (from URI, from /data)`
- **Links:** [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [OQ-002](../../QUESTIONS.md#oq-002 "Tag pipeline boundary"), [OQ-708](../../QUESTIONS.md#oq-708 "Fixed 300x600 box and +90 angle in CSV imports"), [DEBT-725](view_debt.md#debt-725-csv-loaders-no-error-handling-hard-coded-paths-unsequenced-video-and-csv "CSV loaders: no error handling, hard-coded paths, unsequenced video and CSV"), [DEBT-706](view_debt.md#debt-706-v2-save-mutates-tracksinfo-and-crashes-when-history-is-a-string "v2 save mutates TracksInfo and crashes when history is a string"), [BEH-748](#beh-748-server-file-picker-used-by-the-tracks-csv-import "Server file picker used by the tracks CSV import")

## BEH-736: Import of a tracks_tagged CSV

Link "gurabo4 video+tracks_tagged" (`clickLoadTracksTaggedCSVFromServer`): `prompt("Enter gurabo4 col_videoname", "col10/9_02_R_190809120000.cfr.mp4")`
(empty/cancel: nothing); loads the video `<url_for(/data)>/datasets/gurabo4/mp4/<name>` with
`videoManager.loadVideoManual`, and the tracks from `.../datasets/gurabo4/tracks/<name>.tracks_tagged.csv` (hard-coded dataset
name `gurabo4`). `tracks_tagged_csv_to_json` is as [BEH-735](#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)") except: event `id` = `"T" + track_id` when `track_tagid` is null or empty,
otherwise `String(+track_tagid)`; if `tag_id` is non-empty an embedded `tag` object is attached to the event:
`{id:+tag_id, frame:+frame, c:[+tag_cx,+tag_cy], hamming:+tag_hamming, goodness:+tag_goodness, dm:+tag_dm,
p:[[+tag_p0x,+tag_p0y],...[+tag_p3x,+tag_p3y]]}`. The `Tags` global is not touched (tags live in `obs.tag`; consumers
select with `tagMode == 'Tracks'`). The video load and the CSV load are not sequenced (CSV fetch starts immediately).

- **Group:** [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `clickLoadTracksTaggedCSVFromServer`, `loadTrackTaggedCSVFromServer`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tracks_tagged_csv_to_json`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `Server storage panel (gurabo4 link)`
- **Links:** [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [OQ-708](../../QUESTIONS.md#oq-708 "Fixed 300x600 box and +90 angle in CSV imports"), [CAP-402](view_capabilities.md#cap-402-tag-display-on-the-frame "Tag display on the frame"), [BEH-708](#beh-708-runtime-only-fields-of-an-observation-and-what-leaks-into-saves "Runtime-only fields of an observation, and what leaks into saves")

## BEH-737: Import of a tags CSV (Tracks and Tags together)

`loadTagsCSVFromServer(url)` (no button or caller in the page; console only) loads one CSV and builds both: `tags_csv_to_json` gives
Tracks as [BEH-735](#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)") but with `id = <row>.id` (instead of `track_id`), and `tags_csv_to_tagjson` gives Tags: rows with `+dm == 0`
are skipped (their frame still gets an empty `{tags:[]}` entry); item = `{id: <row.id string>, frame:+frame, c:[+cx_tag,+cy_tag],
hamming:+hamming, goodness:+goodness, dm:+dm, p:[[+p0x,+p0y],...,[+p3x,+p3y]]}`; info `{type:"tags-multiframe", source, history:string}`
(replaced by the dummy info in `setTags`). Tag ids are strings here, ints in `tracks_tagged` and native tag files.

- **Group:** [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import")
- **Origin:** debt
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTagsCSVFromServer`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `tags_csv_to_json`, `tags_csv_to_tagjson`
- **Links:** [DEC-001](view_decisions.md#dec-001-tag-detection-and-bee-tracking-happen-outside-labelbee "Tag detection and bee tracking happen outside LabelBee"), [DEBT-726](view_debt.md#debt-726-near-identical-csv-converters-tags-csv-loader-unreachable "Near-identical CSV converters; tags CSV loader unreachable"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection")

## BEH-738: Export Events (CSV)

Button `#saveCSV` calls `saveEventsToCSV` which downloads `Tracks.csv` (fixed name, MIME `text/csv`) built by `tracksToCSV(Tracks)`. Header
`Date,Time (frame),ID,Action,Cargo,Shift`. One line per observation (`for..in` frames then IDs): `nodate,<frame key>,<obs.ID>,<action>,<cargo>,`
(the Shift column is always empty). `action` = join with `;` of, in this order: `fanning` if `bool_acts[0]`, `came in` if
`bool_acts[2]`, `went out` if `bool_acts[3]`; `cargo` = `pollen` if `bool_acts[1]`. Only these four flags are exported (other labels, notes,
geometry, angle are not). No quoting or escaping. A `null` entry or an observation without `bool_acts` (v1 file without them) throws
and nothing is downloaded. (`conc` helper inside is dead code.)

- **Group:** [CAP-705](view_capabilities.md#cap-705-export "Export")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tracksToCSV`, `saveEventsToCSV`, `saveCSVToFile`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#saveCSV`
- **Links:** [DEC-003](view_decisions.md#dec-003-labels-are-generic "Labels are generic"), [DEBT-727](view_debt.md#debt-727-exports-ignore-labels-and-notes-and-crash-on-missing-bool_acts "Exports ignore labels and notes and crash on missing bool_acts"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for")

## BEH-739: Export Events (BBox)

Button `#saveBBoxes` calls `saveEventsToBBoxes` which downloads `BBoxes.csv` using `tracksToBBoxes2(Tracks)` (the console message mentions the
other format, `tracksToBBoxes`, which is never called). Header: `#frame,id,tagx,tagy,angle,left,top,right,bottom,pollen,arrive,leave,fanning`. Per
observation: `frame key, obs.ID, x+width/2, y+height/2, Number(angle), x, y, x+width, y+height, Number(bool_acts[1]) (pollen),
Number(bool_acts[2]) (arrive), Number(bool_acts[3]) (leave), Number(bool_acts[0]) (fanning)`. Numbers are written unrounded
(JS default formatting, e.g. `12.5`, floating-point noise possible); no escaping. `tagx,tagy` are the box center, not a tag position.
Same failure case as [BEH-738](#beh-738-export-events-csv "Export Events (CSV)") for entries without `bool_acts`. `tracksToBBoxes` (unused) has the header
`#frame,left,top,right,bottom,pollen,arrive,leave,fanning,angleAroundCenter`.

- **Group:** [CAP-705](view_capabilities.md#cap-705-export "Export")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `tracksToBBoxes2`, `tracksToBBoxes`, `saveEventsToBBoxes`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#saveBBoxes`
- **Links:** [DEBT-727](view_debt.md#debt-727-exports-ignore-labels-and-notes-and-crash-on-missing-bool_acts "Exports ignore labels and notes and crash on missing bool_acts"), [DEBT-728](view_debt.md#debt-728-trackstobboxes-unused-and-log-message-stale "tracksToBBoxes unused and log message stale"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for")

## BEH-740: Experimental DB source: load tracks from SQLite

`loadTracksCSVFromDB(limit=100)` (no button or caller; invocable from the console) uses the global `db` (an sql.js database created by
`SQLiteDB.js`) with the query `SELECT frame, CAST(track_id AS TEXT) AS id, cx, cy, angle + 90 AS angle, 300 AS width, 600 AS height,
cx-300/2 AS x, cy-600/2 AS y FROM data LIMIT <limit>` (table `data` is expected to be the tracks CSV loaded as a table; no ORDER BY,
so only an arbitrary first `limit` rows are loaded, default 100). `resultToObjects` turns the first result set into row objects (empty
result: no rows), `flatjson_to_json` groups by `frame` into `{frame: {id: item}}` with `bool_acts = [false x4]` and `labels = ""`
(no `parts`, no tags), info `{type:"events-multiframe", source:"Imported form DB" (sic), history:string}`; then `setTracks`,
`onFrameChanged`, `refreshChronogram`, with timing logs. `db_to_json`, `flatjson_to_json`, `resultToObjects` assign undeclared globals (`result`, `data`, `evts`).

- **Group:** [CAP-706](view_capabilities.md#cap-706-experimental-db-sources "Experimental DB sources")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `loadTracksCSVFromDB`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `db_to_json`, `flatjson_to_json`, `resultToObjects`
- **Links:** [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine"), [OQ-709](../../QUESTIONS.md#oq-709 "How are the experimental DB sources activated"), [DEBT-729](view_debt.md#debt-729-experimental-db-path-is-unreachable-and-half-built "Experimental DB path is unreachable and half-built")

## BEH-741: SQLiteDB.js: SQL console and database sources

Module script (top-level `await`), loads sql.js 1.10.3 from cdnjs (`initSqlJs` expected on `window`), creates an empty `SQL.Database()` stored in
`let db` and `window.db`. `<input type=file id=upload>` (accept `.sqlite`): reads the file and replaces the module-local `db`
(NOT `window.db`, so `loadTracksCSVFromDB` keeps using the previous database, [DEBT-730](view_debt.md#debt-730-sqlitedbjs-upload-replaces-only-the-module-local-db "SQLiteDB.js upload replaces only the module-local db"); no try/catch, no file selected
throws). `window.loadDatabaseFromUrl(url)`: fetch (error on non-OK status, logged), `new SQL.Database(bytes)`,
assigns both `db` and `window.db`. `#run` button executes `#query` text with `db.exec`, shows the first result as a table in `#output`
with the elapsed ms, or "No results." or "SQL Error: <message>". The DOM elements (`#upload`, `#query`, `#run`, `#output`, `#premade-queries`) belong to
a "SQLite Console" tab in `labelbee_page.html` that, like the script tags for `SQLiteDB.js` and `DuckDB.js`, is commented out: in the shipped page this
code is not loaded and `db` is undefined.

- **Group:** [CAP-706](view_capabilities.md#cap-706-experimental-db-sources "Experimental DB sources")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/SQLiteDB.js](../../../labelbee/static/labelbee/js/SQLiteDB.js): `loadDatabaseFromUrl`, `run_click`, `renderTable`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `SQLite Console tab (commented out)`
- **Links:** [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine"), [OQ-709](../../QUESTIONS.md#oq-709 "How are the experimental DB sources activated"), [DEBT-730](view_debt.md#debt-730-sqlitedbjs-upload-replaces-only-the-module-local-db "SQLiteDB.js upload replaces only the module-local db")

## BEH-742: DuckDB.js: DuckDB-WASM console (not connected to Tracks)

Module script (top-level `await`) imports duckdb-wasm 1.12.0 (pinned) and apache-arrow `@latest` (unpinned) from jsDelivr, starts an `AsyncDuckDB` in a worker, opens one
connection (`duck.db`, `duck.conn`, all on `window.duck`). Functions: `duck.on_change_upload` (on `#upload` change: registers the file handle and runs
`ATTACH '<fileName>' AS uploaded_db;`; the listener is registered twice, so it runs twice), `duck.loadCSVFromURL(url, table)` (registers the URL
and runs `CREATE TABLE <table> AS SELECT * FROM read_csv_auto('<file>')`, errors logged), `duck.run_click` (runs `#query`, shows elapsed
ms then a table built from the Arrow result), premade queries in `#premade-queries` ("List tables" `SHOW TABLES`, "Get first rows" `SELECT *
FROM data LIMIT 10;`, "Get track lengths": count of frames per `track_id` ordered descending). There is no code converting DuckDB results into
`Tracks`: `db_to_json` expects the sql.js API (`db.exec`). Not loaded by the page (script tag commented out).

- **Group:** [CAP-706](view_capabilities.md#cap-706-experimental-db-sources "Experimental DB sources")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/DuckDB.js](../../../labelbee/static/labelbee/js/DuckDB.js): `loadCSVFromURL`, `on_change_upload`, `run_click`, `renderTable`, `initQueries`
- **Links:** [OQ-004](../../QUESTIONS.md#oq-004 "Which workflows are routine"), [OQ-709](../../QUESTIONS.md#oq-709 "How are the experimental DB sources activated"), [DEBT-729](view_debt.md#debt-729-experimental-db-path-is-unreachable-and-half-built "Experimental DB path is unreachable and half-built")

## BEH-743: Filename timestamps and Blob downloads

All local saves use `saveBlobToFile(blob, filename)`: create an object URL, append a hidden `<a download=filename>`, click it, never remove the
element nor revoke the URL. JSON is `JSON.stringify(obj)` with MIME `text/json`; CSV uses `text/csv`. `getTimestampNow()` = local time
`YYYYMMDD_hhmmss` (zero-padded, 24h), used for Tracks and Tags JSON names (`<videoinfo.name>-<ts>_Tracks.json`, `..._Tags.json`); CSV exports have
fixed names `Tracks.csv`, `BBoxes.csv`. Saving is the only persistence of local work ([BEH-709](#beh-709-initial-state-of-the-model-at-page-load "Initial state of the model at page load")).

- **Group:** [CAP-702](view_capabilities.md#cap-702-local-file-load-and-save "Local file load and save")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `saveBlobToFile`, `saveObjToJsonFile`, `saveCSVToFile`, `getTimestampNow`
- **Links:** [BEH-713](#beh-713-save-events-to-a-local-file "Save Events to a local file"), [BEH-723](#beh-723-save-tags-to-a-local-file "Save Tags to a local file"), [BEH-738](#beh-738-export-events-csv "Export Events (CSV)"), [BEH-739](#beh-739-export-events-bbox "Export Events (BBox)")

## BEH-744: Ajax error reporting helpers

`typesetAjaxError(title, hook)` returns an error callback that logs and, if `hook` is given, calls it with an HTML block (`title`, `Status`, `Error`, response
text); used by the dialogs ([BEH-725](#beh-725-server-annotation-list-dialog-recent-mode "Server annotation list dialog 'recent' mode"), [BEH-726](#beh-726-server-annotation-list-dialog-advanced-mode "Server annotation list dialog 'advanced' mode"), [BEH-734](#beh-734-label-list-preset-loader "Label list preset loader")). `showAjaxError(title, prehook, onlyConsole)` logs, calls `prehook(jqXHR, textStatus, errorThrown)`, and unless
`onlyConsole` shows the same text in `#mainAlertDialog` via `mainAlert(html)` ([BEH-729](#beh-729-save-events-to-the-server-snapshot "Save Events to the server (snapshot)"), `labelListFromServer`). Response text is injected as HTML
unescaped.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `typesetAjaxError`, `showAjaxError`, `mainAlert`
  - [labelbee/blueprints/labelbee/templates/labelbee_page.html](../../../labelbee/blueprints/labelbee/templates/labelbee_page.html): `#mainAlertDialog`
- **Links:** [BEH-729](#beh-729-save-events-to-the-server-snapshot "Save Events to the server (snapshot)")

## BEH-745: Frame keys and ID types across the formats

Summary of the types a re-implementation must preserve or convert. In memory: frame key = string (from `for..in`), bee ID = string, `Observation.frame` =
number, tag `id` = number (native files, `tracks_tagged`) or string (tags CSV), `tag.frame` = number. v2 file: `data` keys = decimal frame strings; event
`id` = string; `data[f]` = array (order of IDs in `for..in`); `frame` field inside the event is a number. v1 file: top-level array indexed by frame with `null` holes,
dict of ID to event, event keeps `ID` and `bool_acts`. Tags file: dict keyed by frame of `{tags:[...]}`. Round trip v2 save to v2 load preserves all event fields except the
removed four ([BEH-710](#beh-710-events-json-v2-format-data-contract-save-side "Events JSON v2 format (data contract, save side)")) and the rounding to 3 decimals of `x,y,width,height,cx,cy`; `bool_acts` is regenerated from `labels`. Round trip of v1: file `ID`/`bool_acts` used as is. IDs
that are integer-like (`"12"`) iterate in ascending numeric order before non-integer IDs (`T3`); this changes the event order inside a v2 `data[f]` between save and reload but not the content.

- **Group:** [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising")
- **Origin:** essential
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `convertTracksToV2`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [ENT-001](view_entities.md#ent-001-observation-annotation-of-one-bee-in-one-frame "Observation (annotation of one bee in one frame)"), [ENT-002](view_entities.md#ent-002-tag-detection "Tag detection"), [ENT-004](view_entities.md#ent-004-annotation-file--record "Annotation file / record"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [INV-003](view_invariants.md#inv-003-old-annotation-files-stay-loadable "Old annotation files stay loadable"), [OQ-003](../../QUESTIONS.md#oq-003 "What the saved annotations are used for"), [OQ-703](../../QUESTIONS.md#oq-703 "Are v1 events files and ID-less events still produced anywhere"), [BEH-746](#beh-746-a-v2-file-without-data-loads-as-an-empty-model "A v2 file without `data` loads as an empty model")

## BEH-746: A v2 file without `data` loads as an empty model

A loaded object with `info.type == "events-multiframe"` but no `data` key (or `"data": null`, or `"data": []`) is accepted:
`sanitizeEvents` iterates nothing and returns `{info, data: {}}`; `setTracks` then replaces `Tracks` by `{}` and `TracksInfo`
by the file's `info`, refreshes the views, and returns `true`. No alert and no console error: the previously loaded events
are silently discarded.

- **Group:** [CAP-707](view_capabilities.md#cap-707-load-time-sanitising "Load-time sanitising")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `setTracks`
  - [labelbee/static/labelbee/js/annotation/AnnotationCodec.js](../../../labelbee/static/labelbee/js/annotation/AnnotationCodec.js): `sanitizeEvents`
- **Links:** [BEH-717](#beh-717-events-json-v2-format-load-side-via-sanitizeevents "Events JSON v2 format (load side) via sanitizeEvents"), [BEH-720](#beh-720-settracks-replace-the-model-and-refresh "setTracks: replace the model and refresh"), [INV-001](view_invariants.md#inv-001-no-annotation-loss "No annotation loss"), [DEBT-734](view_debt.md#debt-734-v2-file-without-data-replaces-the-model-with-an-empty-one-silently "v2 file without data replaces the model with an empty one silently"), [OQ-714](../../QUESTIONS.md#oq-714 "Is a v2 file without data an empty model or an invalid file")

## BEH-747: Label preset request failure leaves the dialog on its loading message

If the `GET uri` of `labelListFromServer` fails, `showAjaxError("labelListFromServer: ERROR")` runs (console log and
`mainAlert` dialog with title, status, error and response text, [BEH-744](#beh-744-ajax-error-reporting-helpers "Ajax error reporting helpers")). The returned jQuery promise is rejected, and
`onClickFile` registers only a success handler, so the dialog message stays "Loading labels from <url>..." and the dialog
stays open; `labelButtonsArray` is unchanged. If the listing request of `updateDialog` fails, `typesetAjaxError` writes the
error HTML in the dialog message instead.

- **Group:** [CAP-703](view_capabilities.md#cap-703-server-load-and-save "Server load and save")
- **Origin:** accident
- **Code:**
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `labelListFromServer`, `LabelListFromServerDialog`, `showAjaxError`, `typesetAjaxError`
- **Links:** [BEH-734](#beh-734-label-list-preset-loader "Label list preset loader"), [BEH-744](#beh-744-ajax-error-reporting-helpers "Ajax error reporting helpers"), [DEBT-735](view_debt.md#debt-735-labellistfromserver-reports-success-when-nothing-was-loaded-no-error-path-in-the-dialog "labelListFromServer reports success when nothing was loaded, no error path in the dialog")

## BEH-748: Server file picker used by the tracks CSV import

`FilePickerFromServerDialog` (`labelBee.js`, instantiated by `EventsCSVManualFilePicker`) is configured by `initDialog({base_uri,
loadFileFunction, fileLoadedCallback, dialogName, hideOnSuccess})`; here `base_uri` is `/api/v1/rawdata/`, `loadFileFunction`
calls `loadTracksCSVFromServer(uri)` and `dialogName` is "Load tracks CSV Manually". `openDialog` does nothing (console error)
if `#dialog-filepicker-from-server` is missing or `base_uri` is unset; otherwise it sets the title, binds the buttons
`.dir-uri-btn` and `.dir-uri-btn-preview`, shows the body "[...]" and the message "Loading file list from server. Please wait...",
opens the modal and requests `GET <route>` with `{format:"json"}`. The reply must be an object with `files` and `dirs`, else the
body shows "No valid JSON" and the message "Format error in server response". Each file becomes a button labelled
"<filename> [data]" when `download_uri` is set (the button carries that URI) or "<filename>[api]" otherwise (carries `uri`);
each directory a button with its `uri`; the `.dir-uri-text` input shows the current route. A request failure is silent
([DEBT-732](view_debt.md#debt-732-filepickerfromserverdialog-error-handler-never-reports "FilePickerFromServerDialog error handler never reports")). Click handlers: a directory button calls `updateDialog(uri)` (lists that directory); a file button only
copies its `data-uri` into `.dir-uri-text` and calls `previewFile(null)` (the direct `loadFile` call is commented out);
`.dir-uri-btn` (`onClickLoad`) calls `loadFile(<.dir-uri-text value>)`. The bodies of `previewFile` and `loadFile`
(and how they reach `loadFileFunction`) were not in the evidence (inferred).

- **Group:** [CAP-704](view_capabilities.md#cap-704-external-tool-import "External-tool import")
- **Origin:** intentional
- **Code:**
  - [labelbee/static/labelbee/js/labelBee.js](../../../labelbee/static/labelbee/js/labelBee.js): `FilePickerFromServerDialog`
  - [labelbee/static/labelbee/js/AnnotationIO.js](../../../labelbee/static/labelbee/js/AnnotationIO.js): `EventsCSVManualFilePicker`
- **Links:** [BEH-735](#beh-735-import-of-a-tracks-csv-tracks_csv_to_json "Import of a tracks CSV (tracks_csv_to_json)"), [DEBT-732](view_debt.md#debt-732-filepickerfromserverdialog-error-handler-never-reports "FilePickerFromServerDialog error handler never reports"), [CAP-100](view_capabilities.md#cap-100-manage-data-and-users "Manage data and users")
