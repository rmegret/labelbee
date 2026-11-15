# Refactor plan

Status legend: [ ] todo, [~] in progress, [x] done

Approach: **strangler**, one small slice at a time, the page working after every step
([ADR 0001](design/0001-strangler-migration.md)). Analysis and intent are frozen drafts used
as a map; they are not extended ahead of the work.

## Phase 0: Setup
- [x] Create branch `refactor`
- [x] CLAUDE.md + `refactor/` skeleton + shared `.claude/settings.json`

## Phase 1: Map (frozen)
Enough understanding to choose slices. Details are looked up just in time, only for the area
a slice touches. Nothing here is a prerequisite to keep growing.
- [x] Backend inventory -> `analysis/02-backend.md`
- [x] Frontend inventory, dependencies, global state -> `analysis/03`, `04`, `05`
- [x] Smells, risks and dead-code candidates -> `analysis/06-smells-and-risks.md` (unverified items are re-checked only when a slice touches them)
- [x] Architecture -> `analysis/01-architecture.md`
- [~] Intent drafts: `intent/capabilities.md`, `modules.md`, `cap-vs-mod.md`, `entities.md`, `invariants.md`, `decisions.md` (OQ-001..011 answered). Maintainer confirmation pending.
      `intent/behaviors/`, `debt.md`, `seams.md` are reference by ID only (a slice reads the entries it cites); not extended or restructured.
- [ ] Open duplicates in the module draft, to settle when a slice reaches them: see `intent/cap-vs-mod.md` section 3.

## Phase 2: Strangler foundation
Minimal, only what the first slices need.
- [x] Maintainer answers for the first slice: [Q2](analysis/07-questions-and-proposals.md#q2) (ES modules, same libs), [Q8](analysis/07-questions-and-proposals.md#q8) (synthetic fixtures), [Q11](analysis/07-questions-and-proposals.md#q11) (run tests; tooling under `refactor/tests/` only). Others are asked when a slice needs them.
- [ ] Confirm [ADR 0001](design/0001-strangler-migration.md)
- [x] [`tests/CHECKLIST.md`](tests/CHECKLIST.md): manual browser checklist (smoke, store, loading, saving), automated by [`tests/browser/`](tests/browser/README.md) (55 tests, `pytest refactor/tests/browser`, [ADR 0006](design/0006-browser-tests.md))
- [ ] Backend tests: deferred (maintainer 2026-11-13). The old `tests/` stay as they are, broken ([finding F5](tests/browser/README.md)); they will be replaced by tests under `refactor/tests/` when the refactor stabilizes (login, `/api/v1/videos`, annotations round-trip, `/labelbee/gui` renders). Idea for then: a conftest that points `labelbee.settings.local_settings` at SQLite and a temp `LABELBEE_LOGDIR` before `create_app()`, no production change
- [ ] Frontend runner for pure-logic golden tests (Node, no browser), added with the first slice that needs it

## Phase 3: Slices
One slice in flight. Each follows the six steps of ADR 0001, ends with the old code deleted,
and is its own commit series and review. The next slice is chosen after the previous merged.

- [x] **Pilot: annotation loading**, slice 1 (pure load codec), done and merged (branch `slice-annotation-load-codec`); browser checks pending ([tests/CHECKLIST.md](tests/CHECKLIST.md), section C). Chosen by the maintainer: it makes testing easier. The chain that turns a file or server payload into `Tracks`/`Tags`: format conversion and sanitising (CAP-702/703/704/707, load side), from `AnnotationIO.js`. Cut into two slices: (1) the pure parse/convert/sanitise functions (`AnnotationCodec` load side) with golden tests on synthetic fixtures; (2) the loaders (file, server) calling it (done as slice 3, after the save codec of slice 2). Proves the bridge, the Node runner and the delete step.
  - Slice 1 steps: (1) goldens `refactor/tests/golden/slice1/` [x]; (2) `annotation/AnnotationCodec.js` + `core/Notifier.js` + bridges [x]; (3) old definitions deleted from `AnnotationIO.js` [x]; (4) bug fix DEBT-710 (`Array.isArray`; `&&` style only) [x]; (5) record in PLAN and intent [x]. Manual browser checks: [tests/CHECKLIST.md](tests/CHECKLIST.md) C1-C6 (a v1 file saved as an array, C2, is the riskiest case).
  - Bridge entries that stay until `AnnotationIO.js` itself moves to modules (the loaders slice made its loaders promise pipelines but left them in that file): `window.sanitizeEvents`, `tagsAddFrames`, `db_to_json`, `flatjson_to_json`, `resultToObjects`, `tracks_csv_to_json`, `tags_csv_to_json`, `tags_csv_to_tagjson`, `tracks_tagged_csv_to_json` (`annotation/AnnotationCodecBridge.js`, all called from `AnnotationIO.js`); `window.logging` (`core/NotifierBridge.js`, until no classic script reads it).
  - Left for later: nothing; both items recorded here were fixed in slice 3 (DEBT-713 `setTags` key check, rest of DEBT-710).

- [x] **Slice 2: annotation save/export codec** (encode side of `AnnotationCodec`; chosen by the maintainer 2026-11-12), done and merged (branch `slice-annotation-save-codec`); browser checks pending ([tests/CHECKLIST.md](tests/CHECKLIST.md), section D). [ADR 0004](design/0004-slice-annotation-save-codec.md) is still proposed ([Q16](QUESTIONS.md#q16), [Q17](QUESTIONS.md#q17), [OQ-712](QUESTIONS.md#oq-712) answered). Moved `convertTracksToV1/V2`, `tracksToCSV`, `tracksToBBoxes`, `tracksToBBoxes2` out of `AnnotationIO.js`.
  - Steps: (1) goldens `refactor/tests/golden/slice2/` [x]; (2) add to `annotation/AnnotationCodec.js` + bridge wrappers [x]; (3) old definitions deleted from `AnnotationIO.js` [x]; (4) bug fixes, one commit each: DEBT-707 (`Object.assign({}, evt)`) and DEBT-706 (deep-cloned `info`/`videoinfo`, `history` always an array; saves of a session no longer accumulate in the history) [x]; (5) record in PLAN and intent [x]. Manual browser checks: [tests/CHECKLIST.md](tests/CHECKLIST.md) D1-D6 (save v2 and reload, after a CSV import too; export CSV and BBoxes; save to the server).
  - Bridge entries that stay until the callers move to modules (`saveEventsToFile`, `saveEventsToCSV`, `saveEventsToBBoxes`, `eventsToServer`): `window.tracksToCSV`, `tracksToBBoxes`, `tracksToBBoxes2`, and the zero-argument wrappers `window.convertTracksToV1` and `window.convertTracksToV2` that read the page globals `Tracks`, `TracksInfo`, `videoinfo` at call time (`annotation/AnnotationCodecBridge.js`).
  - Left for later: DEBT-727 (exports crash on an observation without `bool_acts`, no escaping), DEBT-708 (`saveEventsToFile` with an unknown format downloads "null"), `history` stays a string in memory after an import, unused `tracksToBBoxes` still moved with its sibling (DEBT-728).

- [x] **Slice 3: `AnnotationStore` and the annotation loaders** (chosen by the maintainer 2026-11-12), done and merged (branch `slice-annotation-loaders`); browser checks pending ([tests/CHECKLIST.md](tests/CHECKLIST.md), sections A-E). ADR 0005 is still proposed; [Q18](QUESTIONS.md#q18)-[Q23](QUESTIONS.md#q23) answered 2026-11-12. `AnnotationStore` owns the in-memory data only (`Tracks`, `TracksInfo`, `Tags`, `TagsInfo`, `tagsHaveDM`); the loaders and their promise logic stay in `AnnotationIO.js`; nothing was deleted.
  - Steps: (0) ADR 0005 and questions [x]; (1) goldens `refactor/tests/golden/slice3/` (72 cases) [x]; (2) `annotation/AnnotationStore.js` + `AnnotationStoreBridge.js`, `var Tracks/Tags` removed from `Model.js` [x]; (3) `setTracks`/`setTags`/`setEventsProp` write through the store, `decodeTags` in the codec, DM rule in the store [x]; (4) loaders as get/decode/apply promise pipelines in `AnnotationIO.js` [x]; (5) fixes, one commit each: DEBT-713, DEBT-733, DEBT-710 (rest), DEBT-722, then visible load errors ([Q23](QUESTIONS.md#q23)) [x]; (6) record [x]. Manual browser checks: [tests/CHECKLIST.md](tests/CHECKLIST.md) sections B (store and bridge), C (loading), D (saving), E (console).
  - Bridge entries that stay until their callers move to modules: the five accessors of `annotation/AnnotationStoreBridge.js`, one per legacy global, removed when no file reads the name any more (`window.AnnotationStore` stays). References still using them, `grep -w` per file, lines, comments included, so `~`:

    | Global | Files (~lines) |
    |---|---|
    | `Tracks` | `ChronoControl.js` 31, `Model.js` 28, `ZoomView.js` 16, `AnnotationIO.js` 13, `OverlayControl.js` 6, `SelectionControl.js` 4, `labelBee.js` 1 |
    | `Tags` | `ChronoControl.js` 19, `AnnotationIO.js` 15, `OverlayControl.js` 9, `ZoomView.js` 9, `Model.js` 4, `VideoList.js` 1, `SelectionControl.js` 1 |
    | `TracksInfo` | `AnnotationIO.js` 5 |
    | `TagsInfo` | none (written through the store) |
    | `tagsHaveDM` | `OverlayControl.js` 1 |

    Also `window.decodeTags` (`annotation/AnnotationCodecBridge.js`, called by `setTags`), added to the codec bridge entries listed for slices 1 and 2.
  - Left for later: store change events and a per-observation API (SEAM-701; the double refresh of DEBT-712 goes with it), `ttags`/`flatTags`/`allTagsID` to a `Derived` module (DEBT-736), DEBT-719 (`tagsFromServer` returns `undefined` for the dialog and empties the Tags on failure, [OQ-706](QUESTIONS.md#oq-706)), DEBT-734 (a v2 events file without `data` empties the model, [OQ-714](QUESTIONS.md#oq-714)), DEBT-715 (DM rule looks at one tag; a first frame without `tags` is rejected), DEBT-718 (`FromServerDialog.loadEvents` writes into a selector that matches nothing), `success` and `tags` implicit globals (DEBT-712), the rethrow after the alert leaves an extra "Uncaught (in promise)" console line, lineage `basedOn` semantics ([OQ-707](QUESTIONS.md#oq-707), now also set by `loadEventsFromServerByID`).

- [x] **Slice 4: the Events API, encapsulating the stored events** (done and merged, branch `slice-events-api`, merge commit `763afbb3`; 7b and 7c dropped, replaced by slice 5) (chosen by the maintainer 2026-11-13; direction in [DEC-007](intent/decisions.md)). [ADR 0007](design/0007-slice-events-api.md) proposed; [Q26](QUESTIONS.md#q26)-[Q29](QUESTIONS.md#q29) answered 2026-11-13. `annotation/Events.js`, one `events` instance, ~8 operations replacing 13 writers and ~25 reader sites; undo and change events are later slices, undo may break meanwhile. Steps: (0) tests for the six unseen writers + strict dirty-write allow-list [x] (`test_f_writers.py`, `--dirty-writes-strict`, 21 allowed writers; it found two more, `bakeTagFix` and the pick-frame closures); (1) `Events` + differential tests [x] (`annotation/Events.js`, `AnnotationStore.events`, `window.events`; `refactor/tests/golden/slice4/`, 13 tests; no call site changed); (2) `Model.js` functions become wrappers [x] (allow-list 21 -> 14, detector reports "through the API", `test_f7` rename); (3) writers outside `Model.js`: 3a the zoom deletes, the span writers, `bakeTagFix`, `augmentTrackWithTag`, the `cx`/`cy` refresh through `delete`/`update` [x] (allow-list 14 -> 2); 3b `deleteEvent` and `cleanObsoleteEvents` through `delete`, they now prune the emptied frame: a saved file no longer carries `[]` for it (`test_f8`, `test_f6`; allow-list empty) [x]; (4) readers by operation [x]: 4a get one observation (`events.get`/`has`: `deleteEvent`, `modifyCurrentObsSpan`, `getCoveredTags`, `getTag`, `augmentTrackWithTag`) [x], 4b observations of one frame (`events.getFrame(0)` in Pick Flower) [x] (reading `OverlayControl.js:1389` found unseen writers of `visit` in the Pick Flower tool: `test_f9` and 3 allow-list entries; the `VisitWidget` span writers `OverlayControl.js:553-571` too: `test_f10`, 2 more allow-list entries; all of them wait for slice 5, [ADR 0008](design/0008-field-ownership.md)), 4c iteration (`events.forEach` for 4 sites, the generator `events.observations()` for the 2 loops with `continue`: `updateFlatTracks`, `updateChronogramData`; `printTracks` is dead debug code, untested; `test_g1`) [x], 4d notes and info (`events.info`, `events.setInfo`: the notes box, `setEventsProp`, whose log line stays because the golden pins it) [x], 4e export (`events.toObject()`: CSV, BBoxes, the `convertTracksToV1/V2` wrappers) [x]; (5) retire the accessors: 5a `Tracks` and `TracksInfo` removed from the bridge, harness and tests read the store/`events` (page code already read neither) [x]; console-only debug globals `Tracks`, `TracksInfo` back as an option (`?debug_globals` / `installDebugGlobals()`, error when page code reads them, `annotation/DebugGlobals.js`; the Tags ones joined in 5b) [x]; 5b `Tags` and `tagsHaveDM` readers renamed to `AnnotationStore.getTags()` / `getTagsHaveDM()` ([Q26](QUESTIONS.md#q26); 34 lines in 6 files, mechanical), the accessors removed, the three names added to the debug installer; the harness and `test_b1` read the store; `test_g2` ("Delete FA Tags...") [x]; (6) private structure [x] (`events.tracks`, `AnnotationStore.getTracks()` and `getTracksInfo()` removed; `events.toObject()` is the one door, for the codec export and the console debug view; tests use it and `events.info`); the dirty-write detector is on in every browser test (strict by default), follows references shared with the events (`parts`/`visit` after a commit, the tag objects) and can be pasted into a live session (`test_i_detector`, `test_f12`; allow-list 7, then 6 after 7a: 4 for slice 5, 2 for the tag merge); (7) deep clone and commit keeping unknown fields: 7a `commit` keeps the other fields of the working copy, the `span` of a new visit (approved 2026-11-14; allow-list 7 -> 6) [x]; 7b deep copy of `visit`/`parts` and the Pick Flower writers through `events.update` with the working copy kept in sync, 7c undo keeps all fields: dropped, replaced by slice 5 ([ADR 0008](design/0008-field-ownership.md), [Q30](QUESTIONS.md#q30) answered 2026-11-14); 7d round-trip tests on the sample files, load/save/load and a commit of unchanged working copies (`refactor/tests/golden/slice4/roundtrip.test.js`, 10 tests) [x]; (8) record [x] (PLAN, SEAM-701, `modules.md` state table, DEBT-702, DEBT-712). 

- [ ] **Slice 5: store-first editing and field ownership** (maintainer decisions 2026-11-14, [Q30](QUESTIONS.md#q30)-[Q33](QUESTIONS.md#q33) answered). [ADR 0008](design/0008-field-ownership.md) proposed. The store is the source of truth for every discrete change; the working copy (`cloneObs`, `copyObs`, `storeObs`, `status`, `submit_bee`, `automatic_sub`, 18 commit call sites) goes; an editor reads with `events.get` and writes its unit with `events.update`, the fields that changed only; fabric keeps its own representation and commits on release; creation is immediate (defaults plus the geometry and `labels` of a source, no draft); `bool_acts` is derived from `labels`; `sanitizeEvents` takes a geometry policy; undo is deactivated until its own slice. Steps: (0) tests for the edit paths that have none [ ]; (1) deactivate undo [ ]; (2) `annotation/Labels.js` [ ]; (3) `sanitizeEvents` geometry policy (`xy` or `cxcy`, per source format, warning on disagreement) [ ]; (4) `bool_acts` derived [ ]; (5) editors one concern per commit: `parts`, `wrongid`, `labels`, `notes`, `geometry` [ ]; (6) creation and removal of the working copy [ ]; (7) the visit module out of `OverlayControl.js` [ ]; (8) record [ ]. Later slices, each its own: change events and fine-grained reactivity, the selection store, undo, the reorganization around `cx`/`cy`, the tag merge.

Backlog, unordered, not commitments (module names from `intent/modules.md`):

| Area | Candidate slices |
|---|---|
| Pure logic | `tag-image` (tag functions of `ZoomView.js`), `IdPrediction`, `derive/*` (read-only parts) |
| Shared state | `AnnotationStore` with a change event, then route the writers through it; `SelectionModel`, `UndoStack` |
| Wiring | `KeyMap` (DEC-005), replace inline `onclick` by one dispatcher |
| Large files | `OverlayControl.js` and `AnnotationIO.js` split by module, one piece per slice |
| Cycle | `VideoControl` emitting events instead of calling the overlay |
| Backend hygiene | independent small steps: dead `database/*/model.py`, one auth decorator, truthful `tox.ini`/README |

## Not planned for now
Specs per feature, behavior-level characterization of everything, traceability matrix, a
reworked smell/risk register, full Playwright coverage, splitting analysis files to a size
budget. They can be revisited when a slice needs them.

## Decisions log
- [ADR 0001](design/0001-strangler-migration.md): strangler migration (proposed)
- [ADR 0003](design/0003-notifier.md): `core/Notifier.js`, shared alert/log module (proposed)
- [ADR 0004](design/0004-slice-annotation-save-codec.md): slice 2, annotation save/export codec (proposed)
- [ADR 0005](design/0005-slice-annotation-loaders.md): slice 3, `AnnotationStore` and the annotation loaders (proposed)
- [ADR 0006](design/0006-browser-tests.md): automated browser tests, Playwright for Python in `tests/browser/` (proposed)
- [ADR 0007](design/0007-slice-events-api.md): slice 4, the Events API, encapsulating the stored events (proposed)
- [ADR 0008](design/0008-field-ownership.md): slice 5, store-first editing and field ownership ([Q30](QUESTIONS.md#q30)-[Q33](QUESTIONS.md#q33) answered 2026-11-14; proposed)
