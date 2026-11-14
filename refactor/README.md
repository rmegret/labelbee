# refactor/

Single home for refactor working assets. Committed unless noted.

- `PLAN.md`: roadmap, phases, status checklist (living document)
- `analysis/`: architecture map, module inventory, dependency graphs, code smells
- `design/`: target architecture and ADRs, numbered `NNNN-title.md`
- `tests/`: safety-net notes: characterization tests, fixtures, `CHECKLIST.md`
- `scratch/`: **git-ignored** throwaway notes, dumps, generated graphs

## Analysis
Start at `analysis/README.md` (stages 1-7: architecture -> backend -> frontend
structure -> data model -> classes/interactions -> smells -> questions & proposals).

## Map of the repo root (to be completed by the analysis)
- `labelbee/app.py`, `blueprints/`, `models.py`, `database/`, `settings/`: backend
- `labelbee/static/labelbee/js/`: frontend modules (`labelBee.js` entry,
  `AnnotationIO.js`, `Model.js`, `VideoControl.js`, `OverlayControl.js`,
  `ZoomView.js`, `Chrono*.js`, `SelectionControl.js`, `DuckDB.js`, `SQLiteDB.js`)
- `tests/`: pytest backend tests
- `docs/`: Sphinx docs

## Commands
- Run / setup: see `README.md`, `README_deployment.md`, `gunicorn_start.sh`
- Backend tests: `pytest tests/` (`tox.ini` is stale; do not rely on it)
- Frontend tests: TBD (see `refactor/tests/`)
- Debugging in the browser console: the page has no `Tracks`, `TracksInfo`, `Tags`, `TagsInfo` or `tagsHaveDM` global any more (slice 4); `window.events` is the stored
  events (`events.get(f, id)`, `events.getFrame(f)`, `events.frames()`, `events.forEach(fn)`). For the old habit, open the page with `?debug_globals`
  (or run `installDebugGlobals()` in the console): the five then exist as read-only views for the console and watch expressions, and
  throw an error when page code reads them (`labelbee/static/labelbee/js/annotation/DebugGlobals.js`). The page itself uses `events` and
  `AnnotationStore.getTags()`, `getTagsInfo()`, `getTagsHaveDM()`.

## Conventions
TBD after analysis.
