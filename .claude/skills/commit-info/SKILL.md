---
name: commit-info
description: Summarize what is pending commit (conceptually, as pure facts) with a draft commit message and the repo, branch and folder the commit would run from. Use when the user asks for commit info, a pre-commit summary, or when work is ready for review before committing. Read-only: never stages, commits or pushes.
allowed-tools: Bash(pwd) Bash(git rev-parse *) Bash(git remote *) Bash(git status *) Bash(git diff *)
---

# commit-info

Print a short, factual summary of the pending changes and a commit message draft. Then stop.
Do not stage, commit, push or change anything.

## 1. Facts (pre-collected)

```!
pwd; 
git rev-parse --show-toplevel --abbrev-ref HEAD; git rev-parse --short HEAD || true
git remote get-url origin || true
git rev-parse --git-dir --git-common-dir || true
git status --porcelain=v1 -uall -- . ':!.bash_profile' ':!.bashrc' ':!.profile' ':!.zprofile' ':!.zshrc' ':!.gitconfig' ':!.gitmodules' ':!.idea' ':!.mcp.json' ':!.ripgreprc' ':!.claude/agents' ':!.claude/commands' ':!.claude/hooks' ':!.claude/launch.json' ':!.claude/loop.md' ':!.claude/output-styles' ':!.claude/routines' ':!.claude/skills' ':!.claude/workflows' 2>/dev/null || true
git diff HEAD --numstat || true
```

Parse these fact to extract the following information:
- `pwd`: to make sure we are in the correct directory
- `git rev-parse --show-toplevel` and `pwd`: folder the commit runs from
- `git rev-parse --abbrev-ref HEAD`, `git rev-parse --short HEAD`
- `git remote get-url origin` (repo name = last path segment without `.git`; none -> "no remote")
- `git rev-parse --git-dir --git-common-dir` (differ -> linked worktree)
- `git status --porcelain=v1 -uall`: staged, unstaged and untracked paths (ignored files are not pending)
- `git diff HEAD --numstat` for line counts; 

Only when the intent of a change is not clear from paths and names, you can run an extra `git diff HEAD`. For unclear untracked files read the first lines.

Pending = staged + unstaged + untracked (not ignored). If none: print `Nothing pending.` and the target line (section 4), nothing else.

## 2. Summarize conceptually

- Say what the change does, in one line per concept, not file by file. Facts only: no narrative, no hedging, no "this PR".
- Count per concept as `[## added, ## changed, ## deleted]`; omit zero terms. Renames count as changed.
- Up to 8 files: list concepts with their files in parentheses.
- More than 8 files: group by folder (shallowest folder that gives meaningful groups, e.g. `refactor/intent`, `labelbee/blueprints/api`), each as `folder [## added, ## changed, ## deleted]` plus one concept line. Order by importance. Put the least important groups together in `misc [...]`.
- State facts that matter for review in one line each, only when true
- Keep secrets, `.env`, sqlite DB, data or upload files, files over ~1 MB, merge-conflict markers, files outside the stated scope, if present in staged files, they should be flagged.
- Ignored files should not be reported about

## 3. Draft commit message

- Subject: imperative, <= 72 characters, no trailing period.
- Body only when the subject cannot carry the facts: <= 3 short lines. If the commit is exceptionnally large with multiple topics addressed all at once, consider more lines, but then define a short keyword to prefix each line with the topic of the item, with an ideal 3 lines max per topic.
- Follow the project's commit rules and attribution trailer if the session or `CLAUDE.md` gives them (for example a `Co-Authored-By:` line). Do not invent one.

## 4. Output format

Exactly this, nothing before or after:

```
# Commit draft: N files [staged S, unstaged U, untracked T], +A -D lines
TO BE STAGED:
- <concept or folder> [## added, ## changed, ## deleted]: <one line>
- <concept or folder> [...]: <one line>
- misc [...]: <files>        (only when more than 8 files)
OUTSIDE OF SCOPE:
- <concept or folder> [## added, ## changed, ## deleted]: <one line>
... or None if no modificatons are outside the scope

[**Flags:** <warning about any flagged file> (only if present)] 

# Message Draft:
<subject>
<optional body, as - bullets>

<trailer, if required>

# Commit to: `<repo>` · branch `<branch>` (`<short sha>`)
from `<absolute folder>`[ · worktree of `<main folder>`]
```

Rules: no extra prose, no questions, no recap of the request. Write `Commit to:` last, always.
