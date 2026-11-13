# ADR 0007: Slice 4, the Events API: encapsulate the stored events

Status: proposed. Direction from the maintainer, 2026-11-13: [DEC-007](../intent/decisions.md), the slice split (container API
first, observation clean-up and undo later), `tag` and `span` are data ([OQ-702](../QUESTIONS.md#oq-702)), `cx`/`cy` stay as
they are ([DEBT-739](../intent/debt.md)), undo is out of scope and may break. Answered 2026-11-13: [Q26](../QUESTIONS.md#q26), [Q27](../QUESTIONS.md#q27), [Q28](../QUESTIONS.md#q28), [Q29](../QUESTIONS.md#q29), and `delete` prunes an emptied frame. No question is open. This ADR replaces the first draft, a rename of
the legacy globals, which would have edited the same lines twice.

Fourth slice of [ADR 0001](0001-strangler-migration.md), after [ADR 0005](0005-slice-annotation-loaders.md): the store owns the data,
but code still reads and writes `Tracks` directly through five accessors. Goal: `Events` is the single source of truth and nothing
outside it modifies the stored events; every change is a named operation. Undo and change events are built later on top.
Module: `annotation/Events.js` ([SEAM-701](../intent/seams.md)).

## 1. Evidence (code and runtime, 2026-11-13)

**Half of an API exists.** `Model.js` has 10 functions over `Tracks`: `getValidIDsForFrame(s)` `:76,95`, `obsDoesExist` `:109`
(6 callers), `getObsHandle` `:119` (23), `storeObs` `:141` (5), `changeObservationID` `:157` (9), `getFramesWithID` `:197` (2),
`getFramesWithSwapID` `:212`, `obs_swapID` `:227` (2), `printTracks` `:252`. The leak is the direct access outside it: about 42
code lines in 6 files, in ~25 sites of ~14 functions, all one of the operations below.

**How an edit travels.** The editor works on a copy: `addRect(.., "db", inputObs)` does `cloneObs` (`OverlayControl.js:2267`), the
fabric rectangle keeps it as `rect.obs`, and `submit_bee` commits it with `storeObs(tmpObs)` (`SelectionControl.js:463-466`), which
is `getObsHandle(frame, id, true)` then `copyObs` (`Model.js:40-72`, a list of 17 fields). `Observation` is therefore already the
working view of one event on the current frame, and `storeObs` is the commit. That is the model of DEC-007.

**Writers of the stored data**, measured with the dirty-write detector (`pytest refactor/tests/browser --dirty-writes=...`, 57 tests,
[browser README](../tests/browser/README.md)) and read in the code:

| Writer | Operation | Runtime |
|---|---|---|
| `setTracks` `AnnotationIO.js:310` | replace everything | seen, 107 |
| `copyObs` through `storeObs` `Model.js:42-68` | commit (17 fields) | seen |
| `getObsHandle` `Model.js:133` | create an observation in a frame | seen |
| `changeObservationID` `Model.js:174-181` | rename, swap | seen |
| `deleteEvent` `SelectionControl.js:663` | delete | seen |
| `updateChronogramData` `ChronoControl.js:1112-1113` | `cx`, `cy` rewritten at every refresh | seen, 1005 |
| `augmentTrackWithTag` `ChronoControl.js:1021` | `tag` | seen |
| `getCoveredTags` `ZoomView.js:1846,1851` | `span` | not exercised |
| `modifyCurrentObsSpan` `SelectionControl.js:998` | `span` | not exercised |
| `OverlayControl.prototype.hardRefresh` `OverlayControl.js:1537` | `span`, inside a refresh function | not exercised |
| `deleteFalsealarmEvents`, `deleteWrongIdEvents` `ZoomView.js:1989-2009` | delete, then prune the empty frame | not exercised |
| `cleanObsoleteEvents` `ChronoControl.js:2003-2014` | 3 deletes | not exercised |

Other writes to observations (`ZoomView.js` for `parts`, `newid`, `fix`; `labelBee.js:787-790`; the geometry and label writes of
`OverlayControl.js`) hit the working copy `rect.obs` and reach the store through the commit.

**Readers by operation** (about 25 sites): get one observation (`SelectionControl.js:662,985`, `ZoomView.js:1838`,
`OverlayControl.js:2691`, `ChronoControl.js:1020`); observations of one frame (`OverlayControl.js:1389`); iterate everything (8 sites:
`SelectionControl.js:1031`, `ZoomView.js:1957,1984,2000`, `ChronoControl.js:1016,1032,1085,1996`, two of them with `continue`);
notes and info (`AnnotationIO.js:1516-1522`); export the whole structure (`AnnotationIO.js:275,284`,
`annotation/AnnotationCodecBridge.js:21-22`).

**Conventions that a clone or a commit must respect** (read in `annotation/AnnotationCodec.js` and `Model.js`):

| Convention | Where | Rule for `Events` |
|---|---|---|
| Key is the identity: `ID` mirrors it | `changeObservationID` rewrites both (`Model.js:177,181`); `storeObs` keys by the copy's `frame`, `ID` (`:142`); save writes `id` from the key and drops `ID`; load sets `ID = String(id)`; v1 files may lack `ID` (DEBT-711) | Plain objects keyed by the string frame and id (a number key is coerced as today); never assume `ID` is present |
| `labels` string with `bool_acts[4]` derived from it | computed at load (`sanitizeEvents`), recomputed by the editor (`OverlayControl.js:2302-2323`), dropped at save (DEBT-701) | `Events` stores both as given and recomputes nothing |
| `cx`, `cy` redundant with `x`, `y`, `width`, `height` | 4 writers with 2 conventions (DEBT-739); save recomputes them from `x + width/2` | Kept as given by a clone, a commit or an update; the refresh recompute stays where it is, behind `update` |
| `marked`, `permanent` | deleted at save | Kept in memory, as today |
| Rounding to 3 decimals | save only: `x`, `y`, `width`, `height`, `cx`, `cy` | Not in `Events` |
| Unknown fields | `Object.assign` passes them through load and save | Never dropped by a clone or a commit (today `copyObs` drops them on undo and re-store) |
| `parts`, `visit`, `fix` shared by reference | `copyObs` comment `Model.js:41` | Moved as is first; deep copy is its own fix step (7) |
| Frames are string keys, sparse, `null` entries tolerated, `Tracks` starts as `[]` then `{}` | `Model.js:79,110`, `sanitizeEvents` | Same tolerance; `for...in` order inside |

## 2. Design

`Events` is a pure ES module (no DOM, no global), one class, one instance `events` owned by `AnnotationStore` ([Q27](../QUESTIONS.md#q27)).
It holds the frames and the info. No change events and no undo in this slice; each operation has one place where they can be added.

| Kind | Operations (names provisional) | Replaces |
|---|---|---|
| Queries | `has(f, id)`, `get(f, id)`, `getFrame(f)` (a new `{id: observation}` object, so keys added to it cannot corrupt the store), `frameIds(f)`, `frames()`, `forEach(fn)` and `observations()` ([Q28](../QUESTIONS.md#q28)), `framesWithId(interval, id)`, `info`, `toObject()` (the live structure, only for the codec export, O(1)) | the 8 read sites, `getValidIDsForFrame(s)`, `getFramesWithID`, `obsDoesExist`, the console habit `Tracks[0]` |
| Commands | `replace(data, info)`, `getOrCreate(f, id)`, `commit(workingCopy)`, `update(f, id, fields)`, `delete(f, id)`, `pruneFrame(f)`, `rename(f, old, new, force)`, `swap(interval, a, b)`, `setInfo(key, value)` | the 13 writers above |

- `commit` keeps today's behavior first (the 17-field copy); the all-fields version is step 7.
- `delete(f, id)` removes the frame too when it ends up empty (maintainer, 2026-11-13). Today only the two `ZoomView` deletes prune; the others (`deleteEvent`, `cleanObsoleteEvents`) leave `{}`. Missing and empty frames read the same (`getValidIDsForFrame`, `Model.js:76-93`), so the one visible effect is on save: `convertTracksToV2` writes `[]` for an emptied frame and no longer will. Frames that are empty in a loaded file stay as loaded; `pruneFrame` is not needed.
- `swap` is one operation: the temporary key `'SWAP_save_<id>'` of `obs_swapID` (`Model.js:227-250`) becomes internal.
- `update(f, id, fields)` is `Object.assign` on the stored observation: it sets the given fields, and a value of `undefined` means "none". There is no field removal: the code only ever empties a field by assigning (`obs.parts = []` `ZoomView.js:406`, `obs.labels = ""` `SelectionControl.js:843,857`, `obs.newid = undefined` `ZoomView.js:1789`); the only `delete` on observation data removes nested keys of `obs.fix` on the working copy (`ZoomView.js:1732-1733`). It is the single door for in-place field writes (`span`, `tag`, the `cx`/`cy` refresh).
- `get` returns the live stored object today; writing through it is a dirty write, which the detector reports. Read-only views are later.
- **Detector accounting.** The detector wraps what `events.tracks`, `get`, `getFrame` and `toObject` hand out; the operations of `Events` write to the private data directly, so they never show as dirty writes. `Events` calls an optional observer for each operation (also the future place for change events); the detector subscribes and reports them separately as "through the API" with the call site. A site that moves from the dirty list to the API list is a migration made visible, and an API operation no test calls is a coverage gap.
- `Observation`, `cloneObs`, `copyObs` stay in `Model.js` as a staging area (DEC-007): `Model.js` functions become wrappers over `events` with the same names and behavior, and disappear when empty.
- `Tags`, `TagsInfo`, `tagsHaveDM` stay on `AnnotationStore`, readers renamed to `getTags()` (Q26, accepted). That accessor is temporary: it disappears when the tags are merged into the events ([DEC-006](../intent/decisions.md)), which is a later slice. Today 36 code lines still read the `Tags` structure directly, live consumers included (tag drawing `OverlayControl.js:2875,3031,3100,3778,3802`, tag editing `ZoomView.js:1859-2032`, `SelectionControl.js:630`; `augmentTrackWithTag` shares the same tag object with `obs.tag`), against 18 lines that read `obs.tag`; those consumers have to move to `obs.tag` first.

## 3. Steps (separate commits, page working after each; all suites green after each)
0. **Tests first, no production change.** Browser tests that exercise the six unseen writers (span x3, the two zoom deletes, the clean-up), so the
   detector sees every writer; and an allow-list (`refactor/tests/browser/dirty_writes_allowed.json`, entries `file`, `function`,
   `operation`, `depth`) with a strict mode of the detector that fails when a write comes from a site not in it. It starts at the
   current writers and loses entries step by step; the end state is `annotation/Events.js` only. The detector also learns the "through the API" report once `Events` exists (step 1).
1. **`annotation/Events.js`** (with the operation observer) and differential Node tests: random operation sequences (null frames, array start, numeric and string ids,
   swap with collisions, delete then prune) run on `Events` and on a reference that does the legacy direct operations; the results must be equal. `AnnotationStore.events` holds
   the data; `getTracks()` returns `events.tracks`, the temporary dirty path ([Q29](../QUESTIONS.md#q29)). No call site changes.
2. **`Model.js` functions become wrappers** (`getObsHandle`, `obsDoesExist`, `storeObs`, `changeObservationID`, `obs_swapID`,
   `getValidIDs*`, `getFramesWith*`): the writers `copyObs`, `getObsHandle`, `changeObservationID` leave the allow-list.
3. **Writers outside `Model.js`:** the two zoom deletes, the three `span` writers, `augmentTrackWithTag`, the `cx`/`cy` refresh: through `delete`, `update`;
   then `deleteEvent` and `cleanObsoleteEvents` in a commit of their own, because `delete` prunes and these two did not: a saved file no longer carries `[]` for an emptied frame (shown with the golden and a browser test).
4. **Readers by operation**, one operation across the files per commit: `get`, `frameObservations`, iteration (8 sites), notes and info, export.
5. **Retire the accessors** `Tracks`, `TracksInfo` (and the `Tags` ones per Q26); the harness `golden/harness/io-env.js` and the browser tests that read the globals use the store or `events`.
6. **Make the structure private** (`#frames`): any remaining dirty access throws. Console inspection uses the queries (`events.getFrame(0)`, `events.get(0, 1)`, `events.frames()`) ([Q29](../QUESTIONS.md#q29)).
7. **Fixes, each its own commit with its diff shown:** a clone and a commit that deep-copy all fields and keep unknown ones; round-trip tests on the sample files (load, commit, save equals the original modulo the conventions above).
8. **Record:** PLAN, SEAM-701, `modules.md` state table, DEBT-712, DEBT-702.

Undo is not touched; it may break during these steps and is not tested (the browser test `test_a7` is skipped with a note when it does).

## 4. Checks
- After every step: `node --test refactor/tests/golden/` (211 + the differential tests), `pytest refactor/tests/browser` (57 + step 0), and the strict detector.
- Steps 2 to 6 are reviewed as moves: a write that appears in the strict detector but not in the allow-list is a failure, not a surprise.

## 5. Risks
- Iteration semantics: `for...in` order and deletion during iteration are kept by implementing the loops with `for...in` inside `Events`; callback iteration costs nothing (measured: 9.6 ms against 9.2 ms for one pass over 200 000 observations), a generator about 1.7x, an array of entries 5x, so no arrays in hot paths.
- Two loops use `continue` (`ChronoControl.js:1032-1050`, `1085-1105`): `return` in a callback, or a generator ([Q28](../QUESTIONS.md#q28)).
- The detector sees only exercised paths: step 0 closes the six known gaps; a writer that stays unseen would be caught by the end state (private structure, step 6).
- Strings evaluated at run time or inline handlers are invisible to the static inventory; the browser tests and the private structure catch them.
- The Tags paths in `ChronoControl.js`, `ZoomView.js`, `OverlayControl.js` serve the obsolescent tag file (DEC-006): moved for consistency only.
