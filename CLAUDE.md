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
- Branching and commit/merge should follow rules in worktree section below
- Behavior-preserving steps only; one small, reviewable step at a time.
- Record structural decisions as ADRs in `refactor/design/` *before* implementing them.
- No drive-by changes outside the current step.
- Do not edit `labelbee/static/labelbee/js/extern/`, `labelbee/legacy/` or generated
  `docs/build/` without asking.
- Match surrounding code style (naming, comment density, idiom).
- Never commit data, uploads, secrets or the sqlite DB.

### Worktree jobs (background/parallel sessions)
`refactor` is the trunk; `main` or `master` are irrelevant here. A job branch is always
created from the current local `refactor` tip and merged back by the user.

Start (before any edit, in this order):
1. Inspect the refactor checkout (`~/labelbee`, on `refactor`) read-only:
   `git status --porcelain`. Never stash, reset, commit or edit there.
2. If step 1 listed uncommitted files in the refactor checkout, 
   they are NOT in the worktree. 
   State the job's scope (files/dirs it will edit) in its first message, and compare it with the dirty paths:
   - no overlap: proceed, and list the dirty files in the final report;
   - overlap, or the task needs those changes: stop with `needs input:` naming the files (the user commits or stashes, then relaunches).
   Reading a dirty file from the main checkout for context is allowed, but say so.
3. Create the worktree from `refactor`, then enter it:
   `git worktree add -b <job-name> .claude/worktrees/<job-name> refactor`
   `EnterWorktree` with `path=`. Never use the default `name=` mode (it
   branches from the default branch, not `refactor`).
4. Verify `git rev-parse HEAD` == `git rev-parse refactor` and the tracked tree
   is clean. If not, remove the worktree and redo step 2; do not repair with
   reset or checkout.

Finish:
5. Review gate. Do the work and leave it uncommitted in the worktree. 
   Sanity-check it, then tell the user it is ready for commit: 
   files changed (`git status --short`, `git diff --stat`), 
   the checks run, and the proposed commit message. 
   Then stop and wait. 
   Do not commit, rebase or merge until the user has reviewed and explicitly says to commit. 
   If they ask for changes, edit and report ready again (still uncommitted).
6. After approval only: commit on the job branch with the approved message.
7. `git rev-list refactor..HEAD` lists only this job's commits. If `refactor`
   moved, `git rebase refactor` on the job branch only; on any conflict run
   `git rebase --abort` and report instead of resolving.
8. `git diff --stat refactor..HEAD` touches only the step's scope. In `PLAN.md`
   change only the lines for this step.
9. Report job branch, base SHA, commit SHA and the merge command. In
   `~/labelbee`, merge only if `refactor` is an ancestor of the job branch, and
   keep an explicit merge commit so the job shows as a parallel lane:
   `git merge-base --is-ancestor refactor <job-branch> && git merge --no-ff <job-branch>`
   (`--no-ff` alone would also merge a diverged branch; the guard prevents it.
   If the guard fails, rebase the job branch per step 7; cherry-pick only if it
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
  prose (except questions, see below), link instead of restating a fact from another stage.
- `analysis/` describes the current state only. Questions go in
  `refactor/QUESTIONS.md`; target architecture and step lists go in `design/`
  ADRs and `PLAN.md`.
- Questions are paragraphs, never table rows. One per question, parts on separate
  lines, a part omitted when not relevant:
  ```
      **<a id='q<id>'>Q<id></a>: <name>**
      <question>
      _Significance_: <why it matters>
      _Proposed_: <proposed default, used only once the maintainer confirms it>
  ```
- Inside a same document, add internal links, such as `[Q2](#q2)` to facilitate navigation. Do the same from connected documents as 
`[Q2](<relative path>/07-questions-and-proposals.md#q2)`
- No step proceeds on a "default" answer unless the maintainer said so.
- Never copy credential values into docs; cite `file:line` only.
- Background/worktree jobs write into `refactor/` of their worktree and report branch + path. Do not leave "apply this later" notes in the docs.

