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
- [ ] `tests/CHECKLIST.md`: ~20 manual smoke items (load video, play, seek, select, edit, save, zoom)
- [ ] Backend: make `pytest` collect and add a few smoke tests (login, `/api/v1/videos`, annotations round-trip, `/labelbee/gui` renders)
- [ ] Frontend runner for pure-logic golden tests (Node, no browser), added with the first slice that needs it

## Phase 3: Slices
One slice in flight. Each follows the six steps of ADR 0001, ends with the old code deleted,
and is its own commit series and review. The next slice is chosen after the previous merged.

- [~] **Pilot: annotation loading**, slice 1 (pure load codec) done, branch `slice-annotation-load-codec`, awaiting merge and the browser checks of [ADR 0002](design/0002-slice-annotation-load-codec.md) section 4. Slice 2 (the loaders) not started. Chosen by the maintainer: it makes testing easier. The chain that turns a file or server payload into `Tracks`/`Tags`: format conversion and sanitising (CAP-702/703/704/707, load side), from `AnnotationIO.js`. Cut into two slices: (1) the pure parse/convert/sanitise functions (`AnnotationCodec` load side) with golden tests on synthetic fixtures; (2) the loaders (file, server) calling it. Proves the bridge, the Node runner and the delete step.
  - Slice 1 steps: (1) goldens `refactor/tests/golden/slice1/` [x]; (2) `annotation/AnnotationCodec.js` + `core/Notifier.js` + bridges [x]; (3) old definitions deleted from `AnnotationIO.js` [x]; (4) bug fix DEBT-710 (`Array.isArray`; `&&` style only) [x]; (5) record in PLAN and intent [x]. Manual browser checks (ADR 0002 section 4) not run yet: a v1 file saved as an array is the riskiest case after step 4.
  - Bridge entries that stay until the loaders slice (after slice 2) moves their callers: `window.sanitizeEvents`, `tagsAddFrames`, `db_to_json`, `flatjson_to_json`, `resultToObjects`, `tracks_csv_to_json`, `tags_csv_to_json`, `tags_csv_to_tagjson`, `tracks_tagged_csv_to_json` (`annotation/AnnotationCodecBridge.js`, all called from `AnnotationIO.js`); `window.logging` (`core/NotifierBridge.js`, until no classic script reads it).
  - Left for later: `setTags` validates the global `Tags` instead of `obj` (fix when `setTags` is in scope, loaders slice); `null`/primitives still throw in `sanitizeEvents` (rest of DEBT-710).

- [~] **Slice 2: annotation save/export codec** (encode side of `AnnotationCodec`; chosen by the maintainer 2026-11-12), done, branch `slice-annotation-save-codec`, awaiting merge and the browser checks of [ADR 0004](design/0004-slice-annotation-save-codec.md) section 4. [ADR 0004](design/0004-slice-annotation-save-codec.md) is still proposed ([Q16](QUESTIONS.md#q16), [Q17](QUESTIONS.md#q17), [OQ-712](QUESTIONS.md#oq-712) answered). Moved `convertTracksToV1/V2`, `tracksToCSV`, `tracksToBBoxes`, `tracksToBBoxes2` out of `AnnotationIO.js`.
  - Steps: (1) goldens `refactor/tests/golden/slice2/` [x]; (2) add to `annotation/AnnotationCodec.js` + bridge wrappers [x]; (3) old definitions deleted from `AnnotationIO.js` [x]; (4) bug fixes, one commit each: DEBT-707 (`Object.assign({}, evt)`) and DEBT-706 (deep-cloned `info`/`videoinfo`, `history` always an array; saves of a session no longer accumulate in the history) [x]; (5) record in PLAN and intent [x]. Manual browser checks (ADR 0004 section 4) not run yet: save v2 to a file and reload it, after a CSV import too; export CSV and BBoxes; save to the server.
  - Bridge entries that stay until the callers move to modules (`saveEventsToFile`, `saveEventsToCSV`, `saveEventsToBBoxes`, `eventsToServer`): `window.tracksToCSV`, `tracksToBBoxes`, `tracksToBBoxes2`, and the zero-argument wrappers `window.convertTracksToV1` and `window.convertTracksToV2` that read the page globals `Tracks`, `TracksInfo`, `videoinfo` at call time (`annotation/AnnotationCodecBridge.js`).
  - Left for later: DEBT-727 (exports crash on an observation without `bool_acts`, no escaping), DEBT-708 (`saveEventsToFile` with an unknown format downloads "null"), `history` stays a string in memory after an import, unused `tracksToBBoxes` still moved with its sibling (DEBT-728).

- [~] **Slice 3: `AnnotationStore` and the annotation loaders** (chosen by the maintainer 2026-11-12; direction 2026-11-12: store owns the in-memory data only, bridge to migrate progressively, `AnnotationIO` keeps loaders and promise logic, nothing deleted). [ADR 0005](design/0005-slice-annotation-loaders.md) proposed; [Q18](QUESTIONS.md#q18)-[Q22](QUESTIONS.md#q22) answered 2026-11-12 (store also owns `tagsHaveDM`; `ttags`/`flatTags` wait for `Derived`). Steps 1 (61 golden cases), 2, 3 and 4 done; step 5 (bug fixes per Q19) next. Browser check of step 2 pending (page loads, plays, draws; see ADR 0005 section 6).
  - Steps (planned, ADR 0005 section 5): (1) goldens `refactor/tests/golden/slice3/` [x]; (2) `annotation/AnnotationStore.js` + `AnnotationStoreBridge.js`, `var Tracks/Tags` removed from `Model.js` [x]; (3) `setTracks`/`setTags`/`setEventsProp` write through the store, `decodeTags` in the codec, DM rule in the store [x]; (4) loaders as promise pipelines in `AnnotationIO.js` [x]; (5) bug fixes per Q19, and visible load errors ([Q23](QUESTIONS.md#q23), answered yes) [ ]; (6) record, with the bridge worklist [ ].

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
