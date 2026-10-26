# Analysis of LabelBee (static code analysis)

Status: **complete first pass**. Method: reading and grep only. Nothing was run
(no app, no tests, no scripts). Anything inferred rather than read is marked
**(unverified)**.

Snapshot: branch `refactor` @ `eafbd6ac`. Size (excluding `extern/`, `legacy/`, `docs/build`):
~1.5k lines of Python, ~18k lines of vanilla JS, a 1.6k-line Jinja page.

## Stages (read in order, general -> specific)

| Stage | File | Question it answers |
|-------|------|---------------------|
| 1 | [01-architecture.md](01-architecture.md) | What are the big blocks, how is it deployed, how does a request / a session flow? |
| 2 | [02-backend.md](02-backend.md) | Flask app factory, blueprints, REST API, DB layer, models, config |
| 3 | [03-frontend-structure.md](03-frontend-structure.md) | JS files, load order, global symbols, coupling matrix, event bus |
| 4 | [04-data-model.md](04-data-model.md) | `Tracks`, `Tags`, derived structures, file formats, who mutates what |
| 5 | [05-classes-and-interactions.md](05-classes-and-interactions.md) | Each class/module in detail + sequence diagrams of key scenarios |
| 6 | [06-smells-and-risks.md](06-smells-and-risks.md) | Ranked findings: bugs, security, dead code, duplication |
| 7 | [07-questions-and-proposals.md](07-questions-and-proposals.md) | **Open questions for the maintainer + proposed refactor strategy** |

Diagrams are Mermaid (render in GitHub / VS Code / any Mermaid viewer).

## PLAN.md status update to apply

This analysis was produced in a separate git worktree that does not contain
`refactor/PLAN.md` / `refactor/README.md` (they live on branch `refactor`). When
the `analysis/` folder is copied onto `refactor`, update `PLAN.md` Phase 1 to:

- [x] Backend inventory -> `analysis/02-backend.md`
- [x] Frontend module inventory and dependency graph -> `analysis/03-frontend-structure.md`
- [x] Global state / coupling hot spots -> `analysis/03`, `04`, `05`
- [x] Dead / legacy code candidates -> `analysis/06-smells-and-risks.md` (6.4; verify before deleting)
- [x] Architecture analysis -> this folder
- [ ] Maintainer review of `07-questions-and-proposals.md` (Q2, Q4, Q5, Q8, Q11, Q12 needed to start Phase 2)

and add a line to `refactor/README.md` pointing at `analysis/README.md`.

## One-paragraph summary

LabelBee is two loosely related programs sharing one server. (a) A conventional
small Flask app (users, datasets, videos, REST API, file serving) that is
reasonably structured but has duplicated models, stale tests and a few
security-relevant shortcuts. (b) A ~18k-line browser application (the
annotator) written as ES5/ES6 scripts sharing **global variables**, with one
huge file per concern (`OverlayControl.js` 4.5k lines, `ZoomView.js` 2.3k,
`AnnotationIO.js` 2.1k, `ChronoControl.js` 2.0k). Modules talk through (1)
implicit globals, (2) direct calls to global singletons (`overlay`,
`videoControl`, ...), and (3) a thin jQuery event bus. The annotation data
(`Tracks`, `Tags`) is two global mutable objects written by many modules. The
largest refactor risk and payoff is in (b); (a) needs mostly hygiene.
