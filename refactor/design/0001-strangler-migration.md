# ADR 0001: Strangler-style incremental migration

Status: **accepted** (maintainer, 2026-11-18; applied since slice 1)

## Context

The analysis found a front end of global functions and shared mutable state
(`Tracks`, `Tags`, `videoControl`, `overlay`, ...) across ~10 files, loaded by plain
`<script>` tags and inline `onclick` handlers. The intent drafts (`intent/capabilities.md`,
`intent/modules.md`) describe a target split, but changing many areas at once would leave
the page broken for long stretches and cannot be reviewed or tested.

## Decision

Migrate by **strangling**, one slice at a time. The old code keeps running; each slice moves
one responsibility behind a small new module, redirects its callers, and deletes the old code.

A slice is one proposed module (or one part of one) from `intent/modules.md`. For each slice:

1. **Pick** one slice. Name its callers with grep. No design beyond that slice.
2. **Add** the new module next to the old code, with a temporary `window.X` bridge so
   untouched files and inline handlers keep working.
3. **Check**: a golden-file test if the logic is pure, otherwise the manual `tests/CHECKLIST.md`
   items that exercise the slice. Nothing wider.
4. **Redirect** callers to the new module, in separate commits from the move.
5. **Delete** the old code and the bridge entries no longer used. A slice is not done until
   the old path is gone.
6. **Record**: update `PLAN.md`; update only the intent items (CAP, DEBT, SEAM) the slice touched.

Rules:
- The page works after every step; one slice in flight at a time.
- Mechanical moves and semantic changes are separate steps.
- Known bugs are recorded as `DEBT`, not fixed inside a move (DEC-004).
- The slice order is chosen one step at a time, from the backlog in `PLAN.md`, after the
  previous slice has merged.

## Consequences

- Progress is visible: the old files shrink and bridges disappear.
- Temporary duplication (bridge, adapter) is accepted, and has to be removed in the same slice.
- Target modules in `intent/modules.md` stay a direction, not a commitment; a slice may change
  them, and the draft is then corrected.
- No up-front global design phase and no full safety net before the first move.

## Alternatives

- **Big-bang rewrite or split of all files at once**: rejected, cannot be kept working or reviewed.
- **Full spec and test coverage first**: rejected for now, too costly relative to the information
  gained; checks are added per slice.
