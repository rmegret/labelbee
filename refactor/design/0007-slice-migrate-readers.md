# ADR 0007: Slice 4, migrate the readers off the legacy globals

Status: proposed (slice chosen by the maintainer on 2026-11-13; [Q24](../QUESTIONS.md#q24) and [Q25](../QUESTIONS.md#q25) open).

Fourth slice of [ADR 0001](0001-strangler-migration.md), the progressive replacement announced in
[ADR 0005](0005-slice-annotation-loaders.md) section 2. `AnnotationStore` owns the data; five accessors of
`annotation/AnnotationStoreBridge.js` keep the legacy globals `Tracks`, `TracksInfo`, `Tags`, `TagsInfo`, `tagsHaveDM`
working. This slice rewrites their remaining users, one file per step, and removes the accessors when nobody reads them.
Module: `AnnotationStore` ([SEAM-701](../intent/seams.md)). No behavior changes.

## 1. Inventory (code only, comments and strings removed; `refactor/scratch/inventory.py`, 2026-11-13)

| File | `Tracks` | `TracksInfo` | `Tags` | `tagsHaveDM` | In-place writes among them |
|---|---|---|---|---|---|
| `annotation/AnnotationCodecBridge.js` | 2 | 1 | | | |
| `AnnotationIO.js` | 2 | 4 | 2 | | `TracksInfo[...] = ` (notes) |
| `OverlayControl.js` | 2 | | 7 | 1 | |
| `SelectionControl.js` | 5 | | 1 | | `delete Tracks[f][id]` (`deleteEvent`) |
| `Model.js` | 22 | | 2 | | `getObsHandle`, `storeObs`, `changeObservationID`: 4 index writes + 1 delete |
| `ZoomView.js` | 16 | | 10 | | `deleteFalsealarmEvents`, `deleteWrongIdEvents`, `deleteFalsealarmTags`: 4 + 1 deletes |
| `ChronoControl.js` | 16 | | 13 | | `cleanObsoleteEvents`: 3 deletes; `Tags` index write at `:1905` |
| **Total** | **65** | **5** | **35** | **1** | ~16 |

Not counted: the parameters named `Tracks`/`Tags` of `annotation/AnnotationCodec.js` (local names, not the global),
the inline handlers of `labelbee_page.html` (none read these names), `labelbee/legacy/views.py` (Python). The global is no
longer assigned anywhere outside the store (`setTracks`, `setTags`, `setEventsProp` write through it since slice 3).

## 2. Rule of the move
Each read `Tracks` becomes `AnnotationStore.getTracks()` (same for the others); the getters return the stored object itself, so
`delete Tracks[f][id]` and `Tracks[f][id] = obs` keep acting on the live data. No other change in the lines touched: no
renaming, no hoisting, no new per-observation API (that comes with the writers that need it, [Q21](../QUESTIONS.md#q21) of
ADR 0005). Style choice of the expression: [Q24](../QUESTIONS.md#q24).

## 3. Steps (separate commits, page working after each; goldens and browser tests green after each)
0. **Tests first, no production change.** Browser tests for the four mutation paths nothing covers yet:
   `deleteFalsealarmEvents`, `deleteWrongIdEvents`, `deleteFalsealarmTags`, `cleanObsoleteEvents` (and `changeObservationID`
   if swap id does not reach it). Plus a Node ratchet test (`refactor/tests/golden/slice4/`) that counts the code references
   to the five names per file (same stripping as the inventory) and fails when a count goes up or a migrated file has any:
   it shows progress and prevents regressions.
1. `annotation/AnnotationCodecBridge.js` + `AnnotationIO.js` (7).
2. `OverlayControl.js` (10).
3. `SelectionControl.js` (6).
4. `Model.js` (24).
5. `ZoomView.js` (26).
6. `ChronoControl.js` (29).
7. **Remove the accessors** (or keep them as console aliases, [Q25](../QUESTIONS.md#q25)): `installLegacyGlobals` reduced to
   `window.AnnotationStore`; the harness `golden/harness/io-env.js` and the browser tests that read the globals (B1, B2, B4,
   `setTracks([])` calls) switched to the store.
8. **Record**: PLAN, SEAM-701, modules.md state table, DEBT-712.

Order: smallest and best covered first, `ChronoControl.js` last (largest, derived data, most paths).

## 4. Checks
- Automated, after every step: `node --test refactor/tests/golden/` (211 + the ratchet), `pytest refactor/tests/browser` (55 + step 0).
- A step is a pure rename of identifiers: the diff of each commit is reviewed as such (`git diff --word-diff` shows only the
  five names replaced).

## 5. Risks
- A reader hidden in a string evaluated at run time (`eval`, inline handler built in JS): the inventory strips strings, so
  it would not see it. Mitigation: grep of the strings, and the browser tests.
- Functions called only from the console or rarely (cleanup, zoom deletes): step 0 covers them before they move.
- The Tags paths (`ChronoControl.js`, `ZoomView.js`, `OverlayControl.js`) serve the obsolescent tag file
  ([DEC-006](../intent/decisions.md)): they are migrated for consistency, not extended.
