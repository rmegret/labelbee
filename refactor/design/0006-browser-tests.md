# ADR 0006: Automated browser tests

Status: proposed (decisions taken by the maintainer on 2026-11-12: Python Playwright, tests in `refactor/tests/browser/`).

Fourth layer of the safety net of [ADR 0001](0001-strangler-migration.md) step 3. Until now a slice was checked by golden
tests in Node (pure logic and the loaders against stubs) plus a manual browser pass ([CHECKLIST](../tests/CHECKLIST.md)).
Three slices went in without the manual pass being run. This ADR records how the manual pass is automated.

## 1. Decisions

| Question | Decision | Why |
|---|---|---|
| Tool | Playwright for Python, through pytest (`pytest-playwright`) | One runner for the backend and the browser tests; Node stays only for the golden tests (no npm package anywhere) |
| Where | `refactor/tests/browser/` | Test tooling lives under `refactor/tests/` (maintainer answer Q11); nothing under `labelbee/`, `tests/` or `docs/` is touched |
| What the page talks to | `tests/webapp/serve.py`, the existing dev webapp: standard library, no database, no login, stubs of the endpoints the page calls, five seeded annotations | The real page and static files run unchanged; fast and deterministic. The real backend is a later layer |
| How the dev webapp is used | A temporary copy built by the fixture (the same `serve.py`, copied sample files, a symlink to `labelbee/`) | `serve.py` fixes its paths relative to itself; the committed files are not modified |
| Environment | Conda `labelbeedev` (`refactor/tests/devenv/`): Python 3.11, Node 20, ffmpeg; pip installs the repository's `requirements.txt` plus `requirements-dev.txt` | `requirements.txt` pins numpy 1.24.4 and greenlet 3.0.3, which stop at Python 3.11 |
| Video | VP9 inside an `.mp4`, made by ffmpeg per run | Playwright's Chromium has no H.264; the page accepts the file as is |
| Console | Every test fails on an unexpected console error, uncaught exception, unhandled rejection or 404, unless it declared it | Checklist item E1 becomes enforced everywhere, not one more item |
| Real interactions | Clicks, typing and file inputs, not calls of page functions; the model is only read back for assertions | A test that calls `setTracks` proves little about the page. Exceptions are labeled (`tagMode` switch, `setTracks([])` to avoid a confirmation) |

## 2. Consequences
- The checklist items A1-E1 are automated (52 tests, about a minute). What stays manual: drawing quality, H.264
  playback in the maintainer's browser, the real backend, the Tags display (finding F4).
- A failing test is either a regression or a documented known bug (a known bug is pinned as a strict `xfail`, which fails the day it is fixed; F1 was one, and was fixed on 2026-11-12).
- The first run found six things unrelated to the refactor, listed in [README](../tests/browser/README.md).
- Cost: UI details are hard-coded (panel titles, button ids, `onclick` selectors). A UI change breaks tests on purpose; the
  helpers (`open_panel`, `click_box`, ...) keep that in one place.

## 3. Not decided here
- Running it in CI (a GitHub workflow needs the conda environment or a Docker image).
- A real-stack layer: Flask with SQLite and a login, for the server items the dev webapp only stubs.
- Visual regression (screenshots).
- Fixing the findings: each is a `DEBT` candidate for the maintainer.
