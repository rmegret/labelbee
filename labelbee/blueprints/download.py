from flask import render_template, render_template_string, jsonify, Blueprint, request
from labelbee.flask_range_requests import send_from_directory_partial, dir_listing
from flask_user import current_user
import os

bp = Blueprint('download', __name__, url_prefix='/')



#TODO: Add to receive file path in route path"data/<path:pathid>""
@bp.route("/data/")
def send_data():
    data_dir = os.path.join(bp.root_path, "../static/data")
    path = "/videos/gurabo_video.mp4"
    #TODO: Unhardcode this
    return send_from_directory_partial(data_dir, "/gurabo_video.mp4", "/data")
