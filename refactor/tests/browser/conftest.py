"""Fixtures of the browser tests (refactor/design/0006-browser-tests.md).

The page under test is the real one (labelbee/blueprints/labelbee/templates/labelbee_page.html and the real static
files of THIS checkout), served by tests/webapp/serve.py: standard library only, no database, no login. serve.py
fixes its paths relative to its own location, so a throw-away copy of the dev webapp is built in a temp folder:
    <tmp>/tests/webapp/serve.py        copy of the dev server (the file in the repository is not modified)
    <tmp>/tests/webapp/data/sample/    copy of the sample annotation files + a VP9 sample.mp4 made by ffmpeg
    <tmp>/labelbee                     symlink to the labelbee/ folder under test
VP9 inside an .mp4: the Chromium of Playwright cannot decode H.264, which tests/webapp/make_sample_video.sh uses.
"""
import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest

from helpers import App

REPO = Path(__file__).resolve().parents[3]
SAMPLE_SRC = REPO / "tests" / "webapp" / "data" / "sample"
VIDEO_FPS, VIDEO_SECONDS = 20, 2
DIRTY_WRITES_JS = Path(__file__).with_name("dirty_writes.js")
DIRTY_WRITES_ALLOWED = Path(__file__).with_name("dirty_writes_allowed.json")


def _allowed_writers():
    """The strict allow-list: {(file, function, operation, depth)}; see dirty_writes_allowed.json."""
    entries = json.loads(DIRTY_WRITES_ALLOWED.read_text())["allowed"]
    return {(e["file"], e["function"], e["operation"], e["depth"]) for e in entries}


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _make_vp9_sample(out_dir: Path):
    """40 frames at 20 fps, every frame a keyframe (exact frame stepping), VP9 in an .mp4 container."""
    if shutil.which("ffmpeg") is None:
        pytest.fail("ffmpeg not found: activate the conda environment `labelbeedev` (refactor/tests/devenv/)")
    out = out_dir / "sample.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"testsrc2=size=480x270:rate={VIDEO_FPS}:duration={VIDEO_SECONDS}",
         "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-g", "1", "-b:v", "0", "-crf", "40",
         "-movflags", "+faststart", str(out)],
        check=True)
    info = {"fps": VIDEO_FPS, "nframes": VIDEO_FPS * VIDEO_SECONDS, "duration": float(VIDEO_SECONDS), "width": 480, "height": 270}
    (out_dir / "sample.info.json").write_text(json.dumps(info))


@pytest.fixture(scope="session")
def devroot(tmp_path_factory):
    root = tmp_path_factory.mktemp("devroot")
    web = root / "tests" / "webapp"
    sample = web / "data" / "sample"
    sample.mkdir(parents=True)
    shutil.copy(REPO / "tests" / "webapp" / "serve.py", web / "serve.py")
    for f in SAMPLE_SRC.iterdir():
        if f.suffix in (".json", ".csv") and not f.name.startswith("sample."):
            shutil.copy(f, sample / f.name)
    _make_vp9_sample(sample)
    # the "gurabo4 video+tracks_tagged" link builds /data/datasets/gurabo4/{mp4,tracks}/<name>[.tracks_tagged.csv]
    gurabo = web / "data" / "datasets" / "gurabo4"
    (gurabo / "mp4" / "test").mkdir(parents=True)
    (gurabo / "tracks" / "test").mkdir(parents=True)
    shutil.copy(sample / "sample.mp4", gurabo / "mp4" / "test" / "v.mp4")
    shutil.copy(sample / "sample.info.json", gurabo / "mp4" / "test" / "v.info.json")
    shutil.copy(SAMPLE_SRC / "tracks_tagged.csv", gurabo / "tracks" / "test" / "v.mp4.tracks_tagged.csv")
    # the events and detections CSV of sample_gurabo, for the loader dialog (CSV schemas)
    gur = web / "data" / "sample_gurabo"
    gur.mkdir()
    for suffix in (".events.csv", ".detections.csv"):
        shutil.copy(REPO / "tests" / "webapp" / "data" / "sample_gurabo" / ("sample_gurabo.cfr.mp4" + suffix), gur)
    os.symlink(REPO / "labelbee", root / "labelbee")
    return root


@pytest.fixture(scope="session")
def server(devroot):
    """URL of the dev webapp, started once for the whole run."""
    port = _free_port()
    proc = subprocess.Popen([sys.executable, str(devroot / "tests" / "webapp" / "serve.py"), "--port", str(port), "--quiet"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            urllib.request.urlopen(url + "/_dev/status", timeout=1).read()
            break
        except Exception:
            time.sleep(0.1)
    else:
        proc.terminate()
        pytest.fail("the dev webapp did not start")
    yield url
    proc.terminate()
    proc.wait(timeout=5)


@pytest.fixture
def sample_dir(devroot):
    return devroot / "tests" / "webapp" / "data" / "sample"


@pytest.fixture
def saved_dir(devroot):
    """Where "Save to server" stores annotations in the dev webapp; emptied after each test."""
    d = devroot / "tests" / "webapp" / "data" / "_saved"
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "accept_downloads": True, "viewport": {"width": 1600, "height": 1000}}


@pytest.fixture
def ui(page, server, saved_dir, tmp_path, request):
    """The page, with the watchers of helpers.App already attached (nothing is opened yet).
    At teardown every test checks the console (checklist item E1): an error the test provokes on purpose must be
    declared with `ui.allow(regex)`. Not called `app`: pytest-flask treats a fixture of that name as a Flask app.
    With --dirty-writes the dirty-write detector (dirty_writes.js) is injected and its findings are collected."""
    strict_opt = request.config.getoption("--dirty-writes-strict")    # on by default: every test runs under the detector
    # a test that mutates the stored events on purpose (test_i_detector.py) declares it with @pytest.mark.dirty_writes_expected
    expected = request.node.get_closest_marker("dirty_writes_expected") is not None
    strict = strict_opt and not expected
    detector = request.config.getoption("--dirty-writes") or strict_opt
    if detector:
        page.add_init_script(path=str(DIRTY_WRITES_JS))
    a = App(page, server, tmp_path)
    yield a
    if detector:
        try:
            found = page.evaluate("window.__dirtyWrites || {}")
            api = page.evaluate("window.__dirtyApi || {}")
        except Exception:                      # the page was closed or navigated away by the test
            found, api = {}, {}
        for key, e in api.items():             # operations of Events called from the page code ("through the API")
            merged = request.config._dirty_api.setdefault(key, {**e, "count": 0, "tests": set()})
            merged["count"] += e["count"]
            merged["tests"].add(request.node.name)
        all_writes = request.config._dirty_writes
        for key, e in ({} if expected else found).items():      # a test that mutates on purpose does not feed the report
            merged = all_writes.setdefault(key, {**e, "count": 0, "tests": set()})
            merged["count"] += e["count"]
            merged["tests"].add(request.node.name)
            request.config._dirty_seen.add((e["file"], e["fn"], e["op"], e["depth"]))
        if strict:
            allowed = _allowed_writers()
            unlisted = sorted({(e["file"], e["line"], e["fn"], e["op"], e["depth"]) for e in found.values()
                               if (e["file"], e["fn"], e["op"], e["depth"]) not in allowed})
            assert not unlisted, ("write(s) to the stored events from a site that is not in dirty_writes_allowed.json:\n  "
                                  + "\n  ".join(f"{f}:{l} {fn}  {op}@{d}" for f, l, fn, op, d in unlisted))
    a.assert_clean()


# ---- dirty-write detector: option, collection and report
def pytest_addoption(parser):
    parser.addoption("--dirty-writes", action="store", default=None, metavar="REPORT.json",
                     help="inject dirty_writes.js in every page and write the writers of the stored events to REPORT.json")
    parser.addoption("--dirty-writes-strict", action=argparse.BooleanOptionalAction, default=True,
                     help="inject dirty_writes.js in every test and fail each test whose write to the stored events comes from a "
                          "site that is not in dirty_writes_allowed.json (the default; --no-dirty-writes-strict turns it off)")


def pytest_configure(config):
    config._dirty_writes = {}
    config._dirty_api = {}          # "through the API": operations of Events called by the page code
    config._dirty_seen = set()      # (file, function, operation, depth) seen in this run


def _dirty_rows(config):
    rows = []
    for e in config._dirty_writes.values():
        rows.append({k: e[k] for k in ("op", "depth", "field", "file", "line", "fn", "count")} | {"tests": sorted(e["tests"])})
    return sorted(rows, key=lambda r: (r["file"], r["line"], r["op"], r["field"]))


def _api_rows(config):
    rows = [{k: e[k] for k in ("op", "file", "line", "fn", "count")} | {"tests": sorted(e["tests"])} for e in config._dirty_api.values()]
    return sorted(rows, key=lambda r: (r["op"], r["file"], r["line"]))


# every command of Events (annotation/Events.js): an operation that no test calls from the page is a coverage gap
EVENTS_OPERATIONS = ("replace", "create", "commit", "update", "delete", "rename", "swap", "setInfo")


def pytest_sessionfinish(session):
    path = session.config.getoption("--dirty-writes")
    if path:
        Path(path).write_text(json.dumps({"dirty": _dirty_rows(session.config), "api": _api_rows(session.config)}, indent=1))


def pytest_terminal_summary(terminalreporter):
    cfg = terminalreporter.config
    if cfg.getoption("--dirty-writes-strict"):
        unused = sorted(_allowed_writers() - cfg._dirty_seen)
        terminalreporter.section("dirty-write allow-list")
        terminalreporter.write_line(f"{len(_allowed_writers())} allowed writers, {len(unused)} not seen in this run"
                                    f"{' (a partial run proves nothing; on the full run, delete them)' if unused else ''}")
        for f, fn, op, d in unused:
            terminalreporter.write_line(f"  not seen: {f} {fn} {op}@{d}")
    if not cfg.getoption("--dirty-writes"):
        return
    rows = _dirty_rows(cfg)
    terminalreporter.section("dirty writes to the stored events")
    sites = {}
    for r in rows:
        sites.setdefault((r["file"], r["line"], r["fn"]), []).append(r)
    terminalreporter.write_line(f"{len(rows)} (operation, depth, field, site) combinations from {len(sites)} source lines; "
                                f"depth 0 = frames, 1 = one frame, 2 = one observation, 3+ = nested")
    for (f, l, fn), rs in sorted(sites.items()):
        what = ", ".join(f"{r['op']}@{r['depth']}:{r['field']} x{r['count']}" for r in rs)
        terminalreporter.write_line(f"  {f}:{l} {fn}  ->  {what}")
    api = _api_rows(cfg)
    terminalreporter.section("operations of Events called by the page code (through the API)")
    terminalreporter.write_line(f"{len(api)} (operation, call site) combinations")
    for r in api:
        terminalreporter.write_line(f"  {r['file']}:{r['line']} {r['fn']}  ->  {r['op']} x{r['count']}")
    missing = [op for op in EVENTS_OPERATIONS if op not in {r["op"] for r in api}]
    if missing:
        terminalreporter.write_line(f"  operations no test called from the page: {', '.join(missing)}")
