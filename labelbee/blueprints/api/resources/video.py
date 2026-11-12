"""Video endpoints, backed by the DataInfrastructure API.

The URLs and response envelopes are the ones the labelbee frontend already
uses; only the storage moved from labelbee's DB to DataInfrastructure.
Video ids are now UUID strings.
"""
import os

from flask import request
from flask_restful import Resource
import cv2
from dotenv import load_dotenv

from labelbee.services import datainfra
from labelbee.services.datainfra import DataInfraError
from ..constants import STATUS_CODE_200, STATUS_CODE_400, STATUS_CODE_500

load_dotenv()


def _error(e: DataInfraError):
    return {"success": False, "status_code": e.status_code, "error": e.message, "data": {}}, e.status_code


class VideoListAPI(Resource):
    def get(self):
        # if not current_user.is_authenticated:
        #    abort(STATUS_CODE_401, "Authentication Required")
        dataset = request.args.get("dataset") or None
        name = request.args.get("name") or None
        try:
            videos = datainfra.list_videos(dataset=dataset, name=name)
        except DataInfraError as e:
            return _error(e)
        return {
            "success": True,
            "status_code": STATUS_CODE_200,
            "data": [datainfra.to_video_list_item(v) for v in videos],
        }

    def post(self):
        """Upload a video file and register it in DataInfrastructure."""
        # if not current_user.is_authenticated:
        #    abort(STATUS_CODE_401, "Authentication Required")
        video_name = request.form.get("video_name")
        if not video_name or "file" not in request.files:
            return {"success": False, "status_code": STATUS_CODE_400,
                    "error": "video_name and file are required"}, STATUS_CODE_400

        upload_dir = os.getenv("ROOT_PATH")
        if not upload_dir:
            return {"success": False, "status_code": STATUS_CODE_500,
                    "error": "ROOT_PATH (upload directory) is not configured"}, STATUS_CODE_500

        file_path = os.path.join(upload_dir, f"{os.path.basename(video_name)}.mp4")
        try:
            request.files["file"].save(file_path)
        except OSError:
            return {"success": False, "status_code": STATUS_CODE_500,
                    "error": "Error writing video file"}, STATUS_CODE_500

        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            os.remove(file_path)
            return {"success": False, "status_code": STATUS_CODE_400,
                    "error": "Uploaded file is not a readable video"}, STATUS_CODE_400
        real_fps = cap.get(cv2.CAP_PROP_FPS)
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        fps = request.form.get("fps")
        meta = {k: request.form.get(k) for k in ("colony", "notes") if request.form.get(k)}
        try:
            video_id = datainfra.create_video(
                name=video_name,
                filepath=file_path,
                collection_id=request.form.get("dataset_id") or None,
                location=request.form.get("location") or None,
                timestamp=request.form.get("date") or None,
                fps=float(fps) if fps else real_fps,
                frames=frames,
                resolution=f"{width}x{height}",
                file_size=os.path.getsize(file_path),
                type="mp4",
                video_meta=meta or None,
            )
        except DataInfraError as e:
            os.remove(file_path)
            return _error(e)

        return {"success": True, "status_code": STATUS_CODE_200, "id": video_id}


class VideoAPI(Resource):
    def get(self, id):
        # if not current_user.is_authenticated:
        #    abort(STATUS_CODE_401, "Unauthenticated user")
        try:
            video = datainfra.get_video(id)
        except DataInfraError as e:
            return _error(e)
        return {
            "success": True,
            "status_code": STATUS_CODE_200,
            "data": datainfra.to_video_info(video),
        }

    def put(self, id):
        # if not current_user.is_authenticated:
        #    abort(STATUS_CODE_401, "Unauthenticated user")
        body = request.get_json(silent=True) or request.form.to_dict()
        fields = {}
        if body.get("video_name"):
            fields["name"] = body["video_name"]
        if body.get("location"):
            fields["location"] = body["location"]
        if body.get("dataset_id"):
            fields["collection_id"] = body["dataset_id"]
        meta = {k: body[k] for k in ("colony", "notes", "date") if body.get(k)}
        if meta:
            fields["meta"] = meta
        try:
            datainfra.update_video(id, **fields)
        except DataInfraError as e:
            return _error(e)
        return {"success": True, "status_code": STATUS_CODE_200, "data": {"id": id}}

    def delete(self, id):
        """Remove the video from the catalog. The file on disk is left alone."""
        # if not current_user.has_roles("admin"):
        #    abort(STATUS_CODE_403,"Missing user permissions")
        try:
            datainfra.delete_video(id)
        except DataInfraError as e:
            return _error(e)
        return {"success": True, "status_code": STATUS_CODE_200, "data": {"id": id}}
