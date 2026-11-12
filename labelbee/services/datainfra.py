"""Client for the DataInfrastructure API.

Labelbee no longer keeps its own video/dataset catalog: videos and
collections (labelbee "datasets") live in DataInfrastructure. Labelbee's
/api/v1 endpoints call this module server-to-server, so the browser keeps
talking to labelbee only (same origin, no CORS, reverse-proxy prefix intact).

Settings (environment / .env):
    DATAINFRA_API_URL      Base URL of the API             (default http://localhost:8000)
    DATAINFRA_TIMEOUT      Seconds per request              (default 15)
    DATAINFRA_PATH_PREFIX  Prefix of the paths stored in DataInfrastructure
                           that corresponds to labelbee's DATA_DIR, i.e. what
                           is served under /data/          (default /mnt/data)

Example: with DATAINFRA_PATH_PREFIX=/mnt/data, a video stored as
/mnt/data/flowerpatch/videos/Mar-12-Gurabo/8MP_b3_2.cfr.mp4 is played from
<labelbee>/data/flowerpatch/videos/Mar-12-Gurabo/8MP_b3_2.cfr.mp4, so
DATA_DIR must point at the directory mounted as /mnt/data.
"""
import json
import os
import posixpath
import urllib.error
import urllib.parse
import urllib.request


class DataInfraError(Exception):
    """Raised when the API is unreachable or answers with an error."""

    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _base_url():
    return os.environ.get("DATAINFRA_API_URL", "http://localhost:8000").rstrip("/")


def _timeout():
    try:
        return float(os.environ.get("DATAINFRA_TIMEOUT", "15"))
    except ValueError:
        return 15.0


def _path_prefix():
    return os.environ.get("DATAINFRA_PATH_PREFIX", "/mnt/data").rstrip("/")


def _request(method, path, params=None, body=None):
    url = _base_url() + path
    if params:
        params = {k: v for k, v in params.items() if v not in (None, "")}
        if params:
            url += "?" + urllib.parse.urlencode(params)

    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=_timeout()) as resp:
            payload = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        # The API answers errors as {"success": false, "error": "..."}
        try:
            detail = json.loads(e.read().decode("utf-8")).get("error") or e.reason
        except Exception:
            detail = e.reason
        raise DataInfraError(f"DataInfrastructure API: {detail}", e.code) from e
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise DataInfraError(
            f"Cannot reach DataInfrastructure API at {_base_url()}: {e}", 502
        ) from e

    try:
        return json.loads(payload) if payload else {}
    except ValueError as e:
        raise DataInfraError("DataInfrastructure API returned invalid JSON", 502) from e


# ---------------------------------------------------------------- videos

def list_videos(dataset=None, name=None):
    return _request("GET", "/videos/", {"collection_id": dataset, "name": name}).get("data", [])


def get_video(video_id):
    return _request("GET", f"/videos/{urllib.parse.quote(str(video_id))}").get("data")


def create_video(**fields):
    return _request("POST", "/videos/", body=fields).get("id")


def update_video(video_id, **fields):
    return _request("PATCH", f"/videos/{urllib.parse.quote(str(video_id))}", body=fields)


def delete_video(video_id):
    return _request("DELETE", f"/videos/{urllib.parse.quote(str(video_id))}")


# ----------------------------------------------------------- collections

def list_collections():
    return _request("GET", "/catalog/collections").get("data", [])


def get_collection(collection_id):
    return _request("GET", f"/catalog/collections/{urllib.parse.quote(str(collection_id))}").get("data")


def create_collection(**fields):
    return _request("POST", "/catalog/collections", body=fields).get("id")


def update_collection(collection_id, **fields):
    return _request("PATCH", f"/catalog/collections/{urllib.parse.quote(str(collection_id))}", body=fields)


def delete_collection(collection_id):
    return _request("DELETE", f"/catalog/collections/{urllib.parse.quote(str(collection_id))}")


# ------------------------------------------- mapping to labelbee's shapes

def split_filepath(filepath):
    """Absolute DataInfrastructure path -> (path, file_name) relative to /data.

    The frontend builds the video URL as url_for("/data") + path + "/" + file_name.
    """
    if not filepath:
        return None, None
    prefix = _path_prefix()
    relative = filepath
    if prefix and (filepath == prefix or filepath.startswith(prefix + "/")):
        relative = filepath[len(prefix):]
    if not relative.startswith("/"):
        relative = "/" + relative
    directory, file_name = posixpath.split(relative)
    return directory.rstrip("/"), file_name


def _resolution(instance):
    res = (instance or {}).get("resolution") or ""
    try:
        width, height = (int(x) for x in res.lower().split("x"))
        return width, height
    except ValueError:
        return None, None


def to_video_list_item(video):
    """Row for the 'Load video' table (VideoList.js makeVideoListTable)."""
    inst = video.get("instance") or {}
    meta = video.get("meta") or {}
    path, file_name = split_filepath(inst.get("filepath"))
    width, height = _resolution(inst)
    return {
        "id": video["id"],
        "name": video.get("name"),
        "file_name": file_name or video.get("name"),
        "path": path,
        "timestamp": inst.get("timestamp"),
        "location": video.get("location"),
        "colony": meta.get("colony"),
        "notes": meta.get("notes"),
        "dataset": video.get("collection_id"),
        "fps": inst.get("fps"),
        "realfps": inst.get("fps"),
        "frames": inst.get("frames"),
        "width": width,
        "height": height,
        "filesize": inst.get("file_size"),
        "duration": video.get("duration"),
    }


def to_video_info(video):
    """Payload for GET /api/v1/video/<id> (VideoList.js setVideoInfo)."""
    inst = video.get("instance") or {}
    path, file_name = split_filepath(inst.get("filepath"))
    fps = inst.get("fps")
    frames = inst.get("frames")
    duration = video.get("duration")
    if not duration and fps and frames:
        duration = frames / fps
    return {
        "video_id": video["id"],
        "path": path,
        "file_name": file_name,
        "videofps": fps,
        "realfps": fps,
        "starttime": inst.get("timestamp"),
        "duration": duration,
        "nframes": frames,
    }


def to_dataset(collection):
    """Collection -> labelbee dataset (same keys DataSetSchema used to dump)."""
    meta = collection.get("meta") or {}
    return {
        "id": collection["id"],
        "name": collection.get("collection_name"),
        "description": meta.get("description"),
        "creator": collection.get("created_by"),
        "experiment_name": collection.get("experiment_name"),
        "project_name": collection.get("project_name"),
        "video_count": collection.get("video_count"),
    }
