# Behaviors: Annotation model and IO (CAP-700)

Conventions: [../README.md](../README.md). IDs of this file: BEH-701..., DEBT-701..., OQ-701..., SEAM-701....
All items are `status: draft`, `confidence: inferred` (read from code, nothing run) unless stated.
Items revised after the critic review cite the code excerpts read for that review; claims whose code was not
re-read there are marked `(inferred ...)` in the text and stay unverified.
Server-side endpoints are specified by group 1 (CAP-100), selection and undo by group 6 (CAP-600): this
file only describes what the client sends and expects. Per DEC-004 the code is the reference; defects are
recorded as DEBT, not specified as intended behavior.

## Contents

<!-- toc -->

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

- **Group:** CAP-701
- **Origin:** essential
- **Code:**
  - `Model.js`: `Observation`, `getObsHandle`
  - `OverlayControl.js`: `addRect`
  - `SelectionControl.js`: `undo`
- **Links:** ENT-001, DEC-003, DEBT-701

## BEH-702: Tracks container: frame then bee ID

The global `Tracks` is indexed by frame (key = frame number, string or integer; iterated with `for..in`,
so keys are strings) then by bee ID (string). It starts as `[]` (`Model.js`) and is replaced as a whole by
`setTracks` (BEH-720); an array and a plain object are both accepted as container. Absent frame or
absent ID reads as "no observation": `obsDoesExist(frame,id)` is false when `Tracks[frame]` is null/undefined or
`Tracks[frame][id]` is null/undefined. `getObsHandle(frame,id,createIfEmpty=false)` returns the live
object (not a copy) or `undefined`; with `createIfEmpty` it creates the missing frame object `{}` and a
`new Observation(id)`. Deleting an observation (`delete Tracks[f][id]`, done by other modules) leaves an
empty `{}` frame object; it is kept (and saved, BEH-709, BEH-712).

- **Group:** CAP-701
- **Origin:** essential
- **Code:**
  - `Model.js`: `Tracks`, `obsDoesExist`, `getObsHandle`
- **Links:** ENT-001, INV-001

## BEH-703: Valid IDs of a frame or interval

`getValidIDsForFrame(frame)` returns the array of keys of `Tracks[frame]` whose value is not null
(`[]` if the frame is absent); key order is JS `for..in` order (integer-like keys ascending, other keys such as
`T12` in insertion order). `getValidIDsForFrames([fmin,fmax])` returns the union over `fmin..fmax`
inclusive, as an array of unique IDs in first-seen order (no `-1` special value here).

- **Group:** CAP-701
- **Code:**
  - `Model.js`: `getValidIDsForFrame`, `getValidIDsForFrames`
- **Links:** ENT-001

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

- **Group:** CAP-701
- **Origin:** accident
- **Code:**
  - `Model.js`: `storeObs`, `copyObs`, `cloneObs`, `deepcopy`
  - `SelectionControl.js`: `deleteEvent`
  - `OverlayControl.js`: `addRectFromObs`, `addRect`
- **Links:** ENT-001, DEBT-702, INV-001, OQ-701

## BEH-705: changeObservationID(frame, old_id, new_id, force)

Renames the observation `Tracks[frame][old_id]` to `new_id` and sets its `.ID`; returns `true` if a change was
performed, else `false` (never throws). Returns `false` without change when: `old_id == new_id`; the frame
has no entry (`Tracks[frame]` null); `new_id` already exists and `force` is falsy; `old_id` does not exist.
`force` values: falsy = abort on collision; `true` = overwrite the existing `new_id` observation (it is
lost); `'swap'` = the observation previously at `new_id` is moved to `old_id` (its `.ID` updated), i.e. a swap.
When `force` is truthy but `new_id` does not exist it simply renames. The observation `frame` field is not
touched. Logs to the console on each abort.

- **Group:** CAP-701
- **Origin:** essential
- **Code:**
  - `Model.js`: `changeObservationID`
- **Links:** ENT-001

## BEH-706: Frames with an ID, with two IDs, and interval ID swap

`getFramesWithID([fmin,fmax],id)` returns the frames in the inclusive interval where `id` exists;
`getFramesWithSwapID([fmin,fmax],id,new_id)` the frames where both exist. `fmax == -1` means
`videoinfo.nframes-1`. `obs_swapID([fmin,fmax],old_id,new_id)` for each frame in the interval where `old_id`
exists: if `new_id` also exists it is parked under the temporary ID `SWAP_save_<new_id>`, `old_id` is renamed to
`new_id`, then the parked observation is renamed to `old_id`; net effect is a swap in frames where both exist
and a plain rename where only `old_id` exists. Frames where `old_id` does not exist are skipped (so an
observation of `new_id` alone is not moved). Uses `changeObservationID` with `force` undefined.

- **Group:** CAP-701
- **Origin:** essential
- **Code:**
  - `Model.js`: `getFramesWithID`, `getFramesWithSwapID`, `obs_swapID`
- **Links:** BEH-705, CAP-602

## BEH-707: Tags container and the (frame,id) tag cache

The global `Tags` is indexed by frame; each entry is `{tags:[tag,...]}` (a list per frame, several tags may
share an id). It starts as `[]` and is replaced by `setTags` (BEH-724). `cacheTags()` builds the global `tagCache`
(assigned without declaration) with keys `"<frame>,<id>"` (id as string) and `getTags(frame,id)` returns
`tagCache[key]` (list, or `undefined`). Intended: the list holds all tags of that frame and id. Actual: the
test `typeof ttags[key]` reads the wrong variable (`ttags`, keyed by bee id) so it is always
`"undefined"` and each tag overwrites the previous one: the list has exactly one element, the last tag
of that frame and id (DEBT-703). `getTags` throws if `cacheTags` was never called (`tagCache`
undefined); the only caller (`computeMotionDirection`) calls `cacheTags` first.

- **Group:** CAP-701
- **Origin:** accident
- **Code:**
  - `Model.js`: `Tags`, `cacheTags`, `getTags`
- **Links:** ENT-002, DEBT-703

## BEH-708: Runtime-only fields of an observation, and what leaks into saves

Besides the edited fields, live observations carry fields added by other modules: `tag` (the tag object
of the same frame and id, assigned by reference (not copied) by `augmentTrackWithTag` in `ChronoControl.js` for each
`Tracks[F][id]` that has a tag with the same `String(id)`, or embedded by the `tracks_tagged` import, BEH-736;
`augmentTrackWithTag` is called only at the start of `updateChronoData`, i.e. at every `refreshChronogram`; it never
removes a `tag`, so after the tags are replaced or erased the old `obs.tag` values stay), `span` (`{f1,f2}`, written by
`modifyCurrentObsSpan` in `SelectionControl.js` directly on the stored observation `Tracks[frame][id]`: initialised
from the matching flat track's span when `obs` has none, then moved by 10 frames per
`extendleft`/`extendright`/`restrictleft`/`restrictright`, with f1 kept >= 0 and f1 <= obs.frame <= f2), `fix` and `newid` (tag fix / wrong id), `visit`, `parts`. None of these is excluded by the v2 save
(BEH-710): `tag` is written as a nested copy of the whole tag record (with its `frame`, `c`, `p`, ...) whenever
it is present in memory (after tags were loaded and a chronogram refresh ran), and `span` is written. ENT-001 states that `tag`
is not saved: that is not true of the code.

- **Group:** CAP-701
- **Origin:** accident
- **Code:**
  - `Model.js`: `copyObs`
  - `annotation/AnnotationCodec.js`: `convertTracksToV2`
  - `ChronoControl.js`: `augmentTrackWithTag`
  - `SelectionControl.js`: `modifyCurrentObsSpan`
- **Links:** ENT-001, DEBT-704, OQ-702

## BEH-709: Initial state of the model at page load

`initAnnotationIO()` (called from `labelBee.js` init) registers `change` listeners on `#load` and `#loadtags`,
creates the global dialogs `labelListFromServerDialog`, `fromServerDialog`, `pickEventsCSVDialog`, resets
`ttags = []` and binds `input` on `#events-notes`. Later in init `setTracks([], true)` is called, which sets
`Tracks = []` and `TracksInfo = {type:"events-multiframe", source:"Converted from Tracks v1 object"}` (empty array
goes through the v1 branch, BEH-718) without refreshing views. `Tags` stays `[]` and `TagsInfo` is
undefined until the first `setTags`. A `beforeunload` handler (`window.onbeforeunload`, set in the `labelBee.js` init, right
after `whoami()` and just before `setTracks([], true)`) returns the message "If you leave this page, all unsaved
annotations will be lost. Are you sure?" on every page leave, whether or not there are unsaved changes (no dirty flag).
There is no autosave.

- **Group:** CAP-701
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `initAnnotationIO`, `setTracks`
  - `Model.js`: `Tracks`, `Tags`
  - `labelBee.js`: `~window.onbeforeunload handler and setTracks([], true) in init`
- **Links:** INV-001, DEBT-705, OQ-710

## BEH-710: Events JSON v2 format (data contract, save side)

Produced by `convertTracksToV2()` for "Save Events (JSON v2)", for the server save and used by nothing else.
Shape:

```
{ "info": { ...TracksInfo..., "formatnote": "<fixed warning text>",
            "history": [ ...previous entries, "Saved using labelbee on <Date()>" ],
            "videoinfo": <deep copy of the current videoinfo object> },
  "data": { "<frame>": [ <event>, ... ], ... } }
```

`info` is a deep copy of `TracksInfo` (BEH-711; it was the live object before slice 2 step 4): all its fields round-trip (`type` must be
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
width, height, cx, cy` are always written (a missing one gives `NaN`, serialized as `null`). The OQ-003 answer ("all
`Observation` fields are preserved on load and save") is not what the code does for the four removed fields:
`ID` and `bool_acts` are rebuilt at load (BEH-717) while `marked` and `permanent` are lost.

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `saveObjToJsonFile`
  - `annotation/AnnotationCodec.js`: `convertTracksToV2`
- **Links:** ENT-004, INV-001, INV-003, OQ-003, OQ-712, OQ-715, BEH-711, BEH-708, BEH-712

## BEH-711: Saving v2 works on copies of TracksInfo and videoinfo (fixed; was: mutated TracksInfo, failed after a CSV import)

FIXED in slice 2 step 4 (DEBT-706). `convertTracksToV2` works on deep copies (`structuredClone`) of
`TracksInfo` and `videoinfo`: on the copy it sets `info.formatnote`, makes `info.history` an array (a string, as
set by every tracks CSV / `tracks_tagged` CSV / DB import (BEH-735, BEH-736, BEH-737, BEH-740), becomes
`[string]`; a missing history becomes `[]`), appends `"Saved using labelbee on " + Date()` and embeds the whole
`videoinfo` (OQ-712: kept whole, `preview` is only a URL). The live objects are not modified, so saves of one
session do not accumulate: each saved file lists the history as loaded plus its own save (maintainer decision,
2026-11-12). Before the fix the function modified the live `TracksInfo` in place (each save added a history
entry that later saves also listed) and `.push` threw `TypeError` on a string history, so the file and the
server save aborted after every CSV import, after `formatnote` had been set. An undeclared `TracksInfo` (no
`setTracks` ever called) would make the bridge wrapper throw `ReferenceError`; in practice init sets it (BEH-709).

- **Group:** CAP-702
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `eventsToServer`, `saveEventsToFile`
  - `annotation/AnnotationCodec.js`: `convertTracksToV2`
- **Links:** DEBT-706, INV-001, BEH-710

## BEH-712: Events JSON v1 format (the save-mutates-Tracks defect C1 is fixed)

`convertTracksToV1()` (reachable only through `saveEventsToFile('v1')`; the v1 button is commented
out in the page) returns a JS ARRAY indexed by `Number(frame)`: `obj[f] = { "<id>": evt, ... }`, so
JSON.stringify writes `null` for every frame index without observations (holes) and the output length
is `max frame + 1`. Frames with an empty dict are kept as `{}`. Event = a copy of the observation (`Object.assign({}, evt)`, slice 2 step 4, DEBT-707 FIXED; it used to be the live observation itself, so the edits below were applied IN PLACE on `Tracks`, analysis C1). The copy gets: fields `marked` and `permanent` are deleted; `cx = x + width/2`,
`cy = y + height/2`; `x, y, width, height, cx, cy` rounded to 3 decimals. `ID` and `bool_acts`
are kept in v1 (the deletes are commented out), and `time, frame, angle, notes, labels, parts, tag, span...` stay. Live `Tracks` is no longer changed by a v1 save (before the fix: precision loss of the working coordinates,
`cx,cy` re-derived, `marked`/`permanent` deleted). The UI only exposes v2; v1 is reachable only by calling
`convertTracksToV1`.

- **Group:** CAP-702
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `saveEventsToFile`
  - `annotation/AnnotationCodec.js`: `convertTracksToV1`
- **Links:** DEBT-707, INV-001, INV-003, ENT-004

## BEH-713: Save Events to a local file

Button `#save` ("Save Events (JSON v2)") calls `saveEventsToFile('v2')`; `format` defaults to `"v2"`
when omitted, accepted values `"v1"`, `"v2"` (any other value leaves the object `null`: the code logs
"error while preparing data, Aborted." but does NOT return, then calls `saveObjToJsonFile(null, ...)`,
which downloads the text `null`). Filename: `<videoinfo.name>-<YYYYMMDD_HHMMSS local time>_Tracks.json`
(`getTimestampedVideoname`). `videoinfo.name` is the video file name (or `"No video loaded"`, or the
full `video.src` URL if set by the obsolete `onVideoLoaded`, which would put slashes in the filename). The
blob has MIME `text/json`; the download is triggered by clicking a hidden `<a download>`; the object URL is never
revoked. There is no confirmation and no change of any dirty state.

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `saveEventsToFile`, `saveObjToJsonFile`, `saveBlobToFile`, `getTimestampNow`, `getTimestampedVideoname`
  - `labelbee_page.html`: `#save`
- **Links:** BEH-710, BEH-711, DEBT-708, CAP-702

## BEH-714: Load Events from a local file

The `<label for="load">Load Events</label>` + hidden `<input type="file" id="load">` (no `accept` filter) fire
`loadEventsFromFile` on `change`: takes the first file, resets `input.value = ""` (so the same file can be
reloaded), returns silently if no file; reads it as text with `FileReader`; `onReaderLoad` does `JSON.parse`
(an exception on invalid JSON is uncaught: console only, no message to the user, Tracks unchanged) and
calls `setTracks(obj)` (BEH-720). There is no confirmation: the current `Tracks` is silently replaced even
when it has unsaved work. A wrong-format file is rejected with console logs only (BEH-718/719), no user message.
Console logs the whole file content when `logging.io`. (`loadEventsFromFile0(path)`, a variant that loads via `$.get`,
has no caller except a commented-out line in `labelBee.js`, DEBT-731.)

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `loadEventsFromFile`, `onReaderLoad`
  - `labelbee_page.html`: `#load`
- **Links:** INV-001, INV-003, BEH-720, DEBT-709, DEBT-731, OQ-710

## BEH-715: Erase Events and Erase Tags buttons

`#erase` ("Erase Events...") asks `confirm("Are you sure you want to ERASE all manual annotations
(Tracks)?")`; on OK calls `setTracks([])` (full refresh, `TracksInfo` reset to the v1 dummy info: notes,
history and source of the old file are lost, the notes textarea is cleared);
on cancel nothing. `#eraseTags` ("Erase Tags...") asks `confirm("Are you sure you want to ERASE all Tags?")`;
OK calls `setTags({},"")` which sets `Tags = {}` and refreshes. Neither is undoable (OQ-009).

- **Group:** CAP-702
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `eraseEvents`, `eraseTags`
  - `labelbee_page.html`: `#erase`, `#eraseTags`
- **Links:** INV-001, OQ-009, OQ-710

## BEH-716: Notes for the current events

Textarea `#events-notes` ("Notes for current events"): every `input` event writes its value to
`TracksInfo["notes"]` (if `TracksInfo` is set). `updateEventsNotes()` copies `TracksInfo["notes"]` to the
textarea; it is called by `setTracks` only (so notes of a loaded file appear; a file without notes clears the
textarea, jQuery `.val(undefined)` setting an empty value).
The notes are saved in `info.notes` (BEH-710) and are the only user-editable metadata.

- **Group:** CAP-702
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `onChanged_events_notes`, `updateEventsNotes`
  - `labelbee_page.html`: `#events-notes`
- **Links:** BEH-710

## BEH-717: Events JSON v2 format (load side) via sanitizeEvents

A loaded object that has the key `info` (`"info" in obj`) is read as v2: `info.type` must be exactly
`"events-multiframe"`, else console message "unsupported file format" and the function returns `undefined`
(load rejected). `data` (a dict keyed by frame, values iterated with `for..in`, so both v2 arrays and CSV-import
dicts work) is converted to a new dict of dicts: for each non-null frame and non-null event `evt0`:
`evt = Object.assign({ID: String(evt0.id)}, evt0)` (so a field `ID` already in the file overrides the
`id`-derived one, and the `id` field is then deleted; the frame dictionary key is always `String(evt0.id)`, so the key
and `evt.ID` can disagree when the file carries an `ID`, OQ-713), and `evt.bool_acts` is recomputed as
`[hasLabel(evt,"fanning"), hasLabel(evt,"pollen"), hasLabel(evt,"entering"), hasLabel(evt,"leaving")]`
(any `bool_acts` in the file is ignored; `hasLabel` also sets `evt.labels = ""` when `labels` is null or
absent; labels are lower-cased, trimmed, comma-split and passed through the label alias map, see
`normalizeLabel`). All other fields pass through unchanged, including unknown ones, `tag`, `span`,
`visit`, `fix`, `parts`. No defaults are added: a missing `x`, `frame`, `time`, `angle`, `notes` stays missing. No type
coercion (a numeric `id` becomes the string `"12"`; frame keys stay strings). `info` is returned untouched.
Every frame key present in the file, even with an empty list, appears as an empty dict in the result. If `data` is
absent, `null` or `[]`, nothing is iterated and the result is `{info, data: {}}` (BEH-746). If `info` is `null` the
`info["type"]` read throws and is contained (BEH-719).

- **Group:** CAP-707
- **Origin:** essential
- **Code:**
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
  - `SelectionControl.js`: `hasLabel`
- **Links:** ENT-004, INV-003, DEC-003, BEH-719, BEH-746, OQ-703, OQ-713

## BEH-718: Events JSON v1 format (load side) via sanitizeEvents

An object WITHOUT an `info` key is read as v1: a JSON array (or object) indexed by frame, each entry a dict
`{id: event}` (null entries for holes are kept as `null`). A dummy `info = {type:"events-multiframe",
source:"Converted from Tracks v1 object"}` is created for an object; for a JSON array the source is
"Converted from Tracks v1 array" and `data` is a plain object keyed by array index (holes skipped, `null`
entries kept; fixed in slice 1 step 4, DEBT-710). For an object, `data = obj` is used directly (no copy, no
ID normalization, no recomputation of `bool_acts`, no `ID` created: the file's own `ID` and
`bool_acts` fields are the ones used, so a v1 file lacking `bool_acts` yields observations that later break
CSV/BBox export, BEH-738, BEH-739). Validation: every key of `data` must match `/^(0|[1-9]\d*)$/`; otherwise the load
is rejected (console message). A JSON `null` and any primitive (number, string, boolean) throw a `TypeError` at the
initial `"info" in obj` test, inside the `try`: caught, logged with `console.error`, load rejected. So the later
branch for a non-object ("Should be either array of frames, or object...") is unreachable (DEBT-710).
Note `setTracks([])` (init, erase) takes this branch.

- **Group:** CAP-707
- **Origin:** intentional
- **Code:**
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** ENT-004, INV-003, DEBT-710, DEBT-711, OQ-703

## BEH-719: Load-time duplicate handling and error containment

In the v2 branch, if two events of one frame have the same `id`, the first is kept, the later ones are
dropped (console warning for each), and after the whole file `alert("WARNING: Events file was loaded, but it has
duplicate entries. Current version of software deleted redundant events.")` is shown once. Any exception
while reading (wrong structure) is caught: `console.error`, `sanitizeEvents` returns `undefined`, and
`setTracks` returns `false`: no change to the model and no visible message for local files. v2 events with
`id` missing become the ID `"undefined"` (and collide with each other, being treated as duplicates).

- **Group:** CAP-707
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `setTracks`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** INV-003, DEBT-709, BEH-717, OQ-711

## BEH-720: setTracks: replace the model and refresh

`setTracks(obj, skipRefresh)` runs `sanitizeEvents`; on failure logs "ABORTED, wrong format." and returns
`false` (model untouched). On success: `Tracks = evts.data`, `TracksInfo = evts.info` (both globals replaced,
previous content discarded), `updateEventsNotes()`, then unless `skipRefresh`: `videoControl.onFrameChanged()` and
`refreshChronogram()`; returns `true`. Callers (server load, CSV import, DB import) call
`videoControl.onFrameChanged()` and `refreshChronogram()` again after it (double refresh). It does
not clear the selection, the undo stack, nor `fromServerDialog.basedOn`.

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `setTracks`, `setEventsProp`
- **Links:** CAP-701, INV-001, BEH-715, BEH-746, DEBT-712, OQ-710

## BEH-721: Tags JSON v1 and v2 formats

Tag files are dicts keyed by frame: `{ "<frame>": { "tags": [ {id, c:[x,y], p:[[x,y]*4], hamming,
goodness, dm?, frame?} ] } }`. v2 wraps this as `{info:{type:"tags-multiframe", "data-format":"root.data[frame].tags[id_in_frame]"},
data:<the dict>}`. Producer: `saveTagsToFile('v2')` writes exactly that with `data: Tags` (the live global; after load it includes
the `frame` field added by `tagsAddFrames`, a number). v1 (`saveTagsToFile('v1')`, no button) writes the bare dict.
Loading: an object with `info` must have `info.type == "tags-multiframe"` (else console message, returns 0)
and `obj = obj.data`; an object without `info` is v1 and is accepted if `typeof obj == "object"`. The v1 key check
reads the OLD global `Tags` instead of the loaded `obj` (DEBT-713), so it never validates the file. In both
cases the file's `info` is discarded and replaced by `TagsInfo = {type:"tags-multiframe", source:"Converted from Tags v1"}`
(even for v2). A `null` or primitive throws a `TypeError` at `"info" in obj`, inside the `try`, and is caught (returns 0), so the
`typeof obj != "object"` rejection branch is unreachable. Tag ids are ints in
native files; the tags CSV import produces string ids (BEH-737).

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `setTags`, `saveTagsToFile`
  - `annotation/AnnotationCodec.js`: `tagsAddFrames`
- **Links:** ENT-002, ENT-004, INV-003, DEBT-713, BEH-724

## BEH-722: Load Tags from a local file

Hidden `<input type="file" id="loadtags">` (label "Load Tags") fires `loadTagsFromFile` on `change`: first
file, input value reset, silent return if none; `FileReader.readAsText`; `onTagsReaderLoad` does
`JSON.parse` (invalid JSON: uncaught exception, no message) and `setTags(obj)` (BEH-724). The success/fail
return of `setTags` is ignored; the console logs "importing from JSON file. DONE" regardless. No confirmation
before replacing the existing `Tags`.

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `loadTagsFromFile`, `onTagsReaderLoad`
  - `labelbee_page.html`: `#loadtags`
- **Links:** BEH-724, BEH-721

## BEH-723: Save Tags to a local file

Button `#savetags` ("Save Tags (v2)") calls `saveTagsToFile('v2')`. Filename `<videoinfo.name>-<timestamp>_Tags.json`
(same helper as BEH-713). Unknown `version` only logs an error. The `obj` of the v2 branch is an
undeclared global (`obj = {...}`), which overwrites any global named `obj`. Tags are never saved to the
server by the client (there is no tag-save request).

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `saveTagsToFile`, `getTimestampedVideoname`
  - `labelbee_page.html`: `#savetags`
- **Links:** BEH-721, DEBT-714

## BEH-724: setTags: replace tags and refresh

Parse stage (inside a `try`): returns `0` and leaves `Tags` unchanged when the object has `info` with `info.type !=
"tags-multiframe"`, or when the object is `null` or a primitive (`"info" in obj` throws, caught with `console.error`).
For an accepted v2 object `obj = obj.data` (so a v2 file without `data` sets `obj` to `undefined`, DEBT-733). Then the
apply stage runs OUTSIDE the `try`, in this order: `Tags = obj`, `TagsInfo` = dummy info (BEH-721), `tagsAddFrames(Tags)`
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

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `setTags`
  - `annotation/AnnotationCodec.js`: `tagsAddFrames`
  - `ChronoControl.js`: `getTTags`
- **Links:** ENT-002, CAP-502, BEH-721, DEBT-715, DEBT-733, DEBT-736

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

- **Group:** CAP-703
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `FromServerDialog`, `openRecentLoadingDialog`
  - `labelbee_page.html`: `#tagsFromServer`, `#from-server-dialog`
- **Links:** OQ-010, DEC-002, DEBT-716, CAP-100, OQ-705

## BEH-726: Server annotation list dialog "advanced" mode

Ticking "Show advanced loading menu" calls `showAdvancedLoadingDialog(false)`: title "Advanced <type> loading menu
for <videoPath>", checkboxes "Show advanced loading menu" (checked; unticking returns to recent mode), "Show
files from all users" (`#showAllUsers`, toggles `allusers` true/false and refetches) and the type `<select>` (changing sets
`data_type` and refetches with `allusers=false`, even if the all-users box was ticked). Request: `GET api/v1/annotations` with
`video_id`, `data_type`, `allusers` (sent as the strings `"true"`/`"false"` by jQuery). The body is a DataTable
(`#TagOrEventFileListFromServer`; columns: button "Load #<id>" (calls `fromServerDialog.loadEvents('<row index>')`),
file name, created on (`T` replaced by space), `[created_by_id] created_by`). Request error: the handler passes the HTML as
the first parameter of `setMessage(color, html)` (the HTML is used as CSS colour and the content argument is
`undefined`, which jQuery `.html()` does not set, so no error text appears, DEBT-717). Unlike the recent mode, there is no "No video loaded" guard: the request is sent with whatever `videoManager.currentVideoID`
holds. The row index passed to `loadEvents` is a counter incremented at each render call of the id
column, so it matches the row only if DataTables renders each cell exactly once in data order (DEBT-717).

- **Group:** CAP-703
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `showAdvancedLoadingDialog`
- **Links:** DEBT-717, OQ-705, CAP-100

## BEH-727: Loading an event (Tracks) file from the server

`fromServerDialog.loadEvents(k)` (event type) takes `id = theDialog.json[k].id`, sends `GET api/v1/annotation/<id>`
and on success parses `response.data.data` with `JSON.parse` (the saved text payload, v2 JSON, BEH-710; invalid JSON
throws uncaught in the callback and the message stays on "Loading ...") and calls `setTracks(obj)` (same sanitizing as
local, BEH-717), then `onFrameChanged` and `refreshChronogram` again, whether or not `setTracks` succeeded. On
success sets `fromServerDialog.basedOn = id` (used as `created_from_id` at the next save, BEH-730) and the
message "Events loaded." (the dialog stays open). If `setTracks` returns false: the code selects `.modal-message h4`
to show a red error; that selector matches nothing: every dialog message is written with `setMessage(color, html)`, which sets
the content of `.modal-message` itself (and `resetAllHTML` clears it when the dialog opens), so no `h4` exists inside it
(DEBT-718). The messages also read `this.dataType`, while the dialog assigns `this.data_type`. Request error: same invisible handler. The payload `data.data` being a string is a
server-side contract (group 1). The "Loading ..." progress message has the same invisible selector.
Unsaved current Tracks are replaced without confirmation (only the dialog warning text).

- **Group:** CAP-703
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `loadEvents`
- **Links:** OQ-010, DEBT-718, BEH-730, INV-001, CAP-100

## BEH-728: Loading a tag file from the server

`loadEvents(k)` in tag mode calls `tagsFromServer(id, dialogDiv)`, which sets `statusWidget` "tagsLoad" to
requesting and `GET rest/v2/annotation/<id>` as JSON. A search of `labelbee/` finds no route string `rest/v2/annotation` (the `rest/v2/` routes in
`labelbee/legacy/views.py` are `videolist`, `videodata`, `datasets`, `edit_video/<id>`, `get_video_data/<id>`,
`get_video_data_raw/<id>`, `edit_video_data/<id>`, `add_video_data`, `get_video/<videoid>`, `delete_video/<videoid>`,
`get_video_info/<videoid>`, `import_from_csv`, `update_paths`, `populate_datasets`, `fix_datasets`; the annotation routes are
under `/api/v1/`, OQ-706), so the call is expected to fail with 404: the fail handler sets the status to failed and calls `setTags([], div)`, which
replaces the current `Tags` by an empty one. On a (hypothetical) success it reads `response.data.data` as the tag
object (not parsed from a string) and `setTags` it; `null` gives a red message "Tag data stored in server is null." The
function returns `undefined` immediately (asynchronous call), so `loadEvents` always takes its "ERROR setTags: Invalid
tag information" branch (invisible, see BEH-727) and never sets `basedOn` for tags. Net: server tag loading does not
work in the repo as read; tags are loaded from local files (BEH-722) or from the CSV import (BEH-737). Also called with a URL from
the obsolete `VideoControl.onVideoLoaded`.

- **Group:** CAP-703
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `tagsFromServer`, `loadEvents`
- **Links:** DEBT-719, OQ-706, ENT-002

## BEH-729: Save Events to the server (snapshot)

Button `#eventsToServerV2` ("Save Events (JSON v2)", class `require-server`, greyed when `whoami` says not
authenticated, BEH-733) calls `eventsToServer('v2')`. The argument is only used in the success message: the payload is
always `JSON.stringify(convertTracksToV2())` (BEH-710). `POST /api/v1/annotations` (form-encoded by jQuery, JSON
response) with fields `video_id = videoManager.currentVideoID`, `created_by_id = user_id` (global set by `whoami`),
`data_type = "event"`, `data` (the JSON text), `created_from_id = fromServerDialog.basedOn`. Undefined values
(`basedOn` never set, not logged in) are sent as empty strings. Success: `alert()` with "Save Events JSON (v2) to
server: Success." and the fields `created_by_id, file_name, path, data_type, id, created_from_id, video_id,
timestamp` of `response.data`. Failure: `mainAlert` dialog with title, status, error and response text. A save always
creates a new record (snapshot, DEC-002); the client does not update `basedOn` to the new record id, so successive
saves from one session share the same `created_from_id`. No video loaded: `video_id` is undefined and the server decides.
Tags and `TracksInfo.notes` travel inside the JSON.

- **Group:** CAP-703
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `eventsToServer`, `showAjaxError`, `mainAlert`
  - `labelbee_page.html`: `#eventsToServerV2`
- **Links:** DEC-002, ENT-004, INV-001, OQ-010, DEBT-706, DEBT-720, CAP-100

## BEH-730: Lineage: created_from_id comes from the last server load

`fromServerDialog.basedOn` is set to the id of the server file after a successful event load (BEH-727) (and in the
tag branch, never reached). It is not reset by `setTracks`, erase, local-file load, CSV import, or video change, and is
sent as `created_from_id` at every server save. A local-file load followed by a server save therefore records the
lineage of an earlier unrelated server load. The `setEventsProp("basedon", ...)` approach (info.basedon) is
commented out.

- **Group:** CAP-703
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `loadEvents`, `eventsToServer`, `setEventsProp`
- **Links:** DEC-002, DEBT-721, OQ-707

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

- **Group:** CAP-703
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `loadEventsFromServerByID`
  - `labelBee.js`: `~onhashchange handler`
- **Links:** DEBT-722, CAP-202

## BEH-732: Deprecated server list loaders

`tracksListFromServer()` (comment "DEPRECATED") fills `#loadTracksFromServerDialog .modal-body` (no such element exists in
`labelbee_page.html`) with a table from `GET /rest/events/?format=json&video=<videoName>`; each row button calls
`eventsFromServer(uri)`, which does `GET <uri>`, `setTracks(response)` (the response already parsed JSON) and
hides `#loadTracksFromServerDialog`. Neither is reachable from the page (no caller found). `formattimestamp`
formats 12-digit timestamps `YYMMDDhhmmss` as `20YY-MM-DD hh:mm:ss`.

- **Group:** CAP-703
- **Origin:** debt
- **Code:**
  - `AnnotationIO.js`: `tracksListFromServer`, `eventsFromServer`, `formattimestamp`
- **Links:** DEBT-723

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

- **Group:** CAP-703
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `whoami`, `ajaxlogin`, `ajaxlogout`, `LoginDialog`, `try_login`, `try_logout`
  - `VideoList.js`: `~user_data.is_authenticated readers in the video list loader`
- **Links:** CAP-100, DEBT-724

## BEH-734: Label list preset loader

`Preset...` button (next to the label buttons) calls `labelListFromServerDialog.openDialog()`: shows `#dialog-labellist-from-server`
(body "[...]", message "Loading labelList file list from server. Please wait..."), then `GET /rest/config/labellist/` (or a
directory URI) with `{format:"json"}`; expects `{files:[{uri,filename}], dirs:[{uri,filename}]}` and renders one button per
file and per directory (a directory click lists it). A payload lacking `files` or `dirs` makes the success callback throw
(`for..of` on `undefined`) and the dialog stays on its loading message. File click: `labelListFromServer(uri)` does `GET uri`
and returns the `$.ajax` promise; on success, if `obj.labelButtonsArray` is present it assigns the global
`labelButtonsArray` and calls `hardRefreshLabelTogglePanel()`; if it is absent the callback logs and returns `false` (the
return value is ignored) and nothing is assigned. In both cases the promise resolves, so `onClickFile` then writes "Labels
loaded. Closing." and closes the dialog. This is configuration, not annotation data; labels are generic (DEC-003).

- **Group:** CAP-703
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `LabelListFromServerDialog`, `labelListFromServer`
- **Links:** DEC-003, CAP-601, BEH-747, DEBT-735

## BEH-735: Import of a tracks CSV (tracks_csv_to_json)

Entry points: link "from URI" (`clickLoadTracksCSVFromServer`: `prompt("Enter tracks URL", <default
/data/datasets/bee_feeder/tracks/bf-cn_2025-01-30_01.cfr.mp4.tracks.csv>)`; empty/cancel: nothing) and link "from /data"
(`pickEventsCSVDialog.open()`: `EventsCSVManualFilePicker`, a `FilePickerFromServerDialog` defined in `labelBee.js`
over `/api/v1/rawdata/`, titled "Load tracks CSV Manually", BEH-748, which calls `loadTracksCSVFromServer(uri)`). `d3.csv(url)` parses it (no `.catch`: network or parse errors are silent, only unhandled
promise rejection) and `tracks_csv_to_json` converts each row (all CSV values are strings). Row to event: `id = track_id`
(string), `frame = +frame`, `cx = +cx`, `cy = +cy`, `angle = +angle + 90`, `width = 300`, `height = 600`,
`x = cx - 150`, `y = cy - 300`, `bool_acts = [false x4]`, `labels = ""`, `parts` = for each of head, neck, thorax, waist, tail with
`+<name>_visibility > 0`: `{posFrame:{x:+<name>_x, y:+<name>_y}, label:<name>}`. Not set: `time`, `notes`, `ID`. Structure
`{frame: {track_id: item}}` keyed by the row's raw `frame` string (a repeated `track_id` in a frame overwrites the earlier row).
`info = {type:"events-multiframe", source:'Converted from CSV "<url>"', history:"Loaded in Labelbee on <ISO date>"}`
(history is a STRING, BEH-711). Then `setTracks(obj)` (goes through the v2 branch of sanitizing), `onFrameChanged`,
`refreshChronogram`. The 300x600 box and +90 angle are fixed conventions of the external producer (DEC-001), not read from the file.

- **Group:** CAP-704
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `clickLoadTracksCSVFromServer`, `loadTracksCSVFromServer`, `EventsCSVManualFilePicker`
  - `annotation/AnnotationCodec.js`: `tracks_csv_to_json`
  - `labelBee.js`: `FilePickerFromServerDialog`
  - `labelbee_page.html`: `~Server storage panel (from URI, from /data)`
- **Links:** DEC-001, OQ-002, OQ-708, DEBT-725, DEBT-706, BEH-748

## BEH-736: Import of a tracks_tagged CSV

Link "gurabo4 video+tracks_tagged" (`clickLoadTracksTaggedCSVFromServer`): `prompt("Enter gurabo4 col_videoname", "col10/9_02_R_190809120000.cfr.mp4")`
(empty/cancel: nothing); loads the video `<url_for(/data)>/datasets/gurabo4/mp4/<name>` with
`videoManager.loadVideoManual`, and the tracks from `.../datasets/gurabo4/tracks/<name>.tracks_tagged.csv` (hard-coded dataset
name `gurabo4`). `tracks_tagged_csv_to_json` is as BEH-735 except: event `id` = `"T" + track_id` when `track_tagid` is null or empty,
otherwise `String(+track_tagid)`; if `tag_id` is non-empty an embedded `tag` object is attached to the event:
`{id:+tag_id, frame:+frame, c:[+tag_cx,+tag_cy], hamming:+tag_hamming, goodness:+tag_goodness, dm:+tag_dm,
p:[[+tag_p0x,+tag_p0y],...[+tag_p3x,+tag_p3y]]}`. The `Tags` global is not touched (tags live in `obs.tag`; consumers
select with `tagMode == 'Tracks'`). The video load and the CSV load are not sequenced (CSV fetch starts immediately).

- **Group:** CAP-704
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `clickLoadTracksTaggedCSVFromServer`, `loadTrackTaggedCSVFromServer`
  - `annotation/AnnotationCodec.js`: `tracks_tagged_csv_to_json`
  - `labelbee_page.html`: `~Server storage panel (gurabo4 link)`
- **Links:** DEC-001, INV-003, ENT-002, OQ-708, CAP-402, BEH-708

## BEH-737: Import of a tags CSV (Tracks and Tags together)

`loadTagsCSVFromServer(url)` (no button or caller in the page; console only) loads one CSV and builds both: `tags_csv_to_json` gives
Tracks as BEH-735 but with `id = <row>.id` (instead of `track_id`), and `tags_csv_to_tagjson` gives Tags: rows with `+dm == 0`
are skipped (their frame still gets an empty `{tags:[]}` entry); item = `{id: <row.id string>, frame:+frame, c:[+cx_tag,+cy_tag],
hamming:+hamming, goodness:+goodness, dm:+dm, p:[[+p0x,+p0y],...,[+p3x,+p3y]]}`; info `{type:"tags-multiframe", source, history:string}`
(replaced by the dummy info in `setTags`). Tag ids are strings here, ints in `tracks_tagged` and native tag files.

- **Group:** CAP-704
- **Origin:** debt
- **Code:**
  - `AnnotationIO.js`: `loadTagsCSVFromServer`
  - `annotation/AnnotationCodec.js`: `tags_csv_to_json`, `tags_csv_to_tagjson`
- **Links:** DEC-001, DEBT-726, ENT-002

## BEH-738: Export Events (CSV)

Button `#saveCSV` calls `saveEventsToCSV` which downloads `Tracks.csv` (fixed name, MIME `text/csv`) built by `tracksToCSV(Tracks)`. Header
`Date,Time (frame),ID,Action,Cargo,Shift`. One line per observation (`for..in` frames then IDs): `nodate,<frame key>,<obs.ID>,<action>,<cargo>,`
(the Shift column is always empty). `action` = join with `;` of, in this order: `fanning` if `bool_acts[0]`, `came in` if
`bool_acts[2]`, `went out` if `bool_acts[3]`; `cargo` = `pollen` if `bool_acts[1]`. Only these four flags are exported (other labels, notes,
geometry, angle are not). No quoting or escaping. A `null` entry or an observation without `bool_acts` (v1 file without them) throws
and nothing is downloaded. (`conc` helper inside is dead code.)

- **Group:** CAP-705
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `saveEventsToCSV`, `saveCSVToFile`
  - `annotation/AnnotationCodec.js`: `tracksToCSV`
  - `labelbee_page.html`: `#saveCSV`
- **Links:** DEC-003, DEBT-727, OQ-003

## BEH-739: Export Events (BBox)

Button `#saveBBoxes` calls `saveEventsToBBoxes` which downloads `BBoxes.csv` using `tracksToBBoxes2(Tracks)` (the console message mentions the
other format, `tracksToBBoxes`, which is never called). Header: `#frame,id,tagx,tagy,angle,left,top,right,bottom,pollen,arrive,leave,fanning`. Per
observation: `frame key, obs.ID, x+width/2, y+height/2, Number(angle), x, y, x+width, y+height, Number(bool_acts[1]) (pollen),
Number(bool_acts[2]) (arrive), Number(bool_acts[3]) (leave), Number(bool_acts[0]) (fanning)`. Numbers are written unrounded
(JS default formatting, e.g. `12.5`, floating-point noise possible); no escaping. `tagx,tagy` are the box center, not a tag position.
Same failure case as BEH-738 for entries without `bool_acts`. `tracksToBBoxes` (unused) has the header
`#frame,left,top,right,bottom,pollen,arrive,leave,fanning,angleAroundCenter`.

- **Group:** CAP-705
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `saveEventsToBBoxes`
  - `annotation/AnnotationCodec.js`: `tracksToBBoxes2`, `tracksToBBoxes`
  - `labelbee_page.html`: `#saveBBoxes`
- **Links:** DEBT-727, DEBT-728, OQ-003

## BEH-740: Experimental DB source: load tracks from SQLite

`loadTracksCSVFromDB(limit=100)` (no button or caller; invocable from the console) uses the global `db` (an sql.js database created by
`SQLiteDB.js`) with the query `SELECT frame, CAST(track_id AS TEXT) AS id, cx, cy, angle + 90 AS angle, 300 AS width, 600 AS height,
cx-300/2 AS x, cy-600/2 AS y FROM data LIMIT <limit>` (table `data` is expected to be the tracks CSV loaded as a table; no ORDER BY,
so only an arbitrary first `limit` rows are loaded, default 100). `resultToObjects` turns the first result set into row objects (empty
result: no rows), `flatjson_to_json` groups by `frame` into `{frame: {id: item}}` with `bool_acts = [false x4]` and `labels = ""`
(no `parts`, no tags), info `{type:"events-multiframe", source:"Imported form DB" (sic), history:string}`; then `setTracks`,
`onFrameChanged`, `refreshChronogram`, with timing logs. `db_to_json`, `flatjson_to_json`, `resultToObjects` assign undeclared globals (`result`, `data`, `evts`).

- **Group:** CAP-706
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `loadTracksCSVFromDB`
  - `annotation/AnnotationCodec.js`: `db_to_json`, `flatjson_to_json`, `resultToObjects`
- **Links:** OQ-004, OQ-709, DEBT-729

## BEH-741: SQLiteDB.js: SQL console and database sources

Module script (top-level `await`), loads sql.js 1.10.3 from cdnjs (`initSqlJs` expected on `window`), creates an empty `SQL.Database()` stored in
`let db` and `window.db`. `<input type=file id=upload>` (accept `.sqlite`): reads the file and replaces the module-local `db`
(NOT `window.db`, so `loadTracksCSVFromDB` keeps using the previous database, DEBT-730; no try/catch, no file selected
throws). `window.loadDatabaseFromUrl(url)`: fetch (error on non-OK status, logged), `new SQL.Database(bytes)`,
assigns both `db` and `window.db`. `#run` button executes `#query` text with `db.exec`, shows the first result as a table in `#output`
with the elapsed ms, or "No results." or "SQL Error: <message>". The DOM elements (`#upload`, `#query`, `#run`, `#output`, `#premade-queries`) belong to
a "SQLite Console" tab in `labelbee_page.html` that, like the script tags for `SQLiteDB.js` and `DuckDB.js`, is commented out: in the shipped page this
code is not loaded and `db` is undefined.

- **Group:** CAP-706
- **Origin:** intentional
- **Code:**
  - `SQLiteDB.js`: `loadDatabaseFromUrl`, `run_click`, `renderTable`
  - `labelbee_page.html`: `~SQLite Console tab (commented out)`
- **Links:** OQ-004, OQ-709, DEBT-730

## BEH-742: DuckDB.js: DuckDB-WASM console (not connected to Tracks)

Module script (top-level `await`) imports duckdb-wasm 1.12.0 (pinned) and apache-arrow `@latest` (unpinned) from jsDelivr, starts an `AsyncDuckDB` in a worker, opens one
connection (`duck.db`, `duck.conn`, all on `window.duck`). Functions: `duck.on_change_upload` (on `#upload` change: registers the file handle and runs
`ATTACH '<fileName>' AS uploaded_db;`; the listener is registered twice, so it runs twice), `duck.loadCSVFromURL(url, table)` (registers the URL
and runs `CREATE TABLE <table> AS SELECT * FROM read_csv_auto('<file>')`, errors logged), `duck.run_click` (runs `#query`, shows elapsed
ms then a table built from the Arrow result), premade queries in `#premade-queries` ("List tables" `SHOW TABLES`, "Get first rows" `SELECT *
FROM data LIMIT 10;`, "Get track lengths": count of frames per `track_id` ordered descending). There is no code converting DuckDB results into
`Tracks`: `db_to_json` expects the sql.js API (`db.exec`). Not loaded by the page (script tag commented out).

- **Group:** CAP-706
- **Origin:** intentional
- **Code:**
  - `DuckDB.js`: `loadCSVFromURL`, `on_change_upload`, `run_click`, `renderTable`, `initQueries`
- **Links:** OQ-004, OQ-709, DEBT-729

## BEH-743: Filename timestamps and Blob downloads

All local saves use `saveBlobToFile(blob, filename)`: create an object URL, append a hidden `<a download=filename>`, click it, never remove the
element nor revoke the URL. JSON is `JSON.stringify(obj)` with MIME `text/json`; CSV uses `text/csv`. `getTimestampNow()` = local time
`YYYYMMDD_hhmmss` (zero-padded, 24h), used for Tracks and Tags JSON names (`<videoinfo.name>-<ts>_Tracks.json`, `..._Tags.json`); CSV exports have
fixed names `Tracks.csv`, `BBoxes.csv`. Saving is the only persistence of local work (BEH-709).

- **Group:** CAP-702
- **Origin:** essential
- **Code:**
  - `AnnotationIO.js`: `saveBlobToFile`, `saveObjToJsonFile`, `saveCSVToFile`, `getTimestampNow`
- **Links:** BEH-713, BEH-723, BEH-738, BEH-739

## BEH-744: Ajax error reporting helpers

`typesetAjaxError(title, hook)` returns an error callback that logs and, if `hook` is given, calls it with an HTML block (`title`, `Status`, `Error`, response
text); used by the dialogs (BEH-725, BEH-726, BEH-734). `showAjaxError(title, prehook, onlyConsole)` logs, calls `prehook(jqXHR, textStatus, errorThrown)`, and unless
`onlyConsole` shows the same text in `#mainAlertDialog` via `mainAlert(html)` (BEH-729, `labelListFromServer`). Response text is injected as HTML
unescaped.

- **Group:** CAP-703
- **Origin:** intentional
- **Code:**
  - `AnnotationIO.js`: `typesetAjaxError`, `showAjaxError`, `mainAlert`
  - `labelbee_page.html`: `#mainAlertDialog`
- **Links:** BEH-729

## BEH-745: Frame keys and ID types across the formats

Summary of the types a re-implementation must preserve or convert. In memory: frame key = string (from `for..in`), bee ID = string, `Observation.frame` =
number, tag `id` = number (native files, `tracks_tagged`) or string (tags CSV), `tag.frame` = number. v2 file: `data` keys = decimal frame strings; event
`id` = string; `data[f]` = array (order of IDs in `for..in`); `frame` field inside the event is a number. v1 file: top-level array indexed by frame with `null` holes,
dict of ID to event, event keeps `ID` and `bool_acts`. Tags file: dict keyed by frame of `{tags:[...]}`. Round trip v2 save to v2 load preserves all event fields except the
removed four (BEH-710) and the rounding to 3 decimals of `x,y,width,height,cx,cy`; `bool_acts` is regenerated from `labels`. Round trip of v1: file `ID`/`bool_acts` used as is. IDs
that are integer-like (`"12"`) iterate in ascending numeric order before non-integer IDs (`T3`); this changes the event order inside a v2 `data[f]` between save and reload but not the content.

- **Group:** CAP-707
- **Origin:** essential
- **Code:**
  - `annotation/AnnotationCodec.js`: `convertTracksToV2`, `sanitizeEvents`
- **Links:** ENT-001, ENT-002, ENT-004, INV-001, INV-003, OQ-003, OQ-703, BEH-746

## BEH-746: A v2 file without `data` loads as an empty model

A loaded object with `info.type == "events-multiframe"` but no `data` key (or `"data": null`, or `"data": []`) is accepted:
`sanitizeEvents` iterates nothing and returns `{info, data: {}}`; `setTracks` then replaces `Tracks` by `{}` and `TracksInfo`
by the file's `info`, refreshes the views, and returns `true`. No alert and no console error: the previously loaded events
are silently discarded.

- **Group:** CAP-707
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `setTracks`
  - `annotation/AnnotationCodec.js`: `sanitizeEvents`
- **Links:** BEH-717, BEH-720, INV-001, DEBT-734, OQ-714

## BEH-747: Label preset request failure leaves the dialog on its loading message

If the `GET uri` of `labelListFromServer` fails, `showAjaxError("labelListFromServer: ERROR")` runs (console log and
`mainAlert` dialog with title, status, error and response text, BEH-744). The returned jQuery promise is rejected, and
`onClickFile` registers only a success handler, so the dialog message stays "Loading labels from <url>..." and the dialog
stays open; `labelButtonsArray` is unchanged. If the listing request of `updateDialog` fails, `typesetAjaxError` writes the
error HTML in the dialog message instead.

- **Group:** CAP-703
- **Origin:** accident
- **Code:**
  - `AnnotationIO.js`: `labelListFromServer`, `LabelListFromServerDialog`, `showAjaxError`, `typesetAjaxError`
- **Links:** BEH-734, BEH-744, DEBT-735

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
(DEBT-732). Click handlers: a directory button calls `updateDialog(uri)` (lists that directory); a file button only
copies its `data-uri` into `.dir-uri-text` and calls `previewFile(null)` (the direct `loadFile` call is commented out);
`.dir-uri-btn` (`onClickLoad`) calls `loadFile(<.dir-uri-text value>)`. The bodies of `previewFile` and `loadFile`
(and how they reach `loadFileFunction`) were not in the evidence (inferred).

- **Group:** CAP-704
- **Origin:** intentional
- **Code:**
  - `labelBee.js`: `FilePickerFromServerDialog`
  - `AnnotationIO.js`: `EventsCSVManualFilePicker`
- **Links:** BEH-735, DEBT-732, CAP-100
