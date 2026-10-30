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

- [~] **Pilot: annotation loading** (slice 1 prepared: [ADR 0002](design/0002-slice-annotation-load-codec.md), branch `slice-annotation-load-codec`, step 1 (goldens, `refactor/tests/golden/slice1/`) done; step 2 (module + bridge, goldens pass on old and new) ready for review; steps 3-5 pending; [Q15](QUESTIONS.md#q15)) (chosen by the maintainer: it makes testing easier). The chain that turns a file or server payload into `Tracks`/`Tags`: format conversion and sanitising (CAP-702/703/704/707, load side), from `AnnotationIO.js`. Proposed cut into two slices: (1) the pure parse/convert/sanitise functions (`AnnotationCodec` load side) with golden tests on synthetic fixtures; (2) the loaders (file, server) calling it. Proves the bridge, the Node runner and the delete step.

Backlog, unordered, not commitments (module names from `intent/modules.md`):

| Area | Candidate slices |
|---|---|
| Pure logic | `tag-image` (tag functions of `ZoomView.js`), `AnnotationCodec` save/export side, `IdPrediction`, `derive/*` (read-only parts) |
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
