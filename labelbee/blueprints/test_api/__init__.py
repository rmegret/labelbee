from flask import Blueprint
from flask_restful import Api

from .resources.video import VideoAPI, VideoListAPI
from .resources.dataset import DatasetAPI, DatasetListAPI
from .resources.annotations import AnnotationAPI, AnnotationsAPI
from .resources.auth import Authentication
from labelbee.app import csrf   


bp = Blueprint('test_api', __name__, url_prefix="/api/v1")

api = Api(bp, decorators=[csrf.exempt])

api.add_resource(VideoListAPI, "/videos", endpoint="videos")
api.add_resource(VideoAPI, "/video/<int:id>", endpoint="video")

api.add_resource(DatasetListAPI, "/datasets", endpoint="datasets")
api.add_resource(DatasetAPI, "/dataset/<int:id>", endpoint="dataset")

api.add_resource(AnnotationsAPI, "/annotations", endpoint="annotations")
api.add_resource(AnnotationAPI, "/annotation/<int:id>", endpoint="annotation")

api.add_resource(Authentication, "/auth", endpoint="auth")