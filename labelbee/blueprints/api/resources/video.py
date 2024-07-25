from flask_restful import Resource
from labelbee.schemas import VideoSchema
from labelbee.db_functions import (
    video_list, 
    get_video_by_id, 
    delete_video,
    edit_video
    )
from flask import request, abort
import cv2
from dotenv import load_dotenv
import os
from labelbee.models import Video
from labelbee.app import db
from flask_user import current_user
from ..constants import (
    STATUS_CODE_200,
    STATUS_CODE_401, 
    STATUS_CODE_403,
    STATUS_CODE_500,
)

#Unhardcode this 
load_dotenv()

#TODO: Add list filters 
class VideoListAPI(Resource):
    def get(self):
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Authentication Required")

        dataset = request.args.get("dataset", "")

        dataset = None if dataset == "" else dataset

        videos_schema = VideoSchema(many=True)

        try:
            video_payload = videos_schema.dump(video_list(dataset))
            return {
                "success": True,
                "status_code": STATUS_CODE_200,
                "data": video_payload
                }
        
        except Exception as e:
            return {
                "success": False,
                "status_code": STATUS_CODE_500,
                "data": {}
            }

    #TODO: 
    # 2. 404 for dataset id
    # 3. validate input data 
    # 4. Check authentication
    def post(self):
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Authentication Required")

        # Get data from body
        video_name = request.form.get("video_name")
        #TODO: Map location string to int 
        location = request.form.get("location")
        dataset_id = request.form.get("dataset_id")
        date = request.form.get("date")
        colony = request.form.get("colony")
        notes = request.form.get("notes")
        fps = request.form.get("fps")

        video_file = request.files["file"]

        try:
            path = os.getenv("ROOT_PATH")
            file_path = f"{path}/{video_name}.mp4"
            with open(file_path, 'wb') as f:
                f.write(video_file.stream.read())

        except Exception:
            abort(STATUS_CODE_500, "Error writing video file")

        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                raise Exception
            real_fps = cap.get(cv2.CAP_PROP_FPS)
            frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()

            filesize = os.path.getsize(file_path)

        except Exception:
            abort(STATUS_CODE_500, "Error extracting video metadata")

        _hash = ""

        video_entry = {
            "file_name": f"{video_name}.mp4", #Yes
            "path": "/videos", # Yes
            "timestamp": date,
            "location": 10, #Yes
            "colony": colony, #Yes 
            "notes": notes,
            "dataset": dataset_id, #yes
            "thumb": "",
            "frames": frames, #yes)
            "height": height, #yes
            "width": width,
            "fps": fps if fps else real_fps,
            "realfps": real_fps,
            "filesize": filesize,
            "hash": _hash,
            "corrupted" : False,
            "trimmed" : False,
            "hasframe0" : False,
            "hasframe_1s" : False,
            "hasframe_2s" : False,
            "hasframe_10s" : False,
            "hasframeN_30s" : False,
            "hasframeN_2s" : False,
            "hasframeN_1s" : False,
            "hasframeN": False
        }
        
        try:
            vid = Video(**video_entry)
            db.session.add(vid)
            db.session.commit()

            return {
                "success": True,
                "status_code": STATUS_CODE_200,
                "id": vid.id
            }
        except Exception as e:
            os.remove(file_path)
            abort(STATUS_CODE_500, "Error inserting video metadata")


class VideoAPI(Resource):
    def get(self, id):
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")

        try :
            video = get_video_by_id(id)

            video_schema = VideoSchema()
            video = video_schema.dump(video)
            video_info = {
                "video_id": video["id"],
                "path": video["path"],
                "file_name": video["file_name"],
                "videofps": video["fps"],
                "realfps": video["realfps"],
                "starttime": video["timestamp"],
                "duration": video["frames"] / video["fps"],
                "nframes": video["frames"],
            }

            return {
                    "success": True,
                    "data": video_info,
                    "status_code": STATUS_CODE_200
                    }
        except Exception:
            return {
                "success": False,
                "status_code": STATUS_CODE_500,
                "data": {}
            }

    def put(self, id):
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")

        video_name = request.json.get("video_name")
        #TODO: Map location string to int 
        location = request.json.get("location")
        dataset_id = request.json.get("dataset_id")
        date = request.json.get("date")
        colony = request.json.get("colony")

        try :
            edit_video(
                id, 
                file_name=video_name,
                path=None,
                timestamp=date,
                location=location,
                colony=colony,
                dataset=dataset_id
            )
            return {
                "success": True,
                "status_code": STATUS_CODE_200,
                "data": {
                    "id": id
                }
            }
        except Exception:
            abort(500)

    def delete(self, id):
        if not current_user.is_authenticated:
            abort(STATUS_CODE_401, "Unauthenticated user")

        if not current_user.has_roles("admin"):
            abort(STATUS_CODE_403,"Missing user permissions")
        
        video_schema = VideoSchema()

        try :
            video_info = video_schema.dump(get_video_by_id(id))

        except :
            abort(STATUS_CODE_500, "Error reading video file")

        try :
            delete_video(id)

        except Exception:
            abort(STATUS_CODE_500, "Error deleting video")

        try :
            # TODO: Figure out path structure 
            os.remove(f'{os.getenv("ROOT_PATH")}/{video_info["file_name"]}')
        except Exception:

            vid = Video(**video_info)
            db.session.add(vid)
            db.session.commit()
            abort(STATUS_CODE_500, "Error deleting video files")

        return {
                "success": True,
                "data": {
                    "id": id
                    }
                }
        