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
- Behavior-preserving steps only; one small, reviewable step at a time.
- Record structural decisions as ADRs in `refactor/design/` *before* implementing them.
- No drive-by changes outside the current step.
- Do not edit `labelbee/static/labelbee/js/extern/`, `labelbee/legacy/` or generated
  `docs/build/` without asking.
- Match surrounding code style (naming, comment density, idiom).
- Never commit data, uploads, secrets or the sqlite DB.

