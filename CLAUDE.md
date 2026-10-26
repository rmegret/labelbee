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

### Worktree jobs (background/parallel sessions)
`refactor` is the trunk; `master` is irrelevant here. A job branch is always
created from the current local `refactor` tip and merged back by the user.

Start (before any edit, in this order):
1. Inspect the main checkout (`~/labelbee`, on `refactor`) read-only:
   `git status --porcelain`. Never stash, reset, commit or edit there.
2. Create the worktree from `refactor`, then enter it:
   `git worktree add -b <job-name> .claude/worktrees/<job-name> refactor`
   `EnterWorktree` with `path=`. Never use the default `name=` mode (it
   branches from the default branch, not `refactor`).
3. Verify `git rev-parse HEAD` == `git rev-parse refactor` and the tracked tree
   is clean. If not, remove the worktree and redo step 2; do not repair with
   reset or checkout.
4. If step 1 listed uncommitted files in the main checkout, they are NOT in the
   worktree. State the job's scope (files/dirs it will edit) in its first message,
   and compare it with the dirty paths:
   - no overlap: proceed, and list the dirty files in the final report;
   - overlap, or the task needs those changes: stop with `needs input:` naming
     the files (the user commits or stashes, then relaunches).
   Reading a dirty file from the main checkout for context is allowed, but say so.

Finish:
5. `git rev-list refactor..HEAD` lists only this job's commits. If `refactor`
   moved, `git rebase refactor` on the job branch only; on any conflict run
   `git rebase --abort` and report instead of resolving.
6. `git diff --stat refactor..HEAD` touches only the step's scope. In `PLAN.md`
   change only the lines for this step.
7. Report job branch, base SHA, commit SHA and the merge command. In
   `~/labelbee`, merge only if `refactor` is an ancestor of the job branch, and
   keep an explicit merge commit so the job shows as a parallel lane:
   `git merge-base --is-ancestor refactor <job-branch> && git merge --no-ff <job-branch>`
   (`--no-ff` alone would also merge a diverged branch; the guard prevents it.
   If the guard fails, rebase the job branch per step 5; cherry-pick only if it
   could not be rebased.) Never delete the job branch or its ref after merging
   (no `git branch -d`; `git worktree remove` is fine): its head must stay
   visible on the last commit of the lane in `git log --graph --decorate`.
   Never modify protected paths (`.claude/settings.json`).

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

