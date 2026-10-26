# refactor/

Single home for refactor working assets. Committed unless noted.

- `PLAN.md`: roadmap, phases, status checklist (living document)
- `analysis/`: architecture map, module inventory, dependency graphs, code smells
- `design/`: target architecture and ADRs, numbered `NNNN-title.md`
- `tests/`: safety-net notes: characterization tests, fixtures, `CHECKLIST.md`
- `scratch/`: **git-ignored** throwaway notes, dumps, generated graphs

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

## Conventions
TBD after analysis.