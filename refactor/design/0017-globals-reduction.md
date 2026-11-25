# ADR 0017: reducing the page globals (slice 8 step 16)

Status: accepted for 16b-16c; 16d as answered in [Q45](../QUESTIONS.md#q45) (maintainer, 2026-11-25).

## Context
[analysis/09](../analysis/09-globals.md): 233 names on `window`; 127 necessary (library, handler, page script, tests/console), 106 spurious
(read only by modules that can import, or read by nobody).

## Decision
Reduce the spurious ones, each sub-step behavior-preserving, golden and targeted browser tests per step, table regenerated at each:

| Step | What | Names |
|---|---|---|
| 16b | Stop installing the names nobody reads (and delete the ones that are dead functions only if the scan shows no reference at all) | 19 (Glob2) |
| 16c | Readers import instead of reading the global: by owner module, one commit per group, then drop the name from the bridge | 87 (Glob1), `AnnotationStore` and `events` last |
| 16d | Tests reach module functions by `import` (golden) or `import()` of the module URL (browser), then the 33 test-only names are no longer installed, except `refreshLog`. `window.debug_modules()` (off by default, beside `installDebugGlobals`) exposes all modules for console checks only | 33 (Glob7) |
| 16e | Declare `p`, `i`, `temp` of the page script locally (Glob6) | 3 |

Policy: on `window` only singletons, modules (via `debug_modules()` only) and necessary debug globals; no individual module function or variable.

Kept global: library names, handler-named names (singletons `overlay`, `videoControl`... included, [Q38](../QUESTIONS.md#q38)), page-script names.

## Rules
1. A name is removed from the bridge only after the scan shows no module reads it without import and no handler or page script names it.
2. A dead function is not deleted in 16b, only no longer installed; deletion is a separate decision.
3. Small commits: one owner module (or a few leaf readers) per commit; a group that breaks tests is split, not fixed in bulk.
4. Order inside 16c: leaves first (functions read by one file), the state objects last.
