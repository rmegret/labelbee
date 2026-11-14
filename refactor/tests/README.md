# refactor/tests/

Layout: `golden/harness/` is the shared harness; each slice has its own `golden/sliceN/` folder
(fixtures, generator, test, golden file).

Browser tests (real page in headless Chromium, 79 tests, [browser/README.md](browser/README.md)) automate the manual
[CHECKLIST.md](CHECKLIST.md): `pytest refactor/tests/browser`. Run them and the golden tests before merging a slice;
keep the checklist for what a script cannot judge (see its first lines). Environment: [devenv/README.md](devenv/README.md).

## Golden tests: annotation load codec (slice 1, [ADR 0002](../design/0002-slice-annotation-load-codec.md))
Node >= 18, no npm dependency. In this setup Node lives in `~/.nvm/versions/node/v20.20.2/bin`.

    node --test refactor/tests/golden/slice1/        # run

- `golden/slice1/fixtures/cases.js`: synthetic cases (Q8), one entry per pinned behavior.
- `golden/slice1/annotation-load.golden.json`: pinned observation per case: return value, inputs
  after the call, alerts, error-path logs (`ABORTED`/`unsupported`/`WARNING`), `console.error`
  (error name only), SQL sent to the db stub. Routine progress logs are not pinned.
- `golden/harness/stubs.js`: recorder of observable effects (alerts, pinned logs, errors, SQL) and the
  real `hasLabel` chain extracted from `SelectionControl.js` into a `vm`. Slice-1 specific
  (function list); generalize when a second slice needs it.
- `golden/harness/new-impl.js`: loads `annotation/AnnotationCodec.js` (ESM) and sets the Notifier and
  `configure` like the page bridge; the test runs every case against the golden.
- `golden/harness/run-case.js`, `golden/harness/serialize.js`: generic.
- The golden was generated from the original `AnnotationIO.js` functions (last present in commit
  `353ffa9e`); step 3 deleted them, so it is now the only reference. A change in it is a behavior
  change: review the diff.

## Golden tests: annotation save/export codec (slice 2, [ADR 0004](../design/0004-slice-annotation-save-codec.md))

    node --test refactor/tests/golden/slice2/        # run

- `golden/slice2/fixtures/cases.js`: synthetic `Tracks` cases; every case has the signature of the module:
  `convertTracksToV2(Tracks, TracksInfo, videoinfo)`, the others `(Tracks)`.
- `golden/slice2/annotation-save.golden.json`: pinned return value (or thrown error name) and the inputs
  after the call, which is where the in-place mutations of `TracksInfo` (DEBT-706) and of the live `Tracks`
  (DEBT-707) are visible.
- `golden/harness/save-stubs.js`: the list of save functions and the fixed string standing for `Date()`.
- `golden/harness/new-save-impl.js`: loads the save side of `annotation/AnnotationCodec.js` (ESM), sets the
  Notifier like the page bridge and fixes `Date()` for the duration of each call; the test runs every case
  against the golden.
- `golden/slice2/roundtrip.test.js`: v2 save then `sanitizeEvents` (slice 1 module); assertions, not a golden.
- The golden was generated from the original `AnnotationIO.js` functions (last present in commit `e1831be7`,
  with `golden/harness/old-save-impl.js` and `golden/slice2/generate.js`); step 3 deleted them, so it is now
  the only reference. A change in it is a behavior change: review the diff.

## Golden tests: setTracks/setTags and the loaders (slice 3, [ADR 0005](../design/0005-slice-annotation-loaders.md))

    node --test refactor/tests/golden/slice3/        # run
    node refactor/tests/golden/slice3/generate.js    # regenerate the golden (see below)

- `golden/slice3/fixtures/cases.js`: synthetic cases (Q8): `setTracks`, `setTags`, `setEventsProp`, erase, the
  local file loaders, `eventsFromServer`, `loadEventsFromServerByID`, `tagsFromServer`, the three CSV loaders,
  the DB loader and the two prompt handlers. Case fields: `init` (page state before), `net` (what the stubbed
  `$.ajax`/`$.getJSON`/`$.get`/`d3.csv` answer), `confirm`/`prompt`, `pinReturn`.
- `golden/slice3/annotation-io.golden.json`: per case the state after the call (`Tracks`, `TracksInfo`, `Tags`,
  `TagsInfo`, `tagsHaveDM`, `ttags`), the ordered effects `fx` (requests, `$` calls, refreshes), errors thrown
  inside callbacks (`cbErrors`), unhandled promise rejections, alerts, error-path logs. It pins known defects as
  they are today: DEBT-710, 712 (double refresh), 713, 719, 722, 733, 734.
- `golden/harness/io-env.js`: loads the REAL functions of `AnnotationIO.js` into a `vm` (the file stays the
  implementation under test during the whole slice, so one golden checks every step) with jQuery, d3,
  `FileReader`, the views and `Date` stubbed. The page globals (`Tags`, `TagsInfo`, `tagsHaveDM`; `Tracks` and `TracksInfo` went in slice 4 step 5a, the harness reads them through the store) are the accessors of
  `AnnotationStoreBridge.js` over a fresh store per case; `readState`/`writeState` use them. `golden/harness/run-io-case.js` runs a case and waits for the promises.
- Run `generate.js` only before a step that changes behavior on purpose, and review the golden diff.
- `golden/slice3/store.test.js`: contract tests (assertions, no golden) of `AnnotationStore.js` and the bridge: defaults,
  same-object identity, in-place edits seen on both sides, assignments reaching the store, bare-name access from sloppy code in a `vm`.
- `golden/slice3/loaders.test.js`: assertions on what the loaders return (step 4): `tagsFromServer` stays `undefined`,
  `loadEventsFromServerByID` resolves at once, an exception of the apply stage is not treated as a request error.
- `golden/slice3/diff-against-golden.js`: prints per case what differs from the golden; run it before `generate.js`.
- `golden/harness/unhandled.js`: takes over the `unhandledRejection` event while a case runs (the node test runner would
  fail the test otherwise); unhandled rejections are pinned in the golden as `rejections`.

## Differential tests: `Events` (slice 4, [ADR 0007](../design/0007-slice-events-api.md))

    node --test refactor/tests/golden/slice4/        # run

- `golden/slice4/legacy-model.js`: frozen copy of the legacy direct operations on `Tracks` (the `Model.js` functions and the
  plain deletes of the writers outside it, commit `07314c1e`). It is the reference: do not edit it. Step 2 turns the `Model.js`
  functions into wrappers, so the reference cannot live there any more.
- `golden/slice4/events.test.js`: 300 random sequences of 40 operations (null frames and entries, array or object start, numeric
  and string ids, swap with collisions, forced renames, deletes) run on `annotation/Events.js` and on the reference; after each
  operation the structure (content, key order, array or object), the return value and the queries must be equal. Then contract
  tests for what the ADR states (prune, `getFrame` is a new object, `update`, `commit`, observer, iteration order) and the store.
- The deliberate differences from the legacy code: `delete` prunes the emptied frame (the reference does it after an actual
  deletion, as the ADR says; the legacy `deleteEvent` and `cleanObsoleteEvents` did not), and, since step 7a, `commit` keeps the other
  fields of the working copy (the driver of the test applies the same rule to the reference).
- `golden/slice4/roundtrip.test.js` (step 7d): on the sample events files (v2, v1, v1 array, v2 duplicates), load, save, load is the identity
  (modulo the conventions: `ID` as a string, 3 decimals, null and empty frames not saved); a commit of every unchanged working copy (made
  by the real `cloneObs`, `Model.js` run in a `vm`) changes nothing in the saved file; a stored field that the working copy does not
  carry (an unknown field, `span`, `tag`) survives the commit and the save; an edit of one field changes only that field.
- `golden/slice4/debug-globals.test.js`: the console-only debug globals (`annotation/DebugGlobals.js`).
