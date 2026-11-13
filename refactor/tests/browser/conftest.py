"""Fixtures of the browser tests (refactor/design/0006-browser-tests.md).

The page under test is the real one (labelbee/blueprints/labelbee/templates/labelbee_page.html and the real static
files of THIS checkout), served by tests/webapp/serve.py: standard library only, no database, no login. serve.py
fixes its paths relative to its own location, so a throw-away copy of the dev webapp is built in a temp folder:
    <tmp>/tests/webapp/serve.py        copy of the dev server (the file in the repository is not modified)
    <tmp>/tests/webapp/data/sample/    copy of the sample annotation files + a VP9 sample.mp4 made by ffmpeg
    <tmp>/labelbee                     symlink to the labelbee/ folder under test
VP9 inside an .mp4: the Chromium of Playwright cannot decode H.264, which tests/webapp/make_sample_video.sh uses.
"""
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
def ui(page, server, saved_dir, tmp_path):
    """The page, with the watchers of helpers.App already attached (nothing is opened yet).
    At teardown every test checks the console (checklist item E1): an error the test provokes on purpose must be
    declared with `ui.allow(regex)`. Not called `app`: pytest-flask treats a fixture of that name as a Flask app."""
    a = App(page, server, tmp_path)
    yield a
    a.assert_clean()
