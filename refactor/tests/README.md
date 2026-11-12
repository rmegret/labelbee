# refactor/tests/

Layout: `golden/harness/` is the shared harness; each slice has its own `golden/sliceN/` folder
(fixtures, generator, test, golden file).

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
    node refactor/tests/golden/slice2/generate.js    # re-pin goldens from the OLD code (review the diff!)

- `golden/slice2/fixtures/cases.js`: synthetic `Tracks` cases; every case has the signature of the module:
  `convertTracksToV2(Tracks, TracksInfo, videoinfo)`, the others `(Tracks)`.
- `golden/slice2/annotation-save.golden.json`: pinned return value (or thrown error name) and the inputs
  after the call, which is where the in-place mutations of `TracksInfo` (DEBT-706) and of the live `Tracks`
  (DEBT-707) are visible.
- `golden/harness/old-save-impl.js`: extracts the original functions from `AnnotationIO.js` into a `vm`; sets
  the page globals from the arguments and replaces `Date()` by a fixed string.
- `golden/slice2/roundtrip.test.js`: v2 save then `sanitizeEvents` (slice 1 module); assertions, not a golden.
- Like slice 1, `generate.js` and the `old` side stop working when step 3 deletes the old definitions.
