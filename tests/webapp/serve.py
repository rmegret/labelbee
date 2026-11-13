#!/usr/bin/env python3
"""Dev webapp for manual tests of the LabelBee page: standard library only, no database, no login.

Serves the real page (labelbee/blueprints/labelbee/templates/labelbee_page.html) and the real static
files of THIS checkout, plus stubs of the few backend endpoints the page calls, backed by
tests/webapp/data/. Not for production: no authentication, no input limits.

    python3 tests/webapp/serve.py            # then open http://127.0.0.1:8000/
    python3 tests/webapp/serve.py --port 8001 --host 127.0.0.1 --quiet

See tests/webapp/README.md.
"""
import argparse
import json
import mimetypes
import re
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
STATIC = REPO / "labelbee" / "static"
TEMPLATE = REPO / "labelbee" / "blueprints" / "labelbee" / "templates" / "labelbee_page.html"
DATA = HERE / "data"
SAMPLE = DATA / "sample"
SAVED = DATA / "_saved"  # annotations POSTed by "Save to server" (git-ignored)

USER = {"is_authenticated": True, "id": 1, "first_name": "Dev", "last_name": "User", "email": "dev@localhost"}
VIDEO_FILES = ("sample.mp4", "sample.synthetic.mp4")  # first one that exists
URL_FOR = {"home.home_page": "/", "gallery.videos_page": "/videos"}


def render_page():
    """The Jinja template needs five values: substituted here, so that Jinja is not required."""
    html = TEMPLATE.read_text(encoding="utf-8")
    html = re.sub(r"\{\{\s*url_for\('([^']+)'\)\s*\}\}", lambda m: URL_FOR.get(m.group(1), "/"), html)
    html = re.sub(r"\{\{\s*http_script_name\s*\}\}", "", html)
    html = re.sub(r"\{\{\s*csrf_token\(\)\s*\}\}", "dev", html)
    html = re.sub(r"\{\{[^}]*\}\}", "", html)  # anything else only appears in comments
    return html.encode("utf-8")


def video_record():
    """The one video of the dev webapp (id 1), or None. Metadata from the <video>.info.json next to it."""
    for name in VIDEO_FILES:
        if (SAMPLE / name).is_file():
            break
    else:
        return None
    info = {}
    info_file = SAMPLE / (name[:-len(".mp4")] + ".info.json")
    if info_file.is_file():
        info = json.loads(info_file.read_text())
    fps = info.get("fps", 20)
    nframes = info.get("nframes", 40)
    return {
        "id": 1, "file_name": name, "path": "/sample",
        "starttime": "2025-01-01T12:00:00", "timestamp": "2025-01-01T12:00:00",
        "colony": "dev", "dataset": "dev", "location": None, "notes": None,
        "fps": fps, "videofps": fps, "realfps": fps,
        "duration": info.get("duration", nframes / fps), "nframes": nframes,
        "width": info.get("width", 480), "height": info.get("height", 270),
        "corrupted": False, "trimmed": False, "thumb": None,
    }


# Annotations that "Load Events from DB" / "Load Tags" always find, built from data/sample/. Oldest id first:
# the most recent event file (the one the dialog proposes) is events_v2.json, until something is saved.
SEEDS = [
    (1, "event", "events_v2_duplicates.json"), (2, "event", "events_v1_array.json"),
    (3, "event", "events_v1.json"), (4, "event", "events_v2.json"), (5, "tag", "tags_v2.json"),
]


def seed_annotations():
    out = []
    for aid, data_type, name in SEEDS:
        f = SAMPLE / name
        if f.is_file():
            out.append({
                "id": aid, "video_id": "1", "created_by_id": "1", "created_by": USER["first_name"],
                "data_type": data_type, "created_from_id": None, "file_name": name, "path": "/sample",
                "timestamp": "2025-01-01T12:00:00", "data": f.read_text(encoding="utf-8"),
            })
    return out


def saved_annotations():
    """Seeds plus what "Save to server" stored in data/_saved/, newest id first."""
    out = seed_annotations()
    if SAVED.is_dir():
        for p in SAVED.glob("*.json"):
            out.append(json.loads(p.read_text()))
    return sorted(out, key=lambda a: a["id"], reverse=True)


def safe_join(root, rel):
    """root/rel if it stays inside root, else None."""
    p = (root / urllib.parse.unquote(rel).lstrip("/")).resolve()
    try:
        p.relative_to(root.resolve())
    except ValueError:
        return None
    return p


class Handler(BaseHTTPRequestHandler):
    server_version = "LabelBeeDevWebapp/0"
    quiet = False

    def log_message(self, fmt, *args):
        if not self.quiet:
            sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    # ---- helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_bytes(self, body, ctype, status=200):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path):
        """Static file with HTTP Range support (the browser needs it to seek in a video)."""
        size = path.stat().st_size
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        start, end, status = 0, size - 1, 200
        m = re.match(r"bytes=(\d*)-(\d*)$", self.headers.get("Range", ""))
        if m and (m.group(1) or m.group(2)):
            a, b = m.groups()
            if a == "":
                start = max(0, size - int(b))
            else:
                start = int(a)
                if b:
                    end = min(int(b), size - 1)
            if start > end or start >= size:
                self.send_response(416)
                self.send_header("Content-Range", "bytes */%d" % size)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            status = 206
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if status == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Cache-Control", "no-store")  # dev: always serve the current JS
        self.end_headers()
        with open(path, "rb") as fh:
            fh.seek(start)
            left = end - start + 1
            while left > 0:
                chunk = fh.read(min(65536, left))
                if not chunk:
                    break
                self.wfile.write(chunk)
                left -= len(chunk)

    def not_found(self, what=""):
        self.send_json({"error": "not available in the dev webapp", "path": what or self.path}, 404)

    # ---- routes
    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        path, query = url.path, urllib.parse.parse_qs(url.query)
        try:
            self.route_get(path, query)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def route_get(self, path, query):
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/labelbee/gui#video_id=1")  # the page loads videos from the URL hash
            self.end_headers()
        elif path == "/labelbee/gui":
            self.send_bytes(render_page(), "text/html; charset=utf-8")
        elif path == "/videos":
            self.send_bytes(b"dev webapp: no video gallery", "text/plain")
        elif path == "/_dev/status":  # which server and which files am I talking to?
            v = video_record()
            rows = saved_annotations()
            self.send_json({
                "server_file": str(Path(__file__).resolve()), "static_files_of": str(REPO),
                "video": v["file_name"] if v else None,
                "annotations": {t: len([a for a in rows if a["data_type"] == t]) for t in ("event", "tag")},
                "sample_dir": str(SAMPLE), "sample_dir_exists": SAMPLE.is_dir(),
            })
        elif path == "/api/v1/auth/whoami":
            self.send_json(USER)
        elif path == "/api/v1/videos":
            v = video_record()
            self.send_json({"data": [v] if v else []})
        elif re.fullmatch(r"/api/v1/video/\d+", path):
            v = video_record()
            if v and int(path.rsplit("/", 1)[1]) == v["id"]:
                self.send_json({"data": v})
            else:
                self.not_found()
        elif path == "/api/v1/annotations":
            rows = saved_annotations()
            if "data_type" in query:
                rows = [a for a in rows if a["data_type"] == query["data_type"][0]]
            # video_id is ignored: there is one video, and a video opened "From URI" has a path, not an id
            self.send_json({"data": [{k: v for k, v in a.items() if k != "data"} for a in rows]})
        elif re.fullmatch(r"/api/v1/annotation/\d+", path):
            aid = int(path.rsplit("/", 1)[1])
            found = [a for a in saved_annotations() if a["id"] == aid]
            self.send_json({"data": found[0]}) if found else self.not_found()
        elif path.startswith("/api/v1/rawdata/") or path == "/api/v1/rawdata":
            self.rawdata(path[len("/api/v1/rawdata"):].strip("/"))
        elif path.startswith("/data/") and path.endswith(".mp4.stream.json"):
            # "From URI" asks for <video>.stream.json (ffprobe-like info): made from <video>.info.json
            video = safe_join(DATA, path[len("/data/"):-len(".stream.json")])
            if video and video.is_file() and SAVED not in video.parents:
                info_file = video.with_name(video.name[:-len(".mp4")] + ".info.json")
                info = json.loads(info_file.read_text()) if info_file.is_file() else {}
                fps = info.get("fps", 20)
                self.send_json({"video_info": {
                    "nb_frames": str(info.get("nframes", 40)), "width": info.get("width", 480),
                    "height": info.get("height", 270), "r_frame_rate": "%s/1" % fps,
                    "duration": str(info.get("duration", info.get("nframes", 40) / fps)),
                }})
            else:
                self.not_found()
        elif path.startswith("/data/"):
            p = safe_join(DATA, path[len("/data/"):])
            if p and p.is_file() and SAVED not in p.parents:
                self.send_file(p)
            else:
                self.not_found()
        elif path.startswith("/rest/") or path.startswith("/api/"):
            self.not_found()
        else:
            p = safe_join(STATIC, path)  # static_url_path="" in the real app
            if p and p.is_file():
                self.send_file(p)
            else:
                self.not_found()

    def rawdata(self, rel):
        """File picker listing of data/ (response shape of /api/v1/rawdata/ as read by labelBee.js)."""
        d = safe_join(DATA, rel)
        if not d or not d.is_dir() or d == SAVED:
            return self.not_found()
        files, dirs = [], []
        for p in sorted(d.iterdir()):
            sub = (rel + "/" + p.name).strip("/")
            if p.is_dir() and p != SAVED:
                dirs.append({"filename": p.name + "/", "uri": "api/v1/rawdata/" + sub})
            elif p.is_file():
                files.append({"filename": p.name, "uri": "api/v1/rawdata/" + sub, "download_uri": "/data/" + sub})
        self.send_json({"files": files, "dirs": dirs})

    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        if path == "/api/v1/annotations":
            form = {k: v[0] for k, v in urllib.parse.parse_qs(raw).items()}
            SAVED.mkdir(parents=True, exist_ok=True)
            aid = max([a["id"] for a in saved_annotations()] + [0]) + 1
            video = video_record() or {"file_name": "video"}
            row = {
                "id": aid, "video_id": form.get("video_id"), "created_by_id": form.get("created_by_id", "1"),
                "created_by": USER["first_name"], "data_type": form.get("data_type", "event"),
                "created_from_id": form.get("created_from_id"),
                "file_name": "%s_%s_%d.json" % (video["file_name"], form.get("data_type", "event"), aid),
                "path": "/_saved", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "data": form.get("data", ""),
            }
            (SAVED / ("%d.json" % aid)).write_text(json.dumps(row))
            self.send_json({"data": {k: v for k, v in row.items() if k != "data"}}, 201)
        elif path in ("/api/v1/auth/login", "/api/v1/auth/logout"):
            self.send_json(USER)
        else:
            self.not_found(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--host", default="127.0.0.1", help="default 127.0.0.1 (the server has no authentication)")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--quiet", action="store_true", help="do not log requests")
    args = ap.parse_args()
    Handler.quiet = args.quiet
    try:
        srv = ThreadingHTTPServer((args.host, args.port), Handler)
    except OSError as e:
        sys.exit("cannot listen on %s:%d (%s): another server is probably still running there, "
                 "stop it or use --port" % (args.host, args.port, e.strerror))
    v = video_record()
    rows = saved_annotations()
    print("LabelBee dev webapp, static files of %s" % REPO, flush=True)
    print("video: %s" % (v["file_name"] if v else "NONE: run tests/webapp/make_sample_video.sh"), flush=True)
    print("annotations: %d events, %d tags (status page: /_dev/status)" % (
        len([a for a in rows if a["data_type"] == "event"]), len([a for a in rows if a["data_type"] == "tag"])), flush=True)
    print("http://%s:%d" % (args.host, args.port), flush=True)  # alone on its line: clickable in VS Code
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
