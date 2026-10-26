# LabelBee

Web app to visualize and annotate videos of bee activity.
Flask backend (`labelbee/`) + vanilla-JS frontend (`labelbee/static/labelbee/js/`).

## Current focus: deep refactor (branch `refactor`)

Before any work:
- read `refactor/README.md` (reference information about the refactoring).
- read `refactor/PLAN.md` (roadmap + status). Update it after each step.
All refactor knowledge lives in `refactor/` (see `refactor/README.md`); nothing
Claude-specific goes under `labelbee/`, `tests/` or `docs/`.

### Rules
- Work only on branch `refactor`. Never commit unless the user asks.
  Exception: a background job working in its own worktree branch commits there
  (never to `refactor`, never pushes); the user merges or cherry-picks.
- Behavior-preserving steps only; one small, reviewable step at a time.
- Record structural decisions as ADRs in `refactor/design/` *before* implementing them.
- No drive-by changes outside the current step.
- Do not edit `labelbee/static/labelbee/js/extern/`, `labelbee/legacy/` or generated
  `docs/build/` without asking.
- Match surrounding code style (naming, comment density, idiom).
- Never commit data, uploads, secrets or the sqlite DB.

### Analysis rules (Phase 1 and any re-analysis)
- Every finding has a unique ID (`S1`, `C1`, `Arch1`, `Leg1`, `Back1`, `Doc1`...)
  and an evidence tag: `[read]` (path:line seen in code), `[ran]` (command run,
  output kept in `refactor/scratch/`) or `[inferred]`. Severity H/M only for
  `[read]`/`[ran]`; `[inferred]` items stay unranked until verified.
- Static-only analysis never runs code. Verification of H items is a separate
  PLAN step that needs permission to run things.
- Cite repo-relative paths (`labelbee/blueprints/api/resources/video.py:120`),
  never bare filenames. Approximate numbers are fine (mark with `~`).
- Size budget: index <=60 lines, one file per stage <=150 lines. Tables over
  prose, link instead of restating a fact from another stage.
- `analysis/` describes the current state only. Questions go in
  `refactor/QUESTIONS.md`; target architecture and step lists go in `design/`
  ADRs and `PLAN.md`.
- No step proceeds on a "default" answer unless the maintainer said so.
- Never copy credential values into docs; cite file:line only.
- Background/worktree jobs write into `refactor/` of their worktree and report
  branch + path. Do not leave "apply this later" notes in the docs.

