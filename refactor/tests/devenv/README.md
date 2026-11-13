# Test environment (conda `labelbeedev`)

    conda env create -f refactor/tests/devenv/environment.yml
    conda activate labelbeedev
    pip install -r requirements.txt -r refactor/tests/devenv/requirements-dev.txt     # from the repo root
    playwright install chromium

| File | Content |
|---|---|
| `environment.yml` | Python 3.11, Node 20, ffmpeg (what pip cannot install) |
| `requirements-dev.txt` | `pytest`, `pytest-flask`, `pytest-playwright`, `pytest-timeout` (ranges, not yet frozen) |
| `../../../requirements.txt` | the application's own pins, used unchanged (Flask 3.0.3, SQLAlchemy 2.0.30, numpy 1.24.4, ...) |

Check it works:

    python -c "import flask, cv2, numpy; print(flask.__version__, cv2.__version__)"
    node --test refactor/tests/golden/                     # 211 tests
    pytest refactor/tests/browser                          # 55 browser tests, about a minute
    python tests/webapp/serve.py --port 8000               # dev webapp, then open http://127.0.0.1:8000/
    playwright --version

Not in the environment on purpose: MySQL (the backend tests use in-memory SQLite; the dev webapp has no database) and
any npm package (the golden tests run on Node alone).

Checked on 2026-11-12 (Python 3.11.18, Flask 3.0.3, numpy 1.24.4, OpenCV 4.10, Node 20.20, pytest 8.4.2, Playwright 1.47):
the versions of `requirements.txt` install together and the tests above pass. `pytest tests` (the old backend tests)
cannot be collected yet: `tests/conftest.py` imports a module that no longer exists (finding F5).

Playwright's Chromium has no H.264; the browser tests make a VP9 video themselves (ffmpeg from this environment).
