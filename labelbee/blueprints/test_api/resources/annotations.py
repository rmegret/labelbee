from flask_restful import Resource
from flask import jsonify, request, abort
from labelbee.schemas import VideoDataSchema
from labelbee.db_functions import (
    get_user_by_id, 
    get_video_by_id, 
    add_video_data, 
    edit_video_data,
    get_video_data_by_id,
    video_data_list
    )
import json 
from labelbee.app import db 

#TODO: Add input sanitation
#TODO: Add authentication

class AnnotationsAPI(Resource):
    def get(self):
        # if not current_user.is_authenticated:
        #     raise Forbidden("/rest/v2/videodata GET: login required !")

        video_id = request.args.get("video_id")
        #Bad request if no video id
        if video_id is None:
           raise abort(400,"/rest/v2/videodata GET: video_id required !")

        #TODO: Figure out what datatype is 
        data_type = request.args.get("data_type", "")
        all_users = request.args.get("allusers", None)

        annotations_schema = VideoDataSchema(many=True)

        #TODO: First param must be user id
        current_user_id = all_users if all_users else None 
        data_type = data_type if data_type else ""
        
        videos = video_data_list(video_id, data_type)
        videos_json = annotations_schema.dump(videos)

        #TODO: Terrible. Change this 
        for i in videos_json:
            user = get_user_by_id(i["created_by_id"])
            i["created_by"] = user.first_name + " " + user.last_name

        return {
            "success": True,
            "status_code": 200,
            "data": videos_json
        }
        
    def post(self):
        # Performs input validation
        video_data_schema = VideoDataSchema()
        form_data = json.dumps(request.form)
        newdata = video_data_schema.loads(form_data)


        video = get_video_by_id(newdata["video_id"])
        created_by = get_user_by_id(newdata["created_by_id"])

        video_data = video_data_schema.dump(
            add_video_data(
                file_name=newdata.setdefault("file_name", None),
                path=newdata.setdefault("path", None),
                timestamp=newdata.setdefault("timestamp", None),
                data_type=newdata.setdefault("data_type", None),
                video=video,
                created_by=created_by,
                data=newdata.setdefault("data", None),
                notes=newdata.setdefault("notes", None),
                created_from=newdata.setdefault("created_from", None),
            )
        )
        return {
            "success": True,
            "status_code": 200,
            "data": video_data
        }
            

class AnnotationAPI(Resource):
    def get(self, id):
        # if not current_user.is_authenticated:
            # raise Forbidden("/rest/v2/get_video_data GET: login required !")

        annotation_schema = VideoDataSchema()
        try :
            annotation_data = get_video_data_by_id(id)
            annotation_payload = annotation_schema.dump(annotation_data)
            #Empty payload return 400
            if len(annotation_payload) == 0:
                return {
                    "success": False,
                    "status_code": 400,
                    "data": {}
                }
            
            return {
                "success": True,
                "status_code": 200,
                "data": annotation_schema.dump(annotation_data)
                }
        
        except Exception:
            #Unexpected error return 500
            return {
                    "success": False,
                    "status_code": 500,
                    "data": {}
                }

    #TODO: Test this 
    def put(self, id):
        # if not current_user.is_authenticated:
        #     raise Forbidden("/rest/v2/edit_video_data POST: login required !")
        # if not current_user.has_roles("admin"):
        #     raise Forbidden("/rest/v2/edit_video_data POST: admin required !")

        video_data_schema = VideoDataSchema()
        form_data = json.dumps(request.form)
        newdata = video_data_schema.loads(form_data)

        video_data = video_data_schema.dump(
            edit_video_data(
                video_dataid=id,
                file_name=newdata.setdefault("file_name", None),
                path=newdata.setdefault("path", None),
                timestamp=newdata.setdefault("timestamp", None),
                data_type=newdata.setdefault("data_type", None),
                video_id=newdata.setdefault("video_id", None),
            )
        )

        return {
            "success": True,
            "status_code": 200,
            "data": video_data
            }
    
    def delete(self, id):
        annotation = get_video_data_by_id(id)
        db.session.delete(annotation)
        db.session.commit()
        return {
            "success": True,
            "status_code": 200,
            "data": {"id": id}
        }