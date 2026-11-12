# ADR 0003: Notifier, one shared module for alerts and logs

Status: proposed (maintainer chose this on 2026-10-30; first user: slice 1, [ADR 0002](0002-slice-annotation-load-codec.md))

## Context

Extracted modules must not call `alert`, `console.*` or read `logging.io` directly: the goldens
pin them, and the app will want one place that decides where a message goes (dialog, console,
both). Per-module injection (`deps` parameters, then a `configure` with allowed/required lists)
was tried in slice 1 and judged too heavy to repeat in every module.

## Decision

`labelbee/static/labelbee/js/core/Notifier.js`, an ES module imported by every module that
notifies. Cross-cutting services only; domain collaborators (`hasLabel`, a future
`AnnotationStore`) are never put in it.

- Owns the debug-level flags: `export const logging = {...}`, moved verbatim from `labelBee.js`
  (the `var logging` there is deleted). `logIO()` reads `logging.io` at call time.
- Exports bare functions `alert(msg)`, `log(...)`, `logError(...)`, `logIO()` so moved code keeps
  its call sites. `alert`/`log`/`logError` delegate to replaceable handlers.
- `setNotifier({alert, log, logError})` replaces any subset of handlers; tests call it with recorders.
- `js/core/NotifierBridge.js` (a `<script type="module">` in `labelbee_page.html`, before the other
  bridges) sets `window.logging = logging`: same object, so legacy reads and `logging.io = true`
  from the console keep working. Removed when no classic script reads `logging`.
- Defaults work without setup: `alert` -> `globalThis.alert` if present else `console.warn`;
  `log`/`logError` -> console.
- Module state is shared by all importers: one handler set per page. Tests set the handlers per
  case (files run in separate processes under `node --test`).

## Load order (checked 2026-10-30)

Module scripts are deferred, so `window.logging` exists only after the classic scripts ran. Checked
[ran, `refactor/scratch/` heuristics]: no classic script reads `logging` at top level or in a
load-time wrapper (the page starts from `window.onload`, which fires after deferred modules). The
unloaded `DuckDB.js`/`SQLiteDB.js` are not covered. To confirm in the browser.

## Later

A notification class (dialog, console or both, user-customizable) replaces the handler bodies; the
exported function names and call sites stay. The `warnings[]` return of
[SEAM-702](../intent/seams.md) is a separate semantic step.

## Not decided here

A general service registry; any other service than alert/log/logError/logIO and the `logging` flags.
