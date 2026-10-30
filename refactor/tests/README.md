# refactor/tests/

Layout: `golden/harness/` is the shared harness; each slice has its own `golden/sliceN/` folder
(fixtures, generator, test, golden file).

## Golden tests: annotation load codec (slice 1, [ADR 0002](../design/0002-slice-annotation-load-codec.md))
Node >= 18, no npm dependency. In this setup Node lives in `~/.nvm/versions/node/v20.20.2/bin`.

    node --test refactor/tests/golden/slice1/        # run
    node refactor/tests/golden/slice1/generate.js    # re-pin goldens from the OLD code (review the diff!)

- `golden/slice1/fixtures/cases.js`: synthetic cases (Q8), one entry per pinned behavior.
- `golden/slice1/annotation-load.golden.json`: pinned observation per case: return value, inputs
  after the call, alerts, error-path logs (`ABORTED`/`unsupported`/`WARNING`), `console.error`
  (error name only), SQL sent to the db stub. Routine progress logs are not pinned.
- `golden/harness/old-impl.js`: extracts the original functions from `AnnotationIO.js` (and the real
  `hasLabel` chain from `SelectionControl.js`) and evaluates them in a `vm` with stubbed globals.
  Still slice-1 specific (function list, files, stubs); generalize when a second slice needs it.
- `golden/harness/new-impl.js`: loads `annotation/AnnotationCodec.js` (ESM) and sets the Notifier and `configure` like the page bridge; the test runs every case
  on `old` and `new` against the same golden.
- `golden/harness/run-case.js`, `golden/harness/serialize.js`: generic.
- Extraction reads the source files, so `generate.js` stops working once step 3 deletes the old
  definitions; the golden file then stays as the reference.
